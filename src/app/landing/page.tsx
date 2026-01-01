import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Spritz - Censorship-Resistant Chat for Web3",
    description:
        "The censorship-resistant chat app for Web3. Connect with friends using passkeys or wallets, make HD video calls, go live, and chat freely.",
    openGraph: {
        title: "Spritz - Censorship-Resistant Chat for Web3",
        description:
            "The censorship-resistant chat app for Web3. Connect with friends using passkeys or wallets, make HD video calls, and chat freely.",
        url: "https://spritz.chat",
        images: ["/og-image.png"],
    },
    twitter: {
        card: "summary_large_image",
    },
};

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white font-[family-name:var(--font-space-grotesk)]">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/5">
                <nav className="max-w-[1200px] mx-auto flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/icons/icon-96x96.png"
                            alt="Spritz"
                            className="w-10 h-10 rounded-xl"
                        />
                        <span className="text-2xl font-bold">Spritz</span>
                    </Link>
                    <div className="hidden sm:flex items-center gap-8">
                        <a
                            href="#features"
                            className="text-zinc-400 hover:text-white font-medium transition-colors"
                        >
                            Features
                        </a>
                        <a
                            href="#data-privacy"
                            className="text-zinc-400 hover:text-white font-medium transition-colors"
                        >
                            Privacy
                        </a>
                        <a
                            href="https://github.com/kmjones1979/spritz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-white font-medium transition-colors"
                        >
                            GitHub
                        </a>
                        <a
                            href="https://app.spritz.chat"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF5500] to-[#e04d00] text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FF5500]/30 transition-all"
                        >
                            Open App →
                        </a>
                    </div>
                    {/* Mobile CTA */}
                    <a
                        href="https://app.spritz.chat"
                        className="sm:hidden inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF5500] to-[#e04d00] text-white font-semibold rounded-xl"
                    >
                        Open App
                    </a>
                </nav>
            </header>

            {/* Hero */}
            <section className="min-h-screen flex items-center justify-center px-4 sm:px-8 pt-32 pb-16 relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_30%_20%,rgba(255,85,0,0.15)_0%,transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,107,26,0.1)_0%,transparent_50%)] animate-pulse" />
                </div>

                <div className="max-w-[800px] text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5500]/10 border border-[#FF5500]/30 rounded-full text-[#FF5500] text-sm font-medium mb-8">
                        🍊 Now with Livestreaming
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
                        <span className="bg-gradient-to-r from-[#FF5500] to-[#FF6B1A] bg-clip-text text-transparent">
                            Censorship-Resistant
                        </span>
                        <br />
                        <span className="bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
                            Chat for Web3
                        </span>
                    </h1>
                    <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-[600px] mx-auto">
                        Connect with friends using passkeys or wallets. Make HD
                        video calls, go live to your followers, and chat freely
                        on a decentralized network.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="https://app.spritz.chat"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF5500] to-[#e04d00] text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FF5500]/30 transition-all"
                        >
                            Launch App →
                        </a>
                        <a
                            href="https://github.com/kmjones1979/spritz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-zinc-700 text-white font-semibold rounded-xl hover:bg-zinc-800 hover:border-zinc-600 transition-all"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            View Source
                        </a>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section
                id="features"
                className="py-24 px-4 sm:px-8 bg-gradient-to-b from-[#09090b] to-[#0d0d0f]"
            >
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Built for Freedom
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-[500px] mx-auto">
                            Everything you need for private, censorship-resistant
                            communication
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon="🔐"
                            title="Passwordless Login"
                            description="Sign in with passkeys or connect your Ethereum/Solana wallet. No email or phone number required."
                        />
                        <FeatureCard
                            icon="📹"
                            title="HD Video Calls"
                            description="Crystal clear video and voice calls with optional end-to-end encryption via Huddle01's decentralized network."
                        />
                        <FeatureCard
                            icon="🔴"
                            title="Go Live"
                            description="Stream live to your followers with WebRTC broadcasting. Auto-recorded for replay. Share anywhere with public links."
                        />
                        <FeatureCard
                            icon="💬"
                            title="Decentralized Messaging"
                            description="Messages travel through the Waku network - no central servers to censor or shut down."
                        />
                        <FeatureCard
                            icon="🤖"
                            title="AI Agents"
                            description="Create and chat with AI agents powered by your choice of LLM. Add custom knowledge bases."
                        />
                        <FeatureCard
                            icon="📱"
                            title="Works Everywhere"
                            description="Install as a PWA on iOS, Android, or desktop. Native app-like experience without app store approval."
                        />
                    </div>
                </div>
            </section>

            {/* Tech Stack */}
            <section className="py-16 px-4 sm:px-8 border-y border-zinc-800">
                <div className="max-w-[1200px] mx-auto text-center">
                    <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-widest mb-8">
                        Powered by
                    </h3>
                    <div className="flex justify-center items-center gap-8 sm:gap-12 flex-wrap opacity-60">
                        {["Waku", "Livepeer", "Huddle01", "Supabase", "Next.js", "Ethereum", "Solana"].map(
                            (tech) => (
                                <span
                                    key={tech}
                                    className="text-zinc-400 font-medium"
                                >
                                    {tech}
                                </span>
                            )
                        )}
                    </div>
                </div>
            </section>

            {/* Data & Privacy */}
            <section
                id="data-privacy"
                className="py-24 px-4 sm:px-8 bg-gradient-to-b from-[#0d0d0f] to-[#09090b]"
            >
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Your Data, Your Control
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-[500px] mx-auto">
                            Transparency about how Spritz handles your information
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon="📅"
                            title="Google Calendar Integration"
                            description={
                                <>
                                    <strong className="text-[#FF5500]">Optional feature:</strong>{" "}
                                    Connect your Google Calendar to let others schedule calls
                                    with you. Spritz only reads your calendar availability to
                                    show open time slots - we never access event details,
                                    attendees, or other private information. You can disconnect
                                    at any time.
                                </>
                            }
                        />
                        <FeatureCard
                            icon="🛡️"
                            title="Minimal Data Collection"
                            description="We only collect what's necessary: your wallet address for identity and optional profile info you choose to share. Messages on Waku are ephemeral. We don't sell your data or show ads."
                        />
                        <FeatureCard
                            icon="🔓"
                            title="Open Source"
                            description="Our code is open source on GitHub. Audit it yourself, verify our privacy claims, or contribute improvements. Transparency is fundamental to trust."
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 px-4 sm:px-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,85,0,0.1)_0%,transparent_70%)]" />
                <div className="relative z-10 max-w-[600px] mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Ready to chat freely?
                    </h2>
                    <p className="text-zinc-400 text-lg mb-8">
                        Join thousands of users who value their privacy and
                        freedom of speech.
                    </p>
                    <a
                        href="https://app.spritz.chat"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF5500] to-[#e04d00] text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FF5500]/30 transition-all"
                    >
                        Get Started - It&apos;s Free →
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 sm:px-8 border-t border-zinc-800">
                <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 flex-wrap justify-center">
                        <a
                            href="https://github.com/kmjones1979/spritz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            GitHub
                        </a>
                        <a
                            href="https://x.com/spritzchat"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            X / Twitter
                        </a>
                        <a
                            href="https://app.spritz.chat"
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            App
                        </a>
                        <Link
                            href="/privacy"
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/tos"
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            Terms of Service
                        </Link>
                    </div>
                    <p className="text-zinc-400 text-sm">
                        © 2026 Spritz. Open source under MIT license.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: string;
    title: string;
    description: React.ReactNode;
}) {
    return (
        <div className="p-6 bg-gradient-to-br from-zinc-800/50 to-zinc-800/20 border border-zinc-800 rounded-2xl hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/30 transition-all">
            <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-[#FF5500] to-[#e04d00] rounded-2xl mb-5 text-2xl">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
        </div>
    );
}

