/* ═══════════════════════════════════════════════════════════════════════════
   PLACEMENT

   Two different questions get asked, because they are two different questions
   and conflating them puts people in the wrong place:

     · HOW OLD ARE YOU decides the BAND, which is presentation — type size, tap
       targets, whether writing means letter tiles or a free paragraph, whether
       anything is explained at all.
     · A LADDER OF GRAMMAR ITEMS decides the LEVEL, which is content — which
       categories are worth offering.

   An adult beginner needs A1 content without letter tiles. A confident nine
   year old needs harder content without being handed phrasal verbs. Neither is
   expressible if band and level are the same number, so they are not.

   The four to six band is not tested at all. There is no written question you
   can put to a Brazilian four year old in English that measures anything
   except whether an adult is sitting next to them.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as C from "./content.js";
import { node, button, rule, esc, stage, setSkill, setBand, sleep } from "./ui.js";
import { clara } from "./clara.js";
import * as A from "./audio.js";

/* An age band can only reach so far up the ladder. A lucky run of three
   guesses should not put a child into adult content. */
const CEILING = { "4-6": 1, "7-10": 2, "11-14": 3, "15+": 4 };

export function run() {
  return new Promise(resolve => {
    setSkill("gold");
    const cfg = C.levels().placement;
    let bandId = null;
    let rung = 0, correctHere = 0, passed = 0;

    askAge();

    /* ── 1. age ── */
    function askAge() {
      const wrap = stage();
      wrap.appendChild(head("Let's find the right place to start.", "Two quick questions. Nothing here is a test you can fail."));
      wrap.appendChild(rule("Placement", "1 of 2"));
      wrap.appendChild(node("h2", null, "How old is the learner?"));
      wrap.appendChild(node("div", null, "<div style='height:16px'></div>"));

      const grid = node("div", "ages");
      for (const a of cfg.ages) {
        grid.appendChild(button("age",
          '<span class="age__icon" aria-hidden="true">' + esc(a.icon) + "</span>" +
          '<span class="age__label">' + esc(a.label) + "</span>",
          () => {
            bandId = a.band;
            setBand(bandId);
            if (bandId === "4-6") return done(0);      // nothing to test, and nothing gained by trying
            nextRung();
          }));
      }
      wrap.appendChild(grid);
    }

    /* ── 2. the ladder ── */
    function nextRung() {
      correctHere = 0;
      askItem(0);
    }

    function askItem(i) {
      const r = cfg.rungs[rung];
      if (!r) return done(passed);
      const q = r.items[i];
      if (!q) {
        /* Rung finished. Pass and climb, or stop here — the first rung they
           cannot hold is the level, so there is no point going further. */
        if (correctHere >= cfg.passPerRung) {
          passed++;
          rung++;
          if (rung >= cfg.rungs.length) return done(passed);
          return nextRung();
        }
        return done(passed);
      }

      const wrap = stage();
      wrap.appendChild(head("Placement", null));
      wrap.appendChild(rule("Placement", "2 of 2"));

      const bar = node("div", "ladder");
      for (let k = 0; k < cfg.rungs.length; k++) {
        bar.appendChild(node("i", k < rung ? "is-done" : k === rung ? "is-now" : ""));
      }
      wrap.appendChild(bar);

      wrap.appendChild(node("h2", null, esc(q.q)));
      wrap.appendChild(node("div", null, "<div style='height:18px'></div>"));

      const grid = node("div", "opts opts--text");
      /* Options are NOT shuffled here: the ladder is scored, and a stable
         order keeps the test identical for every learner who takes it. */
      q.options.forEach((opt, k) => {
        grid.appendChild(button("opt opt--text",
          '<span class="opt__key" aria-hidden="true">' + "ABC"[k] + "</span><span>" + esc(opt) + "</span>",
          () => {
            if (k === q.answer) correctHere++;
            askItem(i + 1);
          }));
      });
      wrap.appendChild(grid);

      wrap.appendChild(node("hr", "hair"));
      const skip = node("div", "row row--end");
      skip.appendChild(button("btn btn--quiet", "I don't know", () => askItem(i + 1)));
      wrap.appendChild(skip);
    }

    /* ── result ── */
    function done(rungsPassed) {
      const level = Math.min(rungsPassed, CEILING[bandId] == null ? 4 : CEILING[bandId]);
      const b = C.band(bandId);
      const wrap = stage();
      setBand(bandId);

      wrap.appendChild(node("div", "hero__clara", clara("pleased")));
      wrap.appendChild(node("div", "hero__eyebrow", "Placement"));
      wrap.appendChild(node("h1", null, "Start here."));
      wrap.appendChild(node("p", null,
        bandId === "4-6"
          ? "Everything is pictures and sound. Nothing needs reading, and nothing is explained — Clara shows the first one and the rest follows."
          : "You can change this at any time in the teacher area."));

      wrap.appendChild(node("hr", "hair"));

      const stats = node("div", "stats");
      stats.appendChild(node("div", "stat",
        '<div class="stat__n">' + esc(b.ages) + '</div><div class="stat__l">Band · ' + esc(b.label) + "</div>"));
      stats.appendChild(node("div", "stat",
        '<div class="stat__n">' + esc(C.cefrName(level)) + '</div><div class="stat__l">Starting level</div>'));
      stats.appendChild(node("div", "stat",
        '<div class="stat__n">' + C.offered(bandId, level).length + '</div><div class="stat__l">Categories open</div>'));
      wrap.appendChild(stats);

      wrap.appendChild(node("div", null, "<div style='height:26px'></div>"));
      const row = node("div", "row row--end");
      row.appendChild(button("btn", "Begin →", () => resolve({ band: bandId, level })));
      wrap.appendChild(row);

      A.say("Let's begin.");
    }

    function head(title, sub) {
      const p = node("div", "prompt");
      p.appendChild(node("span", "prompt__clara", clara("neutral")));
      p.appendChild(node("div", "prompt__text",
        "<h2>" + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "")));
      return p;
    }
  });
}
