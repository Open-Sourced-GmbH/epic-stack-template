// Sample data for the Epic Stack blog surfaces. Plain globals (no module).
(function () {
  const authors = {
    kc: { id: 'kc', name: 'Kellie Chen', initials: 'KC', role: 'Staff Engineer', accent: 'oklch(0.58 0.13 172)' },
    mw: { id: 'mw', name: 'Marcus Webb', initials: 'MW', role: 'DX & Tooling', accent: 'oklch(0.55 0.14 264)' },
    pr: { id: 'pr', name: 'Priya Anand', initials: 'PA', role: 'Security', accent: 'oklch(0.6 0.14 40)' },
  };

  // Tag registry. `known: false` is never returned for archives -> drives 404.
  const tags = [
    { slug: 'react', label: 'React' },
    { slug: 'remix', label: 'Remix' },
    { slug: 'testing', label: 'Testing' },
    { slug: 'deployment', label: 'Deployment' },
    { slug: 'security', label: 'Security' },
    { slug: 'database', label: 'Database' },
    { slug: 'typescript', label: 'TypeScript' },
    { slug: 'design-system', label: 'Design System' },
    { slug: 'performance', label: 'Performance' },
    { slug: 'architecture', label: 'Architecture' },
    // a known tag that has *no published posts* -> empty archive state
    { slug: 'changelog', label: 'Changelog' },
  ];

  // Bodies are arrays of literal lines joined with newlines so real
  // triple-backtick fences and inline backticks survive (no String.raw escaping).
  const featuredBody = [
    "A design system only earns its keep when it disappears into the product. The goal isn't a gallery of components — it's that a feature team reaches for `<Button>` without thinking, and the result is on-brand, accessible, and themable by default.",
    "",
    "## Tokens are the contract",
    "",
    "Everything resolves from CSS custom properties declared at `:root` and `.dark`. Color, spacing and radius utilities never carry a hardcoded value — they read a token. That single indirection is what lets dark mode be _a class on the html element_ rather than a parallel stylesheet.",
    "",
    "> Dark mode is not a theme you build. It's a value the tokens already know how to flip.",
    "",
    "Here's the rule we hold the line on in review:",
    "",
    "- **No raw hex** in component or page code. Ever.",
    "- A surface and its text always travel as a **pair** (`bg-card` → `text-card-foreground`).",
    "- New visual values are a **cost**, logged as net-new tokens — not a freebie.",
    "",
    "### Composing, not reinventing",
    "",
    "Compound components ship their own sub-parts. You assemble them; you don't restyle raw markup to look like them.",
    "",
    '```tsx',
    'function SaveBar() {',
    '  return (',
    '    <Card>',
    '      <CardHeader>',
    '        <CardTitle>Unsaved changes</CardTitle>',
    '      </CardHeader>',
    '      <CardFooter className="justify-end gap-2">',
    '        <Button variant="ghost">Discard</Button>',
    '        <Button>Save</Button>',
    '      </CardFooter>',
    '    </Card>',
    '  )',
    '}',
    '```',
    "",
    "The button is the real library component; the layout around it is your own JSX using the same token utilities. That's the whole idiom — and it's why a blog built a year later still looks like it belongs.",
    "",
    "## Where it pays off",
    "",
    "When the marketing site, the app shell, and an admin tool all read from one set of tokens, a brand refresh is a few variable changes instead of a quarter of re-skinning. The system stops being a library you consult and becomes the path of least resistance.",
  ].join('\n');

  const codeBody = [
    "SSR-first means the first byte the browser sees is already the page — no flash of unstyled content, no spinner waterfall. The trick is keeping the data loaders fast and the document streaming.",
    "",
    "## Loaders run on the server",
    "",
    '```ts',
    'export async function loader({ params }: Route.LoaderArgs) {',
    '  const post = await getPublishedPost(params.slug)',
    "  if (!post) throw new Response('Not found', { status: 404 })",
    '  return { post }',
    '}',
    '```',
    "",
    "A missing or draft slug throws a 404 from the loader, so the not-found page is a real response with a real status code — good for crawlers, good for users.",
    "",
    "## No FOUC",
    "",
    'The theme is resolved before paint by reading a cookie on the server and stamping `class="dark"` onto the html element in the initial markup. There is no client round-trip, so the page never flickers from light to dark.',
  ].join('\n');

  const shortBody = [
    "Route-based dialogs were the right call for confirmations that should survive a refresh. But a transient confirm step — \"unpublish this post?\" — isn't content-bearing and shouldn't be bookmarkable.",
    "",
    "## The exception",
    "",
    '```tsx',
    '<Dialog open={confirming} onOpenChange={setConfirming}>',
    '  <DialogContent>',
    '    <DialogTitle>Unpublish this post?</DialogTitle>',
    '    <DialogDescription>',
    '      Readers will get a 404 until you publish again.',
    '    </DialogDescription>',
    '  </DialogContent>',
    '</Dialog>',
    '```',
    "",
    "Reach for a page when the content should be linkable. Reach for the overlay when it's a momentary decision.",
  ].join('\n');


  // publishedAt as ISO; null author => "Unknown" byline fallback (SetNull)
  const posts = [
    {
      id: 'p1', slug: 'design-systems-that-disappear', status: 'published',
      title: 'Design systems that disappear into the product',
      excerpt: 'A system earns its keep when a feature team reaches for a component without thinking — and the result is on-brand, accessible, and themable by default.',
      authorId: 'kc', publishedAt: '2026-06-12', readMin: 6, featured: true,
      cover: 'pine', tags: ['design-system', 'architecture'], body: featuredBody,
    },
    {
      id: 'p2', slug: 'ssr-first-no-fouc', status: 'published',
      title: 'SSR-first, and the end of the flash of unstyled content',
      excerpt: 'The first byte the browser sees is already the page. Here is how the loaders, the theme cookie, and streaming cooperate to kill FOUC.',
      authorId: 'mw', publishedAt: '2026-06-05', readMin: 5,
      cover: 'slate', tags: ['remix', 'performance'], body: codeBody,
    },
    {
      id: 'p3', slug: 'route-dialogs-vs-overlays', status: 'published',
      title: 'When a confirmation deserves a route — and when it does not',
      excerpt: 'ADR 023 moved dialogs to pages. The transient confirm step is the deliberate exception. A short field guide.',
      authorId: null, publishedAt: '2026-05-28', readMin: 3,
      cover: 'amber', tags: ['architecture'], body: shortBody,
    },
    {
      id: 'p4', slug: 'typed-loaders-end-to-end', status: 'published',
      title: 'Typed loaders, end to end, without the ceremony',
      excerpt: 'Inference from the loader to the component means the data shape is checked at the boundary you actually care about.',
      authorId: 'mw', publishedAt: '2026-05-19', readMin: 7,
      cover: 'pine', tags: ['typescript', 'remix'], body: codeBody,
    },
    {
      id: 'p5', slug: 'passkeys-by-default', status: 'published',
      title: 'Shipping passkeys by default (and keeping passwords for the holdouts)',
      excerpt: 'WebAuthn is no longer the exotic path. Here is the migration we ran and the fallbacks we kept.',
      authorId: 'pr', publishedAt: '2026-05-09', readMin: 8,
      cover: 'slate', tags: ['security'], body: shortBody,
    },
    {
      id: 'p6', slug: 'sqlite-in-production', status: 'published',
      title: 'SQLite in production is not a dare anymore',
      excerpt: 'With Litestream replication and a sensible backup story, a single-file database carries a surprising amount of load.',
      authorId: 'kc', publishedAt: '2026-04-30', readMin: 6,
      cover: 'amber', tags: ['database', 'deployment'], body: codeBody,
    },
    {
      id: 'p7', slug: 'testing-the-seams', status: 'published',
      title: 'Test the seams, not the implementation',
      excerpt: 'Playwright for the journeys that matter, Vitest for the units that break. A pragmatic split that survives refactors.',
      authorId: 'mw', publishedAt: '2026-04-21', readMin: 5,
      cover: 'pine', tags: ['testing'], body: shortBody,
    },
    {
      id: 'p8', slug: 'accessible-by-construction', status: 'published',
      title: 'Accessible by construction, not by audit',
      excerpt: 'Landmarks, heading order, and focus management are cheaper to build in than to retrofit. The primitives do most of the work.',
      authorId: 'pr', publishedAt: '2026-04-11', readMin: 6,
      cover: 'slate', tags: ['design-system', 'react'], body: shortBody,
    },
    {
      id: 'p9', slug: 'the-command-palette-pattern', status: 'published',
      title: 'The command palette as a navigation primitive',
      excerpt: 'Once ⌘K exists, it wants to absorb every shortcut. Here is how we keep the registry grouped, fast, and discoverable.',
      authorId: 'kc', publishedAt: '2026-04-02', readMin: 4,
      cover: 'amber', tags: ['react', 'design-system'], body: shortBody,
    },
    {
      id: 'p10', slug: 'deploys-you-can-sleep-through', status: 'published',
      title: 'Deploys you can sleep through',
      excerpt: 'Health checks, rolling restarts, and a rollback that is one command. Boring on purpose.',
      authorId: 'mw', publishedAt: '2026-03-22', readMin: 5,
      cover: 'pine', tags: ['deployment'], body: codeBody,
    },
    {
      id: 'p11', slug: 'measuring-what-users-feel', status: 'published',
      title: 'Measuring what users feel, not what servers report',
      excerpt: 'Server timing is necessary but not sufficient. Field metrics tell you whether the page felt fast where it counts.',
      authorId: 'pr', publishedAt: '2026-03-10', readMin: 7,
      cover: 'slate', tags: ['performance'], body: codeBody,
    },
    // Drafts -> appear in admin, 404 on public detail, excluded from feeds
    {
      id: 'd1', slug: 'multi-tenant-without-tears', status: 'draft',
      title: 'Multi-tenant without tears (working title)',
      excerpt: 'Row-level scoping, a tenant in the session, and the migration that gets you there.',
      authorId: 'kc', publishedAt: null, readMin: 9,
      cover: 'pine', tags: ['architecture', 'database'], body: shortBody,
    },
    {
      id: 'd2', slug: 'untitled-draft', status: 'draft',
      title: '',
      excerpt: '',
      authorId: 'mw', publishedAt: null, readMin: 0,
      cover: 'slate', tags: [], body: '',
    },
  ];

  function published() {
    return posts
      .filter((p) => p.status === 'published')
      .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  }

  window.BLOG = {
    authors, tags, posts,
    author: (id) => (id ? authors[id] : null),
    tag: (slug) => tags.find((t) => t.slug === slug) || null,
    published,
    bySlug: (slug) => posts.find((p) => p.slug === slug) || null,
    byId: (id) => posts.find((p) => p.id === id) || null,
    publishedByTag: (slug) => published().filter((p) => p.tags.includes(slug)),
    fmtDate: (iso) =>
      iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
  };
})();
