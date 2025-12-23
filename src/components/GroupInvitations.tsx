"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { GroupInvitation } from "@/hooks/useGroupInvitations";

interface GroupInvitationsProps {
    invitations: GroupInvitation[];
    onAccept: (
        invitationId: string
    ) => Promise<{ success: boolean; groupId?: string; error?: string }>;
    onDecline: (invitationId: string, groupId: string) => Promise<boolean>;
    onJoinGroup: (groupId: string) => Promise<void>;
    isLoading?: boolean;
}

export function GroupInvitations({
    invitations,
    onAccept,
    onDecline,
    onJoinGroup,
    isLoading,
}: GroupInvitationsProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const formatAddress = (address: string) =>
        `${address.slice(0, 6)}...${address.slice(-4)}`;

    const handleAccept = async (invitation: GroupInvitation) => {
        setProcessingId(invitation.id);
        setError(null);

        try {
            const result = await onAccept(invitation.id);
            if (result.success && result.groupId) {
                // Join the Waku group
                await onJoinGroup(result.groupId);
            } else if (!result.success) {
                setError(result.error || "Failed to accept invitation");
            }
        } catch (err) {
            setError("Failed to accept invitation");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (invitation: GroupInvitation) => {
        setProcessingId(invitation.id);
        setError(null);

        try {
            await onDecline(invitation.id, invitation.groupId);
        } catch (err) {
            setError("Failed to leave group");
        } finally {
            setProcessingId(null);
        }
    };

    if (invitations.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                </svg>
                Group Invitations ({invitations.length})
            </h3>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            <AnimatePresence mode="popLayout">
                {invitations.map((invitation) => (
                    <motion.div
                        key={invitation.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-gradient-to-r from-[#FF5500]/10 to-[#FB8D22]/10 border border-[#FF5500]/30 rounded-xl p-4"
                    >
                        <div className="flex items-start gap-3">
                            {/* Group Icon */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF5500] to-[#FB8D22] flex items-center justify-center flex-shrink-0">
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium">
                                    {invitation.groupName}
                                </p>
                                <p className="text-zinc-400 text-sm">
                                    Invited by{" "}
                                    {formatAddress(invitation.inviterAddress)}
                                </p>
                                <p className="text-zinc-500 text-xs mt-1">
                                    {invitation.createdAt.toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Info text */}
                        <p className="text-zinc-500 text-xs mt-3">
                            You&apos;ve been added to this group. Accept to show
                            it in your list, or decline to leave.
                        </p>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => handleDecline(invitation)}
                                disabled={processingId === invitation.id}
                                className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Leave Group
                            </button>
                            <button
                                onClick={() => handleAccept(invitation)}
                                disabled={processingId === invitation.id}
                                className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-[#FF5500] to-[#FF5500] hover:from-[#E04D00] hover:to-[#E04D00] text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingId === invitation.id ? (
                                    <>
                                        <svg
                                            className="w-4 h-4 animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Opening...
                                    </>
                                ) : (
                                    "Accept"
                                )}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
