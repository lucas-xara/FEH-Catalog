// src/pages/Weapon.tsx
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import React, { useMemo } from "react";

import weaponsData from "../data/content/weapons-list.json";

// Tipagem flexível para tolerar variações do refinado
type RefinedWeapon = {
  id?: string; sid?: string;
  name?: string; Name?: string;

  // tipo / classe / cor
  weaponType?: string; WeaponType?: string; type?: string; Type?: string;
  weaponClass?: string; class?: string; Class?: string;
  color?: string; Color?: string;

  // estatísticas e metadados
  might?: number; Might?: number;
  range?: number; Range?: number; rng?: number; RNG?: number;
  sp?: number; SP?: number; cost?: number; Cost?: number;
  stats?: number[];               // às vezes [HP, Mt, Spd, Def, Res] ou +extras
  desc?: string; description?: string; effect?: string; Effect?: string;

  // refinamentos
  refines?: any;                  // pode ser objeto {Atk:{...},Effect:{...}} ou array
  extraSkills?: any;              // para PRF effect text em alguns dumps

  // wrappers ocasionais:
  Weapon?: any; weapon?: any;
};

function unwrap(x: any): any {
  if (!x || typeof x !== "object") return x;
  return x.Weapon ?? x.weapon ?? x;
}

function toFlatList(src: any): RefinedWeapon[] {
  const out: RefinedWeapon[] = [];
  const push = (it: any) => {
    const w = unwrap(it);
    if (w && typeof w === "object") out.push(w);
  };
  if (Array.isArray(src)) for (const it of src) push(it);
  else if (typeof src === "object") for (const v of Object.values(src)) push(v);
  return out;
}

const num = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function getName(w: RefinedWeapon): string {
  return String(w.name ?? w.Name ?? w.sid ?? w.id ?? "—");
}

function getTypeLabel(w: RefinedWeapon): string {
  const direct =
    w.weaponType ?? w.WeaponType ??
    w.type ?? w.Type;
  if (direct && String(direct).trim()) return String(direct).trim();

  const klass = w.weaponClass ?? (w as any).class ?? (w as any).Class;
  const color = w.color ?? w.Color;
  if (klass && color) return `${color} ${klass}`;
  if (klass) return String(klass);
  if (color) return String(color);
  return "—";
}

function inferRangeFromType(t?: string): number | undefined {
  if (!t) return undefined;
  const s = t.toLowerCase();
  // 2-range: bows, daggers, tomes, staff
  if (/(bow|dagger|tome|staff)/.test(s)) return 2;
  // 1-range: swords, lances, axes, breath, beast
  if (/(sword|lance|axe|breath|beast)/.test(s)) return 1;
  return undefined;
}

function getRange(w: RefinedWeapon, typeLabel: string): number | undefined {
  return (
    num(w.range ?? w.Range ?? w.rng ?? w.RNG) ??
    inferRangeFromType(typeLabel)
  );
}

function getMight(w: RefinedWeapon): number | undefined {
  // preferir campo explícito; se ausente, alguns dumps colocam Mt em stats[1]
  return num(w.might ?? w.Might) ?? (Array.isArray(w.stats) ? num(w.stats[1]) : undefined);
}

function getSP(w: RefinedWeapon): number | undefined {
  return num(w.sp ?? w.SP ?? w.cost ?? w.Cost);
}

function getDescription(w: RefinedWeapon): string {
  const d =
    w.desc ?? w.description ?? w.Effect ?? w.effect ??
    // alguns dumps colocam um texto PRF em extraSkills.effectSkill
    (w.extraSkills && typeof w.extraSkills === "object"
      ? (Array.isArray(w.extraSkills)
          ? w.extraSkills.map((x: any) => x?.effectSkill).find((s: any) => typeof s === "string" && s.trim())
          : (w.extraSkills as any).effectSkill)
      : undefined);
  return (typeof d === "string" && d.trim()) ? d : "—";
}

function readStatMods5(src: any): number[] | undefined {
  if (!src) return undefined;
  const arr = Array.isArray(src) ? src.slice(0, 5) :
    (typeof src === "object"
      ? [
          num((src as any).hp ?? (src as any).HP ?? 0) ?? 0,
          num((src as any).atk ?? (src as any).ATK ?? 0) ?? 0,
          num((src as any).spd ?? (src as any).SPD ?? 0) ?? 0,
          num((src as any).def ?? (src as any).DEF ?? 0) ?? 0,
          num((src as any).res ?? (src as any).RES ?? 0) ?? 0,
        ]
      : undefined);
  if (!arr || arr.length < 5) return undefined;
  return arr.map((v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0)).slice(0, 5);
}

function formatMods(arr?: number[]): string {
  if (!arr || arr.length < 5) return "+0 HP, +0 Atk, +0 Spd, +0 Def, +0 Res";
  const [hp, atk, spd, def, res] = arr.map((x) => Number(x) || 0);
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  return `${sign(hp)} HP, ${sign(atk)} Atk, ${sign(spd)} Spd, ${sign(def)} Def, ${sign(res)} Res`;
}

