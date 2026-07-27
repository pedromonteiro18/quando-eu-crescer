# English with Clara

An English-only app that exercises **all four language skills in every lesson**, for ages four
through adult. Clara is the brand and the teacher. There is no Portuguese anywhere in it — not in
the lessons, not in the buttons, not in the audio.

**Status:** engine complete, four levels, placement test, ten categories, 607 recorded clips.
Runs as static files, no build step, no server, no network calls beyond its own assets.

**Live:** <https://pedromonteiro18.github.io/quando-eu-crescer/>

| Decision | Choice |
|---|---|
| Platform | **Web only, stays online.** No native apps, no phone-specific work yet. |
| AI features | **Not yet.** No LLM, no live generation. Static content, client-side only. |
| First release | **Engine + 4 levels + placement test + 8 deep categories.** Remaining 22 bulk-generated after. |
| Speaking | **Record and compare, unscored.** No speech recognition. |
| Clara | **Original character**, not a likeness of the real Clara. Voice stays synthetic for now. |
| Ages 4–6 | **Instruction-free UI** — demonstrate by example, no narration to misunderstand. |

Nothing from the prototype was wasted. The Web Audio player, the progress buckets, the `reviewed`
content gate, the mission/busy guards and the three job packs all carried forward. `prototype/`
is still in the repo as the record of where this came from; the root page now opens the new app.

---

## Decisions worth stating

### 1. Speech recognition is out, and that is the right call

MDN lists `SpeechRecognition` as *"limited availability — not Baseline because it does not work in
some of the most widely-used browsers,"* and where it does work it *"involves a server-based
recognition engine. Your audio is sent to a web service."* For a children's app that means
uploading a child's voice to a third party in order to get an unreliable verdict on an accented L2
speaker.

Speaking practice is therefore **hear Clara → record yourself → hear both back to back**, using
`MediaRecorder`, entirely on-device. Self-comparison is how pronunciation is actually taught, and
it cannot tell a child they are wrong when they are right. The microphone track is stopped the
moment the learner stops speaking, so the browser's recording indicator goes out instead of
staying lit for the rest of the lesson, and the recording is discarded when they move on.

### 2. Removing Portuguese is free for older learners and a real design problem at 4–6

A Brazilian four-year-old cannot be instructed in English, or in anything else. The answer is to
need no instructions: the first item demonstrates itself, a hand icon shows the tap, and the
pattern repeats. This makes the immersion goal *stronger* — there is no translation anywhere.

The whole text inventory of a 4–6 lesson, measured rather than asserted, is: five section labels
(*New words, Listening, Reading, Speaking, Writing*), the six vocabulary words themselves,
individual letters on the spelling tiles, and the CEFR tag. No sentence, no instruction, no prose.
The compare buttons in the speaking activity show Clara's face and a microphone rather than the
words "Clara" and "You", because that screen is the one place where a reading requirement would
have slipped in unnoticed.

The letter tiles were the second place. A lesson carries only a slice of its category's
vocabulary, so an authored spelling item's word usually is *not* in that slice — and the picture
lookup, which only searched the slice, quietly returned nothing. The screen still rendered:
three empty slots, five letters, and no question. For a band that reads no instructions, that is
not a degraded prompt, it is a blank one. The lookup now falls back to the whole category, a
spelling item that still cannot find a picture is not offered to the tiles band at all, and if
one somehow arrives the slot shows 🔊 rather than nothing. Every band still fills its writing
quota from every category after the filter.

### 3. The voice licensing problem is worse at this scale, and blocks launch

All 607 clips are macOS `say` output committed to a **public** repo. Apple licenses those voices
for personal use. At 79 clips for a family prototype that was a flagged grey area; at 607 clips
for a branded product called *English with Clara* it is not defensible.

Before any real launch, one of: make the repo private, license a commercial TTS voice, or have a
human record it. **This blocks launch, not building.** The pipeline is swap-ready: a clip is named
after its own text, so re-recording a phrase and keeping the filename requires no code change and
no manifest change.

### 4. Daily reminders cannot be done properly in a web page

Scheduled local notifications need a service worker with push, which needs a server and, on iOS,
an installed PWA. Phones are out of scope, so v1 ships a **streak counter and a "practise today"
state** instead. Real reminders wait for the native port.

### 5. The visual identity grew up

The prototype's "Patch Board" look — thick outlines, hard offset shadows, embroidered lettering —
was designed for 6–9-year-olds and would read as childish to someone doing Business English. It
has been replaced entirely. See below.

---

## Design direction — skills as the colour system

The subject is a teacher's materials: flashcards, a workbook, a marked exercise, a lesson plan.
The interface is a **modern workbook** — confident editorial hierarchy, strong horizontal rules
that echo ruled paper without imitating it, generous white space. Not skeuomorphic, not childish.

