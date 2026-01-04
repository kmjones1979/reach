"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type BugReportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    userAddress: string;
};

const CATEGORIES = [
    "Agents",
    "Friends",
    "Calls",
    "Chats",
    "Rooms",
    "Livestream",
    "Settings",
    "Configuration",
    "Other",
] as const;

type Category = typeof CATEGORIES[number];

export function BugReportModal({
    isOpen,
    onClose,
    userAddress,
}: BugReportModalProps) {
    const [category, setCategory] = useState<Category>("Other");
    const [description, setDescription] = useState("");
    const [replicationSteps, setReplicationSteps] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!description.trim()) {
            setError("Please provide a description");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/bug-reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userAddress,
                    category,
                    description: description.trim(),
                    replicationSteps: replicationSteps.trim() || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit bug report");
            }

            setSuccess(true);
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err) {
            console.error("[BugReport] Submit error:", err);
            setError(
                err instanceof Error ? err.message : "Failed to submit bug report"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setCategory("Other");
        setDescription("");
        setReplicationSteps("");
        setError(null);
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-800 max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                Submit Bug Report
                            </h2>
                            <p className="text-zinc-500 text-sm mt-1">
                                Help us improve Spritz
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <svg
                                className="w-6 h-6"
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

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-emerald-400"
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
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Bug Report Submitted!
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Thank you for helping us improve Spritz.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Category *
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(e.target.value as Category)
                                    }
                                    disabled={isSubmitting}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    disabled={isSubmitting}
                                    placeholder="Describe the bug you encountered..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:opacity-50"
                                />
                            </div>

                            {/* Replication Steps */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    How to Replicate (Optional)
                                </label>
                                <textarea
                                    value={replicationSteps}
                                    onChange={(e) =>
                                        setReplicationSteps(e.target.value)
                                    }
                                    disabled={isSubmitting}
                                    placeholder="Steps to reproduce the bug..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:opacity-50"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={
                                        isSubmitting || !description.trim()
                                    }
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Report"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