type RefineRow = { key: string; isEffect: boolean; stats?: number[]; text?: string };

function normalizeRefines(w: RefinedWeapon): RefineRow[] {
  const rows: RefineRow[] = [];
  const ref = w.refines;

  const pickText = (obj: any): string | undefined => {
    const t =
      obj?.refineEffect ?? obj?.effect ?? obj?.Effect ??
      obj?.desc ?? obj?.description ?? obj?.refine_desc ?? obj?.refineDescription;
    return (typeof t === "string" && t.trim()) ? t : undefined;
  };

  const pickStats = (obj: any): number[] | undefined =>
    readStatMods5(obj?.stats ?? obj?.statModifiers ?? obj?.mods);

  if (!ref) return rows;

  if (Array.isArray(ref)) {
    for (const r of ref) {
      const key = String(r?.name ?? r?.type ?? r?.key ?? "Refine");
      const text = pickText(r);
      const stats = pickStats(r);
      const isEffect = key.toLowerCase().includes("effect") || Boolean(text && !stats);
      rows.push({ key, isEffect, text, stats });
    }
  } else if (typeof ref === "object") {
    for (const k of Object.keys(ref)) {
      const r = (ref as any)[k];
      const text = pickText(r);
      const stats = pickStats(r);
      const isEffect = k.toLowerCase() === "effect" || Boolean(text && !stats);
      rows.push({ key: k, isEffect, text, stats });
    }
  }

  return rows;
}

export default function WeaponPage() {
  const { id } = useParams();
  const key = decodeURIComponent(id ?? "");
  const location = useLocation();
  const navigate = useNavigate();

  // Achamos o item no refinado (por sid/id; fallback por nome)
  const { weapon, flat } = useMemo(() => {
    const flat = toFlatList(weaponsData);
    const byId = flat.find(
      (w) => String(w.sid ?? "") === key || String(w.id ?? "") === key
    );
    const byName = byId ? undefined : flat.find(
      (w) => String(w.name ?? w.Name ?? "") === key
    );
    return { weapon: byId ?? byName, flat };
  }, [key]);

  // Back relativo ao histórico (com fallback para /weapons)
  const canGoBack =
    typeof window !== "undefined" &&
    typeof window.history?.state?.idx === "number" &&
    window.history.state.idx > 0;

  const from = (location.state as any)?.from;
  const backHref =
    (from &&
      `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`) ||
    "/weapons";

  if (!weapon) {
    return (
      <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        <a
          href={backHref}
          onClick={(e) => {
            e.preventDefault();
            if (canGoBack) navigate(-1);
            else navigate(backHref, { replace: true });
          }}
          style={{ textDecoration: "none" }}
        >
          ← Back
        </a>
        <p>Weapon not found.</p>
      </div>
    );
  }

  const name = getName(weapon);
  const typeLabel = getTypeLabel(weapon);
  const mt = getMight(weapon);
  const rng = getRange(weapon, typeLabel);
  const sp = getSP(weapon);
  const desc = getDescription(weapon);
  const refines = normalizeRefines(weapon);

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      {/* ← Back relativo */}
      <a
        href={backHref}
        onClick={(e) => {
          e.preventDefault();
          if (canGoBack) navigate(-1);
          else navigate(backHref, { replace: true });
        }}
        style={{ textDecoration: "none" }}
      >
        ← Back
      </a>

      <h1 style={{ marginTop: 12 }}>{name}</h1>

      <div
        style={{
          marginTop: 16, background: "#fff", color: "#111",
          borderRadius: 12, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
          <div style={{ opacity: 0.7 }}>Type</div>
          <div>{typeLabel}</div>

          <div style={{ opacity: 0.7 }}>MT</div>
          <div>{Number.isFinite(mt as number) ? mt : "—"}</div>

          <div style={{ opacity: 0.7 }}>RNG</div>
          <div>{rng ?? "—"}</div>

          <div style={{ opacity: 0.7 }}>SP</div>
          <div>{Number.isFinite(sp as number) ? sp : "—"}</div>

          <div style={{ opacity: 0.7, alignSelf: "start" }}>Description</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{desc}</div>
        </div>

        {refines.length > 0 && (
          <>
            <hr style={{ margin: "16px 0", borderColor: "rgba(0,0,0,.08)" }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Refine</div>

            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
              {refines.map((r) => (
                <React.Fragment key={r.key}>
                  <div style={{ opacity: 0.7 }}>{r.key}</div>
                  <div style={{ color: r.isEffect ? "#22c55e" : undefined }}>
                    {r.isEffect
                      ? (r.text ?? "Effect refine")
                      : `Smithy refine — ${formatMods(r.stats)}`}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
