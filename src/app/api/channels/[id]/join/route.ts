import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/channels/[id]/join - Join a channel
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();
        const { userAddress } = body;

        if (!userAddress) {
            return NextResponse.json(
                { error: "User address is required" },
                { status: 400 }
            );
        }

        const normalizedAddress = userAddress.toLowerCase();

        // Check if channel exists
        const { data: channel } = await supabase
            .from("shout_public_channels")
            .select("id, name")
            .eq("id", id)
            .single();

        if (!channel) {
            return NextResponse.json(
                { error: "Channel not found" },
                { status: 404 }
            );
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from("shout_channel_members")
            .select("id")
            .eq("channel_id", id)
            .eq("user_address", normalizedAddress)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: "Already a member of this channel" },
                { status: 400 }
            );
        }

        // Join the channel
        const { error: joinError } = await supabase
            .from("shout_channel_members")
            .insert({
                channel_id: id,
                user_address: normalizedAddress,
            });

        if (joinError) {
            console.error("[Channels API] Error joining channel:", joinError);
            return NextResponse.json(
                { error: "Failed to join channel" },
                { status: 500 }
            );
        }

        // Increment member count
        await supabase.rpc("increment_channel_members", { channel_uuid: id });

        return NextResponse.json({ success: true, channelName: channel.name });
    } catch (e) {
        console.error("[Channels API] Error:", e);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

