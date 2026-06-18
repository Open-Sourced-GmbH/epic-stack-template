# design-sync NOTES

Repo-specific gotchas for syncing this design system to Claude Design. Read this
before re-running `/design-sync`.

## Shape: synth / no-dist (package shape)

- Epic Stack **app**, not a published package — there is no component `dist/`.
  `.design-sync/entry.tsx` is a **barrel** re-exporting the curated 9 components.
- The barrel is kept in lockstep with `app/components/styleguide/specimens.tsx`,
  enforced by `app/components/styleguide/design-sync.test.ts` (vitest, CI).
- DropdownMenu / Tooltip / InputOTP are **compound** — the barrel also exports
  their sub-parts (`DropdownMenuContent`, `TooltipTrigger`, `InputOTPSlot`, …) so
  the design agent can compose them; the lockstep test maps each sub-part back to
  its canonical root by name prefix.
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
- `guidelinesGlob: []` on purpose — the default glob sweeps `docs/*.md`, which here
  are Epic Stack operational docs (database/deployment/caching), not design guidance.

## Previews

- All 9 previews under `.design-sync/previews/` are **HAND-OWNED** (no marker
  line) — they mirror the variant grids in `specimens.tsx` (Button variants+sizes,
  StatusButton 4 states, Input 3 states, Checkbox 3 states, Label+Input field,
  Textarea, plus DropdownMenu/Tooltip/InputOTP compound specimens rendered open).
  Held one-to-one with the curated set by `design-sync.test.ts`.
- The converter leaves marker-less files untouched, so `dtsPropsFor` is the only
  props config that matters; do **not** add `previewArgs` for these 9.
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
