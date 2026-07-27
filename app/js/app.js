/* ═══════════════════════════════════════════════════════════════════════════
   ENGLISH WITH CLARA — router, session, and the lesson itself.

   A lesson is one category run through all four skills and a quiz. The order is
   input before output: meet the words, listen, read, speak, write, check. That
   is not the order the skills are usually listed in, and it is the order they
   are usually taught in.

   Every band runs the same lesson. What changes is how each activity is
   surfaced — one engine, four surfaces, not four apps.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as C from "./content.js";
import * as P from "./progress.js";
import * as A from "./audio.js";
import * as Teacher from "./teacher.js";
import * as Revise from "./revise.js";
import * as Assess from "./assess.js";
import * as Placement from "./placement.js";
import * as Quiz from "./quiz.js";
import * as Listen from "./skills/listen.js";
import * as Read from "./skills/read.js";
import * as Speak from "./skills/speak.js";
import * as Write from "./skills/write.js";
import { clara, paint } from "./clara.js";
import {
  $, on, node, button, rule, esc, stage, sleep, guard, Mission, setSkill, setBand,
  FX, SKILL_COLORS, REDUCED
} from "./ui.js";

const ORDER = [
  { key: "listen", label: "Listening", mod: Listen },
  { key: "read",   label: "Reading",   mod: Read },
  { key: "speak",  label: "Speaking",  mod: Speak },
  { key: "write",  label: "Writing",   mod: Write }
];

let booted = null;

/* ═══ boot ════════════════════════════════════════════════════════════════ */

(async function start() {
  paint($("bar-clara"), "neutral", { blink: false });
  wireChrome();
  try {
    booted = await C.boot();
  } catch (e) {
    stage().appendChild(node("div", "card",
      "<h2>Content did not load.</h2><p>Open this over http, not as a file — " +
      "ES modules and JSON both need it. Try <code>python3 -m http.server --directory app</code>.</p>"));
    return;
  }
  setBand(P.band() || "11-14");
  splash();
})();

/* ═══ chrome ══════════════════════════════════════════════════════════════ */

function wireChrome() {
  Teacher.init(() => { setBand(P.band() || "11-14"); home(); });

  on($("brand"), "click", guard(() => { Mission.bump(); A.stop(); home(); }));

  wireSound();

  /* Press and hold, with a ring that fills. A child taps; a teacher holds. */
  const gear = $("gear");
  let timer = null;
  const startHold = e => {
    if (e.type === "mousedown" && e.button !== 0) return;
    gear.classList.add("is-holding");
    timer = setTimeout(() => { gear.classList.remove("is-holding"); Teacher.open(); }, 3000);
  };
  const endHold = () => { clearTimeout(timer); gear.classList.remove("is-holding"); };
  on(gear, "pointerdown", startHold);
  on(gear, "pointerup", endHold);
  on(gear, "pointerleave", endHold);
  on(gear, "pointercancel", endHold);
  on(gear, "contextmenu", e => e.preventDefault());
}

/* ═══ the sound alarm ═════════════════════════════════════════════════════ */

/* The app cannot hear itself, and neither can someone debugging it from another
   continent. Where silence is measurable it now says so on screen instead of
   leaving a learner tapping a mute button; where it is NOT measurable — the iOS
   ringer switch, which silences Web Audio while every reading still says
   running — the only honest instrument is to ask, which is what the sheet is. */
function wireSound() {
  on($("sound-close"), "click", closeSound);
  on($("sound"), "click", e => { if (e.target === $("sound")) closeSound(); });
  on(document, "keydown", e => { if (e.key === "Escape" && !$("sound").hidden) closeSound(); });
  on($("alarm-btn"), "click", () => openSound());

  A.onSilence(report => {
    $("alarm-text").textContent = report.state === "running"
      ? "Clara is playing, but no sound is coming out."
      : "Clara has gone quiet on this device.";
    $("alarm-btn").textContent = "What to check";
    $("alarm").hidden = false;
  });
}

