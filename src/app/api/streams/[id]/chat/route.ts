import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type StreamChatMessage = {
    id: string;
    stream_id: string;
    user_address: string;
    message: string;
    type: "message" | "reaction";
    created_at: string;
    user?: {
        username: string | null;
        display_name: string | null;
        ens_name: string | null;
        avatar_url: string | null;
    };
};

// GET /api/streams/[id]/chat - Get chat messages for a stream
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const since = request.nextUrl.searchParams.get("since");

    let query = supabase
        .from("shout_stream_chat")
        .select("*")
        .eq("stream_id", id)
        .order("created_at", { ascending: true });

    // If "since" provided, only get messages after that timestamp
    if (since) {
        query = query.gt("created_at", since);
    } else {
        // Otherwise get last 100 messages
        query = query.limit(100);
    }

    const { data: messages, error } = await query;

    if (error) {
        console.error("[Stream Chat API] Error fetching messages:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    // Get user info for all messages
    if (messages && messages.length > 0) {
        const userAddresses = [...new Set(messages.map((m) => m.user_address))];
        const { data: users } = await supabase
            .from("shout_users")
            .select("wallet_address, username, display_name, ens_name, avatar_url")
            .in("wallet_address", userAddresses);

        const userMap = new Map(users?.map((u) => [u.wallet_address, u]) || []);

        const messagesWithUsers = messages.map((m) => ({
            ...m,
            user: userMap.get(m.user_address) || null,
        }));

        return NextResponse.json({ messages: messagesWithUsers });
    }

    return NextResponse.json({ messages: [] });
}

// POST /api/streams/[id]/chat - Send a chat message or reaction
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { userAddress, message, type = "message" } = body;

        if (!userAddress) {
            return NextResponse.json({ error: "User address required" }, { status: 400 });
        }

        if (!message || message.trim().length === 0) {
            return NextResponse.json({ error: "Message required" }, { status: 400 });
        }

        // Verify stream exists
        const { data: stream, error: streamError } = await supabase
            .from("shout_streams")
            .select("id, status")
            .eq("id", id)
            .single();

        if (streamError || !stream) {
            return NextResponse.json({ error: "Stream not found" }, { status: 404 });
        }

        // Insert message
        const { data: newMessage, error: insertError } = await supabase
            .from("shout_stream_chat")
            .insert({
                stream_id: id,
                user_address: userAddress.toLowerCase(),
                message: message.trim().slice(0, 500), // Limit to 500 chars
                type,
            })
            .select()
            .single();

        if (insertError) {
            console.error("[Stream Chat API] Error inserting message:", insertError);
            return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
        }

        // Get user info
        const { data: user } = await supabase
            .from("shout_users")
            .select("username, display_name, ens_name, avatar_url")
            .eq("wallet_address", userAddress.toLowerCase())
            .single();

        return NextResponse.json({
            message: {
                ...newMessage,
                user: user || null,
            },
        });
    } catch (e) {
        console.error("[Stream Chat API] Error:", e);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}

