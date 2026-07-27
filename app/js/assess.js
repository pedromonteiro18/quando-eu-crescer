/* ═══════════════════════════════════════════════════════════════════════════
   TESTS — the unit test and the band assessment.

   Both are the same machine at two sizes. Both mix categories, because the
   thing a lesson cannot check is whether anything survived leaving the lesson:
   inside one category, "which picture is a bandage" can be answered by
   elimination from a list of five you saw two minutes ago.

   The unit test arrives every couple of categories and costs nothing to fail.
   The band assessment is the only gate in the app: passing it raises the
   content level and offers the next band. Failing it says "not yet" and sends
   the misses to revision, which is where they were going anyway.

   Neither is framed as a mark. There is no percentage on the failure screen,
   because a learner who has just missed the bar does not need a number.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as C from "./content.js";
import * as P from "./progress.js";
import * as A from "./audio.js";
import { ask, scramble } from "./skills/ask.js";
import { node, button, rule, esc, stage, sample, shuffle, setSkill, FX, SKILL_COLORS, Mission } from "./ui.js";
import { clara } from "./clara.js";
import { t, uiClips } from "./i18n.js";

/** What, if anything, this learner has earned the right to sit. */
export function due(band) {
  const ids = (band.categories || []).filter(id => {
    const c = C.get(id);
    return c && c.reviewed === true;
  });
  if (!ids.length) return null;
  const done = P.catsDoneIn(ids);

  /* The band assessment outranks a unit test: once every category has been
     seen, there is nothing left for a unit test to sample that it would not. */
  if (done >= ids.length && !P.bandPassed(band.id)) {
    return { kind: "final", ids, cfg: band.assessment, band };
  }

  const every = (band.unitTest || {}).everyCategories || 2;
  const milestone = Math.floor(done / every) * every;
  if (milestone >= every) {
    const key = band.id + ":" + milestone;
    if (!P.unitDone(key)) return { kind: "unit", ids, cfg: band.unitTest, band, key };
  }
  return null;
}

/* ── building a mixed paper ───────────────────────────────────────────────── */

function items(band, ids, n) {
  const cats = ids.map(id => C.get(id)).filter(Boolean);
  const out = [];

  for (const cat of cats) {
    /* One listening item per category: the sound-to-meaning step is the one
       most likely to have quietly decayed. */
    const vocab = (cat.vocabulary || []).filter(v => v.icon);
    if (band.activities.listen === "picture" && vocab.length) {
      const v = sample(vocab, 1)[0];
      const s = scramble(v, C.distractorWords(cat, v, 2));
      out.push({
        skill: "listen", cat, key: v.word, word: v.word, layout: "pics",
        audio: v.word, question: null,
        options: s.options.map(o => ({ icon: o.icon, label: o.word })), answer: s.answer
      });
    } else {
      const pool = (cat.phrases || []).map(p => p.text);
      if (pool.length) {
        const text = sample(pool, 1)[0];
        const s = scramble(text, C.distractorTexts(cat, text, 2));
        out.push({
          skill: "listen", cat, key: text, layout: "text",
          audio: text, question: t("ask.whichHeard"),
          options: s.options.map(t => ({ label: t })), answer: s.answer
        });
      }
    }

    /* And the written questions, which carry the grammar. */
    for (const q of cat.quiz || []) {
      const correct = q.options[q.answer];
      const s = scramble(correct, q.options.filter((_, k) => k !== q.answer));
      out.push({
        skill: "quiz", cat, key: q.q, layout: "text",
        question: q.q, options: s.options.map(t => ({ label: t })), answer: s.answer, want: correct
      });
    }
  }

  /* Interleave so the paper never sits in one category for long. */
  const byCat = new Map();
  for (const it of shuffle(out)) {
    if (!byCat.has(it.cat.id)) byCat.set(it.cat.id, []);
    byCat.get(it.cat.id).push(it);
  }
  const woven = [];
  let more = true;
  while (more) {
    more = false;
    for (const list of byCat.values()) {
      const next = list.shift();
      if (next) { woven.push(next); more = true; }
    }
  }
  return woven.slice(0, n);
}

/* ── running it ───────────────────────────────────────────────────────────── */

