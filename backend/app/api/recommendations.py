"""
Recommendations API Router
Endpoints for all three recommendation strategies.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


def get_engine(request: Request):
    return request.app.state.engine


# ─────────────────────────────────────────────
# CONTENT-BASED
# ─────────────────────────────────────────────

@router.get("/content/{movie_id}")
async def content_recommendations(
    request: Request,
    movie_id: int,
    top_n: int = Query(10, ge=1, le=50),
):
    """
    Content-based recommendations for a movie.
    Uses TF-IDF + Cosine Similarity on genres, cast, director, overview.
    """
    engine = get_engine(request)
    movie = engine.get_movie_by_id(movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found")

    recs = engine.recommend_content(movie_id, top_n)
    return {
        "seed_movie": movie,
        "recommendations": recs,
        "model": "content_based",
        "method": "TF-IDF + Cosine Similarity",
        "count": len(recs),
    }


# ─────────────────────────────────────────────
# COLLABORATIVE FILTERING
# ─────────────────────────────────────────────

@router.get("/collab/{user_id}")
async def collaborative_recommendations(
    request: Request,
    user_id: int,
    top_n: int = Query(10, ge=1, le=50),
):
    """
    Collaborative filtering recommendations for a user.
    Uses SVD matrix factorization on user-item rating matrix.
    """
    engine = get_engine(request)
    recs = engine.recommend_collaborative(user_id, top_n)

    if not recs:
        raise HTTPException(
            status_code=404,
            detail=f"No recommendations found for user {user_id}. User may not exist in training data.",
        )

    history = engine.collab_model.get_user_history(user_id)[:5]
    return {
        "user_id": user_id,
        "recommendations": recs,
        "recent_history": history,
        "model": "collaborative_filtering",
        "method": "SVD Matrix Factorization",
        "count": len(recs),
    }


# ─────────────────────────────────────────────
# HYBRID
# ─────────────────────────────────────────────

@router.get("/hybrid/{movie_id}")
async def hybrid_recommendations(
    request: Request,
    movie_id: int,
    user_id: Optional[int] = None,
    top_n: int = Query(10, ge=1, le=50),
    content_weight: float = Query(0.4, ge=0.0, le=1.0),
    collab_weight: float = Query(0.6, ge=0.0, le=1.0),
):
    """
    Hybrid recommendations combining content-based and collaborative filtering.
    
    - content_weight: Weight for content-based scores (default 0.4)
    - collab_weight: Weight for collaborative scores (default 0.6)
    - user_id: Optional. If provided, personalizes with collaborative filtering.
    """
    engine = get_engine(request)
    movie = engine.get_movie_by_id(movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail=f"Movie {movie_id} not found")

    recs = engine.recommend_hybrid(
        movie_id=movie_id,
        user_id=user_id,
        top_n=top_n,
        content_weight=content_weight,
        collab_weight=collab_weight,
    )

    mode = "personalized" if user_id else "content_only"
    return {
        "seed_movie": movie,
        "user_id": user_id,
        "recommendations": recs,
        "model": "hybrid",
        "mode": mode,
        "weights": {
            "content": content_weight if user_id else 1.0,
            "collaborative": collab_weight if user_id else 0.0,
        },
        "method": "Weighted Score Fusion (TF-IDF + SVD)",
        "count": len(recs),
    }


# ─────────────────────────────────────────────
# GENRE-BASED (cold start)
# ─────────────────────────────────────────────

class GenreRequest(BaseModel):
    genres: list[str]
    top_n: int = 10


@router.post("/by-genre")
async def recommend_by_genre(request: Request, body: GenreRequest):
    """
    Recommend movies by genre preferences (cold-start users).
    No user history required.
    """
    engine = get_engine(request)
    recs = engine.content_model.get_genre_recommendations(
        genres=body.genres,
        top_n=body.top_n,
        movies_df=engine.movies_df,
    )
    enriched = engine._enrich_recommendations(recs)
    return {
        "genres": body.genres,
        "recommendations": enriched,
        "model": "genre_content",
        "count": len(enriched),
    }


# ─────────────────────────────────────────────
# MODEL INFO
# ─────────────────────────────────────────────

@router.get("/info/models")
async def model_info(request: Request):
    """Get information about loaded ML models."""
    engine = get_engine(request)
    return {
        "content_model": {
            "type": "TF-IDF + Cosine Similarity",
            "fitted": engine.content_model.is_fitted,
            "movies_indexed": len(engine.content_model.movie_indices),
            "vocab_size": len(engine.content_model.vectorizer.vocabulary_) if engine.content_model.is_fitted else 0,
        },
        "collab_model": {
            "type": "SVD Matrix Factorization",
            "fitted": engine.collab_model.is_fitted,
            "n_factors": engine.collab_model.n_factors,
            "method": "surprise" if engine.collab_model.use_surprise else "custom_numpy",
            "total_ratings": len(engine.ratings_df) if engine.ratings_df is not None else 0,
        },
        "hybrid": {
            "content_weight": engine.content_weight,
            "collab_weight": engine.collab_weight,
        },
    }
