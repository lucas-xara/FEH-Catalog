import { useParams, Link } from "react-router-dom";
import React from "react";
import skillsJson from "../data/content/onlineskills.json";
import enLang from "../data/languages/unitlanguages-USEN.json";
import unitsJson from "../data/content/onlineunits.json";
import { nameKeyFromSid } from "../utils/skills";

type SkillsDump = { weapons: Record<string, any> };
type OnlineUnits = Record<string, any>;

// ==== Tabela de bits ====
const BIT = {
  RedSword: 1, BlueLance: 2, GreenAxe: 4,

  RedBow: 8, BlueBow: 16, GreenBow: 32, ColorlessBow: 64,
  RedDagger: 128, BlueDagger: 256, GreenDagger: 512, ColorlessDagger: 1024,

  RedTome: 2048, BlueTome: 4096, GreenTome: 8192, ColorlessTome: 16384,

  Staff: 32768,

  RedBreath: 65536, BlueBreath: 131072, GreenBreath: 262144, ColorlessBreath: 524288,

  RedBeast: 1048576, BlueBeast: 2097152, GreenBeast: 4194304, ColorlessBeast: 8388608,
} as const;

const GROUP = {
  Bow: BIT.RedBow | BIT.BlueBow | BIT.GreenBow | BIT.ColorlessBow,                 // 120
  Dagger: BIT.RedDagger | BIT.BlueDagger | BIT.GreenDagger | BIT.ColorlessDagger,  // 1920
  Tome: BIT.RedTome | BIT.BlueTome | BIT.GreenTome | BIT.ColorlessTome,            // 30720
  Breath: BIT.RedBreath | BIT.BlueBreath | BIT.GreenBreath | BIT.ColorlessBreath,  // 983040
  Beast: BIT.RedBeast | BIT.BlueBeast | BIT.GreenBeast | BIT.ColorlessBeast,       // 15728640
};

// ===== helpers de label por bit único =====
function labelFromSingleBit(m: number): string | undefined {
  if (m === BIT.RedSword) return "Red Sword";
  if (m === BIT.BlueLance) return "Blue Lance";
  if (m === BIT.GreenAxe)  return "Green Axe";

  if (m === BIT.RedBow) return "Red Bow";
  if (m === BIT.BlueBow) return "Blue Bow";
  if (m === BIT.GreenBow) return "Green Bow";
  if (m === BIT.ColorlessBow) return "Colorless Bow";

  if (m === BIT.RedDagger) return "Red Dagger";
  if (m === BIT.BlueDagger) return "Blue Dagger";
  if (m === BIT.GreenDagger) return "Green Dagger";
  if (m === BIT.ColorlessDagger) return "Colorless Dagger";

  if (m === BIT.RedTome) return "Red Tome";
  if (m === BIT.BlueTome) return "Blue Tome";
  if (m === BIT.GreenTome) return "Green Tome";
  if (m === BIT.ColorlessTome) return "Colorless Tome";

  if (m === BIT.Staff) return "Staff";

  if (m === BIT.RedBreath) return "Red Breath";
  if (m === BIT.BlueBreath) return "Blue Breath";
  if (m === BIT.GreenBreath) return "Green Breath";
  if (m === BIT.ColorlessBreath) return "Colorless Breath";

  if (m === BIT.RedBeast) return "Red Beast";
  if (m === BIT.BlueBeast) return "Blue Beast";
  if (m === BIT.GreenBeast) return "Green Beast";
  if (m === BIT.ColorlessBeast) return "Colorless Beast";

  return undefined;
}

function isGroup(mask: number, group: number) {
  return mask === group;
}
function isSingle(mask: number) {
  // é um dos bits únicos que conhecemos
  return Boolean(labelFromSingleBit(mask));
}

// ===== tenta inferir cor a partir do dono da PRF =====
function labelFromOwnerIfPrf(sid: string, units: OnlineUnits): string | undefined {
  // 1) acha um unit cujo basekit.weapon === sid
  let owner: any | undefined;
  for (const pid of Object.keys(units)) {
    const u = units[pid];
    if (u?.basekit?.weapon === sid) { owner = u; break; }
  }
  if (!owner) return undefined;

  // 2) tenta extrair o mask de arma do unit (vários dumps usam chaves diferentes)
  const unitMask =
    Number(owner.weapon ?? owner.weapontype ?? owner.weptype ?? owner.wep ?? NaN);
  if (!Number.isFinite(unitMask)) return undefined;

  // 3) converte para label colorida se for uma das classes multi-cor
  // (Bow/Dagger/Breath/Beast). Para Sword/Lance/Axe/Tome/Staff o próprio bit único já resolve.
  const single = labelFromSingleBit(unitMask);
  return single;
}

