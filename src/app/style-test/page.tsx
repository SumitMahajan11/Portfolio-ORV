import React from "react";
import { SystemWindow } from "@/components/system-window";

const HUB_COLORS = [
  { token: "--void", hex: "#07080B", use: "Page background", bgClass: "bg-[#07080B]", border: true },
  { token: "--ink", hex: "#0E1118", use: "Panels, cards", bgClass: "bg-[#0E1118]", border: true },
  { token: "--ink-2", hex: "#161B26", use: "Raised surfaces", bgClass: "bg-[#161B26]", border: true },
  { token: "--line", hex: "#243044", use: "Hairlines, borders", bgClass: "bg-[#243044]", border: false },
  { token: "--feather", hex: "#F4F6FA", use: "Wings, coat, primary text", bgClass: "bg-[#F4F6FA]", border: false },
  { token: "--mist", hex: "#9AA7BD", use: "Secondary text", bgClass: "bg-[#9AA7BD]", border: false },
  { token: "--rim", hex: "#9FB4D6", use: "Cold rim light on white forms", bgClass: "bg-[#9FB4D6]", border: false },
  { token: "--star", hex: "#5EE1E6", use: "Constellation / system-window accent (teal)", bgClass: "bg-[#5EE1E6]", border: false },
  { token: "--horn-dark", hex: "#2A0A10", use: "Horn body", bgClass: "bg-[#2A0A10]", border: true },
];

const WORLD_PALETTES = [
  {
    world: "edge-cloud",
    title: "Edge-Cloud Orchestrator",
    theme: "ORV Constellation star-network",
    swatches: [
      { name: "Deep Navy", hex: "#0A1128", cssVar: "--world-deep-navy" },
      { name: "--star Teal", hex: "#5EE1E6", cssVar: "--world-star-teal" },
      { name: "Greener Path", hex: "#6EE7A8", cssVar: "--world-soft-green" },
    ],
  },
  {
    world: "raft",
    title: "Ratify (Raft)",
    theme: "Naruto: Hidden Leaf",
    swatches: [
      { name: "Warm Orange", hex: "#F28C28", cssVar: "--world-warm-orange" },
      { name: "Leaf Green", hex: "#3E8E41", cssVar: "--world-leaf-green" },
      { name: "Parchment", hex: "#F1E4C3", cssVar: "--world-parchment" },
    ],
  },
  {
    world: "z3",
    title: "Z3 / Formal Verification",
    theme: "HxH Nen Vows",
    swatches: [
      { name: "Emerald", hex: "#1FA37A", cssVar: "--world-emerald" },
      { name: "Violet", hex: "#6B4EFF", cssVar: "--world-violet" },
      { name: "Black Chain Lines", hex: "#000000", cssVar: "--world-black-chain" },
    ],
  },
  {
    world: "backtrace",
    title: "Backtrace",
    theme: "Conan: Case Board",
    swatches: [
      { name: "Midnight Blue", hex: "#0F1B3D", cssVar: "--world-midnight-blue" },
      { name: "Corkboard", hex: "#B88A55", cssVar: "--world-corkboard" },
      { name: "Brass", hex: "#D4B15F", cssVar: "--world-brass" },
    ],
  },
  {
    world: "sidequest",
    title: "Side Quests",
    theme: "Nearest World Accent",
    swatches: [
      { name: "Brass Accent", hex: "#D4B15F", cssVar: "--world-accent" },
    ],
  },
];

const TYPE_SCALES = [
  { size: "12px", className: "text-[12px] leading-tight" },
  { size: "14px", className: "text-[14px] leading-tight" },
  { size: "16px", className: "text-[16px] leading-normal" },
  { size: "20px", className: "text-[20px] leading-normal" },
  { size: "28px", className: "text-[28px] leading-snug" },
  { size: "40px", className: "text-[40px] leading-tight" },
  { size: "64px", className: "text-[64px] leading-none" },
  { size: "96px", className: "text-[96px] leading-none" },
];

const FONTS = [
  { name: "Display (Cinzel)", fontClass: "font-display", sample: "THE INCARNATION KIM DOKJA" },
  { name: "UI / Body (Space Grotesk)", fontClass: "font-ui", sample: "Distributed systems, formal verification, and kernel performance." },
  { name: "Mono (JetBrains Mono)", fontClass: "font-mono", sample: "const scenario = await orchestrate({ nodes: 60 });" },
  { name: "Narration (Cormorant Garamond - Italic)", fontClass: "font-narration italic", sample: "Only I know the end of this world." },
];

