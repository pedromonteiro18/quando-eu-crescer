/* QUIZ — the check at the end of a lesson, in gold rather than a skill colour,
   because it is about the whole category rather than one skill.

   Framed as the last page of the workbook, never as a test with a mark. It
   still cannot be failed: a wrong answer is logged for revision and the lesson
   continues. */

import { ask, scramble } from "./skills/ask.js";
import * as C from "./content.js";
import * as P from "./progress.js";
import { node, rule, sample, setSkill, Mission } from "./ui.js";
import { t } from "./i18n.js";

export function pictureItems(cat, vocab, n) {
  return sample(vocab.filter(v => v.icon), n).map(v => {
    const { options, answer } = scramble(v, C.distractorWords(cat, v, 2));
    return {
      audio: v.word, key: v.word, word: v.word, layout: "pics",
      options: options.map(o => ({ icon: o.icon, label: o.word })), answer
    };
  });
}

export function textItems(cat, n, level) {
  return sample(C.atLevel(cat.quiz || [], level), n).map(q => {
    const correct = q.options[q.answer];
    const { options, answer } = scramble(correct, q.options.filter((_, k) => k !== q.answer));
    return {
      question: q.q, key: q.q, layout: "text",
      options: options.map(t => ({ label: t })), answer, want: correct
    };
  });
}

export async function run(ctx) {
  const { cat, band, host, vocab, token } = ctx;
  setSkill("gold");

  const items = band.activities.quiz === "picture"
    ? pictureItems(cat, vocab, band.lesson.quiz)
    : textItems(cat, band.lesson.quiz, P.level());

  let right = 0, wrong = 0;

  for (let i = 0; i < items.length; i++) {
    if (!Mission.ok(token)) return { right, wrong, abandoned: true };
    const it = items[i];

    host.innerHTML = "";
    host.appendChild(rule(t("skill.quiz"), i + 1 + " / " + items.length));
    const card = node("div");
    host.appendChild(card);

    const res = await ask({
      host: card, band, skill: "gold", token,
      playLabel: it.layout === "pics" ? t("ask.listen") : undefined,
      question: it.question || (it.layout === "pics" ? t("ask.whichOne") : undefined),
      audio: it.audio,
      options: it.options, answer: it.answer, layout: it.layout
    });
    if (res.abandoned) return { right, wrong, abandoned: true };

    if (res.first) {
      right++;
      if (it.word) P.right(it.word);
      P.clearMistake("quiz|" + cat.id + "|" + it.key);
    } else {
      wrong++;
      if (it.word) P.wrong(it.word);
      P.logMistake({
        skill: "quiz", cat: cat.id, key: it.key,
        prompt: it.question || it.audio,
        want: it.want || it.options[it.answer].label,
        kind: it.layout
      });
    }
  }

  return { right, wrong, clean: wrong === 0 && items.length > 0 };
}