**The core system idea: each of the four skills owns a colour, everywhere.**

| Skill | Colour | |
|---|---|---|
| Listening | deep cyan | `#0B6E7A` |
| Speaking | warm coral | `#C0442A` |
| Reading | indigo | `#3A3A8C` |
| Writing | green | `#2C6E49` |

This is information design, not decoration. The lesson segment bar shows four coloured segments
filling in turn; the progress screen shows which skills are strong and weak at a glance; the
revision engine opens in the colour of whichever skill is behind, so *"your writing is behind"*
is visible before it is read. Achievement uses a single neutral gold `#9A7015`, deliberately kept
out of the skill hues so "well done" never accidentally reads as "this is listening".

Every skill colour clears 4.5:1 against the ground, so the system never depends on colour alone.

- **Ground** `#FAF7F2`, a warm off-white. **Ink** `#15161D`, near-black with a slight blue bias.
- **Age adapts within one system.** `--scale` and `--target` grow for the youngest band (1.30,
  84 px targets) and tighten for adults (0.96, 52 px). One type scale, one layout grid, one
  character — not four different apps.

**Typography.** `build/build-fonts.mjs` fetches both faces at build time and inlines them as
`@font-face` data URIs, so the page fetches nothing but its own files and a face can never
silently fail to arrive — the failure mode that forced a system-stack compromise in the prototype.
Both are SIL Open Font License, which permits redistribution including embedding, so unlike the
audio there is nothing to resolve before launch.

- **Fraunces** for display. Editorial, high contrast, a workbook cover.
- **Atkinson Hyperlegible** for text. Drawn by the Braille Institute to make letterforms
  unmistakable. In an app where a four-year-old taps letter tiles and an adult types answers,
  telling I from l from 1 is a feature, not a detail.

Subset with `pyftsubset` where available: 79 kB for both faces, down from 212 kB.

**Clara.** An original character, hand-authored inline SVG in the app's own drawing language:
bold silhouette, flat fills, no gradients, no soft shadows. Four expressions — neutral, pleased,
encouraging, listening — built by **swapping only eyes and mouth**, so she stays recognisably one
person rather than four similar drawings. She reads at 28 px in the header and at 200 px on a
lesson intro. Her only animation is a blink. She wears oat, not one of the four skill colours,
because the skill colours have a job and Clara must never accidentally say "this is reading" by
standing next to something indigo.

---

## Content format

One category = one JSON file, `app/content/categories/<id>.json`. This is what a generator produces
and what a human approves.

```jsonc
{
  "id": "greetings",
  "title": "Greetings",
  "icon": "👋",
  "bands": ["4-6", "7-10"],
  "cefr": "A1",
  "goal": "Greet someone and reply, at any time of day.",
  "grammar": [{ "point": "Contractions with be", "example": "I'm fine." }],

  "vocabulary": [{ "word": "hello", "icon": "👋", "example": "Hello! Nice to meet you." }],
  "phrases":    [{ "text": "Good morning.", "use": "Before midday." }],

  "dialogue": {                       // READ + LISTEN
    "title": "At the door",
    "lines": [{ "who": "A", "text": "Good morning!" }],
    "questions": [{ "q": "…", "options": ["…"], "answer": 0 }]
  },
  "reading": {                        // READ, older bands only
    "title": "A new neighbor",
    "text": "…",
    "questions": [{ "q": "…", "options": ["…"], "answer": 0 }]
  },
  "speaking": [{ "text": "Good morning!", "tip": "Stress the first word." }],
  "writing": [
    { "type": "spell",  "answer": "hello" },
    { "type": "cloze",  "sentence": "Good ___, Mrs. Silva.", "answer": "morning" },
    { "type": "answer", "question": "How are you?", "accept": ["I'm fine", "Fine, thanks"] }
  ],
  "quiz": [{ "q": "…", "options": ["…"], "answer": 0 }],
  "reviewed": false
}
```

**`reviewed` is the gate and it is live, not decorative.** The app only ever renders categories
where it is `true`, so an unapproved file does not exist for a learner — not as a lesson, and not
even as a wrong answer, because distractors are drawn only from reviewed categories. It still
appears in the teacher view, flagged, which is where a reviewer wants it.

**Distractors come from *other* categories' vocabulary** — free, and it teaches cross-topic
discrimination rather than same-list elimination. The `confusable` list in `levels.json` names
pairs that genuinely confuse (two red faces, two similar figures) and keeps them out of the same
question. It carried over from the prototype, where `sick` 🤒 / `hot` 🥵 proved it was needed.

`app/content/levels.json` defines the four bands, the placement ladder, the badges, the confusable
pairs, and the list of category files.

### Per-band adaptation — same engine, different surface

