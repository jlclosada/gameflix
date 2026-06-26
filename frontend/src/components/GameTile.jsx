// A draggable game cover tile. Used in the pool and inside tiers.
export default function GameTile({ game, onDragStart, onDragEnd, dragging }) {
  return (
    <div
      className={`game-tile${dragging ? " dragging" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, game)}
      onDragEnd={onDragEnd}
      title={game.name}
    >
      {game.image_url ? (
        <img src={game.image_url} alt={game.name} loading="lazy" />
      ) : (
        <span className="tile-name">{game.name}</span>
      )}
      <span className="tile-name">{game.name}</span>
    </div>
  );
}
