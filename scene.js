(() => {
  'use strict';
  const W = 1672, H = 941, END = 6.2, IMPACT = 1.95;
  const hero = document.querySelector('.hero');
  const canvas = document.querySelector('#landscape');
  const ctx = canvas.getContext('2d', { alpha: false });
  const button = document.querySelector('#generate');
  const image = document.querySelector('.still');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const query = new URLSearchParams(location.search);
  const returning = query.get('from') === 'tasks';
  if (returning) {
    hero.dataset.returned = 'true';
    const cleanURL = new URL(location.href);
    cleanURL.searchParams.delete('from');
    history.replaceState(history.state, '', cleanURL);
  }
  const frozen = query.has('frame') && Number.isFinite(Number(query.get('frame')))
    ? Math.max(0, Number(query.get('frame'))) : null;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const progress = (t, start, duration) => smooth((t - start) / duration);
  let layout, start = 0, raf = 0, time = 0, pausedAt = 0, ready = false;
  let layers = [], backdrop, drop, staticScene, mobileSky, reduced = motion.matches;
  const water = new Path2D('M 710 628 C 751 583 855 582 939 556 C 1005 537 1031 508 1094 487 C 1142 472 1190 477 1232 489 C 1300 507 1378 515 1420 540 C 1442 566 1370 591 1311 613 C 1241 650 1189 679 1096 695 C 1008 714 878 700 802 677 C 755 661 727 649 710 628 Z');

  function resize() {
    const box = hero.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const mobile = box.width <= 700;
    // Preserve the exact desktop reference proportions. Mobile reframes the
    // landscape above the independently positioned, comfortably sized button.
    const scale = mobile ? Math.min(box.width / 1020, box.height * .62 / 580)
      : Math.min(box.width / W, box.height / H * 1.14);
    const x = mobile ? (box.width - 1070 * scale) / 2 - 610 * scale : (box.width - W * scale) / 2;
    const y = mobile ? box.height * .22 - 180 * scale : (box.height - H * scale) / 2;
    layout = { width: box.width, height: box.height, dpr, scale, x, y, mobile };
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    if (mobile) mobileSky = makeMobileSky();
    if (!mobile) {
      Object.assign(button.style, {
        top: `${y + 476 * scale - Math.max(60, 98 * scale) / 2}px`,
        height: `${Math.max(60, 98 * scale)}px`
      });
    } else {
      for (const name of ['left', 'top', 'width', 'height', 'borderRadius', 'backgroundImage', 'backgroundSize', 'backgroundPosition']) button.style[name] = '';
    }
    if (ready) draw(time);
  }

  function makeCanvas(w = W, h = H) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }

  function makeMobileSky() {
    const { width, height, dpr, y, scale } = layout;
    const c = makeCanvas(canvas.width, canvas.height), a = c.getContext('2d');
    a.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = a.createLinearGradient(0, 0, width, height);
    sky.addColorStop(0, '#a6c1d8'); sky.addColorStop(1, '#98b5cf');
    a.fillStyle = sky; a.fillRect(0, 0, width, height);
    const feather = a.createLinearGradient(0, y, 0, y + H * scale);
    feather.addColorStop(0, '#fff0');
    feather.addColorStop(180 / H, '#fff');
    feather.addColorStop(770 / H, '#fff');
    feather.addColorStop(1, '#fff0');
    a.globalCompositeOperation = 'destination-out';
    a.fillStyle = feather; a.fillRect(0, 0, width, height);
    return c;
  }

  function maskedLayer(path, feather = 5) {
    const c = makeCanvas(), m = makeCanvas();
    const a = c.getContext('2d'), b = m.getContext('2d');
    b.fillStyle = 'white'; b.filter = `blur(${feather}px)`; b.fill(new Path2D(path));
    a.drawImage(image, 0, 0, W, H);
    a.globalCompositeOperation = 'destination-in'; a.drawImage(m, 0, 0);
    return c;
  }

  function prepare() {
    backdrop = makeCanvas();
    const b = backdrop.getContext('2d');
    // Only sky pixels: there is no ghost of the forest behind the opening drop.
    b.drawImage(image, 0, 0, W, 165, 0, 0, W, H);
    const shade = b.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, '#90b0cb00'); shade.addColorStop(1, '#7193b82b');
    b.fillStyle = shade; b.fillRect(0, 0, W, H);
    const specs = [
      // Shoreline, rear grove, left grove, right grove, foreground, fisherman.
      ['M 626 631 Q 743 562 960 535 Q 1130 456 1280 488 Q 1470 506 1672 535 L 1672 732 Q 1380 750 1150 753 Q 841 743 626 658 Z', 2.03, 1.55, 721, false, 15],
      ['M 951 515 L 974 400 L 1006 350 L 1060 368 L 1090 339 L 1121 357 L 1153 311 L 1175 350 L 1208 326 L 1256 307 L 1291 330 L 1309 264 L 1339 302 L 1390 300 L 1425 393 L 1375 527 L 1050 551 Z', 2.65, 1.35, 522, true, 7],
      ['M 650 563 L 708 441 L 734 408 L 757 428 L 776 350 L 807 374 L 834 405 L 866 307 L 894 350 L 904 373 L 931 335 L 970 340 L 1014 395 L 1004 526 L 831 583 Z', 2.95, 1.40, 560, true, 5],
      ['M 1226 499 L 1235 350 L 1277 311 L 1303 291 L 1342 288 L 1384 274 L 1427 283 L 1461 351 L 1507 312 L 1552 208 L 1598 317 L 1640 315 L 1672 317 L 1690 682 L 1460 711 L 1333 631 Z', 3.15, 1.55, 642, true, 5],
      ['M 1230 652 L 1309 581 L 1322 509 L 1344 450 L 1374 512 L 1400 549 L 1421 606 L 1484 589 L 1510 621 L 1606 658 L 1672 682 L 1672 741 L 1200 750 Z', 3.55, 1.35, 704, true, 5],
      ['M 962 544 L 974 512 L 1005 509 L 1004 483 L 1041 482 L 1086 470 L 1093 475 L 1053 494 L 1041 521 L 1072 515 L 1073 548 Z', 4.15, .90, 542, true, 2]
    ];
    layers = specs.map(([path, at, duration, anchor, grow, feather]) => ({
      canvas: maskedLayer(path, feather), at, duration, anchor, grow
    }));
    // Preserve the approved landscape; replace only the old baked-in UI button
    // with interpolated sky so the independent glass HTML button can show through.
    staticScene = makeCanvas();
    const f = staticScene.getContext('2d');
    f.drawImage(image, 0, 0, W, H);
    const skyPatch = makeCanvas(), patch = skyPatch.getContext('2d');
    for (let row = 416; row < 541; row++) {
      patch.globalAlpha = 1;
      patch.drawImage(image, 125, 416, 480, 1, 125, row, 480, 1);
      patch.globalAlpha = (row - 416) / 125;
      patch.drawImage(image, 125, 541, 480, 1, 125, row, 480, 1);
    }
    patch.globalAlpha = 1; patch.globalCompositeOperation = 'destination-in';
    patch.filter = 'blur(5px)'; patch.fillStyle = '#fff';
    patch.fillRect(135, 426, 460, 105);
    f.drawImage(skyPatch, 0, 0);
    drop = createDrop();
  }

  function setButton(alpha) {
    button.style.opacity = String(alpha);
    const hidden = alpha < .15;
    button.setAttribute('aria-hidden', String(hidden));
    button.tabIndex = hidden ? -1 : 0;
    button.style.pointerEvents = hidden ? 'none' : '';
  }

  function draw(t) {
    if (!layout || !ready) return;
    // Expose the quote cue on the existing scene clock: one second after the
    // lake starts to appear. This does not change the landscape animation.
    const quoteReady = String(t >= IMPACT - .20 + 1);
    if (hero.dataset.quoteReady !== quoteReady) hero.dataset.quoteReady = quoteReady;
    const { dpr, width, height, scale: s, x, y, mobile } = layout;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, width, height);
    sky.addColorStop(0, mobile ? '#a6c1d8' : '#bdd3e4');
    sky.addColorStop(1, mobile ? '#98b5cf' : '#8faecc');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    // Extend the actual edge colors on taller windows. Containing the scene
    // keeps both the left button and the right grove on screen at every ratio.
    const edgeImage = t >= 5.75 ? staticScene : backdrop;
    ctx.save(); ctx.filter = 'blur(20px)';
    if (!mobile) {
      if (y > 0) ctx.drawImage(edgeImage, 0, 0, W, 1, x - 35, -35, W * s + 70, y + 70);
      const bottom = y + H * s;
      if (bottom < height) ctx.drawImage(edgeImage, 0, H - 1, W, 1, x - 35, bottom - 35, W * s + 70, height - bottom + 70);
    }
    ctx.restore();
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * x, dpr * y);
    if (t >= 5.75 && !mobile) {
      ctx.drawImage(staticScene, 0, 0); drawRipples(t); setButton(1); return;
    }
    ctx.drawImage(backdrop, 0, 0);

    const lake = progress(t, IMPACT - .20, .85);
    if (lake > 0) {
      ctx.save(); ctx.clip(water);
      const r = 12 + lake * 760;
      const mask = ctx.createRadialGradient(1135, 599, 0, 1135, 599, r);
      mask.addColorStop(0, `rgba(255,255,255,${lake})`);
      mask.addColorStop(.72, `rgba(255,255,255,${lake})`); mask.addColorStop(1, '#fff0');
      // The reveal uses a local canvas so destination-in cannot erase the sky.
      const c = waterReveal, a = c.getContext('2d');
      a.clearRect(0, 0, W, H); a.drawImage(image, 0, 0, W, H);
      a.globalCompositeOperation = 'destination-in'; a.fillStyle = mask; a.fillRect(0, 0, W, H);
      a.globalCompositeOperation = 'source-over'; ctx.drawImage(c, 0, 0); ctx.restore();
    }
    for (const layer of layers) {
      const p = progress(t, layer.at, layer.duration);
      if (!p) continue;
      ctx.save(); ctx.globalAlpha = p;
      if (layer.grow && p < 1) {
        // Reveal upwards through a soft mist rather than stretching raster
        // trees, which creates double trunks where neighboring layers overlap.
        const a = growingLayer.getContext('2d');
        const rise = 1 - Math.pow(1 - p, 2);
        const top = layer.anchor - (layer.anchor - 150) * rise;
        const fade = a.createLinearGradient(0, top - 45, 0, top + 45);
        fade.addColorStop(0, '#fff0'); fade.addColorStop(1, '#fff');
        a.clearRect(0, 0, W, H); a.drawImage(layer.canvas, 0, 0);
        a.globalCompositeOperation = 'destination-in';
        a.fillStyle = fade; a.fillRect(0, 0, W, H);
        a.globalCompositeOperation = 'source-over'; ctx.drawImage(growingLayer, 0, 0);
      } else ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
    // The final dissolve resolves every edge, sky tone and reflection to the
    // approved artwork, rather than approximating it with procedural geometry.
    const final = progress(t, 4.65, 1.10);
    if (final) { ctx.save(); ctx.globalAlpha = final; ctx.drawImage(staticScene, 0, 0); ctx.restore(); }
    if (mobile) {
      // Blend only empty sky and the margin below the shore into one full-height
      // background. Trees start below source row 208; the shore ends above 770.
      // Apply this before the drop and ripples so their geometry stays intact.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(mobileSky, 0, 0);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * x, dpr * y);
    }
    drawRipples(t);
    drawFallingDrop(t);
    setButton(progress(t, 5.05, .85));
  }
  const waterReveal = makeCanvas();
  const growingLayer = makeCanvas();

  function drawRipples(t) {
    if (t < IMPACT || reduced) return;
    const age = t - IMPACT;
    ctx.save(); ctx.clip(water);
    // A finite splash gives way to very subtle continuously expanding rings.
    for (let i = 0; i < 4; i++) {
      const a = age - i * .17;
      if (a < 0 || a > 2.8) continue;
      const radius = 5 + a * 100;
      ctx.beginPath(); ctx.ellipse(1135, 599, radius, radius * .22, -.10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(213,239,246,${.52 * (1 - a / 2.8)})`;
      ctx.lineWidth = 1.6 - .8 * a / 2.8; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(1135, 601, radius + 3, radius * .22, -.10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(32,78,95,${.26 * (1 - a / 2.8)})`; ctx.stroke();
    }
    if (age < .70) {
      for (let i = 0; i < 11; i++) {
        const theta = i * 2.399;
        const u = age / .70;
        const px = 1135 + Math.cos(theta) * u * (25 + i * 5);
        const py = 599 + Math.sin(theta) * u * 12 - Math.sin(u * Math.PI) * (20 + i * 3);
        ctx.beginPath(); ctx.ellipse(px, py, 1.6 * (1 - u), 3 * (1 - u), theta * .15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,247,255,${.8 * (1 - u)})`; ctx.fill();
      }
    }
    if (t > END) {
      const loop = (t - END) % 5.8;
      for (let i = 0; i < 3; i++) {
        const a = (loop + i * 1.93) % 5.8;
        ctx.beginPath(); ctx.ellipse(1164, 577, 10 + a * 11, 2 + a * 2.2, -.1, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(202,233,243,${.065 * Math.sin(a / 5.8 * Math.PI)})`;
        ctx.lineWidth = .7; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFallingDrop(t) {
    if (t >= IMPACT || reduced) return;
    const p = clamp((t - .25) / (IMPACT - .25));
    const fall = p * p * (.55 + .45 * p);
    const x = 1000 + 135 * smooth(p), y = 215 + 384 * fall;
    const size = 200 * (1 - .81 * smooth(p));
    const alpha = progress(t, 0, .32) * (1 - progress(t, IMPACT - .07, .07));
    ctx.save(); ctx.globalAlpha = alpha;
    // Sparse air trails carry the motion without turning the opening into rain.
    if (p > .1) {
      for (let i = 0; i < 5; i++) {
        const tx = x + (i - 2) * (size * .22 + 9);
        const end = y - 18 - Math.abs(i - 2) * 13;
        const trail = ctx.createLinearGradient(tx, end - 80 - p * 80, tx, end);
        trail.addColorStop(0, '#effaff00'); trail.addColorStop(.7, '#effaff45'); trail.addColorStop(1, '#effaff00');
        ctx.strokeStyle = trail; ctx.lineWidth = i === 2 ? 1.2 : .8;
        ctx.beginPath(); ctx.moveTo(tx - 9, end - 90 - p * 80); ctx.quadraticCurveTo(tx - 3, end - 35, tx, end); ctx.stroke();
      }
    }
    if (drop) {
      drop.render(t);
      ctx.drawImage(drop.canvas, x - size / 2, y - size / 2, size, size);
    } else {
      // Canvas fallback on devices with WebGL disabled.
      ctx.translate(x, y); ctx.scale(size / 160, size / 160);
      const glass = ctx.createRadialGradient(-12, -9, 1, 0, 10, 35);
      glass.addColorStop(0, '#f5ffff'); glass.addColorStop(.25, '#c4e6ed');
      glass.addColorStop(.65, '#6499ad'); glass.addColorStop(.87, '#d4edf5'); glass.addColorStop(1, '#416e85');
      ctx.beginPath(); ctx.moveTo(0, -50); ctx.bezierCurveTo(-6, -27, -32, -8, -28, 17);
      ctx.bezierCurveTo(-25, 52, 29, 52, 29, 17); ctx.bezierCurveTo(29, -8, 7, -28, 0, -50);
      ctx.fillStyle = glass; ctx.fill();
    }
    ctx.restore();
  }

  function createDrop() {
    // Self-contained WebGL ray-marched 3D water drop. No CDN or runtime download.
    const c = makeCanvas(384, 384);
    const gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true, preserveDrawingBuffer: true });
    if (!gl) return null;
    const vertex = 'attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,0.,1.);}';
    const fragment = `precision highp float;
      varying vec2 uv; uniform float clock;
      float shape(vec3 p){
        float h=clamp((p.y+.70)/1.65,0.,1.);
        float r=.68*pow(max(0.,sin(3.14159265*h)),.70)*(1.-.75*h);
        float d=length(p.xz)-r;
        return max(max(d,-.70-p.y),p.y-.95)*.60;
      }
      vec3 normalAt(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
      vec3 sky(vec3 d){
        vec3 col=mix(vec3(.22,.39,.49),vec3(.84,.94,.98),smoothstep(-.7,.7,d.y));
        col+=vec3(.9,.97,1.)*pow(max(0.,dot(d,normalize(vec3(-.7,1.,1.)))),30.);
        col*=.85+.15*smoothstep(-.12,.02,d.y);
        return col;
      }
      void main(){
        vec3 ro=vec3(0.,.10,3.25),rd=normalize(vec3(uv*1.27,-3.25));
        float travel=0.; vec3 p; bool hit=false;
        for(int i=0;i<88;i++){p=ro+rd*travel;float d=shape(p);if(d<.0015){hit=true;break;}travel+=max(.001,d);if(travel>5.)break;}
        if(!hit){gl_FragColor=vec4(0.);return;}
        vec3 n=normalAt(p);float f=.025+.975*pow(1.-max(0.,dot(-rd,n)),5.);
        vec3 reflectCol=sky(reflect(rd,n));
        vec3 refractCol=sky(refract(rd,n,1./1.333))*vec3(.68,.88,.97);
        vec3 col=mix(refractCol,reflectCol,f*.85+.12);
        float spec=pow(max(0.,dot(reflect(normalize(vec3(.65,-.85,-1.)),n),-rd)),100.);
        col+=spec*vec3(.95,1.,1.);
        col+=pow(1.-abs(n.z),7.)*vec3(.12,.19,.22);
        gl_FragColor=vec4(col,.97);
      }`;
    const shaders = [];
    try {
      function shader(type, source) {
        const s = gl.createShader(type); shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s;
      }
      const program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, c.width, c.height); gl.clearColor(0, 0, 0, 0);
      const clock = gl.getUniformLocation(program, 'clock');
      return { canvas: c, render(t) { gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(clock, t); gl.drawArrays(gl.TRIANGLES, 0, 6); } };
    } catch (error) { console.warn('Используется запасная капля Canvas.', error); return null; }
  }

  function tick(now) {
    time = frozen ?? Math.max(0, (now - start) / 1000);
    if (reduced) time = END;
    // Limit the calm settled scene to 24fps, but keep the opening at native fps.
    if (time < END || !tick.last || now - tick.last >= 1000 / 24) { draw(time); tick.last = now; }
    hero.dataset.scene = time < IMPACT ? 'drop' : time < END ? 'reveal' : 'settled';
    if (frozen === null && !reduced && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function skip() {
    if (!ready || time >= END) return;
    start = performance.now() - END * 1000; time = END; draw(time);
    hero.dataset.scene = 'settled';
  }
  function play(from = 0) {
    if (!ready) return;
    if (from === 0) delete hero.dataset.returned;
    cancelAnimationFrame(raf); start = performance.now() - from * 1000; tick.last = 0;
    raf = requestAnimationFrame(tick);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) skip();
    if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) play();
  });
  motion.addEventListener('change', () => {
    reduced = motion.matches;
    if (reduced) { cancelAnimationFrame(raf); time = END; draw(time); }
    else { start = performance.now() - Math.max(time, END) * 1000; raf = requestAnimationFrame(tick); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!ready) return;
    if (document.hidden) { pausedAt = performance.now(); cancelAnimationFrame(raf); }
    else { start += performance.now() - pausedAt; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  });
  window.addEventListener('resize', resize);
  async function init() {
    resize();
    try { await image.decode(); } catch { hero.classList.add('is-fallback'); return; }
    if (!ctx) { hero.classList.add('is-fallback'); return; }
    prepare(); ready = true; hero.classList.add('is-playing');
    time = reduced || returning ? END : frozen ?? 0; draw(time); play(time);
  }
  init();
})();