| Band | Writing | Reading | Listening | Instructions |
|---|---|---|---|---|
| 4–6 | tap letter tiles, no keyboard | word ↔ picture matching | hear a word, tap the picture | none, demonstrated |
| 7–10 | short typing, word bank shown | short dialogues, tap to hear | hear a word, tap the picture | simple spoken English |
| 11–14 | full typing, cloze, short answers | passages + comprehension | hear a line, choose what you heard | spoken + written |
| 15+ | free written answers | longer texts, idioms in context | hear a line, choose what you heard | written |

Every band runs the same lesson: **meet the words → listen → read → speak → write → quiz.** That
is input before output, which is the order these skills are taught in even though it is not the
order they are usually listed in.

---

## Architecture

Static ES modules. No build step to run the app, no bundler, plain files on GitHub Pages.

```
app/
  index.html            shell
  fonts.css             generated — inlined OFL faces
  styles.css            tokens, skill colours, band scaling
  js/
    app.js              router, session, the lesson itself
    audio.js            ← ported from the prototype (Web Audio, proven)
    clara.js            character SVG + four expressions
    content.js          loading, the review gate, distractors
    progress.js         buckets, per-skill accuracy, mistakes, badges, streak
    placement.js        age → band, grammar ladder → level
    quiz.js  revise.js  teacher.js  ui.js
    skills/ask.js       the one question card every skill uses
    skills/{listen,speak,read,write}.js
  content/levels.json · content/categories/*.json
  audio/<category>/*.m4a + clips.json      lazy-loaded per category
build/
  build-audio.mjs       one folder of clips per category
  build-fonts.mjs       fetch + subset + inline OFL fonts
```

### What was ported rather than rewritten

These were arrived at by measurement in the prototype and were not worth re-deriving:

- **The Web Audio player.** `decodeAudioData` reads the bytes directly, so the server's opinion
  about `Content-Type` is irrelevant — GitHub Pages served `.m4a` as `audio/mp4a-latm`, which
  Chrome refuses in an `<audio>` element. A `BufferSource` also plays in a background tab, where
  an `<audio>` element will not even load. One `AudioContext`, unlocked on the first tap, serves
  the whole app.
- **Unlocking from inside the gesture.** iOS treats anything reached via `setTimeout` or a
  resolved promise as outside the gesture and mutes the entire session. `unlock()` creates the
  context and starts a one-sample silent buffer synchronously, with nothing async in between.
- **The `mission` token and the `busy` guard.** A seven-year-old hammers the buttons and an adult
  double-taps out of habit. `busy` stops one tap firing a transition twice; the mission token
  invalidates anything still pending when the learner walks away, so the app cannot drag them back
  into the lesson they just left.
- **The new → learning → known bucket.** The right amount of memory for the job; a real SRS would
  be over-engineering. Extended here with per-skill accuracy and a mistake log.
- **The `reviewed` filter and the teacher review view.**
- **Nothing ever rejects or hangs.** Every audio promise resolves — on ended, on failure, or on a
  length-derived timeout — because a silent device must still be able to finish a lesson.

Audio is fetched per category (~55 clips, ~530 kB) rather than inlined. The single-file Artifact
build is dropped: 607 clips cannot be data-URIs. GitHub Pages is the only target.

---

## The categories

| Category | Bands | CEFR | |
|---|---|---|---|
| Greetings | 4–6, 7–10 | A1 | |
| Numbers | 4–6, 7–10 | A1 | |
| Family | 4–6, 7–10 | A1 | |
| Jobs | 4–6, 7–10 | A1 | folded in from the vet/firefighter/chef packs, Portuguese stripped |
| Food & Drinks | 7–10, 11–14 | A1–A2 | |
| School | 7–10, 11–14 | A2 | |
| Travel | 11–14, 15+ | A2–B1 | |
| Everyday Conversations | 11–14, 15+ | B1 | |
| Phrasal Verbs | 15+ | B1–B2 | |
| Weather | 7–10, 11–14 | A1–A2 | **`reviewed: false`** — the live demonstration of the gate |

Nine are marked `reviewed: true` so the app is usable and reviewable in context. **That means
author-checked, not Clara-approved.** The review pass is still hers to do, one category at a time,
in the teacher view.

---

## Verification

Run locally with `python3 -m http.server --directory app`, then repeat on the live Pages URL.
What was actually checked, in Chrome at 1432×840:

| # | Check | Result |
|---|---|---|
| 1 | A full lesson completes with all four skills, in every band | ✅ all four bands walked end to end: 4–6 Family, 7–10 Food, 11–14 Travel, 15+ Phrasal Verbs |
| 2 | Zero Portuguese anywhere | ✅ no `pt:` keys, no PT audio files, no accented Portuguese in any `.js`/`.json`/`.css`/`.html` under `app/` |
| 3 | Ages 4–6 needs no reading | ✅ a complete lesson finished with **all audio routed through a zero-gain node**, driven by a script that neither hears nor reads — only pictures, matching cells, letter tiles and one arrow. This check is what caught the blank spelling prompt described in decision 2 |
| 4 | Speaking records and plays back; nothing uploaded | ✅ in Chrome: record → decode → both playback buttons appear → microphone track stopped exactly once. Network panel shows no request at all during recording |
| 5 | Audio actually plays | ✅ **the `AudioContext` clock advanced 2.42 s across a 2.41 s clip and 0.70 s across a 0.69 s clip, state `running`.** "No errors" is not proof; that mistake was made once already |
| 6 | Placement lands the extremes correctly | ✅ deliberate beginner → **4–6 / Pre-A1**, 5 categories open. Deliberate advanced → **15+ / B2**, 9 categories open |
| 7 | Progress survives reload; a wrong answer appears in revision | ✅ 4 lessons, 37 words, 50 mistakes, badges and streak all survived reload; revision rebuilt 8 of them and the count dropped as they were cleared |
| 8 | An unreviewed category is invisible and flagged | ✅ 10 files on disk, 9 offered to the learner, Weather absent from the picker and flagged **NOT REVIEWED** in the teacher view |
| 9 | No network calls beyond the page's own assets | ✅ 63 requests, all to the page's own origin, plus two inline `data:` font URIs. Nothing to any other host |

**Timing is estimated, not measured.** 4–6 comes to roughly four minutes and 11–14 to roughly ten;
15+ was the one at risk, which is why its writing count is four rather than five — a free written
answer is the slowest item in the app. A real number needs a real person.

**Two things could not be checked here.** Safari and Firefox were not available, so the speaking
activity is verified in Chrome only; `MediaRecorder` produces different containers in each, and
`decodeAudioData` handling its own browser's output is the assumption to test. And the live Pages
URL has not been re-run since the rewrite.

Then the real test, unchanged: hand it to a learner in each band and watch where they hesitate.

---

## Where this departs from the plan, and why

- **American spelling, not British.** The plan's sample said "neighbour". The best voice installed
  is Samantha (en-US), American English is what Brazilian ELT overwhelmingly teaches, and British
  text read by an American voice is incoherent. Picked one and stayed with it.
- **Placement returns two numbers, not one.** Age decides the **band** (presentation); a grammar
  ladder decides the **level** (content). Collapsing them would put an adult beginner in front of
  letter tiles, or hand phrasal verbs to a nine-year-old who guessed well three times.
- **Lesson order is listen → read → speak → write**, not the order the four skills are listed in.
  Input before output.
- **`fonts.css` is a linked file, not inlined into `index.html`.** Same guarantee — the faces are
  data URIs and nothing is fetched from a CDN — but it stays cacheable and keeps the shell
  readable.
- **Two additive schema fields**: `dialogue.questions` (comprehension for the 7–10 reading
  variant), and `categoryFiles` + `confusable` inside `levels.json`, because a static host cannot
  list a directory.
- **A tenth category.** Weather exists, complete and unreviewed, so the review gate is demonstrated
  live rather than described. It is also the shape the remaining 22 will arrive in.
- **Writing items are generated when a file lacks them.** A category written for adults can still
  serve a six-year-old, because spelling items fall back to the vocabulary list.
- **Free written answers are self-marked when the accept list misses.** A static app cannot grade
  free writing, and pretending it can is the same mistake as scoring pronunciation. It shows a
  model answer and asks *"did you mean that?"*

---

## Deferred, deliberately

Native Android/iPhone apps · push reminders · AI teacher, live feedback and generation ·
pronunciation scoring · Clara's real likeness and recorded voice · the remaining 22 categories.

---

## Tests and progression

Two sizes of the same machine, both mixing categories — because the thing a single lesson cannot
check is whether anything survived leaving the lesson. Inside one category, *"which picture is a
bandage"* can be answered by elimination from a list of five you saw two minutes ago.

- **The unit test** arrives after every two categories in the band. Short, mixed, unmarked, and it
  costs nothing to fail.
- **The band assessment** unlocks when every category in the band has been finished at least once.
  It is the only gate in the app: passing raises the content level and *offers* the next band —
  offers, not forces, because a learner who is comfortable where they are should be allowed to
  stay there.

Neither shows a percentage on the failure screen. A learner who has just missed the bar does not
need a number; they get *"Not yet"*, and everything they missed goes into revision, which is where
it was going anyway. Verified end to end: the 11–14 assessment at 14/14 raised the level from A2 to
B1 and opened *Real English*; the same paper answered badly returned "Not yet" and left the gate
shut.
