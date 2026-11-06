// Puts a contents list before the post when it has three or more h2/h3 headings. Headings get an
// id (the same algorithm as heading-anchors, so the two agree in either order); an existing id is kept.
const HEADING = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g;
const ANCHOR = /<a [^>]*class="anchor"[^>]*>[\s\S]*?<\/a>/g;
const MIN_ENTRIES = 3;

const textOf = (inner) => inner.replace(ANCHOR, '').replace(/<[^>]+>/g, '').trim();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function slugify(text) {
  const s = decode(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'section';
}

export const hooks = {
  'post:html'(html) {
    const used = new Set();
    for (const m of html.matchAll(HEADING)) {
      const id = /\bid="([^"]*)"/.exec(m[2]);
      if (id) used.add(id[1]);
    }
    const entries = [];
    const body = html.replace(HEADING, (all, level, attrs, inner) => {
      const had = /\bid="([^"]*)"/.exec(attrs);
      let id = had && had[1];
      if (!id) {
        const base = slugify(textOf(inner));
        id = base;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);
        attrs = `${attrs} id="${id}"`;
      }
      if (level === '2' || level === '3') entries.push({ level: Number(level), id, text: textOf(inner) });
      return `<h${level}${attrs}>${inner}</h${level}>`;
    });
    if (entries.length < MIN_ENTRIES) return html;
    entries[0].level = 2; // a list cannot open with a nested level

    let list = '';
    let open = 0;
    for (const e of entries) {
      if (e.level === 3 && !open) {
        list += '<ul>';
        open = 1;
      } else if (e.level === 2 && open) {
        list += '</li></ul></li>';
        open = 0;
      } else if (list) {
        list += '</li>';
      }
      list += `<li><a href="#${e.id}">${e.text}</a>`;
    }
    list += open ? '</li></ul></li>' : '</li>';
    return `<div class="toc" role="navigation" aria-label="Contents"><p class="toc-title">Contents</p><ul>${list}</ul></div>\n${body}`;
  },
};
