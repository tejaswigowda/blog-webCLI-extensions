# blog-webCLI-extensions

The built-in extensions for [blog.webcli.app](https://blog.webcli.app). An extension is code in a
folder of a repository; this repository holds several. Each folder has an `extension.json`, an
`index.mjs` and a `LICENSE`.

> **Extensions run at publish, not at read. Their output is committed.**
> They run once, in the editor's sandbox (a Worker with no DOM, no network and no credentials, under a
> time limit). The result is committed as data, so the published pages depend on no third-party code
> and an extension's effect is a reviewable diff.

| Folder | Hook | What it does |
|---|---|---|
| [`reading-time`](reading-time) | `post:html` | "N min read" above a post (prose only; code is not counted) |
| [`heading-anchors`](heading-anchors) | `post:html` | An id and a `#` link on every heading |
| [`table-of-contents`](table-of-contents) | `post:html` | A contents list of the h2 and h3 headings, when there are three or more |
| [`smart-typography`](smart-typography) | `post:markdown` | Curly quotes, dashes and ellipses; code, links and URLs are left alone |
| [`archive-by-year`](archive-by-year) | `index:html` | The post list grouped under a heading for each year |
| [`image-captions`](image-captions) | `post:html` | An image's alt text shown as a visible caption |

All are MIT, `kind: "build"`, with no capabilities.

* `smart-typography` changes how the page is rendered, never the post's markdown source.
* `archive-by-year` and `image-captions` use the `blog-webcli-v1` markup. With the
  `wordpress-classic` contract they leave the page unchanged rather than guess.
* `archive-by-year` needs dates shown in the list (Settings → Post list → Show dates).
* `heading-anchors` and `table-of-contents` give headings the same ids, so they can be used together
  in either order.
* The `/blog/` reader does not apply extension output, so these affect the generated static pages.

## Use one

In the editor open **Settings → Extensions**, or from the CLI:

```
node cli/blog.js ext add tejaswigowda/blog-webCLI-extensions/heading-anchors@v1.0.0
```

The address is `owner/repo/folder@ref`, where `ref` is a release tag or a commit; a branch is
refused. blog.json records `{ repo, ref, sha256 }` for each. The editor runs the extension in the
sandbox when you publish, and commits its output to `extension-outputs.json`; the CLI and CI only
read that file and never run extension code.

## Releases

Tags apply to the whole repository (`v1.0.0`), but each folder is pinned by the hash of *its own*
`extension.json` and entry file, so a new release of one extension does not invalidate blogs pinned
to another. **Never move a tag**; cut a new one.

## Write one

```js
// index.mjs: a pure function over data
export const hooks = {
  'post:html'(html, ctx) { return html; }, // ctx: { slug, title, date, tags }
};
```

* Hooks: `post:markdown` (markdown to markdown), `post:html` (the post body), `index:html` (the post list).
* One file: the pin hashes `extension.json` and the entry only, so there are no imports.
* No `fetch`, no DOM, no `eval`, no state between calls. Same input, same output.
* HTML is rebuilt from an allow-list: `<script>`, event handlers, `javascript:` URLs, `<style>`,
  forms and unknown iframes are *refused*, not stripped. `target` is not allowed; `rel` keeps only
  link relations (`bookmark`, `tag`, …), and every absolute link is made `noopener noreferrer`.
* A `LICENSE`, and a `licence` in `extension.json`: no licence is a refusal.

`npm test` runs the unit tests (Node 22, no dependencies). A pull request adding a folder and an
entry in [blog-webCLI `extensions.json`](https://github.com/tejaswigowda/blog-webCLI/blob/main/extensions.json)
lists it.
