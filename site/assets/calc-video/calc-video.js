/* Калькулятор-стройка на видео (прототип).
   Каждый этап — готовый кадр. Между соседними этапами проигрывается ролик (вперёд — прямой, назад — обратный).
   Если ролика ещё нет, кадры сменяются плавным наплывом. Цены — пример, их утверждает сметчик. */
(function(){
  "use strict";
  var DIR = "assets/calc-video/v1/";
  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* clip — ролик перехода с предыдущего этапа на этот; null — ролика пока нет, будет наплыв */
  var STEPS = [
    {id: "plot", name: "Участок", frame: "s01", clip: null,
     title: "Участок", lead: "Геодезия, вынос осей в натуру, подготовка площадки.",
     items: ["Топосъёмка и разбивка осей", "Планировка участка", "Временные дороги и ограждение"],
     price: 450000},
    {id: "found", name: "Фундамент", frame: "s02", clip: "t01",
     title: "Фундамент", lead: "Монолитная плита на подготовленном основании.",
     items: ["Песчано-щебёночная подушка", "Опалубка и арматурный каркас", "Бетонирование плиты, выпуски арматуры под стены"],
     price: 2400000},
    {id: "floor1", name: "Первый этаж", frame: "s03", clip: "t02",
     title: "Первый этаж", lead: "Монолитные стены и колонны, гараж, входная группа, перекрытие.",
     items: ["Стены и колонны в съёмной опалубке", "Лестница входной группы", "Монолитное перекрытие над первым этажом"],
     price: 5200000},
    {id: "floor2", name: "Второй этаж", frame: "s04", clip: "t03",
     title: "Второй этаж", lead: "Стены второго этажа, консоли и верхние плиты. Коробка дома закрыта.",
     items: ["Стены и колонны второго этажа", "Консольные плиты и балконы", "Верхние плиты под кровлю"],
     price: 4800000},
    {id: "finish", name: "Отделка", frame: null, clip: null,
     title: "Фасад и окна", lead: "Окна, остекление балконов, облицовка фасада.",
     choice: "finish",
     options: [
       {id: "graphite", name: "Графит", note: "Чёрный керамогранит, тёмное дерево, латунные световые линии", frame: "s05a", price: 6900000},
       {id: "light", name: "Светлая", note: "Тёплая штукатурка, травертин, светлый дуб", soon: true}
     ]},
    {id: "roof", name: "Кровля и участок", frame: null, clip: null,
     title: "Кровля и благоустройство", lead: "Плоская кровля, свет на фасаде, газон и мощение. Дом готов.",
     choice: "roof",
     options: [
       {id: "membrane", name: "Мембрана с гравием", note: "Графитовая ПВХ-мембрана, балласт из гравия, металлические парапеты", frame: "s06a1", price: 3100000},
       {id: "green", name: "Зелёная кровля", note: "Седум по гидроизоляции, гравийная кромка", soon: true}
     ]},
    {id: "terrace", name: "Терраса", frame: null, clip: null,
     title: "Терраса", lead: "Терраса вдоль боковой стены с навесом и подсветкой.",
     choice: "terrace",
     options: [
       {id: "none", name: "Без террасы", note: "Газон вдоль боковой стены", frame: "s06a1", price: 0},
       {id: "deck", name: "С террасой", note: "Термодерево, навес, кашпо, подсветка", soon: true}
     ]}
  ];
  var LAST = STEPS.length; /* шаг «Итог» */
  var pick = {finish: "graphite", roof: "membrane", terrace: "none"};

  var $ = function(id){ return document.getElementById(id); };
  var viewer = $("viewer"), A = $("frameA"), B = $("frameB"), video = $("clip"), bar = $("bar");
  var cur = 0, shown = 0, target = 0, busy = false, fast = false, dir = 1;

  function opt(s){ return s.options ? s.options.filter(function(o){ return o.id === pick[s.choice]; })[0] : null; }
  function frameOf(i){ var s = STEPS[Math.min(i, LAST - 1)]; return s.frame || opt(s).frame; }
  function priceOf(s){ return s.options ? opt(s).price : s.price; }
  function money(n){ return n.toLocaleString("ru-RU").replace(/,/g, " ") + " ₽"; }
  function src(name, ext){ return DIR + name + ext; }

  /* Ролики скачиваются целиком в память по одному (без конкуренции за соединения)
     и проигрываются из памяти — поэтому и вперёд, и назад стартуют без задержки. */
  var clips = {}, queue = [], loading = false, imgs = {};
  function fetchClip(c){
    if (!clips[c]) clips[c] = new Promise(function(ok, fail){ queue.unshift({c: c, ok: ok, fail: fail}); pump(); });
    return clips[c];
  }
  function pump(){
    if (loading || !queue.length) return;
    var job = queue.shift(); loading = true;
    fetch(src(job.c, ".mp4")).then(function(r){ if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function(b){ job.ok(URL.createObjectURL(b)); }, function(e){ delete clips[job.c]; job.fail(e); })
      .then(function(){ loading = false; pump(); });
  }
  /* что понадобится с этапа i: ролик вперёд (в i+1) и ролик назад (из i в i-1); ближний — первым */
  function warm(i){
    if (REDUCE || !window.fetch) return;
    var fwd = STEPS[i + 1] && STEPS[i + 1].clip, back = STEPS[i] && STEPS[i].clip && i > 0 ? STEPS[i].clip + "r" : null;
    [back, fwd].forEach(function(c){ if (c) fetchClip(c).catch(function(){}); });
    [i - 1, i + 1].forEach(function(k){
      if (k < 0 || k > LAST) return; var f = frameOf(k);
      if (!imgs[f]){ imgs[f] = new Image(); imgs[f].src = src(f, ".jpg"); }
    });
  }

  /* смена кадра: мгновенно (после ролика, кадр совпадает с последним кадром ролика) или наплывом */
  function setFrame(name, instant){
    return new Promise(function(done){
      var top = A.classList.contains("is-on") ? A : B, back = top === A ? B : A, url = src(name, ".jpg");
      if (top.getAttribute("src") === url){ done(); return; }
      var img = new Image();
      img.onload = img.onerror = function(){
        back.src = url;
        back.classList.toggle("is-instant", !!instant); top.classList.toggle("is-instant", !!instant);
        back.style.zIndex = 1; top.style.zIndex = 0;
        back.classList.add("is-on");
        var fin = function(){ top.classList.remove("is-on"); done(); };
        instant || REDUCE ? requestAnimationFrame(fin) : setTimeout(fin, 720);
      };
      img.src = url;
    });
  }

  function playClip(name, rate){
    viewer.classList.add("is-loading");
    var got = window.fetch ? fetchClip(name) : Promise.resolve(src(name, ".mp4"));
    /* медленная сеть: ждём ролик до 25 секунд, потом сдаёмся и меняем кадр наплывом */
    var late = new Promise(function(_, fail){ setTimeout(function(){ fail(new Error("timeout")); }, 25000); });
    return Promise.race([got, late]).then(function(url){
      return new Promise(function(done){
        var finished = false;
        function end(ok){
          if (finished) return; finished = true;
          video.onended = video.onerror = video.ontimeupdate = video.onplaying = null;
          done(ok);
        }
        video.onerror = function(){ end(false); };
        video.ontimeupdate = function(){ if (video.duration) bar.style.width = (100 * video.currentTime / video.duration) + "%"; };
        video.onended = function(){ end(true); };
        video.onplaying = function(){
          video.onplaying = null; viewer.classList.remove("is-loading");
          video.classList.add("is-on"); viewer.classList.add("is-playing");
        };
        video.src = url;
        video.defaultPlaybackRate = rate; video.playbackRate = rate;
        var p = video.play();
        if (p && p.catch) p.catch(function(){ end(false); });
      });
    }, function(){ return false; }).then(function(ok){ viewer.classList.remove("is-loading"); return ok; });
  }

  /* один шаг стройки: from → to (соседние) */
  function hop(from, to){
    var fwd = to > from, s = STEPS[Math.min(Math.max(from, to), LAST - 1)];
    var clip = s.clip && !REDUCE ? s.clip + (fwd ? "" : "r") : null;
    var next = frameOf(to);
    if (frameOf(from) === next) return Promise.resolve();
    if (fwd && to < LAST) $("stageBadge").textContent = "Строим · " + STEPS[to].name;
    if (!clip) return setFrame(next, false);
    return playClip(clip, fast ? 2.2 : 1).then(function(ok){
      /* ролик не проигрался (кодек, сеть) — просто наплыв на следующий кадр */
      return setFrame(next, ok);
    }).then(function(){
      video.classList.remove("is-on"); viewer.classList.remove("is-playing"); bar.style.width = "0";
    });
  }

  function run(){
    if (busy) return;
    if (shown === target){ fast = false; tourBtn.disabled = false; warm(Math.min(shown, LAST - 1)); return; }
    busy = true;
    var step = target > shown ? 1 : -1;
    if (Math.abs(target - shown) > 1) fast = true;
    hop(shown, shown + step).then(function(){
      shown += step; busy = false; badge(); run();
    });
  }

  function badge(){
    var i = Math.min(shown, LAST - 1);
    $("stageBadge").textContent = (shown >= LAST ? "Готово" : "Этап " + (i + 1) + " из " + LAST) + " · " + STEPS[i].name;
    var miss = [];
    if (!STEPS[4].clip) miss.push("отделка");
    if (!STEPS[5].clip) miss.push("кровля");
    $("frameNote").textContent = "Ролики пока есть для фундамента и двух этажей; " + miss.join(" и ") + " — сменой кадра.";
  }

  /* панель шагов */
  function renderSteps(){
    var html = STEPS.map(function(s, i){
      return '<li><button type="button" data-go="' + i + '"' + (i === cur ? ' aria-current="step"' : "") + "><span>" + (i + 1) + "</span>" + s.name + "</button></li>";
    }).join("") + '<li><button type="button" data-go="' + LAST + '"' + (cur === LAST ? ' aria-current="step"' : "") + "><span>✓</span>Итог</button></li>";
    $("steps").innerHTML = html;
  }

  function renderPanel(){
    var p = $("panel"), h;
    if (cur === LAST){
      var rows = STEPS.map(function(s){
        var o = opt(s);
        return "<div><span>" + s.title + (o ? "<small>" + o.name + "</small>" : "") + "</span><i>" + (priceOf(s) ? money(priceOf(s)) : "—") + "</i></div>";
      }).join("");
      h = '<div class="kc-panel-h"><span>Итог</span><h2>Ваш дом</h2><p>Состав и стоимость по этапам</p></div>' +
        '<div class="kc-bill"><div class="kc-bill-g">' + rows + "</div></div>" +
        '<div class="kc-bill-total"><span>Итого</span><b>' + money(total()) + "</b></div>" +
        '<p class="kc-assume"><b>Цены — пример.</b> Финальную смету считает сметчик после геологии участка и проекта.</p>' +
        '<div class="vc-cta"><a class="btn btn-honey" href="index.html#contact">Обсудить этот дом<svg><use href="#i-arrow"/></svg></a>' +
        '<a class="btn btn-line" href="tel:+79777144969">Позвонить: +7 977 714-49-69</a></div>';
    } else {
      var s = STEPS[cur];
      h = '<div class="kc-panel-h"><span>Этап ' + (cur + 1) + " из " + LAST + "</span><h2>" + s.title + "</h2><p>" + s.lead + "</p></div>";
      if (s.options){
        h += '<div class="cx-opts">' + s.options.map(function(o){
          var on = pick[s.choice] === o.id;
          return '<button type="button" class="cx-opt' + (on ? " is-on" : "") + '" data-opt="' + o.id + '"' + (o.soon ? " disabled" : "") + ' aria-pressed="' + on + '">' +
            "<b>" + o.name + "</b><small>" + o.note + "</small>" + (o.soon ? "<em>Скоро</em>" : "") + "</button>";
        }).join("") + "</div>";
      }
      if (s.items) h += '<ul class="vc-list">' + s.items.map(function(t){ return "<li>" + t + "</li>"; }).join("") + "</ul>";
      h += '<div class="vc-price"><span>Этап, пример</span><b>' + (priceOf(s) ? money(priceOf(s)) : "0 ₽") + "</b></div>";
    }
    p.className = "kc-panel " + (dir > 0 ? "is-fwd" : "is-back");
    p.innerHTML = h;
    $("prev").hidden = cur === 0;
    $("next").hidden = cur === LAST;
    $("sum").hidden = cur === LAST;
    $("total").textContent = money(total());
    var built = 0; for (var i = 0; i <= Math.min(cur, LAST - 1); i++) built += priceOf(STEPS[i]);
    $("done").textContent = cur === LAST ? "" : "из них до этапа «" + STEPS[cur].name + "» — " + money(built);
  }

  function total(){ return STEPS.reduce(function(a, s){ return a + priceOf(s); }, 0); }

  function go(i){
    i = Math.max(0, Math.min(LAST, i));
    dir = i >= cur ? 1 : -1; cur = i;
    renderSteps(); renderPanel();
    target = Math.min(cur, LAST);
    run();
  }

  $("steps").addEventListener("click", function(e){ var b = e.target.closest("[data-go]"); if (b) go(+b.dataset.go); });
  $("prev").addEventListener("click", function(){ go(cur - 1); });
  $("next").addEventListener("click", function(){ go(cur + 1); });
  $("panel").addEventListener("click", function(e){
    var b = e.target.closest("[data-opt]"); if (!b || b.disabled) return;
    pick[STEPS[cur].choice] = b.dataset.opt; renderPanel();
    if (!busy && shown === cur) setFrame(frameOf(cur), false);
  });
  var tourBtn = $("tour");
  tourBtn.addEventListener("click", function(){
    if (busy) return;
    tourBtn.disabled = true;
    /* сначала мгновенно на участок, потом стройка подряд */
    shown = 0; target = 0; cur = 0; renderSteps(); renderPanel(); badge();
    setFrame(frameOf(0), true).then(function(){ setTimeout(function(){ go(LAST); }, 300); });
  });

  renderSteps(); renderPanel(); badge(); warm(0);
})();
