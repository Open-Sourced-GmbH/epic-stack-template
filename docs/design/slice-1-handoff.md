# Northbound landing — Developer handoff

Marketing landing built on the **Epic Stack Template UI** design system (`window.EpicUI` / `epic-stack-template`). Everything below is the production source for each surface, the exact token values it relies on, the net-new pieces that aren't in the Foundation, and the states designed per surface.

> **Theming model.** The whole page lives inside one wrapper that carries the brand accent + theme as CSS variables. Every component styles itself with the Foundation's **semantic token utilities** (`bg-card`, `text-muted-foreground`, `border-border`, `text-primary-foreground`, `rounded-lg`, …). Dark mode is the `.dark` class on `<html>` — every token flips automatically. The accent is injected as `--brand` / `--primary` / `--ring` so the real DS components (Button, Checkbox, focus rings) adopt it without restyling.

---

## 1. Net-new components & tokens (NOT in the Foundation)

These are the only things invented for this page. Everything else is Foundation components + token utilities.

| Net-new | Type | What it needs |
|---|---|---|
| **`<Accordion>` / `<AccordionItem>`** | Component | Single-open state, `aria-expanded` + `aria-controls`, CSS grid `grid-template-rows: 0fr → 1fr` height animation. **Flag: reconcile into the Foundation.** |
| **`<CommandPalette>` (⌘K)** | Component | Portal/overlay, fuzzy filter, full keyboard nav (↑↓/↵/esc), grouped results, **empty/no-match state with suggested actions**, global ⌘K / Ctrl-K listener. **Flag: reconcile.** |
| **`<ThemeCustomizer>` (floating dock)** | Component | Accent presets + hue/chroma/light sliders, 3-way theme switch, button-cursor toggle, minimize/expand, `localStorage` persistence. Demo/marketing chrome — not a product component. |
| **`<Carousel>`** | Component | Tabbed + arrow nav, autoplay with per-tab progress fill, pause-on-hover + play/pause, height-animates to active slide, reduced-motion fallback. |
| **`<CodeBlock>`** | Component | Static syntax-highlighted `<pre>` with token spans + copy button. Needs a token color set (below). Not interactive beyond copy. |
| **`<AppFrame>`** | Layout primitive | Browser/app "window" chrome (traffic-light dots + URL pill) wrapping the playground & palette demos. |
| **`<ImageSlot>`** | Component | Drag-drop screenshot placeholder that persists (used in Work). |
| **`useReveal` / `.rv`** | Utility | IntersectionObserver scroll-reveal; hidden state lives only inside `prefers-reduced-motion: no-preference`. |
| **`useAccent` + `accentVars()`** | Utility | Maps `{l,c,h}` → the `--brand*` / `--primary` / `--ring` CSS vars. |

