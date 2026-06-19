// Audit data — single source of truth for the handoff page and AUDIT.md.
window.HANDOFF = (function () {
  // Semantic tokens, verbatim from _ds_bundle.css (:root / .dark)
  const tokens = [
    ['brand', 'oklch(60% .135 172)', 'oklch(60% .135 172)', 'Brand accent (ADR 062) · drives primary + ring'],
    ['brand-soft', 'color-mix(in srgb, var(--brand) 13%, transparent)', 'color-mix(in srgb, var(--brand) 13%, transparent)', 'Soft brand tint'],
    ['brand-glow', 'oklch(from var(--brand) l c h / 0.32)', 'oklch(from var(--brand) l c h / 0.32)', 'Brand glow / focus halo'],
    ['background', 'oklch(100% 0 0)', 'oklch(13.71% .036 258.53)', 'Page surface'],
    ['foreground', 'oklch(13.71% .036 258.53)', 'oklch(98.38% .0035 247.86)', 'Body text on page'],
    ['card', 'oklch(100% 0 0)', 'oklch(13.71% .036 258.53)', 'Card / panel surface'],
    ['card-foreground', 'oklch(13.71% .036 258.53)', 'oklch(98.38% .0035 247.86)', 'Text on cards'],
    ['popover', 'oklch(100% 0 0)', 'oklch(13.71% .036 258.53)', 'Menu / popover surface'],
    ['popover-foreground', 'oklch(13.71% .036 258.53)', 'oklch(98.38% .0035 247.86)', 'Text in menus'],
    ['primary', 'var(--brand)', 'var(--brand)', 'Primary action — follows --brand'],
    ['primary-foreground', 'oklch(98.38% .0035 247.86)', 'oklch(20.79% .0399 265.73)', 'Text on primary'],
    ['secondary', 'oklch(86.48% .0153 248)', 'oklch(34.74% .0295 260.13)', 'Secondary fill'],
    ['secondary-foreground', 'oklch(20.79% .0399 265.73)', 'oklch(98.38% .0035 247.86)', 'Text on secondary'],
    ['muted', 'oklch(94.32% .0123 247.96)', 'oklch(22.6% .0267 260.02)', 'Subtle surface'],
    ['muted-foreground', 'oklch(40.68% .0281 257.44)', 'oklch(71.07% .0351 256.79)', 'Secondary text'],
    ['accent', 'oklch(91.87% .0177 248.02)', 'oklch(20.56% .0228 260.05)', 'Hover fill'],
    ['accent-foreground', 'oklch(20.79% .0399 265.73)', 'oklch(98.38% .0035 247.86)', 'Text on accent'],
    ['destructive', 'oklch(57.14% .2121 27.25)', 'oklch(47.6% .159 25.64)', 'Danger fill'],
    ['destructive-foreground', 'oklch(98.38% .0035 247.86)', 'oklch(97.1% .0127 17.38)', 'Text on danger'],
    ['border', 'oklch(92.9% .0126 255.53)', 'oklch(28% .0369 259.97)', 'Hairlines'],
    ['input', 'oklch(92.56% .0133 255.54)', 'oklch(28% .0369 259.97)', 'Field borders'],
    ['ring', 'var(--brand)', 'var(--brand)', 'Focus ring — follows --brand'],
    ['input-invalid', 'oklch(63.68% .2078 25.33)', 'oklch(39.59% .1331 25.72)', 'Invalid field border'],
    ['foreground-destructive', 'oklch(51.46% .1979 16.57)', 'oklch(63.72% .2071 21.89)', 'Error message text'],
  ];

  // Component coverage matrix
  const matrix = [
    {
      name: 'Button',
      api: '6 variants · 6 sizes',
      variants: 'default, destructive, outline, secondary, ghost, link',
      states: { default: 'y', hover: 'y', focus: 'y', disabled: 'y', invalid: 'na', loading: 'via StatusButton' },
      a11y: 'Focus ring wired. `asChild` via Radix Slot.',
      gaps: 'Icon-only size needs `aria-label` — not enforced or linted. No positive/success variant. No loading state of its own.',
    },
    {
      name: 'StatusButton',
      api: 'Button + status',
      variants: 'idle, pending, success, error',
      states: { default: 'y', hover: 'y', focus: 'y', disabled: 'y', invalid: 'na', loading: 'y' },
      a11y: 'Status surfaced via tooltip `message`. Spinner from `spin-delay`.',
      gaps: 'Success/error are transient — no documented reset timing. Spinner not exposed as a standalone component.',
    },
    {
      name: 'Input',
      api: 'native input',
      variants: '—',
      states: { default: 'y', hover: 'n', focus: 'y', disabled: 'y', invalid: 'y', loading: 'na' },
      a11y: '`aria-invalid` drives red border. readOnly supported.',
      gaps: 'No error-message slot, no field wrapper, no leading/trailing icon or prefix, no size variants.',
    },
    {
      name: 'Textarea',
      api: 'native textarea',
      variants: '—',
      states: { default: 'y', hover: 'n', focus: 'y', disabled: 'y', invalid: 'partial', loading: 'na' },
      a11y: 'Accepts `aria-invalid` but it is not documented or shown.',
      gaps: 'No auto-resize, no invalid example, no character counter.',
    },
    {
      name: 'Checkbox',
      api: 'Radix',
      variants: '—',
      states: { default: 'y', hover: 'n', focus: 'y', disabled: 'y', invalid: 'n', loading: 'na' },
      a11y: 'Radix a11y, supports `indeterminate`.',
      gaps: 'No invalid/error state. No checkbox-with-description field pattern.',
    },
    {
      name: 'Label',
      api: 'native label',
      variants: '—',
      states: { default: 'y', hover: 'na', focus: 'na', disabled: 'partial', invalid: 'na', loading: 'na' },
      a11y: '`htmlFor` association.',
      gaps: 'No required-asterisk convention. No disabled-dimming tie to its control.',
    },
    {
      name: 'InputOTP',
      api: 'input-otp',
      variants: '—',
      states: { default: 'y', hover: 'n', focus: 'y', disabled: 'y', invalid: 'n', loading: 'na' },
      a11y: 'Keyboard + paste handled by `input-otp`.',
      gaps: 'No invalid/error state shown. Separator usage left to the consumer.',
    },
    {
      name: 'DropdownMenu',
      api: 'Radix compound',
      variants: 'item, checkbox, radio, sub, shortcut, label, separator',
      states: { default: 'y', hover: 'y', focus: 'y', disabled: 'y', invalid: 'na', loading: 'na' },
      a11y: 'Full Radix keyboard + focus management.',
      gaps: 'Destructive item styling not documented. Most complete part of the set.',
    },
    {
      name: 'Tooltip',
      api: 'Radix',
      variants: '—',
      states: { default: 'y', hover: 'y', focus: 'y', disabled: 'na', invalid: 'na', loading: 'na' },
      a11y: 'Auto-wraps its own provider. `delayDuration`.',
      gaps: 'No standalone Separator companion. Content-length guidance absent.',
    },
    // ── Added after the original audit (now 12 components) — none adopt the
    //    audit's Field / unified-invalid / cosy-focus recommendations yet. ──
    {
      name: 'Accordion',
      api: 'Radix compound',
      variants: 'single (collapsible) · multiple',
      states: { default: 'y', hover: 'y', focus: 'y', disabled: 'partial', invalid: 'na', loading: 'na' },
      a11y: 'WAI-ARIA disclosure, full keyboard (Home/End/arrows). grid-rows animation with motion-reduce fallback.',
      gaps: 'New (ADR 019). Disabled item accepted by Radix but not shown/documented. type="multiple" untested in the specimen. Detached focus ring — should adopt the proposed cosy-focus standard.',
    },
    {
      name: 'Slider',
      api: 'Radix · single-thumb',
      variants: '— (trackGradient slot)',
      states: { default: 'y', hover: 'y', focus: 'y', disabled: 'y', invalid: 'na', loading: 'na' },
      a11y: 'Keyboard (arrows/Home/End) + ARIA from Radix. Thumb ring follows --ring.',
      gaps: 'New (ADR 019). Single-thumb only — no range (two-thumb). No tick marks, value output, or vertical orientation. No Field/label+value pairing — needs the proposed Field.',
    },
    {
      name: 'CommandPalette',
      api: '⌘K · inline | dialog',
      variants: 'inline specimen · dialog overlay · empty/no-match',
      states: { default: 'y', hover: 'y', focus: 'y', disabled: 'na', invalid: 'na', loading: 'n' },
      a11y: 'Focus-trapped dialog overlay; built-in matcher owns ranking/grouping/filtering. Empty state via emptyActions.',
      gaps: 'New. No async/loading state for remote command sources. ⌘K key binding left to the consumer. Hand-rolls its own focus-trap overlay — should share the proposed Dialog primitive instead of duplicating it.',
    },
  ];

  // Proposed additions to take upstream
  const proposals = [
    {
      pri: 'P0', name: 'Field / FormField', why: 'No wrapper combines Label + control + description + error anywhere, so every consumer hand-rolls error markup. Tokens `foreground-destructive` and `input-invalid` already exist for exactly this.',
      tokens: 'foreground-destructive, input-invalid (exist)',
    },
    {
      pri: 'P0', name: 'Card', why: 'The README idiom hand-rolls a card (`bg-card border rounded-lg p-4`) on every page, yet `card` / `card-foreground` tokens are already defined. Promote it to Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter.',
      tokens: 'card, card-foreground (exist)',
    },
    {
      pri: 'P1', name: 'Alert / Callout', why: 'No component for form-level or page-level messages (success, warning, error). Destructive + muted tokens already support it.',
      tokens: 'destructive, muted (exist)',
    },
    {
      pri: 'P1', name: 'Select', why: 'Only DropdownMenu exists; forms need a real labelled select. Add a Radix Select that matches Input styling.',
      tokens: 'input, ring, popover (exist)',
    },
    {
      pri: 'P1', name: 'Badge', why: 'Status pills recur in data rows and lists; no primitive exists. Reuse secondary / destructive / outline — no new tokens.',
      tokens: 'none new',
    },
    {
      pri: 'P1', name: 'Spinner', why: 'Loading exists only baked inside StatusButton. Extract the spinner as a standalone for inline / full-page loading.',
      tokens: 'none new',
    },
    {
      pri: 'P2', name: 'Separator', why: 'A divider exists inside DropdownMenu but not standalone. Extract it.',
      tokens: 'border (exists)',
    },
    {
      pri: 'P2', name: 'Switch · RadioGroup', why: 'Common form controls absent. Radio is implied (DropdownMenuRadioItem) but no form RadioGroup.',
      tokens: 'primary, input, ring (exist)',
    },
    {
      pri: 'P1', name: 'Dialog', why: 'Now elevated: CommandPalette ships its own focus-trapped overlay, so the modal/focus-trap pattern already exists in the codebase — extract it as a shared Dialog instead of duplicating it per feature. Also unblocks modal confirmation.',
      tokens: 'popover, border (exist)',
    },
    {
      pri: 'P2', name: 'Toast · Skeleton', why: 'Transient notifications and loading placeholders are the next tier. Skeleton unblocks proper empty/loading states and would back CommandPalette\'s missing async/loading state.',
      tokens: 'popover, muted (exist)',
    },
  ];

  return { tokens, matrix, proposals };
})();
