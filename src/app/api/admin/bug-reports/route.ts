import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Verify admin signature from headers
async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; address: string | null; isSuperAdmin: boolean }> {
    const address = request.headers.get("x-admin-address");
    const signature = request.headers.get("x-admin-signature");
    const encodedMessage = request.headers.get("x-admin-message");

    if (!address || !signature || !encodedMessage || !supabase) {
        return { isAdmin: false, address: null, isSuperAdmin: false };
    }

    try {
        // Decode the base64 encoded message
        const message = decodeURIComponent(atob(encodedMessage));
        
        const isValidSignature = await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
        });

        if (!isValidSignature) {
            return { isAdmin: false, address: null, isSuperAdmin: false };
        }

        const { data: admin } = await supabase
            .from("shout_admins")
            .select("*")
            .eq("wallet_address", address.toLowerCase())
            .single();

        return { 
            isAdmin: !!admin, 
            address: address.toLowerCase(),
            isSuperAdmin: admin?.is_super_admin || false 
        };
    } catch {
        return { isAdmin: false, address: null, isSuperAdmin: false };
    }
}

// GET /api/admin/bug-reports - Get all bug reports
export async function GET(request: NextRequest) {
    const { isAdmin } = await verifyAdmin(request);

    if (!isAdmin || !supabase) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data, error } = await supabase
            .from("shout_bug_reports")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[Bug Reports] Fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch bug reports" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            bugReports: data || [],
        });
    } catch (error) {
        console.error("[Bug Reports] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch bug reports" },
            { status: 500 }
        );
    }
}

