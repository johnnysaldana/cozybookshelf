import requests
from bs4 import BeautifulSoup
import feedparser
import re
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class GoodreadsRSSScraper:
    """
    Lightweight Goodreads scraper that only uses RSS feeds and basic HTTP requests.
    Much faster and more reliable than Selenium-based scraping.
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )

    def scrape_user_profile_basic(self, profile_url: str) -> Dict:
        """
        Scrape basic user profile info using HTTP request.
        Limited compared to Selenium but faster.
        """
        try:
            logger.info(f"Fetching profile: {profile_url}")
            response = self.session.get(profile_url)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Extract user ID from URL
            user_id_match = re.search(r"/user/show/(\d+)", profile_url)
            user_id = user_id_match.group(1) if user_id_match else None

            # Extract username (either from URL or page)
            username = user_id
            if "-" in profile_url:
                username_match = re.search(r"/user/show/\d+-(.+)$", profile_url)
                if username_match:
                    username = username_match.group(1)

            user_data = {
                "profile_url": profile_url,
                "username": username,
                "user_id": user_id,
                "name": self.extract_text(soup, 'h1[itemprop="name"]'),
            }

            # Try to extract stats from the page
            stats_text = soup.get_text()

            # Extract counts using regex
            reviews_match = re.search(r"(\d+)\s+reviews?", stats_text, re.IGNORECASE)
            if reviews_match:
                user_data["reviews_count"] = int(
                    reviews_match.group(1).replace(",", "")
                )

            ratings_match = re.search(r"(\d+)\s+ratings?", stats_text, re.IGNORECASE)
            if ratings_match:
                user_data["ratings_count"] = int(
                    ratings_match.group(1).replace(",", "")
                )

            return user_data

        except Exception as e:
            logger.error(f"Error scraping profile: {e}")
            # Return minimal data
            user_id_match = re.search(r"/user/show/(\d+)", profile_url)
            return {
                "profile_url": profile_url,
                "username": user_id_match.group(1) if user_id_match else "unknown",
                "user_id": user_id_match.group(1) if user_id_match else None,
            }

    def scrape_books_via_rss(
        self, user_id: str, shelf: Optional[str] = None, per_page: int = 1000
    ) -> Dict:
        """
        Scrape books using Goodreads RSS feed and return both raw RSS and parsed data.
        """
        books = []
        rss_metadata = {}
        try:
            # Construct RSS feed URL with pagination
            if shelf:
                rss_url = f"https://www.goodreads.com/review/list_rss/{user_id}?shelf={shelf}&per_page={per_page}"
            else:
                # Get all books
                rss_url = f"https://www.goodreads.com/review/list_rss/{user_id}?per_page={per_page}"

            logger.info(f"Fetching RSS feed: {rss_url}")

            # Get raw RSS content first
            response = self.session.get(rss_url)
            response.raise_for_status()
            raw_rss_content = response.text

            # Parse the RSS feed
            feed = feedparser.parse(rss_url)

            if feed.bozo and feed.bozo_exception:
                logger.warning(f"RSS feed parsing had issues: {feed.bozo_exception}")

            # Extract feed metadata
            rss_metadata = {
                "rss_feed_url": rss_url,
                "feed_title": getattr(feed.feed, "title", None),
                "feed_description": getattr(feed.feed, "description", None),
                "feed_language": getattr(feed.feed, "language", None),
                "feed_last_build_date": getattr(feed.feed, "lastbuilddate", None),
                "feed_ttl": getattr(feed.feed, "ttl", None),
                "raw_rss_data": raw_rss_content,
            }

            for entry in feed.entries:
                book = self.parse_rss_entry(entry, shelf)
                if book:
                    books.append(book)

            logger.info(f"Successfully extracted {len(books)} books from RSS feed")
            return {"books": books, "rss_metadata": rss_metadata}

        except Exception as e:
            logger.error(f"Error scraping RSS feed: {e}")
            raise

    def parse_rss_entry(self, entry, default_shelf: Optional[str] = None) -> Dict:
        """Parse a single RSS feed entry into book data with all available RSS fields."""
        book = {}

        # RSS item metadata
        if hasattr(entry, "guid"):
            book["rss_guid"] = entry.guid

        if hasattr(entry, "pubdate"):
            book["pub_date"] = entry.pubdate

        if hasattr(entry, "link"):
            book["review_url"] = entry.link

        # Extract book title and author from title field
        if hasattr(entry, "title"):
            title_match = re.match(r"^(.*?)\s+by\s+(.*)$", entry.title)
            if title_match:
                book["title"] = title_match.group(1).strip()
                book["author"] = title_match.group(2).strip()
            else:
                book["title"] = entry.title

        # Extract book ID from multiple possible sources
        if hasattr(entry, "book_id"):
            book["goodreads_id"] = entry.book_id
        elif hasattr(entry, "link"):
            # Try to extract from review link
            id_match = re.search(r"/book/show/(\d+)", entry.link)
            if id_match:
                book["goodreads_id"] = id_match.group(1)

        # Author name from RSS field
        if hasattr(entry, "author_name"):
            book["author"] = entry.author_name

        # Extract ISBN
        if hasattr(entry, "isbn"):
            book["isbn"] = entry.isbn

        # Extract user rating
        if hasattr(entry, "user_rating"):
            try:
                rating = (
                    int(entry.user_rating)
                    if entry.user_rating and entry.user_rating != "0"
                    else None
                )
                book["user_rating"] = rating
            except (ValueError, TypeError):
                pass

        # Extract average rating
        if hasattr(entry, "average_rating"):
            try:
                book["average_rating"] = float(entry.average_rating)
            except (ValueError, TypeError):
                pass

        # Extract all date fields
        if hasattr(entry, "user_date_added"):
            book["date_added"] = entry.user_date_added

        if hasattr(entry, "user_date_created"):
            book["date_created"] = entry.user_date_created

        if hasattr(entry, "user_read_at"):
            # Only set if not empty
            if entry.user_read_at and entry.user_read_at.strip():
                book["date_finished"] = entry.user_read_at

        # Extract review
        if hasattr(entry, "user_review"):
            if entry.user_review and entry.user_review.strip():
                soup = BeautifulSoup(entry.user_review, "html.parser")
                book["review"] = soup.get_text(strip=True)

        # Extract shelves and determine status
        if hasattr(entry, "user_shelves"):
            if entry.user_shelves and entry.user_shelves.strip():
                book["shelves"] = [
                    s.strip() for s in entry.user_shelves.split(",") if s.strip()
                ]
            else:
                book["shelves"] = []

            # Determine primary status from shelves
            if "currently-reading" in book.get("shelves", []):
                book["status"] = "currently-reading"
            elif "to-read" in book.get("shelves", []):
                book["status"] = "to-read"
            elif "read" in book.get("shelves", []):
                book["status"] = "read"
            else:
                # Use first exclusive shelf or default to 'read' if no user_read_at, else 'to-read'
                if book.get("shelves"):
                    book["status"] = book["shelves"][0]
                elif book.get("date_finished"):
                    book["status"] = "read"
                else:
                    book["status"] = default_shelf or "to-read"
        else:
            # Default status logic
            if book.get("date_finished"):
                book["status"] = "read"
            else:
                book["status"] = default_shelf or "to-read"

        # Extract book metadata
        if hasattr(entry, "book_description"):
            if entry.book_description and entry.book_description.strip():
                soup = BeautifulSoup(entry.book_description, "html.parser")
                book["description"] = soup.get_text(strip=True)

        if hasattr(entry, "book_published"):
            book["publication_year"] = entry.book_published

        # Extract all image URLs
        if hasattr(entry, "book_image_url"):
            book["image_url"] = entry.book_image_url

        if hasattr(entry, "book_small_image_url"):
            book["small_image_url"] = entry.book_small_image_url

        if hasattr(entry, "book_medium_image_url"):
            book["medium_image_url"] = entry.book_medium_image_url

        if hasattr(entry, "book_large_image_url"):
            book["large_image_url"] = entry.book_large_image_url

        # Extract page count
        if hasattr(entry, "num_pages"):
            try:
                book["pages"] = int(entry.num_pages)
            except (ValueError, TypeError):
                pass

        return book

    def scrape_full_user_data(self, profile_url: str) -> Dict:
        """
        Scrape complete user data using only RSS feeds and HTTP requests.
        """
        try:
            # Get basic profile info
            user_data = self.scrape_user_profile_basic(profile_url)

            if not user_data.get("user_id"):
                raise ValueError("Could not extract user ID from profile URL")

            # Scrape all books via RSS (returns both books and RSS metadata)
            rss_result = self.scrape_books_via_rss(user_data["user_id"])
            all_books = rss_result["books"]
            rss_metadata = rss_result["rss_metadata"]

            # Add RSS metadata to user data
            user_data.update(rss_metadata)

            # Organize books by status
            books_by_status = {"read": [], "currently-reading": [], "to-read": []}

            for book in all_books:
                status = book.get("status", "read")
                if status in books_by_status:
                    books_by_status[status].append(book)

            user_data["books"] = all_books
            user_data["total_books"] = len(all_books)
            user_data["books_read"] = len(books_by_status["read"])
            user_data["books_reading"] = len(books_by_status["currently-reading"])
            user_data["books_to_read"] = len(books_by_status["to-read"])

            logger.info(
                f"Successfully scraped {len(all_books)} books for user {user_data['username']}"
            )
            return user_data

        except Exception as e:
            logger.error(f"Error scraping user data: {e}")
            raise

    def extract_text(self, soup, selector: str) -> Optional[str]:
        """Helper to extract text from BeautifulSoup element."""
        elem = soup.select_one(selector)
        return elem.text.strip() if elem else None
