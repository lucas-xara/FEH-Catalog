import { Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/Nav";

import HeroesPage from "./pages/Heroes";
import HeroPage from "./pages/Hero";

import SkillsPage from "./pages/Skills";
import SkillPage from "./pages/Skill";

import WeaponsPage from "./pages/Weapons";
import WeaponPage from "./pages/Weapon";

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        {/* canonical home em /heroes */}
        <Route path="/" element={<Navigate to="/heroes" replace />} />

        <Route path="/heroes" element={<HeroesPage />} />
        <Route path="/heroes/:id" element={<HeroPage />} />

        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/skills/:id" element={<SkillPage />} />

        <Route path="/weapons" element={<WeaponsPage />} />
        <Route path="/weapons/:id" element={<WeaponPage />} />

        <Route path="/weapons" element={<WeaponsPage />} />
        <Route path="/weapons/:id" element={<WeaponPage />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/heroes" replace />} />
      </Routes>
    </>
  );
}
