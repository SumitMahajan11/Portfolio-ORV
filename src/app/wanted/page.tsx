import type { Metadata } from "next";
import Link from "next/link";
import { identity } from "@/content";
import { wanted } from "@/content/wanted";
import { renderField } from "@/components/ui/fill-badge";

export const metadata: Metadata = {
  title: "Wanted",
  description: "The bounty board: where to find Sumit Mahajan.",
  alternates: { canonical: "/wanted" },
  robots: { index: false, follow: true },
};

const linkClass =
  "inline-flex min-h-[44px] items-center justify-center rounded border border-[#2A1A0A] bg-[#2A1A0A] px-5 py-2 font-mono text-sm font-medium tracking-wide text-[#F3E6C8] transition-colors hover:bg-[#3D2810] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3122B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#E9D8AE]";

export default function WantedPage() {
  const { github, linkedin, resumePdf } = identity.contact;

  return (
    <main
      id="main-content"
      className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-24"
    >
      {/* Width lives on an inner wrapper: the global `main { max-width: 100vw }` rule beats utility max-w classes. */}
      <div className="flex w-full max-w-3xl flex-col items-center">
        <article
          aria-labelledby="wanted-heading"
          className="w-full rotate-0 rounded-sm border-8 border-[#5B3A1A] bg-[#E9D8AE] px-6 py-10 text-center text-[#2A1A0A] shadow-[0_12px_48px_rgba(0,0,0,0.6)] sm:rotate-[-1deg] sm:px-12 sm:py-14"
        >
          <h1
            id="wanted-heading"
            className="font-display text-5xl font-bold tracking-[0.2em] sm:text-7xl"
          >
            {wanted.headline}
          </h1>

          <div
            className="mx-auto my-6 flex aspect-[4/3] w-full max-w-sm items-center justify-center border-4 border-[#2A1A0A] bg-[#D9C48F]"
            role="img"
            aria-label="Portrait placeholder for the wanted poster"
          >
            <span
              className="font-display text-6xl font-bold opacity-60"
              aria-hidden="true"
            >
              SM
            </span>
          </div>

          <p className="font-display text-3xl font-bold uppercase tracking-wider sm:text-4xl">
            {identity.name}
          </p>
          <p className="mx-auto mt-3 max-w-md font-ui text-base sm:text-lg">
            {wanted.reason}
          </p>

          <ul
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
            aria-label="Proof"
          >
            {wanted.proofChips.map((chip) => (
              <li
                key={chip}
                className="rounded border border-[#2A1A0A]/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide"
              >
                {chip}
              </li>
            ))}
          </ul>

          <p className="mt-6 font-mono text-xs uppercase tracking-widest">
            Reward: {renderField(wanted.bounty)}
          </p>

          <p className="mt-2 font-mono text-xs">{identity.targeting}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              GitHub
            </a>
            {linkedin ? (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                LinkedIn
              </a>
            ) : (
              renderField(linkedin)
            )}
            {resumePdf ? (
              <a
                href={resumePdf}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Resume
              </a>
            ) : (
              renderField(resumePdf)
            )}
          </div>
        </article>

        <Link
          href="/"
          className="mt-8 font-mono text-sm text-star underline underline-offset-4 hover:text-feather focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-star"
        >
          &larr; Back to the archive
        </Link>
      </div>
    </main>
  );
}
