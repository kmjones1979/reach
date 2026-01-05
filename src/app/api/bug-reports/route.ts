import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CATEGORIES = [
    "Agents",
    "Friends",
    "Calls",
    "Chats",
    "Rooms",
    "Livestream",
    "Settings",
    "Configuration",
    "Other",
] as const;

type Category = typeof CATEGORIES[number];

// POST /api/bug-reports - Submit a bug report
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userAddress, category, description, replicationSteps, mediaUrls } = body;

        if (!userAddress) {
            return NextResponse.json(
                { error: "User address is required" },
                { status: 400 }
            );
        }

        if (!category || !CATEGORIES.includes(category as Category)) {
            return NextResponse.json(
                { error: "Valid category is required" },
                { status: 400 }
            );
        }

        if (!description || !description.trim()) {
            return NextResponse.json(
                { error: "Description is required" },
                { status: 400 }
            );
        }

        // Validate mediaUrls if provided
        let mediaUrlsArray: string[] = [];
        if (mediaUrls && Array.isArray(mediaUrls)) {
            mediaUrlsArray = mediaUrls.filter((url: any) => typeof url === "string");
        }

        const { data, error: insertError } = await supabase
            .from("shout_bug_reports")
            .insert({
                user_address: userAddress.toLowerCase(),
                category: category as Category,
                description: description.trim(),
                replication_steps: replicationSteps?.trim() || null,
                media_urls: mediaUrlsArray.length > 0 ? mediaUrlsArray : [],
                status: "open",
            })
            .select()
            .single();

        if (insertError) {
            console.error("[Bug Reports] Insert error:", insertError);
            return NextResponse.json(
                { error: "Failed to submit bug report" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            bugReport: data,
        });
    } catch (error) {
        console.error("[Bug Reports] Error:", error);
        return NextResponse.json(
            { error: "Failed to submit bug report" },
            { status: 500 }
        );
    }
}

