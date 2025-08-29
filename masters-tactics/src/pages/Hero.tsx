// src/pages/Hero.tsx
import * as React from "react";
import {
  useParams,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { styled } from "@mui/material/styles";
import Select from "@mui/material/Select";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Collapse,
  IconButton,
  Button,
  MenuItem,
  Divider,
  Link,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// ---- DATA (reais) -----------------------------------------------------------
import heroesData from "../data/content/heroes-list.json";
import passivesData from "../data/content/passives-list.json";
import specialsData from "../data/content/specials-list.json";
import assistsData from "../data/content/assists-list.json";
import weaponsData from "../data/content/weapons-list.json";

// Placeholders/imagens (usaremos as “sem internet” do funcional e os ícones do mockup)
import pic1 from "../assets/placeholders/no_internet_1.png";
import pic2 from "../assets/placeholders/no_internet_2.png";
import pic3 from "../assets/placeholders/no_internet_3.png";

import eliwoodPH from "../assets/placeholders/eliwood.webp";
import swordIcon from "../assets/placeholders/Icon_Class_Red_Sword.webp";
import assistIcon from "../assets/placeholders/Icon_Skill_Assist.webp";
import specialIcon from "../assets/placeholders/Icon_Skill_Special.webp";
import cskillIcon from "../assets/placeholders/Passive_Icon_C.webp";
import bskillIcon from "../assets/placeholders/Passive_Icon_B.webp";
import askillIcon from "../assets/placeholders/Passive_Icon_A.webp";

import deathb from "../assets/placeholders/Death_Blow_4.webp";
import flowr from "../assets/placeholders/Flow_Refresh_3.webp";
import visiona from "../assets/placeholders/Vision_of_Arcadia_II.webp";

import infantry from "../assets/placeholders/Icon_Move_Infantry.webp";
import blessing from "../assets/placeholders/Icon_LegendWind.webp";

import dragonflowersImg from "../assets/placeholders/dragonflowers.webp";
import mergesImg from "../assets/placeholders/orb_icon.webp";
import resplendentImg from "../assets/placeholders/Icon_Resplendent.webp";

import bg from "../assets/placeholders/bg.png";

//STARS IMPORTS:
//import threestars from "../assets/placeholders/3-stars.webp";
//import fourstars from "../assets/placeholders/4-stars.webp";
//import foursr from "../assets/placeholders/Icon_Rarity_4.5.webp";
//import fivestars from "../assets/placeholders/5-stars.webp";

// ---- UTILS (reais) ----------------------------------------------------------
import {
  lv40FromBaseAndGrowth,
  dragonflowerOptions,
  mergeOptions,
  computeDisplayedStats,
  computeSuperIVs,
  type StatArray,
} from "../utils/stats";

// ---- Tipos/Helpers locais ---------------------------------------------------
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

const STAT_NAMES = ["HP", "ATK", "SPD", "DEF", "RES"] as const;

const lastStr = (arr?: unknown[]): string | undefined =>
  Array.isArray(arr) && arr.length ? String(arr[arr.length - 1]) : undefined;

const routeKey = (obj: any, fallback?: string) =>
  String(obj?.sid ?? obj?.id ?? obj?.name ?? obj?.Name ?? fallback ?? "");

// Map “solto” — aceita array/obj e extrai chaves variadas
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

// Lê mods de stats em vários formatos e normaliza p/ [hp,atk,spd,def,res]
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
      // ok, já inclui Mt
    } else if (atk > 0 && atk < mt) atk += mt;
  }
  const out = [hp, atk, spd, def, res];
  return out.some((v) => v !== 0) ? out : undefined;
};
const getPassiveVisibleMods = (info?: any): number[] | undefined => {
  const sm = readStatMods5(info?.statModifiers ?? info?.stats);
  return sm && sm.some((v) => v !== 0) ? sm : undefined;
};

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

