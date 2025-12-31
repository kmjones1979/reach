"use client";

import { createContext, useContext, type ReactNode, useMemo } from "react";
import { useAuthImplementation, type UserAuthState } from "@/hooks/useAuth";
import { useSolanaAuthImplementation } from "@/hooks/useSolanaAuth";
import { useWalletType } from "@/hooks/useWalletType";

// Context for auth state
type AuthContextType = UserAuthState & {
    signIn: () => Promise<boolean>;
    signOut: () => Promise<void>;
    refresh: () => Promise<void>;
    getAuthHeaders: () => Record<string, string> | null;
    isReady: boolean;
    chain: "evm" | "solana" | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// Provider component that handles both EVM and Solana auth
export function AuthProvider({ children }: { children: ReactNode }) {
    const { walletType, isConnected } = useWalletType();
    const evmAuth = useAuthImplementation();
    const solanaAuth = useSolanaAuthImplementation();
    
    // Select the appropriate auth based on wallet type OR authenticated state
    // This ensures persistent sessions work even before wallet reconnects
    const auth = useMemo((): AuthContextType => {
        // If Solana wallet is connected OR we have Solana auth, use Solana
        if ((walletType === "solana" && isConnected) || solanaAuth.isAuthenticated) {
            return {
                ...solanaAuth,
                chain: "solana",
            };
        }
        
        // Default to EVM auth (handles both connected wallet and stored credentials)
        return {
            ...evmAuth,
            chain: evmAuth.isAuthenticated ? "evm" : (walletType === "evm" ? "evm" : null),
        };
    }, [walletType, isConnected, evmAuth, solanaAuth]);
    
    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
}
