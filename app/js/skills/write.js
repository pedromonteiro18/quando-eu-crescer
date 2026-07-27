/* ═══════════════════════════════════════════════════════════════════════════
   WRITING — green. The skill that changes most between bands.

   4-6    letter tiles. No keyboard, because they do not have one and could not
          use it. Every wrong attempt locks one more correct letter into place,
          so the puzzle always resolves — with no reading and no sound.
   7-10   short typing with a word bank visible, so spelling is recognition
          before it is recall.
   11-14  full typing: cloze and short answers.
   15+    free written answers, marked leniently and, where the answer is
          genuinely open, marked by the learner. A generous accept list is
          honest about what a static app can check; pretending to grade free
          writing would be the same mistake as scoring pronunciation.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as A from "../audio.js";
import * as P from "../progress.js";
import { node, button, rule, esc, shuffle, sample, sleep, setSkill, FX, SKILL_COLORS, REDUCED, Mission } from "../ui.js";
import { clara } from "../clara.js";

export const skill = "write";

const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();

const TYPES = {
  tiles: ["spell"],
  bank: ["spell", "cloze"],
  type: ["cloze", "answer"],
  free: ["answer", "cloze"]
};

/* A lesson only carries a slice of the category's vocabulary, so an authored
   spelling item's word is usually *not* in that slice. Look in the slice first,
   then in the whole category — otherwise the picture silently disappears. */
const iconFor = (cat, vocab, word) =>
  ((vocab || []).find(v => v.word === word) || {}).icon ||
  (((cat || {}).vocabulary || []).find(v => v.word === word) || {}).icon || "";

/** Enough items for any band, whatever the file happens to contain. */
function plan(cat, band, vocab, n) {
  const want = TYPES[band.activities.write] || TYPES.type;
  const tilesBand = band.activities.write === "tiles";

  const have = (cat.writing || [])
    .filter(w => want.includes(w.type))
    .map(w => w.type === "spell" ? { ...w, icon: w.icon || iconFor(cat, vocab, w.answer) } : w)
    /* On letter tiles the picture *is* the question. An item with no picture
       would leave a four year old three empty slots and nothing to go on. */
    .filter(w => !(tilesBand && w.type === "spell" && !w.icon));

  const out = sample(have, n);
  /* Spelling items can always be generated from the vocabulary, which is what
     lets a category written for adults still serve a six year old. */
  if (out.length < n && want.includes("spell")) {
    const used = new Set(out.map(w => w.answer));
    for (const v of sample(vocab.filter(v => v.icon && !used.has(v.word) && v.word.length <= 9), n - out.length)) {
      out.push({ type: "spell", answer: v.word, icon: v.icon });
    }
  }
  return shuffle(out).slice(0, n);
}

/* ── letter tiles ─────────────────────────────────────────────────────────── */

