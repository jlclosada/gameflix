import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Icon } from "../components/Icons.jsx";
import StarRating from "../components/StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function GameDetail({ onAuth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review form state.
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api
      .getGame(id)
      .then((d) => {
        setData(d);
        if (d.myReview) {
          setRating(d.myReview.rating);
          setComment(d.myReview.comment || "");
        } else {
          setRating(0);
          setComment("");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!user) {
      onAuth?.("login");
      return;
    }
    if (rating < 1) {
      setFormError("Selecciona una puntuación de estrellas.");
      return;
    }
    setSaving(true);
    try {
      await api.saveReview(id, { rating, comment });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeReview = async () => {
    setSaving(true);
    try {
      await api.deleteReview(id);
      setRating(0);
      setComment("");
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="loading">
        <div className="spinner" />
        Cargando juego...
      </div>
    );
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const { game, summary, reviews, myReview, placements } = data;

  return (
    <div>
      <button
        className="ghost btn-sm"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 18 }}
      >
        <Icon.Back style={{ width: 16, height: 16 }} />
        Volver
      </button>

      <div className="game-detail">
        <div className="gd-cover">
          {game.image_url ? (
            <img src={game.image_url} alt={game.name} />
          ) : (
            <div className="gd-cover-fallback">{game.name}</div>
          )}
        </div>

        <div className="gd-info">
          <h1>{game.name}</h1>

          <div className="gd-meta">
            {summary.average != null ? (
              <span className="badge accent">
                <Icon.Star style={{ width: 13, height: 13, color: "#ffd25c" }} />
                {summary.average.toFixed(1)} ({summary.count})
              </span>
            ) : (
              <span className="badge">Sin valoraciones</span>
            )}
            {game.released && <span className="badge">{game.released}</span>}
            {game.metacritic && (
              <span className="badge">Metacritic {game.metacritic}</span>
            )}
            <span className="badge">
              <Icon.Layers style={{ width: 12, height: 12 }} />
              {placements} en tier lists
            </span>
          </div>

          {game.genres?.length > 0 && (
            <div className="gd-genres">
              {game.genres.map((g) => (
                <Link key={g} to={`/games?genre=${encodeURIComponent(g)}`} className="badge">
                  {g}
                </Link>
              ))}
            </div>
          )}

          {game.platforms?.length > 0 && (
            <p className="muted" style={{ marginTop: 10 }}>
              Plataformas: {game.platforms.join(", ")}
            </p>
          )}

          {game.steam_id && (
            <a
              className="btn secondary btn-sm"
              href={`https://store.steampowered.com/app/${game.steam_id}`}
              target="_blank"
              rel="noreferrer"
              style={{ marginTop: 14 }}
            >
              Ver en Steam
            </a>
          )}
        </div>
      </div>

      {/* Review form */}
      <section className="review-form glass">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          <Icon.Star style={{ width: 20, height: 20, color: "#ffd25c" }} />
          {myReview ? "Tu valoración" : "Valora este juego"}
        </h2>

        {user ? (
          <form onSubmit={submit}>
            <StarRating value={rating} onRate={setRating} size={30} />
            <textarea
              placeholder="Escribe un comentario (opcional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              style={{ width: "100%", marginTop: 14, resize: "vertical" }}
            />
            {formError && <div className="error">{formError}</div>}
            <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
              <button type="submit" disabled={saving}>
                {saving
                  ? "Guardando..."
                  : myReview
                    ? "Actualizar valoración"
                    : "Publicar valoración"}
              </button>
              {myReview && (
                <button
                  type="button"
                  className="ghost btn-sm"
                  onClick={removeReview}
                  disabled={saving}
                >
                  Eliminar
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="empty" style={{ padding: "24px 0" }}>
            <p>Inicia sesión para puntuar y comentar este juego.</p>
            <button onClick={() => onAuth?.("login")} style={{ marginTop: 10 }}>
              Iniciar sesión
            </button>
          </div>
        )}
      </section>

      {/* Reviews list */}
      <h2 className="section-title">
        Comentarios de la comunidad
        <span className="muted" style={{ fontSize: "0.9rem", fontWeight: 500 }}>
          ({summary.count})
        </span>
      </h2>
      {reviews.length === 0 ? (
        <p className="muted">Todavía no hay valoraciones. ¡Sé el primero!</p>
      ) : (
        <div className="review-list">
          {reviews.map((r) => (
            <div className="review-item glass" key={r.id}>
              <div className="review-head">
                <span className="avatar">
                  {r.username.slice(0, 1).toUpperCase()}
                </span>
                <div className="grow">
                  <div className="rv-name">{r.username}</div>
                  <StarRating value={r.rating} size={15} />
                </div>
                <span className="muted rv-date">
                  {new Date(r.updated_at).toLocaleDateString("es-ES")}
                </span>
              </div>
              {r.comment && <p className="rv-comment">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
