package ru.omsknewsnews.api;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import io.quarkus.runtime.annotations.RegisterForReflection;
import org.jboss.resteasy.reactive.RestQuery;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.mapper.reflect.ConstructorMapper;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;

@Path("/api")
public class Articles {

    @Inject
    Jdbi jdbi;

    @RegisterForReflection
    public record Article(Long id, String title, LocalDate published, String source, String excerpt) {
    }

    @RegisterForReflection
    public record ArticleFull(
            Long id,
            String title,
            String lead,
            String content,
            LocalDate published,
            LocalDate updated,
            String source,
            String url) {
    }

    public record ArticleListResponse(List<Article> results) {
    }

    public record ArticleResponse(ArticleFull article) {
    }

    public record SearchResponse(List<Article> results, int page, int total, int totalPages) {
    }

    private final String LATEST_SQL = """
            SELECT id,
                   title,
                   published,
                   source,
                   COALESCE(
                        NULLIF(lead, ''),
                        left(regexp_replace(content, '<[^>]*>', ' ', 'g'), 300)
                    ) AS excerpt
            FROM articles
            ORDER BY published DESC, id DESC
            LIMIT 10
            """;

    private final String ARTICLE_SQL = """
            SELECT id, title, lead, content, published, updated, source, url
            FROM articles
            WHERE id = ?
            """;

    private static final int PAGE_SIZE = 20;

    private static final String SEARCH_SQL = """
            SELECT id, title, published, updated, source,
                   ts_headline('russian', content, websearch_to_tsquery('russian', :q)) AS excerpt
            FROM articles
            WHERE search_vector @@ websearch_to_tsquery('russian', :q)
            ORDER BY published DESC, id DESC
            LIMIT :limit OFFSET :offset
            """;

    private static final String COUNT_SQL = """
            SELECT count(*) AS total
            FROM articles
            WHERE search_vector @@ websearch_to_tsquery('russian', ?)
            """;

    private static final String EXACT_SEARCH_SQL = """
            SELECT id, title, published, updated, source,
                   ts_headline('simple', content, phraseto_tsquery('simple', :q)) AS excerpt
            FROM articles
            WHERE search_vector_simple @@ phraseto_tsquery('simple', :q)
            ORDER BY published DESC, id DESC
            LIMIT :limit OFFSET :offset
            """;

    private static final String EXACT_COUNT_SQL = """
            SELECT count(*) AS total
            FROM articles
            WHERE search_vector_simple @@ phraseto_tsquery('simple', ?)
            """;

    @GET
    @Path("/articles")
    public ArticleListResponse latest() {
        return new ArticleListResponse(
                jdbi.withHandle(handle -> handle.createQuery(LATEST_SQL)
                        .registerRowMapper(ConstructorMapper.factory(Article.class))
                        .mapTo(Article.class)
                        .list()));
    }

    @GET
    @Path("/articles/{id}")
    public ArticleResponse article(@PathParam("id") Long id) {
        return new ArticleResponse(
                jdbi.withHandle(handle -> handle.createQuery(ARTICLE_SQL)
                        .bind(0, id)
                        .registerRowMapper(ConstructorMapper.factory(ArticleFull.class))
                        .mapTo(ArticleFull.class)
                        .findOne()
                        .orElseThrow(() -> new NotFoundException())));
    }

    @GET
    @Path("/search")
    public SearchResponse search(@RestQuery String q, @RestQuery Integer page) {
        Pattern pattern = Pattern.compile("^\"([^\"]*)\"$");
        Matcher matcher = pattern.matcher(q);
        var quoted = matcher.find();
        var term = (quoted ? matcher.group() : q).trim();
        if (term.isEmpty()) {
            return new SearchResponse(new ArrayList<>(), 1, 0, 1);
        }

        var pageParam = (page != null && page > 0) ? page : 1;
        var offset = (pageParam - 1) * PAGE_SIZE;
        var searchSql = quoted ? EXACT_SEARCH_SQL : SEARCH_SQL;
        var countSql = quoted ? EXACT_COUNT_SQL : COUNT_SQL;

        int total = jdbi.withHandle(handle -> handle
                .createQuery(countSql)
                .bind(0, term)
                .mapTo(Integer.class)
                .findOne()
                .get());

        int totalPages = (int) Math.ceil(total / PAGE_SIZE);

        List<Article> results = jdbi.withHandle(handle -> handle
                .createQuery(searchSql)
                .bind("q", q)
                .bind("limit", PAGE_SIZE)
                .bind("offset", offset)
                .registerRowMapper(ConstructorMapper.factory(Article.class))
                .mapTo(Article.class)
                .list());

        return new SearchResponse(results, pageParam, total, totalPages);
    }

}
