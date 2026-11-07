# Fermata

A static web app that takes [Markwhen](https://markwhen.com/) documents and visualizes them in multiple views: calendar, Gantt, timeline, list, Kanban, and agenda.

<!-- screenshot placeholder -->

## Features

- **Multiple views** — Calendar (month/week), Gantt chart, cascading timeline, sortable list, Kanban board, and agenda
- **Live editor** — CodeMirror 6 with Markwhen syntax highlighting, side-by-side with the visualization
- **Surgical editing** — Click any task in any view to edit it via a form; changes are applied directly to the source text preserving comments and formatting
- **Import/Export** — Import `.mw`/`.md` files, export text or multi-view PDF
- **Themes** — Light, dark, and system-preference modes
- **i18n** — Spanish (default), Valencian, and English
- **Offline** — No backend, no external services. Everything runs in the browser
- **Persistent** — Auto-saves to localStorage

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/fermata/](http://localhost:5173/fermata/) in your browser.

## Building

```bash
npm run build
npm run preview
```

## Testing

```bash
npm test
```

## Deploying to GitHub Pages

Push to `main` and the GitHub Action at `.github/workflows/deploy.yml` will build and deploy automatically.

Or deploy manually:

```bash
npm run build
# Upload dist/ to your hosting
```

Make sure `vite.config.ts` has `base: '/fermata/'` matching your repository name.

## Markwhen syntax

Fermata uses the [Markwhen](https://docs.markwhen.com/) syntax. See `examples/proyecto-demo.mw` for a sample project.

Key features supported:
- Date ranges: `2024-01-15 / 2024-02-10: Task name`
- Single dates (milestones): `2024-03-01: Milestone`
- Sections: `# Section Name`
- Tags with colors: `#tagname: #hexcolor`
- Assignees: `assignee: Name` (as event property)
- Kanban status: `#todo`, `#doing`, `#done` tags

## License

© 2026 José Luis Miralles Bono ([jlmirall.es](https://jlmirall.es)) · joseluismirallesbono@gmail.com

- **Code:** [GNU AGPL v3](LICENSE). You may use, study, modify and redistribute it, also commercially, as long as
  anything you derive from it is published under the same license with its source code available, including
  when offered as a web service.
- **Content** (texts, documentation, examples): [CC BY-SA 4.0](LICENSE-CONTENIDOS).

Versions published before 7 November 2026 were released under the MIT license and keep it.
