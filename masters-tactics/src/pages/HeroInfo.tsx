// src/pages/Hero.tsx — versão MUI (mesma aparência, código otimizado e tipado)
// Requer @mui/material e @mui/icons-material instalados.
import * as React from "react";
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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

// —————————————————————————————————————————————
// ExpandMore (estilo MUI) — mantém rotação do ícone
// —————————————————————————————————————————————
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

// —————————————————————————————————————————————
// Dados mock e helpers (mantidos)
// —————————————————————————————————————————————
const hero = {
  version: "3.6",
  infobox: {
    Name: "Eliwood",
    Title: "Blazing Knight",
    Properties: "legendary, resplendent",
  },
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
// Card “estilo MUI” para os itens (Weapon/Assist/Special/Passives)
// Preserva aparência original (cores, sombras, espaçamentos).
// —————————————————————————————————————————————
type DetailsCardProps = {
  title: string;
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
        sx={{
          py: "12px",
          px: "14px",
          "& .MuiCardHeader-avatar": { mr: 1 },
        }}
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

// —————————————————————————————————————————————
// Painel de Stats — refeito com MUI, mesma aparência
// —————————————————————————————————————————————
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
        {/* Dragonflowers */}
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
            src={dragonflowers}
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
              // remove fundo e bordas
              background: "transparent",
              "& .MuiSelect-select": {
                padding: "0 24px 0 0", // tira padding interno, só deixa espaço pra seta
                fontSize: 14,
                color: "#fff",
              },
              "& fieldset": { display: "none" }, // remove o outline padrão
              "& .MuiOutlinedInput-notchedOutline": { border: "none" }, // redundância, pra garantir
              "& .MuiSelect-icon": {
                color: "rgba(255,255,255,0.7)", // cor da setinha
                right: 0, // cola a seta na borda direita do cinza
              },
            }}
          >
            {dragonflowerOptions(hero.dragonflowersCap).map((opt) => (
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
            src={mergesI}
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
    // remove fundo e bordas
    background: "transparent",
    "& .MuiSelect-select": {
      padding: "0 24px 0 0", // tira padding interno, só deixa espaço pra seta
      fontSize: 14,
      color: "#fff",
    },
    "& fieldset": { display: "none" }, // remove o outline padrão
    "& .MuiOutlinedInput-notchedOutline": { border: "none" }, // redundância, pra garantir
    "& .MuiSelect-icon": {
      color: "rgba(255,255,255,0.7)", // cor da setinha
      right: 0, // cola a seta na borda direita do cinza
    },
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
              src={resplendent}
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
    // remove fundo e bordas
    background: "transparent",
    "& .MuiSelect-select": {
      padding: "0 24px 0 0", // tira padding interno, só deixa espaço pra seta
      fontSize: 14,
      color: "#fff",
    },
    "& fieldset": { display: "none" }, // remove o outline padrão
    "& .MuiOutlinedInput-notchedOutline": { border: "none" }, // redundância, pra garantir
    "& .MuiSelect-icon": {
      color: "rgba(255,255,255,0.7)", // cor da setinha
      right: 0, // cola a seta na borda direita do cinza
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
              setFlowers(hero.dragonflowersCap);
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
        sx={{
          my: 1.25,
          borderColor: "rgba(255,255,255,.08)",
          opacity: 1,
        }}
      />

      {/* legenda dinâmica */}
      <Typography align="center" sx={{ fontSize: 13, opacity: 0.85, mb: 1 }}>
        {flowers ? `+${flowers} DF` : ""}
        {merges ? `${flowers ? " • " : ""}+${merges} merges` : ""}
        {resplendentOn
          ? `${flowers || merges ? " • " : ""}Resplendent (+2 all)`
          : ""}
      </Typography>

      {/* grid de stats */}
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

      {/* rodapé */}
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

// —————————————————————————————————————————————
// Página principal (mesma UI)
// —————————————————————————————————————————————
export default function HeroPageMock() {
  // Preparos (mantidos)
  const statsLv1 = React.useMemo(() => {
    const s = hero.stats.Lv1;
    return [s.HP, s.ATK, s.SPD, s.DEF, s.RES];
  }, []);
  const growths = React.useMemo(() => {
    const g = hero.stats.GrowthRates;
    return [g.HP, g.ATK, g.SPD, g.DEF, g.RES];
  }, []);
  const neutral40 = React.useMemo(
    () => lv40FromBaseAndGrowth(statsLv1, growths),
    [statsLv1, growths]
  );
  const supers = React.useMemo(
    () => computeSuperIVs(statsLv1, growths),
    [statsLv1, growths]
  );

  const [flowers, setFlowers] = React.useState<number>(0);
  const [merges, setMerges] = React.useState<number>(0);
  const [resplendentOn, setResplendentOn] = React.useState<boolean>(false);

  const hasResplendent = React.useMemo(
    () => String(hero.infobox.Properties).toLowerCase().includes("resplendent"),
    []
  );

  // Mods visuais (placeholders fixos)
  const weaponMods = React.useMemo(() => [0, 14, 0, 0, 0], []);
  const passiveMods = React.useMemo(() => [[0, 4, 4, 0, 0]], []);

  const displayed = React.useMemo(() => {
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

  React.useEffect(() => {
    setFlowers(0);
    setMerges(0);
    setResplendentOn(false);
  }, []);

  return (
    <Box
      sx={{
        maxWidth: 960,
    mx: "auto",
    px: 2,
    py: 3,
    pb: 4, // respiro extra no final
    minHeight: "100vh", // garante que o fundo cobre a tela inteira
    backgroundImage: `url(${bg})`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center top",
    backgroundAttachment: "fixed", 
      }}
    >
      <Box
        component="a"
        href="#"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          history.length > 1 ? history.back() : (location.href = "/heroes");
        }}
        sx={{ textDecoration: "none" }}
      >
        ← Back
      </Box>

      <Box sx={{ textAlign: "center" }}>
        <Typography sx={{ my: "20px", fontSize: "1.6rem", color: "#fff" }}>
          {hero.infobox.Name}
          {hero.infobox.Title ? `: ${hero.infobox.Title}` : ""}
        </Typography>

        <Box
          component="img"
          src={eliwood}
          alt={`${hero.infobox.Name}${
            hero.infobox.Title ? `: ${hero.infobox.Title}` : ""
          } illustration`}
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
          }}
        >
          Version: {hero.version ?? "—"}
        </Box>
      </Box>

      {/* Bloco de infos (rarities/weapon/move/legendary) */}
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
        {/* Rarities */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Typography sx={{ fontSize: "1.1rem", mb: 0.75 }}>
            <b>Rarities</b>
          </Typography>
          <Box
            component="img"
            src={fivestars}
            alt="rarities"
            sx={{ height: 28, filter: "drop-shadow(0 0 6px gold)" }}
          />
        </Box>

        {/* Weapon type */}
        <Box>
          <Box sx={{ mb: 0.75 }}>
            <b>Weapon</b>
          </Box>
          <Box sx={{ borderRadius: 1, p: "6px" }}>
            <Box component="img" src={sword} alt="sword" sx={{ height: 32 }} />
          </Box>
        </Box>

        {/* Move type */}
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

        {/* Legendary effect */}
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

      <Divider
  sx={{
    my: 2,
    "&::before, &::after": {
      borderColor: "rgba(255, 255, 255, 1)", // cor das linhas
    },
  }}
>
  <Typography
    sx={{
      fontSize: 32,
      fontWeight: 700,
      color: "#ffffffff",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      padding:"20px",
    }}
  >
    Stats
  </Typography>
</Divider>

      {/* Painel de stats */}
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
        />
      </Box>

      <Divider
  sx={{
    my: 2,
    "&::before, &::after": {
      borderColor: "rgba(255, 255, 255, 1)", // cor das linhas
    },
  }}
>
  <Typography
    sx={{
      fontSize: 32,
      fontWeight: 700,
      color: "#ffffffff",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      padding:"20px",
    }}
  >
    Base Kit
  </Typography>
</Divider>

      {/* Kit + cards expansíveis (MUI Card + Collapse) */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        {/* WEAPON */}
        <DetailsCard
          title={hero.weapons[0] || "—"}
          meta={
            <>
              <b>Mt</b> 16 • <b>Rng</b> 1 • <b>SP</b> 400
            </>
          }
          headerIconLeft={
            <Box
              component="img"
              src={sword}
              alt="sword-icon"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          Grants Atk+3. At start of turn, grants [Bonus Doubler] to unit with
          the highest Atk. [Bonus Doubler] Grants bonus to Atk/Spd/Def/Res
          during combat = current bonus on each of unit&apos;s stats for 1 turn.
          Calculates each stat bonus independently.
          <Box sx={{ color: "#45BC00", mt: 0.75, fontWeight: 600 }}>
            If unit initiates combat or is within 2 spaces of an ally, grants
            Atk/Spd/Def/Res+5 to unit, neutralizes foe&apos;s bonuses durante
            combat, and deals damage = 15% of foe&apos;s Def (including as part
            of pre-combat Specials).
          </Box>
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
            <Box
              component="img"
              src={assist}
              alt="assist-icon"
              sx={{ display: "block", width: 21, height: 21 }}
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
            <Box
              component="img"
              src={special}
              alt="special-icon"
              sx={{ display: "block", width: 21, height: 21 }}
            />
          }
        >
          Deals +30% of foe&apos;s Def.
        </DetailsCard>

        {/* PASSIVE A */}
        <DetailsCard
          title={hero.passives?.A?.[0] ?? "—"}
          meta={<div><b>SP</b> 300</div>}
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
              src={askill}
              alt="A"
              sx={{ display: "block", width: 12, height: 12 }}
            />
          }
        >
          If unit initiates combat, grants Atk+8 during combat.
        </DetailsCard>

        {/* PASSIVE B */}
        <DetailsCard
          title={hero.passives?.B?.[0] ?? "—"}
          meta={<div><b>SP</b> 300</div>}
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
              src={bskill}
              alt="B"
              sx={{ display: "block", width: 12, height: 12 }}
            />
          }
        >
          If unit initiates combat, neutralizes effects that prevent unit&apos;s
          follow-up attacks and restores 10 HP to unit after combat.
        </DetailsCard>

        {/* PASSIVE C */}
        <DetailsCard
          title={hero.passives?.C?.[0] ?? "—"}
          meta={<div><b>SP</b> 300</div>}
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
              src={cskill}
              alt="C"
              sx={{ display: "block", width: 12, height: 12 }}
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
      </Box>
    </Box>
  );
}
