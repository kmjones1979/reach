import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { localTimeToUTC } from "@/lib/timezone";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/scheduling/availability?userAddress=...&startDate=...&endDate=...
// Get available time slots for scheduling a call with a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userAddress = searchParams.get("userAddress");
        const startDate = searchParams.get("startDate"); // ISO date string
        const endDate = searchParams.get("endDate"); // ISO date string

        if (!userAddress) {
            return NextResponse.json(
                { error: "User address required" },
                { status: 400 }
            );
        }

        // Check if user has scheduling enabled
        const { data: settings } = await supabase
            .from("shout_user_settings")
            .select("scheduling_enabled, scheduling_duration_minutes, scheduling_buffer_minutes, scheduling_advance_notice_hours")
            .eq("wallet_address", userAddress.toLowerCase())
            .single();

        if (!settings?.scheduling_enabled) {
            return NextResponse.json(
                { error: "User does not have scheduling enabled" },
                { status: 403 }
            );
        }

        // Get user's availability windows
        const { data: windows } = await supabase
            .from("shout_availability_windows")
            .select("*")
            .eq("wallet_address", userAddress.toLowerCase())
            .eq("is_active", true);

        if (!windows || windows.length === 0) {
            return NextResponse.json({
                availableSlots: [],
                message: "No availability windows configured",
            });
        }

        // Get Google Calendar connection
        const { data: connection } = await supabase
            .from("shout_calendar_connections")
            .select("*")
            .eq("wallet_address", userAddress.toLowerCase())
            .eq("provider", "google")
            .eq("is_active", true)
            .single();

        // Get user's timezone (from first window or default to UTC)
        const userTimezone = windows[0]?.timezone || "UTC";

        // Parse date range (these are in UTC, but we'll work with them as dates)
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

        // Generate potential slots from availability windows
        const potentialSlots: Array<{
            start: Date;
            end: Date;
            dayOfWeek: number;
        }> = [];

        // Iterate through each day in the range
        const current = new Date(start);
        current.setUTCHours(0, 0, 0, 0); // Start at midnight UTC
        
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const matchingWindows = windows.filter((w) => w.day_of_week === dayOfWeek);

            for (const window of matchingWindows) {
                // Get the timezone for this window (default to user's timezone)
                const windowTimezone = window.timezone || userTimezone;
                
                // Convert local time in the window's timezone to UTC
                // The times (e.g., "09:00") are in the window's timezone
                const slotStartUTC = localTimeToUTC(current, window.start_time, windowTimezone);
                const slotEndUTC = localTimeToUTC(current, window.end_time, windowTimezone);

                // Check minimum advance notice
                const advanceNoticeHours = settings.scheduling_advance_notice_hours || 24;
                const minStartTime = new Date(Date.now() + advanceNoticeHours * 60 * 60 * 1000);
                if (slotStartUTC < minStartTime) {
                    continue;
                }

                // Split into slots based on duration
                const duration = settings.scheduling_duration_minutes || 30;
                const buffer = settings.scheduling_buffer_minutes || 15;
                const slotDuration = duration + buffer;

                let currentSlotStart = new Date(slotStartUTC);
                while (currentSlotStart.getTime() + slotDuration * 60 * 1000 <= slotEndUTC.getTime()) {
                    const currentSlotEnd = new Date(currentSlotStart.getTime() + duration * 60 * 1000);
                    potentialSlots.push({
                        start: new Date(currentSlotStart),
                        end: currentSlotEnd,
                        dayOfWeek,
                    });
                    currentSlotStart = new Date(currentSlotStart.getTime() + slotDuration * 60 * 1000);
                }
            }

            current.setDate(current.getDate() + 1);
        }

        // If Google Calendar is connected, check for conflicts
        let availableSlots = potentialSlots;
        if (connection && connection.access_token) {
            try {
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({
                    access_token: connection.access_token,
                    refresh_token: connection.refresh_token,
                });

                const calendar = google.calendar({ version: "v3", auth: oauth2Client });

                // Get busy times from Google Calendar
                const busyResponse = await calendar.freebusy.query({
                    requestBody: {
                        timeMin: start.toISOString(),
                        timeMax: end.toISOString(),
                        items: [{ id: connection.calendar_id || "primary" }],
                    },
                });

                const busyPeriods = busyResponse.data.calendars?.[connection.calendar_id || "primary"]?.busy || [];

                // Filter out slots that conflict with busy periods
                availableSlots = potentialSlots.filter((slot) => {
                    const slotStart = slot.start.getTime();
                    const slotEnd = slot.end.getTime();

                    return !busyPeriods.some((busy) => {
                        const busyStart = new Date(busy.start!).getTime();
                        const busyEnd = new Date(busy.end!).getTime();

                        // Check for overlap
                        return (
                            (slotStart >= busyStart && slotStart < busyEnd) ||
                            (slotEnd > busyStart && slotEnd <= busyEnd) ||
                            (slotStart <= busyStart && slotEnd >= busyEnd)
                        );
                    });
                });
            } catch (error) {
                console.error("[Scheduling] Google Calendar error:", error);
                // If calendar check fails, return all potential slots
                // (better to show more slots than none)
            }
        }

        // Also check for existing scheduled calls
        const { data: existingCalls } = await supabase
            .from("shout_scheduled_calls")
            .select("scheduled_at, duration_minutes")
            .eq("recipient_wallet_address", userAddress.toLowerCase())
            .in("status", ["pending", "confirmed"])
            .gte("scheduled_at", start.toISOString())
            .lte("scheduled_at", end.toISOString());

        if (existingCalls && existingCalls.length > 0) {
            availableSlots = availableSlots.filter((slot) => {
                const slotStart = slot.start.getTime();
                const slotEnd = slot.end.getTime();

                return !existingCalls.some((call) => {
                    const callStart = new Date(call.scheduled_at).getTime();
                    const callDuration = (call.duration_minutes || 30) * 60 * 1000;
                    const callEnd = callStart + callDuration;

                    // Check for overlap
                    return (
                        (slotStart >= callStart && slotStart < callEnd) ||
                        (slotEnd > callStart && slotEnd <= callEnd) ||
                        (slotStart <= callStart && slotEnd >= callEnd)
                    );
                });
            });
        }

        // Format slots for response (all times in UTC)
        const formattedSlots = availableSlots.map((slot) => ({
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
        }));

        return NextResponse.json({
            availableSlots: formattedSlots,
            duration: settings.scheduling_duration_minutes || 30,
            priceCents: 0, // Will be fetched from settings in schedule endpoint
            timezone: userTimezone, // Return the user's timezone for display purposes
        });
    } catch (error) {
        console.error("[Scheduling] Availability error:", error);
        return NextResponse.json(
            { error: "Failed to fetch availability" },
            { status: 500 }
        );
    }
}

