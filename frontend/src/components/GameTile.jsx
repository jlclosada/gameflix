// A draggable game cover tile. Used in the pool and inside tiers.
// The full cover is shown (object-fit: contain) and the name only appears on hover.
import { useState } from "react";

export default function GameTile({
  game,
  onDragStart,
  onDragEnd,
  dragging,
  draggable = true,
  className = "",
}) {
  const [broken, setBroken] = useState(false);
  const showImage = game.image_url && !broken;
  return (
    <div
      className={`game-tile${className ? " " + className : ""}${dragging ? " dragging" : ""}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, game) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      title={game.name}
    >
      {showImage ? (
        <img
          src={game.image_url}
          alt={game.name}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="tile-name fallback">{game.name}</span>
      )}
      <span className="tile-name">{game.name}</span>
    </div>
  );
}
