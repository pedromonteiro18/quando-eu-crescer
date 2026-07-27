# English with Clara

An English-only app that exercises **all four language skills in every lesson** — listening,
speaking, reading, writing — for ages four through adult. No translation anywhere, not even in the
buttons. Everything runs on the device: no account, no server, no analytics, no network call
beyond the page's own files.

**Live:** <https://pedromonteiro18.github.io/quando-eu-crescer/>

Read **[DESIGN.md](DESIGN.md)** for the decisions, the colour system, and what was verified.

---

## Running it

The app is static files with no build step, but it does need a real HTTP server — ES modules and
`fetch` both refuse to work from `file://`.

```sh
python3 -m http.server --directory app
# then open http://localhost:8000
```

`git push` updates the live site.

---

## The two build scripts

Neither is needed to run the app. Both write files that are committed.

```sh
node build/build-audio.mjs               # only what is missing
node build/build-audio.mjs --force       # re-render everything
node build/build-audio.mjs greetings     # one category (plus the shared ui set)

node build/build-fonts.mjs               # fetch, subset and inline the two OFL faces
```

`build-audio.mjs` needs macOS (`say` and `afconvert`). Set `AUDIO_VOICE` to use a different
installed voice. **A clip is named after its own text**, so replacing the synthetic voice with a
human recording is a file swap — re-record the phrase, keep the filename, change nothing else.

`build-fonts.mjs` needs network access once. If `pyftsubset` (fonttools) is on `PATH` the faces are
cut down to the characters the app can display: 79 kB instead of 212 kB.

---

## Layout

| Path | What it is |
|---|---|
| `app/` | The whole app. Open `app/index.html` through a server. |
| `app/content/levels.json` | The four bands, the placement ladder, badges, confusable pairs, and the list of category files. |
| `app/content/categories/*.json` | One category per file — exactly what a generator produces and a human approves. |
| `app/audio/<category>/` | Clips plus a `clips.json` manifest, fetched only when that category is opened. |
| `app/js/` | ES modules. `audio.js` and the progress buckets are ported from the prototype. |
| `build/` | The two generators above. |
| `prototype/` | The previous Portuguese-instructed job app, kept as the record of where this came from. |

---

## Adding a category

1. Write `app/content/categories/<id>.json` in the shape documented in
   [DESIGN.md](DESIGN.md#content-format), with `"reviewed": false`.
2. Add `"<id>"` to `categoryFiles` in `app/content/levels.json`, and to the `categories` list of
   whichever bands should offer it.
3. `node build/build-audio.mjs <id>`
4. Review it. **While `reviewed` is `false` the category does not exist for a learner** — not as a
   lesson and not even as a wrong answer. It shows up flagged in the teacher view, which is where
   you review it from. Set `"reviewed": true` when it is approved.

`weather` is deliberately left unreviewed so the gate is demonstrated rather than described.

---

## The teacher area

Press and hold the ⚙ for three seconds. It holds the review queue, per-skill accuracy, the mistake
log, the band switcher, and the audio self-test — which plays a clip and reports whether the
`AudioContext` clock actually advanced, because a page that reports no errors can still be
completely silent.

---

## Before launch

The audio is macOS system voices rendered to files and committed to a public repo. Apple licenses
those voices for personal use, and 607 clips in a branded product is not defensible. Resolve this
first: make the repo private, license a commercial voice, or record a human. The pipeline is
already swap-ready.
