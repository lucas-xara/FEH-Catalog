# build_assists_json.py
# Gera assists-list.json a partir dos .wiki em feh_wiki_dump/Skills/pages/Assists
# Requer: pip install mwparserfromhell

import os
import json
import pathlib
import re
from typing import Dict, Any, List, Optional
import mwparserfromhell as mw

BASE_DIR = os.path.dirname(__file__)
ASSISTS_DIR = os.path.join(BASE_DIR, "feh_wiki_dump", "Skills", "pages", "Assists")
OUT_JSON = os.path.join(BASE_DIR, "assists-list.json")

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

def strip_links(text: str) -> str:
    # [[x|y]] -> y ; [[x]] -> x ; remove '''bold''' e ''italic''
    if not text:
        return ""
    text = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = text.replace("'''", "").replace("''", "")
    return text.strip()

def extract_inner_args_from_template_value(val: str, allowed=("movelist","weaponlist")) -> str:
    """
    "{{MoveList|all}}"            -> "all"
    "{{WeaponList|exclude=Staff}}"-> "exclude=Staff"
    "Close"                       -> "Close"
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

def normalize_properties(props: str) -> str:
    """Converte listas separadas por vírgula/pipe em string 'a, b, c'."""
    if not props:
        return ""
    tokens = re.split(r"[,\|]", props)
    toks = [t.strip() for t in tokens if t.strip()]
    # remove duplicatas preservando ordem
    seen, out = set(), []
    for t in toks:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return ", ".join(out)

def build_assist_object(sdict: Dict[str, str], fallback_name: str) -> Dict[str, Any]:
    return {
        "Assist": {
            "name": clean_str(sdict.get("name")) or fallback_name,
            "exclusive": clean_str(sdict.get("exclusive")),
            "canUseWeapon": extract_inner_args_from_template_value(clean_str(sdict.get("canUseWeapon"))),
            "canUseMove": extract_inner_args_from_template_value(clean_str(sdict.get("canUseMove"))),
            "cost": clean_str(sdict.get("cost")),
            "range": clean_str(sdict.get("range")),
            "effect": strip_links(clean_str(sdict.get("effect"))),
            "required": clean_str(sdict.get("required")),
            "properties": normalize_properties(clean_str(sdict.get("properties")))
        }
    }

# ---------------- pipeline ----------------
def parse_assist_file(text: str, fallback_name: str) -> Optional[Dict[str, Any]]:
    parsed = mw.parse(text)
    tpl = get_template(parsed, "Assist")
    if not tpl:
        return None
    sdict = params_to_dict(tpl)
    return build_assist_object(sdict, fallback_name)

def main():
    if not os.path.isdir(ASSISTS_DIR):
        raise SystemExit(f"Pasta não encontrada: {ASSISTS_DIR}")

    assists: List[Dict[str, Any]] = []
    files = sorted([f for f in os.listdir(ASSISTS_DIR) if f.endswith(".wiki")], key=str.lower)

    for fname in files:
        path = os.path.join(ASSISTS_DIR, fname)
        try:
            text = pathlib.Path(path).read_text(encoding="utf-8")
        except Exception as e:
            print(f"[skip] erro lendo {fname}: {e}")
            continue

        fallback_name = fname.split("__")[0]
        obj = parse_assist_file(text, fallback_name)
        if obj is None:
            print(f"[skip] sem template {{Assist}}: {fname}")
            continue

        assists.append(obj)
        print(f"[ok] {fname} -> {obj['Assist']['name']}")

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(assists, f, ensure_ascii=False, indent=2)

    print(f"\nGerado: {OUT_JSON} ({len(assists)} assists)")

if __name__ == "__main__":
    main()
