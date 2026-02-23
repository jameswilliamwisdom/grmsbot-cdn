/**
 * GRMSBot Thank You Page — Celebration + Thumbs Vote
 *
 * Drop this AFTER the grmsbot-widget.js script tag on the thank you page.
 *
 * Flow:
 *   1. Page loads → bot enters, celebrates, says welcome message
 *   2. Thumbs up/down buttons fade in beside the bot
 *   3. Thumbs UP   → big celebrate, say thanks, poof out, reappear elsewhere (roam loop)
 *   4. Thumbs DOWN → gentle wave, say "no worries", poof out, done
 */
(function () {
  'use strict';

  // --- Config -----------------------------------------------------------
  var ENTRANCE_DELAY   = 1800;  // ms after page load before celebrate
  var BUTTONS_DELAY    = 3200;  // ms after page load before thumbs appear
  var ROAM_START_DELAY = 2000;  // ms after thumbs-up dismiss before first roam
  var ROAM_LOOP_MIN    = 12000; // ms min between roam appearances
  var ROAM_LOOP_MAX    = 25000; // ms max between roam appearances
  var CELEBRATE_MSG    = "You're in! See you Monday at 11 AM!";
  var THUMBS_UP_MSG    = "Awesome! I'll be around if you need me.";
  var THUMBS_DOWN_MSG  = "No worries — see you Monday!";

  // --- Wait for GRMSBot API ---------------------------------------------
  var pollCount = 0;
  var poll = setInterval(function () {
    pollCount++;
    if (window.GRMSBot && window.GRMSBot.element) {
      clearInterval(poll);
      init();
    } else if (pollCount > 100) {   // 10 s timeout
      clearInterval(poll);
    }
  }, 100);

  // --- Styles -----------------------------------------------------------
  function injectStyles() {
    var css = [
      '.grmsbot-thumbs {',
      '  position: fixed;',
      '  z-index: 100000;',
      '  display: flex;',
      '  gap: 10px;',
      '  opacity: 0;',
      '  transform: translateY(8px);',
      '  transition: opacity 0.5s ease, transform 0.5s ease;',
      '  pointer-events: none;',
      '}',
      '.grmsbot-thumbs.visible {',
      '  opacity: 1;',
      '  transform: translateY(0);',
      '  pointer-events: auto;',
      '}',
      '.grmsbot-thumb-btn {',
      '  width: 44px;',
      '  height: 44px;',
      '  border: none;',
      '  border-radius: 50%;',
      '  cursor: pointer;',
      '  font-size: 22px;',
      '  line-height: 44px;',
      '  text-align: center;',
      '  padding: 0;',
      '  transition: transform 0.15s ease, box-shadow 0.15s ease;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.18);',
      '}',
      '.grmsbot-thumb-btn:hover {',
      '  transform: scale(1.15);',
      '  box-shadow: 0 4px 14px rgba(0,0,0,0.25);',
      '}',
      '.grmsbot-thumb-btn:active {',
      '  transform: scale(0.95);',
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
      '  transform: scale(0.6);',
      '  transition: opacity 0.3s ease, transform 0.3s ease;',
      '  pointer-events: none;',
      '}',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --- Position thumbs relative to bot ----------------------------------
  function positionThumbs(thumbsEl) {
    var bot = window.GRMSBot.element;
    if (!bot) return;
    var rect = bot.getBoundingClientRect();

    // Place buttons centered above the bot
    var centerX = rect.left + rect.width / 2;
    thumbsEl.style.left = (centerX - thumbsEl.offsetWidth / 2) + 'px';
    thumbsEl.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
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

  // --- Roam loop after thumbs-up ----------------------------------------
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
      if (window.GRMSBot) {
        GRMSBot.recall();
        setTimeout(function () {
          GRMSBot.celebrate();
          GRMSBot.say(THUMBS_UP_MSG);
          setTimeout(function () {
            GRMSBot.dismiss();
            scheduleNext();
          }, 4000);
        }, 600);
      }
    }, ROAM_START_DELAY);
  }

  // --- Main init --------------------------------------------------------
  function init() {
    injectStyles();

    var voted = false;

    // 1. Entrance celebration
    setTimeout(function () {
      GRMSBot.celebrate();
      GRMSBot.say(CELEBRATE_MSG);
    }, ENTRANCE_DELAY);

    // 2. Show thumbs buttons
    var thumbs = createThumbs(handleUp, handleDown);

    setTimeout(function () {
      positionThumbs(thumbs);
      thumbs.classList.add('visible');
    }, BUTTONS_DELAY);

    // Reposition on scroll / resize
    var reposition = function () { positionThumbs(thumbs); };
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });

    // 3a. Thumbs UP
    function handleUp() {
      if (voted) return;
      voted = true;

      thumbs.classList.add('dismissed');
      GRMSBot.celebrate();
      GRMSBot.say(THUMBS_UP_MSG);

      // After celebrate finishes → dismiss → roam loop
      setTimeout(function () {
        GRMSBot.dismiss();
        startRoamLoop();
      }, 5200);

      cleanup();
    }

    // 3b. Thumbs DOWN
    function handleDown() {
      if (voted) return;
      voted = true;

      thumbs.classList.add('dismissed');
      GRMSBot.wave();
      GRMSBot.say(THUMBS_DOWN_MSG);

      // After wave finishes → dismiss, no roam
      setTimeout(function () {
        GRMSBot.dismiss();
      }, 5200);

      cleanup();
    }

    function cleanup() {
      window.removeEventListener('scroll', reposition);
      window.removeEventListener('resize', reposition);
      setTimeout(function () {
        if (thumbs.parentNode) thumbs.parentNode.removeChild(thumbs);
      }, 600);
    }
  }
})();
