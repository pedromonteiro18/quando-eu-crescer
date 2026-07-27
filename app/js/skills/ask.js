/* ═══════════════════════════════════════════════════════════════════════════
   ASK — the one question card every skill uses.

   Same shape everywhere so a learner only has to understand it once, and the
   colour tells them which skill they are in. Rules carried over from the
   prototype and applied to every band:

     · no score, no lives, no red, no countdown;
     · a wrong tap fades and wobbles, and Clara looks encouraging, not
       disappointed. Nothing about being wrong is punished;
     · the question does not end until it is answered right, so a lesson always
       finishes — but only a FIRST-TRY answer counts as knowing it. That is
       what feeds the word buckets and the mistake log;
     · after `hintAfter` misses the right answer is marked. For the youngest
       band that is one miss, which is what makes a lesson completable by a
       four year old with no instructions and no reading.
   ═══════════════════════════════════════════════════════════════════════════ */

import { node, button, esc, sleep, shuffle, LETTERS, FX, SKILL_COLORS, REDUCED, Mission } from "../ui.js";
import * as A from "../audio.js";
import { clara } from "../clara.js";

const PRAISE = ["Good job!", "Well done!", "That's right!", "Perfect!", "Nice work!"];

/**
 * @param {object} o
 * @param {HTMLElement} o.host        where to render
 * @param {object}      o.band        band config
 * @param {string}      o.skill       listen | speak | read | write | quiz
 * @param {string}      [o.question]  written question, omitted for the silent band
 * @param {string}      [o.sub]       small line under the question
 * @param {string}      [o.playLabel] turns the prompt into a big play button
 * @param {string}      [o.audio]     the line to speak, and to replay
 * @param {Array}       o.options     [{icon}] or [{label}]
 * @param {number}      o.answer      index of the right one
 * @param {string}      [o.layout]    "pics" | "text"
 * @param {number}      o.token       mission token; a stale card resolves false
 * @returns {Promise<{first: boolean, attempts: number, abandoned?: boolean}>}
 */
export function ask(o) {
  return new Promise(resolve => {
    const { host, band, skill, options, answer, token } = o;
    const layout = o.layout || (options[0] && options[0].icon ? "pics" : "text");
    const silent = band.instructions === "none";
    const hintAfter = band.hintAfter == null ? 2 : band.hintAfter;
    let attempts = 0, settled = false;

    host.innerHTML = "";
    const wrap = node("div", "fade");
    host.appendChild(wrap);

    /* ── the prompt ── */
    const claraBox = node("span", "prompt__clara", clara("neutral"));

    if (o.playLabel !== undefined) {
      const play = button("play", '<span class="play__icon" aria-hidden="true">🔊</span>' +
        (silent ? "" : '<span class="play__label">' + esc(o.playLabel || "Listen") + "</span>"),
        () => speakPrompt(), { "aria-label": "Play the sound again" });
      wrap.appendChild(play);
      if (silent && attempts === 0) play.appendChild(node("span", "hand", "👆"));
      var playBtn = play;
    }

    if (!silent && o.question) {
      const p = node("div", "prompt");
      p.appendChild(claraBox);
      p.appendChild(node("div", "prompt__text",
        "<h2>" + esc(o.question) + "</h2>" + (o.sub ? "<p>" + esc(o.sub) + "</p>" : "")));
      wrap.appendChild(p);
    }

    /* ── the options ── */
    const grid = node("div", "opts opts--" + layout);
    const btns = options.map((opt, i) => {
      const b = button(
        "opt opt--" + (layout === "pics" ? "pic" : "text"),
        layout === "pics"
          ? '<span aria-hidden="true">' + esc(opt.icon) + "</span>"
          : '<span class="opt__key" aria-hidden="true">' + LETTERS[i] + "</span>" +
            "<span>" + esc(opt.label) + "</span>",
        () => choose(i),
        { "aria-label": opt.label || opt.word || "option " + (i + 1) }
      );
      grid.appendChild(b);
      return b;
    });
    wrap.appendChild(grid);

    const feedback = node("div");
    wrap.appendChild(feedback);

    /* ── behaviour ── */
    function speakPrompt() {
      if (!o.audio) return;
      if (playBtn) {
        playBtn.classList.add("is-playing");
        const hand = playBtn.querySelector(".hand");
        if (hand) hand.remove();
      }
      A.say(o.audio).then(() => playBtn && playBtn.classList.remove("is-playing"));
    }
    if (o.audio) setTimeout(speakPrompt, 260);

    async function choose(i) {
      if (settled) return;
      const b = btns[i];
      if (b.disabled) return;

      if (i === answer) {
        settled = true;
        btns.forEach(x => { x.disabled = true; });
        b.classList.add("is-right");
        FX.sparkle(b, [SKILL_COLORS[skill] || SKILL_COLORS.gold, SKILL_COLORS.gold, "#FFFFFF"]);
        say(claraBox, "pleased");
        const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
        if (!silent) show(feedback, "pleased", praise, o.after);
        A.seq([praise]);
        await sleep(REDUCED ? 380 : attempts === 0 ? 900 : 1500);
        if (!Mission.ok(token)) return resolve({ first: false, attempts, abandoned: true });
        resolve({ first: attempts === 0, attempts });
        return;
      }

      attempts++;
      b.classList.add("is-wrong");
      b.disabled = true;
      say(claraBox, "encouraging");
      if (!silent) show(feedback, "encouraging", "Almost. Try again.");
      A.say(hintAfter && attempts >= hintAfter ? "Not quite. Here it is." : "Almost. Try again.");
      if (hintAfter && attempts >= hintAfter) btns[answer].classList.add("is-show");
      if (o.audio) setTimeout(speakPrompt, 700);
    }

    function say(box, expression) {
      if (box) box.innerHTML = clara(expression);
    }

    function show(host2, expression, text, extra) {
      host2.innerHTML =
        '<div class="said">' +
          '<span class="said__clara">' + clara(expression, { blink: false }) + "</span>" +
          '<span class="said__text">' + esc(text) +
            (extra ? "<small>" + esc(extra) + "</small>" : "") +
          "</span>" +
        "</div>";
    }
  });
}

/** Shuffle options and keep track of where the right one ended up. */
export function scramble(correct, wrongs) {
  const all = shuffle([correct, ...wrongs]);
  return { options: all, answer: all.indexOf(correct) };
}
