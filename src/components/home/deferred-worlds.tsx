"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamic import for heavy worlds below the fold (P5-5 performance optimization)
const EdgeCloudWorld = dynamic(
  () => import("@/components/worlds/edge-cloud").then((m) => m.EdgeCloudWorld),
  { ssr: false }
);

const RaftWorld = dynamic(
  () => import("@/components/worlds/raft").then((m) => m.RaftWorld),
  { ssr: false }
);

const Z3World = dynamic(
  () => import("@/components/worlds/z3").then((m) => m.Z3World),
  { ssr: false }
);

const SideQuestsSection = dynamic(
  () => import("@/components/side-quests").then((m) => m.SideQuestsSection),
  { ssr: false }
);

const ReadersRecord = dynamic(
  () => import("@/components/readers-record").then((m) => m.ReadersRecord),
  { ssr: false }
);

const FinaleSection = dynamic(
  () => import("@/components/finale").then((m) => m.FinaleSection),
  { ssr: false }
);

export function DeferredWorlds() {
  return (
    <>
      {/* Act 3 Flagship World: Edge-Cloud Orchestrator */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1px 800px" }}>
        <EdgeCloudWorld />
      </div>

      {/* Act 3 Flagship World: Ratify (Raft) */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1px 800px" }}>
        <RaftWorld />
      </div>

      {/* Act 3 Flagship World: iac-verifier (Z3) */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1px 800px" }}>
        <Z3World />
      </div>

      {/* Act 3 Side Quests Section */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1px 800px" }}>
        <SideQuestsSection />
      </div>

      {/* Act 3 Reader's Record (Skills as ORV Item Info Boxes) */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1px 800px" }}>
        <ReadersRecord />
      </div>

      {/* Act 6 Finale & Contact Form Scene */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1px 800px" }}>
        <FinaleSection />
      </div>
    </>
  );
}

