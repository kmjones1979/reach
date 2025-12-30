import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/scheduling/join/[token] - Get scheduled call by invite token
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json(
                { error: "Invite token required" },
                { status: 400 }
            );
        }

        // Get scheduled call by invite token
        const { data: call, error } = await supabase
            .from("shout_scheduled_calls")
            .select(`
                id,
                scheduled_at,
                duration_minutes,
                title,
                status,
                guest_name,
                guest_email,
                timezone,
                is_paid,
                recipient_wallet_address
            `)
            .eq("invite_token", token)
            .single();

        if (error || !call) {
            return NextResponse.json(
                { error: "Call not found" },
                { status: 404 }
            );
        }

        // Get host display name
        const { data: hostUser } = await supabase
            .from("shout_users")
            .select("display_name")
            .eq("wallet_address", call.recipient_wallet_address)
            .single();

        // Mark invite as opened (first time)
        if (call) {
            await supabase
                .from("shout_scheduled_calls")
                .update({ invite_opened_at: new Date().toISOString() })
                .eq("invite_token", token)
                .is("invite_opened_at", null);
        }

        return NextResponse.json({
            call: {
                ...call,
                hostName: hostUser?.display_name || null,
            },
        });
    } catch (error) {
        console.error("[Join] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch call" },
            { status: 500 }
        );
    }
}

