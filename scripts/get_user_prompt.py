import json

fpath = r"C:\Users\SUMIT\.gemini\antigravity\brain\0f91a232-b6bc-421c-bf43-b43a4359eb3e\.system_generated\logs\transcript_full.jsonl"
with open(fpath, "r", encoding="utf-8") as f:
    lines = f.readlines()

for line in reversed(lines):
    data = json.loads(line)
    if "USER" in data.get("source", ""):
        print("=== USER PROMPT FOUND ===")
        print(data.get("content"))
        break
