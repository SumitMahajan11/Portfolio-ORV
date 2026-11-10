import fs from 'node:fs';
import readline from 'node:readline';

const transcriptPath = 'C:\\Users\\SUMIT\\.gemini\\antigravity\\brain\\4fc2fd17-5961-4819-a66a-e8134ddf3117\\.system_generated\\logs\\transcript.jsonl';
const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

const relevantSteps = [];

for await (const line of rl) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index >= 1069) {
      const str = JSON.stringify(obj);
      if (str.includes('wall-particles') || str.includes('verify-particles')) {
        relevantSteps.push(obj);
      }
    }
  } catch {
  }
}

console.log(`Found ${relevantSteps.length} relevant steps.`);
for (const step of relevantSteps) {
  console.log(`\n=== STEP ${step.step_index} (${step.source} - ${step.type}) ===`);
  if (step.tool_calls) {
    for (const tc of step.tool_calls) {
      console.log(`TOOL CALL: ${tc.name}`);
      console.log('ARGS:', JSON.stringify(tc.args, null, 2).slice(0, 1000));
    }
  }
  if (step.content) {
    console.log('CONTENT PREVIEW:', typeof step.content === 'string' ? step.content.slice(0, 500) : JSON.stringify(step.content).slice(0, 500));
  }
}

