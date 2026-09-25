import pool from "../../../lib/db";

const LATEST_LIMIT = 10;

const LATEST_SQL = `
  SELECT id, title,
         published::text AS published,
         source,
         COALESCE(
           NULLIF(lead, ''),
           left(regexp_replace(content, '<[^>]*>', ' ', 'g'), 300)
         ) AS excerpt
  FROM articles
  ORDER BY published DESC, id DESC
  LIMIT $1
`;

export async function GET() {
  try {
    const { rows } = await pool.query(LATEST_SQL, [LATEST_LIMIT]);
    return Response.json({ results: rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
