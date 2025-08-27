import { Link } from "react-router-dom";
import { useMemo } from "react";
import specials from "../data/content/specials-list.json";

function unwrap(x: any) {
  return x?.Special ?? x?.special ?? x;
}
function pickName(o: any) {
  return String(o?.name ?? o?.Name ?? o?.id ?? o?.Id ?? "—");
}
function keyOf(o: any) {
  return String(o?.id ?? o?.sid ?? o?.name ?? o?.Name ?? "");
}

export default function SpecialsPage() {
  const list = useMemo(() => {
    const out: any[] = [];
    const push = (it: any) => {
      const a = unwrap(it);
      if (a && typeof a === "object") out.push(a);
    };
    if (Array.isArray(specials)) specials.forEach(push);
    else Object.values(specials as any).forEach(push);
    return out
      .map((a) => ({ key: keyOf(a), name: pickName(a) }))
      .filter((r) => r.key)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>Specials</h1>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {list.map((it) => (
          <Link
            key={it.key}
            to={`/specials/${encodeURIComponent(it.key)}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background: "#fff",
                padding: 12,
                borderRadius: 12,
                boxShadow: "0 2px 10px rgba(0,0,0,.06)",
              }}
            >
              <strong>{it.name}</strong>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
