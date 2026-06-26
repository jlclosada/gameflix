"""
Steam game cover/image downloader (no API key / no signup required).

Builds a catalog of popular video games using only PUBLIC Steam endpoints
that require no registration and have valid TLS certificates:

  * Steam Charts most-played
        https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/
  * Steam Store featured categories (top sellers, new releases)
        https://store.steampowered.com/api/featuredcategories
  * Steam Store appdetails (genres, release date, platforms, metacritic, image)
        https://store.steampowered.com/api/appdetails
  * Steam Store appreviews (review-based rating)
        https://store.steampowered.com/appreviews/{appid}

Vertical "library" cover art is pulled straight from the Steam CDN, which is
ideal for tier lists.

The output is compatible with the backend seeder (data/games.json):
    id, slug, name, released, background_image, rating, metacritic,
    genres, platforms

Usage examples:
    python steam_downloader.py --limit 150
    python steam_downloader.py --limit 300 --sources mostplayed,topsellers,newreleases
    python steam_downloader.py --limit 100 --no-reviews
    python steam_downloader.py --limit 100 --no-images
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import requests

# Some Python builds ship a strict OpenSSL that rejects otherwise-valid Steam
# certificates ("Missing Authority Key Identifier"). Delegating verification to
# the operating system trust store fixes this without disabling security.
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

MOST_PLAYED_URL = (
    "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/"
)
FEATURED_URL = "https://store.steampowered.com/api/featuredcategories"
STORE_DETAILS_URL = "https://store.steampowered.com/api/appdetails"
STORE_SEARCH_URL = "https://store.steampowered.com/search/results/"
APPREVIEWS_URL = "https://store.steampowered.com/appreviews"
CDN_BASE = "https://cdn.cloudflare.steamstatic.com/steam/apps"

DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "data"
REQUEST_TIMEOUT = 30
MAX_RETRIES = 4
RETRY_BACKOFF = 2.0  # seconds, exponential
STORE_DELAY = 1.0  # seconds between Steam store calls (rate-limit friendly)


class DownloadError(Exception):
    """Raised when a remote resource cannot be fetched."""


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "game"


def get_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": "image-getter-downloader/2.0"})
    return session


def request_json(
    session: requests.Session, url: str, params: dict[str, Any] | None = None
) -> Any:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
            if response.status_code == 429:
                wait = float(
                    response.headers.get("Retry-After", RETRY_BACKOFF * (attempt + 1))
                )
                print(f"  Rate limited (429). Waiting {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            wait = RETRY_BACKOFF * (2**attempt)
            print(f"  Request failed ({exc}). Retry in {wait:.0f}s...", file=sys.stderr)
            time.sleep(wait)
    raise DownloadError(f"Failed to fetch {url} after {MAX_RETRIES} attempts: {last_error}")


def fetch_most_played(session: requests.Session) -> list[int]:
    print("Fetching Steam most-played chart...")
    payload = request_json(session, MOST_PLAYED_URL, {"format": "json"})
    ranks = (payload.get("response") or {}).get("ranks") or []
    return [int(r["appid"]) for r in ranks if r.get("appid")]


def fetch_featured(session: requests.Session, keys: list[str]) -> list[int]:
    """Fetch app ids from Steam featured categories (top sellers, new releases...)."""
    print(f"Fetching Steam featured categories: {', '.join(keys)}...")
    payload = request_json(session, FEATURED_URL, {"l": "english"})
    ids: list[int] = []
    for key in keys:
        category = payload.get(key) or {}
        for item in category.get("items", []):
            appid = item.get("id")
            if isinstance(appid, int):
                ids.append(appid)
    return ids


SOURCE_FETCHERS = {
    "mostplayed": lambda s: fetch_most_played(s),
    "topsellers": lambda s: fetch_featured(s, ["top_sellers"]),
    "newreleases": lambda s: fetch_featured(s, ["new_releases"]),
    "specials": lambda s: fetch_featured(s, ["specials"]),
}


def collect_appids(session: requests.Session, sources: list[str]) -> list[int]:
    """Collect app ids from the requested sources, de-duplicated in order."""
    seen: set[int] = set()
    ordered: list[int] = []
    for source in sources:
        fetcher = SOURCE_FETCHERS.get(source)
        if not fetcher:
            print(f"  Unknown source '{source}', skipping.", file=sys.stderr)
            continue
        try:
            for appid in fetcher(session):
                if appid not in seen:
                    seen.add(appid)
                    ordered.append(appid)
        except DownloadError as exc:
            print(f"  Source '{source}' failed: {exc}", file=sys.stderr)
    return ordered


def fetch_store_search(
    session: requests.Session,
    max_games: int,
    sort_by: str = "",
    tags: str = "",
    assign_genres: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Bulk-fetch thousands of games from the Steam store search endpoint.

    Uses the public "infinite scroll" JSON results, filtered to category Games
    (``category1=998``). No per-game API calls are made, so this is fast and not
    affected by the appdetails rate limit. Cover art comes straight from the
    Steam CDN. When ``tags`` (a Steam tag id) is provided, results are filtered
    to that tag and ``assign_genres`` is stored on each game.
    """
    games: list[dict[str, Any]] = []
    seen: set[int] = set()
    start = 0
    count = 100
    total: int | None = None

    while len(games) < max_games:
        params: dict[str, Any] = {
            "query": "",
            "start": start,
            "count": count,
            "infinite": 1,
            "category1": 998,  # 998 = Games (excludes DLC, soundtracks, etc.)
            "supportedlang": "english",
            "ndl": 1,
        }
        if sort_by:
            params["sort_by"] = sort_by
        if tags:
            params["tags"] = tags

        try:
            payload = request_json(session, STORE_SEARCH_URL, params)
        except DownloadError as exc:
            print(f"  Search page start={start} failed: {exc}", file=sys.stderr)
            break

        if total is None:
            total = int(payload.get("total_count") or 0)
            print(f"Steam search reports {total} games available.")

        results_html = payload.get("results_html") or ""
        rows = re.split(r"(?=<a\b)", results_html)
        added = 0
        for row in rows:
            if "search_result_row" not in row:
                continue
            appid_match = re.search(r'data-ds-appid="(\d+)', row)
            title_match = re.search(r'<span class="title">([^<]+)</span>', row)
            if not appid_match or not title_match:
                continue
            appid = int(appid_match.group(1))
            if appid in seen:
                continue
            seen.add(appid)

            name = html.unescape(title_match.group(1)).strip()
            if not name:
                continue

            released = None
            rel_match = re.search(r'search_released[^"]*">([^<]*)</div>', row)
            if rel_match and rel_match.group(1).strip():
                released = html.unescape(rel_match.group(1)).strip()

            games.append(
                {
                    "id": appid,
                    "slug": slugify(name),
                    "name": name,
                    "released": released,
                    "background_image": f"{CDN_BASE}/{appid}/library_600x900_2x.jpg",
                    "rating": None,
                    "metacritic": None,
                    "genres": list(assign_genres) if assign_genres else [],
                    "platforms": [],
                    # Lower = more popular. Results arrive most-reviewed first,
                    # so the running index is a good popularity proxy.
                    "popularity": len(games),
                }
            )
            added += 1
            if len(games) >= max_games:
                break

        print(f"  start={start}: +{added} games (kept {len(games)})")
        start += count
        if added == 0:
            break
        if total and start >= total:
            break
        time.sleep(0.4)

    return games


