/* ═══════════════════════════════════════════════════════════════════════════
   REVISION — built entirely out of what the learner actually got wrong.

   Two inputs, both already tracked:
     · the mistake log, replayed with fresh distractors so it is not memorised
       as a position on a screen;
     · words sitting in the learning bucket, which is the prototype's
       new → learning → known machinery finally being spent on something.

   It opens with whichever skill is behind, in that skill's colour, and says so.
   The colour system exists so that a learner sees "writing is behind" before
   they read the sentence that says it.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as C from "./content.js";
import * as P from "./progress.js";
import * as A from "./audio.js";
import { ask, scramble } from "./skills/ask.js";
import { single as writeItem } from "./skills/write.js";
import { node, button, rule, esc, stage, sample, setSkill, sleep, FX, SKILL_COLORS, Mission } from "./ui.js";
import { clara } from "./clara.js";

const LABEL = { listen: "Listening", speak: "Speaking", read: "Reading", write: "Writing", quiz: "Quiz" };

/** Is there anything worth revising? */
export function available() {
  return P.mistakes().length > 0 || P.shaky().length >= 4;
}

/* Rebuild a logged mistake into a fresh question. New distractors every time,
   so what is being revised is the answer and not where it sat on the screen. */
function rebuild(m) {
  const cat = C.get(m.cat);
  if (!cat) return null;

  if (m.skill === "write") {
    if (m.kind === "spell") return { kind: "write", cat, item: { type: "spell", answer: m.want }, key: m.key };
    if (m.kind === "cloze") return { kind: "write", cat, item: { type: "cloze", sentence: m.prompt, answer: m.want }, key: m.key };
    return { kind: "write", cat, item: { type: "answer", question: m.prompt, accept: [m.want] }, key: m.key };
  }

  if (m.kind === "pics") {
    const w = C.word(m.want);
    if (!w) return null;
    const { options, answer } = scramble(w, C.distractorWords(cat, w, 2));
    return {
      kind: "ask", cat, key: m.key, skill: m.skill,
      audio: m.prompt, question: null, layout: "pics",
      options: options.map(o => ({ icon: o.icon, label: o.word })), answer
    };
  }

  const { options, answer } = scramble(m.want, C.distractorTexts(cat, m.want, 2));
  return {
    kind: "ask", cat, key: m.key, skill: m.skill,
    audio: m.skill === "listen" ? m.prompt : null,
    question: m.skill === "listen" ? "Which one did you hear?" : m.prompt,
    layout: "text",
    options: options.map(t => ({ label: t })), answer
  };
}

/* Fill up from the learning bucket when there are not many mistakes yet. */
function fromShaky(n) {
  const out = [];
  for (const w of sample(P.shaky(), n)) {
    const v = C.word(w);
    if (!v || !v.icon) continue;
    const cat = C.get(v.cat);
    if (!cat) continue;
    const { options, answer } = scramble(v, C.distractorWords(cat, v, 2));
    out.push({
      kind: "ask", cat, key: null, skill: "listen",
      audio: v.word, question: null, layout: "pics",
      options: options.map(o => ({ icon: o.icon, label: o.word })), answer, word: v.word
    });
  }
  return out;
}

export async function run(band) {
  const token = Mission.bump();
  const weak = P.weakest();

  const mistakes = P.mistakes();
  const items = [];
  for (const m of mistakes) {
    const built = rebuild(m);
    if (built) items.push(built);
    if (items.length >= 8) break;
  }
  /* Lead with whichever skill is behind. */
  if (weak) items.sort((a, b) => (a.skill === weak ? -1 : 0) - (b.skill === weak ? -1 : 0));
  if (items.length < 4) items.push(...fromShaky(4 - items.length));
  if (!items.length) return { cleared: 0, total: 0 };

  /* ── the intro ── */
  await new Promise(res => {
    setSkill(weak || "gold");
    const wrap = stage();
    wrap.appendChild(node("div", "hero__clara", clara("encouraging")));
    wrap.appendChild(node("div", "hero__eyebrow", "Revision"));
    wrap.appendChild(node("h1", null, weak ? "Your " + LABEL[weak].toLowerCase() + " is behind." : "Back to what you missed."));
    wrap.appendChild(node("p", null, weak
      ? "Nothing dramatic — it is the skill with the most misses, so this session starts there. " +
        items.length + " things to go over."
      : items.length + " things you did not get first time. New wrong answers each time, so this is not memorising a position."));
    wrap.appendChild(node("hr", "hair"));
    const row = node("div", "row row--end");
    row.appendChild(button("btn btn--skill", "Start →", () => res()));
    wrap.appendChild(row);
  });

  /* ── the items ── */
  const host = stage();
  let cleared = 0;

  for (let i = 0; i < items.length; i++) {
    if (!Mission.ok(token)) return { cleared, total: items.length, abandoned: true };
    const it = items[i];
    setSkill(it.kind === "write" ? "write" : it.skill === "quiz" ? "gold" : it.skill);

    host.innerHTML = "";
    host.appendChild(rule("Revision", i + 1 + " / " + items.length));
    const card = node("div");
    host.appendChild(card);

    let ok;
    if (it.kind === "write") {
      const r = await writeItem({ cat: it.cat, band, host: card, vocab: it.cat.vocabulary || [], token },
                                it.item, i, items.length);
      if (r.abandoned) return { cleared, total: items.length, abandoned: true };
      ok = r.ok;
    } else {
      const r = await ask({
        host: card, band, skill: it.skill === "quiz" ? "gold" : it.skill, token,
        playLabel: it.audio ? "Listen" : undefined,
        question: it.question || undefined,
        audio: it.audio || undefined,
        options: it.options, answer: it.answer, layout: it.layout
      });
      if (r.abandoned) return { cleared, total: items.length, abandoned: true };
      ok = r.first;
    }

    if (ok) {
      cleared++;
      if (it.key) P.clearMistake(it.key);
      if (it.word) P.right(it.word);
    } else if (it.word) P.wrong(it.word);
  }

  if (cleared) P.award("revised");
  return { cleared, total: items.length };
}
