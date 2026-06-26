import { Link, NavLink, Route, Routes } from "react-router-dom";
import Browse from "./pages/Browse.jsx";
import Editor from "./pages/Editor.jsx";
import Home from "./pages/Home.jsx";
import Stats from "./pages/Stats.jsx";
import ViewTierlist from "./pages/ViewTierlist.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          🎮 GameTier
        </Link>
        <nav className="nav">
          <NavLink to="/create">Crear</NavLink>
          <NavLink to="/browse">Explorar</NavLink>
          <NavLink to="/stats">Estadísticas</NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Editor />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/tierlist/:id" element={<ViewTierlist />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>GameTier · Datos de videojuegos vía Steam</span>
      </footer>
    </div>
  );
}
