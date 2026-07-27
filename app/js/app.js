/* ═══════════════════════════════════════════════════════════════════════════
   ENGLISH WITH CLARA — router, session, and the lesson itself.

   A lesson is one topic run through all four skills and a quiz. The order is
   input before output: meet the words, listen, read, speak, write, check. That
   is not the order the skills are usually listed in, and it is the order they
   are usually taught in.

   Every band runs the same lesson. What changes is how each activity is
   surfaced — one engine, four surfaces, not four apps.

   Every string a learner reads goes through t(). Everything a learner is
   TAUGHT comes from the content files and never does. That line is the whole
   design: the chrome is theirs, the lesson is English.
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
import { t, lang, setLang, onChange, apply, LANGS, plural, uiClips } from "./i18n.js";
import { diagLines } from "./teacher.js";
import {
  $, on, node, button, rule, esc, stage, sleep, guard, Mission, setSkill, setBand,
  FX, SKILL_COLORS, REDUCED
} from "./ui.js";

/* Labels are read at render time, never cached at module load — the language
   can change under them. */
const ORDER = [
  { key: "listen", mod: Listen },
  { key: "read",   mod: Read },
  { key: "speak",  mod: Speak },
  { key: "write",  mod: Write }
];

let booted = null;
let redraw = null;          // how to repaint the current screen after a change

/* ═══ boot ════════════════════════════════════════════════════════════════ */

(async function start() {
  apply();
  paint($("bar-clara"), "neutral", { blink: false });
  wireChrome();
  try {
    booted = await C.boot();
  } catch (e) {
    stage().appendChild(node("div", "card",
      "<h2>" + esc(t("boot.failed")) + "</h2><p>" + esc(t("boot.help")) +
      " <code>python3 -m http.server --directory app</code></p>"));
    return;
  }
  setBand(P.band() || "11-14");

  /* A link that lands on the review queue, so what you send a reviewer is a
     URL rather than a URL plus instructions for a hidden gesture. */
  if (/[?&]teacher=1/.test(location.search)) { home(); return Teacher.open(); }

  P.lang() ? splash() : askLanguage();
})();

/* ═══ chrome ══════════════════════════════════════════════════════════════ */

function wireChrome() {
  Teacher.init(() => { setBand(P.band() || "11-14"); home(); });
  onChange(() => { apply(); paintStreak(); if (redraw) redraw(); });

  on($("brand"), "click", guard(() => { Mission.bump(); A.stop(); home(); }));

  wireSound();
  wireSettings();

  /* Tap opens Settings; a three second hold opens Teacher. A language toggle
     behind a deliberately hidden gesture would not be findable, which is the
     whole reason the tap now does something. */
  const gear = $("gear");
  let timer = null, held = false;
  const startHold = e => {
    if (e.type === "mousedown" && e.button !== 0) return;
    held = false;
    gear.classList.add("is-holding");
    timer = setTimeout(() => {
      held = true;                                  // and suppress the tap on release
      gear.classList.remove("is-holding");
      Teacher.open();
    }, 3000);
  };
  const endHold = () => { clearTimeout(timer); gear.classList.remove("is-holding"); };
  on(gear, "pointerdown", startHold);
  on(gear, "pointerup", endHold);
  on(gear, "pointerleave", () => { endHold(); held = false; });
  on(gear, "pointercancel", endHold);
  on(gear, "click", () => { if (held) { held = false; return; } openSettings(); });
  on(gear, "contextmenu", e => e.preventDefault());
  gear.setAttribute("aria-label", t("app.gearLabel"));
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
    $("alarm-text").textContent = t(report.state === "running" ? "alarm.noOutput" : "alarm.silent");
    $("alarm-btn").textContent = t("alarm.action");
    $("alarm").hidden = false;
  });
}

function closeSound() { $("sound").hidden = true; }