function tiles(ctx, it, index, total) {
  return new Promise(resolve => {
    const { cat, host, vocab, token, band } = ctx;
    const word = String(it.answer);
    const letters = word.split("");
    const icon = it.icon || iconFor(cat, vocab, word);
    let locked = 0, misses = 0;

    host.innerHTML = "";
    host.appendChild(rule("Writing", index + 1 + " / " + total));

    const head = node("div", "word word--tight");
    /* 🔊 only if a picture could not be found: the slot is never blank, because
       a blank prompt is a screen with no question on it. */
    head.appendChild(node("div", "word__icon", '<span aria-hidden="true">' + esc(icon || "🔊") + "</span>"));
    host.appendChild(head);

    const slotBox = node("div", "slots");
    host.appendChild(slotBox);

    const pool = node("div", "tiles");
    host.appendChild(pool);

    const replay = node("div", "row row--end");
    replay.style.marginTop = "20px";
    replay.appendChild(button("btn btn--quiet btn--round", "🔊", () => A.say(word), { "aria-label": "Hear the word" }));
    host.appendChild(replay);

    let slots, tileBtns;
    draw();
    setTimeout(() => A.say(word), 280);

    function draw() {
      slotBox.className = "slots";
      slotBox.innerHTML = "";
      slots = letters.map((ch, i) => {
        const s = node("div", "slot" + (i < locked ? " is-filled" : ""), i < locked ? esc(ch) : "");
        s.dataset.i = String(i);
        if (i >= locked) s.addEventListener("click", () => clear(i));
        slotBox.appendChild(s);
        return s;
      });

      pool.innerHTML = "";
      const decoys = "abcdefghijklmnopqrstuvwxyz".split("")
        .filter(c => !letters.includes(c));
      const bag = shuffle(letters.slice(locked).concat(sample(decoys, 2)));
      tileBtns = bag.map(ch => {
        const b = button("tile", esc(ch), () => place(ch, b));
        pool.appendChild(b);
        return b;
      });
    }

    function nextEmpty() {
      return slots.findIndex((s, i) => i >= locked && !s.classList.contains("is-filled"));
    }

    function place(ch, b) {
      const i = nextEmpty();
      if (i < 0 || b.classList.contains("is-used")) return;
      slots[i].textContent = ch;
      slots[i].classList.add("is-filled");
      slots[i].dataset.from = ch;
      b.classList.add("is-used");
      b.disabled = true;
      if (nextEmpty() < 0) check();
    }

    function clear(i) {
      const s = slots[i];
      if (!s.classList.contains("is-filled")) return;
      const ch = s.dataset.from;
      s.textContent = ""; s.classList.remove("is-filled"); delete s.dataset.from;
      const b = tileBtns.find(t => t.textContent === ch && t.classList.contains("is-used"));
      if (b) { b.classList.remove("is-used"); b.disabled = false; }
    }

    async function check() {
      const got = slots.map(s => s.textContent).join("");
      if (got === word) {
        slotBox.classList.add("is-right");
        FX.sparkle(slotBox, [SKILL_COLORS.write, SKILL_COLORS.gold, "#FFFFFF"]);
        A.seq(["Well done!", { gap: 120 }, word]);
        await sleep(REDUCED ? 400 : 1200);
        return resolve({ ok: misses === 0, abandoned: !Mission.ok(token) });
      }
      misses++;
      slotBox.classList.add("is-wrong");
      A.say("Almost. Try again.");
      await sleep(460);
      slotBox.classList.remove("is-wrong");
      /* Every miss locks one more real letter, so this always finishes. */
      locked = Math.min(locked + 1, letters.length - 1);
      draw();
    }
  });
}

/* ── typed answers ────────────────────────────────────────────────────────── */

function typed(ctx, it, index, total) {
  return new Promise(resolve => {
    const { cat, band, host, vocab, token } = ctx;
    const variant = band.activities.write;
    const free = variant === "free" && it.type === "answer";
    let misses = 0;

    host.innerHTML = "";
    host.appendChild(rule("Writing", index + 1 + " / " + total));

    const head = node("div", "prompt");
    const face = node("span", "prompt__clara", clara("neutral"));
    head.appendChild(face);
    const txt = node("div", "prompt__text");

    if (it.type === "cloze") {
      txt.appendChild(node("div", "write-sentence", esc(it.sentence).replace(/_{2,}/, "<u>&nbsp;</u>")));
    } else if (it.type === "answer") {
      txt.appendChild(node("h2", null, esc(it.question)));
      txt.appendChild(node("p", null, free
        ? "Write a full sentence. There is more than one good answer."
        : "Answer in your own words."));
    } else {
      txt.appendChild(node("h2", null, "Write the word."));
      txt.appendChild(node("div", "word__icon", '<span aria-hidden="true">' +
        esc(it.icon || iconFor(cat, vocab, it.answer)) + "</span>"));
    }
    head.appendChild(txt);
    host.appendChild(head);

    /* A word bank turns recall into recognition — the right step for 7-10. */
    let bank = null;
    if (variant === "bank") {
      const wrongs = C_words(cat, it.answer, 3);
      bank = node("div", "bank");
      for (const w of shuffle([it.answer, ...wrongs])) {
        bank.appendChild(button("bank__word", esc(w), () => { field.value = w; field.focus(); }));
      }
      host.appendChild(bank);
    }

    const field = free ? node("textarea", "field") : node("input", "field");
    if (!free) field.type = "text";
    field.setAttribute("autocomplete", "off");
    field.setAttribute("autocapitalize", it.type === "cloze" ? "off" : "sentences");
    field.setAttribute("spellcheck", "false");
    field.setAttribute("aria-label", it.type === "answer" ? it.question : "Your answer");
    host.appendChild(field);

    const out = node("div");
    host.appendChild(out);

    const row = node("div", "row row--end");
    row.style.marginTop = "18px";
    const go = button("btn btn--skill", "Check", check);
    row.appendChild(go);
    host.appendChild(row);

    if (it.type === "spell") setTimeout(() => A.say(it.answer), 280);
    setTimeout(() => field.focus(), 60);
    field.addEventListener("keydown", e => {
      if (e.key === "Enter" && !free) { e.preventDefault(); check(); }
    });

    function accepted(value) {
      const v = norm(value);
      if (!v) return false;
      if (it.type === "answer") return (it.accept || []).some(a => v.includes(norm(a)));
      return v === norm(it.answer);
    }

    async function check() {
      const value = field.value;
      if (accepted(value)) return win();

      misses++;
      field.style.borderColor = SKILL_COLORS.speak;
      A.say("Almost. Try again.");
      face.innerHTML = clara("encouraging");

      if (it.type === "answer") {
        /* Free writing cannot be graded by a static app, and pretending it can
           would tell a learner they are wrong when they are not. Show what was
           expected, and let them say which it was. */
        out.innerHTML =
          '<div class="said">' +
            '<span class="said__clara">' + clara("encouraging", { blink: false }) + "</span>" +
            '<span class="said__text">One good answer starts: <em>' + esc((it.accept || [""])[0]) + "…</em>" +
            "<small>If you meant the same thing in different words, say so — this is not a spelling test.</small></span>" +
          "</div>";
        const marks = node("div", "row");
        marks.style.marginTop = "12px";
        marks.appendChild(button("btn btn--quiet", "I meant that", () => win(true)));
        marks.appendChild(button("btn btn--quiet", "Let me try again", () => {
          out.innerHTML = ""; marks.remove(); field.focus();
        }));
        out.appendChild(marks);
        return;
      }

      out.innerHTML =
        '<div class="said">' +
          '<span class="said__clara">' + clara("encouraging", { blink: false }) + "</span>" +
          '<span class="said__text">Almost. Try again.' +
          (misses >= 2 ? "<small>It starts with “" + esc(String(it.answer).slice(0, Math.ceil(it.answer.length / 2))) + "”</small>" : "") +
          "</span></div>";
      if (misses >= 3) { field.value = it.answer; }        // never a dead end
      field.focus();
    }

    async function win(selfMarked) {
      go.disabled = true;
      field.disabled = true;
      field.style.borderColor = SKILL_COLORS.write;
      face.innerHTML = clara("pleased");
      out.innerHTML =
        '<div class="said">' +
          '<span class="said__clara">' + clara("pleased", { blink: false }) + "</span>" +
          '<span class="said__text">' + (selfMarked ? "Good. Carry on." : "That's right!") + "</span>" +
        "</div>";
      FX.sparkle(field, [SKILL_COLORS.write, SKILL_COLORS.gold, "#FFFFFF"]);
      A.say(selfMarked ? "Nice work!" : "That's right!");
      await sleep(REDUCED ? 400 : 1100);
      resolve({ ok: misses === 0, abandoned: !Mission.ok(token) });
    }
  });
}

