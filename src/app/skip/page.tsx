import type { Metadata } from "next";
import Link from "next/link";
import { identity, projects, skills, about } from "@/content";
import { renderField } from "@/components/ui/fill-badge";

export const metadata: Metadata = {
  title: "Sumit Mahajan | Plain Version",
  description:
    "Accessible, plain-text story-portfolio for Sumit Mahajan — Distributed Systems & Correctness.",
};

export default function SkipPage() {
  const isDev = process.env.NODE_ENV !== "production";

  // In production: hide any scenario that has no verified content (at least 1 verified claim)
  // In development: show all scenarios for review
  const visibleProjects = projects.filter((p) => {
    if (isDev) return true;
    return p.claims.some((c) => c.evidence === "verified");
  });

  const verifiedProjectIds = new Set(visibleProjects.map((p) => p.id));

  // In production: only show skills that link to a visible verified scenario
  // In development: show all skills
  const visibleSkills = isDev
    ? skills
    : skills.filter((s) => s.proofProjectIds.some((id) => verifiedProjectIds.has(id)));

  // Check if About section has any filled paragraphs
  const hasAboutContent = about.paragraphs.some(
    (p) => p !== null && p !== undefined && p !== ""
  );

  return (
    <div className="min-h-screen bg-void text-feather selection:bg-star selection:text-void">
      {/* Skip to Content Link (Keyboard accessible) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink focus:text-star focus:border focus:border-star focus:rounded focus:outline-none focus:ring-2 focus:ring-star font-mono text-sm shadow-xl"
      >
        Skip to main content
      </a>

      {/* Top Navigation */}
      <nav
        aria-label="Story navigation"
        className="max-w-[72ch] mx-auto px-4 sm:px-6 pt-6 pb-2 flex items-center justify-between"
      >
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono text-star hover:text-feather underline underline-offset-4 decoration-star/40 hover:decoration-star transition-colors focus:ring-2 focus:ring-star focus:outline-none rounded px-1.5 py-0.5"
        >
          &larr; Back to the story
        </Link>
        <span className="font-mono text-[11px] text-mist uppercase tracking-widest">
          Plain / Accessible Mode
        </span>
      </nav>

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-[72ch] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-16 focus:outline-none"
      >
        {/* Identity & Header */}
        <header className="space-y-4 border-b border-line pb-8">
          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-feather">
              {identity.name}
            </h1>
            <p className="font-mono text-sm text-star tracking-wide">
              {identity.degree} &bull; {identity.institution}, {identity.city}
            </p>
          </div>

          <div className="text-sm font-ui text-mist space-y-1">
            <p>
              Graduation: <span className="text-feather">{identity.graduation}</span>
            </p>
            <p>
              Targeting: <span className="text-feather">{identity.targeting}</span>
            </p>
            {identity.cgpa !== null ? (
              <p>
                CGPA: <span className="text-feather">{identity.cgpa}</span>
              </p>
            ) : (
              isDev && (
                <p>
                  CGPA: <span className="text-feather">{renderField(identity.cgpa)}</span>
                </p>
              )
            )}
          </div>
        </header>

        {/* Section 1: About (Hidden in production if no verified paragraphs are filled) */}
        {(isDev || hasAboutContent) && (
          <section id="about" aria-labelledby="heading-about" className="space-y-4">
            <div className="border-b border-line pb-2">
              <h2
                id="heading-about"
                className="font-display text-2xl font-bold text-feather"
              >
                About
              </h2>
              <p className="font-mono text-xs text-star mt-0.5">{about.title}</p>
            </div>

            <div className="space-y-4 text-feather/90 leading-relaxed font-ui text-base">
              {about.paragraphs.map((p, index) => {
                if (!isDev && (p === null || p === undefined || p === "")) {
                  return null;
                }
                const field = renderField(p);
                return (
                  <p key={index} className="leading-relaxed min-h-[1.5rem]">
                    {field}
                  </p>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 2: Scenarios (Projects with verified claims) */}
        <section id="scenarios" aria-labelledby="heading-scenarios" className="space-y-8">
          <div className="border-b border-line pb-2">
            <h2
              id="heading-scenarios"
              className="font-display text-2xl font-bold text-feather"
            >
              Scenarios
            </h2>
            <p className="font-mono text-xs text-mist mt-0.5">
              Verified flagship systems and scenario proofs
            </p>
          </div>

          <div className="space-y-8">
            {visibleProjects.map((project) => {
              // In production: only render claims that are verified
              const projectClaims = isDev
                ? project.claims
                : project.claims.filter((c) => c.evidence === "verified");

              // Filter out limits containing development placeholders or pre-launch TODOs
              const safeLimits = project.limits.filter(
                (l) =>
                  !l.includes("Pre-launch TODO") &&
                  !l.includes("awaiting verification") &&
                  !l.includes("pending verification") &&
                  !l.includes("[VERIFY]") &&
                  !l.includes("[FILL]")
              );
              const projectLimits = isDev ? project.limits : safeLimits;

              const hasRepo = Boolean(project.links.repo);
              const hasDemo = Boolean(project.links.demo);
              const hasBenchmark = Boolean(project.links.benchmark);
              const showLinksSection = isDev || hasRepo || hasDemo || hasBenchmark;

              return (
                <article
                  key={project.id}
                  id={`project-${project.id}`}
                  data-world={project.world}
                  className="p-6 rounded-lg border border-line bg-ink/70 space-y-4 focus-within:border-star/50 transition-colors"
                >
                  {/* Scenario Header */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 pb-3">
                    <div>
                      <h3 className="font-display text-xl font-bold text-feather">
                        {project.title}
                      </h3>
                      <p className="font-mono text-xs text-mist mt-0.5">
                        Scenario ID: <span className="text-feather">{project.id}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs px-2 py-0.5 rounded border uppercase tracking-wider ${
                          project.status === "flagship"
                            ? "text-star border-star/40 bg-star/10 font-semibold"
                            : "text-mist border-line bg-ink-2"
                        }`}
                      >
                        {project.status}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded border border-line bg-ink text-mist">
                        World: {project.world}
                      </span>
                    </div>
                  </div>

                  {/* One-Liner */}
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-mist mb-1">
                      Overview
                    </h4>
                    <p className="text-feather leading-relaxed font-ui">
                      {project.oneLiner}
                    </p>
                  </div>

                  {/* Claims & Evidence */}
                  {projectClaims.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-xs uppercase tracking-wider text-mist">
                        Claims &amp; Evidence
                      </h4>
                      <ul className="space-y-1.5 list-disc list-inside text-sm text-feather">
                        {projectClaims.map((claim, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span>{claim.text}</span>{" "}
                            <span
                              className={`inline-block font-mono text-[10px] px-1.5 py-0.2 rounded border uppercase tracking-wider ml-1 ${
                                claim.evidence === "verified"
                                  ? "text-star border-star/40 bg-star/10 font-semibold"
                                  : "text-mist border-line bg-ink-2"
                              }`}
                            >
                              [{claim.evidence}]
                            </span>
                            {claim.source && (
                              <span className="font-mono text-[11px] text-mist ml-1">
                                (source: {claim.source})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Limits & Scope */}
                  {projectLimits.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-mono text-xs uppercase tracking-wider text-mist">
                        Limits &amp; Boundaries
                      </h4>
                      <ul className="space-y-1 list-disc list-inside text-sm text-mist font-mono text-xs">
                        {projectLimits.map((limit, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {limit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Artifacts & Links (Hidden in production if all links are empty) */}
                  {showLinksSection && (
                    <div className="space-y-2 pt-2 border-t border-line/40">
                      <h4 className="font-mono text-xs uppercase tracking-wider text-mist">
                        Artifacts &amp; Links
                      </h4>
                      <div className="flex flex-wrap gap-4 text-xs font-mono">
                        {(isDev || hasRepo) && (
                          <div>
                            <span className="text-mist mr-1.5">Repository:</span>
                            {renderField(project.links.repo, (url) => (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-star hover:underline underline-offset-4 font-semibold focus:ring-1 focus:ring-star rounded px-1"
                              >
                                {url} ↗
                              </a>
                            ))}
                          </div>
                        )}
                        {(isDev || hasDemo) && (
                          <div>
                            <span className="text-mist mr-1.5">Demo:</span>
                            {renderField(project.links.demo, (url) => (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-star hover:underline underline-offset-4 font-semibold focus:ring-1 focus:ring-star rounded px-1"
                              >
                                View Demo ↗
                              </a>
                            ))}
                          </div>
                        )}
                        {hasBenchmark && project.links.benchmark && (
                          <div>
                            <span className="text-mist mr-1.5">Benchmark:</span>
                            <a
                              href={project.links.benchmark}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-star hover:underline underline-offset-4 font-semibold focus:ring-1 focus:ring-star rounded px-1"
                            >
                              View Benchmark ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Section 3: Reader's Record (Skills) */}
        {visibleSkills.length > 0 && (
          <section id="readers-record" aria-labelledby="heading-skills" className="space-y-6">
            <div className="border-b border-line pb-2">
              <h2
                id="heading-skills"
                className="font-display text-2xl font-bold text-feather"
              >
                Reader&apos;s Record (Skills)
              </h2>
              <p className="font-mono text-xs text-mist mt-0.5">
                Verified technical capabilities backed by scenario proofs
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {visibleSkills.map((skill) => {
                const proofLinks = skill.proofProjectIds
                  .filter((id) => isDev || verifiedProjectIds.has(id))
                  .map((projId) => {
                    const match = projects.find((p) => p.id === projId);
                    const title = match ? match.title : projId;
                    return { id: projId, title };
                  });

                return (
                  <div
                    key={skill.name}
                    className="p-4 rounded-lg border border-line bg-ink/50 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-mono text-sm sm:text-base font-bold text-feather">
                        {skill.name}
                      </h3>
                      {(isDev || skill.story) && (
                        <div className="text-xs text-mist leading-relaxed mt-1">
                          {renderField(skill.story, (story) => story)}
                        </div>
                      )}
                    </div>

                    {proofLinks.length > 0 && (
                      <div className="pt-2 border-t border-line/40 text-xs font-mono text-mist flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] uppercase tracking-wider">Proof:</span>
                        {proofLinks.map(({ id: projId, title }) => (
                          <a
                            key={projId}
                            href={`#project-${projId}`}
                            className="text-star hover:text-feather underline underline-offset-2 bg-star/5 hover:bg-star/15 border border-star/30 rounded px-1.5 py-0.5 transition-colors focus:ring-1 focus:ring-star focus:outline-none"
                            title={`Jump to scenario: ${title}`}
                          >
                            {title} &darr;
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 4: Links & Contact */}
        <section id="links" aria-labelledby="heading-links" className="space-y-6">
          <div className="border-b border-line pb-2">
            <h2
              id="heading-links"
              className="font-display text-2xl font-bold text-feather"
            >
              Links &amp; Contact
            </h2>
            <p className="font-mono text-xs text-mist mt-0.5">
              Public profiles and verifiable channels
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* GitHub */}
            <div className="p-4 rounded-lg border border-line bg-ink/60 space-y-1">
              <h3 className="font-mono text-xs uppercase tracking-wider text-mist">
                Code Repository
              </h3>
              <div>
                <a
                  href={identity.contact.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-star hover:text-feather font-mono text-sm underline underline-offset-4 decoration-star/40 hover:decoration-star inline-flex items-center gap-1 focus:ring-2 focus:ring-star focus:outline-none rounded px-1 py-0.5 transition-colors"
                >
                  GitHub (@{identity.github}) ↗
                </a>
              </div>
            </div>

            {/* LinkedIn (Hidden in production if not filled) */}
            {(isDev || identity.contact.linkedin) && (
              <div className="p-4 rounded-lg border border-line bg-ink/60 space-y-1">
                <h3 className="font-mono text-xs uppercase tracking-wider text-mist">
                  Professional Network
                </h3>
                <div className="font-mono text-sm">
                  <span className="text-mist mr-2">LinkedIn:</span>
                  {renderField(identity.contact.linkedin, (url) => (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-star hover:text-feather underline underline-offset-4 decoration-star/40 hover:decoration-star inline-flex items-center gap-1 focus:ring-2 focus:ring-star focus:outline-none rounded px-1 py-0.5 transition-colors"
                    >
                      LinkedIn Profile ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resume (Hidden in production if not filled) */}
            {(isDev || identity.contact.resumePdf) && (
              <div className="p-4 rounded-lg border border-line bg-ink/60 space-y-1 sm:col-span-2">
                <h3 className="font-mono text-xs uppercase tracking-wider text-mist">
                  Curriculum Vitae
                </h3>
                <div className="font-mono text-sm">
                  <span className="text-mist mr-2">Resume:</span>
                  {renderField(identity.contact.resumePdf, (url) => (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-star hover:text-feather underline underline-offset-4 decoration-star/40 hover:decoration-star inline-flex items-center gap-1 focus:ring-2 focus:ring-star focus:outline-none rounded px-1 py-0.5 transition-colors"
                    >
                      Download PDF ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact Note */}
          <div className="p-4 rounded-lg border border-line/60 bg-ink-2/40 text-sm text-mist leading-relaxed space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-feather font-semibold">
              Direct Contact Notice
            </h3>
            <p>
              The direct contact form arrives in Phase 3. In strict compliance with privacy guidelines, no personal email address, telephone number, or physical street address is published on this domain.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-line pt-8 pb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-mist">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-star hover:text-feather underline underline-offset-4 decoration-star/40 hover:decoration-star transition-colors focus:ring-2 focus:ring-star focus:outline-none rounded px-1 py-0.5"
          >
            &larr; Back to the story
          </Link>
          <p>
            &copy; 2026 {identity.name}. Built with Next.js and Tailwind CSS.
          </p>
        </footer>
      </main>
    </div>
  );
}
