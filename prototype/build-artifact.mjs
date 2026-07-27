/**
 * index.html é a fonte única: um documento HTML completo que abre direto no
 * navegador (file:// inclusive, por causa do <meta charset>).
 *
 * O publicador de Artifacts embrulha o arquivo em seu próprio
 * <!doctype html><head>…</head><body>, então ele não pode ter esses elementos.
 * Este script tira o esqueleto e deixa só <title> + <style> + conteúdo do body.
 *
 *   node prototype/build-artifact.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const src = readFileSync(new URL("./index.html", import.meta.url), "utf8");

const grab = (re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`index.html não tem ${what} — o build precisa dele.`);
  return m;
};

const head  = grab(/<head>([\s\S]*?)<\/head>/i, "<head>")[1];
const body  = grab(/<body>([\s\S]*?)<\/body>/i, "<body>")[1];
const title = grab(/<title>[\s\S]*?<\/title>/i, "<title>")[0];
const style = head.match(/<style>[\s\S]*?<\/style>/i)?.[0] ?? "";

/* Um Artifact é UM arquivo — não existe caminho relativo para os áudios. Então
   clips.js entra embutido, com cada gravação virando data: URI. Isso engorda a
   página, mas é o que faz o som funcionar lá também. */
let inlineClips = "";
const clipsPath = new URL("./clips.js", import.meta.url);
if (existsSync(clipsPath)) {
  const map = JSON.parse(
    readFileSync(clipsPath, "utf8").match(/window\.CLIPS = ([\s\S]*);\s*$/)[1]
  );
  const inlined = {};
  for (const [key, rel] of Object.entries(map)) {
    const file = new URL("./" + rel, import.meta.url);
    inlined[key] = existsSync(file)
      ? "data:audio/mp4;base64," + readFileSync(file).toString("base64")
      : rel;
  }
  inlineClips = "<script>window.CLIPS = " + JSON.stringify(inlined) + ";<\/script>";
  console.log(`  ${Object.keys(inlined).length} gravações embutidas`);
}

/* a tag externa não resolve dentro do Artifact — troca pela versão embutida */
const bodyInline = body.replace(/<script src="clips\.js"><\/script>/, inlineClips);

const out = [title, style, bodyInline.trim(), ""].join("\n");
writeFileSync(new URL("./artifact.html", import.meta.url), out);

console.log(`artifact.html · ${(out.length / 1024).toFixed(0)} kB`);
