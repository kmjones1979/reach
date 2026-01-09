import type { Metadata } from "next";
import type { ReactNode } from "react";

type Props = {
    params: Promise<{ hash: string }>;
    children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { hash } = await params;
    
    const pageUrl = `https://spritz.chat/art/${hash}`;
    // Use dynamic OG image that showcases the art in a nice card
    const ogImageUrl = `https://spritz.chat/api/og/art/${hash}`;
    
    const title = "Pixel Art on Spritz 🍊";
    const description = "Check out this pixel art I saw on Spritz! 🍊 Create your own at spritz.chat";
    
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: pageUrl,
            siteName: "Spritz",
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: "Pixel Art created on Spritz",
                },
            ],
            locale: "en_US",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImageUrl],
            creator: "@spritz_chat",
        },
        other: {
            // Ensure Twitter fetches fresh image
            "twitter:image:src": ogImageUrl,
        },
    };
}

export default function PixelArtLayout({ children }: { children: ReactNode }) {
    return children;
}
