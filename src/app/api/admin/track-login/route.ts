import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// POST: Track user login
export async function POST(request: NextRequest) {
    if (!supabase) {
        return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    try {
        const { 
            walletAddress, 
            walletType, 
            chain, 
            ensName, 
            username,
            inviteCode 
        } = await request.json();

        if (!walletAddress) {
            return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
        }

        const normalizedAddress = walletAddress.toLowerCase();

        // Check if user exists
        const { data: existingUser } = await supabase
            .from("shout_users")
            .select("*")
            .eq("wallet_address", normalizedAddress)
            .single();

        if (existingUser) {
            // Update existing user
            const updates: Record<string, unknown> = {
                last_login: new Date().toISOString(),
                login_count: (existingUser.login_count || 0) + 1,
                updated_at: new Date().toISOString(),
            };

            // Update fields if provided
            if (walletType) updates.wallet_type = walletType;
            if (chain) updates.chain = chain;
            if (ensName) updates.ens_name = ensName;
            if (username) updates.username = username;

            const { error } = await supabase
                .from("shout_users")
                .update(updates)
                .eq("wallet_address", normalizedAddress);

            if (error) {
                console.error("[Login] Error updating user:", error);
            }

            // Ensure user is in Alpha channel (in case they joined before Alpha existed)
            try {
                await supabase.rpc("join_alpha_channel", {
                    p_user_address: normalizedAddress,
                });
            } catch {
                // Ignore errors - user might already be a member
            }

            return NextResponse.json({ 
                success: true, 
                isNewUser: false,
                isBanned: existingUser.is_banned,
                banReason: existingUser.ban_reason,
            });
        } else {
            // Create new user
            let referredBy: string | null = null;

            // Validate and track invite code usage
            if (inviteCode) {
                const upperCode = inviteCode.toUpperCase();
                
                // First, try to redeem as a user invite code
                const { data: userInviteResult } = await supabase.rpc("redeem_user_invite", {
                    p_code: upperCode,
                    p_redeemer_address: normalizedAddress,
                });

                if (userInviteResult?.success) {
                    // User invite code was redeemed successfully
                    referredBy = userInviteResult.inviter;
                    console.log("[Login] Redeemed user invite code:", upperCode, "from:", referredBy);
                } else {
                    // Try admin invite codes as fallback
                    const { data: code } = await supabase
                        .from("shout_invite_codes")
                        .select("*")
                        .eq("code", upperCode)
                        .eq("is_active", true)
                        .single();

                    if (code) {
                        // Check if code is still valid
                        const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                        const isMaxedOut = code.max_uses > 0 && code.current_uses >= code.max_uses;

                        if (!isExpired && !isMaxedOut) {
                            // Track usage
                            await supabase.from("shout_invite_code_usage").insert({
                                code: upperCode,
                                used_by: normalizedAddress,
                            });

                            // Increment usage count
                            await supabase
                                .from("shout_invite_codes")
                                .update({ current_uses: code.current_uses + 1 })
                                .eq("code", upperCode);

                            referredBy = code.created_by;
                            console.log("[Login] Redeemed admin invite code:", upperCode);
                        }
                    }
                }
            }

            const { error } = await supabase.from("shout_users").insert({
                wallet_address: normalizedAddress,
                wallet_type: walletType || null,
                chain: chain || "ethereum",
                ens_name: ensName || null,
                username: username || null,
                invite_code_used: inviteCode?.toUpperCase() || null,
                referred_by: referredBy,
            });

            if (error) {
                console.error("[Login] Error creating user:", error);
                return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
            }

            // Auto-join new user to Alpha channel (muted by default)
            try {
                await supabase.rpc("join_alpha_channel", {
                    p_user_address: normalizedAddress,
                });
            } catch (err) {
                console.error("[Login] Failed to join Alpha channel:", err);
            }

            return NextResponse.json({ 
                success: true, 
                isNewUser: true,
                isBanned: false,
            });
        }
    } catch (error) {
        console.error("[Login] Error:", error);
        return NextResponse.json({ error: "Failed to track login" }, { status: 500 });
    }
}


