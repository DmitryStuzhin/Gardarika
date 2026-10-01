#!/usr/bin/env python3
"""Собирает gardarika-redesign.html — один файл без внешних ресурсов.

Нужен для просмотрщиков, которые открывают только сам HTML без соседней
папки assets/ (например, предпросмотр в приложении Claude). Фотографии
пережимаются до 1600 px и вшиваются один раз в JS-словарь, чтобы одно и то же
изображение не дублировалось в карточках, сценах и окне проекта.
"""
import base64, pathlib, re, subprocess, tempfile, json

HERE = pathlib.Path(__file__).parent
html = (HERE / "index.html").read_text()

def b64(p): return base64.b64encode(p.read_bytes()).decode("ascii")

# шрифты
def font(m):
    p = HERE / m.group(1)
    mime = "font/woff2" if p.suffix == ".woff2" else "font/ttf"
    return "url(data:%s;base64,%s)" % (mime, b64(p))
html = re.sub(r"url\((assets/fonts/[^)]+)\)", font, html)

# изображения: один словарь на всю страницу
names = sorted(set(re.findall(r"assets/img/([\w-]+)\.jpg", html)) |
               set(re.findall(r'(?:img|gal):\[?"([\w-]+)"', html)) |
               set(re.findall(r'"((?:house|plan|detail)-[\w-]+)"', html)))
imgs = {}
with tempfile.TemporaryDirectory() as tmp:
    for n in names:
        src = HERE / "assets/img" / (n + ".jpg")
        if not src.exists(): continue
        out = pathlib.Path(tmp) / (n + ".jpg")
        q = "80" if n.startswith(("plan", "detail")) else "68"
        subprocess.run(["convert", str(src), "-resize", "1400x1400>", "-strip", "-quality", q, "-interlace", "Plane", str(out)], check=True)
        imgs[n] = "data:image/jpeg;base64," + b64(out)

html = re.sub(r'\bsrc="assets/img/([\w-]+)\.jpg"', r'data-img="\1"', html)
html = re.sub(r'\bdata-src="assets/img/([\w-]+)\.jpg"', r'data-lazy="\1"', html)
html = html.replace('src = function(n){ return "assets/img/" + n + ".jpg"; }', 'src = function(n){ return IMG[n]; }')
boot = ("<script>var IMG=" + json.dumps(imgs) + ";"
        "document.querySelectorAll('[data-img]').forEach(function(i){i.src=IMG[i.dataset.img]});"
        "document.querySelectorAll('[data-lazy]').forEach(function(i){i.dataset.src=IMG[i.dataset.lazy]});</script>\n<script>\n(function(){")
html = html.replace("<script>\n(function(){", boot, 1)
three = (HERE / "assets/js/three.min.js").read_text()
html = html.replace('<script src="assets/js/three.min.js"></script>', "<script>" + three + "</script>", 1)
assert '<script src="assets/' not in html and 'url(assets/' not in html and 'src="assets/img' not in html, re.findall(r".{40}assets/.{40}", html)[:3]
(HERE / "gardarika-redesign.html").write_text(html)
print("ok", len(imgs), "images,", round(len(html) / 1e6, 2), "MB")
