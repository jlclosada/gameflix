import { useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import AuthModal from "./components/AuthModal.jsx";
import { Icon } from "./components/Icons.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Browse from "./pages/Browse.jsx";
import Editor from "./pages/Editor.jsx";
import GameDetail from "./pages/GameDetail.jsx";
import Games from "./pages/Games.jsx";
import Home from "./pages/Home.jsx";
import Profile from "./pages/Profile.jsx";
import Stats from "./pages/Stats.jsx";
import ViewTierlist from "./pages/ViewTierlist.jsx";

export default function App() {
  const { user, logout, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="logo">
            <Icon.Logo />
          </span>
          <span className="name">GameTier</span>
        </Link>

        <nav className="nav">
          <NavLink to="/games">
            <Icon.Search
              style={{ width: 16, height: 16, verticalAlign: "-3px", marginRight: 6 }}
            />
            <span>Juegos</span>
          </NavLink>
          <NavLink to="/create">
            <span>Crear</span>
          </NavLink>
          <NavLink to="/browse">
            <span>Explorar</span>
          </NavLink>
          <NavLink to="/stats">
            <span>Ranking</span>
          </NavLink>
        </nav>

        <div className="nav-auth">
          {loading ? null : user ? (
            <>
              <Link
                to="/profile"
                className="badge accent"
                title="Tu perfil"
                style={{ textDecoration: "none" }}
              >
                <span
                  className="avatar"
                  style={{ width: 20, height: 20, fontSize: "0.65rem" }}
                >
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                {user.username}
              </Link>
              <button
                className="ghost btn-sm"
                onClick={logout}
                title="Cerrar sesión"
              >
                <Icon.Logout style={{ width: 16, height: 16 }} />
              </button>
            </>
          ) : (
            <>
              <button className="ghost btn-sm" onClick={() => openAuth("login")}>
                Entrar
              </button>
              <button className="btn-sm" onClick={() => openAuth("register")}>
                Crear cuenta
              </button>
            </>
          )}
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Home onAuth={openAuth} />} />
          <Route path="/games" element={<Games />} />
          <Route path="/game/:id" element={<GameDetail onAuth={openAuth} />} />
          <Route path="/create" element={<Editor onAuth={openAuth} />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/tierlist/:id" element={<ViewTierlist />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/profile" element={<Profile onAuth={openAuth} />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>GameTier · Datos de videojuegos vía Steam</span>
      </footer>

      {authOpen && (
        <AuthModal initialMode={authMode} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