**Net-new tokens** (added on top of the Foundation's `--background/--card/--primary/...`):

```css
--brand:       oklch(60% 0.135 172);                          /* = --primary */
--brand-soft:  color-mix(in srgb, var(--brand) 13%, transparent);
--brand-glow:  oklch(from var(--brand) l c h / 0.32);
/* code-block syntax palette (see §2) */
```

---

## 2. Concrete token values

### Accent (default = "Pine") and the 4 presets

```ts
// oklch(L% C H). Default accent is Pine.
const ACCENT_PRESETS = [
  { id: "ember", name: "Ember", l: 59, c: 0.215, h: 33  }, // warm vermilion
  { id: "iris",  name: "Iris",  l: 55, c: 0.243, h: 293 }, // electric violet
  { id: "pine",  name: "Pine",  l: 60, c: 0.135, h: 172 }, // ← DEFAULT, jade teal
  { id: "volt",  name: "Volt",  l: 84, c: 0.205, h: 123 }, // acid lime
];

// Default brand color:
--brand: oklch(60% 0.135 172);
```

### How the accent maps onto Foundation tokens

```ts
function fgFor(l, c, h) {
  // near-black text on light accents (Volt), near-white otherwise
  return l >= 72 ? `oklch(26% ${Math.min(c, 0.06)} ${h})` : `oklch(98% 0.012 ${h})`;
}
function accentVars(l, c, h) {
  const brand = `oklch(${l}% ${c} ${h})`;
  return {
    "--brand": brand,
    "--primary": brand,                                              // DS primary follows accent
    "--primary-foreground": fgFor(l, c, h),
    "--ring": brand,                                                 // focus rings follow accent
    "--brand-soft": `color-mix(in srgb, ${brand} 14%, transparent)`,
    "--brand-glow": `oklch(${l}% ${c} ${h} / 0.32)`,
  };
}
```

### Radius

```
--radius: 0.5rem            /* Foundation base */
rounded-md  → inputs, buttons (Foundation)
rounded-lg  → 0.5rem
Introduced (arbitrary, on top of Foundation scale):
  cards / app-frames        16px
  pricing tiers, dock card  18px
  command palette           14–16px
  pills / chips / tags      999px (full)
  icon tiles (.sq)          8–12px
```

### Colors — all via Foundation tokens, no raw hex in layout

`background / foreground`, `card / card-foreground`, `popover / popover-foreground`, `muted / muted-foreground`, `accent / accent-foreground`, `border`, `input`, `ring`, `primary / primary-foreground`, `destructive`. The only literal colors used are: the accent oklch values above, `#fff` on dark gradient surfaces (hero panel, CTA band), and the **code-block syntax palette**:

```css
/* CodeBlock surface + tokens (dark in both themes by design) */
--code-bg:    oklch(22% 0.015 260);   /* light theme */
--code-bg:    oklch(16% 0.012 260);   /* .dark */
--code-text:  oklch(88% 0.01 260);
--tk-keyword: oklch(74% 0.14 320);
--tk-string:  oklch(80% 0.13 140);
--tk-tag:     oklch(78% 0.13 220);
--tk-attr:    oklch(82% 0.12 75);     /* also fn names */
--tk-punc:    oklch(62% 0.02 260);
/* invoice status badges in the palette demo */
--state-paid:    oklch(58% 0.13 150);
--state-overdue: var(--destructive);
```

### Spacing & type

```
Page width:        max-w-[1180px], px-[clamp(20px,4vw,48px)]
Section padding:    py-[clamp(64px,9vw,116px)]
Alt section bg:     color-mix(in srgb, var(--muted) 42%, var(--background))
Font:               --font-sans (Foundation)
Display headline:   clamp(40px,4.6vw,62px) / line-height 1.02 / -0.035em / 600
Section title (h2): clamp(30px,3.6vw,46px) / 1.05 / -0.035em / 600
Lead:               clamp(16px,1.4vw,18.5px) / 1.6 / muted-foreground
Eyebrow:            12.5px / 600 / 0.05em / uppercase / brand
Entrance easing:    cubic-bezier(.2,.7,.25,1)
Scroll-anchor:      section[id]{ scroll-margin-top: 80px }
```

---

## 3. Shared scaffold

```tsx
// theme-provider.tsx — wraps the whole page, owns accent + theme + persistence
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
const STORE = "northbound.theme.v1";
const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const saved = JSON.parse(localStorage.getItem(STORE) ?? "{}");
  const [accent, setAccent] = useState(saved.accent ?? { l: 60, c: 0.135, h: 172 }); // Pine
  const [mode, setMode]     = useState<Mode>(saved.mode ?? "light");
  const [pointer, setPointer] = useState<boolean>(saved.pointer ?? true);

  useEffect(() => {
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark", mode === "dark" || (mode === "system" && systemDark()),
      );
    apply();
    localStorage.setItem(STORE, JSON.stringify({ accent, mode, pointer }));
    if (mode === "system") {
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [accent, mode, pointer]);

  return (
    <div
      className="brand-scope bg-background text-foreground font-sans min-h-screen"
      data-btn-cursor={pointer ? "pointer" : "default"}
      style={accentVars(accent.l, accent.c, accent.h)}
    >
      {children}
    </div>
  );
}
```

```css
/* global.css — the only net-new global rules */
.brand-scope { --brand: oklch(60% 0.135 172); --brand-soft: color-mix(in srgb, var(--brand) 13%, transparent); --brand-glow: oklch(from var(--brand) l c h / 0.32); --primary: var(--brand); --primary-foreground: oklch(98% 0.012 33); --ring: var(--brand); }
/* button-hover cursor toggle */
.brand-scope[data-btn-cursor="pointer"] button, .brand-scope[data-btn-cursor="pointer"] [role="button"] { cursor: pointer; }
.brand-scope[data-btn-cursor="default"] button, .brand-scope[data-btn-cursor="default"] [role="button"] { cursor: default; }
/* scroll reveal — visible by default; hidden only when motion is allowed */
@media (prefers-reduced-motion: no-preference) {
  .rv { opacity: 0; transform: translateY(22px); transition: opacity .6s cubic-bezier(.2,.7,.25,1), transform .6s cubic-bezier(.2,.7,.25,1); }
  .rv.rv-in { opacity: 1; transform: none; }
}
section[id] { scroll-margin-top: 80px; }
```

```tsx
// useReveal.ts — adds .rv-in as elements enter; no-JS / reduced-motion stay visible
export function useReveal(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...ref.current!.querySelectorAll<HTMLElement>("[data-reveal]")];
    els.forEach((el) => el.classList.add("rv"));
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("rv-in"), io.unobserve(e.target))),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
```

---

## 4. Surfaces

Each surface lists its **states** then the **TSX**.

---

### 4.1 Header / Nav

**States** — default (transparent, blurred) · `.scrolled` (border appears past 8px) · link hover (animated brand underline) · **active link via scrollspy** · theme button cycles light→dark→system · mobile (`<780px` nav links hidden) · dark (tokens flip).

```tsx
import { Button } from "epic-stack-template";
import { Sun, Moon, Monitor } from "lucide-react";

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };
const LINKS = [["#how","Process"],["#work","Work"],["#services","Services"],["#pricing","Pricing"],["#faq","FAQ"]];

export function Nav({ mode, cycleTheme }: { mode: Mode; cycleTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const Icon = THEME_ICON[mode];

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 8);
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { // scrollspy
    const secs = ["how","work","services","pricing","faq"].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <nav className={`sticky top-0 z-[90] backdrop-blur-md transition-colors
      ${scrolled ? "border-b border-border" : "border-b border-transparent"}
      bg-[color-mix(in_srgb,var(--background)_78%,transparent)]`}>
      <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-[clamp(20px,4vw,48px)] py-3">
        <a href="#top" className="group flex items-center gap-2.5 text-base font-semibold tracking-tight">
          <span className="h-[22px] w-[22px] rounded-[7px] bg-[--brand] shadow-[0_4px_14px_var(--brand-soft)] transition-transform group-hover:-rotate-8 group-hover:scale-105" />
          northbound
        </a>
        <div className="ml-5 hidden gap-7 md:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}
              className={`relative text-[14.5px] transition-colors after:absolute after:inset-x-0 after:-bottom-[5px] after:h-0.5 after:origin-left after:scale-x-0 after:rounded after:bg-[--brand] after:transition-transform hover:after:scale-x-100
                ${active === href.slice(1) ? "text-foreground after:scale-x-100" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </a>
          ))}
        </div>
        <span className="flex-1" />
        <button onClick={cycleTheme} title={`Theme: ${mode}`}
          className="grid h-[38px] w-[38px] place-items-center rounded-full border border-border bg-card text-foreground hover:bg-accent">
          <Icon className="h-4 w-4 transition-transform hover:rotate-[18deg]" />
        </button>
        <Button>Start a project</Button>
      </div>
    </nav>
  );
}
```

---

### 4.2 Hero

**States** — entrance (children rise/fade on mount, gated on `data-in` + `no-preference`) · breathing glow loop · progress bar fills 0→72% on mount · product panel always rendered in `.dark` for contrast · floating "All checks passed" chip (top-left overhang) · mobile (`<880px` right panel hidden) · reduced-motion (no entrance/glow; final state shown).

```tsx
import { Button } from "epic-stack-template";
import { Check } from "lucide-react";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => ref.current?.setAttribute("data-in", ""), 60);
    const t2 = setTimeout(() => setFill(72), 480);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <section id="top" ref={ref} className="hero relative overflow-hidden">
      {/* brand glow wash */}
      <div className="pointer-events-none absolute -right-44 -top-60 h-[680px] w-[680px] opacity-50 blur-lg
                      bg-[radial-gradient(closest-side,var(--brand-glow),transparent_70%)]" />
      <div className="relative z-[1] mx-auto grid max-w-[1180px] items-center gap-[clamp(24px,4vw,56px)]
                      px-[clamp(20px,4vw,48px)] py-[clamp(36px,6vw,76px)] md:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="anim d1 inline-flex items-center gap-2.5 rounded-full border border-border bg-[color-mix(in_srgb,var(--brand)_5%,var(--card))] px-3 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[--brand]">
            <span className="h-[7px] w-[7px] animate-[dotpulse_2.6s_ease-in-out_infinite] rounded-full bg-[--brand]" /> Independent product studio
          </div>
          <h1 className="anim d2 mt-5 text-[clamp(40px,4.6vw,62px)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance">
            Software that feels <span className="text-[--brand]">designed</span>, shipped at startup speed.
          </h1>
          <p className="anim d3 mt-5 max-w-[30ch] text-lg leading-[1.55] text-muted-foreground text-pretty">
            We design and build polished web products end to end — for teams who refuse to look like everyone else.
          </p>
          <div className="anim d4 mt-8 flex flex-wrap items-center gap-3.5">
            <Button size="lg" className="brand-cta">Start a project</Button>
            <Button size="lg" variant="outline">See the work</Button>
          </div>
          <div className="anim d5 mt-6 flex flex-wrap items-center gap-2.5 text-[13.5px] text-muted-foreground">
            <span>Booking Q3 2026</span><Dot/><span>Fixed-scope sprints</span><Dot/><span>Design + build</span>
          </div>
        </div>

        {/* right product panel — dark surface for contrast */}
        <div className="anim d4 relative hidden items-center justify-center md:flex">
          <div className="dark contents">
            <div className="absolute h-[78%] w-[78%] animate-[breathe_7s_ease-in-out_infinite] rounded-[40px] opacity-90 blur-[10px]
                            bg-[radial-gradient(closest-side,var(--brand-glow),transparent_72%)]" />
            <div className="relative w-[min(420px,92%)] rounded-[20px] border border-border bg-card p-[26px] text-card-foreground shadow-[0_30px_70px_-30px_rgba(0,0,0,.55)]">
              <div className="flex items-center gap-3">
                <div className="h-[42px] w-[42px] rounded-xl bg-[linear-gradient(135deg,var(--brand),color-mix(in_oklab,var(--brand)_55%,#000))]" />
                <div><div className="text-[15.5px] font-semibold">atlas.app</div><div className="text-[13px] text-muted-foreground">Production deployment</div></div>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] px-2.5 py-1 text-xs font-medium text-[--brand]"><span className="h-1.5 w-1.5 rounded-full bg-[--brand]" />Live</span>
              </div>
              <div className="mb-2 mt-6 flex justify-between text-[13px] text-muted-foreground"><span>Building release</span><b className="text-card-foreground">{fill}%</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_55%,#000),var(--brand))] transition-[width] duration-[1400ms] ease-[cubic-bezier(.22,.7,.25,1)]" style={{ width: `${fill}%` }} />
              </div>
              <div className="mt-6 flex gap-2.5">
                <Button className="brand-cta flex-1">Deploy to production</Button>
                <Button variant="outline">Preview</Button>
              </div>
            </div>
            <div className="absolute -left-3.5 -top-4 flex items-center gap-2 rounded-xl border border-border bg-card px-[15px] py-2.5 text-[13px] font-medium shadow-[0_18px_40px_-18px_rgba(0,0,0,.6)] animate-[floaty_5s_ease-in-out_infinite]">
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[--brand] text-white"><Check className="h-3 w-3" /></span> All checks passed
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

