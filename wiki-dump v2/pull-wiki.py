# feh_wiki_dump_all_in_one.py
# Baixa Heroes, Weapons, Skills e, para Skills, salva automaticamente em subpastas:
# Skills/Weapons, Skills/Passives, Skills/Assists, Skills/Specials, Skills/Unknown
#
# Recomendado: pip install mwparserfromhell

import os, re, json, time, pathlib, requests, shutil
from collections import deque
from pathlib import Path

API = "https://feheroes.fandom.com/api.php"
USER_AGENT = "FEH-Wiki-Dumper/1.3 (+local)"

# Categorias-raiz a baixar (ajuste se quiser outras)
ROOT_CATEGORIES = [
    "Category:Heroes",
    "Category:Weapons",
    "Category:Skills",
]

OUT_DIR = "feh_wiki_dump"  # cria Heroes/, Weapons/, Skills/ aqui

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})

# ---------- Sanitização Windows ----------
INVALID_WIN_CHARS = r'[<>:"/\\|?*\x00-\x1F]'
RESERVED_NAMES = {
    "CON","PRN","AUX","NUL",
    *{f"COM{i}" for i in range(1,10)},
    *{f"LPT{i}" for i in range(1,10)},
}
def safe_filename(title: str, pageid: int, maxlen: int = 150) -> str:
    name = re.sub(INVALID_WIN_CHARS, " ", title).strip()
    name = re.sub(r"\s{2,}", " ", name)
    name = name.rstrip(" .")
    if name.upper() in RESERVED_NAMES or name == "":
        name = f"page_{pageid}"
    if len(name) > maxlen:
        name = name[:maxlen].rstrip(" .")
    return f"{name}__{pageid}.wiki"

