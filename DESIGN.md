# English with Clara

An app that exercises **all four language skills in every lesson**, for ages four through adult.
Clara is the brand and the teacher. **The lessons are English; the interface is Portuguese.**
Immersion belongs in the lesson, not in the chrome — the chrome is only the thing that carries you
to the lesson, and a learner stopped by a button has been stopped before the teaching starts.

**Status:** engine complete, six levels, placement test, ten topics, 939 recorded clips in two
voices. Runs as static files, no build step, no server, no network calls beyond its own assets.

**Live:** <https://pedromonteiro18.github.io/quando-eu-crescer/>

| Decision | Choice |
|---|---|
| Platform | **Web only, stays online.** No native apps, no phone-specific work yet. |
| AI features | **Not yet.** No LLM, no live generation. Static content, client-side only. |
| First release | **Engine + 6 levels + placement test + deep sub-topics.** Remaining sub-topics authored after. |
| Interface language | **Portuguese, switchable.** Everything *being taught* stays English, always. |
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

### 2. The lessons are English; the interface is Portuguese

**This section previously argued the opposite, and it was wrong.** It claimed there was "no
translation anywhere, not even in the buttons", and defended that as the stronger form of
immersion. The mistake was treating the app as one undifferentiated surface. It is two:

- **What is being taught.** Vocabulary, phrases, dialogue, reading passages, the words Clara
  models for the learner to repeat. This is the product. It is English and it always will be —
  translating it would delete the reason the app exists.
- **What carries you to it.** "Pick something to learn", "Check", "Try again", the settings sheet,
  the placement test's own questions about itself, the error when audio fails. This is
  scaffolding. Keeping it English does not teach anyone English; it filters out the beginners
  the app is for.

A learner who cannot read *"Pick something to learn"* never reaches a lesson to be immersed in.
Immersion that gates the door is not immersion, it is an entrance exam.

So the split is by role, not by convenience:

| Clara says | Language |
|---|---|
| "Agora, vamos ouvir." · "Sua vez." · "Escreva a palavra." | **Portuguese** — instructions |
| "Muito bem!" · "Quase. Tente de novo." | **Portuguese** — praise a beginner should not have to decode |
| `hello` · "Good morning." · every dialogue, phrase and passage | **English, always** |

`app/js/i18n.js` holds the whole interface as a flat key → `{en, pt}` dictionary. The lesson
content never passes through it: `A.say(word)` in a skill module resolves to the topic's own
English recording, and there is no code path by which a category file's text could be translated.
Two automated checks hold the line in both directions — one asserts no known-English interface
string renders in Portuguese mode, the other asserts every word, sentence and passage rendered
inside a lesson came from the content corpus. Both run over every band.

**The 4–6 band is unaffected, and that is the point.** It reads no instructions in either
language, because the answer there was never translation — it was needing no instructions at all:
the first item demonstrates itself, a hand icon shows the tap, and the pattern repeats. The whole
text inventory of a 4–6 lesson, measured rather than asserted, is five section labels, the six
vocabulary words themselves, individual letters on the spelling tiles, and the level tag. No
sentence, no instruction, no prose. The compare buttons in the speaking activity show Clara's face
and a microphone rather than the words "Clara" and "You", because that screen is the one place
where a reading requirement would have slipped in unnoticed.

What changed for that band is only that its five section labels are now Portuguese, which its
parent can read over its shoulder and it cannot read either way.

**The cost, stated plainly:** this doubles the voice licensing problem in §3. It was one
unlicensed macOS voice in a public repo; it is now two.

The letter tiles were the second place. A lesson carries only a slice of its category's
vocabulary, so an authored spelling item's word usually is *not* in that slice — and the picture
lookup, which only searched the slice, quietly returned nothing. The screen still rendered:
three empty slots, five letters, and no question. For a band that reads no instructions, that is
not a degraded prompt, it is a blank one. The lookup now falls back to the whole category, a
spelling item that still cannot find a picture is not offered to the tiles band at all, and if
one somehow arrives the slot shows 🔊 rather than nothing. Every band still fills its writing
quota from every category after the filter.

