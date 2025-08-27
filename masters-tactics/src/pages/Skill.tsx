// src/pages/Skill.tsx
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";

import passives from "../data/content/passives-list.json";

// Tipos tolerantes para variações do refinado
type RawPassive = {
  id?: string; Id?: string; sid?: string; SID?: string;
  name?: string; Name?: string;
  slot?: string; Slot?: string; type?: string; Type?: string; category?: string; Category?: string;
  sp?: number; SP?: number; cost?: number; Cost?: number;
  desc?: string; Desc?: string; description?: string; Description?: string; effect?: string; Effect?: string;
  statModifiers?: any; stats?: any;
  exclusive?: boolean | number | string;
  altNames?: string[];
  levels?: any[];

  Passive?: any; passive?: any; // wrappers ocasionais
};

type FlatSkill = {
  key: string;            // id/sid/tagid/name normalizado para URL
  name: string;
  slot?: string;          // "A" | "B" | "C" | "S" | "X" | outro texto
  sp?: number;
  desc?: string;
  stats?: number[];       // [HP, ATK, SPD, DEF, RES] se existir
};

function unwrap(x: any): any {
  if (!x || typeof x !== "object") return x;
  return x.Passive ?? x.passive ?? x;
}

const num = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function readStatMods5(src: any): number[] | undefined {
  if (!src) return undefined;
  if (Array.isArray(src)) {
    const arr = src.slice(0, 5).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
    return arr.length === 5 ? arr : undefined;
  }
  if (typeof src === "object") {
    const hp  = num(src.hp  ?? src.HP  ?? 0) ?? 0;
    const atk = num(src.atk ?? src.ATK ?? 0) ?? 0;
    const spd = num(src.spd ?? src.SPD ?? 0) ?? 0;
    const def = num(src.def ?? src.DEF ?? 0) ?? 0;
    const res = num(src.res ?? src.RES ?? 0) ?? 0;
    return [hp, atk, spd, def, res];
  }
  return undefined;
}

function pickName(obj: any): string | undefined {
  const v = obj?.name ?? obj?.Name ?? obj?.id ?? obj?.Id ?? obj?.sid ?? obj?.SID;
  return typeof v === "string" && v.trim() ? String(v) : undefined;
}

// Reconhece A/B/C/S (Seals) e X (Echo)
function pickSlot(obj: any): string | undefined {
  const raw =
    obj?.slot ?? obj?.Slot ?? obj?.type ?? obj?.Type ?? obj?.category ?? obj?.Category;
  if (!raw) return undefined;
  const up = String(raw).trim().toUpperCase();

  if (/^(?:PASSIVE\s*)?A$/.test(up)) return "A";
  if (/^(?:PASSIVE\s*)?B$/.test(up)) return "B";
  if (/^(?:PASSIVE\s*)?C$/.test(up)) return "C";

  if (/^(?:PASSIVE\s*)?S$/.test(up) || /\bSEAL\b/.test(up) || /\bSACRED\s*SEAL\b/.test(up)) return "S";

  if (/^(?:PASSIVE\s*)?X$/.test(up) || /\bECHO\b/.test(up)) return "X";

  return String(raw).trim();
}

function pickSP(base: any, lv: any): number | undefined {
  return (
    num(lv?.sp ?? lv?.SP ?? lv?.cost ?? lv?.Cost) ??
    num(base?.sp ?? base?.SP ?? base?.cost ?? base?.Cost)
  );
}
function pickDesc(base: any, lv: any): string | undefined {
  const v =
    lv?.desc ?? lv?.Desc ?? lv?.description ?? lv?.Description ?? lv?.effect ?? lv?.Effect ??
    base?.desc ?? base?.Desc ?? base?.description ?? base?.Description ?? base?.effect ?? base?.Effect;
  return typeof v === "string" && v.trim() ? v : undefined;
}

