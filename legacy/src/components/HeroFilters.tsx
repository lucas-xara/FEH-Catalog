import { useMemo } from "react";

export type HeroFilterState = {
  q: string;
  color: "Any" | "Red" | "Blue" | "Green" | "Colorless";
  weapon: string | "Any";
  move: string | "Any";
  availability: "Any" | "Regular 5★" | "Regular 4★" | "4★ Special Rate" | "GHB" | "TT" | "Limited";
  resplendent: "Any" | "Yes" | "No";
  entryOrder: "Default" | "ID Asc" | "ID Desc";
};

type Props = {
  state: HeroFilterState;
  onChange: (next: Partial<HeroFilterState>) => void;
  weaponOptions: string[];
  moveOptions: string[];
};

export default function HeroFilters({ state, onChange, weaponOptions, moveOptions }: Props) {
  const wOpts = useMemo(
    () => ["Any", ...weaponOptions],
    [weaponOptions]
  );
  const mOpts = useMemo(
    () => ["Any", ...moveOptions],
    [moveOptions]
  );

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 5, backdropFilter: "blur(6px)",
      background: "rgba(255,255,255,.8)", borderBottom: "1px solid rgba(0,0,0,.08)"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(5, 1fr) 1fr", gap: 12, padding: "12px 16px", maxWidth: 960, margin: "0 auto" }}>
        <input
          value={state.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Search name/title..."
          style={{ padding: 8, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <select value={state.color} onChange={(e) => onChange({ color: e.target.value as any })} style={selStyle}>
          {["Any", "Red", "Blue", "Green", "Colorless"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={state.weapon} onChange={(e) => onChange({ weapon: e.target.value as any })} style={selStyle}>
          {wOpts.map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        <select value={state.move} onChange={(e) => onChange({ move: e.target.value as any })} style={selStyle}>
          {mOpts.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={state.availability} onChange={(e) => onChange({ availability: e.target.value as any })} style={selStyle}>
          {["Any","Regular 5★","Regular 4★","4★ Special Rate","GHB","TT","Limited"].map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={state.resplendent} onChange={(e) => onChange({ resplendent: e.target.value as any })} style={selStyle}>
          {["Any","Yes","No"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={state.entryOrder} onChange={(e) => onChange({ entryOrder: e.target.value as any })} style={selStyle}>
          {["Default","ID Asc","ID Desc"].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

const selStyle: React.CSSProperties = { padding: 8, borderRadius: 10, border: "1px solid #ddd" };
