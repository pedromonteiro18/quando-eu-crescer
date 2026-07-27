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
import { readFileSync, writeFileSync } from "node:fs";

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

const out = [title, style, body.trim(), ""].join("\n");
writeFileSync(new URL("./artifact.html", import.meta.url), out);

console.log(`artifact.html · ${(out.length / 1024).toFixed(1)} kB`);