function closeSound() { $("sound").hidden = true; }

function openSound() {
  const body = $("sound-body");
  body.innerHTML = "";
  $("sound").hidden = false;

  body.appendChild(node("div", "note",
    "Everything below is on the device, not in the app. The app has already checked " +
    "its own side — you can run that check again at the bottom."));

  const list = node("ol", "check");
  const item = (n, title, text) => {
    const li = node("li", null, "<b>" + esc(title) + "</b>" + esc(text));
    li.setAttribute("data-n", n);
    list.appendChild(li);
  };
  /* Ordered by how often each one is the answer, not by how clever it is. */
  item(1, "iPhone: the switch above the volume buttons.",
    "If it shows orange the phone is on silent, and web pages make no sound at all — " +
    "no warning, no error, nothing. Flip it back towards the screen.");
  item(2, "Turn the volume up while this page is open.",
    "The volume keys control whatever is playing at the time. Press them while you are " +
    "looking at this app, not on the home screen.");
  item(3, "Bluetooth.",
    "Sound may be going to headphones, a car or a speaker in another room. Turn Bluetooth " +
    "off and try again.");
  item(4, "A muted tab, on a computer.",
    "Right-click the tab. If it says Unmute site, that is the whole problem.");
  item(5, "Focus, Do Not Disturb, or a low-power mode.",
    "Any of these can hold audio back. Turn them off and reload the page.");
  body.appendChild(list);

  body.appendChild(node("hr", "hair"));
  body.appendChild(node("h3", null, "Test it again"));
  body.appendChild(node("div", "note",
    "Plays a line and reports what really happened, including whether the audio clock " +
    "advanced. Note that a page reporting no errors can still be completely silent — " +
    "that is exactly what the switch in step 1 does."));

  const out = node("ul", "diag");
  const row = node("div", "row");
  row.appendChild(button("btn", "Play the test line", async () => {
    out.innerHTML = "<li><b>…</b><span>testing</span></li>";
    await A.load("ui");
    const r = await A.probe();
    const line = (ok, text) => "<li><b>" + (ok ? "✅" : "❌") + "</b><span>" + esc(text) + "</span></li>";
    out.innerHTML =
      line(r.webAudio, "Web Audio " + (r.webAudio ? "available" : "missing")) +
      line(r.decoded, r.decoded ? "recording decoded (" + r.seconds + "s)" : "no recording decoded") +
      line(r.state === "running", "audio context: " + r.state) +
      line(r.clockAdvanced > 0, "clock advanced " + r.clockAdvanced + "s — this is the proof of output") +
      (r.error ? line(false, r.error) : "");
    if (r.audible === true) {
      $("alarm").hidden = true;
      out.innerHTML += "<li><b>ℹ️</b><span>The app's own side is working. If you still hear " +
        "nothing, it is one of the five above.</span></li>";
    }
  }));
  body.appendChild(row);
  body.appendChild(out);
}

function paintStreak() {
  const el = $("streak");
  const s = P.streak();
  if (!s.count) { el.hidden = true; return; }
  el.hidden = false;
  el.className = "streak" + (P.practisedToday() ? " streak--today" : "");
  el.innerHTML = '<span aria-hidden="true">' + (P.practisedToday() ? "✓" : "○") + "</span>" +
                 s.count + (s.count === 1 ? " day" : " days");
  el.title = P.practisedToday() ? "Practised today" : "Not practised today";
}

/* ═══ splash ══════════════════════════════════════════════════════════════ */

