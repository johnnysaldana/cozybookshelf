from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from services.database import database_service
import logging
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info("Starting Cozy Bookshelf API...")
    database_service.create_tables()
    yield
    # Shutdown
    logging.info("Shutting down Cozy Bookshelf API...")

app = FastAPI(
    title="Cozy Bookshelf API",
    description="API for scraping and managing Goodreads data",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Welcome to Cozy Bookshelf API",
        "docs": "/docs",
        "health": "/api/v1/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)