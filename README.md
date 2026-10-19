# x0ryz.dev

Personal site of Bohdan Barulin: a single static page with a voxel snow monkey in a hot spring.

The monkey and its scene are built from code in [`site/monkey.js`](site/monkey.js) with three.js, no model files. The page follows the season (snow, sakura, bamboo or maple) and the light or dark theme. The monkey can be petted, and it falls asleep in the water when nobody plays with it.

## Layout

- `site/` is the source of everything that gets published; `npm run build` turns it into `dist/`.
  - `index.html`, `404.html`, `style.css`
  - `season-pick.js` picks the season from the date before the page paints (`?season=spring|summer|autumn|winter` previews one)
  - `monkey.js` builds and animates the 3D scene, and the hot spring at the foot of the page where the same monkey soaks a few times over; the build bundles it with three.js into `monkey.min.js`, which the pages load
  - `season.js` draws the falling snow, petals or leaves over the page
  - `page.js` loads the scene once the page is idle, and runs the clock in Lutsk
  - `og-<season>.png` are the link preview images, one per season
  - `_headers` sets the security headers (a strict Content-Security-Policy: every script and style comes from this site)
  - `fonts/` is Onest, under the SIL Open Font License
- `scripts/build.mjs` builds `dist/`: a copy of `site/`, the bundled scene, and a hash of each stylesheet and script in the URLs that load it (`/style.css?v=1a2b3c4d`), so browsers never keep an old copy after a deploy.
- `functions/weather.json.js` is a Cloudflare Pages Function: `/weather.json` is the weather in Lutsk from Open-Meteo, cached for half an hour. The scenes and the falling bits follow it (rain, snow, cloud, fog, storm), and the clock says it. `?weather=rain` (or `clear`, `cloudy`, `fog`, `snow`, `storm`) previews one.
- `functions/og.png.js` is a Cloudflare Pages Function: `/og.png` serves the current season's preview image.
- `cv/resume_en.yaml` is the source of `site/Bohdan_Barulin_CV.pdf`, in [RenderCV](https://rendercv.com) format.

## Run locally

```sh
npm install
npm start
```

This builds `dist/` and serves it at <http://localhost:8000>. The simple server shows its own 404 page instead of ours, and `/og.png` and the headers only work under Cloudflare Pages, or locally with `npx wrangler pages dev dist` after `npm run build`.

## Rebuild the CV

`cv/build.sh` renders `cv/resume_en.yaml` to `site/Bohdan_Barulin_CV.pdf` with RenderCV, in its `engineeringresumes` theme. The home page is the CV on the web; the PDF is the full version to send or print.

```sh
./cv/build.sh
```

It needs [uv](https://docs.astral.sh/uv/); RenderCV is pinned in the script, so a new release can't change the PDF unasked. Commit the PDF with the YAML.

## Deploy

Cloudflare Pages builds every push to `main` and serves it at x0ryz.dev, with these build settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (where `functions/` is)

Node comes from `.nvmrc`. Nothing built is committed: `dist/` is ignored by git.
