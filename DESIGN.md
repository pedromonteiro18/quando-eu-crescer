# Quando Eu Crescer — inglês para crianças através de profissões

A kid picks a job they'd like to do, learns the vocabulary that job actually uses, and plays
through situations from that job. The job is the motivation; the vocabulary is the payload.
This answers the question most kids' language apps never do — *why am I learning this word?*

**Status:** clickable web prototype, three jobs, playable end to end.
The point of this build is to find out whether the loop is fun *before* committing to a real
React Native app. Nothing here is throwaway — the content format and the copy carry over.

**Live:** <https://pedromonteiro18.github.io/quando-eu-crescer/> — open it on a phone, in portrait.
Public, no login, nothing to install. `git push` to update it.

| Decision | Choice |
|---|---|
| Age | **6–9** — audio-first, no reading required, no typing, 3–4 min sessions |
| First language | **Portuguese (BR)** — all instructions in PT-BR, only content is English |
| Content source | **AI-authored, human-reviewed static packs** — no live generation, works offline |
| First deliverable | **Clickable web prototype** openable on a phone |

---

## Three decisions worth stating up front

### 1. "Lawyer" doesn't work at age 6–9

Abstract professions (lawyer, engineer, accountant) have nothing a 6-year-old can picture.
Launch with jobs kids can *see* — vet, firefighter, chef, astronaut, farmer — and reintroduce
abstract ones later as visible archetypes ("Court Helper — helps people be fair"). This does
not weaken the concept; it's the same concept with a working example.

### 2. Do not score pronunciation

Speech recognition on a 7-year-old's accented L2 English is unreliable, and being told "wrong"
when you said it right is the fastest way to lose a kid. Speaking practice = repeat-after-me
with no judgement, or nothing.

### 3. Privacy is a design constraint, not a checkbox

Brazil's LGPD Art. 14 requires specific parental consent for children's data. The app stays
**local-only: no accounts, no server, no analytics, nothing leaves the device.** That sidesteps
LGPD and COPPA entirely. Keep it that way for as long as possible.

This constraint has teeth. It is the reason the app defaults to on-device speech voices even
though the server-side ones sound better — see *Voice* below.

---

## The loop

One job = one **Missão**, ~3.5 minutes, three activities plus a reward. It auto-flows between
activities with three progress dots at the top — no menus to get lost in.

```
┌─ Job picker ─────────────┐
│  Qual trabalho você      │   Full-width job cards.
│  quer fazer hoje?  🔊    │   Tap → hears PT + EN name → enters job.
│  [🩺 Veterinário]        │   Finished jobs wear a medal.
│  [🚒 Bombeiro]  ...      │
└──────────────────────────┘
        ↓
1. CONHECER  (meet the words)      5 words · giant picture · EN spoken automatically ·
                                    PT-BR label underneath · 🔊 replay · → next
2. OUÇA E TOQUE  (listen & tap)    Hear an English word → tap the right picture of 3.
                                    Right: glows, sparkles, word repeated, auto-advance.
                                    Wrong: gentle shake, "Quase!", correct one pulses, replays.
                                    No score, no lives, no red X.
3. NO TRABALHO  (on the job)       3-beat scene. PT-BR sets up the situation, the *task* is
                                    in English. Tap the right object to move the story on.
                                    "Um cachorro chegou, ele está machucado." → "Get the
                                    bandage." → tap 🩹 → "Here is the bandage. Thank you!"
        ↓
🏅 "Você é um Pequeno Veterinário!"  Patch + confetti. [Fazer de novo] [Outro trabalho]
```

Mini-tests are framed as *the job needing your help*, never as a test.

**Word memory** — a simple `new → learning → known` bucket, which is plenty at this age; a real
SRS would be over-engineering. Seeing a word in CONHECER moves it to *learning*; getting it
right without a miss moves it to *known*; missing a *known* word drops it back. The job cards
show a fill bar once a kid knows at least one word, and the parent area shows the totals.
The mixed cross-job review that spends this data is the obvious next feature.

---

## Content pack format

