// src/utils/stats.ts

// Ordem dos atributos em arrays: [HP, ATK, SPD, DEF, RES]
export type StatArray = [number, number, number, number, number];
type StatKey = "HP" | "Atk" | "Spd" | "Def" | "Res";
const KEYS: StatKey[] = ["HP", "Atk", "Spd", "Def", "Res"];

/**
 * Tabela de growths por raridade (faixas 1..15) — igual à do fehbuilder (utilities.py).
 * Índice da raridade: 0..4 => 1★..5★
 */
const generalgrowths: number[][] = [
  // 1★
  [6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 24, 26, 28, 30],
  // 2★
  [7, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 26, 28, 30, 32],
  // 3★
  [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35],
  // 4★
  [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 31, 33, 35, 37],
  // 5★
  [8, 10, 13, 15, 17, 19, 22, 24, 26, 28, 30, 33, 35, 37, 39],
];

/**
 * Converte growth% (após ajustes) para ganho 1→40 usando a tabela por raridade.
 * O fehbuilder usa: index = int((growth/5) - 4)  // mapeia para [0..14]
 */
function gainFromGrowth(growthPct: number, rarity: 1 | 2 | 3 | 4 | 5): number {
  const row = generalgrowths[rarity - 1];
  const idx = Math.trunc(growthPct / 5 - 4);
  const clamped = Math.max(0, Math.min(14, idx));
  return row[clamped];
}

/**
 * statcalc — port fiel do fehbuilder (utilities.statcalc).
 * Espera base lvl1 5★ e growths 5★, mas calcula para qualquer raridade 1..5.
 * Aplica: raridade, boon/bane (±1 lvl1, ±5 growth), ascendente, merges e flowers.
 */
export function statcalc(
  stats: StatArray,            // base lvl1 (5★): [HP,Atk,Spd,Def,Res]
  growths: StatArray,          // growth% (5★)
  rarity: 1 | 2 | 3 | 4 | 5,   // raridade
  boon: StatKey | null = null,
  bane: StatKey | null = null,
  ascendent: StatKey | null = null,
  merges: number = 0,          // 0..10
  flowers: number = 0          // 0..20 (depende da unidade)
): StatArray {
  // 1) Ajuste por raridade → almosttruelevel1
  const almost: Record<StatKey, number> = {
    HP: stats[0], Atk: stats[1], Spd: stats[2], Def: stats[3], Res: stats[4],
  };

  // Para raridade >=3: +1 em todos; se for 5★: +1 extra em todos (total +2)
  if (rarity >= 3) for (const k of KEYS) almost[k] += 1;
  if (rarity === 5) for (const k of KEYS) almost[k] += 1;

  // Para 2★ e 4★: +1 nos dois MAIORES não-HP
  if (rarity === 2 || rarity === 4) {
    const orderNonHP = (["Atk", "Spd", "Def", "Res"] as StatKey[]).sort(
      (a, b) => almost[b] - almost[a]
    );
    almost[orderNonHP[0]] += 1;
    almost[orderNonHP[1]] += 1;
  }

  // 2) Aplicar boon/bane no lvl1 e no growth
  const trueLvl1: Record<StatKey, number> = { ...almost };
  if (boon) trueLvl1[boon] += 1;
  if (bane) trueLvl1[bane] -= 1;

  const trueGrowth: Record<StatKey, number> = {
    HP: growths[0], Atk: growths[1], Spd: growths[2], Def: growths[3], Res: growths[4],
  };
  if (boon) trueGrowth[boon] += 5;
  if (bane) trueGrowth[bane] -= 5;

  // 3) Ordem por lvl1 para aplicar merges/flowers
  const sortedKeys: StatKey[] = [...KEYS].sort((a, b) => trueLvl1[b] - trueLvl1[a]);

  // 4) Merges removem o bane (efeito do fehbuilder)
  if (merges > 0 && bane) {
    trueLvl1[bane] += 1;
    trueGrowth[bane] += 5;
  }

  // 5) Ascendente: +1 lvl1 e +5 growth (não altera a ordem para merges)
  if (ascendent && (!boon || boon !== ascendent)) {
    trueLvl1[ascendent] += 1;
    trueGrowth[ascendent] += 5;
  }

  // 6) Aplicar merges na ordem (regras idênticas ao Python)
  let idx = 0;
  for (let i = 0; i < merges; i++) {
    // primeiro stat
    trueLvl1[sortedKeys[idx]] += (!boon && i === 0 && sortedKeys[idx] !== ascendent) ? 2 : 1;
    const asc1 = sortedKeys[idx] === ascendent;
    idx = (idx === 4) ? 0 : idx + 1;

    // segundo stat
    trueLvl1[sortedKeys[idx]] += (!boon && i === 0 && sortedKeys[idx] !== ascendent) ? 2 : 1;
    const asc2 = asc1 || (sortedKeys[idx] === ascendent);
    idx = (idx === 4) ? 0 : idx + 1;

    // neutral no primeiro merge → +1 em mais um stat
    if (!boon && i === 0 && sortedKeys[idx] !== ascendent) {
      trueLvl1[sortedKeys[idx]] += 1;
    }
    const asc3 = asc2 || (sortedKeys[idx] === ascendent);

    // caso especial do Python: neutral + ascendente envolvido → +1 extra no próximo
    if (!boon && i === 0 && asc3) {
      const next = sortedKeys[(idx + 1) % 5];
      trueLvl1[next] += 1;
    }
  }

  // 7) Flowers (+1 cíclico na mesma ordem)
  idx = 0;
  for (let i = 0; i < flowers; i++) {
    trueLvl1[sortedKeys[idx]] += 1;
    idx = (idx === 4) ? 0 : idx + 1;
  }

  // 8) Converter growth ajustado para ganho 1→40 com a tabela
  const finalStats: StatArray = [
    trueLvl1.HP  + gainFromGrowth(trueGrowth.HP,  rarity),
    trueLvl1.Atk + gainFromGrowth(trueGrowth.Atk, rarity),
    trueLvl1.Spd + gainFromGrowth(trueGrowth.Spd, rarity),
    trueLvl1.Def + gainFromGrowth(trueGrowth.Def, rarity),
    trueLvl1.Res + gainFromGrowth(trueGrowth.Res, rarity),
  ];

  return finalStats;
}

