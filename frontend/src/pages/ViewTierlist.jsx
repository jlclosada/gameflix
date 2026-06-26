import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Icon } from "../components/Icons.jsx";

export default function ViewTierlist() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .getTierlist(id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando tier list...
      </div>
    );
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const gamesById = data.gamesById || {};

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{data.title}</h1>
          <div className="tl-meta" style={{ marginTop: 10 }}>
            <span className="badge accent">
              <span
                className="avatar"
                style={{ width: 20, height: 20, fontSize: "0.62rem" }}
              >
                {(data.author || "?").slice(0, 1).toUpperCase()}
              </span>
              {data.author}
            </span>
            {data.category && <span className="badge">{data.category}</span>}
            <span className="badge">
              <Icon.Eye style={{ width: 12, height: 12 }} />
              {data.views} vistas
            </span>
          </div>
        </div>
        <Link to="/create" className="btn btn-sm">
          <Icon.Sparkles style={{ width: 16, height: 16 }} />
          Crear la mía
        </Link>
      </div>

      <div className="tiers">
        {(data.tiers || []).map((tier, i) => (
          <div className="tier-row" key={i}>
            <div
              className="tier-label"
              style={{ background: tier.color || "var(--grad-brand)" }}
            >
              {tier.label}
            </div>
            <div className="tier-drop">
              {(tier.gameIds || []).map((gid) => {
                const game = gamesById[gid];
                if (!game) return null;
                return (
                  <div className="game-tile" key={gid} title={game.name}>
                    {game.image_url ? (
                      <img src={game.image_url} alt={game.name} loading="lazy" />
                    ) : (
                      <span
                        className="tile-name"
                        style={{ opacity: 1, transform: "none" }}
                      >
                        {game.name}
                      </span>
                    )}
                    <span className="tile-name">{game.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
