from sqlalchemy import Column, String, Text, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class RSSFeed(Base):
    __tablename__ = "rss_feeds"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    feed_url = Column(String, nullable=False)
    feed_title = Column(String)
    feed_description = Column(Text)
    feed_language = Column(String)
    feed_last_build_date = Column(DateTime)
    feed_ttl = Column(Integer)
    raw_rss_content = Column(Text, nullable=False)  # Store the entire RSS XML
    scraped_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<RSSFeed(id='{self.id}', user_id='{self.user_id}', title='{self.feed_title}')>"