The unit the AI pipeline produces and a human approves. Distractors are pulled from *other*
jobs' word lists, so they're automatic and teach cross-job discrimination.

```jsonc
{
  "id": "vet", "pt": "Veterinário", "en": "Vet", "emoji": "🩺", "color": "#17A08B",
  "words": [
    { "en": "dog", "pt": "cachorro", "icon": "🐕" },
    { "en": "sick", "pt": "doente", "icon": "🤒" }
    // 5 per job
  ],
  "scene": {
    "titlePt": "Um dia no consultório",
    "beats": [{
      "setupPt": "Um cachorro chegou. Ele está machucado.",
      "taskEn": "Get the bandage.", "taskPt": "Pegue o curativo.",
      "answer": "bandage", "options": ["bandage", "cake", "helmet"],
      "successEn": "Here is the bandage. Thank you!"
    }]  // 3 beats
  },
  "badgePt": "Pequeno Veterinário",
  "reviewed": false   // ← generator always emits false; only true packs ship.
}
```

**`reviewed` is the review gate and it is live, not decorative.** The app renders
`JOBS.filter(j => j.reviewed === true)`, so an unreviewed pack simply does not exist for the
child. It still shows up in the parent/teacher area flagged **não revisado**, which is exactly
where a reviewer wants to see it.

Every `options` entry must exist in some job's `words` list — that shared index is what supplies
the icon and the PT label. Two words that genuinely confuse (`sick` 🤒 / `hot` 🥵 — both red
faces) are declared in `CONFUSABLE` and never appear in the same question.

**Three seed jobs**, chosen to be maximally different so the format gets a real test:

- 🩺 **Veterinário** `#17A08B` — dog, cat, sick, bandage, medicine → hurt dog arrives, bandage it, give medicine
- 🚒 **Bombeiro** `#E8452C` — fire, water, ladder, helmet, truck → alarm rings, helmet on, up the ladder, water on the fire
- 👩‍🍳 **Chef** `#B8579C` — egg, milk, pan, cake, hot → order arrives, crack the egg, into the pan, serve the cake

---

## Files

| File | What it is |
|---|---|
| `prototype/index.html` | The entire prototype. Self-contained, no build, no dependencies. `JOBS` is an array literal at the top shaped exactly like the JSON above, so porting to real content files later is a copy-paste, not a rewrite. |
| `prototype/build-artifact.mjs` | Strips the `<!doctype>/<html>/<head>/<body>` skeleton to produce `artifact.html` for publishing. `index.html` stays the single source of truth. |
| `prototype/artifact.html` | Generated. Do not edit. |
| `DESIGN.md` | This file. |

Run `node prototype/build-artifact.mjs` after editing `index.html`, then republish.

---

## Visual direction — "Patch Board"

The world of jobs is uniforms, and uniforms carry embroidered patches. The whole app is built
out of hand-cut patches: thick ink outlines, flat saturated fills, **hard offset shadows never
soft blur**, asymmetric border-radii so nothing looks machine-rounded, dashed stitch lines
inside the cards. The reward at the end is literally a patch — the aesthetic and the reward
mechanic are the same object.

**Color.** `--ink #2C2136` (warm plum-black, every outline and every word), `--paper #FFF3E2`
(apricot-warm oat), `--board #F2DFC4`, `--sun #FFC53D` for medals, sparkles and the correct-answer
glow. Each job owns an accent — teal, vermilion, bakery-berry — picked as a wide triad so the
three jobs feel like three worlds; entering a job re-tints the whole screen.

**No red for wrong.** Red is the firefighter's own brand colour, and the loop forbids failure
signals anyway. A wrong tap fades and wobbles; nothing turns red, nothing counts.

**Type.** The display face is `ui-rounded` — real SF Pro Rounded on an iPhone, system-ui
elsewhere — at weight 900 with a hard ink offset shadow, like embroidered lettering. Body is
the neutral system sans. There is no webfont: font CDNs are blocked in the published artifact
and a silent fallback would be worse than designing for what's there.

**Single committed light theme.** `color-scheme: light`, tokens defined once, no dark mode.
A kids' app should look the same in every hand.

---

## Build notes

