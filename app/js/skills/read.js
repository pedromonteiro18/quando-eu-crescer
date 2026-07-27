/* READING — indigo.
   4-6   match a word to its picture. Whole-word shape recognition, which is
         what reading is at that age; nothing has to be decoded.
   7-10  a short dialogue, every line tappable to hear it, then comprehension.
   11+   a passage, then comprehension. Longer and denser as the band goes up. */

import { ask, scramble } from "./ask.js";
import * as P from "../progress.js";
import * as C from "../content.js";
import * as A from "../audio.js";
import { node, button, rule, esc, sleep, shuffle, sample, setSkill, FX, SKILL_COLORS, REDUCED, Mission } from "../ui.js";
import { clara } from "../clara.js";
import { t } from "../i18n.js";

export const skill = "read";

/* ── 4-6: word to picture ─────────────────────────────────────────────────── */

function match(host, band, vocab, n, token) {
  return new Promise(resolve => {
    const pairs = sample(vocab.filter(v => v.icon), n);
    const words = shuffle(pairs);
    let picked = null, done = 0, firstTry = 0;
    const missesPer = new Map();

    host.innerHTML = "";
    host.appendChild(rule(t("skill.read"), t("read.pairs", { n })));

    const grid = node("div", "match");
    const left = node("div", "match__col");
    const rightCol = node("div", "match__col");
    grid.appendChild(left); grid.appendChild(rightCol);
    host.appendChild(grid);

    const cells = [];
    const cell = (v, side) => {
      const b = button("match__cell match__cell--" + side,
        side === "pic" ? '<span aria-hidden="true">' + esc(v.icon) + "</span>" : esc(v.word),
        () => tap({ v, side, b }),
        { "aria-label": t(side === "pic" ? "read.pictureOf" : "read.theWord", { word: v.word }) });
      (side === "pic" ? left : rightCol).appendChild(b);
      cells.push({ v, side, b });
      return b;
    };
    pairs.forEach(v => cell(v, "pic"));
    words.forEach(v => cell(v, "word"));

    /* Either column first. A four year old taps whatever they looked at, and
       insisting on picture-then-word would just look broken to them. */
    function tap(c) {
      if (c.b.classList.contains("is-done")) return;

      if (!picked || picked.side === c.side) {
        cells.forEach(x => x.b.classList.remove("is-picked"));
        c.b.classList.add("is-picked");
        picked = c;
        A.say(c.v.word);
        return;
      }

      if (c.v.word === picked.v.word) return hit(c);
      miss(c);
    }

    function hit(c) {
      const clean = (missesPer.get(c.v.word) || 0) === 0;
      if (clean) { firstTry++; P.right(c.v.word); } else { P.wrong(c.v.word); }
      picked.b.classList.remove("is-picked");
      picked.b.classList.add("is-done");
      c.b.classList.add("is-done");
      FX.sparkle(c.b, [SKILL_COLORS.read, SKILL_COLORS.gold, "#FFFFFF"]);
      picked = null;
      done++;
      if (done < pairs.length) return;
      A.say(t("audio.wellDone"));
      sleep(REDUCED ? 350 : 950).then(() =>
        resolve(Mission.ok(token)
          ? { right: firstTry, wrong: pairs.length - firstTry }
          : { right: firstTry, wrong: 0, abandoned: true }));
    }

    function miss(c) {
      const key = picked.v.word;
      missesPer.set(key, (missesPer.get(key) || 0) + 1);
      c.b.classList.add("is-miss");
      setTimeout(() => c.b.classList.remove("is-miss"), 420);
      A.say(t("audio.almost"));
      /* One miss is enough to show a four year old the answer. Getting stuck is
         the only real failure state at this age. */
      if (missesPer.get(key) >= (band.hintAfter || 1)) {
        const twin = cells.find(x => x.side !== picked.side && x.v.word === key && !x.b.classList.contains("is-done"));
        if (twin) twin.b.classList.add("is-show");
      }
    }
  });
}

/* ── 7-10: a dialogue you can hear line by line ───────────────────────────── */

