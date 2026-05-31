// Responsive restaurant images, processed at build time by vite-imagetools.
// `as=srcset` yields a "url 300w, url 600w" string; the plain `?w=600` import is
// the fallback `src`. `.jpg` output (format=jpg) keeps the service worker's
// `pathname.includes(".jpg")` image route matching.
const srcsets = import.meta.glob("../img/*.jpg", {
  query: "?w=300;600&format=jpg&as=srcset",
  eager: true,
  import: "default"
});
const fallbacks = import.meta.glob("../img/*.jpg", {
  query: "?w=600&format=jpg",
  eager: true,
  import: "default"
});

const FALLBACK = "failwhale";
const VALID = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", FALLBACK]);

export function getImage(fileName) {
  const name = VALID.has(fileName) ? fileName : FALLBACK;
  const key = `../img/${name}.jpg`;
  return { srcSet: srcsets[key], src: fallbacks[key] };
}
