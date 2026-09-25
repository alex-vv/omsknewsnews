export default function Article({ article }) {
  return (
    <article className="article">
      <h2>{article.title}</h2>
      <div className="article-meta">
        {article.published && <span>Опубликовано: {article.published}</span>}
        {article.updated && <span>Обновлено: {article.updated}</span>}
        {article.source && <span>Источник: {article.source}</span>}
      </div>
      {article.lead && <p className="article-lead">{article.lead}</p>}
      <div
        className="article-content"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
      {article.url && (
        <a className="article-url" href={article.url} target="_blank" rel="noreferrer">
          {article.url}
        </a>
      )}
    </article>
  );
}
