// src/pages/Weapons.tsx
import { Link } from "react-router-dom";
import { useMemo } from "react";

import weaponsData from "../data/content/weapons-list.json";

// Tipos “soltos” para tolerar variações do JSON refinado
type RefinedWeapon = {
  id?: string;
  sid?: string;
  name?: string;
  Name?: string;
  weaponType?: string;
  WeaponType?: string;
  type?: string;
  Type?: string;
  weaponClass?: string;
  class?: string;
  Class?: string;
  color?: string;
  Color?: string;
  // Outros campos podem existir e são ignorados aqui
};

function unwrap(item: any): any {
  // Alguns pipelines podem embrulhar como { Weapon: {...} }
  if (!item || typeof item !== "object") return item;
  return item.Weapon ?? item.weapon ?? item;
}

function toFlatList(src: any): RefinedWeapon[] {
  const out: RefinedWeapon[] = [];
  if (!src) return out;

  const push = (x: any) => {
    const w = unwrap(x);
    if (w && typeof w === "object") out.push(w);
  };

  if (Array.isArray(src)) {
    for (const it of src) push(it);
  } else if (typeof src === "object") {
    for (const v of Object.values(src)) push(v);
  }
  return out;
}

function getName(w: RefinedWeapon): string {
  return String(w.name ?? w.Name ?? w.id ?? w.sid ?? "—");
}

function getTypeLabel(w: RefinedWeapon): string {
  // Preferir campos diretos do refinado
  const direct = w.weaponType ?? w.WeaponType ?? w.type ?? w.Type;

  if (direct && String(direct).trim()) return String(direct).trim();

  // Tentar montar por color + class
  const klass = w.weaponClass ?? w.class ?? w.Class;
  const color = w.color ?? w.Color;
  if (klass && color) return `${color} ${klass}`;
  if (klass) return String(klass);
  if (color) return String(color);

  // Fallback
  return "—";
}

export default function WeaponsPage() {
  const list = useMemo(() => {
    const flat = toFlatList(weaponsData);
    const rows = flat.map((w) => {
      const name = getName(w);
      const type = getTypeLabel(w);
      // manter um id estável para a URL (usa sid/id/name nessa ordem)
      const sid = String(w.sid ?? w.id ?? name);
      return { sid, name, type };
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>Weapons</h1>

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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px,1fr) 220px",
            gap: 8,
            fontWeight: 700,
            borderBottom: "1px solid rgba(0,0,0,.08)",
            paddingBottom: 8,
            marginBottom: 8,
          }}
        >
          <div>Name</div>
          <div>Type</div>
        </div>

        {list.map((it) => (
          <div
            key={it.sid}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px,1fr) 220px",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid rgba(0,0,0,.05)",
            }}
          >
            <div>
              <Link
                to={`/weapons/${encodeURIComponent(it.sid)}`}
                state={{ from: location }}
                style={{ textDecoration: "none" }}
              >
                {it.name}
              </Link>
            </div>
            <div style={{ opacity: 0.85 }}>{it.type}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