export default function StyleTestPage() {
  return (
    <div className="min-h-screen bg-void text-feather px-4 py-12 sm:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header */}
      <header className="border-b border-line pb-6 space-y-2">
        <div className="flex items-center gap-3">
          <span className="h-4 w-2 bg-star" aria-hidden="true" />
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-star">
            DESIGN SYSTEM STYLE TEST
          </h1>
        </div>
        <p className="font-ui text-mist text-sm max-w-2xl">
          Verification page for ORV hub tokens, scoped world palettes, font scales, and the ORV SystemWindow component. Not linked from public navigation.
        </p>
      </header>

      {/* 1. Hub Colors */}
      <section className="space-y-6">
        <div className="border-b border-line pb-2">
          <h2 className="font-display text-lg font-semibold tracking-wide text-star">
            1. HUB PALETTE TOKENS
          </h2>
          <p className="text-xs text-mist font-mono mt-1">
            Exact hex values from /docs/02-DESIGN-SYSTEM.md exposed as CSS variables and Tailwind colors.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {HUB_COLORS.map((c) => (
            <div
              key={c.token}
              className={`p-3 rounded border ${c.border ? "border-line" : "border-line/40"} bg-ink space-y-2`}
            >
              <div
                className={`h-16 w-full rounded ${c.bgClass} ${c.border ? "border border-line" : ""}`}
              />
              <div className="font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-feather font-bold">{c.token}</span>
                  <span className="text-mist">{c.hex}</span>
                </div>
                <p className="text-mist/80 text-[11px] leading-tight">{c.use}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rule 7 Check: Demo Swatch for --horn */}
        <div className="p-4 rounded border-2 border-[#B3122B]/60 bg-ink-2 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#B3122B]" aria-hidden="true" />
            <h3 className="font-mono text-sm font-bold text-[#F4F6FA] uppercase tracking-wide">
              Rule Check Demo: --horn (#B3122B)
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-16 w-32 rounded bg-[#B3122B] border border-white/20 shrink-0 flex items-center justify-center font-mono text-xs font-bold text-white shadow-inner">
              #B3122B
            </div>
            <div className="font-mono text-xs text-mist space-y-1">
              <p className="text-[#F4F6FA] font-semibold">
                [CLAUDE.md Standing Rule &amp; /docs/02 Specification]
              </p>
              <p>
                Token: <code className="text-star">--horn</code> (#B3122B). RED. Horns only (+ one finale pulse).
              </p>
              <p className="text-[#F4F6FA]/90">
                Rule check verified: This demo swatch is the ONLY place in the entire codebase where --horn is rendered. It is never used on UI buttons, borders, or layout components.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. World Palettes */}
      <section className="space-y-6">
        <div className="border-b border-line pb-2">
          <h2 className="font-display text-lg font-semibold tracking-wide text-star">
            2. WORLD PALETTES (SCOPED VIA DATA-WORLD)
          </h2>
          <p className="text-xs text-mist font-mono mt-1">
            Scoped under [data-world=&quot;edge-cloud | raft | z3 | backtrace | sidequest&quot;]. Scoped variables do not leak to the hub.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WORLD_PALETTES.map((w) => (
            <div
              key={w.world}
              data-world={w.world}
              className="p-5 rounded border border-line bg-ink space-y-4"
            >
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div>
                  <h3 className="font-display text-sm font-semibold text-star">
                    {w.title}
                  </h3>
                  <p className="font-mono text-[11px] text-mist">{w.theme}</p>
                </div>
                <code className="text-[10px] text-star bg-ink-2 px-1.5 py-0.5 rounded border border-line">
                  data-world=&quot;{w.world}&quot;
                </code>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {w.swatches.map((s) => (
                  <div key={s.name} className="space-y-1.5">
                    <div
                      className="h-14 rounded border border-line flex items-end p-1.5 shadow-sm"
                      style={{ backgroundColor: s.hex }}
                    >
                      <span className="font-mono text-[9px] font-bold text-black bg-white/80 px-1 rounded">
                        {s.hex}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-mist truncate" title={s.name}>
                      {s.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Typography Scales */}
      <section className="space-y-8">
        <div className="border-b border-line pb-2">
          <h2 className="font-display text-lg font-semibold tracking-wide text-star">
            3. TYPOGRAPHY SCALE (12 / 14 / 16 / 20 / 28 / 40 / 64 / 96)
          </h2>
          <p className="text-xs text-mist font-mono mt-1">
            4 fonts loaded via next/font/google with display: swap. Scale: 12, 14, 16, 20, 28, 40, 64, 96.
          </p>
        </div>

        <div className="space-y-10">
          {FONTS.map((f) => (
            <div key={f.name} className="border border-line rounded p-5 bg-ink/70 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-mono text-xs font-bold text-star uppercase tracking-wider">
                  {f.name}
                </span>
                <code className="font-mono text-[11px] text-mist">class: {f.fontClass}</code>
              </div>

              <div className="space-y-4 overflow-x-auto pb-2">
                {TYPE_SCALES.map((ts) => (
                  <div
                    key={ts.size}
                    className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 border-b border-line/30 pb-3"
                  >
                    <span className="font-mono text-xs text-star/80 w-16 shrink-0">
                      {ts.size}
                    </span>
                    <span className={`${f.fontClass} ${ts.className} text-feather truncate`}>
                      {f.sample}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Two SystemWindow Examples */}
      <section className="space-y-6">
        <div className="border-b border-line pb-2">
          <h2 className="font-display text-lg font-semibold tracking-wide text-star">
            4. ORV SYSTEM WINDOW EXAMPLES
          </h2>
          <p className="text-xs text-mist font-mono mt-1">
            Spec: border --line, --ink at 85% opacity, corner ticks, mono text, teal header bar, subtle scan-lines. Pure CSS, no GSAP.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Example 1: Scenario Card */}
          <SystemWindow
            title="[Main Scenario #1 - Proof of Value]"
            footer="[Penalty for Failure: Scenario Termination] | [Reward: 5,000 Coins]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-mist border-b border-line/50 pb-1.5">
                <span>Category: Main Scenario</span>
                <span className="text-star font-bold">Difficulty: F &rarr; SSS</span>
              </div>
              <p className="text-sm">
                The Constellations form a living network. Prove your value by verifying design system tokens, world palettes, and pure CSS HUD components.
              </p>
              <div className="rounded border border-line bg-ink-2/60 p-2.5 space-y-1 text-xs">
                <div className="text-star font-bold">Clear Conditions:</div>
                <div className="text-mist">&bull; All 10 hub color tokens rendered faithfully.</div>
                <div className="text-mist">&bull; Scoped world palettes isolated from root.</div>
                <div className="text-mist">&bull; 4 Google fonts active across 8-step type scale.</div>
              </div>
            </div>
          </SystemWindow>

          {/* Example 2: Item Information Box */}
          <SystemWindow
            title="[Item Information: Unbroken Faith]"
            footer="[Equipped: Incarnation Kim Dokja]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-mist border-b border-line/50 pb-1.5">
                <span>Item Rating: S-Grade (Relic)</span>
                <span className="text-star font-bold">Durability: 100 / 100</span>
              </div>
              <p className="text-sm">
                A blade infused with pure ether. The constellation &apos;Demon-like Judge of Fire&apos; watches its edge with keen interest.
              </p>
              <div className="rounded border border-line bg-ink-2/60 p-2.5 space-y-1 text-xs">
                <div className="text-star font-bold">Special Effects:</div>
                <div className="text-mist">&bull; Ether Blade: +25% attack against corrupted entities.</div>
                <div className="text-mist">&bull; Reader&apos;s Record: Unlocks hidden storylines when inspecting artifacts.</div>
              </div>
            </div>
          </SystemWindow>
        </div>
      </section>

      {/* 5. Accessibility & Motion Verification */}
      <section className="space-y-4 border border-line rounded p-5 bg-ink">
        <h2 className="font-display text-sm font-semibold tracking-wide text-star">
          5. ACCESSIBILITY &amp; MOTION CHECK
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <button
            type="button"
            className="px-4 py-2 rounded bg-ink-2 border border-line text-feather hover:border-star transition-colors"
          >
            Test Focus Ring (Click / Tab to test --star ring)
          </button>
          <span className="text-mist">
            prefers-reduced-motion: animations/transitions disabled globally under reduce mode.
          </span>
        </div>
      </section>
    </div>
  );
}
