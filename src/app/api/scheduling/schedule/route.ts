import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { Resend } from "resend";
import { verifyX402Payment, type X402Config } from "@/lib/x402";
import { toZonedTime, format } from "date-fns-tz";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /api/scheduling/schedule - Schedule a call with a user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            recipientAddress, // User to schedule with
            schedulerAddress, // Person scheduling (optional, can be anonymous)
            scheduledAt, // ISO date string (should be in UTC)
            timezone, // Timezone of the scheduled time (for display/storage)
            durationMinutes, // Optional, defaults to user's setting
            title, // Optional title/description
            guestEmail, // Optional email for calendar invite
            guestName, // Optional name for calendar invite
            notes, // Optional notes from scheduler
            isPaid, // Whether this is a paid booking
            paymentTransactionHash, // Direct USDC transfer tx hash from frontend
            paymentHeader, // x402 payment header if payment required (for API calls)
        } = body;

        if (!recipientAddress || !scheduledAt) {
            return NextResponse.json(
                { error: "Recipient address and scheduled time are required" },
                { status: 400 }
            );
        }

        // Get recipient's scheduling settings
        const { data: settings } = await supabase
            .from("shout_user_settings")
            .select("scheduling_enabled, scheduling_price_cents, scheduling_network, scheduling_wallet_address, scheduling_duration_minutes, scheduling_paid_enabled, scheduling_free_enabled")
            .eq("wallet_address", recipientAddress.toLowerCase())
            .single();

        if (!settings?.scheduling_enabled) {
            return NextResponse.json(
                { error: "User does not have scheduling enabled" },
                { status: 403 }
            );
        }

        const priceCents = settings.scheduling_price_cents || 0;
        const duration = durationMinutes || settings.scheduling_duration_minutes || 30;

        // Determine if payment is required based on the booking type
        const requiresPayment = isPaid && priceCents > 0 && settings.scheduling_paid_enabled;

        // Verify payment if required
        let paymentResult = null;
        if (requiresPayment) {
            // Accept either direct tx hash from frontend OR x402 payment header
            if (!paymentTransactionHash && !paymentHeader) {
                return NextResponse.json(
                    {
                        error: "Payment required",
                        priceCents,
                        network: settings.scheduling_network || "base",
                        payToAddress: settings.scheduling_wallet_address || recipientAddress,
                    },
                    { status: 402 }
                );
            }

            // If we have a direct transaction hash from the frontend, use that
            if (paymentTransactionHash) {
                paymentResult = {
                    isValid: true,
                    transactionHash: paymentTransactionHash,
                    payerAddress: schedulerAddress,
                };
            } else if (paymentHeader) {
                // Otherwise verify via x402
                const x402Config: X402Config = {
                    priceUSD: `$${(priceCents / 100).toFixed(2)}`,
                    network: (settings.scheduling_network || "base") as "base" | "base-sepolia",
                    payToAddress: settings.scheduling_wallet_address || recipientAddress,
                    description: `Schedule a call with ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
                };

                // Create a mock request with the payment header for verification
                const mockRequest = new NextRequest(request.url, {
                    headers: {
                        "X-Payment": paymentHeader,
                    },
                });

                paymentResult = await verifyX402Payment(mockRequest, x402Config);

                if (!paymentResult.isValid) {
                    return NextResponse.json(
                        { error: "Payment verification failed", details: paymentResult.error },
                        { status: 402 }
                    );
                }
            }
        }

        // Validate the scheduled time is available
        // scheduledAt should be in UTC ISO format
        const scheduledTime = new Date(scheduledAt);
        const now = new Date();
        
        // Get recipient's timezone for calendar event creation
        const { data: recipientWindows } = await supabase
            .from("shout_availability_windows")
            .select("timezone")
            .eq("wallet_address", recipientAddress.toLowerCase())
            .eq("is_active", true)
            .limit(1)
            .single();
        
        const recipientTimezone = recipientWindows?.timezone || timezone || "UTC";

        // Check minimum advance notice
        const { data: advanceNotice } = await supabase
            .from("shout_user_settings")
            .select("scheduling_advance_notice_hours")
            .eq("wallet_address", recipientAddress.toLowerCase())
            .single();

        const minAdvanceHours = advanceNotice?.scheduling_advance_notice_hours || 24;
        const minTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

        if (scheduledTime < minTime) {
            return NextResponse.json(
                { error: `Scheduled time must be at least ${minAdvanceHours} hours in advance` },
                { status: 400 }
            );
        }

        // Check if slot is still available (race condition protection)
        const slotEnd = new Date(scheduledTime.getTime() + duration * 60 * 1000);

        // Check existing scheduled calls
        const { data: conflictingCalls } = await supabase
            .from("shout_scheduled_calls")
            .select("id")
            .eq("recipient_wallet_address", recipientAddress.toLowerCase())
            .in("status", ["pending", "confirmed"])
            .gte("scheduled_at", scheduledTime.toISOString())
            .lt("scheduled_at", slotEnd.toISOString());

        if (conflictingCalls && conflictingCalls.length > 0) {
            return NextResponse.json(
                { error: "This time slot is no longer available" },
                { status: 409 }
            );
        }

        // Create scheduled call record
        const { data: scheduledCall, error: createError } = await supabase
            .from("shout_scheduled_calls")
            .insert({
                scheduler_wallet_address: schedulerAddress?.toLowerCase() || null,
                recipient_wallet_address: recipientAddress.toLowerCase(),
                scheduled_at: scheduledTime.toISOString(),
                duration_minutes: duration,
                title: title || "Scheduled Call",
                status: "pending",
                payment_required: priceCents > 0,
                payment_amount_cents: priceCents > 0 ? priceCents : null,
                payment_transaction_hash: paymentResult?.transactionHash || null,
                payment_status: priceCents > 0 ? (paymentResult?.isValid ? "paid" : "pending") : null,
                guest_email: guestEmail || null,
                guest_name: guestName || null,
                scheduler_email: guestEmail || null,
                scheduler_name: guestName || null,
                notes: notes || null,
                is_paid: isPaid || priceCents > 0,
                timezone: recipientTimezone,
            })
            .select()
            .single();

        if (createError) {
            console.error("[Scheduling] Create error:", createError);
            return NextResponse.json(
                { error: "Failed to create scheduled call" },
                { status: 500 }
            );
        }

        // Get recipient's calendar connection
        const { data: connection } = await supabase
            .from("shout_calendar_connections")
            .select("*")
            .eq("wallet_address", recipientAddress.toLowerCase())
            .eq("provider", "google")
            .eq("is_active", true)
            .single();

        let calendarEventId = null;

        // Create Google Calendar event if connected
        if (connection && connection.access_token) {
            try {
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({
                    access_token: connection.access_token,
                    refresh_token: connection.refresh_token,
                });

                const calendar = google.calendar({ version: "v3", auth: oauth2Client });

                // Get recipient's display name
                const { data: recipientUser } = await supabase
                    .from("shout_users")
                    .select("display_name, email")
                    .eq("wallet_address", recipientAddress.toLowerCase())
                    .single();

                const eventTitle = title || `Call with ${schedulerAddress ? schedulerAddress.slice(0, 6) + "..." + schedulerAddress.slice(-4) : guestName || "Guest"}`;
                const eventDescription = `Scheduled call via Spritz\n\n${title || ""}\n\nScheduler: ${schedulerAddress || guestEmail || "Guest"}`;

                // Convert UTC to recipient's timezone for Google Calendar
                // Google Calendar expects RFC3339 format with timezone
                const zonedStart = toZonedTime(scheduledTime, recipientTimezone);
                const zonedEnd = toZonedTime(slotEnd, recipientTimezone);
                
                // Format as RFC3339: "2024-01-15T09:00:00-05:00"
                const startDateTime = format(zonedStart, "yyyy-MM-dd'T'HH:mm:ss", { timeZone: recipientTimezone });
                const endDateTime = format(zonedEnd, "yyyy-MM-dd'T'HH:mm:ss", { timeZone: recipientTimezone });
                
                const event = await calendar.events.insert({
                    calendarId: connection.calendar_id || "primary",
                    requestBody: {
                        summary: eventTitle,
                        description: eventDescription,
                        start: {
                            dateTime: startDateTime,
                            timeZone: recipientTimezone,
                        },
                        end: {
                            dateTime: endDateTime,
                            timeZone: recipientTimezone,
                        },
                        attendees: guestEmail
                            ? [
                                  {
                                      email: guestEmail,
                                      displayName: guestName || guestEmail,
                                  },
                              ]
                            : [],
                        reminders: {
                            useDefault: false,
                            overrides: [
                                { method: "email", minutes: 24 * 60 }, // 24 hours before
                                { method: "popup", minutes: 15 }, // 15 minutes before
                            ],
                        },
                    },
                });

                calendarEventId = event.data.id || null;

                // Update scheduled call with calendar event ID
                if (calendarEventId) {
                    await supabase
                        .from("shout_scheduled_calls")
                        .update({ calendar_event_id: calendarEventId })
                        .eq("id", scheduledCall.id);
                }
            } catch (error) {
                console.error("[Scheduling] Google Calendar error:", error);
                // Continue even if calendar creation fails
            }
        }

        // Send calendar invite emails via the invite endpoint
        if (resend && scheduledCall && (guestEmail || connection?.calendar_email)) {
            try {
                // Call the invite endpoint to send beautiful emails
                const inviteResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/scheduling/invite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        scheduledCallId: scheduledCall.id,
                        recipientEmail: connection?.calendar_email,
                        schedulerEmail: guestEmail,
                    }),
                });
                
                if (!inviteResponse.ok) {
                    console.error("[Scheduling] Failed to send invite emails");
                }
            } catch (error) {
                console.error("[Scheduling] Email send error:", error);
                // Continue even if email fails
            }
        }

        return NextResponse.json({
            success: true,
            scheduledCall: {
                ...scheduledCall,
                calendarEventId,
            },
        });
    } catch (error) {
        console.error("[Scheduling] Schedule error:", error);
        return NextResponse.json(
            { error: "Failed to schedule call" },
            { status: 500 }
        );
    }
}

