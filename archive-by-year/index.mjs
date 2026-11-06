// Groups the index list by year, newest first (the list already is). It needs the dates shown in
// the list and the blog-webcli-v1 markup (<ul class="posts"><li>…); anything else is returned
// unchanged rather than guessed at.
const LIST = /^(<ul class="posts[^"]*">)\n([\s\S]*)\n<\/ul>$/;

export const hooks = {
  'index:html'(html) {
    const m = LIST.exec(html.trim());
    if (!m) return html;
    const items = m[2].split(/(?<=<\/li>)\n(?=<li>)/);
    const years = items.map((li) => /<time[^>]*datetime="(\d{4})-/.exec(li));
    if (!items.length || years.some((y) => !y)) return html;

    const groups = [];
    items.forEach((li, i) => {
      const year = years[i][1];
      const g = groups.find((x) => x.year === year);
      if (g) g.items.push(li);
      else groups.push({ year, items: [li] });
    });
    return groups.map((g) => `<div class="year-group"><h2 class="year">${g.year}</h2>\n${m[1]}\n${g.items.join('\n')}\n</ul></div>`).join('\n');
  },
};
