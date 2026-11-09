(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const quote = document.querySelector('.hero-quote');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let animations = [], started = false, generation = 0;
  const drawings = new Map();
  const lines = Array.from(quote.querySelectorAll('p'), paragraph => {
    const ink = document.createElement('span');
    ink.className = 'quote-ink'; ink.textContent = paragraph.textContent;
    paragraph.replaceChildren(ink); return ink;
  });
  quote.classList.add('is-writing');

  function reset() {
    generation++;
    animations.forEach(animation => animation.cancel()); animations = [];
    lines.forEach(ink => { ink.style.visibility = ''; });
    drawings.forEach(({ path, cover, length }) => {
      path.style.strokeDashoffset = String(length); cover.style.opacity = '0';
    });
    quote.classList.add('is-writing');
  }
  function finish() {
    generation++;
    animations.forEach(animation => animation.cancel()); animations = [];
    lines.forEach(ink => { ink.style.visibility = ''; });
    drawings.forEach(({ cover }) => { cover.style.opacity = '1'; });
    quote.classList.remove('is-writing');
  }

  function handwriting(ink, index) {
    if (drawings.has(ink)) return drawings.get(ink);
    // Keep the actual Lora outlines. A looping pen path uncovers the ink in
    // strokes, instead of advancing a straight clipping edge character by character.
    const text = ink.firstChild, range = document.createRange();
    const content = text.data;
    const size = parseFloat(getComputedStyle(ink).fontSize);
    const width = ink.getBoundingClientRect().width / size * 100;
    let d = '', left = 0;
    for (let i = 0; i < text.length; i++) {
      range.setStart(text, 0); range.setEnd(text, i + 1);
      const right = range.getBoundingClientRect().width / size * 100;
      const w = right - left;
      if (content[i] !== ' ') {
        // Rise into the letter, descend through its body, then join the next.
        const top = /[бвдйфА-ЯЁ]/.test(content[i]) ? 30 : 48;
        const low = /[друфцщ]/.test(content[i]) ? 130 : 110;
        // A single continuous subpath is essential: SVG restarts the dash
        // pattern at every M, which would uncover all letters together at the end.
        d += `${d ? 'L' : 'M'} ${left + w * .10} 102 C ${left - w * .08} 73 ${left + w * .37} ${top} ${left + w * .65} ${top + 10} C ${left + w * .88} ${top + 22} ${left + w * .12} ${low} ${left + w * .36} ${low} Q ${left + w * .65} ${low + 6} ${right} 88 `;
      }
      left = right;
    }
    const ns = 'http://www.w3.org/2000/svg';
    function element(name, attributes) {
      const node = document.createElementNS(ns, name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      return node;
    }
    const svg = element('svg', { viewBox: `0 0 ${width} 165`, width: `${width / 100}em`, height: '1.65em' });
    const defs = element('defs', {});
    const maskId = `quote-pen-${index}`;
    const mask = element('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: -25, y: -25, width: width + 50, height: 215 });
    const path = element('path', { d, fill: 'none', stroke: 'white', 'stroke-width': 48, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const cover = element('rect', { x: -25, y: -25, width: width + 50, height: 215, fill: 'white' });
    cover.style.opacity = '0'; mask.append(path, cover); defs.append(mask);
    const lettering = element('text', { x: 0, y: 115, 'font-family': 'Lora, Georgia, serif', 'font-size': 100, 'font-style': 'italic', 'font-weight': 400, 'letter-spacing': -1.5, fill: 'currentColor', mask: `url(#${maskId})` });
    lettering.textContent = content; svg.append(defs, lettering); ink.replaceChildren(svg);
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length); path.style.strokeDashoffset = String(length);
    const drawing = { path, cover, length, duration: Math.max(2000, content.length * 85) };
    drawings.set(ink, drawing); return drawing;
  }

  async function write() {
    reset();
    const current = generation;
    if (motion.matches || typeof lines[0].animate !== 'function') { finish(); return; }
    // Wait for the real Lora Italic face before measuring glyph widths.
    await document.fonts.ready;
    if (generation !== current || !started) return;
    let delay = 0;
    lines.forEach((ink, index) => {
      const { path, cover, length, duration } = handwriting(ink, index);
      ink.style.visibility = 'visible';
      const pen = path.animate([
        { strokeDashoffset: String(length) }, { strokeDashoffset: '0' }
      ], { duration, delay, easing: 'linear', fill: 'both' });
      // Resolve dots and very fine overhangs as the pen leaves the sentence.
      const dry = cover.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 240, delay: delay + duration - 120, easing: 'ease-in-out', fill: 'both'
      });
      animations.push(pen, dry); delay += duration + 100;
      if (document.hidden) { pen.pause(); dry.pause(); }
    });
    // Optional frozen ink frame for checking the middle of a stroke locally.
    const preview = new URLSearchParams(location.search).get('ink');
    if (preview !== null && Number.isFinite(Number(preview))) {
      animations.forEach(animation => { animation.pause(); animation.currentTime = Math.max(0, Number(preview) * 1000); });
    }
  }

  function sync() {
    const next = hero.dataset.returned === 'true' || hero.dataset.quoteReady === 'true' || hero.classList.contains('is-fallback');
    if (next === started) return;
    started = next;
    if (started) {
      if (hero.dataset.returned === 'true') finish(); else write();
    } else reset();
  }
  new MutationObserver(sync).observe(hero, { attributes: true, attributeFilter: ['data-quote-ready', 'class'] });
  document.addEventListener('visibilitychange', () => {
    animations.forEach(animation => {
      if (document.hidden) animation.pause(); else if (animation.playState === 'paused') animation.play();
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) finish();
  });
  motion.addEventListener('change', () => { if (motion.matches) finish(); });
  sync();
})();
