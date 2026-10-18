# x0ryz.dev

Personal site of Bohdan Barulin: a single static page with a voxel snow monkey in a hot spring.

The monkey and its scene are built from code in [`site/monkey.js`](site/monkey.js) with three.js, no model files. The page follows the season (snow, sakura, bamboo or maple) and the light or dark theme. The monkey looks at your pointer, follows you down the page in the corner once the intro scrolls away (where the window is wide enough), can be petted, shakes off the snowflakes and leaves that land on its head, and falls asleep in the water when nobody plays with it. Asleep, it peeks with one eye at a pointer close by.

## Layout

- `site/` is everything that gets published.
  - `index.html`, `404.html`, `style.css`
  - `season-pick.js` picks the season from the date before the page paints (`?season=spring|summer|autumn|winter` previews one)
  - `monkey.js` builds and animates the 3D scene; it is the readable source of `monkey.min.js`, which the pages load
  - `season.js` draws the falling snow, petals or leaves over the page
  - `page.js` loads the scene once the page is idle, and runs the clock in Lutsk
  - `og-<season>.png` are the link preview images, one per season
  - `_headers` sets the security headers (a strict Content-Security-Policy: every script and style comes from this site)
  - `fonts/` is Onest, under the SIL Open Font License
- `functions/og.png.js` is a Cloudflare Pages Function: `/og.png` serves the current season's preview image.
- `cv/resume_en.yaml` is the source of `site/Bohdan_Barulin_CV.pdf`, in [RenderCV](https://rendercv.com) format.

## Run locally

```sh
python3 -m http.server -d site 8000
```

Then open <http://localhost:8000>. This simple server shows its own 404 page instead of `site/404.html`; Cloudflare Pages uses ours. `/og.png`, the headers and the 404 page only work under Cloudflare Pages, or locally with `npx wrangler pages dev site`.

## Rebuild the scene

`monkey.min.js` is `monkey.js` bundled with the parts of three.js it uses, so the page needs no CDN. Run this after changing `monkey.js`, and commit both files:

```sh
npm install
npm run build
```

## Rebuild the CV

`cv/build.sh` renders `cv/resume_en.yaml` to `site/Bohdan_Barulin_CV.pdf` with RenderCV, in its `engineeringresumes` theme. The home page is the CV on the web; the PDF is the full version to send or print.

```sh
./cv/build.sh
```

It needs [uv](https://docs.astral.sh/uv/); RenderCV is pinned in the script, so a new release can't change the PDF unasked. Commit the PDF with the YAML.

## Deploy

Cloudflare Pages serves the `site/` directory at x0ryz.dev.
