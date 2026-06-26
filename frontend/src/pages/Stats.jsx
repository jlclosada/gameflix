import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon } from "../components/Icons.jsx";

function RankList({ items, valueKey, valueLabel }) {
  if (!items || items.length === 0) {
    return <p className="muted">Sin datos todavía.</p>;
  }
  return (
    <ul className="rank-list">
      {items.map((g, i) => (
        <li className="rank-item" key={g.id}>
          <span className="rank-pos">{i + 1}</span>
          {g.image_url ? (
            <img className="thumb" src={g.image_url} alt={g.name} loading="lazy" />
          ) : (
            <span className="thumb" />
          )}
          <div className="grow">
            <div className="nm">{g.name}</div>
            <div className="sm">{g.appearances} apariciones</div>
          </div>
          {valueKey && (
            <span className="badge accent">
              {g[valueKey]} {valueLabel}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="loading">
        <div className="spinner" />
        Calculando estadísticas...
      </div>
    );
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  const totalDist = (stats.tierDistribution || []).reduce(
    (acc, t) => acc + Number(t.count),
    0
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Estadísticas de la comunidad</h1>
          <p className="sub">
            Lo que revela cada tier list publicada sobre tus juegos favoritos.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="num">{stats.totals?.tierlists ?? 0}</div>
          <div className="lbl">Tier lists publicadas</div>
        </div>
        <div className="stat-box">
          <div className="num">{stats.totals?.placements ?? 0}</div>
          <div className="lbl">Juegos colocados</div>
        </div>
        <div className="stat-box">
          <div className="num">{stats.totals?.ranked_games ?? 0}</div>
          <div className="lbl">Juegos valorados</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <h2 className="section-title">
            <Icon.Trophy style={{ width: 22, height: 22, color: "#ffd25c" }} />
            Más queridos
          </h2>
          <p className="muted">Mayor puntuación media de tier (0-100).</p>
          <RankList items={stats.mostLoved} valueKey="avg_rank" valueLabel="pts" />
        </div>
        <div>
          <h2 className="section-title">
            <Icon.Sparkles style={{ width: 22, height: 22, color: "#22d3ee" }} />
            Más populares
          </h2>
          <p className="muted">Aparecen en más tier lists.</p>
          <RankList items={stats.mostRanked} />
        </div>
      </div>

      <h2 className="section-title">
        <Icon.Layers style={{ width: 22, height: 22, color: "#f0abfc" }} />
        Más divisivos
      </h2>
      <p className="muted">Mayor desacuerdo entre los usuarios.</p>
      <RankList
        items={stats.mostDivisive}
        valueKey="spread"
        valueLabel="dispersión"
      />

      <h2 className="section-title">
        <Icon.Chart style={{ width: 22, height: 22, color: "#7c5cff" }} />
        Distribución por tier
      </h2>
      <div>
        {(stats.tierDistribution || []).map((t) => {
          const pct = totalDist ? (Number(t.count) / totalDist) * 100 : 0;
          return (
            <div className="bar-row" key={t.tier_label}>
              <div className="bar-top">
                <strong>{t.tier_label}</strong>
                <span className="muted">{t.count}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
