#!/usr/bin/env python3
"""Собирает site/calculator.html — 11-шаговый калькулятор со старого сайта.

Исходник: reference/index.src.html (калькулятор, 3D на Three.js, смета в PDF).
Страница вшивает шрифты и библиотеки, как reference/build.py, показывает только
калькулятор и подключает оформление и доработки из site/assets/calc/.
Запуск: python3 site/tools/build-calculator.py
"""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
REF = ROOT / "reference"
SITE = ROOT / "site"

def face(family, weight, path, fmt):
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return ("@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;"
            "src:url(data:font/%s;base64,%s) format('%s')}" % (family, weight, fmt, b64, "truetype" if fmt == "ttf" else fmt))

faces = [face("Golos Text", w, REF / ("golos-%s.ttf" % w), "ttf") for w in (400, 700)]
faces.append(face("Alumni Sans", "100 900", REF / "alumni-sans.ttf", "ttf"))

lib = "<script>%s\n%s\n%s\nvar PDF_FONTS=%s;</script>" % (
    (REF / "three.min.js").read_text(), (REF / "OrbitControls.js").read_text(),
    (REF / "jspdf.js").read_text(), (REF / "pdffonts.json").read_text())

src = (REF / "index.src.html").read_text()
out = src.replace("/*@FONTS@*/", "\n".join(faces)).replace("<!--@THREE@-->", lib)
# пресеты: сначала дома каталога (три новых + тринадцать прежних), затем концепт-проекты старого калькулятора
NEW_PRESETS = [
  '  birch132:  {name:"Birch 132", meta:"Двухэтажный дом с террасой",area:132,floors:2,wallH:2.9,roof:"gable",facade:"plaster",wall:"frame",thk:"300",win:"lam",portal:true,slabType:"beams",style:"classic",plan:"b"},',
  '  lilac96:   {name:"Lilac 96", meta:"Одноэтажный дом с перголой",area:96,floors:1,wallH:3.0,roof:"gable",facade:"plaster",wall:"aerated",thk:"400",win:"lam",portal:true,slabType:"mono",style:"organic",plan:"c"},',
  '  vesper164: {name:"Vesper 164", meta:"Одноэтажный дом с гаражом",area:164,floors:1,wallH:3.0,roof:"hip",facade:"plaster",wall:"aerated",thk:"400",win:"tint",portal:true,slabType:"mono",style:"classic",plan:"a"},',
]
m = re.search(r"var PROJECTS = \{\n(.*?)\n\};", out, re.S)
lines = [l for l in m.group(1).split("\n") if l.strip()]
lines = [l.rstrip().rstrip(",") + "," for l in lines]
catalog = [l for l in lines if "catalog:true" in l]
concept = [l for l in lines if "catalog:true" not in l]
body = NEW_PRESETS + catalog + concept
body[-1] = body[-1].rstrip(",")
out = out[:m.start(1)] + "\n".join(body) + out[m.end(1):]
# стартовый проект — первый дом каталога, а не концепт Horizon
out = out.replace('var S = {\n  project:"horizon", style:"hitech",', 'var S = {\n  project:"birch132", style:"classic",', 1)
# в старом степпере два шага назывались так же, как 1-й и 7-й
out = out.replace('{n:"Участок",     t:"Инженерия и участок"', '{n:"Инженерия",   t:"Инженерия и участок"', 1)
out = out.replace('{n:"Окна",        t:"Раскладка окон"', '{n:"Раскладка",   t:"Раскладка окон"', 1)
# картинки каталога лежат в новом сайте здесь
out = out.replace('"catalog/', '"assets/img/catalog/').replace("'catalog/", "'assets/img/catalog/")
# калькулятор больше не скрыт
out = out.replace('<section class="band" id="studioLegacy" style="padding-top:0" hidden aria-hidden="true">',
                  '<section class="band" id="studioLegacy">')
# служебный комментарий с дизайн-контрактом не должен попадать в опубликованный код
out = re.sub(r"<!--\s*THESIS:.*?-->", "", out, flags=re.S)
out = re.sub(r"<title>.*?</title>", "", out, count=1, flags=re.S)
header = (SITE / "assets/calc/calc-header.html").read_text()
page = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<title>Калькулятор дома — Гардарика</title>\n'
        '<link rel="icon" href="assets/brand/mark.svg">\n</head>\n<body class="calc-standalone">\n'
        + header + out +
        '\n<link rel="stylesheet" href="assets/calc/calc-theme.css">\n'
        '<script src="assets/js/data.js"></script>\n<script src="assets/calc/calc-bridge.js"></script>\n</body>\n</html>\n')
(SITE / "calculator.html").write_text(page)
print("calculator.html:", round(len(page) / 1024), "KB")
