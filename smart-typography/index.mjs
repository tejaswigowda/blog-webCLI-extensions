// Typographic punctuation applied to the markdown the page is rendered from. It runs at publish and
// the result is committed in the page; the post's own markdown source is never touched.
// Left alone: fenced and indented code, inline code, link destinations and titles, URLs, escapes,
// rules, table separators and reference definitions.
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const SKIP_LINE = /^[\s\-=*_:|>]*$|^ {0,3}\[[^\]]+\]:/;
const PROTECTED = /\\[\s\S]|`+[^`]*?`+|\]\([^)]*\)|<[^>\s]+>|https?:\/\/[^\s)>\]]+/g;
const OPENS = /[\s([{\u2018\u201c\u2013\u2014]/;

function prose(text, prev) {
  const s = text
    .replace(/(?<!\.)\.\.\.(?!\.)/g, '\u2026')
    .replace(/(?<!-)---(?!-)/g, '\u2014')
    .replace(/(\d)--(\d)/g, '$1\u2013$2')
    .replace(/ -- /g, ' \u2013 ');
  let out = '';
  for (const ch of s) {
    let emit = ch;
    if (ch === '"' || ch === "'") {
      const opening = prev === '' || OPENS.test(prev);
      emit = ch === '"' ? (opening ? '\u201c' : '\u201d') : opening ? '\u2018' : '\u2019';
    }
    out += emit;
    if (!'*_~'.includes(ch)) prev = emit; // emphasis markers do not decide which way a quote faces
  }
  return { out, prev };
}

function smartLine(line) {
  let out = '';
  let prev = '';
  let last = 0;
  for (const m of line.matchAll(PROTECTED)) {
    const r = prose(line.slice(last, m.index), prev);
    out += r.out + m[0];
    prev = 'a';
    last = m.index + m[0].length;
  }
  return out + prose(line.slice(last), prev).out;
}

export const hooks = {
  'post:markdown'(md) {
    let fence = null;
    return md
      .split('\n')
      .map((line) => {
        const f = FENCE.exec(line);
        if (fence) {
          if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
          return line;
        }
        if (f) {
          fence = f[1];
          return line;
        }
        if (/^( {4}|\t)/.test(line) || SKIP_LINE.test(line)) return line;
        return smartLine(line);
      })
      .join('\n');
  },
};
