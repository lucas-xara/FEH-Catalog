// src/pages/Special.tsx
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import specials from "../data/content/specials-list.json";

function unwrap(x: any) {
  return x?.Special ?? x?.special ?? x;
}
function toFlat(src: any) {
  const out: any[] = [];
  const push = (it: any) => {
    const a = unwrap(it);
    if (a && typeof a === "object") out.push(a);
  };
  if (Array.isArray(src)) src.forEach(push);
  else Object.values(src as any).forEach(push);
  return out;
}

function meta(s: any) {
  const sp = s?.sp ?? s?.SP ?? s?.cost ?? s?.Cost;
  const cd = s?.cooldown ?? s?.CD ?? s?.cd ?? s?.Charge;
  const rng = s?.range ?? s?.Range; // raramente em specials, mas deixei
  const bits: string[] = [];
  if (sp != null && String(sp) !== "") bits.push(`SP ${sp}`);
  if (cd != null && String(cd) !== "") bits.push(`CD ${cd}`);
  if (rng != null && String(rng) !== "") bits.push(`Rng ${rng}`);
  return bits.join(" • ");
}
function desc(s: any) {
  const d = s?.desc ?? s?.description ?? s?.Effect ?? s?.effect;
  return typeof d === "string" && d.trim() ? d : "—";
}

export default function SpecialPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { id } = useParams();
  const key = decodeURIComponent(id ?? "");

  const flat = useMemo(() => toFlat(specials), []);
  const a = useMemo(
    () =>
      flat.find((x) => String(x.id ?? x.sid ?? x.name ?? x.Name) === key) ||
      flat.find((x) => String(x.name ?? x.Name) === key),
    [flat, key]
  );

  // Back relativo ao histórico (fallback para /specials)
  const canGoBack =
    typeof window !== "undefined" &&
    typeof window.history?.state?.idx === "number" &&
    window.history.state.idx > 0;

  const from = (location.state as any)?.from;
  const backHref =
    (from && `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`) ||
    "/specials";

  if (!a) {
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
        <p>Special not found.</p>
      </div>
    );
  }

  const name = String(a.name ?? a.Name ?? key);

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
          marginTop: 16,
          background: "#fff",
          color: "#111",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ opacity: 0.7, marginBottom: 8 }}>{meta(a)}</div>
        <div style={{ whiteSpace: "pre-wrap" }}>{desc(a)}</div>
      </div>
    </div>
  );
}
