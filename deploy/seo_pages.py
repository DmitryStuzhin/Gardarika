"""Страницы для поисковиков: /doma/ (каталог), /doma/<slug> (дом) и /sitemap.xml.

Собираются на лету из каталога админки (/var/lib/gardarika/catalog.json), поэтому правки
в админке сразу видны и посетителям, и Яндексу. Оформление — стили сайта (site.css).
"""
import html
import json
import re

SITE = "https://vozdvizhen.ru"
PHONE, PHONE_HREF = "+7 977 714-49-69", "tel:+79777144969"
NB = " "


def e(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def u(path):
    """пути из каталога относительные (assets/…) — на страницах /doma/ делаем их абсолютными"""
    path = str(path or "")
    return path if not path or path.startswith(("/", "http")) else "/" + path


def thumb(path):
    p = u(path)
    if re.match(r"^/(assets/img/|media/)[^?#]+\.(jpe?g|png|webp)$", p) and not p.endswith("-sm.webp"):
        return re.sub(r"\.(jpe?g|png|webp)$", "-sm.webp", p)
    return p


def floors_label(f):
    return "1 этаж" if f == 1 else "2 этажа" if f == 2 else "3 этажа" if f == 3 else "С мансардой"


def area_num(h):
    try:
        return float(str(h.get("area") or "0").replace(",", "."))
    except ValueError:
        return 0


def price_text(h):
    return f"от {h['price']}{NB}млн{NB}₽" if h.get("price") else ""


def metres(d):
    return f"{d[0] / 1000:.1f}".replace(".", ",") + f"{NB}×{NB}" + f"{d[1] / 1000:.1f}".replace(".", ",") + f"{NB}м"


def visible(houses):
    return [h for h in houses if h.get("slug") and not h.get("hidden")]


ICONS = """<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-arrow" viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-back" viewBox="0 0 20 20"><path d="M17 10H4M9 5l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-check" viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-calc" viewBox="0 0 20 20"><rect x="4" y="2.5" width="12" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 6h6M7 10h1.5M11.5 10H13M7 13.5h1.5M11.5 13.5H13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></symbol>
  <symbol id="i-area" viewBox="0 0 20 20"><path d="M3.5 3.5h13v13h-13z M3.5 8h4.5V3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
  <symbol id="i-floors" viewBox="0 0 20 20"><path d="M3 9.5L10 4l7 5.5M5 8v8.5h10V8M5 12.5h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
</svg>"""


def page(title, description, canonical, body, extra_head=""):
    return f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vozdvizhen">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{e(canonical)}">
{extra_head}<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/brand/mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/css/site.css?v=7">
<link rel="stylesheet" href="/assets/configurator/constructor.css">
<script src="/assets/js/metrika.js?v=1"></script>
</head>
<body class="cx-page">
<noscript><div><img src="https://mc.yandex.ru/watch/113784303" style="position:absolute;left:-9999px" alt=""></div></noscript>
{ICONS}
<header class="nav is-scrolled">
  <div class="wrap nav-in">
    <a class="brand" href="/" aria-label="Vozdvizhen — на главную">
      <img class="brand-sign" src="/assets/brand/mark.svg" alt="" width="36" height="40">
      <span class="brand-mark">Vozdvizhen</span>
    </a>
    <nav class="links cx-links" aria-label="Разделы">
      <a href="/doma/">Проекты</a>
      <a href="/calculator.html">Калькулятор</a>
      <a href="/#price">Цены</a>
      <a href="/#contact">Контакты</a>
    </nav>
    <a class="nav-phone" href="{PHONE_HREF}">{PHONE}</a>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="foot">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <div class="foot-logo"><img src="/assets/brand/mark.svg" alt="" width="54" height="60"><span class="brand-mark">Vozdvizhen</span></div>
        <p>Проектируем, производим и строим загородные дома для семей в Москве и области.</p>
      </div>
      <nav class="foot-links" aria-label="Разделы">
        <a href="/doma/">Проекты домов</a><a href="/calculator.html">Калькулятор дома</a><a href="/#price">Цены</a><a href="/#contact">Контакты</a><a href="/privacy.html">Политика конфиденциальности</a>
      </nav>
      <div class="stamp stamp-dark">
        <div><span class="sl">Телефон</span><a class="sv" href="{PHONE_HREF}">{PHONE}</a></div>
        <div><span class="sl">Офис</span><span class="sv">Москва, ул. Грина, 1к7</span></div>
        <div><span class="sl">Часы</span><span class="sv">Пн–Вс, 8:00–20:00</span></div>
      </div>
    </div>
    <p class="foot-note">© 2026 Vozdvizhen. Изображения домов — архитектурные визуализации и материалы проектов.</p>
  </div>
</footer>
</body>
</html>
"""


def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>\n"


def card(h):
    a = area_num(h)
    meta = f'<li><svg><use href="#i-area"/></svg>{e(h.get("area"))}{NB}м²</li><li><svg><use href="#i-floors"/></svg>{floors_label(h.get("floors"))}</li>'
    price = (f"<b>{e(price_text(h))}</b><small>{'ориентировочно, пример' if h.get('example') else 'ориентировочно'}</small>"
             if h.get("price") else "<b>Цена по запросу</b><small>под ваш участок и комплектацию</small>")
    full, small = u(h.get("image")), thumb(h.get("image"))
    img = (f'<img src="{e(small)}" data-full="{e(full)}" onerror="if(this.dataset.full){{this.src=this.dataset.full;this.removeAttribute(\'data-full\')}}" '
           if small != full else f'<img src="{e(full)}" ')
    return (f'<article class="card" data-size="{"s" if a < 110 else "m" if a < 130 else "l"}">'
            f'<div class="card-media">{img}alt="Проект дома {e(h.get("name"))}" loading="lazy">'
            + ('<span class="tag tag-new">Новый проект</span>' if h.get("example") else "") + "</div>"
            f'<div class="card-body"><h3><a class="card-link" href="/doma/{e(h["slug"])}">{e(h.get("name"))}</a></h3>'
            f'<p class="card-type">{e(h.get("tagline") or h.get("type"))}</p><ul class="card-meta">{meta}</ul>'
            f'<div class="card-foot"><div class="card-price">{price}</div>'
            f'<a class="card-calc" href="/doma/{e(h["slug"])}" aria-label="Подробнее о проекте {e(h.get("name"))}"><svg><use href="#i-arrow"/></svg><span>Подробнее</span></a></div></div></article>')


def catalog_page(houses):
    hs = visible(houses)
    areas = [area_num(h) for h in hs if area_num(h) > 0]
    span = f" от {int(min(areas))} до {int(round(max(areas)))}{NB}м²" if areas else ""
    title = "Проекты загородных домов — каталог | Vozdvizhen"
    desc = f"Каталог проектов домов для жизни за городом: {len(hs)} проектов{span}. Строим в Москве и Московской области под ваш участок и семью."
    body = f"""<section class="catalog-page section">
  <div class="wrap">
    <a class="back" href="/"><svg><use href="#i-back"/></svg>На главную</a>
    <div class="sec-head"><h1 id="catTitle">Проекты домов</h1>
      <p>{len(hs)} проектов{span}. Любой можно перекроить под участок, бюджет и то, как вы живёте.</p></div>
    <div class="grid">{"".join(card(h) for h in hs)}</div>
    <p style="margin-top:32px"><a class="btn btn-honey" href="/#contact">Подобрать дом с инженером<svg><use href="#i-arrow"/></svg></a></p>
  </div>
</section>"""
    crumbs = jsonld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Главная", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Проекты домов", "item": SITE + "/doma/"}]})
    return page(title, desc, SITE + "/doma/", body, crumbs)


def house_page(h):
    name, slug = h.get("name") or slug_of(h), h["slug"]
    area = h.get("area") or ""
    title = f"{name} — проект дома {area}{NB}м², {floors_label(h.get('floors')).lower()} | Vozdvizhen"
    desc = (h.get("tagline") or h.get("lede") or h.get("type") or "")
    desc = desc.strip()
    if desc and desc[-1] not in ".!?…":
        desc += "."
    desc = (desc + f" Площадь {area} м². Строим в Москве и Московской области.").strip()[:300]
    dims = h.get("dims")
    cells = [("Площадь", f"{e(area)}{NB}м²", ""), ("Этажность", floors_label(h.get("floors")), ""),
             ("Габариты в плане", metres(dims) if dims else "уточняются", ""), ("Состав", e(h.get("rooms")), "")]
    if h.get("price"):
        cells.append(("Цена, пример" if h.get("example") else "Цена, ориентир", e(price_text(h)), "span2"))
    else:
        cells.append(("Цена", "под ваш участок", "span2"))
    stamp = "".join(("<div class=\"span2\">" if c else "<div>") + f'<span class="sl">{lab}</span><span class="sv">{val}</span></div>' for lab, val, c in cells)
    dimfig = ""
    if dims:
        dimfig = (f'<div class="dim dim-x" aria-hidden="true"><span class="dim-val">{dims[0]:,}</span></div>'.replace(",", " ")
                  + f'<div class="dim dim-y" aria-hidden="true"><span class="dim-val">{dims[1]:,}</span></div>'.replace(",", " "))
    about = "".join(f"<p>{e(t)}</p>" for t in (h.get("about") or []))
    feats = "".join(f'<li><svg><use href="#i-check"/></svg>{e(f)}</li>' for f in (h.get("features") or []))
    gallery = "".join(
        f'<figure><div class="frame"><img src="{e(u(g.get("src")))}" alt="{e((g.get("caption") or "Материал проекта") + " — " + name)}" loading="lazy"></div>'
        f'<figcaption>{e(g.get("caption") or ("Планировка · исходный материал проекта" if "plan" in g.get("src", "") else "Исходный материал проекта"))}</figcaption></figure>'
        for g in (h.get("gallery") or []) if g.get("src"))
    prov = "Визуализация" if h.get("prov") != "ref" else "Референс из материалов проекта"
    img_alt = "Проект дома " + e(name) + ": " + e(str(h.get("type") or "").lower())
    story = '<p class="p-story">' + e(h.get("story")) + "</p>" if h.get("story") else ""
    for_who = '<div class="p-for"><span>Кому подойдёт</span><p>' + e(h.get("forWho")) + "</p></div>" if h.get("forWho") else ""
    feat_box = '<div class="p-feat"><span>Что в нём особенного</span><ul>' + feats + "</ul></div>" if feats else ""
    about_block = ('<div class="p-about"><div class="p-about-text"><h2>О доме</h2>' + about + '</div><aside class="p-about-side">'
                   + for_who + feat_box + "</aside></div>") if about or feats else ""
    gallery_block = '<div class="p-gallery">' + gallery + "</div>" if gallery else ""
    fig_cls = "dimfig p-figure" + (" has-x has-y" if dims else "")
    body = f"""<section class="project">
  <div class="wrap">
    <a class="back" href="/doma/"><svg><use href="#i-back"/></svg>Все проекты</a>
    <div class="p-head">
      <div>
        <h1 class="p-title">{e(name)}</h1>
        <p class="p-type">{e(h.get("type"))}</p>
      </div>
      <p class="p-lede">{e(h.get("lede"))}</p>
    </div>
    <div class="p-grid">
      <figure class="{fig_cls}">{dimfig}
        <div class="dimfig-frame"><img src="{e(u(h.get("image")))}" alt="{img_alt}" fetchpriority="high"><figcaption class="prov">{prov}</figcaption></div>
      </figure>
      <aside class="p-side">
        <div class="stamp">{stamp}</div>
        {story}
        <div class="p-actions">
          <a class="btn btn-honey" href="/?project={e(slug)}#contact">Обсудить этот дом<svg><use href="#i-arrow"/></svg></a>
          <a class="btn btn-line" href="/calculator.html">Стройка в калькуляторе<svg><use href="#i-calc"/></svg></a>
        </div>
      </aside>
    </div>
    {about_block}
    {gallery_block}
  </div>
</section>
<script>window.vzGoal && vzGoal("project_view", {{slug: {json.dumps(slug)}}});</script>"""
    ld = jsonld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Главная", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Проекты домов", "item": SITE + "/doma/"},
        {"@type": "ListItem", "position": 3, "name": name, "item": f"{SITE}/doma/{slug}"}]})
    og = f'<meta property="og:image" content="{e(SITE + u(h.get("image")))}">\n' if h.get("image") else ""
    return page(title, desc, f"{SITE}/doma/{slug}", body, og + ld)


def slug_of(h):
    return h.get("slug") or ""


def sitemap(houses, saved):
    day = (saved or "")[:10]
    urls = [("/", "1.0"), ("/doma/", "0.9"), ("/calculator.html", "0.7")] + [(f"/doma/{h['slug']}", "0.8") for h in visible(houses)]
    rows = "".join(f"<url><loc>{e(SITE + p)}</loc>{f'<lastmod>{day}</lastmod>' if day else ''}<priority>{pr}</priority></url>" for p, pr in urls)
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + rows + "</urlset>\n"


def render(path, doc):
    """path — адрес запроса. Возвращает (код, тип, тело) или None, если путь не наш."""
    houses = (doc or {}).get("houses") or []
    if path == "/sitemap.xml":
        return 200, "application/xml; charset=utf-8", sitemap(houses, (doc or {}).get("saved"))
    if path in ("/doma", "/doma/"):
        return 200, "text/html; charset=utf-8", catalog_page(houses)
    m = re.match(r"^/doma/([a-z0-9-]{1,60})/?$", path)
    if m:
        h = next((x for x in visible(houses) if x["slug"] == m.group(1)), None)
        if h:
            return 200, "text/html; charset=utf-8", house_page(h)
        return 404, "text/html; charset=utf-8", page("Дом не найден | Vozdvizhen", "Такого проекта нет в каталоге.", SITE + "/doma/",
                                                    '<section class="section"><div class="wrap"><h1>Такого дома нет в каталоге</h1>'
                                                    '<p style="margin-top:12px"><a class="btn btn-honey" href="/doma/">Все проекты<svg><use href="#i-arrow"/></svg></a></p></div></section>')
    return None
