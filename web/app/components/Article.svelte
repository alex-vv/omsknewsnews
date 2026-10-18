<script>
  let { article } = $props();
</script>

<article class="article">
  <h2>{article.title}</h2>
  <div class="article-meta">
    {#if article.published}<span>Опубликовано: {article.published}</span>{/if}
    {#if article.updated}<span>Обновлено: {article.updated}</span>{/if}
    {#if article.source}<span>Источник: {article.source}</span>{/if}
  </div>
  {#if article.lead}
    <p class="article-lead">{article.lead}</p>
  {/if}
  <div class="article-content">
    {@html article.content}
  </div>
  {#if article.url}
    <a class="article-url" href={article.url} target="_blank" rel="noreferrer">
      {article.url}
    </a>
  {/if}
</article>
