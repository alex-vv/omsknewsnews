package ru.omsknewsnews.web;

import io.quarkus.vertx.web.Route;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SpaRoutes {

    @Route(path = "/articles/*", methods = Route.HttpMethod.GET, order = 10_000)
    void articles(RoutingContext rc) {
        rc.reroute("/index.html");
    }
}
