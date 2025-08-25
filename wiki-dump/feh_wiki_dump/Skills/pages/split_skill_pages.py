# split_skill_pages.py
# Coloque este arquivo DENTRO da pasta que contém os .wiki de Skills (ex.: feh_wiki_dump/Skills/pages)
# Requer: pip install mwparserfromhell

import os
import shutil
from pathlib import Path
import mwparserfromhell as mw

# Se preferir COPIAR (e manter os originais), troque para False
MOVE_FILES = True

# Mapas de nomes de template -> pasta de destino
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

# Alguns templates "ruído" que podem aparecer antes do infobox
IGNORE_TEMPLATES = {
    "redirect", "displaytitle", "tabber", "tabs",
    "short description", "infobox", "navbox", "quote",
}

def detect_type(wikitext: str) -> str:
    """
    Retorna 'Weapons', 'Passives', 'Assists', 'Specials' ou 'Unknown'
    analisando o primeiro template compatível.
    """
    try:
        parsed = mw.parse(wikitext)
    except Exception:
        return "Unknown"

    # percorre na ordem os templates e pega o primeiro que bate no mapa
    for tpl in parsed.filter_templates():
        name = str(tpl.name).strip().lower()
        # pula ruídos comuns
        if name in IGNORE_TEMPLATES:
            continue
        # normaliza nomes com espaços múltiplos
        name = " ".join(name.split())
        if name in TEMPLATE_MAP:
            return TEMPLATE_MAP[name]
    return "Unknown"

def main():
    base = Path(__file__).parent
    files = sorted(base.glob("*.wiki"))

    if not files:
        print("Nenhum .wiki encontrado nesta pasta.")
        return

    # cria pastas de destino
    for d in ["Weapons", "Passives", "Assists", "Specials", "Unknown"]:
        (base / d).mkdir(exist_ok=True)

    counts = {"Weapons":0, "Passives":0, "Assists":0, "Specials":0, "Unknown":0}

    for fp in files:
        try:
            text = fp.read_text(encoding="utf-8")
        except Exception as e:
            print(f"[skip] erro lendo {fp.name}: {e}")
            counts["Unknown"] += 1
            dest = base / "Unknown" / fp.name
            if MOVE_FILES:
                shutil.move(str(fp), str(dest))
            else:
                shutil.copy2(str(fp), str(dest))
            continue

        typ = detect_type(text)
        dest = base / typ / fp.name

        try:
            if MOVE_FILES:
                shutil.move(str(fp), str(dest))
            else:
                shutil.copy2(str(fp), str(dest))
            counts[typ] += 1
            print(f"[{typ}] {fp.name}")
        except Exception as e:
            print(f"[erro] {fp.name} -> {typ}: {e}")

    print("\nResumo:")
    for k,v in counts.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
