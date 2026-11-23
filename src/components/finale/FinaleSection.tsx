"use client";

import React, { useRef } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap, ScrollTrigger } from "@/lib/motion";
import { ContactForm } from "./ContactForm";

export interface FinaleSectionProps {
  className?: string;
}

/**
 * FinaleSection Component:
 * Act 6 Finale (id="contact", last section on "/")
 *
 * Implements hero-H1 override:
 * - Dokja removed from the site and build entirely
 * - Dark glass stage (opacity/gradient only, strictly no blur filters)
 * - Accessible, direct contact form centered in the finale stage
 * - Fades in cleanly on scroll into view (or instant for reduced-motion)
 * - Narration line (Cormorant italic): "The last page is a door, not a wall."
 */
export function FinaleSection({ className = "" }: FinaleSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);

  const { reducedMotion } = useMode();

  useScene(
    () => {
      if (reducedMotion || !stageRef.current) return;

      const formWrapper = formWrapperRef.current;
      if (formWrapper) {
        gsap.set(formWrapper, { opacity: 0, y: 24 });

        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top 65%",
          once: true,
          onEnter: () => {
            gsap.to(formWrapper, {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power2.out",
            });
          },
        });
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion] }
  );

  return (
    <section
      ref={sectionRef}
      id="contact"
      data-section="contact"
      aria-labelledby="contact-heading"
      className={`relative w-full py-20 sm:py-28 px-4 sm:px-6 lg:px-8 select-none ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        {/* DARK GLASS STAGE: opacity/gradient only, strictly no blur filters */}
        <div
          ref={stageRef}
          className="relative rounded-2xl border border-line/70 bg-gradient-to-b from-ink/95 via-void/90 to-void p-6 sm:p-10 lg:p-12 shadow-2xl overflow-hidden"
        >
          {/* Subtle star rim glow accent at top of the stage */}
          <div
            className="pointer-events-none absolute -top-24 inset-x-0 mx-auto w-72 h-48 bg-star/10 rounded-full blur-none opacity-40"
            aria-hidden="true"
          />

          {/* Section Header & Narration Line */}
          <div className="relative z-10 text-center space-y-4 mb-10 sm:mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-star">
              [ACT 6: THE NEXT CHAPTER]
            </span>

            {/* Narration line (Cormorant italic): verbatim from /docs/14 #36 */}
            <p className="font-narration italic text-2xl sm:text-3xl text-feather/95 max-w-2xl mx-auto leading-relaxed">
              &ldquo;The last page is a door, not a wall.&rdquo;
            </p>

            <h2 id="contact-heading" className="sr-only">
              Direct Contact
            </h2>
          </div>

          {/* Centered Form Container */}
          <div
            ref={formWrapperRef}
            style={{
              opacity: reducedMotion ? 1 : 0,
              transform: reducedMotion ? "none" : undefined,
            }}
            className="relative z-10 max-w-xl mx-auto w-full flex flex-col justify-center"
          >
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

export default FinaleSection;
