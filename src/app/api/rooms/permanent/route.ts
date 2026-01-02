import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HUDDLE01_API_KEY = process.env.HUDDLE01_API_KEY || "";

// GET /api/rooms/permanent?wallet_address=0x... - Get or create permanent room for a user
export async function GET(request: NextRequest) {
    if (!HUDDLE01_API_KEY) {
        return NextResponse.json(
            { error: "Video calling not configured" },
            { status: 500 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const walletAddress = searchParams.get("wallet_address");

        if (!walletAddress) {
            return NextResponse.json(
                { error: "Wallet address is required" },
                { status: 400 }
            );
        }

        const normalizedAddress = walletAddress.toLowerCase();

        // Check if user has an existing permanent room
        const { data: user, error: userError } = await supabase
            .from("shout_users")
            .select("permanent_room_id")
            .eq("wallet_address", normalizedAddress)
            .single();

        if (userError && userError.code !== "PGRST116") {
            // PGRST116 is "not found" - that's okay, we'll create the user
            console.error("[Permanent Rooms] Error fetching user:", userError);
        }

        let roomId = user?.permanent_room_id;

        // If room exists, verify it's still active
        if (roomId) {
            const { data: existingRoom } = await supabase
                .from("shout_instant_rooms")
                .select("room_id, status")
                .eq("room_id", roomId)
                .single();

            if (existingRoom && existingRoom.status === "active") {
                return NextResponse.json({
                    success: true,
                    room: {
                        roomId: existingRoom.room_id,
                        permanentUrl: `https://app.spritz.chat/room/${normalizedAddress}`,
                        walletAddress: normalizedAddress,
                    },
                });
            }
        }

        // Create new permanent room via Huddle01
        const huddle01Response = await fetch(
            "https://api.huddle01.com/api/v2/sdk/rooms/create-room",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": HUDDLE01_API_KEY,
                },
                body: JSON.stringify({
                    roomLocked: false,
                    metadata: {
                        title: `Permanent Room for ${normalizedAddress.slice(0, 10)}...`,
                        hostWallets: [normalizedAddress],
                        isPermanent: true,
                    },
                }),
            }
        );

        if (!huddle01Response.ok) {
            const errorText = await huddle01Response.text();
            console.error("[Permanent Rooms] Huddle01 API error:", huddle01Response.status, errorText);
            return NextResponse.json(
                { error: "Failed to create video room" },
                { status: 500 }
            );
        }

        const huddle01Data = await huddle01Response.json();
        const newRoomId = huddle01Data.data.roomId;

        // Store permanent room in database (don't expire)
        const { data: room, error: dbError } = await supabase
            .from("shout_instant_rooms")
            .insert({
                room_id: newRoomId,
                host_wallet_address: normalizedAddress,
                title: "Permanent Meeting Room",
                max_participants: 4,
                status: "active",
                join_code: null, // Permanent rooms use wallet address, not join code
                expires_at: null, // Never expires
            })
            .select()
            .single();

        if (dbError) {
            console.error("[Permanent Rooms] Database error:", dbError);
            return NextResponse.json(
                { error: "Failed to save room" },
                { status: 500 }
            );
        }

        // Update user's permanent_room_id
        await supabase
            .from("shout_users")
            .upsert({
                wallet_address: normalizedAddress,
                permanent_room_id: newRoomId,
            }, {
                onConflict: "wallet_address",
            });

        console.log("[Permanent Rooms] Created permanent room:", normalizedAddress, "->", newRoomId);

        return NextResponse.json({
            success: true,
            room: {
                roomId: newRoomId,
                permanentUrl: `https://app.spritz.chat/room/${normalizedAddress}`,
                walletAddress: normalizedAddress,
            },
        });
    } catch (error) {
        console.error("[Permanent Rooms] Error:", error);
        return NextResponse.json(
            { error: "Failed to get or create permanent room" },
            { status: 500 }
        );
    }
}

