import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Initialize Redis client (will be null if not configured)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Different rate limit tiers for different use cases
export const rateLimiters = {
    // Auth endpoints - strict to prevent brute force
    auth: redis
        ? new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 requests per minute
            analytics: true,
            prefix: "ratelimit:auth",
        })
        : null,

    // Contact form - very strict to prevent spam
    contact: redis
        ? new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(3, "60 s"), // 3 requests per minute
            analytics: true,
            prefix: "ratelimit:contact",
        })
        : null,

    // AI chat - moderate limits
    ai: redis
        ? new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(30, "60 s"), // 30 requests per minute
            analytics: true,
            prefix: "ratelimit:ai",
        })
        : null,

    // Messaging - generous for real-time chat
    messaging: redis
        ? new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(60, "60 s"), // 60 requests per minute
            analytics: true,
            prefix: "ratelimit:messaging",
        })
        : null,

    // General API - moderate default
    general: redis
        ? new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(100, "60 s"), // 100 requests per minute
            analytics: true,
            prefix: "ratelimit:general",
        })
        : null,

    // Strict - for sensitive operations
    strict: redis
        ? new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per minute
            analytics: true,
            prefix: "ratelimit:strict",
        })
        : null,
};

export type RateLimitTier = keyof typeof rateLimiters;

/**
 * Get the client identifier for rate limiting
 * Uses IP address, with fallback to forwarded headers
 */
export function getClientIdentifier(request: NextRequest): string {
    // Check for forwarded IP (behind proxy/load balancer)
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        // Take the first IP in the chain (original client)
        return forwardedFor.split(",")[0].trim();
    }

    // Check for real IP header (Cloudflare, etc.)
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Fallback to a default (shouldn't happen in production)
    return "unknown";
}

/**
 * Check rate limit and return response if exceeded
 * Returns null if within limits, or a 429 response if exceeded
 */
export async function checkRateLimit(
    request: NextRequest,
    tier: RateLimitTier = "general",
    customIdentifier?: string
): Promise<NextResponse | null> {
    const limiter = rateLimiters[tier];
    
    // If rate limiting is not configured, allow all requests
    if (!limiter) {
        return null;
    }

    const identifier = customIdentifier || getClientIdentifier(request);
    
    try {
        const { success, limit, reset, remaining } = await limiter.limit(identifier);

        if (!success) {
            const retryAfter = Math.ceil((reset - Date.now()) / 1000);
            
            return NextResponse.json(
                {
                    error: "Too many requests",
                    message: "Please slow down and try again later",
                    retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": reset.toString(),
                        "Retry-After": retryAfter.toString(),
                    },
                }
            );
        }

        // Request is allowed - return null to continue processing
        return null;
    } catch (error) {
        // If rate limiting fails, log but allow the request
        console.error("[RateLimit] Error checking rate limit:", error);
        return null;
    }
}

/**
 * Higher-order function to wrap an API handler with rate limiting
 */
export function withRateLimit(
    handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
    tier: RateLimitTier = "general"
) {
    return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
        const rateLimitResponse = await checkRateLimit(request, tier);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }
        return handler(request, ...args);
    };
}

/**
 * Check if rate limiting is configured
 */
export function isRateLimitConfigured(): boolean {
    return redis !== null;
}