# Display genre name -> Steam store tag id. Used by --by-category to build a
# catalog where every game is tagged with its category (for the editor
# templates). Ordered by popularity for tier lists.
CATEGORY_TAGS: dict[str, int] = {
    "Action": 19,
    "Adventure": 21,
    "RPG": 122,
    "Strategy": 9,
    "Simulation": 599,
    "Indie": 492,
    "Casual": 597,
    "Sports": 701,
    "Racing": 699,
    "Massively Multiplayer": 128,
    "Horror": 1667,
    "Shooter": 1774,
    "Puzzle": 1664,
    "Open World": 1695,
    "Fighting": 1743,
}


def fetch_by_category(
    session: requests.Session,
    per_category: int,
) -> list[dict[str, Any]]:
    """Build a catalog tagged by genre, fetching the most-reviewed games for
    each category tag. A game may appear in several categories; genres are
    merged so it keeps all matching tags."""
    by_id: dict[int, dict[str, Any]] = {}
    for genre, tag_id in CATEGORY_TAGS.items():
        print(f"\n=== Category '{genre}' (tag {tag_id}) ===")
        rows = fetch_store_search(
            session,
            per_category,
            sort_by="Reviews_DESC",
            tags=str(tag_id),
            assign_genres=[genre],
        )
        for g in rows:
            existing = by_id.get(g["id"])
            if existing:
                for gn in g["genres"]:
                    if gn not in existing["genres"]:
                        existing["genres"].append(gn)
                # Keep the best (lowest) popularity rank across categories.
                if g.get("popularity", 1_000_000) < existing.get("popularity", 1_000_000):
                    existing["popularity"] = g["popularity"]
            else:
                by_id[g["id"]] = g
    games = list(by_id.values())
    # Most popular first across the whole catalog.
    games.sort(key=lambda g: g.get("popularity", 1_000_000))
    for i, g in enumerate(games):
        g["popularity"] = i
    return games