/* Bank distractors: other words of a similar length, so the bank is a real
   choice rather than one plausible word beside three obviously wrong ones. */
function C_words(cat, answer, n) {
  const len = String(answer).length;
  const pool = (cat.vocabulary || [])
    .map(v => v.word)
    .concat((cat.writing || []).map(w => w.answer).filter(Boolean))
    .filter(w => w && w !== answer && Math.abs(String(w).length - len) <= 4);
  return sample([...new Set(pool)], n);
}

/* ── entry ────────────────────────────────────────────────────────────────── */

/** One writing item on its own — what the revision engine replays. */
export function single(ctx, it, index, total) {
  return ctx.band.activities.write === "tiles" && it.type === "spell"
    ? tiles(ctx, it, index, total)
    : typed(ctx, it, index, total);
}

export async function run(ctx) {
  const { cat, band, host, vocab, token } = ctx;
  setSkill(skill);

  const items = plan(cat, band, vocab, band.lesson.write);
  const useTiles = band.activities.write === "tiles";
  let right = 0, wrong = 0;

  for (let i = 0; i < items.length; i++) {
    if (!Mission.ok(token)) return { right, wrong, abandoned: true };
    const it = items[i];
    const res = useTiles && it.type === "spell"
      ? await tiles(ctx, it, i, items.length)
      : await typed(ctx, it, i, items.length);
    if (res.abandoned) return { right, wrong, abandoned: true };

    const key = it.answer || it.question || it.sentence;
    if (res.ok) {
      right++;
      if (it.type === "spell") P.right(it.answer);
      P.clearMistake("write|" + cat.id + "|" + key);
    } else {
      wrong++;
      if (it.type === "spell") P.wrong(it.answer);
      P.logMistake({
        skill, cat: cat.id, key,
        prompt: it.sentence || it.question || "Spell: " + it.answer,
        want: it.answer || (it.accept || [])[0],
        kind: it.type
      });
    }
  }

  P.score(skill, cat.id, right, wrong);
  return { right, wrong };
}
