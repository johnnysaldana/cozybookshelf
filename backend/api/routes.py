from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict
from services.scraping_service import scraping_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ScrapeRequest(BaseModel):
    profile_url: HttpUrl
    full_scrape: bool = True

class ScrapeResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    books_count: Optional[int] = None
    error: Optional[str] = None

@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_goodreads_profile(request: ScrapeRequest, background_tasks: BackgroundTasks):
    try:
        profile_url = str(request.profile_url)

        if "goodreads.com" not in profile_url:
            raise HTTPException(status_code=400, detail="Invalid Goodreads URL")

        result = scraping_service.scrape_and_save_user(profile_url)

        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('message', 'Scraping failed'))

        return ScrapeResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in scrape endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{username}")
async def get_user_data(username: str):
    try:
        result = scraping_service.get_user_library(username)

        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('message', 'User not found'))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{username}/currently-reading")
async def get_currently_reading_books(username: str):
    try:
        from services.database import database_service
        books = database_service.get_currently_reading_books(username)

        return {
            "success": True,
            "username": username,
            "currently_reading": books,
            "count": len(books)
        }

    except Exception as e:
        logger.error(f"Error fetching currently reading books: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{username}/read")
async def get_read_books(username: str):
    try:
        from services.database import database_service
        books = database_service.get_read_books(username)

        return {
            "success": True,
            "username": username,
            "read_books": books,
            "count": len(books)
        }

    except Exception as e:
        logger.error(f"Error fetching read books: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "goodreads-scraper-api"}