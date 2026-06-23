/* Admin surfaces: post list + editor (with tag-input variants). */
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const { navigate, Byline, useReveal, Icon } = window;
  const E = window.EpicUI;
  const {
    Button, StatusButton, Badge, Card, CardHeader, CardTitle, CardContent, CardFooter,
    Field, Input, Textarea, Label, Skeleton,
    Dialog, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose,
    Alert, AlertTitle, AlertDescription, Avatar, AvatarFallback,
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  } = E;
  const B = window.BLOG;

  const statusBadge = (s) => s === 'published'
    ? <Badge className="st-badge st-pub">Published</Badge>
    : <Badge variant="outline" className="st-badge">Draft</Badge>;

  /* ---------------- POST LIST ---------------- */
  function AdminList({ t }) {
    const demo = t && t.demoState;
    const [loading, setLoading] = useState(demo === 'loading');
    const [confirm, setConfirm] = useState(null); // {type:'delete'|'unpublish', post}
    const [posts, setPosts] = useState(() => B.posts.slice());
    const ref = useReveal([loading, posts.length, demo]);

    useEffect(() => {
      if (demo === 'loading') { setLoading(true); const tm = setTimeout(() => setLoading(false), 800); return () => clearTimeout(tm); }
      setLoading(false);
    }, [demo]);

    const list = demo === 'empty' ? [] : posts;
    const published = list.filter((p) => p.status === 'published').length;

    const doToggle = (post) => {
      setPosts((ps) => ps.map((p) => p.id === post.id ? { ...p, status: p.status === 'published' ? 'draft' : 'published', publishedAt: p.status === 'published' ? null : new Date().toISOString().slice(0, 10) } : p));
    };
    const doDelete = (post) => setPosts((ps) => ps.filter((p) => p.id !== post.id));

    return (
      <main className="shell page" ref={ref}>
        <header className="page-head flex between items-center" data-reveal style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="eyebrow">Admin</span>
            <h1 className="page-title" style={{ fontSize: 'clamp(1.7rem,3vw,2.3rem)' }}>Posts</h1>
            <p className="page-sub" style={{ marginTop: '0.5rem' }}>{list.length} total · {published} published</p>
          </div>
          <Button onClick={() => navigate('/admin/blog/new')}><Icon name="plus" /> New post</Button>
        </header>

        {loading ? (
          <Card data-reveal><CardContent style={{ padding: '0.25rem 0' }}>
            <div className="sk-rows">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="sk-row">
                  <div className="sk" style={{ width: '3.4rem', height: '2.3rem', borderRadius: '0.4rem' }} />
                  <div className="sk-grow">
                    <div className="sk" style={{ width: '42%', height: '0.95rem', borderRadius: '0.3rem' }} />
                    <div className="sk" style={{ width: '24%', height: '0.72rem', borderRadius: '0.3rem' }} />
                  </div>
                  <div className="sk" style={{ width: '5.5rem', height: '1.5rem', borderRadius: '999px' }} />
                  <div className="sk" style={{ width: '6rem', height: '0.8rem', borderRadius: '0.3rem' }} />
                  <div className="sk" style={{ width: '7rem', height: '2rem', borderRadius: '0.5rem' }} />
                </div>
              ))}
            </div>
          </CardContent></Card>
        ) : list.length === 0 ? (
          <div className="empty-state" data-reveal>
            <div className="emoji-free"><Icon name="pencil-2" /></div>
            <h3>No posts yet</h3>
            <p>Start your first post — write in Markdown, preview live, and publish when it’s ready.</p>
            <Button onClick={() => navigate('/admin/blog/new')}><Icon name="plus" /> New post</Button>
          </div>
        ) : (
          <Card data-reveal>
            <CardContent style={{ padding: '1rem 0.25rem 0.5rem' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '3.6rem' }}></th>
                    <th>Title</th>
                    <th style={{ width: '7rem' }}>Status</th>
                    <th style={{ width: '8rem' }}>Updated</th>
                    <th style={{ width: '7.5rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const a = B.author(p.authorId);
                    const pub = p.status === 'published';
                    return (
                      <tr key={p.id} className="admin-row" onClick={() => navigate('/admin/blog/' + p.id + '/edit')}>
                        <td><div className="row-thumb cover" data-art={p.cover} /></td>
                        <td>
                          <div className={'t-title' + (p.title ? '' : ' is-untitled')}>{p.title || 'Untitled draft'}</div>
                          <div className="t-author">
                            <window.AuthorAvatar author={a} className="size-5" fs="0.5rem" />
                            <span className="t-name">{a ? a.name : 'Unknown'}</span>
                            <span className="t-slug">/{p.slug}</span>
                          </div>
                        </td>
                        <td>{statusBadge(p.status)}</td>
                        <td className="t-meta">{p.publishedAt ? B.fmtDate(p.publishedAt) : '—'}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/blog/' + p.id + '/edit')}><Icon name="pencil-1" /> Edit</Button>
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger className="icon-trigger" aria-label="More actions">
                                <Icon name="dots-horizontal" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" side="bottom" sideOffset={6} collisionPadding={12} className="row-menu">
                                {pub && (
                                  <DropdownMenuItem className="dm-item" onSelect={() => navigate('/blog/' + p.slug)}>
                                    <Icon name="arrow-right" /> View live
                                  </DropdownMenuItem>
                                )}
                                {pub
                                  ? <DropdownMenuItem className="dm-item" onSelect={() => setConfirm({ type: 'unpublish', post: p })}><Icon name="lock-closed" /> Unpublish</DropdownMenuItem>
                                  : <DropdownMenuItem className="dm-item" onSelect={() => doToggle(p)}><Icon name="check" /> Publish</DropdownMenuItem>}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="dm-item dm-danger" onSelect={() => setConfirm({ type: 'delete', post: p })}>
                                  <Icon name="trash" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogOverlay />
          <DialogContent style={{ maxWidth: '26rem' }}>
            <DialogTitle>{confirm?.type === 'delete' ? 'Delete this post?' : 'Unpublish this post?'}</DialogTitle>
            <DialogDescription style={{ marginTop: '0.5rem' }}>
              {confirm?.type === 'delete'
                ? <>“{confirm?.post.title || 'Untitled draft'}” will be permanently removed. This can’t be undone.</>
                : <>Readers will get a 404 for “{confirm?.post.title}” until you publish it again.</>}
            </DialogDescription>
            <div className="flex" style={{ justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <DialogClose asChild>
                <Button variant={confirm?.type === 'delete' ? 'destructive' : 'default'}
                  onClick={() => { if (confirm.type === 'delete') doDelete(confirm.post); else doToggle(confirm.post); }}>
                  {confirm?.type === 'delete' ? 'Delete' : 'Unpublish'}
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    );
  }

  /* ---------------- TAG INPUT (3 variants) ---------------- */
  function TagInput({ mode, value, onChange, invalid }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const wrapRef = useRef(null);
    const all = B.tags;
    const available = all.filter((t) => !value.includes(t.slug));
    const filtered = q ? available.filter((t) => t.label.toLowerCase().includes(q.toLowerCase())) : available;
    const exact = all.find((t) => t.label.toLowerCase() === q.trim().toLowerCase());
    const canCreate = q.trim() && !exact;

    useEffect(() => {
      const on = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', on);
      return () => document.removeEventListener('mousedown', on);
    }, []);

    const add = (slug, label) => {
      if (!slug) { // create
        slug = q.trim().toLowerCase().replace(/[^\w]+/g, '-');
        if (!B.tag(slug)) B.tags.push({ slug, label: q.trim() });
      }
      if (!value.includes(slug)) onChange([...value, slug]);
      setQ(''); setActive(0);
      if (mode === 'chips') setOpen(false);
    };
    const remove = (slug) => onChange(value.filter((s) => s !== slug));

    const options = canCreate ? [...filtered, { create: true }] : filtered;

    const onKey = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'chips') { if (q.trim()) add(canCreate ? null : (exact && exact.slug)); return; }
        const opt = options[active];
        if (!opt) return;
        if (opt.create) add(null); else add(opt.slug, opt.label);
      } else if (e.key === 'Backspace' && !q && value.length) {
        remove(value[value.length - 1]);
      }
    };

    return (
      <div className="tagfield" ref={wrapRef}>
        <div className={'tag-control' + (mode === 'chips' ? ' simple' : '')} aria-invalid={invalid || undefined}
          onClick={() => { wrapRef.current.querySelector('input').focus(); }}>
          {value.map((slug) => {
            const t = B.tag(slug);
            return (
              <span className="tag-chip" key={slug}>
                {t ? t.label : slug}
                <button type="button" aria-label={`Remove ${t ? t.label : slug}`} onClick={(e) => { e.stopPropagation(); remove(slug); }}><Icon name="cross-1" /></button>
              </span>
            );
          })}
          <input
            value={q}
            placeholder={value.length ? '' : (mode === 'chips' ? 'Type a tag, press Enter…' : 'Add a tag…')}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => mode !== 'chips' && setOpen(true)}
            onKeyDown={onKey}
            aria-expanded={open} role="combobox" aria-controls="tag-listbox"
          />
        </div>

        {open && mode !== 'chips' && (filtered.length > 0 || canCreate) && (
          <div className="tag-menu" id="tag-listbox" role="listbox">
            {mode === 'command' && <div className="toc-label" style={{ padding: '0.4rem 0.55rem 0.3rem' }}>Existing tags</div>}
            {filtered.map((t, i) => (
              <div key={t.slug} role="option" aria-selected={active === i}
                className="tag-opt" onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); add(t.slug, t.label); }}>
                <Icon name="check" style={{ opacity: 0, width: '0.9rem' }} />
                <span>{t.label}</span>
                <span className="muted">{B.publishedByTag(t.slug).length}</span>
              </div>
            ))}
            {canCreate && (
              <div role="option" aria-selected={active === filtered.length}
                className="tag-opt" onMouseEnter={() => setActive(filtered.length)}
                onMouseDown={(e) => { e.preventDefault(); add(null); }}>
                <Icon name="plus" style={{ width: '0.9rem' }} />
                <span className="create">Create “{q.trim()}”</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ---------------- EDITOR ---------------- */
  const SAMPLE_BODY = [
    "Open with a short, concrete promise — what the reader will be able to do by the end.",
    "",
    "## A section heading",
    "",
    "Explain the idea, then show it.",
    "",
    '```ts',
    'export function greet(name: string) {',
    '  return `Hello, ${name}`',
    '}',
    '```',
    "",
    "> A pull quote earns the reader a breath.",
    "",
    "- A tight list",
    "- keeps scannable points",
    "- out of dense paragraphs",
  ].join('\n');

  function slugify(s) { return s.toLowerCase().trim().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, ''); }

  function AdminEditor({ t, route }) {
    const editId = route.parts[2] === 'new' ? null : route.parts[2];
    const existing = editId ? B.byId(editId) : null;
    const isPublished = existing?.status === 'published';
    const ref = useReveal([editId]);

    const [form, setForm] = useState(() => existing ? {
      title: existing.title, slug: existing.slug, excerpt: existing.excerpt,
      tags: existing.tags.slice(), body: existing.body || SAMPLE_BODY, authorId: existing.authorId, cover: existing.cover,
    } : { title: '', slug: '', excerpt: '', tags: [], body: SAMPLE_BODY, authorId: 'kc', cover: 'pine' });
    const [slugTouched, setSlugTouched] = useState(!!existing);
    const [tab, setTab] = useState('write'); // mobile tabs
    const [saveStatus, setSaveStatus] = useState('idle');
    const [submitted, setSubmitted] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const tagMode = (t && t.tagInput) || 'combobox';

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    // auto-slug from title until the user edits the slug (and only when unlocked)
    useEffect(() => {
      if (!slugTouched && !isPublished) set('slug', slugify(form.title));
    }, [form.title]);

    // slug collision against *other* posts
    const collision = form.slug && B.posts.some((p) => p.slug === form.slug && p.id !== editId);
    const errors = {
      title: submitted && !form.title.trim() ? 'A title is required before publishing.' : null,
      slug: collision ? 'That slug is already taken by another post.' : (submitted && !form.slug ? 'A slug is required.' : null),
      excerpt: submitted && !form.excerpt.trim() ? 'Add a short excerpt for the feed and previews.' : null,
    };
    const hasErrors = Object.values(errors).some(Boolean) || collision;

    const onSave = (publish) => {
      setSubmitted(true);
      if (!form.title.trim() || !form.slug || collision || (publish && !form.excerpt.trim())) {
        setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 1600); return;
      }
      setSaveStatus('pending');
      setTimeout(() => { setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 1400); }, 900);
    };

    const previewHtml = window.renderMarkdown(form.body);
    const author = B.author(form.authorId);

    const PreviewArticle = (
      <div className="preview-pane">
        <span className="tagrow">{form.tags.map((s) => { const tg = B.tag(s); return <Badge key={s} variant="secondary">{tg ? tg.label : s}</Badge>; })}</span>
        <h1 style={{ fontSize: '1.9rem', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0.6rem 0 0.4rem' }}>{form.title || 'Untitled post'}</h1>
        <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.2rem' }}>{author ? author.name : 'Unknown'} · preview</div>
        <article className="prose" data-prose={(t && t.proseStyle) || 'native'} dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    );

    return (
      <main className="shell page" ref={ref}>
        <div className="flex between items-center" data-reveal style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Back to posts" onClick={() => navigate('/admin/blog')}><Icon name="arrow-left" /></Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 style={{ fontSize: '1.4rem', margin: 0, letterSpacing: '-0.02em' }}>{existing ? 'Edit post' : 'New post'}</h1>
                {existing && statusBadge(existing.status)}
              </div>
              <div className="muted" style={{ fontSize: '0.85rem' }}>{isPublished ? 'Published — the slug is locked' : 'Draft — autosaves as you type'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPublished && <Button variant="outline" onClick={() => setConfirm(true)}>Unpublish</Button>}
            <Button variant="outline" onClick={() => onSave(false)}>Save draft</Button>
            <StatusButton status={saveStatus} message={saveStatus === 'error' ? 'Fix the errors first' : null} onClick={() => onSave(true)}>
              {isPublished ? 'Update' : 'Publish'}
            </StatusButton>
          </div>
        </div>

        {submitted && hasErrors && (
          <div data-reveal style={{ marginBottom: '1.25rem' }}>
            <Alert tone="error">
              <AlertTitle>This post isn’t ready to publish</AlertTitle>
              <AlertDescription>Resolve the highlighted fields below, then publish again.</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="editor-grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }} data-reveal>
          {/* meta card */}
          <Card>
            <CardContent style={{ padding: '1.5rem', display: 'grid', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: '1fr', }}>
                <Field label="Title" htmlFor="f-title" required error={errors.title}>
                  <Input id="f-title" value={form.title} placeholder="A clear, specific headline" onChange={(e) => set('title', e.target.value)} />
                </Field>
                <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
                  <Field label="Slug" htmlFor="f-slug" required
                    description={isPublished ? 'Locked — changing a live URL breaks inbound links.' : '/blog/' + (form.slug || '…')}
                    error={errors.slug}>
                    <Input id="f-slug" value={form.slug} disabled={isPublished}
                      onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
                  </Field>
                  <Field label="Author" htmlFor="f-author">
                    <Select value={form.authorId || 'none'} onValueChange={(v) => set('authorId', v === 'none' ? null : v)}>
                      <SelectTrigger id="f-author"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.values(B.authors).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        <SelectItem value="none">Unknown author</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Excerpt" htmlFor="f-excerpt" required error={errors.excerpt}
                  description="One or two sentences for the feed, previews, and search.">
                  <Textarea id="f-excerpt" value={form.excerpt} style={{ minHeight: '4.5rem' }}
                    placeholder="What will the reader take away?" onChange={(e) => set('excerpt', e.target.value)} />
                </Field>
                <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
                  <div>
                    <Label>Tags</Label>
                    <div style={{ marginTop: '0.4rem' }}>
                      <TagInput mode={tagMode} value={form.tags} onChange={(v) => set('tags', v)} />
                    </div>
                  </div>
                  <CoverUpload value={form.cover} onArt={(c) => set('cover', c)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* body editor + preview */}
          <div>
            <div className="flex between items-center" style={{ marginBottom: '0.75rem' }}>
              <Label style={{ fontSize: '0.95rem' }}>Body — Markdown</Label>
              <div className="seg desktop-hide">
                <button aria-pressed={tab === 'write'} onClick={() => setTab('write')}>Write</button>
                <button aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Preview</button>
              </div>
            </div>
            <div className="editor-grid split" data-tab={tab}>
              <div className="editor-panel" data-pane="write">
                <Textarea className="md-textarea" value={form.body} onChange={(e) => set('body', e.target.value)} aria-label="Markdown body" />
              </div>
              <div className="editor-panel" data-pane="preview">
                {PreviewArticle}
              </div>
            </div>
            <p className="muted" style={{ fontSize: '0.82rem', marginTop: '0.6rem' }}>
              Supports headings, <code>**bold**</code>, <code>_italic_</code>, lists, <code>&gt; quotes</code>, links, images, and fenced <code>```code```</code> blocks.
            </p>
          </div>
        </div>

        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogOverlay />
          <DialogContent style={{ maxWidth: '26rem' }}>
            <DialogTitle>Unpublish this post?</DialogTitle>
            <DialogDescription style={{ marginTop: '0.5rem' }}>
              Readers will get a 404 for “{form.title}” until you publish it again. The slug stays reserved.
            </DialogDescription>
            <div className="flex" style={{ justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <DialogClose asChild><Button onClick={() => navigate('/admin/blog')}>Unpublish</Button></DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    );
  }

  function CoverUpload({ value, onArt }) {
    const [img, setImg] = useState(null);
    const inputRef = useRef(null);
    const onFile = (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) setImg(URL.createObjectURL(f));
    };
    return (
      <div>
        <Label>Cover image</Label>
        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
          <div className="cover" data-art={value} style={{ width: '8rem', height: '5rem', borderRadius: '0.5rem', backgroundImage: img ? `url(${img})` : undefined, backgroundSize: 'cover' }}>
            {!img && <span className="cover-glyph" style={{ fontSize: '3rem' }} aria-hidden="true">A</span>}
          </div>
          <div className="stack gap-2" style={{ justifyContent: 'center' }}>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
            <Button variant="outline" size="sm" onClick={() => inputRef.current.click()}><Icon name="camera" /> {img ? 'Replace' : 'Upload'}</Button>
            <div className="flex gap-2">
              {['pine', 'slate', 'amber'].map((c) => (
                <button key={c} type="button" aria-label={'Use ' + c + ' cover'} onClick={() => { setImg(null); onArt(c); }}
                  className="cover" data-art={c} style={{ width: '1.6rem', height: '1.6rem', borderRadius: '0.35rem', cursor: 'pointer', outline: value === c && !img ? '2px solid var(--brand)' : 'none', outlineOffset: '1px' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { AdminList, AdminEditor });
})();
