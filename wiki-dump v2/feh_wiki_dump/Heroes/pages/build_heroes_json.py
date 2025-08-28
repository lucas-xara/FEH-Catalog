#!/usr/bin/env python3
# build_heroes_json.py
# Gera heroes-list.json a partir de arquivos .wiki (na mesma pasta).
# Inclui:
# - filtro de Properties (tags permitidas)
# - cálculo de version a partir do releaseDate
# - cálculo de dragonflowersCap pelas regras de thresholds + exceção Infantry<=3.1
# - detecção de Theme a partir de [[Category: ...]] (última linha do .wiki)
#
# Requer: pip install mwparserfromhell

import os
import json
import pathlib
import re
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime, timezone
import mwparserfromhell as mw

BASE_DIR = os.path.dirname(__file__)
HERO_PAGES_DIR = BASE_DIR
OUT_JSON = os.path.join(BASE_DIR, "heroes-list.json")

# ---------- lista de tags permitidas ----------
ALLOWED_PROPERTIES = {
    "aided","ascended","attuned","brave","duo","emblem","fallen","ghb",
    "harmonized","legendary","mythic","rearmed","refresher","resplendent",
    "special","specRate","tempest"
}

ALLOWED_PROPERTIES_LOW = {t.lower() for t in ALLOWED_PROPERTIES}

def normalize_properties(props: str) -> str:
    if not props:
        return ""
    raw_tokens = re.split(r"[,\|]", props) if ("," in props or "|" in props) else props.split()
    tokens: List[str] = []
    for t in raw_tokens:
        tok = t.strip()
        if not tok:
            continue
        # normaliza apenas specRate_123 e demoted_123 (demoted vira só 'demoted' e será filtrado depois)
        tok = re.sub(r"(?i)\b(specRate|demoted)[_\d]*\b", lambda m: m.group(1), tok)
        low = tok.lower()
        if low in ALLOWED_PROPERTIES_LOW:
            tokens.append(low)
    seen = set()
    out = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return ", ".join(out)

# ---------- Mapeamento de Category -> Theme ----------
CATEGORY_THEME_MAP: Dict[str, str] = {
    "Bridal Festival units": "bridal",
    "Childhood units": "young",
    "Christmas units": "winter",
    "Dance Festival units": "dance",
    "Day of Devotion units": "valentine",
    "Day of the Twelve units": "scion",
    "Desert Festival units": "desert",
    "Festival of Flames units": "flameTribe",
    "Halloween units": "halloween",
    "Hoshidan Summer Festival units": "hSummer",
    "Hot Springs units": "hotSprings",
    "New Year's units": "newYear",
    "Ninja Festival units": "ninja",
    "Picnic units": "picnic",
    "Pirate Festival units": "pirate",
    "Snow-and-Ice Festival units": "iceTribe",
    "Spring Festival units": "spring",
    "Summer units": "summer",
    "Tea Party units": "tea",
    "Thief Festival units": "thief",
    "Wind Festival units": "windTribe",
}

_CATEGORY_RE = re.compile(r"\[\[\s*Category\s*:\s*(.+?)\s*\]\]", re.I)

def detect_theme_from_wikitext(wikitext: str) -> Optional[str]:
    """Tenta ler a última linha como [[Category: ...]]; se falhar, procura por qualquer Category no texto (de trás pra frente)."""
    # 1) última linha não vazia
    for line in reversed(wikitext.splitlines()):
        line = line.strip()
        if not line:
            continue
        m = _CATEGORY_RE.fullmatch(line)
        if m:
            cat = m.group(1).strip()
            return CATEGORY_THEME_MAP.get(cat)
        break  # última linha existe mas não é Category; tenta fallback

    # 2) fallback: procurar todas as categorias e checar de trás pra frente
    cats = _CATEGORY_RE.findall(wikitext)
    for cat in reversed(cats):
        key = cat.strip()
        if key in CATEGORY_THEME_MAP:
            return CATEGORY_THEME_MAP[key]
    return None

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
            if holes >= 4 and i > 4:
                break
    return items

def normalize_pool_rarities(raw: Optional[str]) -> Any:
    if raw is None:
        return None
    s = str(raw).strip()
    if s == "":
        return None
    s_simple = re.sub(r"\s+", "", s)
    if s_simple in {"3-4","3~4","3,4","34","3/4"} or re.fullmatch(r"3[\s,~/-]*4", s, flags=re.I):
        return "3, 4"
    if s_simple == "3":
        return "3, 4"
    i = to_int(s)
    return i if i is not None else s

# ---------- formato base ----------
def empty_hero() -> Dict[str, Any]:
    return {
        "infobox": {
            "Name": "","Title": "","WeaponType": "","MoveType": "","Origin": "",
            "releaseDate": "","poolRarities": None,"Properties": "",
            "LegendaryEffect": "","MythicEffect": "","BoostHP": None,"BoostSpd": None,
            "emblemEffect": "","secondPerson": "","harmonized": "","duo": ""
        },
        "stats": {
            "Lv1": {"HP": None,"ATK": None,"SPD": None,"DEF": None,"RES": None},
            "GrowthRates": {"HP": None,"ATK": None,"SPD": None,"DEF": None,"RES": None}
        },
        "weapons": [],"assists": [],"specials": [],
        "passives": {"A": [],"B": [],"C": [],"X": []},
        "Theme": ""  # novo campo
    }

