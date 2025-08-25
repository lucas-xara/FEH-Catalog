# build_specials_json.py
# Gera specials-list.json a partir dos .wiki em feh_wiki_dump/Skills/pages/Specials
# Requer: pip install mwparserfromhell

import os
import json
import pathlib
import re
from typing import Dict, Any, List, Optional
import mwparserfromhell as mw

BASE_DIR = os.path.dirname(__file__)
SPECIALS_DIR = os.path.join(BASE_DIR, "feh_wiki_dump", "Skills", "pages", "Specials")
OUT_JSON = os.path.join(BASE_DIR, "specials-list.json")

# ------------- helpers -------------
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
    # [[x|y]] -> y ; [[x]] -> x
    # remove '''bold'''/''italic''
    if not text:
        return ""
    text = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = text.replace("'''", "").replace("''", "")
    return text.strip()

def extract_inner_args_from_template_value(val: str, allowed=("movelist","weaponlist")) -> str:
    """
    Converte "{{MoveList|all}}" -> "all"
             "{{WeaponList|exclude=Staff}}" -> "exclude=Staff"
             "Close" -> "Close"
    Mantém como string limpa quando não for template suportado.
    """
    if not val:
        return ""
    parsed = mw.parse(val)
    tmpls = [t for t in parsed.filter_templates() if tpl_name(t) in allowed]
    if not tmpls:
        # não é template esperado; devolve texto sem chaves
        return val.strip().strip("{} ").strip()
    t = tmpls[0]
    # monta args: posicionais e/ou nomeados
    if len(t.params) == 0:
        return ""
    parts: List[str] = []
    for p in t.params:
        name = str(p.name).strip()
        value = str(p.value).strip()
        if name.isdigit():
            parts.append(value)
        else:
            parts.append(f"{name}={value}")
    return ", ".join(parts)

def build_special_object(sdict: Dict[str, str], fallback_name: str) -> Dict[str, Any]:
    name = clean_str(sdict.get("name")) or fallback_name
    charge = clean_str(sdict.get("charge"))
    effect = strip_links(clean_str(sdict.get("effect")))
    cost = clean_str(sdict.get("cost"))
    required = clean_str(sdict.get("required"))
    exclusive = clean_str(sdict.get("exclusive"))
    can_use_move = extract_inner_args_from_template_value(clean_str(sdict.get("canUseMove")))
    can_use_weapon = extract_inner_args_from_template_value(clean_str(sdict.get("canUseWeapon")))
    properties = ", ".join([tok.strip() for tok in re.split(r"[,\|]", clean_str(sdict.get("properties"))) if tok.strip()])

    return {
        "Special": {
            "Name": name,
            "Charge": charge,
            "Effect": effect,
            "Cost": cost,
            "Required": required,
            "Exclusive": exclusive,
            "CanUseMove": can_use_move,
            "CanUseWeapon": can_use_weapon,
            "Properties": properties
        }
    }

# ------------- pipeline -------------
def parse_special_file(text: str, fallback_name: str) -> Optional[Dict[str, Any]]:
    parsed = mw.parse(text)
    spec = get_template(parsed, "Special")
    if not spec:
        return None
    sdict = params_to_dict(spec)
    return build_special_object(sdict, fallback_name)

def main():
    if not os.path.isdir(SPECIALS_DIR):
        raise SystemExit(f"Pasta não encontrada: {SPECIALS_DIR}")

    specials: List[Dict[str, Any]] = []
    files = sorted([f for f in os.listdir(SPECIALS_DIR) if f.endswith(".wiki")], key=str.lower)

    for fname in files:
        path = os.path.join(SPECIALS_DIR, fname)
        try:
            text = pathlib.Path(path).read_text(encoding="utf-8")
        except Exception as e:
            print(f"[skip] erro lendo {fname}: {e}")
            continue

        fallback_name = fname.split("__")[0]  # usa título do arquivo se não houver |name=
        obj = parse_special_file(text, fallback_name)
        if obj is None:
            print(f"[skip] sem template {{Special}}: {fname}")
            continue

        specials.append(obj)
        print(f"[ok] {fname} -> {obj['Special']['Name']}")

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(specials, f, ensure_ascii=False, indent=2)

    print(f"\nGerado: {OUT_JSON} ({len(specials)} specials)")

if __name__ == "__main__":
    main()
