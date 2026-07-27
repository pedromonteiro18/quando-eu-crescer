/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO — Web Audio, playing pre-rendered clips

   Ported from the prototype, where this layer was arrived at by measurement
   rather than preference. Three things were tried; only this one made a sound
   in every condition tested:

     · speechSynthesis needs a user gesture, is silenced inside iframes, depends
       on which voices the device happens to have, is suspended in background
       tabs, and fails differently in every browser;
     · an <audio> element refuses a .m4a served as audio/mp4a-latm — which is a
       Content-Type we do not control on GitHub Pages — and will not even load
       while the tab is in the background;
     · decodeAudioData reads the bytes directly, so the server's opinion about
       MIME type is irrelevant, and a BufferSource plays in a background tab.

   One AudioContext, unlocked on the first tap, serves the whole app, so no
   individual phrase ever needs its own gesture.

   NOTHING HERE EVER REJECTS OR HANGS. A silent device must still be able to
   finish a lesson, so every promise resolves — on ended, on failure, or on a
   length-derived timeout.

   Clips are loaded per category. A learner downloads the folder for the
   category they opened, not 1,200 files.
   ═══════════════════════════════════════════════════════════════════════════ */

const registry = new Map();      // exact text → url
const loading = new Map();       // category id → promise
const buffers = new Map();       // url → AudioBuffer (null means it failed)

let actx = null;
let current = null;              // the BufferSource playing right now
let epoch = 0;                   // invalidates a pending sequence

/* ── the context ──────────────────────────────────────────────────────────── */

export function context() {
  if (!actx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { actx = new C(); } catch { return null; }
  }
  if (actx.state === "suspended") { try { actx.resume(); } catch {} }
  return actx;
}

/**
 * Call this synchronously from inside a real tap handler, before any await.
 * iOS treats anything reached via setTimeout or a resolved promise as outside
 * the gesture and mutes the whole session — that exact bug cost the prototype
 * a day. Creating the context and starting a one-sample silent buffer here,
 * with nothing async in between, is what actually unlocks output.
 */
export function unlock() {
  const c = context();
  if (!c) return false;
  try {
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, 22050);
    s.connect(c.destination);
    s.start(0);
  } catch {}
  return c.state === "running" || c.state === "suspended";
}

export const state = () => (actx ? actx.state : "none");

/* ── the clip registry ────────────────────────────────────────────────────── */

/** Load one category's manifest. Safe to call repeatedly. */
export function load(id) {
  if (loading.has(id)) return loading.get(id);
  const p = fetch("audio/" + id + "/clips.json")
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then(map => {
      for (const text of Object.keys(map)) registry.set(text, "audio/" + id + "/" + map[text]);
      return true;
    })
    .catch(() => false);          // no recordings for this category yet — the
  loading.set(id, p);             // fallback voice takes over, app keeps working
  return p;
}

export const has = text => registry.has(String(text || "").trim());

/* ── decoding and playback ────────────────────────────────────────────────── */

async function buffer(url) {
  if (buffers.has(url)) return buffers.get(url);
  const c = context();
  if (!c) return null;
  try {
    const res = await fetch(url);
    const raw = await res.arrayBuffer();
    const buf = await c.decodeAudioData(raw);
    buffers.set(url, buf);
    return buf;
  } catch {
    buffers.set(url, null);       // do not retry on every repeat
    return null;
  }
}

function playBuffer(c, buf) {
  return new Promise(resolve => {
    let src;
    try { src = c.createBufferSource(); } catch { return resolve(false); }
    src.buffer = buf;
    src.connect(c.destination);
    if (current) { try { current.onended = null; current.stop(); } catch {} }
    current = src;
    src.onended = () => { if (current === src) current = null; resolve(true); };
    try { src.start(); } catch { resolve(false); }
  });
}

async function playClip(url) {
  const c = context();
  if (!c) return false;
  const buf = await buffer(url);
  if (!buf) return false;
  return playBuffer(c, buf);
}

/* Decode a category's clips in the background so no line stutters mid-lesson. */
export async function warm(id) {
  await load(id);
  const urls = [...registry.values()].filter(u => u.startsWith("audio/" + id + "/") && !buffers.has(u));
  for (const u of urls) {
    await buffer(u);
    await new Promise(r => setTimeout(r, 0));   // stay off the main thread
  }
}

/* ── the fallback voice ───────────────────────────────────────────────────── */

/* Only reached for a line with no recording. There should be none, but a
   missing file must degrade to a worse voice rather than to silence. */
