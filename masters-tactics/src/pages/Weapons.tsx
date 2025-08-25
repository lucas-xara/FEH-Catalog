import { Link } from "react-router-dom";
import React, { useMemo } from "react";
import skillsJson from "../data/content/onlineskills.json";
import enLang from "../data/languages/unitlanguages-USEN.json";
import { nameKeyFromSid } from "../utils/skills";

type SkillsDump = { weapons: Record<string, any> };
type Lang = Record<string, string>;

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

// >>> NOVA: retorna UMA string correta (genérica p/ grupo ou colorida p/ bit único)
function typeLabel(mask: number | undefined): string {
  if (!Number.isFinite(mask)) return "—";
  const m = mask as number;

  // classes 1-range fixas
  if (m === BIT.RedSword) return "Red Sword";
  if (m === BIT.BlueLance) return "Blue Lance";
  if (m === BIT.GreenAxe)  return "Green Axe";

  // Bow
  if (m === GROUP.Bow) return "Bow";
  if (m === BIT.RedBow) return "Red Bow";
  if (m === BIT.BlueBow) return "Blue Bow";
  if (m === BIT.GreenBow) return "Green Bow";
  if (m === BIT.ColorlessBow) return "Colorless Bow";

  // Dagger
  if (m === GROUP.Dagger) return "Dagger";
  if (m === BIT.RedDagger) return "Red Dagger";
  if (m === BIT.BlueDagger) return "Blue Dagger";
  if (m === BIT.GreenDagger) return "Green Dagger";
  if (m === BIT.ColorlessDagger) return "Colorless Dagger";

  // Tome
  if (m === GROUP.Tome) return "Tome";
  if (m === BIT.RedTome) return "Red Tome";
  if (m === BIT.BlueTome) return "Blue Tome";
  if (m === BIT.GreenTome) return "Green Tome";
  if (m === BIT.ColorlessTome) return "Colorless Tome";

  // Staff (dump marca com bit único)
  if (m === BIT.Staff) return "Staff";

  // Breath
  if (m === GROUP.Breath) return "Breath";
  if (m === BIT.RedBreath) return "Red Breath";
  if (m === BIT.BlueBreath) return "Blue Breath";
  if (m === BIT.GreenBreath) return "Green Breath";
  if (m === BIT.ColorlessBreath) return "Colorless Breath";

  // Beast
  if (m === GROUP.Beast) return "Beast";
  if (m === BIT.RedBeast) return "Red Beast";
  if (m === BIT.BlueBeast) return "Blue Beast";
  if (m === BIT.GreenBeast) return "Green Beast";
  if (m === BIT.ColorlessBeast) return "Colorless Beast";

  // desconhecido/combinações inesperadas
  return "—";
}

export default function WeaponsPage() {
  const skills = skillsJson as unknown as SkillsDump;
  const lang = enLang as Lang;

  const list = useMemo(() => {
    const weapons = skills.weapons || {};
    const rows = Object.keys(weapons).map((sid) => {
      const w = weapons[sid];
      const name = lang[nameKeyFromSid(sid)] ?? sid;
      const type = typeLabel(Number(w?.weapon));
      return { sid, name, type };
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [skills.weapons]);

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>Weapons</h1>
      <div style={{
        marginTop: 16, background: "#fff", color: "#111", borderRadius: 12,
        padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,.08)",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "minmax(320px,1fr) 220px",
          gap: 8, fontWeight: 700, borderBottom: "1px solid rgba(0,0,0,.08)",
          paddingBottom: 8, marginBottom: 8,
        }}>
          <div>Name</div><div>Type</div>
        </div>

        {list.map((it) => (
          <div key={it.sid} style={{
            display: "grid", gridTemplateColumns: "minmax(320px,1fr) 220px",
            gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,.05)",
          }}>
            <div>
              <Link to={`/weapons/${encodeURIComponent(it.sid)}`} style={{ textDecoration: "none" }}>
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
