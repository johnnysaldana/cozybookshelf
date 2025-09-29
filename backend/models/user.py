from sqlalchemy import Column, String, DateTime, Integer, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class GoodreadsUser(Base):
    __tablename__ = 'goodreads_users'

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    profile_url = Column(String, nullable=False)
    name = Column(String)
    location = Column(String)
    website = Column(String)
    joined_date = Column(DateTime)
    bio = Column(Text)
    interests = Column(Text)
    favorite_books = Column(Text)
    friends_count = Column(Integer)
    groups_count = Column(Integer)
    reviews_count = Column(Integer)
    ratings_count = Column(Integer)
    average_rating = Column(Float)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)