import type { Metadata } from "next";
import type { ReactNode } from "react";

type Props = {
    params: Promise<{ hash: string }>;
    children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { hash } = await params;
    
    const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
    const imageUrl = `https://${pinataGateway}/ipfs/${hash}`;
    const pageUrl = `https://spritz.chat/art/${hash}`;
    
    const title = "Pixel Art on Spritz 🎨";
    const description = "Check out this amazing pixel art created on Spritz! Create your own at spritz.chat";
    
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
                    url: imageUrl,
                    width: 512,
                    height: 512,
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
            images: [imageUrl],
            creator: "@spritz_chat",
        },
        other: {
            // Ensure Twitter fetches fresh image
            "twitter:image:src": imageUrl,
        },
    };
}

export default function PixelArtLayout({ children }: { children: ReactNode }) {
    return children;
}
