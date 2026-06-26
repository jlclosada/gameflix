import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import GameTile from "../components/GameTile.jsx";
import { Icon } from "../components/Icons.jsx";

const PAGE_SIZE = 36;

export default function Games() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [genres, setGenres] = useState([]);

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debounce = useRef(null);
  const topRef = useRef(null);

  useEffect(() => {
    api
      .getGenres()
      .then((d) => setGenres(d.genres || []))
      .catch(() => {});
  }, []);

  // Reset to first page whenever the filters change.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setPage(0), 300);
    return () => clearTimeout(debounce.current);
  }, [search, genre]);

  // Keep the genre in the URL so detail-page genre links work and are shareable.
  useEffect(() => {
    const current = searchParams.get("genre") || "";
    if (genre !== current) {
      const next = new URLSearchParams(searchParams);
      if (genre) next.set("genre", genre);
      else next.delete("genre");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .getGames({ search, genre, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((d) => {
        if (!active) return;
        setGames(d.games || []);
        setTotal(d.total || 0);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, genre, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goPage = (p) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={topRef}>
      <div className="page-head">
        <div>
          <h1>Explora el catálogo</h1>
          <p className="sub">
            {total.toLocaleString("es-ES")} juegos listos para tus tier lists.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search" style={{ flex: 1, minWidth: 220 }}>
          <Icon.Search />
          <input
            placeholder="Buscar juegos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">Todos los géneros</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="game-grid">
          {Array.from({ length: 18 }).map((_, i) => (
            <div className="skeleton tile" key={i} />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="empty">
          <div className="big">🎮</div>
          <p>No se encontraron juegos con esos filtros.</p>
        </div>
      ) : (
        <div className="game-grid">
          {games.map((g) => (
            <Link key={g.id} to={`/game/${g.id}`} className="tile-link">
              <GameTile game={g} draggable={false} className="lg" />
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && !loading && (
        <div className="pagination">
          <button
            className="secondary btn-sm"
            disabled={page === 0}
            onClick={() => goPage(page - 1)}
          >
            ← Anterior
          </button>
          <span className="page-info">
            Página {page + 1} de {totalPages}
          </span>
          <button
            className="secondary btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => goPage(page + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}


