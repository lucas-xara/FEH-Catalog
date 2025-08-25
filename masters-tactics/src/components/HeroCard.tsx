// src/components/HeroCard.tsx
import type { Hero } from "../types";

export default function HeroCard({ hero }: { hero: Hero }) {
  return (
    <div
      style={{
        background: "#fff",
        color: "#111",
        padding: 12,
        borderRadius: 12,
        boxShadow: "0 2px 12px rgba(0,0,0,.08)",
      }}
    >
      <strong style={{ fontSize: 18 }}>{hero.name || hero.id}</strong>
      {hero.title && <div style={{ opacity: 0.75, marginTop: 2 }}>{hero.title}</div>}
    </div>
  );
}