/**
 * Atalho: calcula lvl 40 5★ neutro (sem merges/flowers/IV), útil para telas neutras.
 */
export function lv40FromBaseAndGrowth(
  stats?: number[],
  growths?: number[]
): number[] | undefined {
  if (!stats || !growths || stats.length < 5 || growths.length < 5) return undefined;
  return statcalc(
    [stats[0], stats[1], stats[2], stats[3], stats[4]] as StatArray,
    [growths[0], growths[1], growths[2], growths[3], growths[4]] as StatArray,
    5,
    null,
    null,
    null,
    0,
    0
  );
}

/* ================================================================================================
 * SUPERBOON / SUPERBANE
 * -----------------------------------------------------------------------------------------------
 * Detecção 100% confiável: comparar o lvl40 neutro com as variações boon/bane isoladas.
 * delta +4  => superboon
 * delta -4  => superbane
 * ============================================================================================== */

// Detecta supers usando método híbrido (simulação + salto de 3), com correções.
export function computeSuperIVs(
  stats: StatArray,
  growths: StatArray,
  rarity: 1 | 2 | 3 | 4 | 5 = 5
): { superboon: Set<number>; superbane: Set<number> } {
  const superboon = new Set<number>();
  const superbane = new Set<number>();

  // 1) Simulação exata (neutro x boon/bane) — independe de qualquer heurística.
  const neutral = statcalc(stats, growths, rarity, null, null, null, 0, 0);
  const simDeltaBoon: number[] = [];
  const simDeltaBane: number[] = [];

  const KEYS = ["HP", "Atk", "Spd", "Def", "Res"] as const;

  for (let i = 0; i < 5; i++) {
    const key = KEYS[i];
    const withBoon = statcalc(stats, growths, rarity, key, null, null, 0, 0);
    const withBane = statcalc(stats, growths, rarity, null, key, null, 0, 0);
    simDeltaBoon[i] = withBoon[i] - neutral[i]; // +3 (normal) ou +4 (super)
    simDeltaBane[i] = withBane[i] - neutral[i]; // −3 (normal) ou −4 (super)
  }

  // 2) Checagem por “salto de +3” na linha 5★ (tabela generalgrowths[4]).
  const row5 = generalgrowths[4]; // [8,10,13,15,17,19,22,24,26,28,30,33,35,37,39]

  const toPercent = (gRaw: number) => {
    // Formato faixa (1..15) → %, senão assume que já está em % (25..90)
    const g = Number(gRaw);
    return g >= 1 && g <= 15 ? g * 5 : g;
  };

  const toIndex = (gPercent: number) => {
    // j = int(g/5 - 4), clamp 0..14
    const j = Math.trunc(gPercent / 5 - 4);
    return Math.max(0, Math.min(14, j));
  };

  for (let i = 0; i < 5; i++) {
    const gPct = toPercent(growths[i]);
    const j = toIndex(gPct);

    // “salto de +3” para boon: row5[j+1] - row5[j] === 3
    // borda: se g = 90%, tratamos como superboon (90 → 95 é super aos 5★)
    const boonHasStep3 =
      (j < 14 && row5[j + 1] - row5[j] === 3) || gPct === 90;

    // “salto de +3” para bane: row5[j] - row5[j-1] === 3
    const baneHasStep3 = j > 0 && row5[j] - row5[j - 1] === 3;

    // critério híbrido: se QUALQUER método indica super, marcamos super.
    if (simDeltaBoon[i] === 4 || boonHasStep3) superboon.add(i);
    if (simDeltaBane[i] === -4 || baneHasStep3) superbane.add(i);
  }

  return { superboon, superbane };
}