```css
/* hero entrance + ambient loops — all gated for reduced-motion */
@media (prefers-reduced-motion: no-preference) {
  .hero[data-in] .anim { animation: rise .7s cubic-bezier(.2,.7,.25,1) forwards; }
  .hero[data-in] .anim.d1 { animation-delay:.05s } /* d2 .13 · d3 .21 · d4 .29 · d5 .40 */
  @keyframes rise   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
  @keyframes breathe{ 0%,100%{ transform:scale(1); opacity:.7 } 50%{ transform:scale(1.06); opacity:1 } }
  @keyframes floaty { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-8px) } }
  @keyframes dotpulse{0%,100%{box-shadow:0 0 0 0 var(--brand-soft)}50%{box-shadow:0 0 0 5px transparent}}
}
.brand-cta { background: var(--brand); color: var(--primary-foreground); transition: transform .15s, filter .15s, box-shadow .15s; }
.brand-cta:hover { transform: translateY(-1px); filter: brightness(1.04) saturate(1.03); box-shadow: 0 16px 32px -10px var(--brand-soft); }
.brand-cta:active { transform: none; }
```

---

### 4.3 How it works (timeline)

**States** — default · **scroll-reveal per row** (node pops, connecting line draws `scaleY 0→1`, body fades; re-triggers on each pass via `toggle`) · duration chip · mobile (stacks) · reduced-motion (all visible, no draw).

