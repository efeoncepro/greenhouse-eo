#!/usr/bin/env python3
"""Compila los prompts de motion de CMP001-02..07 (18 = 6 piezas x 3 ratios) y los audita.

Receta heredada del piloto 01 «No fuiste tú» (aprobado 2026-09-22):
  - Marco de CINE MUDO: room tone + foley puntual; sin música y sin voz.
  - Los INDUCTORES de voz se quitan del texto de escena; la escenografía la cargan las imágenes.
  - Entrada a ritmo -> SOSTÉN LARGO y quieto (7,5–13 s) -> fade lento -> cuadro limpio = primer cuadro (loop).
  - Tipografía y CTA van DENTRO del video (funcionó en 01), pero la MARCA NO: la referencia 1 viene
    sin logo y el logo se compone en post (post.sh). Delta deliberado respecto de 01.
  - 3:4 se genera pensando en el recorte a 4:5: franjas de 4 % arriba/abajo sin nada esencial.

Uso: python3 preparar-prompts.py   (escribe prompts/ y sale != 0 si el lint falla)
"""
import json, re, sys, hashlib, pathlib

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / 'prompts'
OUT.mkdir(exist_ok=True)

# Palabras que inducen voz/música fuera del bloque SOUNDTRACK (lección 7 del piloto 01).
INDUCERS = r"\b(microphones?|mics?|statement|announc\w*|spokes\w*|press|declar\w*|speech|speak\w*|talk\w*|says?|said|shout\w*|megaphone|loudspeaker|bullhorn|horn|sing(s|ing|er)?|sung|music\w*|song|voice\w*|narrat\w*|yell\w*|cheer\w*|celebrat\w*)\b"

COMMON_HEAD = (
    "A 15-second seamless loop for a {ratio_desc} social ad. THIS PIECE IS EFFECTIVELY SILENT: there is no "
    "dialogue and no score. The only sounds are the faint tone of an empty room and a few small physical noises "
    "made by things that move on screen.\n\n"
    "Image 1 is the EXACT target look of the finished frame — its typography, its text hierarchy, its corner "
    "brackets and its cursor are the reference to reproduce faithfully. Image 2 is the clean set. {extra_refs}\n\n"
)

COMMON_GRAPHIC_TAIL = (
    "{hold_step}. 7.5–13.0s  🔴 THE LONG HOLD. The complete composition — every line of text, the button, the corner "
    "brackets and the cursor — stays FULLY VISIBLE and PERFECTLY STILL for five and a half seconds. Nothing appears, "
    "nothing moves, nothing changes in the graphic layer. This is the reading window and it is the most important "
    "part of the sequence: do not shorten it, do not animate anything in the graphic layer during it.\n"
    "{fade_step}. 13.0–14.3s  A SLOW, GENTLE fade out: over more than a full second every graphic element dissolves "
    "together and gradually — never a cut, never a fast wipe.\n"
    "{clean_step}. 14.3–15.0s The frame is COMPLETELY CLEAN and identical to the very first frame. Do NOT leave any "
    "text on screen at the end.\n\n"
)

NO_LOGO = (
    "THE LOWER BAND — the strip across the bottom of the frame stays exactly as in image 1: dark, calm and EMPTY. "
    "Do not draw any wordmark, emblem, signature, watermark or lettering there, at any moment. A brand signature "
    "is added later in editing and needs that space clear.\n\n"
)

COMMON_SOUND = (
    "SOUNDTRACK — there is no score in this video at all: no fanfare, no orchestra, no brass, no strings, no "
    "melody, no instrumental bed of any kind. And there is NO dialogue track: no voice, no gibberish, no babbling, "
    "no crowd, no whispering — not one syllable in any language is uttered at any point by anyone.\n\n"
    "Under everything, a barely audible room tone — the faint air of a quiet room — so the silence sounds like a "
    "real room and never like a broken audio file.\n\n"
    "On top of that room tone, ONLY these discrete sounds, each landing exactly on its action and each surrounded "
    "by silence:\n{foley}\n"
    "- a delicate high tick each time a line of text appears;\n"
    "- a crisp mouse click when the cursor presses the button.\n\n"
    "The physical actions are the most present sounds in the mix; the interface ticks are noticeably quieter. "
    "During the long hold (7.5–13.0s) there is NO sound at all beyond the room tone. All sounds are crisp, short, "
    "dry and light: no reverb tails, no comedy honks, no slide whistles, no boings, no slapstick. The loop is "
    "continuous: the room tone carries seamlessly from the last frame back into the first, with no gap, no fade "
    "and no ending sting.\n\n"
)

PHOTO = {
    'mascot': "Photographic, real physical vinyl object on a real set: subtle sensor grain, true depth of field with "
              "the foreground edge soft, real practical light falloff into darkness. Not a cartoon, not a 3D render.",
    'person': "Photographic and documentary: a real person in a real workplace, natural skin texture, subtle sensor "
              "grain, true depth of field, warm practical light. Hands and fingers anatomically correct (five "
              "fingers, natural proportions). Her face never distorts and never changes identity; her lips stay "
              "closed the whole time. Not a cartoon, not a 3D render, not glossy stock.",
}

