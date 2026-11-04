"use client";

import React from "react";
import Link from "next/link";
import { useMode } from "@/lib/flags";
import { SystemWindow } from "@/components/system-window";

export default function DevModeClient() {
  const {
    mode,
    lightMode,
    reducedMotion,
    particleCap,
    signals,
    isHydrated,
    soundOn,
    cameraOn,
    setSoundOn,
    setCameraOn,
    forceMode,
  } = useMode();

  const getModeBadgeClass = () => {
    switch (mode) {
      case "reduced":
        return "bg-mist/20 text-mist border-mist/50";
      case "light":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "full":
      default:
        return "bg-star/20 text-star border-star/50";
    }
  };

  return (
    <div className="min-h-screen bg-void text-feather p-4 sm:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-line pb-4 text-xs">
          <Link
            href="/"
            className="text-star hover:text-feather underline underline-offset-4 decoration-star/40"
          >
            &larr; Back to Portfolio
          </Link>
          <span className="text-mist uppercase tracking-widest text-[11px]">
            [DEVELOPER_MODE_INSPECTOR]
          </span>
        </div>

        {/* Primary Status Window */}
        <SystemWindow
          title="DEVICE_MODE_RESOLUTION"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Status:{" "}
                <span className={isHydrated ? "text-star" : "text-mist"}>
                  {isHydrated ? "CLIENT_HYDRATED (LIVE)" : "PRE_HYDRATION_SAFE_MODE"}
                </span>
              </span>
              <span>Spec: /docs/02-DESIGN-SYSTEM.md</span>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Mode & Particle Cap Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded border border-line bg-ink-2/60 space-y-2">
                <span className="text-xs text-mist uppercase tracking-wider block">
                  Active Mode
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl font-bold uppercase tracking-wider px-3 py-1 rounded border ${getModeBadgeClass()}`}
                  >
                    {mode}
                  </span>
                  <span className="text-xs text-mist">
                    {mode === "reduced"
                      ? "Static fallback, zero motion"
                      : mode === "light"
                      ? "Simplified effects & capped particles"
                      : "Full 60fps story animations"}
                    <span className="block text-[11px] text-star/80 mt-0.5">
                      lightMode={String(lightMode)} | reducedMotion={String(reducedMotion)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="p-4 rounded border border-line bg-ink-2/60 space-y-2">
                <span className="text-xs text-mist uppercase tracking-wider block">
                  Particle Cap
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-star">
                    {particleCap}
                  </span>
                  <span className="text-xs text-mist">
                    particles max ({mode === "light" ? "light cap: 15" : signals.isTouch || signals.isCoarsePointer ? "mobile cap: 40" : "desktop cap: 120"})
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Resolution Reason */}
            <div className="p-3 rounded border border-line/70 bg-ink text-xs space-y-1">
              <span className="text-star font-semibold block">Resolution Logic:</span>
              <p className="text-mist leading-relaxed">
                {signals.reducedMotion ? (
                  <span className="text-mist font-semibold">
                    &bull; Rule 1: `prefers-reduced-motion` is active. Mode locked to &apos;reduced&apos; (query overrides strictly rejected).
                  </span>
                ) : signals.queryOverride === "light" ? (
                  <span className="text-amber-300">
                    &bull; Rule 2: Query parameter `?light=1` active, forcing mode &apos;light&apos;.
                  </span>
                ) : signals.queryOverride === "full" ? (
                  <span className="text-star">
                    &bull; Rule 3: Query parameter `?full=1` active, forcing mode &apos;full&apos;.
                  </span>
                ) : (typeof signals.hardwareConcurrency === "number" && signals.hardwareConcurrency < 4) ||
                  (typeof signals.deviceMemory === "number" && signals.deviceMemory < 4) ||
                  signals.probe.isSlow ? (
                  <span className="text-amber-300">
                    &bull; Rule 4: Low-end device detected (Cores &lt; 4, Memory &lt; 4 GiB, or Slow Probe &gt; 24ms), auto-routing to &apos;light&apos;.
                  </span>
                ) : (
                  <span className="text-feather">
                    &bull; Rule 5: Standard hardware capabilities confirmed. Defaulting to &apos;full&apos;.
                  </span>
                )}
              </p>
            </div>
          </div>
        </SystemWindow>

        {/* Raw Signals Grid */}
        <SystemWindow title="RAW_DEVICE_SIGNALS">
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line text-mist uppercase tracking-wider">
                    <th className="py-2 px-3">Signal Name</th>
                    <th className="py-2 px-3">Measured Raw Value</th>
                    <th className="py-2 px-3">Evaluation Threshold</th>
                    <th className="py-2 px-3">Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50 text-feather">
                  {/* prefers-reduced-motion */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-star">
                      prefers-reduced-motion
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          signals.reducedMotion
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-ink-2 text-mist"
                        }`}
                      >
                        {String(signals.reducedMotion)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-mist">true</td>
                    <td className="py-2.5 px-3 text-mist">
                      {signals.reducedMotion ? "Forces 'reduced' always" : "Normal"}
                    </td>
                  </tr>

                  {/* hardwareConcurrency */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-star">
                      navigator.hardwareConcurrency
                    </td>
                    <td className="py-2.5 px-3">
                      {signals.hardwareConcurrency !== undefined ? (
                        <span>{signals.hardwareConcurrency} logical cores</span>
                      ) : (
                        <span className="text-mist">undefined (unsupported browser)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-mist">&lt; 4 cores</td>
                    <td className="py-2.5 px-3 text-mist">
                      {typeof signals.hardwareConcurrency === "number" &&
                      signals.hardwareConcurrency < 4
                        ? "Triggers 'light'"
                        : "Pass"}
                    </td>
                  </tr>

                  {/* deviceMemory */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-star">
                      navigator.deviceMemory
                    </td>
                    <td className="py-2.5 px-3">
                      {signals.deviceMemory !== undefined ? (
                        <span>~{signals.deviceMemory} GiB RAM</span>
                      ) : (
                        <span className="text-mist">
                          undefined (Safari / Firefox privacy guard)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-mist">&lt; 4 GiB</td>
                    <td className="py-2.5 px-3 text-mist">
                      {typeof signals.deviceMemory === "number" &&
                      signals.deviceMemory < 4
                        ? "Triggers 'light'"
                        : "Pass / Handled gracefully"}
                    </td>
                  </tr>

                  {/* Pointer & Touch */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-star">
                      Coarse Pointer / Touch
                    </td>
                    <td className="py-2.5 px-3">
                      pointer: coarse = {String(signals.isCoarsePointer)} | touch = {String(signals.isTouch)}
                    </td>
                    <td className="py-2.5 px-3 text-mist">Mobile / Touch heuristic</td>
                    <td className="py-2.5 px-3 text-mist">
                      {signals.isTouch || signals.isCoarsePointer
                        ? "Sets mobile particle cap (40)"
                        : "Desktop particle cap (120)"}
                    </td>
                  </tr>

                  {/* Frame-time Probe */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-star">
                      Frame-time Probe (rAF ~500ms)
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5">
                        <div>
                          State:{" "}
                          <span className="text-star uppercase font-bold">
                            {signals.probe.state}
                          </span>
                        </div>
                        {signals.probe.state === "completed" && (
                          <div className="text-mist">
                            Avg: {signals.probe.avgFrameTimeMs}ms ({signals.probe.fps} fps) across {signals.probe.frameCount} frames
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-mist">&gt; 24ms (under 42 fps)</td>
                    <td className="py-2.5 px-3 text-mist">
                      {signals.probe.isSlow ? "Janky device &rarr; 'light'" : "Smooth frame rate"}
                    </td>
                  </tr>

                  {/* Query Override */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-star">
                      URL Query Override
                    </td>
                    <td className="py-2.5 px-3">
                      {signals.queryOverride ? (
                        <span className="text-star font-bold">
                          ?{signals.queryOverride}=1
                        </span>
                      ) : (
                        <span className="text-mist">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-mist">?light=1 | ?full=1</td>
                    <td className="py-2.5 px-3 text-mist">
                      {signals.queryOverride ? `Forces '${signals.queryOverride}'` : "Automatic"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </SystemWindow>

        {/* Simulation and Testing Controls */}
        <SystemWindow title="TEST_SCENARIOS_AND_OVERRIDES">
          <div className="space-y-4">
            <p className="text-xs text-mist leading-relaxed">
              Test URL query parameters and simulate device environments:
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Link
                href="/dev/mode"
                className="px-3 py-1.5 rounded border border-line bg-ink hover:border-star transition-colors"
              >
                Reset (Default URL)
              </Link>
              <Link
                href="/dev/mode?light=1"
                className="px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-400 transition-colors"
              >
                Simulate ?light=1
              </Link>
              <Link
                href="/dev/mode?full=1"
                className="px-3 py-1.5 rounded border border-star/40 bg-star/10 text-star hover:border-star transition-colors"
              >
                Simulate ?full=1
              </Link>
            </div>

            <div className="pt-3 border-t border-line/60">
              <span className="text-xs text-mist block mb-2">
                Runtime Override Controls:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => forceMode("full")}
                  className={`px-2.5 py-1 rounded border text-xs ${
                    mode === "full" ? "border-star text-star bg-star/15" : "border-line text-mist hover:text-feather"
                  }`}
                >
                  Force Full
                </button>
                <button
                  type="button"
                  onClick={() => forceMode("light")}
                  className={`px-2.5 py-1 rounded border text-xs ${
                    mode === "light" ? "border-amber-400 text-amber-300 bg-amber-500/15" : "border-line text-mist hover:text-feather"
                  }`}
                >
                  Force Light
                </button>
                <button
                  type="button"
                  onClick={() => forceMode("reduced")}
                  className={`px-2.5 py-1 rounded border text-xs ${
                    mode === "reduced" ? "border-mist text-mist bg-mist/15" : "border-line text-mist hover:text-feather"
                  }`}
                >
                  Force Reduced
                </button>
                <button
                  type="button"
                  onClick={() => forceMode(null)}
                  className="px-2.5 py-1 rounded border border-line/60 text-mist hover:text-star"
                >
                  Clear Overrides (Auto)
                </button>
              </div>
            </div>

            {/* Feature Flags: Sound & Camera */}
            <div className="pt-3 border-t border-line/60 flex flex-wrap gap-6 text-xs text-mist">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundOn}
                  onChange={(e) => setSoundOn(e.target.checked)}
                  className="accent-star"
                />
                <span>soundOn flag: {String(soundOn)}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cameraOn}
                  onChange={(e) => setCameraOn(e.target.checked)}
                  className="accent-star"
                />
                <span>cameraOn flag: {String(cameraOn)}</span>
              </label>
            </div>
          </div>
        </SystemWindow>
      </div>
    </div>
  );
}