// ---- UI primitives do mockup ------------------------------------------------
interface ExpandMoreProps {
  expand: boolean;
}
const ExpandMore = styled(
  (props: React.ComponentProps<typeof IconButton> & ExpandMoreProps) => {
    const { expand, ...other } = props;
    return <IconButton {...other} />;
  }
)(({ theme, expand }) => ({
  marginLeft: "auto",
  transform: !expand ? "rotate(0deg)" : "rotate(180deg)",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
}));

type DetailsCardProps = {
  title: React.ReactNode;
  headerIconLeft?: React.ReactNode;
  headerIconBadge?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  startOpen?: boolean;
};
function DetailsCard({
  title,
  headerIconLeft,
  headerIconBadge,
  meta,
  children,
  startOpen = false,
}: DetailsCardProps) {
  const [expanded, setExpanded] = React.useState<boolean>(!!startOpen);
  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: "#FFF9E6",
        borderRadius: "12px",
        boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.10)",
        border: "4px solid #DDA715",
        overflow: "hidden",
      }}
    >
      <CardHeader
        avatar={
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5 }}>
            {headerIconLeft || null}
            {headerIconBadge ? (
              <Box sx={{ ml: "-8px", display: "inline-flex" }}>
                {headerIconBadge}
              </Box>
            ) : null}
          </Box>
        }
        title={
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#111" }}>
            {title}
          </Typography>
        }
        sx={{ py: "12px", px: "14px", "& .MuiCardHeader-avatar": { mr: 1 } }}
        action={
          <ExpandMore
            expand={expanded}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon sx={{ opacity: 0.7 }} />
          </ExpandMore>
        }
      />
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ py: "0px", px: "14px", bgcolor: "#FFF9E6" }}>
          {meta ? (
            <Typography sx={{ fontSize: 12, color: "#333", mb: 0.75 }}>
              {meta}
            </Typography>
          ) : null}
          {children ? (
            <Typography sx={{ fontSize: 12, color: "#111", lineHeight: 1.5 }}>
              {children}
            </Typography>
          ) : null}
        </CardContent>
      </Collapse>
    </Card>
  );
}

// rarity text
function formatRarity(h: any): string {
  const props = String(h.infobox?.Properties ?? "").toLowerCase();
  if (props.includes("specrate")) return "4 ★ SR";
  if (props.includes("tempest")) return "4 ★ — 5 ★";
  if (props.includes("ghb")) return "3 ★ — 4 ★";

  const rarity = String(h.infobox?.poolRarities ?? "");

  if (rarity.startsWith("3,4") || rarity.startsWith("3, 4")) {
    return "3 ★ — 4 ★";
  }
  if (rarity === "5") {
    return "5 ★";
  }
  return rarity ? `${rarity} ★` : "5 ★";
}

//rarity tag
function rarityTag(h: any): string {
  const props = String(h.infobox?.Properties ?? "").toLowerCase();

  if (props.includes("emblem")) {
    return " — Emblem";
  }

  if (props.includes("special")) {
    return " — Special";
  }

  if (props.includes("rearmed")) {
    return " — Rearmed";
  }

  if (props.includes("attuned")) {
    return " — Attuned";
  }

  if (props.includes("aided")) {
    return " — Aided";
  }

  if (props.includes("legendary")) {
    return " — Legendary";
  }

  if (props.includes("mythic")) {
    return " — Mythic";
  }

  if (props.includes("ghb")) {
    return " — Grand Hero Battle";
  }

  if (props.includes("tempest")) {
    return " — Tempest Trials";
  }

  if (props.includes("ascended")) {
    return " — Ascended";
  }

  return props ? `` : "";
}