function toFlatList(src: any): FlatSkill[] {
  const out: FlatSkill[] = [];

  const push = (baseIn: any) => {
    const base = unwrap(baseIn) as RawPassive;
    if (!base || typeof base !== "object") return;

    const slot = pickSlot(base);

    if (Array.isArray((base as any).levels) && (base as any).levels.length) {
      for (const lv of (base as any).levels) {
        const name = pickName(lv) ?? pickName(base);
        if (!name) continue;
        // chave com fallback para tagid (S e X muitas vezes usam isso)
        const key = String(lv?.id ?? lv?.sid ?? lv?.tagid ?? name);
        out.push({
          key,
          name,
          slot,
          sp: pickSP(base, lv),
          desc: pickDesc(base, lv),
          stats: readStatMods5(lv?.statModifiers ?? lv?.stats),
        });
        if (Array.isArray(lv?.altNames)) {
          for (const alt of lv.altNames) {
            if (typeof alt === "string" && alt.trim()) {
              out.push({
                key: String(alt),
                name,
                slot,
                sp: pickSP(base, lv),
                desc: pickDesc(base, lv),
                stats: readStatMods5(lv?.statModifiers ?? lv?.stats),
              });
            }
          }
        }
      }
      return;
    }

    // Sem levels
    const name = pickName(base);
    if (!name) return;
    const key = String(base.id ?? base.sid ?? (base as any)?.tagid ?? name);
    out.push({
      key,
      name,
      slot,
      sp: pickSP(base, undefined),
      desc: pickDesc(base, undefined),
      stats: readStatMods5((base as any).statModifiers ?? (base as any).stats),
    });

    if (Array.isArray(base.altNames)) {
      for (const alt of base.altNames) {
        if (typeof alt === "string" && alt.trim()) {
          out.push({
            key: String(alt),
            name,
            slot,
            sp: pickSP(base, undefined),
            desc: pickDesc(base, undefined),
            stats: readStatMods5((base as any).statModifiers ?? (base as any).stats),
          });
        }
      }
    }
  };

  if (Array.isArray(src)) for (const it of src) push(it);
  else if (typeof src === "object") for (const v of Object.values(src)) push(v);

  const seen = new Set<string>();
  return out.filter((row) => (seen.has(row.key) ? false : (seen.add(row.key), true)));
}

function formatMods(arr?: number[]): string {
  if (!arr || arr.length < 5) return "+0 HP, +0 Atk, +0 Spd, +0 Def, +0 Res";
  const [hp, atk, spd, def, res] = arr.map((x) => Number(x) || 0);
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  return `${sign(hp)} HP, ${sign(atk)} Atk, ${sign(spd)} Spd, ${sign(def)} Def, ${sign(res)} Res`;
}

export default function SkillPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { id } = useParams();
  const key = decodeURIComponent(id ?? "");

  const list = useMemo(() => toFlatList(passives), []);
  const skill = useMemo(
    () =>
      list.find((s) => s.key === key) ||
      list.find((s) => s.name === key), // fallback por nome
    [list, key]
  );

  // Back relativo ao histórico (fallback para /skills)
  const canGoBack =
    typeof window !== "undefined" &&
    typeof window.history?.state?.idx === "number" &&
    window.history.state.idx > 0;

  const from = (location.state as any)?.from;
  const backHref =
    (from && `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`) ||
    "/skills";

  if (!skill) {
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
          ← Voltar
        </a>
        <p>Skill não encontrada.</p>
      </div>
    );
  }

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
        ← Voltar
      </a>

      <h2 style={{ marginTop: 12 }}>{skill.name}</h2>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>
        Slot: {skill.slot ?? "—"}{skill.sp != null ? ` • SP ${skill.sp}` : ""}
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>
        {skill.desc ?? "—"}
      </div>

      {skill.stats && skill.stats.some((v) => v) && (
        <>
          <hr style={{ margin: "16px 0", borderColor: "rgba(0,0,0,.08)" }} />
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Stat modifiers</div>
          <div>{formatMods(skill.stats)}</div>
        </>
      )}
    </div>
  );
}
