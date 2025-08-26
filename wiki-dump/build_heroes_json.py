# build_heroes_json.py
# Lê .wiki de feh_wiki_dump/Heroes/pages e gera heroes-list.json no formato solicitado.
# Requer: pip install mwparserfromhell

import os
import json
import pathlib
import re
from typing import Any, Dict, List, Optional
import mwparserfromhell as mw

BASE_DIR = os.path.dirname(__file__)
HERO_PAGES_DIR = os.path.join(BASE_DIR, "feh_wiki_dump", "Heroes", "pages")
OUT_JSON = os.path.join(BASE_DIR, "heroes-list.json")

# ---------- helpers de conversão ----------
def to_int(s: Optional[str]) -> Optional[int]:
    if s is None:
        return None
    s = str(s).strip()
    if s == "":
        return None
    try:
        return int(s)
    except ValueError:
        # extrai primeiro inteiro contínuo
        m = re.search(r"\d+", s)
        return int(m.group(0)) if m else None

def clean_str(s: Optional[str]) -> str:
    return (str(s).strip() if s is not None else "")

def tpl_name(tpl) -> str:
    return str(tpl.name).strip().lower()

def params_to_dict(tpl) -> Dict[str, str]:
    d: Dict[str, str] = {}
    for p in tpl.params:
        key = str(p.name).strip()
        val = str(p.value).strip()
        d[key] = val
    return d

def get_template(parsed, wanted_name: str):
    wl = wanted_name.strip().lower()
    for tpl in parsed.filter_templates():
        if tpl_name(tpl) == wl:
            return tpl
    return None

def collect_names(d: Dict[str, str], base: str, max_slots: int = 80) -> List[str]:
    """
    Coleta apenas os nomes: base1, base2, base3...
    Retorna lista de strings (sem Default/Unlock).
    """
    items: List[str] = []
    holes = 0
    for i in range(1, max_slots + 1):
        key = f"{base}{i}"
        name = d.get(key, "").strip()
        if name:
            items.append(name)
            holes = 0
        else:
            holes += 1
            # para não truncar cedo por pequenos buracos, paramos após 4 vazios consecutivos
            if holes >= 4 and i > 4:
                break
    return items

