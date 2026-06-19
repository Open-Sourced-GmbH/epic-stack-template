const E = window.EpicUI || {};
const {
  Button, Checkbox, Input, Textarea, Label, StatusButton, InputOTP,
  InputOTPGroup, InputOTPSlot, InputOTPSeparator,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  Slider, CommandPalette,
} = E;

const demoCommands = [
  { id: 'new', title: 'New project', group: 'Actions', keywords: ['create'], run: () => {} },
  { id: 'invite', title: 'Invite teammate', group: 'Actions', run: () => {} },
  { id: 'settings', title: 'Open settings', group: 'Navigate', href: '#' },
  { id: 'billing', title: 'Billing & plan', group: 'Navigate', href: '#' },
  { id: 'docs', title: 'Read the docs', group: 'Help', href: '#' },
];
const { tokens, matrix, proposals } = window.HANDOFF;

function useDark() {
  const [dark, setDark] = React.useState(
    () => localStorage.getItem('handoff-dark') === '1'
  );
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('handoff-dark', dark ? '1' : '0');
  }, [dark]);
  return [dark, setDark];
}

const StateDot = ({ v }) => {
  const map = {
    y: ['d-y', '✓'], n: ['d-n', '✕'], partial: ['d-p', '◐'],
  };
  if (v === 'na') return <span className="dot d-na">–</span>;
  if (map[v]) return <span className={'dot ' + map[v][0]}>{map[v][1]}</span>;
  return <span className="dot d-p" title={v}>◐</span>;
};

const NavLink = ({ id, children }) => (
  <a href={'#' + id}>{children}</a>
);

function SecHead({ no, title, sub, id }) {
  return (
    <div>
      <div className="sec-head">
        <span className="sec-no">{no}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {sub && <p className="sec-sub">{sub}</p>}
    </div>
  );
}

