"use client";

import { motion, AnimatePresence } from "motion/react";
import { type XMTPGroup } from "@/context/WakuProvider";

type ActiveCall = {
    participantCount: number;
    isVideo: boolean;
};

interface GroupsListProps {
    groups: XMTPGroup[];
    onOpenGroup: (group: XMTPGroup) => void;
    unreadCounts?: Record<string, number>;
    isLoading?: boolean;
    activeGroupCalls?: Record<string, ActiveCall>;
    onJoinCall?: (groupId: string) => void;
}

export function GroupsList({
    groups,
    onOpenGroup,
    unreadCounts = {},
    isLoading,
    activeGroupCalls = {},
    onJoinCall,
}: GroupsListProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#FB8D22] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <svg
                        className="w-6 h-6 text-zinc-500"
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
                <p className="text-zinc-400 text-sm">No groups yet</p>
                <p className="text-zinc-600 text-xs mt-1">
                    Create a group to start chatting!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <AnimatePresence mode="popLayout">
                {groups.map((group, index) => {
                    const unreadCount = unreadCounts[group.id] || 0;
                    const activeCall = activeGroupCalls[group.id];

                    return (
                        <motion.div
                            key={group.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.05 }}
                            className="w-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl p-3 sm:p-4 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                {/* Group Icon */}
                                <button
                                    onClick={() => onOpenGroup(group)}
                                    className="relative flex-shrink-0"
                                >
                                    <div
                                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                                            activeCall
                                                ? "bg-gradient-to-br from-emerald-500 to-green-500 animate-pulse"
                                                : "bg-gradient-to-br from-[#FB8D22] to-[#FF5500]"
                                        }`}
                                    >
                                        {activeCall ? (
                                            <svg
                                                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
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
                                        )}
                                    </div>
                                    {unreadCount > 0 && !activeCall && (
                                        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">
                                                {unreadCount > 9
                                                    ? "9+"
                                                    : unreadCount}
                                            </span>
                                        </div>
                                    )}
                                </button>

                                {/* Info */}
                                <button
                                    onClick={() => onOpenGroup(group)}
                                    className="flex-1 min-w-0 text-left"
                                >
                                    <p className="text-white font-medium truncate text-sm sm:text-base">
                                        {group.name}
                                    </p>
                                    {activeCall ? (
                                        <p className="text-emerald-400 text-xs sm:text-sm flex items-center gap-1">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            {activeCall.participantCount} in
                                            call •{" "}
                                            {activeCall.isVideo
                                                ? "Video"
                                                : "Voice"}
                                        </p>
                                    ) : (
                                        <p className="text-zinc-500 text-xs sm:text-sm">
                                            {group.memberCount} members
                                        </p>
                                    )}
                                </button>

                                {/* Join Call Button or Arrow */}
                                {activeCall && onJoinCall ? (
                                    <button
                                        onClick={() => onJoinCall(group.id)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                                    >
                                        Join
                                    </button>
                                ) : (
                                    <button onClick={() => onOpenGroup(group)}>
                                        <svg
                                            className="w-5 h-5 text-zinc-600 hover:text-zinc-400 transition-colors"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
