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
    createWebAuthnCredential,
    toWebAuthnAccount,
    type WebAuthnAccount,
    type P256Credential,
    type SmartAccount,
} from "viem/account-abstraction";
import { type Address } from "viem";
import { type SafeSmartAccountImplementation } from "permissionless/accounts";

// Storage keys
const CREDENTIAL_STORAGE_KEY = "spritz_passkey_credential";
const DEVICE_ID_STORAGE_KEY = "spritz_device_id";
const DEVICE_ADDRESS_STORAGE_KEY = "spritz_passkey_address";
const SESSION_STORAGE_KEY = "spritz_passkey_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Get or create a unique device ID
function getDeviceId(): string {
    if (typeof window === "undefined") return "";

    let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!deviceId) {
        // Generate a random device ID
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }
    return deviceId;
}

// Hash function to combine credential public key with device ID
async function hashWithDeviceEntropy(
    publicKey: string,
    deviceId: string
): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(publicKey + deviceId);
    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        data.buffer as ArrayBuffer
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Types
export type PasskeyState = {
    isLoading: boolean;
    isAuthenticated: boolean;
    credential: P256Credential | null;
    webAuthnAccount: WebAuthnAccount | null;
    smartAccount: SmartAccount<SafeSmartAccountImplementation<"0.7">> | null;
    smartAccountAddress: Address | null;
    error: string | null;
    hasStoredCredential: boolean;
};

export type PasskeyContextType = PasskeyState & {
    register: (username: string) => Promise<void>;
    login: () => Promise<void>;
    logout: () => void;
    clearError: () => void;
};

const PasskeyContext = createContext<PasskeyContextType | null>(null);