function openSound() {
  const body = $("sound-body");
  body.innerHTML = "";
  $("sound-h").textContent = t("sound.title");
  $("sound-close").textContent = t("app.close");
  $("sound").hidden = false;

  body.appendChild(node("div", "note", esc(t("sound.intro"))));

  const list = node("ol", "check");
  /* Ordered by how often each one is the answer, not by how clever it is. */
  for (const n of [1, 2, 3, 4, 5]) {
    const li = node("li", null,
      "<b>" + esc(t("sound." + n + ".t")) + "</b>" + esc(t("sound." + n + ".b")));
    li.setAttribute("data-n", n);
    list.appendChild(li);
  }
  body.appendChild(list);

  body.appendChild(node("hr", "hair"));
  body.appendChild(node("h3", null, esc(t("sound.retest"))));
  body.appendChild(node("div", "note", esc(t("sound.retestNote"))));

  const out = node("ul", "diag");
  const row = node("div", "row");
  row.appendChild(button("btn", t("sound.play"), async () => {
    out.innerHTML = "<li><b>…</b><span>" + esc(t("sound.testing")) + "</span></li>";
    await A.load(uiClips());
    const r = await A.probe(t("audio.test"));
    out.innerHTML = diagLines(r);
    if (r.audible === true) {
      $("alarm").hidden = true;
      out.innerHTML += "<li><b>ℹ️</b><span>" + esc(t("sound.ok")) + "</span></li>";
    }
  }));
  body.appendChild(row);
  body.appendChild(out);
}

/* ═══ settings ════════════════════════════════════════════════════════════ */

function wireSettings() {
  on($("settings-close"), "click", closeSettings);
  on($("settings"), "click", e => { if (e.target === $("settings")) closeSettings(); });
  on(document, "keydown", e => { if (e.key === "Escape" && !$("settings").hidden) closeSettings(); });
}

function closeSettings() { $("settings").hidden = true; }

function openSettings() {
  const body = $("settings-body");
  body.innerHTML = "";
  $("settings-h").textContent = t("set.title");
  $("settings-close").textContent = t("app.close");
  $("settings").hidden = false;

  /* Language first. It is the one setting that has to be usable by someone who
     cannot read the rest of the sheet, which is why it is flags. */
  body.appendChild(node("h3", null, esc(t("set.language"))));
  const langRow = node("div", "row");
  for (const l of LANGS) {
    const b = button("btn btn--quiet", l.flag + " " + esc(l.label),
      () => { setLang(l.id); openSettings(); });
    if (lang() === l.id) { b.style.borderColor = "var(--ink)"; b.style.color = "var(--ink)"; }
    langRow.appendChild(b);
  }
  body.appendChild(langRow);
  body.appendChild(node("div", "note", esc(t("set.languageNote"))));

  body.appendChild(node("hr", "hair"));
  body.appendChild(node("h3", null, esc(t("set.band"))));
  const bandRow = node("div", "row");
  for (const bb of C.bands()) {
    const b = button("btn btn--quiet", esc(C.bandAges(bb)) + " · " + esc(C.bandLabel(bb)), () => {
      P.setBand(bb.id);
      setBand(bb.id);
      openSettings();
      if (redraw) redraw();
    });
    if (P.band() === bb.id) { b.style.borderColor = "var(--ink)"; b.style.color = "var(--ink)"; }
    bandRow.appendChild(b);
  }
  body.appendChild(bandRow);
  body.appendChild(node("div", "note", esc(t("set.bandNote"))));

  body.appendChild(node("hr", "hair"));
  body.appendChild(node("h3", null, esc(t("set.level"))));
  const lvlRow = node("div", "row");
  for (let i = 0; i < C.levelCount(); i++) {
    const b = button("btn btn--quiet", esc(C.levelName(i)), () => {
      P.setLevel(i);
      openSettings();
      if (redraw) redraw();
    });
    if (P.level() === i) { b.style.borderColor = "var(--ink)"; b.style.color = "var(--ink)"; }
    lvlRow.appendChild(b);
  }
  body.appendChild(lvlRow);
  body.appendChild(node("div", "note", esc(t("set.levelNote"))));

  const again = node("div", "row");
  again.appendChild(button("btn btn--quiet", t("set.redoPlacement"), () => {
    closeSettings();
    P.unplace();
    placement();
  }));
  body.appendChild(again);

  body.appendChild(node("hr", "hair"));
  body.appendChild(node("h3", null, esc(t("set.sound"))));
  const snd = node("div", "row");
  snd.appendChild(button("btn btn--quiet", t("set.soundGo"), () => { closeSettings(); openSound(); }));
  body.appendChild(snd);

  body.appendChild(node("hr", "hair"));
  body.appendChild(node("h3", null, esc(t("set.teacherGo"))));
  body.appendChild(node("div", "note", esc(t("set.teacherNote"))));
  const tea = node("div", "row");
  tea.appendChild(button("btn btn--quiet", t("set.teacherGo"), () => { closeSettings(); Teacher.open(); }));
  body.appendChild(tea);
}

