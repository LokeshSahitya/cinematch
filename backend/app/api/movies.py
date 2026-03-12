"""
Movies API Router
Endpoints for browsing, fetching, and filtering movies.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional

router = APIRouter()


def get_engine(request: Request):
    return request.app.state.engine


@router.get("/")
async def list_movies(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    genre: Optional[str] = None,
    sort_by: str = Query("rating", enum=["rating", "title", "year"]),
):
    """List all movies with pagination and filtering."""
    engine = get_engine(request)
    df = engine.movies_df.copy()

    # Genre filter
    if genre:
        df = df[df["genres"].apply(
            lambda g: genre.lower() in [x.lower() for x in (g if isinstance(g, list) else str(g).split("|"))]
        )]

    # Sort
    if sort_by == "rating" and "vote_average" in df.columns:
        df = df.sort_values("vote_average", ascending=False)
    elif sort_by == "title":
        df = df.sort_values("title")

    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end]

    movies = engine._format_movie_list(page_df)
    return {
        "movies": movies,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/trending")
async def get_trending(request: Request, top_n: int = Query(20, ge=1, le=100)):
    """Get trending/top movies using weighted rating formula."""
    engine = get_engine(request)
    movies = engine.get_trending(top_n)
    return {"movies": movies, "count": len(movies)}


@router.get("/top-rated")
async def get_top_rated(
    request: Request,
    genre: Optional[str] = None,
    top_n: int = Query(20, ge=1, le=100),
):
    """Get top-rated movies, optionally filtered by genre."""
    engine = get_engine(request)
    movies = engine.get_top_rated(genre=genre, top_n=top_n)
    return {"movies": movies, "count": len(movies)}


@router.get("/genres")
async def get_genres(request: Request):
    """Get all available genres."""
    engine = get_engine(request)
    genres = engine.get_genres()
    return {"genres": genres}


@router.get("/{movie_id}")
async def get_movie(request: Request, movie_id: int):
    """Get full details for a single movie."""
    engine = get_engine(request)
    movie = engine.get_movie_by_id(movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found")
    return movie


@router.get("/{movie_id}/similar")
async def get_similar(
    request: Request,
    movie_id: int,
    top_n: int = Query(10, ge=1, le=50),
):
    """Get content-similar movies (quick endpoint)."""
    engine = get_engine(request)
    movie = engine.get_movie_by_id(movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found")
    recs = engine.recommend_content(movie_id, top_n)
    return {"movie": movie, "similar": recs, "count": len(recs)}