/**
 * Aplica IV (asset/flaw) sobre stats lvl40 neutros, respeitando superboon/superbane.
 * `assetIdx`/`flawIdx`: 0..4 (HP,Atk,Spd,Def,Res) ou undefined para ignorar.
 */
export function applyBoonBaneWithSupers(
  lv40Neutral: number[],
  assetIdx: number | undefined,
  flawIdx: number | undefined,
  supers: { superboon: Set<number>; superbane: Set<number> }
): number[] {
  const out = [...lv40Neutral];

  if (assetIdx != null) {
    out[assetIdx] += supers.superboon.has(assetIdx) ? 4 : 3;
  }
  if (flawIdx != null) {
    out[flawIdx] += supers.superbane.has(flawIdx) ? -4 : -3;
  }
  return out;
}

/* ================================================================================================
 * OUTROS HELPERS (compatíveis com seu projeto)
 * ============================================================================================== */

export function addStatArrays(a?: number[], b?: number[]): number[] | undefined {
  if (!a) return undefined;
  const B = Array.isArray(b) ? b : [0, 0, 0, 0, 0];
  return a.map((x, i) => x + (B[i] ?? 0));
}

/** Gera opções [0..max] para selects (ex.: Dragonflowers). */
export const dragonflowerOptions = (max: number | undefined) =>
  Array.from({ length: (max ?? 0) + 1 }, (_, i) => i);

/** Gera opções [0..10] para selects (ex.: Merges). */
export const mergeOptions = () =>
  Array.from({ length: 11 }, (_, i) => i);

/**
 * Placeholder simples para Dragonflowers: distribui +1 em loop.
 * (Você pode substituir pelo algoritmo oficial quando integrar.)
 */
export function applyDragonflowers(
  base?: number[],
  count?: number
): number[] | undefined {
  if (!base || base.length < 5 || !count) return base;
  const out = base.slice();
  for (let i = 0; i < count; i++) out[i % 5] += 1;
  return out;
}

