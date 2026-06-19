/* Cosy click ripple — event-delegated so it works on every button (and any
   element tagged [data-ripple]) without touching component source. Uses
   currentColor so it reads light on dark fills and dark on light ones. */
(() => {
  if (window.__dsRipple) return;
  window.__dsRipple = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const style = document.createElement('style');
  style.textContent =
    '@keyframes ds-ripple{from{transform:scale(0);opacity:.20}to{transform:scale(1);opacity:0}}' +
    '.ds-ripple{position:absolute;border-radius:50%;background:currentColor;' +
    'pointer-events:none;will-change:transform,opacity;' +
    'animation:ds-ripple .5s cubic-bezier(.32,.72,0,1) forwards;}';
  document.head.appendChild(style);

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest('button, [data-ripple]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;

    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';

    const r = el.getBoundingClientRect();
    const d = Math.hypot(r.width, r.height) * 2;     // covers from any click point
    const span = document.createElement('span');
    span.className = 'ds-ripple';
    span.style.width = span.style.height = d + 'px';
    span.style.left = (e.clientX - r.left - d / 2) + 'px';
    span.style.top = (e.clientY - r.top - d / 2) + 'px';
    span.addEventListener('animationend', () => span.remove());
    el.appendChild(span);
  }, true);
})();
