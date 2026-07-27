/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS — localStorage only. No account, no server, no analytics.

   The prototype's new → learning → known bucket carries over unchanged; it was
   the right amount of memory for the job and a real spaced-repetition schedule
   would have been over-engineering. What is added here is what the four-skill
   product needs and the prototype had no use for:

     · per-skill accuracy, so the app can tell a learner their writing is behind
       before they have worked it out themselves;
     · a mistake log, which is the entire input to the revision engine;
     · a streak, which is the honest version of a daily reminder. Real scheduled
       notifications need a service worker with push, a server, and on iOS an
       installed app — none of which a web page has. A counter and a "practise
       today" state say the same thing without pretending.
   ═══════════════════════════════════════════════════════════════════════════ */

const KEY = "englishwithclara.v1";
const MAX_MISTAKES = 60;

export const SKILLS = ["listen", "speak", "read", "write"];

const blank = () => ({
  v: 1,
  band: null,
  level: 1,
  placed: false,
  words: {},
  skills: { listen: { right: 0, wrong: 0 }, speak: { done: 0 }, read: { right: 0, wrong: 0 }, write: { right: 0, wrong: 0 } },
  cats: {},
  mistakes: [],
  badges: {},
  streak: { last: null, count: 0, days: 0 },
  lessons: 0,
  tests: { units: {}, bands: {} }        // units: "<band>:<n>" → true · bands: "<band>" → true
});

let data = blank();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = Object.assign(blank(), JSON.parse(raw));
} catch { /* private mode or storage blocked — carry on in memory */ }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export const state = () => data;

/* ── who the learner is ───────────────────────────────────────────────────── */

export const band = () => data.band;
export const level = () => data.level;
export const placed = () => data.placed;

export function place(bandId, levelIndex) {
  data.band = bandId;
  data.level = levelIndex;
  data.placed = true;
  save();
}
export function setBand(bandId) { data.band = bandId; save(); }

/* ── words: new → learning → known ────────────────────────────────────────── */

const wordRec = w => data.words[w] || (data.words[w] = { status: "new", right: 0, wrong: 0 });

export function seen(w) {
  const r = wordRec(w);
  if (r.status === "new") r.status = "learning";
  save();
}
export function right(w) {
  const r = wordRec(w);
  r.right++;
  if ((r.right >= 2 && r.wrong === 0) || r.right >= 3) r.status = "known";
  save();
}
export function wrong(w) {
  const r = wordRec(w);
  r.wrong++;
  if (r.status === "known") r.status = "learning";   // a missed known word drops back
  save();
}
export const statusOf = w => (data.words[w] || {}).status || "new";

export function counts(pool) {
  let learning = 0, known = 0;
  const list = pool || Object.keys(data.words);
  for (const w of list) {
    const s = (data.words[w] || {}).status;
    if (s === "known") known++;
    else if (s === "learning") learning++;
  }
  return { total: list.length, fresh: list.length - learning - known, learning, known };
}

/** Words the learner has met but not mastered — the other half of revision. */
export function shaky() {
  return Object.keys(data.words).filter(w => data.words[w].status === "learning");
}

/* ── skills ───────────────────────────────────────────────────────────────── */

export function score(skill, catId, gotRight, gotWrong) {
  const s = data.skills[skill] || (data.skills[skill] = { right: 0, wrong: 0 });
  if (skill === "speak") s.done = (s.done || 0) + gotRight;      // speaking is never scored
  else { s.right += gotRight; s.wrong += gotWrong; }

  if (catId) {
    const c = data.cats[catId] || (data.cats[catId] = { done: 0, skills: {} });
    const cs = c.skills[skill] || (c.skills[skill] = { right: 0, wrong: 0 });
    if (skill === "speak") cs.done = (cs.done || 0) + gotRight;
    else { cs.right += gotRight; cs.wrong += gotWrong; }
  }
  save();
}

