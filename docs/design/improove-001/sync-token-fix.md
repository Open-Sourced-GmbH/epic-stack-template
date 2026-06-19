# Sync-time fix — clean DS token surface

> Ready to apply in the `epic-stack-template` repo / design-sync step. Resolves
> both `check_design_system` warnings permanently. **Cannot be fixed in this
> project** — the offending declarations live in the compiled `_ds_bundle.css`,
> which is regenerated verbatim on every `/design-sync`.

## Diagnosis (verified against the shipping bundle)

- `_ds_bundle.css` declares **195** custom properties.
- **22** are real semantic tokens (the `:root` / `.dark` design surface).
- **71** are `--tw-*` Tailwind v4 engine internals (transforms, filters, ring,
  shadow, enter/exit animation vars, …). These are runtime plumbing, not design
  decisions.
- The "32 properties under component-style selectors" the checker flags are the
  same `--tw-*` vars re-declared inside utility selectors (`--tw-shadow`,
  `--tw-ring-shadow`, `--tw-translate-x`, group-hover / toaster utilities).

Net: every warning = `--tw-*` leaking into the token list. Filter that prefix and
both warnings clear.

## Fix (recommended) — one filter in the design-sync token extractor

Exclude any custom property that is engine-internal or not declared at a theme
scope, before it's written to the manifest's token list:

```js
// design-sync: keep only authored theme tokens
function isDesignToken(prop) {
  if (prop.name.startsWith('--tw-')) return false;          // Tailwind internals
  const scope = prop.selector;                               // e.g. ':root', '.dark', '.group-hover\\:...'
  const themeScope = /^(:root|\.dark|\[data-[^\]]+\]|@theme)\b/.test(scope);
  return themeScope;                                         // drop utility-scoped vars
}
```

That leaves the 22 semantic tokens (+ the `@theme` type/radius/animation scale)
as the entire token surface — exactly what designers should see.

## Fix (alternative) — annotate at emit

If you'd rather keep `--tw-*` visible, have the sync append `/* @kind other */`
to each as it writes the bundle (regenerated, so it survives re-sync). The full
set of names to annotate (71):

```css
  --tw-animation-delay: <value>; /* @kind other */
  --tw-animation-direction: <value>; /* @kind other */
  --tw-animation-duration: <value>; /* @kind other */
  --tw-animation-fill-mode: <value>; /* @kind other */
  --tw-animation-iteration-count: <value>; /* @kind other */
  --tw-backdrop-blur: <value>; /* @kind other */
  --tw-backdrop-brightness: <value>; /* @kind other */
  --tw-backdrop-contrast: <value>; /* @kind other */
  --tw-backdrop-grayscale: <value>; /* @kind other */
  --tw-backdrop-hue-rotate: <value>; /* @kind other */
  --tw-backdrop-invert: <value>; /* @kind other */
  --tw-backdrop-opacity: <value>; /* @kind other */
  --tw-backdrop-saturate: <value>; /* @kind other */
  --tw-backdrop-sepia: <value>; /* @kind other */
  --tw-blur: <value>; /* @kind other */
  --tw-border-style: <value>; /* @kind other */
  --tw-brightness: <value>; /* @kind other */
  --tw-contrast: <value>; /* @kind other */
  --tw-drop-shadow: <value>; /* @kind other */
  --tw-drop-shadow-alpha: <value>; /* @kind other */
  --tw-drop-shadow-color: <value>; /* @kind other */
  --tw-drop-shadow-size: <value>; /* @kind other */
  --tw-duration: <value>; /* @kind other */
  --tw-ease: <value>; /* @kind other */
  --tw-enter-blur: <value>; /* @kind other */
  --tw-enter-opacity: <value>; /* @kind other */
  --tw-enter-rotate: <value>; /* @kind other */
  --tw-enter-scale: <value>; /* @kind other */
  --tw-enter-translate-x: <value>; /* @kind other */
  --tw-enter-translate-y: <value>; /* @kind other */
  --tw-exit-blur: <value>; /* @kind other */
  --tw-exit-opacity: <value>; /* @kind other */
  --tw-exit-rotate: <value>; /* @kind other */
  --tw-exit-scale: <value>; /* @kind other */
  --tw-exit-translate-x: <value>; /* @kind other */
  --tw-exit-translate-y: <value>; /* @kind other */
  --tw-font-weight: <value>; /* @kind other */
  --tw-grayscale: <value>; /* @kind other */
  --tw-hue-rotate: <value>; /* @kind other */
  --tw-inset-ring-color: <value>; /* @kind other */
  --tw-inset-ring-shadow: <value>; /* @kind other */
  --tw-inset-shadow: <value>; /* @kind other */
  --tw-inset-shadow-alpha: <value>; /* @kind other */
  --tw-inset-shadow-color: <value>; /* @kind other */
  --tw-invert: <value>; /* @kind other */
  --tw-leading: <value>; /* @kind other */
  --tw-opacity: <value>; /* @kind other */
  --tw-outline-style: <value>; /* @kind other */
  --tw-ring-color: <value>; /* @kind other */
  --tw-ring-inset: <value>; /* @kind other */
  --tw-ring-offset-color: <value>; /* @kind other */
  --tw-ring-offset-shadow: <value>; /* @kind other */
  --tw-ring-offset-width: <value>; /* @kind other */
  --tw-ring-shadow: <value>; /* @kind other */
  --tw-rotate-x: <value>; /* @kind other */
  --tw-rotate-y: <value>; /* @kind other */
  --tw-rotate-z: <value>; /* @kind other */
  --tw-saturate: <value>; /* @kind other */
  --tw-scale-x: <value>; /* @kind other */
  --tw-scale-y: <value>; /* @kind other */
  --tw-scale-z: <value>; /* @kind other */
  --tw-sepia: <value>; /* @kind other */
  --tw-shadow: <value>; /* @kind other */
  --tw-shadow-alpha: <value>; /* @kind other */
  --tw-shadow-color: <value>; /* @kind other */
  --tw-skew-x: <value>; /* @kind other */
  --tw-skew-y: <value>; /* @kind other */
  --tw-tracking: <value>; /* @kind other */
  --tw-translate-x: <value>; /* @kind other */
  --tw-translate-y: <value>; /* @kind other */
  --tw-translate-z: <value>; /* @kind other */
```

## Do NOT hand-edit `_ds_bundle.css` in the project
Any annotation added there is overwritten on the next `/design-sync`. The fix
belongs in the extractor/build, above.
