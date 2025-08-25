// src/pages/Hero.tsx
import { useParams, Link } from "react-router-dom";
import React, { useMemo, useState, useEffect } from "react";

import unitsJson from "../data/content/onlineunits.json";
import skillsJson from "../data/content/onlineskills.json";
import enLang from "../data/languages/unitlanguages-USEN.json";
import { getWeaponModsPrfEffect } from "../utils/weapon";

import {
  lv40FromBaseAndGrowth, // referência neutra (sem arma)
  dragonflowerOptions,
  mergeOptions,
  computeDisplayedStats,
  computeSuperIVs,
  addStatArrays, // somar arma + passivas visíveis
} from "../utils/stats";
import type { StatArray } from "../utils/stats";
import {
  nameKeyFromPid,
  titleKeyFromPid,
  nameKeyFromSid,
  pickKitSlots,
} from "../utils/skills";

type OnlineUnits = Record<string, any>;
type Lang = Record<string, string>;

type SkillsDump = {
  weapons: Record<
    string,
    {
      stats?: number[] | Record<string, number>;
      statModifiers?: number[] | Record<string, number>;
      refines?: any;
      refine?: any;
    }
  >;
  assists: Record<string, unknown>;
  specials: Record<string, unknown>;
  passives: {
    A: Record<string, any>;
    B: Record<string, any>;
    C: Record<string, any>;
    X: Record<string, any>;
    S?: Record<string, any>;
  };
};

const STAT_NAMES = ["HP", "ATK", "SPD", "DEF", "RES"] as const;

// >>> Tipagem local para incluir o slot S
type KitSlots = {
  weapon?: string;
  assist?: string;
  special?: string;
  A?: string;
  B?: string;
  C?: string;
  X?: string;
  S?: string; // <- aqui!
};

