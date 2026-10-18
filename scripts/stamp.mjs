// Adds a short hash of each stylesheet and script to the URLs that load it (/style.css?v=1a2b3c4d),
// so a browser that cached an older copy fetches the new one after a deploy.
// Run by `npm run build`; run it after changing any of these files.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const site = new URL("../site/", import.meta.url);
// monkey.min.js first: page.js loads it, so page.js's own hash must include the new reference
const assets = ["monkey.min.js", "style.css", "season-pick.js", "season.js", "onsen.js", "page.js"];
const pages = ["page.js", "index.html", "404.html"];

for (const asset of assets) {
  const hash = createHash("sha256").update(readFileSync(new URL(asset, site))).digest("hex").slice(0, 8);
  const ref = new RegExp(`/${asset.replace(".", "\\.")}(\\?v=[0-9a-f]+)?(?=["'])`, "g");
  for (const page of pages) {
    if (page === asset) continue;
    const file = new URL(page, site);
    const text = readFileSync(file, "utf8");
    const stamped = text.replace(ref, `/${asset}?v=${hash}`);
    if (stamped !== text) writeFileSync(file, stamped);
  }
}
