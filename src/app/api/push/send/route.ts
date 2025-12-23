import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Initialize web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@reach.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
    supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey)
        : null;

export async function POST(request: NextRequest) {
    try {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return NextResponse.json(
                { error: "Push notifications not configured" },
                { status: 500 }
            );
        }

        if (!supabase) {
            return NextResponse.json(
                { error: "Database not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { targetAddress, title, body: messageBody, type, callerId, callerName, url } = body;

        if (!targetAddress) {
            return NextResponse.json(
                { error: "Target address required" },
                { status: 400 }
            );
        }

        // Get push subscription for target user
        const { data: subscription, error: dbError } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_address", targetAddress.toLowerCase())
            .single();

        if (dbError || !subscription) {
            console.log("[Push API] No subscription found for:", targetAddress);
            return NextResponse.json(
                { error: "User not subscribed to push notifications" },
                { status: 404 }
            );
        }

        // Build push subscription object
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
            },
        };

        // Build notification payload
        const payload = JSON.stringify({
            title: title || "Spritz",
            body: messageBody || "You have a notification",
            type: type || "notification",
            callerId,
            callerName,
            url: url || "/",
            tag: type === "incoming_call" ? `call-${callerId}` : "reach-notification",
        });

        // Send push notification
        await webpush.sendNotification(pushSubscription, payload);

        console.log("[Push API] Notification sent to:", targetAddress);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Push API] Error sending notification:", error);

        // Handle expired subscriptions
        if (error instanceof webpush.WebPushError && error.statusCode === 410) {
            // Subscription has expired, remove it
            const body = await request.json();
            if (supabase && body.targetAddress) {
                await supabase
                    .from("push_subscriptions")
                    .delete()
                    .eq("user_address", body.targetAddress.toLowerCase());
            }
            return NextResponse.json(
                { error: "Subscription expired" },
                { status: 410 }
            );
        }

        return NextResponse.json(
            { error: "Failed to send notification" },
            { status: 500 }
        );
    }
}



