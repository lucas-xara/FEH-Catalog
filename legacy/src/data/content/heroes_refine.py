# build_simplified.py
# python build_simplified.py --out units_simplified.json

import json, argparse, os, sys
from typing import Dict, Any, List, Optional

MOVE_MAP = {0: "Infantry", 1: "Armor", 2: "Cavalry", 3: "Flying"}

def load_json(path: str) -> Dict[str, Any]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[erro] arquivo não encontrado: {path}", file=sys.stderr)
        return {}
    except Exception as e:
        print(f"[erro] lendo {path}: {e}", file=sys.stderr)
        return {}

def arr_to_obj(arr: Optional[List[int]]) -> Optional[Dict[str, int]]:
    if not arr or len(arr) < 5:
        return None
    keys = ["hp", "atk", "spd", "def", "res"]
    return {k: int(arr[i]) for i, k in enumerate(keys)}

def as_set(lst: Optional[List[str]]) -> set:
    return set(lst or [])

def sanitize(s: Optional[str]) -> Optional[str]:
    if s is None: return None
    s = str(s).strip()
    if s in {"——", "—", "--", "???", "??"}:
        return None
    return s

def resolve_lang(pid: str, langEN: Dict[str, Any]) -> Dict[str, Optional[str]]:
    suffix = pid[4:] if pid.startswith("PID_") else pid
    name = sanitize(langEN.get(f"MPID_{suffix}"))
    epithet = sanitize(langEN.get(f"MPID_HONOR_{suffix}"))
    return {"name": name, "epithet": epithet}

def main():
    ap = argparse.ArgumentParser(description="Gera JSON simplificado a partir dos dumps FEH.")
    ap.add_argument("--units",     default="./onlineunits.json")
    ap.add_argument("--other",     default="./onlineother.json")
    ap.add_argument("--skeleton",  default="./skeletonunits.json")
    ap.add_argument("--langEN",    default="./summonlanguages-USEN.json")
    ap.add_argument("--fullunits", default="./fullunits.json")  # <--- novo argumento
    ap.add_argument("--out",       default="./units_simplified.json")
    ap.add_argument("--summary",   default="./units_simplified_summary.json")
    args = ap.parse_args()

    online_units  = load_json(args.units)
    online_other  = load_json(args.other)
    # pega apenas chaves PID_ do skeleton; EID_ será ignorado novamente no loop por segurança
    raw_keys      = list(load_json(args.skeleton).keys())
    skeleton_pids = [k for k in raw_keys if k.startswith("PID_")]
    lang_en       = load_json(args.langEN)
    full_units    = load_json(args.fullunits)  # <--- carrega fullunits.json

    images = (online_other.get("images") or {})
    wep_icons = images.get("weapontype") or []
    move_icons = images.get("movetype") or []

    flags_sets = {
        "duo":       as_set(online_other.get("duo")),
        "resonant":  as_set(online_other.get("resonant")),
        "ascended":  as_set(online_other.get("ascended")),
        "rearmed":   as_set(online_other.get("rearmed")),
        "attuned":   as_set(online_other.get("attuned")),
        "emblem":    as_set(online_other.get("emblem")),
        "aided":     as_set(online_other.get("aided")),
    }
    blessed_map   = online_other.get("blessed") or {}
    duo_keywords  = online_other.get("duokeywords") or {}

    out: Dict[str, Any] = {}
    counts = {"total": 0, "with_name": 0, "with_epithet": 0, "with_stats": 0}

    for pid in skeleton_pids:
        # segurança extra: ignorar quaisquer EID_ que eventualmente apareçam
        if pid.startswith("EID_"):
            continue

        counts["total"] += 1
        core = online_units.get(pid, {})
        full = full_units.get(pid, {})  # <--- fonte para id/origin/resplendent/basekit
        lang = resolve_lang(pid, lang_en)

        stats   = arr_to_obj(core.get("stats"))
        growths = arr_to_obj(core.get("growths"))
        flowers = core.get("flowers")

        weapon_id = core.get("weapon")
        move_id   = core.get("move")

        weapon = None
        if weapon_id is not None:
            weapon = {
                "id": weapon_id,
                "icon": wep_icons[weapon_id] if 0 <= weapon_id < len(wep_icons) else None
            }

        move = None
        if move_id is not None:
            move = {
                "id": move_id,
                "type": MOVE_MAP.get(move_id),
                "icon": move_icons[move_id] if 0 <= move_id < len(move_icons) else None
            }

        flags = {k: (pid in s) for k, s in flags_sets.items()}
        blessed = None
        if pid in blessed_map:
            b = blessed_map[pid]
            blessed = {
                "element": b.get("blessing"),
                "variant": b.get("variant"),
                "boosts":  b.get("boosts"),
            }

        record = {
            "pid": pid,
            "name": lang["name"],
            "epithet": lang["epithet"],
            "stats": stats,
            "growths": growths,
            "weapon": weapon,
            "move": move,
            "flowers": flowers,
            "flags": flags,
            "blessed": blessed,
            "keywords": duo_keywords.get(pid),

            # --- NOVOS CAMPOS vindo de fullunits.json (com fallback p/ onlineunits no basekit) ---
            "id": full.get("id"),
            "origin": full.get("origin"),
            "resplendent": bool(full.get("resplendent", False)),
            "basekit": full.get("basekit") or core.get("basekit") or [],
        }

        if record["name"]: counts["with_name"] += 1
        if record["epithet"]: counts["with_epithet"] += 1
        if record["stats"]: counts["with_stats"] += 1

        out[pid] = record

    # grava
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    with open(args.summary, "w", encoding="utf-8") as f:
        json.dump(counts, f, ensure_ascii=False, indent=2)

    print(f"OK -> {args.out} ({counts['total']} unidades)")
    print(f"  nomes: {counts['with_name']} | epítetos: {counts['with_epithet']} | stats: {counts['with_stats']}")
    print(f"Resumo -> {args.summary}")

if __name__ == "__main__":
    main()
