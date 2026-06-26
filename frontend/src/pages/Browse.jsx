import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { Icon } from "../components/Icons.jsx";

export default function Browse() {
  const [tierlists, setTierlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");

  const load = async (cat = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getTierlists({ category: cat, limit: 50 });
      setTierlists(data.tierlists || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Tier lists publicadas</h1>
          <p className="sub">Descubre cómo ordena la comunidad sus juegos.</p>
        </div>
        <Link to="/create" className="btn btn-sm">
          <Icon.Plus style={{ width: 16, height: 16 }} />
          Crear la mía
        </Link>
      </div>

      <div className="toolbar">
        <div className="search" style={{ flex: 1, minWidth: 220 }}>
          <Icon.Search />
          <input
            placeholder="Filtrar por categoría..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(category)}
          />
        </div>
        <button className="secondary" onClick={() => load(category)}>
          Filtrar
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Cargando...
        </div>
      ) : tierlists.length === 0 ? (
        <div className="empty">
          <div className="big">📋</div>
          <p>
            Todavía no hay tier lists. ¡<Link to="/create">Crea la primera</Link>!
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {tierlists.map((tl, i) => (
            <TierlistCard key={tl.id} tl={tl} delay={i * 0.04} />
          ))}
        </div>
      )}
    </div>
  );
}

function TierlistCard({ tl, delay }) {
  const previews = (tl.previews || []).filter(Boolean);
  return (
    <Link
      to={`/tierlist/${tl.id}`}
      className="tl-card"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="preview">
        {previews.length ? (
          previews.map((src, idx) => (
            <div
              key={idx}
              className="pcell"
              style={{ backgroundImage: `url(${src})` }}
            />
          ))
        ) : (
          <div
            className="pcell"
            style={{ background: "var(--grad-brand-soft)" }}
          />
        )}
      </div>
      <div className="body">
        <h3>{tl.title}</h3>
        <div className="by">
          <span className="avatar" style={{ width: 22, height: 22, fontSize: "0.62rem" }}>
            {(tl.author || "?").slice(0, 1).toUpperCase()}
          </span>
          por {tl.author}
        </div>
        <div className="tags">
          {tl.category && <span className="badge accent">{tl.category}</span>}
          <span className="badge">
            <Icon.Layers style={{ width: 12, height: 12 }} />
            {tl.tier_count} tiers
          </span>
          <span className="badge">
            <Icon.Eye style={{ width: 12, height: 12 }} />
            {tl.views}
          </span>
        </div>
      </div>
    </Link>
  );
}
