import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Max file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]; // quicktime for .mov

// POST /api/bug-reports/upload - Upload media for bug reports
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const userAddress = formData.get("userAddress") as string | null;

        if (!file || !userAddress) {
            return NextResponse.json(
                { error: "File and user address are required" },
                { status: 400 }
            );
        }

        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
            return NextResponse.json(
                { error: "Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV) are allowed" },
                { status: 400 }
            );
        }

        // Validate file size
        const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            return NextResponse.json(
                { error: `File size must be less than ${maxSizeMB}MB` },
                { status: 400 }
            );
        }

        // Generate unique filename
        const ext = file.name.split(".").pop() || (isImage ? "jpg" : "mp4");
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 10);
        const fileType = isImage ? "images" : "videos";
        const filename = `bug-reports/${userAddress.toLowerCase()}/${timestamp}_${randomId}.${ext}`;

        // Convert File to ArrayBuffer then to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const bucket = isImage ? "chat-images" : "chat-images"; // Using same bucket, or create bug-reports bucket
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error("[Bug Report Upload] Storage error:", error);
            return NextResponse.json(
                { error: "Failed to upload file" },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return NextResponse.json({
            url: urlData.publicUrl,
            path: data.path,
            type: isImage ? "image" : "video",
        });
    } catch (e) {
        console.error("[Bug Report Upload] Error:", e);
        return NextResponse.json(
            { error: "Failed to process upload" },
            { status: 500 }
        );
    }
}

