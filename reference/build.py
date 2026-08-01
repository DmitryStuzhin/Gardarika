#!/usr/bin/env python3
"""Собирает index.html — самодостаточную страницу без единого внешнего запроса.

Артефакты claude.ai запрещают внешние запросы (CSP), поэтому в страницу
вшиваются:
  * Golos Text (кириллица + латиница) как @font-face с data: URI;
  * Three.js r140 (UMD) и OrbitControls как обычные инлайновые скрипты;
  * jsPDF и подмножество Golos Text в TTF — для выгрузки сметы в PDF.
"""
import base64
import pathlib

HERE = pathlib.Path(__file__).parent

# Safari is noticeably more reliable with explicit static TrueType faces than
# with the variable, unicode-split WOFF2 that was used here originally.
# Embed both complete Cyrillic fonts so the assembled HTML stays standalone.
faces = []
for weight in (400, 700):
    raw = (HERE / ("golos-%s.ttf" % weight)).read_bytes()
    b64 = base64.b64encode(raw).decode("ascii")
    faces.append(
        "@font-face{font-family:'Golos Text';font-style:normal;font-weight:%s;"
        "font-display:swap;src:url(data:font/ttf;base64,%s) format('truetype')}"
        % (weight, b64)
    )

# Marketing display face. It is intentionally separate from Golos Text so the
# calculator keeps its established typography while the surrounding site can
# use a narrow, atelier-like Cyrillic voice.
display_raw = (HERE / "alumni-sans.ttf").read_bytes()
display_b64 = base64.b64encode(display_raw).decode("ascii")
faces.append(
    "@font-face{font-family:'Alumni Sans';font-style:normal;font-weight:100 900;"
    "font-display:swap;src:url(data:font/ttf;base64,%s) format('truetype')}"
    % display_b64
)

three = (HERE / "three.min.js").read_text()
orbit = (HERE / "OrbitControls.js").read_text()
jspdf = (HERE / "jspdf.js").read_text()
pdffonts = (HERE / "pdffonts.json").read_text()
lib = "<script>%s\n%s\n%s\nvar PDF_FONTS=%s;</script>" % (three, orbit, jspdf, pdffonts)

src = (HERE / "index.src.html").read_text()
out = src.replace("/*@FONTS@*/", "\n".join(faces)).replace("<!--@THREE@-->", lib)
(HERE / "index.html").write_text(out)
print("index.html:", round(len(out) / 1024), "KB")
