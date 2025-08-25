# pull-wiki-cats.py
import os, re, json, time, pathlib, requests
from collections import deque

API = "https://feheroes.fandom.com/api.php"
USER_AGENT = "FEH-Wiki-Dumper/1.2 (+local)"

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

            print(f"[saved] {folder} :: {title} -> {filename}")

def main():
    print("Baixando FEH Wiki (Heroes/Weapons/Skills)…")
    for cat in ROOT_CATEGORIES:
        dump_category_tree(cat)
    print("Concluído! Pastas criadas em:", OUT_DIR)

if __name__ == "__main__":
    main()