export default function HeroPage() {
  const { id } = useParams();
  const units = unitsJson as OnlineUnits;
  const lang = enLang as Lang;
  const skills = skillsJson as unknown as SkillsDump;

  const raw = decodeURIComponent(id ?? "");
  const pid = raw.startsWith("PID_") ? raw : `PID_${raw}`;

  const u = units[pid];
  const [flowers, setFlowers] = useState(0);
  const [merges, setMerges] = useState(0);

  if (!u) {
    return (
      <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        <p>Herói não encontrado.</p>
        <Link to="/heroes">← Voltar</Link>
      </div>
    );
  }

  const name = lang[nameKeyFromPid(pid)] ?? pid;
  const title = lang[titleKeyFromPid(pid)] ?? "";

  // <<< cast para KitSlots para habilitar kit.S sem erro de TS
  const kit = pickKitSlots(u.basekit, skills) as KitSlots;

  // --- SUPERBOON/SUPERBANE ---
  const supers = useMemo(() => {
    const statsLv1 = (u.stats as number[]).slice(0, 5) as StatArray;
    const growths = (u.growths as number[]).slice(0, 5) as StatArray;
    return computeSuperIVs(statsLv1, growths, 5);
  }, [u.stats, u.growths]);

  // --- Detecta se esse herói tem versão Resplendent (EX01) ---
  const hasResplendent = useMemo(() => {
    if (!pid.startsWith("PID_")) return false;
    const voiceKey = pid.replace("PID", "MPID_VOICE") + "EX01";
    const artKey = pid.replace("PID", "MPID_ILLUST") + "EX01";
    return Boolean((enLang as any)[voiceKey] || (enLang as any)[artKey]);
  }, [pid]);

  const [resplendent, setResplendent] = useState(false);
  // ao trocar de herói, limpa o toggle
  useEffect(() => setResplendent(false), [pid]);

  // --- Flatten de passivas (A/B/C/S/X) para lookup por SID ---
  const allPassives = useMemo(() => {
    return {
      ...(skills.passives?.A ?? {}),
      ...(skills.passives?.B ?? {}),
      ...(skills.passives?.C ?? {}),
      ...(skills.passives?.S ?? {}),
      ...(skills.passives?.X ?? {}),
    } as Record<
      string,
      {
        statModifiers?: number[] | Record<string, number>;
        stats?: number[] | Record<string, number>;
      }
    >;
  }, [skills.passives]);

  // Helper local: normaliza objeto {hp,atk,...} ou array para [5]
  const toArray5 = (x: any): number[] | undefined => {
    if (!x) return undefined;
    if (Array.isArray(x)) return x.slice(0, 5);
    if (typeof x === "object") {
      const hp = Number(x.hp ?? x.HP ?? 0);
      const atk = Number(x.atk ?? x.ATK ?? 0);
      const spd = Number(x.spd ?? x.SPD ?? 0);
      const def = Number(x.def ?? x.DEF ?? 0);
      const res = Number(x.res ?? x.RES ?? 0);
      return [hp, atk, spd, def, res];
    }
    return undefined;
  };

  // --- Passivas do kit que dão stats VISÍVEIS (somadas à arma) ---
  const passiveVisibleMods = useMemo(() => {
    const sids = [kit.A, kit.B, kit.C, kit.S, kit.X].filter(Boolean) as string[];
    let sum: number[] | undefined = undefined;

    for (const sid of sids) {
      const p = allPassives[sid];
      if (!p) continue;

      const arr = toArray5(p.statModifiers) ?? toArray5(p.stats) ?? undefined;

      if (arr) {
        sum = addStatArrays(sum, arr) ?? arr; // soma cumulativa
      }
    }
    return sum; // pode ser undefined se nenhuma passiva tiver visíveis
  }, [kit.A, kit.B, kit.C, kit.S, kit.X, allPassives]);

  // --- ARMA (PRF + Effect auto) ---
  const { weaponMods, refinedEffect } = useMemo(() => {
    const w = kit.weapon ? (skills.weapons?.[kit.weapon] as any) : undefined;
    const out = getWeaponModsPrfEffect(w, allPassives);
    return {
      weaponMods: out.mods as number[] | undefined,
      refinedEffect: out.refinedEffect as boolean,
    };
  }, [kit.weapon, skills.weapons, allPassives]);

  // --- Combina arma + passivas visíveis (um único vetor) ---
  const combinedItemMods = useMemo(() => {
    return addStatArrays(weaponMods, passiveVisibleMods) ?? weaponMods ?? passiveVisibleMods;
  }, [weaponMods, passiveVisibleMods]);

  // --- Aplica Resplendent (+2 em todos) se marcado ---
  const finalItemMods = useMemo(() => {
    const plus2 = resplendent ? [2, 2, 2, 2, 2] : undefined;
    return addStatArrays(combinedItemMods, plus2) ?? plus2 ?? combinedItemMods;
  }, [combinedItemMods, resplendent]);

  // --- DISPLAYED: lvl40 5★ + merges + DF + (arma + passivas visíveis + resplendent) ---
  const displayed = useMemo(() => {
    const statsLv1 = (u.stats as number[]).slice(0, 5) as StatArray;
    const growths = (u.growths as number[]).slice(0, 5) as StatArray;

    const { displayed } = computeDisplayedStats({
      statsLv1,
      growthsPct: growths,
      rarity: 5,
      merges,
      flowers,
      mods: {
        weaponMods: finalItemMods, // já inclui +2 de Resplendent (se marcado)
        passiveMods: [], // já agregadas acima
        summoner: null,
        resplendent: false, // mantemos false; já somamos manualmente
        bonusUnit: false,
        beastTransformed: false,
        buffs: [0, 0, 0, 0, 0],
        extraBoosts: [0, 0, 0, 0, 0],
      },
    });

    return displayed;
  }, [u.stats, u.growths, merges, flowers, finalItemMods]);

  // Neutro sem arma (comparação opcional)
  const lv40Neutral = useMemo(() => {
    return lv40FromBaseAndGrowth(u.stats, u.growths);
  }, [u.stats, u.growths]);

  const t = (sid?: string) => (sid ? lang[nameKeyFromSid(sid)] ?? sid : "—");

  const colorForIndex = (i: number) => {
    if (supers.superboon.has(i)) return "blue";
    if (supers.superbane.has(i)) return "red";
    return "#111";
  };
  const statusForIndex = (i: number) =>
    supers.superboon.has(i) ? "superboon" : supers.superbane.has(i) ? "superbane" : "neutral";

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <Link to="/heroes" style={{ textDecoration: "none" }}>
        ← Voltar
      </Link>

      <h1 style={{ marginTop: 12 }}>
        {name}
        {title ? `: ${title}` : ""}
      </h1>

      <div
        style={{
          marginTop: 16,
          background: "#fff",
          color: "#111",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        }}
      >
        {/* Dragonflowers selector */}
        <div style={{ marginBottom: 16 }}>
          <label>
            Dragonflowers:&nbsp;
            <select
              value={flowers}
              onChange={(e) => setFlowers(parseInt(e.target.value, 10))}
            >
              {dragonflowerOptions(u.flowers).map((opt) => (
                <option key={opt} value={opt}>
                  +{opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Merges selector */}
        <div style={{ marginBottom: 16 }}>
          <label>
            Merges:&nbsp;
            <select
              value={merges}
              onChange={(e) => setMerges(parseInt(e.target.value, 10))}
            >
              {mergeOptions().map((opt) => (
                <option key={opt} value={opt}>
                  +{opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Action bar: Reset / Max */}
<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
  {(() => {
    const MAX_MERGES = 10;
    const maxFlowers = Number(u.flowers ?? 0);
    const atMin = merges === 0 && flowers === 0;
    const atMax = merges === MAX_MERGES && flowers === maxFlowers;

    return (
      <>
        <button
          type="button"
          onClick={() => {
            setMerges(0);
            setFlowers(0);
          }}
          disabled={atMin}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ddd",
            color: "#111",
            background: atMin ? "#f5f5f5" : "#fff",
            cursor: atMin ? "not-allowed" : "pointer",
          }}
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => {
            setMerges(MAX_MERGES);
            setFlowers(maxFlowers);
          }}
          disabled={atMax}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            color: "#111",
            border: "1px solid #ddd",
            background: atMax ? "#f5f5f5" : "#fff",
            cursor: atMax ? "not-allowed" : "pointer",
          }}
        >
          Max
        </button>
      </>
    );
  })()}
</div>


        {/* Resplendent toggle (só aparece quando há EX01) */}
        {hasResplendent && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={resplendent}
                onChange={(e) => setResplendent(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Resplendent (+2 a todos os stats)
            </label>
          </div>
        )}

        {/* Stats */}
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Level 40 (5★, neutro)
          {kit.weapon ? ` — com arma do kit${refinedEffect ? " (refined: Effect)" : ""}` : ""}
          {flowers ? ` — +${flowers} DF` : ""}
          {merges ? ` — +${merges} merges` : ""}
          {resplendent ? " — Resplendent" : ""}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 8,
          }}
        >
          {STAT_NAMES.map((label, i) => (
            <React.Fragment key={label}>
              <div style={{ opacity: 0.7 }}>{label}</div>
              <div
                title={statusForIndex(i)}
                style={{
                  color: colorForIndex(i),
                  fontWeight: statusForIndex(i) === "neutral" ? 600 : 700,
                }}
              >
                {displayed?.[i] ?? "—"}
              </div>
            </React.Fragment>
          ))}
        </div>

        <hr
          style={{
            margin: "16px 0",
            borderColor: "rgba(0,0,0,.08)",
          }}
        />

        {/* Info de base (opcional) */}
        <div style={{ opacity: 0.75, marginBottom: 8 }}>
          <small>
            (Neutro sem arma:{" "}
            {lv40Neutral
              ? `${lv40Neutral[0]}/${lv40Neutral[1]}/${lv40Neutral[2]}/${lv40Neutral[3]}/${lv40Neutral[4]}`
              : "—"}
            )
          </small>
        </div>

        {/* Kit */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 8,
          }}
        >
          <div style={{ opacity: 0.7 }}>Weapon</div>
          <div style={{ color: refinedEffect ? "#82f546" : undefined }}>
            {t(kit.weapon)}
            {refinedEffect ? " (Effect)" : ""}
          </div>

          <div style={{ opacity: 0.7 }}>Assist</div>
          <div>{t(kit.assist)}</div>

          <div style={{ opacity: 0.7 }}>Special</div>
          <div>{t(kit.special)}</div>

          <div style={{ opacity: 0.7 }}>A skill</div>
          <div>{t(kit.A)}</div>

          <div style={{ opacity: 0.7 }}>B skill</div>
          <div>{t(kit.B)}</div>

          <div style={{ opacity: 0.7 }}>C skill</div>
          <div>{t(kit.C)}</div>

          <div style={{ opacity: 0.7 }}>X skill</div>
          <div>{t(kit.X)}</div>
        </div>
      </div>
    </div>
  );
}
