import csv
import json
import os

SRC = "source/harmony.csv"
OUT = "public/data/harmony.json"

def parse_refs(book, value):
    value = str(value or "").strip()
    if not value:
        return []
    refs = []
    current_ch = None
    for piece in [p.strip() for p in value.split(",") if p.strip()]:
        if ":" in piece:
            ch, verse_part = piece.split(":", 1)
            current_ch = int(ch)
        else:
            verse_part = piece
        if "-" in verse_part:
            start, end = verse_part.split("-", 1)
            if ":" in end:
                end_ch, end_v = end.split(":", 1)
                refs.append((book, current_ch, int(start), int(end_ch), int(end_v)))
            else:
                refs.append((book, current_ch, int(start), current_ch, int(end)))
        else:
            v = int(verse_part)
            refs.append((book, current_ch, v, current_ch, v))
    return refs

pericopes = []
passages = []

with open(SRC, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        pericopes.append({
            "pericopeId": row["pericopeId"],
            "title": row["title"],
            "summary": row["summary"],
            "tags": row["tags"].split("|") if row["tags"] else [],
            "sortOrder": int(row["sortOrder"]) if row["sortOrder"] else 999999,
        })
        for book in ["Matthew", "Mark", "Luke", "John"]:
            for b, sc, sv, ec, ev in parse_refs(book, row.get(book, "")):
                passages.append({
                    "pericopeId": row["pericopeId"],
                    "book": b,
                    "startChapter": sc,
                    "startVerse": sv,
                    "endChapter": ec,
                    "endVerse": ev,
                })

os.makedirs("public/data", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"pericopes": pericopes, "passages": passages}, f, indent=2)

print(f"Wrote {len(pericopes)} pericopes and {len(passages)} passages to {OUT}")