/* ── 1 · Tokens ── */
function TokensSection({ dark }) {
  return (
    <section id="tokens">
      <SecHead no="01" title="Tokens" sub="The real design surface is ~24 semantic tokens with full light/dark parity. A brand accent (--brand, repo ADR 062) drives --primary and --ring, so one value re-tints every primary action and focus ring — and it stays mode-independent (same Pine in light and dark). Toggle the theme in the top bar to compare; swatches show the active mode." />
      <div className="grid sw-grid">
        {tokens.map(([name, light, darkv, role]) => (
          <div className="sw" key={name}>
            <div className="sw-chip">
              <div style={{ background: dark ? darkv : light }} />
            </div>
            <div className="sw-meta">
              <div className="sw-name">--{name}</div>
              <div className="sw-role">{role}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 16 }} />
      <div className="callout">
        <div className="bar" />
        <div>
          <b>Token cleanup, P1.</b> The manifest now counts 207 tokens, but only ~24 are real semantic design decisions — the rest are Tailwind v4 internals like <code>--tw-translate-x</code> and <code>--tw-shadow</code>, and the count keeps growing on every sync. Ship a curated <code>tokens.css</code> declaring only the semantic set, and stop surfacing <code>--tw-*</code> as "design tokens." Also resolve the confusing pair <code>--destructive-foreground</code> (text <i>on</i> a red fill) vs <code>--foreground-destructive</code> (red error <i>text</i>) — alias the latter to something like <code>--error-text</code>. Full fix in <a className="inline" href="sync-token-fix.md">sync-token-fix.md</a>.
        </div>
      </div>
    </section>
  );
}

/* ── 2 · Radius + type ── */
function ScaleSection() {
  const radii = [['sm', 'calc(var(--radius) - 4px)'], ['md', 'calc(var(--radius) - 2px)'], ['lg', 'var(--radius)'], ['xl', 'calc(var(--radius) + 4px)']];
  const type = [
    ['text-mega', '5rem', '80px', 'Hero'],
    ['text-h1', '3.5rem', '56px', 'Page title'],
    ['text-h2', '2.5rem', '40px', 'Section'],
    ['text-h3', '2rem', '32px', 'Subsection'],
    ['text-body-md', '1.25rem', '20px', 'Body'],
    ['text-body-sm', '1rem', '16px', 'UI text'],
    ['text-caption', '1.125rem', '18px', 'Caption · 600'],
    ['text-button', '0.75rem', '12px', 'Button · 700'],
  ];
  return (
    <section id="scale">
      <SecHead no="02" title="Radius & type" sub="One --radius (0.5rem) derives the whole rounding scale. The type scale ships as text-* utilities with baked-in weight and line-height — don't add font-bold to headings." />
      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {radii.map(([n, v]) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: v }} />
                <div className="sw-name" style={{ marginTop: 8 }}>rounded-{n}</div>
              </div>
            ))}
          </div>
          <div className="footnote">Inputs &amp; buttons use <b>rounded-md</b>; cards use <b>rounded-lg</b>+.</div>
        </div>
        <div className="card typescale">
          {type.map(([n, rem, px, role]) => (
            <div key={n}>
              <span className="tn">{n}</span>
              <span style={{ fontSize: rem, lineHeight: 1, letterSpacing: '-0.02em', fontWeight: parseInt(px) > 20 ? 700 : 450 }}>Ag</span>
              <span className="sw-role" style={{ marginLeft: 'auto' }}>{px} · {role}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3 · Coverage matrix ── */
function MatrixSection() {
  const cols = ['default', 'hover', 'focus', 'disabled', 'invalid', 'loading'];
  return (
    <section id="matrix">
      <SecHead no="03" title="Component coverage" sub="Twelve components, all real upstream code — three (Accordion · Slider · CommandPalette) added since the original audit. Columns track documented/shipped states. ✓ covered · ◐ partial or undocumented · ✕ missing · – not applicable." />
      <div className="tbl-scroll">
        <table>
          <thead>
            <tr>
              <th>Component</th><th>API</th>
              {cols.map(c => <th key={c} className="statecol">{c}</th>)}
              <th>Gaps to address upstream</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(r => (
              <tr key={r.name}>
                <td className="compname">{r.name}</td>
                <td className="api">{r.api}</td>
                {cols.map(c => <td key={c} className="statecol"><StateDot v={r.states[c]} /></td>)}
                <td className="gaps">{r.gaps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ height: 16 }} />
      <div className="callout">
        <div className="bar" style={{ background: 'var(--destructive)' }} />
        <div>
          <b>Inconsistent error states, P0.</b> <code>aria-invalid</code> is wired and documented on <b>Input</b>, but <b>Textarea</b>, <b>Checkbox</b>, and <b>InputOTP</b> have no shown invalid state — even though <code>--input-invalid</code> and <code>--foreground-destructive</code> exist. Standardize the invalid treatment across every form control.
        </div>
      </div>
    </section>
  );
}

/* ── 4 · Live states ── */
function Demo({ name, children }) {
  return (
    <div className="demo card">
      <div className="demo-h"><b>{name}</b></div>
      <div className="demo-body">{children}</div>
    </div>
  );
}

function LiveSection() {
  const [otp, setOtp] = React.useState('12');
  return (
    <section id="live">
      <SecHead no="04" title="Live components" sub="Rendered from the real bundle (window.EpicUI). All twelve shipping components — nothing mocked. Accordion, Slider, and CommandPalette (tagged “new”) landed after the original audit." />
      <div className="grid demos">
        <Demo name="Button — variants">
          {['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'].map(v =>
            Button ? <Button key={v} variant={v}>{v}</Button> : null)}
        </Demo>
        <Demo name="Button — sizes & disabled">
          {Button && <Button size="sm">sm</Button>}
          {Button && <Button>default</Button>}
          {Button && <Button size="lg">lg</Button>}
          {Button && <Button disabled>disabled</Button>}
        </Demo>
        <Demo name="StatusButton">
          {StatusButton && <StatusButton status="idle">idle</StatusButton>}
          {StatusButton && <StatusButton status="pending" spinDelay={{ delay: 0, minDuration: 0 }}>pending</StatusButton>}
          {StatusButton && <StatusButton status="success">success</StatusButton>}
          {StatusButton && <StatusButton status="error">error</StatusButton>}
        </Demo>
        <Demo name="Input — states">
          <div style={{ display: 'grid', gap: 10, width: '100%' }}>
            {Input && <Input placeholder="Default" />}
            {Input && <Input placeholder="Disabled" disabled />}
            {Input && <Input aria-invalid defaultValue="bad value" />}
          </div>
        </Demo>
        <Demo name="Textarea">
          {Textarea && <Textarea placeholder="Write something…" style={{ width: '100%' }} />}
        </Demo>
        <Demo name="Checkbox + Label">
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {Checkbox && <Checkbox id="d1" defaultChecked />}{Label && <Label htmlFor="d1">Checked</Label>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {Checkbox && <Checkbox id="d2" />}{Label && <Label htmlFor="d2">Unchecked</Label>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {Checkbox && <Checkbox id="d3" disabled />}{Label && <Label htmlFor="d3">Disabled</Label>}
            </div>
          </div>
        </Demo>
        <Demo name="InputOTP">
          {InputOTP && (
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          )}
        </Demo>
        <Demo name="DropdownMenu">
          {DropdownMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </Demo>
        <Demo name="Tooltip">
          {Tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
                <TooltipContent>Helpful hint</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Demo>
        <Demo name="Accordion — new">
          {Accordion && (
            <Accordion defaultValue="a-1" style={{ width: '100%' }}>
              <AccordionItem value="a-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>Yes — built on Radix, WAI-ARIA disclosure with full keyboard support.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="a-2">
                <AccordionTrigger>Is it themeable?</AccordionTrigger>
                <AccordionContent>Yes — design tokens only, so it follows the brand accent and theme.</AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </Demo>
        <Demo name="Slider — new">
          <div style={{ display: 'grid', gap: 18, width: '100%' }}>
            {Slider && <Slider defaultValue={40} min={0} max={100} aria-label="Volume" />}
            {Slider && <Slider defaultValue={172} min={0} max={360} aria-label="Hue" trackGradient="linear-gradient(to right, oklch(0.7 0.15 0), oklch(0.7 0.15 120), oklch(0.7 0.15 240), oklch(0.7 0.15 360))" />}
          </div>
        </Demo>
        <Demo name="CommandPalette — new">
          {CommandPalette && <div style={{ width: '100%' }}><CommandPalette commands={demoCommands} /></div>}
        </Demo>
      </div>
      <div style={{ height: 16 }} />
      <div className="callout">
        <div className="bar" style={{ background: 'var(--brand)' }} />
        <div>
          <b>Cosy focus (applied here as a preview).</b> Every control now shares one focus treatment — a 1px brand border hugged by a soft <code>--brand-glow</code> halo that eases in and back out, replacing the stock detached 2px offset ring. Click a field or tab through to feel it. Proposed as a DS-wide standard — see <a className="inline" href="AUDIT.md">AUDIT §3</a>.
        </div>
      </div>
    </section>
  );
}

/* ── 5 · Button sizes (reconsidered) ── */
function BtnSizesSection() {
  const B = Button || (() => null);
  const cell = { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' };
  const mono = { fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, color: 'var(--muted-foreground)' };
  const rows = [
    ['sm', <B size="sm">Button</B>, 'h-9 px-3', <B style={{ height: 32, paddingInline: 12 }}>Button</B>, 'h-8 px-3'],
    ['default', <B>Button</B>, 'h-10 px-4 py-2', <B>Button</B>, 'h-10 px-4 · unchanged'],
    ['lg', <B size="lg">Button</B>, 'h-11 px-8', <B style={{ height: 48, paddingInline: 24 }}>Button</B>, 'h-12 px-6'],
    ['pill', <B size="pill">Button</B>, 'px-12 py-3 leading-3', <B style={{ height: 40, paddingInline: 24, borderRadius: 999 }}>Button</B>, 'h-10 px-6 rounded-full'],
    ['icon', <B size="icon">+</B>, 'size-10', <B style={{ width: 40, height: 40, paddingInline: 0 }}>+</B>, 'size-10 · +icon-sm/lg'],
    ['wide', <B size="wide">Button</B>, 'px-24 py-5', <B style={{ height: 40, width: '100%' }}>Button</B>, 'h-10 w-full'],
  ];
  return (
    <section id="sizes">
      <SecHead no="05" title="Button sizes — reconsidered" sub="The shipped scale has drifted: heights don't step cleanly, padding jumps, and two presets are mis-modeled. 'Ships today' is the real bundle; 'Proposed' previews the fix via inline overrides." />
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 1fr', gap: 18, alignItems: 'center' }}>
          <div></div>
          <div className="sw-role" style={{ fontWeight: 600 }}>Ships today</div>
          <div className="sw-role" style={{ fontWeight: 600 }}>Proposed</div>
          {rows.map(([k, cur, curC, prop, propC]) => (
            <React.Fragment key={k}>
              <div className="sw-name">{k}</div>
              <div style={cell}>{cur}<span style={mono}>{curC}</span></div>
              <div style={cell}>{prop}<span style={mono}>{propC}</span></div>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ height: 16 }} />
      <div className="callout">
        <div className="bar" style={{ background: 'var(--brand)' }} />
        <div>
          <b>What's off, and the fix.</b>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
            <li><code>pill</code> isn't round — no <code>rounded-full</code>, just wide padding, and <code>leading-3</code> (12px) can clip the label. Make it a shape at default height: <code>h-10 px-6 rounded-full</code>.</li>
            <li><code>wide</code> sets no height (<code>py-5</code> → ~60px, off-scale) and <code>px-24</code> (96px) is extreme. It's only used as a form submit → model it full-width: <code>h-10 w-full</code>.</li>
            <li>Heights step 36/40/44 and padding jumps 16→32. Propose <b>32 / 40 / 48</b> with padding <b>12 / 16 / 24</b>, and pair <code>icon</code> with <code>icon-sm</code> (32) / <code>icon-lg</code> (48).</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── 6 · Proposals ── */
function ProposalsSection() {
  return (
    <section id="proposals">
      <SecHead no="06" title="Proposed additions" sub="Patterns consumers rebuild by hand today. Most need no new tokens — the system already has the variables, just not the component." />
      <div className="grid props">
        {proposals.map(p => (
          <div className="prop" key={p.name}>
            <div className={'pri pri-' + p.pri[1]}>{p.pri}</div>
            <div>
              <h4>{p.name}</h4>
              <p>{p.why}</p>
              <div className="tok">tokens: <span>{p.tokens}</span></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 7 · Reference screens (built only from shipping components + tokens) ── */
function ReferenceSection() {
  const [email, setEmail] = React.useState('');
  const invalid = email.length > 0 && !email.includes('@');
  return (
    <section id="screens">
      <SecHead no="07" title="Reference screens" sub="Composed only from components and tokens that ship today — directly portable. Where a primitive is missing (Field, Card, Badge, Avatar, Skeleton) it is hand-rolled here, which is exactly the friction the proposals above remove." />
      <div className="grid screens">
        {/* Auth */}
        <div className="screen">
          <div className="screen-cap">// auth — sign in</div>
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 640, letterSpacing: '-0.01em' }}>Welcome back</div>
              <div className="sw-role">Sign in to your account</div>
            </div>
            <div className="field">
              {Label && <Label htmlFor="r-email">Email</Label>}
              {Input && <Input id="r-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={invalid || undefined} />}
              {invalid && <span className="err">Enter a valid email address.</span>}
            </div>
            <div className="field">
              {Label && <Label htmlFor="r-pw">Password</Label>}
              {Input && <Input id="r-pw" type="password" placeholder="••••••••" />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {Checkbox && <Checkbox id="r-remember" defaultChecked />}{Label && <Label htmlFor="r-remember">Remember me</Label>}
            </div>
            {Button && <Button size="wide">Sign in</Button>}
          </div>
        </div>

        {/* Settings + save bar */}
        <div className="screen">
          <div className="screen-cap">// settings — profile + save bar</div>
          <div className="card" style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              {Label && <Label htmlFor="r-name">Display name</Label>}
              {Input && <Input id="r-name" defaultValue="Ada Lovelace" />}
            </div>
            <div className="field">
              {Label && <Label htmlFor="r-bio">Bio</Label>}
              {Textarea && <Textarea id="r-bio" rows={3} defaultValue="Mathematician. First programmer." />}
            </div>
          </div>
          <div style={{ height: 10 }} />
          <div className="savebar">
            <span className="sw-role">Unsaved changes</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {Button && <Button variant="ghost">Discard</Button>}
              {StatusButton && <StatusButton status="idle">Save</StatusButton>}
            </div>
          </div>
        </div>

        {/* Data rows with dropdown */}
        <div className="screen">
          <div className="screen-cap">// team — rows with row actions</div>
          {[['Ada Lovelace', 'ada@epic.dev', 'Owner', 'ok'], ['Grace Hopper', 'grace@epic.dev', 'Admin', 'muted'], ['Alan Turing', 'alan@epic.dev', 'Member', 'muted']].map(([nm, em, role, tone]) => (
            <div className="row" key={em}>
              <div className="who">
                <div className="avatar">{nm.split(' ').map(s => s[0]).join('')}</div>
                <div>
                  <div className="nm">{nm}</div>
                  <div className="em">{em}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={'badge ' + (tone === 'ok' ? 'badge-ok' : 'badge-muted')}>{role}</span>
                {DropdownMenu && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={'Actions for ' + nm}>⋯</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>View profile</DropdownMenuItem>
                      <DropdownMenuItem>Change role</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* States: empty / error / loading */}
        <div className="screen">
          <div className="screen-cap">// states — empty · error · loading</div>
          <div className="empty">
            <div className="ic">▢</div>
            <div className="t">No projects yet</div>
            <div className="s">Create your first project to get started.</div>
            {Button && <Button>New project</Button>}
          </div>
          <div style={{ height: 10 }} />
          <div className="callout" style={{ background: 'color-mix(in oklch, var(--destructive) 8%, var(--card))', borderColor: 'color-mix(in oklch, var(--destructive) 30%, var(--border))' }}>
            <div className="bar" style={{ background: 'var(--destructive)' }} />
            <div><b style={{ color: 'var(--foreground-destructive)' }}>Couldn't load projects.</b><br/><span className="sw-role">Check your connection and try again.</span></div>
          </div>
          <div style={{ height: 10 }} />
          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <div className="skel" style={{ width: '40%' }} />
            <div className="skel" style={{ width: '85%' }} />
            <div className="skel" style={{ width: '70%' }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [dark, setDark] = useDark();
  return (
    <React.Fragment>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand"><b>Epic Stack UI</b><span className="ver">epic-stack-template@0.1.0</span></div>
          <div className="spacer" />
          <nav className="navlinks">
            <NavLink id="tokens">Tokens</NavLink>
            <NavLink id="matrix">Coverage</NavLink>
            <NavLink id="live">Components</NavLink>
            <NavLink id="proposals">Proposals</NavLink>
            <NavLink id="screens">Screens</NavLink>
          </nav>
          <button className="mode-toggle" onClick={() => setDark(d => !d)}>
            {dark ? '☾ Dark' : '☀ Light'}
          </button>
        </div>
      </div>
      <div className="wrap">
        <header className="hero">
          <p className="eyebrow">Design system · handoff · re-audit</p>
          <h1>Polished, audited, ready to feed back to the repo.</h1>
          <p className="lede">A live re-review of the now <b>12-component</b> Epic Stack UI library: token health, state coverage, accessibility gaps, and the components worth adding upstream. Three components (Accordion, Slider, CommandPalette) shipped since the last pass — none adopted the audit's earlier recommendations, so every open item still stands and now spans a larger surface.</p>
          <div className="stats">
            <div className="stat"><div className="n">12</div><div className="l">Components shipping (+3)</div></div>
            <div className="stat"><div className="n">~24</div><div className="l">Semantic tokens (of 207 declared)</div></div>
            <div className="stat"><div className="n">2</div><div className="l">P0 gaps · Field &amp; Card</div></div>
            <div className="stat"><div className="n">100%</div><div className="l">Dark-mode token parity</div></div>
          </div>
        </header>

        <TokensSection dark={dark} />
        <ScaleSection />
        <MatrixSection />
        <LiveSection />
        <BtnSizesSection />
        <ProposalsSection />
        <ReferenceSection />

        <section id="next">
          <SecHead no="08" title="What to do next" sub="The full prioritized write-up — with code for the proposed Field and Card — lives in the companion doc, ready to drop into a PR description." />
          <div className="card" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge pri-0" style={{ borderRadius: 6, padding: '3px 9px' }}>P0</span>
              <span>Standardize <b>invalid</b> states across all form controls · add <b>Field</b> &amp; <b>Card</b> primitives.</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge pri-1" style={{ borderRadius: 6, padding: '3px 9px' }}>P1</span>
              <span>Curate <code style={{fontFamily:'var(--font-mono,monospace)',fontSize:12}}>tokens.css</code> · add <b>Alert · Select · Badge · Spinner</b> · promote <b>Dialog</b> (CommandPalette already hand-rolls its focus-trap).</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge pri-2" style={{ borderRadius: 6, padding: '3px 9px' }}>P2</span>
              <span><b>Separator · Switch · RadioGroup · Toast · Skeleton</b>.</span>
            </div>
            <div className="footnote">Read the full recommendations in <a className="inline" href="AUDIT.md">AUDIT.md</a> →</div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
