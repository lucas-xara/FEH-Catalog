# skills_refine.py
# python skills_refine.py

import json, argparse, sys, re, unicodedata

from typing import Any, Dict, Optional, List, Tuple

# Mapa comum de tipos (ajuste se seu dump usar outra codificação)
TYPE_MAP = {
    0: "Weapon", 1: "Assist", 2: "Special", 3: "Passive A", 4: "Passive B", 5: "Passive C", 6: "Sacred Seal"
}

# Chaves possíveis no dump para nome e "id de nome"
POSSIBLE_NAME_KEYS = ["name", "m", "title"]
POSSIBLE_NAME_ID_KEYS = ["name_id", "msid", "id_tag", "mid", "msid_name", "msidName"]

def load_json(path: str) -> Any:
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[erro] arquivo não encontrado: {path}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[erro] lendo {path}: {e}", file=sys.stderr)
        return None

def sanitize(s: Optional[str]) -> Optional[str]:
    if s is None: return None
    s = str(s).strip()
    if s in {"——", "—", "--", "???", "??"}:
        return None
    return s

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text

def coalesce(d: Dict[str, Any], keys: List[str], default=None):
    for k in keys:
        if isinstance(d, dict) and k in d and d[k] not in (None, ""):
            return d[k]
    return default

def normalize_type(raw_type: Any) -> str:
    if isinstance(raw_type, int):
        return TYPE_MAP.get(raw_type, f"Unknown({raw_type})")
    if isinstance(raw_type, str):
        return raw_type
    return "Unknown"

def build_lang_index(lang_obj: Any) -> Dict[str, str]:
    """
    unitlanguages-USEN.json costuma ser um dict flat:
      {"MSID_...": "Petal Parasol+", "MPID_...": "Byleth", ...}
    Aqui filtramos apenas MSID_* (skills/weapons/specials/assists).
    """
    if not isinstance(lang_obj, dict):
        return {}
    out = {}
    for k, v in lang_obj.items():
        if isinstance(k, str) and k.startswith("MSID_") and isinstance(v, str):
            out[k] = v
    return out

def looks_like_msid(s: str) -> bool:
    return isinstance(s, str) and s.startswith("MSID_")

