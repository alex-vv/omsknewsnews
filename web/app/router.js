import { writable } from "svelte/store";

function parse() {
  const { pathname, search } = window.location;
  const query = new URLSearchParams(search);
  const match = pathname.match(/^\/articles\/([^/]+)\/?$/);
  if (match) {
    return { name: "article", id: decodeURIComponent(match[1]), query };
  }
  return { name: "search", id: null, query };
}

export const route = writable(parse());

function track() {
  if (window.goatcounter?.count) {
    window.goatcounter.count({
      path: location.pathname || "/",
    });
  }
}

window.addEventListener("popstate", () => {
  route.set(parse());
  track();
});

export function navigate(to, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
  }
  route.set(parse());
  track();
}

export function isPlainLeftClick(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
