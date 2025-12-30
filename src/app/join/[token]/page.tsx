"use client";

import { useState, useEffect, use } from "react";
import { motion } from "motion/react";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";

type ScheduledCall = {
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    title: string;
    status: string;
    guest_name: string | null;
    guest_email: string | null;
    timezone: string;
    is_paid: boolean;
    recipient_wallet_address: string;
    hostName?: string;
};

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [call, setCall] = useState<ScheduledCall | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    useEffect(() => {
        fetchCall();
    }, [token]);

    const fetchCall = async () => {
        try {
            const res = await fetch(`/api/scheduling/join/${token}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Call not found");
                return;
            }

            setCall(data.call);
        } catch {
            setError("Failed to load call details");
        } finally {
            setLoading(false);
        }
    };

    const isUpcoming = call ? new Date(call.scheduled_at) > new Date() : false;
    const isNow = call ? (() => {
        const scheduledTime = new Date(call.scheduled_at);
        const now = new Date();
        const fiveMinsBefore = new Date(scheduledTime.getTime() - 5 * 60 * 1000);
        const thirtyMinsAfter = new Date(scheduledTime.getTime() + 30 * 60 * 1000);
        return now >= fiveMinsBefore && now <= thirtyMinsAfter;
    })() : false;

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !call) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Call Not Found</h1>
                    <p className="text-zinc-500 mb-6">{error || "This invite link is invalid or has expired."}</p>
                    <Link href="/" className="text-orange-400 hover:text-orange-300 font-medium">
                        Go to Spritz →
                    </Link>
                </div>
            </div>
        );
    }

    const scheduledTime = new Date(call.scheduled_at);

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px]" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-4 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    {/* Logo */}
                    <div className="mb-8">
                        <Link href="/" className="inline-block text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                            Spritz
                        </Link>
                    </div>

                    {/* Main Card */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8">
                        {/* Status Badge */}
                        <div className="mb-6">
                            {call.status === "cancelled" ? (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                                    <span>✕</span> Cancelled
                                </span>
                            ) : call.status === "completed" ? (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-500/20 text-zinc-400 text-sm font-medium">
                                    <span>✓</span> Completed
                                </span>
                            ) : isUpcoming ? (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                                    <span>📅</span> Upcoming
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 text-orange-400 text-sm font-medium animate-pulse">
                                    <span>🔴</span> Ready to Join
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            {call.title || "Scheduled Call"}
                        </h1>
                        <p className="text-zinc-400 mb-8">
                            with {call.hostName || `${call.recipient_wallet_address.slice(0, 6)}...${call.recipient_wallet_address.slice(-4)}`}
                        </p>

                        {/* Time Info */}
                        <div className="bg-zinc-800/50 rounded-xl p-6 mb-8">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                    <span className="text-2xl">📅</span>
                                </div>
                            </div>
                            <p className="text-white text-xl font-semibold mb-1">
                                {formatInTimeZone(scheduledTime, userTimezone, "EEEE, MMMM d, yyyy")}
                            </p>
                            <p className="text-orange-400 text-lg font-medium mb-1">
                                {formatInTimeZone(scheduledTime, userTimezone, "h:mm a")}
                            </p>
                            <p className="text-zinc-500 text-sm">
                                {call.duration_minutes} minutes · {userTimezone}
                            </p>
                        </div>

                        {/* Join Button */}
                        {call.status === "cancelled" ? (
                            <p className="text-zinc-500">This call has been cancelled.</p>
                        ) : call.status === "completed" ? (
                            <p className="text-zinc-500">This call has already ended.</p>
                        ) : isNow || !isUpcoming ? (
                            <button
                                onClick={() => {
                                    // Navigate to call - this would integrate with your calling system
                                    window.location.href = `/?join=${call.id}`;
                                }}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-semibold hover:from-orange-400 hover:to-amber-400 transition-all"
                            >
                                Join Call Now
                            </button>
                        ) : (
                            <div>
                                <button
                                    disabled
                                    className="w-full py-4 rounded-xl bg-zinc-800 text-zinc-400 text-lg font-semibold cursor-not-allowed mb-3"
                                >
                                    Join Call (Opens 5 min before)
                                </button>
                                <p className="text-zinc-500 text-sm">
                                    You can join 5 minutes before the scheduled time
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-8">
                        <Link 
                            href="/" 
                            className="text-zinc-500 hover:text-white text-sm transition-colors"
                        >
                            Powered by <span className="text-orange-400 font-semibold">Spritz</span>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

