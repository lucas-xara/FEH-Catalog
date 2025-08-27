// src/pages/Skills.tsx
import { Link } from "react-router-dom";
import { useMemo } from "react";
import passives from "../data/content/passives-list.json";

// Tipos tolerantes para variações do refinado
type RawPassive = {
  id?: string;
  Id?: string;
  sid?: string;
  SID?: string;
  name?: string;
  Name?: string;
  slot?: string;
  Slot?: string;
  type?: string;
  Type?: string;
  category?: string;
  Category?: string;
  sp?: number;
  SP?: number;
  cost?: number;
  Cost?: number;
  desc?: string;
  Desc?: string;
  description?: string;
  Description?: string;
  effect?: string;
  Effect?: string;
  statModifiers?: any;
  stats?: any;
  altNames?: string[];
  levels?: any[];
  Passive?: any;
  passive?: any; // wrappers
};

type FlatSkill = {
  key: string; // id/sid/tagid/name normalizado para URL
  name: string;
  slot?: string; // "A" | "B" | "C" | "S" | "X" | outro texto
  sp?: number;
};

function unwrap(x: any): any {
  if (!x || typeof x !== "object") return x;
  return x.Passive ?? x.passive ?? x;
}
const num = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
function pickName(obj: any): string | undefined {
  const v =
    obj?.name ?? obj?.Name ?? obj?.id ?? obj?.Id ?? obj?.sid ?? obj?.SID;
  return typeof v === "string" && v.trim() ? String(v) : undefined;
}

// Reconhece A/B/C e também S (Selos) e X (Echo)
function pickSlot(obj: any): string | undefined {
  const raw =
    obj?.slot ??
    obj?.Slot ??
    obj?.type ??
    obj?.Type ??
    obj?.category ??
    obj?.Category;
  if (!raw) return undefined;
  const up = String(raw).trim().toUpperCase();

  // A/B/C diretos ou "Passive A/B/C"
  if (/^(?:PASSIVE\s*)?A$/.test(up)) return "A";
  if (/^(?:PASSIVE\s*)?B$/.test(up)) return "B";
  if (/^(?:PASSIVE\s*)?C$/.test(up)) return "C";

  // Selo: "S" | "Passive S" | "Seal" | "Sacred Seal"
  if (
    /^(?:PASSIVE\s*)?S$/.test(up) ||
    /\bSEAL\b/.test(up) ||
    /\bSACRED\s*SEAL\b/.test(up)
  )
    return "S";

  // Echo: "X" | "Passive X" | contém "Echo"
  if (/^(?:PASSIVE\s*)?X$/.test(up) || /\bECHO\b/.test(up)) return "X";

  // fallback: mantém texto original
  return String(raw).trim();
}

function pickSP(base: any, lv: any): number | undefined {
  return (
    num(lv?.sp ?? lv?.SP ?? lv?.cost ?? lv?.Cost) ??
    num(base?.sp ?? base?.SP ?? base?.cost ?? base?.Cost)
  );
}

function toFlatList(src: any): FlatSkill[] {
  const out: FlatSkill[] = [];

  const push = (baseIn: any) => {
    const base = unwrap(baseIn) as RawPassive;
    if (!base || typeof base !== "object") return;

    const slot = pickSlot(base);

    if (Array.isArray(base.levels) && base.levels.length) {
      for (const lv of base.levels) {
        const name = pickName(lv) ?? pickName(base);
        if (!name) continue;
        // usa tagid como fallback de chave quando não há id/sid
        const key = String(lv?.id ?? lv?.sid ?? lv?.tagid ?? name);
        out.push({ key, name, slot, sp: pickSP(base, lv) });

        // também indexa altNames para a mesma entrada
        if (Array.isArray(lv?.altNames)) {
          for (const alt of lv.altNames) {
            if (typeof alt === "string" && alt.trim()) {
              out.push({ key: String(alt), name, slot, sp: pickSP(base, lv) });
            }
          }
        }
      }
      return;
    }

    // sem levels
    const name = pickName(base);
    if (!name) return;
    const key = String(base.id ?? base.sid ?? (base as any)?.tagid ?? name);
    out.push({ key, name, slot, sp: pickSP(base, undefined) });

    if (Array.isArray(base.altNames)) {
      for (const alt of base.altNames) {
        if (typeof alt === "string" && alt.trim()) {
          out.push({
            key: String(alt),
            name,
            slot,
            sp: pickSP(base, undefined),
          });
        }
      }
    }
  };

  if (Array.isArray(src)) for (const it of src) push(it);
  else if (typeof src === "object") for (const v of Object.values(src)) push(v);

  // dedup por key
  const seen = new Set<string>();
  return out.filter((row) =>
    seen.has(row.key) ? false : (seen.add(row.key), true)
  );
}

export default function SkillsPage() {
  const list = useMemo(() => {
    const flat = toFlatList(passives);
    return flat.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>Skills</h1>
      <p style={{ marginTop: -8, opacity: 0.8 }}>{list.length} skills</p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {list.map((s) => (
          <Link
            key={s.key}
            to={`/skills/${encodeURIComponent(s.key)}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                color: "#111",
                background: "#fff",
                padding: 12,
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,.06)",
              }}
            >
              <strong>{s.name}</strong>
              <div style={{ opacity: 0.7 }}>
                Slot: {s.slot ?? "—"}
                {s.sp != null ? ` • SP ${s.sp}` : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
