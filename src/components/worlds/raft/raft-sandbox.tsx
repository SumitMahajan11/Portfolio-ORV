"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { RaftModel, type RaftSnapshot, type RaftEventRecord } from "@/lib/worlds/raft-model";
import { NinjaNodeSvg } from "./raft-static-diagram";
import { gsap } from "@/lib/motion";

const getInitialSnapshot = () => new RaftModel([1, 2, 3]).snapshot(0);

export function RaftSandbox() {
  const modelRef = useRef<RaftModel | null>(null);
  const getModel = useCallback((): RaftModel => {
    if (!modelRef.current) {
      modelRef.current = new RaftModel([1, 2, 3]);
    }
    return modelRef.current;
  }, []);

  const [, setTick] = useState(0);
  const [snapshot, setSnapshot] = useState<RaftSnapshot>(getInitialSnapshot);
  const [eventHistory, setEventHistory] = useState<RaftEventRecord[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<{ holding: boolean; error?: string }>({
    holding: true,
  });
  const [noQuorumMessage, setNoQuorumMessage] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [activeFlare, setActiveFlare] = useState<{
    from: number;
    to: number;
    type: "vote" | "append";
    success: boolean;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const flareRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback(() => {
    const currentModel = getModel();
    const snap = currentModel.snapshot(currentModel.currentStep);
    setSnapshot(snap);
    setEventHistory([...currentModel.eventLog]);

    // Check invariants
    try {
      // Invariant 1: At most one leader per term
      const termLeaders = new Map<number, Set<number>>();
      for (const el of currentModel.electionHistory) {
        if (!termLeaders.has(el.term)) termLeaders.set(el.term, new Set());
        termLeaders.get(el.term)!.add(el.leaderId);
      }
      for (const [, node] of currentModel.nodes) {
        if (node.role === "leader" && node.alive) {
          if (!termLeaders.has(node.currentTerm)) termLeaders.set(node.currentTerm, new Set());
          termLeaders.get(node.currentTerm)!.add(node.id);
        }
      }
      for (const [, leaders] of termLeaders) {
        if (leaders.size > 1) throw new Error("Multiple leaders in a single term");
      }

      // Invariant 2: At most one vote per node per term
      const votesByNodeAndTerm = new Map<string, number>();
      for (const vote of currentModel.votingHistory) {
        const key = `${vote.voterId}_t${vote.term}`;
        if (votesByNodeAndTerm.has(key) && votesByNodeAndTerm.get(key) !== vote.candidateId) {
          throw new Error(`Node ${vote.voterId} voted twice in term ${vote.term}`);
        }
        votesByNodeAndTerm.set(key, vote.candidateId);
      }

      // Invariant 5: Commit requires majority
      for (const [, node] of currentModel.nodes) {
        if (node.commitIndex > 0) {
          for (let idx = 1; idx <= node.commitIndex; idx++) {
            const entry = node.log[idx - 1];
            if (!entry) throw new Error("commitIndex exceeds log length");
            let replicas = 0;
            for (const [, peer] of currentModel.nodes) {
              if (
                peer.log.length >= idx &&
                peer.log[idx - 1].term === entry.term &&
                peer.log[idx - 1].label === entry.label
              ) {
                replicas++;
              }
            }
            if (replicas < 2) throw new Error(`Entry committed with only ${replicas} replica`);
          }
        }
      }

      // Invariant 10: Log up to date
      for (const vote of currentModel.votingHistory) {
        const upToDate =
          vote.candLastTerm > vote.voterLastTerm ||
          (vote.candLastTerm === vote.voterLastTerm && vote.candLogLength >= vote.voterLogLength);
        if (!upToDate) throw new Error(`Vote granted to candidate with less up-to-date log`);
      }

      // Invariant 11: Committed entries intact
      for (const [, node] of currentModel.nodes) {
        for (let idx = 1; idx <= node.commitIndex; idx++) {
          const committed = currentModel.committedRegistry.get(idx);
          if (committed) {
            const actual = node.log[idx - 1];
            if (!actual || actual.term !== committed.term || actual.label !== committed.label) {
              throw new Error(`Committed entry at index ${idx} corrupted or overwritten`);
            }
          }
        }
      }

      setSafetyStatus({ holding: true });
    } catch (err) {
      setSafetyStatus({ holding: false, error: err instanceof Error ? err.message : String(err) });
    }

    // Check quorum status
    let hasQuorum = false;
    for (const group of currentModel.partitionGroups) {
      const aliveInGroup = group.filter((id) => currentModel.nodes.get(id)?.alive);
      if (aliveInGroup.length >= 2) {
        hasQuorum = true;
        break;
      }
    }
    if (!hasQuorum) {
      setNoQuorumMessage("No quorum: cannot elect or commit");
    } else {
      setNoQuorumMessage(null);
    }

    setTick((t) => t + 1);
  }, [getModel]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // GSAP animation for flares
  useEffect(() => {
    if (!flareRef.current || !activeFlare) return;
    const flareEl = flareRef.current;
    const stageWidth = stageRef.current ? stageRef.current.clientWidth : 600;

    const nodeXPercent: Record<number, number> = { 1: 16.7, 2: 50.0, 3: 83.3 };
    const startPct = nodeXPercent[activeFlare.from] ?? 50;
    const targetPct = activeFlare.success
      ? nodeXPercent[activeFlare.to] ?? 50
      : 66.7; // stops at partition wall

    const startPx = (startPct / 100) * stageWidth;
    const targetPx = (targetPct / 100) * stageWidth;
    const deltaPx = targetPx - startPx;

    gsap.killTweensOf(flareEl);
    gsap.set(flareEl, { x: 0, opacity: 0, scale: 0.85 });

    if (activeFlare.success) {
      gsap
        .timeline()
        .to(flareEl, { opacity: 1, scale: 1.15, duration: 0.12, ease: "power1.out" })
        .to(flareEl, { x: deltaPx, duration: 0.45, ease: "power2.inOut" })
        .to(flareEl, { opacity: 0, scale: 0.7, duration: 0.12, ease: "power1.in" });
    } else {
      gsap
        .timeline()
        .to(flareEl, { opacity: 1, scale: 1.15, duration: 0.12, ease: "power1.out" })
        .to(flareEl, { x: deltaPx, duration: 0.35, ease: "power2.out" })
        .to(flareEl, { opacity: 0, duration: 0.15 });
    }
  }, [activeFlare]);

  // Cancel active playback timer if user clicks manual action
  const cancelPlayback = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSettling(false);
    setActiveFlare(null);
  };

  // Actions
  const handleCrash = (nodeId: number) => {
    cancelPlayback();
    getModel().crash(nodeId);
    updateState();
  };

  const handleRecover = (nodeId: number) => {
    cancelPlayback();
    getModel().recover(nodeId);
    updateState();
  };

  const handleIsolate = (nodeId: number) => {
    cancelPlayback();
    getModel().isolate(nodeId);
    updateState();
  };

  const handleHeal = () => {
    cancelPlayback();
    getModel().heal();
    updateState();
  };

  const handleClientWrite = () => {
    cancelPlayback();
    const currentModel = getModel();
    const activeLeader = Array.from(currentModel.nodes.values()).find(
      (n) => n.role === "leader" && n.alive
    );
    if (!activeLeader) {
      setNoQuorumMessage("No active leader: write rejected by cluster");
      return;
    }
    const nextIdx = activeLeader.log.length + 1;
    currentModel.clientEntry(activeLeader.id, `Scroll #${nextIdx} (Directive)`);
    updateState();
  };

  const handleSettle = () => {
    if (isSettling) return;
    setIsSettling(true);

    const currentModel = getModel();
    const prevEventsCount = currentModel.eventLog.length;
    const result = currentModel.settle();
    const newEvents = currentModel.eventLog.slice(prevEventsCount);

    if (result.noQuorum) {
      setNoQuorumMessage(result.message);
    }

    if (newEvents.length === 0) {
      updateState();
      setIsSettling(false);
      return;
    }

    // Per-event playback of settle actions
    let step = 0;
    const playNext = () => {
      if (step >= newEvents.length) {
        setIsSettling(false);
        setActiveFlare(null);
        updateState();
        return;
      }

      const ev = newEvents[step];
      if (ev.event === "requestVote") {
        const from = Number(ev.args.from);
        const to = Number(ev.args.to);
        setActiveFlare({
          from,
          to,
          type: "vote",
          success: ev.success,
        });
      } else if (ev.event === "appendEntries") {
        const from = Number(ev.args.leaderId);
        const to = Number(ev.args.toId);
        setActiveFlare({
          from,
          to,
          type: "append",
          success: ev.success,
        });
      } else {
        setActiveFlare(null);
      }

      if (ev.snapshot) {
        setSnapshot(ev.snapshot);
      }
      step++;
      timerRef.current = setTimeout(playNext, 600);
    };

    playNext();
  };

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    modelRef.current = new RaftModel([1, 2, 3]);
    setActiveFlare(null);
    setIsSettling(false);
    updateState();
  };

  // Check if partition wall is between node 1/2 and 3
  const isPartitionActive = snapshot.partitionGroups.length > 1;

  return (
    <div
      className="relative w-full rounded border border-line/80 bg-ink/95 p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6"
      role="region"
      aria-label="Interactive Raft Consensus Sandbox"
    >
      {/* Sandbox Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#3E8E41] animate-pulse" />
          <span className="font-mono text-xs text-[#3E8E41] tracking-widest uppercase font-semibold">
            [INTERACTIVE_RAFT_SANDBOX &bull; TRY_IT_YOURSELF]
          </span>
        </div>

        {/* Live Safety Badge */}
        <div
          role="status"
          aria-live="polite"
          className={`px-3 py-1 rounded border font-mono text-xs font-semibold tracking-wider flex items-center gap-2 ${
            safetyStatus.holding
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/15 text-red-400 border-red-500/50"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${safetyStatus.holding ? "bg-emerald-400" : "bg-red-400"}`} />
          <span>
            {safetyStatus.holding
              ? "Safety invariants: holding"
              : `Safety violation: ${safetyStatus.error}`}
          </span>
        </div>
      </div>

      {/* Deterministic Notice */}
      <div className="font-mono text-xs text-mist/90 bg-ink-2/60 px-3 py-2 rounded border border-line/40">
        Timeouts are deterministic here; real Raft randomizes them.
      </div>

      {/* No Quorum Warning Banner */}
      {noQuorumMessage && (
        <div
          role="alert"
          className="p-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">⚠</span>
            <span>{noQuorumMessage}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-amber-400/80">
            Majority required (2/3)
          </span>
        </div>
      )}

      {/* Main Village Canvas Stage */}
      <div
        ref={stageRef}
        className="relative w-full aspect-[640/340] min-h-[300px] sm:min-h-[360px] rounded border border-line/60 bg-[radial-gradient(circle_at_center,_rgba(36,22,12,0.6)_0%,_rgba(14,17,24,0.95)_80%)] overflow-hidden flex flex-col justify-between p-4 sm:p-6"
      >
        {/* Stage Status */}
        <div className="flex items-center justify-between font-mono text-xs z-10">
          <span className="text-[#F28C28] uppercase tracking-wider font-semibold">
            Highest Term: T{snapshot.highestTerm}
          </span>
          <span className="text-mist">
            Active Leader: {snapshot.activeLeaderId ? `Node ${snapshot.activeLeaderId}` : "None"}
          </span>
        </div>

        {/* Dynamic Signal Flare Element */}
        {activeFlare && (
          <div
            ref={flareRef}
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-30"
            style={{
              left: `${activeFlare.from === 1 ? 16.7 : activeFlare.from === 2 ? 50.0 : 83.3}%`,
            }}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shadow-lg ${
                activeFlare.type === "vote"
                  ? "bg-[#D4B15F] text-void shadow-[0_0_12px_#D4B15F]"
                  : "bg-emerald-400 text-void shadow-[0_0_12px_#34D399]"
              }`}
            >
              {activeFlare.type === "vote" ? "V" : "S"}
            </div>
          </div>
        )}

        {/* Partition Barrier Graphic */}
        {isPartitionActive && (
          <div
            className="absolute top-0 bottom-0 left-[66.7%] w-1.5 -translate-x-1/2 bg-red-500/80 shadow-[0_0_16px_rgba(239,68,68,0.8)] z-20 flex flex-col items-center justify-center"
            title="Partition Wall"
          >
            <div className="bg-red-950/90 border border-red-500/70 text-red-300 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded rotate-90 tracking-widest whitespace-nowrap">
              Partition Wall
            </div>
          </div>
        )}

        {/* 3 Ninja Nodes */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 relative z-10 my-auto items-center">
          {snapshot.nodes.map((node) => {
            const isDown = !node.alive || node.role === "down";
            const roleForSvg: "follower" | "candidate" | "leader" | "crashed" = isDown
              ? "crashed"
              : node.role === "down"
              ? "crashed"
              : node.role;
            const exprForSvg = isDown
              ? "fallen"
              : node.role === "leader"
              ? "calm"
              : node.role === "candidate"
              ? "determined"
              : "attentive";

            const nodeName =
              node.id === 1
                ? "Node 1 (Naruto)"
                : node.id === 2
                ? "Node 2 (Sasuke)"
                : "Node 3 (Sakura)";

            return (
              <div
                key={node.id}
                className={`flex flex-col items-center space-y-2 p-2 rounded transition-opacity ${
                  isDown ? "opacity-50" : "opacity-100"
                }`}
              >
                <NinjaNodeSvg
                  name={nodeName}
                  role={roleForSvg}
                  expression={exprForSvg}
                  term={node.currentTerm}
                />

                <div className="font-mono text-[10px] text-center text-mist/80">
                  Commit: {node.commitIndex} | Voted: {node.votedFor ? `N${node.votedFor}` : "-"}
                </div>

                {/* Log Scrolls */}
                <div className="w-full max-w-[130px] space-y-1">
                  {node.log.length === 0 ? (
                    <div className="text-[9px] font-mono text-mist/40 text-center italic">
                      Log empty
                    </div>
                  ) : (
                    node.log.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border truncate ${
                          idx + 1 <= node.commitIndex
                            ? "bg-[#F28C28]/15 border-[#F28C28]/40 text-[#F28C28] font-bold"
                            : "bg-ink-2/60 border-line text-mist"
                        }`}
                        title={`Index ${idx + 1}: ${entry.label} (T${entry.term})`}
                      >
                        [{idx + 1}] T{entry.term} {entry.label.replace("Scroll #", "S#")}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Panel Grid */}
      <div className="space-y-4 border-t border-line/60 pt-4">
        <div className="font-mono text-xs text-feather uppercase tracking-wider font-semibold">
          [CLUSTER CONTROLS]
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {/* Crash Controls */}
          <button
            type="button"
            onClick={() => handleCrash(1)}
            aria-label="Crash Node 1"
            className="px-2.5 py-1.5 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-mono text-xs transition-colors"
          >
            Crash N1
          </button>
          <button
            type="button"
            onClick={() => handleCrash(2)}
            aria-label="Crash Node 2"
            className="px-2.5 py-1.5 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-mono text-xs transition-colors"
          >
            Crash N2
          </button>
          <button
            type="button"
            onClick={() => handleCrash(3)}
            aria-label="Crash Node 3"
            className="px-2.5 py-1.5 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-mono text-xs transition-colors"
          >
            Crash N3
          </button>

          {/* Recover Controls */}
          <button
            type="button"
            onClick={() => handleRecover(1)}
            aria-label="Recover Node 1"
            className="px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-xs transition-colors"
          >
            Recover N1
          </button>
          <button
            type="button"
            onClick={() => handleRecover(2)}
            aria-label="Recover Node 2"
            className="px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-xs transition-colors"
          >
            Recover N2
          </button>
          <button
            type="button"
            onClick={() => handleRecover(3)}
            aria-label="Recover Node 3"
            className="px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-xs transition-colors"
          >
            Recover N3
          </button>

          {/* Isolate Controls */}
          <button
            type="button"
            onClick={() => handleIsolate(1)}
            aria-label="Isolate Node 1"
            className="px-2.5 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs transition-colors"
          >
            Isolate N1
          </button>
          <button
            type="button"
            onClick={() => handleIsolate(2)}
            aria-label="Isolate Node 2"
            className="px-2.5 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs transition-colors"
          >
            Isolate N2
          </button>
          <button
            type="button"
            onClick={() => handleIsolate(3)}
            aria-label="Isolate Node 3"
            className="px-2.5 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-xs transition-colors"
          >
            Isolate N3
          </button>

          {/* Heal Network */}
          <button
            type="button"
            onClick={handleHeal}
            aria-label="Heal network partition"
            className="px-2.5 py-1.5 rounded border border-[#3E8E41]/50 bg-[#3E8E41]/15 hover:bg-[#3E8E41]/25 text-[#3E8E41] font-mono text-xs font-semibold transition-colors"
          >
            Heal
          </button>

          {/* Client Write */}
          <button
            type="button"
            onClick={handleClientWrite}
            aria-label="Send client write to current leader"
            className="px-2.5 py-1.5 rounded border border-[#F28C28]/50 bg-[#F28C28]/15 hover:bg-[#F28C28]/25 text-[#F28C28] font-mono text-xs font-semibold transition-colors"
          >
            Client write
          </button>

          {/* Settle */}
          <button
            type="button"
            disabled={isSettling}
            onClick={handleSettle}
            aria-label="Trigger deterministic settle reaction"
            className={`px-2.5 py-1.5 rounded border font-mono text-xs font-bold transition-all ${
              isSettling
                ? "border-mist/30 bg-ink-2 text-mist cursor-not-allowed"
                : "border-[#D4B15F] bg-[#D4B15F] text-void shadow-[0_0_12px_rgba(212,177,95,0.3)] hover:bg-[#D4B15F]/90"
            }`}
          >
            {isSettling ? "Settling..." : "Settle"}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset sandbox to initial state"
            className="px-2.5 py-1.5 rounded border border-line bg-ink-2 text-mist hover:text-feather font-mono text-xs transition-colors col-span-2 sm:col-span-1"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Labelled Plain-Text Event Log */}
      <div className="space-y-2 border-t border-line/40 pt-4">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-feather uppercase tracking-wider font-semibold">
            [EVENT LOG &bull; SCREEN READER ACCESSIBLE]
          </span>
          <span className="text-mist text-[10px]">
            {eventHistory.length} event(s) recorded
          </span>
        </div>

        <div
          role="region"
          aria-live="polite"
          aria-label="Cluster Event Stream"
          className="max-h-48 overflow-y-auto rounded border border-line/60 bg-ink-2/80 p-3 font-mono text-[11px] space-y-1.5"
        >
          {eventHistory.length === 0 ? (
            <div className="text-mist/50 italic">No events yet. Click a control or Settle.</div>
          ) : (
            <ol className="list-decimal list-inside space-y-1">
              {eventHistory.map((ev, idx) => (
                <li
                  key={idx}
                  className={`leading-relaxed ${
                    ev.success ? "text-feather" : "text-amber-400/80"
                  }`}
                >
                  <span className="font-bold text-[#F28C28]">[{ev.event.toUpperCase()}]</span>{" "}
                  <span>{ev.description}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
