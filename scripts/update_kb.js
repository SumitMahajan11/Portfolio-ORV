const fs = require('fs');
const kb = JSON.parse(fs.readFileSync('./src/content/biyoo-kb.json', 'utf8'));

const candidateParaphrases = [
  { q: "Who is the portfolio author?", kw: "who is the portfolio author?", id: "who-is-sumit" },
  { q: "Tell me about the creator of this site", kw: "tell me about the creator of this site", id: "who-is-sumit" },
  { q: "Which university in Pune does Sumit attend?", kw: "which university in pune does sumit attend?", id: "current-status" },
  { q: "What year of college is he currently in?", kw: "what year of college is he currently in?", id: "current-status" },
  { q: "How does the carbon aware workload routing work?", kw: "how does the carbon aware workload routing work?", id: "edge-cloud" },
  { q: "What is the edge cloud orchestrator project?", kw: "what is the edge cloud orchestrator project?", id: "edge-cloud" },
  { q: "What consensus protocol does Ratify implement?", kw: "what consensus protocol does ratify implement?", id: "ratify-raft" },
  { q: "Tell me about the Raft implementation in Rust", kw: "tell me about the raft implementation in rust", id: "ratify-raft" },
  { q: "How does the Z3 formal verification work?", kw: "how does the z3 formal verification work?", id: "iac-verifier-z3" },
  { q: "Tell me about the Terraform IAM verifier", kw: "tell me about the terraform iam verifier", id: "iac-verifier-z3" },
  { q: "Where can I see the proof certificates?", kw: "where can i see the proof certificates?", id: "strongest-evidence" },
  { q: "How are the test suites verified on this site?", kw: "how are the test suites verified on this site?", id: "strongest-evidence" },
  { q: "What are Sumit's core technical skills?", kw: "what are sumit's core technical skills?", id: "tech-focus" },
  { q: "What tech stack does he specialize in?", kw: "what tech stack does he specialize in?", id: "tech-focus" },
  { q: "How do I get in touch with Sumit?", kw: "how do i get in touch with sumit?", id: "contact" },
  { q: "Where is the form to message him?", kw: "where is the form to message him?", id: "contact" },
  { q: "Which organizations is he targeting for GSoC 2027?", kw: "which organizations is he targeting for gsoc 2027?", id: "goals-gsoc" },
  { q: "What kind of open source work is he seeking?", kw: "what kind of open source work is he seeking?", id: "goals-gsoc" },
  { q: "What is Biyoo's role in this archive?", kw: "what is biyoo's role in this archive?", id: "biyoo-mascot" },
  { q: "Who is the dokkaebi mascot accompanying the reader?", kw: "who is the dokkaebi mascot accompanying the reader?", id: "biyoo-mascot" },
];

for (const c of candidateParaphrases) {
  const e = kb.find(entry => entry.id === c.id);
  if (!e.keywords.includes(c.kw)) {
    e.keywords.push(c.kw);
  }
}

fs.writeFileSync('./src/content/biyoo-kb.json', JSON.stringify(kb, null, 2), 'utf8');
console.log("Updated biyoo-kb.json successfully!");

