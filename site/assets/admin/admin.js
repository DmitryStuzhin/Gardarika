/* Админка каталога Vozdvizhen.
   Каталог целиком редактируется в браузере и одной кнопкой «Сохранить на сайт» уходит на сервер
   (deploy/lead_server.py → /var/lib/gardarika/catalog.json). Фото загружаются сразу при выборе,
   перед загрузкой уменьшаются в браузере. Пока каталог ни разу не сохранён, за основу берётся data.js. */
(function(){
  "use strict";
  var API = "api/admin/";
  var $ = function(id){ return document.getElementById(id); };
  var S = {houses: [], rev: 0, saved: null, dirty: false, fromFiles: false, uid: 0};
  var DRAFT = "vz-admin-draft";

  /* ---------- служебное ---------- */
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function api(path, opt){
    opt = opt || {};
    var h = {"X-Admin": "1"};
    if (opt.json !== undefined){ h["Content-Type"] = "application/json"; opt.body = JSON.stringify(opt.json); }
    if (opt.type) h["Content-Type"] = opt.type;
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
    else { st.textContent = S.fromFiles ? "Каталог из файлов сайта — ещё не сохранялся в админке" : S.saved ? "Сохранено " + S.saved : ""; st.className = "adm-status"; }
    $("save").disabled = !on && !S.fromFiles;
    try {
      if (on) localStorage.setItem(DRAFT, JSON.stringify({rev: S.rev, houses: S.houses.map(plain), at: Date.now()}));
      else localStorage.removeItem(DRAFT);
    } catch (e){ /* приватный режим — черновик не держим */ }
  }
  function touch(){ setDirty(true); }
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
    var btn = $("save"); btn.disabled = true; btn.textContent = "Сохраняю…";
    api("catalog", {json: {rev: S.rev, force: !!force, houses: S.houses.map(plain)}}).then(function(d){
      btn.textContent = "Сохранить на сайт";
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
        items.map(function(it, i){ return "<li><span><b>" + esc(it.saved) + "</b><small>" + it.count + " домов · версия " + it.rev + (i === 0 ? " · текущая" : "") + '</small></span>' +
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
  function shrink(file, max){
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
      return d.url;
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
  function renderList(){
    var vis = S.houses.filter(function(h){ return !h.hidden; }).length;
    var html = '<div class="adm-head"><div><h1>Каталог домов</h1><p>' + S.houses.length + " в каталоге" + (vis !== S.houses.length ? ", на сайте — " + vis : "") +
      '. Порядок здесь — порядок на сайте.</p></div><button type="button" class="btn btn-honey" id="addHouse">+ Добавить дом</button></div>';
    if (S.fromFiles) html += '<p class="adm-note">Сейчас показан каталог из файлов сайта. После первого «Сохранить на сайт» сайт будет брать каталог отсюда.</p>';
    html += '<ol class="adm-houses">' + S.houses.map(function(h, i){
      var tags = (h.hidden ? '<em class="t-hid">Скрыт</em>' : "") + (h.popular ? '<em class="t-pop">Популярный</em>' : "") + (h.example ? '<em class="t-new">Новый</em>' : "") + (h._new ? '<em class="t-unsaved">Не сохранён</em>' : "");
      return '<li class="adm-house' + (h.hidden ? " is-hidden" : "") + '">' +
        '<a class="adm-house-main" href="#/house/' + h._id + '">' +
          (h.image ? '<img src="' + esc(h.image) + '" alt="" loading="lazy">' : '<span class="adm-noimg">нет фото</span>') +
          '<span><b>' + esc(h.name || "Без названия") + "</b><small>" + esc(h.area ? h.area + " м² · " : "") + floorsLabel(h.floors) + (h.price ? " · от " + esc(h.price) + " млн ₽" : "") + "</small>" + (tags ? '<span class="adm-tags">' + tags + "</span>" : "") + "</span></a>" +
        '<div class="adm-house-act">' +
          '<button type="button" class="adm-icon-btn" data-move="-1" data-id="' + h._id + '" aria-label="Выше"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
          '<button type="button" class="adm-icon-btn" data-move="1" data-id="' + h._id + '" aria-label="Ниже"' + (i === S.houses.length - 1 ? " disabled" : "") + ">↓</button>" +
          '<button type="button" class="adm-text-btn" data-hide="' + h._id + '">' + (h.hidden ? "Показать" : "Скрыть") + "</button>" +
        "</div></li>";
    }).join("") + "</ol>";
    $("list").innerHTML = html;
    $("addHouse").addEventListener("click", addHouse);
  }
  $("list").addEventListener("click", function(e){
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-move")){
      var h = byId(b.getAttribute("data-id")), i = S.houses.indexOf(h), j = i + +b.getAttribute("data-move");
      if (j < 0 || j >= S.houses.length) return;
      S.houses.splice(i, 1); S.houses.splice(j, 0, h); touch(); renderList();
      var again = $("list").querySelector('[data-id="' + h._id + '"][data-move="' + b.getAttribute("data-move") + '"]');
      if (again && !again.disabled) again.focus();
    } else if (b.hasAttribute("data-hide")){
      var x = byId(b.getAttribute("data-hide")); x.hidden = !x.hidden; touch(); renderList();
    }
  });
  function addHouse(){
    var h = norm({name: "Новый дом", floors: 1, prov: "viz", gallery: []});
    h.slug = uniqueSlug("novyy-dom", h); h._new = true; h._slugAuto = true;
    S.houses.unshift(h); touch();
    location.hash = "#/house/" + h._id;
  }

  /* ---------- карточка дома ---------- */
  var FLOORS = [[1, "1 этаж"], [1.5, "С мансардой"], [2, "2 этажа"], [3, "3 этажа"]];
  function field(k, label, opt){
    opt = opt || {};
    var id = "f-" + k, v = opt.value !== undefined ? opt.value : cur[k];
    var input = opt.area
      ? '<textarea id="' + id + '" data-k="' + k + '" rows="' + (opt.rows || 4) + '"' + (opt.max ? ' maxlength="' + opt.max + '"' : "") + ">" + esc(v) + "</textarea>"
      : '<input id="' + id + '" data-k="' + k + '" value="' + esc(v) + '"' + (opt.mode ? ' inputmode="' + opt.mode + '"' : "") + (opt.max ? ' maxlength="' + opt.max + '"' : "") + (opt.ph ? ' placeholder="' + esc(opt.ph) + '"' : "") + ">";
    return '<label class="adm-field' + (opt.wide ? " is-wide" : "") + '" for="' + id + '"><span>' + label + "</span>" + input + (opt.hint ? "<small>" + opt.hint + "</small>" : "") + "</label>";
  }
  function check(k, label, hint){
    return '<label class="adm-check"><input type="checkbox" data-k="' + k + '"' + (cur[k] ? " checked" : "") + "><span><b>" + label + "</b>" + (hint ? "<small>" + hint + "</small>" : "") + "</span></label>";
  }
  var cur = null;
  function renderEditor(h){
    cur = h;
    var e = $("editor");
    e.innerHTML =
      '<div class="adm-head"><div><a class="adm-back" href="#/">← Все дома</a><h1 id="edTitle">' + esc(h.name || "Без названия") + "</h1></div>" +
        (h._new ? "" : '<a class="btn btn-line btn-sm" href="index.html#/p/' + esc(h.slug) + '" target="_blank" rel="noopener">Посмотреть на сайте</a>') + "</div>" +

      '<section class="adm-card adm-sec"><h2>Обложка</h2><p class="adm-sub">Главное фото в каталоге и на странице дома. Перетащите фото сюда или выберите файл.</p>' +
        '<div class="adm-cover" id="cover">' + (h.image ? '<img src="' + esc(h.image) + '" alt="">' : '<span class="adm-noimg">Фото ещё нет</span>') + "</div>" +
        '<div class="adm-row"><button type="button" class="btn btn-line btn-sm" id="coverPick">' + (h.image ? "Заменить фото" : "Выбрать фото") + "</button>" +
        '<label class="adm-radio"><input type="radio" name="prov" value="viz"' + (h.prov !== "ref" ? " checked" : "") + '> Визуализация</label>' +
        '<label class="adm-radio"><input type="radio" name="prov" value="ref"' + (h.prov === "ref" ? " checked" : "") + "> Референс из материалов</label></div></section>" +

      '<section class="adm-card adm-sec"><h2>Основное</h2><div class="adm-grid">' +
        field("name", "Название", {max: 80}) +
        field("slug", "Адрес страницы", {max: 60, hint: "латиница, цифры, дефис · сайт/#/p/<b id='slugShow'>" + esc(h.slug) + "</b>" + (h._new ? "" : " · если поменять, старые ссылки на дом перестанут работать")}) +
        field("tagline", "Подзаголовок в карточке", {max: 300, wide: true, ph: "Одна фраза о доме"}) +
        field("type", "Тип дома", {max: 160, ph: "Одноэтажный дом с террасой"}) +
        field("area", "Площадь, м²", {max: 20, mode: "decimal", ph: "120,5"}) +
        '<label class="adm-field" for="f-floors"><span>Этажность</span><select id="f-floors" data-k="floors">' +
          FLOORS.map(function(f){ return '<option value="' + f[0] + '"' + (+h.floors === f[0] ? " selected" : "") + ">" + f[1] + "</option>"; }).join("") + "</select></label>" +
        '<div class="adm-field"><span>Габариты в плане, мм</span><div class="adm-dims"><input data-dim="0" inputmode="numeric" placeholder="ширина" value="' + (h.dims ? h.dims[0] : "") + '"><i>×</i><input data-dim="1" inputmode="numeric" placeholder="глубина" value="' + (h.dims ? h.dims[1] : "") + '"></div><small>можно оставить пустым</small></div>' +
        field("rooms", "Состав", {max: 80, ph: "4 спальни"}) +
        field("extra", "Дополнительно", {max: 80, ph: "терраса 22 м²"}) +
        field("price", "Цена от, млн ₽", {max: 20, mode: "decimal", ph: "9,8", hint: "пусто — «Цена по запросу»"}) +
      "</div>" +
      '<div class="adm-checks">' +
        check("popular", "Показывать в популярных", "блок на главной, до 8 домов") +
        check("example", "Новый проект", "метка на карточке; цена подписывается как пример") +
        check("hidden", "Скрыть с сайта", "дом остаётся в админке, но на сайте его не видно") +
      "</div></section>" +

      '<section class="adm-card adm-sec"><h2>Описание</h2><div class="adm-grid">' +
        field("lede", "Вводный абзац", {area: true, rows: 3, max: 1000, wide: true}) +
        field("story", "Подробнее", {area: true, rows: 4, max: 4000, wide: true}) +
        field("about", "О доме", {area: true, rows: 6, wide: true, value: h.about.join("\n\n"), hint: "абзацы разделяйте пустой строкой"}) +
        field("forWho", "Кому подойдёт", {area: true, rows: 2, max: 1000, wide: true}) +
        field("features", "Особенности", {area: true, rows: 5, wide: true, value: h.features.join("\n"), hint: "по одной на строку — на сайте станут списком с галочками"}) +
      "</div></section>" +

      '<section class="adm-card adm-sec" id="galSec"><h2>Фото в описании</h2><p class="adm-sub">Планировки, виды, интерьеры — показываются на странице дома под описанием. Перетащите фото сюда или нажмите «Добавить фото». Подпись необязательна.</p>' +
        '<div class="adm-gal" id="gal"></div><button type="button" class="btn btn-line btn-sm" id="galPick">+ Добавить фото</button></section>' +

      '<section class="adm-danger"><button type="button" class="btn btn-sm adm-btn-danger" id="delHouse">Удалить дом</button><small>Удаление можно отменить: вернуть прошлую версию каталога в «⋯ → История версий».</small></section>';

    renderGallery();
    $("coverPick").addEventListener("click", function(){ pick(false, setCover); });
    dropZone($("cover"), function(files){ setCover(files.slice(0, 1)); });
    $("galPick").addEventListener("click", function(){ pick(true, addPhotos); });
    dropZone($("galSec"), addPhotos);
    $("delHouse").addEventListener("click", function(){
      dialog("Удалить «" + h.name + "»?", "<p>Дом пропадёт из каталога после сохранения. Если нужно убрать его только на время, лучше отметьте «Скрыть с сайта».</p>",
        [{text: "Удалить", cls: "adm-btn-danger"}, {text: "Отмена"}]).then(function(i){
        if (i !== 0) return;
        S.houses.splice(S.houses.indexOf(h), 1); touch();
        toast("Дом удалён. Нажмите «Сохранить на сайт», чтобы изменение появилось на сайте.");
        location.hash = "#/";
      });
    });
  }
  function setCover(files){
    var c = $("cover"); c.classList.add("is-busy");
    upload(files[0], 2400).then(function(url){
      cur.image = url; touch();
      c.innerHTML = '<img src="' + esc(url) + '" alt="">'; $("coverPick").textContent = "Заменить фото";
    }, function(err){ toast(err.message, true); }).then(function(){ c.classList.remove("is-busy"); });
  }
  function addPhotos(files){
    var h = cur;
    files.reduce(function(p, f){
      return p.then(function(){
        var slot = {src: "", caption: "", _busy: true}; h.gallery.push(slot); if (cur === h) renderGallery();
        return upload(f, 2200).then(function(url){ slot.src = url; delete slot._busy; touch(); },
          function(err){ h.gallery.splice(h.gallery.indexOf(slot), 1); toast(err.message, true); })
          .then(function(){ if (cur === h) renderGallery(); });
      });
    }, Promise.resolve());
  }
  function renderGallery(){
    var g = $("gal"), list = cur.gallery;
    g.innerHTML = list.length ? list.map(function(it, i){
      if (it._busy) return '<figure class="adm-ph is-busy"><div class="adm-ph-img"><span>Загрузка…</span></div></figure>';
      return '<figure class="adm-ph"><div class="adm-ph-img"><img src="' + esc(it.src) + '" alt="" loading="lazy">' +
        '<div class="adm-ph-tools"><button type="button" class="adm-icon-btn" data-gmove="-1" data-i="' + i + '" aria-label="Левее"' + (i === 0 ? " disabled" : "") + ">←</button>" +
        '<button type="button" class="adm-icon-btn" data-gmove="1" data-i="' + i + '" aria-label="Правее"' + (i === list.length - 1 ? " disabled" : "") + ">→</button>" +
        '<button type="button" class="adm-icon-btn is-del" data-gdel="' + i + '" aria-label="Убрать фото">✕</button></div></div>' +
        '<input data-gcap="' + i + '" value="' + esc(it.caption) + '" maxlength="200" placeholder="Подпись, например «Планировка 1 этажа»"></figure>';
    }).join("") : '<p class="adm-empty">Фото пока нет.</p>';
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
