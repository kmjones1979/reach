import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// GET: Get user's invite codes
export async function GET(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json(
            { error: "Database not configured" },
            { status: 500 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const walletAddress = searchParams.get("address");

        if (!walletAddress) {
            return NextResponse.json(
                { error: "Wallet address required" },
                { status: 400 }
            );
        }

        // Generate codes if needed (ignore errors - codes might already exist)
        try {
            await supabase.rpc("generate_user_invite_codes", {
                p_address: walletAddress.toLowerCase(),
                p_count: 5,
            });
        } catch (rpcError) {
            // Log but don't fail - codes might already exist
            console.warn("[Invites] RPC error (non-fatal):", rpcError);
        }

        // Get user's invite codes
        const { data: invites, error: invitesError } = await supabase
            .from("shout_user_invites")
            .select("*")
            .eq("owner_address", walletAddress.toLowerCase())
            .order("created_at", { ascending: true });

        if (invitesError) {
            console.error("[Invites] Error fetching invites:", invitesError);
            return NextResponse.json(
                { error: "Failed to get invites" },
                { status: 500 }
            );
        }

        // Get user's invite allocation
        const { data: user } = await supabase
            .from("shout_users")
            .select("invite_count")
            .eq("wallet_address", walletAddress.toLowerCase())
            .single();

        return NextResponse.json({
            invites: invites || [],
            totalAllocation: user?.invite_count || 5,
            used: invites?.filter(i => i.used_by).length || 0,
            available: invites?.filter(i => !i.used_by).length || 0,
        });
    } catch (error) {
        console.error("[Invites] Error:", error);
        return NextResponse.json(
            { error: "Failed to get invites" },
            { status: 500 }
        );
    }
}

// POST: Redeem an invite code
export async function POST(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json(
            { error: "Database not configured" },
            { status: 500 }
        );
    }

    try {
        const { code, redeemerAddress } = await request.json();

        if (!code || !redeemerAddress) {
            return NextResponse.json(
                { error: "Code and redeemer address required" },
                { status: 400 }
            );
        }

        // Try to redeem the code
        const { data, error } = await supabase.rpc("redeem_user_invite", {
            p_code: code.toUpperCase(),
            p_redeemer_address: redeemerAddress.toLowerCase(),
        });

        if (error) {
            console.error("[Invites] Redeem error:", error);
            return NextResponse.json(
                { error: "Failed to redeem invite code" },
                { status: 500 }
            );
        }

        if (!data.success) {
            return NextResponse.json(
                { error: data.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Invite code redeemed successfully",
            inviter: data.inviter,
        });
    } catch (error) {
        console.error("[Invites] Error:", error);
        return NextResponse.json(
            { error: "Failed to redeem invite" },
            { status: 500 }
        );
    }
}

