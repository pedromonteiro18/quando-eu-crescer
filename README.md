# English with Clara

An app that exercises **all four language skills in every lesson** — listening, speaking, reading,
writing — for ages four through adult. **The lessons are English; the interface is Portuguese.**
Everything runs on the device: no account, no server, no analytics, no network call beyond the
page's own files.

**Live:** <https://pedromonteiro18.github.io/quando-eu-crescer/>
**For a reviewer:** <https://pedromonteiro18.github.io/quando-eu-crescer/?teacher=1> — opens
straight onto the review queue.

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

## Two languages, one rule

The interface is Portuguese and switchable from the ⚙; **everything being taught is English and
never translated.** The line between them is not a matter of taste, so it is enforced in code:

- `app/js/i18n.js` holds the whole interface as a flat key → `{en, pt}` dictionary. `t("home.pick")`
  resolves through it; a missing key renders as the key itself and warns to the console, so a gap
  is loud rather than invisible.
- Lesson content never passes through `t()`. `A.say(word)` in a skill module resolves to the
  topic's own English recording, and no code path can translate a category file.
- `app/js/spoken.js` holds the lines Clara speaks aloud, in both languages, and is read by **both**
  the app and the build script — so the list of clips to render and the list of clips to play
  cannot drift apart.

Clara's instructions and praise are Portuguese (`app/audio/ui-pt/`); everything she models for the
learner to repeat is English (`app/audio/ui/` and the topic folders).

---

## The two build scripts

Neither is needed to run the app. Both write files that are committed.

```sh
node build/build-audio.mjs               # only what is missing
node build/build-audio.mjs --force       # re-render everything
node build/build-audio.mjs greetings     # one topic (plus the shared ui sets)

node build/build-fonts.mjs               # fetch, subset and inline the two OFL faces
```

`build-audio.mjs` needs macOS (`say` and `afconvert`). `AUDIO_VOICE` picks the English voice and
`AUDIO_VOICE_PT` the Portuguese one. It refuses a content file that is missing any of the six
required parts, rather than silently generating a thin lesson. **A clip is named after its own
text**, so replacing a synthetic voice with a human recording is a file swap — re-record the
phrase, keep the filename, change nothing else.

`build-fonts.mjs` needs network access once. If `pyftsubset` (fonttools) is on `PATH` the faces are
cut down to the characters the app can display: 79 kB instead of 212 kB.

---

## Layout

| Path | What it is |
|---|---|
| `app/` | The whole app. Open `app/index.html` through a server. |
| `app/content/levels.json` | The four bands, the six levels, the placement ladder, badges, confusable pairs, and the list of content files. |
| `app/content/topics.json` | Which topics exist, which sub-topics are promised, and their Portuguese glosses. |
| `app/content/categories/*.json` | One sub-topic per file — exactly what a generator produces and a human approves. |
| `app/audio/<topic>/` | Clips plus a `clips.json` manifest, fetched only when that topic is opened. |
| `app/audio/ui/`, `app/audio/ui-pt/` | Clara's own lines, English and Portuguese. |
| `app/js/i18n.js`, `app/js/spoken.js` | The interface dictionary, and the lines Clara speaks. |
| `app/js/` | ES modules. `audio.js` and the progress buckets are ported from the prototype. |
| `build/` | The two generators above. |
| `prototype/` | The previous Portuguese-instructed job app, kept as the record of where this came from. |

---

## Levels and bands are different things

A **band** is presentation, chosen by age: letter tiles or free writing, passage or no passage,
instructions or none. A **level** is difficulty, chosen by the placement test: Iniciante, Básico,
Pré-Intermediário, Intermediário, Intermediário Superior, Avançado.

They are orthogonal on purpose. An adult beginner gets level-0 content without letter tiles; a
strong twelve-year-old gets level-4 content with a twelve-year-old's scaffolding.

**Levels are depth inside one file, not six copies of it.** Each vocabulary item, phrase, speaking
prompt, writing item and quiz question carries a `level` 0–5; an item with no `level` belongs to
every rung, which is why the ten original files still work untouched. `dialogue` and `reading` are
arrays of whole alternatives — half a dialogue is not a dialogue.

---

## Adding a sub-topic

1. Declare it in `app/content/topics.json` under its topic. With no content file it renders as a
   disabled **"Em breve"** card — visible roadmap, not tappable.
2. Write `app/content/categories/<id>.json` in the shape documented in
   [DESIGN.md](DESIGN.md#content-format), with `"reviewed": false`. Tag every item with a `level`.
3. Add `"<id>"` to `categoryFiles` in `app/content/levels.json`, and to the `categories` list of
   whichever bands should offer it.
4. `node build/build-audio.mjs <id>`
5. Review it. **While `reviewed` is `false` the sub-topic does not exist for a learner** — not as a
   lesson and not even as a wrong answer. It shows up flagged in the teacher view, which is where
   you review it from. Set `"reviewed": true` when it is approved.

Three states, three meanings: **ready** opens, **declared with no file** shows "Em breve",
**unreviewed** is invisible. `weather` is deliberately left unreviewed so the gate is demonstrated
rather than described.

---

## The ⚙

**Tap** it for Settings: interface language, age band, level, retaking the placement test, and the
sound help below.

**Press and hold for three seconds** for the teacher area — the review queue, per-skill accuracy,
the mistake log, and the audio self-test. `?teacher=1` opens it directly, which is the link to
send a reviewer rather than a hidden gesture to explain.

---

## If there is no sound

The app watches its own output: if two playbacks in a row fail to advance the `AudioContext`
clock, a **"Sem som?"** strip appears with what to check. A page that reports no errors can still
be completely silent, so it measures rather than assumes.

The first thing on that list is the **iPhone's ringer switch**, because Web Audio obeys it and no
web page can detect it. If the orange stripe is showing, nothing will play and nothing will say
why.

---

## Before launch

The audio is macOS system voices rendered to files and committed to a public repo — now **two**
voices, Samantha and Luciana. Apple licenses those voices for personal use, and 939 clips in a
branded product is not defensible. Resolve this first: make the repo private, license commercial
voices, or record humans. The pipeline is already swap-ready.
