import { readFileSync, writeFileSync } from "node:fs";

// Run node build.mjs to regenerate the portable HTML after editing the source.
const here = (file) => new URL(file, import.meta.url);
const read = (file) => readFileSync(here(file), "utf8");
const image = readFileSync(here("assets/highway.webp")).toString("base64");
const scripts = ["traffic.js", "drawing.js", "explainer.js"];

let html = read("index.html")
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${read("styles.css")}</style>`)
  .replace('src="assets/highway.webp"', () => `src="data:image/webp;base64,${image}"`);

for (const file of scripts) {
  html = html.replace(`  <script defer src="${file}"></script>\n`, "");
}

const inlineScripts = scripts.map((file) => `<script>\n${read(file)}</script>`).join("\n");
html = html.replace("</body>", () => `${inlineScripts}\n</body>`);
writeFileSync(here("traffic-explainer.html"), html);
