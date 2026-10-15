# x0ryz.dev

Personal site of Bohdan Barulin: a single static page with a voxel snow monkey in a hot spring.

The monkey and its scene are built from code in [`site/monkey.js`](site/monkey.js) with three.js, no model files. The page follows the season (snow, sakura, bamboo or maple) and the light or dark theme. The monkey can be petted, and it falls asleep in the water when nobody plays with it.

## Layout

- `site/` is everything that gets published.
  - `index.html`, `404.html`, `style.css`
  - `season-pick.js` picks the season from the date before the page paints (`?season=spring|summer|autumn|winter` previews one)
  - `monkey.js` builds and animates the 3D scene
  - `season.js` draws the falling snow, petals or leaves over the page
  - `fonts/` is Onest, under the SIL Open Font License
- `cv/resume_en.yaml` is the source of `site/Bohdan_Barulin_CV.pdf`, in [RenderCV](https://rendercv.com) format.

## Run locally

```sh
python3 -m http.server -d site 8000
```

Then open <http://localhost:8000>. This simple server shows its own 404 page instead of `site/404.html`; Cloudflare Pages uses ours.

## Rebuild the CV

```sh
cd cv && uvx --from "rendercv[full]" rendercv render resume_en.yaml
cp rendercv_output/Bohdan_Barulin_CV.pdf ../site/
```

## Deploy

Cloudflare Pages serves the `site/` directory at x0ryz.dev.
