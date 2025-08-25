// src/utils/weapon.ts
export type AnyPassive = {
  statModifiers?: number[] | Record<string, number>;
  stats?: number[] | Record<string, number>;
};
export type AnyPassives = Record<string, AnyPassive>;

export type AnyWeapon = {
  statModifiers?: number[] | Record<string, number>;
  stats?: number[] | Record<string, number>;
  refines?: Record<string, { statModifiers?: number[] | Record<string, number>; stats?: number[] | Record<string, number>; effectid?: string; hp?: number }>;
  refine?:  Record<string, { statModifiers?: number[] | Record<string, number>; stats?: number[] | Record<string, number>; effectid?: string; hp?: number }>;
};

// --- helpers ---
function objToArray5(o: Record<string, number> | undefined): number[] | undefined {
  if (!o) return undefined;
  const hp = Number(o.hp ?? o.HP ?? 0);
  const atk = Number(o.atk ?? o.ATK ?? 0);
  const spd = Number(o.spd ?? o.SPD ?? 0);
  const def = Number(o.def ?? o.DEF ?? 0);
  const res = Number(o.res ?? o.RES ?? 0);
  return [hp, atk, spd, def, res];
}
function asArray5(x: any): number[] | undefined {
  if (!x) return undefined;
  if (Array.isArray(x)) return x.slice(0, 5);
  if (typeof x === "object") return objToArray5(x);
  return undefined;
}
function getStatMods(obj: any): number[] | undefined {
  const fromMods = asArray5(obj?.statModifiers);
  if (fromMods) return fromMods;
  const fromStats = asArray5(obj?.stats);
  if (fromStats) return fromStats;
  if (typeof obj?.hp === "number") return [obj.hp, 0, 0, 0, 0]; // fallback raro
  return undefined;
}
function lowerKeys<T>(rec?: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  if (!rec) return out;
  for (const k of Object.keys(rec)) out[k.toLowerCase()] = rec[k];
  return out;
}
function getEffectEntry(weapon?: AnyWeapon): { entry?: any; hasEffect: boolean } {
  if (!weapon) return { entry: undefined, hasEffect: false };
  const rs = lowerKeys(weapon.refines);
  if (rs["effect"]) return { entry: rs["effect"], hasEffect: true };
  const r1 = lowerKeys(weapon.refine);
  if (r1["effect"]) return { entry: r1["effect"], hasEffect: true };
  return { entry: undefined, hasEffect: false };
}

export function getWeaponModsPrfEffect(
  weapon?: AnyWeapon,
  allPassives?: AnyPassives
): { mods?: number[]; refinedEffect: boolean } {
  if (!weapon) return { mods: undefined, refinedEffect: false };

  const { entry, hasEffect } = getEffectEntry(weapon);

  if (hasEffect) {
    let mods = getStatMods(entry) ?? undefined;

    // soma stats do effectid (aceita array ou objeto)
    const eid = entry?.effectid;
    const extra = asArray5(allPassives?.[eid]?.statModifiers) ?? asArray5(allPassives?.[eid]?.stats);
    if (extra) {
      const base = mods ?? [0, 0, 0, 0, 0];
      mods = base.map((x, i) => x + (extra[i] ?? 0));
    }

    if (!mods) mods = [3, 0, 0, 0, 0]; // fallback: +3 HP do refine
    return { mods, refinedEffect: true };
  }

  return { mods: getStatMods(weapon), refinedEffect: false };
}
