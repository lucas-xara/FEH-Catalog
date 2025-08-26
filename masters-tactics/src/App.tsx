import { Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/Nav";

import HeroesPage from "./pages/Heroes";
import HeroPage from "./pages/Hero";

import WeaponsPage from "./pages/Weapons";
import WeaponPage from "./pages/Weapon";

import AssistsPage from "./pages/Assists";
import AssistPage from "./pages/Assist";

import SpecialsPage from "./pages/Specials";
import SpecialPage from "./pages/Special";

import SkillsPage from "./pages/Skills";
import SkillPage from "./pages/Skill";

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        {/* canonical home em /heroes */}
        <Route path="/" element={<Navigate to="/heroes" replace />} />

        <Route path="/heroes" element={<HeroesPage />} />
        <Route path="/heroes/:id" element={<HeroPage />} />

        <Route path="/weapons" element={<WeaponsPage />} />
        <Route path="/weapons/:id" element={<WeaponPage />} />

        <Route path="/assists" element={<AssistsPage />} />
        <Route path="/assists/:id" element={<AssistPage />} />

        <Route path="/specials" element={<SpecialsPage />} />
        <Route path="/specials/:id" element={<SpecialPage />} />

        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/skills/:id" element={<SkillPage />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/heroes" replace />} />
      </Routes>
    </>
  );
}
