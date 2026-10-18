<script>
  import { route, navigate, isPlainLeftClick } from "../router";

  let query = $state("");
  let results = $state([]);
  let page = $state(1);
  let totalPages = $state(0);
  let loading = $state(false);
  let searched = $state(false);
  let error = $state(null);

  let urlQuery = $derived($route.query.get("q") || "");
  let urlPage = $derived(
    Math.max(1, Number.parseInt($route.query.get("page") || "1", 10) || 1)
  );

  $effect(() => {
    query = urlQuery;
    if (urlQuery) {
      runSearch(urlQuery, urlPage);
    } else {
      loadLatest();
    }
  });

  async function loadLatest() {
    loading = true;
    error = null;
    try {
      const response = await fetch("/api/articles");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки статей");
      }
      results = data.results || [];
    } catch (err) {
      error = err.message;
      results = [];
    } finally {
      page = 1;
      totalPages = 0;
      searched = true;
      loading = false;
    }
  }

  async function runSearch(value, currentPage) {
    loading = true;
    error = null;
    try {
      const params = new URLSearchParams({ q: value, page: String(currentPage) });
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ошибка поиска");
      }
      results = data.results || [];
      page = data.page || 1;
      totalPages = data.totalPages || 0;
    } catch (err) {
      error = err.message;
      results = [];
      totalPages = 0;
    } finally {
      searched = true;
      loading = false;
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/?q=${encodeURIComponent(value)}` : "/", { replace: true });
  }

  function goToPage(target) {
    if (target < 1 || target > totalPages || target === page) {
      return;
    }
    const params = new URLSearchParams({ q: urlQuery });
    if (target > 1) {
      params.set("page", String(target));
    }
    navigate(`/?${params.toString()}`);
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

  function onResultClick(event, href) {
    if (!isPlainLeftClick(event)) {
      return;
    }
    event.preventDefault();
    navigate(href);
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
</script>

<main class="container">
  <h1>Архив интернет-архива омских СМИ</h1>
  <form class="search-form" onsubmit={onSubmit}>
    <input
      class="search-input"
      bind:value={query}
      placeholder="Введите поисковый запрос"
      autofocus
    />
    <button class="search-button" type="submit" disabled={loading}>
      {loading ? "Поиск..." : "Найти"}
    </button>
  </form>

  {#if error}
    <p class="error">Ошибка: {error}</p>
  {/if}

  {#if urlQuery && searched && !loading && !error && results.length === 0}
    <p class="empty">Ничего не найдено</p>
  {/if}

  {#if !urlQuery && results.length > 0}
    <h2 class="section-title">Последние статьи</h2>
  {/if}

  <ul class="results">
    {#each results as result (result.id)}
      <li class="result">
        <a
          class="result-link"
          href={articleHref(result.id)}
          onclick={(event) => onResultClick(event, articleHref(result.id))}
        >
          <h2>{result.title}</h2>
          <div class="article-meta">
            {#if result.published}<span>Опубликовано: {result.published}</span>{/if}
            {#if result.source}<span>Источник: {result.source}</span>{/if}
          </div>
          <p>{@html result.excerpt}</p>
        </a>
      </li>
    {/each}
  </ul>

  {#if totalPages > 1}
    <nav class="pagination">
      <button
        type="button"
        class="page-button"
        onclick={() => goToPage(page - 1)}
        disabled={page <= 1}
      >
        Назад
      </button>
      {#each pageNumbers(page, totalPages) as item, index (index)}
        {#if item === "..."}
          <span class="page-gap">…</span>
        {:else}
          <button
            type="button"
            class={`page-button${item === page ? " active" : ""}`}
            onclick={() => goToPage(item)}
            disabled={item === page}
          >
            {item}
          </button>
        {/if}
      {/each}
      <button
        type="button"
        class="page-button"
        onclick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
      >
        Вперёд
      </button>
    </nav>
  {/if}
</main>
