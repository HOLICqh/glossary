# AGENTS.md

## Actual plan

- The real target architecture is `Next.js app + Supabase database`.
- The local JSON store at `data/glossary.json` is a fallback for development only.
- Production and shared-editor use should assume Supabase-backed persistence.
- Current editor authentication is app-level password/cookie auth, not Supabase Auth user management.

## Conventions

- Keep glossary rules in `lib/` so search, export, QC, and import behavior stay consistent.
- Treat the live UI model as `heading + body`, even if internal types retain extra legacy fields.
- Prefer the current in-place entry workflow over separate edit pages or large form-heavy admin screens.
- Store heading and body content as HTML strings and keep HTML manipulation helpers centralized.
- Use `sort_key` as the authoritative alphabetical order for exports and ordered result sets.
- Treat placeholder creation and internal linking as editorial workflows, not just UI affordances.

## Commands

- Install dependencies: `npm install`
- Start local dev server: `npm run dev`
- Run tests: `npm test`
- Build production bundle: `npm run build`

## Testing focus

- Search normalization and tone-insensitive matching
- Han-character matching
- Placeholder creation and internal link insertion
- Export ordering and rich-text preservation
- Permission helpers
- Import/export round-tripping for the simplified heading/body format

## Collaboration notes

- Preserve the simple public-read / editor-write split unless a real hosted auth system replaces it.
- If you touch auth, keep local password auth lightweight and easy to understand.
- If you touch persistence, note clearly whether the code still relies on `data/glossary.json` or Supabase.
- If you deepen the editor, prefer incremental enhancements over swapping in a large editor framework all at once.
- Before deployment work, assume Supabase-backed persistence is the intended path and file-backed persistence is temporary.
