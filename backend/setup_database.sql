-- Drop existing tables (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS user_books CASCADE;
DROP TABLE IF EXISTS rss_feeds CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS goodreads_users CASCADE;

-- Create goodreads_users table
CREATE TABLE IF NOT EXISTS goodreads_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR UNIQUE NOT NULL,
    profile_url VARCHAR NOT NULL,
    name VARCHAR,
    location VARCHAR,
    website VARCHAR,
    joined_date TIMESTAMP,
    bio TEXT,
    interests TEXT,
    favorite_books TEXT,
    friends_count INTEGER,
    groups_count INTEGER,
    reviews_count INTEGER,
    ratings_count INTEGER,
    average_rating FLOAT,
    scraped_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goodreads_id VARCHAR UNIQUE,
    title VARCHAR NOT NULL,
    author VARCHAR NOT NULL,
    author_id VARCHAR,
    isbn VARCHAR,
    isbn13 VARCHAR,
    asin VARCHAR,
    language VARCHAR,
    average_rating FLOAT,
    ratings_count INTEGER,
    reviews_count INTEGER,
    publication_date DATE,
    publication_year VARCHAR,
    original_publication_date DATE,
    format VARCHAR,
    pages INTEGER,
    publisher VARCHAR,
    series VARCHAR,
    series_position VARCHAR,
    description TEXT,
    image_url VARCHAR,
    small_image_url VARCHAR,
    medium_image_url VARCHAR,
    large_image_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_books table
CREATE TABLE IF NOT EXISTS user_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES goodreads_users(id),
    book_id UUID NOT NULL REFERENCES books(id),
    status VARCHAR NOT NULL CHECK (status IN ('to-read', 'currently-reading', 'read', 'dnf')),
    rating INTEGER,
    review TEXT,
    review_id VARCHAR,
    review_url VARCHAR,
    rss_guid VARCHAR,
    date_added TIMESTAMP,
    date_created TIMESTAMP,
    date_started DATE,
    date_finished DATE,
    read_count INTEGER DEFAULT 0,
    owned INTEGER DEFAULT 0,
    shelves TEXT,
    notes TEXT,
    comments_count INTEGER,
    likes_count INTEGER,
    pub_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create rss_feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES goodreads_users(id),
    feed_url VARCHAR NOT NULL,
    feed_title VARCHAR,
    feed_description TEXT,
    feed_language VARCHAR,
    feed_last_build_date TIMESTAMP,
    feed_ttl INTEGER,
    raw_rss_content TEXT NOT NULL,
    scraped_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goodreads_users_username ON goodreads_users(username);
CREATE INDEX IF NOT EXISTS idx_books_goodreads_id ON books(goodreads_id);
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status);
CREATE INDEX IF NOT EXISTS idx_user_books_rss_guid ON user_books(rss_guid);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_id ON rss_feeds(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE goodreads_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access" ON goodreads_users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON books FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON user_books FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON rss_feeds FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON goodreads_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON books FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON user_books FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON rss_feeds FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON goodreads_users FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON books FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON user_books FOR UPDATE USING (true);
CREATE POLICY "Allow public update access" ON rss_feeds FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON goodreads_users FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON books FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON user_books FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON rss_feeds FOR DELETE USING (true);
