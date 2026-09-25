import pool from "../../../lib/db";

const PAGE_SIZE = 20;

const SEARCH_SQL = `
  SELECT id, title,
         published::text AS published,
         updated::text AS updated,
         source,
         ts_headline('russian', content, websearch_to_tsquery('russian', $1)) AS excerpt
  FROM articles
  WHERE search_vector @@ websearch_to_tsquery('russian', $1)
  ORDER BY published DESC, id DESC
  LIMIT $2 OFFSET $3
`;

const COUNT_SQL = `
  SELECT count(*) AS total
  FROM articles
  WHERE search_vector @@ websearch_to_tsquery('russian', $1)
`;

const EXACT_SEARCH_SQL = `
  SELECT id, title,
         published::text AS published,
         updated::text AS updated,
         source,
         ts_headline('simple', content, phraseto_tsquery('simple', $1)) AS excerpt
  FROM articles
  WHERE search_vector_simple @@ phraseto_tsquery('simple', $1)
  ORDER BY published DESC, id DESC
  LIMIT $2 OFFSET $3
`;

const EXACT_COUNT_SQL = `
  SELECT count(*) AS total
  FROM articles
  WHERE search_vector_simple @@ phraseto_tsquery('simple', $1)
`;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("q") || "").trim();

  const quoted = raw.match(/^"([^"]*)"$/);
  const term = quoted ? quoted[1].trim() : raw;
  if (!term) {
    return Response.json({ results: [], page: 1, total: 0, totalPages: 0 });
  }

  const pageParam = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * PAGE_SIZE;
  const searchSql = quoted ? EXACT_SEARCH_SQL : SEARCH_SQL;
  const countSql = quoted ? EXACT_COUNT_SQL : COUNT_SQL;

  try {
    const countResult = await pool.query(countSql, [term]);
    const total = Number(countResult.rows[0].total);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const { rows } = await pool.query(searchSql, [term, PAGE_SIZE, offset]);
    return Response.json({ results: rows, page, total, totalPages });
  } catch (error) {
    console.error('DB Error Details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    return Response.json({ error: error.message }, { status: 500 });
  }
}
