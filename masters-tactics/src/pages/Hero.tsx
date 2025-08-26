// src/pages/Hero.tsx
import { useParams, Link } from "react-router-dom";
import React, { useMemo, useState, useEffect } from "react";

import heroesData from "../data/content/heroes-list.json";
import passivesData from "../data/content/passives-list.json";
import specialsData from "../data/content/specials-list.json";
import assistsData from "../data/content/assists-list.json";
import weaponsData from "../data/content/weapons-list.json";

import pic1 from "../assets/placeholders/no_internet_1.png";
import pic2 from "../assets/placeholders/no_internet_2.png";
import pic3 from "../assets/placeholders/no_internet_3.png";

import {
  lv40FromBaseAndGrowth,
  dragonflowerOptions,
  mergeOptions,
  computeDisplayedStats,
  computeSuperIVs,
  type StatArray,
} from "../utils/stats";

// —————————————————————————————————————————————
// Helpers/tipos
// —————————————————————————————————————————————
type EntityMap = Record<string, any>;

type KitSlots = {
  weapon?: string;
  assist?: string;
  special?: string;
  A?: string;
  B?: string;
  C?: string;
  X?: string;
};

const lastStr = (arr?: unknown[]): string | undefined =>
  Array.isArray(arr) && arr.length ? String(arr[arr.length - 1]) : undefined;

const routeKey = (obj: any, fallback?: string) =>
  String(obj?.sid ?? obj?.id ?? obj?.name ?? obj?.Name ?? fallback ?? "");

// Indexadores tolerantes p/ nossos JSONs
const toMapLoose = (src: any): Record<string, any> => {
  const out: Record<string, any> = {};
  const unwrap = (x: any) =>
    x?.Assist ?? x?.Special ?? x?.Weapon ?? x?.Passive ?? x;
  const add = (obj: any) => {
    if (!obj) return;
    const base = unwrap(obj);
    const key = base?.name ?? base?.Name ?? base?.id ?? base?.Id;
    if (key) out[String(key)] = base;
  };
  if (Array.isArray(src)) for (const it of src) add(it);
  else if (typeof src === "object") for (const v of Object.values(src)) add(v);
  return out;
};

const toPassiveMapFromLevels = (src: any): Record<string, any> => {
  const out: Record<string, any> = {};
  const unwrap = (x: any) => x?.Passive ?? x?.passive ?? x;
  const pushLevel = (lv: any, base: any) => {
    const merged = { ...base, ...lv };
    const name = lv?.name ?? lv?.Name;
    if (name) out[name] = merged;
    if (lv?.id) out[String(lv.id)] = merged;
    if (lv?.sid) out[String(lv.sid)] = merged;
    if (lv?.tagid) out[String(lv.tagid)] = merged;
    if (Array.isArray(lv?.altNames)) {
      for (const alt of lv.altNames) out[String(alt)] = merged;
    }
  };
  const handle = (objIn: any) => {
    const base = unwrap(objIn);
    if (!base) return;
    if (Array.isArray(base.levels) && base.levels.length) {
      for (const lv of base.levels) pushLevel(lv, base);
    } else {
      const nm = base?.name ?? base?.Name;
      if (nm) out[nm] = base;
      if (base?.id) out[String(base.id)] = base;
      if (base?.sid) out[String(base.sid)] = base;
      if (base?.tagid) out[String(base.tagid)] = base;
    }
  };
  if (Array.isArray(src)) for (const it of src) handle(it);
  else if (typeof src === "object")
    for (const v of Object.values(src)) handle(v);
  return out;
};

