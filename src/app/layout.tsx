import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cinzel, Space_Grotesk, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import { ModeProvider } from "@/lib/flags";
import { MotionToggle } from "@/components/ui/motion-toggle";
import "@/styles/globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  style: ["italic", "normal"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sumit Mahajan | Portfolio",
  description: "ORV Story Portfolio - Distributed Systems & Correctness",
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
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${cormorantGaramond.variable}`}
    >
      <body className="min-h-screen bg-void text-feather antialiased font-ui flex flex-col">
        <ModeProvider>
          {/* Persistent Accessible Header */}
          <header className="sticky top-0 z-50 w-full border-b border-line bg-void/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
              <Link
                href="/"
                prefetch={false}
                className="font-display text-sm sm:text-base font-bold tracking-wider text-feather hover:text-star transition-colors"
              >
                SUMIT MAHAJAN
              </Link>

              <div className="flex items-center gap-3 sm:gap-6">
                {/* Motion mode toggle: Full / Light */}
                <MotionToggle />

                {/* Skip to contact link */}
                <Link
                  href="/#contact"
                  className="font-mono text-xs sm:text-sm text-mist hover:text-star underline underline-offset-4 decoration-star/40 hover:decoration-star transition-colors focus:ring-2 focus:ring-star focus:outline-none rounded px-2 py-1"
                >
                  Skip to contact &rarr;
                </Link>

                {/* Skip to plain version link - visible on first paint, keyboard focusable */}
                <Link
                  href="/skip"
                  className="font-mono text-xs sm:text-sm text-mist hover:text-star underline underline-offset-4 decoration-star/40 hover:decoration-star transition-colors focus:ring-2 focus:ring-star focus:outline-none rounded px-2 py-1"
                >
                  Skip to plain version &rarr;
                </Link>
              </div>
            </div>
          </header>

          <div className="flex-1">{children}</div>
        </ModeProvider>
      </body>
    </html>
  );
}