function splash() {
  setSkill("gold");
  const wrap = stage();
  wrap.appendChild(node("div", "hero__clara", clara("pleased")));
  wrap.appendChild(node("div", "hero__eyebrow", "Listening · Speaking · Reading · Writing"));
  wrap.appendChild(node("h1", null, "English with Clara"));
  wrap.appendChild(node("p", null,
    "Every lesson uses all four skills. No translation anywhere — not in the lessons, " +
    "not in the buttons. Everything stays on this device."));
  wrap.appendChild(node("hr", "hair"));

  const row = node("div", "row");
  /* The very first sound has to be started from inside this tap, with nothing
     async in between, or iOS mutes the whole session. */
  row.appendChild(button("btn", "Begin →", () => {
    A.unlock();
    A.load("ui").then(() => A.say("Let's begin."));
    P.placed() ? home() : placement();
  }));
  wrap.appendChild(row);

  /* Findable, because the thing it fixes is invisible. The iOS ringer switch
     silences Web Audio while every reading the app can take still says running,
     so there has to be a way in that does not depend on the app noticing. */
  const help = node("div", "row");
  help.style.marginTop = "10px";
  help.appendChild(button("btn btn--quiet", "🔇 No sound?", () => openSound()));
  wrap.appendChild(help);

  wrap.appendChild(node("div", "note",
    "Hold the ⚙ for three seconds for the teacher area and progress."));
}

/* ═══ placement ═══════════════════════════════════════════════════════════ */

async function placement() {
  const r = await Placement.run();
  P.place(r.band, r.level);
  setBand(r.band);
  home();
}

/* ═══ home ════════════════════════════════════════════════════════════════ */

function home() {
  Mission.bump();
  A.stop();
  setSkill("gold");
  setBand(P.band() || "11-14");
  paintStreak();

  const band = C.band(P.band());
  const cats = C.offered(band.id, P.level());
  const wrap = stage();

  const hero = node("div", "hero");
  hero.appendChild(node("div", "hero__clara", clara(P.practisedToday() ? "pleased" : "neutral")));
  hero.appendChild(node("div", "hero__eyebrow", band.label + " · " + band.ages + " · " + C.cefrName(P.level())));
  hero.appendChild(node("h1", null, P.lessonsDone() ? greeting() : "Pick something to learn."));
  hero.appendChild(node("p", null, P.practisedToday()
    ? "You have practised today. Anything more is a bonus."
    : "One category is one lesson: listening, reading, speaking, writing, then a quiz."));
  wrap.appendChild(hero);

  /* A test that is due goes above everything else — it is the only thing in the
     app that unlocks something, and burying it under the picker hides that. */
  const test = Assess.due(band);
  if (test) {
    const box = node("div", "card");
    box.style.borderLeft = "5px solid " + SKILL_COLORS.gold;
    box.innerHTML =
      "<h3>" + (test.kind === "final" ? "Ready for the next level?" : "A quick check.") + "</h3>" +
      "<p style='color:var(--ink-soft);margin:6px 0 14px'>" +
      (test.kind === "final"
        ? "You have finished every category in " + esc(band.label) +
          ". Pass the assessment and the next band opens."
        : "A short mixed test across the categories you have done. Nothing is marked.") + "</p>";
    box.appendChild(button("btn", (test.kind === "final" ? "Take the assessment" : "Start the check") + " →",
      guard(() => runTest(test))));
    wrap.appendChild(box);
    wrap.appendChild(node("div", null, "<div style='height:18px'></div>"));
  }

  if (Revise.available()) {
    const weak = P.weakest();
    const box = node("div", "card");
    box.style.borderLeft = "5px solid " + (SKILL_COLORS[weak] || SKILL_COLORS.gold);
    box.innerHTML =
      "<h3>" + (weak ? "Your " + weak.replace("listen", "listening").replace("read", "reading")
                            .replace("write", "writing").replace("speak", "speaking") + " is behind."
                     : "Go back over what you missed.") + "</h3>" +
      "<p style='color:var(--ink-soft);margin:6px 0 14px'>" +
      P.mistakes().length + " logged, plus the words you have met but not settled.</p>";
    box.appendChild(button("btn btn--quiet", "Revise →", guard(runRevision)));
    wrap.appendChild(box);
    wrap.appendChild(node("div", null, "<div style='height:18px'></div>"));
  }

  wrap.appendChild(rule("Categories", cats.length + " open"));

  if (!cats.length) {
    wrap.appendChild(node("div", "card",
      "<h3>Nothing to show yet.</h3><p>Every category is still waiting for review. " +
      "Hold the ⚙ to see what is queued.</p>"));
  }

  const grid = node("div", "cats");
  for (const cat of cats) {
    const prog = P.catProgress(cat.id);
    const b = button("cat",
      '<span class="cat__icon" aria-hidden="true">' + esc(cat.icon) + "</span>" +
      '<span class="cat__body">' +
        '<span class="cat__title">' + esc(cat.title) + "</span>" +
        '<span class="cat__meta">' + esc(cat.cefr) + " · " + (cat.vocabulary || []).length + " words" +
          (prog && prog.done ? " · done " + prog.done + "×" : "") + "</span>" +
        (prog ? '<span class="cat__skills">' +
          ["listen", "speak", "read", "write"].map(s =>
            "<i><b style='width:" + Math.round((prog.skills[s] || 0) * 100) + "%'></b></i>").join("") +
          "</span>" : "") +
      "</span>" +
      (prog && prog.done ? '<span class="cat__done" aria-hidden="true">🏅</span>' : ""),
      guard(() => lesson(cat)),
      { "aria-label": cat.title + ", " + cat.cefr });
    grid.appendChild(b);
  }
  wrap.appendChild(grid);

  wrap.appendChild(node("hr", "hair"));
  const foot = node("div", "row");
  foot.appendChild(button("btn btn--quiet", "Progress", progress));
  wrap.appendChild(foot);
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
}

