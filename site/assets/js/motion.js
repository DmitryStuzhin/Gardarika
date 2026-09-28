/* Анимации сайта: появление блоков при прокрутке, счётчики, лёгкий параллакс первого экрана.
   Всё отключается при «уменьшить движение» — тогда страница выглядит так же, но статично. */
(function(){
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  var root = document.documentElement;
  root.classList.add("motion");

  /* что появляется при прокрутке; соседи из одной группы идут с небольшой задержкой */
  var SEL = [
    ".sec-head > *", ".calc-teaser-grid > div > *", ".calc-teaser-stage",
    ".grid > .card", ".quiz-intro > *", ".quiz-grid > .quiz", ".pack", ".packs + .more",
    ".slot", ".built-card", ".review", ".route li", ".terms",
    ".faq-grid > h2", ".faq details", ".contact-copy > *", ".contact-grid form",
    ".p-head > *", ".p-figure", ".p-side > *", ".p-about > *", ".calc-banner", ".filters"
  ].join(",");
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add("is-in");
      io.unobserve(el);
      /* после появления элемент возвращается к своим обычным стилям (наведение и т. п.) */
      setTimeout(function(){ el.classList.remove("rv", "is-in"); el.style.removeProperty("--rv-d"); }, 1400);
    });
  }, {threshold: .12, rootMargin: "0px 0px -6% 0px"});

  function scan(){
    var groups = new Map();
    document.querySelectorAll(SEL).forEach(function(el){
      if (el.hasAttribute("data-rv")) return;
      el.setAttribute("data-rv", "");
      el.classList.add("rv");
      var p = el.parentNode, n = groups.get(p) || 0; groups.set(p, n + 1);
      el.style.setProperty("--rv-d", Math.min(n, 6) * 70 + "ms");
      io.observe(el);
    });
  }
  scan();
  /* карточки каталога и страница проекта перерисовываются — подхватываем новые элементы */
  var pending = null;
  new MutationObserver(function(){ if (!pending) pending = requestAnimationFrame(function(){ pending = null; scan(); countUp(); }); })
    .observe(document.getElementById("main") || document.body, {childList: true, subtree: true});

  /* переход между страницами проекта и каталогом: показываем появление заново */
  addEventListener("hashchange", function(){
    document.querySelectorAll("#project [data-rv], #catalogPage [data-rv]").forEach(function(el){ el.removeAttribute("data-rv"); el.classList.remove("rv", "is-in"); });
    scan();
  });

  /* счётчики в полосе цифр */
  function countUp(){
    document.querySelectorAll(".stats li:not(.todo) b:not([data-counted])").forEach(function(b){
      var target = parseFloat(String(b.textContent).replace(",", ".").replace(/\s/g, ""));
      if (!isFinite(target) || target <= 0) return;
      b.setAttribute("data-counted", "1");
      var label = b.textContent;
      var cio = new IntersectionObserver(function(es){
        if (!es[0].isIntersecting) return; cio.disconnect();
        var t0 = performance.now(), dur = 1100;
        (function tick(){
          var k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          b.textContent = k < 1 ? Math.round(target * e) : label;
          if (k < 1) requestAnimationFrame(tick);
        })();
      }, {threshold: .6});
      cio.observe(b);
    });
  }
  countUp();

  /* «Как строим»: пунктир маршрута прорисовывается, когда блок в кадре */
  var route = document.querySelector(".route");
  if (route) new IntersectionObserver(function(es, o){ if (es[0].isIntersecting){ route.classList.add("is-drawn"); o.disconnect(); } }, {threshold: .4}).observe(route);

  /* штамп первого экрана: при смене дома значения мягко обновляются */
  var stamp = document.getElementById("heroStamp");
  if (stamp) new MutationObserver(function(){
    stamp.classList.remove("is-swap"); void stamp.offsetWidth; stamp.classList.add("is-swap");
  }).observe(stamp, {childList: true});

  /* лёгкий параллакс фото на первом экране */
  var slides = document.querySelector(".hero-slides"), ticking = false;
  if (slides){
    addEventListener("scroll", function(){
      if (ticking) return; ticking = true;
      requestAnimationFrame(function(){
        ticking = false;
        var y = Math.min(scrollY, innerHeight);
        slides.style.transform = "translate3d(0," + (y * .18).toFixed(1) + "px,0)";
      });
    }, {passive: true});
  }
})();
