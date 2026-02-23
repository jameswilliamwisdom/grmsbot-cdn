/**
 * GRMSBot Thank You Page — Inline Celebration + Fly-to-Corner + Single-Click Dismiss
 *
 * Drop this AFTER the grmsbot-widget.js script tag on the thank you page.
 *
 * Flow:
 *   1. Bot enters CENTER of screen (scaled 1.5x), celebrates, says welcome
 *   2. Thumbs up/down buttons fade in below the bot
 *   3. After vote (or 10s auto-timeout):
 *      UP   → extra celebrate, fly to bottom-right corner, roam loop
 *      DOWN → wave goodbye, fly to corner, stay quiet
 *   4. In the corner: single-click = dismiss to hovering orb, orb = recall
 */
(function () {
  'use strict';

  // --- Config -----------------------------------------------------------
  var WIDGET_SIZE      = 130;   // must match data-size on the widget script tag
  var CENTER_SCALE     = 1.5;   // scale factor while centered
  var CELEBRATE_DELAY  = 600;   // ms after mount before celebrate plays
  var BUTTONS_DELAY    = 2800;  // ms after mount before thumbs appear
  var AUTO_PROCEED     = 12000; // ms before auto-proceeding if no vote
  var FLY_DURATION     = 1000;  // ms for center → corner transition
  var ROAM_START_DELAY = 3000;  // ms after arriving in corner before first roam
  var ROAM_LOOP_MIN    = 15000;
  var ROAM_LOOP_MAX    = 30000;

  var WELCOME_MSG      = "You're in! Welcome to TattooNOW!";
  var THUMBS_UP_MSG    = "Awesome! I'll be around if you need me.";
  var THUMBS_DOWN_MSG  = "No worries — see you Monday!";

  // --- Wait for GRMSBot API + DOM mount ---------------------------------
  var pollCount = 0;
  var poll = setInterval(function () {
    pollCount++;
    if (window.GRMSBot && window.GRMSBot.element && GRMSBot.element.parentNode) {
      clearInterval(poll);
      init();
    } else if (pollCount > 150) { // 15 s timeout
      clearInterval(poll);
    }
  }, 100);

  // --- Inject styles ----------------------------------------------------
  function injectStyles() {
    var css = [
      // Thumbs buttons
      '.grmsbot-thumbs {',
      '  position: fixed;',
      '  z-index: 100000;',
      '  display: flex;',
      '  gap: 12px;',
      '  opacity: 0;',
      '  transform: translateY(10px);',
      '  transition: opacity 0.5s ease, transform 0.5s ease;',
      '  pointer-events: none;',
      '}',
      '.grmsbot-thumbs.visible {',
      '  opacity: 1;',
      '  transform: translateY(0);',
      '  pointer-events: auto;',
      '}',
      '.grmsbot-thumb-btn {',
      '  width: 48px;',
      '  height: 48px;',
      '  border: none;',
      '  border-radius: 50%;',
      '  cursor: pointer;',
      '  font-size: 24px;',
      '  line-height: 48px;',
      '  text-align: center;',
      '  padding: 0;',
      '  transition: transform 0.15s ease, box-shadow 0.15s ease;',
      '  box-shadow: 0 2px 10px rgba(0,0,0,0.2);',
      '}',
      '.grmsbot-thumb-btn:hover {',
      '  transform: scale(1.18);',
      '  box-shadow: 0 4px 16px rgba(0,0,0,0.3);',
      '}',
      '.grmsbot-thumb-btn:active {',
      '  transform: scale(0.92);',
      '}',
      '.grmsbot-thumb-up {',
      '  background: linear-gradient(135deg, #22c55e, #16a34a);',
      '  color: #fff;',
      '}',
      '.grmsbot-thumb-down {',
      '  background: linear-gradient(135deg, #94a3b8, #64748b);',
      '  color: #fff;',
      '}',
      '.grmsbot-thumbs.dismissed {',
      '  opacity: 0;',
      '  transform: scale(0.5);',
      '  transition: opacity 0.3s ease, transform 0.3s ease;',
      '  pointer-events: none;',
      '}',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --- Position helpers -------------------------------------------------
  function centerCoords() {
    var visualSize = WIDGET_SIZE * CENTER_SCALE;
    return {
      top:  (window.innerHeight / 2) - (visualSize / 2),
      left: (window.innerWidth / 2)  - (visualSize / 2)
    };
  }

  function cornerCoords() {
    return {
      top:  window.innerHeight - WIDGET_SIZE - 20,
      left: window.innerWidth  - WIDGET_SIZE - 20
    };
  }

  // --- Build thumbs UI --------------------------------------------------
  function createThumbs(onUp, onDown) {
    var wrap = document.createElement('div');
    wrap.className = 'grmsbot-thumbs';

    var up = document.createElement('button');
    up.className = 'grmsbot-thumb-btn grmsbot-thumb-up';
    up.innerHTML = '&#x1F44D;';
    up.setAttribute('aria-label', 'Thumbs up');
    up.title = 'Love it!';

    var down = document.createElement('button');
    down.className = 'grmsbot-thumb-btn grmsbot-thumb-down';
    down.innerHTML = '&#x1F44E;';
    down.setAttribute('aria-label', 'Thumbs down');
    down.title = 'Not for me';

    up.addEventListener('pointerup', function (e) {
      e.stopPropagation();
      onUp();
    });
    down.addEventListener('pointerup', function (e) {
      e.stopPropagation();
      onDown();
    });

    wrap.appendChild(up);
    wrap.appendChild(down);
    document.body.appendChild(wrap);
    return wrap;
  }

  function positionThumbsBelow(thumbsEl, el) {
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    thumbsEl.style.left = (cx - thumbsEl.offsetWidth / 2) + 'px';
    thumbsEl.style.top  = (rect.bottom + 14) + 'px';
    thumbsEl.style.bottom = 'auto';
  }

  // --- Single-click dismiss override ------------------------------------
  function enableSingleClickDismiss(el) {
    var sx, sy;
    el.addEventListener('pointerdown', function (e) {
      sx = e.clientX;
      sy = e.clientY;
      e.stopImmediatePropagation();
    }, true);

    el.addEventListener('pointerup', function (e) {
      var dx = e.clientX - sx;
      var dy = e.clientY - sy;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        GRMSBot.dismiss();
      }
      e.stopImmediatePropagation();
    }, true);
  }

  // --- Roam loop --------------------------------------------------------
  function startRoamLoop() {
    function scheduleNext() {
      var delay = ROAM_LOOP_MIN + Math.random() * (ROAM_LOOP_MAX - ROAM_LOOP_MIN);
      setTimeout(function () {
        if (window.GRMSBot) {
          GRMSBot.roam();
          scheduleNext();
        }
      }, delay);
    }
    setTimeout(function () {
      scheduleNext();
    }, ROAM_START_DELAY);
  }

  // --- Fly from center to corner ----------------------------------------
  function flyToCorner(el, callback) {
    var corner = cornerCoords();

    el.style.transition = 'top ' + FLY_DURATION + 'ms cubic-bezier(0.4,0,0.2,1), '
                        + 'left ' + FLY_DURATION + 'ms cubic-bezier(0.4,0,0.2,1), '
                        + 'transform ' + FLY_DURATION + 'ms cubic-bezier(0.4,0,0.2,1)';

    // Force reflow so transition triggers
    void el.offsetWidth;

    el.style.top  = corner.top + 'px';
    el.style.left = corner.left + 'px';
    el.style.transform = 'scale(1)';
    el.style.transformOrigin = 'center center';

    setTimeout(function () {
      // Restore natural bottom-right positioning
      el.style.transition = '';
      el.style.top  = '';
      el.style.left = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.bottom = '20px';
      el.style.right  = '20px';
      if (callback) callback();
    }, FLY_DURATION + 50);
  }

  // --- Main init --------------------------------------------------------
  function init() {
    injectStyles();

    var el = GRMSBot.element;
    var voted = false;
    var autoTimer = 0;

    // ---- Phase 1: Position center, hidden, then entrance ----

    // Kill widget's default entrance animation
    el.style.animation = 'none';
    el.style.opacity = '0';

    // Override bottom/right → use top/left for center
    el.style.bottom = 'auto';
    el.style.right  = 'auto';

    var center = centerCoords();
    el.style.top  = center.top + 'px';
    el.style.left = center.left + 'px';
    el.style.transform = 'scale(' + CENTER_SCALE + ')';
    el.style.transformOrigin = 'center center';

    // Fade in
    requestAnimationFrame(function () {
      el.style.transition = 'opacity 0.8s ease';
      el.style.opacity = '1';
    });

    // ---- Phase 2: Celebrate + welcome message ----
    setTimeout(function () {
      GRMSBot.celebrate();
      GRMSBot.say(WELCOME_MSG);
    }, CELEBRATE_DELAY);

    // ---- Phase 3: Show thumbs ----
    var thumbs = createThumbs(handleUp, handleDown);

    setTimeout(function () {
      positionThumbsBelow(thumbs, el);
      thumbs.classList.add('visible');
    }, BUTTONS_DELAY);

    // Reposition on resize
    var reposition = function () {
      if (!voted) {
        var c = centerCoords();
        el.style.top  = c.top + 'px';
        el.style.left = c.left + 'px';
        positionThumbsBelow(thumbs, el);
      }
    };
    window.addEventListener('resize', reposition);

    // Auto-proceed as thumbs-up if no vote
    autoTimer = setTimeout(function () {
      if (!voted) handleUp();
    }, AUTO_PROCEED);

    // ---- Handlers ----
    function handleUp() {
      if (voted) return;
      voted = true;
      clearTimeout(autoTimer);

      // Dismiss thumbs
      thumbs.classList.add('dismissed');

      // Extra celebrate
      GRMSBot.celebrate();
      GRMSBot.say(THUMBS_UP_MSG);

      // After celebrate finishes → fly to corner → enable dismiss → roam
      setTimeout(function () {
        flyToCorner(el, function () {
          enableSingleClickDismiss(el);
          startRoamLoop();
        });
      }, 3000);

      cleanup();
    }

    function handleDown() {
      if (voted) return;
      voted = true;
      clearTimeout(autoTimer);

      // Dismiss thumbs
      thumbs.classList.add('dismissed');

      // Wave goodbye
      GRMSBot.wave();
      GRMSBot.say(THUMBS_DOWN_MSG);

      // After wave → fly to corner → enable dismiss, no roam
      setTimeout(function () {
        flyToCorner(el, function () {
          enableSingleClickDismiss(el);
        });
      }, 3000);

      cleanup();
    }

    function cleanup() {
      window.removeEventListener('resize', reposition);
      setTimeout(function () {
        if (thumbs.parentNode) thumbs.parentNode.removeChild(thumbs);
      }, 600);
    }
  }
})();
