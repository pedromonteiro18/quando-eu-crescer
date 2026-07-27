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
import { t, lang, uiClips } from "./i18n.js";

/* An age band can only reach so far up the ladder, and how many rungs you hold
   maps to which of the six levels you start on. Both live in levels.json now:
   the ladder has four rungs and six levels, and the arithmetic between them is
   a decision about the curriculum, not a constant in a router. */

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
      wrap.appendChild(head(t("place.title"), t("place.sub")));
      wrap.appendChild(rule(t("place.label"), t("place.step", { n: 1 })));
      wrap.appendChild(node("h2", null, esc(t("place.age"))));
      wrap.appendChild(node("div", null, "<div style='height:16px'></div>"));

      const grid = node("div", "ages");
      for (const a of cfg.ages) {
        grid.appendChild(button("age",
          '<span class="age__icon" aria-hidden="true">' + esc(a.icon) + "</span>" +
          '<span class="age__label">' + esc(ageLabel(a)) + "</span>",
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
      wrap.appendChild(head(t("place.label"), null));
      wrap.appendChild(rule(t("place.label"), t("place.step", { n: 2 })));

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
      skip.appendChild(button("btn btn--quiet", t("place.dontKnow"), () => askItem(i + 1)));
      wrap.appendChild(skip);
    }

    /* ── result ── */
    function done(rungsPassed) {
      const map = cfg.levelAfterRungs || [];
      const reached = map[Math.min(rungsPassed, map.length - 1)];
      const ceiling = (cfg.ceiling || {})[bandId];
      const level = Math.min(reached == null ? rungsPassed : reached,
                             ceiling == null ? C.levelCount() - 1 : ceiling);
      const b = C.band(bandId);
      const wrap = stage();
      setBand(bandId);

      wrap.appendChild(node("div", "hero__clara", clara("pleased")));
      wrap.appendChild(node("div", "hero__eyebrow", esc(t("place.label"))));
      wrap.appendChild(node("h1", null, esc(t("place.startHere"))));
      wrap.appendChild(node("p", null,
        esc(t(bandId === "4-6" ? "place.youngest" : "place.changeable"))));

      wrap.appendChild(node("hr", "hair"));

      const stats = node("div", "stats");
      stats.appendChild(node("div", "stat",
        '<div class="stat__n">' + esc(C.bandAges(b)) + '</div><div class="stat__l">' +
        esc(t("place.band", { label: C.bandLabel(b) })) + "</div>"));
      stats.appendChild(node("div", "stat",
        '<div class="stat__n">' + esc(C.levelName(level)) + '</div><div class="stat__l">' +
        esc(t("place.level")) + "</div>"));
      stats.appendChild(node("div", "stat",
        '<div class="stat__n">' + C.offered(bandId, level).length + '</div><div class="stat__l">' +
        esc(t("place.openCats")) + "</div>"));
      wrap.appendChild(stats);

      wrap.appendChild(node("div", null, "<div style='height:26px'></div>"));
      const row = node("div", "row row--end");
      row.appendChild(button("btn", t("splash.begin"), () => resolve({ band: bandId, level })));
      wrap.appendChild(row);

      A.load(uiClips()).then(() => A.say(t("audio.begin")));
    }

    function ageLabel(a) { return lang() === "pt" && a.label_pt ? a.label_pt : a.label; }

    function head(title, sub) {
      const p = node("div", "prompt");
      p.appendChild(node("span", "prompt__clara", clara("neutral")));
      p.appendChild(node("div", "prompt__text",
        "<h2>" + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "")));
      return p;
    }
  });
}