export async function run(what) {
  const token = Mission.bump();
  const { band, cfg, ids, kind } = what;
  const paper = items(band, ids, cfg.items);
  if (!paper.length) return null;

  const final = kind === "final";
  setSkill("gold");

  await Promise.all(ids.map(id => A.load(id)).concat(A.load(uiClips())));

  const go = await new Promise(res => {
    const wrap = stage();
    wrap.appendChild(node("div", "hero__clara", clara("neutral")));
    wrap.appendChild(node("div", "hero__eyebrow", esc(t(final ? "test.band" : "test.unit"))));
    wrap.appendChild(node("h1", null, esc(t(final ? "due.final.t" : "due.unit.t"))));
    if (band.instructions !== "none") {
      wrap.appendChild(node("p", null, esc(final
        ? t("test.finalIntro", { n: paper.length, band: C.bandLabel(band) })
        : t("test.unitIntro", { n: paper.length }))));
    }
    wrap.appendChild(node("hr", "hair"));
    const row = node("div", "row row--end");
    row.appendChild(button("btn btn--quiet", t("test.notNow"), () => res(false)));
    row.appendChild(button("btn", t(band.instructions === "none" ? "app.go" : "test.start"), () => res(true)));
    wrap.appendChild(row);
    A.say(t("audio.begin"));
  });

  if (!go || !Mission.ok(token)) return { declined: true };

  const host = stage();
  let right = 0;

  for (let i = 0; i < paper.length; i++) {
    if (!Mission.ok(token)) return null;
    const it = paper[i];

    host.innerHTML = "";
    host.appendChild(rule(t(final ? "test.assessment" : "test.unit"), i + 1 + " / " + paper.length));
    const card = node("div");
    host.appendChild(card);

    const res = await ask({
      host: card, band, skill: "gold", token,
      playLabel: it.audio ? "Listen" : undefined,
      question: it.question || undefined,
      audio: it.audio || undefined,
      options: it.options, answer: it.answer, layout: it.layout
    });
    if (res.abandoned) return null;

    if (res.first) {
      right++;
      if (it.word) P.right(it.word);
      P.clearMistake(it.skill + "|" + it.cat.id + "|" + it.key);
    } else {
      if (it.word) P.wrong(it.word);
      P.logMistake({
        skill: it.skill, cat: it.cat.id, key: it.key,
        prompt: it.question || it.audio,
        want: it.want || it.options[it.answer].label,
        kind: it.layout
      });
    }
  }

  const score = right / paper.length;
  const passed = score >= (cfg.pass || 0.75);

  if (kind === "unit" && passed) P.passUnit(what.key);
  if (final && passed) {
    P.passBand(band.id);
    P.raiseLevel(C.cefrIndex(band.cefr) + 1);
  }

  return { right, total: paper.length, passed, final, band };
}

/* ── the result ───────────────────────────────────────────────────────────── */

export function result(r, onHome, onNextBand) {
  setSkill("gold");
  const wrap = stage();
  const box = node("div", "result");
  box.appendChild(node("div", "result__clara", clara(r.passed ? "pleased" : "encouraging")));

  const next = r.final && r.passed && r.band.assessment.unlocks
    ? C.band(r.band.assessment.unlocks) : null;

  box.appendChild(node("h1", null,
    esc(t(r.passed ? (r.final ? "test.passedFinal" : "test.passedUnit") : "test.notYet"))));
  box.appendChild(node("p", null, esc(
    r.passed
      ? (next
          ? t("test.scoreNext", { right: r.right, total: r.total, band: C.bandLabel(next) })
          : t("test.scoreOn", { right: r.right, total: r.total }))
      : t("test.failed"))));

  const row = node("div", "row");
  row.style.justifyContent = "center";
  if (next) row.appendChild(button("btn", t("test.moveUp", { band: C.bandLabel(next) }), () => onNextBand(next.id)));
  row.appendChild(button(next ? "btn btn--quiet" : "btn", t("test.home"), onHome));
  box.appendChild(row);
  wrap.appendChild(box);

  if (r.passed) FX.rain([SKILL_COLORS.gold, SKILL_COLORS.listen, SKILL_COLORS.read, SKILL_COLORS.write]);
  A.say(t(r.passed ? "audio.wellDone" : "audio.oneMore"));
}
