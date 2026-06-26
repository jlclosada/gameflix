// A draggable game cover tile. Used in the pool and inside tiers.
// The full cover is shown (object-fit: contain) and the name only appears on hover.
export default function GameTile({
  game,
  onDragStart,
  onDragEnd,
  dragging,
  draggable = true,
  className = "",
}) {
  return (
    <div
      className={`game-tile${className ? " " + className : ""}${dragging ? " dragging" : ""}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, game) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      title={game.name}
    >
      {game.image_url ? (
        <img src={game.image_url} alt={game.name} loading="lazy" />
      ) : (
        <span className="tile-name" style={{ opacity: 1, transform: "none" }}>
          {game.name}
        </span>
      )}
      <span className="tile-name">{game.name}</span>
    </div>
  );
}