def normalize_pool_rarities(raw: Optional[str]) -> Any:
    """
    Regra solicitada:
      - se for '3' OU indicar 3-4 (ex.: '3-4', '3~4', '3,4', '3 4'), retorna string "3, 4"
      - caso contrário, retorna int quando possível (ex.: '5' -> 5), senão string limpa
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if s == "":
        return None
    s_simple = re.sub(r"\s+", "", s)
    # marca casos de 3 e 4 juntos
    if s_simple in {"3-4", "3~4", "3,4", "34", "3/4"} or re.fullmatch(r"3[\s,~/-]*4", s, flags=re.I):
        return "3, 4"
    # se for exatamente 3 -> força "3, 4"
    if s_simple == "3":
        return "3, 4"
    # tenta int para demais casos (ex.: 4, 5)
    i = to_int(s)
    return i if i is not None else s

def normalize_properties(props: str) -> str:
    """
    Remove '_' e dígitos SOMENTE de tags 'specRate_*' e 'demoted_*'.
    Mantém as demais tags como estão (apenas trim).
    Entrada comum: lista separada por vírgulas/pipe/espaço.
    """
    if not props:
        return ""
    # separa por vírgula ou pipe; se não houver, quebra por espaço
    raw_tokens = re.split(r"[,\|]", props) if ("," in props or "|" in props) else props.split()
    tokens: List[str] = []
    for t in raw_tokens:
        tok = t.strip()
        if not tok:
            continue
        # normaliza apenas specRate_123 e demoted_123
        tok = re.sub(r"(?i)\b(specRate|demoted)[_\d]*\b", lambda m: m.group(1), tok)
        tokens.append(tok)
    # remove duplicatas preservando ordem
    seen = set()
    out = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return ", ".join(out)

# ---------- formato base ----------
def empty_hero() -> Dict[str, Any]:
    return {
        "infobox": {
            "Name": "",
            "Title": "",
            "WeaponType": "",
            "MoveType": "",
            "Origin": "",
            "releaseDate": "",
            "poolRarities": None,
            "Properties": "",
            "LegendaryEffect": "",
            "MythicEffect": "",
            "BoostHP": None,
            "BoostSpd": None,
            "emblemEffect": "",
            "secondPerson": "",
            "harmonized": "",
            "duo": ""
            
        },
        "stats": {
            "Lv1": {"HP": None, "ATK": None, "SPD": None, "DEF": None, "RES": None},
            "GrowthRates": {"HP": None, "ATK": None, "SPD": None, "DEF": None, "RES": None}
        },
        "weapons": [],
        "assists": [],
        "specials": [],
        "passives": {
            "A": [],
            "B": [],
            "C": [],
            "X": []
        }
    }

# ---------- extração por arquivo ----------
def parse_hero_wikitext(wikitext: str) -> Optional[Dict[str, Any]]:
    parsed = mw.parse(wikitext)

    # precisa ter o template Hero Infobox; senão, ignoramos a página
    infobox_tpl = get_template(parsed, "Hero Infobox")
    if not infobox_tpl:
        return None

    hero = empty_hero()

    # --- Infobox ---
    ib = params_to_dict(infobox_tpl)
    hero["infobox"]["Name"] = clean_str(ib.get("Name"))
    hero["infobox"]["Title"] = clean_str(ib.get("Title"))
    hero["infobox"]["WeaponType"] = clean_str(ib.get("WeaponType"))
    hero["infobox"]["MoveType"] = clean_str(ib.get("MoveType"))
    hero["infobox"]["Origin"] = clean_str(ib.get("Origin"))
    hero["infobox"]["releaseDate"] = clean_str(ib.get("releaseDate"))
    hero["infobox"]["poolRarities"] = normalize_pool_rarities(ib.get("poolRarities"))
    hero["infobox"]["Properties"] = normalize_properties(clean_str(ib.get("Properties")))
    hero["infobox"]["LegendaryEffect"] = clean_str(ib.get("LegendaryEffect"))
    hero["infobox"]["MythicEffect"] = clean_str(ib.get("MythicEffect"))
    hero["infobox"]["BoostHP"] = to_int(ib.get("BoostHP"))
    hero["infobox"]["BoostSpd"] = to_int(ib.get("BoostSpd"))
    hero["infobox"]["emblemEffect"] = clean_str(ib.get("emblemEffect"))
    hero["infobox"]["secondPerson"] = clean_str(ib.get("secondPerson"))
    hero["infobox"]["harmonized"] = clean_str(ib.get("harmonized"))
    hero["infobox"]["duo"] = clean_str(ib.get("duo"))

    # --- Stats Page ---
    stats_tpl = get_template(parsed, "Stats Page")
    if stats_tpl:
        s = params_to_dict(stats_tpl)
        hero["stats"]["Lv1"]["HP"]  = to_int(s.get("Lv1HP"))
        hero["stats"]["Lv1"]["ATK"] = to_int(s.get("Lv1ATK"))
        hero["stats"]["Lv1"]["SPD"] = to_int(s.get("Lv1SPD"))
        hero["stats"]["Lv1"]["DEF"] = to_int(s.get("Lv1DEF"))
        hero["stats"]["Lv1"]["RES"] = to_int(s.get("Lv1RES"))
        hero["stats"]["GrowthRates"]["HP"]  = to_int(s.get("GRHP"))
        hero["stats"]["GrowthRates"]["ATK"] = to_int(s.get("GRATK"))
        hero["stats"]["GrowthRates"]["SPD"] = to_int(s.get("GRSPD"))
        hero["stats"]["GrowthRates"]["DEF"] = to_int(s.get("GRDEF"))
        hero["stats"]["GrowthRates"]["RES"] = to_int(s.get("GRRES"))

    # --- Weapons / Assists / Specials: apenas nomes ---
    w_tpl = get_template(parsed, "Weapons Table")
    if w_tpl:
        w = params_to_dict(w_tpl)
        hero["weapons"] = collect_names(w, "weapon", max_slots=120)

    a_tpl = get_template(parsed, "Assists Table")
    if a_tpl:
        a = params_to_dict(a_tpl)
        hero["assists"] = collect_names(a, "assist", max_slots=120)

    s_tpl = get_template(parsed, "Specials Table")
    if s_tpl:
        sp = params_to_dict(s_tpl)
        hero["specials"] = collect_names(sp, "special", max_slots=120)

    # --- Passives: interpretar "skills" como passives (A/B/C/X) -> apenas nomes ---
    p_tpl = get_template(parsed, "Passives Table")
    if p_tpl:
        p = params_to_dict(p_tpl)
        for letter in ("A", "B", "C", "X"):
            # coleta apenas os nomes (passiveA1, passiveA2, ...)
            names = collect_names({k.replace(f"passive{letter}", "item"): v
                                   for k, v in p.items() if k.startswith(f"passive{letter}") and not k.startswith(f"passive{letter}Unlock")},
                                  "item",
                                  max_slots=60)
            hero["passives"][letter] = names

    return hero

def main():
    if not os.path.isdir(HERO_PAGES_DIR):
        raise SystemExit(f"Pasta não encontrada: {HERO_PAGES_DIR}")

    heroes: List[Dict[str, Any]] = []
    files = [f for f in os.listdir(HERO_PAGES_DIR) if f.endswith(".wiki")]
    files.sort(key=str.lower)

    for fname in files:
        path = os.path.join(HERO_PAGES_DIR, fname)
        try:
            text = pathlib.Path(path).read_text(encoding="utf-8")
        except Exception as e:
            print(f"[skip] erro lendo {fname}: {e}")
            continue

        hero = parse_hero_wikitext(text)
        if hero is None:
            continue

        # fallback de nome caso vazio
        if not hero["infobox"]["Name"]:
            hero["infobox"]["Name"] = fname.split("__")[0]

        heroes.append(hero)
        print(f"[ok] {fname} -> {hero['infobox']['Name']}")

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(heroes, f, ensure_ascii=False, indent=2)

    print(f"\nGerado: {OUT_JSON} ({len(heroes)} heróis)")

if __name__ == "__main__":
    main()