/* ═══ the lesson ══════════════════════════════════════════════════════════ */

/** Rotate the slice so replaying a category is not the same six words again. */
function vocabFor(cat, band) {
  const all = cat.vocabulary || [];
  const n = Math.min(band.lesson.vocab, all.length);
  const offset = (P.catDone(cat.id) * n) % Math.max(1, all.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push(all[(offset + i) % all.length]);
  return out;
}

async function lesson(cat) {
  const token = Mission.bump();
  const band = C.band(P.band());
  const vocab = vocabFor(cat, band);

  await A.load(cat.id);
  A.warm(cat.id);                       // decode the rest quietly in the background
  if (!Mission.ok(token)) return;

  const results = {};

  if (!(await intro(cat, band, token))) return;
  if (!(await meetWords(cat, band, vocab, token))) return;

  for (let i = 0; i < ORDER.length; i++) {
    if (!Mission.ok(token)) return;
    const step = ORDER[i];
    if (!(await segue(step, i, cat, band, token))) return;

    const host = stage();
    host.appendChild(segments(i));
    const slot = node("div");
    host.appendChild(slot);

    const r = await step.mod.run({ cat, band, host: slot, vocab, token });
    if (r.abandoned || !Mission.ok(token)) return;
    results[step.key] = r;
  }

  if (!(await segue({ key: "quiz", label: "Quiz" }, ORDER.length, cat, band, token))) return;
  const host = stage();
  host.appendChild(segments(ORDER.length));
  const slot = node("div");
  host.appendChild(slot);
  const q = await Quiz.run({ cat, band, host: slot, vocab, token });
  if (q.abandoned || !Mission.ok(token)) return;
  results.quiz = q;

  finish(cat, band, vocab, results, token);
}

function segments(done) {
  const box = node("div", "seg");
  const keys = ORDER.map(s => s.key).concat("quiz");
  keys.forEach((k, i) => {
    const part = node("div", "seg__part");
    part.setAttribute("data-s", k);
    const b = node("b");
    b.style.width = i < done ? "100%" : i === done ? "50%" : "0";
    part.appendChild(b);
    box.appendChild(part);
  });
  return box;
}

function intro(cat, band, token) {
  return new Promise(res => {
    setSkill("gold");
    const wrap = stage();
    const silent = band.instructions === "none";

    wrap.appendChild(node("div", "hero__clara", clara("pleased")));
    wrap.appendChild(node("div", "hero__eyebrow", esc(cat.cefr)));
    wrap.appendChild(node("h1", null, esc(cat.icon) + " " + esc(cat.title)));
    if (!silent) {
      wrap.appendChild(node("p", null, esc(cat.goal || "")));
      if ((cat.grammar || []).length) {
        wrap.appendChild(node("hr", "hair"));
        wrap.appendChild(rule("In this lesson", ""));
        for (const g of cat.grammar) {
          wrap.appendChild(node("div", "mistake",
            "<b>" + esc(g.point) + "</b> <em>— " + esc(g.example) + "</em>"));
        }
      }
    }
    wrap.appendChild(node("hr", "hair"));
    const row = node("div", "row row--end");
    row.appendChild(button("btn", silent ? "→" : "Start the lesson →", () => res(Mission.ok(token))));
    wrap.appendChild(row);
    A.say("Let's begin.");
  });
}

/** A beat between skills, so the colour change registers as a change. */
async function segue(step, index, cat, band, token) {
  setSkill(step.key === "quiz" ? "gold" : step.key);
  const wrap = stage();
  wrap.appendChild(segments(index));
  const p = node("div", "prompt");
  p.appendChild(node("span", "prompt__clara", clara("neutral")));
  p.appendChild(node("div", "prompt__text",
    "<h2>" + esc(step.label) + "</h2>" +
    (band.instructions === "none" ? "" : "<p>" + esc(hint(step.key, band)) + "</p>")));
  wrap.appendChild(p);

  const line = { listen: "Now, let's listen.", read: "Now, let's read.",
                 speak: "Now, let's speak.", write: "Now, let's write.", quiz: "Choose the answer." }[step.key];
  if (band.instructions !== "written") A.say(line);

  await sleep(REDUCED ? 500 : 1400);
  return Mission.ok(token);
}

function hint(key, band) {
  const v = band.activities[key];
  return {
    listen: v === "picture" ? "Hear a word, tap the picture." : "Hear a line, choose the one you heard.",
    read: v === "match" ? "Match each word to its picture." : v === "dialogue" ? "Read the conversation, then answer." : "Read the text, then answer. It stays on screen.",
    speak: "Hear Clara, then record yourself and compare. Nothing is scored and nothing is sent anywhere.",
    write: v === "tiles" ? "Tap the letters in order." : v === "bank" ? "Type it, or tap a word from the bank." : "Type your answer.",
    quiz: "Last page. It cannot be failed."
  }[key] || "";
}

/* ── meeting the words ────────────────────────────────────────────────────── */

function meetWords(cat, band, vocab, token) {
  return new Promise(res => {
    setSkill("listen");
    let i = 0;
    const silent = band.instructions === "none";
    draw();

    function draw() {
      const v = vocab[i];
      P.seen(v.word);
      const wrap = stage();
      wrap.appendChild(rule("New words", i + 1 + " / " + vocab.length));

      const card = node("div", "card word");
      card.appendChild(node("div", "word__icon", '<span aria-hidden="true">' + esc(v.icon || cat.icon) + "</span>"));
      card.appendChild(node("div", "word__text", esc(v.word)));
      if (!silent && v.example) card.appendChild(node("div", "word__example", esc(v.example)));

      const pips = node("div", "pips");
      for (let k = 0; k < vocab.length; k++) {
        pips.appendChild(node("i", k < i ? "is-done" : k === i ? "is-now" : ""));
      }
      card.appendChild(pips);
      wrap.appendChild(card);

      const row = node("div", "row row--between");
      row.style.marginTop = "18px";
      row.appendChild(button("btn btn--quiet btn--round", "🔊", () => speak(v), { "aria-label": "Say it again" }));
      const next = button("btn btn--skill", silent ? "→" : i === vocab.length - 1 ? "Ready →" : "Next →", () => {
        if (i === vocab.length - 1) return res(Mission.ok(token));
        i++;
        draw();
      });
      if (silent) next.appendChild(node("span", "hand", "👆"));
      row.appendChild(next);
      wrap.appendChild(row);

      setTimeout(() => speak(v), 300);
    }

    function speak(v) {
      A.seq(v.example && !silent ? [v.word, { gap: 380 }, v.example] : [v.word]);
    }
  });
}

/* ── the end ──────────────────────────────────────────────────────────────── */

function finish(cat, band, vocab, results, token) {
  P.finishLesson(cat.id);
  const s = P.touchDay();
  paintStreak();

  const won = [];
  if (P.award("first-lesson")) won.push("First lesson");
  if (P.award("four-skills")) won.push("All four skills");
  if (results.quiz && results.quiz.clean && P.award("clean-quiz")) won.push("Perfect quiz");
  if (s.count >= 3 && P.award("streak-3")) won.push("Three days");
  if (s.count >= 7 && P.award("streak-7")) won.push("Seven days");
  if (P.counts().known >= 50 && P.award("fifty-words")) won.push("Fifty words");

  setSkill("gold");
  const wrap = stage();
  const box = node("div", "result");
  box.appendChild(node("div", "result__clara", clara("pleased")));
  box.appendChild(node("h1", null, "Lesson complete."));
  const known = P.counts().known;
  box.appendChild(node("p", null, esc(cat.title) + " · " + known + (known === 1 ? " word" : " words") + " known · " +
    s.count + (s.count === 1 ? " day" : " days") + " in a row"));

  const grid = node("div", "result__grid");
  for (const k of ["listen", "read", "speak", "write", "quiz"]) {
    const r = results[k];
    if (!r) continue;
    const cell = node("div", "result__cell");
    cell.setAttribute("data-s", k);
    cell.innerHTML = "<b>" + (k === "speak" ? r.right + "×" : r.right + "/" + (r.right + r.wrong)) + "</b>" +
      "<span>" + { listen: "Listening", read: "Reading", speak: "Speaking", write: "Writing", quiz: "Quiz" }[k] + "</span>";
    grid.appendChild(cell);
  }
  box.appendChild(grid);

  if (won.length) {
    const b = node("div", "badges");
    b.style.justifyContent = "center";
    for (const w of won) b.appendChild(node("span", "badge is-won", "🏅 " + esc(w)));
    box.appendChild(b);
    box.appendChild(node("div", null, "<div style='height:20px'></div>"));
  }

  const row = node("div", "row");
  row.style.justifyContent = "center";
  row.appendChild(button("btn", "Choose another →", guard(() => { FX.clear(); home(); })));
  row.appendChild(button("btn btn--quiet", "Again", guard(() => { FX.clear(); return lesson(cat); })));
  box.appendChild(row);
  wrap.appendChild(box);

  FX.rain([SKILL_COLORS.gold, SKILL_COLORS.listen, SKILL_COLORS.speak, SKILL_COLORS.read, SKILL_COLORS.write]);
  A.seq(["Lesson complete!", { gap: 200 }, won.length ? "Here is your badge." : "Well done!"]);
}

/* ═══ tests ═══════════════════════════════════════════════════════════════ */

async function runTest(what) {
  const r = await Assess.run(what);
  if (!r || r.declined) return home();
  Assess.result(r, guard(() => { FX.clear(); home(); }), guard(id => {
    /* Moving up is offered, never forced. A learner who is comfortable where
       they are should be allowed to stay there. */
    P.setBand(id);
    setBand(id);
    FX.clear();
    home();
  }));
}

/* ═══ revision ════════════════════════════════════════════════════════════ */

async function runRevision() {
  const band = C.band(P.band());
  const r = await Revise.run(band);
  if (r.abandoned) return;
  setSkill("gold");
  const wrap = stage();
  const box = node("div", "result");
  box.appendChild(node("div", "result__clara", clara(r.cleared === r.total ? "pleased" : "encouraging")));
  box.appendChild(node("h1", null, r.total ? r.cleared + " of " + r.total + " cleared." : "Nothing to revise."));
  box.appendChild(node("p", null, r.cleared === r.total && r.total
    ? "All of it, first time. Those are off the list."
    : "Whatever is still wrong stays on the list and will come back."));
  const row = node("div", "row");
  row.style.justifyContent = "center";
  row.appendChild(button("btn", "Home →", guard(home)));
  box.appendChild(row);
  wrap.appendChild(box);
  if (r.cleared === r.total && r.total) FX.rain([SKILL_COLORS.gold, SKILL_COLORS.write, SKILL_COLORS.read]);
}

/* ═══ progress ════════════════════════════════════════════════════════════ */

function progress() {
  Mission.bump();
  setSkill("gold");
  const wrap = stage();
  const acc = P.accuracies();
  const c = P.counts();

  wrap.appendChild(node("div", "hero__eyebrow", "Progress"));
  wrap.appendChild(node("h1", null, "Where you are."));
  wrap.appendChild(node("hr", "hair"));

  const stats = node("div", "stats");
  stats.appendChild(node("div", "stat", '<div class="stat__n">' + c.known + '</div><div class="stat__l">Words known</div>'));
  stats.appendChild(node("div", "stat", '<div class="stat__n">' + c.learning + '</div><div class="stat__l">Still settling</div>'));
  stats.appendChild(node("div", "stat", '<div class="stat__n">' + P.lessonsDone() + '</div><div class="stat__l">Lessons</div>'));
  stats.appendChild(node("div", "stat", '<div class="stat__n">' + P.streak().count + '</div><div class="stat__l">Day streak</div>'));
  wrap.appendChild(stats);

  wrap.appendChild(node("hr", "hair"));
  wrap.appendChild(rule("The four skills", "first-try accuracy"));

  const list = node("div", "skills");
  const names = { listen: "Listening", speak: "Speaking", read: "Reading", write: "Writing" };
  for (const s of ["listen", "speak", "read", "write"]) {
    const row = node("div", "skillrow");
    row.setAttribute("data-s", s);
    row.appendChild(node("div", "skillrow__name", names[s]));
    const bar = node("div", "skillrow__bar");
    const fill = node("b");
    fill.style.width = (acc[s] === null ? 0 : Math.round(acc[s] * 100)) + "%";
    bar.appendChild(fill);
    row.appendChild(bar);
    row.appendChild(node("div", "skillrow__num",
      s === "speak" ? (P.state().skills.speak.done || 0) + "×" : acc[s] === null ? "—" : Math.round(acc[s] * 100) + "%"));
    list.appendChild(row);
  }
  wrap.appendChild(list);
  wrap.appendChild(node("div", "note",
    "Speaking is counted, not scored. There is no pronunciation mark anywhere in this app, on purpose."));

  wrap.appendChild(node("hr", "hair"));
  wrap.appendChild(rule("Badges", P.badgeCount() + " of " + C.levels().badges.length));
  const badges = node("div", "badges");
  for (const b of C.levels().badges) {
    badges.appendChild(node("span", "badge" + (P.hasBadge(b.id) ? " is-won" : ""),
      (P.hasBadge(b.id) ? "🏅 " : "○ ") + esc(b.title) +
      (P.hasBadge(b.id) ? "" : " — " + esc(b.hint))));
  }
  wrap.appendChild(badges);

  wrap.appendChild(node("hr", "hair"));
  const row = node("div", "row");
  row.appendChild(button("btn btn--quiet", "← Home", guard(home)));
  if (Revise.available()) row.appendChild(button("btn", "Revise →", guard(runRevision)));
  wrap.appendChild(row);
}
