/**
 * Renders every line the app speaks into an audio file, one folder per category.
 *
 * Why pre-rendered and not speechSynthesis: measured, in the prototype. The Web
 * Speech API needs a user gesture, goes silent inside iframes, depends on which
 * voices the device happens to have, is suspended in background tabs, and fails
 * differently in every browser. A recorded file just plays.
 *
 *   node build/build-audio.mjs              only what is missing
 *   node build/build-audio.mjs --force      re-render everything
 *   node build/build-audio.mjs greetings    one category (plus ui)
 *
 * Requires macOS (`say` and `afconvert`). Set AUDIO_VOICE to use another
 * installed voice.
 *
 * FILENAMES ARE THE CONTRACT. A clip is named after its own text, so replacing
 * the synthetic voice with a human recording is a file swap: re-record the
 * phrase, keep the filename, and no code and no manifest changes. That matters,
 * because these are macOS system voices and Apple licenses them for personal
 * use — fine while building, not defensible for a public release. See DESIGN.md.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..", "app");
const CATEGORIES = join(APP, "content", "categories");
const AUDIO = join(APP, "audio");

if (process.platform !== "darwin") {
  console.error("This script needs macOS (say / afconvert). Nothing was generated.");
  process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const only = args.filter(a => !a.startsWith("--"));

const VOICE = process.env.AUDIO_VOICE || "Samantha";

/* `say` speaks in words per minute. A learner needs slower than conversational,
   and a single word — the one they are about to repeat — slower still. */
function wpm(text) {
  const words = text.trim().split(/\s+/).length;
  if (words === 1) return 135;
  if (words <= 8) return 155;
  return 165;
}

/* What `say` actually receives. Two lines that differ only in punctuation are
   the same sound, so they deliberately share one clip; a written blank has to
   become a word or the voice spells out three underscores. */
const speech = text =>
  String(text)
    .replace(/_{2,}/g, " blank ")
    .replace(/[“”"„]/g, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();

/* Stable, readable filename derived from the line itself. */
const slugOf = text =>
  text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "clip";

/* Two different lines can slug to the same name — "Good morning." and "Good
   morning, class." do not, but a truncated long line and its neighbour can.
   When that happens both get a suffix derived from their own text, so a name
   still identifies exactly one recording no matter what order lines arrive in. */
function hash4(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).slice(0, 4).padStart(4, "0");
}

function nameLines(texts) {
  const spoken = new Map();                       // speech text → [original texts]
  for (const t of texts) {
    const s = speech(t);
    if (!s) continue;
    if (!spoken.has(s)) spoken.set(s, []);
    spoken.get(s).push(t);
  }
  const bySlug = new Map();
  for (const s of spoken.keys()) {
    const k = slugOf(s);
    if (!bySlug.has(k)) bySlug.set(k, []);
    bySlug.get(k).push(s);
  }
  const out = [];
  for (const [s, originals] of spoken) {
    const k = slugOf(s);
    const file = (bySlug.get(k).length > 1 ? k + "-" + hash4(s) : k) + ".m4a";
    out.push({ speech: s, file, originals });
  }
  return out;
}

/* ── what Clara says that is not in a category file ───────────────────────── */
const UI_LINES = [
  "Let's begin.",
  "Let's meet the words.",
  "Now, let's listen.",
  "Now, let's read.",
  "Now, let's speak.",
  "Now, let's write.",
  "Listen and tap the picture.",
  "Listen and choose.",
  "Which one did you hear?",
  "Match the word to the picture.",
  "Read and choose.",
  "Say it after me.",
  "Your turn.",
  "Press to record.",
  "Spell the word.",
  "Write the word.",
  "Choose the answer.",
  "Good job!",
  "Well done!",
  "That's right!",
  "Perfect!",
  "Nice work!",
  "Almost. Try again.",
  "Not quite. Here it is.",
  "One more time.",
  "Lesson complete!",
  "Here is your badge.",
  "Testing, one, two, three."
];

/* ── collect the lines of one category ────────────────────────────────────── */
function linesFor(cat) {
  const out = [];
  const add = t => {
    const text = String(t || "").trim();
    if (text && !out.includes(text)) out.push(text);
  };

  for (const v of cat.vocabulary || []) { add(v.word); add(v.example); }
  for (const p of cat.phrases || []) add(p.text);
  for (const l of (cat.dialogue && cat.dialogue.lines) || []) add(l.text);
  for (const s of cat.speaking || []) add(s.text);

  /* The two youngest bands are read to. 4-6 never sees a written quiz question
     (their quiz is pictures), but 7-10 hears the question as it reads it. */
  const spoken = (cat.bands || []).some(b => b === "4-6" || b === "7-10");
  if (spoken) for (const q of cat.quiz || []) add(q.q);

  return out;
}

/* ── render ───────────────────────────────────────────────────────────────── */
function render(dir, lines) {
  mkdirSync(dir, { recursive: true });

  /* Manifest maps the exact text the app displays to its file. Nothing in the
     app has to know how filenames are made. */
  const clips = {};
  let made = 0, kept = 0, bytes = 0;

  for (const clip of nameLines(lines)) {
    const m4a = join(dir, clip.file);
    for (const original of clip.originals) clips[original] = clip.file;

    if (!FORCE && existsSync(m4a) && statSync(m4a).size > 0) { kept++; bytes += statSync(m4a).size; continue; }

    const aiff = join(dir, "_tmp.aiff");
    try {
      execFileSync("say", ["-v", VOICE, "-r", String(wpm(clip.speech)), "-o", aiff, "--", clip.speech]);
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "28000", "-q", "127", aiff, m4a]);
    } finally {
      rmSync(aiff, { force: true });
    }
    made++;
    bytes += statSync(m4a).size;
  }

  /* Anything left over from an earlier content version is dead weight in a
     public repo — drop it, so the folder always matches the manifest. */
  const wanted = new Set(Object.values(clips).concat(["clips.json"]));
  for (const f of readdirSync(dir)) {
    if (!wanted.has(f)) rmSync(join(dir, f), { force: true });
  }

  writeFileSync(join(dir, "clips.json"), JSON.stringify(clips, null, 1) + "\n");
  return { made, kept, bytes, total: lines.length };
}

/* ── run ──────────────────────────────────────────────────────────────────── */
mkdirSync(AUDIO, { recursive: true });

const files = readdirSync(CATEGORIES).filter(f => f.endsWith(".json")).sort();
let grandTotal = 0, grandBytes = 0, grandMade = 0;

const jobs = [{ id: "ui", lines: UI_LINES }];
for (const f of files) {
  const cat = JSON.parse(readFileSync(join(CATEGORIES, f), "utf8"));
  jobs.push({ id: cat.id, lines: linesFor(cat) });
}

for (const job of jobs) {
  if (only.length && job.id !== "ui" && !only.includes(job.id)) continue;
  const r = render(join(AUDIO, job.id), job.lines);
  grandTotal += r.total; grandBytes += r.bytes; grandMade += r.made;
  console.log(
    job.id.padEnd(16) +
    String(r.total).padStart(4) + " lines  " +
    (r.made ? "+" + r.made + " new " : "").padStart(10) +
    (r.bytes / 1024).toFixed(0).padStart(6) + " kB"
  );
}

console.log("");
console.log(grandTotal + " lines · " + (grandBytes / 1024 / 1024).toFixed(2) + " MB · voice " + VOICE +
            (grandMade ? " · " + grandMade + " rendered this run" : " · nothing to do"));
console.log("Audio is fetched per category, so a learner downloads one folder, not all of them.");
