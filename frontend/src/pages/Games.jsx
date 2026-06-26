import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import CatalogCard from "../components/CatalogCard.jsx";
import { Icon } from "../components/Icons.jsx";

const PAGE_SIZE = 48;

const SORTS = [
  { key: "popular", label: "Mejores juegos" },
  { key: "reviews", label: "Más reseñados" },
  { key: "rating", label: "Mejor valorados" },
  { key: "name", label: "A–Z" },
];

export default function Games() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState([]);
  const [total, setTotal] = useState(0);
  const [genres, setGenres] = useState([]);

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [sort, setSort] = useState("popular");
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

  // Reset to first page whenever the filters change (debounced for search).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setPage(0), 300);
    return () => clearTimeout(debounce.current);
  }, [search, genre, sort]);

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
      .getGames({ search, genre, sort, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
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
  }, [search, genre, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goPage = (p) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Build a compact list of page buttons around the current page.
  const pageButtons = () => {
    const out = [];
    const add = (p) => out.push(p);
    const window = 1;
    const from = Math.max(0, page - window);
    const to = Math.min(totalPages - 1, page + window);
    if (from > 0) {
      add(0);
      if (from > 1) add("…");
    }
    for (let p = from; p <= to; p++) add(p);
    if (to < totalPages - 1) {
      if (to < totalPages - 2) add("…");
      add(totalPages - 1);
    }
    return out;
  };

  return (
    <div ref={topRef}>
      <div className="catalog-hero">
        <div className="catalog-hero-text">
          <span className="eyebrow">
            <Icon.Sparkles width={14} height={14} /> Catálogo
          </span>
          <h1>Explora miles de juegos</h1>
          <p className="sub">
            {total.toLocaleString("es-ES")} juegos listos para tus tier lists.
          </p>
        </div>
      </div>

      <div className="toolbar catalog-toolbar">
        <div className="search" style={{ flex: 1, minWidth: 220 }}>
          <Icon.Search />
          <input
            placeholder="Buscar juegos por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="genre-chips">
        <button
          className={`chip${genre === "" ? " active" : ""}`}
          onClick={() => setGenre("")}
        >
          Todos
        </button>
        {genres.map((g) => (
          <button
            key={g}
            className={`chip${genre === g ? " active" : ""}`}
            onClick={() => setGenre(genre === g ? "" : g)}
          >
            {g}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="catalog-grid">
          {Array.from({ length: 18 }).map((_, i) => (
            <div className="skeleton catalog-skel" key={i} />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="empty">
          <div className="big">🎮</div>
          <p>No se encontraron juegos con esos filtros.</p>
        </div>
      ) : (
        <div className="catalog-grid">
          {games.map((g) => (
            <CatalogCard key={g.id} game={g} />
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
            ←
          </button>
          {pageButtons().map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="page-ellipsis">
                …
              </span>
            ) : (
              <button
                key={p}
                className={`page-btn${p === page ? " active" : ""}`}
                onClick={() => goPage(p)}
              >
                {p + 1}
              </button>
            ),
          )}
          <button
            className="secondary btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => goPage(page + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}


