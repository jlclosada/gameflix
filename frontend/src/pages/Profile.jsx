import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import StarRating from "../components/StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile({ onAuth }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .myReviews()
      .then((d) => setReviews(d.reviews || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="empty">
        <div className="big">👤</div>
        <p>Inicia sesión para ver tu perfil y tus valoraciones.</p>
        <button onClick={() => onAuth?.("login")} style={{ marginTop: 10 }}>
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div className="tl-meta">
          <span className="avatar lg">
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 style={{ margin: 0 }}>{user.username}</h1>
            <p className="sub" style={{ margin: "4px 0 0" }}>
              {user.email}
            </p>
          </div>
        </div>
      </div>

      <h2 className="section-title">Mis valoraciones</h2>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Cargando...
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : reviews.length === 0 ? (
        <div className="empty">
          <div className="big">⭐</div>
          <p>
            Aún no has valorado ningún juego. Ve a{" "}
            <Link to="/games">Juegos</Link> y puntúa tus favoritos.
          </p>
        </div>
      ) : (
        <div className="review-list">
          {reviews.map((r) => (
            <Link
              to={`/game/${r.game_id}`}
              className="review-item glass profile-rv"
              key={r.id}
            >
              {r.game_image ? (
                <img className="thumb" src={r.game_image} alt={r.game_name} />
              ) : (
                <span className="thumb" />
              )}
              <div className="grow">
                <div className="rv-name">{r.game_name}</div>
                <StarRating value={r.rating} size={15} />
                {r.comment && <p className="rv-comment">{r.comment}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
