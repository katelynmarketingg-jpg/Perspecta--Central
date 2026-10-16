# Site Espacio — Arquitetura & Interiores (@espaciosap)

Site estático (HTML + CSS + JS puro), independente do painel Next.js deste repositório.
Abra `index.html` ou sirva a pasta (`python3 -m http.server`) — publica em qualquer host estático (Netlify, Vercel).

## Seções
1. **Hero** — a casa aparece "de longe" e se aproxima (sozinha na abertura, depois com a rolagem) + "Criamos espaços para viver."
2. **Manifesto** — "Desde 2008, ouvindo, acolhendo e projetando" acendendo palavra por palavra.
3. **Sua casa tem cara de sua?** — vídeo que cresce até tela cheia.
4. **Quem somos** — as sócias, com @ do Instagram.
5. **Refúgio** — de fora para dentro (zoom na fachada) → atravessa o vidro → caminhada pelo interior.
6. **Como trabalhamos** — Ouvir · Acolher · Projetar.
7. **Projetos** — galeria horizontal.
8. **Contato** — link de contato + Instagram.

## Fotos (pasta `assets/`)
Enquanto um `.jpg` não existir, o site mostra o desenho `.svg` provisório no lugar.

| Arquivo | Onde aparece |
|---|---|
| `drone-longe.jpg` | abertura: voo aéreo descendo até a casa (opcional; sem ele o zoom usa só a fachada) |
| `casa-fachada.jpg` | abertura (fim do voo) + início do Refúgio |
| `interior.jpg` | Refúgio (passagem para dentro) + fundo do vídeo |
| `socias.jpg` | Quem somos |
| `cozinha.jpg`, `quarto.jpg` | galeria de projetos |
| `video.mp4` | "Sua casa tem cara de sua?" (mudo, 10–20s, < 8 MB) |

Use JPG com 2400–3500px de largura. O ponto para onde o zoom vai é o `data-focus` no `index.html`.

Cores ficam em variáveis no topo de `styles.css` (paleta tirada dos destaques do Instagram).