function StatsPanel({
  neutral40,
  displayed,
  colorForIndex,
  statusForIndex,
  flowers,
  setFlowers,
  merges,
  setMerges,
  hasResplendent,
  resplendentOn,
  setResplendentOn,
  flowerCap,
}: {
  neutral40: number[];
  displayed: number[];
  colorForIndex: (i: number) => string;
  statusForIndex: (i: number) => string;
  flowers: number;
  setFlowers: (n: number) => void;
  merges: number;
  setMerges: (n: number) => void;
  hasResplendent: boolean;
  resplendentOn: boolean;
  setResplendentOn: (b: boolean) => void;
  flowerCap: number;
}) {
  return (
    <Box
      sx={{
        background: "rgba(30,30,30,.45)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 2,
        p: "14px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        color: "#fff",
      }}
    >
      <Typography align="center" sx={{ fontWeight: 700, mb: 1 }}>
        Level 40{" "}
        <Box component="span" sx={{ opacity: 0.8, fontWeight: 600 }}>
          (5★, neutral)
        </Box>
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.25,
          justifyContent: "center",
        }}
      >
        {/* DF */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 999,
            px: 1.25,
            py: 0.75,
          }}
        >
          <Box
            component="img"
            src={dragonflowersImg}
            alt="df"
            width={20}
            height={20}
          />
          <Select
            value={String(flowers)}
            onChange={(e: SelectChangeEvent) =>
              setFlowers(Number(e.target.value))
            }
            size="small"
            sx={{
              background: "transparent",
              "& .MuiSelect-select": {
                padding: "0 24px 0 0",
                fontSize: 14,
                color: "#fff",
              },
              "& fieldset": { display: "none" },
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              "& .MuiSelect-icon": { color: "rgba(255,255,255,0.7)", right: 0 },
            }}
          >
            {dragonflowerOptions(flowerCap).map((opt) => (
              <MenuItem key={opt} value={String(opt)}>
                +{opt}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Merges */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 999,
            px: 1.25,
            py: 0.75,
          }}
        >
          <Box
            component="img"
            src={mergesImg}
            alt="merges"
            width={20}
            height={20}
          />
          <Select
            value={String(merges)}
            onChange={(e: SelectChangeEvent) =>
              setMerges(Number(e.target.value))
            }
            size="small"
            sx={{
              background: "transparent",
              "& .MuiSelect-select": {
                padding: "0 24px 0 0",
                fontSize: 14,
                color: "#fff",
              },
              "& fieldset": { display: "none" },
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              "& .MuiSelect-icon": { color: "rgba(255,255,255,0.7)", right: 0 },
            }}
          >
            {mergeOptions().map((opt) => (
              <MenuItem key={opt} value={String(opt)}>
                +{opt}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Resplendent */}
        {hasResplendent && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 999,
              px: 1.25,
              py: 0.75,
            }}
          >
            <Box
              component="img"
              src={resplendentImg}
              alt="resplendent"
              width={20}
              height={20}
            />
            <Select
              value={resplendentOn ? "1" : "0"}
              onChange={(e: SelectChangeEvent) =>
                setResplendentOn(e.target.value === "1")
              }
              size="small"
              sx={{
                background: "transparent",
                "& .MuiSelect-select": {
                  padding: "0 24px 0 0",
                  fontSize: 14,
                  color: "#fff",
                },
                "& fieldset": { display: "none" },
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                "& .MuiSelect-icon": {
                  color: "rgba(255,255,255,0.7)",
                  right: 0,
                },
              }}
            >
              <MenuItem value="0">No</MenuItem>
              <MenuItem value="1">Yes</MenuItem>
            </Select>
          </Box>
        )}

        {/* Ações */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setFlowers(0);
              setMerges(0);
              setResplendentOn(false);
            }}
            sx={{
              borderRadius: "10px",
              px: 1.5,
              py: 1,
              fontWeight: 600,
              fontSize: 14,
              color: "#fff",
              borderColor: "rgba(255,255,255,.18)",
              textTransform: "none",
              "&:hover": { borderColor: "rgba(255,255,255,.36)" },
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setFlowers(flowerCap);
              setMerges(10);
              setResplendentOn(true);
            }}
            sx={{
              borderRadius: "10px",
              px: 1.5,
              py: 1,
              fontWeight: 600,
              fontSize: 14,
              color: "#0d1a12",
              textTransform: "none",
              border: "1px solid #4EE58C",
              boxShadow: "0 4px 14px rgba(47,183,113,.35)",
              background: "linear-gradient(180deg,#53f09a,#2fb771)",
              "&:hover": {
                background: "linear-gradient(180deg,#4ae392,#28a968)",
              },
            }}
          >
            Max
          </Button>
        </Box>
      </Box>

      <Divider
        sx={{ my: 1.25, borderColor: "rgba(255,255,255,.08)", opacity: 1 }}
      />

      <Typography align="center" sx={{ fontSize: 13, opacity: 0.85, mb: 1 }}>
        {flowers ? `+${flowers} DF` : ""}
        {merges ? `${flowers ? " • " : ""}+${merges} merges` : ""}
        {resplendentOn
          ? `${flowers || merges ? " • " : ""}Resplendent (+2 all)`
          : ""}
      </Typography>

      <Box
        sx={{
          justifySelf: "center",
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          alignItems: "center",
          rowGap: "6px",
          columnGap: "0px",
          maxWidth: 320,
          mx: "auto",
        }}
      >
        {STAT_NAMES.map((label, i) => (
          <React.Fragment key={label}>
            <Box sx={{ opacity: 0.7 }}>{label}</Box>
            <Box
              title={statusForIndex(i)}
              sx={{
                color: colorForIndex(i),
                fontWeight: statusForIndex(i) === "neutral" ? 600 : 700,
                textShadow: "0 1px 0 rgba(0,0,0,.3)",
              }}
            >
              {displayed?.[i] ?? "—"}
            </Box>
          </React.Fragment>
        ))}
      </Box>

      <Typography align="center" sx={{ mt: 1.25, opacity: 0.65, fontSize: 12 }}>
        (Neutral without weapon:&nbsp;
        {neutral40
          ? `${neutral40[0]}/${neutral40[1]}/${neutral40[2]}/${neutral40[3]}/${neutral40[4]}`
          : "—"}
        )
      </Typography>
    </Box>
  );
}

