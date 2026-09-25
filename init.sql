CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    lead VARCHAR,
    content TEXT NOT NULL,
    published DATE NOT NULL,
    updated DATE,
    source_id INTEGER,
    source VARCHAR,
    url VARCHAR,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('russian', COALESCE(title, '') || ' ' || COALESCE(lead, '') || ' ' || COALESCE(content, ''))
    ) STORED,
    search_vector_simple tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(lead, '') || ' ' || COALESCE(content, ''))
    ) STORED
);

CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);
CREATE INDEX idx_articles_search_simple ON articles USING GIN(search_vector_simple);
CREATE UNIQUE INDEX idx_articles_published_title ON articles (published, title);