// ===== label final =====
function typeLabel(mask: number | undefined, w: any, units: OnlineUnits): string {
  if (!Number.isFinite(mask)) return "—";
  const m = mask as number;

  // Se for bit único conhecido, retorna a cor diretamente
  const single = labelFromSingleBit(m);
  if (single) return single;

  // Se for grupo, decide entre genérico (inheritable) e cor do dono (PRF)
  if (isGroup(m, GROUP.Bow)) {
    if (w?.prf) return labelFromOwnerIfPrf(w.__sid ?? w.sid ?? w.id ?? w.key ?? w.name ?? w.SID ?? w?.sidOriginal ?? w?.__sidOriginal ?? "", units) || "Bow";
    return "Bow";
  }
  if (isGroup(m, GROUP.Dagger)) {
    if (w?.prf) return labelFromOwnerIfPrf(w.__sid ?? w.sid ?? w.id ?? w.key ?? w.name ?? w.SID ?? "", units) || "Dagger";
    return "Dagger";
  }
  if (isGroup(m, GROUP.Breath)) {
    if (w?.prf) return labelFromOwnerIfPrf(w.__sid ?? w.sid ?? w.id ?? w.key ?? w.name ?? w.SID ?? "", units) || "Breath";
    return "Breath";
  }
  if (isGroup(m, GROUP.Beast)) {
    if (w?.prf) return labelFromOwnerIfPrf(w.__sid ?? w.sid ?? w.id ?? w.key ?? w.name ?? w.SID ?? "", units) || "Beast";
    return "Beast";
  }
  if (isGroup(m, GROUP.Tome)) return "Tome"; // tomes quase sempre já vêm coloridos; grupo = inheritable

  return "—";
}

function rangeFromMask(mask?: number): number | undefined {
  if (!Number.isFinite(mask)) return undefined;
  const m = mask as number;
  const ANY_2R = GROUP.Bow | GROUP.Dagger | GROUP.Tome | BIT.Staff;
  if ((m & ANY_2R) !== 0) return 2; // bows/daggers/tomes/staff
  if ((m & (BIT.RedSword | BIT.BlueLance | BIT.GreenAxe)) !== 0) return 1;
  if ((m & (BIT.RedBeast | BIT.BlueBeast | BIT.GreenBeast | BIT.ColorlessBeast)) !== 0) return 1;
  if ((m & (BIT.RedBreath | BIT.BlueBreath | BIT.GreenBreath | BIT.ColorlessBreath)) !== 0) return 1;
  return undefined;
}

// Heurística para pegar descrição do lang
function findDesc(lang: Record<string, string>, sid: string): string | undefined {
  const candidates = [
    sid.replace(/^SID_/, "MID_") + "_DESC",
    sid.replace(/^SID_/, "MSID_") + "_DESC",
    sid.replace(/^SID_/, "MID_"),
  ];
  for (const k of candidates) {
    const v = lang[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function formatMods(arr?: number[]): string {
  if (!arr || arr.length < 5) return "+0 HP, +0 Atk, +0 Spd, +0 Def, +0 Res";
  const [hp, atk, spd, def, res] = arr;
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  return `${sign(hp)} HP, ${sign(atk)} Atk, ${sign(spd)} Spd, ${sign(def)} Def, ${sign(res)} Res`;
}

export default function WeaponPage() {
  const { sid } = useParams();
  const skills = skillsJson as unknown as SkillsDump;
  const units = unitsJson as OnlineUnits;
  const lang = enLang as Record<string, string>;

  const key = decodeURIComponent(sid ?? "");
  const wRaw = (skills.weapons as any)?.[key];

  if (!wRaw) {
    return (
      <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        <p>Weapon not found.</p>
        <Link to="/weapons">← Back</Link>
      </div>
    );
  }

  // guardamos o SID no objeto (útil para a inferência do dono)
  const w = { ...wRaw, __sid: key };

  const name = lang[nameKeyFromSid(key)] ?? key;
  const mask = Number(w?.weapon);
  const type = typeLabel(mask, w, units);

  const mt = Array.isArray(w?.stats) ? w.stats[1] : undefined;
  const rng = rangeFromMask(mask);
  const sp = w?.sp ?? w?.SP ?? undefined;

  const desc = findDesc(lang, key) ?? "—";
  const refines = w?.refines && typeof w.refines === "object" ? w.refines : undefined;

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <Link to="/weapons" style={{ textDecoration: "none" }}>← Back</Link>
      <h1 style={{ marginTop: 12 }}>{name}</h1>

      <div style={{
        marginTop: 16, background: "#fff", color: "#111",
        borderRadius: 12, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,.08)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
          <div style={{ opacity: 0.7 }}>Type</div>
          <div>{type}</div>

          <div style={{ opacity: 0.7 }}>MT</div>
          <div>{Number.isFinite(mt) ? mt : "—"}</div>

          <div style={{ opacity: 0.7 }}>RNG</div>
          <div>{rng ?? "—"}</div>

          <div style={{ opacity: 0.7 }}>SP</div>
          <div>{Number.isFinite(sp) ? sp : "—"}</div>

          <div style={{ opacity: 0.7, alignSelf: "start" }}>Description</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{desc}</div>
        </div>

        {refines && (
          <>
            <hr style={{ margin: "16px 0", borderColor: "rgba(0,0,0,.08)" }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Refine</div>

            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
              {Object.keys(refines).map((rk) => {
                const r = refines[rk];
                const stats = Array.isArray(r?.stats) ? r.stats.slice(0, 5) : undefined;
                const isEffect = rk.toLowerCase() === "effect";
                return (
                  <React.Fragment key={rk}>
                    <div style={{ opacity: 0.7 }}>{rk}</div>
                    <div style={{ color: isEffect ? "#22c55e" : undefined }}>
                      {isEffect ? "Effect refine" : "Smithy refine"} — {formatMods(stats)}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
