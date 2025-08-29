// src/pages/Hero.tsx (mock)
// Arquivo 100% independente, sem imports.
// Mantém a estrutura visual para experimentar o layout da página final.
// Requer que React esteja disponível globalmente no runtime (ex.: Vite/Next com JSX automático).
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

import infantry from "../assets/placeholders/Icon_Move_Infantry.webp"
import blessing from "../assets/placeholders/Icon_LegendWind.webp"

import bg from "../assets/placeholders/bg.png";

export default function HeroPageMock() {
  // Hooks via React global (sem imports). Fallbacks simples para evitar crash em ambientes sem React global.
  const R: any = (globalThis as any).React || {};
  const useState = R.useState || ((v: any) => [v, (_: any) => { }]);
  const useEffect = R.useEffect || (() => { });
  const useMemo = R.useMemo || ((fn: any, _deps?: any[]) => fn());

  // —————————————————————————————————————————————
  // Placeholders de dados (hero + kit + stats)
  // —————————————————————————————————————————————
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
    // Mock linear: +1 ponto alternado por DF, +2 all se resplendent, +1 all a cada 2 merges
    let out = [...neutral40];
    // Dragonflowers distribuem em ordem ATK>SPD>DEF>RES>HP apenas para demo
    for (let i = 0; i < opts.flowers; i++) {
      const idx = i % 5;
      out[idx] += 1;
    }
    if (opts.resplendent) out = out.map((v) => v + 2);
    const mergeBonus = Math.floor(opts.merges / 2);
    out = out.map((v) => v + mergeBonus);

    // Mods de arma e passivas (se existirem)
    if (opts.weaponMods && opts.weaponMods.length === 5) {
      out = out.map((v, i) => v + (opts.weaponMods![i] || 0));
    }
    if (opts.passiveMods && opts.passiveMods.length) {
      for (const arr of opts.passiveMods) {
        out = out.map((v, i) => v + (arr?.[i] || 0));
      }
    }
    return out;
  }

  function computeSuperIVs(_base: number[], _growths: number[]) {
    // Mock: ATK e SPD são superboon; HP é superbane
    return {
      superboon: new Set<number>([1, 2]), // ATK/SPD
      superbane: new Set<number>([0]), // HP
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

  // Mods visuais (placeholders fixos): arma dá +14 ATK, passiva A +4 ATK/SPD
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

  // UI helpers
  const colorForIndex = (i: number) =>
    supers.superboon.has(i) ? "blue" : supers.superbane.has(i) ? "red" : "#111";
  const statusForIndex = (i: number) =>
    supers.superboon.has(i)
      ? "superboon"
      : supers.superbane.has(i)
        ? "superbane"
        : "neutral";

  useEffect(() => {
    // Reset ao mudar algo maior (aqui é mock, então só exemplo)
    setFlowers(0);
    setMerges(0);
    setResplendentOn(false);
  }, []);

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
        <h1 style={{ margin: "20px", fontSize: "1.6rem" }}>
          {hero.infobox.Name}
          {hero.infobox.Title ? `: ${hero.infobox.Title}` : ""}
        </h1>

        <img
          src={eliwood}
          alt={`${hero.infobox.Name}${hero.infobox.Title ? `: ${hero.infobox.Title}` : ""
            } illustration`}
          style={{
            display: "block",
            width: "100%",
            maxWidth: 320,
            borderRadius: 12,
            margin: "8px auto 12px", // centraliza horizontalmente
            boxShadow: "0 2px 12px rgba(0,0,0,.08)",
            objectFit: "cover",
          }}
        />

        <div style={{ fontSize: "12px", opacity: 0.7, justifySelf: "flex-start", marginLeft: "5px" }}>
          Version: {hero.version ?? "—"}
        </div>
      </div>

      <div style={{ height: "50px", display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: "40px", padding: "50px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px" }}>
          <div style={{ color: "white", fontSize: "20px" }}><b>Weapon Type</b></div>
          <img src={sword} alt="sword-icon" style={{ width: "32px", height: "32px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px" }}>
          <div style={{ color: "white", fontSize: "20px" }}><b>Move Type</b></div>
          <img src={infantry} alt="infantry-icon" style={{ width: "32px", height: "32px" }} />
        </div>
      </div>

          <div style={{display:"flex", flexDirection:"row", justifyContent:"center", alignContent:"center"}}>
            <img src={blessing} alt="wind-blessing" style={{height: "100px"}}/>

            <div style={{display:"flex", flexDirection:"column", justifyContent:"center"}}>
            <div style={{fontSize}}>Legendary Effect:</div>
            <div>HP+3, Res+2</div>
</div>


          </div>






      <div
        style={{
          marginTop: 8,
          background: "#fff",
          color: "#111",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,.08)",
        }}
      >
        {/* Selectors rápidos */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label>
            Dragonflowers:&nbsp;
            <select
              value={flowers}
              onChange={(e: any) => setFlowers(parseInt(e.target.value, 10))}
            >
              {dragonflowerOptions(hero.dragonflowersCap).map((opt) => (
                <option key={opt} value={opt}>
                  +{opt}
                </option>
              ))}
            </select>
          </label>
          <label>
            Merges:&nbsp;
            <select
              value={merges}
              onChange={(e: any) => setMerges(parseInt(e.target.value, 10))}
            >
              {mergeOptions().map((opt) => (
                <option key={opt} value={opt}>
                  +{opt}
                </option>
              ))}
            </select>
          </label>
          {hasResplendent && (
            <label>
              Resplendent:&nbsp;
              <select
                value={resplendentOn ? "1" : "0"}
                onChange={(e: any) => setResplendentOn(e.target.value === "1")}
              >
                <option value="0">Off</option>
                <option value="1">On (+2 all)</option>
              </select>
            </label>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              type="button"
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
        <div style={{ display: "flex", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ display: "flex", fontWeight: 600, marginBottom: 8, justifyContent: "center" }}>
            Level 40 (5★, neutral)
            {flowers ? ` — +${flowers} DF` : ""}
            {merges ? ` — +${merges} merges` : ""}
            {resplendentOn ? ` — Resplendent (+2 all)` : ""}
          </div>


          <div
            style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, justifyContent:"center",  margin: "0 auto" }}
          >

            {STAT_NAMES.map((label, i) => (
              <>
                <div style={{ opacity: 0.7 }}>{label}</div>
                <div
                  title={statusForIndex(i)}
                  style={{
                    color: colorForIndex(i),
                    fontWeight: statusForIndex(i) === "neutral" ? 600 : 700,
                  }}
                >
                  {displayed?.[i] ?? "—"}
                </div>
              </>
            ))}
          </div>
        </div>
        <hr style={{ margin: "16px 0", borderColor: "rgba(0,0,0,.08)" }} />

        <div style={{ opacity: 0.75, marginBottom: 8, justifyContent: "center", display: "flex" }}>
          <small>
            (Neutral without weapon:&nbsp;
            {neutral40
              ? `${neutral40[0]}/${neutral40[1]}/${neutral40[2]}/${neutral40[3]}/${neutral40[4]}`
              : "—"}
            )
          </small>
        </div>
      </div>

      {/* Kit + metadados/refine — placeholders */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginTop: "16px",
        }}
      >
        {/* WEAPON CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "#FFF9E6",
            borderRadius: "10px",
            boxShadow: "inset 0 0 0 4px #DDA715",
            paddingLeft: "21px",
            paddingRight: "21px",
            paddingBottom: "16px",
            paddingTop: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <img
              src={sword}
              alt={"sword-icon"}
              style={{ display: "block", width: "21px", height: "21px" }}
            />
            <div style={{ fontSize: 16, fontWeight: "800", color: "black" }}>
              {hero.weapons[0] || "—"}
            </div>{" "}
            {/* Ardent Durandal */}
          </div>

          <div style={{ fontSize: "12px", color: "black" }}>
            <b>Mt</b> 16 • <b>Rng</b> 1 • <b>SP</b> 400
          </div>
          <div style={{ fontSize: "12px", color: "black" }}>
            Grants Atk+3. At start of turn, grants [Bonus Doubler] to unit with
            the highest Atk. [Bonus Doubler] Grants bonus to Atk/Spd/Def/Res
            during combat = current bonus on each of unit's stats for 1 turn.
            Calculates each stat bonus independently.
          </div>
          <div
            style={{
              color: "#45BC00",
              marginTop: 6,
              fontWeight: 600,
              fontSize: "12px",
            }}
          >
            If unit initiates combat or is within 2 spaces of an ally, grants
            Atk/Spd/Def/Res+5 to unit, neutralizes foe's bonuses (from skills
            like Fortify, Rally, etc.) during combat, and deals damage = 15% of
            foe's Def (including as part of Specials that trigger before
            combat).
          </div>
        </div>

        {/* ASSIST CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "#FFF9E6",
            borderRadius: "10px",
            boxShadow: "inset 0 0 0 4px #DDA715",
            paddingLeft: "21px",
            paddingRight: "21px",
            paddingBottom: "16px",
            paddingTop: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <img
              src={assist}
              alt={"assist-icon"}
              style={{ display: "block", width: "21px", height: "21px" }}
            />
            <div style={{ fontSize: 16, fontWeight: "800", color: "black" }}>
              {hero.assists[0] || "—"}
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "black" }}>
            <b>Rng</b> 1 • <b>SP</b> 400{" "}
          </div>
          <div style={{ fontSize: "12px", color: "black" }}>
            Grants Spd/Res+6 to target ally for 1 turn.
          </div>
        </div>

        {/* SPECIAL CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "#FFF9E6",
            borderRadius: "10px",
            boxShadow: "inset 0 0 0 4px #DDA715",
            paddingLeft: "21px",
            paddingRight: "21px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <img
              src={special}
              alt="special-icon"
              style={{ display: "block", width: 21, height: 21 }}
            />
            <div style={{ fontSize: 16, fontWeight: 800, color: "black" }}>
              {hero.specials?.[0] ?? "—"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            <b>SP</b> 200 • <b>CD</b> 2
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            Deals +30% of foe's Def.
          </div>
        </div>

        {/* PASSIVE A CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "#FFF9E6",
            borderRadius: "10px",
            boxShadow: "inset 0 0 0 4px #DDA715",
            paddingLeft: "21px",
            paddingRight: "21px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              <img
                src={deathb}
                alt="death-blow"
                style={{ display: "block", width: 21, height: 21 }}
              />
              <img
                src={askill}
                alt="passive-a-icon"
                style={{
                  display: "block",
                  width: 12,
                  height: 12,
                  marginLeft: -8,
                }}
              />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "black" }}>
              {hero.passives?.A?.[0] ?? "—"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            <b>SP</b> 300
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            If unit initiates combat, grants Atk+8 during combat.
          </div>
        </div>
        {/* PASSIVE B CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "#FFF9E6",
            borderRadius: "10px",
            boxShadow: "inset 0 0 0 4px #DDA715",
            paddingLeft: "21px",
            paddingRight: "21px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              <img
                src={flowr}
                alt="flow-refresh"
                style={{ display: "block", width: 21, height: 21 }}
              />
              <img
                src={bskill}
                alt="passive-b-icon"
                style={{
                  display: "block",
                  width: 12,
                  height: 12,
                  marginLeft: -8,
                }}
              />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "black" }}>
              {hero.passives?.B?.[0] ?? "—"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            <b>SP</b> 240
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            If unit initiates combat, neutralizes effects that prevent
            unit&apos;s follow-up attacks and restores 10 HP to unit after
            combat.
          </div>
        </div>

        {/* PASSIVE C CARD */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "#FFF9E6",
            borderRadius: "10px",
            boxShadow: "inset 0 0 0 4px #DDA715",
            paddingLeft: "21px",
            paddingRight: "21px",
            paddingTop: "16px",
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              <img
                src={visiona}
                alt="vision-arcadia"
                style={{ display: "block", width: 21, height: 21 }}
              />
              <img
                src={cskill}
                alt="passive-c-icon"
                style={{
                  display: "block",
                  width: 12,
                  height: 12,
                  marginLeft: -8,
                }}
              />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "black" }}>
              {hero.passives?.C?.[0] ?? "—"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            <b>SP</b> 300
          </div>
          <div style={{ fontSize: 12, color: "black" }}>
            At start of turn, if a dragon or beast ally is deployed, grants
            Atk/Spd/Def/Res+6, [Null Panic], and [Canto (1)] to unit and ally
            with the highest Atk (excluding unit) for 1 turn. [Null Panic] If
            unit is inflicted with Panic (bonuses converted into penalties),
            neutralizes the “converts bonuses on target into penalties” effect
            for 1 turn. Even though the effect is neutralized, the Panic status
            remains, and is treated as a Penalty status. [Canto (1)] After an
            attack, Assist skill, or structure destruction, unit can move 1
            space(s). (Unit moves according to movement type. Once per turn.
            Cannot attack or assist. Only highest value applied. Does not stack.
            After moving, if a skill that grants another action would be
            triggered (like with Galeforce), Canto will trigger after the
            granted action. Unit’s base movement has no effect on movement
            granted. Cannot warp a distance greater than unit would be able to
            move with normal Canto movement.)
          </div>
        </div>
      </div>
    </div>
  );
}