### 3. The voice licensing problem is worse at this scale, and blocks launch

All 939 clips are macOS `say` output committed to a **public** repo, and there are now **two**
voices rather than one — Samantha for English, Luciana for the Portuguese instructions. Apple
licenses those voices for personal use. At 79 clips for a family prototype that was a flagged grey
area; at 939 clips in two voices for a branded product called *English with Clara* it is not
defensible.

Before any real launch, one of: make the repo private, license commercial TTS voices, or have
humans record them. **This blocks launch, not building.** The pipeline is swap-ready: a clip is
named after its own text, so re-recording a phrase and keeping the filename requires no code
change and no manifest change. `AUDIO_VOICE` and `AUDIO_VOICE_PT` select the two voices, and the
lines themselves live in one place — `app/js/spoken.js`, read by both the app and the build
script, so the two lists cannot drift apart.

### 4. Daily reminders cannot be done properly in a web page

Scheduled local notifications need a service worker with push, which needs a server and, on iOS,
an installed PWA. Phones are out of scope, so v1 ships a **streak counter and a "practise today"
state** instead. Real reminders wait for the native port.

### 5. The visual identity grew up

The prototype's "Patch Board" look — thick outlines, hard offset shadows, embroidered lettering —
was designed for 6–9-year-olds and would read as childish to someone doing Business English. It
has been replaced entirely. See below.

### 6. It is a phone app that happens to open in a browser

The plan said "no phone-specific work yet", meaning no native app. That is not the same as
letting the layout sprawl across a desktop window. A lesson is a thing you hold: one column, one
thumb, nothing off to the side. So the whole app lives inside a phone-sized screen at every
width — on a phone it fills the viewport, and on a desk it sits in the middle of one with a
bezel, rather than stretching into a web page.

The bar is pinned, the stage scrolls under it, and the confetti canvas and teacher sheet are
positioned against the screen rather than the window, so nothing spills past the bezel. Below
700px the frame disappears completely: no border, no radius, no earpiece, no desk.

This is a real constraint, not decoration, and it changed the components. Letter tiles and slots
now shrink to share a row — flexbox wraps on the basis and only shrinks afterwards, so the size
cap, not the shrink factor, is what decides how many fit. The stat cells draw their own rules
instead of showing a background through 1px gaps, because five stats in a three-wide grid used
to leave an empty grey box. Clara sits above what she introduces rather than floating beside it,
since there is no beside.

### 7. Silence has to be visible, because the app cannot hear itself

The app was silent for its owner on the live URL, with no error anywhere. Chasing it produced
three real bugs and one thing that is not a bug and cannot be fixed in code.

**The three bugs, each measured before it was fixed:**

- `unlock()` returned `true` for a **suspended** context. It reported success for the exact state
  in which nothing plays. It now returns `c.state === "running"` and schedules a real
  measurement 500 ms later.
- **Nothing settled on a suspended context.** `onended` never fires while suspended, and
  `playBuffer` had no timeout despite the module header promising one — so `say()` and `seq()`
  hung forever and `probe()` blew a 45-second timeout. Every playback now carries a
  length-derived timeout, so a silent device can still finish a lesson.
- **Nothing resumed the context after backgrounding.** iOS suspends on switching apps and the
  page never woke it. `wake()` now runs on `visibilitychange`, `pageshow` and `focus`.

The first tap now starts a **real** 120 ms tone rather than a one-sample silent buffer — a silent
buffer is exactly the thing a broken output cannot be distinguished from.

**The thing that is not a bug:** the iOS hardware ringer switch. Web Audio obeys it, everything
reports success, and nothing is audible. **A web page cannot detect it.** No API exposes it, and
the `AudioContext` clock advances normally with the ringer off — which is precisely why this was
so hard to see. The most likely single cause of the original report is the one thing that cannot
be measured.

