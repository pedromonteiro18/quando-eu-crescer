# Quando Eu Crescer

Inglês para crianças de 6 a 9 anos **através de profissões**. A criança escolhe um trabalho que
gostaria de fazer, aprende as palavras que aquele trabalho usa de verdade, e joga situações do
trabalho. O trabalho é a motivação; o vocabulário é a carga.

**▶️ <https://pedromonteiro18.github.io/quando-eu-crescer/>** — abra no celular, em pé.

Sem conta, sem instalação, sem internet depois de carregar. Uma missão leva ~3,5 minutos:

1. **Conhecer** — 5 palavras, figura grande, o inglês é falado sozinho
2. **Ouça e toque** — ouve uma palavra em inglês, toca na figura certa entre 3
3. **No trabalho** — cena de 3 partes: a situação vem em português, a *tarefa* vem em inglês

No fim, uma medalha: *"Você é um Pequeno Veterinário!"*

Três profissões prontas: 🩺 Veterinário · 🚒 Bombeiro · 👩‍🍳 Chef de Cozinha

---

## Para quem for revisar o inglês

Segure o ⚙ da tela inicial por **3 segundos**. A área de pais e professores mostra
**todas as frases em inglês que o app fala**, pacote por pacote — é só ler e apontar o que
não soa natural. Cada frase é uma linha de texto em `prototype/index.html`.

Lá também dá para **trocar a voz** do aparelho: a qualidade das vozes varia muito de um
celular para outro, e a escolha fica guardada.

---

## Rodando localmente

`prototype/index.html` é o app inteiro — um arquivo, sem build, sem dependências.
Abra direto no navegador, ou:

```sh
python3 -m http.server 8000 --directory prototype
```

Depois de editar `index.html`, gere a cópia usada para publicar no Claude:

```sh
node prototype/build-artifact.mjs
```

## Privacidade

Nenhuma conta, nenhum servidor, nenhuma chamada de rede, nenhuma análise de uso.
Medalhas e progresso ficam no `localStorage` do próprio navegador. Não há dado de criança
saindo do aparelho — por isso não há nada a consentir sob a LGPD.

As decisões de produto, o formato dos pacotes de conteúdo e o que vem depois estão em
[DESIGN.md](DESIGN.md).
