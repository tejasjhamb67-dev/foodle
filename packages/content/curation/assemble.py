"""Builds each kept item's new clue list: six clues, least to most telling, pantry removed."""
import glob, re
from pantry import PANTRY, COMMON, in_name

MAX_CLUES = 6
STOP = {"the", "and", "with", "from", "for", "ka", "ki", "di", "da", "de", "la", "al", "of", "a", "an", "in", "e", "le", "no", "en"}


def name_words(item):
    words = set()
    for n in [item["name"], *item["aliases"]]:
        for w in re.split(r"[^\w']+", n.lower()):
            if len(w) > 2 and w not in STOP:
                words.add(w)
                if w.endswith("s"):
                    words.add(w[:-1])
    return words


# Category words: sharing these with the name says what kind of thing it is, not which one.
GENERIC = {
    "chicken", "mutton", "lamb", "beef", "pork", "fish", "prawn", "prawns", "egg", "eggs", "duck", "crab", "shrimp",
    "curry", "rice", "soup", "stew", "salad", "cake", "pie", "bread", "sauce", "noodle", "noodles", "dumpling",
    "dumplings", "fried", "fry", "roast", "grilled", "steamed", "sweet", "sour", "hot", "cold", "iced", "spicy",
    "coffee", "tea", "chai", "milk", "juice", "soda", "wine", "beer", "water", "cocktail", "sandwich", "pancake",
    "pancakes", "toast", "tart", "pudding", "ice", "cream", "masala", "dal", "chaat", "chutney", "pickle", "pastry",
    "biscuit", "cookies", "bun", "roll", "rolls", "balls", "ball", "drink",
}


def leaks(text, item):
    """Distinctive name words that appear in the text (category words don't count)."""
    toks = set(re.split(r"[^\w']+", text.lower()))
    return sorted((toks & name_words(item)) - GENERIC)


def load_authored():
    """authored/NN.txt: ID|extra clues|final hint. 99_fixes.txt adds extras and replaces hints."""
    out = {}
    for f in sorted(glob.glob(__file__.rsplit("/", 1)[0] + "/authored/*.txt")):
        for line in open(f, encoding="utf-8"):
            line = line.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            iid, extras, hint = line.split("|")
            ex = [e.strip() for e in extras.split(";") if e.strip()]
            if iid in out:
                old_ex, old_hint = out[iid]
                out[iid] = (old_ex + ex, hint.strip() or old_hint)
            else:
                out[iid] = (ex, hint.strip())
    return out


def build_clues(item, extras):
    places = {h.split(":", 1)[1].strip().lower() for h in item["hints"] if h.lower().startswith("place:")}
    give = []
    weak, strong, place = [], [], []
    for c in item["clues"]:
        lc = c.lower()
        if in_name(c, item["name"]):
            give.append(c)
        elif lc in PANTRY:
            continue
        elif lc in places:
            place.append(c)
        elif lc in COMMON:
            weak.append(c)
        else:
            strong.append(c)
    seen = {c.lower() for c in strong + place + give}
    new = []
    for e in extras:
        le = e.lower()
        if leaks(e, item) or any(le == x or le in x or (len(x) >= 8 and x in le) for x in seen):
            continue
        seen.add(le)
        new.append(e)
    tail = place + give
    body = strong + new
    room = MAX_CLUES - len(tail)
    if len(body) > room:
        # drop the least telling original clues first (they come first), keep authored ones
        drop = len(body) - room
        orig = [c for c in strong]
        body = orig[drop:] + new if drop <= len(orig) else new[drop - len(orig):]
    clues = body + tail
    while len(clues) < MAX_CLUES and weak:
        clues.insert(0, weak.pop())
    return clues, [e for e in extras if leaks(e, item)]
