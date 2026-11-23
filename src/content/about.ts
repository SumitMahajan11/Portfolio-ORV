import type { AboutSection } from "./types";

export const about: AboutSection = {
  title: "Chapter 0: The Protagonist's Origin",
  paragraphs: [
    "I am a third-year computer science undergraduate at Pimpri Chinchwad University in Pune, graduating in March 2028. My focus is centered on systems engineering, distributed infrastructure, and understanding how complex systems behave under fault conditions.",
    "That pursuit led me toward formal verification and distributed consensus: implementing Ratify (a from-scratch Rust implementation of the Raft consensus algorithm verified with TLA+) and developing iac-verifier (leveraging Microsoft Z3 to construct reachability proofs and automated repairs for Terraform IAM and network policies).",
    "Looking forward, I am targeting GSoC 2027 with CNCF projects while deepening my work in open-source systems. I am looking for software engineering internships and collaborative opportunities where distributed reliability and formal correctness are taken seriously.",
  ],
};
