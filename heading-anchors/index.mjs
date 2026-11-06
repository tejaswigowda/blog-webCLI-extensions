// Adds id="…" and a "#" link to every heading. Ids come from the heading text, deduplicated in
// document order, so they are the same on every build. An id already on a heading is kept.
// (table-of-contents uses the same algorithm, so the two agree in either order.)
const HEADING = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g;
const ANCHOR = /<a [^>]*class="anchor"[^>]*>[\s\S]*?<\/a>/g;

const textOf = (inner) => inner.replace(ANCHOR, '').replace(/<[^>]+>/g, '');
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
    return html.replace(HEADING, (all, level, attrs, inner) => {
      const had = /\bid="([^"]*)"/.exec(attrs);
      let id = had && had[1];
      if (!id) {
        const base = slugify(textOf(inner));
        id = base;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);
        attrs = `${attrs} id="${id}"`;
      }
      if (/<a [^>]*class="anchor"/.test(inner)) return `<h${level}${attrs}>${inner}</h${level}>`;
      return `<h${level}${attrs}>${inner} <a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`;
    });
  },
};
