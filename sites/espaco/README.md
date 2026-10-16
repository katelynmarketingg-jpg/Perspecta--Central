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

## Trocar as imagens provisórias (pasta `assets/`)
| Arquivo | O que é |
|---|---|
| `casa-fachada.svg` → foto da barn house (ideal ≥ 3000px de largura) | hero + início do Refúgio |
| `interior.svg` → foto do interior da mesma casa | Refúgio, vídeo (poster) |
| `video.mp4` | seção "Sua casa tem cara de sua?" (mudo, 10–20s, < 8 MB) |

Ao trocar, ajuste o caminho no `index.html` e o `data-focus` (ponto para onde o zoom vai, ex. `"40% 68%"`).

Cores ficam em variáveis no topo de `styles.css` (paleta tirada dos destaques do Instagram).
