"""
Hybrid Recommendation Engine
Orchestrates Content-Based + Collaborative Filtering models.

Hybrid Strategy: Weighted Score Fusion
  final_score = α × content_score + β × collab_score
  
  Default weights: α=0.4, β=0.6
  - Collaborative gets higher weight as it captures user preferences
  - Content fills in for cold-start / new movies

Cold Start Handling:
  - New user (no ratings): Fall back to content-based only
  - New movie (no ratings): Fall back to content-based only
  - New user + genre preferences: Genre-based content recommendations
"""

import numpy as np
import pandas as pd
import logging
from typing import Optional

from app.ml.content_model import ContentBasedModel
from app.ml.collab_model import CollaborativeModel
from app.ml.preprocessor import load_movielens, load_tmdb, merge_datasets, build_content_features

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """
    Main recommendation engine orchestrating all ML models.
    Loaded once at application startup and kept in memory.
    """

    def __init__(self, content_weight: float = 0.4, collab_weight: float = 0.6):
        self.content_weight = content_weight
        self.collab_weight = collab_weight

        self.content_model = ContentBasedModel()
        self.collab_model = CollaborativeModel(n_factors=100, n_epochs=20)

        self.movies_df: Optional[pd.DataFrame] = None
        self.ratings_df: Optional[pd.DataFrame] = None
        self.is_loaded = False
        self.total_movies = 0

    def load(self) -> None:
        """Load datasets and train both models. Called once at startup."""
        logger.info("Loading datasets...")
        movies_ml, ratings_df = load_movielens()
        tmdb_df = load_tmdb()

        self.movies_df = merge_datasets(movies_ml, tmdb_df)
        self.ratings_df = ratings_df

        # Ensure soup column for content model
        if "soup" not in self.movies_df.columns:
            self.movies_df = build_content_features(self.movies_df)

        logger.info("Training Content-Based model...")
        self.content_model.fit(self.movies_df)

        logger.info("Training Collaborative Filtering model...")
        self.collab_model.fit(ratings_df)

        self.total_movies = len(self.movies_df)
        self.is_loaded = True
        logger.info(f"✅ Engine ready. {self.total_movies} movies loaded.")

    # ─────────────────────────────────────────────
    # CONTENT-BASED RECOMMENDATIONS
    # ─────────────────────────────────────────────

    def recommend_content(self, movie_id: int, top_n: int = 10) -> list[dict]:
        """Get content-based recommendations for a movie."""
        recs = self.content_model.recommend(movie_id, top_n)
        return self._enrich_recommendations(recs)

    # ─────────────────────────────────────────────
    # COLLABORATIVE RECOMMENDATIONS
    # ─────────────────────────────────────────────

    def recommend_collaborative(self, user_id: int, top_n: int = 10) -> list[dict]:
        """Get collaborative filtering recommendations for a user."""
        all_movie_ids = self.movies_df["movieId"].tolist()
        recs = self.collab_model.recommend(user_id, all_movie_ids, top_n)
        return self._enrich_recommendations(recs)

    # ─────────────────────────────────────────────
    # HYBRID RECOMMENDATIONS
    # ─────────────────────────────────────────────

    def recommend_hybrid(
        self,
        movie_id: int,
        user_id: Optional[int] = None,
        top_n: int = 10,
        content_weight: Optional[float] = None,
        collab_weight: Optional[float] = None,
    ) -> list[dict]:
        """
        Get hybrid recommendations combining both models.
        
        If user_id is None, falls back to content-based only.
        Dynamically adjusts weights based on data availability.
        """
        cw = content_weight or self.content_weight
        aw = collab_weight or self.collab_weight

        # Get content scores
        content_recs = self.content_model.recommend(movie_id, top_n=50)
        content_scores = {r["movieId"]: r["score"] for r in content_recs}

        # Get collaborative scores if user provided
        collab_scores = {}
        if user_id is not None:
            all_movie_ids = self.movies_df["movieId"].tolist()
            collab_recs = self.collab_model.recommend(user_id, all_movie_ids, top_n=50)
            collab_scores = {r["movieId"]: r["score"] for r in collab_recs}

        # If no collaborative data, use content only
        if not collab_scores:
            cw, aw = 1.0, 0.0

        # Candidate pool: union of both recommendation sets
        all_candidates = set(content_scores.keys()) | set(collab_scores.keys())
        all_candidates.discard(movie_id)  # remove seed movie

        scored = []
        for mid in all_candidates:
            c_score = content_scores.get(mid, 0.0)
            a_score = collab_scores.get(mid, 0.0)
            hybrid_score = cw * c_score + aw * a_score
            scored.append({
                "movieId": mid,
                "score": round(hybrid_score, 4),
                "content_score": round(c_score, 4),
                "collab_score": round(a_score, 4),
                "model": "hybrid",
            })

        # Sort by hybrid score
        scored.sort(key=lambda x: x["score"], reverse=True)
        top_recs = scored[:top_n]

        for rank, rec in enumerate(top_recs, 1):
            rec["rank"] = rank

        return self._enrich_recommendations(top_recs)

    # ─────────────────────────────────────────────
    # TRENDING / TOP RATED
    # ─────────────────────────────────────────────

    def get_trending(self, top_n: int = 20) -> list[dict]:
        """
        Get trending movies using weighted rating formula (IMDB-style):
        WR = (v / (v + m)) * R + (m / (v + m)) * C
        where:
          R = movie's mean rating
          v = number of votes
          m = minimum votes required (90th percentile)
          C = global mean rating
        """
        df = self.movies_df.copy()

        if "vote_count" in df.columns and "vote_average" in df.columns:
            C = df["vote_average"].mean()
            m = df["vote_count"].quantile(0.70)
            df = df[df["vote_count"] >= m / 5]  # filter very low vote movies
            df["weighted_rating"] = (
                (df["vote_count"] / (df["vote_count"] + m)) * df["vote_average"] +
                (m / (df["vote_count"] + m)) * C
            )
        else:
            # Use ratings data
            if self.ratings_df is not None:
                movie_stats = self.ratings_df.groupby("movieId")["rating"].agg(["mean", "count"]).reset_index()
                movie_stats.columns = ["movieId", "mean_rating", "vote_count"]
                C = movie_stats["mean_rating"].mean()
                m = movie_stats["vote_count"].quantile(0.70)
                movie_stats["weighted_rating"] = (
                    (movie_stats["vote_count"] / (movie_stats["vote_count"] + m)) * movie_stats["mean_rating"] +
                    (m / (movie_stats["vote_count"] + m)) * C
                )
                df = df.merge(movie_stats[["movieId", "weighted_rating"]], on="movieId", how="left")
                df["weighted_rating"] = df["weighted_rating"].fillna(C * 0.8)
            else:
                df["weighted_rating"] = np.random.uniform(6, 9, len(df))

        top = df.nlargest(top_n, "weighted_rating")
        return self._format_movie_list(top)

    def get_top_rated(self, genre: Optional[str] = None, top_n: int = 20) -> list[dict]:
        """Get top rated movies, optionally filtered by genre."""
        df = self.movies_df.copy()

        if genre:
            df = df[df["genres"].apply(
                lambda g: genre.lower() in [x.lower() for x in (g if isinstance(g, list) else str(g).split("|"))]
            )]

        if "vote_average" in df.columns:
            top = df.nlargest(top_n, "vote_average")
        else:
            top = df.head(top_n)

        return self._format_movie_list(top)

    def get_movie_by_id(self, movie_id: int) -> Optional[dict]:
        """Get full movie details by ID."""
        row = self.movies_df[self.movies_df["movieId"] == movie_id]
        if row.empty:
            return None
        return self._format_single_movie(row.iloc[0])

    def search_movies(self, query: str, top_n: int = 20) -> list[dict]:
        """Search movies by title."""
        query_lower = query.lower()
        mask = self.movies_df["title"].str.lower().str.contains(query_lower, na=False)
        results = self.movies_df[mask].head(top_n)
        return self._format_movie_list(results)

    def get_genres(self) -> list[str]:
        """Get all available genres."""
        genres = set()
        for g_val in self.movies_df["genres"]:
            if isinstance(g_val, list):
                genres.update(g_val)
            elif isinstance(g_val, str):
                genres.update(g_val.split("|"))
        return sorted([g for g in genres if g and g != "(no genres listed)"])

    # ─────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────

    def _enrich_recommendations(self, recs: list[dict]) -> list[dict]:
        """Add movie metadata to recommendation results."""
        enriched = []
        for rec in recs:
            movie_data = self.get_movie_by_id(rec["movieId"])
            if movie_data:
                enriched.append({**rec, **movie_data})
        return enriched

    def _format_movie_list(self, df: pd.DataFrame) -> list[dict]:
        return [self._format_single_movie(row) for _, row in df.iterrows()]

    def _format_single_movie(self, row: pd.Series) -> dict:
        genres = row.get("genres", [])
        if isinstance(genres, str):
            genres = genres.split("|")

        cast = row.get("cast", [])
        if not isinstance(cast, list):
            cast = []

        crew = row.get("crew", [])
        if not isinstance(crew, list):
            crew = []

        keywords = row.get("keywords", [])
        if not isinstance(keywords, list):
            keywords = []

        title = str(row.get("title", ""))
        # Extract year from title if release_date not available
        year = str(row.get("release_date", ""))[:4] if pd.notna(row.get("release_date")) else ""
        if not year:
            import re
            m = re.search(r"\((\d{4})\)", title)
            year = m.group(1) if m else ""

        return {
            "movieId": int(row["movieId"]),
            "title": title,
            "year": year,
            "genres": genres,
            "overview": str(row.get("overview", "")) if pd.notna(row.get("overview")) else "",
            "rating": round(float(row.get("vote_average", 0) or 0), 1),
            "voteCount": int(row.get("vote_count", 0) or 0),
            "cast": cast[:5],
            "director": crew[:1],
            "keywords": keywords[:10],
            "posterPath": row.get("poster_path") if pd.notna(row.get("poster_path", None)) else None,
            "runtime": int(row.get("runtime", 0) or 0),
            "revenue": int(row.get("revenue", 0) or 0),
            "budget": int(row.get("budget", 0) or 0),
            "tagline": str(row.get("tagline", "")) if pd.notna(row.get("tagline", None)) else "",
        }
