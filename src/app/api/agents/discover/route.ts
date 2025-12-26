import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// GET: Discover public agents and friends' agents
export async function GET(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const userAddress = searchParams.get("userAddress");
        const filter = searchParams.get("filter") || "all"; // all, public, friends
        const search = searchParams.get("search") || "";
        const limit = parseInt(searchParams.get("limit") || "20");

        if (!userAddress) {
            return NextResponse.json({ error: "User address required" }, { status: 400 });
        }

        const normalizedAddress = userAddress.toLowerCase();

        // Get user's friends list
        const { data: friendships } = await supabase
            .from("shout_friendships")
            .select("user1_address, user2_address")
            .or(`user1_address.eq.${normalizedAddress},user2_address.eq.${normalizedAddress}`);

        const friendAddresses = new Set<string>();
        (friendships || []).forEach(f => {
            if (f.user1_address === normalizedAddress) {
                friendAddresses.add(f.user2_address);
            } else {
                friendAddresses.add(f.user1_address);
            }
        });

        // Build query based on filter
        let query = supabase
            .from("shout_agents")
            .select(`
                id,
                owner_address,
                name,
                personality,
                avatar_emoji,
                visibility,
                message_count,
                created_at
            `)
            .neq("owner_address", normalizedAddress) // Don't show own agents
            .order("message_count", { ascending: false })
            .limit(limit);

        // Apply visibility filter
        if (filter === "public") {
            query = query.eq("visibility", "public");
        } else if (filter === "friends") {
            // Only friends' agents that are visible to friends
            if (friendAddresses.size > 0) {
                query = query
                    .in("owner_address", Array.from(friendAddresses))
                    .in("visibility", ["friends", "public"]);
            } else {
                // No friends, return empty
                return NextResponse.json({ agents: [], total: 0 });
            }
        } else {
            // All discoverable agents (public + friends' shared)
            if (friendAddresses.size > 0) {
                // Public agents OR friends' agents with friends/public visibility
                query = query.or(
                    `visibility.eq.public,and(owner_address.in.(${Array.from(friendAddresses).join(",")}),visibility.in.(friends,public))`
                );
            } else {
                // No friends, only public agents
                query = query.eq("visibility", "public");
            }
        }

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,personality.ilike.%${search}%`);
        }

        const { data: agents, error } = await query;

        if (error) {
            console.error("[Discover] Error:", error);
            return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
        }

        // Get owner info for each agent
        const ownerAddresses = [...new Set((agents || []).map(a => a.owner_address))];
        const { data: owners } = await supabase
            .from("shout_users")
            .select("wallet_address, username, ens_name")
            .in("wallet_address", ownerAddresses);

        const ownerMap = new Map();
        (owners || []).forEach(o => {
            ownerMap.set(o.wallet_address, {
                username: o.username,
                ensName: o.ens_name,
            });
        });

        // Enrich agents with owner info and friend status
        const enrichedAgents = (agents || []).map(agent => ({
            ...agent,
            owner: ownerMap.get(agent.owner_address) || {},
            isFriendsAgent: friendAddresses.has(agent.owner_address),
        }));

        return NextResponse.json({
            agents: enrichedAgents,
            total: enrichedAgents.length,
        });

    } catch (error) {
        console.error("[Discover] Error:", error);
        return NextResponse.json({ error: "Failed to discover agents" }, { status: 500 });
    }
}