/* ═══ streak ══════════════════════════════════════════════════════════════ */

function paintStreak() {
  const el = $("streak");
  const s = P.streak();
  if (!s.count) { el.hidden = true; return; }
  el.hidden = false;
  el.className = "streak" + (P.practisedToday() ? " streak--today" : "");
  el.innerHTML = '<span aria-hidden="true">' + (P.practisedToday() ? "✓" : "○") + "</span>" +
                 esc(plural(s.count, "streak.day", "streak.days"));
  el.title = t(P.practisedToday() ? "streak.today" : "streak.notToday");
}

/* ═══ the language question ═══════════════════════════════════════════════ */

/* The one screen that must be readable by someone who has chosen nothing yet.
   So it is flags and two words, and it says nothing else. */
function askLanguage() {
  setSkill("gold");
  redraw = null;
  const wrap = stage();
  wrap.appendChild(node("div", "hero__clara", clara("neutral")));
  wrap.appendChild(node("h1", null, "English with Clara"));
  wrap.appendChild(node("hr", "hair"));

  const grid = node("div", "ages");
  for (const l of LANGS) {
    grid.appendChild(button("age",
      '<span class="age__icon" aria-hidden="true">' + l.flag + "</span>" +
      '<span class="age__label">' + esc(l.label) + "</span>",
      () => { setLang(l.id); splash(); }));
  }
  wrap.appendChild(grid);
}

/* ═══ splash ══════════════════════════════════════════════════════════════ */

function splash() {
  setSkill("gold");
  redraw = splash;
  const wrap = stage();
  wrap.appendChild(node("div", "hero__clara", clara("pleased")));
  wrap.appendChild(node("div", "hero__eyebrow", esc(t("splash.eyebrow"))));
  wrap.appendChild(node("h1", null, "English with Clara"));
  wrap.appendChild(node("p", null, esc(t("splash.blurb"))));
  wrap.appendChild(node("hr", "hair"));

  const row = node("div", "row");
  /* The very first sound has to be started from inside this tap, with nothing
     async in between, or iOS mutes the whole session. */
  row.appendChild(button("btn", t("splash.begin"), () => {
    A.unlock();
    A.load(uiClips()).then(() => A.say(t("audio.begin")));
    P.placed() ? home() : placement();
  }));
  wrap.appendChild(row);

  /* Findable, because the thing it fixes is invisible. The iOS ringer switch
     silences Web Audio while every reading the app can take still says running,
     so there has to be a way in that does not depend on the app noticing. */
  const help = node("div", "row");
  help.style.marginTop = "10px";
  help.appendChild(button("btn btn--quiet", t("splash.noSound"), () => openSound()));
  wrap.appendChild(help);

  wrap.appendChild(node("div", "note", esc(t("splash.teacher"))));
}

/* ═══ placement ═══════════════════════════════════════════════════════════ */