def fetch_store_details(
    session: requests.Session, appid: int
) -> dict[str, Any] | None:
    """Fetch genres, release date, platforms and cover from the Steam store."""
    try:
        payload = request_json(
            session, STORE_DETAILS_URL, {"appids": appid, "l": "english"}
        )
    except DownloadError:
        return None

    entry = payload.get(str(appid)) if isinstance(payload, dict) else None
    if not entry or not entry.get("success"):
        return None
    data = entry.get("data") or {}
    if data.get("type") != "game":
        return None

    platform_names = {"windows": "PC", "mac": "macOS", "linux": "Linux"}
    platforms = [
        platform_names.get(name, name)
        for name, available in (data.get("platforms") or {}).items()
        if available
    ]

    return {
        "name": data.get("name"),
        "released": (data.get("release_date") or {}).get("date") or None,
        "genres": [
            g.get("description") for g in data.get("genres", []) if g.get("description")
        ],
        "platforms": platforms,
        "metacritic": (data.get("metacritic") or {}).get("score"),
        "header_image": data.get("header_image"),
    }


def fetch_rating(session: requests.Session, appid: int) -> float | None:
    """Compute a 0-5 rating from the Steam review summary."""
    try:
        payload = request_json(
            session,
            f"{APPREVIEWS_URL}/{appid}",
            {"json": 1, "language": "all", "num_per_page": 0, "purchase_type": "all"},
        )
    except DownloadError:
        return None
    summary = payload.get("query_summary") or {}
    positive = int(summary.get("total_positive") or 0)
    negative = int(summary.get("total_negative") or 0)
    total = positive + negative
    if total < 10:
        return None
    return round((positive / total) * 5, 2)


def cover_urls(appid: int, header_image: str | None) -> list[str]:
    """Candidate cover image URLs in priority order (vertical first)."""
    urls = [
        f"{CDN_BASE}/{appid}/library_600x900_2x.jpg",
        f"{CDN_BASE}/{appid}/library_600x900.jpg",
    ]
    if header_image:
        urls.append(header_image)
    return urls


def build_games(
    session: requests.Session,
    appids: list[int],
    limit: int,
    with_reviews: bool,
) -> list[dict[str, Any]]:
    """Enrich app ids with Steam store details (and optionally ratings)."""
    games: list[dict[str, Any]] = []

    for appid in appids:
        if len(games) >= limit:
            break

        print(f"[{len(games) + 1}/{limit}] Fetching details for app {appid}...")
        details = fetch_store_details(session, appid)
        time.sleep(STORE_DELAY)
        if not details:
            continue

        name = details["name"]
        if not name:
            continue

        rating = None
        if with_reviews:
            rating = fetch_rating(session, appid)
            time.sleep(STORE_DELAY)

        candidates = cover_urls(appid, details["header_image"])
        games.append(
            {
                "id": appid,
                "slug": slugify(name),
                "name": name,
                "released": details["released"],
                "background_image": candidates[0],
                "_cover_candidates": candidates,
                "rating": rating,
                "metacritic": details["metacritic"],
                "genres": details["genres"],
                "platforms": details["platforms"],
            }
        )

    return games


