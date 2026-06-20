// Minimal, dependency-free Markdown -> HTML for the article body + live preview.
// Supports: # h1-h4, paragraphs, **bold**, _italic_, `inline code`, [links](url),
// ![alt](src) figures, > blockquote, - / 1. lists, ```lang fenced code with
// lightweight token highlighting (kind-keyed, matches the dark CODE_PALETTE).
(function () {
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // very small highlighter: returns HTML with <span class="tok-*"> wrappers.
  const KW = new Set(('const let var function return if else for while import from export default ' +
    'async await new class extends throw try catch interface type enum public private ' +
    'static void null undefined true false this typeof instanceof of in as').split(' '));

  function highlight(code, lang) {
    // tokenize line by line so comments/strings don't bleed across the file
    return esc(code).split('\n').map((line) => {
      let out = '';
      let i = 0;
      // whole-line comment
      const cmt = line.match(/^(\s*)(\/\/.*)$/);
      if (cmt) return cmt[1] + '<span class="tok-comment">' + cmt[2] + '</span>';
      const re = /(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*`)|(\/\/.*$)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)(\s*\()|([A-Za-z_$][\w$]*)/g;
      let m, last = 0;
      while ((m = re.exec(line))) {
        out += line.slice(last, m.index);
        if (m[1]) out += '<span class="tok-string">' + m[1] + '</span>';
        else if (m[2]) out += '<span class="tok-comment">' + m[2] + '</span>';
        else if (m[3]) out += '<span class="tok-number">' + m[3] + '</span>';
        else if (m[4]) out += '<span class="tok-fn">' + m[4] + '</span>' + m[5];
        else if (m[6]) out += KW.has(m[6]) ? '<span class="tok-kw">' + m[6] + '</span>' : m[6];
        last = re.lastIndex;
      }
      out += line.slice(last);
      return out;
    }).join('\n');
  }

  function inline(s) {
    // images first, then links, then code/bold/italic
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) =>
      `\u0000IMG:${encodeURIComponent(alt)}:${encodeURIComponent(src)}\u0000`);
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>');
    return s;
  }

  function renderMarkdown(src) {
    if (!src || !src.trim()) return '';
    const lines = src.replace(/\r/g, '').split('\n');
    let html = '';
    let i = 0;
    let figIndex = 0;
    while (i < lines.length) {
      let line = lines[i];

      // fenced code
      const fence = line.match(/^```(\w+)?\s*$/);
      if (fence) {
        const lang = fence[1] || 'text';
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // closing fence
        html += `<figure class="code-block"><figcaption><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="lang">${esc(lang)}</span></figcaption><pre><code>${highlight(buf.join('\n'), lang)}</code></pre></figure>`;
        continue;
      }

      // headings
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        const lvl = h[1].length;
        const text = inline(h[2]);
        const id = h[2].toLowerCase().replace(/[^\w]+/g, '-').replace(/(^-|-$)/g, '');
        html += `<h${lvl} id="${id}">${text}</h${lvl}>`;
        i++; continue;
      }

      // blockquote (consume consecutive >)
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        html += `<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`;
        continue;
      }

      // unordered list
      if (/^[-*]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
        html += '<ul>' + buf.map((b) => `<li>${inline(b)}</li>`).join('') + '</ul>';
        continue;
      }
      // ordered list
      if (/^\d+\.\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
        html += '<ol>' + buf.map((b) => `<li>${inline(b)}</li>`).join('') + '</ol>';
        continue;
      }

      // blank
      if (!line.trim()) { i++; continue; }

      // paragraph (gather until blank / block start)
      const buf = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|[-*]\s|\d+\.\s|```)/.test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      let para = inline(buf.join(' '));
      // expand image placeholders into figures
      para = para.replace(/\u0000IMG:([^:]*):([^\u0000]*)\u0000/g, (m, alt, src) => {
        figIndex++;
        return `</p><figure class="img-figure"><div class="img-ph" role="img" aria-label="${decodeURIComponent(alt)}"><span>${decodeURIComponent(alt) || 'Figure ' + figIndex}</span></div><figcaption>${decodeURIComponent(alt)}</figcaption></figure><p>`;
      });
      html += `<p>${para}</p>`.replace(/<p><\/p>/g, '');
    }
    return html;
  }

  window.renderMarkdown = renderMarkdown;
})();