async function placement() {
  redraw = null;
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
  redraw = home;
  setBand(P.band() || "11-14");
  paintStreak();

  const band = C.band(P.band());
  const topics = C.offeredTopics(band.id, P.level());
  const wrap = stage();

  const hero = node("div", "hero");
  hero.appendChild(node("div", "hero__clara", clara(P.practisedToday() ? "pleased" : "neutral")));
  hero.appendChild(node("div", "hero__eyebrow",
    esc(C.bandLabel(band)) + " · " + esc(C.bandAges(band)) + " · " + esc(C.levelName(P.level()))));
  hero.appendChild(node("h1", null, P.lessonsDone() ? greeting() : t("home.pick")));
  hero.appendChild(node("p", null, esc(t(P.practisedToday() ? "home.doneToday" : "home.whatIsALesson"))));
  wrap.appendChild(hero);

  /* A test that is due goes above everything else — it is the only thing in the
     app that unlocks something, and burying it under the picker hides that. */
  const test = Assess.due(band);
  if (test) {
    const final = test.kind === "final";
    const box = node("div", "card");
    box.style.borderLeft = "5px solid " + SKILL_COLORS.gold;
    box.innerHTML =
      "<h3>" + esc(t(final ? "due.final.t" : "due.unit.t")) + "</h3>" +
      "<p style='color:var(--ink-soft);margin:6px 0 14px'>" +
      esc(final ? t("due.final.b", { band: C.bandLabel(band) }) : t("due.unit.b")) + "</p>";
    box.appendChild(button("btn", t(final ? "due.final.go" : "due.unit.go"), guard(() => runTest(test))));
    wrap.appendChild(box);
    wrap.appendChild(node("div", null, "<div style='height:18px'></div>"));
  }

  if (Revise.available()) {
    const weak = P.weakest();
    const box = node("div", "card");
    box.style.borderLeft = "5px solid " + (SKILL_COLORS[weak] || SKILL_COLORS.gold);
    box.innerHTML =
      "<h3>" + esc(weak ? t("rev.card.weak", { skill: t("skill." + weak + ".low") }) : t("rev.card.t")) + "</h3>" +
      "<p style='color:var(--ink-soft);margin:6px 0 14px'>" +
      esc(t("rev.card.b", { n: P.mistakes().length })) + "</p>";
    box.appendChild(button("btn btn--quiet", t("rev.card.go"), guard(runRevision)));
    wrap.appendChild(box);
    wrap.appendChild(node("div", null, "<div style='height:18px'></div>"));
  }

  wrap.appendChild(rule(t("home.topics"), t("home.open", { n: topics.filter(x => x.ready).length })));

  if (!topics.length) {
    wrap.appendChild(node("div", "card",
      "<h3>" + esc(t("home.empty.t")) + "</h3><p>" + esc(t("home.empty.b")) + "</p>"));
  }

  const grid = node("div", "cats");
  for (const topic of topics) grid.appendChild(topicCard(topic));
  wrap.appendChild(grid);

  wrap.appendChild(node("hr", "hair"));
  const foot = node("div", "row");
  foot.appendChild(button("btn btn--quiet", t("home.progress"), progress));
  wrap.appendChild(foot);
}

/**
 * One card, for a topic or a sub-topic. Three states, each meaning one thing:
 *   · ready      — has an approved content file, and opens;
 *   · coming     — declared in topics.json with no file yet. Visible on purpose:
 *                  a learner should be able to see the road ahead. Not tappable;
 *   · invisible  — authored but `reviewed: false`. Never reaches this function
 *                  at all, because an unapproved file does not exist for a
 *                  learner, not even as a wrong answer.
 */
