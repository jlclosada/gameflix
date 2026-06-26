import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

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
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Tier lists publicadas</h1>
        <div className="spacer" />
        <input
          placeholder="Filtrar por categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(category)}
        />
        <button className="secondary" onClick={() => load(category)}>
          Filtrar
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="loading">Cargando...</div>
      ) : tierlists.length === 0 ? (
        <p className="muted">
          Todavía no hay tier lists. ¡<Link to="/create">Crea la primera</Link>!
        </p>
      ) : (
        <div className="card-grid">
          {tierlists.map((tl) => (
            <Link key={tl.id} to={`/tierlist/${tl.id}`} className="card">
              <h3>{tl.title}</h3>
              <p className="meta">por {tl.author}</p>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tl.category && <span className="badge">{tl.category}</span>}
                <span className="badge">{tl.tier_count} tiers</span>
                <span className="badge">{tl.views} vistas</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
