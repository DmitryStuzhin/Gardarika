/* Калькулятор · смета в PDF. jsPDF и шрифт грузятся только по нажатию кнопки.
   Шрифт — подмножество Golos Text: в нём нет знака рубля, поэтому в документе пишем «руб.». */
(function(root){
  "use strict";
  var GC = root.GC = root.GC || {};
  var LIBS = ["assets/vendor/jspdf.umd.min.js", "assets/vendor/pdf-fonts.js"];

  function load(src){
    return new Promise(function(ok, fail){
      var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function(){ fail(new Error("не загрузился " + src)); };
      document.head.appendChild(s);
    });
  }
  function ready(){
    if (root.jspdf && root.PDF_FONTS) return Promise.resolve();
    return LIBS.reduce(function(p, src){ return p.then(function(){ return load(src); }); }, Promise.resolve());
  }
  function clean(s){ return String(s).replace(/ /g, " ").replace(/\s?₽/g, " руб."); }
  function money(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " руб."; }
  function num(n){ return (Math.round(n * 10) / 10).toString().replace(".", ","); }

  var PINE = [31, 61, 49], INK = [24, 37, 31], ASH = [110, 120, 114], HONEY = [176, 132, 46], LINE = [214, 219, 211];

  GC.pdf = function(o){
    return ready().then(function(){
      var d = new root.jspdf.jsPDF({unit: "mm", format: "a4", compress: true});
      d.addFileToVFS("Golos-400.ttf", root.PDF_FONTS["400"]); d.addFont("Golos-400.ttf", "Golos", "normal");
      d.addFileToVFS("Golos-700.ttf", root.PDF_FONTS["700"]); d.addFont("Golos-700.ttf", "Golos", "bold");
      var M = 16, W = 210 - 2 * M, y = M, BOTTOM = 297 - 18;

      function font(size, bold, col){ d.setFont("Golos", bold ? "bold" : "normal"); d.setFontSize(size); var c = col || INK; d.setTextColor(c[0], c[1], c[2]); }
      function need(h){ if (y + h > BOTTOM){ d.addPage(); y = M; } }
      function text(s, size, bold, col, opt){
        opt = opt || {}; font(size, bold, col);
        var lines = d.splitTextToSize(clean(s), opt.w || W), lh = size * .3528 * 1.35;
        need(lines.length * lh);
        lines.forEach(function(l, i){ d.text(l, M + (opt.dx || 0), y + size * .3528 * .85 + i * lh); });
        y += lines.length * lh + (opt.gap || 0);
      }
      function rule(col, w){ d.setDrawColor(col[0], col[1], col[2]); d.setLineWidth(w || .2); d.line(M, y, M + W, y); }
      function pairs(title, rows){
        need(14); y += 4; text(title.toUpperCase(), 7.5, true, HONEY, {gap: 2});
        rows.forEach(function(r){
          font(9.5, false, ASH); var lab = d.splitTextToSize(clean(r[0]), 48);
          font(9.5, false, INK); var val = d.splitTextToSize(clean(r[1]), W - 52), h = Math.max(lab.length, val.length) * 4.5 + 1.5;
          need(h);
          font(9.5, false, ASH); lab.forEach(function(l, i){ d.text(l, M, y + 3.4 + i * 4.5); });
          font(9.5, false, INK); val.forEach(function(l, i){ d.text(l, M + 52, y + 3.4 + i * 4.5); });
          y += h;
        });
      }

      /* шапка */
      d.setFillColor(PINE[0], PINE[1], PINE[2]); d.rect(0, 0, 210, 26, "F");
      font(15, true, [255, 255, 255]); d.text("ГАРДАРИКА", M, 15.5);
      font(9, false, [214, 226, 218]); d.text("Предварительная смета · " + new Date().toLocaleDateString("ru-RU"), M + W, 15.5, {align: "right"});
      y = 36;
      text(o.title, 20, true, PINE, {gap: 1.5});
      text((o.mix.length > 1 ? "Собрано из: " + o.mix.join(" + ") : "Как в проекте " + o.mix[0]) + " · " + num(o.area) + " кв. м по внешнему контуру", 10, false, ASH, {gap: 5});

      if (o.shot){
        var iw = W, ih = iw * o.shot.h / o.shot.w;
        if (ih > 96){ ih = 96; iw = ih * o.shot.w / o.shot.h; }
        need(ih + 4);
        d.addImage(o.shot.url, "JPEG", M + (W - iw) / 2, y, iw, ih, undefined, "FAST");
        y += ih + 2;
        text("3D-модель собранного дома. Иллюстрация к расчёту, не рабочий проект.", 7.5, false, ASH, {gap: 2});
      }

      pairs("Состав дома", o.composition);
      pairs("Конструктив и отделка", o.spec);

      /* таблица сметы */
      need(40); y += 6; text("СМЕТА ПО ЭТАПАМ", 7.5, true, HONEY, {gap: 2});
      font(8, true, ASH); d.text("Позиция", M, y + 3); d.text("Объём", M + W - 42, y + 3, {align: "right"}); d.text("Сумма", M + W, y + 3, {align: "right"});
      y += 5; rule(INK, .35); y += 1;
      var last = null;
      o.lines.forEach(function(l){
        font(9.5, false, INK);
        var lab = d.splitTextToSize(clean(l.label), W - 80), h = lab.length * 4.5 + 2.2 + (l.stage !== last ? 5 : 0);
        need(h);
        if (l.stage !== last){ font(8.5, true, PINE); d.text(clean(l.stage), M, y + 3.6); y += 5; last = l.stage; }
        font(9.5, false, INK); lab.forEach(function(t, i){ d.text(t, M + 3, y + 3.4 + i * 4.5); });
        font(9, false, ASH); if (l.unit) d.text(num(l.qty) + " " + clean(l.unit).replace("м²", "кв. м"), M + W - 42, y + 3.4, {align: "right"});
        font(9.5, false, INK); d.text(money(l.sum), M + W, y + 3.4, {align: "right"});
        y += lab.length * 4.5 + 2.2;
      });
      need(14); y += 1; rule(INK, .35); y += 2;
      font(12, true, PINE); d.text("Итого", M, y + 5); d.text(money(o.total), M + W, y + 5, {align: "right"}); y += 10;

      if (o.assumptions.length){ y += 2; text("Допущения, которые проверит инженер: " + o.assumptions.join("; ") + ".", 8.5, false, ASH, {gap: 2}); }
      text("Ставки демонстрационные: количества взяты из 3D-модели, цены за единицу утверждает сметчик. Точная смета фиксируется в договоре после геологии участка и проекта.", 8.5, false, ASH, {gap: 5});
      need(16); rule(LINE); y += 5;
      text("Обсудить этот дом: +7 977 714-49-69 · Москва и Московская область", 10, true, PINE);

      /* номера страниц */
      var n = d.getNumberOfPages();
      for (var i = 1; i <= n; i++){ d.setPage(i); font(7.5, false, ASH); d.text("Гардарика · смета дома · стр. " + i + " из " + n, M, 297 - 9); }
      d.save("gardarika-smeta.pdf");
    });
  };
})(window);
