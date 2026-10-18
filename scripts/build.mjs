// Builds the site into dist/, which Cloudflare Pages publishes:
// - copies site/ as it is
// - bundles monkey.js with the parts of three.js it uses into monkey.min.js
// - adds a short hash of each stylesheet and script to the URLs that load it
//   (/style.css?v=1a2b3c4d), so a browser that cached an older copy fetches the new one
import { createHash } from "node:crypto";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);

rmSync(dist, { recursive: true, force: true });
cpSync(new URL("site/", root), dist, { recursive: true });

await build({
  entryPoints: [fileURLToPath(new URL("site/monkey.js", root))],
  outfile: fileURLToPath(new URL("monkey.min.js", dist)),
  bundle: true,
  minify: true,
  format: "esm",
  alias: { "three/addons": "three/examples/jsm" },
  logLevel: "warning",
});

// monkey.min.js first: page.js loads it, so page.js's own hash must include the new reference
const assets = ["monkey.min.js", "style.css", "season-pick.js", "season.js", "onsen.js", "page.js"];
const pages = ["page.js", "index.html", "404.html"];
for (const asset of assets) {
  const hash = createHash("sha256").update(readFileSync(new URL(asset, dist))).digest("hex").slice(0, 8);
  const ref = new RegExp(`/${asset.replace(".", "\\.")}(?=["'])`, "g");
  for (const page of pages) {
    if (page === asset) continue;
    const file = new URL(page, dist);
    writeFileSync(file, readFileSync(file, "utf8").replace(ref, `/${asset}?v=${hash}`));
  }
}
console.log("Built dist/");
