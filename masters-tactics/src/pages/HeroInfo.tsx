// src/pages/Hero.tsx (mock) — versão atualizada
// Arquivo 100% independente, sem imports.
// Requer React disponível globalmente (ex.: Vite/Next com JSX automático).
import eliwood from "../assets/placeholders/eliwood.webp";
import sword from "../assets/placeholders/Icon_Class_Red_Sword.webp";
import assist from "../assets/placeholders/Icon_Skill_Assist.webp";
import special from "../assets/placeholders/Icon_Skill_Special.webp";
import cskill from "../assets/placeholders/Passive_Icon_C.webp";
import bskill from "../assets/placeholders/Passive_Icon_B.webp";
import askill from "../assets/placeholders/Passive_Icon_A.webp";

import deathb from "../assets/placeholders/Death_Blow_4.webp";
import flowr from "../assets/placeholders/Flow_Refresh_3.webp";
import visiona from "../assets/placeholders/Vision_of_Arcadia_II.webp";

import infantry from "../assets/placeholders/Icon_Move_Infantry.webp";
import blessing from "../assets/placeholders/Icon_LegendWind.webp";

import dragonflowers from "../assets/placeholders/dragonflowers.webp";
import mergesI from "../assets/placeholders/orb_icon.webp";
import resplendent from "../assets/placeholders/Icon_Resplendent.webp";

import fivestars from "../assets/placeholders/5-stars.webp";

import bg from "../assets/placeholders/bg.png";