# ---------- Helpers de API ----------
def mw_get(params: dict):
    for _ in range(5):
        resp = session.get(API, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            time.sleep(1)
            continue
        return data
    raise RuntimeError(f"API error: {params}")

def expand_subcategories(root_category: str) -> set[str]:
    """Retorna {categoria raiz + todas subcategorias}."""
    all_cats = set()
    q = deque([root_category])
    while q:
        cat = q.popleft()
        if cat in all_cats:
            continue
        all_cats.add(cat)

        cont = {}
        while True:
            params = {
                "action": "query",
                "format": "json",
                "list": "categorymembers",
                "cmtitle": cat,
                "cmtype": "subcat",
                "cmlimit": "500",
                **cont
            }
            data = mw_get(params)
            for m in data.get("query", {}).get("categorymembers", []):
                title = m.get("title")
                if title and title not in all_cats:
                    q.append(title)
            if "continue" in data:
                cont = data["continue"]
            else:
                break
    return all_cats

def pages_in_category(cat: str) -> list[dict]:
    """Páginas (ns=0) diretamente nesta categoria (sem recursão)."""
    pages = []
    cont = {}
    while True:
        params = {
            "action": "query",
            "format": "json",
            "list": "categorymembers",
            "cmtitle": cat,
            "cmnamespace": "0",   # só artigos
            "cmtype": "page",
            "cmlimit": "500",
            **cont
        }
        data = mw_get(params)
        pages.extend(data.get("query", {}).get("categorymembers", []))
        if "continue" in data:
            cont = data["continue"]
        else:
            break
    return pages

def fetch_page_content(pageids: list[int]) -> dict[int, dict]:
    """Busca wikitext da revisão atual por pageid."""
    out = {}
    for i in range(0, len(pageids), 50):
        chunk = pageids[i:i+50]
        params = {
            "action": "query",
            "format": "json",
            "formatversion": "2",
            "prop": "revisions",
            "rvprop": "content|timestamp",
            "pageids": "|".join(str(pid) for pid in chunk),
        }
        data = mw_get(params)
        for p in data.get("query", {}).get("pages", []):
            revs = p.get("revisions", [])
            content = revs[0].get("content", "") if revs else ""
            ts = revs[0].get("timestamp") if revs else None
            out[p["pageid"]] = {
                "title": p.get("title",""),
                "timestamp": ts,
                "content": content
            }
        time.sleep(0.2)
    return out

# ---------- Detecção de tipo (para Skills) ----------
# Tenta usar mwparserfromhell; se não houver, usa fallback via regex.
try:
    import mwparserfromhell as mw
    _HAS_MW = True
except Exception:
    mw = None
    _HAS_MW = False

TEMPLATE_MAP = {
    "weapon infobox": "Weapons",
    "weapon": "Weapons",                 # (fallback)
    "passive": "Passives",
    "passive skill": "Passives",         # (fallback)
    "assist": "Assists",
    "assist infobox": "Assists",         # (fallback)
    "special": "Specials",
    "special infobox": "Specials",       # (fallback)
}
IGNORE_TEMPLATES = {
    "redirect", "displaytitle", "tabber", "tabs",
    "short description", "infobox", "navbox", "quote",
}

# Fallback simples por regex quando mwparserfromhell não estiver disponível
RE_WEAPON  = re.compile(r"\{\{\s*(weapon(?:\s+infobox)?)\b", re.I)
RE_PASSIVE = re.compile(r"\{\{\s*(passive(?:\s+skill)?)\b", re.I)
RE_ASSIST  = re.compile(r"\{\{\s*(assist(?:\s+infobox)?)\b", re.I)
RE_SPECIAL = re.compile(r"\{\{\s*(special(?:\s+infobox)?)\b", re.I)

def detect_type_wikitext(wikitext: str) -> str:
    """Retorna 'Weapons', 'Passives', 'Assists', 'Specials' ou 'Unknown'."""
    if not wikitext or not wikitext.strip():
        return "Unknown"

    if _HAS_MW:
        try:
            parsed = mw.parse(wikitext)
            for tpl in parsed.filter_templates():
                name = str(tpl.name).strip().lower()
                if name in IGNORE_TEMPLATES:
                    continue
                name = " ".join(name.split())
                if name in TEMPLATE_MAP:
                    return TEMPLATE_MAP[name]
        except Exception:
            pass  # cai no fallback abaixo

    # Fallback por regex (primeiro que bater)
    if RE_WEAPON.search(wikitext):
        return "Weapons"
    if RE_PASSIVE.search(wikitext):
        return "Passives"
    if RE_ASSIST.search(wikitext):
        return "Assists"
    if RE_SPECIAL.search(wikitext):
        return "Specials"
    return "Unknown"

# ---------- Pipeline por categoria ----------
def dump_category_tree(root_cat: str):
    # 1) todas as subcategorias
    cat_tree = expand_subcategories(root_cat)
    cat_tree.add(root_cat)

    # 2) páginas únicas (ns=0) em todas as subcats
    all_pages = {}
    for cat in sorted(cat_tree):
        for m in pages_in_category(cat):
            all_pages[m["pageid"]] = m

    print(f"[{root_cat}] subcats={len(cat_tree)} | páginas únicas={len(all_pages)}")

    # 3) conteúdo
    pageids = list(all_pages.keys())
    details = fetch_page_content(pageids)

    # 4) salvar em pasta da categoria
    folder = root_cat.replace("Category:", "")
    base_dir = os.path.join(OUT_DIR, folder)
    os.makedirs(base_dir, exist_ok=True)

    # Para Heroes e Weapons: mantém em /pages
    # Para Skills: separa em subpastas por tipo detectado
    if folder.lower() != "skills":
        pages_dir = os.path.join(base_dir, "pages")
        os.makedirs(pages_dir, exist_ok=True)
        ndjson_path = os.path.join(base_dir, "pages.ndjson")
        with open(ndjson_path, "w", encoding="utf-8") as nd:
            for pid in pageids:
                d = details.get(pid, {})
                title = d.get("title", all_pages[pid].get("title",""))
                content = d.get("content", "")
                ts = d.get("timestamp")

                filename = safe_filename(title, pid)
                file_path = os.path.join(pages_dir, filename)
                pathlib.Path(file_path).write_text(content, encoding="utf-8", newline="\n")

                nd.write(json.dumps({
                    "pageid": pid,
                    "title": title,
                    "timestamp": ts,
                    "content": content
                }, ensure_ascii=False) + "\n")

                print(f"[saved] {folder} :: {title} -> pages/{filename}")
        return

    # Caso "Skills": cria subpastas e salva separado
    skills_subdirs = ["Weapons", "Passives", "Assists", "Specials", "Unknown"]
    for sd in skills_subdirs:
        os.makedirs(os.path.join(base_dir, sd), exist_ok=True)

    ndjson_path = os.path.join(base_dir, "pages.ndjson")
    with open(ndjson_path, "w", encoding="utf-8") as nd:
        for pid in pageids:
            d = details.get(pid, {})
            title = d.get("title", all_pages[pid].get("title",""))
            content = d.get("content", "")
            ts = d.get("timestamp")

            detected = detect_type_wikitext(content)
            if detected not in skills_subdirs:
                detected = "Unknown"

            filename = safe_filename(title, pid)
            file_path = os.path.join(base_dir, detected, filename)
            pathlib.Path(file_path).write_text(content, encoding="utf-8", newline="\n")

            nd.write(json.dumps({
                "pageid": pid,
                "title": title,
                "timestamp": ts,
                "detected_type": detected,
                "content": content
            }, ensure_ascii=False) + "\n")

            print(f"[saved] Skills::{detected} :: {title} -> {detected}/{filename}")

def main():
    print("Baixando FEH Wiki (Heroes/Weapons/Skills)…")
    Path(OUT_DIR).mkdir(exist_ok=True)
    for cat in ROOT_CATEGORIES:
        dump_category_tree(cat)
    print("Concluído! Pastas criadas em:", OUT_DIR)

if __name__ == "__main__":
    main()
