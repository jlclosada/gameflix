import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";

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

  if (loading) return <div className="loading">Cargando tier list...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const gamesById = data.gamesById || {};

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1 style={{ margin: 0 }}>{data.title}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            por {data.author}
            {data.category ? ` · ${data.category}` : ""} · {data.views} vistas
          </p>
        </div>
        <div className="spacer" />
        <Link to="/create" className="btn secondary">
          Crear la mía
        </Link>
      </div>

      <div className="tiers">
        {(data.tiers || []).map((tier, i) => (
          <div className="tier-row" key={i}>
            <div className="tier-label" style={{ background: tier.color || "#ccc" }}>
              {tier.label}
            </div>
            <div className="tier-drop">
              {(tier.gameIds || []).map((gid) => {
                const game = gamesById[gid];
                if (!game) return null;
                return (
                  <div className="game-tile" key={gid} title={game.name}>
                    {game.image_url && (
                      <img src={game.image_url} alt={game.name} loading="lazy" />
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
