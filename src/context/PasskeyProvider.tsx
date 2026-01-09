"use client";

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import {
    startRegistration,
    startAuthentication,
} from "@simplewebauthn/browser";
import { type Address } from "viem";

// Storage keys
const SESSION_STORAGE_KEY = "spritz_passkey_session";
const USER_ADDRESS_KEY = "spritz_passkey_address";

// Types
export type PasskeyState = {
    isLoading: boolean;
    isAuthenticated: boolean;
    smartAccountAddress: Address | null;
    error: string | null;
    hasStoredSession: boolean;
};

export type PasskeyContextType = PasskeyState & {
    register: (username: string) => Promise<void>;
    login: () => Promise<void>;
    logout: () => void;
    clearError: () => void;
};

const PasskeyContext = createContext<PasskeyContextType | null>(null);

// Validate and decode session token
function validateSession(token: string): { userAddress: string; exp: number } | null {
    try {
        const payload = JSON.parse(Buffer.from(token, "base64url").toString());
        if (payload.exp && payload.exp > Date.now() && payload.sub) {
            return { userAddress: payload.sub, exp: payload.exp };
        }
        return null;
    } catch {
        return null;
    }
}

export function PasskeyProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PasskeyState>({
        isLoading: false,
        isAuthenticated: false,
        smartAccountAddress: null,
        error: null,
        hasStoredSession: false,
    });

    // Check for stored session on mount
    useEffect(() => {
        const restoreSession = () => {
            const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
            const storedAddress = localStorage.getItem(USER_ADDRESS_KEY);

            if (!storedSession || !storedAddress) {
                setState((prev) => ({ ...prev, hasStoredSession: false }));
                return;
            }

            // Validate the session token
            const session = validateSession(storedSession);
            if (session) {
                console.log("[Passkey] Restored valid session, expires:", 
                    new Date(session.exp).toLocaleDateString());
                
                setState({
                    isLoading: false,
                    isAuthenticated: true,
                    smartAccountAddress: session.userAddress as Address,
                    error: null,
                    hasStoredSession: true,
                });
            } else {
                console.log("[Passkey] Session expired or invalid, clearing");
                localStorage.removeItem(SESSION_STORAGE_KEY);
                localStorage.removeItem(USER_ADDRESS_KEY);
                setState((prev) => ({ ...prev, hasStoredSession: false }));
            }
        };

        restoreSession();
    }, []);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    // Generate a deterministic wallet address from credential
    const generateWalletAddress = useCallback(async (credentialId: string): Promise<Address> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(`spritz-passkey-wallet:${credentialId}`);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        return `0x${hashHex.slice(0, 40)}` as Address;
    }, []);

    const register = useCallback(
        async (username: string) => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                // Generate a temporary address based on username for registration
                const tempAddress = await generateWalletAddress(username || "spritz-user");
                
                // Step 1: Get registration options from server
                console.log("[Passkey] Fetching registration options...");
                const optionsResponse = await fetch("/api/passkey/register/options", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userAddress: tempAddress,
                        displayName: username || "Spritz User",
                    }),
                });

                if (!optionsResponse.ok) {
                    const error = await optionsResponse.json();
                    throw new Error(error.error || "Failed to get registration options");
                }

                const { options } = await optionsResponse.json();
                console.log("[Passkey] Got registration options, starting WebAuthn...");

                // Step 2: Create credential using WebAuthn
                const credential = await startRegistration({ optionsJSON: options });
                console.log("[Passkey] WebAuthn registration complete, verifying with server...");

                // Step 3: Verify with server and store credential
                const verifyResponse = await fetch("/api/passkey/register/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userAddress: tempAddress,
                        displayName: username || "Spritz User",
                        credential,
                        challenge: options.challenge,
                    }),
                });

                if (!verifyResponse.ok) {
                    const error = await verifyResponse.json();
                    throw new Error(error.error || "Failed to verify registration");
                }

                const { sessionToken, userAddress, credentialId } = await verifyResponse.json();
                console.log("[Passkey] Registration verified! Credential ID:", credentialId?.slice(0, 20) + "...");

                // Generate the final wallet address from credential ID
                const walletAddress = await generateWalletAddress(credentialId);

                // Store session
                localStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
                localStorage.setItem(USER_ADDRESS_KEY, walletAddress);

                setState({
                    isLoading: false,
                    isAuthenticated: true,
                    smartAccountAddress: walletAddress,
                    error: null,
                    hasStoredSession: true,
                });

                console.log("[Passkey] Registration complete! Address:", walletAddress);
            } catch (error) {
                console.error("[Passkey] Registration error:", error);
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Failed to register passkey";
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMessage,
                }));
            }
        },
        [generateWalletAddress]
    );

    const login = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            // Step 1: Get authentication options from server
            // Don't pass userAddress to allow discoverable credentials (cross-device)
            console.log("[Passkey] Fetching auth options for discoverable credentials...");
            const optionsResponse = await fetch("/api/passkey/login/options", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}), // Empty to allow any credential
            });

            if (!optionsResponse.ok) {
                const error = await optionsResponse.json();
                throw new Error(error.error || "Failed to get authentication options");
            }

            const { options } = await optionsResponse.json();
            console.log("[Passkey] Got auth options, starting WebAuthn authentication...");

            // Step 2: Authenticate using WebAuthn
            const credential = await startAuthentication({ optionsJSON: options });
            console.log("[Passkey] WebAuthn authentication complete, verifying with server...");

            // Step 3: Verify with server
            const verifyResponse = await fetch("/api/passkey/login/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    credential,
                    challenge: options.challenge,
                }),
            });

            if (!verifyResponse.ok) {
                const error = await verifyResponse.json();
                throw new Error(error.error || "Failed to verify authentication");
            }

            const { sessionToken, credentialId } = await verifyResponse.json();
            console.log("[Passkey] Authentication verified! Credential ID:", credentialId?.slice(0, 20) + "...");

            // Generate wallet address from credential ID
            const walletAddress = await generateWalletAddress(credentialId);

            // Store session
            localStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
            localStorage.setItem(USER_ADDRESS_KEY, walletAddress);

            setState({
                isLoading: false,
                isAuthenticated: true,
                smartAccountAddress: walletAddress,
                error: null,
                hasStoredSession: true,
            });

            console.log("[Passkey] Login complete! Address:", walletAddress);
        } catch (error) {
            console.error("[Passkey] Login error:", error);
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to login with passkey";
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));
        }
    }, [generateWalletAddress]);

    const logout = useCallback(() => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(USER_ADDRESS_KEY);
        console.log("[Passkey] Logged out");
        
        setState({
            isLoading: false,
            isAuthenticated: false,
            smartAccountAddress: null,
            error: null,
            hasStoredSession: false,
        });
    }, []);

    return (
        <PasskeyContext.Provider
            value={{
                ...state,
                register,
                login,
                logout,
                clearError,
            }}
        >
            {children}
        </PasskeyContext.Provider>
    );
}

export function usePasskeyContext() {
    const context = useContext(PasskeyContext);
    if (!context) {
        throw new Error(
            "usePasskeyContext must be used within a PasskeyProvider"
        );
    }
    return context;
}
