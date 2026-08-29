# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"English with Clara" — a static, client-side web app that teaches English to Portuguese
speakers, ages four through adult. **The lessons are English; the interface is Portuguese**,
and that line is enforced in code, not just convention (see below). No build step to run it,
no bundler, no server-side code, no network calls beyond the app's own files. Runs entirely
on-device: no account, no analytics.

`prototype/` is an earlier, unrelated-in-code Portuguese-instructed job app kept only as a
historical record — do not extend it; all active work is in `app/`.

## Running it

Needs a real HTTP server (ES modules + `fetch` do not work from `file://`):

```sh
python3 -m http.server --directory app
# then open http://localhost:8000
```

There is no package.json, no bundler, no test runner, and no linter configured in this repo.
Nothing needs installing to run or edit the app.

## Build scripts (optional — output is committed, app doesn't need them to run)

```sh
node build/build-audio.mjs               # render only missing audio clips
node build/build-audio.mjs --force       # re-render every clip
node build/build-audio.mjs greetings     # one category (plus the shared ui sets)

node build/build-fonts.mjs               # fetch, subset, and inline the two OFL fonts
```

- `build-audio.mjs` requires **macOS** (`say` + `afconvert`). `AUDIO_VOICE` / `AUDIO_VOICE_PT`
  pick the English/Portuguese system voices. It refuses to render a category file that is
  missing any of the six required content parts, rather than silently producing a thin lesson.
- **A clip's filename is derived from its own text.** This is the contract that lets a
  synthetic voice be replaced by a human recording later: re-record the phrase, keep the exact
  filename, touch nothing else.
- `build-fonts.mjs` needs network access once; uses `pyftsubset` (fonttools) if present on
  `PATH` to shrink the fonts (79 kB vs 212 kB unsubsetted).

## The one rule that shapes everything: lessons vs. chrome

The app is two languages split **by role, not by convenience**:

- **What is being taught** (vocabulary, phrases, dialogue, reading, everything Clara models for
  the learner to repeat) is English, always, and never translated.
- **What carries the learner to it** (buttons, instructions, settings, praise, errors) is
  Portuguese, switchable.

This is enforced structurally, not just by discipline:
- `app/js/i18n.js` — the entire interface is a flat key → `{en, pt}` dictionary. `t(key)`
  resolves through it; a missing key renders as the key itself and warns to the console (a gap
  is loud, not silently blank).
- Lesson content **never** passes through `t()`. `A.say(word)` in a skill module resolves
  straight to the topic's own English audio recording — there is no code path by which category
  content could be translated.
- `app/js/spoken.js` holds every line Clara speaks, in both languages, and is imported by
  **both** the runtime app and `build/build-audio.mjs`, so the set of clips rendered and the set
  of clips played can never drift apart.
- Clara's own instructions/praise audio lives in `app/audio/ui-pt/` (Portuguese); everything she
  models for repetition lives in `app/audio/ui/` and the per-topic folders (English).

When touching UI strings or content files, preserve this split: never route lesson content
through `t()`, never hardcode a learner-facing chrome string outside `i18n.js`.

## Bands vs. levels — orthogonal on purpose

- A **band** (`4-6`, `7-10`, `11-14`, `15+`) is *presentation*, chosen by age: letter tiles vs.
  free typing, passage or none, instructions or none.
- A **level** (0–5: Iniciante → Avançado, CEFR A1 → C1) is *difficulty*, chosen by the placement
  test (`app/js/placement.js`).

They must stay independent — an adult beginner gets level-0 content without letter tiles; a
strong twelve-year-old gets level-4 content with a twelve-year-old's scaffolding. Collapsing
them into one axis is a regression, not a simplification.

**Levels are depth inside one content file, not six copies of it.** Every vocabulary item,
phrase, speaking prompt, writing item, and quiz question carries an optional `level` 0–5; an
untagged item belongs to every rung (this is what keeps the original, unleveled category files
working untouched). `C.atLevel(list, n)` returns the cumulative slice up to rung `n`.
`dialogue` and `reading`, by contrast, are arrays of **whole alternatives** (never partial —
half a dialogue isn't a dialogue): the learner gets the hardest one at or below their rung, with
different `whenNothingFits` behavior per type — a dialogue falls back to the *easiest* available
one, but a reading passage returns nothing and the lesson skips that screen rather than handing
a beginner a text far above their level.

## Content pipeline and the review gate

One sub-topic = one file at `app/content/categories/<id>.json`, shape documented in
`DESIGN.md#content-format`. `app/content/topics.json` declares which topics/sub-topics exist
(with Portuguese glosses); `app/content/levels.json` defines the four bands, the six levels, the
placement ladder, badges, confusable-word pairs, and the authoritative `categoryFiles` list
(a static host can't list a directory, so this list is required — a new category file is inert
until added here).

`reviewed: false/true` in a category file is a **live gate**, not documentation:
`app/js/content.js` only ever surfaces categories where `reviewed` is `true` — not as a lesson,
and not even as a wrong-answer distractor (the distractor index is built from `visible()`
alone). Three states exist and are deliberately distinct:

| State | Meaning | What the learner sees |
|---|---|---|
| File exists, `reviewed: true` | approved | a normal, tappable lesson card |
| Declared in `topics.json`, no file | promised | a disabled "Em breve" card (visible roadmap) |
| File exists, `reviewed: false` | written, unapproved | nothing — invisible everywhere |

`weather` is intentionally left `reviewed: false` in the live app as a permanent demonstration
of this gate. When adding a sub-topic, follow the 5-step recipe in `README.md` (declare in
`topics.json` → write the category file with `reviewed: false` and every item leveled → add the
id to `categoryFiles` in `levels.json` and to the relevant bands' `categories` list → run
`node build/build-audio.mjs <id>` → review via the teacher view, then flip `reviewed: true`).

Distractors for quiz/multiple-choice are drawn from **other** categories' vocabulary (free
cross-topic discrimination) and only ever from reviewed categories. `levels.json`'s
`confusable` pairs list keeps genuinely-confusable items (e.g. two similarly-drawn icons) from
appearing as options in the same question.