function showDialogue(host, cat, band, token) {
  return new Promise(resolve => {
    const d = cat.dialogue;
    host.innerHTML = "";
    host.appendChild(rule(t("skill.read"), d.title));

    const box = node("div", "dlg");
    for (const line of d.lines) {
      const row = node("div", "dlg__line");
      row.setAttribute("data-who", line.who);
      row.appendChild(node("span", "dlg__who", esc(line.who)));
      row.appendChild(node("span", "dlg__text", esc(line.text)));
      row.appendChild(button("dlg__say", "🔊", () => A.say(line.text), { "aria-label": t("read.heard") }));
      box.appendChild(row);
    }
    host.appendChild(box);
    host.appendChild(node("hr", "hair"));

    const row = node("div", "row row--end");
    row.appendChild(button("btn btn--skill", t("read.doneReading"), () => {
      if (Mission.ok(token)) resolve(true); else resolve(false);
    }));
    host.appendChild(row);
  });
}

/* ── 11+: a passage ───────────────────────────────────────────────────────── */

function showPassage(host, reading, token) {
  return new Promise(resolve => {
    host.innerHTML = "";
    host.appendChild(rule(t("skill.read"), reading.title));
    const box = node("div", "passage",
      String(reading.text).split(/\n\n+/).map(p => "<p>" + esc(p) + "</p>").join(""));
    host.appendChild(box);
    host.appendChild(node("hr", "hair"));
    const row = node("div", "row row--end");
    row.appendChild(button("btn btn--skill", t("read.questions"), () => resolve(Mission.ok(token))));
    host.appendChild(row);
  });
}

/* ── comprehension ────────────────────────────────────────────────────────── */

async function comprehension(ctx, questions, source) {
  const { cat, band, host, token } = ctx;
  let right = 0, wrong = 0;

  for (let i = 0; i < questions.length; i++) {
    if (!Mission.ok(token)) return { right, wrong, abandoned: true };
    const q = questions[i];
    const correct = q.options[q.answer];
    const { options, answer } = scramble(correct, q.options.filter((_, k) => k !== q.answer));

    host.innerHTML = "";
    host.appendChild(rule(t("skill.read"), i + 1 + " / " + questions.length));
    const card = node("div");
    host.appendChild(card);

    /* The text stays on screen. Comprehension is not a memory test. */
    if (source) {
      const ref = node("details", "card");
      ref.innerHTML = "<summary style='cursor:pointer;font-weight:700'>" + esc(t("read.readAgain")) + "</summary>" +
        '<div class="passage" style="margin-top:12px">' + source + "</div>";
      card.appendChild(ref);
      card.appendChild(node("div", null, "<div style='height:14px'></div>"));
    }

    const slot = node("div");
    card.appendChild(slot);

    const res = await ask({
      host: slot, band, skill, token,
      question: q.q,
      options: options.map(t => ({ label: t })),
      answer, layout: "text"
    });
    if (res.abandoned) return { right, wrong, abandoned: true };

    if (res.first) { right++; P.clearMistake("read|" + cat.id + "|" + q.q); }
    else {
      wrong++;
      P.logMistake({ skill, cat: cat.id, key: q.q, prompt: q.q, want: correct, kind: "text" });
    }
  }
  return { right, wrong };
}

/* ── entry ────────────────────────────────────────────────────────────────── */

export async function run(ctx) {
  const { cat, band, host, vocab, token } = ctx;
  setSkill(skill);
  const variant = band.activities.read;

  if (variant === "match") {
    const r = await match(host, band, vocab, Math.min(band.lesson.read, vocab.length), token);
    if (!r.abandoned) P.score(skill, cat.id, r.right, r.wrong);
    return r;
  }

  const passage = C.readingFor(cat, P.level());
  if (variant === "dialogue" || !passage) {
    const d = C.dialogueFor(cat, P.level());
    if (!d) return { right: 0, wrong: 0 };
    const ok = await showDialogue(host, cat, band, token);
    if (!ok) return { right: 0, wrong: 0, abandoned: true };
    const src = d.lines.map(l => "<p><b>" + esc(l.who) + ":</b> " + esc(l.text) + "</p>").join("");
    const qs = C.atLevel(d.questions || [], P.level()).slice(0, band.lesson.read);
    const r = await comprehension(ctx, qs, src);
    if (!r.abandoned) P.score(skill, cat.id, r.right, r.wrong);
    return r;
  }

  const ok = await showPassage(host, passage, token);
  if (!ok) return { right: 0, wrong: 0, abandoned: true };
  const src = String(passage.text).split(/\n\n+/).map(p => "<p>" + esc(p) + "</p>").join("");
  const qs = C.atLevel(passage.questions || [], P.level()).slice(0, band.lesson.read);
  const r = await comprehension(ctx, qs, src);
  if (!r.abandoned) P.score(skill, cat.id, r.right, r.wrong);
  return r;
}
