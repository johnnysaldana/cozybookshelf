from supabase import create_client, Client
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

Base = declarative_base()

class DatabaseService:
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        self.database_url = os.getenv('DATABASE_URL')

        if not all([self.supabase_url, self.supabase_key]):
            logger.warning("Supabase credentials not found. Database operations will be limited.")
            self.supabase = None
        else:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        if self.database_url:
            self.engine = create_engine(self.database_url)
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        else:
            logger.warning("Database URL not found. SQLAlchemy operations will be limited.")
            self.engine = None
            self.SessionLocal = None

    def get_session(self) -> Session:
        if self.SessionLocal:
            return self.SessionLocal()
        raise Exception("Database not configured")

    def create_tables(self):
        if self.engine:
            Base.metadata.create_all(bind=self.engine)
        else:
            logger.warning("Cannot create tables: Database engine not configured")

    def save_user_data(self, user_data: dict):
        try:
            if self.supabase:
                response = self.supabase.table('goodreads_users').upsert(user_data).execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return None
        except Exception as e:
            logger.error(f"Error saving user data: {e}")
            raise

    def save_books(self, books: list):
        try:
            if self.supabase:
                # Use ignore_duplicates=True for conflict resolution
                response = self.supabase.table('books').upsert(
                    books,
                    ignore_duplicates=False  # This will update existing records
                ).execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return None
        except Exception as e:
            logger.error(f"Error saving books: {e}")
            raise

    def save_user_books(self, user_books: list):
        try:
            if self.supabase:
                response = self.supabase.table('user_books').upsert(
                    user_books,
                    ignore_duplicates=False  # This will update existing records
                ).execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return None
        except Exception as e:
            logger.error(f"Error saving user books: {e}")
            raise

    def get_user_by_username(self, username: str):
        try:
            if self.supabase:
                response = self.supabase.table('goodreads_users').select("*").eq('username', username).execute()
                return response.data[0] if response.data else None
            else:
                logger.warning("Supabase client not configured")
                return None
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            raise

    def get_user_books(self, user_id: str):
        try:
            if self.supabase:
                response = self.supabase.table('user_books').select("*, books(*)").eq('user_id', user_id).execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return []
        except Exception as e:
            logger.error(f"Error fetching user books: {e}")
            raise

    def get_user_books_by_status(self, user_id: str, status: str):
        try:
            if self.supabase:
                response = self.supabase.table('user_books').select("*, books(*)").eq('user_id', user_id).eq('status', status).execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return []
        except Exception as e:
            logger.error(f"Error fetching user books by status: {e}")
            raise

    def get_currently_reading_books(self, username: str):
        try:
            if self.supabase:
                # First get the user
                user_response = self.supabase.table('goodreads_users').select('id').eq('username', username).execute()
                if not user_response.data:
                    return []

                user_id = user_response.data[0]['id']

                # Get currently reading books
                response = self.supabase.table('user_books').select("*, books(*)").eq('user_id', user_id).eq('status', 'currently-reading').execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return []
        except Exception as e:
            logger.error(f"Error fetching currently reading books: {e}")
            raise

    def get_read_books(self, username: str):
        try:
            if self.supabase:
                # First get the user
                user_response = self.supabase.table('goodreads_users').select('id').eq('username', username).execute()
                if not user_response.data:
                    return []

                user_id = user_response.data[0]['id']

                # Get read books
                response = self.supabase.table('user_books').select("*, books(*)").eq('user_id', user_id).eq('status', 'read').execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return []
        except Exception as e:
            logger.error(f"Error fetching read books: {e}")
            raise

    def get_book_by_goodreads_id(self, goodreads_id: str):
        try:
            if self.supabase:
                response = self.supabase.table('books').select("*").eq('goodreads_id', goodreads_id).execute()
                return response.data[0] if response.data else None
            else:
                logger.warning("Supabase client not configured")
                return None
        except Exception as e:
            logger.error(f"Error fetching book by goodreads_id: {e}")
            raise

    def save_rss_feed(self, rss_feed_data: dict):
        """Save raw RSS feed data"""
        try:
            if self.supabase:
                response = self.supabase.table('rss_feeds').upsert(
                    rss_feed_data,
                    on_conflict='id'
                ).execute()
                return response.data
            else:
                logger.warning("Supabase client not configured")
                return None
        except Exception as e:
            logger.error(f"Error saving RSS feed: {e}")
            raise

    def delete_user_data_by_username(self, username: str):
        """Delete all data for a user by username to ensure fresh data on re-scrape"""
        try:
            if self.supabase:
                # First get the user_id for this username
                user_response = self.supabase.table('goodreads_users').select('id').eq('username', username).execute()
                
                if user_response.data:
                    user_id = user_response.data[0]['id']
                    
                    # Delete user_books first (due to foreign key constraints)
                    self.supabase.table('user_books').delete().eq('user_id', user_id).execute()

                    # Delete RSS feeds for this user
                    self.supabase.table('rss_feeds').delete().eq('user_id', user_id).execute()

                    # Delete user record
                    self.supabase.table('goodreads_users').delete().eq('id', user_id).execute()
                    
                    logger.info(f"Deleted all data for user {username} (ID: {user_id})")
                    return True
                else:
                    logger.info(f"No existing data found for user {username}")
                    return True
            else:
                logger.warning("Supabase client not configured")
                return False
        except Exception as e:
            logger.error(f"Error deleting user data: {e}")
            raise

database_service = DatabaseService()