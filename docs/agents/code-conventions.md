# Code conventions

## Path aliases

Use `#app/` and `#tests/` prefixes (defined in `package.json` `"imports"`).
Never use relative paths that cross module boundaries.

## File naming

- `*.server.ts` for server-only files.
- Route files follow React Router v7 flat-file conventions with dot-delimited
  segments.
- Colocated route assets use the `+` prefix.

## SSR-first

All routes are server-rendered by default. Only opt out with a clear reason.

## Design tokens

Use `@theme` tokens from `app/styles/tailwind.css`. Never hardcode colors,
fonts, or radii.

## Localization

> Document your project's user-facing language conventions here (locale, tone,
> typographic rules). Default is English.

Code, comments, and commits stay in English regardless of the UI language.