// —————————————————————————————————————————————
// Página
// —————————————————————————————————————————————
export default function HeroPage() {
  const { id } = useParams();
  const rawId = decodeURIComponent(id ?? "");

  const h = useMemo(() => {
    const arr = heroesData as any[];
    return arr.find(
      (it) => `${it.infobox.Name} (${it.infobox.Title})` === rawId
    );
  }, [rawId]);

  // pool of images
  const HERO_PICS = [pic1, pic2, pic3] as const;

  // pick a random pic every time the page opens or the hero changes
  const [picIdx, setPicIdx] = useState(0);
  useEffect(() => {
    setPicIdx(Math.floor(Math.random() * HERO_PICS.length));
  }, [rawId]);

  const picUrl = HERO_PICS[picIdx];

  const [flowers, setFlowers] = useState(0);
  const [merges, setMerges] = useState(0);
  const [resplendentOn, setResplendentOn] = useState(false);

  useEffect(() => {
    setFlowers(0);
    setMerges(0);
    setResplendentOn(false);
  }, [rawId]);

  if (!h) {
    return (
      <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        <p>Hero not found.</p>
        <Link to="/heroes">← Back</Link>
      </div>
    );
  }

  const name = h.infobox.Name;
  const title = h.infobox.Title;

  const hasResplendent = useMemo(() => {
    const bucket = `${h.infobox?.Properties ?? ""} ${
      h.infobox?.Title ?? ""
    }`.toLowerCase();
    return bucket.includes("resplendent");
  }, [h]);

  // Kit com strings (evita unknown)
  const kit: KitSlots = useMemo(
    () => ({
      weapon: lastStr(h.weapons),
      assist: lastStr(h.assists),
      special: lastStr(h.specials),
      A: lastStr(h.passives?.A),
      B: lastStr(h.passives?.B),
      C: lastStr(h.passives?.C),
      X: lastStr(h.passives?.X),
    }),
    [h]
  );

  // Maps com tipo explícito (evita "{} cannot be used as an index type")
  const weaponsMap: EntityMap = useMemo(
    () => toMapLoose(weaponsData as any),
    []
  );
  const assistsMap: EntityMap = useMemo(
    () => toMapLoose(assistsData as any),
    []
  );
  const specialsMap: EntityMap = useMemo(
    () => toMapLoose(specialsData as any),
    []
  );
  const passivesMap: EntityMap = useMemo(
    () => toPassiveMapFromLevels(passivesData as any),
    []
  );

  // Infos
  const weaponInfo = useMemo(
    () => (kit.weapon ? weaponsMap[kit.weapon] : undefined),
    [kit.weapon, weaponsMap]
  );
  const assistInfo = useMemo(
    () => (kit.assist ? assistsMap[kit.assist] : undefined),
    [kit.assist, assistsMap]
  );
  const specialInfo = useMemo(
    () => (kit.special ? specialsMap[kit.special] : undefined),
    [kit.special, specialsMap]
  );
  const aInfo = useMemo(
    () => (kit.A ? passivesMap[kit.A] : undefined),
    [kit.A, passivesMap]
  );
  const bInfo = useMemo(
    () => (kit.B ? passivesMap[kit.B] : undefined),
    [kit.B, passivesMap]
  );
  const cInfo = useMemo(
    () => (kit.C ? passivesMap[kit.C] : undefined),
    [kit.C, passivesMap]
  );
  const xInfo = useMemo(
    () => (kit.X ? passivesMap[kit.X] : undefined),
    [kit.X, passivesMap]
  );

  // chaves de rota seguras (sid/id/name)
  const weaponKey = useMemo(
    () => routeKey(weaponInfo, kit.weapon),
    [weaponInfo, kit.weapon]
  );
  const assistKey = useMemo(
    () => routeKey(assistInfo, kit.assist),
    [assistInfo, kit.assist]
  );
  const specialKey = useMemo(
    () => routeKey(specialInfo, kit.special),
    [specialInfo, kit.special]
  );
  const aKey = kit.A ? String(kit.A) : "";
  const bKey = kit.B ? String(kit.B) : "";
  const cKey = kit.C ? String(kit.C) : "";
  const xKey = kit.X ? String(kit.X) : "";

  // Stats
  const statsLv1 = useMemo<StatArray>(() => {
    const s = h.stats.Lv1;
    return [s.HP, s.ATK, s.SPD, s.DEF, s.RES];
  }, [h]);
  const growths = useMemo<StatArray>(() => {
    const g = h.stats.GrowthRates;
    return [g.HP, g.ATK, g.SPD, g.DEF, g.RES];
  }, [h]);
  const supers = useMemo(
    () => computeSuperIVs(statsLv1, growths, 5),
    [statsLv1, growths]
  );

  // DF cap
  const DEFAULT_FLOWER_CAP = 20;
  const maxFlowers = h.dragonflowersCap ?? DEFAULT_FLOWER_CAP;
  useEffect(() => {
    setFlowers((f) => (f > maxFlowers ? maxFlowers : f));
  }, [maxFlowers]);

  // Visíveis
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const readStatMods5 = (src: any): number[] | undefined => {
    if (!src) return undefined;
    if (Array.isArray(src)) return src.slice(0, 5).map(num);
    if (typeof src === "object") {
      const hp = num(src.hp ?? src.HP ?? 0);
      const atk = num(src.atk ?? src.ATK ?? 0);
      const spd = num(src.spd ?? src.SPD ?? 0);
      const def = num(src.def ?? src.DEF ?? 0);
      const res = num(src.res ?? src.RES ?? 0);
      return [hp, atk, spd, def, res];
    }
    return undefined;
  };
  const approxEq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const getWeaponVisibleMods = (info?: any): number[] | undefined => {
    if (!info) return undefined;
    const mt = num(info.might ?? info.Might ?? 0);
    const sm = readStatMods5(info.statModifiers ?? info.stats);
    let [hp, atk, spd, def, res] = sm ?? [0, 0, 0, 0, 0];
    if (mt > 0) {
      if (!sm) atk += mt;
      else if (atk <= 0) atk = mt;
      else if (approxEq(atk, mt) || atk > mt) {
        /* inclui Mt */
      } else if (atk > 0 && atk < mt) atk += mt;
    }
    const out = [hp, atk, spd, def, res];
    return out.some((v) => v !== 0) ? out : undefined;
  };
  const getPassiveVisibleMods = (info?: any): number[] | undefined => {
    const sm = readStatMods5(info?.statModifiers ?? info?.stats);
    return sm && sm.some((v) => v !== 0) ? sm : undefined;
  };

  const weaponMods = useMemo(
    () => getWeaponVisibleMods(weaponInfo),
    [weaponInfo]
  );
  const passiveMods = useMemo(() => {
    const arr = [
      getPassiveVisibleMods(aInfo),
      getPassiveVisibleMods(bInfo),
      getPassiveVisibleMods(cInfo),
      getPassiveVisibleMods(xInfo),
    ];
    return arr.filter((x): x is number[] => Array.isArray(x));
  }, [aInfo, bInfo, cInfo, xInfo]);

  const { displayed } = useMemo(() => {
    return computeDisplayedStats({
      statsLv1,
      growthsPct: growths,
      rarity: 5,
      merges,
      flowers,
      mods: {
        weaponMods,
        passiveMods,
        resplendent: hasResplendent && resplendentOn,
      },
    });
  }, [
    statsLv1,
    growths,
    merges,
    flowers,
    weaponMods,
    passiveMods,
    resplendentOn,
    hasResplendent,
  ]);

  const lv40Neutral = useMemo(
    () => lv40FromBaseAndGrowth(statsLv1, growths),
    [statsLv1, growths]
  );

  // UI helpers
  const metaLine = (info?: any): string => {
    if (!info) return "";
    const bits: string[] = [];
    const sp = info.sp ?? info.SP ?? info.cost ?? info.Cost;
    if (sp != null && String(sp) !== "") bits.push(`SP ${sp}`);
    const cd = info.cooldown ?? info.CD ?? info.cd ?? info.Charge;
    if (cd != null && String(cd) !== "") bits.push(`CD ${cd}`);
    const rng = info.range ?? info.Range ?? info.rng ?? info.RNG;
    if (rng != null && String(rng) !== "") bits.push(`Rng ${rng}`);
    const mt = info.might ?? info.Might;
    if (mt != null && String(mt) !== "") bits.push(`Mt ${mt}`);
    const refine =
      info.refine ??
      (Array.isArray(info.refines) ? info.refines.join("/") : info.refines) ??
      info.refinePaths ??
      info.upgradedEffect;
    if (refine != null && String(refine) !== "") bits.push(`Refine ${refine}`);
    return bits.join(" • ");
  };
  const descLine = (info?: any): string => {
    if (!info) return "";
    const d = info.desc ?? info.description ?? info.Effect ?? info.effect ?? "";
    return String(d);
  };
  const getRefineEffectText = (info?: any): string | undefined => {
    if (!info) return undefined;
    const isPrf = String(info.exclusive ?? info.Exclusive ?? "0") === "1";
    if (!isPrf) return undefined;
    let fromExtra: string | undefined;
    if (Array.isArray(info.extraSkills)) {
      fromExtra = info.extraSkills
        .map((x: any) => x?.effectSkill)
        .find((s: any) => typeof s === "string" && s.trim());
    } else if (
      info.extraSkills &&
      typeof info.extraSkills.effectSkill === "string"
    ) {
      fromExtra = info.extraSkills.effectSkill;
    }
    if (fromExtra && fromExtra.trim()) return fromExtra;
    const candidates = [
      info.upgradedEffect,
      info.refineEffect,
      info.refinedEffect,
      info.refine_desc,
      info.refineDescription,
      info.refine,
      info.refined,
    ];
    for (const c of candidates) if (typeof c === "string" && c.trim()) return c;
    return undefined;
  };
  const refineText = useMemo(
    () => getRefineEffectText(weaponInfo),
    [weaponInfo]
  );

  const STAT_NAMES = ["HP", "ATK", "SPD", "DEF", "RES"] as const;
  const colorForIndex = (i: number) =>
    supers.superboon.has(i) ? "blue" : supers.superbane.has(i) ? "red" : "#111";
  const statusForIndex = (i: number) =>
    supers.superboon.has(i)
      ? "superboon"
      : supers.superbane.has(i)
      ? "superbane"
      : "neutral";

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <Link to="/heroes" style={{ textDecoration: "none" }}>
        ← Back
      </Link>

      <h1 style={{ marginTop: 12 }}>
        {name}
        {title ? `: ${title}` : ""}
      </h1>

      <img
        src={picUrl}
        alt={`${name}${title ? `: ${title}` : ""} illustration`}
        style={{
          display: "block",
          width: "100%",
          maxWidth: 320,
          borderRadius: 12,
          margin: "8px 0 12px",
          boxShadow: "0 2px 12px rgba(0,0,0,.08)",
          objectFit: "cover",
        }}
        onError={(e) => {
          // fallback: try the next image if one fails to load
          const next = (picIdx + 1) % HERO_PICS.length;
          (e.currentTarget as HTMLImageElement).src = HERO_PICS[next];
        }}
      />

      {/* Version exibida */}
      <div style={{ opacity: 0.7, marginTop: 4, marginBottom: 8 }}>
        Version: {h.version ?? "—"}
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
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <label>
            Dragonflowers:&nbsp;
            <select
              value={flowers}
              onChange={(e) => setFlowers(parseInt(e.target.value, 10))}
            >
              {dragonflowerOptions(maxFlowers).map((opt) => (
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
              onChange={(e) => setMerges(parseInt(e.target.value, 10))}
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
                onChange={(e) => setResplendentOn(e.target.value === "1")}
              >
                <option value="0">Off</option>
                <option value="1">On (+2 all)</option>
              </select>
            </label>
          )}
        </div>

        {/* Stats */}
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Level 40 (5★, neutral)
          {flowers ? ` — +${flowers} DF` : ""}
          {merges ? ` — +${merges} merges` : ""}
          {resplendentOn ? ` — Resplendent (+2 all)` : ""}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}
        >
          {STAT_NAMES.map((label, i) => (
            <React.Fragment key={label}>
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
            </React.Fragment>
          ))}
        </div>

        <hr style={{ margin: "16px 0", borderColor: "rgba(0,0,0,.08)" }} />

        {/* Neutral without weapon */}
        <div style={{ opacity: 0.75, marginBottom: 8 }}>
          <small>
            (Neutral without weapon:&nbsp;
            {lv40Neutral
              ? `${lv40Neutral[0]}/${lv40Neutral[1]}/${lv40Neutral[2]}/${lv40Neutral[3]}/${lv40Neutral[4]}`
              : "—"}
            )
          </small>
        </div>

        {/* Kit + metadados/refine — com links */}
        <div
          style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}
        >
          <div style={{ opacity: 0.7 }}>Weapon</div>
          <div>
            {kit.weapon ? (
              <Link
                to={`/weapons/${encodeURIComponent(weaponKey)}`}
                style={{ textDecoration: "none" }}
              >
                {kit.weapon}
              </Link>
            ) : (
              "—"
            )}
            {weaponInfo ? (
              <>
                {metaLine(weaponInfo) ? (
                  <div style={{ opacity: 0.7 }}>{metaLine(weaponInfo)}</div>
                ) : null}
                {descLine(weaponInfo) ? (
                  <div
                    style={{ opacity: 0.7 }}
                    dangerouslySetInnerHTML={{ __html: descLine(weaponInfo) }}
                  />
                ) : null}
                {refineText ? (
                  <div
                    style={{ color: "#82f546", marginTop: 6, fontWeight: 600 }}
                    dangerouslySetInnerHTML={{ __html: refineText }}
                  />
                ) : null}
              </>
            ) : null}
          </div>

          <div style={{ opacity: 0.7 }}>Assist</div>
          <div>
            {kit.assist ? (
              <Link
                to={`/assists/${encodeURIComponent(assistKey)}`}
                style={{ textDecoration: "none" }}
              >
                {kit.assist}
              </Link>
            ) : (
              "—"
            )}
            {assistInfo ? (
              <>
                {metaLine(assistInfo) ? (
                  <div style={{ opacity: 0.7 }}>{metaLine(assistInfo)}</div>
                ) : null}
                {descLine(assistInfo) ? (
                  <div
                    style={{ opacity: 0.7 }}
                    dangerouslySetInnerHTML={{ __html: descLine(assistInfo) }}
                  />
                ) : null}
              </>
            ) : null}
          </div>

          <div style={{ opacity: 0.7 }}>Special</div>
          <div>
            {kit.special ? (
              <Link
                to={`/specials/${encodeURIComponent(specialKey)}`}
                style={{ textDecoration: "none" }}
              >
                {kit.special}
              </Link>
            ) : (
              "—"
            )}
            {specialInfo ? (
              <>
                {metaLine(specialInfo) ? (
                  <div style={{ opacity: 0.7 }}>{metaLine(specialInfo)}</div>
                ) : null}
                {descLine(specialInfo) ? (
                  <div
                    style={{ opacity: 0.7 }}
                    dangerouslySetInnerHTML={{ __html: descLine(specialInfo) }}
                  />
                ) : null}
              </>
            ) : null}
          </div>

          <div style={{ opacity: 0.7 }}>A skill</div>
          <div>
            {kit.A ? (
              <Link
                to={`/skills/${encodeURIComponent(aKey)}`}
                style={{ textDecoration: "none" }}
              >
                {kit.A}
              </Link>
            ) : (
              "—"
            )}
          </div>

          <div style={{ opacity: 0.7 }}>B skill</div>
          <div>
            {kit.B ? (
              <Link
                to={`/skills/${encodeURIComponent(bKey)}`}
                style={{ textDecoration: "none" }}
              >
                {kit.B}
              </Link>
            ) : (
              "—"
            )}
          </div>

          <div style={{ opacity: 0.7 }}>C skill</div>
          <div>
            {kit.C ? (
              <Link
                to={`/skills/${encodeURIComponent(cKey)}`}
                style={{ textDecoration: "none" }}
              >
                {kit.C}
              </Link>
            ) : (
              "—"
            )}
          </div>

          <div style={{ opacity: 0.7 }}>X skill</div>
          <div>
            {kit.X ? (
              <Link
                to={`/skills/${encodeURIComponent(xKey)}`}
                style={{ textDecoration: "none" }}
              >
                {kit.X}
              </Link>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
