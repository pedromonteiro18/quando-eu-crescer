/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT — loading, the review gate, and the distractor index

   One category is one JSON file: what a generator produces and a human
   approves. `reviewed` is the gate and it is live, not decorative — the app
   only ever renders categories where it is true, so an unapproved file simply
   does not exist for a learner. It still appears in the teacher view, flagged,
   which is exactly where a reviewer wants to see it.

   Distractors come from OTHER categories' vocabulary. That is free, and it
   teaches cross-topic discrimination rather than same-list elimination. They
   are drawn only from reviewed categories, so nothing unapproved reaches a
   learner even as a wrong answer.
   ═══════════════════════════════════════════════════════════════════════════ */

let LEVELS = null;
const CATS = new Map();            // id → category, every file including unreviewed
const WORDS = new Map();           // word → {word, icon, example, cat}
const CONFUSABLE = new Map();      // word → Set of words never shown beside it
let SENTENCES = [];                // every phrase and example, for text distractors

const j = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(new Error(url + " → " + r.status))));

export async function boot() {
  LEVELS = await j("content/levels.json");

  const files = LEVELS.categoryFiles || [];
  const loaded = await Promise.all(
    files.map(id => j("content/categories/" + id + ".json").catch(e => {
      console.warn("category failed to load:", id, e.message);
      return null;
    }))
  );
  for (const cat of loaded) if (cat && cat.id) CATS.set(cat.id, cat);

  for (const [a, b] of (LEVELS.confusable && LEVELS.confusable.pairs) || []) {
    if (!CONFUSABLE.has(a)) CONFUSABLE.set(a, new Set());
    if (!CONFUSABLE.has(b)) CONFUSABLE.set(b, new Set());
    CONFUSABLE.get(a).add(b);
    CONFUSABLE.get(b).add(a);
  }

  for (const cat of visible()) {
    for (const v of cat.vocabulary || []) {
      if (!WORDS.has(v.word)) WORDS.set(v.word, { ...v, cat: cat.id });
      if (v.example) SENTENCES.push({ text: v.example, cat: cat.id });
    }
    for (const p of cat.phrases || []) SENTENCES.push({ text: p.text, cat: cat.id });
  }

  return { categories: CATS.size, visible: visible().length, words: WORDS.size };
}

/* ── access ───────────────────────────────────────────────────────────────── */

export const levels = () => LEVELS;
export const bands = () => LEVELS.bands;
export const band = id => LEVELS.bands.find(b => b.id === id) || LEVELS.bands[2];
export const get = id => CATS.get(id) || null;

/** Every file, reviewed or not. Teacher view only. */
export const all = () => [...CATS.values()];

/** THE GATE. Everything a learner can ever reach goes through this. */
export const visible = () => [...CATS.values()].filter(c => c.reviewed === true);

export const words = () => WORDS;
export const word = w => WORDS.get(w) || null;

/* ── CEFR ─────────────────────────────────────────────────────────────────── */

const ORDER = () => LEVELS.cefrOrder;

/** "A1-A2" → the index of A1. Where a category starts. */
export function cefrIndex(cefr) {
  const first = String(cefr || "A1").split("-")[0].trim();
  const i = ORDER().indexOf(first);
  return i < 0 ? 1 : i;
}
export const cefrName = i => ORDER()[Math.max(0, Math.min(ORDER().length - 1, i))];

/**
 * Which categories to offer. The band decides how a category is PRESENTED;
 * the CEFR level decides WHICH ones make sense. Keeping those separate is what
 * lets an adult beginner get A1 content without letter tiles, and stops a five
 * year old being handed phrasal verbs because they had a lucky placement test.
 */
export function offered(bandId, level) {
  const b = band(bandId);
  const listed = new Set(b.categories || []);
  return visible()
    .filter(c => cefrIndex(c.cefr) <= level + 1)
    .sort((x, y) => {
      const xa = listed.has(x.id) ? 0 : 1, ya = listed.has(y.id) ? 0 : 1;
      if (xa !== ya) return xa - ya;                       // this band's own first
      const d = cefrIndex(x.cefr) - cefrIndex(y.cefr);
      if (d) return d;                                     // then easiest first
      return (b.categories || []).indexOf(x.id) - (b.categories || []).indexOf(y.id);
    });
}

/* ── distractors ──────────────────────────────────────────────────────────── */

const banned = w => CONFUSABLE.get(w) || new Set();

/**
 * n wrong pictures for a word, taken from other categories.
 * Never a word that means the same thing, never the same picture, and never a
 * declared confusable — two red faces in one question is a trick, not a test.
 */
export function distractorWords(cat, target, n) {
  const no = banned(target.word);
  const pool = [...WORDS.values()].filter(w =>
    w.cat !== cat.id && w.word !== target.word && w.icon !== target.icon && !no.has(w.word) && w.icon);
  return pick(pool, n);
}

/** n wrong sentences, for the bands that read their options instead of seeing them. */
export function distractorTexts(cat, correct, n) {
  const norm = s => String(s).toLowerCase().replace(/[^a-z ]/g, "").trim();
  const target = norm(correct);
  const pool = SENTENCES.filter(s => s.cat !== cat.id && norm(s.text) !== target);
  return pick(pool, n).map(s => s.text);
}

function pick(pool, n) {
  const out = [], seen = new Set();
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[k]] = [copy[k], copy[i]];
  }
  for (const item of copy) {
    const key = item.word || item.text;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length === n) break;
  }
  return out;
}
