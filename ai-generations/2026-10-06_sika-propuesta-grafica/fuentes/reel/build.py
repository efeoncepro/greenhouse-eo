#!/usr/bin/env python3
"""Reel 9:16 · 25 s · SikaSeal-170 — composición HyperFrames con la línea gráfica aprobada."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'manual'))
import gen

H = os.path.join(os.path.dirname(__file__), 'hf')
Y, K, W, R, TEAL = gen.Y, gen.K, gen.W, gen.R, gen.TEAL
BC = "font-family: 'Barlow Condensed', sans-serif"


def local(html):
    return (html.replace(gen.LOGO, 'a/sika-triangulo.png')
                .replace(gen.FIRMA_CORP, 'a/sika-firma.png')
                .replace(gen.PROD, 'a/sikaseal-170.png'))


sello = local(gen.sello_lanz(270, '2en1', TEAL, 'ANTIHONGOS + USO GENERAL'))
sello_s = local(gen.sello_lanz(230, '2en1', TEAL, 'ANTIHONGOS + USO GENERAL'))

ICON = {
    'escudo': '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    'gota': '<path d="M12 3c3.5 4.5 6 7.6 6 10.5A6 6 0 0 1 6 13.5C6 10.6 8.5 7.5 12 3z"/>',
    'cuadros': '<rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="8.5" y="14" width="7" height="7" rx="1"/>',
}


def ben(i, key, t1, t2):
    return (f'<div class="ben" id="b{i}"><div class="ben-ic"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="{K}" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ICON[key]}</svg></div>'
            f'<div class="ben-t"><div class="ben-1">{t1}</div><div class="ben-2">{t2}</div></div></div>')


FACES = open(os.path.join(H, 'a', 'fonts', 'faces.css')).read()

html = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Reel SikaSeal-170 · Innovar es hacerlo POSIBLE</title>
<style>
{FACES}
  body {{ margin: 0; background: #000; }}
  [data-composition-id="reel"] {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; background: {K};
    font-family: 'Barlow', sans-serif; color: {K}; }}
  .full {{ position: absolute; inset: 0; width: 1080px; height: 1920px; }}
  video.full, img.full {{ object-fit: cover; }}
  .scene {{ position: absolute; inset: 0; width: 1080px; height: 1920px; }}
  .z1 {{ z-index: 1; }} .z2 {{ z-index: 2; }} .z3 {{ z-index: 3; }} .z9 {{ z-index: 9; }}
  .cond {{ {BC}; font-weight: 800; line-height: 0.88; letter-spacing: -0.01em; }}
  .light {{ font-weight: 300; }}

  /* S1 · gancho */
  #s1-copy {{ position: absolute; left: 80px; top: 170px; width: 920px; color: {W}; }}
  #s1-copy .cond {{ font-size: 150px; }}
  #s1-copy .l3 {{ color: {Y}; }}
  #s1-shade {{ position: absolute; inset: 0; background: radial-gradient(120% 60% at 30% 18%, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%); }}

  /* S2 · el problema */
  #s2-bg {{ background: {Y}; }}
  .strip {{ position: absolute; left: 0; width: 1080px; height: 560px; overflow: hidden;
    clip-path: polygon(0 9%, 100% 0, 100% 91%, 0 100%); }}
  .strip img {{ width: 1080px; height: 560px; object-fit: cover; display: block; }}
  #st2 img {{ object-position: 50% 62%; }}
  #st1 {{ top: 120px; }} #st2 {{ top: 690px; }}
  #v2 {{ left: 0; top: 1260px; width: 1080px; height: 560px; object-fit: cover; position: absolute;
    clip-path: polygon(0 9%, 100% 0, 100% 91%, 0 100%); }}
  .tag {{ position: absolute; left: 70px; background: {K}; color: {Y}; {BC}; font-weight: 800; font-size: 120px;
    line-height: 1; padding: 10px 28px 16px; }}
  #t1 {{ top: 330px; }} #t2 {{ top: 900px; }} #t3 {{ top: 1470px; }}
  #s2-stamp {{ position: absolute; left: 0; right: 0; top: 780px; height: 360px; background: {Y};
    display: flex; align-items: center; justify-content: center; clip-path: polygon(0 12%, 100% 0, 100% 88%, 0 100%); }}
  #s2-stamp .cond {{ font-size: 230px; }}

  /* S3 · la solución */
  #v3 {{ position: absolute; left: 0; top: 300px; width: 1080px; height: 1620px; object-fit: cover; }}
  #s3-shade {{ position: absolute; left: 0; right: 0; top: 0; height: 520px; background: linear-gradient(180deg, #0a0806 0%, #0a0806 58%, rgba(10,8,6,0) 100%); }}
  #s3-title {{ position: absolute; left: 70px; top: 60px; width: 620px; color: {W}; }}
  #s3-title .cond {{ font-size: 118px; }}
  #s3-title .v {{ color: {Y}; }}
  #s3-seal {{ position: absolute; right: 60px; top: 60px; }}
  #s3-name {{ position: absolute; left: 0; bottom: 120px; background: {Y}; padding: 22px 50px 22px 80px;
    clip-path: polygon(0 0, 100% 0, 92% 100%, 0 100%); }}
  #s3-name .cond {{ font-size: 76px; }}
  #s3-line {{ position: absolute; left: -200px; top: 960px; width: 1600px; height: 10px; background: {Y};
    transform: rotate(-13deg); transform-origin: 50% 50%; }}

  /* S4 · beneficios */
  #s4-photo {{ position: absolute; inset: 0; overflow: hidden; }}
  #s4-photo img {{ width: 1080px; height: 1920px; object-fit: cover; }}
  #s4-panel {{ position: absolute; left: 0; right: 0; bottom: 0; height: 1060px; background: {Y};
    clip-path: polygon(0 14%, 100% 0, 100% 100%, 0 100%); }}
  #s4-kicker {{ position: absolute; left: 80px; top: 230px; color: {W}; }}
  #s4-kicker .k1 {{ font-size: 34px; font-weight: 700; letter-spacing: 0.22em; color: {Y}; }}
  #s4-kicker .cond {{ font-size: 130px; margin-top: 14px; }}
  #s4-list {{ position: absolute; left: 80px; right: 80px; top: 1040px; display: flex; flex-direction: column; gap: 0; }}
  .ben {{ display: flex; align-items: center; gap: 36px; padding: 34px 0; border-top: 3px solid {K}; }}
  .ben:last-child {{ border-bottom: 3px solid {K}; }}
  .ben-1 {{ {BC}; font-weight: 800; font-size: 82px; line-height: 0.95; }}
  .ben-2 {{ font-size: 32px; font-weight: 500; color: #3D3D39; margin-top: 6px; }}

  /* S5 · la firma */
  #s5-bg {{ background: {Y}; }}
  #s5-firma {{ position: absolute; left: 0; right: 0; top: 640px; display: flex; flex-direction: column; align-items: center; }}
  #s5-inner {{ display: inline-flex; flex-direction: column; gap: 22px; }}
  #s5-top {{ font-size: 44px; font-weight: 700; letter-spacing: 0.16em; }}
  #s5-word {{ {BC}; font-weight: 800; font-size: 300px; line-height: 0.9; letter-spacing: -0.015em; white-space: nowrap; margin-top: 70px; position: relative; }}
  #s5-word span {{ display: inline-block; }}
  #s5-si {{ background: {K}; color: {Y}; padding: 0.07em 0.05em 0.01em; margin: 0 0.04em; line-height: 0.9; position: relative; }}
  #s5-tri {{ position: absolute; left: 50%; bottom: 100%; width: 78px; height: 66px; margin-left: -10px; margin-bottom: 32px;
    background: {R}; clip-path: polygon(50% 0, 100% 100%, 0 100%); }}
  #s5-i {{ position: relative; display: inline-block; }}
  #s5-rule {{ height: 14px; background: {K}; transform-origin: 0 50%; }}
  #s5-end {{ display: flex; align-items: center; gap: 22px; }}
  #s5-end .t {{ font-size: 58px; font-weight: 800; }}
  #s5-end img {{ height: 100px; }}

  /* S6 · cierre */
  #s6-bg {{ background: {Y}; }}
  #s6-panel {{ position: absolute; right: 0; top: 0; width: 720px; height: 1920px; background: {K};
    clip-path: polygon(62% 0, 100% 0, 100% 100%, 0 100%); }}
  #s6-title {{ position: absolute; left: 80px; top: 170px; width: 640px; }}
  #s6-title .cond {{ font-size: 130px; }}
  #s6-title .dot {{ color: {TEAL}; }}
  #s6-prod {{ position: absolute; right: 110px; top: 520px; height: 1120px; transform: rotate(-10deg);
    filter: drop-shadow(-30px 40px 40px rgba(0,0,0,0.45)); }}
  #s6-seal {{ position: absolute; right: 60px; top: 160px; }}
  #s6-name {{ position: absolute; left: 80px; top: 560px; width: 380px; }}
  #s6-name .n {{ {BC}; font-weight: 800; font-size: 64px; line-height: 1; }}
  #s6-name .d {{ font-size: 30px; font-weight: 500; color: #3D3D39; margin-top: 10px; line-height: 1.3; }}
  #s6-corp {{ position: absolute; left: 80px; bottom: 110px; height: 96px; }}
  #s6-retail {{ position: absolute; right: 60px; bottom: 100px; display: flex; align-items: center; gap: 18px; background: {K};
    color: {W}; font-size: 34px; font-weight: 700; padding: 18px 22px; }}
  #s6-retail .ph {{ border: 2px dashed #BDBDB6; color: #E4E4DE; font-size: 26px; padding: 12px 18px; }}

  /* barridos a 13° */
  .wipe {{ position: absolute; top: -400px; left: -1500px; width: 1000px; height: 2800px; transform: rotate(13deg); }}
  .wy {{ background: {Y}; }} .wk {{ background: {K}; }}
</style>
</head>
<body>
<div data-composition-id="reel" data-start="0" data-duration="25" data-width="1080" data-height="1920">

  <!-- MEDIA -->
  <video id="v1" class="full z1" data-start="0" data-duration="3.6" data-media-start="0.2" data-track-index="0" src="a/v1-gota.mp4" muted playsinline></video>
  <video id="v2" class="z2" data-start="3.6" data-duration="3.4" data-media-start="0.5" data-track-index="4" src="a/v2-ventana.mp4" muted playsinline></video>
  <video id="v3" class="z1" data-start="7.0" data-duration="5.2" data-media-start="0" data-track-index="5" src="a/v3-hero.mp4" muted playsinline></video>

  <!-- S1 -->
  <div id="s1" class="clip scene z2" data-start="0" data-duration="3.6" data-track-index="1">
    <div id="s1-shade"></div>
    <div id="s1-copy">
      <div class="cond light" id="s1a">¿Un sellador</div>
      <div class="cond light" id="s1b">para cada</div>
      <div class="cond l3" id="s1c">lugar?</div>
    </div>
  </div>

  <!-- S2 -->
  <div id="s2-bg" class="clip scene z1" data-start="3.6" data-duration="3.4" data-track-index="2">
    <div class="strip" id="st1"><img src="a/bano.jpg" alt=""></div>
    <div class="strip" id="st2"><img src="a/cocina.jpg" alt=""></div>
  </div>
  <div id="s2" class="clip scene z3" data-start="3.6" data-duration="3.4" data-track-index="1">
    <div class="tag" id="t1">BAÑO.</div>
    <div class="tag" id="t2">COCINA.</div>
    <div class="tag" id="t3">CANCELERÍA.</div>
    <div id="s2-stamp"><div class="cond" id="s2-word">UNO SOLO.</div></div>
  </div>

  <!-- S3 -->
  <div id="s3" class="clip scene z2" data-start="7.0" data-duration="5.2" data-track-index="1">
    <div id="s3-shade"></div>
    <div id="s3-title">
      <div class="cond light" id="s3a">Innovar para</div>
      <div class="cond v" id="s3b">simplificar.</div>
    </div>
    <div id="s3-seal">{sello}</div>
    <div id="s3-name"><div class="cond">SikaSeal®-170 Sanisil</div></div>
  </div>

  <!-- S4 -->
  <div id="s4" class="clip scene z2" data-start="12.2" data-duration="4.4" data-track-index="1">
    <div id="s4-photo"><img id="s4-img" src="a/macro.jpg" alt=""></div>
    <div id="s4-kicker"><div class="k1" id="s4k1">NUEVA VERSIÓN 2 EN 1</div><div class="cond" id="s4k2">Antihongos<br>+ uso general</div></div>
    <div id="s4-panel"></div>
    <div id="s4-list">
      {ben(1, 'escudo', 'RESISTENTE AL MOHO', 'Juntas limpias por más tiempo')}
      {ben(2, 'gota', 'IMPERMEABLE Y FLEXIBLE', 'Sella y acompaña el movimiento')}
      {ben(3, 'cuadros', 'BAÑO · COCINA · CANCELERÍA', 'Un solo sellador para toda la casa')}
    </div>
  </div>

  <!-- S5 -->
  <div id="s5-bg" class="clip scene z2" data-start="16.6" data-duration="4.4" data-track-index="1">
    <div id="s5-firma"><div id="s5-inner">
      <div id="s5-top">INNOVAR ES HACERLO</div>
      <div id="s5-word"><span id="s5-po">PO</span><span id="s5-si">S<span id="s5-i">I<span id="s5-tri"></span></span></span><span id="s5-ble">BLE</span></div>
      <div id="s5-rule"></div>
      <div id="s5-end"><div class="t">INNOVAR ES HACERLO</div><img id="s5-logo" src="a/sika-triangulo.png" alt="Sika"></div>
    </div></div>
  </div>

  <!-- S6 -->
  <div id="s6-bg" class="clip scene z2" data-start="21.0" data-duration="4.0" data-track-index="1">
    <div id="s6-panel"></div>
    <img id="s6-prod" src="a/sikaseal-170.png" alt="SikaSeal-170">
    <div id="s6-title"><div class="cond light" id="s6a">Innovar para</div><div class="cond" id="s6b">simplificar<span class="dot">.</span></div></div>
    <div id="s6-name"><div class="n">SikaSeal®-170</div><div class="d">Un solo sellador para todas las juntas húmedas.</div></div>
    <div id="s6-seal">{sello_s}</div>
    <img id="s6-corp" src="a/sika-firma.png" alt="Sika · Construyendo confianza">
    <div id="s6-retail">De venta en <div class="ph">[Logo retailer]</div></div>
  </div>

  <!-- BARRIDOS -->
  <div id="wipes" class="clip scene z9" data-start="0" data-duration="25" data-track-index="3" style="pointer-events:none">
    <div class="wipe wy" id="w1"></div>
    <div class="wipe wk" id="w2"></div>
    <div class="wipe wy" id="w3"></div>
    <div class="wipe wk" id="w4"></div>
    <div class="wipe wy" id="w5"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {{}};
    const tl = gsap.timeline({{ paused: true }});

    // barrido: entra cubriendo a T-0.28 y sale a T+0.32
    function wipe(id, t) {{
      tl.fromTo(id, {{ x: 0 }}, {{ x: 3100, duration: 0.62, ease: "power3.inOut" }}, t - 0.3);
    }}
    wipe("#w1", 3.6); wipe("#w2", 7.0); wipe("#w3", 12.2); wipe("#w4", 16.6); wipe("#w5", 21.0);

    // S1
    tl.from("#s1a", {{ y: 90, opacity: 0, duration: 0.6, ease: "expo.out" }}, 0.25);
    tl.from("#s1b", {{ y: 90, opacity: 0, duration: 0.6, ease: "power3.out" }}, 0.55);
    tl.from("#s1c", {{ scale: 1.6, opacity: 0, duration: 0.45, ease: "back.out(2.2)", transformOrigin: "0% 50%" }}, 1.0);

    // S2
    tl.from("#st1", {{ x: -1100, duration: 0.45, ease: "expo.out" }}, 3.65);
    tl.from("#t1", {{ scale: 2.2, opacity: 0, duration: 0.3, ease: "back.out(2)", transformOrigin: "0% 50%" }}, 3.85);
    tl.from("#st2", {{ x: 1100, duration: 0.45, ease: "expo.out" }}, 4.4);
    tl.from("#t2", {{ scale: 2.2, opacity: 0, duration: 0.3, ease: "back.out(2)", transformOrigin: "0% 50%" }}, 4.6);
    tl.from("#v2", {{ x: -1100, duration: 0.45, ease: "expo.out" }}, 5.15);
    tl.from("#t3", {{ scale: 2.2, opacity: 0, duration: 0.3, ease: "back.out(2)", transformOrigin: "0% 50%" }}, 5.35);
    tl.from("#s2-stamp", {{ scaleY: 0, duration: 0.35, ease: "power4.out" }}, 6.05);
    tl.from("#s2-word", {{ scale: 2.4, opacity: 0, duration: 0.35, ease: "back.out(1.8)" }}, 6.15);

    // S3
    tl.from("#s3a", {{ x: -120, opacity: 0, duration: 0.6, ease: "power3.out" }}, 7.4);
    tl.from("#s3b", {{ y: 80, opacity: 0, duration: 0.55, ease: "expo.out" }}, 7.7);
    tl.from("#s3-seal", {{ y: -500, rotation: -18, duration: 0.7, ease: "back.out(1.6)" }}, 8.5);
    tl.from("#s3-name", {{ x: -900, duration: 0.6, ease: "power4.out" }}, 9.3);

    // S4
    tl.fromTo("#s4-img", {{ scale: 1.18 }}, {{ scale: 1.0, duration: 4.4, ease: "none" }}, 12.2);
    tl.from("#s4k1", {{ y: 40, opacity: 0, duration: 0.45, ease: "power2.out" }}, 12.35);
    tl.from("#s4k2", {{ x: -140, opacity: 0, duration: 0.6, ease: "expo.out" }}, 12.5);
    tl.from("#s4-panel", {{ y: 1100, duration: 0.6, ease: "power4.out" }}, 12.6);
    tl.from("#b1", {{ x: 1100, duration: 0.5, ease: "expo.out" }}, 13.2);
    tl.from("#b2", {{ x: 1100, duration: 0.5, ease: "power4.out" }}, 13.85);
    tl.from("#b3", {{ x: 1100, duration: 0.5, ease: "expo.out" }}, 14.5);

    // S5 · la firma se arma
    tl.from("#s5-top", {{ y: -40, opacity: 0, duration: 0.5, ease: "power2.out" }}, 16.8);
    tl.from("#s5-po", {{ x: -900, duration: 0.55, ease: "expo.out" }}, 17.1);
    tl.from("#s5-ble", {{ x: 900, duration: 0.55, ease: "expo.out" }}, 17.1);
    tl.from("#s5-si", {{ y: -1100, duration: 0.6, ease: "bounce.out" }}, 17.65);
    tl.from("#s5-tri", {{ y: -700, rotation: 140, duration: 0.7, ease: "back.out(1.4)" }}, 18.35);
    tl.from("#s5-rule", {{ scaleX: 0, duration: 0.5, ease: "power3.inOut" }}, 19.0);
    tl.from("#s5-end .t", {{ y: 30, opacity: 0, duration: 0.45, ease: "power2.out" }}, 19.4);
    tl.from("#s5-logo", {{ scale: 0, rotation: -30, duration: 0.5, ease: "back.out(2.4)" }}, 19.6);

    // S6 · cierre
    tl.from("#s6-panel", {{ x: 760, duration: 0.6, ease: "expo.out" }}, 21.15);
    tl.from("#s6-prod", {{ y: 1300, rotation: -28, duration: 0.8, ease: "back.out(1.3)" }}, 21.35);
    tl.from("#s6a", {{ x: -100, opacity: 0, duration: 0.5, ease: "power3.out" }}, 21.5);
    tl.from("#s6b", {{ y: 70, opacity: 0, duration: 0.5, ease: "expo.out" }}, 21.7);
    tl.from("#s6-name", {{ y: 40, opacity: 0, duration: 0.5, ease: "power2.out" }}, 22.0);
    tl.from("#s6-seal", {{ y: -500, rotation: 15, duration: 0.6, ease: "back.out(1.6)" }}, 22.1);
    tl.from("#s6-corp", {{ y: 60, opacity: 0, duration: 0.5, ease: "power2.out" }}, 22.4);
    tl.from("#s6-retail", {{ x: 500, duration: 0.5, ease: "power3.out" }}, 22.6);

    window.__timelines["reel"] = tl;
  </script>
</div>
</body>
</html>
'''
open(os.path.join(H, 'index.html'), 'w').write(html)
print('ok')
