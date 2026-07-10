# Croatian Tools

A static GitHub Pages site for Croatian practice tools.

## Structure

- `index.html` contains the page markup and module entrypoint.
- `assets/css/styles.css` contains all styling.
- `assets/js/app.js` contains the app behavior for the current practice tool.
- `assets/js/nominative-plural-data.js` contains the noun list and visual cues for nominative plural practice.

## Local Development

Run a local static server from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

GitHub Pages serves the same static files from the `main` branch.
