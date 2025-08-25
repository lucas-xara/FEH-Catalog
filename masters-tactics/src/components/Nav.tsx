import { Link, useLocation } from "react-router-dom";

const linkStyle = (active: boolean) => ({
  padding: "8px 10px",
  borderRadius: 8,
  textDecoration: "none",
  color: active ? "#fff" : "#111",
  background: active ? "#111" : "transparent"
});

export default function Nav() {
  const { pathname } = useLocation();
  return (
    <div style={{ display: "flex", gap: 8, padding: 12, borderBottom: "1px solid #eee" }}>
      <Link to="/" style={linkStyle(pathname === "/")}>Heroes</Link>
      <Link to="/skills" style={linkStyle(pathname.startsWith("/skills"))}>Skills</Link>
      <Link to="/weapons" style={linkStyle(pathname.startsWith("/weapons"))}>Weapons</Link>
    </div>
  );
}
