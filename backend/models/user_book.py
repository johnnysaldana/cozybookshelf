from sqlalchemy import Column, String, DateTime, Integer, Text, Float, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class ReadingStatus(enum.Enum):
    TO_READ = "to-read"
    CURRENTLY_READING = "currently-reading"
    READ = "read"
    DNF = "dnf"

class UserBook(Base):
    __tablename__ = 'user_books'

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('goodreads_users.id'), nullable=False)
    book_id = Column(String, ForeignKey('books.id'), nullable=False)
    status = Column(Enum(ReadingStatus), nullable=False)
    rating = Column(Integer)  # From RSS: user_rating
    review = Column(Text)  # From RSS: user_review
    review_id = Column(String)
    review_url = Column(String)  # From RSS: link (review link)
    rss_guid = Column(String)  # From RSS: guid (unique review identifier)
    date_added = Column(DateTime)  # From RSS: user_date_added
    date_created = Column(DateTime)  # From RSS: user_date_created
    date_started = Column(Date)
    date_finished = Column(Date)  # From RSS: user_read_at
    read_count = Column(Integer, default=0)
    owned = Column(Integer, default=0)
    shelves = Column(Text)  # From RSS: user_shelves (comma-separated)
    notes = Column(Text)
    comments_count = Column(Integer)
    likes_count = Column(Integer)
    pub_date = Column(DateTime)  # From RSS: pubDate (when review was published)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)