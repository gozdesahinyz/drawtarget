/*
 * Adapted from Magic UI's NumberTicker component (copied verbatim from
 * https://raw.githubusercontent.com/magicuidesign/magicui/main/apps/www/registry/magicui/number-ticker.tsx),
 * ported to plain JS since this site has no React/Framer Motion. Same
 * idea: an element with data-ticker="<target>" counts up from 0 the
 * first time it scrolls into view, instead of showing a static number.
 * The original used a physical spring; this uses an easeOutExpo curve
 * to get a similar fast-then-settle feel without a spring library.
 */
(function () {
  "use strict";

  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function formatGBP(n) {
    return "£" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function animateTicker(el, target, duration) {
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / duration);
      el.textContent = formatGBP(target * easeOutExpo(t));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var tickers = document.querySelectorAll("[data-ticker]");
    if (!tickers.length) return;

    // Reduced motion, or no IntersectionObserver support: leave the
    // static value already in the markup alone.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var target = parseFloat(entry.target.getAttribute("data-ticker"));
          animateTicker(entry.target, target, 1400);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    tickers.forEach(function (el) { io.observe(el); });
  });
})();
