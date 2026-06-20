/* Shared building blocks for all blog surfaces. Exported to window. */
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const E = window.EpicUI;
const { Badge, Card, CardHeader, CardContent, CardFooter, Avatar, AvatarFallback, Button } = E;
const Icon = window.Icon;

/* ---- hash router ---- */
function parseHash() {
  let h = (location.hash || '#/blog').replace(/^#/, '');
  if (!h.startsWith('/')) h = '/' + h;
  const [path, query] = h.split('?');
  const parts = path.split('/').filter(Boolean); // e.g. ['blog','slug']
  const params = new URLSearchParams(query || '');
  return { path, parts, params };
}
function navigate(to) {
  if (to.startsWith('#')) to = to.slice(1);
  location.hash = to;
}
function useRoute() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/* ---- reveal-on-scroll, reduced-motion-safe ---- */
function useReveal(deps) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    document.documentElement.classList.add('js-reveal');
    const els = root.querySelectorAll('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el, i) => { el.style.transitionDelay = Math.min(i * 55, 300) + 'ms'; io.observe(el); });
    // safety net: never leave content hidden if the observer doesn't fire
    const fallback = setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 400);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, deps || []);
  return ref;
}

/* ---- small pieces ---- */
function Cover({ post, className, glyph }) {
  const letter = glyph || (post.title ? post.title[0] : '·');
  const tag = window.BLOG.tag(post.tags[0]);
  return (
    React.createElement('div', { className: 'cover ' + (className || ''), 'data-art': post.cover },
      tag ? React.createElement('span', { className: 'cover-tag' }, tag.label) : null,
      React.createElement('span', { className: 'cover-glyph', 'aria-hidden': true }, letter)
    )
  );
}

function AuthorAvatar({ author, className, ring, fs }) {
  const cls = (className || '') + (ring ? ' author-avatar' : '');
  if (!author) {
    return (
      <Avatar className={cls}>
        <AvatarFallback className="ua-unknown"><Icon name="avatar" /></AvatarFallback>
      </Avatar>
    );
  }
  return (
    <Avatar className={cls}>
      <AvatarFallback style={{ background: author.accent, color: 'var(--primary-foreground)', fontWeight: 600, fontSize: fs }}>{author.initials}</AvatarFallback>
    </Avatar>
  );
}

function Byline({ post, size }) {
  const a = window.BLOG.author(post.authorId);
  const unknown = !a;
  return (
    <div className={'byline' + (unknown ? ' is-unknown' : '')}>
      <AuthorAvatar author={a} className={size === 'lg' ? 'size-12' : 'size-10'} ring />
      <div className="who">
        <div className="name-row">
          <span className="name">{unknown ? 'Unknown author' : a.name}</span>
          {!unknown && a.role ? <span className="role">{a.role}</span> : null}
        </div>
        <div className="sub">
          <time>{window.BLOG.fmtDate(post.publishedAt)}</time>
          {post.readMin ? <span className="sep">·</span> : null}
          {post.readMin ? <span>{post.readMin} min read</span> : null}
        </div>
      </div>
    </div>
  );
}

function AuthorChip({ post }) {
  const a = window.BLOG.author(post.authorId);
  return (
    <div className={'author-chip' + (a ? '' : ' is-unknown')}>
      <AuthorAvatar author={a} className="size-6" fs="0.6rem" />
      <span className="ac-name">{a ? a.name : 'Unknown author'}</span>
      <span className="ac-meta">{window.BLOG.fmtDate(post.publishedAt)} · {post.readMin} min</span>
    </div>
  );
}

function TagPills({ tags, static: isStatic }) {
  return (
    <span className="tagrow">
      {tags.map((slug) => {
        const t = window.BLOG.tag(slug);
        if (!t) return null;
        if (isStatic) return <Badge key={slug} variant="secondary">{t.label}</Badge>;
        return (
          <a key={slug} href={`#/blog/tags/${slug}`} onClick={(e) => { e.preventDefault(); navigate(`/blog/tags/${slug}`); }} style={{ textDecoration: 'none' }}>
            <Badge variant="secondary">{t.label}</Badge>
          </a>
        );
      })}
    </span>
  );
}

