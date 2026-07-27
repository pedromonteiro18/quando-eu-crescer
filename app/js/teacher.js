/* ═══════════════════════════════════════════════════════════════════════════
   TEACHER — behind a three second press and hold on the gear.

   Holds the other half of the review gate. The learner sees only categories
   where `reviewed` is true; this view shows every file there is, and flags the
   ones that have not been approved. That is the whole mechanism, and it is the
   one place a reviewer can see what is waiting for them.

   It also holds the audio self-test, because the app cannot hear itself and
   neither can someone debugging it from another continent. "No errors" is not
   the same as "you heard it" — that mistake was made once already.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as C from "./content.js";
import * as P from "./progress.js";
import * as A from "./audio.js";
import { $, node, button, esc, on, SKILL_COLORS } from "./ui.js";
import { t, uiClips } from "./i18n.js";

const LABEL = k => t("skill." + k);

let onChange = () => {};
let resetArmed = false;

export function init(onChanged) {
  onChange = onChanged || (() => {});
  on($("teacher-close"), "click", close);
  on($("teacher"), "click", e => { if (e.target === $("teacher")) close(); });
  on(document, "keydown", e => { if (e.key === "Escape" && !$("teacher").hidden) close(); });
}

export function close() {
  $("teacher").hidden = true;
  resetArmed = false;
}

export function open() {
  const body = $("teacher-body");
  body.innerHTML = "";
  $("teacher-h").textContent = t("t.title");
  $("teacher-close").textContent = t("app.close");
  $("teacher").hidden = false;

  body.appendChild(learner());
  body.appendChild(node("hr", "hair"));
  body.appendChild(skills());
  body.appendChild(node("hr", "hair"));
  body.appendChild(mistakes());
  body.appendChild(node("hr", "hair"));
  body.appendChild(content());
  body.appendChild(node("hr", "hair"));
  body.appendChild(selfTest());
  body.appendChild(node("hr", "hair"));
  body.appendChild(danger());
}

/* ── who is using this device ─────────────────────────────────────────────── */

function learner() {
  const box = node("section");
  const b = C.band(P.band());
  box.appendChild(node("h3", null, esc(t("t.learner"))));

  const stats = node("div", "stats");
  stats.style.marginTop = "12px";
  const c = P.counts();
  const stat = (n, label) =>
    node("div", "stat", '<div class="stat__n">' + esc(n) + '</div><div class="stat__l">' + esc(label) + "</div>");
  stats.appendChild(stat(C.bandAges(b), t("t.band")));
  stats.appendChild(stat(C.levelName(P.level()), t("t.level")));
  stats.appendChild(stat(c.known, t("prog.known")));
  stats.appendChild(stat(P.lessonsDone(), t("prog.lessons")));
  stats.appendChild(stat(P.streak().count, t("prog.streak")));
  box.appendChild(stats);

  box.appendChild(node("div", "note", esc(t("t.bandNote"))));

  const row = node("div", "row");
  for (const bb of C.bands()) {
    const b2 = button("btn btn--quiet",
      esc(C.bandAges(bb)) + " · " + esc(C.bandLabel(bb)),
      () => { P.setBand(bb.id); onChange(); open(); });
    if (P.band() === bb.id) { b2.style.borderColor = "var(--ink)"; b2.style.color = "var(--ink)"; }
    row.appendChild(b2);
  }
  box.appendChild(row);
  return box;
}

/* ── the four skills, side by side ────────────────────────────────────────── */

function skills() {
  const box = node("section");
  box.appendChild(node("h3", null, esc(t("t.skills"))));
  box.appendChild(node("div", "note", esc(t("t.skillsNote"))));

  const list = node("div", "skills");
  const acc = P.accuracies();
  for (const s of ["listen", "speak", "read", "write"]) {
    const row = node("div", "skillrow");
    row.setAttribute("data-s", s);
    row.appendChild(node("div", "skillrow__name", esc(LABEL(s))));
    const bar = node("div", "skillrow__bar");
    const fill = node("b");
    const v = acc[s];
    fill.style.width = (v === null ? 0 : Math.round(v * 100)) + "%";
    bar.appendChild(fill);
    row.appendChild(bar);
    row.appendChild(node("div", "skillrow__num",
      s === "speak" ? (P.state().skills.speak.done || 0) + "×" : v === null ? "—" : Math.round(v * 100) + "%"));
    list.appendChild(row);
  }
  box.appendChild(list);

  const weak = P.weakest();
  if (weak) box.appendChild(node("div", "note", esc(t("t.leadWith", { skill: t("skill." + weak + ".low") }))));
  return box;
}

/* ── what they got wrong ──────────────────────────────────────────────────── */