So the app **asks instead of measuring**. A *"Sem som?"* strip appears when two consecutive
playbacks fail to advance the clock, opening a sheet whose first item is the ringer switch. The
`probe()` instrument existed already and was correct; it was buried behind a three-second hold on
the gear that the app's own owner never found. An instrument pointed at nobody is not an
instrument. **"No errors" is not the same as "you can hear it"** — that lesson was learned once
in the prototype, and the second time it was learned about the tool built to teach it.

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

One sub-topic = one JSON file, `app/content/categories/<id>.json`. This is what a generator
produces and what a human approves. Files stay flat with prefixed ids (`jobs-healthcare.json`), so
adding sub-topics needed no restructuring of the loader.

```jsonc
{
  "id": "jobs-healthcare",
  "title": "Healthcare",
  "title_pt": "Saúde",                // the gloss under the English title
  "icon": "🩺",
  "bands": ["11-14", "15+"],
  "cefr": "A2",
  "goal":    "Talk about a visit to the doctor.",
  "goal_pt": "Falar sobre uma consulta médica.",
  "grammar": [{ "point": "Present simple for symptoms", "point_pt": "Presente simples para sintomas",
                "example": "It hurts here.", "level": 0 }],

  //  Every teachable item carries a `level`, 0–5. An item with no `level` belongs
  //  to every rung — which is what makes the ten original files work untouched.
  "vocabulary": [{ "word": "nurse", "icon": "👩‍⚕️", "example": "The nurse took my temperature.", "level": 0 }],
  "phrases":    [{ "text": "I don't feel well.", "use": "Telling someone you are ill.", "level": 0 }],

  //  Indivisible units are an ARRAY of whole alternatives, not a levelled list:
  //  half a dialogue is not a dialogue. The learner gets the hardest one at or
  //  below their rung.
  "dialogue": [{
    "level": 0, "title": "At the clinic",
    "lines": [{ "who": "A", "text": "Good morning. What's wrong?" }],
    "questions": [{ "q": "…", "options": ["…"], "answer": 0 }]
  }],
  "reading": [{                       // READ, older bands only
    "level": 1, "title": "A day on the ward",
    "text": "…",
    "questions": [{ "q": "…", "options": ["…"], "answer": 0 }]
  }],
  "speaking": [{ "text": "I have a headache.", "tip": "Stress 'head'.", "level": 0 }],
  "writing": [
    { "type": "spell",  "answer": "nurse", "level": 0 },
    { "type": "cloze",  "sentence": "The ___ took my temperature.", "answer": "nurse", "level": 0 },
    { "type": "answer", "question": "How do you feel?", "accept": ["I feel sick"], "level": 2 }
  ],
  "quiz": [{ "q": "…", "options": ["…"], "answer": 0, "level": 0 }],
  "reviewed": false
}
```

**Levels are depth inside one file, not six copies of it.** `C.atLevel(list, n)` returns the
cumulative slice up to rung `n`, so a level-3 learner sees everything from 0 to 3 and nothing
above. Six separate files per sub-topic would have meant ~150 files and ~8,000 clips; this way a
sub-topic grows in place and the audio is rendered once. `build-audio.mjs` refuses a file that is
missing any of the six required parts rather than silently generating a thin lesson.

The `whenNothingFits` rule for those indivisible units is worth stating, because getting it wrong
is silent: a dialogue falls back to the **easiest** available if nothing is at or below the
learner's rung — better a too-easy conversation than none. A reading passage returns **nothing**,
and the lesson skips that screen — a beginner handed a C1 text learns only that they cannot read.

**`reviewed` is the gate and it is live, not decorative.** The app only ever renders categories
where it is `true`, so an unapproved file does not exist for a learner — not as a lesson, and not
even as a wrong answer, because the distractor index at `app/js/content.js:49` is built from
`visible()` alone. It still appears in the teacher view, flagged, which is where a reviewer wants
it.

**Three states, three meanings**, and they are deliberately distinct:

