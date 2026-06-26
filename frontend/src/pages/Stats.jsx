import { useEffect, useState } from "react";
import { api } from "../api.js";

function RankList({ items, valueKey, valueLabel }) {
  if (!items || items.length === 0) {
    return <p className="muted">Sin datos todavía.</p>;
  }
  return (
    <ul className="rank-list">
      {items.map((g, i) => (
        <li className="rank-item" key={g.id}>
          <span className="rank-pos">{i + 1}</span>
          {g.image_url && <img src={g.image_url} alt={g.name} loading="lazy" />}
          <div className="grow">
            <div>{g.name}</div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {g.appearances} apariciones
            </div>
          </div>
          {valueKey && (
            <span className="badge">
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

  if (loading) return <div className="loading">Calculando estadísticas...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  const totalDist = (stats.tierDistribution || []).reduce(
    (acc, t) => acc + Number(t.count),
    0
  );

  return (
    <div>
      <h1>Estadísticas de la comunidad</h1>

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
          <h2 className="section-title">🏆 Más queridos</h2>
          <p className="muted">Mayor puntuación media de tier (0-100).</p>
          <RankList
            items={stats.mostLoved}
            valueKey="avg_rank"
            valueLabel="pts"
          />
        </div>
        <div>
          <h2 className="section-title">🔥 Más populares</h2>
          <p className="muted">Aparecen en más tier lists.</p>
          <RankList items={stats.mostRanked} />
        </div>
      </div>

      <h2 className="section-title">⚔️ Más divisivos</h2>
      <p className="muted">Mayor desacuerdo entre los usuarios.</p>
      <RankList
        items={stats.mostDivisive}
        valueKey="spread"
        valueLabel="dispersión"
      />

      <h2 className="section-title">📊 Distribución por tier</h2>
      <div>
        {(stats.tierDistribution || []).map((t) => {
          const pct = totalDist ? (Number(t.count) / totalDist) * 100 : 0;
          return (
            <div key={t.tier_label} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{t.tier_label}</strong>
                <span className="muted">{t.count}</span>
              </div>
              <div
                style={{
                  background: "var(--panel-2)",
                  borderRadius: 6,
                  overflow: "hidden",
                  height: 14,
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
