"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useAlienAuthContext } from "@/context/AlienAuthProvider";

// Dynamically import SignInButton to avoid SSR issues
const SignInButton = dynamic(
    () => import("@alien_org/sso-sdk-react").then((mod) => mod.SignInButton),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-12 bg-zinc-800 rounded-xl animate-pulse" />
        ),
    }
);

export function AlienAuth() {
    const {
        isAuthenticated,
        alienAddress,
        isLoading,
        logout,
    } = useAlienAuthContext();

    const formatAddress = (addr: string) => {
        if (addr.length <= 12) return addr;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    // Show connected state
    if (isAuthenticated && alienAddress) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
            >
                <div className="bg-gradient-to-br from-[#FF5500]/10 to-[#FB8D22]/10 border border-[#FF5500]/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FB8D22] to-[#FF5500] flex items-center justify-center">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[#FF5500] font-semibold">
                                Digital ID Connected
                            </p>
                            <p className="text-zinc-400 text-sm">
                                Signed in with Alien
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/30 rounded-xl p-4 mb-4">
                        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
                            Identity
                        </p>
                        <p className="text-white font-mono text-sm">
                            {formatAddress(alienAddress)}
                        </p>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-sm font-medium"
                    >
                        Disconnect
                    </button>
                </div>
            </motion.div>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <div className="w-full flex flex-col items-center justify-center gap-4 py-8">
                <div className="w-8 h-8 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">Loading...</p>
            </div>
        );
    }

    // Show sign-in button
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full flex flex-col items-center justify-center gap-4"
        >
            <div className="text-center mb-2">
                <h3 className="text-white font-semibold mb-1">Sign in with Digital ID</h3>
                <p className="text-zinc-500 text-sm">
                    Use your Alien identity for passwordless authentication
                </p>
            </div>

            {/* Alien Sign In Button */}
            <div className="w-full flex items-center justify-center min-h-[48px] py-2">
                <div className="w-full">
                    <SignInButton color="dark" />
                </div>
            </div>

            <p className="text-center text-zinc-600 text-xs mt-2">
                Powered by Alien SSO
            </p>
        </motion.div>
    );
}
