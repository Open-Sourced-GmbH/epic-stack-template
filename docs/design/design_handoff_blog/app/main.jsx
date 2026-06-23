/* App shell: theme, tweaks, router, mount. */
(function () {
  const { useState, useEffect } = React;
  const { useRoute, Header, AdminBar, Footer, useCommandPalette,
    BlogIndex, PostDetail, TagArchive, AdminList, AdminEditor, NotFound } = window;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "indexLayout": "hero",
    "proseStyle": "native",
    "tagInput": "combobox",
    "demoState": "off"
  }/*EDITMODE-END*/;

  function useTheme() {
    const [theme, setTheme] = useState(() => localStorage.getItem('blog-theme') || 'light');
    useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('blog-theme', theme);
    }, [theme]);
    return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
  }

  function Surface({ route, t }) {
    const [a, b, c, d] = route.parts;
    if (a === 'admin' && b === 'blog') {
      if (!c) return <AdminList t={t} />;
      if (c === 'new' || d === 'edit') return <AdminEditor t={t} route={route} />;
      return <NotFound code="404" title="Unknown admin page" body="That admin route doesn’t exist." cta="Back to posts" />;
    }
    if (a === 'blog') {
      if (!b) return <BlogIndex t={t} route={route} />;
      if (b === 'tags') return <TagArchive t={t} route={route} />;
      return <PostDetail t={t} route={route} />;
    }
    return <NotFound code="404" title="Page not found" body="There’s nothing at this address." />;
  }

  function App() {
    const route = useRoute();
    const [theme, toggleTheme] = useTheme();
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const palette = useCommandPalette(theme, toggleTheme);

    return (
      <>
        <Header route={route} theme={theme} onToggleTheme={toggleTheme} onOpenK={() => palette.setOpen(true)} />
        <AdminBar route={route} />
        <Surface route={route} t={t} />
        <Footer />
        {palette.node}

        <TweaksPanel>
          <TweakSection label="Public · blog index" />
          <TweakSelect label="Feed layout" value={t.indexLayout}
            options={['hero', 'grid', 'column', 'side']}
            onChange={(v) => setTweak('indexLayout', v)} />
          <TweakSection label="Article typography" />
          <TweakRadio label="Reading ramp" value={t.proseStyle}
            options={['native', 'editorial', 'display']}
            onChange={(v) => setTweak('proseStyle', v)} />
          <TweakSection label="Editor · tag input" />
          <TweakRadio label="Control" value={t.tagInput}
            options={['combobox', 'command', 'chips']}
            onChange={(v) => setTweak('tagInput', v)} />
          <TweakSection label="Demo states" />
          <TweakSelect label="Force state" value={t.demoState}
            options={['off', 'loading', 'empty']}
            onChange={(v) => setTweak('demoState', v)} />
        </TweaksPanel>
      </>
    );
  }

  if (!location.hash) location.hash = '#/blog';
  ReactDOM.createRoot(document.getElementById('ds-root')).render(<App />);
})();
