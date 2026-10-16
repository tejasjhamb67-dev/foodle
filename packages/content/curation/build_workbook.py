"""Builds Foodle_Repository_v2.xlsx: the curated, re-clued content repository.

Usage: python3 build_workbook.py <source workbook> <output path>

Pipeline
1. Score every item in the source workbook (scoring.py rules; weights live on the Scoring sheet).
2. Keep items at or above the threshold.
3. Rebuild each kept item's clues: pantry staples removed, authored clues added (authored/*.txt),
   six clues ordered from least to most telling, plus a final hint.
"""
import collections
import datetime
import json
import sys
from pathlib import Path

import openpyxl
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from assemble import MAX_CLUES, build_clues, load_authored  # noqa: E402
from duplicates import MANUAL, NOT_DUP  # noqa: E402
from pantry import COMMON, PANTRY, PANTRY_NOTE, in_name  # noqa: E402
from recognition import recognition  # noqa: E402

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
DATA = HERE.parent / "data"

# ---------------------------------------------------------------- scoring inputs
W_RECOG, W_DISTINCT, W_FIT, W_CLUES, THRESHOLD = 1.3, 2.0, 0.5, 1.0, 6.5
SINGLE_TYPES = {"Spirit", "Wine", "Beer"}
PLAIN_TEA = {"B0154", "B0155", "B0156", "B0157", "B0158", "B0159"}

items = json.load(open(DATA / "items.json"))
countries = json.load(open(DATA / "countries.json"))
images = json.load(open(DATA / "images.json"))
by_id = {i["id"]: i for i in items}
authored = load_authored()

src = openpyxl.load_workbook(SRC)


def telling(it):
    """Clues left once the pantry is removed (what the source data gives players)."""
    return [c for c in it["clues"] if c.lower() not in PANTRY or in_name(c, it["name"])]


R = {it["id"]: recognition(it["id"], it["fame"], it["country"]) for it in items}

# automatic near-duplicates: same kind and country, >= 60% overlap of telling clues
auto_dup = {}
groups = collections.defaultdict(list)
for it in items:
    groups[(it["kind"], it["country"])].append(it)
for grp in groups.values():
    for i, a in enumerate(grp):
        for b in grp[i + 1:]:
            A = {c.lower() for c in telling(a)}
            B = {c.lower() for c in telling(b)}
            if len(A) >= 3 and len(B) >= 3 and len(A & B) / len(A | B) >= 0.6:
                lo, hi = (a, b) if (R[a["id"]], -a["fame"]) < (R[b["id"]], -b["fame"]) else (b, a)
                if lo["id"] not in NOT_DUP:
                    auto_dup.setdefault(lo["id"], f"{lo['name']} overlaps {hi['name']}")
DUP = {**auto_dup, **MANUAL}


def clue_pts(n):
    return 1 if n >= 5 else 0.75 if n == 4 else 0.5 if n == 3 else 0.25 if n == 2 else 0


rows = []
for it in items:
    n = len(telling(it))
    single = it.get("type") in SINGLE_TYPES or it["id"] in PLAIN_TEA
    dup = it["id"] in DUP
    score = R[it["id"]] * W_RECOG + (0 if dup else W_DISTINCT) + (0 if single else W_FIT) + clue_pts(n) * W_CLUES
    keep = score >= THRESHOLD - 1e-9
    if keep:
        why = "Kept"
    elif dup:
        why = f"Near-duplicate: {DUP[it['id']]}"
    elif R[it["id"]] <= 2:
        why = "Niche: few players would know it"
    elif single:
        why = "Single-ingredient product with few telling clues"
    else:
        why = f"Too few telling clues once pantry is removed ({n})"
    rows.append(dict(it=it, n=n, single=single, dup=dup, score=round(score, 2), keep=keep, why=why))

kept = [r for r in rows if r["keep"]]
removed = [r for r in rows if not r["keep"]]
assert {r["it"]["id"] for r in kept} == set(authored), "authored clues must cover exactly the kept items"

# ---------------------------------------------------------------- styles (match source workbook)
FONT = "Arial"
HEAD_FILL = PatternFill("solid", fgColor="1F3864")
HEAD_FONT = Font(name=FONT, bold=True, color="FFFFFF", size=10)
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")
NOTE_FILL = PatternFill("solid", fgColor="F2F2F2")
KEEP_FILL = PatternFill("solid", fgColor="E2EFDA")
DROP_FILL = PatternFill("solid", fgColor="FCE4D6")
BODY = Font(name=FONT, size=10)
BLUE = Font(name=FONT, size=10, color="0000FF")
GREEN = Font(name=FONT, size=10, color="008000")
BOLD = Font(name=FONT, size=10, bold=True)
TITLE = Font(name=FONT, size=16, bold=True, color="1F3864")
H2 = Font(name=FONT, size=12, bold=True, color="1F3864")
WRAP = Alignment(wrap_text=True, vertical="top")
thin = Side(style="thin", color="D9D9D9")
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)