export default function HeroPageMock() {
  // Hooks via React global (sem imports).
  const R: any = (globalThis as any).React || {};
  const useState = R.useState || ((v: any) => [v, (_: any) => {}]);
  const useEffect = R.useEffect || (() => {});
  const useMemo = R.useMemo || ((fn: any, _deps?: any[]) => fn());

  // —————————————————————————————————————————————
  // Placeholders de dados (hero + kit + stats)
  // —————————————————————————————————————————————

  function DetailsCard({
    title,
    headerIconLeft,
    headerIconBadge,
    meta, // JSX ou string, ex.: <><b>SP</b> 240</>
    children, // descrição
    startOpen = false,
  }: {
    title: string;
    headerIconLeft?: any;
    headerIconBadge?: any;
    meta?: any;
    children?: any;
    startOpen?: boolean;
  }) {
    const wrap = {
      display: "flex",
      flexDirection: "column" as const,
      gap: 8,
      backgroundColor: "#FFF9E6",
      borderRadius: 10,
      boxShadow: "inset 0 0 0 4px #DDA715",
      padding: "16px 21px",
    };
    const summary = {
      listStyle: "none",
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      userSelect: "none" as const,
    };

    return (
      <details open={startOpen} style={wrap}>
        <summary style={summary}>
          <span style={{ display: "flex", alignItems: "flex-end" }}>
            {headerIconLeft}
            {headerIconBadge}
          </span>
          <div style={{ fontSize: 16, fontWeight: 800, color: "black" }}>
            {title}
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 16,
              color: "black",
              opacity: 0.7,
            }}
          >
            ▼
          </div>
        </summary>

        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {meta && <div style={{ fontSize: 12, color: "black" }}>{meta}</div>}
          {children && (
            <div style={{ fontSize: 12, color: "black" }}>{children}</div>
          )}
        </div>
      </details>
    );
  }

  const hero = {
    version: "3.6",
    infobox: {
      Name: "Eliwood",
      Title: "Blazing Knight",
      Properties: "legendary, resplendent",
    },
    // Stats base Lv1 (HP/ATK/SPD/DEF/RES)
    stats: {
      Lv1: { HP: 18, ATK: 9, SPD: 10, DEF: 6, RES: 5 },
      GrowthRates: { HP: 60, ATK: 55, SPD: 65, DEF: 40, RES: 35 },
    },
    weapons: ["Ardent Durandal"],
    assists: ["Rally Spd/Res+"],
    specials: ["Luna"],
    passives: {
      A: ["Death Blow 4"],
      B: ["Flow Refresh 3"],
      C: ["Vision of Arcadia II"],
      X: [""],
    },
    dragonflowersCap: 20,
  } as const;

  // —————————————————————————————————————————————
  // Utils locais (placeholders simplificados)
  // —————————————————————————————————————————————
  const STAT_NAMES = ["HP", "ATK", "SPD", "DEF", "RES"] as const;

  function lv40FromBaseAndGrowth(base: number[], growths: number[]): number[] {
    // Mock simples: valor neutro = base + round(growth/10 * 7)
    return base.map((b, i) => b + Math.round((growths[i] / 10) * 7));
  }

  function dragonflowerOptions(max = 20): number[] {
    return Array.from({ length: max + 1 }, (_, i) => i);
  }

  function mergeOptions(): number[] {
    return Array.from({ length: 11 }, (_, i) => i); // 0..10
  }

  function computeDisplayedStats(
    neutral40: number[],
    opts: {
      flowers: number;
      merges: number;
      resplendent: boolean;
      weaponMods?: number[];
      passiveMods?: number[][];
    }
  ): number[] {
    let out = [...neutral40];
    // DF: distribuição mock só pra demo
    for (let i = 0; i < opts.flowers; i++) out[i % 5] += 1;
    if (opts.resplendent) out = out.map((v) => v + 2);
    const mergeBonus = Math.floor(opts.merges / 2);
    out = out.map((v) => v + mergeBonus);

    if (opts.weaponMods?.length === 5) {
      out = out.map((v, i) => v + (opts.weaponMods![i] || 0));
    }
    if (opts.passiveMods?.length) {
      for (const arr of opts.passiveMods) {
        out = out.map((v, i) => v + (arr?.[i] || 0));
      }
    }
    return out;
  }

  function computeSuperIVs(_base: number[], _growths: number[]) {
    // Mock: ATK & SPD superboon; HP superbane
    return {
      superboon: new Set<number>([1, 2]),
      superbane: new Set<number>([0]),
    };
  }

  // —————————————————————————————————————————————
  // Preparos
  // —————————————————————————————————————————————
  const statsLv1 = useMemo(() => {
    const s = hero.stats.Lv1;
    return [s.HP, s.ATK, s.SPD, s.DEF, s.RES];
  }, []);
  const growths = useMemo(() => {
    const g = hero.stats.GrowthRates;
    return [g.HP, g.ATK, g.SPD, g.DEF, g.RES];
  }, []);
  const neutral40 = useMemo(
    () => lv40FromBaseAndGrowth(statsLv1, growths),
    [statsLv1, growths]
  );
  const supers = useMemo(
    () => computeSuperIVs(statsLv1, growths),
    [statsLv1, growths]
  );

  const [flowers, setFlowers] = useState(0);
  const [merges, setMerges] = useState(0);
  const [resplendentOn, setResplendentOn] = useState(false);

  const hasResplendent = useMemo(
    () => String(hero.infobox.Properties).toLowerCase().includes("resplendent"),
    []
  );

  // Mods visuais (placeholders fixos)
  const weaponMods = useMemo(() => [0, 14, 0, 0, 0], []);
  const passiveMods = useMemo(() => [[0, 4, 4, 0, 0]], []);

  const displayed = useMemo(() => {
    return computeDisplayedStats(neutral40, {
      flowers,
      merges,
      resplendent: hasResplendent && resplendentOn,
      weaponMods,
      passiveMods,
    });
  }, [
    neutral40,
    flowers,
    merges,
    resplendentOn,
    hasResplendent,
    weaponMods,
    passiveMods,
  ]);

  const colorForIndex = (i: number) =>
    supers.superboon.has(i)
      ? "dodgerblue"
      : supers.superbane.has(i)
      ? "tomato"
      : "#fff";
  const statusForIndex = (i: number) =>
    supers.superboon.has(i)
      ? "superboon"
      : supers.superbane.has(i)
      ? "superbane"
      : "neutral";

  useEffect(() => {
    setFlowers(0);
    setMerges(0);
    setResplendentOn(false);
  }, []);

  // —————————————————————————————————————————————
  // Componentes locais (sem imports)
  // —————————————————————————————————————————————

  function StatsPanel() {
    const card = {
      background: "rgba(30,30,30,.45)",
      backdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 16,
      padding: "14px 16px",
      boxShadow: "0 8px 24px rgba(0,0,0,.25)",
      color: "#fff",
    } as const;

    const pill = {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,.06)",
      border: "1px solid rgba(255,255,255,.12)",
      borderRadius: 999,
      padding: "6px 10px",
    } as const;

    const select = {
      appearance: "none" as const,
      WebkitAppearance: "none" as const,
      background: "rgba(0,0,0,.25)",
      border: "1px solid rgba(255,255,255,.18)",
      borderRadius: 8,
      padding: "4px 10px",
      color: "#fff",
      fontSize: 14,
      lineHeight: 1.1,
      minWidth: 64,
    };

    const btn = (variant: "ghost" | "solid") => ({
      cursor: "pointer",
      borderRadius: 10,
      padding: "8px 12px",
      fontWeight: 600,
      fontSize: 14,
      border:
        variant === "ghost"
          ? "1px solid rgba(255,255,255,.18)"
          : "1px solid #4EE58C",
      background:
        variant === "ghost"
          ? "transparent"
          : "linear-gradient(180deg,#53f09a,#2fb771)",
      color: variant === "ghost" ? "#fff" : "#0d1a12",
      boxShadow:
        variant === "ghost" ? "none" : "0 4px 14px rgba(47,183,113,.35)",
    });

    const sep = (
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,.08)",
          margin: "10px 0",
        }}
      />
    );

    return (
      <div style={card}>
        {/* título do bloco */}
        <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 10 }}>
          Level 40{" "}
          <span style={{ opacity: 0.8, fontWeight: 600 }}>(5★, neutral)</span>
        </div>

        {/* controles */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "center",
            }}
          >
            <div style={pill}>
              <img
                src={dragonflowers}
                alt="Dragonflowers"
                width={20}
                height={20}
              />
              <select
                value={flowers}
                onChange={(e: any) => setFlowers(parseInt(e.target.value, 10))}
                style={select}
              >
                {dragonflowerOptions(hero.dragonflowersCap).map((opt) => (
                  <option key={opt} value={opt}>
                    +{opt}
                  </option>
                ))}
              </select>
            </div>

            <div style={pill}>
              <img src={mergesI} alt="Merges" width={20} height={20} />
              <select
                value={merges}
                onChange={(e: any) => setMerges(parseInt(e.target.value, 10))}
                style={select}
              >
                {mergeOptions().map((opt) => (
                  <option key={opt} value={opt}>
                    +{opt}
                  </option>
                ))}
              </select>
            </div>

            {hasResplendent && (
              <div style={pill}>
                <img
                  src={resplendent}
                  alt="Resplendent"
                  width={20}
                  height={20}
                />
                <select
                  value={resplendentOn ? "1" : "0"}
                  onChange={(e: any) =>
                    setResplendentOn(e.target.value === "1")
                  }
                  style={{ ...select, minWidth: 80 }}
                >
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            )}

            {/* ações */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                style={btn("ghost")}
                onClick={() => {
                  setFlowers(0);
                  setMerges(0);
                  setResplendentOn(false);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                style={btn("solid")}
                onClick={() => {
                  setFlowers(hero.dragonflowersCap);
                  setMerges(10);
                  if (hasResplendent) setResplendentOn(true);
                }}
              >
                Max
              </button>
            </div>
          </div>
        </div>

        {sep}

        {/* legenda dinâmica */}
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            opacity: 0.85,
            marginBottom: 8,
          }}
        >
          {flowers ? `+${flowers} DF` : ""}
          {merges ? `${flowers ? " • " : ""}+${merges} merges` : ""}
          {resplendentOn
            ? `${flowers || merges ? " • " : ""}Resplendent (+2 all)`
            : ""}
        </div>

        {/* grid de stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            alignItems: "center",
            justifySelf: "center",
            rowGap: 6,
            columnGap: 12,
            maxWidth: 320,
            margin: "0 auto",
          }}
        >
          {STAT_NAMES.map((label, i) => (
            <>
              <div key={`${label}-l`} style={{ opacity: 0.7 }}>
                {label}
              </div>
              <div
                key={`${label}-v`}
                title={statusForIndex(i)}
                style={{
                  color: colorForIndex(i),
                  fontWeight: statusForIndex(i) === "neutral" ? 600 : 700,
                  textShadow: "0 1px 0 rgba(0,0,0,.3)",
                }}
              >
                {displayed?.[i] ?? "—"}
              </div>
            </>
          ))}
        </div>

        {/* rodapé */}
        <div
          style={{
            textAlign: "center",
            marginTop: 10,
            opacity: 0.65,
            fontSize: 12,
          }}
        >
          (Neutral without weapon:&nbsp;
          {neutral40
            ? `${neutral40[0]}/${neutral40[1]}/${neutral40[2]}/${neutral40[3]}/${neutral40[4]}`
            : "—"}
          )
        </div>
      </div>
    );
  }

  // —————————————————————————————————————————————
  // UI
  // —————————————————————————————————————————————
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "24px auto",
        padding: "0 16px",
        backgroundImage: `url(${bg})`,
      }}
    >
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          history.length > 1 ? history.back() : (location.href = "/heroes");
        }}
        style={{ textDecoration: "none" }}
      >
        ← Back
      </a>

      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: "20px", fontSize: "1.6rem", color: "#fff" }}>
          {hero.infobox.Name}
          {hero.infobox.Title ? `: ${hero.infobox.Title}` : ""}
        </h1>

        <img
          src={eliwood}
          alt={`${hero.infobox.Name}${
            hero.infobox.Title ? `: ${hero.infobox.Title}` : ""
          } illustration`}
          style={{
            display: "block",
            width: "100%",
            maxWidth: 320,
            borderRadius: 12,
            margin: "8px auto 12px",
            boxShadow: "0 2px 12px rgba(0,0,0,.08)",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            fontSize: "12px",
            display: "flex",
            marginBottom: "5px",
            opacity: 0.7,
            marginLeft: "5px",
            color: "#fff",
          }}
        >
          Version: {hero.version ?? "—"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          background: "rgba(0,0,0,0.4)",
          border: "2px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "16px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        {/* Rarities */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: "1.1rem", marginBottom: 6 }}>
            <b>Rarities</b>
          </div>
          <img
            src={fivestars}
            alt="rarities"
            style={{ height: 28, filter: "drop-shadow(0 0 6px gold)" }}
          />
        </div>

        {/* Weapon Type */}
        <div>
          <div style={{ marginBottom: 6 }}>
            <b>Weapon</b>
          </div>
          <div
            style={{
              borderRadius: 8,
              padding: "6px",
            }}
          >
            <img src={sword} alt="sword" style={{ height: 32 }} />
          </div>
        </div>

        {/* Move Type */}
        <div>
          <div style={{ marginBottom: 6 }}>
            <b>Move</b>
          </div>
          <div
            style={{
              borderRadius: 8,
              padding: "6px",
            }}
          >
            <img src={infantry} alt="move" style={{ height: 32 }} />
          </div>
        </div>

        {/* Legendary Effect */}
        <div style={{ gridColumn: "1 / -1", marginTop: 10 }}>
          <div style={{ fontSize: "1rem", marginBottom: 6 }}>
            <b>Legendary Effect</b>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <img
              src={blessing}
              alt="legendary"
              style={{ height: 50, filter: "drop-shadow(0 0 10px lime)" }}
            />
            <div style={{ fontSize: "1.1rem" }}>HP+3, Res+2</div>
          </div>
        </div>
      </div>

      {/* Painel de stats (redesenhado) */}
      <div style={{ marginTop: 12 }}>
        <StatsPanel />
      </div>

      {/* Kit + metadados/refine — agora com cards expansíveis */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginTop: "16px",
        }}
      >
        {/* WEAPON */}
        <DetailsCard
          title={hero.weapons[0] || "—"}
          meta={
            <>
              <b>Mt</b> 16 • <b>Rng</b> 1 • <b>SP</b> 400
            </>
          }
          headerIconLeft={
            <img
              src={sword}
              alt="sword-icon"
              style={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          Grants Atk+3. At start of turn, grants [Bonus Doubler] to unit with
          the highest Atk. [Bonus Doubler] Grants bonus to Atk/Spd/Def/Res
          during combat = current bonus on each of unit&apos;s stats for 1 turn.
          Calculates each stat bonus independently.
          <div style={{ color: "#45BC00", marginTop: 6, fontWeight: 600 }}>
            If unit initiates combat or is within 2 spaces of an ally, grants
            Atk/Spd/Def/Res+5 to unit, neutralizes foe&apos;s bonuses during
            combat, and deals damage = 15% of foe&apos;s Def (including as part
            of pre-combat Specials).
          </div>
        </DetailsCard>

        {/* ASSIST */}
        <DetailsCard
          title={hero.assists[0] || "—"}
          meta={
            <>
              <b>Rng</b> 1 • <b>SP</b> 400
            </>
          }
          headerIconLeft={
            <img
              src={assist}
              alt="assist-icon"
              style={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          Grants Spd/Res+6 to target ally for 1 turn.
        </DetailsCard>

        {/* SPECIAL */}
        <DetailsCard
          title={hero.specials?.[0] ?? "—"}
          meta={
            <>
              <b>SP</b> 200 • <b>CD</b> 2
            </>
          }
          headerIconLeft={
            <img
              src={special}
              alt="special-icon"
              style={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          Deals +30% of foe&apos;s Def.
        </DetailsCard>

        {/* PASSIVE A */}
        <DetailsCard
          title={hero.passives?.A?.[0] ?? "—"}
          meta={
            <>
              <b>SP</b> 300
            </>
          }
          headerIconLeft={
            <img
              src={deathb}
              alt="death-blow"
              style={{ display: "block", width: 21, height: 21 }}
            />
          }
          headerIconBadge={
            <img
              src={askill}
              alt="A"
              style={{
                display: "block",
                width: 12,
                height: 12,
                marginLeft: -8,
              }}
            />
          }
        >
          If unit initiates combat, grants Atk+8 during combat.
        </DetailsCard>

        {/* PASSIVE B */}
        <DetailsCard
          title={hero.passives?.B?.[0] ?? "—"}
          meta={
            <>
              <b>SP</b> 240
            </>
          }
          headerIconLeft={
            <img
              src={flowr}
              alt="flow-refresh"
              style={{ display: "block", width: 21, height: 21 }}
            />
          }
          headerIconBadge={
            <img
              src={bskill}
              alt="B"
              style={{
                display: "block",
                width: 12,
                height: 12,
                marginLeft: -8,
              }}
            />
          }
        >
          If unit initiates combat, neutralizes effects that prevent unit&apos;s
          follow-up attacks and restores 10 HP to unit after combat.
        </DetailsCard>

        {/* PASSIVE C */}
        <DetailsCard
          title={hero.passives?.C?.[0] ?? "—"}
          meta={
            <>
              <b>SP</b> 300
            </>
          }
          headerIconLeft={
            <img
              src={visiona}
              alt="vision-arcadia"
              style={{ display: "block", width: 21, height: 21 }}
            />
          }
          headerIconBadge={
            <img
              src={cskill}
              alt="C"
              style={{
                display: "block",
                width: 12,
                height: 12,
                marginLeft: -8,
              }}
            />
          }
        >
          At start of turn, if a dragon or beast ally is deployed, grants
          Atk/Spd/Def/Res+6, [Null Panic], and [Canto (1)] to unit and ally with
          the highest Atk (excluding unit) for 1 turn. [Null Panic] neutralizes
          “convert bonuses into penalties” for 1 turn (status permanece). [Canto
          (1)] After an attack, Assist skill, or structure destruction, unit can
          move 1 space(s). (Once per turn. Only highest value applies. Does not
          stack.)
        </DetailsCard>
      </div>
    </div>
  );
}