function MetaLine({ post }) {
  const a = window.BLOG.author(post.authorId);
  return (
    <span className="meta-row">
      <span>{a ? a.name : 'Unknown'}</span>
      <span className="meta-dot" />
      <span>{window.BLOG.fmtDate(post.publishedAt)}</span>
      <span className="meta-dot" />
      <span>{post.readMin} min</span>
    </span>
  );
}

function PostCard({ post, layout }) {
  const go = (e) => { e.preventDefault(); navigate('/blog/' + post.slug); };
  return (
    <a className="post-card-link" href={'#/blog/' + post.slug} onClick={go} data-reveal>
      <Card className={'post-card' + (layout === 'side' ? ' is-side' : '')} style={{ overflow: 'hidden' }}>
        <Cover post={post} />
        <div className="card-body">
          <TagPills tags={post.tags.slice(0, 2)} static />
          <h3 className="card-title">{post.title}</h3>
          {layout !== 'grid' && <p className="card-excerpt">{post.excerpt}</p>}
          {layout === 'grid' && <p className="card-excerpt" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.excerpt}</p>}
          <AuthorChip post={post} />
        </div>
      </Card>
    </a>
  );
}

function SkBlock({ w, h, r, className, style }) {
  return <div className={'sk ' + (className || '')} style={{ width: w, height: h, borderRadius: r, ...(style || {}) }} />;
}

function SkCard() {
  return (
    <div className="sk-card">
      <div className="sk sk-cover" />
      <div className="sk-cbody">
        <SkBlock w="4.5rem" h="1.1rem" r="999px" />
        <SkBlock w="96%" h="1.05rem" r="0.3rem" />
        <SkBlock w="68%" h="1.05rem" r="0.3rem" />
        <div className="sk-author">
          <SkBlock w="1.6rem" h="1.6rem" r="50%" />
          <SkBlock w="6.5rem" h="0.78rem" r="0.3rem" />
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton({ layout }) {
  return (
    <div className="sk-wrap">
      {layout === 'hero' && (
        <div className="sk-hero">
          <div className="sk sk-hero-cover" />
          <div className="sk-hero-body">
            <SkBlock w="5rem" h="1.1rem" r="999px" />
            <SkBlock w="92%" h="1.5rem" r="0.35rem" style={{ marginTop: '0.3rem' }} />
            <SkBlock w="60%" h="1.5rem" r="0.35rem" />
            <SkBlock w="100%" h="0.85rem" r="0.3rem" style={{ marginTop: '0.5rem' }} />
            <SkBlock w="85%" h="0.85rem" r="0.3rem" />
            <div className="sk-author" style={{ marginTop: '0.6rem' }}>
              <SkBlock w="2.5rem" h="2.5rem" r="50%" />
              <div className="stack" style={{ gap: '0.35rem' }}>
                <SkBlock w="7rem" h="0.85rem" r="0.3rem" />
                <SkBlock w="10rem" h="0.7rem" r="0.3rem" />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="sk-feed">
        {Array.from({ length: 6 }).map((_, i) => <SkCard key={i} />)}
      </div>
    </div>
  );
}

/* short delay to surface a real loading state on first paint of a feed */
function useLoadingOnce(key, ms) {
  const [loading, setLoading] = useState(() => !window.__seen?.[key]);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      window.__seen = window.__seen || {}; window.__seen[key] = true;
      setLoading(false);
    }, ms || 650);
    return () => clearTimeout(t);
  }, []);
  return loading;
}

Object.assign(window, {
  useState, useEffect, useRef, useCallback, useMemo,
  parseHash, navigate, useRoute, useReveal,
  Cover, Byline, AuthorAvatar, AuthorChip, TagPills, MetaLine, PostCard, FeedSkeleton, useLoadingOnce, Icon,
});