## Architecture (`app/js/`)

Plain ES modules, no bundler, imported directly by `index.html` via `<script type="module">`.

- `app.js` — router, session state, and the lesson flow itself. Runs every band through the
  same fixed skill order: **meet the words → listen → read → speak → write → quiz** (input
  before output). Labels are read at render time, never cached, since the language can change
  under a live session.
- `content.js` — loads `levels.json`/`topics.json`/category files, owns the `reviewed` gate and
  the cross-category distractor index.
- `audio.js` — the Web Audio player, **ported unmodified from the prototype** because its
  behavior was arrived at by measurement, not preference. Key invariants, do not "simplify"
  them away:
  - Uses `decodeAudioData` + `BufferSource`, not an `<audio>` element — GitHub Pages serves
    `.m4a` with a `Content-Type` Chrome's `<audio>` tag refuses, and a `BufferSource` also plays
    in a backgrounded tab.
  - `unlock()` must create the `AudioContext` and start a real, audible one-sample buffer
    **synchronously inside the user gesture** — anything reached via `setTimeout` or an awaited
    promise is treated by iOS as outside the gesture and mutes the whole session.
  - Every playback resolves via `onended`, failure, **or** a length-derived timeout — never
    rejects, never hangs — because a device with broken audio output must still be able to
    finish a lesson.
  - `wake()` re-resumes the context on `visibilitychange`/`pageshow`/`focus`, since iOS suspends
    it on backgrounding and nothing else will revive it.
- `progress.js` — the new → learning → known bucket model, per-skill accuracy, mistake log,
  streak, badges.
- `placement.js` — maps age → band and a short grammar ladder → level.
- `i18n.js` / `spoken.js` — see the lessons-vs-chrome section above.
- `clara.js` — the character: hand-authored inline SVG, four expressions built by swapping only
  eyes/mouth so she reads as one consistent character.
- `quiz.js`, `revise.js`, `assess.js`, `teacher.js`, `ui.js` — quiz engine, spaced revision,
  unit/band assessments, the teacher/reviewer view (`?teacher=1` or a 3-second hold on the
  gear icon), and shared DOM/FX helpers (`Mission` token + `busy` guard pattern to make rapid
  double-taps and mid-transition navigation safe).
- `skills/ask.js` — the one question-card component every one of the four skill screens is
  built from (shared answer/feedback/hint logic; skill screens differ mainly in prompt shape).
- `skills/{listen,speak,read,write}.js` — the four skill screens, each per-band-adaptive (e.g.
  `write` is letter tiles for 4–6 but free typing for 15+).

Each of the four skills owns a color everywhere in the UI (listening cyan `#0B6E7A`, speaking
coral `#C0442A`, reading indigo `#3A3A8C`, writing green `#2C6E49`) — this is information design
(progress-at-a-glance), not decoration; preserve the mapping when touching skill-related UI.

Audio is fetched **per category**, lazily, via a `clips.json` manifest in each
`app/audio/<topic>/` folder — not inlined into the app — because the full clip set is too large
to bundle.

## The voice licensing blocker, and how it was cleared

The committed clips were macOS system voices, which Apple licenses for personal use only — fine
while building, not shippable. They are now **Google Cloud Chirp3-HD** (`Aoede` in both locales),
whose output may be redistributed inside a product. `DESIGN.md` §3 has the reasoning.

`build/build-audio.mjs` takes `AUDIO_ENGINE=say` (default; macOS voices, free, offline, for
development) or `AUDIO_ENGINE=google` (licensed, what ships). `afconvert` encodes either, at the
settings the committed clips use, so the engines differ in voice and nothing else. Google auth is
whatever `gcloud auth print-access-token` returns — deliberately not an SDK, because this repo has
no `package.json` and one HTTP call is not worth its first dependency.

The swap re-rendered all 1,587 clips and changed **zero filenames and zero manifests**: that is the
filename-is-the-content contract doing exactly the job it was built for. It still holds, so
replacing Chirp3-HD with human recordings later is the same file swap, no code changes.
