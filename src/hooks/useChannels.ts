import { useState, useCallback, useEffect } from "react";
import type { PublicChannel } from "@/app/api/channels/route";
import type { ChannelMessage } from "@/app/api/channels/[id]/messages/route";

export function useChannels(userAddress: string | null) {
    const [channels, setChannels] = useState<PublicChannel[]>([]);
    const [joinedChannels, setJoinedChannels] = useState<PublicChannel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchChannels = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const url = userAddress
                ? `/api/channels?userAddress=${encodeURIComponent(userAddress)}`
                : "/api/channels";

            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch channels");
            }

            setChannels(data.channels || []);
        } catch (e) {
            console.error("[useChannels] Error:", e);
            setError(e instanceof Error ? e.message : "Failed to fetch channels");
        } finally {
            setIsLoading(false);
        }
    }, [userAddress]);

    const fetchJoinedChannels = useCallback(async () => {
        if (!userAddress) {
            setJoinedChannels([]);
            return;
        }

        try {
            const res = await fetch(
                `/api/channels?userAddress=${encodeURIComponent(userAddress)}&joined=true`
            );
            const data = await res.json();

            if (res.ok) {
                setJoinedChannels(data.channels || []);
            }
        } catch (e) {
            console.error("[useChannels] Error fetching joined channels:", e);
        }
    }, [userAddress]);

    const joinChannel = useCallback(
        async (channelId: string) => {
            if (!userAddress) return false;

            try {
                const res = await fetch(`/api/channels/${channelId}/join`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userAddress }),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to join channel");
                }

                // Refresh channels
                await fetchChannels();
                await fetchJoinedChannels();

                return true;
            } catch (e) {
                console.error("[useChannels] Error joining channel:", e);
                return false;
            }
        },
        [userAddress, fetchChannels, fetchJoinedChannels]
    );

    const leaveChannel = useCallback(
        async (channelId: string) => {
            if (!userAddress) return false;

            try {
                const res = await fetch(`/api/channels/${channelId}/leave`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userAddress }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to leave channel");
                }

                // Refresh channels
                await fetchChannels();
                await fetchJoinedChannels();

                return true;
            } catch (e) {
                console.error("[useChannels] Error leaving channel:", e);
                return false;
            }
        },
        [userAddress, fetchChannels, fetchJoinedChannels]
    );

    const createChannel = useCallback(
        async (params: {
            name: string;
            description?: string;
            emoji?: string;
            category?: string;
        }) => {
            if (!userAddress) return null;

            try {
                const res = await fetch("/api/channels", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...params,
                        creatorAddress: userAddress,
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to create channel");
                }

                // Refresh channels
                await fetchChannels();
                await fetchJoinedChannels();

                return data.channel as PublicChannel;
            } catch (e) {
                console.error("[useChannels] Error creating channel:", e);
                throw e;
            }
        },
        [userAddress, fetchChannels, fetchJoinedChannels]
    );

    // Fetch on mount
    useEffect(() => {
        fetchChannels();
        fetchJoinedChannels();
    }, [fetchChannels, fetchJoinedChannels]);

    return {
        channels,
        joinedChannels,
        isLoading,
        error,
        fetchChannels,
        fetchJoinedChannels,
        joinChannel,
        leaveChannel,
        createChannel,
    };
}

export function useChannelMessages(channelId: string | null, userAddress: string | null) {
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!channelId) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/channels/${channelId}/messages?limit=100`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch messages");
            }

            setMessages(data.messages || []);
        } catch (e) {
            console.error("[useChannelMessages] Error:", e);
            setError(e instanceof Error ? e.message : "Failed to fetch messages");
        } finally {
            setIsLoading(false);
        }
    }, [channelId]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!channelId || !userAddress || !content.trim()) return null;

            try {
                const res = await fetch(`/api/channels/${channelId}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        senderAddress: userAddress,
                        content: content.trim(),
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to send message");
                }

                // Add message to local state
                setMessages((prev) => [...prev, data.message]);

                return data.message as ChannelMessage;
            } catch (e) {
                console.error("[useChannelMessages] Error sending:", e);
                return null;
            }
        },
        [channelId, userAddress]
    );

    // Fetch messages on mount and when channel changes
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Poll for new messages every 5 seconds
    useEffect(() => {
        if (!channelId) return;

        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [channelId, fetchMessages]);

    return {
        messages,
        isLoading,
        error,
        fetchMessages,
        sendMessage,
    };
}

