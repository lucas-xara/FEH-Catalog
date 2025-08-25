// src/adapters/fehHeroes.ts
import type { Hero } from "../types";

type OnlineUnits = Record<string, any>;
type LanguageDict = Record<string, string>;

const asNameKey  = (pid: string) => `MPID_${pid.replace(/^PID_?/, "")}`;
const asTitleKey = (pid: string) => `MPID_HONOR_${pid.replace(/^PID_?/, "")}`;

export function mapOnlineUnitsToHeroes(
  units: OnlineUnits,
  lang: LanguageDict
): Hero[] {
  // mantenha só PIDs (heróis jogáveis)
  const ids = Object.keys(units).filter((id) => id.startsWith("PID"));

  const heroes: Hero[] = ids.map((id) => {
    const u = units[id] ?? {};
    return {
      id,
      name:  lang[asNameKey(id)]  ?? id,
      title: lang[asTitleKey(id)] ?? "",
      weaponType: u.weapon,
      moveType:  u.move,
      stats:     u.stats,
      growths:   u.growths,
    };
  });

  // (opcional) ordenar alfabeticamente
  heroes.sort((a, b) => a.name.localeCompare(b.name));

  return heroes;
}
