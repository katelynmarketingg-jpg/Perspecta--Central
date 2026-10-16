/* Espacio — animações (JS puro, sem dependências) */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, from, to) => clamp((p - from) / (to - from));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  $("#ano").textContent = new Date().getFullYear();

  /* --- Divide o título em letras para a entrada --- */
  $$("[data-split]").forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(" ");
            const w = document.createElement("span");
            w.className = "word";
            [...part].forEach((ch) => {
              const c = document.createElement("span");
              c.className = "char";
              c.style.setProperty("--i", i++);
              c.textContent = ch;
              w.append(c);
            });
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
  });

  /* --- Divide o manifesto em palavras --- */
  $$("[data-words]").forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(part);
            const w = document.createElement("span");
            w.className = "w";
            w.textContent = part;
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });

  /* --- Abertura: cortina sobe e a casa começa a se aproximar sozinha --- */
  document.body.classList.add("is-loading");
  let introStart = null;
  const INTRO_MS = reduce ? 0 : 3200;
  const start = () => {
    setTimeout(() => {
      document.body.classList.remove("is-loading");
      document.body.classList.add("is-ready");
      introStart = performance.now();
    }, reduce ? 0 : 900);
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);

  /* --- Vídeo: se não houver assets/video.mp4, mostra a imagem --- */
  $$(".video-frame video").forEach((v) => {
    v.addEventListener("error", () => (v.style.display = "none"), true);
    const src = v.querySelector("source");
    if (src) src.addEventListener("error", () => (v.style.display = "none"));
  });

  /* --- Revelação ao entrar na tela --- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
    { threshold: 0.18 }
  );
  $$(".reveal-up").forEach((el) => io.observe(el));

  /* progresso de rolagem de uma seção "pinada" (0 → 1) */
  const progress = (section) => {
    const r = section.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };

  const nav = $("#nav");
  const hero = $(".hero");
  const heroMedia = $(".hero-media");
  const heroCopy = $(".hero-copy");
  const heroHaze = $(".hero-haze");
  const heroHint = $(".scroll-hint");
  heroMedia.style.transformOrigin = heroMedia.dataset.focus || "50% 60%";

  const manifesto = $(".manifesto");
  const words = $$(".manifesto .w");

  const identity = $(".identity");
  const videoFrame = $(".video-frame");
  const identityTitle = $(".identity-title");

  const refuge = $(".refuge");
  const outside = $(".refuge-outside");
  const inside = $(".refuge-inside");
  const steps = $$(".refuge-step");
  const refugeBar = $(".refuge-progress span");
  outside.style.transformOrigin = outside.dataset.focus || "50% 60%";

  const projects = $(".projects");
  const track = $(".projects-track");

  const parallax = $$("[data-parallax]");

  let introT = reduce ? 1 : 0;

  const frame = (now) => {
    if (introStart !== null && introT < 1) introT = INTRO_MS ? clamp((now - introStart) / INTRO_MS) : 1;
    const vh = window.innerHeight;

    nav.classList.toggle("is-solid", window.scrollY > hero.offsetHeight - vh * 1.05);

    /* 1. HERO — de longe para perto.
       A abertura leva a casa do "longe" até a média distância;
       a rolagem continua a aproximação até a porta. */
    {
      const s = progress(hero);
      const p = reduce ? 1 : 0.32 * easeOut(introT) + 0.68 * s;
      // janela que se abre (casa vista ao longe, como um quadro)
      const open = easeInOut(range(p, 0, 0.45));
      const insetY = lerp(30, 0, open);
      const insetX = lerp(34, 0, open);
      const radius = lerp(18, 0, open);
      // zoom contínuo: afasta → chega perto
      const zoom = lerp(1, 1.85, easeInOut(range(p, 0.3, 1)));
      const scaleFar = lerp(0.82, 1, open);
      const blur = lerp(3, 0, range(p, 0, 0.4));
      heroMedia.style.clipPath = `inset(${insetY}% ${insetX}% round ${radius}px)`;
      heroMedia.style.transform = `scale(${scaleFar * zoom})`;
      heroMedia.style.filter = blur > 0.05 ? `blur(${blur}px) saturate(${lerp(0.8, 1.05, open)})` : "none";
      heroHaze.style.opacity = 1 - range(p, 0, 0.5);
      const out = range(s, 0.55, 0.9);
      heroCopy.style.opacity = 1 - out;
      heroCopy.style.transform = `translateY(${-out * 80}px)`;
      heroHint.style.opacity = 0.8 * (1 - range(s, 0, 0.1));
    }

    /* 2. MANIFESTO — palavras acendem com a rolagem */
    {
      const p = progress(manifesto);
      const n = Math.floor(range(p, 0.05, 0.85) * (words.length + 1));
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    }

    /* 3. SUA CASA TEM CARA DE SUA? — vídeo cresce até tela cheia */
    {
      const p = progress(identity);
      const t = easeInOut(range(p, 0.1, 0.7));
      const y = lerp(38, 0, t), x = lerp(36, 0, t), r = lerp(400, 0, t);
      videoFrame.style.clipPath = `inset(${y}% ${x}% round ${r}px)`;
      const titleOut = range(p, 0.35, 0.65);
      identityTitle.style.opacity = 1 - titleOut;
      identityTitle.style.transform = `scale(${lerp(1, 1.15, titleOut)})`;
    }

    /* 5. REFÚGIO — fora → janela → dentro, depois caminhada pelo interior */
    {
      const p = progress(refuge);
      // aproxima a fachada até a janela
      const zIn = easeInOut(range(p, 0, 0.4));
      outside.style.transform = `scale(${lerp(1.05, 3.2, zIn)})`;
      outside.style.opacity = 1 - range(p, 0.3, 0.42);
      // atravessa a janela: interior aparece já "perto" e a câmera percorre o ambiente
      const cross = range(p, 0.3, 0.42);
      const walk = easeInOut(range(p, 0.36, 1));
      inside.style.opacity = cross;
      inside.style.transform = `scale(${lerp(1.5, 1.15, cross) + walk * 0.18}) translate3d(${lerp(4, -5, walk)}%, ${lerp(1, -2, walk)}%, 0)`;
      steps.forEach((el) => el.classList.toggle("on", p >= +el.dataset.from && p < +el.dataset.to));
      refugeBar.style.transform = `scaleX(${p})`;
    }

    /* 7. PROJETOS — rolagem vertical vira horizontal */
    {
      const p = progress(projects);
      const max = track.scrollWidth - window.innerWidth;
      track.style.transform = `translate3d(${-max * easeInOut(p) * 1}px,0,0)`;
    }

    /* parallax leve nas fotos */
    parallax.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      el.firstElementChild.style.transform = `translate3d(0, ${c * +el.dataset.parallax * 100 - 8}%, 0)`;
    });

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
