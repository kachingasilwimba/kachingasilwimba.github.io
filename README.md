# Kachinga Silwimba’s Personal Website

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)]()

Welcome to the source repository for **kachingasilwimba.github.io**, hosted using Jekyll with the Minimal Mistakes theme. This site features my portfolio, publications, teaching, talks, and research highlights.

---

##  Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/kachingasilwimba/kachingasilwimba.github.io.git
cd kachingasilwimba.github.io
```

### 2. Install dependencies

Make sure you have Ruby and Bundler installed. Then:

```bash
bundle install
```

### 3. Run locally with Jekyll

```bash
bundle exec jekyll serve
```

Then visit `http://localhost:4000` to preview the site locally.

---

##  Repository Structure

* `_config.yml` — main Jekyll site configuration
* `_pages/`, `_posts/`, `_articles/`, `_talks/`, `_teaching/`, etc. — content directories
* `_layouts/`, `_includes/`, `_sass/` — theme and styling
* `assets/` and `images/` — media assets used on the site
* `CHANGELOG.md` — history of changes and updates
* `LICENSE` — this site's source is published under the MIT License
---

## Features

* **Minimal Mistakes** Jekyll theme with responsive layout
* SEO-optimized content: portfolio, publications, teaching, talks
* Multi-page structure: collections for articles, teaching, and talks
* Site search powered by Jekyll
* Easy customization via `_config.yml`

---

## Customization Tips

* To **update navigation**: edit `_data/navigation.yml`.
* To **change styles or colors**: customize Sass in `_sass/` or override through `_includes/`.
* For **new page templates**: edit or copy files in `_layouts/`.

---

## Build & Deploy

Site is built automatically on GitHub Pages from the `main` branch.
To test locally:

```bash
bundle exec jekyll build  # for production build output
bundle exec jekyll serve  # for live preview
```
---

## Resources

* [Minimal Mistakes Documentation](https://mmistakes.github.io/minimal-mistakes/)
* [Jekyll Official Docs](https://jekyllrb.com/docs/)
* GitHub Pages Guides
