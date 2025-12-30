import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLivepeerStream, getPlaybackUrl } from "@/lib/livepeer";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/public/streams/[id] - Get public stream details (no auth required)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { data: stream, error } = await supabase
        .from("shout_streams")
        .select("id, title, description, status, playback_id, user_address, started_at, ended_at, viewer_count")
        .eq("id", id)
        .single();

    if (error || !stream) {
        return NextResponse.json(
            { error: "Stream not found" },
            { status: 404 }
        );
    }

    // Get live status from Livepeer if stream is supposed to be live
    let isLive = stream.status === "live";
    if (stream.status === "live" && stream.playback_id) {
        try {
            // Try to get the actual live status from Livepeer
            const livepeerStream = await getLivepeerStream(stream.playback_id);
            isLive = livepeerStream?.isActive || false;
        } catch {
            // If we can't check, assume it's live based on DB status
        }
    }

    // Get user info for display name
    const { data: user } = await supabase
        .from("shout_users")
        .select("display_name, avatar_url")
        .eq("address", stream.user_address)
        .single();

    return NextResponse.json({
        stream: {
            id: stream.id,
            title: stream.title,
            description: stream.description,
            status: stream.status,
            is_live: isLive,
            playback_url: stream.playback_id ? getPlaybackUrl(stream.playback_id) : null,
            started_at: stream.started_at,
            ended_at: stream.ended_at,
            viewer_count: stream.viewer_count || 0,
            streamer: {
                address: stream.user_address,
                display_name: user?.display_name || null,
                avatar_url: user?.avatar_url || null,
            },
        },
    });
}

// POST /api/public/streams/[id] - Track viewer (increment count)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const action = request.nextUrl.searchParams.get("action");

    // Handle sendBeacon leave action
    if (action === "leave") {
        const { error } = await supabase.rpc("decrement_viewer_count", { stream_id: id });
        if (error) {
            console.error("[Public Streams API] Error decrementing viewer count:", error);
        }
        return NextResponse.json({ success: true });
    }

    // Increment viewer count
    const { error } = await supabase.rpc("increment_viewer_count", { stream_id: id });
    if (error) {
        console.error("[Public Streams API] Error incrementing viewer count:", error);
        return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// DELETE /api/public/streams/[id] - Decrement viewer count
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { error } = await supabase.rpc("decrement_viewer_count", { stream_id: id });
    if (error) {
        console.error("[Public Streams API] Error decrementing viewer count:", error);
    }

    return NextResponse.json({ success: true });
}

