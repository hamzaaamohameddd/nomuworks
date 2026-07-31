(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mqPin = matchMedia('(min-width: 901px)');

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ═══ Lenis — tuned for mouse wheels ═══
     lerp (frame-rate independent easing) instead of duration: a duration-based
     tween restarts on every wheel tick, which is what makes wheel scrolling feel
     laggy and disconnected. lerp tracks the wheel 1:1 with a light smoothing. */
  let lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    try {
      lenis = new Lenis({
        lerp: 0.095,
        wheelMultiplier: 1.05,
        touchMultiplier: 1.8,
        smoothWheel: true,
        syncTouch: false,
      });
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      lenis.on('scroll', ({ scroll }) => frame(scroll));
    } catch { lenis = null; }
  }
  if (!lenis) addEventListener('scroll', () => frame(scrollY), { passive: true });

  const lock = () => { html.classList.add('lock'); lenis?.stop(); };
  const unlock = () => { html.classList.remove('lock'); lenis?.start(); };

  /* ═══ Preloader ═══ */
  const pre = document.getElementById('preloader');
  const preCount = document.getElementById('preCount');
  const preBar = document.getElementById('preBar');
  lock();

  /* Driven by a timer, not rAF: rAF is paused in hidden/background tabs, which
     would otherwise leave the loader stuck on screen with scroll locked. */
  let preDone = false, preTimer = null;
  function runPre() {
    if (preDone || preTimer) return;
    if (document.hidden || reduce) return endPre();   // nothing to animate to
    const dur = 1400, t0 = performance.now();
    preTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      preCount.textContent = String(Math.round(p * 100)).padStart(3, '0');
      preBar.style.width = (p * 100) + '%';
      if (p >= 1) endPre();
    }, 16);
  }
  function endPre() {
    if (preDone) return;
    preDone = true;
    clearInterval(preTimer);
    preCount.textContent = '100';
    preBar.style.width = '100%';
    pre.classList.add('done');
    unlock();
    document.body.classList.add('go');
    revealAll();
    measure();
    frame(lenis ? lenis.scroll : scrollY);
  }
  // If the tab starts hidden and is revealed later, don't leave it frozen.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) runPre(); });

  /* ═══ Cursor ═══ */
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (fine && !reduce) {
    html.classList.add('cur');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    const hot = 'a,button,input,textarea,.magnetic,.index-list li';
    addEventListener('mouseover', (e) => { if (e.target.closest(hot)) ring.classList.add('hot'); });
    addEventListener('mouseout', (e) => { if (e.target.closest(hot)) ring.classList.remove('hot'); });
  }

  /* ═══ Magnetic ═══ */
  if (fine && !reduce) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ═══ Anchors ═══ */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(t, { offset: -70 });
      else scrollTo({ top: t.getBoundingClientRect().top + scrollY - 70, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ═══ Overlay menu ═══ */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('overlayMenu');
  function closeMenu() {
    if (!menu.classList.contains('open')) return;
    menu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    unlock();
  }
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    open ? lock() : unlock();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ═══ Pinned horizontal track ═══ */
  const pin = document.getElementById('systems');
  const track = document.getElementById('pinTrack');
  const pinBar = document.getElementById('pinBar');
  let pinTop = 0, pinDist = 0, pinMaxX = 0, pinOn = false;

  function measure() {
    pinOn = mqPin.matches && !reduce;
    if (!pinOn) {
      pin.style.height = '';
      track.style.transform = '';
      return;
    }
    const panels = +pin.dataset.panels || 3;
    pin.style.height = (panels * 100) + 'vh';
    pinTop = pin.offsetTop;
    pinDist = pin.offsetHeight - innerHeight;
    pinMaxX = Math.max(0, track.scrollWidth - innerWidth);
  }

  function updatePin(y) {
    if (!pinOn) return;
    const p = Math.max(0, Math.min(1, (y - pinTop) / pinDist));
    track.style.transform = `translate3d(${-p * pinMaxX}px,0,0)`;
    pinBar.style.width = (p * 100) + '%';
  }

  /* ═══ Chapter rail ═══ */
  const railLinks = [...document.querySelectorAll('[data-rail]')];
  const chapters = railLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  function updateRail(y) {
    const mid = y + innerHeight * 0.4;
    let active = 0;
    chapters.forEach((s, i) => { if (s.offsetTop <= mid) active = i; });
    railLinks.forEach((a, i) => a.classList.toggle('on', i === active));
  }

  /* ═══ Masthead ═══ */
  const mast = document.getElementById('masthead');

  /* One scroll pass — everything scroll-linked updates here, in sync with Lenis */
  function frame(y) {
    mast.classList.toggle('stuck', y > 40);
    updatePin(y);
    updateRail(y);
  }

  /* ═══ Reveals ═══ */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const revealAll = () => document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  revealAll();

  /* ═══ Chat demo ═══ */
  const phone = document.getElementById('phone');
  const bubs = document.querySelectorAll('[data-chat]');
  const typing = document.getElementById('typing');
  const ticks = document.querySelectorAll('#ticks [data-check]');
  let played = false;
  function play() {
    if (played) return;
    played = true;
    const step = reduce ? 60 : 850;
    bubs.forEach((b, i) => {
      const d = i * step;
      if (b.classList.contains('out')) {
        setTimeout(() => typing.classList.add('show'), Math.max(0, d - step * 0.55));
        setTimeout(() => typing.classList.remove('show'), d);
      }
      setTimeout(() => b.classList.add('show'), d);
    });
    ticks.forEach((li, i) => setTimeout(() => li.classList.add('on'), bubs.length * step + i * step * 0.45));
  }
  new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && play()), { threshold: 0.3 }).observe(phone);

  /* ═══ Form ═══ */
  const seg = document.getElementById('seg');
  let pref = 'WhatsApp';
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('.seg-b');
    if (!b) return;
    seg.querySelectorAll('.seg-b').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
    b.classList.add('on'); b.setAttribute('aria-checked', 'true');
    pref = b.dataset.value;
  });

  const form = document.getElementById('contactForm');
  const ok = document.getElementById('formOk');
  const mailLink = document.getElementById('formMailLink');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = form.name.value.trim(), b = form.business.value.trim(), m = form.message.value.trim();
    if (!n || !b || !m) return;
    mailLink.href = `mailto:kenzy@nomuworks.com?subject=${encodeURIComponent(`Strategy call request — ${b}`)}&body=${encodeURIComponent(`Name: ${n}\nBusiness: ${b}\nPreferred contact: ${pref}\n\nBottleneck:\n${m}`)}`;
    ok.classList.add('show');
    form.reset();
    seg.querySelectorAll('.seg-b').forEach((x) => x.classList.remove('on'));
    seg.querySelector('.seg-b').classList.add('on');
    pref = 'WhatsApp';
  });

  /* ═══ Back to top ═══ */
  document.getElementById('toTop').addEventListener('click', () => {
    lenis ? lenis.scrollTo(0) : scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ═══ Cairo clock ═══ */
  const clock = document.getElementById('clock');
  const tickClock = () => {
    clock.textContent = 'Cairo ' + new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date());
  };
  tickClock(); setInterval(tickClock, 10000);

  /* ═══ Resize ═══ */
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { measure(); frame(lenis ? lenis.scroll : scrollY); }, 150);
  });

  /* ═══ Init ═══ */
  measure();
  addEventListener('load', () => { measure(); runPre(); });
  // Hard safety net: never let the loader trap the page, whatever happens above.
  setTimeout(runPre, 2200);
  setTimeout(endPre, 5000);
})();
