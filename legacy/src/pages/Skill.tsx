import { useParams, Link } from "react-router-dom";
import skills from "../data/skills.json";
import type { Skill } from "../types";

export default function SkillPage() {
  const { id } = useParams();
  const skill = (skills as Skill[]).find(s => s.id === id);

  if (!skill) {
    return <div style={{ maxWidth:960, margin:"24px auto", padding:"0 16px" }}>
      <p>Skill não encontrada.</p><Link to="/skills">← Voltar</Link>
    </div>;
  }

  return (
    <div style={{ maxWidth:960, margin:"24px auto", padding:"0 16px" }}>
      <Link to="/skills">← Voltar</Link>
      <h2 style={{ marginTop:12 }}>{skill.name}</h2>
      <div style={{ opacity:.8 }}>Slot: {skill.slot}</div>
    </div>
  );
}
