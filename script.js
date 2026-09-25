/* ==========================================================================
   NINETEENTH — interactions & animation
   Vanilla JS, no dependencies.
   ========================================================================== */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const state = {
    scroll: window.scrollY,
    lastScroll: window.scrollY,
    velocity: 0,
    vw: window.innerWidth,
    vh: window.innerHeight,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    mouseN: { x: 0, y: 0 }, // normalised -1..1
  };

  /* ------------------------------------------------------------------
     Split text into masked characters
     ------------------------------------------------------------------ */
  $$("[data-split]").forEach((el) => {
    const text = el.textContent;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<span class="word-mask">${[...text]
      .map((ch) => `<span class="char">${ch === " " ? "&nbsp;" : ch}</span>`)
      .join("")}</span>`;
  });

  // Give every character in a heading a staggered delay
  const splitGroups = new Set($$("[data-split]").map((el) => el.closest("h1, h2, h3") || el));
  splitGroups.forEach((group) => {
    $$(".char", group).forEach((c, i) => (c.style.transitionDelay = `${i * 0.028}s`));
  });

  /* ------------------------------------------------------------------
     Film grain (canvas noise tile — no seams)
     ------------------------------------------------------------------ */
  (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 180;
    const g = c.getContext("2d");
    const img = g.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $(".grain").style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  /* ------------------------------------------------------------------
     Manifesto: wrap words for scroll-driven highlight
     ------------------------------------------------------------------ */
  const manifesto = $("[data-words]");
  const manifestoWords = [];
  if (manifesto) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else {
              const span = document.createElement("span");
              span.className = "w";
              span.textContent = part;
              frag.appendChild(span);
              manifestoWords.push(span);
            }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(manifesto);
  }

  /* ------------------------------------------------------------------
     Preloader
     ------------------------------------------------------------------ */
  const preloader = $("#preloader");
  const countEl = $("#preloaderCount");
  const pBall = $("#preloaderBall");
  let pageLoaded = document.readyState === "complete";
  window.addEventListener("load", () => (pageLoaded = true));

  const runPreloader = () =>
    new Promise((resolve) => {
      const minTime = reduceMotion ? 300 : 2200;
      const maxTime = 5000;
      const start = performance.now();
      const course = pBall.parentElement;

      const tick = (now) => {
        const elapsed = now - start;
        let t = clamp(elapsed / minTime, 0, 1);
        if (!pageLoaded && elapsed < maxTime) t = Math.min(t, 0.92);
        const eased = 1 - Math.pow(1 - t, 3);
        const pct = Math.round(eased * 100);
        countEl.textContent = pct;
        const travel = course.clientWidth - 30;
        pBall.style.transform = `translateX(${eased * travel}px) rotate(${eased * 720}deg)`;
        if (t < 1) return requestAnimationFrame(tick);
        // drop into the cup
        pBall.style.transition = "transform .35s cubic-bezier(.5,0,.75,0), opacity .3s .2s";
        pBall.style.transform = `translateX(${travel + 4}px) translateY(18px) scale(.6)`;
        pBall.style.opacity = "0";
        setTimeout(resolve, 450);
      };
      requestAnimationFrame(tick);
    });

  const revealHero = () => {
    $(".hero__title").classList.add("is-inview");
    $$(".hero .reveal-up").forEach((el, i) =>
      setTimeout(() => el.classList.add("is-inview"), 500 + i * 120)
    );
  };

  runPreloader().then(() => {
    preloader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    setTimeout(revealHero, 350);
    setTimeout(() => preloader.classList.add("is-gone"), 1300);
    measure();
  });

  /* ------------------------------------------------------------------
     Smooth scroll (wheel-lerp, keeps native sticky positioning)
     ------------------------------------------------------------------ */
  const smooth = {
    enabled: finePointer && !reduceMotion,
    target: window.scrollY,
    current: window.scrollY,
    active: false,
  };
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

  if (smooth.enabled) {
    document.documentElement.classList.add("has-smooth");
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || document.body.classList.contains("is-loading") || document.body.classList.contains("menu-open")) return;
        e.preventDefault();
        const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
        if (!smooth.active) smooth.current = smooth.target = window.scrollY;
        smooth.target = clamp(smooth.target + delta, 0, maxScroll());
        smooth.active = true;
      },
      { passive: false }
    );
    window.addEventListener("scroll", () => {
      if (!smooth.active) smooth.target = smooth.current = window.scrollY;
    });
  }

  const scrollToY = (y) => {
    y = clamp(y, 0, maxScroll());
    if (smooth.enabled) {
      smooth.current = window.scrollY;
      smooth.target = y;
      smooth.active = true;
    } else {
      window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    }
  };

  const updateSmooth = () => {
    if (!smooth.active) return;
    smooth.current = lerp(smooth.current, smooth.target, 0.095);
    if (Math.abs(smooth.target - smooth.current) < 0.5) {
      smooth.current = smooth.target;
      smooth.active = false;
    }
    window.scrollTo(0, smooth.current);
  };

  // Anchor links
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    e.preventDefault();
    if (document.body.classList.contains("menu-open")) toggleMenu(false);
    if (id === "#") return;
    const target = id === "#top" ? document.body : $(id);
    if (!target) return;
    scrollToY(target.getBoundingClientRect().top + window.scrollY);
  });

  /* ------------------------------------------------------------------
     Custom cursor
     ------------------------------------------------------------------ */
  const cursor = $("#cursor");
  const cursorDot = $(".cursor__dot");
  const cursorRing = $(".cursor__ring");
  const cursorLabel = $("#cursorLabel");
  const ringPos = { x: state.mouse.x, y: state.mouse.y };

  window.addEventListener("pointermove", (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouseN.x = (e.clientX / state.vw) * 2 - 1;
    state.mouseN.y = (e.clientY / state.vh) * 2 - 1;
  });
  window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));

  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-cursor]");
    if (t) {
      cursorLabel.textContent = t.dataset.cursor;
      cursor.classList.add("is-hover");
    } else if (e.target.closest("a, button, input")) {
      cursorLabel.textContent = "";
      cursor.classList.add("is-hover");
    } else {
      cursor.classList.remove("is-hover");
    }
  });
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));

  const updateCursor = () => {
    ringPos.x = lerp(ringPos.x, state.mouse.x, 0.18);
    ringPos.y = lerp(ringPos.y, state.mouse.y, 0.18);
    cursorDot.style.transform = `translate3d(${state.mouse.x}px, ${state.mouse.y}px, 0)`;
    cursorRing.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
  };

  /* ------------------------------------------------------------------
     Magnetic elements (uses `translate` so it never fights transforms)
     ------------------------------------------------------------------ */
  if (finePointer) {
    $$(".magnetic").forEach((el) => {
      const strength = el.classList.contains("btn") ? 0.35 : 0.25;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transition = "translate .25s ease-out";
        el.style.translate = `${x * strength}px ${y * strength}px`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "translate .7s cubic-bezier(.16,1,.3,1)";
        el.style.translate = "0 0";
      });
    });
  }

  /* ------------------------------------------------------------------
     Header + menu
     ------------------------------------------------------------------ */
  const header = $("#header");
  const menuBtn = $("#menuBtn");
  const menu = $("#menu");

  function toggleMenu(force) {
    const open = typeof force === "boolean" ? force : !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    header.classList.remove("is-hidden");
  }
  menuBtn.addEventListener("click", () => toggleMenu());
  window.addEventListener("keydown", (e) => e.key === "Escape" && toggleMenu(false));

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", state.scroll > 40);
    if (document.body.classList.contains("menu-open")) return;
    if (state.scroll > state.vh * 0.6 && state.velocity > 1.5) header.classList.add("is-hidden");
    else if (state.velocity < -1.5 || state.scroll < state.vh * 0.6) header.classList.remove("is-hidden");
  };

  /* ------------------------------------------------------------------
     Toast + cart
     ------------------------------------------------------------------ */
  const toastEl = $("#toast");
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
  };

  const cartCount = $("#cartCount");
  let cart = 0;
  $$(".card[data-tilt]").forEach((card) => {
    const shape = $(".product__shape > :first-child", card);
    const shapeSecond = $(".product__shape > :nth-child(2)", card);

    $$(".card__swatches button", card).forEach((sw) => {
      sw.addEventListener("click", (e) => {
        e.stopPropagation();
        $$(".card__swatches button", card).forEach((b) => b.classList.remove("active"));
        sw.classList.add("active");
        const c = getComputedStyle(sw).getPropertyValue("--c").trim();
        shape.setAttribute("fill", c);
        card.animate([{ transform: "scale(.97)" }, { transform: "scale(1)" }], { duration: 400, easing: "cubic-bezier(.16,1,.3,1)" });
      });
    });

    // tie paired shapes (e.g. hat brim) to the swatch colour
    if (shapeSecond && shapeSecond.getAttribute("fill") === shape.getAttribute("fill")) {
      shapeSecond.dataset.base = shapeSecond.getAttribute("fill");
      const observer = new MutationObserver(() => shapeSecond.setAttribute("fill", shape.getAttribute("fill")));
      observer.observe(shape, { attributes: true, attributeFilter: ["fill"] });
    }

    card.addEventListener("click", () => {
      cart++;
      cartCount.textContent = cart;
      cartCount.classList.remove("bump");
      void cartCount.offsetWidth;
      cartCount.classList.add("bump");
      toast(`${$("h3", card).textContent} added to your bag ⛳`);
      burst(state.mouse.x, state.mouse.y);
    });

    if (finePointer && !reduceMotion) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 14}deg) rotateX(${-py * 14}deg) translateY(-6px)`;
      });
      card.addEventListener("pointerleave", () => (card.style.transform = ""));
    }
  });

  $("#cartBtn").addEventListener("click", () =>
    toast(cart ? `You have ${cart} item${cart > 1 ? "s" : ""} in your bag` : "Your bag is empty — go shopping!")
  );

  /* DOM confetti burst */
  const burstColors = ["#ff5a36", "#ffd84d", "#2d6cdf", "#1f7a4a", "#ffc3d8"];
  function burst(x, y) {
    if (reduceMotion) return;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("span");
      const size = 6 + Math.random() * 8;
      Object.assign(p.style, {
        position: "fixed", left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`,
        background: burstColors[i % burstColors.length], borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        zIndex: 997, pointerEvents: "none",
      });
      document.body.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      p.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 80}px) rotate(${Math.random() * 540}deg) scale(.4)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.16,1,.3,1)" }
      ).onfinish = () => p.remove();
    }
  }

  /* ------------------------------------------------------------------
     In-view reveals
     ------------------------------------------------------------------ */
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-inview");
        io.unobserve(en.target);
        if (en.target.dataset.count) countUp(en.target);
      }),
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".reveal-up").forEach((el) => !el.closest(".hero") && io.observe(el));
  splitGroups.forEach((g) => !g.closest(".hero") && io.observe(g));
  $$(".gallery__item, .footer__word, [data-count]").forEach((el) => io.observe(el));

  $$(".footer__word span").forEach((s, i) => (s.style.transitionDelay = `${i * 0.06}s`));

  /* Counters */
  function countUp(el) {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    const dur = reduceMotion ? 1 : 2000;
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = Math.round(end * eased).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* Images: graceful fallback to the illustrated gradient */
  $$(".img-wrap img").forEach((img) => {
    const fail = () => img.classList.add("is-broken");
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0) fail();
  });

  /* ------------------------------------------------------------------
     Marquee (scroll-velocity reactive)
     ------------------------------------------------------------------ */
  const marquees = $$("[data-marquee]").map((track) => {
    const group = $(".marquee__group", track);
    const clones = [];
    return { track, group, clones, x: 0, dir: +track.dataset.speed || 1, width: 0 };
  });
  const layoutMarquees = () => {
    marquees.forEach((m) => {
      m.clones.forEach((c) => c.remove());
      m.clones.length = 0;
      m.width = m.group.offsetWidth;
      const needed = Math.ceil((state.vw * 2) / Math.max(m.width, 1)) + 1;
      for (let i = 0; i < needed; i++) {
        const c = m.group.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        m.track.appendChild(c);
        m.clones.push(c);
      }
    });
  };
  const updateMarquees = () => {
    const boost = clamp(Math.abs(state.velocity) * 0.35, 0, 18);
    const skew = clamp(state.velocity * 0.25, -8, 8);
    marquees.forEach((m) => {
      const dir = state.velocity < -0.5 ? -m.dir : m.dir;
      m.x -= (1.1 + boost) * dir;
      if (m.x <= -m.width) m.x += m.width;
      if (m.x > 0) m.x -= m.width;
      m.track.style.transform = `translate3d(${m.x}px,0,0) skewX(${skew}deg)`;
    });
  };

  /* ------------------------------------------------------------------
     Hero parallax scene
     ------------------------------------------------------------------ */
  const heroLayers = $$(".hero__scene .layer").map((el) => ({ el, depth: +el.dataset.depth || 0 }));
  const heroMouse = { x: 0, y: 0 };
  const updateHero = () => {
    if (state.scroll > state.vh * 1.2) return;
    heroMouse.x = lerp(heroMouse.x, state.mouseN.x, 0.06);
    heroMouse.y = lerp(heroMouse.y, state.mouseN.y, 0.06);
    heroLayers.forEach(({ el, depth }) => {
      const tx = -heroMouse.x * depth * 60;
      const ty = -heroMouse.y * depth * 30 + state.scroll * depth * 0.6;
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    });
    const content = $(".hero__content");
    content.style.transform = `translate3d(0, ${state.scroll * -0.15}px, 0)`;
    content.style.opacity = String(clamp(1 - state.scroll / (state.vh * 0.9), 0, 1));
  };

  /* Floating stickers */
  const stickers = $$("[data-float]").map((el, i) => ({ el, f: [0.12, -0.08, 0.18][i % 3] }));
  const manifestoSection = $("#manifesto");

  /* ------------------------------------------------------------------
     Horizontal shop + other layout measurements
     ------------------------------------------------------------------ */
  const shop = $("#shop");
  const shopTrack = $("#shopTrack");
  const shopProgress = $("#shopProgress");
  const layout = { shopTop: 0, shopDist: 0 };

  /* Shrink oversized display type so it never overflows its container */
  const fitTargets = [
    { el: $(".hero__title"), lines: () => $$(".hero__title .line") },
    { el: $(".footer__word"), lines: () => [$(".footer__word")] },
  ];
  function fitText() {
    fitTargets.forEach(({ el, lines }) => {
      el.style.fontSize = "";
      const avail = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
      el.style.display = el === fitTargets[1].el ? "inline-flex" : "";
      const widest = Math.max(...lines().map((l) => l.scrollWidth));
      el.style.display = "";
      if (widest > avail) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${Math.floor(size * (avail / widest) * 0.98)}px`;
      }
    });
  }

  function measure() {
    state.vw = window.innerWidth;
    state.vh = window.innerHeight;
    fitText();
    const dist = Math.max(0, shopTrack.scrollWidth - state.vw);
    layout.shopDist = dist;
    shop.style.height = `${dist + state.vh}px`;
    layout.shopTop = shop.getBoundingClientRect().top + window.scrollY;
    layoutMarquees();
    resizeGame();
  }

  const updateShop = () => {
    const p = clamp((state.scroll - layout.shopTop) / Math.max(layout.shopDist, 1), 0, 1);
    shopTrack.style.transform = `translate3d(${-p * layout.shopDist}px,0,0)`;
    shopProgress.style.transform = `scaleX(${p})`;
  };

  /* Manifesto words */
  const updateManifesto = () => {
    if (!manifesto) return;
    const r = manifesto.getBoundingClientRect();
    if (r.bottom < -100 || r.top > state.vh + 100) return;
    const p = clamp((state.vh * 0.8 - r.top) / (r.height + state.vh * 0.1), 0, 1);
    const n = Math.floor(p * manifestoWords.length * 1.05);
    manifestoWords.forEach((w, i) => w.classList.toggle("on", i < n));

    const mr = manifestoSection.getBoundingClientRect();
    const rel = mr.top + mr.height / 2 - state.vh / 2;
    stickers.forEach(({ el, f }, i) => {
      el.style.transform = `translate3d(${state.mouseN.x * (i + 1) * 8}px, ${rel * f}px, 0) rotate(${rel * f * 0.05}deg)`;
    });
  };

  /* Ritual stacking cards */
  const ritualCards = $$(".ritual-card");
  const updateRitual = () => {
    const tops = ritualCards.map((c) => c.getBoundingClientRect().top);
    ritualCards.forEach((card, i) => {
      let covered = 0;
      for (let j = i + 1; j < ritualCards.length; j++) {
        const stickTop = parseFloat(getComputedStyle(ritualCards[j]).top) || 0;
        covered += clamp((state.vh - tops[j]) / (state.vh - stickTop), 0, 1);
      }
      const s = 1 - covered * 0.045;
      card.style.transform = `scale(${s})`;
      card.style.filter = covered ? `brightness(${1 - covered * 0.12})` : "";
    });
  };

  /* Gallery parallax */
  const galleryItems = $$(".gallery__item").map((el) => ({ el, speed: +el.dataset.speed || 0 }));
  const updateGallery = () => {
    galleryItems.forEach(({ el, speed }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > state.vh + 200) return;
      const offset = (r.top + r.height / 2 - state.vh / 2) * speed;
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
  };

  /* ------------------------------------------------------------------
     Collections hover image
     ------------------------------------------------------------------ */
  const floatEl = $("#collectionsFloat");
  const floatInner = $("#collectionsFloatInner");
  const floatPos = { x: state.mouse.x, y: state.mouse.y, rot: 0 };
  let floatActive = false;

  $$(".collection").forEach((row) => {
    row.style.setProperty("--hover", row.dataset.color);
    const img = new Image();
    img.src = row.dataset.img; // preload
    row.addEventListener("pointerenter", () => {
      floatActive = true;
      floatEl.classList.add("is-visible");
      floatInner.style.backgroundImage = `url("${row.dataset.img}"), linear-gradient(135deg, ${row.dataset.color}, #1f7a4a)`;
      floatInner.animate([{ transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 700, easing: "cubic-bezier(.16,1,.3,1)" });
    });
    row.addEventListener("pointerleave", () => {
      floatActive = false;
      floatEl.classList.remove("is-visible");
    });
    row.addEventListener("click", () => toast(`Opening ${row.querySelector(".collection__name").textContent}…`));
  });

  const updateFloat = () => {
    if (!finePointer) return;
    const prevX = floatPos.x;
    floatPos.x = lerp(floatPos.x, state.mouse.x, 0.12);
    floatPos.y = lerp(floatPos.y, state.mouse.y, 0.12);
    floatPos.rot = lerp(floatPos.rot, clamp((floatPos.x - prevX) * 0.6, -14, 14), 0.2);
    const w = floatEl.offsetWidth;
    const h = floatEl.offsetHeight;
    floatEl.style.transform = `translate3d(${floatPos.x - w / 2}px, ${floatPos.y - h / 2}px, 0) rotate(${floatPos.rot}deg) scale(${floatActive ? 1 : 0.6})`;
  };

  /* ------------------------------------------------------------------
     Mini putting game
     ------------------------------------------------------------------ */
  const canvas = $("#puttCanvas");
  const ctx = canvas.getContext("2d");
  const strokesEl = $("#strokes");
  const winEl = $("#playWin");
  const game = {
    w: 0, h: 0, dpr: 1,
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: 10, sunk: false, scale: 1 },
    hole: { x: 0, y: 0, r: 16 },
    walls: [],
    sand: null,
    aiming: false, aimStart: null, aimNow: null,
    strokes: 0,
    confetti: [],
    visible: false,
  };

  function resetGame() {
    const { w, h } = game;
    Object.assign(game.ball, { x: w * 0.12, y: h * 0.62, vx: 0, vy: 0, sunk: false, scale: 1 });
    game.hole.x = w * 0.86;
    game.hole.y = h * 0.4;
    game.walls = [
      { x: w * 0.38, y: h * 0.12, w: w * 0.035, h: h * 0.46 },
      { x: w * 0.6, y: h * 0.45, w: w * 0.035, h: h * 0.43 },
    ];
    game.sand = { x: w * 0.47, y: h * 0.2, rx: w * 0.07, ry: h * 0.12 };
    game.strokes = 0;
    strokesEl.textContent = "0";
    game.confetti = [];
    winEl.classList.remove("is-visible");
  }

  function resizeGame() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const changed = Math.abs(r.width - game.w) > 1 || Math.abs(r.height - game.h) > 1;
    game.dpr = Math.min(window.devicePixelRatio || 1, 2);
    game.w = r.width;
    game.h = r.height;
    canvas.width = r.width * game.dpr;
    canvas.height = r.height * game.dpr;
    ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
    game.ball.r = clamp(r.width * 0.012, 8, 12);
    game.hole.r = game.ball.r * 1.7;
    if (changed) resetGame();
  }

  const pointerPos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const ballStopped = () => Math.hypot(game.ball.vx, game.ball.vy) < 0.05 && !game.ball.sunk;

  canvas.addEventListener("pointerdown", (e) => {
    if (!ballStopped()) return;
    canvas.setPointerCapture(e.pointerId);
    game.aiming = true;
    game.aimStart = pointerPos(e);
    game.aimNow = game.aimStart;
  });
  canvas.addEventListener("pointermove", (e) => game.aiming && (game.aimNow = pointerPos(e)));
  const release = () => {
    if (!game.aiming) return;
    game.aiming = false;
    const dx = game.aimStart.x - game.aimNow.x;
    const dy = game.aimStart.y - game.aimNow.y;
    const len = Math.hypot(dx, dy);
    if (len < 6) return;
    const power = Math.min(len, 220) / 220;
    const speed = power * 22;
    game.ball.vx = (dx / len) * speed;
    game.ball.vy = (dy / len) * speed;
    game.strokes++;
    strokesEl.textContent = game.strokes;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", () => (game.aiming = false));
  $("#playAgain").addEventListener("click", resetGame);

  const inSand = (x, y) => {
    const s = game.sand;
    return ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 < 1;
  };

  function stepGame(dt) {
    const b = game.ball;
    if (b.sunk) {
      b.scale = Math.max(0, b.scale - 0.06 * dt);
      b.x = lerp(b.x, game.hole.x, 0.2);
      b.y = lerp(b.y, game.hole.y, 0.2);
    } else {
      const sub = 4;
      for (let s = 0; s < sub; s++) {
        b.x += (b.vx * dt) / sub;
        b.y += (b.vy * dt) / sub;
        // bounds
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.7; }
        if (b.x > game.w - b.r) { b.x = game.w - b.r; b.vx = -Math.abs(b.vx) * 0.7; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.7; }
        if (b.y > game.h - b.r) { b.y = game.h - b.r; b.vy = -Math.abs(b.vy) * 0.7; }
        // walls
        game.walls.forEach((wl) => {
          const cx = clamp(b.x, wl.x, wl.x + wl.w);
          const cy = clamp(b.y, wl.y, wl.y + wl.h);
          const dx = b.x - cx, dy = b.y - cy;
          const d = Math.hypot(dx, dy);
          if (d < b.r && d > 0) {
            const nx = dx / d, ny = dy / d;
            b.x = cx + nx * b.r;
            b.y = cy + ny * b.r;
            const dot = b.vx * nx + b.vy * ny;
            b.vx = (b.vx - 2 * dot * nx) * 0.75;
            b.vy = (b.vy - 2 * dot * ny) * 0.75;
          }
        });
      }
      const friction = inSand(b.x, b.y) ? 0.9 : 0.982;
      b.vx *= Math.pow(friction, dt);
      b.vy *= Math.pow(friction, dt);
      if (Math.hypot(b.vx, b.vy) < 0.05) b.vx = b.vy = 0;

      // hole
      const hd = Math.hypot(b.x - game.hole.x, b.y - game.hole.y);
      const speed = Math.hypot(b.vx, b.vy);
      if (hd < game.hole.r) {
        if (speed < 9) {
          b.sunk = true;
          b.vx = b.vy = 0;
          celebrate();
        } else {
          // lip out: pull slightly toward the cup
          b.vx += ((game.hole.x - b.x) / hd) * 0.4;
          b.vy += ((game.hole.y - b.y) / hd) * 0.4;
        }
      }
    }

    game.confetti.forEach((c) => {
      c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 0.25 * dt; c.rot += c.vr * dt; c.life -= dt;
    });
    game.confetti = game.confetti.filter((c) => c.life > 0);
  }

  function celebrate() {
    for (let i = 0; i < 120; i++) {
      game.confetti.push({
        x: game.hole.x, y: game.hole.y,
        vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 3,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        size: 5 + Math.random() * 7, color: burstColors[i % burstColors.length], life: 90 + Math.random() * 60,
      });
    }
    setTimeout(() => winEl.classList.add("is-visible"), 700);
  }

  function drawGame() {
    const { w, h } = game;
    ctx.clearRect(0, 0, w, h);
    // mown stripes
    const stripe = Math.max(40, w / 14);
    for (let x = -h; x < w + h; x += stripe * 2) {
      ctx.fillStyle = "#43a04c";
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + stripe, 0); ctx.lineTo(x + stripe - h * 0.4, h); ctx.lineTo(x - h * 0.4, h);
      ctx.fill();
    }
    // green
    ctx.fillStyle = "rgba(111, 207, 98, .35)";
    ctx.beginPath();
    ctx.ellipse(game.hole.x, game.hole.y, w * 0.14, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // sand
    const s = game.sand;
    ctx.fillStyle = "#f3dfa8";
    ctx.beginPath(); ctx.ellipse(s.x, s.y, s.rx, s.ry, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.06)";
    ctx.beginPath(); ctx.ellipse(s.x + 4, s.y + 4, s.rx * 0.8, s.ry * 0.7, 0.2, 0, Math.PI * 2); ctx.fill();
    // walls
    game.walls.forEach((wl) => {
      ctx.fillStyle = "rgba(0,0,0,.22)";
      roundRect(wl.x + 5, wl.y + 7, wl.w, wl.h, 8); ctx.fill();
      ctx.fillStyle = "#ff5a36";
      roundRect(wl.x, wl.y, wl.w, wl.h, 8); ctx.fill();
      ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.stroke();
    });
    // hole
    ctx.fillStyle = "#0d2a17";
    ctx.beginPath(); ctx.arc(game.hole.x, game.hole.y, game.hole.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 2; ctx.stroke();
    // flag
    const fx = game.hole.x, fy = game.hole.y;
    const wave = Math.sin(performance.now() / 260) * 4;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 90); ctx.stroke();
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath(); ctx.moveTo(fx, fy - 90); ctx.quadraticCurveTo(fx + 20, fy - 84 + wave, fx + 40, fy - 78 + wave); ctx.lineTo(fx, fy - 62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.stroke();

    // aim guide
    const b = game.ball;
    if (game.aiming && game.aimNow) {
      const dx = game.aimStart.x - game.aimNow.x;
      const dy = game.aimStart.y - game.aimNow.y;
      const len = Math.min(Math.hypot(dx, dy), 220);
      const ang = Math.atan2(dy, dx);
      const power = len / 220;
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(ang) * len * 1.4, b.y + Math.sin(ang) * len * 1.4); ctx.stroke();
      ctx.restore();
      // power ring
      ctx.strokeStyle = power > 0.75 ? "#ff5a36" : "#ffd84d"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 10, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2); ctx.stroke();
    } else if (ballStopped() && !game.strokes) {
      // idle pulse hint
      const pulse = (Math.sin(performance.now() / 300) + 1) / 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.3 + pulse * 0.5})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 8 + pulse * 8, 0, Math.PI * 2); ctx.stroke();
    }

    // ball
    if (b.scale > 0) {
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 5, b.r * b.scale, b.r * 0.7 * b.scale, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.4, 1, b.x, b.y, b.r * b.scale);
      g.addColorStop(0, "#fff"); g.addColorStop(1, "#cfcfcf");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * b.scale, 0, Math.PI * 2); ctx.fill();
    }

    // confetti
    game.confetti.forEach((c) => {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.globalAlpha = clamp(c.life / 40, 0, 1);
      ctx.fillStyle = c.color; ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  new IntersectionObserver((entries) => entries.forEach((en) => (game.visible = en.isIntersecting))).observe(canvas);

  /* ------------------------------------------------------------------
     Footer bits
     ------------------------------------------------------------------ */
  $("#year").textContent = new Date().getFullYear();
  $("#toTop").addEventListener("click", () => scrollToY(0));
  $("#newsletter").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("input", e.target);
    $("#newsletterMsg").textContent = "Welcome to the club. Your first tee time is on us.";
    toast("You're in! Check your inbox ✉️");
    burst(state.mouse.x, state.mouse.y);
    input.value = "";
  });

  /* ------------------------------------------------------------------
     Main loop
     ------------------------------------------------------------------ */
  let lastTime = performance.now();
  function loop(now) {
    const dt = clamp((now - lastTime) / 16.667, 0.2, 3);
    lastTime = now;

    updateSmooth();
    state.scroll = window.scrollY;
    const rawV = state.scroll - state.lastScroll;
    state.velocity = lerp(state.velocity, rawV, 0.2);
    state.lastScroll = state.scroll;

    if (finePointer) updateCursor();
    updateHeader();
    if (!reduceMotion) {
      updateHero();
      updateMarquees();
      updateGallery();
      updateRitual();
    }
    updateShop();
    updateManifesto();
    updateFloat();
    if (game.visible && game.w) {
      stepGame(dt);
      drawGame();
    }
    requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener("load", measure);

  measure();
  requestAnimationFrame(loop);
})();
