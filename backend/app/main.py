"""
CineMatch - Movie Recommendation Engine
FastAPI Backend Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import movies, recommendations, search
from app.ml.engine import RecommendationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

engine = RecommendationEngine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup."""
    logger.info("🎬 Starting CineMatch - Loading ML models...")
    engine.load()
    app.state.engine = engine
    logger.info("✅ ML models loaded successfully!")
    yield
    logger.info("🛑 Shutting down CineMatch...")

app = FastAPI(
    title="CineMatch API",
    description="IMDB-Style Movie Recommendation Engine using Hybrid ML",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
app.include_router(recommendations.router, prefix="/api/recommend", tags=["Recommendations"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])

@app.get("/")
async def root():
    return {
        "app": "CineMatch",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": engine.is_loaded,
        "total_movies": engine.total_movies,
    }
