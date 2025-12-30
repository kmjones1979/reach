"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Hls from "hls.js";
import Image from "next/image";

type StreamData = {
    id: string;
    title: string | null;
    description: string | null;
    status: string;
    is_live: boolean;
    playback_url: string | null;
    started_at: string | null;
    ended_at: string | null;
    viewer_count: number;
    streamer: {
        address: string;
        display_name: string | null;
        avatar_url: string | null;
    };
};

export default function PublicLivePage() {
    const params = useParams();
    const streamId = params.id as string;

    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasTrackedViewerRef = useRef(false);

    const [stream, setStream] = useState<StreamData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isWaitingForBroadcast, setIsWaitingForBroadcast] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [viewerCount, setViewerCount] = useState(0);

    const MAX_RETRIES = 60;
    const RETRY_INTERVAL = 1000;

    // Fetch stream data
    useEffect(() => {
        const fetchStream = async () => {
            try {
                const res = await fetch(`/api/public/streams/${streamId}`);
                if (!res.ok) {
                    setError("Stream not found");
                    setIsLoading(false);
                    return;
                }
                const data = await res.json();
                setStream(data.stream);
                setViewerCount(data.stream.viewer_count || 0);
                setIsLoading(false);
            } catch {
                setError("Failed to load stream");
                setIsLoading(false);
            }
        };

        if (streamId) {
            fetchStream();
        }
    }, [streamId]);

    // Track viewer
    useEffect(() => {
        if (stream && !hasTrackedViewerRef.current) {
            hasTrackedViewerRef.current = true;
            fetch(`/api/public/streams/${streamId}`, { method: "POST" }).catch(() => {});

            const handleBeforeUnload = () => {
                if (hasTrackedViewerRef.current) {
                    navigator.sendBeacon(`/api/public/streams/${streamId}?action=leave`);
                }
            };
            window.addEventListener("beforeunload", handleBeforeUnload);

            return () => {
                window.removeEventListener("beforeunload", handleBeforeUnload);
                if (hasTrackedViewerRef.current) {
                    hasTrackedViewerRef.current = false;
                    fetch(`/api/public/streams/${streamId}`, { method: "DELETE" }).catch(() => {});
                }
            };
        }
    }, [stream, streamId]);

    // Refresh viewer count
    useEffect(() => {
        if (!stream) return;

        const refreshViewerCount = async () => {
            try {
                const res = await fetch(`/api/public/streams/${streamId}`);
                if (res.ok) {
                    const data = await res.json();
                    setViewerCount(data.stream.viewer_count || 0);
                }
            } catch {
                // Ignore
            }
        };

        const interval = setInterval(refreshViewerCount, 5000);
        return () => clearInterval(interval);
    }, [stream, streamId]);

    // Initialize HLS player
    const initHls = useCallback(() => {
        if (!stream?.playback_url || !videoRef.current) return;

        const video = videoRef.current;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 30,
            });

            hlsRef.current = hls;
            hls.loadSource(stream.playback_url);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsWaitingForBroadcast(false);
                setRetryCount(0);
                video.play().catch(() => setIsPlaying(false));
            });

            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    if (
                        data.details === "manifestParsingError" ||
                        data.details === "manifestLoadError" ||
                        (data.response && data.response.code === 404)
                    ) {
                        setIsWaitingForBroadcast(true);
                        if (retryCount < MAX_RETRIES) {
                            retryTimeoutRef.current = setTimeout(() => {
                                setRetryCount((prev) => prev + 1);
                                initHls();
                            }, RETRY_INTERVAL);
                        } else {
                            setError("Stream is not available. The broadcaster may have ended the stream.");
                            setIsWaitingForBroadcast(false);
                        }
                    } else {
                        setError("Failed to load stream");
                    }
                }
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = stream.playback_url;
            video.addEventListener("loadedmetadata", () => {
                setIsWaitingForBroadcast(false);
                video.play().catch(() => setIsPlaying(false));
            });
            video.addEventListener("error", () => {
                setIsWaitingForBroadcast(true);
                if (retryCount < MAX_RETRIES) {
                    retryTimeoutRef.current = setTimeout(() => {
                        setRetryCount((prev) => prev + 1);
                        initHls();
                    }, RETRY_INTERVAL);
                }
            });
        } else {
            setError("Your browser doesn't support HLS playback");
        }
    }, [stream?.playback_url, retryCount]);

    // Initialize player when stream data is loaded
    useEffect(() => {
        if (stream?.playback_url) {
            initHls();
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [stream?.playback_url]); // eslint-disable-line react-hooks/exhaustive-deps

    // Video events
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener("play", handlePlay);
        video.addEventListener("pause", handlePause);

        return () => {
            video.removeEventListener("play", handlePlay);
            video.removeEventListener("pause", handlePause);
        };
    }, []);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Loading stream...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !stream) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Stream Not Found</h1>
                    <p className="text-zinc-400 mb-8">This stream may have ended or doesn&apos;t exist.</p>
                    <a
                        href="https://app.spritz.chat"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-400 hover:to-red-400 transition-all"
                    >
                        <Image src="/icons/icon-96x96.png" alt="Spritz" width={24} height={24} className="rounded" />
                        Open Spritz
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col">
            {/* Header */}
            <header className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <a href="https://app.spritz.chat" className="flex items-center gap-2">
                    <Image src="/icons/icon-96x96.png" alt="Spritz" width={32} height={32} className="rounded-lg" />
                    <span className="text-white font-bold text-lg">Spritz</span>
                </a>
                <a
                    href="https://app.spritz.chat"
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold rounded-lg hover:from-orange-400 hover:to-red-400 transition-all"
                >
                    Join Spritz
                </a>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col lg:flex-row">
                {/* Video section */}
                <div className="flex-1 flex flex-col bg-black">
                    {/* Video container */}
                    <div className="relative flex-1 flex items-center justify-center group min-h-[50vh] lg:min-h-0">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-contain"
                            playsInline
                            onClick={togglePlay}
                        />

                        {/* Waiting for broadcast */}
                        {isWaitingForBroadcast && !error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <div className="text-center max-w-sm px-4">
                                    <div className="relative mx-auto mb-4 w-16 h-16">
                                        <div className="absolute inset-0 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                        <div className="absolute inset-3 bg-red-500/20 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <h3 className="text-white font-medium mb-2">Waiting for broadcast...</h3>
                                    <p className="text-zinc-400 text-sm mb-4">
                                        The streamer is setting up. The video will appear once they start broadcasting.
                                    </p>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                    {retryCount > 0 && (
                                        <p className="text-zinc-500 text-xs mt-4">
                                            Checking for stream... ({retryCount}/{MAX_RETRIES})
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error overlay */}
                        {error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <div className="text-center">
                                    <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-red-400 mb-4">{error}</p>
                                    <button
                                        onClick={() => {
                                            setError(null);
                                            setRetryCount(0);
                                            initHls();
                                        }}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Video controls */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-4">
                                <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    {isPlaying ? (
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>

                                <div className="flex items-center gap-2">
                                    <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                        {isMuted || volume === 0 ? (
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            </svg>
                                        )}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        className="w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="flex-1" />

                                {stream?.status === "live" && (
                                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-2">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        LIVE
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info sidebar */}
                <div className="w-full lg:w-96 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 p-6">
                    {/* Streamer info */}
                    <div className="flex items-center gap-3 mb-6">
                        {stream?.streamer.avatar_url ? (
                            <img
                                src={stream.streamer.avatar_url}
                                alt=""
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold ring-2 ring-red-500">
                                {(stream?.streamer.display_name || stream?.streamer.address || "?").slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-medium truncate">
                                    {stream?.streamer.display_name || formatAddress(stream?.streamer.address || "")}
                                </span>
                                {stream?.status === "live" && (
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shrink-0">
                                        LIVE
                                    </span>
                                )}
                            </div>
                            <p className="text-zinc-400 text-sm">{viewerCount} watching</p>
                        </div>
                    </div>

                    {/* Stream title */}
                    <h1 className="text-xl font-bold text-white mb-2">
                        {stream?.title || "Live Stream"}
                    </h1>
                    {stream?.description && (
                        <p className="text-zinc-400 mb-6">{stream.description}</p>
                    )}

                    {stream?.started_at && (
                        <p className="text-zinc-500 text-sm mb-6">
                            Started {new Date(stream.started_at).toLocaleString()}
                        </p>
                    )}

                    {/* CTA */}
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                        <h3 className="text-white font-semibold mb-2">Join the conversation</h3>
                        <p className="text-zinc-400 text-sm mb-4">
                            Create a free Spritz account to chat, make calls, and go live yourself!
                        </p>
                        <a
                            href="https://app.spritz.chat"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-400 hover:to-red-400 transition-all"
                        >
                            <Image src="/icons/icon-96x96.png" alt="" width={20} height={20} className="rounded" />
                            Sign up for Spritz
                        </a>
                        <p className="text-zinc-500 text-xs text-center mt-3">
                            No email required • Sign in with wallet or passkey
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

