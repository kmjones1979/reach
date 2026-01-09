import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// RP configuration
const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "spritz.chat";

export async function POST(request: NextRequest) {
    try {
        const { userAddress } = await request.json();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // If userAddress is provided, get credentials for that user
        // Otherwise, allow discoverable credentials (for cross-device auth)
        let allowCredentials: { id: string; type: "public-key"; transports?: AuthenticatorTransport[] }[] = [];

        if (userAddress) {
            // Get existing credentials for this user
            const { data: credentials } = await supabase
                .from("passkey_credentials")
                .select("credential_id, transports")
                .eq("user_address", userAddress.toLowerCase());

            if (credentials && credentials.length > 0) {
                allowCredentials = credentials.map((cred) => ({
                    id: cred.credential_id,
                    type: "public-key" as const,
                    transports: (cred.transports || ["internal", "hybrid"]) as AuthenticatorTransport[],
                }));
            }
        }

        // Generate authentication options
        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            userVerification: "preferred",
            // If we have specific credentials, use them
            // Otherwise, allow any discoverable credential (empty array)
            allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
            timeout: 120000, // 2 minutes for cross-device flow
        });

        // Store the challenge temporarily (expires in 5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        
        await supabase.from("passkey_challenges").insert({
            challenge: options.challenge,
            ceremony_type: "authentication",
            user_address: userAddress?.toLowerCase() || null,
            expires_at: expiresAt,
        });

        console.log("[Passkey] Generated auth options, allowCredentials count:", allowCredentials.length);

        return NextResponse.json({
            options,
            rpId: RP_ID,
        });
    } catch (error) {
        console.error("[Passkey] Auth options error:", error);
        return NextResponse.json(
            { error: "Failed to generate authentication options" },
            { status: 500 }
        );
    }
}