RATIOS = {
    '9x16': {'desc': 'vertical 9:16', 'aspect': '9:16', 'ref': 'ref-sin-logo-9x16.png', 'plate': 'plate-9x16.png'},
    '3x4':  {'desc': '3:4 (portrait, slightly taller than wide)', 'aspect': '3:4', 'ref': 'ref-sin-logo-4x5.png', 'plate': 'plate-4x5.png'},
    '1x1':  {'desc': '1:1 SQUARE', 'aspect': '1:1', 'ref': 'ref-sin-logo-1x1.png', 'plate': 'plate-1x1.png'},
}

CROP_NOTE = ("This 3:4 frame will later be trimmed to 4:5: the top 4% and the bottom 4% of the picture are cut "
             "away. Keep every line of text, the button and the cursor clear of those two strips; only soft, out-of-focus "
             "foreground or background may extend into them. Do not shrink the subject to make room.")

PIECES = json.loads((ROOT / 'piezas-motion.json').read_text())


def layout_block(p, ratio):
    L = p['layout'][ratio] if ratio in p['layout'] else p['layout']['4x5']
    lines = [f"TEXT SIZE AND LAYOUT — match image 1 exactly, do not shrink it:", f"- {L}"]
    lines += [f"- {x}" for x in p['layout_common']]
    if ratio == '3x4':
        lines.append(f"- {CROP_NOTE}")
    if ratio == '1x1' and not (ROOT / 'refs' / p['id'] / 'ref-sin-logo-1x1.png').exists():
        lines.append("- Image 1 is the 4:5 version of this piece. This is a SQUARE frame, so recompose for it rather "
                     "than cropping: keep the same margins, alignment and relative type sizes, with the text block "
                     "in the upper part and the subject in the lower half.")
    lines.append("Text is crisp, perfectly legible, correctly spelled Spanish with its accents, never warped and "
                 "never handwritten.")
    return '\n'.join(lines) + '\n\n'


def graphic_block(p):
    steps = [f"{i+1}. {s}" for i, s in enumerate(p['graphic'])]
    n = len(steps)
    tail = COMMON_GRAPHIC_TAIL.format(hold_step=n + 1, fade_step=n + 2, clean_step=n + 3)
    return ("THE GRAPHIC LAYER — reproduce the typography, weights, sizes, colours and positions exactly as in "
            "image 1. The shape of this sequence matters more than any single timing: the elements arrive at a "
            "steady pace, then the FULLY COMPOSED frame is HELD FOR A LONG TIME so it can be read as a whole, and "
            "only then does it fade out SLOWLY. Once an element appears it never moves or leaves until the final "
            "fade.\n" + '\n'.join(steps) + '\n' + tail)


def compile_prompt(p, ratio):
    r = RATIOS[ratio]
    s = COMMON_HEAD.format(ratio_desc=r['desc'], extra_refs=p['extra_refs'])
    s += "THE SET (from image 2, locked): " + p['set'] + " The camera is LOCKED OFF for the whole shot: no pan, no " \
         "tilt, no zoom, no dolly.\n\n"
    s += "THE PERFORMANCE — " + p['performance_intro'] + "\n" + '\n'.join('- ' + b for b in p['beats']) + '\n'
    s += p['performance_outro'] + "\n\n"
    s += p['payoff'] + "\n\n"
    s += graphic_block(p)
    s += layout_block(p, ratio)
    s += NO_LOGO
    s += COMMON_SOUND.format(foley='\n'.join('- ' + f + ';' for f in p['foley']))
    s += PHOTO[p['kind']] + '\n'
    return s


def lint(text):
    """Cuenta inductores fuera del bloque SOUNDTRACK y comprueba las piezas estructurales."""
    body = text.split('SOUNDTRACK —')[0]
    hits = re.findall(INDUCERS, body, flags=re.I)
    errs = []
    if hits:
        errs.append(f"inductores de voz/música fuera del soundtrack: {sorted(set(h.lower() for h in hits))}")
    for must in ('THE LONG HOLD', 'LOCKED OFF', 'identical to the very first frame', 'THE LOWER BAND'):
        if must not in text:
            errs.append(f"falta «{must}»")
    if re.search(r"\b(logo|efeonce)\b", body, flags=re.I):
        errs.append("nombra la marca/logo: el modelo no debe dibujarla")
    return errs


manifest, failed = [], False
for p in PIECES:
    for ratio, r in RATIOS.items():
        refdir = ROOT / 'refs' / p['id']
        ref1 = refdir / r['ref']
        if not ref1.exists():
            ref1 = refdir / 'ref-sin-logo-4x5.png'
        plate = refdir / r['plate']
        if not plate.exists():
            plate = refdir / 'plate-4x5.png'
        images = [ref1, plate] + [refdir / x for x in p['ref_files']]
        text = compile_prompt(p, ratio)
        errs = lint(text)
        name = f"CMP001-{p['id']}-{ratio}"
        (OUT / f"{name}.prompt.txt").write_text(text)
        manifest.append({
            'take': name, 'piece': p['id'], 'title': p['title'], 'ratio': ratio, 'aspect': r['aspect'],
            'prompt': f"prompts/{name}.prompt.txt",
            'images': [str(i.relative_to(ROOT)) for i in images],
            'sha256': {str(i.relative_to(ROOT)): hashlib.sha256(i.read_bytes()).hexdigest() for i in images},
            'lint': errs or 'ok',
        })
        print(f"{name:22s} {len(text):5d} chars  {'OK' if not errs else 'FALLA: ' + '; '.join(errs)}")
        failed |= bool(errs)

(ROOT / 'tomas.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
sys.exit(1 if failed else 0)
