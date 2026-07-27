/* ═══════════════════════════════════════════════════════════════════════════
   SPOKEN — every line Clara says that is not in a content file.

   This module exists so there is exactly ONE list of them. The app reads it to
   decide what to play; build/build-audio.mjs reads the same list to decide what
   to render. Before this, the two lists were separate and could drift — and a
   line that drifts does not fail loudly, it just silently stops resolving to a
   recording and falls back to a worse voice.

   FILENAMES ARE DERIVED FROM THE TEXT. Change a word here and the clip stops
   matching, so change it here and re-render, never one without the other.

   Everything below is an INSTRUCTION. Nothing being taught is ever spoken from
   this file: a vocabulary word, a phrase, a dialogue line and a passage all
   come out of the topic's own audio folder, in English, always.

   No imports, on purpose — node runs this directly, with no DOM.
   ═══════════════════════════════════════════════════════════════════════════ */

export const SPOKEN = {
  "audio.begin":      { en: "Let's begin.",              pt: "Vamos começar." },
  "audio.meetWords":  { en: "Let's meet the words.",     pt: "Vamos ver as palavras." },
  "audio.now.listen": { en: "Now, let's listen.",        pt: "Agora, vamos ouvir." },
  "audio.now.read":   { en: "Now, let's read.",          pt: "Agora, vamos ler." },
  "audio.now.speak":  { en: "Now, let's speak.",         pt: "Agora, vamos falar." },
  "audio.now.write":  { en: "Now, let's write.",         pt: "Agora, vamos escrever." },
  "audio.now.quiz":   { en: "Choose the answer.",        pt: "Escolha a resposta." },
  "audio.listenTap":  { en: "Listen and tap the picture.", pt: "Ouça e toque na figura." },
  "audio.listenChoose": { en: "Listen and choose.",      pt: "Ouça e escolha." },
  "audio.whichHeard": { en: "Which one did you hear?",   pt: "Qual você ouviu?" },
  "audio.matchWord":  { en: "Match the word to the picture.", pt: "Ligue a palavra à figura." },
  "audio.readChoose": { en: "Read and choose.",          pt: "Leia e escolha." },
  "audio.sayAfter":   { en: "Say it after me.",          pt: "Repita depois de mim." },
  "audio.yourTurn":   { en: "Your turn.",                pt: "Sua vez." },
  "audio.pressRecord":{ en: "Press to record.",          pt: "Aperte para gravar." },
  "audio.spell":      { en: "Spell the word.",           pt: "Soletre a palavra." },
  "audio.write":      { en: "Write the word.",           pt: "Escreva a palavra." },
  /* Praise a beginner should not have to decode. This is the clearest case
     for the split: being told you got it right is worth nothing if you have
     to work out what you were told. */
  "audio.praise.1":   { en: "Good job!",                 pt: "Muito bem!" },
  "audio.praise.2":   { en: "Well done!",                pt: "Isso aí!" },
  "audio.praise.3":   { en: "That's right!",             pt: "Correto!" },
  "audio.praise.4":   { en: "Perfect!",                  pt: "Perfeito!" },
  "audio.praise.5":   { en: "Nice work!",                pt: "Muito bom!" },
  "audio.almost":     { en: "Almost. Try again.",        pt: "Quase. Tente de novo." },
  "audio.notQuite":   { en: "Not quite. Here it is.",    pt: "Não é bem isso. Olha aqui." },
  "audio.oneMore":    { en: "One more time.",            pt: "Mais uma vez." },
  "audio.complete":   { en: "Lesson complete!",          pt: "Aula concluída!" },
  "audio.badge":      { en: "Here is your badge.",       pt: "Aqui está sua medalha." },
  "audio.wellDone":   { en: "Well done!",                pt: "Isso aí!" },
  "audio.test":       { en: "Testing, one, two, three.", pt: "Testando, um, dois, três." }
};

/** Every line, in one language, in the order they are declared. */
export const linesFor = langId => Object.values(SPOKEN).map(e => e[langId]).filter(Boolean);
