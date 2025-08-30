#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from pathlib import Path

FILE = Path("heroes-list.json")

# ---- Alvo: pares (Name, Title) exatamente como no JSON ----
TARGETS = [
    ("Alfonse", "Uplifting Love"),
    ("Annette", "Festive Helper"),
    ("Ashe", "Budding Chivalry"),
    ("Byleth", "Fount of Learning"),
    ("Caspar", "Summer Intensity"),
    ("Catria", "Windswept Knight"),
    ("Cecilia", "Etrurian Bride"),
    ("Céline", "Blissful Tea Party"),
    ("Clanne", "Summer Fan"),
    ("Claude", "Tropical Trouble"),
    ("Conrad", "Unmasked Knight"),
    ("Corrin", "Daylight Ninja Act"),
    ("Eikþyrnir", "Fit for Waves"),
    ("Elise", "Sparkling Smile"),
    ("Ferdinand", "Highborn Sipper"),
    ("Flavia", "Bold Bride"),
    ("Flora", "Polar-Perfect"),
    ("Geese", "A Life at Sea"),
    ("Hana", "Striving Heart"),
    ("Heath", "Wyvern Ninja"),
    ("Henry", "Peculiar Egg"),
    ("Hilda", "Holiday Layabout"),
    ("Ilyana", "Awakened Appetite"),
    ("Juno", "Soaring Bride"),
    ("Kaden", "Refreshed Kitsune"),
    ("Kana", "Rising Dragon"),
    ("Kurthnaga", "Autumn Goldoan"),
    ("L'Arachel", "Summer Princess"),
    ("Lachesis", "Ballroom Bloom"),
    ("Leo", "Festival Bonds"),
    ("Lethe", "Cat Attack"),
    ("Lewyn", "Wind-Song Scion"),
    ("Lissa", "Littlest Princess"),
    ("Lute", "Summer Prodigy"),
    ("Lyon", "Grado's Gaze"),
    ("Lyon", "Sunlit Prince"),
    ("Lyre", "Lap Cat of Luxury"),
    ("Mae", "Spring Cheer"),
    ("Manuela", "Silver Caroler"),
    ("Marth", "Legacied Hero"),
    ("Minerva", "Verdant Dragoon"),
    ("Mirabilis", "Spring Daydream"),
    ("Naga", "Harvest Divinity"),
    ("Narcian", "Vernal General"),
    ("Nel", "Stoic Bride"),
    ("Ogma", "Blade on Leave"),
    ("Olivia", "Wavecrest Dancer"),
    ("Owain", "Devoted Defender"),
    ("Palla", "Soaring Summer"),
    ("Panne", "Welcoming Dawn"),
    ("Rafiel", "Blessed Wings"),
    ("Raphael", "Muscle-Monger"),
    ("Rebecca", "Breezy Scamp"),
    ("Reina", "Sanguine Shinobi"),
    ("Rinkah", "Consuming Flame"),
    ("Seadall", "Misfortune-Teller"),
    ("Selena", "Admiring General"),
    ("Sothe", "Rushing Dawn"),
    ("Sylvain", "Hanging with Tens"),
    ("Tana", "Soaring New Year"),
    ("Tethys", "Dancing Sands"),
    ("Tharja", "Beach Dark Mage"),
    ("Tine", "Determined Bride"),
    ("Tormod", "Indomitable Will"),
    ("Vika", "Sea-Dark Wing"),
    ("Xane", "Autumn Trickster"),
    ("Xane", "Desert Mirage"),
]

def main():
    if not FILE.exists():
        raise SystemExit(f"Arquivo não encontrado: {FILE.resolve()}")

    with FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # Indexa por (Name, Title) para busca O(1)
    index = {}
    for i, h in enumerate(data):
        info = (h.get("infobox") or {})
        name = str(info.get("Name") or "")
        title = str(info.get("Title") or "")
        index[(name, title)] = i

    modified = []
    not_found = []

    for name, title in TARGETS:
        key = (name, title)
        i = index.get(key)
        if i is None:
            not_found.append(f"{name}: {title}")
            continue

        # Garante estrutura e aplica alteração
        hero = data[i]
        hero.setdefault("infobox", {})
        hero["infobox"]["poolRarities"] = "4, 5"
        modified.append(f"{name}: {title}")

    # Salva de volta (com indent e sem escapar unicode)
    with FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Report
    y = len(modified)
    x = len(TARGETS)
    print("Modificados:")
    for m in modified:
        print(" -", m)
    if not_found:
        print("\nNão encontrados:")
        for n in not_found:
            print(" -", n)
    print(f"\nResultado: {y}/{x}")

if __name__ == "__main__":
    main()
