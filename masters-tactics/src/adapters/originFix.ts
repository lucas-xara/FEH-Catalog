// src/adapters/originFix.ts
// Normaliza "Origin" para subtítulos canônicos e ordena as opções.

export function normalizeOrigin(raw: string): string {
  let s = (raw ?? "").trim();

  // 1) remove prefixos "Fire Emblem" redundantes
  // ex.: "Fire Emblem: The Blazing Blade" -> "The Blazing Blade"
  //      "Fire Emblem Heroes" -> "Heroes"
  s = s.replace(/^fire emblem[: ]\s*/i, "");

  // 2) aliases → canônicos (sempre retornam SUBTÍTULO)
  const ALIASES: Array<[RegExp, string]> = [
    // FE1/FE3/FE12 buckets → "Mystery of the Emblem"
    [/^shadow dragon and the blade of light$/i, "Mystery of the Emblem"],
    [/^new mystery of the emblem$/i, "Mystery of the Emblem"],
    [/^mystery of the emblem$/i, "Mystery of the Emblem"],

    // Warriors: Three Hopes → Three Houses
    [/^warriors:\s*three hopes$/i, "Three Houses"],

    // Echoes variants
    [/^echoes(?::\s*shadows of valentia)?$/i, "Echoes"],
    [/^gaiden$/i, "Echoes"],

    // Normaliza artigos "The" e capitalização
    [/^binding blade$/i, "The Binding Blade"],
    [/^the binding blade$/i, "The Binding Blade"],

    [/^blazing blade$/i, "The Blazing Blade"],
    [/^the blazing blade$/i, "The Blazing Blade"],

    [/^sacred stones$/i, "The Sacred Stones"],
    [/^the sacred stones$/i, "The Sacred Stones"],

    [/^path of radiance$/i, "Path of Radiance"],
    [/^radiant dawn$/i, "Radiant Dawn"],
    [/^awakening$/i, "Awakening"],
    [/^fates$/i, "Fates"],
    [/^three houses$/i, "Three Houses"],
    [/^engage$/i, "Engage"],

    // FEH
    [/^heroes$/i, "Heroes"],

    // TMS variants
    [/^tokyo mirage sessions(?:\s*[#♯]fe(?:\s*encore)?)?$/i, "Tokyo Mirage Sessions"],
  ];

  for (const [rx, target] of ALIASES) {
    if (rx.test(s)) return target;
  }

  // Se não bateu em alias, retorna o subtítulo como veio (sem "Fire Emblem")
  return s;
}

/** "A, B" → ["A","B"], aplicando normalizeOrigin e removendo duplicatas (estável). */
export function parseOriginListCanonical(originRaw?: string | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  (originRaw ?? "")
    .split(",")
    .map((part) => normalizeOrigin(part))
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((canon) => {
      if (!seen.has(canon)) {
        seen.add(canon);
        out.push(canon);
      }
    });

  return out;
}

/** Ordem customizada para renderizar as opções (subtítulos). */
export const ORIGIN_ORDER: string[] = [
  "Heroes",
  "Mystery of the Emblem",
  "Echoes",
  "Genealogy of the Holy War",
  "Thracia 776",
  "The Binding Blade",
  "The Blazing Blade",
  "The Sacred Stones",
  "Path of Radiance",
  "Radiant Dawn",
  "Awakening",
  "Fates",
  "Three Houses",
  "Engage",
  "Tokyo Mirage Sessions",
];

/** Constrói opções únicas e ordenadas conforme ORIGIN_ORDER; sobras vão ao final (alfabética). */
export function buildOriginOptionsFromHeroes(
  list: Array<{ originList?: string[] }>
): string[] {
  const set = new Set<string>();
  for (const h of list) (h.originList ?? []).forEach((o) => set.add(o));

  const inData = Array.from(set);

  // 1) itens que estão na ordem canônica
  const ordered: string[] = [];
  for (const name of ORIGIN_ORDER) {
    if (set.has(name)) {
      ordered.push(name);
      set.delete(name);
    }
  }

  // 2) quaisquer não-listados na ordem → vão no fim (alfabética para determinismo)
  const rest = inData.filter((x) => set.has(x)).sort((a, b) => a.localeCompare(b));

  return [...ordered, ...rest];
}
