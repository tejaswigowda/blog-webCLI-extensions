import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (name) => (await import(path.join(root, name, 'index.mjs'))).hooks;
const folders = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && !['test', 'node_modules'].includes(d.name) && !d.name.startsWith('.')).map((d) => d.name);

test('every folder is a complete extension: manifest, entry, licence, only declared hooks, no capabilities', async () => {
  assert.ok(folders.length >= 6);
  for (const f of folders) {
    const m = JSON.parse(readFileSync(path.join(root, f, 'extension.json'), 'utf8'));
    assert.equal(m.kind, 'build', f);
    assert.deepEqual(m.capabilities, [], f);
    assert.ok(m.licence && m.name && m.version, f);
    assert.ok(readFileSync(path.join(root, f, 'LICENSE'), 'utf8').length > 100, f);
    assert.deepEqual(Object.keys(await load(f)).sort(), [...m.hooks].sort(), f);
  }
});

test('no extension reaches for anything outside its inputs', () => {
  for (const f of folders) {
    const src = readFileSync(path.join(root, f, 'index.mjs'), 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\b(?:fetch|XMLHttpRequest|WebSocket|importScripts|eval|Function|document|window|localStorage|process|require)\b|\bimport\s*\(|^\s*import\s/m, f);
  }
});

test('reading-time: counts prose, not code; at least a minute', async () => {
  const { 'post:html': run } = await load('reading-time');
  assert.match(run('<p>short</p>'), /^<p class="reading-time">1 min read<\/p>\n<p>short<\/p>$/);
  const long = `<p>${'word '.repeat(660)}</p><pre>${'code '.repeat(5000)}</pre>`;
  assert.match(run(long), /3 min read/);
});

test('heading-anchors: ids from text, deduplicated, existing ids kept, idempotent', async () => {
  const { 'post:html': run } = await load('heading-anchors');
  const out = run('<h2>Hello, World!</h2><p>x</p><h2>Hello, World!</h2><h3 id="mine">Mine</h3><h2>Café &amp; Crème</h2><h2>???</h2>');
  assert.match(out, /<h2 id="hello-world">Hello, World! <a class="anchor" href="#hello-world"/);
  assert.match(out, /<h2 id="hello-world-2">/);
  assert.match(out, /<h3 id="mine">Mine <a class="anchor" href="#mine"/);
  assert.match(out, /<h2 id="cafe-creme">/);
  assert.match(out, /<h2 id="section">/);
  assert.equal(run(out), out);
  assert.equal(run('<p>no headings</p>'), '<p>no headings</p>');
});

test('table-of-contents: three or more h2/h3, nested, ids agree with heading-anchors in either order', async () => {
  const { 'post:html': toc } = await load('table-of-contents');
  const { 'post:html': anchors } = await load('heading-anchors');
  const html = '<h2>One</h2><p>a</p><h3>Two</h3><h3>Three</h3><h2>Four</h2><h4>ignored</h4>';
  const out = toc(html);
  assert.match(out, /^<div class="toc" role="navigation" aria-label="Contents">/);
  assert.match(out, /<li><a href="#one">One<\/a><ul><li><a href="#two">Two<\/a><\/li><li><a href="#three">Three<\/a><\/li><\/ul><\/li><li><a href="#four">Four<\/a><\/li>/);
  assert.match(out, /<h2 id="one">One<\/h2>/);
  const opens = (s) => (s.match(/<(?:ul|li)>/g) || []).length;
  const closes = (s) => (s.match(/<\/(?:ul|li)>/g) || []).length;
  assert.equal(opens(out), closes(out));
  assert.equal(anchors(toc(html)).match(/id="[^"]+"/g).join(), anchors(html).match(/id="[^"]+"/g).join());
  assert.equal(toc(anchors(html)).match(/href="#[^"]+"/g).length, 9); // 5 anchors + 4 contents entries
  assert.equal(toc('<h2>A</h2><h2>B</h2>'), '<h2>A</h2><h2>B</h2>');
  assert.match(toc('<h3>first</h3><h2>b</h2><h2>c</h2>'), /<ul><li><a href="#first">first<\/a><\/li><li><a href="#b">/);
});

test('smart-typography: quotes, dashes, ellipses; code, links, urls, escapes and rules untouched', async () => {
  const { 'post:markdown': run } = await load('smart-typography');
  assert.equal(run('"Hello," she said -- it\'s 1990--2000... and---well.'), '\u201cHello,\u201d she said \u2013 it\u2019s 1990\u20132000\u2026 and\u2014well.');
  assert.equal(run("'single' and (\"nested\")"), '\u2018single\u2019 and (\u201cnested\u201d)');
  assert.equal(run('*"emphasised"* and **"bold"**'), '*\u201cemphasised\u201d* and **\u201cbold\u201d**');
  const keep = ['`say "hi"...`', 'see https://x.test/it\'s...ok', 'escaped \\" quote', '---', '| a | b |\n|---|---|', '    "indented code"', '[ref]: https://x.test "Title"', '> ---'];
  for (const k of keep) assert.equal(run(k), k, k);
  assert.equal(run('[a "b"](https://x.test/a--b?q="1" "title")'), '[a \u201cb\u201d](https://x.test/a--b?q="1" "title")'); // link text is prose; the destination and title are not
  assert.equal(run('```js\nconst s = "x"; // ...\n```\n"out"'), '```js\nconst s = "x"; // ...\n```\n\u201cout\u201d');
  assert.equal(run('~~~\n"a"\n~~~\n"b"'), '~~~\n"a"\n~~~\n\u201cb\u201d');
  assert.equal(run('use `a` --force, "x"'), 'use `a` --force, \u201cx\u201d');
  assert.equal(run(run('"a" -- b')), run('"a" -- b'));
});

test('archive-by-year: groups under year headings; leaves unknown markup alone', async () => {
  const { 'index:html': run } = await load('archive-by-year');
  const li = (d, t) => `<li>\n<div class="meta"><time datetime="${d}">${d}</time></div>\n<h2><a href="${t}/">${t}</a></h2>\n</li>`;
  const list = (...a) => `<ul class="posts cards">\n${a.join('\n')}\n</ul>`;
  const out = run(list(li('2026-05-01', 'c'), li('2026-01-02', 'b'), li('2025-03-04', 'a')));
  assert.equal([...out.matchAll(/<h2 class="year">(\d{4})<\/h2>/g)].map((m) => m[1]).join(), '2026,2025');
  assert.equal(out.match(/<ul class="posts cards">/g).length, 2);
  assert.ok(out.indexOf('>c<') < out.indexOf('>b<') && out.indexOf('>b<') < out.indexOf('>a<'));
  const noDates = list('<li>\n<h2><a href="a/">a</a></h2>\n</li>');
  assert.equal(run(noDates), noDates);
  assert.equal(run('<article class="post">x</article>'), '<article class="post">x</article>');
  assert.equal(run('<ul class="posts">\n\n</ul>'), '<ul class="posts">\n\n</ul>');
});

test('image-captions: alt text becomes a figcaption; no alt, no figure', async () => {
  const { 'post:html': run } = await load('image-captions');
  assert.equal(run('<p><img src="https://x.test/a.png" alt="A cat" loading="lazy"></p>'), '<figure class="image"><img src="https://x.test/a.png" alt="A cat" loading="lazy"><figcaption>A cat</figcaption></figure>');
  const none = '<p><img src="https://x.test/a.png" alt="" loading="lazy"></p>';
  assert.equal(run(none), none);
  const inline = '<p>text <img src="https://x.test/a.png" alt="A cat"> more</p>';
  assert.equal(run(inline), inline);
});
