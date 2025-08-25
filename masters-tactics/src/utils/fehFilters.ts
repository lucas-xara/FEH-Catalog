// src/utils/fehFilters.ts

// Heurística de cor a partir do tipo de arma do dump
export function weaponTypeToColor(
  weapon: unknown
): "Red" | "Blue" | "Green" | "Colorless" | "Unknown" {
  if (weapon == null) return "Unknown";

  // Se vier número/código, por enquanto tratamos como desconhecido.
  // (Depois podemos mapear códigos -> labels)
  if (typeof weapon !== "string") return "Unknown";

  const w = weapon.toUpperCase(); // ← agora é seguro

  if (w.startsWith("RED")) return "Red";
  if (w.startsWith("BLUE")) return "Blue";
  if (w.startsWith("GREEN")) return "Green";
  if (w.includes("COLORLESS")) return "Colorless";

  if (w.includes("SWORD")) return "Red";
  if (w.includes("LANCE")) return "Blue";
  if (w.includes("AXE")) return "Green";

  if (/BOW|DAGGER|STAFF/.test(w)) return "Colorless";

  return "Unknown";
}

// Gera um map PID_* -> Set(tags de disponibilidade) a partir do summonpools.json (se existir)
export type AvailabilityTag =
  | "Regular 5★"
  | "Regular 4★"
  | "4★ Special Rate"
  | "GHB"
  | "TT"
  | "Limited"
  | "Other";

export function buildAvailabilityMap(pools: any): Record<string, Set<AvailabilityTag>> {
  const map: Record<string, Set<AvailabilityTag>> = {};

  const add = (pid: string, tag: AvailabilityTag) => {
    if (!map[pid]) map[pid] = new Set<AvailabilityTag>();
    map[pid].add(tag);
  };

  // Abaixo: best-effort com chaves comuns. Se o seu pools tiver nomes diferentes, ajuste aqui.
  if (pools) {
    // exemplos de chaves frequentes
    const candidateKeys: Array<[string, AvailabilityTag]> = [
      ["regular_5", "Regular 5★"],
      ["regular5", "Regular 5★"],
      ["regular_4", "Regular 4★"],
      ["regular4", "Regular 4★"],
      ["special4", "4★ Special Rate"],
      ["four_star_special", "4★ Special Rate"],
      ["ghb", "GHB"],
      ["grand_hero_battle", "GHB"],
      ["tempest_trials", "TT"],
      ["tt", "TT"],
      ["limited", "Limited"],
    ];

    for (const [key, tag] of candidateKeys) {
      const list: string[] = pools[key] || [];
      if (Array.isArray(list)) {
        for (const pid of list) add(pid, tag);
      } else if (list && typeof list === "object") {
        // alguns dumps vêm como objeto { PID_X: true }
        for (const pid of Object.keys(list)) add(pid, tag);
      }
    }

    // fallback: se houver um objeto com arrays nomeadas por banner/pool
    for (const k of Object.keys(pools)) {
      const val = pools[k];
      if (Array.isArray(val)) {
        // se o nome sugerir algo
        const kk = k.toLowerCase();
        let tag: AvailabilityTag | null = null;
        if (kk.includes("special") && kk.includes("4")) tag = "4★ Special Rate";
        else if (kk.includes("ghb")) tag = "GHB";
        else if (kk.includes("tempest") || kk === "tt") tag = "TT";
        else if (kk.includes("regular") && kk.includes("5")) tag = "Regular 5★";
        else if (kk.includes("regular") && kk.includes("4")) tag = "Regular 4★";
        if (tag) for (const pid of val) add(pid, tag);
      }
    }
  }

  return map;
}

// Helpers para nomes
export const nameKeyFromPid = (pid: string) => `MPID_${pid.replace(/^PID_?/, "")}`;
export const titleKeyFromPid = (pid: string) => `MPID_HONOR_${pid.replace(/^PID_?/, "")}`;
