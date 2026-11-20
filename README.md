# Cherry Blossoms · 樱

A 57-second micro-film, all code: Vite + Three.js, no 3D software, no image
assets. Built in reply to the @cfenghub post about Opus 5.5's "Cherry Blossoms"
(sunset melting into gold, ink-wash mountains, a lone swordsman under falling
petals, paper-cut / shadow-puppet restraint).

- **Watch it live:** https://ryx168.github.io/hk4rw_Qz7mNp_vL2d/ (the `pages` job publishes `dist/` on every push; SPACE pauses, R replays).
- **Rendered MP4:** https://github.com/ryx168/hk4rw_Qz7mNp_vL2d/releases/latest — 1920x1080, 30 fps, 57 s.
  `Run workflow` on the `render` action captures the 1710 frames per film headless in
  parallel chunks, stitches them with ffmpeg, and attaches every MP4 and its contact
  sheet to one release tagged `run-<number>`.

![ten frames from the release render, one every 5.7 s](docs/contact_sheet.jpg)

## Four films, one engine

Every colour, light and title comes from a preset in `src/scenes.js`, so the same set,
choreography and camera make four different films. Pick one with `?scene=`, or press
1-4 on the live page.

| | Film | Live | Mood |
|---|---|---|---|
| 樱 | Cherry Blossoms | [`?scene=dusk`](https://ryx168.github.io/hk4rw_Qz7mNp_vL2d/?scene=dusk) | the original: sunset melting into gold, pink petals |
| 月 | Moonlight | [`?scene=moon`](https://ryx168.github.io/hk4rw_Qz7mNp_vL2d/?scene=moon) | full moon, silver lake streak, pale blossoms, twinkling stars |
| 梅 | Winter Plum | [`?scene=snow`](https://ryx168.github.io/hk4rw_Qz7mNp_vL2d/?scene=snow) | ink-wash on paper: overcast, snow instead of petals, red plum on a sparse tree |
| 晨 | First Light | [`?scene=dawn`](https://ryx168.github.io/hk4rw_Qz7mNp_vL2d/?scene=dawn) | the sun rises instead of sets, through peach river mist |

![title, duel and looking-up frames from each of the four films](docs/samples.jpg)

`dusk` is guarded: the refactor that introduced presets was checked by hashing
rendered frames before and after, and they are byte-identical. To add a film, add
a preset that overrides only what changes; `Run workflow` with `scene: all` renders
every preset.

## What is in the frame

| Part | How |
|---|---|
| Sky | one gradient function (`skyColor`) shared by the sky sphere and the lake, plus a sun disc and fbm cloud streaks |
| Mountains | six paper-cut ridges from 1-D value noise; `MeshBasicMaterial` + `scene.fog` gives the aerial perspective for free |
| Lake | mirrors `skyColor`, with the sun's gold streak computed from the azimuth difference to the sun |
| Tree | recursive branches merged into one mesh; 14 billboard blossoms per twig tip, backlit toward the sun |
| Petals | 3000 instances, position = f(seed, time) in the vertex shader; the sword swing is a vortex with a rise-then-decay envelope |
| Swordsman | shadow-puppet rig of extruded `Shape`s, joints rotate in the profile plane, 11 poses keyframed over the film; the sun behind him lights only the extruded edges |
| Grade | bloom for the sun, then paper fibre, grain, vignette and the fades |

Everything is a pure function of time, so a frame rendered on one machine is
identical on another, which is what lets the render be split across jobs.

## Run it

```
npm install
npm run dev          # http://127.0.0.1:5178  (SPACE pause, R replay)
npm run build
node scripts/render.mjs --scene dusk --start 0 --end 1709 --out frames
ffmpeg -framerate 30 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 17 cherry_blossoms.mp4
```

Locally, point `PUPPETEER_EXECUTABLE_PATH` at an installed Chrome and install
with `PUPPETEER_SKIP_DOWNLOAD=1` if you do not want puppeteer's own copy.
