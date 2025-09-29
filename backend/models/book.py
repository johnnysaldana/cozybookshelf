from sqlalchemy import Column, String, DateTime, Integer, Text, Float, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Book(Base):
    __tablename__ = 'books'

    id = Column(String, primary_key=True)
    goodreads_id = Column(String, unique=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    author_id = Column(String)
    isbn = Column(String)
    isbn13 = Column(String)
    asin = Column(String)
    language = Column(String)
    average_rating = Column(Float)
    ratings_count = Column(Integer)
    reviews_count = Column(Integer)
    publication_date = Column(Date)
    publication_year = Column(String)  # From RSS: book_published
    original_publication_date = Column(Date)
    format = Column(String)
    pages = Column(Integer)  # From RSS: num_pages
    publisher = Column(String)
    series = Column(String)
    series_position = Column(String)
    description = Column(Text)  # From RSS: book_description
    image_url = Column(String)  # From RSS: book_image_url
    small_image_url = Column(String)  # From RSS: book_small_image_url
    medium_image_url = Column(String)  # From RSS: book_medium_image_url
    large_image_url = Column(String)  # From RSS: book_large_image_url
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)