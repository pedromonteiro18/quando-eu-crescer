/**
 * Gera um arquivo de áudio para CADA frase que o app fala e monta o mapa CLIPS.
 *
 * Por quê: a Web Speech API se mostrou frágil demais para um app cuja premissa
 * é ser falado. Ela exige um gesto do usuário, silencia dentro de iframes,
 * depende de quais vozes o aparelho tem instaladas e varia de navegador para
 * navegador. Áudio pré-gravado só toca.
 *
 * As vozes aqui são as do próprio macOS (Samantha / Luciana), renderizadas na
 * máquina de quem roda o script — a mesma coisa que o navegador falaria, só que
 * decidida uma vez, por nós, em vez de sorteada em cada aparelho. Quando a
 * gravação humana chegar, é só substituir os arquivos: o mapa não muda.
 *
 *   node prototype/build-audio.mjs
 *
 * Requer macOS (`say` e `afconvert`). Em outro sistema o script avisa e sai;
 * o app continua funcionando com a voz sintética do navegador.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "audio");

if (process.platform !== "darwin") {
  console.error("Este script precisa do macOS (say/afconvert). Nada foi gerado.");
  process.exit(1);
}

/* ── conteúdo: lido do próprio index.html, para não duplicar as frases ── */
const src = readFileSync(join(HERE, "index.html"), "utf8");
const jobsLiteral = src.match(/const JOBS = (\[[\s\S]*?\n\]);/);
if (!jobsLiteral) throw new Error("Não achei o array JOBS em index.html.");
const JOBS = eval(jobsLiteral[1]);

/* ── frases fixas da interface, copiadas do app ── */
const ASK = "Qual trabalho você quer fazer hoje?";
const PRAISE = ["Isso!", "Muito bem!", "Perfeito!", "Boa!", "É isso aí!"];

const phrases = [];
const add = (lang, text) => {
  if (text && !phrases.some(p => p.lang === lang && p.text === text)) phrases.push({ lang, text });
};

for (const j of JOBS) {
  add("pt", j.pt + ".");
  add("en", j.en);
  add("pt", "Parabéns! Você é um " + j.badgePt + "!");
  add("pt", "Hora de trabalhar!");
  for (const w of j.words) { add("en", w.en); add("pt", w.pt); }
  for (const b of j.scene.beats) {
    add("pt", b.setupPt);
    add("en", b.taskEn);
    add("en", b.successEn);
  }
}
add("pt", ASK);
add("pt", "Vamos conhecer as palavras.");
add("pt", "Agora, ouça e toque.");
add("pt", "Toque em");
add("pt", "Quase!");
add("pt", "Quase! Tenta outra vez.");
add("pt", "Testando um, dois, três.");
PRAISE.forEach(p => add("pt", p));

/* ── renderização ── */
const VOICE = { en: "Samantha", pt: "Luciana" };
/* `say` fala em palavras por minuto; ~150 corresponde ao rate 0.85 do app.
   Palavra solta em inglês vai ainda mais devagar — é o que a criança repete. */
const wpm = (lang, text) => (lang === "en" ? (text.split(/\s+/).length === 1 ? 135 : 150) : 175);

/* nome de arquivo estável e legível a partir da frase */
const slug = (lang, text) =>
  lang + "-" + text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 44);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const clips = {};
let bytes = 0;
for (const { lang, text } of phrases) {
  const name = slug(lang, text) + ".m4a";
  const aiff = join(OUT, "_tmp.aiff");
  const m4a = join(OUT, name);
  execFileSync("say", ["-v", VOICE[lang], "-r", String(wpm(lang, text)), "-o", aiff, text]);
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "28000", "-q", "127", aiff, m4a]);
  rmSync(aiff, { force: true });
  clips[lang + ":" + text] = "audio/" + name;
  bytes += statSync(m4a).size;
}

/* ── mapa CLIPS ── */
writeFileSync(join(HERE, "clips.js"),
  "/* GERADO por build-audio.mjs — não edite à mão.\n" +
  "   " + phrases.length + " falas · vozes " + VOICE.en + " (en) e " + VOICE.pt + " (pt).\n" +
  "   Para trocar por gravação humana: regrave o arquivo, mantenha o nome. */\n" +
  "window.CLIPS = " + JSON.stringify(clips, null, 2) + ";\n");

console.log(phrases.length + " falas · " + (bytes / 1024).toFixed(0) + " kB em audio/");
console.log("  en: " + phrases.filter(p => p.lang === "en").length +
            "  pt: " + phrases.filter(p => p.lang === "pt").length);
