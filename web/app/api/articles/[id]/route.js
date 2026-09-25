import pool from "../../../../lib/db";

const ARTICLE_SQL = `
  SELECT id, title, lead, content,
         published::text AS published,
         updated::text AS updated,
         source_id, source, url
  FROM articles
  WHERE id = $1
`;

export async function GET(request, { params }) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(ARTICLE_SQL, [articleId]);
    if (rows.length === 0) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    return Response.json({ article: rows[0] });
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
