/* Public surfaces: blog index, post detail, tag archive. */
(function () {
  const { useRoute, navigate, Cover, Byline, TagPills, MetaLine, PostCard, FeedSkeleton, useReveal, useLoadingOnce, Icon } = window;
  const E = window.EpicUI;
  const { Button, Badge, Card, Alert, AlertTitle, AlertDescription } = E;
  const B = window.BLOG;

  const PER_PAGE = 6;

  function Pagination({ page, pageCount, onPage }) {
    if (pageCount <= 1) return null;
    const nums = [];
    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== 'gap') nums.push('gap');
    }
    return (
      <nav className="pager" aria-label="Pagination">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page">
          <Icon name="arrow-left" />
        </button>
        {nums.map((n, i) => n === 'gap'
          ? <span key={'g' + i} className="gap">…</span>
          : <button key={n} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button>)}
        <button onClick={() => onPage(page + 1)} disabled={page === pageCount} aria-label="Next page">
          <Icon name="arrow-right" />
        </button>
      </nav>
    );
  }

  function EmptyFeed({ title, body }) {
    return (
      <div className="empty-state" data-reveal>
        <div className="emoji-free"><Icon name="file-text" /></div>
        <h3>{title}</h3>
        <p>{body}</p>
        <Button variant="outline" onClick={() => navigate('/admin/blog')}>Go to the editor</Button>
      </div>
    );
  }

  function NotFound({ code, title, body, cta }) {
    return (
      <main className="shell">
        <div className="notfound">
          <div className="code">{code}</div>
          <h1 className="page-title" style={{ marginTop: '1rem' }}>{title}</h1>
          <p className="page-sub" style={{ margin: '0.75rem auto 2rem' }}>{body}</p>
          <Button onClick={() => navigate('/blog')}>{cta || 'Back to the blog'}</Button>
        </div>
      </main>
    );
  }
  window.NotFound = NotFound;

  function BlogIndex({ t, route }) {
    const layout = (t && t.indexLayout) || 'hero';
    const demo = t && t.demoState;
    const loading = useLoadingOnce('index', 900) || demo === 'loading';
    const all = B.published();
    const page = Math.max(1, parseInt(route.params.get('page') || '1', 10));
    const ref = useReveal([layout, page, loading, demo]);

    const onPage = (p) => navigate('/blog' + (p > 1 ? '?page=' + p : ''));

    let body;
    if (loading) {
      body = <FeedSkeleton layout={layout} />;
    } else if (demo === 'empty' || all.length === 0) {
      body = <EmptyFeed title="No posts published yet" body="When a post is published it will appear here, newest first. Drafts live in the editor until they’re ready." />;
    } else if (layout === 'hero') {
      const [lead, ...rest] = all;
      const start = (page - 1) * PER_PAGE;
      const pageItems = rest.slice(start, start + PER_PAGE);
      const pageCount = Math.ceil(rest.length / PER_PAGE);
      body = (
        <>
          {page === 1 && (
            <a href={'#/blog/' + lead.slug} onClick={(e) => { e.preventDefault(); navigate('/blog/' + lead.slug); }} data-reveal className="hero-link" style={{ textDecoration: 'none' }}>
              <Card style={{ overflow: 'hidden' }} className="hero-lead">
                <Cover post={lead} />
                <div className="hero-body">
                  <div className="hero-top">
                    <span className="eyebrow">Featured</span>
                    <TagPills tags={lead.tags.slice(0, 2)} static />
                  </div>
                  <h2 className="hero-title-lead">{lead.title}</h2>
                  <p className="card-excerpt">{lead.excerpt}</p>
                  <Byline post={lead} />
                </div>
              </Card>
            </a>
          )}
          <div className="feed" data-layout="grid">
            {pageItems.map((p) => <PostCard key={p.id} post={p} layout="grid" />)}
          </div>
          <Pagination page={page} pageCount={pageCount} onPage={onPage} />
        </>
      );
    } else {
      const start = (page - 1) * PER_PAGE;
      const pageItems = all.slice(start, start + PER_PAGE);
      const pageCount = Math.ceil(all.length / PER_PAGE);
      body = (
        <>
          <div className="feed" data-layout={layout}>
            {pageItems.map((p) => <PostCard key={p.id} post={p} layout={layout} />)}
          </div>
          <Pagination page={page} pageCount={pageCount} onPage={onPage} />
        </>
      );
    }

    return (
      <main className="shell page" ref={ref}>
        <header className="page-head" data-reveal>
          <span className="eyebrow">The Epic Stack journal</span>
          <h1 className="page-title">Notes on building the boring, durable web</h1>
          <p className="page-sub">Field notes on SSR, type-safety, accessibility, and the design system that keeps it all on-brand.</p>
        </header>
        {body}
      </main>
    );
  }

  function buildToc(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return Array.from(div.querySelectorAll('h2, h3')).map((h) => ({
      id: h.id, text: h.textContent, level: h.tagName === 'H2' ? 2 : 3,
    }));
  }

  function PostDetail({ t, route }) {
    const slug = route.parts[1];
    const post = B.bySlug(slug);
    const ref = useReveal([slug]);
    if (!post || post.status !== 'published') {
      return <NotFound code="404" title="We couldn’t find that post" body="The link may be broken, or the post is still a draft. Either way, there’s nothing to read here yet." />;
    }
    const html = window.renderMarkdown(post.body);
    const toc = buildToc(html);
    const proseStyle = (t && t.proseStyle) || 'native';
    const idx = B.published().findIndex((p) => p.id === post.id);
    const all = B.published();
    const prev = all[idx + 1];
    const next = all[idx - 1];

    return (
      <main className="page article-detail" ref={ref}>
        <div className="article">
          <a href="#/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} className="back-link" data-reveal>
            <Icon name="arrow-left" /> All posts
          </a>
          <header className="art-hero" data-art={post.cover} data-reveal>
            <span className="hero-glyph" aria-hidden="true">{post.title ? post.title[0] : '·'}</span>
            <div className="hero-inner">
              <div className="hero-eyebrow">{(B.tag(post.tags[0]) || {}).label || 'Article'}</div>
              <h1 className="hero-title">{post.title}</h1>
            </div>
          </header>
          <div className="byline-bar" data-reveal>
            <Byline post={post} size="lg" />
            <TagPills tags={post.tags} />
          </div>
          {post.excerpt ? <p className="art-dek" data-reveal>{post.excerpt}</p> : null}
          <div className={'article-grid' + (toc.length ? ' has-toc' : '')}>
            <article className="prose" data-prose={proseStyle} data-reveal dangerouslySetInnerHTML={{ __html: html }} />
            {toc.length > 0 && (
              <aside className="toc" aria-label="On this page">
                <div className="toc-label">On this page</div>
                {toc.map((h) => (
                  <a key={h.id} href={'#' + h.id} style={{ paddingLeft: h.level === 3 ? '1.5rem' : '0.8rem' }}
                    onClick={(e) => { e.preventDefault(); const el = document.getElementById(h.id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); }}>
                    {h.text}
                  </a>
                ))}
              </aside>
            )}
          </div>

          <nav className="post-nav" data-reveal>
            {prev ? <PostNav dir="Previous" post={prev} align="left" /> : <span />}
            {next ? <PostNav dir="Next" post={next} align="right" /> : <span />}
          </nav>
        </div>
      </main>
    );
  }

  function PostNav({ dir, post, align }) {
    return (
      <a href={'#/blog/' + post.slug} onClick={(e) => { e.preventDefault(); navigate('/blog/' + post.slug); }}
        style={{ textDecoration: 'none' }}>
        <Card className="p-4" style={{ padding: '1rem 1.2rem', textAlign: align }}>
          <div className="muted" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{dir}</div>
          <div style={{ fontWeight: 600, marginTop: '0.3rem', lineHeight: 1.25 }}>{post.title}</div>
        </Card>
      </a>
    );
  }

  function TagArchive({ t, route }) {
    const slug = route.parts[2];
    const tag = B.tag(slug);
    const ref = useReveal([slug]);
    if (!tag) {
      return <NotFound code="404" title="No such tag" body={`We don’t have a “${slug}” tag. Browse everything, or pick a tag from a post.`} cta="Browse all posts" />;
    }
    const posts = B.publishedByTag(slug);
    return (
      <main className="shell page" ref={ref}>
        <header className="page-head" data-reveal>
          <a href="#/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
            <Icon name="arrow-left" /> All posts
          </a>
          <span className="eyebrow" style={{ display: 'block', marginTop: '1.25rem' }}>Tag</span>
          <h1 className="page-title">{tag.label}</h1>
          <p className="page-sub">{posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged “{tag.label}”.</p>
        </header>
        {posts.length === 0 ? (
          <div className="empty-state" data-reveal>
            <div className="emoji-free"><Icon name="file-text" /></div>
            <h3>Nothing here yet</h3>
            <p>No published posts carry the “{tag.label}” tag right now. Check back soon.</p>
            <Button variant="outline" onClick={() => navigate('/blog')}>Browse all posts</Button>
          </div>
        ) : (
          <div className="feed" data-layout="grid">
            {posts.map((p) => <PostCard key={p.id} post={p} layout="grid" />)}
          </div>
        )}
      </main>
    );
  }

  Object.assign(window, { BlogIndex, PostDetail, TagArchive });
})();
