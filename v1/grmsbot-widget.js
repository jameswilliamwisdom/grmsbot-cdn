(function () {
  "use strict";

  // --- Config from script tag data attributes ---
  var script =
    document.currentScript ||
    document.querySelector('script[src*="grmsbot-widget"]');
  var cfg = {
    size: parseInt((script && script.getAttribute("data-size")) || "130", 10),
    position:
      (script && script.getAttribute("data-position")) || "bottom-right",
    delay: parseInt(
      (script && script.getAttribute("data-delay")) || "1000",
      10
    ),
    base:
      (script && script.getAttribute("data-base")) ||
      (script && script.src
        ? script.src.replace(/[^/]*$/, "") + "layers/"
        : "layers/"),
    fx: (script && script.getAttribute("data-fx")) !== "off",
    mode: (script && script.getAttribute("data-mode")) || "fixed",
    target: (script && script.getAttribute("data-target")) || "",
  };

  // For inline script-as-anchor: insert a placeholder div right after the
  // script tag while document.currentScript is still valid (synchronous).
  var inlineAnchor = null;
  if (cfg.mode === "inline" && !cfg.target && script && script.parentNode) {
    inlineAnchor = document.createElement("div");
    script.parentNode.insertBefore(inlineAnchor, script.nextSibling);
  }

  // --- APNG sprite URLs ---
  var SPRITES = {
    idle: cfg.base + "grmsbot-idle-hover.apng",
    celebrate: cfg.base + "grmsbot-celebrate.apng",
    wave: cfg.base + "grmsbot-wave-hello.apng",
  };

  // --- Inject styles ---
  var styleEl = document.createElement("style");
  styleEl.textContent = [
    "@keyframes grmsbot-entrance {",
    "  from { opacity: 0; transform: translateY(40px); }",
    "  to { opacity: 1; transform: translateY(0); }",
    "}",
    "@keyframes grmsbot-bob {",
    "  0%, 100% { transform: translateY(0); }",
    "  50% { transform: translateY(-3px); }",
    "}",
    "@keyframes grmsbot-sway {",
    "  0%, 100% { transform: rotate(0deg); }",
    "  50% { transform: rotate(1deg); }",
    "}",
    "@keyframes grmsbot-celebrate-bounce {",
    "  0%, 100% { transform: translateY(0) scale(1); }",
    "  15% { transform: translateY(-12px) scale(1.08); }",
    "  30% { transform: translateY(0) scale(1); }",
    "  45% { transform: translateY(-8px) scale(1.05); }",
    "  60% { transform: translateY(0) scale(1); }",
    "  75% { transform: translateY(-4px) scale(1.02); }",
    "}",
    "@keyframes grmsbot-wave-wiggle {",
    "  0%, 100% { transform: rotate(0deg); }",
    "  20% { transform: rotate(-6deg); }",
    "  40% { transform: rotate(5deg); }",
    "  60% { transform: rotate(-5deg); }",
    "  80% { transform: rotate(3deg); }",
    "}",
    "@keyframes grmsbot-entrance-inline {",
    "  from { opacity: 0; transform: scale(0.8); }",
    "  to { opacity: 1; transform: scale(1); }",
    "}",
    ".grmsbot-widget {",
    "  position: fixed;",
    "  z-index: 99999;",
    "  cursor: pointer;",
    "  animation: grmsbot-entrance 0.6s ease-out both;",
    "  -webkit-user-select: none;",
    "  user-select: none;",
    "}",
    ".grmsbot-widget-inline {",
    "  position: relative;",
    "  display: inline-block;",
    "  z-index: auto;",
    "  animation: grmsbot-entrance-inline 0.5s ease-out both;",
    "}",
    ".grmsbot-sway {",
    "  animation: grmsbot-sway 4s ease-in-out infinite;",
    "}",
    ".grmsbot-puppet {",
    "  animation: grmsbot-bob 3s ease-in-out infinite;",
    "  transition: transform 0.2s ease;",
    "}",
    ".grmsbot-widget:hover .grmsbot-puppet {",
    "  animation-play-state: paused;",
    "  transform: scale(1.05);",
    "}",
    ".grmsbot-celebrate .grmsbot-puppet {",
    "  animation: grmsbot-celebrate-bounce 0.8s ease-out !important;",
    "}",
    ".grmsbot-wave-anim .grmsbot-puppet {",
    "  animation: grmsbot-wave-wiggle 0.8s ease-out !important;",
    "}",
    ".grmsbot-sprite {",
    "  display: block;",
    "  width: 100%;",
    "  height: 100%;",
    "  object-fit: contain;",
    "  position: absolute;",
    "  top: 0;",
    "  left: 0;",
    "  opacity: 0;",
    "  transition: opacity 0.15s ease;",
    "}",
    ".grmsbot-sprite.active {",
    "  opacity: 1;",
    "}",
    ".grmsbot-bubble {",
    "  position: absolute;",
    "  bottom: 105%;",
    "  right: 0;",
    "  background: #fff;",
    "  color: #1a1a2e;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
    "  font-size: 13px;",
    "  font-weight: 500;",
    "  padding: 8px 14px;",
    "  border-radius: 12px;",
    "  white-space: nowrap;",
    "  box-shadow: 0 4px 20px rgba(0,0,0,0.25);",
    "  opacity: 0;",
    "  transform: translateY(8px) scale(0.9);",
    "  transition: opacity 0.25s ease, transform 0.25s ease;",
    "  pointer-events: none;",
    "}",
    ".grmsbot-bubble.visible {",
    "  opacity: 1;",
    "  transform: translateY(0) scale(1);",
    "}",
    ".grmsbot-bubble::after {",
    "  content: '';",
    "  position: absolute;",
    "  bottom: -6px;",
    "  right: 20px;",
    "  width: 12px;",
    "  height: 12px;",
    "  background: #fff;",
    "  transform: rotate(45deg);",
    "  border-radius: 2px;",
    "}",
  ].join("\n");
  document.head.appendChild(styleEl);

  // --- Build DOM ---
  var container = document.createElement("div");
  var isInline = cfg.mode === "inline";
  container.className = isInline ? "grmsbot-widget grmsbot-widget-inline" : "grmsbot-widget";

  if (!isInline) {
    var pos = cfg.position.split("-");
    container.style[pos[0] || "bottom"] = "20px";
    container.style[pos[1] || "right"] = "20px";
  }

  var swayWrap = document.createElement("div");
  swayWrap.className = "grmsbot-sway";

  var puppet = document.createElement("div");
  puppet.className = "grmsbot-puppet";
  puppet.style.width = cfg.size + "px";
  puppet.style.height = cfg.size + "px";
  puppet.style.position = "relative";

  // Create APNG img elements (stacked, toggle visibility)
  var imgs = {};
  function createSprite(name, src) {
    var img = document.createElement("img");
    img.src = src;
    img.className = "grmsbot-sprite";
    img.alt = "";
    img.draggable = false;
    puppet.appendChild(img);
    imgs[name] = img;
    return img;
  }

  var bubble = document.createElement("div");
  bubble.className = "grmsbot-bubble";

  swayWrap.appendChild(puppet);
  container.appendChild(swayWrap);
  container.appendChild(bubble);

  // ============================================================
  // --- FX: Canvas effects system ---
  // ============================================================
  var fxCanvas = null;
  var fxCtx = null;
  var fxRAF = 0;
  var fxEnabled = cfg.fx;
  var fxParticles = [];
  var FX_MAX_PARTICLES = 60;
  var fxCursorDist = 9999; // distance from cursor to widget center
  var fxScrollVel = 0;     // scroll velocity (px/frame)
  var fxFlareTimer = 0;    // celebrate flare countdown
  var fxTrailQueue = 0;    // wave trail particles remaining

  // Time-of-day palette
  function todPalette() {
    var h = new Date().getHours();
    if (h >= 5 && h < 10) return { aura: [255, 200, 60], spark: [255, 215, 0], energy: [255, 180, 50], ambient: [250, 230, 180] };     // morning gold
    if (h >= 10 && h < 17) return { aura: [0, 210, 255], spark: [100, 255, 218], energy: [0, 200, 255], ambient: [180, 240, 255] };    // day cyan
    if (h >= 17 && h < 21) return { aura: [139, 92, 246], spark: [216, 180, 254], energy: [168, 85, 247], ambient: [200, 170, 255] };  // evening purple
    return { aura: [59, 130, 246], spark: [147, 197, 253], energy: [96, 165, 250], ambient: [140, 180, 255] };                          // night blue
  }

  // Particle: { x, y, vx, vy, life, maxLife, size, color, alpha }
  function spawnParticle(type) {
    if (fxParticles.length >= FX_MAX_PARTICLES) {
      // Recycle oldest dead particle
      for (var i = 0; i < fxParticles.length; i++) {
        if (fxParticles[i].life <= 0) {
          fxParticles.splice(i, 1);
          break;
        }
      }
      if (fxParticles.length >= FX_MAX_PARTICLES) return;
    }

    var pal = todPalette();
    var cs = cfg.size * 1.5;
    var cx = cs / 2, cy = cs / 2;
    var p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: [255,255,255], alpha: 1 };

    if (type === "sparkle") {
      var angle = Math.random() * Math.PI * 2;
      var r = cfg.size * 0.3 + Math.random() * cfg.size * 0.2;
      p.x = cx + Math.cos(angle) * r;
      p.y = cy + Math.sin(angle) * r;
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = -0.3 - Math.random() * 0.6;
      p.life = p.maxLife = 40 + Math.random() * 30;
      p.size = 1.5 + Math.random() * 2;
      p.color = pal.spark;
    } else if (type === "energy") {
      p.x = cx + (Math.random() - 0.5) * cfg.size * 0.4;
      p.y = cy + cfg.size * 0.1;
      p.vx = (Math.random() - 0.5) * 0.6;
      p.vy = -0.5 - Math.random() * 0.8;
      p.life = p.maxLife = 30 + Math.random() * 20;
      p.size = 2 + Math.random() * 2.5;
      p.color = pal.energy;
    } else if (type === "float") {
      p.x = cx + (Math.random() - 0.5) * cfg.size * 0.6;
      p.y = cy + (Math.random() - 0.5) * cfg.size * 0.4;
      p.vx = (Math.random() - 0.5) * 0.2;
      p.vy = -0.15 - Math.random() * 0.25;
      p.life = p.maxLife = 60 + Math.random() * 40;
      p.size = 1 + Math.random() * 1.5;
      p.color = pal.ambient;
    } else if (type === "burst") {
      var a2 = Math.random() * Math.PI * 2;
      var speed = 1.5 + Math.random() * 2;
      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(a2) * speed;
      p.vy = Math.sin(a2) * speed;
      p.life = p.maxLife = 25 + Math.random() * 15;
      p.size = 2 + Math.random() * 3;
      p.color = pal.spark;
    } else if (type === "trail") {
      // From hand area (right side, mid-height)
      p.x = cx + cfg.size * 0.3;
      p.y = cy - cfg.size * 0.05;
      p.vx = 0.8 + Math.random() * 0.6;
      p.vy = -0.3 - Math.random() * 0.5;
      p.life = p.maxLife = 20 + Math.random() * 15;
      p.size = 2 + Math.random() * 2;
      p.color = pal.energy;
    }

    fxParticles.push(p);
  }

  function fxInit() {
    if (!fxEnabled) return;

    var cs = Math.round(cfg.size * 1.5);
    fxCanvas = document.createElement("canvas");
    fxCanvas.width = cs;
    fxCanvas.height = cs;
    fxCanvas.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:" + cs + "px;height:" + cs + "px;pointer-events:none;z-index:-1;";
    puppet.style.overflow = "visible";
    puppet.appendChild(fxCanvas);
    fxCtx = fxCanvas.getContext("2d");

    // Track cursor distance
    document.addEventListener("mousemove", function (e) {
      var rect = container.getBoundingClientRect();
      var wcx = rect.left + rect.width / 2;
      var wcy = rect.top + rect.height / 2;
      var dx = e.clientX - wcx;
      var dy = e.clientY - wcy;
      fxCursorDist = Math.sqrt(dx * dx + dy * dy);
    });

    // Track scroll velocity
    var lastScrollY = window.scrollY;
    window.addEventListener("scroll", function () {
      fxScrollVel = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
    }, { passive: true });

    fxLoop();
  }

  function fxLoop() {
    if (!fxEnabled) { fxRAF = 0; return; }

    // Visibility gate
    if (document.visibilityState === "hidden") {
      fxRAF = requestAnimationFrame(fxLoop);
      return;
    }

    var cs = fxCanvas.width;
    var cx = cs / 2, cy = cs / 2;
    fxCtx.clearRect(0, 0, cs, cs);

    // --- Proximity multiplier (1.0 normal → 2.5 when cursor nearby) ---
    var proxThreshold = 300;
    var proximity = Math.max(0, 1 - fxCursorDist / proxThreshold);
    var glowMult = 1 + proximity * 1.5;
    var spawnMult = 1 + proximity * 2;

    var pal = todPalette();

    // --- Aura glow ---
    var time = Date.now() / 1000;
    var pulse = 0.4 + 0.15 * Math.sin(time * 1.8) + 0.1 * Math.sin(time * 3.1);
    pulse *= glowMult;
    var auraR = cfg.size * 0.55;

    var grad = fxCtx.createRadialGradient(cx, cy, cfg.size * 0.2, cx, cy, auraR);
    grad.addColorStop(0, "rgba(" + pal.aura[0] + "," + pal.aura[1] + "," + pal.aura[2] + "," + (pulse * 0.25).toFixed(3) + ")");
    grad.addColorStop(0.6, "rgba(" + pal.aura[0] + "," + pal.aura[1] + "," + pal.aura[2] + "," + (pulse * 0.1).toFixed(3) + ")");
    grad.addColorStop(1, "rgba(" + pal.aura[0] + "," + pal.aura[1] + "," + pal.aura[2] + ",0)");
    fxCtx.fillStyle = grad;
    fxCtx.fillRect(0, 0, cs, cs);

    // Celebrate flare
    if (fxFlareTimer > 0) {
      var flareAlpha = Math.min(fxFlareTimer / 10, 0.5);
      var flareGrad = fxCtx.createRadialGradient(cx, cy, 0, cx, cy, auraR * 1.8);
      flareGrad.addColorStop(0, "rgba(" + pal.spark[0] + "," + pal.spark[1] + "," + pal.spark[2] + "," + flareAlpha.toFixed(3) + ")");
      flareGrad.addColorStop(1, "rgba(" + pal.spark[0] + "," + pal.spark[1] + "," + pal.spark[2] + ",0)");
      fxCtx.fillStyle = flareGrad;
      fxCtx.fillRect(0, 0, cs, cs);
      fxFlareTimer--;
    }

    // --- Eye glow ---
    // Approximate eye positions relative to sprite center (normalized offsets)
    var eyeOffsets = [
      { x: -0.1, y: -0.18 },
      { x: 0.1, y: -0.18 },
    ];
    var eyePulse = 0.5 + 0.3 * Math.sin(time * 2.5);
    eyePulse *= glowMult;
    for (var ei = 0; ei < eyeOffsets.length; ei++) {
      var ex = cx + eyeOffsets[ei].x * cfg.size;
      var ey = cy + eyeOffsets[ei].y * cfg.size;
      var eyeGrad = fxCtx.createRadialGradient(ex, ey, 0, ex, ey, cfg.size * 0.08);
      eyeGrad.addColorStop(0, "rgba(0,255,120," + (eyePulse * 0.6).toFixed(3) + ")");
      eyeGrad.addColorStop(0.5, "rgba(0,255,120," + (eyePulse * 0.2).toFixed(3) + ")");
      eyeGrad.addColorStop(1, "rgba(0,255,120,0)");
      fxCtx.fillStyle = eyeGrad;
      fxCtx.beginPath();
      fxCtx.arc(ex, ey, cfg.size * 0.08, 0, Math.PI * 2);
      fxCtx.fill();
    }

    // --- Spawn particles ---
    var frameChance = Math.random();
    if (frameChance < 0.05 * spawnMult) spawnParticle("sparkle");
    if (frameChance < 0.03 * spawnMult) spawnParticle("float");
    if (proximity > 0.5 && frameChance < 0.08) spawnParticle("energy");

    // Wave trail
    if (fxTrailQueue > 0 && frameChance < 0.5) {
      spawnParticle("trail");
      fxTrailQueue--;
    }

    // --- Update & draw particles ---
    for (var pi = fxParticles.length - 1; pi >= 0; pi--) {
      var p = fxParticles[pi];
      p.life--;
      if (p.life <= 0) {
        fxParticles.splice(pi, 1);
        continue;
      }

      // Scroll wind
      p.vx += fxScrollVel * 0.01;
      fxScrollVel *= 0.95; // dampen

      p.x += p.vx;
      p.y += p.vy;
      p.alpha = p.life / p.maxLife;

      fxCtx.globalAlpha = p.alpha * 0.8;
      fxCtx.fillStyle = "rgb(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + ")";
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.size * (0.5 + 0.5 * p.alpha), 0, Math.PI * 2);
      fxCtx.fill();

      // Soft glow around particle
      if (p.size > 2) {
        fxCtx.globalAlpha = p.alpha * 0.15;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        fxCtx.fill();
      }
    }

    fxCtx.globalAlpha = 1;
    fxRAF = requestAnimationFrame(fxLoop);
  }

  function fxCelebrateBurst() {
    if (!fxEnabled) return;
    for (var i = 0; i < 18; i++) spawnParticle("burst");
    fxFlareTimer = 48; // ~800ms at 60fps
  }

  function fxWaveTrail() {
    if (!fxEnabled) return;
    fxTrailQueue = 10;
  }

  function fxSetEnabled(on) {
    fxEnabled = on;
    if (on && fxCanvas && !fxRAF) fxLoop();
    if (!on && fxCanvas) {
      if (fxRAF) cancelAnimationFrame(fxRAF);
      fxRAF = 0;
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    }
  }

  // --- Sprite switching ---
  // APNG restarts from frame 0 when src is re-assigned
  var currentState = "idle";
  var transitioning = false;

  function showSprite(name) {
    Object.keys(imgs).forEach(function (k) {
      imgs[k].classList.toggle("active", k === name);
    });
  }

  function switchTo(name, thenIdle) {
    if (thenIdle) {
      transitioning = true;
      showSprite(name);
      // Restart the APNG to play from frame 0
      var img = imgs[name];
      var src = img.src;
      img.src = "";
      img.src = src;
      // APNG plays 5s at 15fps, return to idle after
      setTimeout(function () {
        transitioning = false;
        currentState = "idle";
        showSprite("idle");
      }, 5100);
    } else {
      showSprite(name);
      currentState = name;
    }
  }

  // --- Behaviors ---
  var phrases = [
    "Hey there! Need ink?",
    "Welcome to TattooNOW!",
    "Let\u2019s make some art!",
    "Click for a surprise!",
  ];

  function showBubble(text) {
    bubble.textContent = text;
    bubble.classList.add("visible");
    clearTimeout(showBubble._timer);
    showBubble._timer = setTimeout(function () {
      bubble.classList.remove("visible");
    }, 3000);
  }

  function triggerCelebrate() {
    if (transitioning) return;
    container.classList.remove("grmsbot-wave-anim", "grmsbot-celebrate");
    void container.offsetWidth;
    container.classList.add("grmsbot-celebrate");
    switchTo("celebrate", true);
    fxCelebrateBurst();
    setTimeout(function () {
      container.classList.remove("grmsbot-celebrate");
    }, 800);
  }

  function triggerWave() {
    if (transitioning) return;
    container.classList.remove("grmsbot-celebrate", "grmsbot-wave-anim");
    void container.offsetWidth;
    container.classList.add("grmsbot-wave-anim");
    switchTo("wave", true);
    fxWaveTrail();
    setTimeout(function () {
      container.classList.remove("grmsbot-wave-anim");
    }, 800);
  }

  // --- Interaction ---
  var clickCount = 0;
  container.addEventListener("click", function () {
    clickCount++;
    if (clickCount % 3 === 0) {
      triggerWave();
    } else {
      triggerCelebrate();
    }
    showBubble(phrases[clickCount % phrases.length]);
  });

  // Random wave every 25-45s
  function scheduleRandomWave() {
    var delay = 25000 + Math.random() * 20000;
    setTimeout(function () {
      if (document.visibilityState !== "hidden" && !transitioning) {
        triggerWave();
      }
      scheduleRandomWave();
    }, delay);
  }

  // --- Mount ---
  function mount() {
    createSprite("idle", SPRITES.idle);
    createSprite("celebrate", SPRITES.celebrate);
    createSprite("wave", SPRITES.wave);

    showSprite("idle");

    if (isInline) {
      if (cfg.target) {
        var targetEl = document.querySelector(cfg.target);
        if (targetEl) {
          targetEl.appendChild(container);
        } else {
          document.body.appendChild(container);
        }
      } else if (inlineAnchor && inlineAnchor.parentNode) {
        inlineAnchor.parentNode.replaceChild(container, inlineAnchor);
      } else {
        document.body.appendChild(container);
      }
    } else {
      document.body.appendChild(container);
    }

    fxInit();
    scheduleRandomWave();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(mount, cfg.delay);
    });
  } else {
    setTimeout(mount, cfg.delay);
  }

  // --- Public API ---
  window.GRMSBot = {
    celebrate: triggerCelebrate,
    wave: triggerWave,
    say: showBubble,
    element: container,
    fx: fxSetEnabled,
  };
})();
