"""Basic pantry: assumed in every kitchen, so never shown as a clue (unless it names the dish)."""

# Shown to players as the pantry note.
PANTRY_NOTE = (
    "Basic pantry isn't shown as a clue: salt, pepper, water, ice, sugar, cooking oil, ghee, "
    "flour, onion, garlic, ginger, green or red chilli, turmeric, cumin, coriander, garam masala, "
    "yeast and baking soda. Clues are the ingredients and details that make a dish what it is."
)

# Tier 1: always removed.
PANTRY = {
    # seasoning, liquids, fats
    "salt", "black salt", "pepper", "black pepper", "white pepper", "water", "hot water", "cold water", "ice", "crushed ice",
    "oil", "vegetable oil", "cooking oil", "sunflower oil", "refined oil", "ghee", "olive oil",
    # sweeteners
    "sugar", "brown sugar", "caster sugar", "powdered sugar", "icing sugar", "sugar syrup", "simple syrup", "sugar cube",
    # flours and raising
    "flour", "plain flour", "all-purpose flour", "maida", "whole wheat flour", "atta", "yeast", "baking powder", "baking soda",
    # aromatics and everyday spices
    "onion", "garlic", "ginger", "ginger-garlic paste", "ginger garlic paste", "green chilli", "red chilli", "chilli",
    "red chilli powder", "chilli powder", "turmeric", "cumin", "cumin seeds", "coriander", "coriander leaves",
    "coriander powder", "garam masala", "spices", "mixed spices",
}

# Tier 2: common but sometimes telling. Kept only while the item still has fewer than
# MIN_SPECIFIC specific clues; otherwise moved out so clue 1 is never a staple.
COMMON = {
    "butter", "tomato", "egg", "milk", "lemon", "lime", "cream", "yogurt", "potato", "rice", "soy sauce",
    "cinnamon", "cardamom", "cloves", "bay leaf", "vinegar", "mustard seeds", "curry leaves", "spring onion",
    "carrot", "lemon juice", "lime juice", "soda water", "tonic water", "honey", "vanilla",
}

MIN_SPECIFIC = 5


def is_pantry(name: str) -> bool:
    return name.strip().lower() in PANTRY


def in_name(clue: str, item_name: str) -> bool:
    words = {w for w in item_name.lower().replace("-", " ").split() if len(w) > 2}
    return any(w in words for w in clue.lower().split())
