// src/types.ts

/** Dicionário de strings de idioma (ex.: unitlanguages-USEN.json) */
export type LanguageDict = Record<string, string>;

/** Estrutura de cada entrada do onlineunits.json (valor do mapa) */
export type OnlineUnitRaw = {
  weapon?: string;        // ex.: "SWORD", "BLUE_TOME" (como vem do dump)
  move?: string;          // ex.: "INFANTRY", "CAVALRY"
  stats?: number[];       // [HP, Atk, Spd, Def, Res] base (5★ - 2)
  growths?: number[];     // [HP, Atk, Spd, Def, Res] growths
  basekit?: string[];     // SIDs do kit base (quando presente)
  flowers?: number;       // dragonflowers max
};
export type OnlineUnits = Record<string, OnlineUnitRaw>; // chave: PID_* ou EID_*

/** Modelo que a UI usa para heróis */
export type Hero = {
  id: string;             // PID_* (vamos filtrar EID_* no adapter)
  name: string;           // nome traduzido via LanguageDict (ex.: USEN)
  title?: string;         // "MPID_HONOR_*"
  weaponType?: string;    // copiado de OnlineUnitRaw.weapon
  moveType?: string;      // copiado de OnlineUnitRaw.move
  stats?: number[];       // base stats
  growths?: number[];     // growth rates
};

/** Slots de skill que vamos exibir/filtrar */
export type SkillSlot = "Weapon" | "Assist" | "Special" | "A" | "B" | "C" | "X" | "S";

/** Modelo simples de Skill para a UI */
export type Skill = {
  id: string;             // SID_*
  name: string;           // nome traduzido (MSID_*), quando ligado ao LanguageDict
  slot: SkillSlot;
  prf?: boolean;          // exclusivo (quando disponível no dump)
  stats?: number[];       // modificadores de stats (quando disponível)
};

/** Modelo simples de Weapon para a UI (pode evoluir depois) */
export type Weapon = {
  id: string;             // SID_* (da categoria weapons em onlineskills.json)
  name: string;           // traduzido via MSID_*
  might?: number;         // geralmente vem embutido em stats[1] nos dumps
  refines?: Record<string, { stats?: number[] }>; // "Effect", "Atk", etc.
};
