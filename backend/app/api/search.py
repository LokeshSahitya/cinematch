"""
Search API Router
Full-text search across movie titles and metadata.
"""

from fastapi import APIRouter, Query, Request
from typing import Optional

router = APIRouter()


def get_engine(request: Request):
    return request.app.state.engine


@router.get("/")
async def search_movies(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
    top_n: int = Query(20, ge=1, le=100),
    genre: Optional[str] = None,
):
    """
    Search movies by title.
    Optionally filter results by genre.
    """
    engine = get_engine(request)
    results = engine.search_movies(q, top_n=top_n * 2)  # fetch extra for genre filtering

    if genre:
        results = [
            r for r in results
            if genre.lower() in [g.lower() for g in r.get("genres", [])]
        ]

    results = results[:top_n]
    return {
        "query": q,
        "genre_filter": genre,
        "results": results,
        "count": len(results),
    }


@router.get("/autocomplete")
async def autocomplete(
    request: Request,
    q: str = Query(..., min_length=1),
    limit: int = Query(8, ge=1, le=20),
):
    """Fast title autocomplete for search bar."""
    engine = get_engine(request)
    q_lower = q.lower()
    df = engine.movies_df

    # Prioritize titles that start with query
    starts_with = df[df["title"].str.lower().str.startswith(q_lower, na=False)]
    contains = df[
        df["title"].str.lower().str.contains(q_lower, na=False) &
        ~df["title"].str.lower().str.startswith(q_lower, na=False)
    ]

    combined = engine._format_movie_list(
        starts_with.head(limit).append(contains) if len(starts_with) < limit
        else starts_with.head(limit)
    )[:limit]

    return {
        "query": q,
        "suggestions": [{"movieId": m["movieId"], "title": m["title"], "year": m["year"]} for m in combined],
    }
