import fs from 'fs';
import path from 'path';

const kbPath = path.resolve('src/content/biyoo-kb.json');
let kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));

for (const entry of kb) {
  if (entry.id === 'iac-verifier-z3') {
    entry.answer = "iac-verifier performs Z3-based reachability analysis on Terraform IAM and network security graphs with an auto-repair engine. With 276 tests passing in the recorded run on 2026-11-08, it detected a multi-hop privilege escalation path through chained IAM roles.";
    entry.questions.push(
      "What security properties does the Terraform analyzer check?",
      "How does the automated reachability engine verify infrastructure?",
      "What did the recorded SMT verification run demonstrate?",
      "How does the terraform checker find privilege escalation?",
      "How many tests verify the z3 reachability tool?"
    );
    entry.keywords.push("analyzer", "checker", "terraform checker", "privilege escalation", "z3 project", "invariants", "smt solver", "terraform");
  } else if (entry.id === 'who-is-sumit') {
    entry.questions.push(
      "What is Sumit's technical background and profile?",
      "Can you give an overview of the author?",
      "What is the background of the creator?"
    );
    entry.keywords.push("background", "profile", "bio", "overview", "sumit background");
  } else if (entry.id === 'current-status') {
    entry.questions.push(
      "What is his university enrollment and study status?",
      "Is he currently a university student or employed in industry?",
      "Which engineering institute in Pune does he attend?",
      "Which college or university campus does he go to?"
    );
    entry.keywords.push("enrollment", "institution", "undergraduate", "employed", "student or working", "studies", "college");
  } else if (entry.id === 'edge-cloud') {
    entry.questions.push(
      "How does the carbon intensity workload scheduler operate?",
      "Give an explanation of the edge cloud routing model",
      "Explain the edge cloud orchestrator system"
    );
    entry.keywords.push("emissions", "carbon", "scheduler", "workload", "routing", "green", "carbon emissions", "edge cloud");
  } else if (entry.id === 'ratify-raft') {
    entry.questions.push(
      "Did he implement the Raft consensus protocol in Rust?",
      "How was the consensus implementation model checked?",
      "Has he built a raft consensus engine?"
    );
    entry.keywords.push("consensus", "model checking", "model checked", "protocol", "linearizability", "raft consensus", "built raft");
  } else if (entry.id === 'strongest-evidence') {
    entry.questions.push(
      "What test artifacts and proofs substantiate the claims?",
      "Where can an evaluator verify the project receipts?",
      "How can an engineer verify his technical claims?",
      "What evidence proves these projects actually work?"
    );
    entry.keywords.push("claims", "receipts", "validation", "verification", "reproduce", "verify claims", "proves projects");
  } else if (entry.id === 'tech-focus') {
    entry.questions.push(
      "Which programming languages and systems tools does he specialize in?",
      "What technical skills define his engineering focus?",
      "What languages does he write code in?",
      "What areas is he technically proficient in?"
    );
    entry.keywords.push("languages", "skills", "capabilities", "specialization", "tools", "technically", "code languages", "technically good");
  } else if (entry.id === 'contact') {
    entry.questions.push(
      "Where can an engineer send an inquiry or message?",
      "What email or correspondence options are available?",
      "How do I send him an email or message?"
    );
    entry.keywords.push("inquiry", "reach out", "email address", "send message", "message him", "email");
  } else if (entry.id === 'goals-gsoc') {
    entry.questions.push(
      "What open source programs or mentorships is he pursuing next?",
      "What are his upcoming open source aspirations?",
      "What programs is he applying for next year?"
    );
    entry.keywords.push("mentorship", "programs", "applying", "aspirations", "future plans", "mentorship programs", "next year");
  } else if (entry.id === 'biyoo-mascot') {
    entry.questions.push(
      "What is this small fluffy companion creature?",
      "Why is there a mascot guiding this portfolio?",
      "Who are you and what do you do?"
    );
    entry.keywords.push("fluffy", "creature", "companion", "guide", "mascot", "fluffy creature");
  }
}

fs.writeFileSync(kbPath, JSON.stringify(kb, null, 2) + '\n', 'utf-8');
console.log("Updated biyoo-kb.json successfully.");

