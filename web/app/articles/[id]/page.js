"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Article from "../../components/Article";

function ArticlePage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const page = searchParams.get("page") || "";

  const [article, setArticle] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setError(null);
    setArticle(null);
    fetch(`/api/articles/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Ошибка загрузки статьи");
        }
        if (active) {
          setArticle(data.article);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const backHref = query
    ? `/?q=${encodeURIComponent(query)}${page ? `&page=${encodeURIComponent(page)}` : ""}`
    : "/";

  return (
    <main className="container">
      {error && <p className="error">Ошибка: {error}</p>}
      {article && <Article article={article} />}
      {article && (
        <Link className="back-link" href={backHref}>
          К поиску
        </Link>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ArticlePage />
    </Suspense>
  );
}
