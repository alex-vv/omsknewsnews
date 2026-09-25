#!/usr/bin/env python3
import json
import os
import sys

import psycopg

DEFAULT_INPUT = "articles.json"

INSERT = """
INSERT INTO articles (title, lead, content, published, updated, source_id, source, url)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (published, title) DO NOTHING
"""


def database_url():
    return os.environ["DATABASE_URL"]


def load_articles(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def to_rows(articles):
    return [
        (
            article["title"],
            article["lead"],
            article["content"],
            article["published"],
            article.get("updated"),
            article.get("sourceId"),
            article.get("source"),
            article.get("url"),
        )
        for article in articles
    ]


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    articles = load_articles(path)
    rows = to_rows(articles)
    with psycopg.connect(database_url()) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE articles RESTART IDENTITY")
            cur.executemany(INSERT, rows)
            inserted = cur.rowcount
        conn.commit()
    print("inserted %d of %d rows" % (inserted, len(rows)))


if __name__ == "__main__":
    main()
