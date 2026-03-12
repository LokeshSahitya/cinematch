"""
Data Setup Script
Downloads and organizes MovieLens 1M + TMDB 5000 datasets.

Usage:
    python scripts/setup_data.py

Manual download instructions if automated fails:
1. MovieLens 1M: https://grouplens.org/datasets/movielens/1m/
   → Extract to: backend/app/data/raw/ml-1m/
   
2. TMDB 5000: https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata
   → Place files in: backend/app/data/raw/tmdb/
   → Required files:
       - tmdb_5000_movies.csv
       - tmdb_5000_credits.csv
"""

import os
import zipfile
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent / "app" / "data" / "raw"
ML_DIR = BASE_DIR / "ml-1m"
TMDB_DIR = BASE_DIR / "tmdb"

ML_URL = "https://files.grouplens.org/datasets/movielens/ml-1m.zip"


def download_movielens():
    """Download MovieLens 1M dataset."""
    ML_DIR.mkdir(parents=True, exist_ok=True)

    if (ML_DIR / "ratings.dat").exists():
        print("✅ MovieLens 1M already downloaded.")
        return

    print("📥 Downloading MovieLens 1M (~6MB)...")
    zip_path = BASE_DIR / "ml-1m.zip"

    try:
        urllib.request.urlretrieve(ML_URL, zip_path)
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(BASE_DIR)
        os.remove(zip_path)
        print("✅ MovieLens 1M downloaded and extracted.")
    except Exception as e:
        print(f"❌ Failed to download MovieLens: {e}")
        print("   Please download manually from: https://grouplens.org/datasets/movielens/1m/")


def check_tmdb():
    """Check if TMDB files exist."""
    TMDB_DIR.mkdir(parents=True, exist_ok=True)
    movies_file = TMDB_DIR / "tmdb_5000_movies.csv"
    credits_file = TMDB_DIR / "tmdb_5000_credits.csv"

    if movies_file.exists() and credits_file.exists():
        print("✅ TMDB 5000 dataset found.")
    else:
        print("⚠️  TMDB 5000 dataset not found.")
        print("   Download from Kaggle: https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata")
        print(f"   Place files in: {TMDB_DIR}/")
        print("   Required files:")
        print("     - tmdb_5000_movies.csv")
        print("     - tmdb_5000_credits.csv")
        print("\n   The app will run with sample data if TMDB is not available.")


if __name__ == "__main__":
    print("🎬 CineMatch Data Setup\n")
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    download_movielens()
    check_tmdb()
    print("\n✅ Setup complete! Run: uvicorn app.main:app --reload")
