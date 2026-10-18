# /// script
# dependencies = ["pyyaml"]
# ///
"""Writes site/cv/index.html, the CV as a page in the site's style, from resume_en.yaml.

The PDF comes from the same file through RenderCV; see build.sh.
"""

import html
import re
from datetime import date
from pathlib import Path

import yaml

HERE = Path(__file__).parent
OUT = HERE.parent / "site" / "cv" / "index.html"
PDF = "/Bohdan_Barulin_CV.pdf"

cv = yaml.safe_load((HERE / "resume_en.yaml").read_text())["cv"]
sections = cv["sections"]


def inline(text):
    """The bit of Markdown RenderCV entries use: **bold** and [links](url)."""
    text = html.escape(str(text), quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    return re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', text)


def when(entry):
    """Dates the way RenderCV prints them: Dec 2025 – Aug 2026, 2024 – 2028, Spring 2026."""

    def one(value):
        value = str(value)
        if m := re.fullmatch(r"(\d{4})-(\d{2})", value):
            return date(int(m[1]), int(m[2]), 1).strftime("%b %Y")
        return value

    if "date" in entry:
        return one(entry["date"])
    return f"{one(entry['start_date'])} – {one(entry.get('end_date', 'present'))}"


def highlights(entry):
    items = "".join(f"\n            <li>{inline(h)}</li>" for h in entry.get("highlights", []))
    return f"\n          <ul>{items}\n          </ul>" if items else ""


def row(id, title, body):
    return f"""
    <section class="row" aria-labelledby="{id}">
      <div class="side">
        <h2 id="{id}">{title}</h2>
      </div>
      <div class="body{' jobs' if '<article>' in body else ''}">{body}
      </div>
    </section>
"""


def article(heading, sub, entry):
    return f"""
        <article>
          <h3>{heading}</h3>
          <p class="when">{sub}</p>{highlights(entry)}
        </article>"""


summary = "".join(f"\n        <p>{inline(p)}</p>" for p in sections["Summary"])
skills = "".join(
    f"\n          <dt>{inline(s['label'])}</dt>\n          <dd>{inline(s['details'])}</dd>" for s in sections["Skills"]
)
experience = "".join(
    article(inline(e["position"]), f"{inline(e['company'])} · {when(e)}", e) for e in sections["Experience"]
)
projects = "".join(article(inline(p["name"]), when(p), p) for p in sections["Projects"])
education = "".join(
    article(inline(e["institution"]), f"{inline(e['degree'])} in {inline(e['area'])} · {when(e)}", e)
    for e in sections["Education"]
)
social = {s["network"]: s["username"] for s in cv["social_networks"]}

page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CV – {cv['name']}</title>
  <meta name="description" content="CV of {cv['name']}, {cv['headline']}, {cv['location']}.">
  <link rel="canonical" href="https://x0ryz.dev/cv/">
  <link rel="icon" href="/favicon-winter.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#eef0f2" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#161b22" media="(prefers-color-scheme: dark)">
  <link rel="preload" href="/fonts/onest-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/style.css">
  <script src="/season-pick.js"></script>
</head>
<body>
  <!-- Written by cv/page.py from cv/resume_en.yaml: edit those, not this file -->
  <main class="cv">
    <header class="intro">
      <p class="home"><a href="/">x0ryz.dev</a></p>
      <h1>{cv['name']}</h1>
      <div class="intro-text">
        <p class="lede">{inline(cv['headline'])}</p>
        <p>{inline(cv['location'])}</p>
        <p class="links reach">
          <a href="{PDF}" download>Download PDF</a>
          <a href="mailto:{cv['email']}">{cv['email']}</a>
          <a href="https://github.com/{social['GitHub']}">GitHub</a>
          <a href="https://www.linkedin.com/in/{social['LinkedIn']}">LinkedIn</a>
        </p>
      </div>
    </header>
{row("summary", "Summary", summary)}{row("skills", "Skills", f'''
        <dl class="skills">{skills}
        </dl>''')}{row("experience", "Experience", experience)}{row("projects", "Projects", projects)}{row("education", "Education", education)}  </main>
</body>
</html>
"""

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(page)
print(f"Wrote {OUT.relative_to(HERE.parent)}")
