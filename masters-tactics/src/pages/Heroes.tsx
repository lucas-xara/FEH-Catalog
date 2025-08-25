// src/pages/HeroesPage.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import heroesData from "../data/content/refined-data/heroes-list.json";
import HeroCard from "../components/HeroCard";
import type { Hero } from "../types";
import HeroFilters from "../components/HeroFilters";
import type { HeroFilterState } from "../components/HeroFilters";
import { parseOriginListCanonical, buildOriginOptionsFromHeroes } from "../adapters/originFix";

// ————————————————————————————————————————
// Helpers
// ————————————————————————————————————————
type RefinedHero = {
  infobox: {
    Name: string;
    Title: string;
    WeaponType: string;   // e.g. "Blue Lance", "Red Tome", "Colorless Bow"
    MoveType: string;     // e.g. "Infantry", "Cavalry", "Armor", "Flying"
    Origin?: string | null;  // pode vir "Blazing Blade, Binding Blade"
    releaseDate?: string | null;
    poolRarities?: string | null;
    Properties?: string | null; // e.g. "limited, ghb, demoted, rearmed, specDisplay..."
  };
  stats?: any;
  weapons?: string[];
  assists?: string[];
  specials?: string[];
  passives?: Record<"A"|"B"|"C", string[]>;
};

const KNOWN_COLORS = new Set(["Red", "Blue", "Green", "Colorless"]);

// >>> tipos extras para este arquivo
type Color = "Red" | "Blue" | "Green" | "Colorless";
type LocalHero = Hero & {
  origin?: string;         // string original
  originList?: string[];   // lista normalizada de jogos (canônica)
  releaseDate?: string;
  color?: Color;
  tags?: Set<string>;
  entryId?: number;
};

/** "Blue Lance" -> { color: "Blue", weapon: "Lance" } */
function parseWeaponType(weaponType: string | undefined) {
  const s = (weaponType ?? "").trim().split(/\s+/);
  const color = s.length > 0 && KNOWN_COLORS.has(s[0]) ? s[0] : "";
  const weapon = color ? s.slice(1).join(" ") : (weaponType ?? "");
  return { color, weapon };
}

/** Ex.: "limited, ghb, demoted" -> Set{"limited","ghb","demoted"} */
function parseProperties(props: string | null | undefined) {
  const set = new Set<string>();
  (props ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(t => set.add(t));
  return set;
}

// ————————————————————————————————————————
// Página
// ————————————————————————————————————————
export default function HeroesPage() {
  // Converte o JSON refinado em nossa lista de heróis básicos
  const baseHeroes = useMemo<LocalHero[]>(() => {
    const arr = (heroesData as RefinedHero[]).map((h, idx) => {
      const ib = h.infobox ?? ({} as RefinedHero["infobox"]);
      const { color, weapon } = parseWeaponType(ib.WeaponType);
      const tags = parseProperties(ib.Properties);
      const originList = parseOriginListCanonical(ib.Origin); // ← usa canonicalização

      // id único e estável: "Name (Title)"
      const id = `${ib.Name} (${ib.Title})`;

      const hero: LocalHero = {
        id,
        name: ib.Name,
        title: ib.Title,
        origin: ib.Origin ?? "",
        originList,                          // ← salva lista canônica
        weaponType: weapon,                  // ex.: "Lance", "Tome", "Bow", ...
        moveType: ib.MoveType,               // ex.: "Infantry", "Cavalry", "Armor", "Flying"
        color: (color || "Colorless") as Color,
        releaseDate: ib.releaseDate ?? undefined,
        entryId: idx + 1,
        tags,
      };

      return hero;
    });

    return arr;
  }, []);

  // Opções dinâmicas dos selects (a partir do refinado)
  const weaponOptions = useMemo(() => {
    const s = new Set<string>();
    for (const h of baseHeroes) if (h.weaponType) s.add(h.weaponType);
    return Array.from(s).sort();
  }, [baseHeroes]);

  const moveOptions = useMemo(() => {
    const s = new Set<string>();
    for (const h of baseHeroes) if (h.moveType) s.add(h.moveType);
    return Array.from(s).sort();
  }, [baseHeroes]);

  // Agora usa a ordem canônica definida em originFix.ts
  const originOptions = useMemo(
    () => buildOriginOptionsFromHeroes(baseHeroes),
    [baseHeroes]
  );

  // Estado dos filtros (mantém shape esperado por <HeroFilters />)
  const [filters, setFilters] = useState<HeroFilterState>({
    q: "",
    color: "Any",
    weapon: "Any",
    move: "Any",
    origin: "Any",
    availability: "Any",
    resplendent: "Any",
    entryOrder: "Default"
  });

  // Filtragem
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    let list = baseHeroes.filter((h: LocalHero) => {
      // texto
      if (q) {
        const name = (h.name || h.id).toLowerCase();
        const title = (h.title || "").toLowerCase();
        if (!name.includes(q) && !title.includes(q)) return false;
      }

      // cor
      if (filters.color !== "Any" && h.color !== filters.color) return false;

      // arma (classe)
      if (filters.weapon !== "Any" && h.weaponType !== filters.weapon) return false;

      // movimento
      if (filters.move !== "Any" && h.moveType !== filters.move) return false;

      // origem (aceita QUALQUER uma das origens do herói, já canônicas)
      if (filters.origin !== "Any") {
        const f = String(filters.origin).trim().toLowerCase();
        const has = (h.originList ?? []).some(o => o.trim().toLowerCase() === f);
        if (!has) return false;
      }

      // availability → baseado nos "Properties"
      if (filters.availability !== "Any") {
        const tag = String(filters.availability).toLowerCase();
        const has = h.tags && [...h.tags].some((t: string) => t.toLowerCase() === tag);
        if (!has) return false;
      }

      return true;
    });

    // Ordenação por entryId (opcional)
    if (filters.entryOrder === "ID Asc") {
      list = list.slice().sort((a, b) => (a.entryId ?? 1e9) - (b.entryId ?? 1e9));
    } else if (filters.entryOrder === "ID Desc") {
      list = list.slice().sort((a, b) => (b.entryId ?? -1) - (a.entryId ?? -1));
    }

    return list;
  }, [baseHeroes, filters]);

  return (
    <div>
      <HeroFilters
        state={filters}
        onChange={(next) => setFilters(prev => ({ ...prev, ...next }))}
        weaponOptions={weaponOptions}
        moveOptions={moveOptions}
        originOptions={originOptions}
      />

      <div style={{ maxWidth: 960, margin: "16px auto", padding: "0 16px" }}>
        <h1>Masters Tactics</h1>
        <p style={{ marginTop: -8, opacity: 0.8 }}>
          Heroes — {filtered.length} resultados
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {filtered.map((h) => (
            <Link
              key={h.id}
              to={`/heroes/${encodeURIComponent(h.id)}`}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <HeroCard hero={h} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
