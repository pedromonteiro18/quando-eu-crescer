/* ═══════════════════════════════════════════════════════════════════════════
   I18N — the interface speaks the learner's language. The lesson does not.

   This reverses the app's founding decision, and it is worth being exact about
   what changed. The original claim was "no translation anywhere, not even in
   the chrome", on the grounds that immersion is stronger without an escape
   hatch. That is true of the LESSON and false of the CHROME. A Brazilian
   beginner who cannot read "Pick something to learn" has been stopped by the
   furniture before the teaching starts — immersion they never reached is not
   immersion, it is a locked door.

   So the line is drawn by role, and it is drawn hard:

     · everything the app says ABOUT the lesson — buttons, headings, settings,
       instructions, praise — resolves through t() and is Portuguese by default;
     · everything the app TEACHES — every vocabulary word, phrase, dialogue
       line, passage and quiz option — comes out of the category files and is
       never touched by this module. Not once. If a word in here ever ends up
       on a flashcard, that is a bug in the caller, not a missing translation.

   The one screen with no interface language yet is the language question
   itself, which is why it is flags and two words.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as P from "./progress.js";
import { SPOKEN } from "./spoken.js";

export const LANGS = [
  { id: "pt", flag: "🇧🇷", label: "Português" },
  { id: "en", flag: "🇬🇧", label: "English" }
];

/* Brazilian, not European. "Toque", not "Toca"; "você", not "tu". */
const S = {

  /* ── the chrome ─────────────────────────────────────────────────────────── */
  "app.title":        { en: "English with Clara",        pt: "English with Clara" },
  "app.skip":         { en: "Skip to content",           pt: "Ir para o conteúdo" },
  "app.home":         { en: "English with Clara — home", pt: "English with Clara — início" },
  "app.close":        { en: "Close",                     pt: "Fechar" },
  "app.back":         { en: "← Home",                    pt: "← Início" },
  "app.next":         { en: "Next →",                    pt: "Próximo →" },
  "app.go":           { en: "→",                         pt: "→" },
  "app.gearLabel":    { en: "Settings — hold for the teacher area",
                        pt: "Ajustes — segure para a área do professor" },

  "boot.failed":      { en: "Content did not load.",     pt: "O conteúdo não carregou." },
  "boot.help":        { en: "Open this over http, not as a file — ES modules and JSON both need it.",
                        pt: "Abra por http, não como arquivo — os módulos ES e o JSON precisam disso." },

  "streak.day":       { en: "day",                       pt: "dia" },
  "streak.days":      { en: "days",                      pt: "dias" },
  "streak.today":     { en: "Practised today",           pt: "Praticou hoje" },
  "streak.notToday":  { en: "Not practised today",       pt: "Ainda não praticou hoje" },

  /* ── first run: choosing a language ─────────────────────────────────────── */
  "lang.question":    { en: "Your language",             pt: "Seu idioma" },
  "lang.note":        { en: "The lessons are in English. This is for the buttons.",
                        pt: "As aulas são em inglês. Isto é para os botões." },

  /* ── splash ─────────────────────────────────────────────────────────────── */
  "splash.eyebrow":   { en: "Listening · Speaking · Reading · Writing",
                        pt: "Ouvir · Falar · Ler · Escrever" },
  /* Rewritten rather than translated: the old line promised no translation
     anywhere, which this release stops being true. */
  "splash.blurb":     { en: "Every lesson uses all four skills. The lessons are in English; " +
                            "the buttons are in your language. Everything stays on this device.",
                        pt: "Toda aula usa as quatro habilidades. As aulas são em inglês; " +
                            "os botões são no seu idioma. Tudo fica neste aparelho." },
  "splash.begin":     { en: "Begin →",                   pt: "Começar →" },
  "splash.noSound":   { en: "🔇 No sound?",              pt: "🔇 Sem som?" },
  "splash.teacher":   { en: "Hold the ⚙ for three seconds for the teacher area and progress.",
                        pt: "Segure o ⚙ por três segundos para a área do professor e o progresso." },

  /* ── the sound help sheet ───────────────────────────────────────────────── */
  "sound.title":      { en: "No sound?",                 pt: "Sem som?" },
  "sound.intro":      { en: "Everything below is on the device, not in the app. The app has " +
                            "already checked its own side — you can run that check again at the bottom.",
                        pt: "Tudo abaixo é do aparelho, não do aplicativo. O aplicativo já verificou " +
                            "o lado dele — dá para rodar essa checagem de novo lá embaixo." },
  "sound.1.t":        { en: "iPhone: the switch above the volume buttons.",
                        pt: "iPhone: a chavinha acima dos botões de volume." },
  "sound.1.b":        { en: "If it shows orange the phone is on silent, and web pages make no sound " +
                            "at all — no warning, no error, nothing. Flip it back towards the screen.",
                        pt: "Se estiver laranja, o telefone está no silencioso, e páginas da web não " +
                            "emitem som nenhum — sem aviso, sem erro, nada. Empurre de volta para o lado da tela." },
  "sound.2.t":        { en: "Turn the volume up while this page is open.",
                        pt: "Aumente o volume com esta página aberta." },
  "sound.2.b":        { en: "The volume keys control whatever is playing at the time. Press them " +
                            "while you are looking at this app, not on the home screen.",
                        pt: "Os botões de volume controlam o que estiver tocando na hora. Aperte com " +
                            "este aplicativo na tela, não na tela inicial." },
  "sound.3.t":        { en: "Bluetooth.",                pt: "Bluetooth." },
  "sound.3.b":        { en: "Sound may be going to headphones, a car or a speaker in another room. " +
                            "Turn Bluetooth off and try again.",
                        pt: "O som pode estar indo para um fone, um carro ou uma caixa em outro cômodo. " +
                            "Desligue o Bluetooth e tente de novo." },
  "sound.4.t":        { en: "A muted tab, on a computer.",
                        pt: "Uma aba sem som, no computador." },
  "sound.4.b":        { en: "Right-click the tab. If it says Unmute site, that is the whole problem.",
                        pt: "Clique com o botão direito na aba. Se aparecer Ativar som do site, o problema é esse." },
  "sound.5.t":        { en: "Focus, Do Not Disturb, or a low-power mode.",
                        pt: "Foco, Não Perturbe ou modo de baixo consumo." },
  "sound.5.b":        { en: "Any of these can hold audio back. Turn them off and reload the page.",
                        pt: "Qualquer um deles pode segurar o áudio. Desligue e recarregue a página." },
  "sound.retest":     { en: "Test it again",             pt: "Testar de novo" },
  "sound.retestNote": { en: "Plays a line and reports what really happened, including whether the " +
                            "audio clock advanced. Note that a page reporting no errors can still be " +
                            "completely silent — that is exactly what the switch in step 1 does.",
                        pt: "Toca uma frase e conta o que realmente aconteceu, inclusive se o relógio " +
                            "do áudio avançou. Uma página que não acusa nenhum erro ainda pode estar " +
                            "completamente muda — é exatamente isso que a chavinha do passo 1 faz." },
  "sound.play":       { en: "Play the test line",        pt: "Tocar a frase de teste" },
  "sound.testing":    { en: "testing",                   pt: "testando" },
  "sound.ok":         { en: "The app's own side is working. If you still hear nothing, it is one of the five above.",
                        pt: "O lado do aplicativo está funcionando. Se ainda assim você não ouve nada, é um dos cinco acima." },

  "alarm.silent":     { en: "Clara has gone quiet on this device.",
                        pt: "A Clara ficou muda neste aparelho." },
  "alarm.noOutput":   { en: "Clara is playing, but no sound is coming out.",
                        pt: "A Clara está tocando, mas não sai som." },
  "alarm.action":     { en: "What to check",             pt: "O que verificar" },

  /* ── the self-test lines, shared by the sheet and the teacher area ──────── */
  "diag.webAudio.y":  { en: "Web Audio available",       pt: "Web Audio disponível" },
  "diag.webAudio.n":  { en: "Web Audio missing",         pt: "Web Audio ausente" },
  "diag.decoded.y":   { en: "recording decoded ({s}s)",  pt: "gravação decodificada ({s}s)" },
  "diag.decoded.n":   { en: "no recording decoded",      pt: "nenhuma gravação decodificada" },
  "diag.recorded.y":  { en: "recording found",           pt: "gravação encontrada" },
  "diag.recorded.n":  { en: "no recording; the fallback voice was used",
                        pt: "sem gravação; a voz reserva foi usada" },
  "diag.state":       { en: "audio context: {state}",    pt: "contexto de áudio: {state}" },
  "diag.clock":       { en: "clock advanced {n}s — this is the proof of output",
                        pt: "o relógio avançou {n}s — esta é a prova de que saiu som" },
  "diag.iframe.y":    { en: "inside an iframe, where audio is at the browser's discretion",
                        pt: "dentro de um iframe, onde o áudio fica a critério do navegador" },
  "diag.iframe.n":    { en: "top-level page",            pt: "página no nível principal" },
  "diag.clips":       { en: "{clips} clips loaded, {voices} system voices",
                        pt: "{clips} áudios carregados, {voices} vozes do sistema" },

  /* ── home ───────────────────────────────────────────────────────────────── */
  "home.morning":     { en: "Good morning.",             pt: "Bom dia." },
  "home.afternoon":   { en: "Good afternoon.",           pt: "Boa tarde." },
  "home.evening":     { en: "Good evening.",             pt: "Boa noite." },
  "home.pick":        { en: "Pick something to learn.",  pt: "Escolha o que aprender." },
  "home.doneToday":   { en: "You have practised today. Anything more is a bonus.",
                        pt: "Você já praticou hoje. O que vier agora é bônus." },
  "home.whatIsALesson": { en: "One topic is one lesson: listening, reading, speaking, writing, then a quiz.",
                        pt: "Um tema é uma aula: ouvir, ler, falar, escrever e um quiz." },
  "home.topics":      { en: "Topics",                    pt: "Temas" },
  "home.open":        { en: "{n} open",                  pt: "{n} liberados" },
  "home.empty.t":     { en: "Nothing to show yet.",      pt: "Nada para mostrar ainda." },
  "home.empty.b":     { en: "Every topic is still waiting for review. Hold the ⚙ to see what is queued.",
                        pt: "Todos os temas ainda aguardam revisão. Segure o ⚙ para ver a fila." },
  "home.words":       { en: "{n} words",                 pt: "{n} palavras" },
  "home.word":        { en: "word",                      pt: "palavra" },
  "home.wordsOnly":   { en: "words",                     pt: "palavras" },
  "home.doneTimes":   { en: "done {n}×",                 pt: "feito {n}×" },
  "home.progress":    { en: "Progress",                  pt: "Progresso" },
  "home.soon":        { en: "Coming soon",               pt: "Em breve" },
  "home.back":        { en: "← All topics",              pt: "← Todos os temas" },
  "home.subtopics":   { en: "Choose one",                pt: "Escolha um" },
  "home.subOpen":     { en: "{n} of {m} ready",          pt: "{n} de {m} prontos" },

  /* ── the due-test and revision cards ────────────────────────────────────── */
  "due.final.t":      { en: "Ready for the next level?", pt: "Pronto para o próximo nível?" },
  "due.final.b":      { en: "You have finished everything in {band}. Pass the assessment and the next band opens.",
                        pt: "Você terminou tudo em {band}. Passe na avaliação e a próxima faixa abre." },
  "due.final.go":     { en: "Take the assessment →",     pt: "Fazer a avaliação →" },
  "due.unit.t":       { en: "A quick check.",            pt: "Uma checagem rápida." },
  "due.unit.b":       { en: "A short mixed test across what you have done. Nothing is marked.",
                        pt: "Um teste curto misturando o que você já fez. Nada é avaliado." },
  "due.unit.go":      { en: "Start the check →",         pt: "Começar a checagem →" },

  "rev.card.weak":    { en: "Your {skill} is behind.",   pt: "Seu {skill} está atrasado." },
  "rev.card.t":       { en: "Go back over what you missed.", pt: "Reveja o que você errou." },
  "rev.card.b":       { en: "{n} logged, plus the words you have met but not settled.",
                        pt: "{n} registrados, mais as palavras que você viu mas ainda não fixou." },
  "rev.card.go":      { en: "Revise →",                  pt: "Revisar →" },

  /* ── the skills, everywhere they are named ──────────────────────────────── */
  "skill.listen":     { en: "Listening",                 pt: "Escuta" },
  "skill.read":       { en: "Reading",                   pt: "Leitura" },
  "skill.speak":      { en: "Speaking",                  pt: "Fala" },
  "skill.write":      { en: "Writing",                   pt: "Escrita" },
  "skill.quiz":       { en: "Quiz",                      pt: "Quiz" },
  "skill.listen.low": { en: "listening",                 pt: "a escuta" },
  "skill.read.low":   { en: "reading",                   pt: "a leitura" },
  "skill.speak.low":  { en: "speaking",                  pt: "a fala" },
  "skill.write.low":  { en: "writing",                   pt: "a escrita" },

  /* ── the lesson ─────────────────────────────────────────────────────────── */
  "lesson.start":     { en: "Start the lesson →",        pt: "Começar a aula →" },
  "lesson.inThis":    { en: "In this lesson",            pt: "Nesta aula" },
  "lesson.newWords":  { en: "New words",                 pt: "Palavras novas" },
  "lesson.again":     { en: "Say it again",              pt: "Falar de novo" },
  "lesson.ready":     { en: "Ready →",                   pt: "Pronto →" },
  "lesson.complete":  { en: "Lesson complete.",          pt: "Aula concluída." },
  "lesson.summary":   { en: "{topic} · {known} known · {days} in a row",
                        pt: "{topic} · {known} sabidas · {days} seguidos" },
  "lesson.another":   { en: "Choose another →",          pt: "Escolher outra →" },
  "lesson.repeat":    { en: "Again",                     pt: "De novo" },

  "hint.listen.pic":  { en: "Hear a word, tap the picture.",
                        pt: "Ouça a palavra e toque na figura." },
  "hint.listen.text": { en: "Hear a line, choose the one you heard.",
                        pt: "Ouça a frase e escolha a que você ouviu." },
  "hint.read.match":  { en: "Match each word to its picture.",
                        pt: "Ligue cada palavra à figura dela." },
  "hint.read.dlg":    { en: "Read the conversation, then answer.",
                        pt: "Leia a conversa e depois responda." },
  "hint.read.pass":   { en: "Read the text, then answer. It stays on screen.",
                        pt: "Leia o texto e depois responda. Ele fica na tela." },
  "hint.speak":       { en: "Hear Clara, then record yourself and compare. Nothing is scored and " +
                            "nothing is sent anywhere.",
                        pt: "Ouça a Clara, grave você mesmo e compare. Nada recebe nota e nada é " +
                            "enviado para lugar nenhum." },
  "hint.write.tiles": { en: "Tap the letters in order.", pt: "Toque nas letras na ordem." },
  "hint.write.bank":  { en: "Type it, or tap a word from the bank.",
                        pt: "Digite, ou toque em uma palavra da lista." },
  "hint.write.type":  { en: "Type your answer.",         pt: "Digite sua resposta." },
  "hint.quiz":        { en: "Last page. It cannot be failed.",
                        pt: "Última página. Não dá para reprovar." },

  /* ── asking a question ──────────────────────────────────────────────────── */
  "ask.replay":       { en: "Play the sound again",      pt: "Tocar o som de novo" },
  "ask.option":       { en: "option {n}",                pt: "opção {n}" },
  "ask.almost":       { en: "Almost. Try again.",        pt: "Quase. Tente de novo." },
  "ask.listen":       { en: "Listen",                    pt: "Ouvir" },
  "ask.playLine":     { en: "Play the line",             pt: "Tocar a frase" },
  "ask.whichOne":     { en: "Which one is it?",          pt: "Qual é?" },
  "ask.whichHeard":   { en: "Which one did you hear?",   pt: "Qual você ouviu?" },
  /* Praise is written twice over because it is also spoken, and the spoken
     clip has to match the written line exactly to resolve. */
  "praise.1":         { en: "Good job!",                 pt: "Muito bem!" },
  "praise.2":         { en: "Well done!",                pt: "Isso aí!" },
  "praise.3":         { en: "That's right!",             pt: "Correto!" },
  "praise.4":         { en: "Perfect!",                  pt: "Perfeito!" },
  "praise.5":         { en: "Nice work!",                pt: "Muito bom!" },

  /* ── reading ────────────────────────────────────────────────────────────── */
  "read.pairs":       { en: "{n} pairs",                 pt: "{n} pares" },
  "read.pictureOf":   { en: "picture of {word}",         pt: "figura de {word}" },
  "read.theWord":     { en: "the word {word}",           pt: "a palavra {word}" },
  "read.heard":       { en: "Hear this line",            pt: "Ouvir esta frase" },
  "read.doneReading": { en: "I've read it →",            pt: "Já li →" },
  "read.questions":   { en: "Questions →",               pt: "Perguntas →" },
  "read.readAgain":   { en: "Read it again",             pt: "Ler de novo" },

  /* ── speaking ───────────────────────────────────────────────────────────── */
  "speak.hearClara":  { en: "Hear Clara",                pt: "Ouvir a Clara" },
  "speak.hearClaraA": { en: "Hear Clara say it",         pt: "Ouvir a Clara falar" },
  "speak.yourTurn":   { en: "Your turn",                 pt: "Sua vez" },
  "speak.stop":       { en: "Stop",                      pt: "Parar" },
  "speak.againBtn":   { en: "Again",                     pt: "De novo" },
  "speak.record":     { en: "Record yourself",           pt: "Gravar você" },
  "speak.you":        { en: "You",                       pt: "Você" },
  "speak.hearYou":    { en: "Hear yourself",             pt: "Ouvir você" },
  "speak.private":    { en: "Your recording stays on this device. Nothing is sent anywhere, and " +
                            "nothing is saved.",
                        pt: "Sua gravação fica neste aparelho. Nada é enviado e nada é salvo." },
  "speak.compare":    { en: "Play them one after the other. Listen for where the beat falls, not " +
                            "for a perfect accent.",
                        pt: "Toque um depois do outro. Preste atenção em onde cai a força, não em " +
                            "ter um sotaque perfeito." },
  "speak.noRecorder": { en: "This browser cannot record. Say it out loud anyway — Clara is listening.",
                        pt: "Este navegador não grava. Fale em voz alta assim mesmo — a Clara está ouvindo." },
  "speak.noMic":      { en: "The microphone is not available. Say it out loud anyway, then carry on — " +
                            "nothing here is scored.",
                        pt: "O microfone não está disponível. Fale em voz alta assim mesmo e siga — " +
                            "nada aqui recebe nota." },
  "speak.badRec":     { en: "That did not record cleanly. Try once more, or just carry on.",
                        pt: "A gravação não saiu limpa. Tente mais uma vez, ou apenas siga." },

  /* ── writing ────────────────────────────────────────────────────────────── */
  "write.hearWord":   { en: "Hear the word",             pt: "Ouvir a palavra" },
  "write.writeWord":  { en: "Write the word.",           pt: "Escreva a palavra." },
  "write.free":       { en: "Write a full sentence. There is more than one good answer.",
                        pt: "Escreva uma frase inteira. Existe mais de uma boa resposta." },
  "write.own":        { en: "Answer in your own words.", pt: "Responda com suas palavras." },
  "write.yourAnswer": { en: "Your answer",               pt: "Sua resposta" },
  "write.check":      { en: "Check",                     pt: "Verificar" },
  "write.startsWith": { en: "It starts with “{x}”",      pt: "Começa com “{x}”" },
  "write.oneGood":    { en: "One good answer starts:",   pt: "Uma boa resposta começa assim:" },
  "write.notSpelling":{ en: "If you meant the same thing in different words, say so — this is not " +
                            "a spelling test.",
                        pt: "Se você quis dizer a mesma coisa com outras palavras, diga — isto não " +
                            "é um teste de ortografia." },
  "write.iMeant":     { en: "I meant that",              pt: "Quis dizer isso" },
  "write.tryAgain":   { en: "Let me try again",          pt: "Deixa eu tentar de novo" },
  "write.correct":    { en: "That's right!",             pt: "Correto!" },
  "write.carryOn":    { en: "Good. Carry on.",           pt: "Bom. Pode seguir." },

  /* ── tests ──────────────────────────────────────────────────────────────── */
  "test.band":        { en: "Band assessment",           pt: "Avaliação da faixa" },
  "test.unit":        { en: "Unit test",                 pt: "Teste da unidade" },
  "test.assessment":  { en: "Assessment",                pt: "Avaliação" },
  "test.finalIntro":  { en: "{n} questions, mixed across everything in {band}. Pass and the next " +
                            "band opens. Not passing costs nothing — whatever you miss goes straight " +
                            "into revision.",
                        pt: "{n} perguntas, misturadas por tudo em {band}. Passando, a próxima faixa " +
                            "abre. Não passar não custa nada — o que você errar vai direto para a revisão." },
  "test.unitIntro":   { en: "{n} questions, mixed across what you have done. Nothing is marked.",
                        pt: "{n} perguntas, misturadas pelo que você já fez. Nada é avaliado." },
  "test.notNow":      { en: "Not now",                   pt: "Agora não" },
  "test.start":       { en: "Start →",                   pt: "Começar →" },
  "test.passedFinal": { en: "Passed.",                   pt: "Passou." },
  "test.passedUnit":  { en: "All good.",                 pt: "Tudo certo." },
  "test.notYet":      { en: "Not yet.",                  pt: "Ainda não." },
  "test.scoreNext":   { en: "{right} of {total}. {band} is open — you can move up whenever you want to.",
                        pt: "{right} de {total}. {band} está aberta — você pode subir quando quiser." },
  "test.scoreOn":     { en: "{right} of {total}. Carry on.", pt: "{right} de {total}. Pode seguir." },
  "test.failed":      { en: "Everything you missed is now in revision. Come back to this when it " +
                            "feels easier — there is no limit on trying again.",
                        pt: "Tudo o que você errou já está na revisão. Volte aqui quando parecer mais " +
                            "fácil — não há limite de tentativas." },
  "test.moveUp":      { en: "Move up to {band} →",       pt: "Subir para {band} →" },
  "test.home":        { en: "Home →",                    pt: "Início →" },

  /* ── revision ───────────────────────────────────────────────────────────── */
  "rev.title":        { en: "Revision",                  pt: "Revisão" },
  "rev.back":         { en: "Back to what you missed.",  pt: "De volta ao que você errou." },
  "rev.weakBlurb":    { en: "Nothing dramatic — it is the skill with the most misses, so this " +
                            "session starts there. {n} things to go over.",
                        pt: "Nada demais — é a habilidade com mais erros, então a sessão começa por " +
                            "ela. {n} coisas para revisar." },
  "rev.blurb":        { en: "{n} things you did not get first time. New wrong answers each time, so " +
                            "this is not memorising a position.",
                        pt: "{n} coisas que você não acertou de primeira. As alternativas erradas mudam " +
                            "toda vez, então não dá para decorar a posição." },
  "rev.start":        { en: "Start →",                   pt: "Começar →" },
  "rev.cleared":      { en: "{n} of {m} cleared.",       pt: "{n} de {m} resolvidos." },
  "rev.nothing":      { en: "Nothing to revise.",        pt: "Nada para revisar." },
  "rev.allClean":     { en: "All of it, first time. Those are off the list.",
                        pt: "Tudo de primeira. Esses saíram da lista." },
  "rev.someLeft":     { en: "Whatever is still wrong stays on the list and will come back.",
                        pt: "O que ainda está errado continua na lista e vai voltar." },

  /* ── placement ──────────────────────────────────────────────────────────── */
  "place.title":      { en: "Let's find the right place to start.",
                        pt: "Vamos achar o lugar certo para começar." },
  "place.sub":        { en: "Two quick questions. Nothing here is a test you can fail.",
                        pt: "Duas perguntas rápidas. Nada aqui é um teste que dá para reprovar." },
  "place.label":      { en: "Placement",                 pt: "Nivelamento" },
  "place.step":       { en: "{n} of 2",                  pt: "{n} de 2" },
  "place.age":        { en: "How old is the learner?",   pt: "Qual é a idade de quem vai aprender?" },
  "place.dontKnow":   { en: "I don't know",              pt: "Não sei" },
  "place.startHere":  { en: "Start here.",               pt: "Comece por aqui." },
  "place.youngest":   { en: "Everything is pictures and sound. Nothing needs reading, and nothing " +
                            "is explained — Clara shows the first one and the rest follows.",
                        pt: "Tudo é figura e som. Nada precisa de leitura e nada é explicado — a Clara " +
                            "mostra o primeiro e o resto vai junto." },
  "place.changeable": { en: "You can change this at any time in Settings.",
                        pt: "Você pode mudar isso quando quiser nos Ajustes." },
  "place.band":       { en: "Band · {label}",            pt: "Faixa · {label}" },
  "place.level":      { en: "Starting level",            pt: "Nível inicial" },
  "place.openCats":   { en: "Topics open",               pt: "Temas liberados" },

  /* ── progress ───────────────────────────────────────────────────────────── */
  "prog.title":       { en: "Where you are.",            pt: "Onde você está." },
  "prog.known":       { en: "Words known",               pt: "Palavras sabidas" },
  "prog.settling":    { en: "Still settling",            pt: "Ainda fixando" },
  "prog.lessons":     { en: "Lessons",                   pt: "Aulas" },
  "prog.streak":      { en: "Day streak",                pt: "Dias seguidos" },
  "prog.fourSkills":  { en: "The four skills",           pt: "As quatro habilidades" },
  "prog.firstTry":    { en: "first-try accuracy",        pt: "acerto de primeira" },
  "prog.speakNote":   { en: "Speaking is counted, not scored. There is no pronunciation mark " +
                            "anywhere in this app, on purpose.",
                        pt: "A fala é contada, não avaliada. Não existe nota de pronúncia em lugar " +
                            "nenhum deste aplicativo, de propósito." },
  "prog.badges":      { en: "Badges",                    pt: "Medalhas" },
  "prog.badgeCount":  { en: "{n} of {m}",                pt: "{n} de {m}" },

  /* ── badges ─────────────────────────────────────────────────────────────── */
  "badge.first-lesson.t": { en: "First lesson",          pt: "Primeira aula" },
  "badge.first-lesson.h": { en: "Finish any lesson.",    pt: "Termine qualquer aula." },
  "badge.four-skills.t":  { en: "All four skills",       pt: "As quatro habilidades" },
  "badge.four-skills.h":  { en: "Finish a lesson with listening, speaking, reading and writing.",
                            pt: "Termine uma aula com escuta, fala, leitura e escrita." },
  "badge.streak-3.t":     { en: "Three days",            pt: "Três dias" },
  "badge.streak-3.h":     { en: "Practise three days in a row.",
                            pt: "Pratique três dias seguidos." },
  "badge.streak-7.t":     { en: "Seven days",            pt: "Sete dias" },
  "badge.streak-7.h":     { en: "Practise seven days in a row.",
                            pt: "Pratique sete dias seguidos." },
  "badge.fifty-words.t":  { en: "Fifty words",           pt: "Cinquenta palavras" },
  "badge.fifty-words.h":  { en: "Know fifty words.",     pt: "Saiba cinquenta palavras." },
  "badge.clean-quiz.t":   { en: "Perfect quiz",          pt: "Quiz perfeito" },
  "badge.clean-quiz.h":   { en: "Finish a quiz with no mistakes.",
                            pt: "Termine um quiz sem errar." },
  "badge.revised.t":      { en: "Went back",             pt: "Voltou atrás" },
  "badge.revised.h":      { en: "Finish a revision session.",
                            pt: "Termine uma sessão de revisão." },

  /* ── settings ───────────────────────────────────────────────────────────── */
  "set.title":        { en: "Settings",                  pt: "Ajustes" },
  "set.language":     { en: "Language of the buttons",   pt: "Idioma dos botões" },
  "set.languageNote": { en: "The lessons are always in English. This changes the interface only.",
                        pt: "As aulas são sempre em inglês. Isto muda só a interface." },
  "set.band":         { en: "Age band",                  pt: "Faixa etária" },
  "set.bandNote":     { en: "The band is presentation — type size, tap targets, whether writing " +
                            "means letter tiles or a paragraph. Changing it loses no progress.",
                        pt: "A faixa é apresentação — tamanho do texto, área de toque, se escrever " +
                            "é montar letras ou um parágrafo. Mudar não perde nenhum progresso." },
  "set.level":        { en: "Level",                     pt: "Nível" },
  "set.levelNote":    { en: "What the lessons contain. Raised by passing an assessment, and set " +
                            "here if the placement got it wrong.",
                        pt: "O que as aulas trazem. Sobe passando numa avaliação, e se ajusta aqui " +
                            "se o nivelamento errou." },
  "set.redoPlacement":{ en: "Take the placement again",  pt: "Refazer o nivelamento" },
  "set.sound":        { en: "Sound",                     pt: "Som" },
  "set.soundGo":      { en: "🔇 No sound?",              pt: "🔇 Sem som?" },
  "set.teacherGo":    { en: "Teacher area",              pt: "Área do professor" },
  "set.teacherNote":  { en: "The review queue, the mistake log and the audio self-test. Also " +
                            "reachable by holding the ⚙ for three seconds.",
                        pt: "A fila de revisão, o registro de erros e o autoteste de áudio. Também " +
                            "dá para chegar segurando o ⚙ por três segundos." },

  /* ── teacher ────────────────────────────────────────────────────────────── */
  "t.title":          { en: "Teacher",                   pt: "Professor" },
  "t.learner":        { en: "Learner",                   pt: "Aluno" },
  "t.band":           { en: "Band",                      pt: "Faixa" },
  "t.level":          { en: "Level",                     pt: "Nível" },
  "t.bandNote":       { en: "The band is presentation — type size, tap targets, whether writing " +
                            "means letter tiles or a paragraph. The level is content. Changing the " +
                            "band does not lose any progress.",
                        pt: "A faixa é apresentação — tamanho do texto, área de toque, se escrever é " +
                            "montar letras ou um parágrafo. O nível é conteúdo. Mudar a faixa não " +
                            "perde nenhum progresso." },
  "t.skills":         { en: "Skills",                    pt: "Habilidades" },
  "t.skillsNote":     { en: "Accuracy on first attempt. Speaking is deliberately not scored — it " +
                            "counts attempts, nothing else.",
                        pt: "Acerto na primeira tentativa. A fala não recebe nota de propósito — ela " +
                            "conta tentativas, nada mais." },
  "t.leadWith":       { en: "Revision will lead with {skill}.",
                        pt: "A revisão vai começar por {skill}." },
  "t.mistakes":       { en: "Mistakes ({n})",            pt: "Erros ({n})" },
  "t.noMistakes":     { en: "Nothing logged. A wrong first answer lands here and feeds revision " +
                            "until it is answered right.",
                        pt: "Nada registrado. Uma primeira resposta errada cai aqui e alimenta a " +
                            "revisão até ser respondida certo." },
  "t.andMore":        { en: "and {n} more",              pt: "e mais {n}" },
  "t.content":        { en: "Content ({n})",             pt: "Conteúdo ({n})" },
  "t.pending":        { en: "{n} waiting for review and unreachable by a learner. Approve one by " +
                            "setting \"reviewed\": true in its file.",
                        pt: "{n} aguardando revisão e fora do alcance do aluno. Aprove definindo " +
                            "\"reviewed\": true no arquivo." },
  "t.allApproved":    { en: "Everything has been approved and is visible to a learner.",
                        pt: "Tudo foi aprovado e está visível para o aluno." },
  "t.reviewed":       { en: "reviewed",                  pt: "revisado" },
  "t.notReviewed":    { en: "not reviewed",              pt: "não revisado" },
  "t.packMeta":       { en: "{cefr} · bands {bands} · {words} words · {phrases} phrases · " +
                            "{dialogue} dialogue lines · {reading}{speaking} speaking · {writing} " +
                            "writing · {quiz} quiz",
                        pt: "{cefr} · faixas {bands} · {words} palavras · {phrases} frases · " +
                            "{dialogue} falas de diálogo · {reading}{speaking} de fala · {writing} " +
                            "de escrita · {quiz} de quiz" },
  "t.onePassage":     { en: "1 passage · ",              pt: "1 texto · " },
  "t.selfTest":       { en: "Audio self-test",           pt: "Autoteste de áudio" },
  "t.selfTestNote":   { en: "Plays a line and reports what really happened, including whether the " +
                            "audio clock advanced. A page that reports no errors can still be " +
                            "completely silent.",
                        pt: "Toca uma frase e conta o que realmente aconteceu, inclusive se o relógio " +
                            "do áudio avançou. Uma página que não acusa erro nenhum ainda pode estar " +
                            "completamente muda." },
  "t.runTest":        { en: "Run the test",              pt: "Rodar o teste" },
  "t.device":         { en: "This device",               pt: "Este aparelho" },
  "t.deviceNote":     { en: "Everything is stored in this browser and nowhere else. No account, no " +
                            "server, no analytics, and no recording ever leaves the device.",
                        pt: "Tudo fica guardado neste navegador e em nenhum outro lugar. Sem conta, " +
                            "sem servidor, sem analytics, e nenhuma gravação sai do aparelho." },
  "t.erase":          { en: "Erase all progress",        pt: "Apagar todo o progresso" },
  "t.eraseSure":      { en: "Sure? Tap again",           pt: "Tem certeza? Toque de novo" },
  "t.eraseWarn":      { en: "This erases words, badges, mistakes and the streak on this device.",
                        pt: "Isto apaga palavras, medalhas, erros e a sequência de dias neste aparelho." },
  "t.erased":         { en: "Erased ✓",                  pt: "Apagado ✓" },
  "t.erasedNote":     { en: "Everything is back to the start.", pt: "Tudo voltou ao início." },

  /* Every line Clara SPEAKS, from the module the build script reads too. */
  ...SPOKEN
};

