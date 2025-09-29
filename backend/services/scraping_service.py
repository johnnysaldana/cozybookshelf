from scrapers.goodreads_rss_scraper import GoodreadsRSSScraper
from services.database import database_service
import uuid
from typing import Dict
import logging
from datetime import datetime
import time
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class ScrapingService:
    def __init__(self):
        self.db = database_service

    def scrape_and_save_user(self, profile_url: str) -> Dict:
        try:
            scraper = GoodreadsRSSScraper()

            logger.info(f"Starting scrape for profile: {profile_url}")
            user_data = scraper.scrape_full_user_data(profile_url)

            user_id = uuid.uuid4()
            user_record = {
                'id': str(user_id),
                'username': user_data.get('username'),
                'profile_url': profile_url,
                'name': user_data.get('name'),
                'location': user_data.get('location'),
                'bio': user_data.get('bio'),
                'joined_date': user_data.get('joined_date').isoformat() if user_data.get('joined_date') else None,
                'friends_count': user_data.get('friends_count', 0),
                'reviews_count': user_data.get('reviews_count', 0),
                'ratings_count': user_data.get('ratings_count', 0),
                'scraped_at': datetime.utcnow().isoformat()
            }

            # First, delete all existing data for this user to ensure fresh data
            self.db.delete_user_data_by_username(user_data.get('username'))
            logger.info(f"Cleared existing data for user {user_data.get('username')}")

            # Small delay to ensure deletion is committed
            time.sleep(0.5)

            # Save fresh user data using upsert to handle any race conditions
            self.db.save_user_data(user_record)
            logger.info(f"Saved user data for {user_data.get('username')}")

            # Save raw RSS feed data if available
            if user_data.get('raw_rss_data'):
                rss_feed_record = {
                    'id': str(uuid.uuid4()),
                    'user_id': str(user_id),
                    'feed_url': user_data.get('rss_feed_url'),
                    'feed_title': user_data.get('feed_title'),
                    'feed_description': user_data.get('feed_description'),
                    'feed_language': user_data.get('feed_language'),
                    'feed_last_build_date': user_data.get('feed_last_build_date'),
                    'feed_ttl': user_data.get('feed_ttl'),
                    'raw_rss_content': user_data.get('raw_rss_data'),
                    'scraped_at': datetime.utcnow().isoformat()
                }
                self.db.save_rss_feed(rss_feed_record)
                logger.info(f"Saved raw RSS feed data for user")

            books = user_data.get('books', [])
            if books:
                book_records = []
                user_book_records = []

                for book in books:
                    goodreads_id = book.get('goodreads_id')

                    # Check if book already exists
                    existing_book = self.db.get_book_by_goodreads_id(goodreads_id)

                    if existing_book:
                        # Use existing book ID
                        book_id = existing_book['id']
                        # Update existing book record with any new data
                        book_record = {
                            'id': book_id,
                            'goodreads_id': goodreads_id,
                            'title': book.get('title'),
                            'author': book.get('author'),
                            'isbn': book.get('isbn'),
                            'isbn13': book.get('isbn13'),
                            'average_rating': book.get('average_rating'),
                            'ratings_count': book.get('ratings_count', 0),
                            'publication_year': book.get('publication_year'),
                            'pages': book.get('pages'),
                            'description': book.get('description'),
                            'image_url': book.get('image_url'),
                            'small_image_url': book.get('small_image_url'),
                            'medium_image_url': book.get('medium_image_url'),
                            'large_image_url': book.get('large_image_url')
                        }
                    else:
                        # Create new book record
                        book_id = str(uuid.uuid4())
                        book_record = {
                            'id': book_id,
                            'goodreads_id': goodreads_id,
                            'title': book.get('title'),
                            'author': book.get('author'),
                            'isbn': book.get('isbn'),
                            'isbn13': book.get('isbn13'),
                            'average_rating': book.get('average_rating'),
                            'ratings_count': book.get('ratings_count', 0),
                            'publication_year': book.get('publication_year'),
                            'pages': book.get('pages'),
                            'description': book.get('description'),
                            'image_url': book.get('image_url'),
                            'small_image_url': book.get('small_image_url'),
                            'medium_image_url': book.get('medium_image_url'),
                            'large_image_url': book.get('large_image_url')
                        }

                    book_records.append(book_record)

                    user_book_record = {
                        'id': str(uuid.uuid4()),
                        'user_id': str(user_id),
                        'book_id': str(book_id),
                        'status': book.get('status', 'read'),
                        'rating': book.get('user_rating'),
                        'review': book.get('review'),
                        'review_url': book.get('review_url'),
                        'rss_guid': book.get('rss_guid'),
                        'date_added': book.get('date_added'),
                        'date_created': book.get('date_created'),
                        'date_started': book.get('date_started'),
                        'date_finished': book.get('date_finished'),
                        'shelves': ','.join(book.get('shelves', [])) if book.get('shelves') else None,
                        'pub_date': book.get('pub_date')
                    }
                    user_book_records.append(user_book_record)

                self.db.save_books(book_records)
                self.db.save_user_books(user_book_records)
                logger.info(f"Saved {len(book_records)} books for user")

            return {
                'success': True,
                'user_id': str(user_id),
                'username': user_data.get('username'),
                'books_count': len(books),
                'message': f"Successfully scraped and saved data for {user_data.get('username')}"
            }

        except Exception as e:
            logger.error(f"Error in scraping service: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to scrape user data'
            }

    def get_user_library(self, username: str) -> Dict:
        try:
            user = self.db.get_user_by_username(username)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found'
                }

            books = self.db.get_user_books(user['id'])

            return {
                'success': True,
                'user': user,
                'books': books,
                'total_books': len(books)
            }

        except Exception as e:
            logger.error(f"Error fetching user library: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to fetch user library'
            }

scraping_service = ScrapingService()