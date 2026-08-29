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
 * Two speech engines, one encoder. AUDIO_ENGINE=say (the default) uses the macOS
 * voices: free, offline, and fine while building. AUDIO_ENGINE=google uses Google
 * Cloud Text-to-Speech, whose output may be redistributed inside a product —
 * which is what a public release needs. `afconvert` encodes either one, so both
 * engines emit the same format at the same bitrate and macOS is still required.
 * AUDIO_VOICE / AUDIO_VOICE_PT name the voices for whichever engine is in use.
 *
 * FILENAMES ARE THE CONTRACT. A clip is named after its own text, so replacing
 * the synthetic voice with a human recording is a file swap: re-record the
 * phrase, keep the filename, and no code and no manifest changes. That matters,
 * because the macOS system voices are licensed by Apple for personal use — fine
 * while building, not defensible for a public release. That is what AUDIO_ENGINE
 * is for: the same lines, the same filenames, a voice that may ship. See DESIGN.md.
 */
import { execFileSync } from "node:child_process";
import { SPOKEN, linesFor } from "../app/js/spoken.js";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..", "app");
const CATEGORIES = join(APP, "content", "categories");
const AUDIO = join(APP, "audio");

/* afconvert does the encoding for both engines, so macOS is required either way. */
if (process.platform !== "darwin") {
  console.error("This script needs macOS (afconvert). Nothing was generated.");
  process.exit(1);
}

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const only = args.filter(a => !a.startsWith("--"));

const ENGINE = process.env.AUDIO_ENGINE || "say";
if (ENGINE !== "say" && ENGINE !== "google") {
  console.error("AUDIO_ENGINE must be 'say' or 'google'. Nothing was generated.");
  process.exit(1);
}

/* Two voices, because Clara instructs in Portuguese and teaches in English.
   On macOS: Luciana is the neutral Brazilian voice; the rest of the pt_BR set is
   the novelty voices the app's own fallback picker already filters out. On
   Google: Aoede in both locales — Chirp3-HD reuses one voice name across
   languages, so Clara is recognisably the same person teaching English and
   giving instructions in Portuguese, which is the point of her. Either default
   can be overridden by environment variable. */
const DEFAULT_VOICE    = ENGINE === "google" ? "en-US-Chirp3-HD-Aoede" : "Samantha";
const DEFAULT_VOICE_PT = ENGINE === "google" ? "pt-BR-Chirp3-HD-Aoede" : "Luciana";
const VOICE = process.env.AUDIO_VOICE || DEFAULT_VOICE;
const VOICE_PT = process.env.AUDIO_VOICE_PT || DEFAULT_VOICE_PT;

/* `say` speaks in words per minute. A learner needs slower than conversational,
   and a single word — the one they are about to repeat — slower still. */
function wpm(text) {
  const words = text.trim().split(/\s+/).length;
  if (words === 1) return 135;
  if (words <= 8) return 155;
  return 165;
}

/* ── the two engines ──────────────────────────────────────────────────────── */

/* One access token for the whole run. gcloud is the only credential path here on
   purpose: this repo has no package.json and adding the Google SDK for one HTTP
   call would be the first dependency it ever took. */
let token = null, project = null;
function gcloud(args) { return execFileSync("gcloud", args, { encoding: "utf8" }).trim(); }
function googleAuth() {
  if (token) return;
  try {
    token = gcloud(["auth", "print-access-token"]);
    project = process.env.GOOGLE_CLOUD_PROJECT || gcloud(["config", "get-value", "project"]);
  } catch {
    console.error("AUDIO_ENGINE=google needs a live gcloud session. Run: gcloud auth login");
    process.exit(1);
  }
}

/* Google takes a rate multiplier where `say` takes words per minute; 175 wpm is
   its conversational baseline, so the ratio keeps the two engines at one pace. */
const rateOf = text => Math.max(0.25, Math.min(2, wpm(text) / 175));

async function speakGoogle(text, voice, out) {
  googleAuth();
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "x-goog-user-project": project,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: voice.split("-").slice(0, 2).join("-"), name: voice },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000, speakingRate: rateOf(text) }
    })
  });
  if (!res.ok) throw new Error("Google TTS " + res.status + ": " + (await res.text()).slice(0, 300));
  const { audioContent } = await res.json();
  writeFileSync(out, Buffer.from(audioContent, "base64"));
}

function speakSay(text, voice, out) {
  execFileSync("say", ["-v", voice, "-r", String(wpm(text)), "-o", out, "--", text]);
}

/* Whichever engine, the caller gets a file afconvert can read. */
const speak = (text, voice, out) =>
  ENGINE === "google" ? speakGoogle(text, voice, out) : speakSay(text, voice, out);

