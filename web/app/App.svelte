<script>
  import { route } from "./router";
  import Search from "./components/Search.svelte";
  import ArticlePage from "./components/ArticlePage.svelte";
</script>

{#if $route.name === "article"}
  <ArticlePage id={$route.id} />
{:else}
  <Search />
{/if}
