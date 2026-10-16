#!/usr/bin/env python3
import json
import os
import re
import sys

from bs4 import BeautifulSoup

URL_PREFIX = "http://omsknews.ru/"
EXCLUDE_DIRS = {
    "archive", "errordocs", "paper", "pic",
    "script", "wp-admin", "wp-content", "wp-includes",
}
OPTIONAL_FIELDS = ("lead", "updated", "categories", "sourceId")


def code_from_href(href, key):
    match = re.search(r"[?&]%s=(\d+)" % key, href or "")
    return int(match.group(1)) if match else None


def to_iso(time_node):
    if time_node is None:
        return None
    raw = time_node.get_text(strip=True)
    match = re.fullmatch(r"(\d{2})\.(\d{2})\.(\d{4})", raw)
    if match:
        day, month, year = match.groups()
        return "%s-%s-%s" % (year, month, day)
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", time_node.get("datetime", ""))
    return "%s-%s-%s" % match.groups() if match else raw


def parse_new(html, url):
    soup = BeautifulSoup(html, "html.parser")
    title = soup.select_one(".entry-title")
    lead = soup.select_one(".entry-lead")
    content = soup.select_one(".entry-content")
    posted_on = soup.select_one(".posted-on")
    published = posted_on.select_one(".published") if posted_on else None
    updated = posted_on.select_one(".updated") if posted_on else None
    author = soup.select_one(".author")
    fn = author.select_one(".fn") if author else None
    url_link = author.select_one(".url") if author else None

    record = {
        "title": title.get_text(strip=True) if title else None,
        "lead": lead.get_text(strip=True) if lead else None,
        "content": content.decode_contents().strip() if content else None,
        "published": to_iso(published),
        "updated": to_iso(updated),
        "source": fn.get_text(strip=True) if fn else None,
        "sourceId": code_from_href(url_link.get("href") if url_link else None, "author"),
        "categories": [c for c in (
            code_from_href(a.get("href"), "cat") for a in soup.select(".cat-links a")
        ) if c is not None],
        "url": url,
    }
    return record


def parse_legacy_source(source_node):
    if source_node is None:
        return None, None
    text = source_node.get_text("\n", strip=True)
    for line in text.splitlines():
        match = re.search(r"\((\d{2})\.(\d{2})\.(\d{4})\)", line)
        if match:
            name = line[:match.start()].strip()
            day, month, year = match.groups()
            return (name or None), "%s-%s-%s" % (year, month, day)
    return None, None


def parse_old(html, url):
    soup = BeautifulSoup(html, "html.parser")
    title_node = soup.find(class_="TitleM")
    content_node = title_node.find_next("div", attrs={"align": "justify"}) if title_node else None
    source_node = soup.find(class_="Source")

    source, published = parse_legacy_source(source_node)
    if published is None:
        title_pos = html.find("TitleM")
        window = html[:title_pos] if title_pos != -1 else html
        dates = re.findall(r"(\d{2})\.(\d{2})\.(\d{4})", window)
        if dates:
            day, month, year = dates[-1]
            published = "%s-%s-%s" % (year, month, day)

    record = {
        "title": title_node.get_text(strip=True) if title_node else None,
        "lead": None,
        "content": content_node.decode_contents().strip() if content_node else None,
        "published": published,
        "updated": None,
        "source": source,
        "sourceId": None,
        "categories": [],
        "url": url,
    }
    return record


def parse_old_notitle(html, url):
    soup = BeautifulSoup(html, "html.parser")
    source_node = soup.find(class_="Source")

    root = source_node.parent.parent if source_node and source_node.parent else None

    title = None
    content_node = None
    date_text = None
    if root is not None:
        divs = root.find_all("div", recursive=False)
        if len(divs) >= 2:
            date_text = divs[0].get_text(" ", strip=True)
            content_node = divs[1]
            first_p = content_node.find("p")
            if first_p is not None:
                bold = first_p.find("b")
                title = (bold or first_p).get_text(strip=True) or None
                first_p.extract()

    source, published = parse_legacy_source(source_node)
    if published is None:
        dates = re.findall(r"(\d{2})\.(\d{2})\.(\d{4})", date_text or "")
        if dates:
            day, month, year = dates[-1]
            published = "%s-%s-%s" % (year, month, day)

    record = {
        "title": title,
        "lead": None,
        "content": content_node.decode_contents().strip() if content_node else None,
        "published": published,
        "updated": None,
        "source": source,
        "sourceId": None,
        "categories": [],
        "url": url,
    }
    return record


def parser_for(name):
    if name.startswith("index.php3"):
        return parse_old if re.search(r"[?&]id=", name) else None
    if name.startswith("print.php3"):
        return parse_old
    if name == "index.html":
        return parse_new
    return None


def read_file(path):
    encoding = "utf-8" if path.endswith("index.html") else "cp1251"
    with open(path, "r", encoding=encoding, errors="replace") as handle:
        return handle.read()


def missing_fields(record):
    return [
        field for field, value in record.items()
        if field not in OPTIONAL_FIELDS and (value is None or value == [])
    ]


def is_excluded_dir(name):
    if name in EXCLUDE_DIRS:
        return True
    if name.startswith("index.php?"):
        return True
    if name.startswith("?") and not name.startswith("?p="):
        return True
    return False


def collect(base_dir, errors_path="errors.log"):
    results = []
    with open(errors_path, "w", encoding="utf-8") as errors:
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = sorted(d for d in dirs if not is_excluded_dir(d))
            for name in sorted(files):
                parser = parser_for(name)
                if parser is None:
                    continue
                path = os.path.join(root, name)
                rel = os.path.relpath(path, base_dir).replace(os.sep, "/")
                url = URL_PREFIX + rel.replace("print.php3", "index.php3")
                html = read_file(path)
                record = parser(html, url)
                if parser is parse_old and record["title"] is None and record["content"] is None:
                    record = parse_old_notitle(html, url)
                missing = missing_fields(record)
                if missing:
                    errors.write("%s missing: %s\n" % (path, ", ".join(missing)))
                    errors.flush()
                    continue
                results.append(record)
    return results


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: parse.py <base_dir> [output.json]")
    base_dir = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) > 2 else None
    text = json.dumps(collect(base_dir), ensure_ascii=False, indent=2)
    if output:
        with open(output, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")
    else:
        print(text)


if __name__ == "__main__":
    main()
