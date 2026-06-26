import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import GameTile from "../components/GameTile.jsx";

const DEFAULT_TIERS = [
  { label: "S", color: "#ff7f7f", games: [] },
  { label: "A", color: "#ffbf7f", games: [] },
  { label: "B", color: "#ffdf7f", games: [] },
  { label: "C", color: "#ffff7f", games: [] },
  { label: "D", color: "#bfff7f", games: [] },
];

const NEW_TIER_COLORS = ["#7fffd4", "#7fbfff", "#bf7fff", "#ff7fdf", "#cccccc"];

export default function Editor() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");

  const [tiers, setTiers] = useState(() =>
    DEFAULT_TIERS.map((t) => ({ ...t, games: [] }))
  );
  const [pool, setPool] = useState([]);

  const [genres, setGenres] = useState([]);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  const draggedId = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  // Ids already placed in tiers, to avoid duplicates in the pool.
  const placedIds = useMemo(
    () => new Set(tiers.flatMap((t) => t.games.map((g) => g.id))),
    [tiers]
  );

  useEffect(() => {
    api
      .getGenres()
      .then((d) => setGenres(d.genres || []))
      .catch(() => {});
  }, []);

  const loadGames = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getGames({
        search,
        genre: genreFilter,
        limit: 80,
      });
      setPool(data.games || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- drag & drop ----
  const handleDragStart = (e, game) => {
    draggedId.current = game.id;
    setDraggingId(game.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(game.id));
  };

  const handleDragEnd = () => {
    draggedId.current = null;
    setDraggingId(null);
  };

  // Remove a game from wherever it currently lives. Returns the game object.
  const detach = (gameId) => {
    let found = null;
    setPool((prev) => {
      const idx = prev.findIndex((g) => g.id === gameId);
      if (idx !== -1) {
        found = prev[idx];
        return prev.filter((g) => g.id !== gameId);
      }
      return prev;
    });
    setTiers((prev) =>
      prev.map((t) => {
        const idx = t.games.findIndex((g) => g.id === gameId);
        if (idx !== -1) {
          if (!found) found = t.games[idx];
          return { ...t, games: t.games.filter((g) => g.id !== gameId) };
        }
        return t;
      })
    );
    return found;
  };

  const dropToTier = (e, tierIndex) => {
    e.preventDefault();
    const gameId = Number(e.dataTransfer.getData("text/plain")) || draggedId.current;
    if (!gameId) return;

    // Find the game across pool and tiers without mutating yet.
    const game =
      pool.find((g) => g.id === gameId) ||
      tiers.flatMap((t) => t.games).find((g) => g.id === gameId);
    if (!game) return;

    // Remove from current location.
    setPool((prev) => prev.filter((g) => g.id !== gameId));
    setTiers((prev) =>
      prev.map((t, i) => {
        const without = t.games.filter((g) => g.id !== gameId);
        if (i === tierIndex) {
          return { ...t, games: [...without, game] };
        }
        return { ...t, games: without };
      })
    );
    handleDragEnd();
  };

  const dropToPool = (e) => {
    e.preventDefault();
    const gameId = Number(e.dataTransfer.getData("text/plain")) || draggedId.current;
    if (!gameId) return;
    const game = tiers.flatMap((t) => t.games).find((g) => g.id === gameId);
    setTiers((prev) =>
      prev.map((t) => ({ ...t, games: t.games.filter((g) => g.id !== gameId) }))
    );
    if (game) {
      setPool((prev) =>
        prev.some((g) => g.id === gameId) ? prev : [game, ...prev]
      );
    }
    handleDragEnd();
  };

  const allowDrop = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // ---- tier management ----
  const updateTierLabel = (index, label) => {
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, label } : t))
    );
  };

  const moveTier = (index, dir) => {
    setTiers((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeTier = (index) => {
    setTiers((prev) => {
      const tier = prev[index];
      // Return its games to the pool.
      if (tier.games.length) {
        setPool((p) => [...tier.games, ...p]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        label: "Nuevo",
        color: NEW_TIER_COLORS[prev.length % NEW_TIER_COLORS.length],
        games: [],
      },
    ]);
  };

  // ---- publish ----
  const publish = async () => {
    setError("");
    if (!title.trim()) {
      setError("Ponle un título a tu tier list.");
      return;
    }
    if (!placedIds.size) {
      setError("Coloca al menos un juego en algún tier antes de publicar.");
      return;
    }
    setPublishing(true);
    try {
      const payload = {
        title: title.trim(),
        author: author.trim() || "Anonymous",
        category: category.trim() || null,
        tiers: tiers.map((t) => ({
          label: t.label,
          color: t.color,
          gameIds: t.games.map((g) => g.id),
        })),
      };
      const res = await api.publishTierlist(payload);
      navigate(`/tierlist/${res.id}`);
    } catch (e) {
      setError(e.message);
      setPublishing(false);
    }
  };

  return (
    <div>
      <h1>Crear tier list</h1>

      <div className="editor-meta">
        <input
          placeholder="Título (p. ej. Mejores RPGs de la historia)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Tu nombre (opcional)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <input
          placeholder="Categoría (p. ej. RPG, Indie...)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}

      {/* Tiers */}
      <div className="tiers">
        {tiers.map((tier, i) => (
          <TierRow
            key={i}
            tier={tier}
            index={i}
            isFirst={i === 0}
            isLast={i === tiers.length - 1}
            onLabelChange={updateTierLabel}
            onMove={moveTier}
            onRemove={removeTier}
            onDrop={dropToTier}
            onDragOver={allowDrop}
            onTileDragStart={handleDragStart}
            onTileDragEnd={handleDragEnd}
            draggingId={draggingId}
          />
        ))}
      </div>

      <div className="toolbar" style={{ marginTop: 12 }}>
        <button className="secondary" onClick={addTier}>
          + Añadir tier
        </button>
        <div className="spacer" />
        <button onClick={publish} disabled={publishing}>
          {publishing ? "Publicando..." : "Publicar tier list"}
        </button>
      </div>

      {/* Pool */}
      <div
        className="pool"
        onDrop={dropToPool}
        onDragOver={allowDrop}
      >
        <div className="pool-header">
          <strong>Catálogo de juegos</strong>
          <div className="spacer" />
          <input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadGames()}
          />
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
          >
            <option value="">Todos los géneros</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button className="secondary" onClick={loadGames}>
            Buscar
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando juegos...</div>
        ) : (
          <div className="pool-grid">
            {pool
              .filter((g) => !placedIds.has(g.id))
              .map((game) => (
                <GameTile
                  key={game.id}
                  game={game}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  dragging={draggingId === game.id}
                />
              ))}
            {pool.filter((g) => !placedIds.has(g.id)).length === 0 && (
              <p className="muted">No hay juegos. Prueba otra búsqueda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TierRow({
  tier,
  index,
  isFirst,
  isLast,
  onLabelChange,
  onMove,
  onRemove,
  onDrop,
  onDragOver,
  onTileDragStart,
  onTileDragEnd,
  draggingId,
}) {
  const [over, setOver] = useState(false);
  return (
    <div className="tier-row">
      <div className="tier-label" style={{ background: tier.color }}>
        <input
          value={tier.label}
          onChange={(e) => onLabelChange(index, e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "#1a1d24",
            fontWeight: 800,
            textAlign: "center",
            width: "100%",
            fontSize: "1.1rem",
          }}
        />
      </div>
      <div
        className={`tier-drop${over ? " dragover" : ""}`}
        onDrop={(e) => {
          setOver(false);
          onDrop(e, index);
        }}
        onDragOver={(e) => {
          onDragOver(e);
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
      >
        {tier.games.map((game) => (
          <GameTile
            key={game.id}
            game={game}
            onDragStart={onTileDragStart}
            onDragEnd={onTileDragEnd}
            dragging={draggingId === game.id}
          />
        ))}
      </div>
      <div className="tier-actions">
        <button onClick={() => onMove(index, -1)} disabled={isFirst} title="Subir">
          ▲
        </button>
        <button onClick={() => onMove(index, 1)} disabled={isLast} title="Bajar">
          ▼
        </button>
        <button onClick={() => onRemove(index)} title="Eliminar tier">
          ✕
        </button>
      </div>
    </div>
  );
}
