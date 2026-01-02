import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken, Role } from "@huddle01/server-sdk/auth";
import { randomBytes } from "crypto";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HUDDLE01_API_KEY = process.env.HUDDLE01_API_KEY || "";

// Generate a fake but valid-looking Ethereum address for guests
// This ensures compatibility with any validation Huddle01 might do
function generateGuestAddress(): string {
    const bytes = randomBytes(20);
    return `0x${bytes.toString("hex")}`;
}

// POST /api/rooms/[code]/token - Generate a token to join an instant room
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    if (!HUDDLE01_API_KEY) {
        return NextResponse.json(
            { error: "Video calling not configured" },
            { status: 500 }
        );
    }

    try {
        const { code } = await params;
        const body = await request.json();
        const { displayName, walletAddress } = body;
        
        // Use wallet address if provided, otherwise generate a fake address for guests
        // Huddle01 might validate the format of walletAddress
        const userAddress = walletAddress || generateGuestAddress();

        if (!code) {
            return NextResponse.json(
                { error: "Join code is required" },
                { status: 400 }
            );
        }

        if (!displayName) {
            return NextResponse.json(
                { error: "Display name is required" },
                { status: 400 }
            );
        }

        // Helper to check if code is a wallet address
        const isWalletAddress = (str: string): boolean => {
            return /^0x[a-fA-F0-9]{40}$/.test(str);
        };

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
                // No permanent room exists - create it
                const permanentRes = await fetch(`${request.nextUrl.origin}/api/rooms/permanent?wallet_address=${normalizedAddress}`);
                if (!permanentRes.ok) {
                    return NextResponse.json(
                        { error: "Failed to get permanent room" },
                        { status: 500 }
                    );
                }
                const permanentData = await permanentRes.json();
                
                // Fetch the newly created room
                const result = await supabase
                    .from("shout_instant_rooms")
                    .select("*")
                    .eq("room_id", permanentData.room.roomId)
                    .single();
                
                room = result.data;
                error = result.error;
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

        // Check if room is active (skip expiration check for permanent rooms)
        if (room.status !== "active") {
            return NextResponse.json(
                { error: "This room has ended" },
                { status: 410 }
            );
        }

        // Check expiration (only for non-permanent rooms)
        if (room.expires_at && new Date(room.expires_at) < new Date()) {
            await supabase
                .from("shout_instant_rooms")
                .update({ status: "expired" })
                .eq("id", room.id);

            return NextResponse.json(
                { error: "This room has expired" },
                { status: 410 }
            );
        }

        // Determine if this is the host
        const isHost = walletAddress && 
            walletAddress.toLowerCase() === room.host_wallet_address.toLowerCase();
        
        // Match the exact token format from the working /api/huddle01/token endpoint
        const accessToken = new AccessToken({
            apiKey: HUDDLE01_API_KEY,
            roomId: room.room_id,
            role: Role.HOST, // Always use HOST role like the working endpoint
            permissions: {
                admin: true,
                canConsume: true,
                canProduce: true,
                canProduceSources: {
                    cam: true,
                    mic: true,
                    screen: true,
                },
                canRecvData: true,
                canSendData: true,
                canUpdateMetadata: true,
            },
            options: {
                metadata: {
                    // Match exactly what the working endpoint sends
                    displayName: displayName || userAddress.slice(0, 10),
                    walletAddress: userAddress,
                },
            },
        });
        
        console.log("[Rooms] Token generated for:", {
            joinCode: code,
            roomId: room.room_id,
            displayName,
            userAddress,
            isHost,
        });

        const token = await accessToken.toJwt();
        console.log("[Rooms] Token generated for room:", room.join_code, "isHost:", isHost);

        return NextResponse.json({
            token,
            roomId: room.room_id,
            isHost,
        });
    } catch (error) {
        console.error("[Rooms] Token error:", error);
        return NextResponse.json(
            { error: "Failed to generate token" },
            { status: 500 }
        );
    }
}