function mistakes() {
  const box = node("section");
  const list = P.mistakes();
  box.appendChild(node("h3", null, esc(t("t.mistakes", { n: list.length }))));
  if (!list.length) {
    box.appendChild(node("div", "note", esc(t("t.noMistakes"))));
    return box;
  }
  for (const m of list.slice(0, 20)) {
    box.appendChild(node("div", "mistake",
      "<em>" + esc(LABEL(m.skill) || m.skill) + " · " + esc(m.cat) + "</em><br>" +
      esc(m.prompt) + " → <b>" + esc(m.want) + "</b>"));
  }
  if (list.length > 20) box.appendChild(node("div", "note", esc(t("t.andMore", { n: list.length - 20 }))));
  return box;
}

/* ── the review gate ──────────────────────────────────────────────────────── */

function content() {
  const box = node("section");
  const all = C.all();
  const pending = all.filter(c => c.reviewed !== true);
  box.appendChild(node("h3", null, esc(t("t.content", { n: all.length }))));
  box.appendChild(node("div", "note", esc(pending.length
    ? t("t.pending", { n: pending.length })
    : t("t.allApproved"))));

  for (const cat of all) {
    const p = node("div", "pack");
    p.appendChild(node("div", "pack__h",
      '<i aria-hidden="true">' + esc(cat.icon) + "</i>" + esc(cat.title) +
      (cat.reviewed === true
        ? '<b class="ok">' + esc(t("t.reviewed")) + "</b>"
        : "<b>" + esc(t("t.notReviewed")) + "</b>")));
    p.appendChild(node("div", "pack__meta", esc(t("t.packMeta", {
      cefr: cat.cefr,
      bands: (cat.bands || []).join(", "),
      words: (cat.vocabulary || []).length,
      phrases: (cat.phrases || []).length,
      dialogue: ((cat.dialogue && cat.dialogue.lines) || []).length,
      reading: cat.reading ? t("t.onePassage") : "",
      speaking: (cat.speaking || []).length,
      writing: (cat.writing || []).length,
      quiz: (cat.quiz || []).length
    }))));
    p.appendChild(node("div", "pack__meta", esc(C.goal(cat))));
    const words = node("div", "pack__words");
    for (const v of cat.vocabulary || []) {
      words.appendChild(node("span", null,
        (v.icon ? '<span aria-hidden="true">' + esc(v.icon) + "</span> " : "") + esc(v.word)));
    }
    p.appendChild(words);
    box.appendChild(p);
  }
  return box;
}

/* ── can this device actually make a sound ────────────────────────────────── */

const okLine = (ok, text) => "<li><b>" + (ok ? "✅" : "❌") + "</b><span>" + esc(text) + "</span></li>";

/** The self-test read-out, shared with the sound help sheet in app.js. */
export function diagLines(r) {
  return okLine(r.webAudio, t(r.webAudio ? "diag.webAudio.y" : "diag.webAudio.n")) +
         okLine(r.decoded, r.decoded ? t("diag.decoded.y", { s: r.seconds }) : t("diag.decoded.n")) +
         okLine(r.state === "running", t("diag.state", { state: r.state })) +
         okLine(r.clockAdvanced > 0, t("diag.clock", { n: r.clockAdvanced })) +
         (r.error ? okLine(false, r.error) : "");
}


function selfTest() {
  const box = node("section");
  box.appendChild(node("h3", null, esc(t("t.selfTest"))));
  box.appendChild(node("div", "note", esc(t("t.selfTestNote"))));

  const out = node("ul", "diag");
  const row = node("div", "row");
  row.appendChild(button("btn btn--quiet", t("t.runTest"), async () => {
    out.innerHTML = "<li><b>…</b><span>" + esc(t("sound.testing")) + "</span></li>";
    await A.load(uiClips());
    const r = await A.probe(t("audio.test"));
    out.innerHTML = diagLines(r) +
      okLine(r.recorded, t(r.recorded ? "diag.recorded.y" : "diag.recorded.n")) +
      okLine(!r.inIframe, t(r.inIframe ? "diag.iframe.y" : "diag.iframe.n")) +
      "<li><b>ℹ️</b><span>" + esc(t("diag.clips", { clips: r.clips, voices: r.voices })) + "</span></li>";
  }));
  box.appendChild(row);
  box.appendChild(out);
  return box;
}

/* ── wiping ───────────────────────────────────────────────────────────────── */

function danger() {
  const box = node("section");
  box.appendChild(node("h3", null, esc(t("t.device"))));
  box.appendChild(node("div", "note", esc(t("t.deviceNote"))));

  const note = node("div", "note");
  const b = button("btn btn--quiet", t("t.erase"), () => {
    if (!resetArmed) {
      resetArmed = true;
      b.textContent = t("t.eraseSure");
      note.textContent = t("t.eraseWarn");
      return;
    }
    P.reset();
    resetArmed = false;
    b.textContent = t("t.erased");
    note.textContent = t("t.erasedNote");
    onChange();
  });
  box.appendChild(b);
  box.appendChild(note);
  return box;
}