# ---------- extração por arquivo ----------
def parse_hero_wikitext(wikitext: str) -> Optional[Dict[str, Any]]:
    parsed = mw.parse(wikitext)
    infobox_tpl = get_template(parsed, "Hero Infobox")
    if not infobox_tpl:
        return None
    hero = empty_hero()
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

    p_tpl = get_template(parsed, "Passives Table")
    if p_tpl:
        p = params_to_dict(p_tpl)
        for letter in ("A", "B", "C", "X"):
            names = collect_names({k.replace(f"passive{letter}", "item"): v
                                   for k, v in p.items() if k.startswith(f"passive{letter}") and not k.startswith(f"passive{letter}Unlock")},
                                  "item", max_slots=60)
            hero["passives"][letter] = names

    # --- Theme via Category ---
    theme = detect_theme_from_wikitext(wikitext)
    if theme:
        hero["Theme"] = theme

    return hero

# ---------- versão + dragonflowers ----------
_SLASH_DATE_RE = re.compile(r"^\s*(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})\s*$")
VERSION_MAP_2017 = {1:"1.0",2:"1.0",3:"1.1",4:"1.2",5:"1.3",6:"1.4",7:"1.5",8:"1.6",9:"1.7",10:"1.8",11:"2.0",12:"2.0"}

def parse_release_date_any(s: str) -> datetime:
    s = s.strip()
    if s.endswith("Z"): s = s[:-1] + "+00:00"
    s_iso = s
    if len(s)==7 and s[4]=="-": s_iso=s+"-01"
    elif len(s)==4 and s.isdigit(): s_iso=s+"-01-01"
    try: return datetime.fromisoformat(s_iso).replace(tzinfo=timezone.utc)
    except: pass
    for fmt in ("%B %d, %Y","%b %d, %Y","%B %d %Y","%b %d %Y"):
        try: return datetime.strptime(s,fmt).replace(tzinfo=timezone.utc)
        except: pass
    m=_SLASH_DATE_RE.match(s)
    if m:
        mm,dd,yy=int(m[1]),int(m[2]),m[3]
        yyyy=2000+int(yy) if len(yy)==2 else int(yy)
        return datetime(yyyy,mm,dd,tzinfo=timezone.utc)
    try: return datetime.strptime(s[:10],"%Y-%m-%d").replace(tzinfo=timezone.utc)
    except: raise

def compute_version_from_date(dt: datetime) -> str:
    y,m=dt.year,dt.month
    if y>=2018:
        if m==12: return f"{y-2015}.0"
        return f"{y-2016}.{m}"
    elif y==2017: return VERSION_MAP_2017.get(m,"1.0")
    return "1.0"

def parse_version_tuple(v: str)->Tuple[int,int]:
    try: a,b=v.split("."); return int(a),int(b)
    except: return (0,0)

MOVE_MAP_NUM={0:"Infantry",1:"Armor",2:"Cavalry",3:"Flying"}

def normalize_move_str(val: Any)->Optional[str]:
    if isinstance(val,int): return MOVE_MAP_NUM.get(val)
    if isinstance(val,str):
        low=val.strip().lower()
        if low in ("infantry","inf","foot"): return "Infantry"
        if low in ("armor","armored","armour"): return "Armor"
        if low in ("cavalry","cav"): return "Cavalry"
        if low in ("flying","flyer","flier"): return "Flying"
    return None

def detect_move(hero: Dict[str,Any])->Optional[str]:
    ib=hero.get("infobox")
    if isinstance(ib,dict) and "MoveType" in ib:
        m=normalize_move_str(ib.get("MoveType"))
        if m: return m
    return None

THRESHOLDS=[(2025,9,5),(2024,9,10),(2023,9,15),(2022,9,20),(2021,9,25),(2020,9,30),(2019,9,35)]

def ym_key(dt: datetime)->int: return dt.year*100+dt.month

def compute_df_cap(dt: datetime,version:str,move:Optional[str])->int:
    ymk=ym_key(dt)
    for (y,m,cap) in THRESHOLDS:
        if ymk>=y*100+m: return cap
    if move=="Infantry":
        maj,minr=parse_version_tuple(version)
        if maj<3 or (maj==3 and minr<=1): return 40
    return 35

# ---------- main ----------
def main():
    files=[f for f in os.listdir(HERO_PAGES_DIR) if f.endswith(".wiki")]
    if not files: raise SystemExit("Nenhum .wiki encontrado.")
    files.sort(key=str.lower)
    heroes: List[Dict[str, Any]]=[]
    for fname in files:
        path=os.path.join(HERO_PAGES_DIR,fname)
        try: text=pathlib.Path(path).read_text(encoding="utf-8")
        except Exception as e:
            print(f"[skip] erro lendo {fname}: {e}"); continue
        hero=parse_hero_wikitext(text)
        if hero is None: continue
        if not hero["infobox"]["Name"]:
            hero["infobox"]["Name"]=fname.split("__")[0]
        # calcula version/dragonflowers
        rd=hero["infobox"].get("releaseDate")
        if rd:
            try:
                dt=parse_release_date_any(rd)
                v=compute_version_from_date(dt)
                hero["version"]=v
                move=detect_move(hero)
                hero["dragonflowersCap"]=compute_df_cap(dt,v,move)
            except Exception as e:
                hero["_warnings"]=[f"invalid_releaseDate: {rd}"]
        heroes.append(hero)
        print(f"[ok] {fname} -> {hero['infobox']['Name']} (Theme={hero.get('Theme','') or '-'})")
    with open(OUT_JSON,"w",encoding="utf-8") as f:
        json.dump(heroes,f,ensure_ascii=False,indent=2)
    print(f"\nGerado: {OUT_JSON} ({len(heroes)} heróis)")

if __name__=="__main__":
    main()
