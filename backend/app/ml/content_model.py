"""
Content-Based Filtering Model
Uses TF-IDF vectorization on movie metadata + Cosine Similarity.

Pipeline:
  1. Build 'soup' string: genres + keywords + cast + director + overview
  2. TF-IDF vectorize → sparse matrix
  3. Cosine similarity between all movie pairs
  4. On query: return top-N most similar movies
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


class ContentBasedModel:
    """
    TF-IDF + Cosine Similarity content-based recommender.
    
    Attributes:
        similarity_matrix: NxN cosine similarity matrix (float32)
        movie_indices: dict mapping movieId → matrix row index
        vectorizer: fitted TfidfVectorizer
    """

    def __init__(self):
        self.similarity_matrix: np.ndarray | None = None
        self.movie_indices: dict = {}
        self.idx_to_movieid: dict = {}
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=15000,
            ngram_range=(1, 2),
            min_df=2,
            sublinear_tf=True,  # Apply log normalization
        )
        self.is_fitted = False

    def fit(self, movies_df: pd.DataFrame) -> None:
        """
        Fit model on movie dataframe.
        
        Args:
            movies_df: DataFrame with columns [movieId, soup]
                       'soup' = concatenated feature string
        """
        logger.info("Fitting Content-Based model (TF-IDF + Cosine Similarity)...")

        df = movies_df.dropna(subset=["soup"]).reset_index(drop=True)
        df["soup"] = df["soup"].fillna("")

        # Build TF-IDF matrix: shape (n_movies, n_features)
        tfidf_matrix = self.vectorizer.fit_transform(df["soup"])
        logger.info(f"TF-IDF matrix shape: {tfidf_matrix.shape}")

        # Compute cosine similarity: shape (n_movies, n_movies)
        # Use float32 to reduce memory usage
        self.similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix).astype(np.float32)

        # Build index maps
        self.movie_indices = {row["movieId"]: idx for idx, row in df.iterrows()}
        self.idx_to_movieid = {idx: row["movieId"] for idx, row in df.iterrows()}

        self.is_fitted = True
        logger.info(f"Content model fitted. {len(self.movie_indices)} movies indexed.")

    def recommend(self, movie_id: int, top_n: int = 10) -> list[dict]:
        """
        Get content-based recommendations for a movie.
        
        Args:
            movie_id: Source movie ID
            top_n: Number of recommendations
            
        Returns:
            List of dicts: [{movieId, score, rank}]
        """
        if not self.is_fitted:
            raise RuntimeError("Model not fitted. Call fit() first.")

        if movie_id not in self.movie_indices:
            logger.warning(f"MovieId {movie_id} not in index.")
            return []

        idx = self.movie_indices[movie_id]
        sim_scores = self.similarity_matrix[idx]

        # Get top-N similar (excluding self)
        top_indices = np.argsort(sim_scores)[::-1][1 : top_n + 1]

        results = []
        for rank, i in enumerate(top_indices, 1):
            results.append({
                "movieId": self.idx_to_movieid[i],
                "score": float(sim_scores[i]),
                "rank": rank,
                "model": "content",
            })
        return results

    def get_similarity_score(self, movie_id_a: int, movie_id_b: int) -> float:
        """Get similarity score between two specific movies."""
        if not self.is_fitted:
            return 0.0
        if movie_id_a not in self.movie_indices or movie_id_b not in self.movie_indices:
            return 0.0
        idx_a = self.movie_indices[movie_id_a]
        idx_b = self.movie_indices[movie_id_b]
        return float(self.similarity_matrix[idx_a][idx_b])

    def get_genre_recommendations(self, genres: list[str], top_n: int = 10, movies_df: pd.DataFrame = None) -> list[dict]:
        """
        Recommend movies by genre list without a seed movie.
        Useful for cold-start users.
        """
        if not self.is_fitted or movies_df is None:
            return []

        query_soup = " ".join(genres).lower()
        query_vec = self.vectorizer.transform([query_soup])
        scores = cosine_similarity(query_vec, 
                                   self.vectorizer.transform(movies_df["soup"].fillna(""))).flatten()

        top_indices = np.argsort(scores)[::-1][:top_n]
        results = []
        for rank, idx in enumerate(top_indices, 1):
            if idx < len(movies_df):
                results.append({
                    "movieId": int(movies_df.iloc[idx]["movieId"]),
                    "score": float(scores[idx]),
                    "rank": rank,
                    "model": "content_genre",
                })
        return results