- **Audio: Web Speech API** (`speechSynthesis`), `en-US` at rate 0.85 for English, `pt-BR` for
  instructions. Zero assets. The "Começar!" tap both primes the synth with a silent utterance
  and speaks the first real line from inside the gesture — that is what unlocks audio on iOS
  Safari. `voiceschanged` is handled, and polled four times for browsers that never fire it.
- **Speech never blocks the UI.** Every utterance promise resolves — on `onend`, on `onerror`,
  or on a length-derived timeout, because `onend` silently never fires on some Android builds.
  Screen advancement runs on its own timers. If the voice dies, the app keeps working.
- **Pictures: emoji at large size** on soft coloured cards. Renders full-colour on both phones,
  costs nothing, good enough to test the loop. Commissioned illustration is a V2 item.
- **Touch targets ≥ 64px**, portrait layout on `dvh` units, nothing scrolls inside an activity,
  and nothing a kid must read in order to progress — every instruction is also spoken.
- **`localStorage`** for medals, word buckets and the voice choice. No network calls of any kind.
- **Parent gate** — press and hold the ⚙ for 3s, with a ring that fills.

### Voice — the weakest part, and what was done about it

Web Speech API quality is the ceiling of this prototype and it is a low ceiling.

Two things made it worse than it had to be, both now fixed:

1. **Voice selection was picking novelty voices.** Preferring `localService` and taking the
   first match meant macOS/iOS handed back *Albert* for English and *Eddy* for Portuguese —
   joke voices — while Samantha and Luciana sat further down the list. Voices are now scored:
   known-good names rank first, `enhanced`/`premium`/`natural`/`neural`/`siri` score up,
   `compact` scores down, and the system's ~20 joke voices are pushed to the bottom.
2. **Device variance is enormous**, so automatic selection can't be the whole answer. The
   parent/teacher area now has a voice picker per language with a ▶ sample button, and the
   choice persists.

**Why the default is not the best-sounding voice.** Chrome's "Google" voices are clearly the
best available, and they are synthesised **on Google's servers** — using them sends the text off
the device, which contradicts the whole privacy premise. Automatic selection therefore considers
**on-device voices only**. The network voices are still offered, in their own labelled group,
behind the parent gate, with the trade-off spelled out. An adult can choose it; the app will not
choose it for a child.

**The real fix is recorded human voice-over**, and the seam for it is already in place: `CLIPS`
maps `"en:Get the bandage."` to an audio file, and `Speech.raw()` plays the recording instead of
synthesising whenever an entry exists. It is empty today, so nothing changes; filling it in is
purely additive, line by line, with no other code touched. Fifteen words and about fifteen
sentences per pack is a single sitting for someone who teaches English.

---

## Verification

Done in Chrome at phone width, walking a full mission:

- ✅ Full mission (pick job → 3 activities → medal) completes end to end
- ✅ Distractors come from other jobs (`medicine` offered against `egg` and `cake`)
- ✅ A wrong answer shows no score, no red, no lost life — fades, wobbles, hints, replays
- ✅ Medal and word buckets survive a reload; a missed word stays *learning*, not *known*
- ✅ All three packs playable, scenes differ
- ✅ Voice defaults land on Samantha / Luciana, not Albert / Eddy

Still to check on a real phone, in portrait:

1. First tap on "Começar!" unlocks audio; every subsequent word speaks without another tap.
2. Both voices work — English words in English, instructions in Portuguese.
3. A full mission completes in **under 4 minutes**.
4. Every tap target is comfortable for a small hand.
5. Nothing requires reading or typing.

Then the real test: hand it to a kid in the target age band and watch where they hesitate.

---

## After the prototype

In order:

1. **Recorded human voice-over** — the single biggest upgrade at this age, and the `CLIPS` hook
   is already waiting for it.
2. **"Fale comigo"** repeat-after-me, unscored.
3. **Mixed cross-job review** — spends the `new/learning/known` buckets that are already tracked.
4. **The Claude generation script + review view** for packs 4–20, gated on `reviewed`.
5. **Expo port.**
6. **Abstract jobs as visible archetypes.**
