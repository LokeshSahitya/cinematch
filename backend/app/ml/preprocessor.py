"""
Data Preprocessor
Handles loading and merging MovieLens 1M + TMDB 5000 datasets.
Prepares feature matrices for both content-based and collaborative filtering.
"""

import pandas as pd
import numpy as np
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"


def load_movielens(data_dir: Path = DATA_DIR) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load MovieLens 1M dataset.
    Files: movies.dat, ratings.dat, users.dat
    Falls back to sample data if files not found.
    """
    movies_path = data_dir / "ml-1m" / "movies.dat"
    ratings_path = data_dir / "ml-1m" / "ratings.dat"

    if movies_path.exists() and ratings_path.exists():
        logger.info("Loading MovieLens 1M dataset...")
        movies_ml = pd.read_csv(
            movies_path,
            sep="::",
            engine="python",
            names=["movieId", "title", "genres"],
            encoding="latin-1",
        )
        ratings = pd.read_csv(
            ratings_path,
            sep="::",
            engine="python",
            names=["userId", "movieId", "rating", "timestamp"],
            encoding="latin-1",
        )
        logger.info(f"Loaded {len(movies_ml)} movies, {len(ratings)} ratings.")
        return movies_ml, ratings
    else:
        logger.warning("MovieLens 1M not found. Generating sample data for demo.")
        return _generate_sample_data()


def load_tmdb(data_dir: Path = DATA_DIR) -> pd.DataFrame:
    """
    Load TMDB 5000 Movie Dataset.
    Files: tmdb_5000_movies.csv, tmdb_5000_credits.csv
    """
    movies_path = data_dir / "tmdb" / "tmdb_5000_movies.csv"
    credits_path = data_dir / "tmdb" / "tmdb_5000_credits.csv"

    if movies_path.exists():
        logger.info("Loading TMDB dataset...")
        import ast

        tmdb = pd.read_csv(movies_path)
        tmdb = tmdb[
            ["id", "title", "overview", "genres", "keywords", "vote_average",
             "vote_count", "release_date", "runtime", "revenue", "budget",
             "popularity", "original_language", "tagline", "poster_path"]
        ]
        tmdb.rename(columns={"id": "tmdbId"}, inplace=True)

        def parse_json_col(col):
            try:
                return [item["name"] for item in ast.literal_eval(col)]
            except Exception:
                return []

        tmdb["genres"] = tmdb["genres"].apply(parse_json_col)
        tmdb["keywords"] = tmdb["keywords"].apply(parse_json_col)

        if credits_path.exists():
            credits = pd.read_csv(credits_path)
            credits.rename(columns={"movie_id": "tmdbId"}, inplace=True)
            credits["cast"] = credits["cast"].apply(
                lambda x: [i["name"] for i in ast.literal_eval(x)[:5]]
                if pd.notna(x) else []
            )
            credits["crew"] = credits["crew"].apply(
                lambda x: [i["name"] for i in ast.literal_eval(x) if i["job"] == "Director"][:1]
                if pd.notna(x) else []
            )
            tmdb = tmdb.merge(credits[["tmdbId", "cast", "crew"]], on="tmdbId", how="left")
        else:
            tmdb["cast"] = [[]] * len(tmdb)
            tmdb["crew"] = [[]] * len(tmdb)

        logger.info(f"Loaded {len(tmdb)} TMDB movies.")
        return tmdb
    else:
        logger.warning("TMDB dataset not found. Using MovieLens data only.")
        return None


def build_content_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build the 'soup' feature string for TF-IDF vectorization.
    Combines: genres, keywords, cast, director, overview.
    """
    def clean_name(name: str) -> str:
        return str(name).lower().replace(" ", "")

    def make_soup(row):
        genres = " ".join([clean_name(g) for g in row.get("genres", [])])
        keywords = " ".join([clean_name(k) for k in row.get("keywords", [])])
        cast = " ".join([clean_name(c) for c in row.get("cast", [])])
        director = " ".join([clean_name(d) for d in row.get("crew", [])])
        overview = str(row.get("overview", "")).lower()
        # Director gets extra weight by repeating
        return f"{genres} {genres} {keywords} {cast} {director} {director} {overview}"

    df = df.copy()
    df["soup"] = df.apply(make_soup, axis=1)
    return df


def merge_datasets(movies_ml: pd.DataFrame, tmdb: pd.DataFrame) -> pd.DataFrame:
    """
    Merge MovieLens and TMDB on normalized title.
    Returns enriched movie dataframe.
    """
    if tmdb is None:
        logger.info("Using MovieLens-only dataset.")
        movies_ml["year"] = movies_ml["title"].str.extract(r"\((\d{4})\)").fillna("")
        movies_ml["title_clean"] = movies_ml["title"].str.replace(r"\s*\(\d{4}\)", "", regex=True).str.strip()
        movies_ml["genres_list"] = movies_ml["genres"].str.split("|")
        movies_ml["genres"] = movies_ml["genres_list"]
        movies_ml["soup"] = movies_ml["genres"].apply(lambda g: " ".join(g).lower())
        movies_ml["overview"] = ""
        movies_ml["vote_average"] = np.random.uniform(5, 9, len(movies_ml)).round(1)
        movies_ml["vote_count"] = np.random.randint(100, 5000, len(movies_ml))
        movies_ml["poster_path"] = None
        movies_ml["cast"] = [[]] * len(movies_ml)
        movies_ml["crew"] = [[]] * len(movies_ml)
        movies_ml["keywords"] = [[]] * len(movies_ml)
        return movies_ml

    # Normalize titles for merge
    movies_ml["title_clean"] = movies_ml["title"].str.replace(r"\s*\(\d{4}\)", "", regex=True).str.strip().str.lower()
    tmdb["title_clean"] = tmdb["title"].str.lower()

    merged = movies_ml.merge(tmdb, on="title_clean", how="left", suffixes=("_ml", "_tmdb"))
    merged["title"] = merged["title_ml"]
    merged["genres"] = merged.apply(
        lambda r: r["genres_tmdb"] if isinstance(r.get("genres_tmdb"), list) else r["genres_ml"].split("|"),
        axis=1
    )
    merged = build_content_features(merged)
    logger.info(f"Merged dataset: {len(merged)} movies.")
    return merged


