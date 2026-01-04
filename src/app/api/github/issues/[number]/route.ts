import { NextRequest, NextResponse } from "next/server";

const GITHUB_OWNER = process.env.GITHUB_OWNER || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

// PATCH /api/github/issues/[number] - Close a GitHub issue with a comment
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ number: string }> }
) {
    if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
        return NextResponse.json(
            { error: "GitHub integration not configured" },
            { status: 500 }
        );
    }

    try {
        const { number } = await params;
        const body = await request.json();
        const { comment } = body;

        const issueNumber = parseInt(number, 10);
        if (isNaN(issueNumber)) {
            return NextResponse.json(
                { error: "Invalid issue number" },
                { status: 400 }
            );
        }

        // Add comment if provided
        if (comment) {
            const commentResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        Accept: "application/vnd.github.v3+json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        body: comment,
                    }),
                }
            );

            if (!commentResponse.ok) {
                const errorText = await commentResponse.text();
                console.error("[GitHub] Add comment error:", errorText);
                // Continue even if comment fails
            }
        }

        // Close the issue
        const closeResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`,
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
            const errorText = await closeResponse.text();
            console.error("[GitHub] Close issue error:", errorText);
            return NextResponse.json(
                { error: "Failed to close GitHub issue" },
                { status: closeResponse.status }
            );
        }

        const data = await closeResponse.json();

        return NextResponse.json({
            success: true,
            issue: {
                url: data.html_url,
                number: data.number,
                state: data.state,
            },
        });
    } catch (error) {
        console.error("[GitHub] Error:", error);
        return NextResponse.json(
            { error: "Failed to close GitHub issue" },
            { status: 500 }
        );
    }
}

