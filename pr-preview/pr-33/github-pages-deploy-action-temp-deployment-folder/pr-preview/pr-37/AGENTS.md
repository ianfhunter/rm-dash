# AGENTS.md

## Cursor Cloud specific instructions

This is a purely static HTML/CSS/JS project (no build system, no package manager, no dependencies to install). It serves as a set of tabletop RPG utilities hosted on GitHub Pages.

### Running the app

Serve the repo root over HTTP. The Loot tab uses `fetch()` to load `RMMagicItems.xlsx`, so `file://` protocol will not work.

```bash
python3 -m http.server 8000 --directory /workspace
```

Then open `http://localhost:8000/` in a browser.

### Key caveats

- **No linting or automated tests exist** in this repo. There is no `package.json`, no test framework, and no CI configuration.
- The only external runtime dependency is **SheetJS (`xlsx@0.18.5`)** loaded from the jsDelivr CDN, plus **Google Fonts** (Cinzel, EB Garamond). Internet connectivity is required for these CDN resources.
- Cart state persists in the browser's `localStorage` under key `rm-loot-cart-v1`.

### Project structure

```
index.html              – single-page app entry point
RMMagicItems.xlsx       – magic item data (read client-side by SheetJS)
assets/css/style.css    – all styles
assets/js/tabs.js       – tab switching logic
assets/js/boopsum.js    – XP/gold calculator ("BoopSum" tab)
assets/js/loot.js       – spreadsheet browser + cart ("Loot" tab)
```
