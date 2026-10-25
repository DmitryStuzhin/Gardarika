/* Админка каталога Vozdvizhen.
   Каталог целиком редактируется в браузере и одной кнопкой «Сохранить на сайт» уходит на сервер
   (deploy/lead_server.py → /var/lib/gardarika/catalog.json). Фото загружаются сразу при выборе,
   перед загрузкой уменьшаются в браузере. Пока каталог ни разу не сохранён, за основу берётся data.js. */
(function(){
  "use strict";
  var API = "/api/admin/";
  var $ = function(id){ return document.getElementById(id); };
  var S = {houses: [], rev: 0, saved: null, dirty: false, fromFiles: false, uid: 0};
  var DRAFT = "vz-admin-draft";

  /* ---------- служебное ---------- */
  /* пути из data.js относительные (assets/…) — на странице /admin/ превращаем их в абсолютные */
  function url(u){ u = String(u || ""); return !u || /^(\/|https?:|blob:|data:)/.test(u) ? u : "/" + u; }
  function icon(id){ return '<svg aria-hidden="true"><use href="#a-' + id + '"/></svg>'; }
  var filterMode = "all", query = "";
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function api(path, opt){
    opt = opt || {};
    var h = {"X-Admin": "1"};
    if (opt.json !== undefined){ h["Content-Type"] = "application/json"; opt.body = JSON.stringify(opt.json); }
    if (opt.type) h["Content-Type"] = opt.type;
    if (opt.headers) Object.keys(opt.headers).forEach(function(k){ h[k] = opt.headers[k]; });
    return fetch(API + path, {method: opt.method || (opt.body ? "POST" : "GET"), headers: h, body: opt.body, credentials: "same-origin"})
      .then(function(r){
        return r.json().catch(function(){ return {}; }).then(function(d){ d.status = r.status; return d; });
      }, function(){ return {ok: false, status: 0, error: "Нет связи с сервером"}; });
  }
  var toastT;
  function toast(text, bad){
    var t = $("toast"); t.textContent = text; t.className = "adm-toast" + (bad ? " is-bad" : ""); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function(){ t.hidden = true; }, bad ? 6000 : 3000);
  }
  function dialog(title, body, buttons){
    var d = $("dialog");
    $("dlgTitle").textContent = title;
    $("dlgBody").innerHTML = body;
    $("dlgAct").innerHTML = buttons.map(function(b, i){ return '<button class="btn btn-sm ' + (b.cls || "btn-line") + '" value="' + i + '">' + esc(b.text) + "</button>"; }).join("");
    return new Promise(function(done){
      d.onclose = function(){ var i = +d.returnValue; done(isNaN(i) ? -1 : i); d.returnValue = ""; };
      d.showModal();
    });
  }
  var TR = {"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"e","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","ш":"sh","щ":"sch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya"};
  function slugify(s){
    return String(s).toLowerCase().split("").map(function(c){ return TR[c] !== undefined ? TR[c] : c; }).join("")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "dom";
  }
  function uniqueSlug(base, self){
    var s = base, n = 2;
    while (S.houses.some(function(h){ return h !== self && h.slug === s; })) s = base + "-" + n++;
    return s;
  }
  function floorsLabel(f){ return f == 1 ? "1 этаж" : f == 2 ? "2 этажа" : f == 3 ? "3 этажа" : "с мансардой"; }

  /* дом в рабочем виде: у галереи всегда {src, caption}, у каждого дома — внутренний _id */
  function norm(h){
    var o = JSON.parse(JSON.stringify(h));
    o._id = ++S.uid;
    o.gallery = (o.gallery || []).map(function(g){ return typeof g === "string" ? {src: g, caption: ""} : {src: g.src, caption: g.caption || ""}; });
    o.about = o.about || []; o.features = o.features || [];
    ["name", "slug", "area", "type", "rooms", "extra", "price", "lede", "story", "tagline", "forWho", "image"].forEach(function(k){ o[k] = o[k] == null ? "" : String(o[k]); });
    o.floors = +o.floors || 1;
    return o;
  }
  function plain(h){
    var o = {};
    Object.keys(h).forEach(function(k){ if (k[0] !== "_") o[k] = h[k]; });
    return o;
  }
  function byId(id){ return S.houses.filter(function(h){ return h._id === +id; })[0]; }

  /* ---------- состояние «сохранено / есть изменения» ---------- */
  function setDirty(on){
    S.dirty = on;
    var st = $("status");
    if (on){ st.textContent = "Есть несохранённые изменения"; st.className = "adm-status is-dirty"; }
    else if (S.fromFiles){ st.textContent = "Ещё не сохранялся в админке"; st.className = "adm-status is-info"; }
    else { st.textContent = S.saved ? "Сохранено " + fmtSaved(S.saved) : ""; st.className = "adm-status is-ok"; }
    $("save").disabled = !on && !S.fromFiles;
    $("save").classList.toggle("has-changes", on);
    $("save").title = st.textContent;
    try {
      if (on) localStorage.setItem(DRAFT, JSON.stringify({rev: S.rev, houses: S.houses.map(plain), at: Date.now()}));
      else localStorage.removeItem(DRAFT);
    } catch (e){ /* приватный режим — черновик не держим */ }
  }
  function fmtSaved(t){
    var d = new Date(String(t).replace(" ", "T")); if (isNaN(d)) return t;
    var today = new Date().toDateString() === d.toDateString();
    return (today ? "сегодня в " : d.toLocaleDateString("ru-RU", {day: "numeric", month: "long"}) + " в ") + d.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"});
  }
  function touch(){ setDirty(true); if (cur) renderPreview(); }
  window.addEventListener("beforeunload", function(e){ if (S.dirty){ e.preventDefault(); e.returnValue = ""; } });

  /* ---------- вход ---------- */
  function showLogin(msg){
    $("login").hidden = false; $("list").hidden = true; $("editor").hidden = true; $("topAct").hidden = true;
    $("status").textContent = "";
    if (msg){ $("loginErr").textContent = msg; $("loginErr").hidden = false; }
    $("password").focus();
  }
  $("loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    var btn = e.target.querySelector("button"); btn.disabled = true;
    api("login", {json: {password: $("password").value}}).then(function(d){
      btn.disabled = false;
      if (!d.ok){ $("loginErr").textContent = d.error || "Не получилось войти"; $("loginErr").hidden = false; return; }
      $("password").value = ""; $("loginErr").hidden = true;
      start();
    });
  });
  $("logout").addEventListener("click", function(){
    closeMenu();
    if (S.dirty && !confirm("Есть несохранённые изменения. Всё равно выйти?")) return;
    api("logout", {method: "POST"}).then(function(){ S.dirty = false; location.hash = "#/"; showLogin(); });
  });

  function start(){
    api("catalog").then(function(d){
      if (d.status === 401) return showLogin();
      if (!d.ok) return showLogin(d.status === 0 ? "Нет связи с сервером" : "Админка на сервере пока не включена");
      S.rev = d.rev || 0; S.saved = d.saved;
      S.fromFiles = !d.houses;
      S.houses = (d.houses || window.HOUSES || []).map(norm);
      $("login").hidden = true; $("topAct").hidden = false;
      setDirty(false);
      offerDraft();
      route();
    });
  }
  function offerDraft(){
    var dr;
    try { dr = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (e){ dr = null; }
    if (!dr || !dr.houses) return;
    var when = new Date(dr.at).toLocaleString("ru-RU");
    dialog("Есть несохранённый черновик", "<p>В этом браузере остались правки от " + esc(when) + ", которые не были сохранены на сайт.</p>" +
      (dr.rev !== S.rev ? "<p>С тех пор каталог на сайте уже меняли — проверьте черновик перед сохранением.</p>" : ""),
      [{text: "Восстановить черновик", cls: "btn-honey"}, {text: "Удалить черновик"}]).then(function(i){
      if (i === 0){ S.houses = dr.houses.map(norm); setDirty(true); route(); }
      else if (i === 1){ try { localStorage.removeItem(DRAFT); } catch (e){} }
    });
  }

  /* ---------- сохранение ---------- */
  function validate(){
    var seen = {};
    for (var i = 0; i < S.houses.length; i++){
      var h = S.houses[i];
      if (!h.name.trim()) return {h: h, msg: "У дома №" + (i + 1) + " нет названия"};
      if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(h.slug)) return {h: h, msg: "«" + h.name + "»: адрес страницы — только латиница, цифры и дефис"};
      if (seen[h.slug]) return {h: h, msg: "«" + h.name + "» и «" + seen[h.slug] + "» с одинаковым адресом страницы"};
      seen[h.slug] = h.name;
      if (!h.image) return {h: h, msg: "«" + h.name + "»: нет обложки"};
    }
    return null;
  }
  function save(force){
    var bad = validate();
    if (bad){ toast(bad.msg, true); location.hash = "#/house/" + bad.h._id; return; }
    var btn = $("save"); btn.disabled = true; btn.classList.add("is-busy"); btn.lastChild.textContent = "Сохраняю…";
    api("catalog", {json: {rev: S.rev, force: !!force, houses: S.houses.map(plain)}}).then(function(d){
      btn.classList.remove("is-busy"); btn.lastChild.textContent = "Сохранить на сайт";
      if (d.ok){
        S.rev = d.rev; S.saved = d.saved; S.fromFiles = false;
        S.houses.forEach(function(h){ delete h._new; });
        setDirty(false); toast("Сохранено. Изменения уже на сайте."); route();
        return;
      }
      btn.disabled = false;
      if (d.status === 401) return showLogin("Сессия закончилась — войдите снова. Правки сохранены в черновике.");
      if (d.status === 409){
        dialog("Каталог успели изменить", "<p>Пока вы редактировали, каталог сохранили с другого устройства или из другой вкладки.</p><p>Можно записать ваш вариант поверх или загрузить свежий (ваши правки пропадут).</p>",
          [{text: "Записать мой вариант", cls: "btn-honey"}, {text: "Загрузить свежий"}, {text: "Отмена"}]).then(function(i){
          if (i === 0) save(true);
          else if (i === 1){ S.dirty = false; start(); }
        });
        return;
      }
      toast(d.error || "Не удалось сохранить", true);
    });
  }
  $("save").addEventListener("click", function(){ save(false); });

  /* ---------- меню и история ---------- */
  function closeMenu(){ $("menu").hidden = true; $("menuBtn").setAttribute("aria-expanded", "false"); }
  $("menuBtn").addEventListener("click", function(e){
    e.stopPropagation();
    var open = $("menu").hidden; $("menu").hidden = !open; $("menuBtn").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", function(e){ if (!$("menu").contains(e.target)) closeMenu(); });
  $("historyBtn").addEventListener("click", function(){
    closeMenu();
    api("history").then(function(d){
      var items = d.items || [];
      if (!items.length) return dialog("История версий", "<p>Сохранённых версий пока нет.</p>", [{text: "Закрыть"}]);
      var body = '<p>Каждое сохранение запоминается. Можно вернуть любую из последних версий — текущая тоже останется в истории.</p><ul class="adm-hist">' +
        items.map(function(it, i){ return "<li><span><b>" + esc(fmtSaved(it.saved)) + "</b><small>" + it.count + " домов · версия " + it.rev + (i === 0 ? " · текущая" : "") + '</small></span>' +
          (i === 0 ? "" : '<button type="button" class="btn btn-line btn-sm" data-restore="' + esc(it.name) + '">Вернуть</button>') + "</li>"; }).join("") + "</ul>";
      dialog("История версий", body, [{text: "Закрыть"}]);
    });
  });
  $("dlgBody").addEventListener("click", function(e){
    var b = e.target.closest("[data-restore]"); if (!b) return;
    if (S.dirty && !confirm("Несохранённые правки пропадут. Вернуть старую версию?")) return;
    api("restore", {json: {name: b.getAttribute("data-restore")}}).then(function(d){
      $("dialog").close();
      if (!d.ok) return toast(d.error || "Не удалось вернуть версию", true);
      S.rev = d.rev; S.saved = d.saved; S.fromFiles = false; S.houses = d.houses.map(norm);
      setDirty(false); toast("Версия возвращена и уже на сайте"); location.hash = "#/"; route();
    });
  });

  /* ---------- фото: уменьшаем в браузере и загружаем ---------- */
  function shrink(file, max, webpOnly){
    return new Promise(function(ok, fail){
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function(){
        var k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function(b){
          if (b && b.type === "image/webp") return ok(b);
          if (webpOnly) return ok(null);
          c.toBlob(function(j){ j ? ok(j) : fail(new Error("не удалось обработать фото")); }, "image/jpeg", .88);
        }, "image/webp", .86);
      };
      img.onerror = function(){ URL.revokeObjectURL(url); fail(new Error("файл не похож на фото")); };
      img.src = url;
    });
  }
  function upload(file, max){
    if (!/^image\//.test(file.type)) return Promise.reject(new Error("«" + file.name + "» — не картинка"));
    return shrink(file, max).then(function(blob){
      return api("upload", {body: blob, type: blob.type});
    }).then(function(d){
      if (d.status === 401) throw new Error("Сессия закончилась — войдите снова");
      if (!d.ok) throw new Error(d.error || "Не удалось загрузить фото");
      /* лёгкая версия 900 px для карточек каталога; не получилось — сайт возьмёт полное фото */
      return shrink(file, 900, true).then(function(sm){
        if (!sm) return d.url;
        return api("upload", {body: sm, type: sm.type, headers: {"X-Variant-Of": d.url.split("/").pop()}}).then(function(){ return d.url; });
      }, function(){ return d.url; });
    });
  }
  var pickCb = null;
  function pick(multiple, cb){
    var f = $("filePick"); f.multiple = !!multiple; f.value = ""; pickCb = cb; f.click();
  }
  $("filePick").addEventListener("change", function(){ var files = Array.prototype.slice.call(this.files); if (pickCb && files.length) pickCb(files); });
  function dropZone(el, cb){
    ["dragenter", "dragover"].forEach(function(t){ el.addEventListener(t, function(e){ e.preventDefault(); el.classList.add("is-drop"); }); });
    ["dragleave", "drop"].forEach(function(t){ el.addEventListener(t, function(e){ e.preventDefault(); el.classList.remove("is-drop"); }); });
    el.addEventListener("drop", function(e){
      var files = Array.prototype.slice.call(e.dataTransfer.files || []).filter(function(f){ return /^image\//.test(f.type); });
      if (files.length) cb(files);
    });
  }

  /* ---------- список домов ---------- */
  function metaLine(h){
    return [h.area ? h.area + " м²" : "", floorsLabel(h.floors), h.price ? "от " + h.price + " млн ₽" : "цена по запросу"].filter(Boolean).join(" · ");
  }
  function renderList(){
    var vis = S.houses.filter(function(h){ return !h.hidden; }).length, hid = S.houses.length - vis;
    var html = '<div class="adm-head"><div><h1>Дома</h1><p>' + S.houses.length + " в каталоге · на сайте " + vis + "</p></div>" +
      '<button type="button" class="btn btn-honey adm-add" id="addHouse">' + icon("plus") + "Добавить дом</button></div>";
    if (S.fromFiles) html += '<p class="adm-note">Сейчас показан каталог из файлов сайта. С первого «Сохранить на сайт» сайт будет брать дома отсюда.</p>';
    html += '<div class="adm-tools"><label class="adm-search">' + icon("search") + '<input type="search" id="q" placeholder="Найти дом" value="' + esc(query) + '" aria-label="Найти дом"></label>' +
      '<div class="adm-seg" role="group" aria-label="Показать">' +
        [["all", "Все", S.houses.length], ["live", "На сайте", vis], ["hidden", "Скрытые", hid]].map(function(f){
          return '<button type="button" data-filter="' + f[0] + '" aria-pressed="' + (filterMode === f[0]) + '">' + f[1] + "<i>" + f[2] + "</i></button>";
        }).join("") + "</div></div>";
    html += '<ol class="adm-houses" id="houses"></ol><p class="adm-empty-list" id="noHouses" hidden>Ничего не нашлось.</p>';
    $("list").innerHTML = html;
    $("addHouse").addEventListener("click", addHouse);
    $("q").addEventListener("input", function(){ query = this.value; renderRows(); });
    renderRows();
  }
  function renderRows(){
    var q = query.trim().toLowerCase(), sorting = !q && filterMode === "all";
    var rows = S.houses.map(function(h, i){ return {h: h, i: i}; }).filter(function(r){
      var h = r.h;
      if (filterMode === "live" && h.hidden) return false;
      if (filterMode === "hidden" && !h.hidden) return false;
      return !q || (h.name + " " + h.area + " " + h.type).toLowerCase().indexOf(q) >= 0;
    });
    $("houses").innerHTML = rows.map(function(r){
      var h = r.h, i = r.i;
      var tags = (h.hidden ? '<em class="t-hid">Скрыт</em>' : "") + (h.popular ? '<em class="t-pop">Популярный</em>' : "") + (h.example ? '<em class="t-new">Новый</em>' : "") + (h._new ? '<em class="t-unsaved">Не сохранён</em>' : "");
      return '<li class="adm-house' + (h.hidden ? " is-hidden" : "") + '">' +
        '<a class="adm-house-main" href="#/house/' + h._id + '">' +
          '<span class="adm-thumb">' + (h.image ? '<img src="' + esc(url(h.image)) + '" alt="" loading="lazy">' : icon("image")) + "</span>" +
          '<span class="adm-house-txt"><b>' + esc(h.name || "Без названия") + "</b><small>" + esc(metaLine(h)) + "</small>" + (tags ? '<span class="adm-tags">' + tags + "</span>" : "") + "</span>" +
          '<span class="adm-chev">' + icon("chev") + "</span></a>" +
        '<div class="adm-house-act">' +
          (sorting ? '<button type="button" class="adm-ib" data-move="-1" data-id="' + h._id + '" aria-label="Поднять «' + esc(h.name) + '» выше" title="Выше"' + (i === 0 ? " disabled" : "") + ">" + icon("up") + "</button>" +
            '<button type="button" class="adm-ib" data-move="1" data-id="' + h._id + '" aria-label="Опустить «' + esc(h.name) + '» ниже" title="Ниже"' + (i === S.houses.length - 1 ? " disabled" : "") + ">" + icon("down") + "</button>" : "") +
          '<button type="button" class="adm-ib' + (h.hidden ? " is-off" : "") + '" data-hide="' + h._id + '" title="' + (h.hidden ? "Показать на сайте" : "Скрыть с сайта") + '" aria-label="' + (h.hidden ? "Показать на сайте" : "Скрыть с сайта") + " «" + esc(h.name) + '»">' + icon(h.hidden ? "eye-off" : "eye") + "</button>" +
        "</div></li>";
    }).join("");
    $("noHouses").hidden = rows.length > 0;
  }
  $("list").addEventListener("click", function(e){
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-filter")){ filterMode = b.getAttribute("data-filter"); renderList(); return; }
    if (b.hasAttribute("data-move")){
      var h = byId(b.getAttribute("data-id")), i = S.houses.indexOf(h), j = i + +b.getAttribute("data-move");
      if (j < 0 || j >= S.houses.length) return;
      S.houses.splice(i, 1); S.houses.splice(j, 0, h); touch(); renderRows();
      var again = $("houses").querySelector('[data-id="' + h._id + '"][data-move="' + b.getAttribute("data-move") + '"]');
      (again && !again.disabled ? again : $("houses").querySelector('[data-id="' + h._id + '"]')).focus();
    } else if (b.hasAttribute("data-hide")){
      var x = byId(b.getAttribute("data-hide")); x.hidden = !x.hidden; touch(); renderList();
      toast(x.hidden ? "«" + x.name + "» будет скрыт с сайта после сохранения" : "«" + x.name + "» снова появится на сайте после сохранения");
    }
  });
  function addHouse(){
    var h = norm({name: "Новый дом", floors: 1, prov: "viz", gallery: []});
    h.slug = uniqueSlug("novyy-dom", h); h._new = true; h._slugAuto = true;
    S.houses.unshift(h); touch(); filterMode = "all"; query = "";
    location.hash = "#/house/" + h._id;
  }

  /* ---------- карточка дома ---------- */
  var FLOORS = [[1, "1 этаж"], [1.5, "С мансардой"], [2, "2 этажа"], [3, "3 этажа"]];
  function field(k, label, opt){
    opt = opt || {};
    var id = "f-" + k, v = opt.value !== undefined ? opt.value : cur[k];
    var input = opt.area
      ? '<textarea id="' + id + '" data-k="' + k + '" rows="' + (opt.rows || 4) + '"' + (opt.max ? ' maxlength="' + opt.max + '"' : "") + (opt.ph ? ' placeholder="' + esc(opt.ph) + '"' : "") + ">" + esc(v) + "</textarea>"
      : '<input id="' + id + '" data-k="' + k + '" value="' + esc(v) + '"' + (opt.mode ? ' inputmode="' + opt.mode + '"' : "") + (opt.max ? ' maxlength="' + opt.max + '"' : "") + (opt.ph ? ' placeholder="' + esc(opt.ph) + '"' : "") + ' autocomplete="off">';
    return '<label class="adm-field' + (opt.wide ? " is-wide" : "") + '" for="' + id + '"><span>' + label + "</span>" + input + (opt.hint ? "<small>" + opt.hint + "</small>" : "") + "</label>";
  }
  function toggle(k, label, hint){
    return '<label class="adm-toggle"><input type="checkbox" role="switch" data-k="' + k + '"' + (cur[k] ? " checked" : "") + '><i aria-hidden="true"></i><span><b>' + label + "</b><small>" + hint + "</small></span></label>";
  }
  var cur = null;
  function renderEditor(h){
    cur = h;
    var e = $("editor");
    e.innerHTML =
      '<nav class="adm-crumbs" aria-label="Путь"><a href="#/">Дома</a>' + icon("chev") + '<span id="crumb">' + esc(h.name || "Без названия") + "</span></nav>" +
      '<h1 class="adm-ed-title" id="edTitle">' + esc(h.name || "Без названия") + "</h1>" +
      '<div class="adm-ed">' +
      '<div class="adm-ed-main">' +

        '<section class="adm-sec" id="s-cover" aria-labelledby="h-cover"><header><h2 id="h-cover">Обложка</h2><p>Главное фото в каталоге и на странице дома. Можно перетащить файл прямо на фото.</p></header>' +
          '<div class="adm-cover" id="cover"></div>' +
          '<div class="adm-seg adm-seg-sm" role="radiogroup" aria-label="Что на обложке">' +
            '<label><input type="radio" name="prov" value="viz"' + (h.prov !== "ref" ? " checked" : "") + "><span>Визуализация</span></label>" +
            '<label><input type="radio" name="prov" value="ref"' + (h.prov === "ref" ? " checked" : "") + "><span>Референс из материалов</span></label></div></section>" +

        '<section class="adm-sec" id="s-main" aria-labelledby="h-main"><header><h2 id="h-main">Основное</h2></header><div class="adm-grid">' +
          field("name", "Название", {max: 80}) +
          field("slug", "Адрес страницы", {max: 60, hint: "vozdvizhen.ru/#/p/<b id='slugShow'>" + esc(h.slug) + "</b>" + (h._new ? "" : "<br>Если поменять, старые ссылки на дом перестанут работать")}) +
          field("tagline", "Подзаголовок в карточке", {max: 300, wide: true, ph: "Одна фраза о доме"}) +
          field("type", "Тип дома", {max: 160, ph: "Одноэтажный дом с террасой"}) +
          '<label class="adm-field" for="f-floors"><span>Этажность</span><select id="f-floors" data-k="floors">' +
            FLOORS.map(function(f){ return '<option value="' + f[0] + '"' + (+h.floors === f[0] ? " selected" : "") + ">" + f[1] + "</option>"; }).join("") + "</select></label>" +
          field("area", "Площадь, м²", {max: 20, mode: "decimal", ph: "120,5"}) +
          field("price", "Цена от, млн ₽", {max: 20, mode: "decimal", ph: "9,8", hint: "Пусто — на сайте «Цена по запросу»"}) +
          '<div class="adm-field"><span>Габариты в плане, мм</span><div class="adm-dims"><input data-dim="0" inputmode="numeric" placeholder="Ширина" aria-label="Ширина, мм" value="' + (h.dims ? h.dims[0] : "") + '"><i aria-hidden="true">×</i><input data-dim="1" inputmode="numeric" placeholder="Глубина" aria-label="Глубина, мм" value="' + (h.dims ? h.dims[1] : "") + '"></div><small>Можно оставить пустым</small></div>' +
          field("rooms", "Состав", {max: 80, ph: "4 спальни"}) +
          field("extra", "Дополнительно", {max: 80, ph: "терраса 22 м²", wide: true}) +
        "</div></section>" +

        '<section class="adm-sec" id="s-text" aria-labelledby="h-text"><header><h2 id="h-text">Описание</h2><p>Тексты страницы дома. Пустые блоки на сайте не показываются.</p></header><div class="adm-grid">' +
          field("lede", "Вводный абзац", {area: true, rows: 3, max: 1000, wide: true}) +
          field("story", "Подробнее", {area: true, rows: 4, max: 4000, wide: true}) +
          field("about", "О доме", {area: true, rows: 6, wide: true, value: h.about.join("\n\n"), hint: "Абзацы разделяйте пустой строкой"}) +
          field("forWho", "Кому подойдёт", {area: true, rows: 2, max: 1000, wide: true}) +
          field("features", "Особенности", {area: true, rows: 5, wide: true, value: h.features.join("\n"), hint: "По одной на строку — на сайте станут списком с галочками"}) +
        "</div></section>" +

        '<section class="adm-sec" id="s-gal" aria-labelledby="h-gal"><header><h2 id="h-gal">Фото в описании</h2><p>Планировки, виды, интерьеры — под описанием на странице дома. Перетащите сюда несколько файлов сразу. Подпись необязательна.</p></header>' +
          '<div class="adm-gal" id="gal"></div></section>' +
      "</div>" +

      '<aside class="adm-ed-side"><div class="adm-side-in">' +
        '<p class="adm-side-h">Так дом выглядит в каталоге</p><div class="adm-preview" id="preview"></div>' +
        '<div class="adm-toggles">' +
          toggle("hidden", "Скрыть с сайта", "Дом останется в админке") +
          toggle("popular", "В популярных", "Блок на главной, до 8 домов") +
          toggle("example", "Новый проект", "Метка; цена — как пример") +
        "</div>" +
        '<div class="adm-side-act">' +
          (h._new ? "" : '<a class="adm-link" href="/index.html#/p/' + esc(h.slug) + '" target="_blank" rel="noopener">' + icon("ext") + "Открыть на сайте</a>") +
          '<button type="button" class="adm-link is-danger" id="delHouse">' + icon("trash") + "Удалить дом</button>" +
        "</div>" +
        '<nav class="adm-toc" aria-label="Разделы карточки"><a href="#s-cover" data-toc>Обложка</a><a href="#s-main" data-toc>Основное</a><a href="#s-text" data-toc>Описание</a><a href="#s-gal" data-toc>Фото в описании</a></nav>' +
      "</div></aside></div>";

    renderCover(); renderGallery(); renderPreview();
    dropZone($("cover"), function(files){ setCover(files.slice(0, 1)); });
    dropZone($("s-gal"), addPhotos);
    $("delHouse").addEventListener("click", function(){
      dialog("Удалить «" + h.name + "»?", "<p>Дом пропадёт из каталога после сохранения. Если его нужно убрать только на время, включите «Скрыть с сайта».</p><p>Удаление можно отменить: «⋯ → История версий».</p>",
        [{text: "Отмена"}, {text: "Удалить дом", cls: "adm-btn-danger"}]).then(function(i){
        if (i !== 1) return;
        S.houses.splice(S.houses.indexOf(h), 1); touch();
        toast("Дом удалён. Нажмите «Сохранить на сайт», чтобы это увидели посетители.");
        location.hash = "#/";
      });
    });
  }
  function renderCover(){
    var c = $("cover");
    c.innerHTML = (cur.image ? '<img src="' + esc(url(cur.image)) + '" alt="">' : '<span class="adm-cover-empty">' + icon("image") + "<b>Добавьте обложку</b><small>JPG, PNG или WebP · перетащите файл сюда</small></span>") +
      '<button type="button" class="adm-cover-btn" id="coverPick">' + icon("image") + (cur.image ? "Заменить фото" : "Выбрать фото") + "</button>";
    $("coverPick").addEventListener("click", function(){ pick(false, setCover); });
  }
  function renderPreview(){
    var h = cur, p = $("preview"); if (!p) return;
    p.innerHTML = '<div class="adm-pv-media">' + (h.image ? '<img src="' + esc(url(h.image)) + '" alt="">' : icon("image")) +
        (h.example ? '<span class="adm-pv-tag">Новый проект</span>' : "") + (h.hidden ? '<span class="adm-pv-off">' + icon("eye-off") + "Скрыт с сайта</span>" : "") + "</div>" +
      '<div class="adm-pv-body"><b>' + esc(h.name || "Без названия") + "</b><p>" + esc(h.tagline || h.type || "Подзаголовок появится здесь") + "</p>" +
      "<small>" + esc(metaLine(h)) + "</small></div>";
    var t = $("crumb"); if (t) t.textContent = h.name || "Без названия";
  }
  function setCover(files){
    var c = $("cover"); c.classList.add("is-busy");
    upload(files[0], 2400).then(function(u){ cur.image = u; touch(); renderCover(); },
      function(err){ toast(err.message, true); }).then(function(){ c.classList.remove("is-busy"); });
  }
  function addPhotos(files){
    var h = cur;
    files.reduce(function(p, f){
      return p.then(function(){
        var slot = {src: "", caption: "", _busy: true}; h.gallery.push(slot); if (cur === h) renderGallery();
        return upload(f, 2200).then(function(u){ slot.src = u; delete slot._busy; touch(); },
          function(err){ h.gallery.splice(h.gallery.indexOf(slot), 1); toast(err.message, true); })
          .then(function(){ if (cur === h) renderGallery(); });
      });
    }, Promise.resolve());
  }
  function renderGallery(){
    var g = $("gal"), list = cur.gallery;
    g.innerHTML = list.map(function(it, i){
      if (it._busy) return '<figure class="adm-ph is-busy"><div class="adm-ph-img"><span>Загрузка…</span></div></figure>';
      return '<figure class="adm-ph"><div class="adm-ph-img"><img src="' + esc(url(it.src)) + '" alt="" loading="lazy">' +
        '<div class="adm-ph-tools">' +
          '<button type="button" class="adm-ib" data-gmove="-1" data-i="' + i + '" aria-label="Переставить левее" title="Левее"' + (i === 0 ? " disabled" : "") + ">" + icon("left") + "</button>" +
          '<button type="button" class="adm-ib" data-gmove="1" data-i="' + i + '" aria-label="Переставить правее" title="Правее"' + (i === list.length - 1 ? " disabled" : "") + ">" + icon("right") + "</button>" +
          '<button type="button" class="adm-ib is-del" data-gdel="' + i + '" aria-label="Убрать фото" title="Убрать">' + icon("x") + "</button></div>" +
        '<span class="adm-ph-n">' + (i + 1) + "</span></div>" +
        '<input data-gcap="' + i + '" value="' + esc(it.caption) + '" maxlength="200" placeholder="Подпись" aria-label="Подпись к фото ' + (i + 1) + '"></figure>';
    }).join("") +
      '<button type="button" class="adm-ph-add" id="galPick">' + icon("plus") + "<b>Добавить фото</b><small>или перетащите файлы</small></button>";
    $("galPick").addEventListener("click", function(){ pick(true, addPhotos); });
  }

  /* ввод в карточке: всё сразу пишется в дом, сохраняется на сайт кнопкой сверху */
  $("editor").addEventListener("input", function(e){
    var t = e.target, k = t.getAttribute("data-k");
    if (!cur) return;
    if (t.hasAttribute("data-gcap")){ cur.gallery[+t.getAttribute("data-gcap")].caption = t.value; return touch(); }
    if (t.hasAttribute("data-dim")){
      var ins = $("editor").querySelectorAll("[data-dim]"), w = parseInt(ins[0].value.replace(/\D/g, ""), 10), d = parseInt(ins[1].value.replace(/\D/g, ""), 10);
      cur.dims = w > 0 && d > 0 ? [w, d] : null; return touch();
    }
    if (t.name === "prov"){ cur.prov = t.value; return touch(); }
    if (!k) return;
    if (t.type === "checkbox") cur[k] = t.checked;
    else if (k === "floors") cur.floors = +t.value;
    else if (k === "about") cur.about = t.value.split(/\n\s*\n/).map(function(s){ return s.trim(); }).filter(Boolean);
    else if (k === "features") cur.features = t.value.split("\n").map(function(s){ return s.trim(); }).filter(Boolean);
    else if (k === "slug"){
      cur.slug = t.value = t.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60); cur._slugAuto = false;
      $("slugShow").textContent = cur.slug;
    } else {
      cur[k] = t.value;
      if (k === "name"){
        $("edTitle").textContent = t.value || "Без названия";
        if (cur._new && cur._slugAuto){ cur.slug = uniqueSlug(slugify(t.value), cur); $("f-slug").value = cur.slug; $("slugShow").textContent = cur.slug; }
      }
    }
    touch();
  });
  $("editor").addEventListener("change", function(e){ if (e.target.type === "checkbox" || e.target.tagName === "SELECT" || e.target.type === "radio") e.target.dispatchEvent(new Event("input", {bubbles: true})); });
  $("editor").addEventListener("click", function(e){
    var t = e.target.closest("[data-toc]");
    if (t){ e.preventDefault(); document.querySelector(t.getAttribute("href")).scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"}); return; }
    var b = e.target.closest("button"); if (!b || !cur) return;
    if (b.hasAttribute("data-gmove")){
      var i = +b.getAttribute("data-i"), j = i + +b.getAttribute("data-gmove"), g = cur.gallery, x = g[i];
      g.splice(i, 1); g.splice(j, 0, x); touch(); renderGallery();
    } else if (b.hasAttribute("data-gdel")){
      cur.gallery.splice(+b.getAttribute("data-gdel"), 1); touch(); renderGallery();
      toast("Фото убрано. Нажмите «Сохранить на сайт», чтобы изменение появилось на сайте.");
    }
  });

  /* ---------- маршруты: #/ — список, #/house/<id> — карточка ---------- */
  function route(){
    if ($("topAct").hidden) return;
    var m = /^#\/house\/(\d+)/.exec(location.hash), h = m && byId(m[1]);
    $("list").hidden = !!h; $("editor").hidden = !h;
    if (h){ renderEditor(h); window.scrollTo(0, 0); }
    else { cur = null; renderList(); }
  }
  window.addEventListener("hashchange", route);

  api("session").then(function(d){
    if (d.ok) start();
    else showLogin(d.enabled === false ? "Админка на сервере пока не включена" : d.status === 0 ? "Нет связи с сервером" : "");
  });
})();
