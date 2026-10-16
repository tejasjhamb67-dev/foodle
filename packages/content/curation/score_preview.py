import json, sys, collections, itertools
sys.path.insert(0, ".")
from pantry import PANTRY, COMMON, MIN_SPECIFIC, in_name
from recognition import recognition
from duplicates import MANUAL, NOT_DUP
items = json.load(open("../data/items.json"))
SINGLE = {"Spirit", "Wine", "Beer"}
PLAIN_TEA = {"B0155","B0156","B0158","B0159","B0157","B0154"}
def specific(it):
    out=[]
    for c in it["clues"]:
        lc=c.lower()
        if lc in PANTRY and not in_name(c,it["name"]): continue
        out.append(c)
    strong=[c for c in out if c.lower() not in COMMON or in_name(c,it["name"])]
    return out, strong
rows=[]
spec_sets={}
for it in items:
    s, strong = specific(it)
    spec_sets[it["id"]] = set(x.lower() for x in s)
    rows.append((it, s, strong))
R={it["id"]:recognition(it["id"],it["fame"],it["country"]) for it in items}
auto={}
by=collections.defaultdict(list)
for it in items: by[(it["kind"], it["country"])].append(it)
for grp in by.values():
    for a,b in itertools.combinations(grp,2):
        A,B=spec_sets[a["id"]],spec_sets[b["id"]]
        if len(A)>=3 and len(B)>=3 and len(A&B)/len(A|B)>=0.6:
            lo = a if (R[a["id"]],-a["fame"]) < (R[b["id"]],-b["fame"]) else b
            hi = b if lo is a else a
            if lo["id"] not in NOT_DUP: auto.setdefault(lo["id"], f"{lo['name']} overlaps {hi['name']}")
def clue_pts(n): return 1 if n>=5 else 0.75 if n==4 else 0.5 if n==3 else 0.25 if n==2 else 0
out=[]
for it,s,strong in rows:
    rec=R[it["id"]]*1.3
    clue=clue_pts(len(s))
    dup = it["id"] in MANUAL or it["id"] in auto
    dist=0 if dup else 2
    fit=0 if (it.get("type") in SINGLE or it["id"] in PLAIN_TEA) else 0.5
    tot=rec+clue+dist+fit
    out.append((it,tot,len(s)))
for th in (6,6.5):
    k=[o for o in out if o[1]>=th]
    print(th, len(k), round(len(k)/len(out)*100), "dishes",sum(1 for o in k if o[0]["kind"]=="dish"),"drinks",sum(1 for o in k if o[0]["kind"]=="drink"))
print("auto dups", len(auto), list(auto.values())[:25])
print("spec count dist", collections.Counter(min(o[2],7) for o in out))

TH=6.5
print("kept by R", collections.Counter(R[o[0]["id"]] for o in out if o[1]>=TH), "all by R", collections.Counter(R.values()))
print("borderline removed R3:", [o[0]["name"] for o in out if o[1]<TH and R[o[0]["id"]]==3][:80])
print("kept dups:", [o[0]["name"] for o in out if o[1]>=TH and (o[0]["id"] in MANUAL or o[0]["id"] in auto)])

# ---- export kept list for authoring
kept=[o for o in out if o[1]>=TH]
with open("/tmp/claude-0/-home-user/b07c2b2f-a3b7-5e83-a978-9688cc952803/scratchpad/kept.txt","w") as f:
    for it,tot,n in kept:
        s,_=specific(it)
        place = it.get("state") if it["country"]=="India" else it["country"]
        kind = it.get("course") or it.get("type")
        f.write(f"{it['id']}|{it['name']}|{place}|{kind}|{'; '.join(s)}\n")
print(len(kept))
