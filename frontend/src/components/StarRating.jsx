import { useState } from "react";
import { Icon } from "./Icons.jsx";

// Star rating display / input. When `onRate` is provided it is interactive.
export default function StarRating({
  value = 0,
  onRate,
  size = 22,
  count = 5,
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  const interactive = typeof onRate === "function";

  return (
    <div
      className={`stars${interactive ? " interactive" : ""}`}
      role={interactive ? "radiogroup" : undefined}
    >
      {Array.from({ length: count }).map((_, i) => {
        const n = i + 1;
        const filled = n <= active;
        return (
          <button
            key={n}
            type="button"
            className={`star${filled ? " filled" : ""}`}
            style={{ width: size, height: size }}
            disabled={!interactive}
            onMouseEnter={interactive ? () => setHover(n) : undefined}
            onMouseLeave={interactive ? () => setHover(0) : undefined}
            onClick={interactive ? () => onRate(n) : undefined}
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          >
            <Icon.Star style={{ width: size, height: size }} />
          </button>
        );
      })}
    </div>
  );
}
