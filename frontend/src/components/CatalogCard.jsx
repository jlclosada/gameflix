// A rich catalog card used on the Games browse page. Shows the cover, the
// name (always visible), a rating badge and the first genres. Clicking it
// navigates to the game detail page.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icons.jsx";

function year(released) {
  if (!released) return null;
  const m = String(released).match(/\d{4}/);
  return m ? m[0] : null;
}

export default function CatalogCard({ game }) {
  const [broken, setBroken] = useState(false);
  const showImage = game.image_url && !broken;
  const rating =
    typeof game.rating === "number" ? Math.round(game.rating * 10) / 10 : null;
  const yr = year(game.released);
  const genres = (game.genres || []).slice(0, 2);

  return (
    <Link to={`/game/${game.id}`} className="catalog-card">
      <div className="cc-cover">
        {showImage ? (
          <img
            src={game.image_url}
            alt={game.name}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="cc-fallback">{game.name}</span>
        )}
        {rating != null && (
          <span className="cc-rating">
            <Icon.Star width={12} height={12} />
            {rating}
          </span>
        )}
        <span className="cc-overlay" />
      </div>
      <div className="cc-body">
        <span className="cc-name" title={game.name}>
          {game.name}
        </span>
        <div className="cc-meta">
          {yr && <span className="cc-year">{yr}</span>}
          {genres.map((g) => (
            <span key={g} className="cc-genre">
              {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