```tsx
const STEPS = [
  { n: "01", icon: Mail,    title: "Brief",     dur: "Day 1",      body: "A short, focused conversation… you leave with a clear scope and a flat price." },
  { n: "02", icon: PenLine, title: "Prototype", dur: "Week 1",     body: "Within days you're clicking through a real, interactive prototype." },
  { n: "03", icon: Laptop,  title: "Build",     dur: "Weeks 2–4",  body: "We turn the prototype into production software, a working build every cycle." },
  { n: "04", icon: Check,   title: "Launch",    dur: "Ship day",   body: "We ship it, watch it, and tighten the details. You own all the code." },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = ref.current!; root.setAttribute("data-anim", "");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.target.classList.toggle("in", e.isIntersecting)),
      { rootMargin: "-10% 0px -30% 0px" },
    );
    root.querySelectorAll(".hiw-row").forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="py-[clamp(64px,9vw,116px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,48px)]">
        <SectionHead eyebrow="How it works" title="From first call to shipped, in four steps."
          lead="A simple, predictable process — so you always know where the project stands and what's next." />
        <div ref={ref} className="hiw max-w-[760px]">
          {STEPS.map((s, i) => (
            <div key={s.n} className="hiw-row grid grid-cols-[56px_1fr] gap-5">
              <div className="flex flex-col items-center">
                <div className="hiw-node grid h-12 w-12 place-items-center rounded-[14px] border border-[color-mix(in_srgb,var(--brand)_24%,var(--border))] bg-[--brand-soft] text-[--brand]">
                  <s.icon className="h-[21px] w-[21px]" />
                </div>
                {i < STEPS.length - 1 && <div className="hiw-line my-2 w-0.5 flex-1 bg-border" />}
              </div>
              <div className="hiw-body pb-[34px] last:pb-0">
                <div className="mb-2 flex flex-wrap items-baseline gap-3">
                  <span className="text-xs font-bold tracking-[0.06em] text-[--brand]">{s.n}</span>
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">{s.title}</h3>
                  <span className="ml-auto whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{s.dur}</span>
                </div>
                <p className="text-[15.5px] leading-[1.6] text-muted-foreground text-pretty">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

```css
@media (prefers-reduced-motion: no-preference) {
  .hiw[data-anim] .hiw-row  { opacity:0; transform:translateY(22px); transition:opacity .55s, transform .55s; }
  .hiw[data-anim] .hiw-row.in { opacity:1; transform:none; }
  .hiw[data-anim] .hiw-node { opacity:0; transform:scale(.55); transition:transform .5s cubic-bezier(.34,1.4,.5,1) .08s, opacity .4s .08s; }
  .hiw[data-anim] .hiw-row.in .hiw-node { opacity:1; transform:none; }
  .hiw[data-anim] .hiw-line { transform:scaleY(0); transform-origin:top; transition:transform .55s cubic-bezier(.4,.7,.3,1) .25s; }
  .hiw[data-anim] .hiw-row.in .hiw-line { transform:scaleY(1); }
}
```

---

### 4.4 Features / Services + Work

**Services states** — default · card hover (lift `-4px`, border→brand tint, shadow; icon tile `scale(1.08) rotate(-4deg)`) · scroll-reveal stagger · mobile (`<820px` 1-col) · dark.
**Work states** — same hover model on the image slot · domain link with arrow nudge on hover · `<ImageSlot>` empty (placeholder "Drop a shot" + browse) / filled (persisted) · mobile 1-col.

```tsx
const SERVICES = [
  { icon: PenLine, title: "Product design",        body: "Interface design, design systems, and clickable prototypes that settle decisions before a line of code." },
  { icon: Laptop,  title: "Front-end engineering", body: "Production React that's fast, accessible, and clean enough for your team to own after we hand it off." },
  { icon: RotateCcw, title: "Launch & iterate",    body: "We ship, watch how it performs, and tighten the details that turn a launch into momentum." },
];