function topicCard(item) {
  const gloss = lang() === "pt" && item.title_pt && item.title_pt !== item.title
    ? '<span class="cat__gloss">' + esc(item.title_pt) + "</span>" : "";

  if (!item.ready) {
    const b = button("cat is-soon",
      '<span class="cat__icon" aria-hidden="true">' + esc(item.icon) + "</span>" +
      '<span class="cat__body">' +
        '<span class="cat__title">' + esc(item.title) + "</span>" + gloss +
        '<span class="cat__meta">' + esc(t("home.soon")) + "</span>" +
      "</span>", null, { disabled: "", "aria-disabled": "true" });
    b.disabled = true;
    return b;
  }

  if (item.kind === "topic") {
    return button("cat",
      '<span class="cat__icon" aria-hidden="true">' + esc(item.icon) + "</span>" +
      '<span class="cat__body">' +
        '<span class="cat__title">' + esc(item.title) + "</span>" + gloss +
        '<span class="cat__meta">' + esc(t("home.subOpen", { n: item.readyCount, m: item.total })) + "</span>" +
      "</span>",
      guard(() => subtopics(item)), { "aria-label": item.title });
  }

  const cat = item.cat;
  const prog = P.catProgress(cat.id);
  return button("cat",
    '<span class="cat__icon" aria-hidden="true">' + esc(item.icon) + "</span>" +
    '<span class="cat__body">' +
      '<span class="cat__title">' + esc(item.title) + "</span>" + gloss +
      '<span class="cat__meta">' + esc(C.levelName(C.levelIndex(cat.cefr))) + " · " +
        esc(t("home.words", { n: (cat.vocabulary || []).length })) +
        (prog && prog.done ? " · " + esc(t("home.doneTimes", { n: prog.done })) : "") + "</span>" +
      (prog ? '<span class="cat__skills">' +
        ["listen", "speak", "read", "write"].map(s =>
          "<i><b style='width:" + Math.round((prog.skills[s] || 0) * 100) + "%'></b></i>").join("") +
        "</span>" : "") +
    "</span>" +
    (prog && prog.done ? '<span class="cat__done" aria-hidden="true">🏅</span>' : ""),
    guard(() => lesson(cat)),
    { "aria-label": item.title });
}

/* ── the sub-topic picker ─────────────────────────────────────────────────── */

function subtopics(topic) {
  Mission.bump();
  setSkill("gold");
  redraw = () => subtopics(topic);
  const wrap = stage();

  const hero = node("div", "hero");
  hero.appendChild(node("div", "hero__eyebrow", esc(t("home.topics"))));
  hero.appendChild(node("h1", null, esc(topic.icon) + " " + esc(topic.title)));
  if (lang() === "pt" && topic.title_pt) hero.appendChild(node("p", null, esc(topic.title_pt)));
  wrap.appendChild(hero);

  wrap.appendChild(rule(t("home.subtopics"),
    t("home.subOpen", { n: topic.readyCount, m: topic.total })));

  const grid = node("div", "cats");
  for (const sub of topic.subtopics) grid.appendChild(topicCard(sub));
  wrap.appendChild(grid);

  wrap.appendChild(node("hr", "hair"));
  const foot = node("div", "row");
  foot.appendChild(button("btn btn--quiet", t("home.back"), guard(home)));
  wrap.appendChild(foot);
}

function greeting() {
  const h = new Date().getHours();
  return t(h < 12 ? "home.morning" : h < 18 ? "home.afternoon" : "home.evening");
}

/* ═══ the lesson ══════════════════════════════════════════════════════════ */

/**
 * Rotate the slice so replaying a topic is not the same six words again, and
 * take only the tier the learner is on. Level is depth inside one file: a
 * sub-topic carries all six tiers, and a lesson draws the matching slice.
 */
function vocabFor(cat, band) {
  const all = C.atLevel(cat.vocabulary || [], P.level());
  const n = Math.min(band.lesson.vocab, all.length);
  if (!n) return [];
  const offset = (P.catDone(cat.id) * n) % Math.max(1, all.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push(all[(offset + i) % all.length]);
  return out;
}

async function lesson(cat) {
  const token = Mission.bump();
  redraw = null;
  const band = C.band(P.band());
  const vocab = vocabFor(cat, band);

  await Promise.all([A.load(cat.id), A.load(uiClips())]);
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

  if (!(await segue({ key: "quiz" }, ORDER.length, cat, band, token))) return;
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
    wrap.appendChild(node("div", "hero__eyebrow", esc(C.levelName(C.levelIndex(cat.cefr)))));
    wrap.appendChild(node("h1", null, esc(cat.icon) + " " + esc(cat.title)));
    if (!silent) {
      /* The goal is written to the learner ABOUT English, so it is interface,
         not content, and it is authored in both languages in the file. */
      wrap.appendChild(node("p", null, esc(C.goal(cat, lang()))));
      const grammar = C.atLevel(cat.grammar || [], P.level());
      if (grammar.length) {
        wrap.appendChild(node("hr", "hair"));
        wrap.appendChild(rule(t("lesson.inThis"), ""));
        for (const g of grammar) {
          /* The point is a note about English, the example IS English. */
          wrap.appendChild(node("div", "mistake",
            "<b>" + esc(lang() === "pt" && g.point_pt ? g.point_pt : g.point) + "</b> " +
            "<em>— " + esc(g.example) + "</em>"));
        }
      }
    }
    wrap.appendChild(node("hr", "hair"));
    const row = node("div", "row row--end");
    row.appendChild(button("btn", silent ? t("app.go") : t("lesson.start"), () => res(Mission.ok(token))));
    wrap.appendChild(row);
    A.say(t("audio.begin"));
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
    "<h2>" + esc(t("skill." + step.key)) + "</h2>" +
    (band.instructions === "none" ? "" : "<p>" + esc(hint(step.key, band)) + "</p>")));
  wrap.appendChild(p);

  if (band.instructions !== "written") A.say(t("audio.now." + step.key));

  await sleep(REDUCED ? 500 : 1400);
  return Mission.ok(token);
}

