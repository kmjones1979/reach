import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export type Agent = {
    id: string;
    owner_address: string;
    name: string;
    personality: string | null;
    system_instructions: string | null;
    model: string;
    avatar_emoji: string;
    visibility: "private" | "friends" | "public";
    message_count: number;
    created_at: string;
    updated_at: string;
};

// GET: List user's agents
export async function GET(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userAddress = searchParams.get("userAddress");

        if (!userAddress) {
            return NextResponse.json({ error: "User address required" }, { status: 400 });
        }

        const normalizedAddress = userAddress.toLowerCase();

        // Get user's own agents
        const { data: agents, error } = await supabase
            .from("shout_agents")
            .select("*")
            .eq("owner_address", normalizedAddress)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("[Agents] Error fetching agents:", error);
            return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
        }

        return NextResponse.json({ agents: agents || [] });
    } catch (error) {
        console.error("[Agents] Error:", error);
        return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }
}

// POST: Create a new agent
export async function POST(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { userAddress, name, personality, avatarEmoji, visibility, tags } = body;

        if (!userAddress || !name) {
            return NextResponse.json(
                { error: "User address and name are required" },
                { status: 400 }
            );
        }

        // Validate tags (max 5, each max 20 chars)
        let validatedTags: string[] = [];
        if (tags && Array.isArray(tags)) {
            validatedTags = tags
                .slice(0, 5) // Max 5 tags
                .map((t: string) => t.trim().toLowerCase().slice(0, 20)) // Normalize and limit length
                .filter((t: string) => t.length > 0); // Remove empty
        }

        const normalizedAddress = userAddress.toLowerCase();

        // Check if user has beta access
        const { data: user } = await supabase
            .from("shout_users")
            .select("beta_access")
            .eq("wallet_address", normalizedAddress)
            .single();

        if (!user?.beta_access) {
            return NextResponse.json(
                { error: "Beta access required to create agents" },
                { status: 403 }
            );
        }

        // Check agent limit (max 5 agents per user for now)
        const { count } = await supabase
            .from("shout_agents")
            .select("*", { count: "exact", head: true })
            .eq("owner_address", normalizedAddress);

        if ((count || 0) >= 5) {
            return NextResponse.json(
                { error: "Maximum of 5 agents allowed per user" },
                { status: 400 }
            );
        }

        // Generate system instructions from personality
        const systemInstructions = personality
            ? `You are an AI assistant named "${name}". Your personality: ${personality}. Be helpful, friendly, and stay in character.`
            : `You are an AI assistant named "${name}". Be helpful and friendly.`;

        // Create the agent
        const { data: agent, error } = await supabase
            .from("shout_agents")
            .insert({
                owner_address: normalizedAddress,
                name: name.trim(),
                personality: personality?.trim() || null,
                system_instructions: systemInstructions,
                model: "gemini-1.5-flash", // Use 1.5-flash for better free tier limits
                avatar_emoji: avatarEmoji || "🤖",
                visibility: visibility || "private",
                tags: validatedTags,
            })
            .select()
            .single();

        if (error) {
            console.error("[Agents] Error creating agent:", error);
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "You already have an agent with this name" },
                    { status: 400 }
                );
            }
            return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
        }

        return NextResponse.json({ agent });
    } catch (error) {
        console.error("[Agents] Error:", error);
        return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
    }
}

