import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/channels/[id]/leave - Leave a channel
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

        // Delete membership
        const { error: leaveError } = await supabase
            .from("shout_channel_members")
            .delete()
            .eq("channel_id", id)
            .eq("user_address", normalizedAddress);

        if (leaveError) {
            console.error("[Channels API] Error leaving channel:", leaveError);
            return NextResponse.json(
                { error: "Failed to leave channel" },
                { status: 500 }
            );
        }

        // Decrement member count
        await supabase.rpc("decrement_channel_members", { channel_uuid: id });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("[Channels API] Error:", e);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}

