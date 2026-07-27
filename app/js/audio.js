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
   length-derived timeout. That timeout is not decoration: a suspended context
   never fires `onended`, and without it every promise in the app stayed pending
   for the rest of the session. Measured, not assumed.

   Clips are loaded per category. A learner downloads the folder for the
   category they opened, not all 939 files.

   The app also watches its own output: two consecutive playbacks that fail to
   advance the context clock raise `onSilence`, because "no errors" and "you can
   hear it" are different claims and only one of them is checkable.
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
    /* "interactive" asks for the smallest buffer the device will give us. On
       iOS it also selects the playback route that respects the volume keys
       rather than the one reserved for ambient sound. */
    try { actx = new C({ latencyHint: "interactive" }); }
    catch { try { actx = new C(); } catch { return null; } }
  }
  if (actx.state === "suspended") { try { actx.resume(); } catch {} }
  return actx;
}

/* iOS suspends the context when the page goes to the background and does not
   bring it back on return — measured: still "suspended" after visibilitychange,
   pageshow and focus have all fired, with nothing listening for any of them. */
function wake() {
  if (actx && actx.state === "suspended") { try { actx.resume(); } catch {} }
}
try {
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  window.addEventListener("pageshow", wake);
  window.addEventListener("focus", wake);
} catch {}

/* A real sound, not one silent sample. iOS decides at the first *rendered*
   audio whether this page gets an output route at all, and a single zero-valued
   frame is not audio. 120 ms of a quiet 220 Hz tone, faded at both ends so it
   cannot click: genuinely non-zero, and far below anything a person notices. */
function primer(c) {
  const n = Math.floor(c.sampleRate * 0.12);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / 400, (n - i) / 400);
    d[i] = Math.sin((2 * Math.PI * 220 * i) / c.sampleRate) * env * 0.02;
  }
  return buf;
}

/**
 * Call this synchronously from inside a real tap handler, before any await.
 * iOS treats anything reached via setTimeout or a resolved promise as outside
 * the gesture and mutes the whole session — that exact bug cost the prototype
 * a day. Creating the context and starting a real buffer here, with nothing
 * async in between, is what actually unlocks output.
 */
export function unlock() {
  const c = context();
  if (!c) { strike(); return false; }
  try {
    const g = c.createGain();
    g.gain.value = 0.5;
    g.connect(c.destination);
    const s = c.createBufferSource();
    s.buffer = primer(c);
    s.connect(g);
    s.start(0);
    /* And then check it. A sound started inside a real tap that does not move
       the clock is the one hard piece of evidence this app can get that it is
       talking to nobody. The delay is for iOS, where resume() settles after
       the handler returns. */
    const before = c.currentTime;
    setTimeout(() => measure(c, before), 500);
  } catch {}
  /* "suspended" is NOT success. It is the exact state that means nothing will
     be heard, and returning true for it is why a silent session looked healthy
     from the inside. The verdict that matters is measure()'s, above. */
  return c.state === "running";
}

export const state = () => (actx ? actx.state : "none");

/* ── is anything actually coming out ──────────────────────────────────────── */

/* An app that cannot hear itself has to measure instead. The one honest signal
   available in a web page is the AudioContext clock: if it advanced across a
   sound while the context was running, the browser rendered output.

   What this CANNOT see is the iOS ringer switch, which silences Web Audio while
   reporting running and advancing the clock exactly as normal. Nothing in a web
   page can see it. That half is handled by asking rather than measuring — see
   the sound help sheet in app.js. */

let verdict = null;              // null unknown · true audible · false silent
let strikes = 0;
const watchers = [];

export const audible = () => verdict;
export function onSilence(fn) { if (typeof fn === "function") watchers.push(fn); }

function announce(info) {
  const report = { audible: verdict, state: state(), ...(info || {}) };
  for (const fn of watchers) { try { fn(report); } catch {} }
}

/**
 * Two CONSECUTIVE failures before we say anything — one blip is not a verdict,
 * and `measure` resets the count on every success.
 *
 * It deliberately does not exempt a device that has already played something.
 * That exemption was here, and it was wrong: the failure this whole mechanism
 * exists for is iOS suspending the context after the app is backgrounded, which
 * by definition happens *after* audio has worked. Exempting a proven device
 * silenced the alarm in precisely the case it was built for.
 */
function strike(info) {
  if (++strikes < 2) return;
  if (verdict === false) return;     // already told them
  verdict = false;
  announce(info);
}

function measure(c, before, seconds) {
  const advanced = c.currentTime - before;
  if (c.state === "running" && advanced > 0) {
    strikes = 0;
    /* Recovery is worth announcing too: whatever we put on screen to say it was
       silent has to come back off when it stops being true. */
    if (verdict !== true) {
      verdict = true;
      announce({ advanced: Math.round(advanced * 1000) / 1000, seconds: seconds || 0 });
    }
    return;
  }
  strike({ advanced: Math.round(advanced * 1000) / 1000, seconds: seconds || 0 });
}

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

/* Which file a line will actually play. Exposed so the split between what Clara
   INSTRUCTS in and what she TEACHES in is checkable from outside rather than
   asserted in a comment: an instruction must come from ui/ or ui-pt/, and
   everything being taught must come from its own topic folder, in English. */
export const urlFor = text => registry.get(String(text || "").trim()) || null;

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

    let done = false;
    const finish = ok => { if (done) return; done = true; clearTimeout(timer); resolve(ok); };
    /* THE PROMISE THAT NEVER SETTLED. `onended` does not fire while the context
       is suspended — which is precisely the state a backgrounded iOS page comes
       back in — so this hung, forever, on every line Clara spoke. Even the self
       test hung, which meant the one instrument built to diagnose silence sat on
       "testing" instead of reporting it. The clip's own length plus slack. */
    const timer = setTimeout(() => finish(false), Math.ceil(buf.duration * 1000) + 900);
    src.onended = () => { if (current === src) current = null; finish(true); };
    try { src.start(); } catch { finish(false); }
  });
}

async function playClip(url) {
  const c = context();
  if (!c) { strike(); return false; }
  const buf = await buffer(url);
  if (!buf) return false;
  const before = c.currentTime;
  const ok = await playBuffer(c, buf);
  measure(c, before, buf.duration);
  return ok;
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
  /* A deliberate re-test resets the verdict rather than adding to it: someone
     who has just flipped the ringer switch back deserves a clean answer. */
  strikes = 1;
  verdict = null;
  measure(c, before, buf.duration);
  if (out.state !== "running") out.error = "the audio context is " + out.state + ", so nothing was audible";
  else if (out.clockAdvanced <= 0) out.error = "the audio clock did not advance";
  out.audible = verdict;
  return out;
}
