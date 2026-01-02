import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to check if a string is a wallet address
function isWalletAddress(str: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(str);
}

// GET /api/rooms/[code] - Get room details by join code or wallet address
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;

        if (!code) {
            return NextResponse.json(
                { error: "Join code or wallet address is required" },
                { status: 400 }
            );
        }

        let room;
        let error;

        // Check if code is a wallet address (permanent room)
        if (isWalletAddress(code)) {
            const normalizedAddress = code.toLowerCase();
            
            // Get user's permanent room
            const { data: user } = await supabase
                .from("shout_users")
                .select("permanent_room_id")
                .eq("wallet_address", normalizedAddress)
                .single();

            if (user?.permanent_room_id) {
                // Look up permanent room
                const result = await supabase
                    .from("shout_instant_rooms")
                    .select("*")
                    .eq("room_id", user.permanent_room_id)
                    .single();
                
                room = result.data;
                error = result.error;
            } else {
                // No permanent room exists yet - trigger creation via permanent endpoint
                // For now, return 404 - the frontend can call /api/rooms/permanent to create it
                return NextResponse.json(
                    { error: "Permanent room not found. Please create it first." },
                    { status: 404 }
                );
            }
        } else {
            // Look up room by join code
            const result = await supabase
                .from("shout_instant_rooms")
                .select("*")
                .eq("join_code", code.toUpperCase())
                .single();
            
            room = result.data;
            error = result.error;
        }

        if (error || !room) {
            return NextResponse.json(
                { error: "Room not found" },
                { status: 404 }
            );
        }

        // Check if room is still active (skip expiration check for permanent rooms)
        if (room.status !== "active") {
            return NextResponse.json(
                { error: "This room has ended" },
                { status: 410 }
            );
        }

        // Check expiration (only for non-permanent rooms)
        if (room.expires_at && new Date(room.expires_at) < new Date()) {
            // Mark as expired
            await supabase
                .from("shout_instant_rooms")
                .update({ status: "expired" })
                .eq("id", room.id);

            return NextResponse.json(
                { error: "This room has expired" },
                { status: 410 }
            );
        }

        // Get host info
        const { data: host } = await supabase
            .from("shout_users")
            .select("display_name, username, avatar")
            .eq("wallet_address", room.host_wallet_address)
            .single();

        return NextResponse.json({
            room: {
                id: room.id,
                roomId: room.room_id,
                joinCode: room.join_code,
                title: room.title,
                maxParticipants: room.max_participants,
                participantCount: room.participant_count,
                expiresAt: room.expires_at,
                createdAt: room.created_at,
                isPermanent: !room.expires_at, // Permanent rooms have no expiration
                host: {
                    address: room.host_wallet_address,
                    displayName: host?.display_name || host?.username || `${room.host_wallet_address.slice(0, 6)}...${room.host_wallet_address.slice(-4)}`,
                    avatar: host?.avatar,
                },
            },
        });
    } catch (error) {
        console.error("[Rooms] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch room" },
            { status: 500 }
        );
    }
}

// DELETE /api/rooms/[code] - End a room (host only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const body = await request.json();
        const { hostWalletAddress } = body;

        if (!code || !hostWalletAddress) {
            return NextResponse.json(
                { error: "Join code and host address are required" },
                { status: 400 }
            );
        }

        // Verify host and end room
        const { data: room, error } = await supabase
            .from("shout_instant_rooms")
            .update({ status: "ended", ended_at: new Date().toISOString() })
            .eq("join_code", code.toUpperCase())
            .eq("host_wallet_address", hostWalletAddress.toLowerCase())
            .eq("status", "active")
            .select()
            .single();

        if (error || !room) {
            return NextResponse.json(
                { error: "Room not found or you are not the host" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Room ended",
        });
    } catch (error) {
        console.error("[Rooms] Error:", error);
        return NextResponse.json(
            { error: "Failed to end room" },
            { status: 500 }
        );
    }
}