wb = openpyxl.Workbook()
wb.remove(wb.active)


def table(ws, headers, data, widths=None, start_row=1, freeze="B2"):
    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=start_row, column=c, value=h)
        cell.fill, cell.font = HEAD_FILL, HEAD_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center")
    for r, row in enumerate(data, start_row + 1):
        for c, v in enumerate(row, 1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = BODY
    ws.row_dimensions[start_row].height = 30
    if freeze:
        ws.freeze_panes = freeze
    ws.auto_filter.ref = f"A{start_row}:{get_column_letter(len(headers))}{start_row + len(data)}"
    for i, w in enumerate(widths or [], 1):
        ws.column_dimensions[get_column_letter(i)].width = w


# ================================================================ README
ws = wb.create_sheet("README")
ws.column_dimensions["A"].width = 30
ws.column_dimensions["B"].width = 110
lines = [
    ("Foodle - curated content repository (v2)", None, TITLE),
    ("Prepared", datetime.date(2026, 10, 16).strftime("%d %B %Y"), None),
    ("Built from", "Foodle_Starter_Repository.xlsx (v1, 15 October 2026, 1,158 dishes and drinks)", None),
    ("Status", "Draft. Rows still need an editorial fact check before launch. Clues and hints marked as authored in v2 were written for this version.", None),
    (None, None, None),
    ("What changed and why", None, H2),
    ("1. Smaller, better-known pool", "Every dish and drink was scored 0-10 (see Scoring). Items below 6.5 were removed: niche items, near-duplicates and products that can't be clued well. 747 of 1,158 items stay (65%). Removed items and the reason for each are on the Removed sheet.", None),
    ("2. Clues that say more", "Basic pantry ingredients (salt, oil, ghee, onion, garlic and so on) are no longer clues. Each item now has six clues running from least to most telling, mixing specific ingredients with technique, serving and occasion details, plus one final hint sentence.", None),
    ("3. Pantry note for players", PANTRY_NOTE, None),
    ("Target difficulty", "Pick items most players recognise (aim: 60-80% of players win a daily puzzle) and give clues that let most players get there by the last clue or the final hint (aim: 75-90%).", None),
    (None, None, None),
    ("Sheets", None, H2),
    ("Scoring", "The scoring method. Weights and the cut-off are yellow input cells: change them and the Status column on All Items updates.", None),
    ("All Items", "All 1,158 source items with their score, Keep/Remove status and the reason. Recognition, near-duplicate and single-ingredient columns are editorial inputs (yellow).", None),
    ("Dishes / Drinks", "The kept items with their new clues (Clue 1-6), final hint, ingredient clues and mode flags. Score is looked up live from All Items.", None),
    ("Removed", "Items cut from the pool, with score and reason. They can come back by raising their recognition or lowering the cut-off.", None),
    ("Pantry", "The pantry list (always hidden) and the common list (used only when an item has few other clues).", None),
    ("Summary", "Before/after counts by region, course, drink type, Indian state and game mode, all as live formulas.", None),
    ("Ingredients", "Ingredients still used as clues, with live usage counts across the new clue columns.", None),
    ("Cuisines / India States / Countries", "Reference sheets; item counts are live formulas over Dishes and Drinks.", None),
    ("Daily Schedule (sample)", "A fresh 90-day sample drawn from the curated pool with the same rules as v1.", None),
    (None, None, None),
    ("How a clue row works now", None, H2),
    ("Clue 1 ... Clue 6", "Reveal order: least telling first. Clue 1 is never a pantry staple. Clues that name part of the answer (giveaways) are always last.", None),
    ("Final hint", "One sentence describing the dish without naming it. Shown after the last clue, so players who are still stuck get a fair last chance.", None),
    ("Rebuild changes after editing", "Changing weights updates the Status column here. To move items between Dishes/Drinks and Removed, run packages/content/curation/build_workbook.py, which applies the same rules.", None),
    (None, None, None),
    ("Colour key", None, H2),
    ("Yellow cells", "Editorial inputs and scoring weights you can change.", None),
    ("Blue text", "Hard-coded editorial values (recognition scores, weights).", None),
    ("Green text", "Values looked up from another sheet.", None),
    ("Black text", "Formulas or source data.", None),
    (None, None, None),
    ("Sources and licences", None, H2),
    ("Dish and drink content", "Compiled from general knowledge for the v1 draft; v2 clues and hints authored for Foodle. Check against a reference (Wikipedia/Wikidata, IBA for cocktails) before launch.", None),
    ("Countries sheet", "mledoze/countries (github.com/mledoze/countries), ODbL 1.0: attribution required, share-alike applies.", None),
    ("Images", "Image URL columns hold Wikimedia Commons candidates found by script (accepted licence, long edge at least 2,400 px). Status 'Candidate' means not yet reviewed by a person.", None),
]
for i, (a, b, f) in enumerate(lines, 1):
    ca = ws.cell(row=i, column=1, value=a)
    cb = ws.cell(row=i, column=2, value=b)
    ca.font = f or BOLD
    cb.font = BODY
    cb.alignment = WRAP
    if a == "Yellow cells":
        ca.fill = INPUT_FILL
    elif a == "Blue text":
        ca.font = Font(name=FONT, size=10, bold=True, color="0000FF")
    elif a == "Green text":
        ca.font = Font(name=FONT, size=10, bold=True, color="008000")

# ================================================================ Scoring
sc = wb.create_sheet("Scoring")
sc.column_dimensions["A"].width = 4
sc.column_dimensions["B"].width = 34
sc.column_dimensions["C"].width = 12
sc.column_dimensions["D"].width = 12
sc.column_dimensions["E"].width = 90
sc["B1"] = "Scoring method"
sc["B1"].font = TITLE
sc["B2"] = "Score out of 10 = recognition + distinctiveness + fit + clue strength. Items at or above the cut-off are kept."
sc["B2"].font = BODY
for c, h in zip("BCDE", ["Component", "Weight", "Max points", "How it is scored"]):
    sc[f"{c}4"] = h
    sc[f"{c}4"].fill, sc[f"{c}4"].font = HEAD_FILL, HEAD_FONT
comp = [
    ("Recognition (1-5)", W_RECOG, "=5*C5", "Editorial score: how widely known the item is to the players of its edition (Global players for non-Indian items, Indian players for Indian items). 5 household name, 4 widely known, 3 known to food-curious players, 2 niche, 1 obscure. Points = score x weight."),
    ("Distinctiveness", W_DISTINCT, "=C6", "Full points unless the item is a near-duplicate of a better-known item (biryani variants, a second version of the same dumpling, a virgin version of a cocktail). Duplicates were flagged by hand and by checking 60%+ clue overlap within the same country."),
    ("Fit for clue play", W_FIT, "=C7", "Full points for dishes and mixed drinks. Zero for single-ingredient products (straight spirits, wines, beers, plain teas), which are hard to clue."),
    ("Clue strength", W_CLUES, "=C8", "From the source data, how many telling clues remain once the pantry is removed: 5+ = 1, 4 = 0.75, 3 = 0.5, 2 = 0.25, fewer = 0. Points = that fraction x weight."),
]
for r, (name, w, mx, how) in enumerate(comp, 5):
    sc[f"B{r}"], sc[f"C{r}"], sc[f"D{r}"], sc[f"E{r}"] = name, w, mx, how
    sc[f"C{r}"].fill, sc[f"C{r}"].font = INPUT_FILL, BLUE
    for c in "BDE":
        sc[f"{c}{r}"].font = BODY
    sc[f"E{r}"].alignment = WRAP
    sc.row_dimensions[r].height = 44
sc["B9"], sc["D9"] = "Maximum score", "=SUM(D5:D8)"
sc["B9"].font = sc["D9"].font = BOLD
sc["B10"], sc["C10"] = "Keep cut-off (score at or above)", THRESHOLD
sc["B10"].font = BOLD
sc["C10"].fill, sc["C10"].font = INPUT_FILL, Font(name=FONT, size=10, bold=True, color="0000FF")
sc["E10"] = "Chosen so that 60-70% of items stay, as briefed. 6.5 keeps every recognisable, distinct item and drops niche ones (recognition 2 can reach at most 6.3)."
sc["E10"].font, sc["E10"].alignment = BODY, WRAP

sc["B12"] = "Result (live)"
sc["B12"].font = H2
res = [
    ("Items scored", "=COUNTA('All Items'!A:A)-1"),
    ("Kept", "=COUNTIF('All Items'!R:R,\"Keep\")"),
    ("Removed", "=COUNTIF('All Items'!R:R,\"Remove\")"),
    ("Share kept", "=IF(C13=0,0,C14/C13)"),
    ("Dishes kept", "=COUNTIFS('All Items'!C:C,\"Dish\",'All Items'!R:R,\"Keep\")"),
    ("Drinks kept", "=COUNTIFS('All Items'!C:C,\"Drink\",'All Items'!R:R,\"Keep\")"),
    ("Average score of kept items", "=IFERROR(AVERAGEIF('All Items'!R:R,\"Keep\",'All Items'!Q:Q),0)"),
]
for r, (k, f) in enumerate(res, 13):
    sc[f"B{r}"], sc[f"C{r}"] = k, f
    sc[f"B{r}"].font = sc[f"C{r}"].font = BODY
sc["C16"].number_format = "0.0%"
sc["C19"].number_format = "0.00"

sc["B21"] = "Recognition scale"
sc["B21"].font = H2
for r, (s, d) in enumerate([
    (5, "Household name for this audience (Butter Chicken, Sushi, Mojito)"),
    (4, "Widely known (Rogan Josh, Bibimbap, Negroni)"),
    (3, "Known to food-curious players (Shorshe Ilish, Khao Soi, Pisco Sour)"),
    (2, "Niche (Chicken Changezi, Ma La Xiang Guo, Aviation)"),
    (1, "Obscure"),
], 22):
    sc[f"B{r}"], sc[f"E{r}"] = s, d
    sc[f"B{r}"].font = sc[f"E{r}"].font = BODY
sc["B28"] = "Defaults: recognition starts from the source fame tier (fame 1 = 4, fame 2 = 3, fame 3 = 2) and was then set item by item; 230 items were moved up or down by hand."
sc["B28"].font = BODY

# ================================================================ All Items
ai = wb.create_sheet("All Items")
headers = ["ID", "Name", "Kind", "Country", "State / region", "Course / type", "Fame (1-3)", "Recognition (1-5)",
           "Telling clues in source", "Near-duplicate?", "Duplicate note", "Single-ingredient product?",
           "Recognition pts", "Clue pts", "Distinct pts", "Fit pts", "Score", "Status", "Reason"]
data = []
for r in rows:
    it = r["it"]
    data.append([it["id"], it["name"], "Dish" if it["kind"] == "dish" else "Drink", it["country"], it.get("state"),
                 it.get("course") or it.get("type"), it["fame"], R[it["id"]], r["n"], "Yes" if r["dup"] else "No",
                 DUP.get(it["id"]), "Yes" if r["single"] else "No", None, None, None, None, None, None, r["why"]])
table(ai, headers, data, [8, 30, 7, 16, 16, 12, 8, 11, 10, 10, 40, 11, 10, 8, 9, 8, 8, 9, 48], freeze="C2")
for i in range(2, len(data) + 2):
    ai[f"M{i}"] = f"=H{i}*Scoring!$C$5"
    ai[f"N{i}"] = f"=IF(I{i}>=5,1,IF(I{i}=4,0.75,IF(I{i}=3,0.5,IF(I{i}=2,0.25,0))))*Scoring!$C$8"
    ai[f"O{i}"] = f"=IF(J{i}=\"Yes\",0,Scoring!$C$6)"
    ai[f"P{i}"] = f"=IF(L{i}=\"Yes\",0,Scoring!$C$7)"
    ai[f"Q{i}"] = f"=ROUND(SUM(M{i}:P{i}),2)"
    ai[f"R{i}"] = f"=IF(Q{i}>=Scoring!$C$10-0.000001,\"Keep\",\"Remove\")"
    for c in "HJL":
        ai[f"{c}{i}"].fill = INPUT_FILL
    ai[f"H{i}"].font = BLUE
    for c in "MNOPQR":
        ai[f"{c}{i}"].font = BODY
    for c in "MNOP":
        ai[f"{c}{i}"].number_format = "0.00"
last = len(data) + 1
dv = DataValidation(type="list", formula1='"Yes,No"', allow_blank=False)
ai.add_data_validation(dv)
dv.add(f"J2:J{last}")
dv.add(f"L2:L{last}")
dv2 = DataValidation(type="whole", operator="between", formula1="1", formula2="5")
ai.add_data_validation(dv2)
dv2.add(f"H2:H{last}")
ai.conditional_formatting.add(f"R2:R{last}", CellIsRule(operator="equal", formula=['"Keep"'], fill=KEEP_FILL))
ai.conditional_formatting.add(f"R2:R{last}", CellIsRule(operator="equal", formula=['"Remove"'], fill=DROP_FILL))
ai["H1"].comment = Comment("Editorial input, 1-5. See Scoring for the scale.", "Foodle")
ai["S1"].comment = Comment("Reason recorded when the workbook was built at the default weights.", "Foodle")

# ================================================================ Dishes / Drinks
img_status = {k: v.get("status", "candidate") for k, v in images.items()}


def kept_rows(kind):
    out = []
    for r in kept:
        it = r["it"]
        if it["kind"] != kind:
            continue
        clues, _ = build_clues(it, authored[it["id"]][0])
        clues += [None] * (MAX_CLUES - len(clues))
        ings = {i.lower() for i in it["ingredients"]}
        ing_clues = [c for c in clues if c and c.lower() in ings]
        give = [c for c in clues if c and in_name(c, it["name"])]
        img = images.get(it["id"])
        base = [it["id"], it["name"], ", ".join(it["aliases"]) or None, it["country"], it.get("state"), it["continent"], it["subregion"]]
        if kind == "dish":
            base += [it["course"], it["diet"]]
        else:
            base += [it["type"], "Yes" if it["alcoholic"] else "No", it.get("serve")]
        base += [it["fame"], R[it["id"]], None]
        base += clues + [authored[it["id"]][1], "; ".join(ing_clues) or None, "; ".join(give) or None, None]
        base += ["Yes" if it["modes"]["global"] else "No", "Yes" if it["modes"]["india"] else "No",
                 "Yes" if it["modes"]["country"] else "No", it.get("originNote"), it.get("imageSearch"),
                 img["url"] if img else None, img["licence"] if img else None, img["author"] if img else None,
                 ("Approved" if img_status.get(it["id"]) == "approved" else "Candidate - review") if img else "Needed",
                 "Draft v2 - editorial check"]
        out.append(base)
    return out


def write_items(name, kind):
    ws = wb.create_sheet(name)
    lead = ["ID", "Dish" if kind == "dish" else "Drink", "Also known as", "Country", "State / region", "Continent", "Subregion"]
    lead += ["Course", "Diet"] if kind == "dish" else ["Type", "Alcoholic", "Glass / serve"]
    hdr = lead + ["Fame (1-3)", "Recognition (1-5)", "Score"] + [f"Clue {i}" for i in range(1, MAX_CLUES + 1)] + [
        "Final hint", "Ingredient clues", "Giveaway clues (shown last)", "Clue count", "Global mode", "India mode",
        "Country mode", "Origin note", "Image search (Wikimedia)", "Image URL", "Image licence", "Image credit",
        "Image status", "Status"]
    data = kept_rows(kind)
    nlead = len(lead)
    widths = [8, 26, 18, 14, 14, 10, 16] + ([10, 8] if kind == "dish" else [10, 9, 14]) + [8, 10, 8] + [20] * MAX_CLUES + [
        52, 30, 20, 8, 8, 8, 8, 28, 16, 30, 14, 18, 16, 20]
    table(ws, hdr, data, widths, freeze="C2")
    col = {h: get_column_letter(i) for i, h in enumerate(hdr, 1)}
    c1, cl = col["Clue 1"], col[f"Clue {MAX_CLUES}"]
    for i in range(2, len(data) + 2):
        ws[f"{col['Score']}{i}"] = f"=INDEX('All Items'!$Q:$Q,MATCH($A{i},'All Items'!$A:$A,0))"
        ws[f"{col['Score']}{i}"].font = GREEN
        ws[f"{col['Clue count']}{i}"] = f"=COUNTA({c1}{i}:{cl}{i})"
        ws[f"{col['Clue count']}{i}"].font = BODY
        ws[f"{col['Final hint']}{i}"].alignment = Alignment(wrap_text=False)
        ws[f"{col['Image URL']}{i}"].fill = INPUT_FILL
        ws[f"{col['Image licence']}{i}"].fill = INPUT_FILL
        ws[f"{col['Image credit']}{i}"].fill = INPUT_FILL
    ws[f"{col['Final hint']}1"].comment = Comment("Shown after the last clue. Never names the item.", "Foodle")
    ws[f"{c1}1"].comment = Comment("Least telling first. Pantry staples are never clues (see Pantry).", "Foodle")
    return ws, col, data


dishes_ws, DCOL, dish_data = write_items("Dishes", "dish")
drinks_ws, BCOL, drink_data = write_items("Drinks", "drink")

# ================================================================ Removed
rm = wb.create_sheet("Removed")
rm_data = [[r["it"]["id"], r["it"]["name"], "Dish" if r["it"]["kind"] == "dish" else "Drink", r["it"]["country"],
            r["it"].get("state"), r["it"].get("course") or r["it"].get("type"), R[r["it"]["id"]], None, r["why"]]
           for r in sorted(removed, key=lambda r: (r["it"]["kind"], -r["score"]))]
table(rm, ["ID", "Name", "Kind", "Country", "State / region", "Course / type", "Recognition (1-5)", "Score", "Why it was removed"],
      rm_data, [8, 30, 7, 16, 16, 12, 11, 8, 60])
for i in range(2, len(rm_data) + 2):
    rm[f"H{i}"] = f"=INDEX('All Items'!$Q:$Q,MATCH($A{i},'All Items'!$A:$A,0))"
    rm[f"H{i}"].font = GREEN

# ================================================================ Pantry
pa = wb.create_sheet("Pantry")
pa.column_dimensions["A"].width = 26
pa.column_dimensions["B"].width = 18
pa.column_dimensions["C"].width = 16
pa.column_dimensions["D"].width = 70
pa["A1"] = "Basic pantry"
pa["A1"].font = TITLE
pa["A2"] = "Note shown to players:"
pa["A2"].font = BOLD
pa["B2"] = PANTRY_NOTE
pa.merge_cells("B2:D2")
pa["B2"].alignment = WRAP
pa["B2"].fill = NOTE_FILL
pa["B2"].font = BODY
pa.row_dimensions[2].height = 48
src_counts = collections.Counter(c.lower() for it in items for c in it["clues"])
prow = [[p, "Pantry", src_counts.get(p, 0), "Never a clue, unless it is part of the name (e.g. Garlic Naan)."] for p in sorted(PANTRY)]
prow += [[c, "Common", src_counts.get(c, 0), "Used only to fill an item that has fewer than six telling clues, and then always first."] for c in sorted(COMMON)]
table(pa, ["Ingredient", "List", "Clues in v1 source", "Rule"], prow, None, start_row=4, freeze="A5")

# ================================================================ Ingredients (still used as clues)
ing_cat = {}
for row in src["Ingredients"].iter_rows(min_row=2, values_only=True):
    if row[0]:
        ing_cat[str(row[1]).lower()] = row[2]
kept_ings = set()
for r in kept:
    it = r["it"]
    clues, _ = build_clues(it, authored[it["id"]][0])
    for c in clues:
        if c.lower() in {i.lower() for i in it["ingredients"]}:
            kept_ings.add(c.lower())
ing = wb.create_sheet("Ingredients")
ing_rows = [[f"I{n:04d}", name, ing_cat.get(name), None, None, None] for n, name in enumerate(sorted(kept_ings), 1)]
table(ing, ["ID", "Ingredient", "Category", "Used in dishes", "Used in drinks", "Total uses"], ing_rows, [8, 30, 26, 12, 12, 10])
dc1, dcl = DCOL["Clue 1"], DCOL[f"Clue {MAX_CLUES}"]
bc1, bcl = BCOL["Clue 1"], BCOL[f"Clue {MAX_CLUES}"]
for i in range(2, len(ing_rows) + 2):
    ing[f"D{i}"] = f"=COUNTIF(Dishes!${dc1}:${dcl},B{i})"
    ing[f"E{i}"] = f"=COUNTIF(Drinks!${bc1}:${bcl},B{i})"
    ing[f"F{i}"] = f"=D{i}+E{i}"
    for c in "DEF":
        ing[f"{c}{i}"].font = BODY

# ================================================================ Cuisines / India States / Countries
cu = wb.create_sheet("Cuisines")
cu_rows = []
for row in src["Cuisines"].iter_rows(min_row=2, values_only=True):
    if row[0]:
        cu_rows.append([row[0], row[1], row[2], row[3], row[4], None, None, None])
table(cu, ["ID", "Country / cuisine", "Continent", "Subregion", "ISO2", "Dishes", "Drinks", "Total items"], cu_rows, [7, 24, 12, 24, 6, 9, 9, 10])
for i in range(2, len(cu_rows) + 2):
    cu[f"F{i}"] = f"=COUNTIF(Dishes!$D:$D,B{i})"
    cu[f"G{i}"] = f"=COUNTIF(Drinks!$D:$D,B{i})"
    cu[f"H{i}"] = f"=F{i}+G{i}"

st = wb.create_sheet("India States")
st_rows = [[row[0], None, None, None] for row in src["India States"].iter_rows(min_row=2, values_only=True) if row[0]]
table(st, ["State / region", "Dishes", "Drinks", "Total items"], st_rows, [24, 9, 9, 10])
for i in range(2, len(st_rows) + 2):
    st[f"B{i}"] = f"=COUNTIFS(Dishes!$E:$E,A{i},Dishes!$D:$D,\"India\")"
    st[f"C{i}"] = f"=COUNTIFS(Drinks!$E:$E,A{i},Drinks!$D:$D,\"India\")"
    st[f"D{i}"] = f"=B{i}+C{i}"

co = wb.create_sheet("Countries")
co_rows = [list(r) for r in src["Countries"].iter_rows(min_row=2, values_only=True) if r[0]]
table(co, [c.value for c in src["Countries"][1]], co_rows, [24, 36, 6, 6, 10, 22, 10, 10, 30, 6])

# ================================================================ Daily Schedule (sample)
import random  # noqa: E402

rng = random.Random(20261102)


def fame_for(day):
    wd = day.weekday()  # Mon=0
    return 3 if wd == 4 else 2 if wd in (2, 3, 5) else 1


def draw(pool, group, days):
    by_f = {f: [x for x in pool if x["fame"] == f] for f in (1, 2, 3)}
    used, prev, out = set(), None, []
    for d in days:
        want = fame_for(d)
        for f in [want] + [x for x in (1, 2, 3) if x != want]:
            opts = [x for x in by_f[f] if x["id"] not in used and group(x) != prev]
            if opts:
                pick = rng.choice(opts)
                used.add(pick["id"])
                prev = group(pick)
                out.append(pick)
                break
        else:
            out.append(None)
    return out


kept_items = [r["it"] for r in kept]
days = [datetime.date(2026, 11, 2) + datetime.timedelta(n) for n in range(90)]
g_dish = draw([i for i in kept_items if i["kind"] == "dish" and i["modes"]["global"]], lambda x: x["country"], days)
i_dish = draw([i for i in kept_items if i["kind"] == "dish" and i["modes"]["india"]], lambda x: x.get("state"), days)
g_drink = draw([i for i in kept_items if i["kind"] == "drink" and i["modes"]["global"]], lambda x: x["country"], days)
cz = draw([i for i in kept_items if i["kind"] == "dish" and i["country"] != "India" and i["modes"]["country"]], lambda x: x["country"], days)
cs = draw([i for i in kept_items if i["kind"] == "dish" and i["country"] == "India" and i["modes"]["country"] and i.get("state") not in (None, "Pan-India")], lambda x: x.get("state"), days)
ds = wb.create_sheet("Daily Schedule (sample)")
ds_rows = []
for n, d in enumerate(days):
    ds_rows.append([n + 1, d.isoformat(), d.strftime("%A"), g_dish[n]["id"], g_dish[n]["name"], i_dish[n]["id"], i_dish[n]["name"],
                    i_dish[n].get("state"), g_drink[n]["id"], g_drink[n]["name"], cz[n]["id"], cz[n]["country"], cs[n]["id"], cs[n]["state"]])
table(ds, [c.value for c in src["Daily Schedule (sample)"][1]], ds_rows, [5, 12, 11, 9, 24, 9, 24, 14, 9, 22, 9, 16, 9, 16])

# ================================================================ Summary
sm = wb.create_sheet("Summary", 1)
sm.column_dimensions["A"].width = 30
for c in "BCDE":
    sm.column_dimensions[c].width = 13
sm["A1"] = "Before and after"
sm["A1"].font = TITLE
sm["A2"] = "v1 counts are fixed values from the source workbook. v2 counts are live formulas."
sm["A2"].font = BODY
r0 = 4


def block(title, label, pairs, row):
    sm.cell(row=row, column=1, value=title).font = H2
    row += 1
    for c, h in enumerate([label, "v1 (source)", "v2 (kept)", "Share kept"], 1):
        cell = sm.cell(row=row, column=c, value=h)
        cell.fill, cell.font = HEAD_FILL, HEAD_FONT
    for name, before, formula in pairs:
        row += 1
        sm.cell(row=row, column=1, value=name).font = BODY
        b = sm.cell(row=row, column=2, value=before)
        b.font = BLUE
        sm.cell(row=row, column=3, value=formula).font = BODY
        p = sm.cell(row=row, column=4, value=f"=IF(B{row}=0,0,C{row}/B{row})")
        p.number_format = "0%"
        p.font = BODY
    return row + 2


all_items = [r["it"] for r in rows]
dishes_all = [i for i in all_items if i["kind"] == "dish"]
drinks_all = [i for i in all_items if i["kind"] == "drink"]
r0 = block("Totals", "Items", [
    ("Dishes", len(dishes_all), "=COUNTA(Dishes!A:A)-1"),
    ("Drinks", len(drinks_all), "=COUNTA(Drinks!A:A)-1"),
    ("All items", len(all_items), "=C6+C7"),
], r0)
regions = ["Asia", "Europe", "Americas", "Africa", "Oceania"]
r0 = block("Dishes by continent", "Continent", [(g, sum(1 for i in dishes_all if i["continent"] == g), f'=COUNTIF(Dishes!F:F,"{g}")') for g in regions]
           + [("of which India", sum(1 for i in dishes_all if i["country"] == "India"), '=COUNTIF(Dishes!D:D,"India")')], r0)
courses = [c for c, _ in collections.Counter(i["course"] for i in dishes_all).most_common()]
r0 = block("Dishes by course", "Course", [(c, sum(1 for i in dishes_all if i["course"] == c), f'=COUNTIF(Dishes!H:H,"{c}")') for c in courses], r0)
types = [t for t, _ in collections.Counter(i["type"] for i in drinks_all).most_common()]
r0 = block("Drinks by type", "Type", [(t, sum(1 for i in drinks_all if i["type"] == t), f'=COUNTIF(Drinks!H:H,"{t}")') for t in types], r0)
states = [s for s, _ in collections.Counter(i.get("state") for i in all_items if i["country"] == "India").most_common()]
r0 = block("India items by state", "State / region", [(s, sum(1 for i in all_items if i["country"] == "India" and i.get("state") == s),
                                                       f'=COUNTIFS(Dishes!E:E,"{s}",Dishes!D:D,"India")+COUNTIFS(Drinks!E:E,"{s}",Drinks!D:D,"India")') for s in states], r0)


def pool_count(pred):
    return sum(1 for i in all_items if i["puzzleReady"] and pred(i))


gm, im, cm = DCOL["Global mode"], DCOL["India mode"], DCOL["Country mode"]
bgm, bim = BCOL["Global mode"], BCOL["India mode"]
r0 = block("Daily answer pools (puzzle-ready items)", "Mode", [
    ("Dish - Global", pool_count(lambda i: i["kind"] == "dish" and i["modes"]["global"]), f'=COUNTIF(Dishes!{gm}:{gm},"Yes")'),
    ("Dish - India", pool_count(lambda i: i["kind"] == "dish" and i["modes"]["india"]), f'=COUNTIF(Dishes!{im}:{im},"Yes")'),
    ("Drink - Global", pool_count(lambda i: i["kind"] == "drink" and i["modes"]["global"]), f'=COUNTIF(Drinks!{bgm}:{bgm},"Yes")'),
    ("Drink - India", pool_count(lambda i: i["kind"] == "drink" and i["modes"]["india"]), f'=COUNTIF(Drinks!{bim}:{bim},"Yes")'),
    ("Cuisine - Global (clue dishes)", pool_count(lambda i: i["kind"] == "dish" and i["country"] != "India" and i["modes"]["country"]),
     f'=COUNTIFS(Dishes!{cm}:{cm},"Yes",Dishes!D:D,"<>India")'),
    ("Cuisine - India (clue dishes)", pool_count(lambda i: i["kind"] == "dish" and i["country"] == "India" and i["modes"]["country"] and i.get("state") != "Pan-India"),
     f'=COUNTIFS(Dishes!{cm}:{cm},"Yes",Dishes!D:D,"India",Dishes!E:E,"<>Pan-India")'),
], r0)
sm.cell(row=r0 - 1, column=1, value="In v2 every kept item has at least five clues, so every kept item is puzzle-ready.").font = BODY
r0 += 1
sm.cell(row=r0, column=1, value="Recognition of kept items").font = H2
r0 += 1
for c, h in enumerate(["Recognition", "Kept items", "Share"], 1):
    cell = sm.cell(row=r0, column=c, value=h)
    cell.fill, cell.font = HEAD_FILL, HEAD_FONT
top = r0 + 1
for s in (5, 4, 3, 2):
    r0 += 1
    sm.cell(row=r0, column=1, value=s).font = BODY
    sm.cell(row=r0, column=2, value=f'=COUNTIFS(\'All Items\'!H:H,{s},\'All Items\'!R:R,"Keep")').font = BODY
    p = sm.cell(row=r0, column=3, value=f"=IF(SUM($B${top}:$B${top + 3})=0,0,B{r0}/SUM($B${top}:$B${top + 3}))")
    p.number_format = "0%"
r0 += 2
sm.cell(row=r0, column=1, value="Clue counts of kept items").font = H2
r0 += 1
for c, h in enumerate(["Clues", "Dishes", "Drinks"], 1):
    cell = sm.cell(row=r0, column=c, value=h)
    cell.fill, cell.font = HEAD_FILL, HEAD_FONT
dcc, bcc = DCOL["Clue count"], BCOL["Clue count"]
for n in (6, 5):
    r0 += 1
    sm.cell(row=r0, column=1, value=n).font = BODY
    sm.cell(row=r0, column=2, value=f"=COUNTIF(Dishes!{dcc}:{dcc},{n})").font = BODY
    sm.cell(row=r0, column=3, value=f"=COUNTIF(Drinks!{bcc}:{bcc},{n})").font = BODY

# sheet order
order = ["README", "Summary", "Scoring", "Dishes", "Drinks", "Removed", "All Items", "Pantry", "Ingredients",
         "Cuisines", "India States", "Countries", "Daily Schedule (sample)"]
wb._sheets = [wb[n] for n in order]
for ws in wb.worksheets:
    ws.sheet_view.zoomScale = 100
wb["README"].sheet_properties.tabColor = "1F3864"
wb["Summary"].sheet_properties.tabColor = "6AAA64"
wb["Scoring"].sheet_properties.tabColor = "C9B458"
wb.save(OUT)
print(f"kept {len(kept)} ({len(kept) / len(rows):.0%}), dishes {len(dish_data)}, drinks {len(drink_data)}, removed {len(removed)}")
print(OUT)
