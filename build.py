#!/usr/bin/env python3
"""Generate index.html from data/tangshi300.json."""

from html import escape
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "tangshi300.json"
CSS_PATH = ROOT / "style.css"
JS_PATH = ROOT / "search.js"
OUT_PATH = ROOT / "index.html"


def split_clauses(line: str) -> list[str]:
    """Split a verse line into clauses after Chinese pause/end punctuation so narrow
    screens wrap strictly at clause boundaries instead of mid-phrase."""
    parts = [p for p in re.split(r"(?<=[，；：？！])", line) if p]
    return parts or [line]


def render_verse(line: str) -> str:
    clauses = "".join(
        f'<span class="clause" style="--clause-i:{idx}">{escape(clause)}</span>'
        for idx, clause in enumerate(split_clauses(line))
    )
    return f'          <p class="verse">{clauses}</p>'


def build() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    css = CSS_PATH.read_text(encoding="utf-8").strip().replace("</style>", "<\\/style>")
    js = JS_PATH.read_text(encoding="utf-8").strip().replace("</script>", "<\\/script>")
    sections = data["sections"]
    total = data["total"]

    toc_html = []
    main_html = []

    for sec_idx, sec in enumerate(sections, start=1):
        sec_id = f"sec-{sec_idx}"
        sec_type = escape(sec["type"])
        sec_count = len(sec["poems"])

        toc_items = []
        poem_articles = []

        for poem in sec["poems"]:
            pid = escape(poem["id"])
            title = escape(poem["title"])
            author = escape(poem["author"])
            alt = poem.get("alt_title")
            lines = poem["lines"]
            notes = poem.get("notes") or []

            search_blob = " ".join(
                part
                for part in (
                    poem["title"],
                    alt or "",
                    poem["author"],
                    sec["type"],
                    "".join(lines),
                )
                if part
            )
            toc_items.append(
                f'          <li data-q="{escape(search_blob, quote=True)}">'
                f'<a href="#{pid}">'
                f'<span class="toc-title">{title}</span>'
                f'<span class="toc-author">{author}</span>'
                f"</a></li>"
            )

            header_parts = [f'          <h3 class="poem-title">{title}</h3>']
            if alt:
                header_parts.append(f'          <p class="poem-alt">又題：{escape(alt)}</p>')
            header_parts.append(f'          <p class="poem-author">{author}</p>')

            verses_html = "\n".join(render_verse(line) for line in lines)
            notes_html = ""
            if notes:
                joined_notes = escape("；".join(notes))
                notes_html = f'\n        <footer class="poem-notes">校註：{joined_notes}</footer>'

            poem_articles.append(
                f'      <article class="poem" id="{pid}">\n'
                f'        <header class="poem-header">\n'
                f'{"\n".join(header_parts)}\n'
                f"        </header>\n"
                f'        <div class="poem-body">\n'
                f"{verses_html}\n"
                f"        </div>{notes_html}\n"
                f"      </article>"
            )

        toc_html.append(
            f'      <details class="toc-group" open>\n'
            f'        <summary><span class="toc-group-label">{sec_type}</span>'
            f'<span class="toc-count">{sec_count}</span></summary>\n'
            f'        <ol class="toc-list">\n'
            f'{"\n".join(toc_items)}\n'
            f"        </ol>\n"
            f"      </details>"
        )

        main_html.append(
            f'    <section class="poems-section" id="{sec_id}">\n'
            f'      <h2 class="section-heading">{sec_type}</h2>\n'
            f'{"\n".join(poem_articles)}\n'
            f"    </section>"
        )

    html = f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>{escape(data["title"])}</title>
  <style>
{css}
  </style>
</head>
<body>
  <input id="sidebar-toggle" class="sidebar-toggle" type="checkbox" aria-label="切換目錄顯示">
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <header class="sidebar-header">
        <div class="sidebar-title-row">
          <h1 class="book-title"><a href="#sec-1">{escape(data["title"])}</a></h1>
          <label for="sidebar-toggle" class="sidebar-close" title="左滑或點擊隱藏目錄" aria-label="隱藏目錄">‹</label>
        </div>
        <p class="book-meta">{escape(data["editor"])} · 共 {total} 首</p>
        <div class="search-box">
          <input
            id="toc-search"
            class="search-input"
            type="search"
            placeholder="搜尋詩題、作者或詩句…"
            autocomplete="off"
            spellcheck="false"
            aria-label="搜尋詩題、作者或詩句"
          >
          <output id="search-status" class="search-status" for="toc-search" aria-live="polite"></output>
        </div>
      </header>
      <nav class="toc" aria-label="詩歌目錄">
{"\n".join(toc_html)}
      </nav>
      <footer class="sidebar-footer">
        <details class="settings-panel">
          <summary>設置</summary>
          <div class="settings-body">
            <div class="setting-field">
              <div class="setting-head">
                <label for="scan-dur-range">單句掃描</label>
                <span class="setting-input-wrap">
                  <input id="scan-dur-num" class="setting-num" type="number" min="0" max="10000" step="50" value="2500" aria-label="單句掃描毫秒數">
                  <span>ms</span>
                </span>
              </div>
              <input id="scan-dur-range" class="setting-range" type="range" min="0" max="10000" step="50" value="2500">
            </div>
            <div class="setting-field">
              <div class="setting-head">
                <label for="scan-delay-range">上下句延遲</label>
                <span class="setting-input-wrap">
                  <input id="scan-delay-num" class="setting-num" type="number" min="0" max="10000" step="50" value="1250" aria-label="上下句延遲毫秒數">
                  <span>ms</span>
                </span>
              </div>
              <input id="scan-delay-range" class="setting-range" type="range" min="0" max="10000" step="50" value="1250">
            </div>
            <div class="settings-actions">
              <button type="button" class="setting-action" id="reset-reveal">重新隱藏詩句</button>
              <button type="button" class="setting-action" id="reset-settings">恢復預設</button>
            </div>
          </div>
        </details>
      </footer>
    </aside>
    <label for="sidebar-toggle" class="sidebar-backdrop" aria-hidden="true"></label>
    <label for="sidebar-toggle" class="sidebar-open" title="顯示目錄" aria-label="顯示目錄">目錄</label>

    <main class="reader" id="reader" tabindex="-1">
      <div class="reader-inner">
{"\n".join(main_html)}
      </div>
    </main>
  </div>
  <script>
{js}
  </script>
</body>
</html>
"""

    OUT_PATH.write_text(html, encoding="utf-8")
    print(f"Generated {OUT_PATH.name} ({len(html):,} bytes, {total} poems).")


if __name__ == "__main__":
    build()
