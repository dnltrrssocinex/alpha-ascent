/* Alpha Ascent — interactions adapted from the Motions library */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Loader: dot bounce, hidden once the page has loaded (max 1.6s) */
  const loader = $('#loader');
  const hideLoader = () => loader.classList.add('off');
  if (document.readyState === 'complete') setTimeout(hideLoader, 300);
  else window.addEventListener('load', () => setTimeout(hideLoader, 300));
  setTimeout(hideLoader, 1600);

  /* Navbar: shrink to floating pill once scrolled */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('on', window.scrollY > 14);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Reveal sections as they enter (fade through) */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* Hero: magnetic button */
  const zone = $('#magnet');
  if (zone && !reduced && matchMedia('(pointer:fine)').matches) {
    const btn = $('.magnetic', zone);
    const lb = $('.lb', btn);
    let px = 0, py = 0, inside = false;
    const s = { x: 0, y: 0, vx: 0, vy: 0 };
    zone.addEventListener('pointerenter', () => (inside = true));
    zone.addEventListener('pointerleave', () => (inside = false));
    zone.addEventListener('pointermove', (e) => {
      const r = zone.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
    });
    const frame = () => {
      const w = zone.clientWidth, h = zone.clientHeight, cx = w / 2, cy = h / 2;
      const dx = px - cx, dy = py - cy;
      const tx = inside ? dx * 0.38 : 0, ty = inside ? dy * 0.38 : 0;
      s.vx += (tx - s.x) * 0.14; s.vy += (ty - s.y) * 0.14;
      s.vx *= 0.76; s.vy *= 0.76;
      s.x += s.vx; s.y += s.vy;
      btn.style.transform = `translate(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px)`;
      lb.style.transform = `translate(${(s.x * 0.55).toFixed(2)}px,${(s.y * 0.55).toFixed(2)}px)`;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* How it works: section colour shift driven by the step nearest the viewport centre */
  const how = $('#how');
  const steps = $$('.step', how);
  const dots = $$('.how-dots i', how);
  const stepIO = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = steps.indexOf(e.target);
      how.dataset.t = String(i);
      dots.forEach((d, n) => d.classList.toggle('on', n === i));
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  steps.forEach((s) => stepIO.observe(s));
  // Back to white once the section has left the viewport upwards or downwards
  const howIO = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting && e.boundingClientRect.top > 0) { how.dataset.t = '0'; dots.forEach((d, n) => d.classList.toggle('on', n === 0)); }
    });
  }, { threshold: 0 });
  howIO.observe(how);

  /* FAQ: chat-style, answers typed out */
  const chat = $('#chat');
  const th = $('.th', chat);
  const chips = $$('.chips button', chat);
  const QA = [
    ['What if I am still building my skills?', 'Start by making sure you understand the plan. Ask what each price means and what could go wrong. A clear question is a useful next step.'],
    ['Do I need to take a trade every day?', 'You choose when to act. You can spend a day watching, learning, or waiting for an idea that fits your plan.'],
    ['What if I miss an alert?', 'Take a moment to check the time and the price now. If the price has left the planned range, you can wait or move on.'],
    ['Will a plan prevent losses?', 'No. A plan helps you think through a trade, but the market can move in ways you did not expect. A planned loss exit cannot cap a loss.'],
  ];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const bubble = (cls, txt) => {
    const m = document.createElement('div');
    m.className = 'm ' + cls;
    m.textContent = txt;
    th.appendChild(m);
    while (th.children.length > 6) th.removeChild(th.firstChild);
    return m;
  };
  let busy = false;
  let last = -1;
  const ask = async (i) => {
    if (busy || i === last) return;
    busy = true;
    last = i;
    chips.forEach((b) => (b.disabled = true));
    bubble('u', QA[i][0]);
    await wait(reduced ? 0 : 500);
    const r = bubble('r', '');
    r.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    await wait(reduced ? 0 : 900);
    r.textContent = '';
    if (reduced) r.textContent = QA[i][1];
    else for (let c = 1; c <= QA[i][1].length; c++) { r.textContent = QA[i][1].slice(0, c); await wait(18); }
    chips.forEach((b) => (b.disabled = false));
    busy = false;
  };
  chips.forEach((b) => b.addEventListener('click', () => ask(Number(b.dataset.q))));
  // Open with the first question once the FAQ scrolls into view
  let opened = false;
  const faqIO = new IntersectionObserver((es) => {
    if (opened || !es.some((e) => e.isIntersecting)) return;
    opened = true;
    ask(0);
    faqIO.disconnect();
  }, { threshold: 0.4 });
  faqIO.observe(chat);

  /* Signup: role picker, Sign Up button states, success confirmation */
  const box = $('#signup-box');
  const roles = $$('.role', box);
  const name = $('#f-name');
  const email = $('#f-email');
  const go = $('#go');
  const labels = { day: 'Day Trading', swing: 'Swing Trading', both: 'Both' };
  let style = null;
  let saving = false;
  const valid = () => style && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  const render = () => {
    roles.forEach((b) => {
      const on = b.dataset.style === style;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on || (!style && b === roles[0]) ? 0 : -1;
    });
    go.disabled = !valid() || saving;
  };
  const pick = (s) => { style = s; render(); };
  roles.forEach((b) => b.addEventListener('click', () => pick(b.dataset.style)));
  email.addEventListener('input', render);
  // Path buttons and the hero link preselect the style, then scroll to the form
  $$('[data-style]').forEach((a) => {
    if (a.classList.contains('role')) return;
    a.addEventListener('click', () => pick(a.dataset.style));
  });
  go.addEventListener('click', () => {
    if (saving || go.disabled) return;
    saving = true;
    go.classList.add('loading');
    render();
    setTimeout(() => {
      go.classList.replace('loading', 'ok');
      setTimeout(() => {
        $('#s-style').textContent = labels[style];
        $('#s-name').textContent = name.value.trim() || '—';
        $('#s-email').textContent = email.value.trim();
        box.dataset.s = 'done';
        go.classList.remove('ok');
        saving = false;
        render();
      }, 900);
    }, 900);
  });
  $('#again').addEventListener('click', () => { box.dataset.s = 'form'; render(); });
  render();

  /* Footer: link arrow nudge, idle sweep until the pointer is over the footer */
  const fc = $('#footer');
  const links = $$('.g3 a', fc);
  let hover = false;
  fc.addEventListener('pointerenter', () => (hover = true));
  fc.addEventListener('pointerleave', () => (hover = false));
  let n = 0;
  const tick = () => {
    links.forEach((a) => a.classList.remove('is-auto'));
    if (!hover && !reduced) { links[n % links.length].classList.add('is-auto'); n += 1; }
    setTimeout(tick, 900);
  };
  setTimeout(tick, 1200);
})();
