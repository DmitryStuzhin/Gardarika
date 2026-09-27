#!/usr/bin/env python3
"""Собирает site/calculator.html — 11-шаговый калькулятор со старого сайта.

Исходник: site/calc-src/calculator.src.html (копия reference/index.src.html с исправлениями) (калькулятор, 3D на Three.js, смета в PDF).
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

src = (SITE / "calc-src/calculator.src.html").read_text()
out = src.replace("/*@FONTS@*/", "\n".join(faces)).replace("<!--@THREE@-->", lib)
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
