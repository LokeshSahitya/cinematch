"""
Collaborative Filtering Model
Uses SVD (Singular Value Decomposition) via the Surprise library.

Pipeline:
  1. Load user-item rating matrix (userId, movieId, rating)
  2. Train SVD model on ratings
  3. On query: predict ratings for unseen movies → return top-N
  
SVD Intuition:
  Rating Matrix R (users × movies) ≈ U × Σ × V^T
  - U: User latent factors (user preferences)
  - V: Item latent factors (movie characteristics)
  - Σ: Importance of each latent dimension
  
  To recommend for user u: predict r(u, m) for all unrated movies m
  Return movies with highest predicted ratings.
"""

import numpy as np
import pandas as pd
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Try to import Surprise; fall back to custom SVD if not installed
try:
    from surprise import SVD, Dataset, Reader, accuracy
    from surprise.model_selection import train_test_split
    SURPRISE_AVAILABLE = True
except ImportError:
    SURPRISE_AVAILABLE = False
    logger.warning("Surprise library not found. Using built-in SVD implementation.")


class CollaborativeModel:
    """
    SVD-based collaborative filtering recommender.
    Supports both Surprise SVD and a custom NumPy SVD fallback.
    """

    def __init__(self, n_factors: int = 100, n_epochs: int = 20, lr_all: float = 0.005, reg_all: float = 0.02):
        self.n_factors = n_factors
        self.n_epochs = n_epochs
        self.lr_all = lr_all
        self.reg_all = reg_all

        self.model = None
        self.trainset = None
        self.ratings_df: pd.DataFrame | None = None
        self.is_fitted = False
        self.use_surprise = SURPRISE_AVAILABLE

        # For custom SVD fallback
        self._user_factors: np.ndarray | None = None
        self._item_factors: np.ndarray | None = None
        self._user_index: dict = {}
        self._item_index: dict = {}
        self._idx_to_movie: dict = {}
        self._global_mean: float = 0.0
        self._user_biases: np.ndarray | None = None
        self._item_biases: np.ndarray | None = None

    def fit(self, ratings_df: pd.DataFrame) -> dict:
        """
        Train the collaborative filtering model.
        
        Args:
            ratings_df: DataFrame with columns [userId, movieId, rating]
            
        Returns:
            dict with training metrics (RMSE, MAE)
        """
        self.ratings_df = ratings_df.copy()
        logger.info(f"Training Collaborative Filtering model on {len(ratings_df)} ratings...")

        if self.use_surprise:
            return self._fit_surprise(ratings_df)
        else:
            return self._fit_custom_svd(ratings_df)

    def _fit_surprise(self, ratings_df: pd.DataFrame) -> dict:
        """Train using Surprise SVD."""
        reader = Reader(rating_scale=(1, 5))
        data = Dataset.load_from_df(ratings_df[["userId", "movieId", "rating"]], reader)

        trainset, testset = train_test_split(data, test_size=0.2, random_state=42)
        self.trainset = trainset

        self.model = SVD(
            n_factors=self.n_factors,
            n_epochs=self.n_epochs,
            lr_all=self.lr_all,
            reg_all=self.reg_all,
            random_state=42,
            verbose=False,
        )
        self.model.fit(trainset)

        predictions = self.model.test(testset)
        rmse = accuracy.rmse(predictions, verbose=False)
        mae = accuracy.mae(predictions, verbose=False)

        self.is_fitted = True
        logger.info(f"SVD trained. RMSE: {rmse:.4f}, MAE: {mae:.4f}")
        return {"rmse": rmse, "mae": mae, "method": "surprise_svd"}

    def _fit_custom_svd(self, ratings_df: pd.DataFrame) -> dict:
        """
        Custom SVD with SGD optimization (when Surprise not available).
        Implements biased matrix factorization.
        """
        users = ratings_df["userId"].unique()
        movies = ratings_df["movieId"].unique()

        self._user_index = {u: i for i, u in enumerate(users)}
        self._item_index = {m: i for i, m in enumerate(movies)}
        self._idx_to_movie = {i: m for m, i in self._item_index.items()}

        n_users, n_items = len(users), len(movies)
        self._global_mean = ratings_df["rating"].mean()

        # Initialize latent factors
        np.random.seed(42)
        self._user_factors = np.random.normal(0, 0.1, (n_users, self.n_factors))
        self._item_factors = np.random.normal(0, 0.1, (n_items, self.n_factors))
        self._user_biases = np.zeros(n_users)
        self._item_biases = np.zeros(n_items)

        # SGD training
        lr, reg = self.lr_all, self.reg_all
        ratings_array = ratings_df[["userId", "movieId", "rating"]].values

        for epoch in range(self.n_epochs):
            np.random.shuffle(ratings_array)
            total_loss = 0.0

            for user_id, movie_id, rating in ratings_array:
                u = self._user_index.get(user_id)
                i = self._item_index.get(movie_id)
                if u is None or i is None:
                    continue

                pred = (self._global_mean +
                        self._user_biases[u] +
                        self._item_biases[i] +
                        self._user_factors[u] @ self._item_factors[i])

                err = rating - pred
                total_loss += err ** 2

                # Update biases
                self._user_biases[u] += lr * (err - reg * self._user_biases[u])
                self._item_biases[i] += lr * (err - reg * self._item_biases[i])

                # Update latent factors
                u_factor = self._user_factors[u].copy()
                self._user_factors[u] += lr * (err * self._item_factors[i] - reg * self._user_factors[u])
                self._item_factors[i] += lr * (err * u_factor - reg * self._item_factors[i])

            if (epoch + 1) % 5 == 0:
                rmse = np.sqrt(total_loss / len(ratings_array))
                logger.info(f"  Epoch {epoch+1}/{self.n_epochs} - RMSE: {rmse:.4f}")

        self.is_fitted = True
        final_rmse = self._compute_rmse(ratings_df)
        logger.info(f"Custom SVD trained. Final RMSE: {final_rmse:.4f}")
        return {"rmse": final_rmse, "mae": 0.0, "method": "custom_svd"}

    def _compute_rmse(self, ratings_df: pd.DataFrame) -> float:
        errors = []
        for _, row in ratings_df.sample(min(1000, len(ratings_df))).iterrows():
            pred = self._predict_custom(int(row["userId"]), int(row["movieId"]))
            if pred is not None:
                errors.append((pred - row["rating"]) ** 2)
        return np.sqrt(np.mean(errors)) if errors else 0.0

    def _predict_custom(self, user_id: int, movie_id: int) -> float | None:
        u = self._user_index.get(user_id)
        i = self._item_index.get(movie_id)
        if u is None or i is None:
            return None
        pred = (self._global_mean +
                self._user_biases[u] +
                self._item_biases[i] +
                self._user_factors[u] @ self._item_factors[i])
        return float(np.clip(pred, 1, 5))

    def recommend(self, user_id: int, all_movie_ids: list[int], top_n: int = 10) -> list[dict]:
        """
        Recommend movies for a user using collaborative filtering.
        
        Args:
            user_id: Target user ID
            all_movie_ids: All available movie IDs
            top_n: Number of recommendations
            
        Returns:
            List of dicts: [{movieId, predicted_rating, score, rank}]
        """
        if not self.is_fitted:
            raise RuntimeError("Model not fitted.")

        # Find movies the user hasn't rated
        if self.ratings_df is not None:
            rated_movies = set(self.ratings_df[self.ratings_df["userId"] == user_id]["movieId"].tolist())
        else:
            rated_movies = set()

        unrated_movies = [m for m in all_movie_ids if m not in rated_movies]

        predictions = []
        for movie_id in unrated_movies:
            if self.use_surprise and self.model:
                pred = self.model.predict(user_id, movie_id)
                pred_rating = pred.est
            else:
                pred_rating = self._predict_custom(user_id, movie_id)
                if pred_rating is None:
                    pred_rating = self._global_mean

            predictions.append((movie_id, pred_rating))

        # Sort by predicted rating descending
        predictions.sort(key=lambda x: x[1], reverse=True)
        top_predictions = predictions[:top_n]

        # Normalize scores to [0, 1]
        max_r, min_r = 5.0, 1.0

        results = []
        for rank, (movie_id, pred_rating) in enumerate(top_predictions, 1):
            results.append({
                "movieId": movie_id,
                "predicted_rating": round(pred_rating, 2),
                "score": round((pred_rating - min_r) / (max_r - min_r), 4),
                "rank": rank,
                "model": "collaborative",
            })
        return results

    def get_user_history(self, user_id: int) -> list[dict]:
        """Get movies rated by a user."""
        if self.ratings_df is None:
            return []
        user_ratings = self.ratings_df[self.ratings_df["userId"] == user_id]
        return user_ratings.sort_values("rating", ascending=False).to_dict("records")

    def get_similar_users(self, user_id: int, top_n: int = 5) -> list[int]:
        """Find users with similar taste (by factor similarity)."""
        if not self.is_fitted or self._user_factors is None:
            return []
        u = self._user_index.get(user_id)
        if u is None:
            return []
        user_vec = self._user_factors[u]
        sims = self._user_factors @ user_vec
        sims[u] = -np.inf  # exclude self
        top_idxs = np.argsort(sims)[::-1][:top_n]
        idx_to_user = {v: k for k, v in self._user_index.items()}
        return [idx_to_user[i] for i in top_idxs if i in idx_to_user]
