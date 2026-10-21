/* Kid-facing delight layer. Everything here is decorative, aria-hidden,
   and switched off entirely under prefers-reduced-motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#00C0F0', '#F0B430', '#D9463F', '#F78DA7', '#0D6E6A', '#7BDCB5'];

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------- 1. floating shapes in the hero ---------- */
  function shapes() {
    var host = document.querySelector('[data-playground] .playground');
    if (!host || reduce) return;
    var kinds = ['dot', 'sprinkle', 'ring', 'tooth'];
    var n = window.innerWidth < 640 ? 14 : 26;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var k = kinds[i % kinds.length];
      var el = document.createElement('span');
      el.className = 'p-shape p-shape--' + k;
      var size = k === 'tooth' ? rnd(18, 30) : rnd(8, 26);
      el.style.setProperty('--x', rnd(2, 96).toFixed(1) + '%');
      el.style.setProperty('--y', rnd(6, 92).toFixed(1) + '%');
      el.style.setProperty('--s', size.toFixed(0) + 'px');
      el.style.setProperty('--c', COLORS[i % COLORS.length]);
      el.style.setProperty('--dur', rnd(9, 19).toFixed(1) + 's');
      el.style.setProperty('--delay', rnd(-14, 0).toFixed(1) + 's');
      el.style.setProperty('--spin', (rnd(-40, 40)).toFixed(0) + 'deg');
      frag.appendChild(el);
    }
    host.appendChild(frag);
  }

  /* ---------- 2. one confetti burst when the hero arrives ---------- */
  function confetti() {
    if (reduce) return;
    var hero = document.querySelector('[data-playground]');
    if (!hero) return;
    var burst = document.createElement('div');
    burst.className = 'confetti';
    burst.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 26; i++) {
      var p = document.createElement('i');
      p.style.setProperty('--x', rnd(4, 96).toFixed(1) + '%');
      p.style.setProperty('--c', COLORS[i % COLORS.length]);
      p.style.setProperty('--d', rnd(0, 0.5).toFixed(2) + 's');
      p.style.setProperty('--t', rnd(1.4, 2.6).toFixed(2) + 's');
      p.style.setProperty('--r', rnd(-220, 220).toFixed(0) + 'deg');
      p.style.setProperty('--w', rnd(5, 10).toFixed(0) + 'px');
      p.style.setProperty('--h', rnd(8, 16).toFixed(0) + 'px');
      burst.appendChild(p);
    }
    hero.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 3400);
  }

  /* ---------- 3. sparkles on hover over the mascot ---------- */
  function sparkle(el) {
    if (reduce || !el) return;
    el.addEventListener('pointerenter', function () {
      for (var i = 0; i < 7; i++) {
        var s = document.createElement('span');
        s.className = 'spark';
        s.style.setProperty('--sx', rnd(-38, 38).toFixed(0) + 'px');
        s.style.setProperty('--sy', rnd(-38, 18).toFixed(0) + 'px');
        s.style.setProperty('--c', COLORS[i % COLORS.length]);
        s.style.setProperty('--dl', (i * 0.03).toFixed(2) + 's');
        el.appendChild(s);
        (function (node) { setTimeout(function () { node.remove(); }, 900); })(s);
      }
    });
  }

  /* ---------- 4. numbers pop when they finish counting ---------- */
  function popCounters() {
    if (reduce) return;
    document.querySelectorAll('[data-count], .proof__num, .stat__num').forEach(function (n) {
      if (!('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-popped'); io.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      io.observe(n);
    });
  }

  function init() { shapes(); confetti(); popCounters(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.addEventListener('load', function () {
    sparkle(document.querySelector('.band__mascot img, .mascot img, [class*=mascot] img'));
  });
})();
