import fs from 'node:fs';
import readline from 'node:readline';

const transcriptPath = 'C:\\Users\\SUMIT\\.gemini\\antigravity\\brain\\4fc2fd17-5961-4819-a66a-e8134ddf3117\\.system_generated\\logs\\transcript.jsonl';
const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

const steps = [];

for await (const line of rl) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index >= 1069) {
      steps.push(obj);
    }
  } catch {
  }
}

console.log(`Found ${steps.length} steps from step 1069 onwards.`);
for (const step of steps) {
  console.log(`Step ${step.step_index}: source=${step.source}, type=${step.type}`);
  if (step.tool_calls) {
    for (const tc of step.tool_calls) {
      console.log(`  tool: ${tc.name}`, tc.args ? JSON.stringify(tc.args).slice(0, 150) : '');
    }
  }
}

