/* ═══════════════════════════════════════════════════════════════════════════
   CLARA

   An original character. She is the brand and the teacher, and she is NOT a
   likeness of the real Clara — that stays deferred, along with her real voice.

   Drawn in the app's own language: bold silhouette, flat fills, thick ink
   outline, no gradients, no soft shadows. She has to read at 28 px in the
   header and at 200 px on a lesson intro, which is why the outline is heavy
   and the shapes are few.

   FOUR EXPRESSIONS, BUILT BY SWAPPING ONLY EYES AND MOUTH. Everything else —
   hair, head, shoulders, the gold pin — is identical in all four, so she stays
   recognisably one person instead of becoming four similar drawings.

   She wears oat, not one of the four skill colours. The skill colours have a
   job: they say which skill you are in. Clara must never accidentally say
   "this is reading" by standing next to something indigo.
   ═══════════════════════════════════════════════════════════════════════════ */

const HAIR  = "#241C2B";
const SKIN  = "#E6B389";
const CLOTH = "#E5D9C3";
const LINEN = "#FFFFFF";
const GOLD  = "#E9C765";
const INK   = "#15161D";

/* ── everything that never changes ────────────────────────────────────────── */
/* Order matters: neck, then shoulders over the bottom of it, then the collar,
   then the head over the top of the neck. Drawn any other way the neck pokes
   through the chin and she grows a beard. */
const BODY = `
<path d="M53 64h14v26h-14z" fill="${SKIN}"/>
<path d="M20 120v-8c0-13 12-20 24-22l16-4 16 4c12 2 24 9 24 22v8z" fill="${CLOTH}"/>
<path d="M47 89l13 12 13-12 5 3-18 16-18-16z" fill="${LINEN}"/>
<circle cx="80" cy="105" r="4" fill="${GOLD}"/>`;

const HEAD = `
<path d="M60 15c-19 0-29 14-29 33v23c0 5 9 5 9 0V52c0-14 8-22 20-22s20 8 20 22v19c0 5 9 5 9 0V48c0-19-10-33-29-33z" fill="${HAIR}"/>
<circle cx="39" cy="57" r="5" fill="${SKIN}"/>
<circle cx="81" cy="57" r="5" fill="${SKIN}"/>
<ellipse cx="60" cy="55" rx="21" ry="24" fill="${SKIN}"/>
<path d="M39 48c2-14 11-21 21-21s19 7 21 21c-6-9-12-11-21-11s-15 2-21 11z" fill="${HAIR}"/>
<circle cx="60" cy="19" r="11" fill="${HAIR}"/>`;

/* ── what changes ─────────────────────────────────────────────────────────── */
const FACES = {
  /* looking straight at you, waiting */
  neutral: `
<g class="clara-eyes">
  <ellipse cx="51" cy="55" rx="2.7" ry="3.4" fill="${INK}"/>
  <ellipse cx="69" cy="55" rx="2.7" ry="3.4" fill="${INK}"/>
</g>
<path d="M54 66q6 3 12 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,

  /* you got it right */
  pleased: `
<g class="clara-eyes">
  <path d="M47 56q4-5 8 0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M65 56q4-5 8 0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
</g>
<path d="M51 63q9 9 18 0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`,

  /* not quite — brows up, still smiling, nothing is wrong with you */
  encouraging: `
<path d="M45 46q6-4 11-1" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M64 45q5-3 11 1" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
<g class="clara-eyes">
  <ellipse cx="51" cy="56" rx="2.7" ry="3.4" fill="${INK}"/>
  <ellipse cx="69" cy="56" rx="2.7" ry="3.4" fill="${INK}"/>
</g>
<path d="M53 64q7 6 14 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,

  /* your turn — she is holding still and listening to you */
  listening: `
<path d="M44 45q6-5 12-1" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
<g class="clara-eyes">
  <ellipse cx="51" cy="56" rx="3" ry="3.7" fill="${INK}"/>
  <ellipse cx="69" cy="56" rx="3" ry="3.7" fill="${INK}"/>
</g>
<ellipse cx="60" cy="66" rx="4" ry="4.6" fill="${INK}"/>`
};

export const EXPRESSIONS = Object.keys(FACES);

/**
 * @param {"neutral"|"pleased"|"encouraging"|"listening"} expression
 * @param {{blink?: boolean, label?: string}} [opts]
 * @returns {string} inline SVG
 */
export function clara(expression = "neutral", opts = {}) {
  const face = FACES[expression] || FACES.neutral;
  const blink = opts.blink === false ? "" : " clara--blink";
  const label = opts.label || "Clara";
  return (
    `<svg class="clara${blink}" viewBox="0 0 120 120" role="img" aria-label="${label}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    BODY + HEAD + face +
    `</svg>`
  );
}

/** Drop Clara into an element, replacing whatever was there. */
export function paint(host, expression, opts) {
  if (host) host.innerHTML = clara(expression, opts);
}
