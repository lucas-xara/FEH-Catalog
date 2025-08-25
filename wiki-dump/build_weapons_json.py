# build_weapons_json.py
# Gera weapons-list.json a partir dos .wiki em feh_wiki_dump/Skills/pages/Weapons
# Requer: pip install mwparserfromhell

import os
import json
import pathlib
import re
from typing import Dict, Any, List, Optional
import mwparserfromhell as mw

BASE_DIR = os.path.dirname(__file__)
WEAPONS_DIR = os.path.join(BASE_DIR, "feh_wiki_dump", "Skills", "pages", "Weapons")
OUT_JSON = os.path.join(BASE_DIR, "weapons-list.json")

# ---------------- helpers ----------------
def clean_str(s: Optional[str]) -> str:
    return (str(s).strip() if s is not None else "")

def tpl_name(t) -> str:
    return str(t.name).strip().lower()

def params_to_dict(t) -> Dict[str, str]:
    d: Dict[str, str] = {}
    for p in t.params:
        d[str(p.name).strip()] = str(p.value).strip()
    return d

def get_template(parsed, wanted: str):
    wl = wanted.strip().lower()
    for t in parsed.filter_templates():
        if tpl_name(t) == wl:
            return t
    return None

def strip_links_and_html(text: str) -> str:
    """Remove [[links]] e converte <br> em quebras de linha; tira ''/'''."""
    if not text:
        return ""
    # <br> variants -> \n
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    # [[x|y]] -> y ; [[x]] -> x
    text = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    # remove bold/italic wiki
    text = text.replace("'''", "").replace("''", "")
    # collapse excessive whitespace
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text

def extract_inner_args_from_template_value(val: str, allowed=("movelist","weaponlist")) -> str:
    """
    "{{MoveList|all}}"             -> "all"
    "{{WeaponList|exclude=Staff}}" -> "exclude=Staff"
    "Close"                        -> "Close"
    """
    if not val:
        return ""
    parsed = mw.parse(val)
    tmpls = [t for t in parsed.filter_templates() if tpl_name(t) in allowed]
    if not tmpls:
        return val.strip().strip("{} ").strip()
    t = tmpls[0]
    parts: List[str] = []
    for p in t.params:
        name = str(p.name).strip()
        value = str(p.value).strip()
        if name.isdigit():
            parts.append(value)
        else:
            parts.append(f"{name}={value}")
    return ", ".join(parts)

def parse_stat_modifiers(s: str) -> Dict[str, str]:
    """
    "0,14,3,0,0" -> {"HP":"0","ATK":"14","SPD":"3","DEF":"0","RES":"0"}
    Mantém como strings (coerente com Specials/Assists).
    """
    s = (s or "").strip()
    if not s:
        return {"HP": "", "ATK": "", "SPD": "", "DEF": "", "RES": ""}
    parts = [p.strip() for p in s.split(",")]
    parts += [""] * (5 - len(parts))
    return {"HP": parts[0], "ATK": parts[1], "SPD": parts[2], "DEF": parts[3], "RES": parts[4]}

def normalize_properties(props: str) -> str:
    """Converte listas separadas por vírgula/pipe em string 'a, b, c' sem duplicatas."""
    if not props:
        return ""
    tokens = re.split(r"[,\|]", props)
    toks = [t.strip() for t in tokens if t.strip()]
    seen, out = set(), []
    for t in toks:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return ", ".join(out)

def collect_user_versions(d: Dict[str, str], max_slots: int = 10) -> List[str]:
    arr: List[str] = []
    for i in range(1, max_slots + 1):
        v = d.get(f"userVersion{i}", "").strip()
        if v:
            arr.append(v)
    return arr