export function PasskeyProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PasskeyState>({
        isLoading: false,
        isAuthenticated: false,
        credential: null,
        webAuthnAccount: null,
        smartAccount: null,
        smartAccountAddress: null,
        error: null,
        hasStoredCredential: false,
    });

    // Check for stored credential and session on mount
    useEffect(() => {
        const restoreSession = async () => {
            const storedCredential = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
            const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
            const storedAddress = localStorage.getItem(DEVICE_ADDRESS_STORAGE_KEY);

            if (!storedCredential) {
                setState((prev) => ({ ...prev, hasStoredCredential: false }));
                return;
            }

            setState((prev) => ({ ...prev, hasStoredCredential: true }));

            // Check if we have a valid session (not expired)
            if (storedSession && storedAddress) {
                try {
                    const session = JSON.parse(storedSession);
                    const now = Date.now();
                    
                    if (session.expiresAt && now < session.expiresAt) {
                        // Session is still valid - restore without WebAuthn verification
                        console.log("[Passkey] Restoring valid session, expires in", 
                            Math.round((session.expiresAt - now) / (1000 * 60 * 60 * 24)), "days");
                        
                        const parsedCredential = JSON.parse(storedCredential);
                        const credential: P256Credential = {
                            id: parsedCredential.id,
                            publicKey: parsedCredential.publicKey,
                            raw: {
                                id: parsedCredential.raw.id,
                                type: parsedCredential.raw.type,
                            } as PublicKeyCredential,
                        };

                        const webAuthnAccount = toWebAuthnAccount({ credential });

                        setState({
                            isLoading: false,
                            isAuthenticated: true,
                            credential,
                            webAuthnAccount,
                            smartAccount: null,
                            smartAccountAddress: storedAddress as Address,
                            error: null,
                            hasStoredCredential: true,
                        });
                    } else {
                        console.log("[Passkey] Session expired, will require re-authentication");
                    }
                } catch (e) {
                    console.error("[Passkey] Error parsing session:", e);
                }
            }
        };

        restoreSession();
    }, []);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    const createSmartAccountFromCredential = useCallback(
        async (credential: P256Credential) => {
            // Always use device-specific address to ensure unique accounts per device
            // Check if we already have a stored address for this device
            let deviceAddress = localStorage.getItem(
                DEVICE_ADDRESS_STORAGE_KEY
            );

            if (!deviceAddress) {
                // Generate a new device-specific address
                const deviceId = getDeviceId();
                const deviceHash = await hashWithDeviceEntropy(
                    credential.publicKey,
                    deviceId
                );
                // Use first 40 chars of hash as address (20 bytes)
                deviceAddress = `0x${deviceHash.slice(0, 40)}`;
                // Store it for future use
                localStorage.setItem(DEVICE_ADDRESS_STORAGE_KEY, deviceAddress);
                console.log(
                    "[Passkey] Generated new device-specific address:",
                    deviceAddress
                );
                console.log(
                    "[Passkey] Device ID:",
                    deviceId.slice(0, 8) + "..."
                );
            } else {
                console.log(
                    "[Passkey] Using stored device address:",
                    deviceAddress
                );
            }

            return {
                webAuthnAccount: toWebAuthnAccount({ credential }),
                smartAccount: null,
                smartAccountAddress: deviceAddress as Address,
            };
        },
        []
    );

    const register = useCallback(
        async (username: string) => {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                // Create WebAuthn credential (passkey)
                const credential = await createWebAuthnCredential({
                    name: username || "Spritz User",
                });

                // Store credential in localStorage
                const credentialToStore = {
                    id: credential.id,
                    publicKey: credential.publicKey,
                    raw: {
                        id: credential.raw.id,
                        type: credential.raw.type,
                    },
                };
                localStorage.setItem(
                    CREDENTIAL_STORAGE_KEY,
                    JSON.stringify(credentialToStore)
                );

                // Create smart account from credential
                const { webAuthnAccount, smartAccount, smartAccountAddress } =
                    await createSmartAccountFromCredential(credential);

                // Store session with expiration
                const session = {
                    createdAt: Date.now(),
                    expiresAt: Date.now() + SESSION_DURATION_MS,
                };
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
                console.log("[Passkey] Session stored, expires in 30 days");

                setState({
                    isLoading: false,
                    isAuthenticated: true,
                    credential,
                    webAuthnAccount,
                    smartAccount: smartAccount as SmartAccount<
                        SafeSmartAccountImplementation<"0.7">
                    > | null,
                    smartAccountAddress,
                    error: null,
                    hasStoredCredential: true,
                });
            } catch (error) {
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
        [createSmartAccountFromCredential]
    );

    const login = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            // Try to get stored credential info (may not exist on new devices)
            const storedCredential = localStorage.getItem(
                CREDENTIAL_STORAGE_KEY
            );

            let parsedCredential = storedCredential ? JSON.parse(storedCredential) : null;

            // Build WebAuthn options - support both local and cross-device auth
            const publicKeyOptions: PublicKeyCredentialRequestOptions = {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                userVerification: "preferred",
                timeout: 120000, // 2 minutes for cross-device flow
                rpId: typeof window !== "undefined" ? window.location.hostname : undefined,
            };

            // If we have a stored credential, prefer it but also allow discoverable credentials
            // For cross-device auth (hybrid transport), we need to allow the authenticator
            // to present credentials even if we don't have them stored locally
            if (parsedCredential) {
                console.log("[Passkey] Using stored credential for authentication");
                publicKeyOptions.allowCredentials = [
                    {
                        id: Uint8Array.from(
                            atob(
                                parsedCredential.id
                                    .replace(/-/g, "+")
                                    .replace(/_/g, "/")
                            ),
                            (c) => c.charCodeAt(0)
                        ),
                        type: "public-key",
                        // Allow all transports including hybrid (cross-device QR code)
                        transports: ["internal", "hybrid", "usb", "ble", "nfc"],
                    },
                ];
            } else {
                // No local credential - use discoverable credentials mode
                // This enables cross-device auth where the passkey is synced via
                // Google Password Manager, iCloud Keychain, etc.
                console.log("[Passkey] No local credential, using discoverable credentials mode for cross-device auth");
                // Empty allowCredentials = discoverable credentials mode
                publicKeyOptions.allowCredentials = [];
            }

            console.log("[Passkey] Initiating WebAuthn authentication...");
            
            // Use WebAuthn to authenticate
            const assertion = await navigator.credentials.get({
                publicKey: publicKeyOptions,
            }) as PublicKeyCredential | null;

            if (!assertion) {
                throw new Error("Authentication failed. Please try again.");
            }

            console.log("[Passkey] WebAuthn authentication successful");

            // For cross-device auth, we need to extract credential info from the assertion
            // since we may not have it stored locally
            if (!parsedCredential) {
                // Extract credential ID from assertion response
                const credentialId = btoa(
                    String.fromCharCode(...new Uint8Array(assertion.rawId))
                ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
                
                console.log("[Passkey] Cross-device auth: extracted credential ID:", credentialId.slice(0, 20) + "...");
                
                // For cross-device auth, we need to store minimal credential info
                // The public key isn't directly available from assertion, so we'll
                // need to handle this case specially
                parsedCredential = {
                    id: credentialId,
                    publicKey: "cross-device-authenticated", // Placeholder - real key verification happens server-side
                    raw: {
                        id: credentialId,
                        type: "public-key",
                    },
                };
                
                // Store the credential for future local auth
                localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(parsedCredential));
                console.log("[Passkey] Stored cross-device credential locally for future use");
            }

            // Reconstruct credential
            const credential: P256Credential = {
                id: parsedCredential.id,
                publicKey: parsedCredential.publicKey,
                raw: {
                    id: parsedCredential.raw.id,
                    type: parsedCredential.raw.type,
                } as PublicKeyCredential,
            };

            // Create smart account from credential
            const { webAuthnAccount, smartAccount, smartAccountAddress } =
                await createSmartAccountFromCredential(credential);

            // Store/refresh session with expiration
            const session = {
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_DURATION_MS,
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
            console.log("[Passkey] Session stored/refreshed, expires in 30 days");

            setState({
                isLoading: false,
                isAuthenticated: true,
                credential,
                webAuthnAccount,
                smartAccount: smartAccount as SmartAccount<
                    SafeSmartAccountImplementation<"0.7">
                > | null,
                smartAccountAddress,
                error: null,
                hasStoredCredential: true,
            });
        } catch (error) {
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
    }, [createSmartAccountFromCredential]);

    const logout = useCallback(() => {
        // Clear session but keep credential (so they can re-login easily)
        localStorage.removeItem(SESSION_STORAGE_KEY);
        console.log("[Passkey] Session cleared on logout");
        
        setState({
            isLoading: false,
            isAuthenticated: false,
            credential: null,
            webAuthnAccount: null,
            smartAccount: null,
            smartAccountAddress: null,
            error: null,
            hasStoredCredential: true,
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









