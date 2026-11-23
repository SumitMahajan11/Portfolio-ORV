import json

fpath = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e\.system_generated\logs\transcript_full.jsonl"
with open(fpath, "r", encoding="utf-8") as f:
    for line in f:
        d = json.loads(line)
        if d.get("step_index") in [3020, 3024, 3025, 3026]:
            print(f"Step {d.get('step_index')}: {d.get('created_at')}")
