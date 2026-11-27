"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMode } from "@/lib/flags";
import { useScene, ScrollTrigger } from "@/lib/motion";
import {
  NODE_COUNT,
  CLUSTER_PALETTE,
  PRECOMPUTED_STARS,
  cableKey,
  computeNodePositions,
  getScriptedStages,
  createInitialSimulationState,
  stepClusterSimulation,
  triggerWriteValue,
  triggerSplitPartition,
  triggerHealCables,
  type LiveClusterSimulationState,
  type SwipePoint,
  type ClusterViolation,
  type RaftPosition,
  type PacketType,
} from "@/lib/worlds/ratify-five-model";

export interface RaftVizCanvasProps {
  onClearScenario?: () => void;
}

const SEG_INTERSECT = (
  p: { x: number; y: number },
  q: { x: number; y: number },
  r: { x: number; y: number },
  s: { x: number; y: number }
): boolean => {
  const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  return ccw(p, r, s) !== ccw(q, r, s) && ccw(p, q, r) !== ccw(p, q, s);
};

export function RaftVizCanvas({ onClearScenario }: RaftVizCanvasProps) {
  const { reducedMotion } = useMode();

  // Mode & playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSafeQuorum, setIsSafeQuorum] = useState(true);
  const [progressVal, setProgressVal] = useState(0);

  // Verdict state
  const [verdict, setVerdict] = useState<{
    isBad: boolean;
    heading: string;
    detail: string;
  }>({
    isBad: false,
    heading: "Consistent",
    detail: "0 committed entries compared, 0 conflicts",
  });

  // Event feed state
  const [eventFeed, setEventFeed] = useState<string[]>([
    "Cluster started with 5 nodes in term 0",
  ]);

  // DOM & canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Playback control refs
  const isPlayingRef = useRef(false);
  const progressRef = useRef(0);
  const clearedTriggeredRef = useRef(false);
  const curScriptedStepRef = useRef(-1);

  // Core cluster simulation state ref
  const simStateRef = useRef<LiveClusterSimulationState>(createInitialSimulationState());
  const swipeTrailRef = useRef<SwipePoint[]>([]);
  const pointerDownRef = useRef<{ x: number; y: number; moved: number; last: { x: number; y: number } } | null>(null);
  const positionsRef = useRef<RaftPosition[]>([]);

  // Biyoo costume hook: leaf headband
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("biyoo:costume", {
          detail: { costume: "leaf headband" },
        })
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("biyoo:costume", {
            detail: { costume: null },
          })
        );
      }
    };
  }, []);

  // Event feed helper
  const pushEvent = useCallback((msg: string) => {
    setEventFeed((prev) => [msg, ...prev.slice(0, 4)]);
  }, []);

  // Update verdict display helper
  const updateVerdictDisplay = useCallback(
    (viol: ClusterViolation | null, checksCount: number) => {
      if (viol) {
        if (viol.k === "two") {
          setVerdict({
            isBad: true,
            heading: "Split brain",
            detail: `Two leaders elected in term ${viol.term}.`,
          });
        } else {
          setVerdict({
            isBad: true,
            heading: "Logs diverged",
            detail: `Slot ${viol.slot}: N${(viol.a?.id ?? 0) + 1} committed ${
              viol.a?.v
            }, N${(viol.b?.id ?? 0) + 1} committed ${viol.b?.v}.`,
          });
        }
      } else {
        setVerdict({
          isBad: false,
          heading: "Consistent",
          detail: `${checksCount.toLocaleString()} committed entries compared, 0 conflicts`,
        });
      }
    },
    []
  );

  // Cut cable across segment
  const cutAcrossSegment = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      const P = positionsRef.current;
      const state = simStateRef.current;
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const k = cableKey(i, j);
          if (state.cutCables.has(k)) continue;
          if (P[i] && P[j] && SEG_INTERSECT(p1, p2, P[i], P[j])) {
            state.cutCables.add(k);
            pushEvent(`Cable N${i + 1} to N${j + 1} severed`);
          }
        }
      }
    },
    [pushEvent]
  );

  // Apply scripted progress (for scroll-driven mode)
  const applyScriptedProgress = useCallback(
    (progress: number) => {
      const stages = getScriptedStages();
      const idx = Math.min(
        stages.length - 1,
        Math.floor(progress * stages.length)
      );

      if (idx !== curScriptedStepRef.current) {
        curScriptedStepRef.current = idx;
        const stage = stages[idx];
        const state = simStateRef.current;

        state.nodes = stage.nodes.map((n) => ({
          ...n,
          log: n.log.map((e) => ({ ...e })),
        }));
        state.cutCables = new Set(stage.cutCables);
        state.packets = stage.packets.map((p) => ({ ...p }));
        pushEvent(stage.eventMessage);
        setVerdict(stage.verdict);

        if (idx === stages.length - 1 && !clearedTriggeredRef.current) {
          clearedTriggeredRef.current = true;
          onClearScenario?.();
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("biyoo:action", {
                detail: { state: "proud", line: "Consensus proven!" },
              })
            );
          }
        }
      }
    },
    [onClearScenario, pushEvent]
  );

  // ScrollTrigger integration for scroll-driven scrub in normal mode
  useScene(
    () => {
      if (reducedMotion || !containerRef.current) return;

      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 75%",
        end: "bottom 15%",
        scrub: 0.8,
        onUpdate: (self) => {
          if (!isPlayingRef.current) {
            progressRef.current = self.progress;
            setProgressVal(self.progress);
            applyScriptedProgress(self.progress);
          }
        },
      });

      return () => {
        trigger.kill();
      };
    },
    { scope: containerRef, dependencies: [reducedMotion, applyScriptedProgress] }
  );

  // Main canvas draw loop
  const drawCanvas = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const cx = cv.getContext("2d");
    if (!cx) return;

    const r = cv.getBoundingClientRect();
    const W = r.width;
    const H = r.height;
    const narrow = W < 560;

    const SL = narrow ? 3 : 5;
    const BW = narrow ? Math.max(20, W / 15) : 40;
    const BH = narrow ? 18 : 26;
    const NR = narrow ? 22 : Math.min(36, W * 0.04);

    const P = computeNodePositions(W, H, narrow);
    positionsRef.current = P;

    cx.clearRect(0, 0, W, H);
    cx.globalAlpha = 1;

    // Background radial gradient
    const g = cx.createRadialGradient(
      W / 2,
      H / 2,
      10,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.65
    );
    g.addColorStop(0, CLUSTER_PALETTE.panel2);
    g.addColorStop(1, CLUSTER_PALETTE.panel);
    cx.fillStyle = g;
    cx.fillRect(0, 0, W, H);

    const state = simStateRef.current;
    const t = state.simTime;

    // Ambient stars from precomputed table (100% deterministic & pure)
    cx.fillStyle = CLUSTER_PALETTE.muted;
    for (const s of PRECOMPUTED_STARS) {
      cx.globalAlpha = 0.22 + (reducedMotion ? 0 : 0.22 * Math.sin(t * s[3] + s[0] * 9));
      cx.beginPath();
      cx.arc(s[0] * W, s[1] * H, s[2], 0, 7);
      cx.fill();
    }
    cx.globalAlpha = 1;

    const nodes = state.nodes;

    // Draw connection cables
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const a = P[i];
        const b = P[j];
        if (!a || !b) continue;
        const isCut = state.cutCables.has(cableKey(i, j));

        cx.beginPath();
        cx.moveTo(a.x, a.y);
        cx.lineTo(b.x, b.y);

        if (isCut) {
          cx.setLineDash([6, 7]);
          cx.strokeStyle = CLUSTER_PALETTE.red;
          cx.globalAlpha = 0.75;
          cx.lineWidth = 2;
        } else {
          cx.setLineDash([]);
          cx.strokeStyle = CLUSTER_PALETTE.cyan;
          cx.globalAlpha =
            nodes[i]?.alive && nodes[j]?.alive ? 0.3 : 0.08;
          cx.lineWidth = 1.6;
        }
        cx.stroke();
        cx.setLineDash([]);
        cx.globalAlpha = 1;

        if (isCut) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          cx.fillStyle = CLUSTER_PALETTE.panel;
          cx.beginPath();
          cx.arc(mx, my, 11, 0, 7);
          cx.fill();

          cx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
          cx.fillStyle = CLUSTER_PALETTE.red;
          cx.textAlign = "center";
          cx.textBaseline = "middle";
          cx.fillText("✕", mx, my + 1);
        }
      }
    }

    // Draw flying packets
    const PC: Record<PacketType, string> = {
      RV: CLUSTER_PALETTE.amber,
      VOTE: CLUSTER_PALETTE.green,
      AE: CLUSTER_PALETTE.cyan,
      ACK: CLUSTER_PALETTE.text,
    };

    for (const pkt of state.packets) {
      const a = P[pkt.a];
      const b = P[pkt.b];
      if (!a || !b) continue;
      const col = pkt.dead ? CLUSTER_PALETTE.red : PC[pkt.type];

      for (let k = reducedMotion ? 0 : 5; k >= 0; k--) {
        const u = Math.max(0, pkt.p - k * 0.035);
        cx.globalAlpha = (1 - k / 6) * (pkt.type === "ACK" ? 0.55 : 0.95);
        cx.fillStyle = col;
        cx.shadowColor = col;
        cx.shadowBlur = k === 0 ? 12 : 0;
        cx.beginPath();
        cx.arc(
          a.x + (b.x - a.x) * u,
          a.y + (b.y - a.y) * u,
          (pkt.type === "AE" ? 4.5 : 3.8) * (1 - k * 0.1),
          0,
          7
        );
        cx.fill();
      }
    }
    cx.shadowBlur = 0;
    cx.globalAlpha = 1;

    // Draw sparks
    for (const spk of state.sparks) {
      cx.globalAlpha = spk.l;
      cx.strokeStyle = CLUSTER_PALETTE.red;
      cx.lineWidth = 2;
      cx.beginPath();
      cx.arc(spk.x, spk.y, (1 - spk.l) * 18 + 3, 0, 7);
      cx.stroke();
    }
    cx.globalAlpha = 1;

    // Draw nodes
    nodes.forEach((n, i) => {
      const p = P[i];
      if (!p) return;
      const col = n.s === "C" ? CLUSTER_PALETTE.amber : CLUSTER_PALETTE.cyan;

      // Pulse wave for leader
      if (n.alive && n.s === "L" && n.pulse > 0 && !reducedMotion) {
        cx.globalAlpha = n.pulse * 0.5;
        cx.strokeStyle = CLUSTER_PALETTE.cyan;
        cx.lineWidth = 2;
        cx.beginPath();
        cx.arc(p.x, p.y, NR + (1 - n.pulse) * 46, 0, 7);
        cx.stroke();
      }

      cx.globalAlpha = 1;
      cx.fillStyle = CLUSTER_PALETTE.panel;
      cx.shadowColor = col;
      cx.shadowBlur = n.alive ? (n.s === "L" ? 24 : 10) : 0;
      cx.beginPath();
      cx.arc(p.x, p.y, NR, 0, 7);
      cx.fill();
      cx.shadowBlur = 0;

      const viol = state.violation;
      const isBadNode =
        viol &&
        ((viol.ids && viol.ids.includes(i)) ||
          (viol.a && viol.a.id === i) ||
          (viol.b && viol.b.id === i));

      cx.lineWidth = n.s === "L" ? 4 : 2.5;
      cx.strokeStyle = isBadNode
        ? CLUSTER_PALETTE.red
        : n.alive
        ? col
        : CLUSTER_PALETTE.muted;
      cx.globalAlpha = n.alive ? (n.s === "F" ? 0.55 : 1) : 0.45;
      cx.setLineDash(n.alive ? [] : [4, 5]);
      cx.beginPath();
      cx.arc(p.x, p.y, NR, 0, 7);
      cx.stroke();
      cx.setLineDash([]);
      cx.globalAlpha = 1;

      // Write flash ring
      if (n.flash > 0) {
        cx.globalAlpha = n.flash;
        cx.strokeStyle = CLUSTER_PALETTE.amber;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.arc(p.x, p.y, NR + 4, 0, 7);
        cx.stroke();
        cx.globalAlpha = 1;
      }

      // Election timer countdown arc
      if (n.alive && n.s !== "L") {
        cx.strokeStyle = n.s === "C" ? CLUSTER_PALETTE.amber : CLUSTER_PALETTE.cyan;
        cx.lineWidth = 3.5;
        cx.lineCap = "round";
        cx.beginPath();
        cx.arc(
          p.x,
          p.y,
          NR + 6,
          -Math.PI / 2,
          -Math.PI / 2 + 6.2832 * Math.max(0, n.to / n.tm)
        );
        cx.stroke();
        cx.lineCap = "butt";
      }

      // Node labels
      cx.textAlign = "center";
      cx.textBaseline = "middle";

      cx.font = `700 ${narrow ? 13 : 18}px ui-sans-serif, system-ui, sans-serif`;
      cx.fillStyle = n.alive ? CLUSTER_PALETTE.text : CLUSTER_PALETTE.muted;
      cx.fillText(`N${i + 1}`, p.x, p.y - (narrow ? 4 : 6));

      cx.font = `600 ${narrow ? 9 : 11}px ui-sans-serif, system-ui, sans-serif`;
      cx.fillStyle = n.s === "L" && n.alive ? CLUSTER_PALETTE.cyan : CLUSTER_PALETTE.muted;
      const roleStr = !n.alive
        ? "down"
        : n.s === "L"
        ? "leader"
        : n.s === "C"
        ? "candidate"
        : "follower";
      cx.fillText(narrow ? `T${n.term}` : roleStr, p.x, p.y + (narrow ? 9 : 12));

      if (!narrow) {
        cx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
        cx.fillStyle = CLUSTER_PALETTE.muted;
        cx.fillText(`term ${n.term}`, p.x, p.y - NR - 14);
      }

      // Node log boxes
      const tw = SL * (BW + 4) - 4;
      let cxT = p.x;
      let cyT = p.y;
      if (narrow) {
        cyT = p.uy < -0.5 ? p.y - NR - 9 - BH / 2 - 6 : p.y + NR + 9 + BH / 2;
      } else {
        cxT = p.x + p.ux * (NR + 14 + tw / 2);
        cyT = p.y + p.uy * (NR + 14 + BH / 2) + (p.uy < -0.5 ? -12 : 0);
      }

      const st = Math.max(0, n.log.length - SL);
      for (let s = 0; s < SL; s++) {
        const idx = st + s;
        const e = n.log[idx];
        const bx = cxT - tw / 2 + s * (BW + 4);
        const by = cyT - BH / 2;

        cx.beginPath();
        cx.roundRect(bx, by, BW, BH, 4);

        if (e) {
          const isCommitted = idx < n.ci;
          const isBadSlot = viol && viol.slot && viol.slot - 1 === idx;

          if (isCommitted) {
            cx.fillStyle = isBadSlot ? CLUSTER_PALETTE.red : CLUSTER_PALETTE.cyan;
            cx.globalAlpha = 0.92;
            cx.fill();
            cx.globalAlpha = 1;
          } else {
            cx.strokeStyle = CLUSTER_PALETTE.amber;
            cx.lineWidth = 1.6;
            cx.setLineDash([3, 3]);
            cx.stroke();
            cx.setLineDash([]);
          }

          if (!narrow) {
            cx.font = "700 12px ui-monospace, Menlo, Consolas, monospace";
            cx.fillStyle = isCommitted ? CLUSTER_PALETTE.panel : CLUSTER_PALETTE.amber;
            cx.fillText(String(e.v), bx + BW / 2, by + BH / 2 + 1);
          }
        } else {
          cx.strokeStyle = CLUSTER_PALETTE.muted;
          cx.globalAlpha = 0.3;
          cx.lineWidth = 1;
          cx.stroke();
          cx.globalAlpha = 1;
        }
      }
    });

    // Draw pointer swipe trail
    const sw = swipeTrailRef.current;
    if (sw.length > 1) {
      cx.lineCap = "round";
      cx.shadowColor = CLUSTER_PALETTE.cyan;
      cx.shadowBlur = 10;
      for (let i = 1; i < sw.length; i++) {
        const p1 = sw[i - 1];
        const p2 = sw[i];
        cx.globalAlpha = Math.max(0, 1 - (t - p2.t) / 0.5);
        cx.strokeStyle = CLUSTER_PALETTE.text;
        cx.lineWidth = 3;
        cx.beginPath();
        cx.moveTo(p1.x, p1.y);
        cx.lineTo(p2.x, p2.y);
        cx.stroke();
      }
      cx.shadowBlur = 0;
      cx.globalAlpha = 1;
      cx.lineCap = "butt";
    }

    // Hint text
    if (state.hintOpacity > 0) {
      cx.globalAlpha = state.hintOpacity * 0.85;
      cx.font = `500 ${narrow ? 11 : 13}px ui-sans-serif, system-ui, sans-serif`;
      cx.fillStyle = CLUSTER_PALETTE.muted;
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(
        "swipe across a cable to cut it. click a node to crash it.",
        W / 2,
        H - 18
      );
      cx.globalAlpha = 1;
    }
  }, [reducedMotion]);

  // Main animation frame handler
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000 || 0);
      lastTs = now;

      if (isPlayingRef.current && !reducedMotion) {
        stepClusterSimulation(simStateRef.current, dt, positionsRef.current, {
          onEvent: (msg) => pushEvent(msg),
          onVerdict: (viol, count) => updateVerdictDisplay(viol, count),
        });
      }

      drawCanvas();
      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [drawCanvas, pushEvent, reducedMotion, updateVerdictDisplay]);

  // Canvas resize handler
  useEffect(() => {
    const handleResize = () => {
      const cv = canvasRef.current;
      if (!cv) return;
      const rect = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
      const cx = cv.getContext("2d");
      if (cx) {
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      drawCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawCanvas]);

  // Pointer interactions
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };
    const rect = cv.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    simStateRef.current.hasInteracted = true;
    const pt = getCanvasPos(e);
    pointerDownRef.current = { ...pt, moved: 0, last: pt };
    swipeTrailRef.current = [{ ...pt, t: simStateRef.current.simTime }];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerDownRef.current) return;
    const pt = getCanvasPos(e);
    const last = pointerDownRef.current.last;
    const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
    pointerDownRef.current.moved += dist;

    if (pointerDownRef.current.moved > 8) {
      cutAcrossSegment(last, pt);
    }

    pointerDownRef.current.last = pt;
    swipeTrailRef.current.push({ ...pt, t: simStateRef.current.simTime });
  };

  const handlePointerUp = () => {
    const pd = pointerDownRef.current;
    if (pd && pd.moved < 8) {
      const P = positionsRef.current;
      const cv = canvasRef.current;
      const NR = cv && cv.clientWidth < 560 ? 22 : Math.min(36, (cv?.clientWidth ?? 900) * 0.04);
      const state = simStateRef.current;

      // Check node click to toggle crash / restart
      for (let i = 0; i < NODE_COUNT; i++) {
        if (P[i] && Math.hypot(pd.x - P[i].x, pd.y - P[i].y) < NR + 8) {
          const n = state.nodes[i];
          n.alive = !n.alive;
          if (n.alive) {
            n.s = "F";
            n.tm = 3.5 + Math.random() * 3.5;
            n.to = n.tm;
            pushEvent(`N${i + 1} recovered and rejoined cluster`);
          } else {
            pushEvent(`N${i + 1} crashed (down)`);
          }
          return;
        }
      }

      // Check cable midpoint click to restore
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const k = cableKey(i, j);
          if (state.cutCables.has(k) && P[i] && P[j]) {
            const mx = (P[i].x + P[j].x) / 2;
            const my = (P[i].y + P[j].y) / 2;
            if (Math.hypot(pd.x - mx, pd.y - my) < 16) {
              state.cutCables.delete(k);
              pushEvent(`Cable N${i + 1} to N${j + 1} restored`);
              return;
            }
          }
        }
      }
    }
    pointerDownRef.current = null;
  };

  const handlePointerCancel = () => {
    pointerDownRef.current = null;
  };

  // Button actions
  const handleTogglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next;
      return next;
    });
  };

  const handleWriteValue = () => {
    simStateRef.current.hasInteracted = true;
    triggerWriteValue(simStateRef.current, false, pushEvent);
  };

  const handleSplitPartition = () => {
    triggerSplitPartition(simStateRef.current, pushEvent);
  };

  const handleHealCables = () => {
    triggerHealCables(simStateRef.current, pushEvent);
  };

  const handleResetCluster = () => {
    simStateRef.current = createInitialSimulationState();
    simStateRef.current.safeQuorum = isSafeQuorum;
    pushEvent("Cluster reset to initial state");
    updateVerdictDisplay(null, 0);
  };

  const handleToggleQuorum = () => {
    simStateRef.current.hasInteracted = true;
    setIsSafeQuorum((prev) => {
      const next = !prev;
      simStateRef.current.safeQuorum = next;
      pushEvent(
        next
          ? "Quorum restored to majority (3 of 5)"
          : "Quorum lowered to 2 of 5: a minority can now decide!"
      );
      return next;
    });
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickP = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    progressRef.current = clickP;
    setProgressVal(clickP);
    applyScriptedProgress(clickP);
  };

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl border border-line/80 bg-ink/90 p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-4 select-none"
      role="region"
      aria-label="Interactive 5-node Ratify consensus visualizer"
    >
      {/* Control bar */}
      <div className="flex flex-wrap gap-2.5 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "Pause consensus simulation" : "Play consensus simulation"}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-mono font-semibold transition-all cursor-pointer ${
              isPlaying
                ? "border-[#5EE1E6] bg-[#5EE1E6]/15 text-[#5EE1E6] shadow-[0_0_12px_rgba(94,225,230,0.2)]"
                : "border-line bg-ink-2 text-feather hover:border-[#5EE1E6]/60"
            }`}
          >
            <span className="text-[10px]">{isPlaying ? "⏸" : "▶"}</span>
            <span>{isPlaying ? "Pause" : "Play auto"}</span>
          </button>

          <button
            type="button"
            onClick={handleWriteValue}
            className="px-3.5 py-1.5 rounded-full border border-line bg-ink-2 hover:border-[#5EE1E6] text-feather text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Write a value
          </button>

          <button
            type="button"
            onClick={handleSplitPartition}
            className="px-3.5 py-1.5 rounded-full border border-line bg-ink-2 hover:border-[#FBBF24] text-feather text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Split 2 | 3
          </button>

          <button
            type="button"
            onClick={handleHealCables}
            className="px-3.5 py-1.5 rounded-full border border-line bg-ink-2 hover:border-[#4ADE80] text-feather text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Heal cables
          </button>

          <button
            type="button"
            onClick={handleResetCluster}
            className="px-3.5 py-1.5 rounded-full border border-line bg-ink-2 hover:border-mist text-mist hover:text-feather text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            role="switch"
            aria-checked={isSafeQuorum}
            onClick={handleToggleQuorum}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-mono font-semibold transition-colors cursor-pointer ${
              isSafeQuorum
                ? "border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/10"
                : "border-[#F87171] text-[#F87171] bg-[#F87171]/15"
            }`}
          >
            {isSafeQuorum ? "Quorum: 3 of 5" : "Quorum: 2 of 5 (broken)"}
          </button>

          <span className="font-mono text-[11px] text-mist border border-line px-2.5 py-1 rounded">
            {isPlaying ? "Auto playback" : "Scroll-driven"}
          </span>
        </div>
      </div>

      {/* Progress & Scrub Bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(progressVal * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Consensus simulation progress track"
        onClick={handleProgressBarClick}
        title="Click to jump consensus progress"
        className="w-full h-1 bg-line relative overflow-hidden cursor-pointer rounded-full"
      >
        <div
          className="h-full bg-gradient-to-r from-[#5EE1E6] via-[#4ADE80] to-[#FBBF24] transition-all duration-75"
          style={{ width: `${(progressVal * 100).toFixed(1)}%` }}
        />
      </div>

      {/* Canvas Stage */}
      <div
        ref={stageRef}
        className={`relative w-full h-[440px] sm:h-[500px] lg:h-[540px] rounded-2xl overflow-hidden border transition-all duration-300 ${
          verdict.isBad
            ? "border-[#F87171] shadow-[0_0_40px_rgba(248,113,113,0.3)]"
            : "border-line/70"
        }`}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Live five-node Raft cluster. Swipe across cables to cut them, click a node to crash it."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="w-full h-full block touch-none cursor-crosshair select-none"
        />
      </div>

      {/* Lower section: Verdict card & Event feed */}
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4 pt-2">
        <div
          className={`p-4 rounded-xl border text-sm font-sans transition-all ${
            verdict.isBad
              ? "border-[#F87171] text-[#F87171] bg-[#F87171]/10"
              : "border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/10"
          }`}
          aria-live="polite"
        >
          <b className="block text-base sm:text-lg font-bold mb-1">
            {verdict.heading}
          </b>
          <span className="text-feather/90">{verdict.detail}</span>
        </div>

        <ul
          className="m-0 p-3 rounded-xl border border-line/60 bg-ink-2/40 list-none space-y-1.5 font-mono text-xs text-mist overflow-hidden"
          aria-label="Recent cluster events"
        >
          {eventFeed.map((evt, idx) => (
            <li
              key={`evt-${idx}-${evt.slice(0, 10)}`}
              className={`truncate ${idx === 0 ? "text-feather font-medium" : "text-mist"}`}
            >
              {evt}
            </li>
          ))}
        </ul>
      </div>

      {/* Packet Key / Legend */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 font-mono text-xs text-mist">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] inline-block" />
          <span>vote request</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] inline-block" />
          <span>vote</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5EE1E6] inline-block" />
          <span>heartbeat and log</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-feather inline-block" />
          <span>acknowledgement</span>
        </span>
      </div>

      {/* Proof Note */}
      <p className="font-sans text-xs text-mist/80 pt-2 border-t border-line/40">
        This page is a model, not the Ratify source. The repository checks the same safety properties with a bounded TLA+ model, Porcupine and a custom Wing &amp; Gong checker.{" "}
        <a
          href="https://github.com/SumitMahajan11/Ratify"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5EE1E6] underline hover:text-feather transition-colors"
        >
          Read the evidence on GitHub &rarr;
        </a>
      </p>
    </div>
  );
}

export default RaftVizCanvas;
