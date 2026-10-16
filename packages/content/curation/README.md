# Content curation (v2)

Turns the v1 starter workbook into the curated v2 workbook: a smaller, better-known pool with
clues that say more.

```bash
python3 build_workbook.py ../source/Foodle_Starter_Repository.xlsx ../source/Foodle_Repository_v2.xlsx
```

| File | What it holds |
| --- | --- |
| `recognition.py` | Editorial recognition score (1-5) per item, for each edition's audience |
| `duplicates.py` | Near-duplicates (hand-picked); `NOT_DUP` overrides the automatic overlap check |
| `pantry.py` | Pantry staples that are never clues, the common list, and the note shown to players |
| `assemble.py` | Builds each item's six clues: pantry out, authored clues in, giveaways last |
| `authored/*.txt` | Authored clues and final hints, `ID|clue; clue|final hint`; `99_fixes.txt` adds to and overrides them |
| `build_workbook.py` | Scores everything, writes the v2 workbook with live scoring formulas |

Scoring (weights are editable on the workbook's Scoring sheet): recognition x 1.3 (max 6.5),
distinctiveness 2, fit for clue play 0.5, clue strength 1. Items scoring 6.5 or more are kept.
