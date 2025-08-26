#!/usr/bin/env python3
# version-df.py
# Lê ./heroes-list.json (array ou {"heroes":[...]}), calcula e injeta:
# - "version" (formato x.x) a partir de infobox.releaseDate (ou releaseDate na raiz)
# - "dragonflowersCap" pelas regras "after August, YYYY" + exceção Infantry <= 3.1 -> 40
# Cobre datas: "February 2, 2017", "Feb 2, 2017", "7/10/2018", "07/29/18", "YYYY-MM-DD", etc.
# Também remove avisos antigos "invalid_releaseDate" se a data for parseada com sucesso.

import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union
import sys
import os

INFILE = "heroes-list.json"
OUTFILE = "heroes-list.json"

# -------------------- Parsing de datas --------------------

_SLASH_DATE_RE = re.compile(r"^\s*(\d{1,2})/(\d{1,2})/(\d{2}|\d{4})\s*$")

def parse_release_date_any(s: str) -> datetime:
    """
    Aceita:
      - ISO: 'YYYY-MM-DD', 'YYYY-MM', 'YYYY', 'YYYY-MM-DDTHH:MM:SSZ', '...+00:00'
      - Nome do mês: 'February 2, 2017', 'Feb 2, 2017', 'February 2 2017', 'Feb 2 2017'
      - Numérico US: 'M/D/YYYY', 'MM/DD/YYYY', 'MM/DD/YY'
    Retorna datetime em UTC.
    """
    s = s.strip()

    # ISO com 'Z'
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"

    # Tenta ISO direto (completa YYYY-MM / YYYY)
    s_iso = s
    if len(s) == 7 and s[4] == "-":  # YYYY-MM
        s_iso = s + "-01"
    elif len(s) == 4 and s.isdigit():  # YYYY
        s_iso = s + "-01-01"

    # 1) ISO
    try:
        dt = datetime.fromisoformat(s_iso)
    except Exception:
        dt = None

    # 2) Nome do mês (com e sem vírgula)
    if dt is None:
        for fmt in ("%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y"):
            try:
                dt = datetime.strptime(s, fmt)
                break
            except Exception:
                dt = None

    # 3) Numérico US com barras (M/D/YYYY, MM/DD/YYYY, MM/DD/YY)
    if dt is None:
        m = _SLASH_DATE_RE.match(s)
        if m:
            mm = int(m.group(1))
            dd = int(m.group(2))
            yy = m.group(3)
            if len(yy) == 2:
                # FEH está em 2017+, então 2 dígitos mapeamos para 2000+ (ex.: 18 -> 2018)
                yyyy = 2000 + int(yy)
            else:
                yyyy = int(yy)
            dt = datetime(yyyy, mm, dd)
    # 4) Fallback para pegar só YYYY-MM-DD
    if dt is None:
        try:
            dt = datetime.strptime(s[:10], "%Y-%m-%d")
        except Exception as e:
            raise ValueError(f"Data inválida: {s}") from e

    # Normaliza para UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt

# -------------------- Version rules --------------------

VERSION_MAP_2017 = {
    1: "1.0",  # fallback
    2: "1.0",
    3: "1.1",
    4: "1.2",
    5: "1.3",
    6: "1.4",
    7: "1.5",
    8: "1.6",
    9: "1.7",
    10: "1.8",
    11: "2.0",
    12: "2.0",
}

def compute_version_from_date(dt: datetime) -> str:
    y, m = dt.year, dt.month
    if y >= 2018:
        if m == 12:
            return f"{y - 2015}.0"
        return f"{y - 2016}.{m}"
    elif y == 2017:
        return VERSION_MAP_2017.get(m, "1.0")
    else:
        return "1.0"

def parse_version_tuple(v: str) -> Tuple[int, int]:
    try:
        a, b = v.split(".")
        return int(a), int(b)
    except Exception:
        return (0, 0)

# -------------------- MoveType detection --------------------

MOVE_MAP_NUM = {0: "Infantry", 1: "Armor", 2: "Cavalry", 3: "Flying"}

def normalize_move_str(val: Any) -> Optional[str]:
    if isinstance(val, int):
        return MOVE_MAP_NUM.get(val)
    if isinstance(val, str):
        s = val.strip()
        if s in ("Infantry", "Armor", "Cavalry", "Flying"):
            return s
        low = s.lower()
        if low in ("infantry", "inf", "foot"): return "Infantry"
        if low in ("armor", "armored", "armour"): return "Armor"
        if low in ("cavalry", "cav"): return "Cavalry"
        if low in ("flying", "flyer", "flier"): return "Flying"
    return None

def detect_move(hero: Dict[str, Any]) -> Optional[str]:
    ib = hero.get("infobox")
    if isinstance(ib, dict) and "MoveType" in ib:
        m = normalize_move_str(ib.get("MoveType"))
        if m:
            return m
    for key in ("moveType", "move_type", "movetype", "movementType", "movement", "move"):
        if key in hero:
            m = normalize_move_str(hero.get(key))
            if m:
                return m
    return None

