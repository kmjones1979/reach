import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type ChannelMessage = {
    id: string;
    channel_id: string;
    sender_address: string;
    content: string;
    message_type: string;
    created_at: string;
};

// GET /api/channels/[id]/messages - Get channel messages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100");
    const before = request.nextUrl.searchParams.get("before"); // For pagination

    let query = supabase
        .from("shout_channel_messages")
        .select("*")
        .eq("channel_id", id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (before) {
        query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;

    if (error) {
        console.error("[Channels API] Error fetching messages:", error);
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        );
    }

    // Return in chronological order
    return NextResponse.json({ messages: messages?.reverse() || [] });
}

// POST /api/channels/[id]/messages - Send a message
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { senderAddress, content, messageType } = body;

        if (!senderAddress || !content) {
            return NextResponse.json(
                { error: "Sender address and content are required" },
                { status: 400 }
            );
        }

        const normalizedAddress = senderAddress.toLowerCase();

        // Check if user is a member
        const { data: membership } = await supabase
            .from("shout_channel_members")
            .select("id")
            .eq("channel_id", id)
            .eq("user_address", normalizedAddress)
            .single();

        if (!membership) {
            return NextResponse.json(
                { error: "You must be a member to send messages" },
                { status: 403 }
            );
        }

        // Insert message
        const { data: message, error } = await supabase
            .from("shout_channel_messages")
            .insert({
                channel_id: id,
                sender_address: normalizedAddress,
                content: content.trim(),
                message_type: messageType || "text",
            })
            .select()
            .single();

        if (error) {
            console.error("[Channels API] Error sending message:", error);
            return NextResponse.json(
                { error: "Failed to send message" },
                { status: 500 }
            );
        }

        // Increment message count
        await supabase.rpc("increment_channel_messages", { channel_uuid: id });

        return NextResponse.json({ message });
    } catch (e) {
        console.error("[Channels API] Error:", e);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