def collect_extra_skills(d: Dict[str, str], max_slots: int = 10) -> List[Dict[str, str]]:
    """
    Consolida grupos:
      tagidExtraSkilli, cooldownSkilli, effectSkilli, iconSkilli
    Apenas inclui chaves que existirem.
    """
    out: List[Dict[str, str]] = []
    for i in range(1, max_slots + 1):
        block = {}
        tagid = d.get(f"tagidExtraSkill{i}", "").strip()
        cd    = d.get(f"cooldownSkill{i}", "").strip()
        eff   = d.get(f"effectSkill{i}", "").strip()
        icon  = d.get(f"iconSkill{i}", "").strip()
        if tagid: block["tagidExtraSkill"] = tagid
        if cd:    block["cooldownSkill"]   = cd
        if eff:   block["effectSkill"]     = strip_links_and_html(eff)
        if icon:  block["iconSkill"]       = icon
        if block:
            out.append(block)
    return out

def build_weapon_object(wdict: Dict[str, str], fallback_name: str) -> Dict[str, Any]:
    effect = strip_links_and_html(clean_str(wdict.get("effect")))
    upgraded_effect = strip_links_and_html(clean_str(wdict.get("upgradedEffect")))
    return {
        "Weapon": {
            "Name": clean_str(wdict.get("name")) or fallback_name,
            "tagid": clean_str(wdict.get("tagid")),
            "intID": clean_str(wdict.get("intID")),
            "weaponType": clean_str(wdict.get("weaponType")),
            "might": clean_str(wdict.get("might")),
            "range": clean_str(wdict.get("range")),
            "cooldown": clean_str(wdict.get("cooldown")),
            "effect": effect,
            "upgradedEffect": upgraded_effect,
            "cost": clean_str(wdict.get("cost")),
            "exclusive": clean_str(wdict.get("exclusive")),
            "required": clean_str(wdict.get("required")),
            "next": clean_str(wdict.get("next")),
            "promotionRarity": clean_str(wdict.get("promotionRarity")),
            "promotionTier": clean_str(wdict.get("promotionTier")),
            "canUseMove": extract_inner_args_from_template_value(clean_str(wdict.get("canUseMove"))),
            "canUseWeapon": extract_inner_args_from_template_value(clean_str(wdict.get("canUseWeapon"))),
            "effectiveness": clean_str(wdict.get("effectiveness")),
            "statModifiers": parse_stat_modifiers(clean_str(wdict.get("statModifiers"))),
            "refinePaths": clean_str(wdict.get("refinePaths")),
            "refineSP": clean_str(wdict.get("refineSP")),
            "refineMedals": clean_str(wdict.get("refineMedals")),
            "refineStones": clean_str(wdict.get("refineStones")),
            "refineDews": clean_str(wdict.get("refineDews")),
            "properties": normalize_properties(clean_str(wdict.get("properties"))),
            "image": clean_str(wdict.get("image")),
            "userVersions": collect_user_versions(wdict),
            "extraSkills": collect_extra_skills(wdict)
        }
    }

# ---------------- pipeline ----------------
def parse_weapon_file(text: str, fallback_name: str) -> Optional[Dict[str, Any]]:
    parsed = mw.parse(text)
    tpl = get_template(parsed, "Weapon Infobox")
    if not tpl:
        return None
    wdict = params_to_dict(tpl)
    return build_weapon_object(wdict, fallback_name)

def main():
    if not os.path.isdir(WEAPONS_DIR):
        raise SystemExit(f"Pasta não encontrada: {WEAPONS_DIR}")

    weapons: List[Dict[str, Any]] = []
    files = sorted([f for f in os.listdir(WEAPONS_DIR) if f.endswith(".wiki")], key=str.lower)

    for fname in files:
        path = os.path.join(WEAPONS_DIR, fname)
        try:
            text = pathlib.Path(path).read_text(encoding="utf-8")
        except Exception as e:
            print(f"[skip] erro lendo {fname}: {e}")
            continue

        fallback_name = fname.split("__")[0]
        obj = parse_weapon_file(text, fallback_name)
        if obj is None:
            print(f"[skip] sem template {{Weapon Infobox}}: {fname}")
            continue

        weapons.append(obj)
        print(f"[ok] {fname} -> {obj['Weapon']['Name']}")

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(weapons, f, ensure_ascii=False, indent=2)

    print(f"\nGerado: {OUT_JSON} ({len(weapons)} weapons)")

if __name__ == "__main__":
    main()
