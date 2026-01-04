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

// PATCH /api/admin/bug-reports/[id] - Update bug report status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAdmin, address } = await verifyAdmin(request);

    if (!isAdmin || !address || !supabase) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { status, adminNotes, githubComment } = body;

        if (!status || !["open", "in_progress", "resolved", "closed"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status" },
                { status: 400 }
            );
        }

        const updateData: {
            status: string;
            admin_notes?: string | null;
            resolved_by?: string | null;
            resolved_at?: string | null;
        } = {
            status,
            admin_notes: adminNotes || null,
        };

        // Get bug report first to check for GitHub issue
        const { data: currentBugReport } = await supabase
            .from("shout_bug_reports")
            .select("github_issue_number")
            .eq("id", id)
            .single();

        // Set resolved_by and resolved_at if status is resolved
        if (status === "resolved") {
            updateData.resolved_by = address;
            updateData.resolved_at = new Date().toISOString();

            // Close GitHub issue if it exists
            if (currentBugReport?.github_issue_number) {
                try {
                    const GITHUB_OWNER = process.env.GITHUB_OWNER || "";
                    const GITHUB_REPO = process.env.GITHUB_REPO || "";
                    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

                    if (GITHUB_OWNER && GITHUB_REPO && GITHUB_TOKEN) {
                        // Add comment if provided
                        if (githubComment) {
                            const commentResponse = await fetch(
                                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${currentBugReport.github_issue_number}/comments`,
                                {
                                    method: "POST",
                                    headers: {
                                        Authorization: `token ${GITHUB_TOKEN}`,
                                        Accept: "application/vnd.github.v3+json",
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        body: githubComment,
                                    }),
                                }
                            );

                            if (!commentResponse.ok) {
                                console.error(
                                    "[Bug Reports] Failed to add GitHub comment"
                                );
                            }
                        }

                        // Close the issue
                        const closeResponse = await fetch(
                            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${currentBugReport.github_issue_number}`,
                            {
                                method: "PATCH",
                                headers: {
                                    Authorization: `token ${GITHUB_TOKEN}`,
                                    Accept: "application/vnd.github.v3+json",
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    state: "closed",
                                }),
                            }
                        );

                        if (!closeResponse.ok) {
                            console.error(
                                "[Bug Reports] Failed to close GitHub issue"
                            );
                        }
                    }
                } catch (err) {
                    console.error("[Bug Reports] GitHub error:", err);
                }
            }
        } else if (status === "open" || status === "in_progress") {
            updateData.resolved_by = null;
            updateData.resolved_at = null;
        }

        const { data, error } = await supabase
            .from("shout_bug_reports")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("[Bug Reports] Update error:", error);
            return NextResponse.json(
                { error: "Failed to update bug report" },
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
            { error: "Failed to update bug report" },
            { status: 500 }
        );
    }
}

