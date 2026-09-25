"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function Search() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlPage = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(urlPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setQuery(urlQuery);
    if (urlQuery) {
      runSearch(urlQuery, urlPage);
    } else {
      loadLatest();
    }
  }, [urlQuery, urlPage]);

  async function loadLatest() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/articles");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки статей");
      }
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setPage(1);
      setTotalPages(0);
      setSearched(true);
      setLoading(false);
    }
  }

  async function runSearch(value, currentPage) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: value, page: String(currentPage) });
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ошибка поиска");
      }
      setResults(data.results || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      setError(err.message);
      setResults([]);
      setTotalPages(0);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    const value = query.trim();
    router.replace(value ? `/?q=${encodeURIComponent(value)}` : "/");
  }

  function goToPage(target) {
    if (target < 1 || target > totalPages || target === page) {
      return;
    }
    const params = new URLSearchParams({ q: urlQuery });
    if (target > 1) {
      params.set("page", String(target));
    }
    router.push(`/?${params.toString()}`);
    window.scrollTo({ top: 0 });
  }

  function articleHref(id) {
    const params = new URLSearchParams();
    if (urlQuery) {
      params.set("q", urlQuery);
    }
    if (urlPage > 1) {
      params.set("page", String(urlPage));
    }
    const suffix = params.toString();
    return `/articles/${id}${suffix ? `?${suffix}` : ""}`;
  }

  return (
    <main className="container">
      <h1>Архив интернет-архива омских СМИ</h1>
      <form className="search-form" onSubmit={onSubmit}>
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Введите поисковый запрос"
          autoFocus
        />
        <button className="search-button" type="submit" disabled={loading}>
          {loading ? "Поиск..." : "Найти"}
        </button>
      </form>

      {error && <p className="error">Ошибка: {error}</p>}

      {urlQuery && searched && !loading && !error && results.length === 0 && (
        <p className="empty">Ничего не найдено</p>
      )}

      {!urlQuery && results.length > 0 && (
        <h2 className="section-title">Последние статьи</h2>
      )}

      <ul className="results">
        {results.map((result) => (
          <li key={result.id} className="result">
            <Link className="result-link" href={articleHref(result.id)}>
              <h2>{result.title}</h2>
              <div className="article-meta">
                {result.published && <span>Опубликовано: {result.published}</span>}
                {result.source && <span>Источник: {result.source}</span>}
              </div>
              <p dangerouslySetInnerHTML={{ __html: result.excerpt }} />
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className="pagination">
          <button
            type="button"
            className="page-button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            Назад
          </button>
          {pageNumbers(page, totalPages).map((item, index) =>
            item === "..." ? (
              <span key={`gap-${index}`} className="page-gap">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`page-button${item === page ? " active" : ""}`}
                onClick={() => goToPage(item)}
                disabled={item === page}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            className="page-button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            Вперёд
          </button>
        </nav>
      )}
    </main>
  );
}

function pageNumbers(current, total) {
  const delta = 2;
  const start = Math.max(1, current - delta);
  const end = Math.min(total, current + delta);
  const pages = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) {
      pages.push("...");
    }
  }
  for (let value = start; value <= end; value += 1) {
    pages.push(value);
  }
  if (end < total) {
    if (end < total - 1) {
      pages.push("...");
    }
    pages.push(total);
  }
  return pages;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Search />
    </Suspense>
  );
}
