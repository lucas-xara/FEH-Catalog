import type { Skill } from "../types";

type OnlineSkills = {
  weapons: Record<string, any>;
  assists: Record<string, any>;
  specials: Record<string, any>;
  passives: {
    A: Record<string, any>;
    B: Record<string, any>;
    C: Record<string, any>;
    X: Record<string, any>;
    S: Record<string, any>;
  };
};

export function mapOnlineSkillsToList(data: OnlineSkills): Skill[] {
  const list: Skill[] = [];

  const pushGroup = (rec: Record<string, any>, slot: Skill["slot"]) => {
    for (const id of Object.keys(rec)) {
      list.push({ id, name: id, slot }); // por enquanto, nome = id (vamos ligar languages depois)
    }
  };

  pushGroup(data.assists, "Assist");
  pushGroup(data.specials, "Special");
  pushGroup(data.passives.A, "A");
  pushGroup(data.passives.B, "B");
  pushGroup(data.passives.C, "C");
  pushGroup(data.passives.S, "S");
  // weapons vamos tratar na página de Weapons
  return list;
}