| State | What it means | What the learner sees |
|---|---|---|
| File exists, `reviewed: true` | Approved and teachable | A normal card that opens |
| Declared in `topics.json`, no file | Promised, not written yet | A disabled **"Em breve"** card — the roadmap, visible on purpose |
| File exists, `reviewed: false` | Written, not approved | **Nothing.** Not a card, not a distractor, not a wrong answer |

The middle state is new and is the one that needed inventing. Without it, a learner opening
*Profissões* would see three sub-topics and assume that was all there would ever be.

**Distractors come from *other* categories' vocabulary** — free, and it teaches cross-topic
discrimination rather than same-list elimination. The `confusable` list in `levels.json` names
pairs that genuinely confuse (two red faces, two similar figures) and keeps them out of the same
question. It carried over from the prototype, where `sick` 🤒 / `hot` 🥵 proved it was needed.

`app/content/levels.json` defines the four bands, the six levels, the placement ladder, the badges, the confusable
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
build is dropped: 939 clips cannot be data-URIs. GitHub Pages is the only target.

---

## The levels

Six named rungs replace the bare CEFR letters. CEFR is kept as a secondary tag, because the
placement ladder is CEFR-shaped and correct, and because *Iniciante* means something to a
Brazilian beginner in a way that *A1* does not.

| Level | CEFR | English | Português |
|---|---|---|---|
| 0 | A1 | Beginner | Iniciante |
| 1 | A2 | Elementary | Básico |
| 2 | A2+ | Pre-Intermediate | Pré-Intermediário |
| 3 | B1 | Intermediate | Intermediário |
| 4 | B2 | Upper-Intermediate | Intermediário Superior |
| 5 | C1 | Advanced | Avançado |

**Bands and levels are orthogonal, and that is the whole architecture.** A band is *presentation*,
chosen by age: whether the writing is letter tiles or a free written answer, whether there is a
reading passage, whether there are instructions at all. A level is *difficulty*, chosen by the
placement test. An adult beginner gets level-0 content in the 15+ surface — A1 vocabulary without
letter tiles — and a bright twelve-year-old gets level-4 content with an eleven-year-old's
scaffolding. Collapsing the two would have forced one of those two learners into the wrong app.

---

## The topics

| Topic | Português | Sub-topics | Ready |
|---|---|---|---|
| Jobs | Profissões | 12 | Everyday Jobs, Healthcare, Technology |
| Food & Drinks | Comida e Bebida | 12 | Everyday Food, Fruits |
| Greetings | Saudações | — | ✅ |
| Numbers | Números | — | ✅ |
| Family | Família | — | ✅ |
| School | Escola | — | ✅ |
| Travel | Viagens | — | ✅ |
| Everyday Conversations | Conversas do Dia a Dia | — | ✅ |
| Phrasal Verbs | Verbos Frasais | — | ✅ |
| Weather | Clima | — | **`reviewed: false`** — the live demonstration of the gate |

**24 sub-topics are declared and 5 are written.** That is the honest shape of choosing depth
first: the three new files carry all six levels each, roughly 30 vocabulary items, 12 phrases, 12
speaking prompts, 18 writing items, 18 quiz questions, three dialogues and three reading passages
apiece. The alternative was 24 shallow sub-topics with no levels at all, which would have looked
like more and taught less. The other 19 render as **"Em breve"** so the roadmap is visible rather
than implied.

Everything marked ready is `reviewed: true` so the app is usable and reviewable in context. **That
means author-checked, not Clara-approved.** The review pass is still hers to do, one sub-topic at
a time, in the teacher view — reachable directly at `?teacher=1` rather than only through the
three-second press-and-hold she would have had no way to guess.

---

## Verification

Run locally with `python3 -m http.server --directory app`, then repeat on the live Pages URL.
Everything below is a driven browser asserting against measured state — not screenshots, and not
reading the code and believing it. In Chrome.