def _generate_sample_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Generate realistic sample data for demo/testing."""
    np.random.seed(42)

    SAMPLE_MOVIES = [
        (1, "The Shawshank Redemption (1994)", "Drama"),
        (2, "The Godfather (1972)", "Crime|Drama"),
        (3, "The Dark Knight (2008)", "Action|Crime|Drama"),
        (4, "Pulp Fiction (1994)", "Crime|Drama|Thriller"),
        (5, "Schindler's List (1993)", "Biography|Drama|History"),
        (6, "The Lord of the Rings: The Return of the King (2003)", "Action|Adventure|Drama"),
        (7, "Fight Club (1999)", "Drama|Mystery|Thriller"),
        (8, "Forrest Gump (1994)", "Drama|Romance"),
        (9, "Inception (2010)", "Action|Adventure|Sci-Fi"),
        (10, "The Silence of the Lambs (1991)", "Crime|Drama|Thriller"),
        (11, "Interstellar (2014)", "Adventure|Drama|Sci-Fi"),
        (12, "Goodfellas (1990)", "Biography|Crime|Drama"),
        (13, "The Matrix (1999)", "Action|Sci-Fi"),
        (14, "Se7en (1995)", "Crime|Drama|Mystery|Thriller"),
        (15, "The Usual Suspects (1995)", "Crime|Drama|Mystery|Thriller"),
        (16, "Léon: The Professional (1994)", "Action|Crime|Drama|Thriller"),
        (17, "American History X (1998)", "Crime|Drama"),
        (18, "Saving Private Ryan (1998)", "Drama|War"),
        (19, "The Green Mile (1999)", "Crime|Drama|Fantasy|Mystery"),
        (20, "Gladiator (2000)", "Action|Adventure|Drama"),
        (21, "Memento (2000)", "Mystery|Thriller"),
        (22, "Parasite (2019)", "Comedy|Drama|Thriller"),
        (23, "Avengers: Infinity War (2018)", "Action|Adventure|Sci-Fi"),
        (24, "Get Out (2017)", "Horror|Mystery|Thriller"),
        (25, "La La Land (2016)", "Comedy|Drama|Music|Romance"),
        (26, "Mad Max: Fury Road (2015)", "Action|Adventure|Sci-Fi|Thriller"),
        (27, "The Revenant (2015)", "Action|Adventure|Drama|Western"),
        (28, "Whiplash (2014)", "Drama|Music"),
        (29, "Gone Girl (2014)", "Drama|Mystery|Thriller"),
        (30, "Her (2013)", "Drama|Romance|Sci-Fi"),
        (31, "Django Unchained (2012)", "Drama|Western"),
        (32, "The Grand Budapest Hotel (2014)", "Adventure|Comedy|Crime|Drama"),
        (33, "12 Years a Slave (2013)", "Biography|Drama|History"),
        (34, "Wolf of Wall Street (2013)", "Biography|Crime|Drama"),
        (35, "The Social Network (2010)", "Biography|Drama"),
        (36, "Black Swan (2010)", "Drama|Mystery|Thriller"),
        (37, "Toy Story (1995)", "Animation|Adventure|Comedy|Family|Fantasy"),
        (38, "Up (2009)", "Animation|Adventure|Comedy|Drama|Family"),
        (39, "WALL-E (2008)", "Animation|Adventure|Family|Romance|Sci-Fi"),
        (40, "Finding Nemo (2003)", "Animation|Adventure|Comedy|Family"),
        (41, "The Lion King (1994)", "Animation|Adventure|Drama|Family|Musical"),
        (42, "Spirited Away (2001)", "Animation|Adventure|Family|Fantasy|Mystery"),
        (43, "Princess Mononoke (1997)", "Animation|Action|Adventure|Fantasy"),
        (44, "Howl's Moving Castle (2004)", "Animation|Adventure|Fantasy|Romance"),
        (45, "Akira (1988)", "Animation|Action|Sci-Fi|Thriller"),
        (46, "Blade Runner (1982)", "Sci-Fi|Thriller"),
        (47, "2001: A Space Odyssey (1968)", "Adventure|Sci-Fi"),
        (48, "Alien (1979)", "Horror|Sci-Fi|Thriller"),
        (49, "Star Wars: Episode IV (1977)", "Action|Adventure|Fantasy|Sci-Fi"),
        (50, "Jurassic Park (1993)", "Action|Adventure|Sci-Fi|Thriller"),
    ]

    movies_df = pd.DataFrame(SAMPLE_MOVIES, columns=["movieId", "title", "genres"])

    # Generate ratings
    n_users = 200
    ratings_list = []
    for user_id in range(1, n_users + 1):
        n_ratings = np.random.randint(10, 40)
        movie_ids = np.random.choice(movies_df["movieId"].values, n_ratings, replace=False)
        for movie_id in movie_ids:
            rating = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.10, 0.20, 0.35, 0.30])
            ratings_list.append({"userId": user_id, "movieId": int(movie_id), "rating": float(rating)})

    ratings_df = pd.DataFrame(ratings_list)
    return movies_df, ratings_df
