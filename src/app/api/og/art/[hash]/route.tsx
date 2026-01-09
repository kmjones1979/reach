import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    const { hash } = await params;
    
    const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
    const imageUrl = `https://${pinataGateway}/ipfs/${hash}`;
    
    try {
        return new ImageResponse(
            (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg, #18181b 0%, #09090b 50%, #18181b 100%)",
                        position: "relative",
                    }}
                >
                    {/* Background pattern */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255, 85, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 136, 0, 0.1) 0%, transparent 50%)",
                        }}
                    />
                    
                    {/* Main content */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "40px",
                            position: "relative",
                        }}
                    >
                        {/* Pixel art container */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "white",
                                borderRadius: "24px",
                                padding: "16px",
                                boxShadow: "0 25px 50px -12px rgba(255, 85, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt="Pixel Art"
                                width={400}
                                height={400}
                                style={{
                                    imageRendering: "pixelated",
                                    borderRadius: "12px",
                                }}
                            />
                        </div>
                        
                        {/* Branding */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                marginTop: "32px",
                                gap: "12px",
                            }}
                        >
                            {/* Spritz logo (orange circle) */}
                            <div
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #FF5500 0%, #FF8800 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 4px 12px rgba(255, 85, 0, 0.4)",
                                }}
                            >
                                <span style={{ fontSize: "24px" }}>🍊</span>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "28px",
                                        fontWeight: "bold",
                                        color: "white",
                                        letterSpacing: "-0.5px",
                                    }}
                                >
                                    Pixel Art on Spritz
                                </span>
                                <span
                                    style={{
                                        fontSize: "16px",
                                        color: "#a1a1aa",
                                    }}
                                >
                                    Create your own at spritz.chat
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (error) {
        console.error("Error generating OG image:", error);
        
        // Fallback to a simple card without the image
        return new ImageResponse(
            (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg, #18181b 0%, #09090b 100%)",
                    }}
                >
                    <div
                        style={{
                            width: "120px",
                            height: "120px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #FF5500 0%, #FF8800 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "24px",
                            boxShadow: "0 8px 24px rgba(255, 85, 0, 0.4)",
                        }}
                    >
                        <span style={{ fontSize: "60px" }}>🍊</span>
                    </div>
                    <span
                        style={{
                            fontSize: "48px",
                            fontWeight: "bold",
                            color: "white",
                            marginBottom: "8px",
                        }}
                    >
                        Pixel Art on Spritz
                    </span>
                    <span
                        style={{
                            fontSize: "24px",
                            color: "#a1a1aa",
                        }}
                    >
                        Create your own at spritz.chat
                    </span>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    }
}