/* What the voice actually receives. Two lines that differ only in punctuation are
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

/* ── what Clara says that is not in a content file ────────────────────────── */

/* Read from app/js/spoken.js, which is the same list the app plays from. When
   these were two lists they could drift, and a drifted line does not fail
   loudly — it silently stops resolving and falls back to a worse voice. */
const UI_LINES = linesFor("en");
const UI_LINES_PT = linesFor("pt");

/* ── the schema check ─────────────────────────────────────────────────────── */

/* A file missing a part does not crash anything — it quietly generates a
   thinner lesson, which is worse, because it looks like it worked. Refuse it
   here instead, where somebody is watching the output. */
const REQUIRED = ["vocabulary", "phrases", "dialogue", "speaking", "writing", "quiz"];

function check(cat) {
  const missing = REQUIRED.filter(k => {
    const v = cat[k];
    if (k === "dialogue") {
      const list = Array.isArray(v) ? v : v ? [v] : [];
      return !list.length || list.some(d => !(d.lines || []).length || !(d.questions || []).length);
    }
    return !Array.isArray(v) || !v.length;
  });
  if (missing.length) {
    console.error("\n" + cat.id + " is missing: " + missing.join(", "));
    console.error("Every topic carries all of: " + REQUIRED.join(", ") +
                  ". A reading passage is optional — the youngest bands match words to " +
                  "pictures instead — but nothing else is.\n");
    process.exit(1);
  }
}

/* ── collect the lines of one category ────────────────────────────────────── */
function catLines(cat) {
  const out = [];
  const add = t => {
    const text = String(t || "").trim();
    if (text && !out.includes(text)) out.push(text);
  };

  const many = x => (Array.isArray(x) ? x : x ? [x] : []);

  for (const v of cat.vocabulary || []) { add(v.word); add(v.example); }
  for (const p of cat.phrases || []) add(p.text);
  /* Every tier's dialogue, not just the one this build happens to look at. */
  for (const d of many(cat.dialogue)) for (const l of d.lines || []) add(l.text);
  for (const s of cat.speaking || []) add(s.text);

  /* The two youngest bands are read to. 4-6 never sees a written quiz question
     (their quiz is pictures), but 7-10 hears the question as it reads it. */
  const spoken = (cat.bands || []).some(b => b === "4-6" || b === "7-10");
  if (spoken) for (const q of cat.quiz || []) add(q.q);

  return out;
}

/* ── render ───────────────────────────────────────────────────────────────── */
async function render(dir, lines, voice) {
  mkdirSync(dir, { recursive: true });

  /* Manifest maps the exact text the app displays to its file. Nothing in the
     app has to know how filenames are made. */
  const clips = {};
  let made = 0, kept = 0, bytes = 0;

  for (const clip of nameLines(lines)) {
    const m4a = join(dir, clip.file);
    for (const original of clip.originals) clips[original] = clip.file;

    if (!FORCE && existsSync(m4a) && statSync(m4a).size > 0) { kept++; bytes += statSync(m4a).size; continue; }

    /* Both engines hand afconvert an uncompressed file; only the container
       differs, and afconvert reads either. The encode settings are the ones the
       committed clips were made with, so switching engines changes the voice and
       nothing else about the file. */
    const raw = join(dir, ENGINE === "google" ? "_tmp.wav" : "_tmp.aiff");
    try {
      await speak(clip.speech, voice, raw);
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "28000", "-q", "127", raw, m4a]);
    } finally {
      rmSync(raw, { force: true });
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

const jobs = [
  { id: "ui",    lines: UI_LINES,    voice: VOICE },
  { id: "ui-pt", lines: UI_LINES_PT, voice: VOICE_PT }
];
for (const f of files) {
  const cat = JSON.parse(readFileSync(join(CATEGORIES, f), "utf8"));
  check(cat);
  jobs.push({ id: cat.id, lines: catLines(cat), voice: VOICE });
}

for (const job of jobs) {
  if (only.length && !job.id.startsWith("ui") && !only.includes(job.id)) continue;
  const r = await render(join(AUDIO, job.id), job.lines, job.voice);
  grandTotal += r.total; grandBytes += r.bytes; grandMade += r.made;
  console.log(
    job.id.padEnd(16) +
    String(r.total).padStart(4) + " lines  " +
    (r.made ? "+" + r.made + " new " : "").padStart(10) +
    (r.bytes / 1024).toFixed(0).padStart(6) + " kB"
  );
}

console.log("");
console.log(grandTotal + " lines · " + (grandBytes / 1024 / 1024).toFixed(2) + " MB · voices " + VOICE + " / " + VOICE_PT +
            " · engine " + ENGINE +
            (grandMade ? " · " + grandMade + " rendered this run" : " · nothing to do"));
console.log("Audio is fetched per category, so a learner downloads one folder, not all of them.");