/* Which folder Clara's instruction clips come from. Content clips always come
   from the topic's own folder, whatever this says. */
export const uiClips = () => (lang() === "pt" ? "ui-pt" : "ui");

/* ── the machinery ────────────────────────────────────────────────────────── */

const watchers = [];
const FALLBACK = "pt";

export function lang() { return P.lang() || FALLBACK; }

export function setLang(id) {
  if (id !== "pt" && id !== "en") return;
  if (P.lang() === id) return;
  P.setLang(id);
  apply();
  for (const fn of watchers) { try { fn(id); } catch {} }
}

export function onChange(fn) { if (typeof fn === "function") watchers.push(fn); }

/**
 * One string, in the interface language.
 * Interpolation is {named}, never concatenation — a sentence assembled from
 * fragments cannot be reordered, and Portuguese reorders.
 */
export function t(key, vars) {
  const entry = S[key];
  if (!entry) {
    if (typeof console !== "undefined") console.warn("i18n: no string for", key);
    return key;
  }
  let s = entry[lang()] || entry.en || key;
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
  }
  return s;
}

/** "1 dia" · "3 dias". English and Portuguese agree on the boundary. */
export const plural = (n, one, other) => n + " " + t(n === 1 ? one : other);

/** Set the document language so screen readers and hyphenation follow along. */
export function apply() {
  try { document.documentElement.lang = lang() === "pt" ? "pt-BR" : "en"; } catch {}
}

/** Every key, for the leak test. Not used by the app. */
export const keys = () => Object.keys(S);
export const raw = key => S[key];
