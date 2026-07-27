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

import { lang } from "./i18n.js";

let LEVELS = null;
let TOPICS = null;                 // the manifest of what exists and what is promised
const CATS = new Map();            // id → category, every file including unreviewed
const WORDS = new Map();           // word → {word, icon, example, cat}
const CONFUSABLE = new Map();      // word → Set of words never shown beside it
let SENTENCES = [];                // every phrase and example, for text distractors

const j = url => fetch(url).then(r => (r.ok ? r.json() : Promise.reject(new Error(url + " → " + r.status))));

export async function boot() {
  LEVELS = await j("content/levels.json");
  /* Optional. Without it the app shows a flat list of topics, which is exactly
     what it did before sub-topics existed. */
  TOPICS = await j("content/topics.json").catch(() => null);

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

/* ── the level ladder ─────────────────────────────────────────────────────── */

/* Levels are the named rungs a learner climbs. CEFR is kept alongside as a
   secondary tag rather than as the name, because the placement rungs are
   CEFR-shaped and correct, and because "Iniciante" means something to a
   Brazilian beginner in a way that "A1" does not. */

const LADDER = () => LEVELS.levels || (LEVELS.cefrOrder || []).map((c, i) => ({ i, cefr: c, en: c, pt: c }));

export const levelCount = () => LADDER().length;
const clamp = i => Math.max(0, Math.min(LADDER().length - 1, i | 0));

/** The rung's name in the interface language. */
export function levelName(i, langId) {
  const rung = LADDER()[clamp(i)] || {};
  return rung[langId || lang()] || rung.en || rung.cefr || String(i);
}
export const levelCefr = i => (LADDER()[clamp(i)] || {}).cefr || "";

/** "A1-A2" → the index of the rung it starts on. Where a topic begins. */
export function levelIndex(cefr) {
  const first = String(cefr || "A1").split(/[-–]/)[0].trim();
  const ladder = LADDER();
  const i = ladder.findIndex(r => r.cefr === first);
  if (i >= 0) return i;
  const legacy = (LEVELS.cefrOrder || []).indexOf(first);
  return legacy < 0 ? 0 : Math.min(legacy, ladder.length - 1);
}

/* Kept under the old names so nothing that speaks CEFR has to be rewritten. */
export const cefrIndex = levelIndex;
export const cefrName = levelCefr;

/**
 * The slice of a list that belongs to this learner's rung. Level is DEPTH
 * INSIDE ONE FILE, not six copies of it: one sub-topic is one file carrying all
 * six tiers, and a lesson draws the matching slice. Six separate files per
 * sub-topic would have meant about 150 files and 8,000 clips.
 *
 * An item with no `level` belongs to every rung — which is what makes every
 * file written before levels existed keep working unchanged.
 */
export function atLevel(list, level) {
  const all = list || [];
  const tagged = all.filter(x => x && typeof x.level === "number");
  if (!tagged.length) return all;
  /* Everything up to and including the learner's rung: a B1 learner still needs
     the A1 words, and a lesson that skipped them would have holes in it. */
  const upTo = all.filter(x => typeof x.level !== "number" || x.level <= level);
  /* ...unless that leaves nothing, in which case give them the easiest tier
     rather than an empty lesson. */
  if (upTo.length) return upTo;
  const lowest = Math.min(...tagged.map(x => x.level));
  return all.filter(x => typeof x.level !== "number" || x.level === lowest);
}

/**
 * A dialogue and a reading passage are single units — you cannot serve half a
 * conversation — so they are PICKED by level rather than filtered by it. A file
 * may carry one (the ten originals do) or an array of them, one per tier; this
 * takes the hardest one the learner has reached.
 */
function pickByLevel(thing, level) {
  if (!thing) return null;
  if (!Array.isArray(thing)) return thing;
  const upTo = thing.filter(x => typeof x.level !== "number" || x.level <= level);
  const pool = upTo.length ? upTo : thing;
  return pool.reduce((best, x) =>
    (x.level || 0) >= ((best && best.level) || 0) ? x : best, pool[0]) || null;
}

export const dialogueFor = (cat, level) => pickByLevel(cat.dialogue, level);
export const readingFor = (cat, level) => pickByLevel(cat.reading, level);

/* ── the two authored-in-both-languages fields ────────────────────────────── */

/* A topic's `goal` and a grammar `point` are notes TO the learner ABOUT
   English, so they are interface and carry a Portuguese twin in the file. The
   grammar EXAMPLE is English and never does. */
export const goal = (cat, langId) =>
  ((langId || lang()) === "pt" && cat.goal_pt) ? cat.goal_pt : (cat.goal || "");

export const bandLabel = (b, langId) =>
  ((langId || lang()) === "pt" && b.label_pt) ? b.label_pt : (b.label || "");

export const bandAges = (b, langId) =>
  ((langId || lang()) === "pt" && b.ages_pt) ? b.ages_pt : (b.ages || "");

/* ── topics and sub-topics ────────────────────────────────────────────────── */

/**
 * What the picker shows, in three states that each mean exactly one thing:
 *
 *   ready:false          declared in topics.json, no content file yet. Renders
 *                        as a disabled "Em breve" card — visible on purpose, so
 *                        a learner can see the road ahead — and does not open.
 *   reviewed:false       authored but not approved. Never appears here at all,
 *                        and not as a wrong answer either. That gate is `visible()`.
 *   ready:true           approved and playable.
 *
 * Without topics.json this returns the flat list of topics it always returned.
 */
export function offeredTopics(bandId, level) {
  const flat = offered(bandId, level);
  if (!TOPICS || !TOPICS.topics) {
    return flat.map(c => ({
      kind: "cat", ready: true, id: c.id, cat: c,
      title: c.title, title_pt: c.title_pt, icon: c.icon
    }));
  }

  const open = new Set(flat.map(c => c.id));
  const out = [];

  for (const topic of TOPICS.topics) {
    const subs = (topic.subtopics || []).map(s => {
      const cat = CATS.get(s.id);
      const ready = !!cat && cat.reviewed === true && open.has(s.id);
      return {
        kind: "cat", ready, id: s.id, cat: ready ? cat : null,
        title: s.title, title_pt: s.title_pt, icon: s.icon || topic.icon
      };
    });
    const readyCount = subs.filter(s => s.ready).length;

    /* A topic that is itself a single file — the ten originals — stays a single
       card rather than growing a picker with one thing in it. */
    const self = CATS.get(topic.id);
    if (!subs.length) {
      const ready = !!self && self.reviewed === true && open.has(topic.id);
      out.push({
        kind: "cat", ready, id: topic.id, cat: ready ? self : null,
        title: topic.title, title_pt: topic.title_pt, icon: topic.icon
      });
      continue;
    }

    out.push({
      kind: "topic", ready: readyCount > 0, id: topic.id,
      title: topic.title, title_pt: topic.title_pt, icon: topic.icon,
      subtopics: subs, readyCount, total: subs.length
    });
  }

  /* Anything with a file but no manifest entry still has to be reachable, or
     adding a category and forgetting the manifest silently hides it. */
  const declared = new Set(out.flatMap(x => x.kind === "topic" ? x.subtopics.map(s => s.id) : [x.id]));
  for (const c of flat) {
    if (declared.has(c.id)) continue;
    out.push({ kind: "cat", ready: true, id: c.id, cat: c,
               title: c.title, title_pt: c.title_pt, icon: c.icon });
  }

  /* Ready things first; the roadmap is worth showing, but not worth scrolling
     past every time. */
  return out.sort((a, b) => (a.ready ? 0 : 1) - (b.ready ? 0 : 1));
}

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
