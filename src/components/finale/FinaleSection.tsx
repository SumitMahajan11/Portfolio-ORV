"use client";

import React, { useRef } from "react";
import { useMode } from "@/lib/flags";
import { useScene, gsap, ScrollTrigger } from "@/lib/motion";
import { DokjaFinaleFigure } from "./dokja-finale-figure";
import { ContactForm } from "./ContactForm";
import {
  useCameraReflection,
  CameraReflectionOverlay,
  CameraReflectionControls,
} from "./camera-reflection";

export interface FinaleSectionProps {
  className?: string;
}

/**
 * FinaleSection Component:
 * Act 6 Finale (id="contact", last section on "/")
 *
 * Rules:
 * - Dark glass stage (opacity/gradient only, strictly no blur filters)
 * - Dokja final form: closes phone, looks at reader
 * - ONE timeline plays once when section is 40% in view:
 *   1. phone lowers and screen dims
 *   2. gaze holds for a beat
 *   3. horns pulse red ONCE (600ms opacity on red rim layer)
 *   4. contact form fades in
 * - Reduced mode: shows final frame and form immediately
 * - Narration line (Cormorant italic): "The last page is a door, not a wall."
 */
export function FinaleSection({ className = "" }: FinaleSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dokjaRef = useRef<HTMLDivElement>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);

  const { reducedMotion } = useMode();

  const {
    isActive: isCameraActive,
    isRequesting: isCameraRequesting,
    biyooLine: cameraBiyooLine,
    videoRefCallback,
    startCamera,
    stopCamera,
  } = useCameraReflection({ sectionRef });

  useScene(
    () => {
      if (reducedMotion || !stageRef.current) return;

      const stage = stageRef.current;
      const phone = stage.querySelector(".finale-phone");
      const phoneScreen = stage.querySelector(".finale-phone-screen");
      const phoneGlow = stage.querySelector(".finale-phone-glow");
      const hornsRedRim = stage.querySelector(".finale-horns-red-rim");
      const formWrapper = formWrapperRef.current;

      // Set initial state for animated entrance
      if (phone) gsap.set(phone, { y: 0 });
      if (phoneScreen) gsap.set(phoneScreen, { opacity: 1 });
      if (phoneGlow) gsap.set(phoneGlow, { opacity: 0.5 });
      if (hornsRedRim) gsap.set(hornsRedRim, { opacity: 0 });
      if (formWrapper) gsap.set(formWrapper, { opacity: 0, y: 24 });

      // Build the single master finale timeline
      const tl = gsap.timeline({ paused: true });

      // Step 1: Phone lowers and screen dims (0.8s)
      if (phone) {
        tl.to(phone, {
          y: 22,
          duration: 0.8,
          ease: "power2.out",
        });
      }

      if (phoneScreen) {
        tl.to(
          phoneScreen,
          {
            opacity: 0.15,
            duration: 0.8,
            ease: "power2.out",
          },
          "<"
        );
      }

      if (phoneGlow) {
        tl.to(
          phoneGlow,
          {
            opacity: 0.05,
            duration: 0.8,
            ease: "power2.out",
          },
          "<"
        );
      }

      // Step 2: Gaze holds for a beat (0.5s pause)
      tl.to({}, { duration: 0.5 });

      // Step 3: Horns pulse red ONCE (600ms total: 300ms in, 300ms out)
      if (hornsRedRim) {
        tl.to(hornsRedRim, {
          opacity: 1,
          duration: 0.3,
          ease: "power1.in",
        });
        tl.to(hornsRedRim, {
          opacity: 0,
          duration: 0.3,
          ease: "power1.out",
        });
      }

      // Step 4: Contact form fades in (0.8s)
      if (formWrapper) {
        tl.to(
          formWrapper,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
          },
          "+=0.1"
        );
      }

      // Trigger once when section is 40% in view (top reaches 60% of viewport)
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 60%",
        once: true,
        onEnter: () => {
          tl.play();
        },
      });
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
      <div className="max-w-5xl mx-auto">
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

          {/* FAINT CAMERA REFLECTION (Behind Dokja's gaze layer) */}
          <CameraReflectionOverlay
            videoRefCallback={videoRefCallback}
            isActive={isCameraActive}
            isReduced={reducedMotion}
          />

          {/* Section Header & Narration Line */}
          <div className="relative z-10 text-center space-y-4 mb-10 sm:mb-14">
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

          {/* Grid Layout: Dokja Figure on left/top, Contact Form on right/bottom */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Dokja Final Form Stage */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3">
              <DokjaFinaleFigure
                ref={dokjaRef}
                isReduced={reducedMotion}
                width={300}
                height={380}
                className="max-w-full"
              />
              <span className="mt-1 font-mono text-[11px] text-mist/70 tracking-wider uppercase">
                Status: Standing Before The Reader
              </span>

              {/* Optional Camera Reflection Trigger */}
              <CameraReflectionControls
                isActive={isCameraActive}
                isRequesting={isCameraRequesting}
                biyooLine={cameraBiyooLine}
                onStart={startCamera}
                onStop={stopCamera}
              />
            </div>

            {/* Form Container */}
            <div
              ref={formWrapperRef}
              style={{
                opacity: reducedMotion ? 1 : 0,
                transform: reducedMotion ? "none" : undefined,
              }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