| # | Check | Result |
|---|---|---|
| 1 | **Audio plays, measured on the live URL** | ✅ on the deployed site, after a real tap: context `running`, a Portuguese instruction advanced the clock **1.21 s across a 1.20 s clip**, English content **0.60 s across a 0.60 s clip**, the "Sem som?" strip correctly absent, no page errors |
| 2 | No English leaks in Portuguese mode | ✅ **59 screens** in all four bands: zero known-English interface strings rendered. The scan subtracts the content corpus first, so *"Carry on, I'm listening."* is not mistaken for a missed `t()` |
| 3 | No Portuguese leaks into a lesson | ✅ every word, sentence, dialogue line and passage rendered inside a lesson matched the English content corpus exactly |
| 4 | The phone frame holds in Portuguese | ✅ **901 screens** — four bands × two languages × two widths (443 at 390 px, 458 at 1432 px), a full lesson each with deliberately long Portuguese typed into the free-write fields. Nothing escaped the bezel, nothing scrolled sideways, and the last button in every sheet can be reached |
| 5 | Clara speaks the right language | ✅ 10/10 — every instruction resolves to `ui-pt/` in Portuguese and `ui/` in English, everything taught resolves to the topic's English folder, and the clock advances for both |
| 6 | Language survives reload; switching mid-session keeps progress | ✅ stored and reloaded onto the splash rather than re-asking; switching pt→en re-rendered the screen underneath (*"Boa noite."* → *"Good evening."*) with 7 lessons, level 3, a 5-day streak and badges intact |
| 7 | Three content states, three behaviours | ✅ ready opens · declared-with-no-file shows **"Em breve"**, all 9 disabled · unreviewed is absent from the picker, and **0 of 1,200 drawn distractors** came from an unreviewed file |
| 8 | Placement lands the extremes | ✅ deliberate beginner → level 0 **Iniciante**, 7 topics open. Deliberate advanced → level 5 **Avançado**, 9 topics open |
| + | A full lesson completes, every band, both languages | ✅ 8/8 walked end to end, no page errors — including unhandled promise rejections, which do not fire `pageerror` and were invisible until the harness was taught to catch them |
| + | Levels are honest depth | ✅ 10/10 — at every rung, nothing above it is served; every rung has all six parts; each rung adds vocabulary (5 → 10 → 15 → 20 → 25 → 30); an untagged file is untouched |
| + | **Silence is visible, driven end to end** | ✅ 11/11 — with the output deliberately broken: both clips still settled (3.9 s, no hang), the app concluded `audible() = false` after **two** failures not one, the strip appeared in Portuguese, the help named the **iPhone ringer switch first**, the self-test was offered — and when the output was restored the app noticed and took the strip back off |
| + | The audio suite that reproduced the original bug | ✅ 8/8 still pass, including `unlock()` reporting failure on a suspended context and `probe()` reporting silence instead of hanging on "testing" |

**What verification caught that reading the code did not.** Five real bugs, each found by
measurement rather than by rereading:

- A dialogue lookup that still read `cat.dialogue` after it became an array — killing **every**
  level-0 lesson in a tiered file.
- A passage picker that handed a beginner the C1 text, because "hardest at or below your rung"
  silently became "hardest available" when nothing fit.
- The brand in the header skipping the language question on first run.
- **Three sheets that could not scroll at all.** A flex item defaults to `min-height: auto`, and an
  `auto` grid row grows to fit its content — so the box's `max-height: 100%` resolved against the
  grown row and capped nothing. The teacher sheet rendered 6,648 px tall inside an 844 px phone,
  with `overflow: auto` on a box that never overflowed. Everything past the first screenful was
  unreachable: the review queue, the audio self-test, the erase button. The frame sweep had only
  ever measured *horizontal* overflow, so it could not see this; it now also asserts that the last
  button in each sheet can be scrolled to.
- **The silence alarm exempted any device that had ever played a sound** — `if (verdict === true)
  return`, written as "it worked once, a later blip is not a verdict". That reasoning is wrong,
  and wrong in the one case the alarm exists for: iOS suspends the context when the app is
  backgrounded, which by definition happens *after* audio has worked. The two-strike counter
  already handles blips. The exemption is gone, and recovery is now announced too, so the strip
  comes back off when the sound returns.

