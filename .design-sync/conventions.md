# Epic Stack UI — conventions

A Tailwind **v4** design system. Components are real, accessible React parts
(Radix-based where compound). You style your own layout with the same utility
vocabulary the components use, so everything stays on-brand.

## Setup & theming

- **No provider needed for styling.** All design tokens are CSS variables defined
  at `:root` (light) and `.dark` (dark). Color/spacing/radius utilities resolve
  from them automatically.
- **Dark mode = a class.** Put `class="dark"` on a root ancestor (e.g. `<html>`)
  to switch the whole tree to the dark palette; remove it for light. Every
  `*-foreground`, surface, and border token flips automatically — never hardcode
  hex for dark mode.
- **Tooltip** auto-wraps its own `TooltipProvider` — just compose
  `Tooltip > TooltipTrigger + TooltipContent`. Other components are standalone.

## Styling idiom — semantic utility classes

Style with **semantic token utilities**, never raw colors. Each token has a
paired `*-foreground` for text/icons that sits on it (e.g. `bg-primary` →
`text-primary-foreground`). Use the prefixes `bg-`, `text-`, `border-`, `ring-`.

| Role | Token (use as `bg-`/`text-`/`border-`/`ring-`) |
|---|---|
| Page surface / text | `background` / `foreground` |
| Card surface | `card` / `card-foreground` |
| Popover/menu surface | `popover` / `popover-foreground` |
| Primary action | `primary` / `primary-foreground` |
| Secondary action | `secondary` / `secondary-foreground` |
| Muted/subtle | `muted` / `muted-foreground` |
| Accent / hover fill | `accent` / `accent-foreground` |
| Danger | `destructive` / `destructive-foreground` |
| Hairlines | `border`, `input` |
| Focus ring | `ring` |

**Type scale** (use as `text-*`): `text-mega`, `text-h1`…`text-h6`,
`text-body-2xl`…`text-body-2xs`, `text-caption`, `text-button`. Headings carry
their own weight/line-height — don't add `font-bold`.

**Radius** (use as `rounded-*`): `rounded-sm`, `rounded-md`, `rounded-lg`,
`rounded-xl` (all derived from one `--radius`). Inputs/buttons use `rounded-md`.

## Where the truth lives

Read the bound files before composing: each component's `<Name>.prompt.md`
(usage + examples) and `<Name>.d.ts` (props). Compound components list their
sub-parts in the prompt — **compose them, don't reinvent**:
`DropdownMenu`/`Tooltip`/`InputOTP` expose `DropdownMenuTrigger`/`DropdownMenuContent`/
`DropdownMenuItem`, `TooltipTrigger`/`TooltipContent`, `InputOTPGroup`/`InputOTPSlot`, etc.

## Idiomatic snippet

```tsx
import { Button } from 'epic-stack-template'

function SaveBar() {
  return (
    <div className="bg-card text-card-foreground flex items-center justify-between rounded-lg border border-border p-4">
      <p className="text-body-sm text-muted-foreground">Unsaved changes</p>
      <div className="flex gap-2">
        <Button variant="ghost">Discard</Button>
        <Button variant="default">Save</Button>
      </div>
    </div>
  )
}
```

The Button is a real library component; the surrounding layout is your own JSX
using the same token utilities — that's the whole idiom.
