# merge-x-skills.py
# Mescla X (echo) passive skills no heroes-list.json SEM modificar outros campos.
# Uso:
#   python merge-x-skills.py                 # usa "x-skills.json" como arquivo extra
#   python merge-x-skills.py extras-x.json   # ou passe o nome do arquivo extra

import json
import sys
from typing import Any, Dict, List, Tuple

HEROES_FILE = "heroes-list.json"
EXTRA_FILE = sys.argv[1] if len(sys.argv) > 1 else "x-skills.json"

def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)

def save_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def hero_key_from_obj(obj: Dict[str, Any]) -> str:
    """
    Gera a chave estável do herói:
      1) obj["id"] se existir
      2) "Name (Title)" a partir de obj["infobox"]
      3) "Name (Title)" a partir de chaves soltas name/title
    """
    if isinstance(obj, dict):
        if "id" in obj and obj["id"]:
            return str(obj["id"]).strip()
        ib = obj.get("infobox") or {}
        nm = ib.get("Name") or obj.get("Name") or obj.get("name")
        tt = ib.get("Title") or obj.get("Title") or obj.get("title")
        if nm and tt:
            return f"{str(nm).strip()} ({str(tt).strip()})"
    return ""

def normalize_list(xs: Any) -> List[str]:
    out: List[str] = []
    if isinstance(xs, list):
        for x in xs:
            if x is None:
                continue
            s = str(x).strip()
            if s:
                out.append(s)
    return out

def extract_x_list(obj: Dict[str, Any]) -> List[str]:
    """
    Tenta achar a lista de X skills no objeto extra, aceitando formatos comuns:
      - {"passives":{"X":[...]}}
      - {"X":[...]} ou {"x":[...]}
      - {"passivesX":[...]} / {"xPassives":[...]}
      - {"skills":{"X":[...]}}
    """
    # 1) passives.X
    if isinstance(obj.get("passives"), dict):
        xs = obj["passives"].get("X")
        xl = normalize_list(xs)
        if xl:
            return xl
    # 2) top-level chaves óbvias
    for k in ("X", "x", "passivesX", "xPassives"):
        if k in obj:
            xl = normalize_list(obj[k])
            if xl:
                return xl
    # 3) skills.X (fallback)
    if isinstance(obj.get("skills"), dict):
        xs = obj["skills"].get("X")
        xl = normalize_list(xs)
        if xl:
            return xl
    return []

def build_extra_pairs(extra_data: Any) -> List[Tuple[str, List[str]]]:
    """
    Retorna [(heroKey, xList)] a partir do JSON extra.
    Aceita:
      - Array de objetos (cada um com hero/id/infobox e lista X)
      - Objeto { "Leif (Destined Scions)": ["X1","X2"], ... }
      - Objeto com itens envolvidos onde cada valor é o objeto com X
    """
    pairs: List[Tuple[str, List[str]]] = []

    # Caso 1: dict mapeando "heroKey" -> lista de X
    if isinstance(extra_data, dict):
        # Tente direto: { "Leif (Destined Scions)": ["..."] }
        all_values_are_lists = all(isinstance(v, list) for v in extra_data.values())
        if all_values_are_lists:
            for k, v in extra_data.items():
                key = str(k).strip()
                xl = normalize_list(v)
                if key and xl:
                    pairs.append((key, xl))
            return pairs

        # Caso 1b: dict genérico de objetos -> cada valor tem forma variada
        for v in extra_data.values():
            if not isinstance(v, dict):
                continue
            key = (
                str(v.get("hero") or v.get("id") or "").strip()
                or hero_key_from_obj(v)
            )
            xl = extract_x_list(v)
            if key and xl:
                pairs.append((key, xl))
        return pairs

    # Caso 2: array de objetos
    if isinstance(extra_data, list):
        for it in extra_data:
            if not isinstance(it, dict):
                continue
            key = (
                str(it.get("hero") or it.get("id") or "").strip()
                or hero_key_from_obj(it)
            )
            xl = extract_x_list(it)
            if key and xl:
                pairs.append((key, xl))

    return pairs

def dedup_preserving_order(base: List[str], extra: List[str]) -> List[str]:
    seen = set(x.strip() for x in base)
    out = list(base)
    for x in extra:
        xx = x.strip()
        if xx and xx not in seen:
            out.append(xx)
            seen.add(xx)
    return out

def main():
    heroes = load_json(HEROES_FILE)
    extra = load_json(EXTRA_FILE)

    if not isinstance(heroes, list):
        print(f"[erro] {HEROES_FILE} não é um array de heróis.")
        return

    pairs = build_extra_pairs(extra)
    if not pairs:
        print(f"[aviso] Nenhuma X skill encontrada em {EXTRA_FILE}. Nada a fazer.")
        return

    # Índice dos heróis por chave
    index: Dict[str, int] = {}
    for i, h in enumerate(heroes):
        key = hero_key_from_obj(h)
        if key:
            index[key] = i
        # Também indexa por id simples (caso exista)
        if isinstance(h, dict) and "id" in h and h["id"]:
            index[str(h["id"]).strip()] = i

    updated_heroes = 0
    total_added = 0
    not_found: List[str] = []

    for key, xlist in pairs:
        idx = index.get(key)
        if idx is None:
            # tentar chave “Name (Title)” a partir de algo como "Name|Title"
            if "|" in key and "(" not in key:
                parts = [p.strip() for p in key.split("|", 1)]
                if len(parts) == 2:
                    alt = f"{parts[0]} ({parts[1]})"
                    idx = index.get(alt)
        if idx is None:
            not_found.append(key)
            continue

        hero = heroes[idx]
        if not isinstance(hero, dict):
            not_found.append(key)
            continue

        passives = hero.get("passives")
        if not isinstance(passives, dict):
            passives = {}
            hero["passives"] = passives  # cria sem tocar em A/B/C
        cur = passives.get("X")
        cur_list = normalize_list(cur)
        new_list = dedup_preserving_order(cur_list, xlist)

        if new_list != cur_list:
            passives["X"] = new_list
            updated_heroes += 1
            total_added += max(0, len(new_list) - len(cur_list))

    save_json(HEROES_FILE, heroes)

    print(f"[ok] Mescla concluída em {HEROES_FILE}")
    print(f"[info] heróis atualizados: {updated_heroes}")
    print(f"[info] X skills adicionadas (novas entradas): {total_added}")
    if not_found:
        print(f"[warn] não encontrados ({len(not_found)}):")
        for k in not_found:
            print("  -", k)

if __name__ == "__main__":
    main()