The last one is the one worth dwelling on. It was written *in this same piece of work*, as part of
the fix for the silence, by reasoning about the failure rather than driving it — and it survived
every check until something actually broke the output twice and looked at the screen.

**Timing is estimated, not measured.** 4–6 comes to roughly four minutes and 11–14 to roughly ten;
15+ was the one at risk, which is why its writing count is four rather than five — a free written
answer is the slowest item in the app. A real number needs a real person.

**What was not checked.** **Safari and Firefox were not available in this environment**, so
everything here is Chrome only. That matters most for two things: the speaking activity, where
`MediaRecorder` produces a different container in each browser and `decodeAudioData` handling its
own browser's output is the assumption to test; and audio unlock, where Safari on iOS is both the
strictest implementation and the one the original silence report most likely came from. **The iOS
ringer switch cannot be tested from any browser** — it is unobservable to a web page by design,
which is why the app asks about it instead of measuring it.

Then the real test, unchanged: hand it to a learner in each band and watch where they hesitate.

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
- **A tenth topic.** Weather exists, complete and unreviewed, so the review gate is demonstrated
  live rather than described. It is also the shape the remaining sub-topics will arrive in.
- **`dialogue` and `reading` became arrays.** They were single objects. Levels made that
  impossible — a level-5 learner needs a harder conversation, not the same one — and an array of
  whole alternatives was the only honest shape, because half a dialogue is not a dialogue. The
  ten original files were left as single objects and still work: a non-array is returned as-is.
- **Writing items are generated when a file lacks them.** A category written for adults can still
  serve a six-year-old, because spelling items fall back to the vocabulary list.
- **Free written answers are self-marked when the accept list misses.** A static app cannot grade
  free writing, and pretending it can is the same mistake as scoring pronunciation. It shows a
  model answer and asks *"did you mean that?"*

---

## Deferred, deliberately

Native Android/iPhone apps · push reminders · AI teacher, live feedback and generation ·
pronunciation scoring · Clara's real likeness and recorded voice · the remaining 19 sub-topics ·
a third interface language (the dictionary is built for it; nothing else assumes two).

---

## Tests and progression

Two sizes of the same machine, both mixing topics — because the thing a single lesson cannot
check is whether anything survived leaving the lesson. Inside one topic, *"which picture is a
bandage"* can be answered by elimination from a list of five you saw two minutes ago.

- **The unit test** arrives after every two topics in the band. Short, mixed, unmarked, and it
  costs nothing to fail.
- **The band assessment** unlocks when every topic in the band has been finished at least once.
  It is the only gate in the app: passing raises the content level and *offers* the next band —
  offers, not forces, because a learner who is comfortable where they are should be allowed to
  stay there.

Neither shows a percentage on the failure screen. A learner who has just missed the bar does not
need a number; they get *"Not yet"*, and everything they missed goes into revision, which is where
it was going anyway. Verified end to end **when there were four levels**: the 11–14 assessment at
14/14 raised the level and opened the next band; the same paper answered badly returned "Not yet"
and left the gate shut. **That full walk has not been re-run against six levels** — what was
re-checked is the arithmetic underneath it, that every CEFR tag in the repo still resolves to the
rung it should:

| Band | Tag | Passing raises to |
|---|---|---|
| 4–6 | Pre-A1 | 1 · Elementary |
| 7–10 | A1 | 1 · Elementary |
| 11–14 | A2 | 2 · Pre-Intermediate |
| 15+ | B1 | 4 · Upper-Intermediate |

That check turned up a latent one. `levelIndex` split its tag on the hyphen to handle ranges like
`"A1-A2"`, which turns `"Pre-A1"` into `"Pre"` — matching nothing, missing the legacy table
entirely, and landing on rung 0 only because 0 is the fallback. Right answer, wrong route. It now
tries the whole tag before splitting. No existing tag changed rung; the difference is that the
4–6 band now gets there on purpose.
