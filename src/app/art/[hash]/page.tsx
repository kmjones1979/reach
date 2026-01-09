"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PixelArtShare } from "@/components/PixelArtShare";

export default function PixelArtPage() {
    const params = useParams();
    const hash = params.hash as string;
    
    const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
    const imageUrl = `https://${pinataGateway}/ipfs/${hash}`;
    
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-black" />
            
            <div className="relative z-10 max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        🎨 Pixel Art on Spritz
                    </h1>
                    <p className="text-zinc-400">
                        Created with love on the decentralized web
                    </p>
                </div>
                
                {/* Image container with pixel art styling */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
                    <div className="relative aspect-square w-full max-w-md mx-auto bg-white rounded-xl overflow-hidden border-4 border-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt="Pixel Art"
                            className="w-full h-full object-contain"
                            style={{ imageRendering: "pixelated" }}
                        />
                    </div>
                    
                    {/* Share button */}
                    <div className="mt-6 flex justify-center">
                        <PixelArtShare imageUrl={imageUrl} />
                    </div>
                </div>
                
                {/* CTA */}
                <div className="mt-8 text-center">
                    <p className="text-zinc-400 mb-4">
                        Want to create your own pixel art?
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF5500] to-[#FF8800] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create on Spritz
                    </Link>
                    
                    <p className="mt-6 text-zinc-500 text-sm">
                        Spritz is a censorship-resistant chat app for Web3
                    </p>
                </div>
            </div>
        </div>
    );
}
