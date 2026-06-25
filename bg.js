/**
 * bg.js — Waarko Studio
 * Blue Sapphire Hexagon Vortex Background
 *
 * HOW TO USE (every page):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
 *   <script src="bg.js"></script>
 *
 * That's it. No other setup needed.
 */
(function () {

  // ── 1. INJECT CANVAS + OVERLAY ───────────────────────────
  const canvas = document.createElement('canvas');
  canvas.id = 'ws-bg';
  canvas.style.cssText = [
    'position:fixed',
    'top:0','left:0',
    'width:100%','height:100%',
    'z-index:0',
    'pointer-events:none',
    'display:block'
  ].join(';');

  // Dark vignette overlay so text stays readable
  const overlay = document.createElement('div');
  overlay.id = 'ws-bg-overlay';
  overlay.style.cssText = [
    'position:fixed',
    'top:0','left:0',
    'width:100%','height:100%',
    'z-index:1',
    'pointer-events:none',
    'background:radial-gradient(ellipse at center,rgba(5,5,15,0.28) 0%,rgba(5,5,15,0.70) 65%,rgba(5,5,15,0.90) 100%)'
  ].join(';');

  // Insert before everything else
  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(canvas, document.body.firstChild);

  // Make sure all page content sits above bg (z-index >= 10)
  const style = document.createElement('style');
  style.textContent = [
    'body > *:not(#ws-bg):not(#ws-bg-overlay){position:relative;z-index:10}',
    'header{z-index:1000!important}'
  ].join('');
  document.head.appendChild(style);

  // ── 2. THREE.JS SCENE ────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x05050f, 1);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2000);
  camera.position.set(0, 0, 260);

  // ── 3. PARTICLE GEOMETRY ─────────────────────────────────
  const RINGS        = 18;
  const PTS_PER_RING = 1200;
  const TOTAL        = RINGS * PTS_PER_RING;

  const positions = new Float32Array(TOTAL * 3);
  const colors    = new Float32Array(TOTAL * 3);
  const phases    = new Float32Array(TOTAL);   // static noise offsets

  for (let k = 0; k < TOTAL; k++) {
    phases[k] = Math.random() * Math.PI * 2;
  }

  const geo      = new THREE.BufferGeometry();
  const posAttr  = new THREE.BufferAttribute(positions, 3);
  const colAttr  = new THREE.BufferAttribute(colors, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  colAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color',    colAttr);

  const mat = new THREE.PointsMaterial({
    size:            1.15,
    vertexColors:    true,
    transparent:     true,
    opacity:         0.90,
    sizeAttenuation: true,
    depthWrite:      false,
    blending:        THREE.AdditiveBlending
  });

  scene.add(new THREE.Points(geo, mat));

  // ── 4. HELPERS ───────────────────────────────────────────
  const _c = new THREE.Color();

  /** Convert HSL to r,g,b and write into Float32Array at offset idx*3 */
  function writeColor(arr, idx, h, s, l, brightness) {
    _c.setHSL(h, s, l);
    arr[idx * 3]     = _c.r * brightness;
    arr[idx * 3 + 1] = _c.g * brightness;
    arr[idx * 3 + 2] = _c.b * brightness;
  }

  /**
   * Hexagonal ring point.
   * Returns x,y on a flat-top hexagon of radius r at angular position `angle`.
   * Written into out[0] and out[1] to avoid allocation.
   */
  const _out = new Float32Array(2);
  function hexPt(r, angle) {
    const SEG   = Math.PI / 3;          // 60° per side
    const s     = Math.floor(((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / SEG);
    const local = angle - s * SEG;
    const blend = local / SEG;
    const a1    = s * SEG;
    const a2    = (s + 1) * SEG;
    _out[0] = r * (Math.cos(a1) * (1 - blend) + Math.cos(a2) * blend);
    _out[1] = r * (Math.sin(a1) * (1 - blend) + Math.sin(a2) * blend);
  }

  // ── 5. RESIZE ────────────────────────────────────────────
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── 6. ANIMATION ─────────────────────────────────────────
  let t            = 0;
  const TUNNEL_D   = 340;   // total tunnel depth in world units
  const SCROLL_SPD = 16;    // units per second (how fast rings fly at you)
  let animId       = null;  // requestAnimationFrame handle, so we can cancel/restart cleanly

  // Intro ramp: on first load, rings should grow/spread into place rather
  // than snapping instantly to their full spread depth/radius.
  const INTRO_DURATION = 2.5; // seconds for the intro ramp to complete
  let introT = 0;

  function tick() {
    animId = requestAnimationFrame(tick);
    t += 0.004;
    if (introT < 1) introT = Math.min(1, introT + (1 / 60) / INTRO_DURATION);
    // easeOutCubic for a smooth, natural-feeling settle
    const introEase = 1 - Math.pow(1 - introT, 3);

    const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.36;

    for (let ring = 0; ring < RINGS; ring++) {
      const frac = ring / (RINGS - 1);          // 0 = near camera, 1 = deep

      // Radius shrinks with depth → perspective convergence
      // introEase scales radius from compressed (near 0) up to full spread,
      // so on load the vortex visibly grows outward instead of snapping in.
      const r = (14 + (1 - frac) * (maxR - 14)) * introEase;

      // Z: rings scroll toward camera and wrap
      const zBase   = -TUNNEL_D * frac;
      const zScroll = (t * SCROLL_SPD) % TUNNEL_D;
      let z = zBase + zScroll;
      if (z > 40) z -= TUNNEL_D;

      // Rotation: nearer rings spin faster = vortex twist
      const rot = t * (0.15 + (1 - frac) * 0.38) + ring * 0.21;

      // Color: cyan (near) → deep blue-purple (far)
      const hue = 0.527 + frac * 0.20;          // 0.527=cyan, 0.727=blue-purple
      const lit = 0.90 - frac * 0.50;
      const alp = 1.0  - frac * 0.52;

      for (let p = 0; p < PTS_PER_RING; p++) {
        const idx   = ring * PTS_PER_RING + p;
        const angle = (p / PTS_PER_RING) * Math.PI * 2 + rot;

        hexPt(r, angle);

        // Scatter noise — gives the dense particle texture
        const ph     = phases[idx];
        const nAmt   = r * 0.03;
        const nx     = _out[0] + Math.sin(angle * 6.3 + ph + t * 1.9) * nAmt;
        const ny     = _out[1] + Math.cos(angle * 5.1 + ph - t * 1.5) * nAmt;

        positions[idx * 3]     = nx;
        positions[idx * 3 + 1] = ny;
        positions[idx * 3 + 2] = z;

        // Sparkle: occasional bright flare particles
        const spark = Math.sin(ph + t * 4.3 + p * 0.29) > 0.89 ? 1.0 : 0.0;
        writeColor(colors, idx, hue, 1.0, lit, alp + spark * 0.55);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    renderer.render(scene, camera);
  }

  tick();

  // ── 7. SAFETY-NET RESTART ────────────────────────────────
  // If the animation ever silently stalls (browser throttling, a missed
  // requestAnimationFrame callback, tab visibility quirks, etc.), this
  // forces a clean restart every 60 seconds so it never stays frozen.
  setInterval(() => {
    if (animId !== null) {
      cancelAnimationFrame(animId);
    }
    introT = 0;
    tick();
  }, 50000);

})();
