/* LISTENING — deep cyan.
   The youngest two bands hear a word and tap the picture. The older two hear a
   line and choose which one they heard, from written options — that is the step
   where sound has to become text, and it is the one Brazilian learners at B1
   usually find harder than reading. */

import { ask, scramble } from "./ask.js";
import * as C from "../content.js";
import * as P from "../progress.js";
import { node, rule, setSkill, sample, Mission } from "../ui.js";
import { t } from "../i18n.js";

export const skill = "listen";

function pictureItems(cat, vocab, n) {
  return sample(vocab.filter(v => v.icon), n).map(v => {
    const wrongs = C.distractorWords(cat, v, 2);
    const { options, answer } = scramble(v, wrongs);
    return {
      audio: v.word,
      key: v.word,
      word: v.word,
      layout: "pics",
      options: options.map(o => ({ icon: o.icon, label: o.word })),
      answer
    };
  });
}

function textItems(cat, n, level) {
  const pool = [
    ...C.atLevel(cat.phrases || [], level).map(p => p.text),
    ...C.atLevel(cat.vocabulary || [], level).map(v => v.example).filter(Boolean)
  ];
  return sample(pool, n).map(text => {
    const { options, answer } = scramble(text, C.distractorTexts(cat, text, 2));
    return {
      audio: text,
      key: text,
      layout: "text",
      options: options.map(t => ({ label: t })),
      answer
    };
  });
}

export async function run(ctx) {
  const { cat, band, host, vocab, token } = ctx;
  setSkill(skill);

  const items = band.activities.listen === "picture"
    ? pictureItems(cat, vocab, band.lesson.listen)
    : textItems(cat, band.lesson.listen, P.level());

  let right = 0, wrong = 0;

  for (let i = 0; i < items.length; i++) {
    if (!Mission.ok(token)) return { right, wrong, abandoned: true };
    const it = items[i];

    host.innerHTML = "";
    host.appendChild(rule(t("skill.listen"), i + 1 + " / " + items.length));
    const card = node("div");
    host.appendChild(card);

    const res = await ask({
      host: card, band, skill, token,
      playLabel: t(it.layout === "pics" ? "ask.listen" : "ask.playLine"),
      question: t(it.layout === "pics" ? "ask.whichOne" : "ask.whichHeard"),
      audio: it.audio,
      options: it.options,
      answer: it.answer,
      layout: it.layout
    });
    if (res.abandoned) return { right, wrong, abandoned: true };

    if (res.first) {
      right++;
      if (it.word) P.right(it.word);
      P.clearMistake("listen|" + cat.id + "|" + it.key);
    } else {
      wrong++;
      if (it.word) P.wrong(it.word);
      P.logMistake({
        skill, cat: cat.id, key: it.key,
        prompt: it.audio,
        want: it.options[it.answer].label,
        kind: it.layout
      });
    }
  }

  P.score(skill, cat.id, right, wrong);
  return { right, wrong };
}
