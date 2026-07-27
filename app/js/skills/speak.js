/* ═══════════════════════════════════════════════════════════════════════════
   SPEAKING — warm coral. Hear Clara, record yourself, hear both back to back.

   THERE IS NO SCORE, AND THERE IS NO SPEECH RECOGNITION. That is a decision,
   not a gap. MDN lists SpeechRecognition as limited availability — not Baseline,
   because it does not work in some of the most widely used browsers — and where
   it does work it "involves a server-based recognition engine. Your audio is
   sent to a web service." For a children's app that means uploading a child's
   voice to a third party in order to receive an unreliable verdict on an
   accented second-language speaker. Being told you are wrong when you are right
   is the fastest way to lose a learner of any age.

   Self-comparison is how pronunciation is actually taught, it runs entirely on
   the device through MediaRecorder, and it cannot tell a child they are wrong.

   Nothing is uploaded and nothing is stored. The recording lives in memory for
   as long as the learner is on this item, and the microphone track is stopped
   the moment they finish speaking, so the browser's recording indicator goes
   out instead of staying on for the rest of the lesson.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as A from "../audio.js";
import * as P from "../progress.js";
import { node, button, rule, esc, sample, setSkill, Mission } from "../ui.js";
import { clara } from "../clara.js";
import { t } from "../i18n.js";

export const skill = "speak";

const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

function item(ctx, target, index, total) {
  return new Promise(resolve => {
    const { band, host, token } = ctx;
    const silent = band.instructions === "none";

    let stream = null, recorder = null, chunks = [];
    let mine = null;                  // the learner's own AudioBuffer
    let recording = false;

    host.innerHTML = "";
    host.appendChild(rule(t("skill.speak"), index + 1 + " / " + total));

    const head = node("div", "prompt");
    const face = node("span", "prompt__clara", clara("listening"));
    head.appendChild(face);
    const txt = node("div", "prompt__text");
    txt.appendChild(node("div", "say-target",
      target.icon ? '<span aria-hidden="true">' + esc(target.icon) + "</span> " + esc(target.text) : esc(target.text)));
    if (!silent && target.tip) txt.appendChild(node("div", "say-tip", esc(target.tip)));
    head.appendChild(txt);
    host.appendChild(head);

    const hear = button("btn btn--ghost btn--wide", "🔊 " + (silent ? "" : esc(t("speak.hearClara"))),
      () => A.say(target.text), { "aria-label": t("speak.hearClaraA") });
    hear.style.marginBottom = "12px";
    host.appendChild(hear);

    const mic = button("mic",
      '<span class="mic__icon" aria-hidden="true">🎤</span>' +
      (silent ? "" : '<span class="mic__label">' + esc(t("speak.yourTurn")) + "</span>"),
      toggle, { "aria-label": t("speak.record") });
    host.appendChild(mic);

    const compare = node("div", "compare");
    compare.hidden = true;
    /* The band that cannot read gets Clara's face and a microphone instead of
       the words "Clara" and "You" — otherwise the one screen that is entirely
       about listening to yourself would need reading to operate. */
    const playClara = button("btn btn--quiet",
      silent ? '🔊 <span class="compare__face">' + clara("pleased", { blink: false }) + "</span>" : "🔊 Clara",
      () => A.say(target.text), { "aria-label": t("speak.hearClara") });
    const playMine = button("btn btn--quiet",
      silent ? '🔊 <span aria-hidden="true">🎤</span>' : "🔊 " + esc(t("speak.you")),
      playBack, { "aria-label": t("speak.hearYou") });
    compare.appendChild(playClara);
    compare.appendChild(playMine);
    host.appendChild(compare);

    const note = node("div", "mic-note");
    if (!silent) note.textContent = t("speak.private");
    host.appendChild(note);

    const row = node("div", "row row--end");
    row.style.marginTop = "20px";
    row.appendChild(button("btn btn--skill", t(silent ? "app.go" : "app.next"), finish));
    host.appendChild(row);

    /* Clara says it once, unprompted. The model comes before the attempt. */
    setTimeout(() => A.say(target.text), 300);

    async function toggle() {
      if (recording) return stopRec();
      if (!supported) {
        note.textContent = t("speak.noRecorder");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        note.textContent = t("speak.noMic");
        return;
      }
      if (!Mission.ok(token)) return release();
      chunks = [];
      try { recorder = new MediaRecorder(stream); } catch { release(); return; }
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = handleStop;
      recorder.start();
      recording = true;
      mic.classList.add("is-recording");
      mic.querySelector(".mic__label") && (mic.querySelector(".mic__label").textContent = t("speak.stop"));
      face.innerHTML = clara("listening", { blink: false });
    }

    function stopRec() {
      recording = false;
      mic.classList.remove("is-recording");
      const label = mic.querySelector(".mic__label");
      if (label) label.textContent = t("speak.againBtn");
      try { recorder && recorder.state !== "inactive" && recorder.stop(); } catch { release(); }
    }

    async function handleStop() {
      release();                                  // the mic indicator goes out here
      const blob = new Blob(chunks, { type: (recorder && recorder.mimeType) || "audio/webm" });
      chunks = [];
      const ctxA = A.context();
      if (!ctxA || !blob.size) return;
      try {
        mine = await ctxA.decodeAudioData(await blob.arrayBuffer());
      } catch {
        note.textContent = t("speak.badRec");
        return;
      }
      if (!Mission.ok(token)) return;
      compare.hidden = false;
      face.innerHTML = clara("pleased");
      if (!silent) note.textContent = t("speak.compare");
      playBack();
    }

    function playBack() {
      const c = A.context();
      if (!c || !mine) return;
      const src = c.createBufferSource();
      src.buffer = mine;
      src.connect(c.destination);
      src.start();
    }

    function release() {
      if (stream) { stream.getTracks().forEach(t => { try { t.stop(); } catch {} }); stream = null; }
      recorder = null;
    }

    function finish() {
      if (recording) stopRec();
      release();
      mine = null;                                 // and it is gone
      resolve(Mission.ok(token));
    }
  });
}

export async function run(ctx) {
  const { cat, band, host, vocab, token } = ctx;
  setSkill(skill);

  const n = band.lesson.speak;
  let targets;
  if (band.activities.read === "match" || !(cat.speaking || []).length) {
    /* The youngest band repeats single words, with the picture beside them. */
    targets = sample(vocab.filter(v => v.icon), n).map(v => ({ text: v.word, icon: v.icon, tip: null }));
  } else {
    targets = sample(cat.speaking, n).map(s => ({ text: s.text, tip: s.tip, icon: null }));
  }

  let done = 0;
  for (let i = 0; i < targets.length; i++) {
    if (!Mission.ok(token)) return { right: done, wrong: 0, abandoned: true };
    const ok = await item(ctx, targets[i], i, targets.length);
    if (!ok) return { right: done, wrong: 0, abandoned: true };
    done++;
  }

  P.score(skill, cat.id, done, 0);
  return { right: done, wrong: 0 };
}
