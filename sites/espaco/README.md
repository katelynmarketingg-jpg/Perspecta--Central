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
Todas as imagens são de uma obra real da Espacio (quadro de vídeo de drone, ampliado 4x com super-resolução EDSR).

| Arquivo | Onde aparece |
|---|---|
| `casa-fachada.jpg` | abertura (quadro vertical que se abre até tela cheia) + Refúgio + galeria |
| `entrada.jpg`, `deck.jpg`, `cobertura.jpg` | recortes de detalhe da mesma obra (galeria e seção do vídeo) |
| `interior.jpg` | opcional: se existir, o Refúgio atravessa a janela para dentro da casa |
| `socias.jpg` | opcional: foto das sócias; sem ela aparece a frase "antes de projetar, a gente escuta" |
| `video.mp4` | opcional: "Sua casa tem cara de sua?" (mudo, 10–20s, < 8 MB) |

O ponto para onde o zoom vai é o `data-focus` no `index.html`. Para nitidez máxima no desktop, troque pelo vídeo/foto original em resolução cheia.

Cores ficam em variáveis no topo de `styles.css` (paleta tirada dos destaques do Instagram).