/** Soma total dos 5 stats (útil para debug/ordenações). */
export function totalStats(a?: number[]): number {
  if (!Array.isArray(a)) return 0;
  return a.slice(0, 5).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

/* ================================================================================================
 * DISPLAYED STATS (igual ao jogo/fehbuilder)
 * ============================================================================================== */

export type SummonerRank = "C" | "B" | "A" | "S" | null;

const SUMMONER_RANKS: Record<Exclude<SummonerRank, null>, StatArray> = {
  C: [3, 0, 0, 0, 2],
  B: [4, 0, 0, 2, 2],
  A: [4, 0, 2, 2, 2],
  S: [5, 2, 2, 2, 2],
};

export type DisplayMods = {
  /** Stat mods da arma/refine/efeito (inclua o Might no ATK aqui). Ex.: [0, 16, 0, 0, 0] */
  weaponMods?: StatArray | number[];
  /** Lista de stat mods “planos” de passivas visíveis (A/B/C/S) */
  passiveMods?: (StatArray | number[])[];
  /** Rank de Summoner Support */
  summoner?: SummonerRank;
  /** Resplendent ou Stats-Only (+2 em tudo) */
  resplendent?: boolean;
  /** Unidade bônus (+10 HP, +4 nos demais) */
  bonusUnit?: boolean;
  /** Besta transformada (+2 ATK) */
  beastTransformed?: boolean;
  /** Buffs/Debuffs visíveis aplicados na tela (ordem [HP,ATK,SPD,DEF,RES]) */
  buffs?: StatArray | number[];
  /**
   * Boosts extras agregados (ex.: bênçãos de aliados já multiplicadas),
   * passe a soma final por atributo. Ex.: [0, 2, 0, 0, 0]
   */
  extraBoosts?: StatArray | number[];
};

export type ComputeDisplayedInput = {
  /** Base lvl1 5★ e growth% 5★ */
  statsLv1: StatArray;
  growthsPct: StatArray;
  /** IVs por índice (0..4) ou null/undefined para neutro */
  assetIdx?: number | null;
  flawIdx?: number | null;
  /** Ascendente por índice (0..4) — não altera ordem de merges */
  ascendentIdx?: number | null;
  /** Raridade e progressões */
  rarity?: 1 | 2 | 3 | 4 | 5;
  merges?: number;    // 0..10
  flowers?: number;   // 0..20 (depende da unidade)
  /** Modificadores visíveis (arma/skills/summoner/etc.) */
  mods?: DisplayMods;
};

export type ComputeDisplayedResult = {
  neutral40: StatArray;     // lvl40 neutro (sem IV/merges/flowers)
  base40: StatArray;        // lvl40 com IV+ascendente+merges+flowers (sem visíveis)
  displayed: StatArray;     // o que a UI mostra após somar arma/skills/etc.
  breakdown: {
    weapon: StatArray;
    passives: StatArray;
    summoner: StatArray;
    resplendent: StatArray;
    bonusUnit: StatArray;
    beast: StatArray;
    buffs: StatArray;
    extra: StatArray;
  };
};

/**
 * Soma 2 arrays de 5 elementos.
 */
function add5(a?: number[] | null, b?: number[] | null): StatArray {
  const A = (a ?? [0, 0, 0, 0, 0]).slice(0, 5) as number[];
  const B = (b ?? [0, 0, 0, 0, 0]).slice(0, 5) as number[];
  return [A[0] + B[0], A[1] + B[1], A[2] + B[2], A[3] + B[3], A[4] + B[4]];
}
const Z: StatArray = [0, 0, 0, 0, 0];

export function computeDisplayedStats(input: ComputeDisplayedInput): ComputeDisplayedResult {
  const {
    statsLv1,
    growthsPct,
    rarity = 5,
    assetIdx = null,
    flawIdx = null,
    ascendentIdx = null,
    merges = 0,
    flowers = 0,
    mods,
  } = input;

  // 1) lvl40 neutro (sem IV/merges/flowers)
  const neutral40 = statcalc(statsLv1, growthsPct, rarity, null, null, null, 0, 0);

  // 2) lvl40 com IV/ascendente/merges/flowers (statcalc já embute superboon/superbane)
  const boonKey = assetIdx == null ? null : KEYS[assetIdx];
  const baneKey = flawIdx == null ? null : KEYS[flawIdx];
  const ascKey  = ascendentIdx == null ? null : KEYS[ascendentIdx];
  const base40  = statcalc(statsLv1, growthsPct, rarity, boonKey, baneKey, ascKey, merges, flowers);

  // 3) visíveis (arma/skills/summoner/resplendent/bonus/beast/buffs/extra)
  const weapon = (mods?.weaponMods ?? Z) as number[];
  const passives = (mods?.passiveMods ?? []).reduce<StatArray>((acc, cur) => add5(acc, cur as number[]), Z);
  const summoner = mods?.summoner ? SUMMONER_RANKS[mods.summoner] : Z;
  const resplendent = mods?.resplendent ? [2, 2, 2, 2, 2] : Z;
  const bonusUnit = mods?.bonusUnit ? [10, 4, 4, 4, 4] : Z;
  const beast = mods?.beastTransformed ? [0, 2, 0, 0, 0] : Z;
  const buffs = (mods?.buffs ?? Z) as number[];
  const extra = (mods?.extraBoosts ?? Z) as number[];

  const totalVisible = [weapon, passives, summoner, resplendent, bonusUnit, beast, buffs, extra]
    .reduce<StatArray>((acc, cur) => add5(acc, cur), Z);

  let displayed = add5(base40, totalVisible);

  // 4) clamp 0..99 como no fehbuilder
  displayed = displayed.map(x => (x < 0 ? 0 : x > 99 ? 99 : x)) as StatArray;

  return {
    neutral40,
    base40,
    displayed,
    breakdown: {
      weapon: weapon as StatArray,
      passives: passives,
      summoner: summoner as StatArray,
      resplendent: resplendent as StatArray,
      bonusUnit: bonusUnit as StatArray,
      beast: beast as StatArray,
      buffs: buffs as StatArray,
      extra: extra as StatArray,
    },
  };
}