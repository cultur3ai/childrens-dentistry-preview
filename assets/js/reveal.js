/* Motion system — reveals in AND out, counters, photo parallax, marquee.
   Visibility is computed on a rAF-throttled scroll pass instead of through
   IntersectionObserver: with ~30 nodes it is cheap, and toggling the class both
   ways is predictable. (An observer only reports crossings, which is why
   elements used to stay revealed once you had scrolled past them.)

   Everything is visible without JS: the `js` class in <head> enables the hidden
   start state, so a failed script never hides content.
   Everything is off under prefers-reduced-motion: reduce. */
(function () {
  'use strict';

  var STAGGER = 32, STAGGER_MAX = 190, PARALLAX_MAX = 14;
  var ENTER_AT = 0.90, DEAD_BAND = 40;

  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var targets = document.querySelectorAll('[data-reveal]');
  var counters = document.querySelectorAll('[data-count]');
  var parallaxed = document.querySelectorAll('[data-parallax]');
  var marquees = document.querySelectorAll('.marquee');

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  if (reduced) {
    each(targets, function (el) { el.classList.add('is-in'); });
    each(marquees, function (el) { el.classList.add('is-in'); });
    each(counters, function (el) {
      var raw = el.getAttribute('data-count');
      if (!isNaN(parseFloat(raw))) el.textContent = parseFloat(raw).toFixed((raw.split('.')[1] || '').length);
    });
    return;
  }

  function staggerIndex(el) {
    var i = 0, sib = el.previousElementSibling;
    while (sib) {
      if (sib.hasAttribute && sib.hasAttribute('data-reveal')) i++;
      sib = sib.previousElementSibling;
    }
    return i;
  }

  var vh = window.innerHeight || root.clientHeight;

  function parallax() {
    for (var i = 0; i < pItems.length; i++) {
      var item = pItems[i];
      var rect = item.el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;
      var progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      if (progress > 1) progress = 1;
      if (progress < -1) progress = -1;
      var range = Math.min(item.range, rect.height * 0.04);
      item.el.style.setProperty('--parallax', (progress * range).toFixed(2) + 'px');
    }
  }

  function pass() {
    ticking = false;
    vh = window.innerHeight || root.clientHeight;
    var enterAt = vh * ENTER_AT;

    each(targets, function (el) {
      var r = el.getBoundingClientRect();
      var visible = r.top < enterAt && r.bottom > 0;
      var gone = r.bottom < -DEAD_BAND || r.top > vh + DEAD_BAND;
      var isIn = el.classList.contains('is-in');

      if (visible && !isIn) {
        if (!el.classList.contains('marquee')) {
          el.style.setProperty('--reveal-delay', Math.min(staggerIndex(el) * STAGGER, STAGGER_MAX) + 'ms');
        }
        el.classList.add('is-in');
      } else if (gone && isIn) {
        el.classList.remove('is-in');
      }
    });

    each(marquees, function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add('is-in');
      else if (r.bottom < -DEAD_BAND || r.top > vh + DEAD_BAND) el.classList.remove('is-in');
    });

    parallax();
    checkCounters();
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(sweep); } }

  /* remove-only sweep: hides what the viewport has left behind, both directions */
  function sweep() {
    ticking = false;
    vh = window.innerHeight || root.clientHeight;
    var hidden = 0;
    each(targets, function (el) {
      if (!el.classList.contains('is-in')) return;
      var r = el.getBoundingClientRect();
      /* only what has passed ABOVE the viewport hides again: scrolling down keeps
         what you have already read revealed, scrolling back up re-plays it */
      if (r.bottom < -DEAD_BAND) { el.classList.remove('is-in'); hidden++; }
    });
    each(marquees, function (el) {
      if (!el.classList.contains('is-in')) return;
      var r = el.getBoundingClientRect();
      if (r.bottom < -DEAD_BAND) el.classList.remove('is-in');
    });
    parallax();
    checkCounters();
  }

  /* add-only observer: the browser tells us the moment an element comes in */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.classList.contains('is-in')) return;
        if (!el.classList.contains('marquee')) {
          el.style.setProperty('--reveal-delay', Math.min(staggerIndex(el) * STAGGER, STAGGER_MAX) + 'ms');
        }
        el.classList.add('is-in');
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    each(targets, function (el) { io.observe(el); });
    each(marquees, function (el) { io.observe(el); });
  } else {
    each(targets, function (el) { el.classList.add('is-in'); });
    each(marquees, function (el) { el.classList.add('is-in'); });
  }

  function countUp(el) {
    var raw = el.getAttribute('data-count');
    var target = parseFloat(raw);
    if (isNaN(target)) return;
    var decimals = (raw.split('.')[1] || '').length;
    var duration = 900, start = null;
    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(frame);
  }

  var countersDone = [];
  function checkCounters() {
    each(counters, function (el, i) {
      if (countersDone[i]) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) { countersDone[i] = true; countUp(el); }
    });
  }

  var pItems = [];
  each(parallaxed, function (el) {
    pItems.push({ el: el, range: Math.min(parseFloat(el.getAttribute('data-parallax')) || 10, PARALLAX_MAX) });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  sweep();
})();
