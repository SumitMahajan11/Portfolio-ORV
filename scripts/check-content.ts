import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Define local interfaces for type safety
interface Claim {
  text: string;
  evidence: 'verified' | 'unverified';
  source: string | null;
}

interface ProjectLinks {
  repo: string | null;
  demo: string | null;
  benchmark: string | null;
}

interface Project {
  id: string;
  title: string;
  status: 'flagship' | 'sidequest';
  world: string;
  oneLiner: string | null;
  claims: Claim[];
  limits: string[];
  links: ProjectLinks;
  costume: string;
  worldReady?: boolean;
  published: boolean;
}

interface Skill {
  name: string;
  story: string | null;
  proofProjectIds: string[];
}

interface ConstellationLine {
  id: number;
  text: string;
  context: string;
}

interface Identity {
  name: string;
  github: string;
  degree: string;
  institution: string;
  city: string;
  graduation: string;
  cgpa: number | null;
  targeting: string;
  contact: {
    formAvailable: boolean;
    github: string;
    linkedin: string | null;
    resumePdf: string | null;
  };
}

interface AboutSection {
  title: string;
  paragraphs: (string | null)[];
}

const isStrict = process.argv.includes("--strict");

// Known baseline flagships awaiting Sumit's personal public repo links (Task P6-1)
// Any NEW flagship added to the project must have a valid non-null repo URL immediately.
const BASELINE_FLAGSHIP_IDS = new Set(["edge-cloud", "ratify", "iac-verifier"]);

// Dynamic TS module loader using TypeScript compiler API
function loadTsModule<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const mod = { exports: {} as unknown };
  const customRequire = (reqPath: string) => {
    if (reqPath.startsWith(".")) {
      const resolved = path.resolve(
        path.dirname(filePath),
        reqPath.endsWith(".ts") ? reqPath : `${reqPath}.ts`
      );
      return loadTsModule(resolved);
    }
    return require(reqPath);
  };

  const fn = new Function("require", "exports", "module", transpiled);
  fn(customRequire, mod.exports, mod);
  return mod.exports as T;
}

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "src", "content");

// 1. Load typed data
const { identity } = loadTsModule<{ identity: Identity }>(path.join(contentDir, "identity.ts"));
const { projects } = loadTsModule<{ projects: Project[] }>(path.join(contentDir, "projects.ts"));
const { skills } = loadTsModule<{ skills: Skill[] }>(path.join(contentDir, "skills.ts"));
const { constellationLines } = loadTsModule<{ constellationLines: ConstellationLine[] }>(path.join(contentDir, "lines.ts"));
const { about } = loadTsModule<{ about: AboutSection }>(path.join(contentDir, "about.ts"));

console.log("=================================================");
console.log("     CONTENT LAYER CHECKER (03-CONTENT-BIBLE)    ");
console.log(` Mode: ${isStrict ? "STRICT (Zero Tolerance)" : "WARN (Development)"}`);
console.log("=================================================\n");

const warnings: string[] = [];
const fatalErrors: string[] = [];

// 2. Check null fields & unverified items in Identity
console.log("--- 1. Checking Identity ---");
if (identity.cgpa === null) {
  warnings.push("[identity] 'cgpa' is null (pending verification against longer resume)");
}
if (identity.contact.linkedin === null) {
  warnings.push("[identity] 'contact.linkedin' is null [FILL]");
}
if (identity.contact.resumePdf === null) {
  warnings.push("[identity] 'contact.resumePdf' is null [FILL]");
}

// 3. Check Projects
console.log("--- 2. Checking Projects ---");
const projectIds = new Set(projects.map((p) => p.id));

for (const project of projects) {
  const isFlagship = project.status === "flagship";

  if (project.oneLiner === null) {
    warnings.push(`[project:${project.id}] 'oneLiner' is null`);
  }

  // Flagship repository check
  if (isFlagship) {
    const isBaseline = BASELINE_FLAGSHIP_IDS.has(project.id);
    const hasNullRepo = project.links.repo === null || project.links.repo.includes("[FILL]");

    if (hasNullRepo) {
      if (!isBaseline || isStrict) {
        fatalErrors.push(`Flagship project '${project.id}' must have a valid non-null repository link.`);
      } else {
        warnings.push(`[project:${project.id}] 'links.repo' is null [FILL] (pending author URL)`);
      }
    }
  } else if (project.links.repo === null) {
    warnings.push(`[project:${project.id}] 'links.repo' is null [FILL]`);
  }

  if (project.links.demo === null) {
    warnings.push(`[project:${project.id}] 'links.demo' is null [FILL]`);
  }

  // Evidence rule enforcement on claims
  for (const claim of project.claims) {
    // 1. Every claim must have a valid non-empty source
    if (!claim.source || claim.source.trim().length === 0 || claim.source.includes("[FILL]")) {
      fatalErrors.push(`Project '${project.id}' claim "${claim.text}" has no verified source. Every claim must specify a source from docs/03-CONTENT-BIBLE.md or README.`);
    }

    // 2. Unverified claims are strictly forbidden
    if (claim.evidence === "unverified") {
      fatalErrors.push(`Project '${project.id}' contains unverified claim: "${claim.text}". Only verified claims may be published.`);
    }
  }

  // Projects with claims must document technical limitations
  if (project.claims.length > 0 && (!project.limits || project.limits.length === 0)) {
    warnings.push(`[project:${project.id}] Has claims but no limits line. Every project with claims should document engineering boundaries.`);
  }
}

