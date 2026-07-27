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

const LABEL = { listen: "Listening", speak: "Speaking", read: "Reading", write: "Writing", quiz: "Quiz" };

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
  box.appendChild(node("h3", null, "Learner"));

  const stats = node("div", "stats");
  stats.style.marginTop = "12px";
  const c = P.counts();
  stats.appendChild(node("div", "stat",
    '<div class="stat__n">' + esc(b.ages) + '</div><div class="stat__l">Band</div>'));
  stats.appendChild(node("div", "stat",
    '<div class="stat__n">' + esc(C.cefrName(P.level())) + '</div><div class="stat__l">Level</div>'));
  stats.appendChild(node("div", "stat",
    '<div class="stat__n">' + c.known + '</div><div class="stat__l">Words known</div>'));
  stats.appendChild(node("div", "stat",
    '<div class="stat__n">' + P.lessonsDone() + '</div><div class="stat__l">Lessons</div>'));
  stats.appendChild(node("div", "stat",
    '<div class="stat__n">' + P.streak().count + '</div><div class="stat__l">Day streak</div>'));
  box.appendChild(stats);

  box.appendChild(node("div", "note",
    "The band is presentation — type size, tap targets, whether writing means letter tiles or a paragraph. " +
    "The level is content. Changing the band does not lose any progress."));

  const row = node("div", "row");
  for (const bb of C.bands()) {
    const b2 = button(P.band() === bb.id ? "btn btn--quiet" : "btn btn--quiet",
      esc(bb.ages) + " · " + esc(bb.label),
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
  box.appendChild(node("h3", null, "Skills"));
  box.appendChild(node("div", "note",
    "Accuracy on first attempt. Speaking is deliberately not scored — it counts attempts, nothing else."));

  const list = node("div", "skills");
  const acc = P.accuracies();
  for (const s of ["listen", "speak", "read", "write"]) {
    const row = node("div", "skillrow");
    row.setAttribute("data-s", s);
    row.appendChild(node("div", "skillrow__name", LABEL[s]));
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
  if (weak) box.appendChild(node("div", "note", "Revision will lead with " + LABEL[weak].toLowerCase() + "."));
  return box;
}

/* ── what they got wrong ──────────────────────────────────────────────────── */

function mistakes() {
  const box = node("section");
  const list = P.mistakes();
  box.appendChild(node("h3", null, "Mistakes (" + list.length + ")"));
  if (!list.length) {
    box.appendChild(node("div", "note", "Nothing logged. A wrong first answer lands here and feeds revision until it is answered right."));
    return box;
  }
  for (const m of list.slice(0, 20)) {
    box.appendChild(node("div", "mistake",
      "<em>" + esc(LABEL[m.skill] || m.skill) + " · " + esc(m.cat) + "</em><br>" +
      esc(m.prompt) + " → <b>" + esc(m.want) + "</b>"));
  }
  if (list.length > 20) box.appendChild(node("div", "note", "and " + (list.length - 20) + " more"));
  return box;
}

/* ── the review gate ──────────────────────────────────────────────────────── */

function content() {
  const box = node("section");
  const all = C.all();
  const pending = all.filter(c => c.reviewed !== true);
  box.appendChild(node("h3", null, "Content (" + all.length + ")"));
  box.appendChild(node("div", "note",
    pending.length
      ? pending.length + " " + (pending.length === 1 ? "category is" : "categories are") +
        " waiting for review and cannot be reached by a learner. Approve one by setting " +
        "\"reviewed\": true in its file."
      : "Every category has been approved and is visible to a learner."));

  for (const cat of all) {
    const p = node("div", "pack");
    p.appendChild(node("div", "pack__h",
      '<i aria-hidden="true">' + esc(cat.icon) + "</i>" + esc(cat.title) +
      (cat.reviewed === true
        ? '<b class="ok">reviewed</b>'
        : "<b>not reviewed</b>")));
    p.appendChild(node("div", "pack__meta",
      esc(cat.cefr) + " · bands " + esc((cat.bands || []).join(", ")) + " · " +
      (cat.vocabulary || []).length + " words · " +
      (cat.phrases || []).length + " phrases · " +
      ((cat.dialogue && cat.dialogue.lines) || []).length + " dialogue lines · " +
      (cat.reading ? "1 passage · " : "") +
      (cat.speaking || []).length + " speaking · " +
      (cat.writing || []).length + " writing · " +
      (cat.quiz || []).length + " quiz"));
    p.appendChild(node("div", "pack__meta", esc(cat.goal || "")));
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

function selfTest() {
  const box = node("section");
  box.appendChild(node("h3", null, "Audio self-test"));
  box.appendChild(node("div", "note",
    "Plays a line and reports what really happened, including whether the audio clock advanced. " +
    "A page that reports no errors can still be completely silent."));

  const out = node("ul", "diag");
  const row = node("div", "row");
  row.appendChild(button("btn btn--quiet", "Run the test", async () => {
    out.innerHTML = "<li><b>…</b><span>testing</span></li>";
    const r = await A.probe();
    const line = (ok, text) => "<li><b>" + (ok ? "✅" : "❌") + "</b><span>" + esc(text) + "</span></li>";
    out.innerHTML =
      line(r.webAudio, "Web Audio " + (r.webAudio ? "available" : "missing")) +
      line(r.recorded, r.recorded ? "recording found" : "no recording; the fallback voice was used") +
      line(r.decoded, r.decoded ? "decoded (" + r.seconds + "s)" : "not decoded") +
      line(r.state === "running", "audio context: " + r.state) +
      line(r.clockAdvanced > 0, "clock advanced " + r.clockAdvanced + "s — this is the proof of output") +
      line(!r.inIframe, r.inIframe ? "inside an iframe, where audio is at the browser's discretion" : "top-level page") +
      "<li><b>ℹ️</b><span>" + r.clips + " clips loaded, " + r.voices + " system voices</span></li>" +
      (r.error ? line(false, r.error) : "");
  }));
  box.appendChild(row);
  box.appendChild(out);
  return box;
}

/* ── wiping ───────────────────────────────────────────────────────────────── */

function danger() {
  const box = node("section");
  box.appendChild(node("h3", null, "This device"));
  box.appendChild(node("div", "note",
    "Everything is stored in this browser and nowhere else. No account, no server, no analytics, " +
    "and no recording ever leaves the device."));

  const note = node("div", "note");
  const b = button("btn btn--quiet", "Erase all progress", () => {
    if (!resetArmed) {
      resetArmed = true;
      b.textContent = "Sure? Tap again";
      note.textContent = "This erases words, badges, mistakes and the streak on this device.";
      return;
    }
    P.reset();
    resetArmed = false;
    b.textContent = "Erased ✓";
    note.textContent = "Everything is back to the start.";
    onChange();
  });
  box.appendChild(b);
  box.appendChild(note);
  return box;
}
