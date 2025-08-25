import { useParams } from "react-router-dom";

export default function HeroDetail() {
  const { id } = useParams();
  return <div style={{ padding: 16 }}>Hero detail: {id}</div>;
}