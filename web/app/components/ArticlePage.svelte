<script>
  import { route, navigate, isPlainLeftClick } from "../router";
  import Article from "./Article.svelte";

  let { id } = $props();

  let article = $state(null);
  let error = $state(null);
  let notFound = $state(false);

  $effect(() => {
    const articleId = id;
    let active = true;
    error = null;
    notFound = false;
    article = null;
    fetch(`/api/articles/${articleId}`)
      .then(async (response) => {
        if (response.status === 404) {
          if (active) {
            notFound = true;
          }
          return;
        }
        let data = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }
        if (!response.ok) {
          throw new Error(data?.error || "Ошибка загрузки статьи");
        }
        if (!data) {
          throw new Error("Ошибка загрузки статьи");
        }
        if (active) {
          article = data.article;
        }
      })
      .catch((err) => {
        if (active) {
          error = err.message;
        }
      });
    return () => {
      active = false;
    };
  });

  let backHref = $derived.by(() => {
    const query = $route.query.get("q") || "";
    const page = $route.query.get("page") || "";
    return query
      ? `/?q=${encodeURIComponent(query)}${page ? `&page=${encodeURIComponent(page)}` : ""}`
      : "/";
  });

  function onBackClick(event) {
    if (!isPlainLeftClick(event)) {
      return;
    }
    event.preventDefault();
    navigate(backHref);
  }
</script>

<main class="container">
  {#if notFound}
    <p class="empty">Статья не найдена</p>
  {:else if error}
    <p class="error">Ошибка: {error}</p>
  {/if}
  {#if article}
    <Article {article} />
  {/if}
  {#if article || notFound || error}
    <a class="back-link" href={backHref} onclick={onBackClick}>К поиску</a>
  {/if}
</main>