const synth = window.speechSynthesis || null;
const JOKE = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|ralph|kathy|junior|grandma|grandpa|deranged|hysterical|princess|eddy|flo|reed|rocko|sandy|shelley|rishi)\b/i;
const GOOD = ["samantha", "ava", "allison", "joelle", "nicky", "zoe", "susan", "evan", "alex", "daniel", "karen", "moira", "tessa", "google us english"];
let voice = null;

function pickVoice() {
  if (!synth) return;
  let all = [];
  try { all = synth.getVoices() || []; } catch { return; }
  const pool = all.filter(v => String(v.lang || "").toLowerCase().startsWith("en"));
  if (!pool.length) return;
  const score = v => {
    const n = v.name.toLowerCase();
    let s = 0;
    const rank = GOOD.findIndex(g => n.indexOf(g) === 0 || n === g);
    if (rank >= 0) s += 100 - rank * 4;
    if (JOKE.test(n)) s -= 200;
    if (/enhanced|premium|natural|neural|siri/.test(n)) s += 30;
    if (/compact|eloquence/.test(n)) s -= 25;
    if (v.localService) s += 10;
    return s;
  };
  voice = pool.slice().sort((a, b) => score(b) - score(a))[0];
}
if (synth) {
  pickVoice();
  try { synth.addEventListener("voiceschanged", pickVoice); } catch { synth.onvoiceschanged = pickVoice; }
  [150, 500, 1200, 2500].forEach(t => setTimeout(pickVoice, t));   // some browsers never fire it
}

function speak(text) {
  return new Promise(resolve => {
    if (!synth || !text) return resolve(false);
    let u;
    try { u = new SpeechSynthesisUtterance(text); } catch { return resolve(false); }
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : "en-US";
    u.rate = 0.9;
    let done = false;
    const finish = ok => { if (done) return; done = true; clearTimeout(guard); resolve(ok); };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    const guard = setTimeout(() => finish(false), 1400 + text.length * 130);   // onend never fires on some Androids
    try { if (synth.paused) synth.resume(); synth.speak(u); } catch { finish(false); }
  });
}

/* ── the public voice of the app ──────────────────────────────────────────── */

/** Speak one line. Always resolves; true means sound actually came out. */
export async function say(text) {
  const line = String(text || "").trim();
  if (!line) return false;
  const url = registry.get(line);
  if (url) return playClip(url);
  return speak(line);
}

/**
 * Speak several lines in order. Returns false if something interrupted it, so
 * a caller can tell "finished" from "the learner moved on".
 * Items are strings, or {gap: ms} to leave a pause.
 */
export async function seq(items) {
  const mine = ++epoch;
  for (const item of items) {
    if (mine !== epoch) return false;
    if (item && item.gap) { await new Promise(r => setTimeout(r, item.gap)); continue; }
    await say(item);
  }
  return mine === epoch;
}

export function stop() {
  epoch++;
  if (current) { try { current.onended = null; current.stop(); } catch {} current = null; }
  try { synth && synth.cancel(); } catch {}
}

/* ── the self-test ────────────────────────────────────────────────────────── */

/**
 * "No errors" is not proof that anything was audible — that mistake was made
 * once already, and cost a silent build that reported success. This measures
 * the AudioContext clock across a real clip: if it advanced and the state is
 * running, the browser is genuinely producing output.
 */
export async function probe(text = "Testing, one, two, three.") {
  const out = {
    webAudio: false, state: "none", recorded: false, decoded: false,
    played: false, clockAdvanced: 0, seconds: 0, voices: 0, error: null,
    inIframe: window.top !== window.self, clips: registry.size
  };
  try { out.voices = synth ? (synth.getVoices() || []).length : 0; } catch {}

  const c = context();
  if (!c) { out.error = "this browser has no Web Audio"; return out; }
  out.webAudio = true;
  out.state = c.state;

  const url = registry.get(text);
  if (!url) {
    out.error = "no recording for this line; the fallback voice would be used";
    out.played = await speak(text);
    return out;
  }
  out.recorded = true;

  const buf = await buffer(url);
  if (!buf) { out.error = "the audio could not be decoded"; return out; }
  out.decoded = true;
  out.seconds = Math.round(buf.duration * 100) / 100;

  const before = c.currentTime;
  out.played = await playBuffer(c, buf);
  out.clockAdvanced = Math.round((c.currentTime - before) * 100) / 100;
  out.state = c.state;
  if (out.state !== "running") out.error = "the audio context is " + out.state + ", so nothing was audible";
  else if (out.clockAdvanced <= 0) out.error = "the audio clock did not advance";
  return out;
}
