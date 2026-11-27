/**
 * Copy for the /wanted bounty-board page.
 * Facts reuse identity.ts and the hero tagline only. Anything not yet written
 * in the Content Bible stays null and renders as a dev-only [FILL] badge.
 */
export interface WantedContent {
  headline: string;
  reason: string;
  proofChips: readonly string[];
  bounty: string | null;
}

export const wanted: WantedContent = {
  headline: "WANTED",
  reason: "For building systems and showing the proof.",
  proofChips: ["From-scratch Rust Raft", "Z3 Reachability Proofs", "Carbon-Aware Routing"],
  bounty: null, // [FILL] bounty line is not in the Content Bible yet
};