/** 0..1, or null when there is not enough evidence to say anything. */
export function accuracy(skill) {
  const s = data.skills[skill] || {};
  if (skill === "speak") return s.done ? 1 : null;
  const n = (s.right || 0) + (s.wrong || 0);
  return n < 4 ? null : s.right / n;
}

export function accuracies() {
  const out = {};
  for (const s of SKILLS) out[s] = accuracy(s);
  return out;
}

/** The skill the revision engine should lead with, or null if all are level. */
export function weakest() {
  const scored = SKILLS
    .filter(s => s !== "speak")
    .map(s => ({ skill: s, a: accuracy(s) }))
    .filter(x => x.a !== null);
  if (scored.length < 2) return null;
  scored.sort((a, b) => a.a - b.a);
  if (scored[0].a > 0.85) return null;                    // nothing is actually behind
  return scored[0].skill;
}

export function catProgress(catId) {
  const c = data.cats[catId];
  if (!c) return null;
  const out = { done: c.done || 0, skills: {} };
  for (const s of SKILLS) {
    const r = (c.skills || {})[s];
    if (!r) { out.skills[s] = 0; continue; }
    out.skills[s] = s === "speak"
      ? Math.min(1, (r.done || 0) / 6)
      : Math.min(1, ((r.right || 0) + (r.wrong || 0)) / 12);
  }
  return out;
}

export function finishLesson(catId) {
  data.lessons++;
  const c = data.cats[catId] || (data.cats[catId] = { done: 0, skills: {} });
  c.done++;
  save();
}
export const lessonsDone = () => data.lessons;
export const catDone = catId => ((data.cats[catId] || {}).done || 0);

/* ── mistakes, which are the whole input to revision ──────────────────────── */

export function logMistake(m) {
  const key = m.skill + "|" + (m.cat || "") + "|" + (m.key || m.prompt);
  data.mistakes = data.mistakes.filter(x => x.key !== key);
  data.mistakes.unshift({ ...m, key, ts: Date.now() });
  if (data.mistakes.length > MAX_MISTAKES) data.mistakes.length = MAX_MISTAKES;
  save();
}

/** Answered correctly later, so it stops coming back. */
export function clearMistake(key) {
  const before = data.mistakes.length;
  data.mistakes = data.mistakes.filter(x => x.key !== key);
  if (data.mistakes.length !== before) save();
}

export const mistakes = () => data.mistakes.slice();

/* ── tests ────────────────────────────────────────────────────────────────── */

const tests = () => (data.tests || (data.tests = { units: {}, bands: {} }));

/** How many of this band's categories have been finished at least once. */
export function catsDoneIn(ids) {
  return ids.filter(id => ((data.cats[id] || {}).done || 0) > 0).length;
}

export const unitDone = key => !!tests().units[key];
export function passUnit(key) { tests().units[key] = true; save(); }

export const bandPassed = id => !!tests().bands[id];
export function passBand(id) { tests().bands[id] = true; save(); }

/** Raise the content level, never lower it. */
export function raiseLevel(to) {
  if (to > data.level) { data.level = to; save(); }
}

/* ── badges ───────────────────────────────────────────────────────────────── */

export function award(id) {
  if (data.badges[id]) return false;
  data.badges[id] = Date.now();
  save();
  return true;                                          // true means it is new
}
export const hasBadge = id => !!data.badges[id];
export const badgeCount = () => Object.keys(data.badges).length;

/* ── streak ───────────────────────────────────────────────────────────────── */

const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

const yesterday = () => {
  const d = new Date(Date.now() - 86400000);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

/** Call when a lesson finishes. Returns the streak after counting today. */
export function touchDay() {
  const t = today();
  if (data.streak.last === t) return data.streak;
  data.streak.count = data.streak.last === yesterday() ? data.streak.count + 1 : 1;
  data.streak.last = t;
  data.streak.days++;
  save();
  return data.streak;
}

export const streak = () => data.streak;
export const practisedToday = () => data.streak.last === today();

/* ── wiping ───────────────────────────────────────────────────────────────── */

export function reset() {
  data = blank();
  save();
}
