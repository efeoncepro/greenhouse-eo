"""Tableros de la propuesta de marca «Efeonce Social Care» (dos rutas), en su propia página del canvas.
Uso: python3 tools/gen_marca.py canvas/project   · lee los SVG de marca-social-care/ (los genera
scripts/brand/build-social-care-logos.mjs en greenhouse-eo)."""
import json, pathlib, re, sys

OUT = pathlib.Path(sys.argv[1])
SRC = OUT.parent.parent / "marca-social-care"
P = "font-family: Poppins, sans-serif"
NAVY, PAPER, SOFT, INK = "#001a33", "#ffffff", "#9fb3c8", "#52647c"


def svg(route, name, width):
    s = (SRC / route / f"social-care-{name}.svg").read_text(encoding="utf-8").strip()
    s = re.sub(r"<\?xml[^>]*>", "", s)
    return s.replace("<svg ", f'<svg style="width: {width}px; height: auto; display: block" ', 1)


def cell(route, name, width, label, fg):
    return (f'<div style="display: flex; flex-direction: column; justify-content: space-between; gap: 22px; height: 100%">'
            f'<div style="flex: 1; display: flex; align-items: center">{svg(route, name, width)}</div>'
            f'<div style="{P}; font-size: 15px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; color: {fg}">{label}</div></div>')


def band(route, variant, bg, fg, border=""):
    cells = (cell(route, f"logo-{variant}", 400, "Logo", fg) + cell(route, f"lockup-{variant}", 460, "Lockup · pieza por defecto", fg)
             + cell(route, f"stacked-lockup-{variant}", 230, "Apilado", fg) + cell(route, f"isotype-{variant}", 140, "Símbolo", fg)
             + cell(route, f"isotype-{variant}", 44, "44 px", fg) + cell(route, f"icon-{variant}", 130, "Ícono", fg))
    return (f'<div style="flex: 1; box-sizing: border-box; background: {bg}; border-radius: 26px; {border} padding: 44px 56px 36px; '
            f'display: flex; align-items: stretch; justify-content: space-between; gap: 30px">{cells}</div>')


def board(route, title, sub):
    body = (f'<div style="width: 1920px; height: 1080px; box-sizing: border-box; background: #e9edf2; padding: 56px 64px 60px; display: flex; flex-direction: column; gap: 22px">'
            f'<div style="display: flex; align-items: baseline; gap: 22px"><div style="font-family: \'Bricolage Grotesque\', sans-serif; font-size: 46px; font-weight: 760; letter-spacing: -0.03em; color: {NAVY}">{title}</div>'
            f'<div style="{P}; font-size: 21px; font-weight: 400; color: {INK}">{sub}</div></div>'
            + band(route, "positive", PAPER, INK) + band(route, "negative", NAVY, SOFT) + "</div>")
    return ("<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n"
            f"<title>Efeonce Social Care · {title}</title>\n<script src=\"./support.js\"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n"
            "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Poppins:wght@300;400;500;600;700&display=swap\">\n"
            "<style>\nbody{margin:0;background:#e9edf2}\n</style>\n</helmet>\n" + body + "\n</x-dc>\n"
            "<script type=\"text/x-dc\" data-dc-script data-props='{\"$preview\":{\"width\":1920,\"height\":1080}}'>\n"
            "class Component extends DCLogic { renderVals() { return {}; } }\n</script>\n</body>\n</html>\n")


BOARDS = {
    "marca-a-orbita.dc.html": ("Ruta A · la órbita en la O", board("ruta-a-orbita", "Ruta A", "La órbita en la O, como el resto de la familia")),
    "marca-b-burbuja.dc.html": ("Ruta B · la órbita como globo", board("ruta-b-burbuja", "Ruta B", "La órbita con cola: un globo de comentario")),
}
for name, (_, html) in BOARDS.items():
    (OUT / name).write_text(html, encoding="utf-8")

canvas_path = OUT / "canvas.json"
canvas = json.loads(canvas_path.read_text(encoding="utf-8"))
if not any(pg.get("id") == "marca" for pg in canvas.get("pages", [])):
    canvas.setdefault("pages", []).append({"id": "marca", "name": "Marca Social Care"})
canvas["order"] = [f for f in canvas["order"] if not f.startswith("marca-")]
x = 0
for name, (title, _) in BOARDS.items():
    canvas["boards"][name] = {"x": x, "y": 0, "w": 1920, "h": 1080, "title": title, "page": "marca"}
    canvas["order"].append(name)
    x += 2000
canvas["notes"]["marca"] = {"x": 0, "y": -300, "text": "Efeonce Social Care · propuesta de marca · dos rutas, sin aprobar", "kind": "title1", "maxW": x - 80, "page": "marca"}
canvas_path.write_text(json.dumps(canvas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("marca:", ", ".join(BOARDS))
