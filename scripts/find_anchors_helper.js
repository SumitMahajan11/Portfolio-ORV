const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== '.next') files.push(...walk(full));
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const targets = ['edge-cloud', 'ratify', 'iac-verifier', 'readers-record', 'scenario-select'];
for (const file of walk('src')) {
  const content = fs.readFileSync(file, 'utf8');
  for (const t of targets) {
    if (content.includes(`id="${t}"`) || content.includes(`id='${t}'`) || content.includes(`id={\`${t}\`}`)) {
      console.log(`Found id "${t}" in ${file}`);
    }
    if (content.includes(`href="#${t}"`) || content.includes(`href='#${t}'`)) {
      console.log(`Found href "#${t}" in ${file}`);
    }
  }
}

