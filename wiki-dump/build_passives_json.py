# build_passives_json.py
# Gera passives-list.json a partir dos .wiki em feh_wiki_dump/Skills/pages/Passives
# Requer: pip install mwparserfromhell

import os
import json
import pathlib
import re
from typing import Dict, Any, List, Optional
import mwparserfromhell as mw

BASE_DIR = os.path.dirname(__file__)
PASSIVES_DIR = os.path.join(BASE_DIR, "feh_wiki_dump", "Skills", "pages", "Passives")
OUT_JSON = os.path.join(BASE_DIR, "passives-list.json")

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
    """Remove [[links]]/formatação e converte <br> em quebras de linha."""
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)   # <br> -> \n
    text = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", text)     # [[x|y]] -> y
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)                # [[x]] -> x
    text = text.replace("'''", "").replace("''", "")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text

def extract_inner_args_from_template_value(val: str, allowed=("movelist","weaponlist")) -> str:
    """
    "{{MoveList|all}}"             -> "all"
    "{{WeaponList|exclude=Staff}}" -> "exclude=Staff"
    Caso não seja template esperado, retorna o texto limpo.
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
        parts.append(value if name.isdigit() else f"{name}={value}")
    return ", ".join(parts)

def parse_stat_modifiers(s: str) -> Dict[str, str]:
    """
    "0,0,1,0,1" -> {"HP":"0","ATK":"0","SPD":"1","DEF":"0","RES":"1"}
    (mantém strings, como nos outros parsers)
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

def collect_level(d: Dict[str, str], i: int) -> Optional[Dict[str, Any]]:
    """
    Monta um nível (1..N) se existir "|{i}name=".
    Suporta campos:
      {i}name, alt{i}name (único ou múltiplos alt*), {i}tagid, {i}effect, {i}cost,
      statModifiers{i}, {i}required, {i}promotionRarity, {i}promotionTier, {i}next
    """
    if not d.get(f"{i}name", "").strip():
        return None

    # alt-nomes: pega quaisquer chaves que comecem com f"alt{i}name"
    alt_names = []
    for k, v in d.items():
        if k.lower().startswith(f"alt{i}name".lower()) and v.strip():
            alt_names.append(v.strip())

    level = {
        "name": d.get(f"{i}name", "").strip(),
        "altNames": alt_names,
        "tagid": d.get(f"{i}tagid", "").strip(),
        "effect": strip_links_and_html(d.get(f"{i}effect", "").strip()),
        "cost": d.get(f"{i}cost", "").strip(),
        "required": d.get(f"{i}required", "").strip(),
        "promotionRarity": d.get(f"{i}promotionRarity", "").strip(),
        "promotionTier": d.get(f"{i}promotionTier", "").strip(),
        "next": d.get(f"{i}next", "").strip(),
        "statModifiers": parse_stat_modifiers(d.get(f"statModifiers{i}", "")),
    }
    return level

def collect_levels(d: Dict[str, str], max_levels: int = 10) -> List[Dict[str, Any]]:
    levels: List[Dict[str, Any]] = []
    holes = 0
    for i in range(1, max_levels + 1):
        lv = collect_level(d, i)
        if lv:
            levels.append(lv)
            holes = 0
        else:
            holes += 1
            if holes >= 2 and i > 3:
                break
    return levels

def build_passive_object(pdict: Dict[str, str], fallback_name: str) -> Dict[str, Any]:
    return {
        "Passive": {
            "name": clean_str(pdict.get("name")) or fallback_name,
            "type": clean_str(pdict.get("type")),                 # A/B/C/S/X...
            "exclusive": clean_str(pdict.get("exclusive")),
            "canUseWeapon": extract_inner_args_from_template_value(clean_str(pdict.get("canUseWeapon"))),
            "canUseMove": extract_inner_args_from_template_value(clean_str(pdict.get("canUseMove"))),
            "properties": normalize_properties(clean_str(pdict.get("properties"))),
            "levels": collect_levels(pdict, max_levels=12)
        }
    }

# ---------------- pipeline ----------------
def parse_passive_file(text: str, fallback_name: str) -> Optional[Dict[str, Any]]:
    parsed = mw.parse(text)
    tpl = get_template(parsed, "Passive")
    if not tpl:
        return None
    pdict = params_to_dict(tpl)
    return build_passive_object(pdict, fallback_name)

def main():
    if not os.path.isdir(PASSIVES_DIR):
        raise SystemExit(f"Pasta não encontrada: {PASSIVES_DIR}")

    passives: List[Dict[str, Any]] = []
    files = sorted([f for f in os.listdir(PASSIVES_DIR) if f.endswith(".wiki")], key=str.lower)

    for fname in files:
        path = os.path.join(PASSIVES_DIR, fname)
        try:
            text = pathlib.Path(path).read_text(encoding="utf-8")
        except Exception as e:
            print(f"[skip] erro lendo {fname}: {e}")
            continue

        fallback_name = fname.split("__")[0]
        obj = parse_passive_file(text, fallback_name)
        if obj is None:
            print(f"[skip] sem template {{Passive}}: {fname}")
            continue

        passives.append(obj)
        print(f"[ok] {fname} -> {obj['Passive']['name']} ({len(obj['Passive']['levels'])} nível(is))")

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(passives, f, ensure_ascii=False, indent=2)

    print(f"\nGerado: {OUT_JSON} ({len(passives)} passives)")

if __name__ == "__main__":
    main()
