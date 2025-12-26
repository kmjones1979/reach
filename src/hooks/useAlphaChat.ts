"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/config/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type AlphaMessage = {
    id: string;
    sender_address: string;
    content: string;
    message_type: "text" | "pixel_art" | "system";
    created_at: string;
};

export type AlphaMembership = {
    user_address: string;
    notifications_muted: boolean;
    last_read_at: string;
    joined_at: string;
    left_at: string | null;
};

type AlphaChatState = {
    messages: AlphaMessage[];
    membership: AlphaMembership | null;
    unreadCount: number;
    isLoading: boolean;
    isMember: boolean;
};

export function useAlphaChat(userAddress: string | null) {
    const [state, setState] = useState<AlphaChatState>({
        messages: [],
        membership: null,
        unreadCount: 0,
        isLoading: true,
        isMember: false,
    });
    const [isSending, setIsSending] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Load membership and messages
    const loadData = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase || !userAddress) {
            setState(prev => ({ ...prev, isLoading: false }));
            return;
        }

        try {
            // Get membership
            const { data: membership } = await supabase
                .from("shout_alpha_membership")
                .select("*")
                .eq("user_address", userAddress.toLowerCase())
                .is("left_at", null)
                .single();

            if (!membership) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    isMember: false,
                    membership: null,
                }));
                return;
            }

            // Get messages (last 100)
            const { data: messages } = await supabase
                .from("shout_alpha_messages")
                .select("*")
                .order("created_at", { ascending: true })
                .limit(100);

            // Calculate unread count
            const unreadCount = messages?.filter(
                msg => new Date(msg.created_at) > new Date(membership.last_read_at)
            ).length || 0;

            setState({
                messages: messages || [],
                membership,
                unreadCount,
                isLoading: false,
                isMember: true,
            });
        } catch (err) {
            console.error("[AlphaChat] Load error:", err);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [userAddress]);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase || !userAddress || !state.isMember) {
            return;
        }

        // Subscribe to new messages
        const channel = supabase
            .channel("alpha-messages")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "shout_alpha_messages",
                },
                (payload) => {
                    const newMessage = payload.new as AlphaMessage;
                    setState(prev => ({
                        ...prev,
                        messages: [...prev.messages, newMessage],
                        unreadCount: prev.unreadCount + 1,
                    }));
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current && supabase) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [userAddress, state.isMember]);

    // Load data on mount
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Send a message
    const sendMessage = useCallback(async (content: string, messageType: "text" | "pixel_art" = "text"): Promise<boolean> => {
        if (!isSupabaseConfigured || !supabase || !userAddress || !content.trim()) {
            return false;
        }

        setIsSending(true);
        try {
            const { error } = await supabase.from("shout_alpha_messages").insert({
                sender_address: userAddress.toLowerCase(),
                content: content.trim(),
                message_type: messageType,
            });

            if (error) throw error;
            return true;
        } catch (err) {
            console.error("[AlphaChat] Send error:", err);
            return false;
        } finally {
            setIsSending(false);
        }
    }, [userAddress]);

    // Mark messages as read
    const markAsRead = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase || !userAddress) return;

        try {
            await supabase
                .from("shout_alpha_membership")
                .update({ last_read_at: new Date().toISOString() })
                .eq("user_address", userAddress.toLowerCase());

            setState(prev => ({ ...prev, unreadCount: 0 }));
        } catch (err) {
            console.error("[AlphaChat] Mark read error:", err);
        }
    }, [userAddress]);

    // Toggle notifications
    const toggleNotifications = useCallback(async (): Promise<boolean> => {
        if (!isSupabaseConfigured || !supabase || !userAddress || !state.membership) {
            return false;
        }

        const newMuted = !state.membership.notifications_muted;

        try {
            const { error } = await supabase
                .from("shout_alpha_membership")
                .update({ notifications_muted: newMuted })
                .eq("user_address", userAddress.toLowerCase());

            if (error) throw error;

            setState(prev => ({
                ...prev,
                membership: prev.membership 
                    ? { ...prev.membership, notifications_muted: newMuted }
                    : null,
            }));

            return true;
        } catch (err) {
            console.error("[AlphaChat] Toggle notifications error:", err);
            return false;
        }
    }, [userAddress, state.membership]);

    // Join Alpha channel
    const joinChannel = useCallback(async (): Promise<boolean> => {
        if (!isSupabaseConfigured || !supabase || !userAddress) return false;

        try {
            const { error } = await supabase.rpc("join_alpha_channel", {
                p_user_address: userAddress.toLowerCase(),
            });

            if (error) throw error;

            // Reload data
            await loadData();
            return true;
        } catch (err) {
            console.error("[AlphaChat] Join error:", err);
            return false;
        }
    }, [userAddress, loadData]);

    // Leave Alpha channel
    const leaveChannel = useCallback(async (): Promise<boolean> => {
        if (!isSupabaseConfigured || !supabase || !userAddress) return false;

        try {
            const { error } = await supabase.rpc("leave_alpha_channel", {
                p_user_address: userAddress.toLowerCase(),
            });

            if (error) throw error;

            setState(prev => ({
                ...prev,
                isMember: false,
                membership: null,
                messages: [],
                unreadCount: 0,
            }));

            return true;
        } catch (err) {
            console.error("[AlphaChat] Leave error:", err);
            return false;
        }
    }, [userAddress]);

    // Get unread count (for external polling)
    const refreshUnreadCount = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase || !userAddress) return;

        try {
            const { data } = await supabase.rpc("get_alpha_unread_count", {
                p_user_address: userAddress.toLowerCase(),
            });

            if (typeof data === "number") {
                setState(prev => ({ ...prev, unreadCount: data }));
            }
        } catch (err) {
            console.error("[AlphaChat] Refresh unread error:", err);
        }
    }, [userAddress]);

    return {
        ...state,
        isSending,
        sendMessage,
        markAsRead,
        toggleNotifications,
        joinChannel,
        leaveChannel,
        refreshUnreadCount,
        refresh: loadData,
    };
}