// 4. Check Skills
console.log("--- 3. Checking Skills (Reader's Record) ---");
const BANNED_SKILL_PATTERNS = [
  { pattern: /%/, name: "% rating" },
  { pattern: /\blevel\b/i, name: "level" },
  { pattern: /\bexpert\b/i, name: "expert" },
  { pattern: /\badvanced\b/i, name: "advanced" },
  { pattern: /\bbeginner\b/i, name: "beginner" },
  { pattern: /\bmaster\b/i, name: "master" },
  { pattern: /\bninja\b/i, name: "ninja" },
  { pattern: /\bguru\b/i, name: "guru" },
  { pattern: /\brockstar\b/i, name: "rockstar" },
  { pattern: /\bworld-class\b/i, name: "world-class" },
  { pattern: /\bpassionate\b/i, name: "passionate" },
  { pattern: /\bcutting-edge\b/i, name: "cutting-edge" },
];

for (const skill of skills) {
  if (skill.story === null) {
    warnings.push(`[skill:${skill.name}] 'story' is null (needs confirmation)`);
  }

  // Check for prohibited grading or hype terms
  const fullSkillText = `${skill.name} ${skill.story ?? ""}`;
  for (const { pattern, name } of BANNED_SKILL_PATTERNS) {
    if (pattern.test(fullSkillText)) {
      fatalErrors.push(`Skill '${skill.name}' violates content bible rules by including prohibited grading/hype term '${name}'.`);
    }
  }

  if (!skill.proofProjectIds || skill.proofProjectIds.length === 0) {
    fatalErrors.push(`Skill '${skill.name}' has 0 proofProjectIds (skills without proof are not permitted).`);
  } else {
    for (const pid of skill.proofProjectIds) {
      if (!projectIds.has(pid)) {
        fatalErrors.push(`Skill '${skill.name}' references non-existent project id '${pid}'.`);
      }
    }
  }
}

// 5. Check Constellation Lines
console.log("--- 4. Checking Constellation Lines ---");
if (constellationLines.length !== 40) {
  warnings.push(`Expected 40 Constellation lines, found ${constellationLines.length}.`);
  fatalErrors.push(`Expected exactly 40 Constellation lines, got ${constellationLines.length}.`);
}

// 6. Check About section
console.log("--- 5. Checking About (Chapter 0) ---");
about.paragraphs.forEach((p, idx) => {
  if (p === null) {
    warnings.push(`[about] Paragraph #${idx + 1} is null [FILL]`);
  }
});

// 7. Banned phrases check across all files in src/content
console.log("--- 6. Scanning for Banned Phrases (/docs/03) ---");
const BANNED_PATTERNS = [
  { pattern: /\bworld-class\b/i, name: "world-class" },
  { pattern: /\bexpert\b/i, name: "expert" },
  { pattern: /\bpassionate\b/i, name: "passionate" },
  { pattern: /\bcutting-edge\b/i, name: "cutting-edge" },
  { pattern: /\b\d+%\b/, name: "percentage skill rating" },
];

const contentFiles = fs.readdirSync(contentDir).filter((f) => f.endsWith(".ts"));
for (const file of contentFiles) {
  const filePath = path.join(contentDir, file);
  const text = fs.readFileSync(filePath, "utf8");

  for (const { pattern, name } of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      fatalErrors.push(`Banned phrase '${name}' detected in file: src/content/${file}`);
    }
  }
}

// 8. Output Report
console.log("\n=================================================");
console.log(` TOTAL WARNINGS (Null / Fill / Unconfirmed): ${warnings.length}`);
console.log(` TOTAL FATAL ERRORS: ${fatalErrors.length}`);
console.log("=================================================");
warnings.forEach((w) => console.log(`  ⚠ ${w}`));

if (fatalErrors.length > 0) {
  console.log("\n=================================================");
  console.log(" CONTENT AUDIT FAILURES");
  console.log("=================================================");
  fatalErrors.forEach((err) => console.log(`  ✖ [FATAL ERROR] ${err}`));
  console.log(`\nResult: FAILED (${fatalErrors.length} fatal error(s) detected).`);
  process.exit(1);
} else {
  console.log("\nResult: PASSED (all content rules verified).");
  process.exit(0);
}
