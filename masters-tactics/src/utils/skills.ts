// src/utils/skills.ts
export const nameKeyFromPid = (pid: string) => `MPID_${pid.replace(/^PID_?/, "")}`;
export const titleKeyFromPid = (pid: string) => `MPID_HONOR_${pid.replace(/^PID_?/, "")}`;
export const nameKeyFromSid = (sid: string) => `MSID_${sid.replace(/^SID_?/, "")}`;

// Pega do basekit a melhor skill por slot (bem defensivo)
export function pickKitSlots(
  basekit: string[] | undefined,
  skillsData: any
): {
  weapon?: string;
  assist?: string;
  special?: string;
  A?: string;
  B?: string;
  C?: string;
  X?: string;
} {
  const out: any = {};
  if (!Array.isArray(basekit)) return out;

  for (const sid of basekit) {
    if (!sid) continue;
    if (skillsData.weapons && sid in skillsData.weapons) out.weapon = sid;
    else if (skillsData.assists && sid in skillsData.assists) out.assist = sid;
    else if (skillsData.specials && sid in skillsData.specials) out.special = sid;
    else if (skillsData.passives?.A && sid in skillsData.passives.A) out.A = sid;
    else if (skillsData.passives?.B && sid in skillsData.passives.B) out.B = sid;
    else if (skillsData.passives?.C && sid in skillsData.passives.C) out.C = sid;
    else if (skillsData.passives?.X && sid in skillsData.passives.X) out.X = sid;
  }
  return out;
}
