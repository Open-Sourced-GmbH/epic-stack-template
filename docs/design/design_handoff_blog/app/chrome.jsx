/* Site chrome: header, footer, admin bar, ⌘K command palette wiring. */
(function () {
  const { useState, useEffect, useMemo } = React;
  const { navigate, Icon } = window;
  const E = window.EpicUI;
  const { Button, CommandPalette } = E;
  const B = window.BLOG;

  function ThemeToggle({ theme, onToggle }) {
    return (
      <button className="icon-btn" onClick={onToggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
    );
  }

  function Header({ route, theme, onToggleTheme, onOpenK }) {
    const seg = route.parts[0];
    return (
      <header className="site-header">
        <div className="shell row">
          <a className="brand-mark" href="#/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }}>
            <span className="brand-logo" aria-hidden="true" />
            Epic Stack
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#/blog" aria-current={seg === 'blog' ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate('/blog'); }}>Blog</a>
            <a href="#/admin/blog" aria-current={seg === 'admin' ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate('/admin/blog'); }}>Admin</a>
          </nav>
          <span className="header-spacer" />
          <button className="kbar" onClick={onOpenK} aria-label="Open command palette">
            <Icon name="magnifying-glass" />
            <span style={{ marginRight: '0.5rem' }}>Search</span>
            <kbd className="kbd">⌘K</kbd>
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>
    );
  }

  function AdminBar({ route }) {
    if (route.parts[0] !== 'admin') return null;
    return (
      <div className="admin-bar">
        <div className="shell row">
          <Icon name="lock-closed" style={{ width: '0.85rem', height: '0.85rem' }} />
          <span>Admin</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: 'var(--foreground)' }}>Blog</span>
          <span className="header-spacer" style={{ flex: 1 }} />
          <a href="#/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            View live site <Icon name="arrow-right" style={{ width: '0.85rem', height: '0.85rem' }} />
          </a>
        </div>
      </div>
    );
  }

  function Footer() {
    return (
      <footer className="site-footer">
        <div className="shell row">
          <a className="brand-mark" href="#/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }} style={{ fontSize: '0.95rem' }}>
            <span className="brand-logo" style={{ width: '1.3rem', height: '1.3rem' }} aria-hidden="true" /> Epic Stack
          </a>
          <span className="header-spacer" style={{ flex: 1 }} />
          <a href="#/blog" onClick={(e) => { e.preventDefault(); navigate('/blog'); }}>Blog</a>
          <a href="#/blog/tags/design-system" onClick={(e) => { e.preventDefault(); navigate('/blog/tags/design-system'); }}>Tags</a>
          <a href="#/admin/blog" onClick={(e) => { e.preventDefault(); navigate('/admin/blog'); }}>Admin</a>
          <span className="muted">© 2026 · Built on the Epic Stack</span>
        </div>
      </footer>
    );
  }

  function useCommandPalette(theme, onToggleTheme) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
      const onKey = (e) => {
        if (e.key && e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((p) => !p); }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, []);

    const commands = useMemo(() => {
      const recent = B.published().slice(0, 5).map((p) => ({
        id: 'post-' + p.id, title: p.title, group: 'Posts', icon: 'file-text',
        keywords: p.tags, href: '/blog/' + p.slug,
      }));
      const tagCmds = B.tags.slice(0, 6).map((t) => ({
        id: 'tag-' + t.slug, title: t.label, group: 'Tags', icon: 'magnifying-glass', href: '/blog/tags/' + t.slug,
      }));
      return [
        { id: 'nav-blog', title: 'Blog', group: 'Go to', icon: 'file-text', keywords: ['index', 'feed', 'articles'], href: '/blog' },
        { id: 'nav-admin', title: 'Admin · Posts', group: 'Go to', icon: 'lock-closed', keywords: ['manage', 'dashboard'], href: '/admin/blog' },
        { id: 'act-new', title: 'New post', group: 'Actions', icon: 'plus', keywords: ['create', 'write', 'draft'], href: '/admin/blog/new' },
        { id: 'act-theme', title: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', group: 'Actions', icon: theme === 'dark' ? 'sun' : 'moon', run: onToggleTheme },
        ...recent,
        ...tagCmds,
      ];
    }, [theme]);

    const node = open ? (
      <CommandPalette
        commands={commands}
        open={open}
        onOpenChange={setOpen}
        placeholder="Search posts, tags, actions…"
        onNavigate={(href) => { setOpen(false); navigate(href); }}
      />
    ) : null;
    return { open, setOpen, node };
  }

  Object.assign(window, { Header, AdminBar, Footer, useCommandPalette });
})();
