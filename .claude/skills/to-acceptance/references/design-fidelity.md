# Design fidelity checks

The design half of acceptance — the part live-verification loops usually skip.
Goal: prove the shipped feature uses the real design system, not a parallel
re-implementation. The living [`/styleguide`](../../../docs/agents/styleguide.md)
route is the source of truth; tokens live in `app/styles/tailwind.css`.

## D1-1 — Token drift (unattended)

Every color, radius, and font in the diff must map to an `@theme` token; never
hardcode them
([code-conventions](../../../docs/agents/code-conventions.md#design-tokens)).
Grep only the files the branch changed:

```bash
# changed app/ files vs develop, scanned for raw color/radius/font literals
git diff --name-only develop... -- 'app/**/*.{ts,tsx,css}' \
  | xargs grep -nED '#[0-9a-fA-F]{3,8}\b|rg(b|ba)\(|oklch\(|hsl\(|border-radius:|font-family:' \
    2>/dev/null
```

Hits in `app/styles/tailwind.css` (the `@theme` definitions themselves) and the
theme/accent generator are expected — everything else is a finding. Tailwind
utility classes (`rounded-md`, `text-brand`) are fine; raw literals in `style=`
or CSS are not.

## D1-2 — `ui/*` reuse + net-new (unattended)

Walk the grounded design spec's **Grounded UI** table. For each element, confirm
the shipped JSX uses the named `app/components/ui/*` component with the right
variant/props — not a bespoke re-implementation. Net-new components/tokens must
have landed through `/to-grounded-design`: a specimen in
`app/components/styleguide/specimens.tsx`, and a foundational token also gets an
ADR. The lockstep is enforced by `app/components/styleguide/design-sync.test.ts`,
which runs inside `X-unit`.

## D-css-fresh + styleguide drift

The gate script runs `pnpm design-sync:css` (depends on a fresh `pnpm build`); it
fails loud if `.design-sync/styles.compiled.css` is stale. **Sandbox false
positive:** `design-sync:css` is a `tsx` script and `tsx` can't open its IPC pipe
read-only in the sandbox — `D-css-fresh` fails with an `EPERM … listen` /
`tsx-…pipe` error that is *not* a staleness finding. Distinguish by the error: an
`EPERM`/pipe trace = sandbox limitation (re-run outside the sandbox or copy the
compiled CSS by hand); a real diff in the file = genuine staleness. To eyeball
drift,
snapshot the styleguide against a **running dev server**:

```bash
pnpm build && pnpm design-sync:css     # refresh compiled CSS (fails if stale)
pnpm dev &                             # dev server on :3000 (start:mocks is broken)
pnpm styleguide:snapshot               # writes styleguide/ (light + dark + index.html)
```

Review `styleguide/index.html`. **Sandbox caveat:** `pnpm design-sync:prepare`
(tsx + auto server management) is flaky read-only in the sandbox — use this
decomposed flow with a manually-booted dev server instead. If a `ui/*` component
or token changed, the human must republish via `/design-sync` (OAuth).

## D1-3 / D1-4 — Light + dark feature screenshots

Capture the feature's own routes in both themes for visual review against the
grounded spec. Throwaway driver (`tmp/qa/`, not committed):

```js
// tmp/qa/shots.mjs — run: node tmp/qa/shots.mjs  (needs dev server + chromium)
import { chromium } from 'playwright'
const routes = ['/your-feature', '/your-feature/detail'] // the feature's routes
const browser = await chromium.launch()
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage()
  for (const route of routes) {
    await page.goto(`http://localhost:3000${route}`)
    await page.evaluate(
      (t) => document.documentElement.classList.toggle('dark', t === 'dark'),
      theme,
    )
    const slug = route.replace(/\W+/g, '_')
    await page.screenshot({ path: `tmp/qa/shots/${theme}${slug}.png`, fullPage: true })
  }
}
await browser.close()
```

Inspect the PNGs against the grounded design spec — spacing, color, radius,
states. Attach the relevant shots to the QA issue as evidence for `D1-3`/`D1-4`.
