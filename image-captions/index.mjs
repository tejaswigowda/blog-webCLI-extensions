// A paragraph that holds only an image becomes <figure><img><figcaption>alt text</figcaption></figure>.
// An image with no alt text is left as it is: there is nothing to say under it.
const LONE_IMAGE = /<p>(<img [^>]*?alt="([^"]+)"[^>]*>)<\/p>/g;

export const hooks = {
  'post:html'(html) {
    return html.replace(LONE_IMAGE, (all, img, alt) => `<figure class="image">${img}<figcaption>${alt}</figcaption></figure>`);
  },
};