function hint(key, band) {
  const v = band.activities[key];
  return {
    listen: t(v === "picture" ? "hint.listen.pic" : "hint.listen.text"),
    read: t(v === "match" ? "hint.read.match" : v === "dialogue" ? "hint.read.dlg" : "hint.read.pass"),
    speak: t("hint.speak"),
    write: t(v === "tiles" ? "hint.write.tiles" : v === "bank" ? "hint.write.bank" : "hint.write.type"),
    quiz: t("hint.quiz")
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
      wrap.appendChild(rule(t("lesson.newWords"), i + 1 + " / " + vocab.length));

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
      row.appendChild(button("btn btn--quiet btn--round", "🔊", () => speak(v),
        { "aria-label": t("lesson.again") }));
      const next = button("btn btn--skill",
        silent ? t("app.go") : i === vocab.length - 1 ? t("lesson.ready") : t("app.next"), () => {
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
  if (P.award("first-lesson")) won.push("first-lesson");
  if (P.award("four-skills")) won.push("four-skills");
  if (results.quiz && results.quiz.clean && P.award("clean-quiz")) won.push("clean-quiz");
  if (s.count >= 3 && P.award("streak-3")) won.push("streak-3");
  if (s.count >= 7 && P.award("streak-7")) won.push("streak-7");
  if (P.counts().known >= 50 && P.award("fifty-words")) won.push("fifty-words");

  setSkill("gold");
  redraw = null;
  const wrap = stage();
  const box = node("div", "result");
  box.appendChild(node("div", "result__clara", clara("pleased")));
  box.appendChild(node("h1", null, esc(t("lesson.complete"))));
  box.appendChild(node("p", null, esc(t("lesson.summary", {
    topic: cat.title,
    known: plural(P.counts().known, "home.word", "home.wordsOnly"),
    days: plural(s.count, "streak.day", "streak.days")
  }))));

  const grid = node("div", "result__grid");
  for (const k of ["listen", "read", "speak", "write", "quiz"]) {
    const r = results[k];
    if (!r) continue;
    const cell = node("div", "result__cell");
    cell.setAttribute("data-s", k);
    cell.innerHTML = "<b>" + (k === "speak" ? r.right + "×" : r.right + "/" + (r.right + r.wrong)) + "</b>" +
      "<span>" + esc(t("skill." + k)) + "</span>";
    grid.appendChild(cell);
  }
  box.appendChild(grid);

  if (won.length) {
    const b = node("div", "badges");
    b.style.justifyContent = "center";
    for (const w of won) b.appendChild(node("span", "badge is-won", "🏅 " + esc(t("badge." + w + ".t"))));
    box.appendChild(b);
    box.appendChild(node("div", null, "<div style='height:20px'></div>"));
  }

  const row = node("div", "row");
  row.style.justifyContent = "center";
  row.appendChild(button("btn", t("lesson.another"), guard(() => { FX.clear(); home(); })));
  row.appendChild(button("btn btn--quiet", t("lesson.repeat"), guard(() => { FX.clear(); return lesson(cat); })));
  box.appendChild(row);
  wrap.appendChild(box);

  FX.rain([SKILL_COLORS.gold, SKILL_COLORS.listen, SKILL_COLORS.speak, SKILL_COLORS.read, SKILL_COLORS.write]);
  A.seq([t("audio.complete"), { gap: 200 }, t(won.length ? "audio.badge" : "audio.wellDone")]);
}

/* ═══ tests ═══════════════════════════════════════════════════════════════ */

async function runTest(what) {
  redraw = null;
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
  redraw = null;
  const band = C.band(P.band());
  const r = await Revise.run(band);
  if (r.abandoned) return;
  setSkill("gold");
  const wrap = stage();
  const box = node("div", "result");
  box.appendChild(node("div", "result__clara", clara(r.cleared === r.total ? "pleased" : "encouraging")));
  box.appendChild(node("h1", null,
    esc(r.total ? t("rev.cleared", { n: r.cleared, m: r.total }) : t("rev.nothing"))));
  box.appendChild(node("p", null,
    esc(t(r.cleared === r.total && r.total ? "rev.allClean" : "rev.someLeft"))));
  const row = node("div", "row");
  row.style.justifyContent = "center";
  row.appendChild(button("btn", t("test.home"), guard(home)));
  box.appendChild(row);
  wrap.appendChild(box);
  if (r.cleared === r.total && r.total) FX.rain([SKILL_COLORS.gold, SKILL_COLORS.write, SKILL_COLORS.read]);
}

/* ═══ progress ════════════════════════════════════════════════════════════ */

function progress() {
  Mission.bump();
  setSkill("gold");
  redraw = progress;
  const wrap = stage();
  const acc = P.accuracies();
  const c = P.counts();

  wrap.appendChild(node("div", "hero__eyebrow", esc(t("home.progress"))));
  wrap.appendChild(node("h1", null, esc(t("prog.title"))));
  wrap.appendChild(node("hr", "hair"));

  const stat = (n, label) =>
    node("div", "stat", '<div class="stat__n">' + esc(n) + '</div><div class="stat__l">' + esc(label) + "</div>");

  const stats = node("div", "stats");
  stats.appendChild(stat(c.known, t("prog.known")));
  stats.appendChild(stat(c.learning, t("prog.settling")));
  stats.appendChild(stat(P.lessonsDone(), t("prog.lessons")));
  stats.appendChild(stat(P.streak().count, t("prog.streak")));
  wrap.appendChild(stats);

  wrap.appendChild(node("hr", "hair"));
  wrap.appendChild(rule(t("prog.fourSkills"), t("prog.firstTry")));

  const list = node("div", "skills");
  for (const s of ["listen", "speak", "read", "write"]) {
    const row = node("div", "skillrow");
    row.setAttribute("data-s", s);
    row.appendChild(node("div", "skillrow__name", esc(t("skill." + s))));
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
  wrap.appendChild(node("div", "note", esc(t("prog.speakNote"))));

  wrap.appendChild(node("hr", "hair"));
  wrap.appendChild(rule(t("prog.badges"),
    t("prog.badgeCount", { n: P.badgeCount(), m: C.levels().badges.length })));
  const badges = node("div", "badges");
  for (const b of C.levels().badges) {
    badges.appendChild(node("span", "badge" + (P.hasBadge(b.id) ? " is-won" : ""),
      (P.hasBadge(b.id) ? "🏅 " : "○ ") + esc(t("badge." + b.id + ".t")) +
      (P.hasBadge(b.id) ? "" : " — " + esc(t("badge." + b.id + ".h")))));
  }
  wrap.appendChild(badges);

  wrap.appendChild(node("hr", "hair"));
  const row = node("div", "row");
  row.appendChild(button("btn btn--quiet", t("app.back"), guard(home)));
  if (Revise.available()) row.appendChild(button("btn", t("rev.card.go"), guard(runRevision)));
  wrap.appendChild(row);
}
