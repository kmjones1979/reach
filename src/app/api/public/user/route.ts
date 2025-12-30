import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/public/user - Get public user info by address (no auth required)
export async function GET(request: NextRequest) {
    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
        return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const { data: user, error } = await supabase
        .from("shout_users")
        .select("wallet_address, username, display_name, ens_name, avatar_url")
        .eq("wallet_address", address.toLowerCase())
        .single();

    if (error || !user) {
        return NextResponse.json({ user: null });
    }

    return NextResponse.json({
        user: {
            username: user.username,
            display_name: user.display_name,
            ens_name: user.ens_name,
            avatar_url: user.avatar_url,
        },
    });
}

