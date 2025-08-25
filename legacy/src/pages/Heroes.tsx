import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import rawUnits from "../data/content/onlineunits.json";
import fullUnits from "../data/content/tierunits.json"; // contém resplendent e id (não-inimigos)
import enLang from "../data/languages/unitlanguages-USEN.json";
import pools from "../data/content/summonpools.json"; // para availability (se faltar, remova)

import { mapOnlineUnitsToHeroes } from "../adapters/fehHeroes";
import HeroCard from "../components/HeroCard";
import type { Hero } from "../types";

import HeroFilters from "../components/HeroFilters";
import type { HeroFilterState } from "../components/HeroFilters";
import { weaponTypeToColor, buildAvailabilityMap } from "../utils/fehFilters";

type OnlineUnits = Record<string, any>;
type TierUnits = Record<
  string,
  {
    id?: number;
    weapon?: string | number;  // ← aceita número
    move?: string | number;    // ← aceita número
    origin?: string | number;  // ← aceita número
    resplendent?: boolean;
  }
>;
type LangDict = Record<string,string>;

export default function HeroesPage() {
  // base de dados
  const units = rawUnits as OnlineUnits;
  const lang = enLang as LangDict;
  const tier = (fullUnits as unknown as TierUnits) || {};
  const availabilityMap = useMemo(() => buildAvailabilityMap(pools), []);

  // mapeia heróis jogáveis
  const baseHeroes = useMemo(() => {
    // usamos o adapter + enriquecemos com resplendent/id se existirem no tierunits
    const heroes = (mapOnlineUnitsToHeroes(units, lang) as Hero[])
      .map(h => {
        const t = tier[h.id];
        return {
          ...h,
          // anexa id numérico (ordem de entrada)
          // @ts-ignore
          entryId: t?.id ?? undefined,
          // anexa flag resplendent
          // @ts-ignore
          resplendent: t?.resplendent ?? undefined,
          // guarda cor derivada
          // @ts-ignore
          color: weaponTypeToColor(h.weaponType),
        };
      });
    return heroes;
  }, [units, lang, tier]);

  // opções dos selects
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

  // estado de filtros
  const [filters, setFilters] = useState<HeroFilterState>({
    q: "",
    color: "Any",
    weapon: "Any",
    move: "Any",
    availability: "Any",
    resplendent: "Any",
    entryOrder: "Default",
  });

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    let list = baseHeroes.filter(h => {
      // texto (nome/título)
      if (q) {
        const name = (h.name || h.id).toLowerCase();
        const title = (h.title || "").toLowerCase();
        if (!name.includes(q) && !title.includes(q)) return false;
      }

      // color
      // @ts-ignore
      if (filters.color !== "Any" && h.color !== filters.color) return false;

      // weapon
      if (filters.weapon !== "Any" && h.weaponType !== filters.weapon) return false;

      // move
      if (filters.move !== "Any" && h.moveType !== filters.move) return false;

      // availability
      if (filters.availability !== "Any") {
        const tags = availabilityMap[h.id];
        if (!tags || !tags.has(filters.availability as any)) return false;
      }

      // resplendent
      if (filters.resplendent !== "Any") {
        // @ts-ignore
        const rsp = h.resplendent === true ? "Yes" : h.resplendent === false ? "No" : "Any";
        if (rsp !== filters.resplendent) return false;
      }

      return true;
    });

    // ordenação por "Entry" (id numérico do tierunits)
    if (filters.entryOrder === "ID Asc") {
      list = list.slice().sort((a: any, b: any) => (a.entryId ?? 1e9) - (b.entryId ?? 1e9));
    } else if (filters.entryOrder === "ID Desc") {
      list = list.slice().sort((a: any, b: any) => (b.entryId ?? -1) - (a.entryId ?? -1));
    }

    return list;
  }, [baseHeroes, filters, availabilityMap]);

  return (
    <div>
      <HeroFilters
        state={filters}
        onChange={(next) => setFilters(prev => ({ ...prev, ...next }))}
        weaponOptions={weaponOptions}
        moveOptions={moveOptions}
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
