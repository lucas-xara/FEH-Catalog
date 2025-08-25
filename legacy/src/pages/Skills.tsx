import rawSkills from "../data/content/onlineskills.json";
import { mapOnlineSkillsToList } from "../adapters/fehSkills";
import type { Skill } from "../types";
import { Link } from "react-router-dom";

export default function SkillsPage() {
  const skills = mapOnlineSkillsToList(rawSkills as any) as Skill[];
  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>Skills</h1>
      <p style={{ marginTop: -8, opacity:.8 }}>dados reais (nome = ID por enquanto)</p>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {skills.slice(0, 200).map(s => (
          <Link key={s.id} to={`/skills/${s.id}`} style={{ textDecoration:"none", color:"inherit" }}>
            <div style={{ background:"#fff", padding:12, borderRadius:12, boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
              <strong>{s.id}</strong>
              <div style={{ opacity:.7 }}>Slot: {s.slot}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
