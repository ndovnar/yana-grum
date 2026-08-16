# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript single-page app for Yana Grum. Keep application UI in `src/`:

- `src/App.tsx` contains the public site, calendar, footer, and simple route selection.
- `src/App.css` holds component and responsive styles; `src/index.css` contains global Tailwind/font setup.
- `src/lib/firebase.ts` owns Firebase initialization and environment-variable access.
- `public/images/` contains production image assets such as the logo and hero image. Reference them with root paths, for example `/images/yana-grum-logo.png`.

Do not place generated build output (`dist/`) under source control.

## Build, Test, and Development Commands

- `npm run dev` — starts the Vite development server with hot reload.
- `npm run build` — type-checks with TypeScript and creates the production bundle in `dist/`.
- `npm run lint` — runs Oxlint over the project.
- `npm run preview` — serves the built bundle locally; run `npm run build` first.

Run `npm run build` after UI or TypeScript changes. Run `npm run lint` before handing off broader changes.

## Coding Style & Naming Conventions

Use TypeScript and functional React components. Name components in `PascalCase` (`Calendar`, `WhatsAppIcon`), variables and functions in `camelCase`, and CSS classes in lowercase kebab-case (`contact-detail-grid`). Preserve the existing two-space indentation in `.tsx` files. Keep Polish customer-facing copy consistent; internal identifiers and code comments should be English.

Prefer Lucide icons where possible. Brand icons or static artwork belong in `public/`, not inline base64 data. Keep visual changes responsive at the `720px` breakpoint already used in `App.css`.

## Testing Guidelines

No automated test framework is configured yet. For every change, run `npm run build`; for interactive calendar, links, or responsive layout changes, also check the page manually in a desktop and mobile viewport. If tests are introduced, place them next to the component as `Component.test.tsx`.

## Commit & Pull Request Guidelines

The available history only contains a `wip` commit, so no established convention exists. Use concise imperative messages such as `feat: add public calendar states` or `fix: align footer contact icons`. Keep each commit focused. Pull requests should describe the user-visible change, note Firebase/configuration impact, link relevant issues, and include screenshots for design changes.

## Security & Configuration

Firebase settings are read from Vite environment variables. Never commit real credentials or `.env` files; update `.env.example` when adding a required public configuration key. Administrative data access must remain protected by Firebase Authentication and Firestore rules.
