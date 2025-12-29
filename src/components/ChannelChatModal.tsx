"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChannelMessages } from "@/hooks/useChannels";
import type { PublicChannel } from "@/app/api/channels/route";

type ChannelChatModalProps = {
    isOpen: boolean;
    onClose: () => void;
    channel: PublicChannel;
    userAddress: string;
    onLeave: () => void;
};

export function ChannelChatModal({
    isOpen,
    onClose,
    channel,
    userAddress,
    onLeave,
}: ChannelChatModalProps) {
    const { messages, isLoading, sendMessage } = useChannelMessages(
        channel.id,
        userAddress
    );
    const [inputValue, setInputValue] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim() || isSending) return;

        setIsSending(true);
        const content = inputValue.trim();
        setInputValue("");

        await sendMessage(content);
        setIsSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xl">
                                {channel.emoji}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-white font-bold">{channel.name}</h2>
                                    {channel.is_official && (
                                        <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                            Official
                                        </span>
                                    )}
                                </div>
                                <p className="text-zinc-500 text-sm">
                                    {channel.member_count} members
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onLeave}
                                className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                Leave
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <svg
                                    className="w-5 h-5 text-zinc-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {isLoading && messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-600 border-t-orange-500" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl mb-4">
                                    {channel.emoji}
                                </div>
                                <p className="text-zinc-400 mb-2">No messages yet</p>
                                <p className="text-zinc-600 text-sm">
                                    Be the first to say something!
                                </p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, index) => {
                                    const isOwn =
                                        msg.sender_address.toLowerCase() ===
                                        userAddress.toLowerCase();
                                    const showSender =
                                        index === 0 ||
                                        messages[index - 1].sender_address !== msg.sender_address;

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[80%] ${
                                                    isOwn ? "items-end" : "items-start"
                                                }`}
                                            >
                                                {showSender && !isOwn && (
                                                    <p className="text-xs text-zinc-500 mb-1 ml-1">
                                                        {formatAddress(msg.sender_address)}
                                                    </p>
                                                )}
                                                <div
                                                    className={`px-4 py-2 rounded-2xl ${
                                                        isOwn
                                                            ? "bg-[#FF5500] text-white rounded-br-md"
                                                            : "bg-zinc-800 text-white rounded-bl-md"
                                                    }`}
                                                >
                                                    <p className="break-words">{msg.content}</p>
                                                </div>
                                                <p className="text-[10px] text-zinc-600 mt-1 px-1">
                                                    {formatTime(msg.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-zinc-800">
                        <div className="flex items-center gap-3">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message #${channel.name}`}
                                className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5500]"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isSending}
                                className="p-3 bg-[#FF5500] text-white rounded-xl hover:bg-[#FF6600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

