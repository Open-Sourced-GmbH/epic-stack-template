# design-sync NOTES

Repo-specific gotchas for syncing this design system to Claude Design. Read this
before re-running `/design-sync`.

## Shape: synth / no-dist (package shape)

- Epic Stack **app**, not a published package — there is no component `dist/`.
  `.design-sync/entry.tsx` is a **barrel** re-exporting the curated 12 components
  (was 9; Accordion, Slider, CommandPalette added 2026-06-19).
- The barrel is kept in lockstep with `app/components/styleguide/specimens.tsx`,
  enforced by `app/components/styleguide/design-sync.test.ts` (vitest, CI).
- DropdownMenu / Tooltip / InputOTP / **Accordion** are **compound** — the barrel
  also exports their sub-parts (`DropdownMenuContent`, `TooltipTrigger`,
  `InputOTPSlot`, `AccordionItem`/`AccordionTrigger`/`AccordionContent`, …) so the
  design agent can compose them; the lockstep test maps each sub-part back to its
  canonical root by name prefix.
- **CommandPalette is the exception to the compound pattern.** `command.tsx` also
  exports raw cmdk primitives (`Command`, `CommandInput`, `CommandList`, …), but
  the carded canonical root is **`CommandPalette`** — the complete, self-contained
  API (`<CommandPalette commands={…} />` renders the whole palette + dialog). Only
  that high-level component is in the barrel/config/previews; the raw primitives
  stay internal so the agent uses the finished palette, not a hand-rebuild. (Root
  `Command` would force the styleguide to import bare `Command`, which it never
  renders; `CommandPalette` is exactly what the `command` specimen imports, so
  lockstep stays honest.)
- **The lockstep test reads `.design-sync/config.json`** (fixed 2026-06-19; it
  previously read `design-sync.config.json` at the repo root, which no longer
  exists after the config moved into `.design-sync/`. That stale path threw on
  every run — the "3 pre-existing failures" — and is why the Accordion/Slider/
  CommandPalette drift slipped past the guard).
- `--entry .design-sync/entry.tsx` points esbuild at that barrel and makes
  `PKG_DIR` resolve to the repo root (`node_modules/epic-stack-template` does not
  exist — the app isn't self-installed). `--node-modules ./node_modules`.
- `#app/*` imports resolve via `package.json` `imports`; `@/icon-name` resolves
  via `tsconfig.json` `paths` (tsconfigPathsPlugin); `icons/sprite.svg` is inlined
  via the `.svg` dataurl loader.

## CSS

- `cssEntry` is the Tailwind v4 **COMPILED** stylesheet
  (`.design-sync/styles.compiled.css`). The raw `app/styles/tailwind.css` is only
  `@import 'tailwindcss'` + token vars and has **no utility classes**.
- On re-sync, refresh it: `pnpm build`, then `pnpm design-sync:css` (globs the
  hashed `build/client/assets/tailwind-*.css` → `.design-sync/styles.compiled.css`;
  the hash changes each build, so never hand-copy). `pnpm design-sync:prepare`
  does both plus the snapshot.
- In a **sandboxed agent shell** `pnpm design-sync:css` (a `tsx` script) can fail;
  `pnpm build` works. Fallback: `cp` the single `build/client/assets/tailwind-*.css`
  (the glob is guaranteed to match exactly one) to `.design-sync/styles.compiled.css`
  by hand — same result the script produces.
- `guidelinesGlob: []` on purpose — the default glob sweeps `docs/*.md`, which here
  are Epic Stack operational docs (database/deployment/caching), not design guidance.

## Previews

- All 12 previews under `.design-sync/previews/` are **HAND-OWNED** (no marker
  line) — they mirror the variant grids in `specimens.tsx` (Button variants+sizes,
  StatusButton 4 states, Input 3 states, Checkbox 3 states, Label+Input field,
  Textarea, plus DropdownMenu/Tooltip/InputOTP compound specimens rendered open,
  Accordion single-open, Slider default + gradient track, CommandPalette
  Results + EmptyState rendered inline). Held one-to-one with the curated set by
  `design-sync.test.ts`.
- The converter leaves marker-less files untouched, so `dtsPropsFor` is the only
  props config that matters; do **not** add `previewArgs` for these.
- `dtsPropsFor` hand-writes each `<Name>Props` because synth/no-dist mode has no
  shipped component `.d.ts`; `findTypesRoot` resolves the repo's `types/` dir
  (icon-name only), so auto-extraction would degrade to an index signature.
- **NOT curated:** `icon.tsx` (a sprite primitive — see Known limitations) and
  `sonner.tsx` (an imperative toaster with no static specimen).

## Card groups

- Card groups (Actions/Forms/etc.) come from `manifest.json` and are applied at
  register-time, not derived by the converter.

## Known render warns (triaged — not new on re-sync)

- `[CSS_RUNTIME]` — expected and **non-blocking**. The Tailwind token vars +
  utilities all live in `_ds_bundle.css` (linked alongside `styles.css` per the
  README contract), so an empty `tokens/` is cosmetic; components still render
  styled.
- `[GRID_OVERFLOW]` on **DropdownMenu** and **Tooltip** — expected and
  **non-blocking**. Both are portal/overlay specimens rendered `open`, so their
  content escapes the grid cell; no grid layout can present a portal. Pre-existing
  (these shipped in the original 9). Optional polish: set
  `cfg.overrides.{DropdownMenu,Tooltip}: {"cardMode": "single", "primaryStory":
  "Open"}` and batch-rebuild — left as-is for now since the cards still convey the
  component. CommandPalette renders **inline** (no portal) so it does NOT overflow.

## Known limitations

- **StatusButton status glyphs (pending spinner / success check / error cross) do
  not paint** in the bundle/previews. `icon.tsx` does
  `<use href={`${spriteDataUrl}#name`}>` and esbuild inlines `icons/sprite.svg` as
  a `data:` URL; Chrome refuses to resolve `<use>` fragment refs into a data-URL
  document. The real app works because it serves `sprite.svg` same-origin. The
  button + states + text render correctly; only the inner glyph is missing. Proper
  fix needs the sprite served same-origin or its `<symbol>`s inlined into the host
  document (a claude.ai/design environment concern) — not fixable via converter
  config without forking `bundle.mjs` (discouraged).
- **Same sprite limitation affects every icon-using preview**: Accordion's plus
  icon (the open-state 45° rotate) and CommandPalette's search glyph + per-command
  tile glyphs don't paint either. The brand *tile* (`bg-brand`), the brand-soft
  selection, the rotate transform, and all text/layout DO render — only the inner
  `<use>` glyph is missing. Same root cause and same non-fix as StatusButton.

## Re-sync risks (what can silently go stale)

- **`styles.compiled.css` is a build artifact** — if a re-sync forgets
  `pnpm design-sync:css` after a token/utility change, the bundle ships stale CSS.
  CI guards freshness (`🎨 Design-sync CSS freshness` job).
- **The curated set is enforced by `design-sync.test.ts`** — adding/removing a
  `ui/*` component without updating the barrel + previews + specimens fails CI, not
  the converter. Keep all four in lockstep.
- **`dtsPropsFor` is hand-written** — if a component's real props change, its
  `<Name>Props` here won't follow automatically; update by hand.
- **StatusButton glyph** limitation above is environment-level; re-check only if
  claude.ai/design changes how it serves bundle assets.