# -------------------- Dragonflowers rules --------------------

THRESHOLDS = [
    (2025, 9, 5),
    (2024, 9, 10),
    (2023, 9, 15),
    (2022, 9, 20),
    (2021, 9, 25),
    (2020, 9, 30),
    (2019, 9, 35),
]
# Exceção: Infantry com version <= 3.1 -> 40

def ym_key(dt: datetime) -> int:
    return dt.year * 100 + dt.month

def compute_df_cap(dt: datetime, version: str, move: Optional[str]) -> int:
    ymk = ym_key(dt)
    for (y, m, cap) in THRESHOLDS:
        if ymk >= y * 100 + m:
            return cap
    if move == "Infantry":
        maj, minr = parse_version_tuple(version)
        if maj < 3 or (maj == 3 and minr <= 1):
            return 40
    return 35

# -------------------- IO helpers --------------------

def load_json(path: str) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: str, data: Union[List[Dict[str, Any]], Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_hero_list(root: Union[List[Dict[str, Any]], Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
    if isinstance(root, list):
        return root
    if isinstance(root, dict) and isinstance(root.get("heroes"), list):
        return root["heroes"]
    return None

# -------------------- Main --------------------

def main():
    if not os.path.exists(INFILE):
        print(f"[erro] Arquivo não encontrado: {INFILE}", file=sys.stderr)
        sys.exit(1)

    data = load_json(INFILE)
    heroes = get_hero_list(data)
    if heroes is None:
        print("[erro] Estrutura inesperada. Esperado: lista de heróis OU objeto com chave 'heroes'.", file=sys.stderr)
        sys.exit(2)

    total = len(heroes)
    updated_ver = 0
    updated_df = 0
    skipped_no_date = 0
    parse_errors = 0
    bad: List[Dict[str, str]] = []

    for h in heroes:
        if not isinstance(h, dict):
            continue

        # releaseDate (prioriza infobox.releaseDate)
        release_str = None
        ib = h.get("infobox")
        if isinstance(ib, dict) and isinstance(ib.get("releaseDate"), str):
            release_str = ib.get("releaseDate")
        elif isinstance(h.get("releaseDate"), str):
            release_str = h.get("releaseDate")

        if not release_str:
            skipped_no_date += 1
            continue

        # tenta parse
        try:
            dt = parse_release_date_any(release_str)
            # se antes havia aviso de invalid_releaseDate, remove
            if "_warnings" in h and isinstance(h["_warnings"], list):
                h["_warnings"] = [w for w in h["_warnings"] if not str(w).startswith("invalid_releaseDate")]
                if not h["_warnings"]:
                    del h["_warnings"]
        except Exception as e:
            parse_errors += 1
            name = (ib or {}).get("Name") or h.get("name") or "UNKNOWN"
            h.setdefault("_warnings", []).append(f"invalid_releaseDate: {str(e)}")
            bad.append({"Name": name, "releaseDate": release_str, "error": str(e)})
            continue

        # version
        prev_v = h.get("version")
        v = compute_version_from_date(dt)
        if prev_v != v:
            updated_ver += 1
        h["version"] = v

        # dragonflowersCap
        move = detect_move(h)
        cap = compute_df_cap(dt, v, move)
        prev_cap = h.get("dragonflowersCap")
        if prev_cap != cap:
            updated_df += 1
        h["dragonflowersCap"] = cap

    # relatório
    print(f"[info] total de heróis: {total}")
    print(f"[info] versões atualizadas/inseridas: {updated_ver}")
    print(f"[info] dragonflowers atualizados/inseridos: {updated_df}")
    print(f"[info] pulados (sem releaseDate): {skipped_no_date}")
    print(f"[info] erros de parse de data: {parse_errors}")

    if bad:
        print("[erros] datas com problema:")
        for item in bad:
            print(f"  - {item['Name']} | {item['releaseDate']} | {item['error']}")
        # CSV
        try:
            with open("version-df-errors.csv", "w", encoding="utf-8") as f:
                f.write("Name,releaseDate,error\n")
                for item in bad:
                    n = item["Name"].replace('"','""')
                    d = item["releaseDate"].replace('"','""')
                    e = item["error"].replace('"','""')
                    f.write(f"\"{n}\",\"{d}\",\"{e}\"\n")
            print("[ok] relatório salvo: version-df-errors.csv")
        except Exception as e:
            print(f"[aviso] falha ao salvar CSV de erros: {e}", file=sys.stderr)

    # grava saída
    save_json(OUTFILE, data)
    print(f"[ok] arquivo salvo: {OUTFILE}")

if __name__ == "__main__":
    main()
