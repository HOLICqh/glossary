# Chinese Logic Glossary

Small `Next.js` + `TypeScript` glossary app for a Handbook on Chinese logic.

The current application has a deliberately simple model:
- each entry is a formatted heading plus a formatted body
- public visitors can search and read
- editors can edit in place, import, export, create links, and delete

## Actual plan

This project has two distinct modes:

- `Local development mode`: the app can run entirely on one machine, using a local JSON file as a fallback store
- `Real deployment mode`: the app is intended to run as a Next.js web app backed by Supabase for shared multi-user storage

The intended production architecture is:

- `Next.js app` for the interface and server routes
- `Supabase Postgres` for the glossary database
- `Simple app-level editor password/cookie auth` for now

The local JSON file is only a development convenience. It is not the intended production database.

## Current features

- Public list view and entry view
- Editor/view toggle on each entry page
- Autosaving rich-text editing for heading and body
- Tone-insensitive search across headings, body text, hashtags, and Han characters
- Hashtags that remain searchable but disappear in viewer mode
- Internal hotlink creation from selected body text
- Placeholder-entry creation when linking to a missing heading
- Plain text and RTF import
- RTF and plain text export of the current selection
- Optional editor-only quality-control page at `/quality`
- Local test suite with search, import, export, link, and permissions coverage

## Persistence modes

The app now supports two persistence modes:

- `Supabase mode`: enabled when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set
- `Local fallback mode`: uses [data/glossary.json](/Users/jeremyseligman/Documents/Chinese%20Logic%20Glossary/data/glossary.json) through [lib/repository.ts](/Users/jeremyseligman/Documents/Chinese%20Logic%20Glossary/lib/repository.ts)

For real multi-editor deployment, use Supabase mode. The local fallback exists only so the app remains easy to run and test before deployment.

## Stack

- `Next.js` App Router
- `TypeScript`
- Lightweight cookie-based editor auth for local/demo use
- `Vitest` for tests
- Supabase schema files kept in `supabase/` as the intended next persistence target

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Optionally set an editor password:

```bash
EDITOR_PASSWORD=choose-a-password
```

4. For Supabase-backed storage, also set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
```

5. Start the app:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

If `EDITOR_PASSWORD` is not set, the login page exposes a local demo sign-in button that sets an editor cookie in the current browser.

## Supabase setup

1. Create a new Supabase project, ideally in `Southeast Asia (Singapore)`.
2. Apply:
   - [supabase/migrations/202606190001_create_glossary.sql](/Users/jeremyseligman/Documents/Chinese%20Logic%20Glossary/supabase/migrations/202606190001_create_glossary.sql)
   - [supabase/migrations/202606200001_add_heading_rich_text.sql](/Users/jeremyseligman/Documents/Chinese%20Logic%20Glossary/supabase/migrations/202606200001_add_heading_rich_text.sql)
3. Load [supabase/seed.sql](/Users/jeremyseligman/Documents/Chinese%20Logic%20Glossary/supabase/seed.sql) if you want starter data.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` to your local `.env.local` and later to your hosting provider.

The app still accepts the older `SUPABASE_SERVICE_ROLE_KEY` env var name temporarily for compatibility, but `SUPABASE_SECRET_KEY` is the preferred name.

At the moment, editor login is still app-level password/cookie auth, not Supabase Auth user management. Supabase is now used for shared persistence.

## Project structure

- [app](/Users/jeremyseligman/Documents/Chinese Logic Glossary/app): routes, pages, API endpoints, and global styles
- [components](/Users/jeremyseligman/Documents/Chinese Logic Glossary/components): current UI components
- [lib](/Users/jeremyseligman/Documents/Chinese Logic Glossary/lib): search, import/export, auth, text handling, QC, and repository logic
- [supabase](/Users/jeremyseligman/Documents/Chinese Logic Glossary/supabase): schema/migration material for future database-backed deployment
- [tests](/Users/jeremyseligman/Documents/Chinese Logic Glossary/tests): local tests

## Commands

```bash
npm run dev
npm test
npm run build
```

## Current boundaries

- Editor auth is intentionally lightweight and local-friendly
- Supabase is used for storage when configured, but not yet for editor identity management
- Export is currently `rtf`/`txt` for the simplified workflow
- The codebase still includes some forward-looking types and schema material from the richer original plan
- The deployment plan is `Next.js host + Supabase`, not “run the database out of GitHub” or from the local JSON file
