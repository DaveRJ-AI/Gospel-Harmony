import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteName = "Gospel Harmonics";
const siteUrl = "https://gospelharmonics.org";
const titleTag = `<title>${siteName}</title>`;
const imageDirectory = "/art/share";
const defaultImage = "gospel-harmonics.jpg";

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderPage(shell, { title, description, image, imageAlt, url }) {
  const metadata = [
    `<title>${escapeHtml(url ? `${title} | ${siteName}` : title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${siteName}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:image" content="${siteUrl}${imageDirectory}/${image}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ];
  if (url) {
    metadata.push(`<link rel="canonical" href="${url}">`, `<meta property="og:url" content="${url}">`);
  }

  return shell.replace(titleTag, () => metadata.join("\n    "));
}

export function buildEventPreviews() {
  return {
    name: "gospel-event-previews",
    apply: (_, { command, isPreview }) => command === "build" || isPreview,
    configurePreviewServer(server) {
      // Match Netlify's directory index behavior for event URLs without a trailing slash.
      server.middlewares.use((request, _response, next) => {
        request.url = request.url?.replace(/^(\/story\/[a-z0-9-]+)(?=\?|$)/, "$1/");
        next();
      });
    },
    async writeBundle({ dir }) {
      const index = join(dir, "index.html");
      const [shell, harmony, artwork, images] = await Promise.all([
        readFile(index, "utf8"),
        readFile(join(dir, "data/harmony.json"), "utf8").then(JSON.parse),
        readFile(join(dir, "data/artwork.json"), "utf8").then(JSON.parse),
        readdir(join(dir, imageDirectory.slice(1))),
      ]);
      if (!shell.includes(titleTag)) throw new Error("Gospel Harmonics title is missing from the built HTML.");
      if (!images.includes(defaultImage)) throw new Error("The default social preview image is missing.");

      const fallback = { image: defaultImage, imageAlt: "Gospel Harmonics logo and title" };
      await writeFile(index, renderPage(shell, {
        ...fallback,
        title: siteName,
        description: "Compare parallel passages from Matthew, Mark, Luke, and John by chapter, event, timeline, theme, or place.",
      }));

      for (const event of harmony.pericopes) {
        const id = event.pericopeId;
        if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid event ID: ${id}`);
        const directory = join(dir, "story", id);
        const painting = artwork[id]?.[0];
        const image = `${id}.jpg`;
        const preview = painting && images.includes(image) ? { image, imageAlt: painting.title } : fallback;

        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, "index.html"), renderPage(shell, {
          ...preview,
          title: event.title,
          description: event.summary,
          url: `${siteUrl}/story/${id}`,
        }));
      }
    },
  };
}
