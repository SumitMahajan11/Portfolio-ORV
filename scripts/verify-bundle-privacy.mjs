import fs from "fs";
import path from "path";

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      walk(full, fileList);
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

// Strict email regex matching genuine email address strings
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const dirs = [path.join(".next", "static"), path.join(".next", "server", "app")];

const hits = [];

for (const dir of dirs) {
  const files = walk(dir);
  for (const file of files) {
    // Only search JS, HTML, JSON, and text bundles
    if (!file.match(/\.(js|html|json|txt|rsc)$/)) continue;
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(emailRegex) || [];
    for (const match of matches) {
      // Filter out package names like react@19, @next/swc, webpack hashes, etc.
      if (
        !match.match(/@\d+\.\d+/) &&
        !match.includes("example.com") &&
        !match.includes("domain.com") &&
        !match.includes("resend.dev") &&
        !match.endsWith(".js") &&
        !match.endsWith(".css") &&
        !match.endsWith(".map")
      ) {
        hits.push({ file, match });
      }
    }
  }
}

console.log(`Bundle Privacy Audit: ${hits.length} email hits detected.`);
if (hits.length > 0) {
  console.log("Hits found:", hits);
  process.exit(1);
} else {
  console.log("PASS: No personal or recipient email addresses leaked in client bundles or server page outputs.");
}