def resolve_skill_name(skill: Dict[str, Any], lang_index: Dict[str, str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Retorna (display_name, msid_used)
    - Usa nome direto (string) se presente
    - Se vier um ID (ex.: name_id / msid / "MSID_*"), faz lookup no lang_index
    """
    # 1) nome direto (string ou dict por idioma)
    raw_name = coalesce(skill, POSSIBLE_NAME_KEYS, None)
    if isinstance(raw_name, dict):
        raw_name = raw_name.get("USEN") or next(iter(raw_name.values()), None)

    if isinstance(raw_name, str) and raw_name and not looks_like_msid(raw_name):
        return sanitize(raw_name), None

    # 2) procurar explicitamente um campo com MSID
    for k in POSSIBLE_NAME_ID_KEYS:
        v = skill.get(k)
        if isinstance(v, str) and v:
            msid = v if looks_like_msid(v) else (("MSID_" + v) if not v.startswith("MSID_") else v)
            if msid in lang_index:
                return sanitize(lang_index[msid]), msid

    # 3) caso o "raw_name" exista e seja um MSID
    if isinstance(raw_name, str) and looks_like_msid(raw_name) and raw_name in lang_index:
        return sanitize(lang_index[raw_name]), raw_name

    # 4) fallback
    return None, None

def simplify_skill(s: Dict[str, Any], lang_index: Dict[str, str], unresolved: List[str]) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Retorna (chave, registro)
    - chave será o id da skill como string (ex.: "12345")
    """
    sid = coalesce(s, ["id", "_id", "sid"], None)
    if sid is None:
        return None

    # normaliza chave para string
    key = str(sid)

    name, msid_used = resolve_skill_name(s, lang_index)
    if name is None:
        probe = coalesce(s, POSSIBLE_NAME_KEYS + POSSIBLE_NAME_ID_KEYS, None)
        if isinstance(probe, str):
            unresolved.append(probe)

    stype = normalize_type(coalesce(s, ["type", "category", "kind", "t"], "Unknown"))

    might = coalesce(s, ["might", "mt", "power"], None)
    rng   = coalesce(s, ["range", "rng"], None)
    cd    = coalesce(s, ["cooldown", "cd"], None)
    sp    = coalesce(s, ["sp", "spCost", "cost_sp"], None)
    exclusive = bool(coalesce(s, ["exclusive", "isExclusive", "ex"], False))

    # Restrições (ajuste se seu dump usar outra estrutura)
    restrictions = {}
    r = s.get("restrictions") or s.get("reqs") or {}
    for k in ("move", "weapon", "color"):
        val = r.get(k)
        if isinstance(val, list) and val:
            restrictions[k] = sorted(set(map(str, val)))
        elif isinstance(val, str) and val:
            restrictions[k] = [val]
    if not restrictions:
        restrictions = None

    # Pré-requisitos e upgrades (se houver)
    requires = s.get("requires") or s.get("prereq") or None
    upgrades = s.get("upgrades") or s.get("next") or None

    # Descrição (se existir no dump)
    desc = coalesce(s, ["desc", "description", "info", "help"], None)
    if isinstance(desc, dict):
        desc = desc.get("USEN") or next(iter(desc.values()), None)
    desc = sanitize(desc)

    out: Dict[str, Any] = {
        "id": sid,
        "slug": slugify(name) if name else key,
        "name": name,
        "type": stype,
        "sp": sp,
        "might": might,
        "range": rng,
        "cooldown": cd,
        "exclusive": exclusive,
        "restrictions": restrictions,
        "requires": requires,
        "upgrades": upgrades,
        "desc": desc,
    }

    if msid_used:
        out["name_msid"] = msid_used

    # remove None
    out = {k: v for k, v in out.items() if v is not None}
    return key, out

def main():
    ap = argparse.ArgumentParser(description="Gera JSON simplificado de skills a partir dos dumps FEH.")
    ap.add_argument("--skills",   default="./onlineskills.json")
    ap.add_argument("--langEN",   default="./unitlanguages-USEN.json")  # <- resolve MSID_* para nomes
    ap.add_argument("--out",      default="./skills_simplified.json")
    ap.add_argument("--summary",  default="./skills_simplified_summary.json")
    args = ap.parse_args()

    raw_skills = load_json(args.skills)
    raw_lang   = load_json(args.langEN)

    if raw_skills is None or raw_lang is None:
        print("[erro] não foi possível carregar os dumps necessários.", file=sys.stderr)
        sys.exit(1)

    lang_index = build_lang_index(raw_lang)

    # Alguns dumps vêm como lista; outros, como {"skills": [...]} ou {"data": [...]}
    skills_list = []
    if isinstance(raw_skills, list):
        skills_list = raw_skills
    elif isinstance(raw_skills, dict):
        skills_list = raw_skills.get("skills") or raw_skills.get("data") or []
    else:
        print("[erro] formato inesperado em onlineskills.json", file=sys.stderr)
        sys.exit(1)

    out: Dict[str, Any] = {}
    counts = {
        "total": 0,
        "with_name": 0,
        "with_sp": 0,
        "weapons": 0,
        "assists": 0,
        "specials": 0,
        "passive_a": 0,
        "passive_b": 0,
        "passive_c": 0,
        "seals": 0,
    }
    unresolved: List[str] = []

    for s in skills_list:
        simp = simplify_skill(s, lang_index, unresolved)
        if not simp:
            continue
        key, rec = simp
        out[key] = rec

        counts["total"] += 1
        if rec.get("name"): counts["with_name"] += 1
        if rec.get("sp") is not None: counts["with_sp"] += 1

        typ = rec.get("type")
        if   typ == "Weapon":     counts["weapons"] += 1
        elif typ == "Assist":     counts["assists"] += 1
        elif typ == "Special":    counts["specials"] += 1
        elif typ == "Passive A":  counts["passive_a"] += 1
        elif typ == "Passive B":  counts["passive_b"] += 1
        elif typ == "Passive C":  counts["passive_c"] += 1
        elif typ == "Sacred Seal":counts["seals"] += 1

    # grava saídas
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    with open(args.summary, "w", encoding="utf-8") as f:
        json.dump(counts, f, ensure_ascii=False, indent=2)

    print(f"OK -> {args.out} ({counts['total']} skills)")
    print("  por tipo: "
          f"Wpn={counts['weapons']} | Ast={counts['assists']} | Spc={counts['specials']} | "
          f"A={counts['passive_a']} | B={counts['passive_b']} | C={counts['passive_c']} | Seal={counts['seals']}")
    print(f"  nomes resolvidos: {counts['with_name']} | com SP: {counts['with_sp']}")
    print(f"Resumo -> {args.summary}")

    if unresolved:
        # mostra só alguns exemplos para não poluir o console
        sample = ", ".join(list(dict.fromkeys(unresolved))[:15])
        print(f"[aviso] nomes não resolvidos via language (exemplos): {sample}", file=sys.stderr)

if __name__ == "__main__":
    main()
