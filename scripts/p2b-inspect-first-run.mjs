import fs from 'node:fs';
import readline from 'node:readline';

const transcriptPath = 'C:\\Users\\SUMIT\\.gemini\\antigravity\\brain\\4fc2fd17-5961-4819-a66a-e8134ddf3117\\.system_generated\\logs\\transcript.jsonl';
const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

for await (const line of rl) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index >= 1170 && obj.step_index <= 1220) {
      console.log(`\n--- Step ${obj.step_index} (${obj.source} - ${obj.type}) ---`);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          console.log(`TOOL: ${tc.name}`, JSON.stringify(tc.args).slice(0, 300));
        }
      }
      if (obj.content) {
        console.log(`CONTENT:`, typeof obj.content === 'string' ? obj.content.slice(0, 600) : JSON.stringify(obj.content).slice(0, 600));
      }
    }
  } catch {
  }
}

