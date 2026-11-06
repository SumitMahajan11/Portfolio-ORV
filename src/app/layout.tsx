import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cinzel, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ModeProvider } from "@/lib/flags";
import { SoundProvider } from "@/lib/sound";
import { MotionToggle } from "@/components/ui/motion-toggle";
import { SoundToggle, SoundPermissionPrompt } from "@/components/sound";
import { CornerBountyButton } from "@/components/biyoo/corner-bounty-button";
import { SiteWall } from "@/components/background/site-wall";
import { identity } from "@/content";
import "@/styles/globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-cinzel",
  display: "swap",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sumit Mahajan — Distributed Systems & Correctness",
    template: "%s | Sumit Mahajan",
  },
  description:
    "Sumit Mahajan — 3rd-year CSE undergrad at Pimpri Chinchwad University, Pune. From-scratch Rust Raft implementation, Z3 reachability proofs on Terraform, and carbon-aware edge-cloud orchestration.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Sumit Mahajan — Distributed Systems & Correctness",
    description:
      "From-scratch Rust Raft implementation & Z3 reachability proofs on cloud infrastructure.",
    url: "/",
    siteName: "Sumit Mahajan Portfolio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sumit Mahajan — Distributed Systems & Correctness",
    description:
      "From-scratch Rust Raft implementation & Z3 reachability proofs on cloud infrastructure.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07080B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: identity.name,
    url: siteUrl,
    sameAs: [identity.contact.github, identity.contact.linkedin].filter(Boolean),
  };

  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-void text-feather antialiased font-ui flex flex-col overflow-x-hidden">
        {/* Skip to Main Content Link (Keyboard accessible, first focusable item) */}
        <nav aria-label="Skip navigation">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ink focus:border-2 focus:border-star focus:text-star focus:font-mono focus:text-sm focus:rounded focus:shadow-2xl focus:outline-none"
          >
            Skip to main content &rarr;
          </a>
        </nav>

        {/* JSON-LD Person schema (Strictly no email, phone, or address per Rule 3) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <ModeProvider>
          <SoundProvider>
            {/* Global Background Wall Layer (PRE-4) */}
            <SiteWall />

            {/* Persistent Accessible Header */}
            <header className="sticky top-0 z-50 w-full border-b border-line bg-void/90 backdrop-blur-md">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3">
                <Link
                  href="/"
                  prefetch={false}
                  className={`${cinzel.className} font-display text-xs sm:text-base font-bold tracking-tight sm:tracking-wider text-feather hover:text-star transition-colors shrink-0`}
                >
                  SUMIT MAHAJAN
                </Link>

                <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0">
                  {/* Motion mode toggle: Full / Light */}
                  <MotionToggle />

                  {/* Sound toggle: On / Off */}
                  <SoundToggle />

                  {/* Bounty board link (desktop header; corner Biyoo covers mobile & tablet) */}
                  <Link
                    href="/wanted"
                    prefetch={false}
                    className="hidden lg:inline-flex font-mono text-xs sm:text-sm text-mist hover:text-star underline underline-offset-4 decoration-star/40 hover:decoration-star transition-colors focus:ring-2 focus:ring-star focus:outline-none rounded px-2 py-1"
                  >
                    Bounty board
                  </Link>

                  {/* Skip to contact link (desktop only to prevent tablet header overflow) */}
                  <Link
                    href="/#contact"
                    prefetch={false}
                    className="hidden lg:inline-flex font-mono text-xs sm:text-sm text-mist hover:text-star underline underline-offset-4 decoration-star/40 hover:decoration-star transition-colors focus:ring-2 focus:ring-star focus:outline-none rounded px-2 py-1"
                  >
                    Skip to contact &rarr;
                  </Link>

                  {/* Skip to plain version link - visible on first paint, keyboard focusable */}
                  <Link
                    href="/skip"
                    prefetch={false}
                    className="font-mono text-xs sm:text-sm text-mist hover:text-star underline underline-offset-4 decoration-star/40 hover:decoration-star transition-colors focus:ring-2 focus:ring-star focus:outline-none rounded px-2 py-1 shrink-0"
                  >
                    <span className="lg:hidden">Skip &rarr;</span>
                    <span className="hidden lg:inline">Skip to plain version &rarr;</span>
                  </Link>
                </div>
              </div>
            </header>

            <div className="flex-1">{children}</div>

            {/* Persistent Corner Bounty Button */}
            <CornerBountyButton />

            {/* Non-blocking Sound Permission Prompt ("Biyoo wants to say hi. Turn sound on?") */}
            <SoundPermissionPrompt />
          </SoundProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