// ---- Página principal (MUI + integração real) -------------------------------
export default function HeroPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // params e hero encontrado
  const { id } = useParams();
  const rawId = decodeURIComponent(id ?? "");
  const h = React.useMemo(() => {
    const arr = heroesData as any[];
    return arr.find(
      (it) => `${it.infobox.Name} (${it.infobox.Title})` === rawId
    );
  }, [rawId]);

  // pool de imagens (mesma lógica do funcional)
  const HERO_PICS = [pic1, pic2, pic3] as const;
  const [picIdx, setPicIdx] = React.useState(0);
  React.useEffect(() => {
    setPicIdx(Math.floor(Math.random() * HERO_PICS.length));
  }, [rawId]);
  const picUrl = HERO_PICS[picIdx] || eliwoodPH;

  // estados de DF/merges/resplendent
  const [flowers, setFlowers] = React.useState(0);
  const [merges, setMerges] = React.useState(0);
  const [resplendentOn, setResplendentOn] = React.useState(false);

  React.useEffect(() => {
    setFlowers(0);
    setMerges(0);
    setResplendentOn(false);
  }, [rawId]);

  if (!h) {
    return (
      <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 3 }}>
        <Typography>Hero not found.</Typography>
        <Link component={RouterLink} to="/heroes">
          ← Back
        </Link>
      </Box>
    );
  }

  const name = h.infobox.Name;
  const title = h.infobox.Title;

  const hasResplendent = React.useMemo(() => {
    const bucket = `${h.infobox?.Properties ?? ""} ${
      h.infobox?.Title ?? ""
    }`.toLowerCase();
    return bucket.includes("resplendent");
  }, [h]);

  // kit (strings)
  const kit: KitSlots = React.useMemo(
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

  // maps
  const weaponsMap: EntityMap = React.useMemo(
    () => toMapLoose(weaponsData as any),
    []
  );
  const assistsMap: EntityMap = React.useMemo(
    () => toMapLoose(assistsData as any),
    []
  );
  const specialsMap: EntityMap = React.useMemo(
    () => toMapLoose(specialsData as any),
    []
  );
  const passivesMap: EntityMap = React.useMemo(
    () => toPassiveMapFromLevels(passivesData as any),
    []
  );

  // info por item
  const weaponInfo = React.useMemo(
    () => (kit.weapon ? weaponsMap[kit.weapon] : undefined),
    [kit.weapon, weaponsMap]
  );
  const assistInfo = React.useMemo(
    () => (kit.assist ? assistsMap[kit.assist] : undefined),
    [kit.assist, assistsMap]
  );
  const specialInfo = React.useMemo(
    () => (kit.special ? specialsMap[kit.special] : undefined),
    [kit.special, specialsMap]
  );
  const aInfo = React.useMemo(
    () => (kit.A ? passivesMap[kit.A] : undefined),
    [kit.A, passivesMap]
  );
  const bInfo = React.useMemo(
    () => (kit.B ? passivesMap[kit.B] : undefined),
    [kit.B, passivesMap]
  );
  const cInfo = React.useMemo(
    () => (kit.C ? passivesMap[kit.C] : undefined),
    [kit.C, passivesMap]
  );
  const xInfo = React.useMemo(
    () => (kit.X ? passivesMap[kit.X] : undefined),
    [kit.X, passivesMap]
  );

  // rotas seguras
  const weaponKey = React.useMemo(
    () => routeKey(weaponInfo, kit.weapon),
    [weaponInfo, kit.weapon]
  );
  const assistKey = React.useMemo(
    () => routeKey(assistInfo, kit.assist),
    [assistInfo, kit.assist]
  );
  const specialKey = React.useMemo(
    () => routeKey(specialInfo, kit.special),
    [specialInfo, kit.special]
  );
  const aKey = kit.A ? String(kit.A) : "";
  const bKey = kit.B ? String(kit.B) : "";
  const cKey = kit.C ? String(kit.C) : "";
  const xKey = kit.X ? String(kit.X) : "";

  // stats base/growth/supers
  const statsLv1 = React.useMemo<StatArray>(() => {
    const s = h.stats.Lv1;
    return [s.HP, s.ATK, s.SPD, s.DEF, s.RES];
  }, [h]);
  const growths = React.useMemo<StatArray>(() => {
    const g = h.stats.GrowthRates;
    return [g.HP, g.ATK, g.SPD, g.DEF, g.RES];
  }, [h]);
  const supers = React.useMemo(
    () => computeSuperIVs(statsLv1, growths, 5),
    [statsLv1, growths]
  );

  // cap DF
  const DEFAULT_FLOWER_CAP = 20;
  const maxFlowers = h.dragonflowersCap ?? DEFAULT_FLOWER_CAP;
  React.useEffect(() => {
    setFlowers((f) => (f > maxFlowers ? maxFlowers : f));
  }, [maxFlowers]);

  // mods visíveis
  const weaponMods = React.useMemo(
    () => getWeaponVisibleMods(weaponInfo),
    [weaponInfo]
  );
  const passiveMods = React.useMemo(() => {
    const arr = [
      getPassiveVisibleMods(aInfo),
      getPassiveVisibleMods(bInfo),
      getPassiveVisibleMods(cInfo),
      getPassiveVisibleMods(xInfo),
    ];
    return arr.filter((x): x is number[] => Array.isArray(x));
  }, [aInfo, bInfo, cInfo, xInfo]);

  // stats exibidos
  const { displayed } = React.useMemo(() => {
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

  const neutral40 = React.useMemo(
    () => lv40FromBaseAndGrowth(statsLv1, growths),
    [statsLv1, growths]
  );

  // back relativo
  const canGoBack =
    typeof window !== "undefined" &&
    typeof window.history?.state?.idx === "number" &&
    window.history.state.idx > 0;
  const from = (location.state as any)?.from;
  const backHref =
    (from && `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`) ||
    "/heroes";

  // helpers de UI (cores e status)
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

  // texts/refine
  const weaponMeta = React.useMemo(() => metaLine(weaponInfo), [weaponInfo]);
  const assistMeta = React.useMemo(() => metaLine(assistInfo), [assistInfo]);
  const specialMeta = React.useMemo(() => metaLine(specialInfo), [specialInfo]);
  const weaponDesc = React.useMemo(() => descLine(weaponInfo), [weaponInfo]);
  const assistDesc = React.useMemo(() => descLine(assistInfo), [assistInfo]);
  const specialDesc = React.useMemo(() => descLine(specialInfo), [specialInfo]);
  const refineText = React.useMemo(
    () => getRefineEffectText(weaponInfo),
    [weaponInfo]
  );

  return (
    <Box
      sx={{
        maxWidth: 960,
        mx: "auto",
        px: 2,
        py: 3,
        pb: 4,
        minHeight: "100vh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center top",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ← Back relativo */}
      <Link
        href={backHref}
        onClick={(e) => {
          e.preventDefault();
          if (canGoBack) navigate(-1);
          else navigate(backHref, { replace: true });
        }}
        underline="none"
        sx={{ display: "inline-block", mb: 1, color: "#fff" }}
      >
        ← Back
      </Link>

      {/* Header com nome/Imagem/Version */}
      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ my: "20px", fontSize: "1.6rem", color: "#fff" }}>
          {name}
          {title ? `: ${title}` : ""}
        </Typography>

        <Box
          component="img"
          src={picUrl}
          alt={`${name}${title ? `: ${title}` : ""} illustration`}
          onError={(e: any) => {
            const next = (picIdx + 1) % HERO_PICS.length;
            e.currentTarget.src = HERO_PICS[next] || eliwoodPH;
          }}
          sx={{
            display: "block",
            width: "100%",
            maxWidth: 320,
            borderRadius: "12px",
            my: "8px",
            mb: "12px",
            boxShadow: "0 2px 12px rgba(0,0,0,.08)",
            objectFit: "cover",
            mx: "auto",
          }}
        />

        <Box
          sx={{
            fontSize: "12px",
            display: "flex",
            mb: "5px",
            opacity: 0.7,
            ml: "5px",
            color: "#fff",
            justifyContent: "center",
          }}
        >
          Version: {h.version ?? "—"}
        </Box>
      </Box>

      {/* Bloco infos simples (mantido do mockup, com placeholders) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          background: "rgba(0,0,0,0.4)",
          border: "2px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          p: "16px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Typography sx={{ fontSize: "1.1rem", mb: 0.75 }}>
            <b>Rarities</b>
          </Typography>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: "1rem" }}>{formatRarity(h)}</Typography>
            <Typography sx={{ fontSize: "1rem" }}>{rarityTag(h)}</Typography>
          </div>
        </Box>

        <Box>
          <Box sx={{ mb: 0.75 }}>
            <b>Weapon</b>
          </Box>
          <Box sx={{ borderRadius: 1, p: "6px" }}>
            <Box
              component="img"
              src={swordIcon}
              alt="sword"
              sx={{ height: 32 }}
            />
          </Box>
        </Box>

        <Box>
          <Box sx={{ mb: 0.75 }}>
            <b>Move</b>
          </Box>
          <Box sx={{ borderRadius: 1, p: "6px" }}>
            <Box
              component="img"
              src={infantry}
              alt="move"
              sx={{ height: 32 }}
            />
          </Box>
        </Box>

        <Box sx={{ gridColumn: "1 / -1", mt: 1.25 }}>
          <Typography sx={{ fontSize: "1rem", mb: 0.75 }}>
            <b>Legendary Effect</b>
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Box
              component="img"
              src={blessing}
              alt="legendary"
              sx={{ height: 50, filter: "drop-shadow(0 0 10px lime)" }}
            />
            <Typography sx={{ fontSize: "1.1rem" }}>HP+3, Res+2</Typography>
          </Box>
        </Box>
      </Box>

      {/* Título Stats */}
      <Divider
        sx={{
          my: 2,
          "&::before, &::after": { borderColor: "rgba(255, 255, 255, 1)" },
        }}
      >
        <Typography
          sx={{
            fontSize: 32,
            fontWeight: 700,
            color: "#ffffffff",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            padding: "20px",
          }}
        >
          Stats
        </Typography>
      </Divider>

      {/* Painel de stats (MUI) com integração real */}
      <Box sx={{ mt: 1.5 }}>
        <StatsPanel
          neutral40={neutral40}
          displayed={displayed}
          colorForIndex={colorForIndex}
          statusForIndex={statusForIndex}
          flowers={flowers}
          setFlowers={setFlowers}
          merges={merges}
          setMerges={setMerges}
          hasResplendent={hasResplendent}
          resplendentOn={resplendentOn}
          setResplendentOn={setResplendentOn}
          flowerCap={maxFlowers}
        />
      </Box>

      {/* Título Base Kit */}
      <Divider
        sx={{
          my: 2,
          "&::before, &::after": { borderColor: "rgba(255, 255, 255, 1)" },
        }}
      >
        <Typography
          sx={{
            fontSize: 32,
            fontWeight: 700,
            color: "#ffffffff",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            padding: "20px",
          }}
        >
          Base Kit
        </Typography>
      </Divider>

      {/* Cards expansíveis (dados reais + links) */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        {/* WEAPON */}
        <DetailsCard
          title={
            kit.weapon ? (
              <Link
                component={RouterLink}
                to={`/weapons/${encodeURIComponent(weaponKey)}`}
                state={{ from: location }}
                underline="none"
              >
                {kit.weapon}
              </Link>
            ) : (
              "—"
            )
          }
          meta={
            weaponInfo && metaLine(weaponInfo) ? (
              <>{metaLine(weaponInfo)}</>
            ) : (
              <></>
            )
          }
          headerIconLeft={
            <Box
              component="img"
              src={swordIcon}
              alt="sword-icon"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          {weaponDesc ? (
            <Box
              sx={{ opacity: 0.9 }}
              dangerouslySetInnerHTML={{ __html: weaponDesc }}
            />
          ) : (
            <>—</>
          )}
          {refineText ? (
            <Box
              sx={{ color: "#45BC00", mt: 0.75, fontWeight: 600 }}
              dangerouslySetInnerHTML={{ __html: refineText }}
            />
          ) : null}
        </DetailsCard>

        {/* ASSIST */}
        <DetailsCard
          title={
            kit.assist ? (
              <Link
                component={RouterLink}
                to={`/assists/${encodeURIComponent(assistKey)}`}
                state={{ from: location }}
                underline="none"
              >
                {kit.assist}
              </Link>
            ) : (
              "—"
            )
          }
          meta={assistInfo && assistMeta ? <>{assistMeta}</> : <></>}
          headerIconLeft={
            <Box
              component="img"
              src={assistIcon}
              alt="assist-icon"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          {assistDesc ? (
            <Box
              sx={{ opacity: 0.9 }}
              dangerouslySetInnerHTML={{ __html: assistDesc }}
            />
          ) : (
            <>—</>
          )}
        </DetailsCard>

        {/* SPECIAL */}
        <DetailsCard
          title={
            kit.special ? (
              <Link
                component={RouterLink}
                to={`/specials/${encodeURIComponent(specialKey)}`}
                state={{ from: location }}
                underline="none"
              >
                {kit.special}
              </Link>
            ) : (
              "—"
            )
          }
          meta={specialInfo && specialMeta ? <>{specialMeta}</> : <></>}
          headerIconLeft={
            <Box
              component="img"
              src={specialIcon}
              alt="special-icon"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          {specialDesc ? (
            <Box
              sx={{ opacity: 0.9 }}
              dangerouslySetInnerHTML={{ __html: specialDesc }}
            />
          ) : (
            <>—</>
          )}
        </DetailsCard>

        {/* PASSIVE A */}
        <DetailsCard
          title={
            kit.A ? (
              <Link
                component={RouterLink}
                to={`/skills/${encodeURIComponent(String(kit.A))}`}
                state={{ from: location }}
                underline="none"
              >
                {kit.A}
              </Link>
            ) : (
              "—"
            )
          }
          meta={
            aInfo?.sp ? (
              <div>
                <b>SP</b> {aInfo.sp}
              </div>
            ) : undefined
          }
          headerIconLeft={
            <Box
              component="img"
              src={deathb}
              alt="death-blow"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
          headerIconBadge={
            <Box
              component="img"
              src={askillIcon}
              alt="A"
              sx={{ display: "block", width: 12, height: 12 }}
            />
          }
        >
          {aInfo?.description ? (
            <Box
              sx={{ opacity: 0.9 }}
              dangerouslySetInnerHTML={{ __html: String(aInfo.description) }}
            />
          ) : (
            <>—</>
          )}
        </DetailsCard>

        {/* PASSIVE B */}
        <DetailsCard
          title={
            kit.B ? (
              <Link
                component={RouterLink}
                to={`/skills/${encodeURIComponent(String(kit.B))}`}
                state={{ from: location }}
                underline="none"
              >
                {kit.B}
              </Link>
            ) : (
              "—"
            )
          }
          meta={
            bInfo?.sp ? (
              <div>
                <b>SP</b> {bInfo.sp}
              </div>
            ) : undefined
          }
          headerIconLeft={
            <Box
              component="img"
              src={flowr}
              alt="flow-refresh"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
          headerIconBadge={
            <Box
              component="img"
              src={bskillIcon}
              alt="B"
              sx={{ display: "block", width: 12, height: 12 }}
            />
          }
        >
          {bInfo?.description ? (
            <Box
              sx={{ opacity: 0.9 }}
              dangerouslySetInnerHTML={{ __html: String(bInfo.description) }}
            />
          ) : (
            <>—</>
          )}
        </DetailsCard>

        {/* PASSIVE C */}
        <DetailsCard
          title={
            kit.C ? (
              <Link
                component={RouterLink}
                to={`/skills/${encodeURIComponent(String(kit.C))}`}
                state={{ from: location }}
                underline="none"
              >
                {kit.C}
              </Link>
            ) : (
              "—"
            )
          }
          meta={
            cInfo?.sp ? (
              <div>
                <b>SP</b> {cInfo.sp}
              </div>
            ) : undefined
          }
          headerIconLeft={
            <Box
              component="img"
              src={visiona}
              alt="vision-arcadia"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
          headerIconBadge={
            <Box
              component="img"
              src={cskillIcon}
              alt="C"
              sx={{ display: "block", width: 12, height: 12 }}
            />
          }
        >
          {cInfo?.description ? (
            <Box
              sx={{ opacity: 0.9 }}
              dangerouslySetInnerHTML={{ __html: String(cInfo.description) }}
            />
          ) : (
            <>—</>
          )}
        </DetailsCard>

        {/* PASSIVE X (se existir) */}
        {kit.X && (
          <DetailsCard
            title={
              <Link
                component={RouterLink}
                to={`/skills/${encodeURIComponent(String(kit.X))}`}
                state={{ from: location }}
                underline="none"
              >
                {kit.X}
              </Link>
            }
            meta={undefined}
            headerIconLeft={undefined}
            headerIconBadge={undefined}
          >
            {/* Conteúdo opcional, depende do JSON */}—
          </DetailsCard>
        )}
      </Box>
    </Box>
  );
}
