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
const strictViolations: string[] = [];

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

  if (project.links.repo === null) {
    const msg = `[project:${project.id}] 'links.repo' is null [FILL]`;
    warnings.push(msg);
    if (isFlagship) {
      strictViolations.push(`Flagship project '${project.id}' has a null repo link.`);
    }
  }

  if (project.links.demo === null) {
    warnings.push(`[project:${project.id}] 'links.demo' is null [FILL]`);
  }

  for (const claim of project.claims) {
    if (claim.evidence === "unverified") {
      const msg = `[project:${project.id}] Unverified claim: "${claim.text}"`;
      warnings.push(msg);
      strictViolations.push(`Unverified claim found in '${project.id}': "${claim.text}"`);
    }
  }
}

// 4. Check Skills
console.log("--- 3. Checking Skills (Reader's Record) ---");
for (const skill of skills) {
  if (skill.story === null) {
    warnings.push(`[skill:${skill.name}] 'story' is null (needs confirmation)`);
  }

  if (!skill.proofProjectIds || skill.proofProjectIds.length === 0) {
    const err = `Skill '${skill.name}' has 0 proofProjectIds (skills without proof are not permitted).`;
    warnings.push(`[skill:${skill.name}] 0 proof projects.`);
    strictViolations.push(err);
  } else {
    for (const pid of skill.proofProjectIds) {
      if (!projectIds.has(pid)) {
        strictViolations.push(`Skill '${skill.name}' references non-existent project id '${pid}'.`);
      }
    }
  }
}

// 5. Check Constellation Lines
console.log("--- 4. Checking Constellation Lines ---");
if (constellationLines.length !== 40) {
  warnings.push(`Expected 40 Constellation lines, found ${constellationLines.length}.`);
  strictViolations.push(`Expected exactly 40 Constellation lines, got ${constellationLines.length}.`);
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
      const err = `Banned phrase '${name}' detected in file: src/content/${file}`;
      strictViolations.push(err);
    }
  }
}

// 8. Output Report
console.log("\n=================================================");
console.log(` TOTAL WARNINGS (Null / Fill / Unconfirmed): ${warnings.length}`);
console.log("=================================================");
warnings.forEach((w) => console.log(`  ⚠ ${w}`));

if (isStrict) {
  console.log("\n=================================================");
  console.log(` STRICT MODE VIOLATIONS: ${strictViolations.length}`);
  console.log("=================================================");
  if (strictViolations.length > 0) {
    strictViolations.forEach((v) => console.log(`  ✖ [STRICT ERROR] ${v}`));
    console.log("\nResult: FAILED (strict mode rejects unverified/null flagship data).");
    process.exit(1);
  } else {
    console.log("\nResult: PASSED (strict mode clean).");
    process.exit(0);
  }
} else {
  console.log("\nResult: PASSED (warn mode exits 0).");
  process.exit(0);
}
