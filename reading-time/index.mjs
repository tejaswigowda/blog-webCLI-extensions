// A build extension: a pure function over data. It runs at publish, in a sandbox with no DOM,
// no network and no credentials, and what it returns is committed. The page never runs it.
const WORDS_PER_MINUTE = 220;

export const hooks = {
  'post:html'(html) {
    const prose = html.replace(/<pre[\s\S]*?<\/pre>/g, ' ').replace(/<[^>]+>/g, ' ');
    const words = prose.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
    return `<p class="reading-time">${minutes} min read</p>\n${html}`;
  },
};
