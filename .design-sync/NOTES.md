# design-sync NOTES

Repo-specific gotchas for syncing this design system to Claude Design. Read this
before re-running `/design-sync`.

## Shape: synth / no-dist (package shape)

- Epic Stack **app**, not a published package — there is no component `dist/`.
  `.design-sync/entry.tsx` is a **barrel** re-exporting the curated **23**
  components (was 9 → 12 with Accordion/Slider/CommandPalette on 2026-06-19 →
  **21** on 2026-06-20 with the EPT-21–36 hardening: **Alert, Avatar, Badge,
  Card, Dialog, Field, Select, Skeleton, Spinner**, all synced 2026-06-20 →
  **23** on 2026-06-22 with Slice ②'s net-new primitives **Pagination**
  (EPT-41) + **TagInput** (EPT-48), synced 2026-06-22).
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
  - **⌘K binding + loading:** the palette registers no global hotkey — the
    consumer wires ⌘K / Ctrl-K (canonical snippet in `command.tsx`'s doc comment
    and `conventions.md`). For remote command sources, pass `loading` to swap the
    list for Skeleton/Spinner placeholders; the `command-loading` specimen +
    `CommandPalette.Loading` preview cover that state (EPT-36).
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

- All 21 previews under `.design-sync/previews/` are **HAND-OWNED** (no marker
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

## Known validate FAILS that are false-positives (do NOT block upload)

- **`✗ [BUNDLE_EXPORT] N/N not a component on window.EpicUI`** — appeared with
  skill v2.1.181's new bundle-export smoke check (2026-06-22). The smoke loads
  the bundle via `page.setContent` / `addScriptTag` (dynamic injection), where
  this synth-entry bundle's `window.React` externals interop doesn't land →
  `window.EpicUI` reads empty → all N components flagged. **Proven false** by
  loading the bundle the REAL way (parser-inserted `<script src>` in a served
  doc, exactly how the claude.ai/design app + the preview cards load it):
  `window.EpicUI` has **72 exports** incl. Pagination/TagInput, React set, zero
  pageerrors. The per-preview render check (which uses self-contained
  `window.__dsPreview`, not `window.EpicUI`) also passes 23/23. So this `fail()`
  is a smoke-method artifact, not a bundle defect — verify with a parser-load
  probe and proceed. (If a future skill version fixes the smoke to use a real
  document load, this note can go.)

## Known render warns (triaged — not new on re-sync)

- `[FONT_MISSING] "Cascadia Code", "Source Code Pro"` — NEW 2026-06-22 with the
  ADR-064 `--font-mono` stack (code blocks + the editor's md textarea). The DS
  ships no `@font-face` for them; the DS pane renders code in the system mono
  fallback. Expected and **non-blocking** — these are host-app-provided code
  fonts, not brand families worth bundling. Same triage as the other warns.
- `[TOKENS_MISSING]` now also lists `--shell-max` (Slice ② layout token) — same
  family as `--tw-*`: a layout/runtime var, not a semantic design token;
  non-blocking.

- `[CSS_RUNTIME]` — expected and **non-blocking**. The Tailwind token vars +
  utilities all live in `_ds_bundle.css` (linked alongside `styles.css` per the
  README contract), so an empty `tokens/` is cosmetic; components still render
  styled.
- `[GRID_OVERFLOW]` on **DropdownMenu**, **Tooltip**, and **Select** — expected
  and **non-blocking**. All three are portal/overlay specimens rendered `open`, so
  their content escapes the grid cell; no grid layout can present a portal.
  DropdownMenu/Tooltip are pre-existing (original 9); **Select** joined on
  2026-06-20 (its `Open` story renders the panel). Optional polish: set
  `cfg.overrides.{DropdownMenu,Tooltip,Select}: {"cardMode": "single",
  "primaryStory": "Open"}` and batch-rebuild — left as-is for now since the cards
  still convey the component. CommandPalette renders **inline** (no portal) so it
  does NOT overflow.
- `[TOKENS_MISSING]` (~15 vars: `--tw-*` engine internals + code/syntax-highlight
  vars) — expected and **non-blocking**, same family as `[CSS_RUNTIME]`. These are
  runtime/utility vars, not semantic design tokens; the filtered `styles.compiled.css`
  (css-token-filter, EPT-21) drops the `--tw-*` *declarations* from the token
  surface so `check_design_system` stays clean. Don't chase.

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