export function Services() {
  return (
    <section id="services" className="py-[clamp(64px,9vw,116px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,48px)]">
        <SectionHead data-reveal eyebrow="What we do" title="Design and engineering, under one roof."
          lead="One team from first sketch to production — no handoffs lost in translation." />
        <div className="grid gap-5 md:grid-cols-3">
          {SERVICES.map((s) => (
            <article key={s.title} data-reveal
              className="group rounded-2xl border border-border bg-card p-[26px] transition-[transform,box-shadow,border-color] duration-200
                         hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--brand)_32%,var(--border))] hover:shadow-[0_22px_46px_-30px_rgba(0,0,0,.5)]">
              <div className="mb-[18px] grid h-[46px] w-[46px] place-items-center rounded-xl bg-[--brand-soft] text-[--brand] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                <s.icon className="h-[22px] w-[22px]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-[-0.01em]">{s.title}</h3>
              <p className="text-[15px] leading-[1.6] text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// WORK uses the real reference projects:
const WORK = [
  { id: "opensourced", title: "Open Sourced", tag: "Hosting & privacy", domain: "opensourced.ch", url: "https://opensourced.ch", body: "A Swiss platform for managed Cloudron hosting, websites and privacy-first devices." },
  { id: "xiquell",     title: "Xiquell",      tag: "E-commerce",        domain: "xiquell.ch",     url: "https://xiquell.ch",     body: "A product site for a premium water-filtration system — video hero, education-led story." },
  { id: "livediag",    title: "Livediag",     tag: "Web app",           domain: "livediag.com",   url: "https://livediag.com",   body: "A focused diagnostics web app — fast, real-time, built to feel instant." },
];

export function Work() {
  return (
    <section id="work" className="bg-[color-mix(in_srgb,var(--muted)_42%,var(--background))] py-[clamp(64px,9vw,116px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,48px)]">
        <SectionHead data-reveal eyebrow="Selected work" title="A few things we've shipped."
          lead="Recent builds for Swiss teams. Drop in your own screenshots — the slots persist what you add." />
        <div className="grid gap-[22px] md:grid-cols-3">
          {WORK.map((w) => (
            <article key={w.id} data-reveal className="group flex flex-col gap-3.5">
              <ImageSlot id={`work-${w.id}`} shape="rounded" radius={14} placeholder="Drop a shot"
                className="h-[210px] border border-border transition-[transform,box-shadow] duration-[250ms] group-hover:-translate-y-1 group-hover:shadow-[0_24px_48px_-30px_rgba(0,0,0,.45)]" />
              <div className="flex items-center justify-between gap-2.5">
                <h3 className="whitespace-nowrap text-[16.5px] font-semibold tracking-[-0.01em]">{w.title}</h3>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-[--brand-soft] px-2.5 py-1 text-[11.5px] text-[--brand]">{w.tag}</span>
              </div>
              <p className="text-sm leading-[1.55] text-muted-foreground">{w.body}</p>
              <a href={w.url} target="_blank" rel="noopener noreferrer"
                 className="group/link inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-[--brand]">
                {w.domain}<span className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5">↗</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### 4.5 Code sample (proof-of-craft)

**States** — default · copy button (idle → "Copied" w/ check, 1.6s) · the rendered half is **live** real DS components · dark (code surface darkens further) · mobile (`<900px` stacks) · scroll-reveal (two halves stagger).

```tsx
import { Button, Input, Label, Checkbox } from "epic-stack-template";

export function CodeSample() {
  const [remember, setRemember] = useState(true);
  const [copied, setCopied] = useState(false);

  return (
    <section id="craft" className="bg-[color-mix(in_srgb,var(--muted)_42%,var(--background))] py-[clamp(64px,9vw,116px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,48px)]">
        <SectionHead data-reveal eyebrow="Built to last" title="The code is as considered as the design."
          lead="What we hand over is clean, typed and accessible. Source on the left, running live on the right." />
        <div className="grid items-stretch gap-[22px] lg:grid-cols-[1.25fr_0.75fr]">
          <CodeBlock data-reveal filename="SignInCard.tsx" copied={copied} onCopy={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }} />
          <div data-reveal className="flex flex-col overflow-hidden rounded-2xl border border-border bg-[color-mix(in_srgb,var(--muted)_28%,var(--card))]">
            <div className="flex items-center gap-2 whitespace-nowrap border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span className="h-[7px] w-[7px] rounded-full bg-[--brand] shadow-[0_0_0_3px_var(--brand-soft)]" /> Live render
            </div>
            <div className="grid flex-1 place-items-center p-7">
              <form onSubmit={(e) => e.preventDefault()} className="grid w-full max-w-[320px] gap-3.5 rounded-[14px] border border-border bg-card p-[22px] shadow-[0_20px_50px_-36px_rgba(0,0,0,.5)]">
                <div className="grid gap-1.5"><Label htmlFor="cs-email">Email</Label><Input id="cs-email" type="email" placeholder="you@studio.com" /></div>
                <div className="grid gap-1.5"><Label htmlFor="cs-pw">Password</Label><Input id="cs-pw" type="password" placeholder="••••••••••" /></div>
                <label className="flex items-center gap-2.5 text-sm"><Checkbox checked={remember} onCheckedChange={setRemember} />Keep me signed in</label>
                <Button className="brand-cta w-full">Continue</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// CodeBlock — net-new. Static highlight via token spans (see §2 palette) + copy.
function CodeBlock({ filename, copied, onCopy, ...rest }: any) {
  return (
    <div {...rest} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_90px_-50px_rgba(0,0,0,.5)]">
      <div className="flex items-center gap-3.5 border-b border-border bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))] px-4 py-3">
        <span className="flex gap-1.5">{[0,1,2].map(i=><i key={i} className="h-[11px] w-[11px] rounded-full bg-border"/>)}</span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground"><FileText className="h-3 w-3" />{filename}</span>
        <button onClick={onCopy} className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent">
          {copied ? <><Check className="h-3 w-3 text-[--brand]" />Copied</> : "Copy"}
        </button>
      </div>
      <pre className="flex-1 overflow-x-auto bg-[var(--code-bg)] px-[22px] py-5 text-[13px] leading-[1.85] text-[var(--code-text)]"><code>{/* token-colored spans: .tk-keyword/.tk-string/.tk-tag/.tk-attr/.tk-punc */}</code></pre>
    </div>
  );
}
```

---

### 4.6 Live component playground (carousel)

**States** — 3 slides (Onboarding flow / Forms & inputs / Menus & actions) · tab + arrow nav (arrows loop) · **autoplay 7s** with per-tab progress fill · pause-on-hover + play/pause toggle · height-animates to active slide · onboarding flow has its own step states (account → verify → done; OTP drives StatusButton `idle→pending→success`) · mobile (grids collapse) · reduced-motion (no autoplay; plain timer, no fill) · dark.

```tsx
const CAR_DURATION = 7000;
export function Carousel({ slides }: { slides: { id: string; label: string; render: () => JSX.Element }[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [h, setH] = useState<number>();
  const refs = useRef<HTMLDivElement[]>([]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n = slides.length, frozen = paused || hover;

  useLayoutEffect(() => { setH(refs.current[i]?.offsetHeight); }, [i]);
  const goTo = (x: number) => { setI(((x % n) + n) % n); setCycle((c) => c + 1); };
  useEffect(() => { // reduced-motion fallback timer
    if (!reduce || frozen) return;
    const t = setTimeout(() => goTo(i + 1), CAR_DURATION);
    return () => clearTimeout(t);
  }, [i, cycle, frozen]);

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--muted)_26%,var(--card))] px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {slides.map((s, idx) => (
            <button key={s.id} onClick={() => goTo(idx)}
              className={`relative h-8 overflow-hidden rounded-lg px-3 text-[13px] font-medium transition-colors
                ${idx === i ? "bg-[--brand-soft] text-[--brand]" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              <span className="relative z-[1]">{s.label}</span>
              {idx === i && !reduce && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[color-mix(in_srgb,var(--brand)_20%,transparent)]">
                  <span key={cycle} onAnimationEnd={() => goTo(i + 1)}
                    className={`block h-full w-0 bg-[--brand] ${frozen ? "[animation-play-state:paused]" : ""}`}
                    style={{ animation: `car-fill ${CAR_DURATION}ms linear forwards` }} />
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <button onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play" : "Pause"} className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-border bg-card hover:bg-accent">{paused ? <Play className="h-3 w-3"/> : <Pause className="h-3 w-3"/>}</button>
        <span className="tabular-nums text-xs text-muted-foreground">{i + 1} / {n}</span>
        <button onClick={() => goTo(i - 1)} className="…arrow…"><ArrowLeft/></button>
        <button onClick={() => goTo(i + 1)} className="…arrow…"><ArrowRight/></button>
      </div>
      <div className="overflow-hidden transition-[height] duration-[420ms] ease-[cubic-bezier(.3,.7,.3,1)]" style={{ height: h }}>
        <div className="flex items-start transition-transform duration-[420ms] ease-[cubic-bezier(.3,.7,.3,1)]" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((s, idx) => (
            <div key={s.id} ref={(el) => (refs.current[idx] = el!)} aria-hidden={idx !== i} className="w-full shrink-0 p-[22px]">{s.render()}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
/* @keyframes car-fill { from { width:0 } to { width:100% } } */
```
The slides compose real Foundation parts: `Input`, `Label`, `Checkbox`, `Textarea`, `InputOTP`+`InputOTPGroup`+`InputOTPSlot`, `Button`, `StatusButton`, `Tooltip`, `DropdownMenu`. Wrap the whole thing in `<AppFrame url="app.northbound.studio">`.

---

### 4.7 ⌘K command palette

**States** — closed (hint pill) / open (default, first row selected) · type-to-filter · keyboard ↑↓ wrap, ↵ run, esc close · grouped results (Navigation / Actions / Help) · **empty / no-match → suggested action chips** (Create project, Invite, Toggle theme, Contact support) · running an action fires a toast · sidebar nav swaps main content (Dashboard stats / Projects list / Clients / Invoices table / Settings) · mobile (sidebar hides) · dark · reduced-motion (no overlay/pop animation).

```tsx
export function CommandPalette({ commands, onClose }: { commands: Cmd[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const q = query.trim().toLowerCase();
  const flat = commands.filter((c) => !q || c.label.toLowerCase().includes(q) || c.kw?.includes(q) || c.group.toLowerCase().includes(q));
  const groups = groupBy(flat, "group");
  const choose = (c?: Cmd) => { c?.run(); onClose(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => (s + 1) % flat.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (s - 1 + flat.length) % flat.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(flat[sel]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="cmd-overlay absolute inset-0 z-20 flex justify-center bg-[oklch(20%_.03_260/.4)] pt-[60px] backdrop-blur-[2px]">
      <div role="dialog" aria-label="Command palette" onKeyDown={onKeyDown}
        className="cmd-pop flex max-h-[430px] w-[min(560px,90%)] flex-col overflow-hidden rounded-[14px] border border-border bg-popover text-popover-foreground shadow-[0_32px_70px_-24px_oklch(20%_.04_260/.55)]">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <Search className="h-[18px] w-[18px] text-muted-foreground" />
          <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setSel(0); }} placeholder="Search projects, actions, people…"
            className="flex-1 bg-transparent text-[15.5px] outline-none placeholder:text-muted-foreground" />
          <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">esc</span>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {flat.length === 0 ? (
            // EMPTY / NO-MATCH STATE
            <div className="px-5 py-7 text-center text-muted-foreground">
              <div className="mx-auto mb-3 grid h-[42px] w-[42px] place-items-center rounded-xl bg-muted"><Search className="h-5 w-5" /></div>
              <p>No results for <b className="text-foreground">“{query}”</b></p>
              <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.07em]">Try one of these instead</span>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {commands.filter((c) => ["new-project","invite","theme","support"].includes(c.id)).map((c) => (
                  <button key={c.id} onClick={() => choose(c)}
                    className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card py-1.5 pl-2 pr-3.5 text-[13px] font-medium hover:border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] hover:bg-[--brand-soft]">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-muted-foreground group-hover:bg-[--brand] group-hover:text-white"><c.icon className="h-3 w-3" /></span>{c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : groups.map((g) => (
            <div key={g.name}>
              <div className="px-2.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{g.name}</div>
              {g.items.map((c) => {
                const idx = flat.indexOf(c);
                return (
                  <div key={c.id} onMouseMove={() => setSel(idx)} onClick={() => choose(c)}
                    className={`flex cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2 ${idx === sel ? "bg-[--brand-soft]" : ""}`}>
                    <span className={`grid h-[29px] w-[29px] place-items-center rounded-lg ${idx === sel ? "bg-[--brand] text-white" : "bg-muted text-muted-foreground"}`}><c.icon className="h-[15px] w-[15px]" /></span>
                    <span className="flex-1 text-sm">{c.label}</span>
                    {c.keys?.length > 0 && <span className="flex gap-1">{c.keys.map((k) => <kbd key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{k}</kbd>)}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-[color-mix(in_srgb,var(--muted)_40%,var(--popover))] px-3.5 py-2.5 text-xs text-muted-foreground">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> select</span><span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
// global trigger: keydown (e.metaKey||e.ctrlKey) && e.key==='k' → toggle open
```

```css
@media (prefers-reduced-motion: no-preference) {
  .cmd-overlay { animation: cmdfade .14s ease; }
  .cmd-pop     { animation: cmdpop .16s cubic-bezier(.2,.8,.3,1); }
  @keyframes cmdfade { from{opacity:0} to{opacity:1} }
  @keyframes cmdpop  { from{opacity:0;transform:translateY(-6px) scale(.985)} to{opacity:1;transform:none} }
}
```

---

### 4.8 FAQ accordion (NET-NEW component)

**States** — collapsed (default, item 0 open) · open (plus icon `rotate(45°)` → brand fill, body grid-rows `0fr→1fr`) · hover (question → brand) · focus-visible ring · single-open behaviour · mobile (stacks) · dark · reduced-motion (no height transition / rotate).

```tsx
const FAQS = [ /* { q, a } … */ ];
export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="bg-[color-mix(in_srgb,var(--muted)_42%,var(--background))] py-[clamp(64px,9vw,116px)]">
      <div className="mx-auto grid max-w-[1180px] items-start gap-[clamp(28px,6vw,72px)] px-[clamp(20px,4vw,48px)] md:grid-cols-[0.82fr_1.18fr]">
        <div data-reveal>
          <SectionHead eyebrow="FAQ" title="Questions, answered." lead="The essentials before we start." />
          <Button size="lg" className="mt-6">Talk to us</Button>
        </div>
        <div data-reveal className="border-t border-border">
          {FAQS.map((f, i) => {
            const isOpen = open === i, id = `faq-${i}`;
            return (
              <div key={i} className="border-b border-border">
                <button aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? -1 : i)}
                  className="group flex w-full items-center gap-[18px] py-[22px] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[--ring]">
                  <span className={`flex-1 text-[17.5px] font-medium tracking-[-0.01em] transition-colors ${isOpen ? "text-foreground" : "group-hover:text-[--brand]"}`}>{f.q}</span>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-[transform,background,color] duration-300
                    ${isOpen ? "rotate-45 border-transparent bg-[--brand] text-white" : "border-border bg-card text-muted-foreground"}`}><Plus className="h-[15px] w-[15px]" /></span>
                </button>
                <div id={id} role="region" className="grid transition-[grid-template-rows] duration-[340ms] ease-[cubic-bezier(.3,.7,.3,1)]" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden"><p className="max-w-[62ch] pb-6 pr-[50px] text-[15.5px] leading-[1.62] text-muted-foreground text-pretty">{f.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

---

### 4.9 Theme customizer (floating dock, NET-NEW)

**States** — minimized (FAB pill showing accent name + swatch) / expanded (card) · accent preset swatches (active = ring) · hue / chroma / light sliders (gradient tracks) · **3-way theme** segment (Light / Dark / System) · **button-hover cursor** segment (Pointer / Default) · changes re-theme the whole page live + persist · its own controls always keep `cursor: pointer` · reduced-motion (no pop animation).

```tsx
export function ThemeCustomizer({ accent, setAccent, mode, cycleTheme, pointer, setPointer, open, setOpen }: Props) {
  const presetId = matchPreset(accent.l, accent.c, accent.h);
  const { l, c, h } = accent;
  const ThemeIcon = THEME_ICON[mode];
  return (
    <div className="fixed bottom-5 left-1/2 z-[95] -translate-x-1/2">
      {open ? (
        <div role="dialog" aria-label="Theme controls" className="cmd-pop w-[min(560px,94vw)] rounded-2xl border border-border bg-[color-mix(in_srgb,var(--card)_90%,transparent)] p-4 shadow-[0_28px_64px_-22px_rgba(0,0,0,.5)] backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold"><span className="h-2 w-2 rounded-full bg-[--brand]" />Theme — live</span>
            <span className="flex-1" />
            <button onClick={cycleTheme} className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-border px-3 text-[13px] font-medium hover:bg-accent"><ThemeIcon className="h-3.5 w-3.5" />{cap(mode)}</button>
            <button onClick={() => setOpen(false)} aria-label="Minimize" className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent">–</button>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            {/* preset swatches */}
            <Group cap="Accent">
              {ACCENT_PRESETS.map((p) => (
                <button key={p.id} title={p.name} onClick={() => setAccent(p)}
                  className={`h-[26px] w-[26px] rounded-full outline-2 outline-offset-2 ${presetId === p.id ? "outline-foreground" : "outline-transparent"}`}
                  style={{ background: `oklch(${p.l}% ${p.c} ${p.h})` }} />
              ))}
            </Group>
            <Sep/>
            {/* hue / chroma / light sliders — gradient track backgrounds */}
            <Slider label="Hue"    min={0} max={360} step={1}     value={h} onChange={(v) => setAccent({ ...accent, h: v })} />
            <Slider label="Chroma" min={0} max={0.3} step={0.005} value={c} onChange={(v) => setAccent({ ...accent, c: v })} />
            <Slider label="Light"  min={30} max={92} step={1}     value={l} onChange={(v) => setAccent({ ...accent, l: v })} />
            <Sep/>
            {/* button-hover cursor */}
            <Group cap="Button hover">
              <Segment options={[["Pointer", true], ["Default", false]]} value={pointer} onChange={setPointer} />
            </Group>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} aria-label="Open theme controls"
          className="inline-flex h-[46px] items-center gap-2.5 rounded-full border border-border bg-[color-mix(in_srgb,var(--card)_88%,transparent)] pl-2 pr-4 text-[13.5px] font-medium shadow-[0_16px_40px_-16px_rgba(0,0,0,.45)] backdrop-blur-xl hover:-translate-y-px">
          <span className="h-[30px] w-[30px] rounded-full bg-[--brand] shadow-[0_0_0_3px_var(--brand-soft)]" />{presetId ? cap(presetId) : "Custom"} theme <Pencil className="h-3.5 w-3.5 opacity-60" />
        </button>
      )}
    </div>
  );
}
/* range track gradients: hue = oklch sweep of H; chroma = C 0→0.3; light = L 28→95% */
```

---

### 4.10 Final CTA

**States** — default (brand gradient band) · ambient glow · button hover (light btn lift; ghost btn fill) · scroll-reveal · mobile (buttons wrap) · dark (band stays brand-derived, readable).

```tsx
export function ClosingCTA() {
  return (
    <section id="contact" className="py-[clamp(64px,9vw,116px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,48px)]">
        <div data-reveal className="relative overflow-hidden rounded-3xl px-[clamp(24px,4vw,48px)] py-[clamp(44px,7vw,80px)] text-center text-white
          bg-[linear-gradient(135deg,oklch(from_var(--brand)_calc(l-0.13)_c_h),oklch(from_var(--brand)_calc(l-0.26)_calc(c*0.7)_h))]">
          <div className="pointer-events-none absolute -right-20 -top-[120px] h-[420px] w-[420px] blur-[10px] bg-[radial-gradient(closest-side,oklch(from_var(--brand)_calc(l+0.13)_c_h/.5),transparent_70%)]" />
          <h2 className="relative text-[clamp(30px,4vw,48px)] font-semibold tracking-[-0.035em] text-balance">Let's build something worth shipping.</h2>
          <p className="relative mx-auto mt-4 max-w-[48ch] text-[17px] leading-[1.55] text-white/80">Tell us what you're making. We'll come back with a plan and a fixed price — usually within a day.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <button className="h-[46px] rounded-[11px] bg-white px-6 font-semibold text-[oklch(from_var(--brand)_calc(l-0.25)_c_h)] transition-transform hover:-translate-y-px">Start a project</button>
            <button className="h-[46px] rounded-[11px] border border-white/40 px-6 font-medium text-white transition-colors hover:bg-white/10">Book a call</button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

### 4.11 Footer

**States** — default · link hover (opacity→1, color→brand) · mobile (`<820px` 2-col) · dark.

```tsx
export function Footer() {
  return (
    <footer className="border-t border-border py-[clamp(48px,6vw,76px)] pb-10">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,48px)]">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.7fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-base font-semibold"><span className="h-[22px] w-[22px] rounded-[7px] bg-[--brand]" />northbound</div>
            <p className="mt-3.5 max-w-[30ch] text-sm leading-[1.6] text-muted-foreground">An independent product studio. We design and build polished web products, end to end.</p>
          </div>
          {FOOT_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">{col.title}</h4>
              {col.links.map((l) => <a key={l.label} href={l.href} className="mb-2.5 block text-sm text-foreground/80 transition-[color,opacity] hover:text-[--brand] hover:opacity-100">{l.label}</a>)}
            </div>
          ))}
        </div>
        <div className="mt-11 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground">
          <span>© 2026 Northbound Studio</span><span>Designed &amp; built in Switzerland</span>
        </div>
      </div>
    </footer>
  );
}
```

---

## 5. Page assembly

```tsx
export default function Landing() {
  const [mode, setMode] = useState<Mode>("light");
  const cycleTheme = () => setMode((m) => (["light","dark","system"] as const)[(["light","dark","system"].indexOf(m)+1)%3]);
  return (
    <ThemeProvider>
      <Nav mode={mode} cycleTheme={cycleTheme} />
      <Hero />
      <Services />
      <HowItWorks />
      <Work />
      <Playground />     {/* AppFrame + Carousel */}
      <CodeSample />
      <CommandSection /> {/* AppFrame + CommandPalette + global ⌘K */}
      <Pricing />        {/* tiers: Sprint / Project(feat) / Embedded — CHF, fixed-scope */}
      <FAQ />
      <ClosingCTA />
      <Footer />
      <ThemeCustomizer … />
    </ThemeProvider>
  );
}
```

> **Pricing** (not separately listed above) is a 3-tier grid (Sprint · **Project** featured · Embedded), CHF, `rounded-[18px]`, featured tier ringed in `--brand`; states: default · hover lift · featured emphasis · mobile 1-col · dark.

---

## 6. Reconcile list (action items)

- **Accordion**, **CommandPalette**, **CodeBlock**, **Carousel**, **AppFrame**, **ThemeCustomizer**, **ImageSlot** → promote into the Foundation or a shared package.
- **Tokens to adopt**: `--brand` (= `--primary`), `--brand-soft`, `--brand-glow`, the code-block syntax palette, the invoice status colors.
- Confirm the **default accent** (currently Pine `oklch(60% 0.135 172)`) — it overrides the Foundation's near-monochrome `--primary`.
- **Livediag** copy is a placeholder (site returned no readable content) — replace with a real one-liner.