def download_one(
    session: requests.Session, game: dict[str, Any], images_dir: Path
) -> tuple[str, bool, str | None]:
    name = game.get("name") or "unknown"
    candidates: list[str] = game.get("_cover_candidates") or []
    if not candidates:
        return name, False, None

    filename = f"{game['id']}-{slugify(name)}.jpg"
    local_path = images_dir / filename

    if local_path.exists() and local_path.stat().st_size > 0:
        return name, True, str(local_path.relative_to(images_dir.parent))

    for url in candidates:
        try:
            response = session.get(url, timeout=REQUEST_TIMEOUT)
            if response.status_code == 200 and response.content:
                local_path.write_bytes(response.content)
                game["background_image"] = url
                return name, True, str(local_path.relative_to(images_dir.parent))
        except requests.RequestException:
            continue
    return name, False, None


def download_images(
    session: requests.Session,
    games: list[dict[str, Any]],
    images_dir: Path,
    workers: int,
) -> None:
    images_dir.mkdir(parents=True, exist_ok=True)
    by_id = {g["id"]: g for g in games}

    print(f"\nDownloading {len(games)} covers with {workers} workers...")
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(download_one, session, game, images_dir): game["id"]
            for game in games
        }
        for future in as_completed(futures):
            game_id = futures[future]
            name, ok, local_path = future.result()
            by_id[game_id]["image_path"] = local_path
            by_id[game_id]["image_downloaded"] = ok
            done += 1
            status = "OK " if ok else "FAIL"
            print(f"  [{done}/{len(games)}] {status} {name}")


def save_manifest(games: list[dict[str, Any]], manifest_path: Path) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    cleaned = [{k: v for k, v in g.items() if not k.startswith("_")} for g in games]
    manifest_path.write_text(
        json.dumps(cleaned, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"\nManifest with {len(cleaned)} games saved to {manifest_path}")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download video game covers from Steam (no API key needed)."
    )
    parser.add_argument(
        "--sources",
        default="mostplayed,topsellers,newreleases",
        help=(
            "Comma-separated app id sources: "
            "mostplayed, topsellers, newreleases, specials."
        ),
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=150,
        help="Maximum number of games to keep (enriched via the store).",
    )
    parser.add_argument(
        "--bulk",
        action="store_true",
        help=(
            "Fast mode: pull thousands of games from the Steam store search "
            "(no per-game enrichment). Ideal for a huge catalog. Genres and "
            "metacritic are left empty; covers come from the Steam CDN."
        ),
    )
    parser.add_argument(
        "--sort",
        default="",
        help=(
            "Bulk sort order: '' (relevance), 'Released_DESC', "
            "'Name_ASC', 'Reviews_DESC' (most reviewed)."
        ),
    )
    parser.add_argument(
        "--by-category",
        action="store_true",
        help=(
            "Build a catalog tagged by genre. Fetches the most-reviewed games "
            "for each category (Action, RPG, Strategy...). Use --limit as the "
            "number of games PER category. Every game keeps its genre tags, "
            "which powers the editor templates."
        ),
    )
    parser.add_argument(
        "--workers", type=int, default=8, help="Concurrent image downloads."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory for images and manifest.",
    )
    parser.add_argument(
        "--no-reviews",
        action="store_true",
        help="Skip the per-game review lookup (faster, no rating).",
    )
    parser.add_argument(
        "--no-images", action="store_true", help="Only fetch metadata, skip images."
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    session = get_session()
    output_dir: Path = args.output_dir
    images_dir = output_dir / "images"
    manifest_path = output_dir / "games.json"

    if args.by_category:
        print(
            f"By-category mode: fetching up to {args.limit} games per category..."
        )
        games = fetch_by_category(session, args.limit)
        print(f"\nCollected {len(games)} unique games across all categories.")
    elif args.bulk:
        print(f"Bulk mode: fetching up to {args.limit} games from Steam search...")
        games = fetch_store_search(session, args.limit, args.sort)
        print(f"\nCollected {len(games)} games from store search.")
    else:
        sources = [s.strip() for s in args.sources.split(",") if s.strip()]
        appids = collect_appids(session, sources)
        if not appids:
            print(
                "ERROR: could not collect any app ids from Steam.", file=sys.stderr
            )
            return 1
        print(f"\nCollected {len(appids)} candidate app ids.")

        games = build_games(session, appids, args.limit, not args.no_reviews)
        print(f"\nKept {len(games)} games with full details.")

    if not games:
        print(
            "No games to save. Try other options or a larger --limit.",
            file=sys.stderr,
        )
        return 1

    if not args.no_images:
        download_images(session, games, images_dir, args.workers)

    save_manifest(games, manifest_path)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
