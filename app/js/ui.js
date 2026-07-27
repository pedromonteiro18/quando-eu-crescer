/* ═══════════════════════════════════════════════════════════════════════════
   UI — the small shared pieces: DOM helpers, the two guards, confetti.
   ═══════════════════════════════════════════════════════════════════════════ */

export const $ = id => document.getElementById(id);
export const on = (node, ev, fn, opts) => node && node.addEventListener(ev, fn, opts);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const pickOne = a => a[Math.floor(Math.random() * a.length)];
export const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const esc = s =>
  String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function shuffle(a) {
  const c = a.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

/** Take n items at random, without repeats. */
export const sample = (a, n) => shuffle(a).slice(0, n);

export const LETTERS = ["A", "B", "C", "D", "E"];

/* ── the two guards, both carried over from the prototype ─────────────────── */

/* A seven year old hammers the buttons, and an adult double-taps out of habit.
   `busy` stops one tap firing a transition twice; the mission token invalidates
   anything still pending when the learner leaves — without it the app drags
   them back into the lesson they just walked away from. */
let missionId = 0;
let busy = false;

export const Mission = {
  bump() { return ++missionId; },
  token() { return missionId; },
  ok(t) { return t === missionId; }
};

export function guard(fn) {
  return function (...args) {
    if (busy) return;
    busy = true;
    const free = () => { busy = false; };
    Promise.resolve(fn.apply(this, args)).then(free, free);
  };
}

/* ── building DOM ─────────────────────────────────────────────────────────── */

export function node(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

export function button(cls, html, onClick, attrs) {
  const b = node("button", cls, html);
  b.type = "button";
  if (attrs) for (const k of Object.keys(attrs)) b.setAttribute(k, attrs[k]);
  if (onClick) on(b, "click", onClick);
  return b;
}

/** Replace the stage with fresh content and put focus somewhere sensible. */
export function stage(...children) {
  const host = $("stage");
  host.innerHTML = "";
  const wrap = node("div", "fade");
  for (const c of children) if (c) wrap.appendChild(typeof c === "string" ? node("div", null, c) : c);
  host.appendChild(wrap);
  host.scrollTop = 0;
  window.scrollTo(0, 0);
  return wrap;
}

/** The one motif: a labelled rule in the current skill's colour. */
export function rule(label, note) {
  return node("div", "rule",
    '<span class="rule__label">' + esc(label) + "</span>" +
    (note ? '<span class="rule__note">' + esc(note) + "</span>" : ""));
}

export function setSkill(name) {
  document.documentElement.setAttribute("data-skill", name || "");
}
export function setBand(band) {
  document.documentElement.setAttribute("data-band", band || "11-14");
}

/* ── confetti and sparks ──────────────────────────────────────────────────── */

export const FX = (() => {
  const cv = $("fx");
  const ctx = cv.getContext("2d");
  let parts = [], raf = null, dpr = 1;

  /* The canvas fills the phone screen, not the window, so confetti is clipped
     by the bezel like everything else. Coordinates are canvas-local. */
  const box = () => cv.getBoundingClientRect();

  function size() {
    const r = box();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.floor(r.width * dpr);
    cv.height = Math.floor(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  on(window, "resize", size);

  function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99;
      p.rot += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life / 22);
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = null; ctx.clearRect(0, 0, cv.width, cv.height); }
  }

  function add(list) {
    if (REDUCED) return;
    parts = parts.concat(list).slice(-320);
    if (!raf) raf = requestAnimationFrame(tick);
  }

  return {
    sparkle(target, colors) {
      if (!target) return;
      const r = target.getBoundingClientRect(), c = box();
      const cx = r.left - c.left + r.width / 2, cy = r.top - c.top + r.height / 2;
      const out = [];
      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
        const s = 3.4 + Math.random() * 4;
        out.push({
          x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.6, g: 0.16,
          w: 6 + Math.random() * 6, h: 6 + Math.random() * 6,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          c: pickOne(colors), life: 34 + Math.random() * 18, round: Math.random() < 0.5
        });
      }
      add(out);
    },
    rain(colors) {
      const W = box().width, out = [];
      for (let i = 0; i < 130; i++) {
        out.push({
          x: Math.random() * W, y: -30 - Math.random() * 320,
          vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.4, g: 0.05,
          w: 8 + Math.random() * 8, h: 10 + Math.random() * 10,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.24,
          c: pickOne(colors), life: 150 + Math.random() * 90, round: Math.random() < 0.3
        });
      }
      add(out);
    },
    clear() { parts = []; }
  };
})();

export const SKILL_COLORS = {
  listen: "#0B6E7A", speak: "#C0442A", read: "#3A3A8C", write: "#2C6E49", gold: "#E9C765"
};
