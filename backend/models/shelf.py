from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Shelf(Base):
    __tablename__ = 'shelves'

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('goodreads_users.id'), nullable=False)
    name = Column(String, nullable=False)
    book_count = Column(Integer, default=0)
    exclusive = Column(Boolean, default=False)
    sortable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)