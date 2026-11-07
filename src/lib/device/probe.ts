import type { ProbeResult } from "./types";

/**
 * Runs a short frame-time probe using requestAnimationFrame about 500ms after load.
 * Only runs if the tab is visible (document.visibilityState === 'visible') to prevent
 * background throttling from falsely classifying a desktop as a slow device.
 *
 * @param onComplete Callback invoked with the ProbeResult.
 * @param delayMs Delay in milliseconds before starting probe (default 500ms).
 * @param targetFrames Number of frames to sample (default 30 frames, ~500ms at 60fps).
 * @returns Cleanup function to cancel the probe if unmounted.
 */
export function runFrameProbe(
  onComplete: (result: ProbeResult) => void,
  delayMs = 500,
  targetFrames = 30
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let isCancelled = false;

  const startProbe = () => {
    // Verify tab visibility
    if (document.visibilityState !== "visible") {
      // If tab is not visible, wait for visibilitychange or mark skipped
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", onVisible);
          if (!isCancelled) {
            startProbe();
          }
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      return;
    }

    const deltas: number[] = [];
    let lastTime: number | null = null;
    let framesRecorded = 0;

    const sample = (now: number) => {
      if (isCancelled) return;

      if (lastTime !== null) {
        const delta = now - lastTime;
        // Ignore single wildly anomalous pauses (e.g., user switched tabs for a moment)
        if (delta > 0 && delta < 1000) {
          deltas.push(delta);
        }
      }

      lastTime = now;
      framesRecorded++;

      if (framesRecorded < targetFrames) {
        rafId = requestAnimationFrame(sample);
      } else {
        // Probe complete
        const avgFrameTimeMs =
          deltas.length > 0
            ? deltas.reduce((acc, d) => acc + d, 0) / deltas.length
            : 16.67;

        const fps = avgFrameTimeMs > 0 ? Math.round(1000 / avgFrameTimeMs) : 60;

        // Slow device criteria:
        // Average frame time > 24ms (under 42fps) or severe frame jitter
        const isSlow = avgFrameTimeMs > 24;

        const result: ProbeResult = {
          state: "completed",
          avgFrameTimeMs: Math.round(avgFrameTimeMs * 100) / 100,
          fps,
          isSlow,
          frameCount: deltas.length,
        };

        if (typeof window !== "undefined") {
          console.log(
            `[FrameProbe] Probe finished: avgFrameTime=${result.avgFrameTimeMs}ms, fps=${result.fps}, isSlow=${result.isSlow}, frameCount=${result.frameCount}`
          );
        }

        onComplete(result);
      }
    };

    rafId = requestAnimationFrame(sample);
  };

  timerId = setTimeout(startProbe, delayMs);

  return () => {
    isCancelled = true;
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}
