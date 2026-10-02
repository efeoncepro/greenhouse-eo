// Motion real (no storyboard): 16:9, 30 fps. Geometría de la lente = pieza medida `lens.wall`; tiempos y curvas
// siguiendo el lenguaje de movimiento (anticipación, relevo, golpe con pulso, sobrepaso, un protagonista a la vez).
// Cierre = cuadros del sting aprobado v1.1 (no se regenera). Maqueta de dirección, no master.
import { answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
const R = '/Users/jreye/Documents/greenhouse-eo/'
const OUT = new URL('./out-anim/', import.meta.url).pathname
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT + 'f', { recursive: true })
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const W = 1920, H = 1080, FPS = 30, S = 0.5 // se captura a 960×540
const T = GL.color.teal, DARK = GL.color.dark, SOFT = GL.slogan.leadColor.onDark
const P = GL.pieces.lens.wall, RP = P.ring.r / (1 + GL.orbit.ringAirRatio), CX = P.ring.cx, CY = P.ring.cy
// Toma elegida PARA la lente: vertical nativa con la cara centrada en el círculo (cara en x 467, y 425 de 1024×1792,
// alto de cara ~180 px). Se escala 1,1 y se ubica la cara a (CX, CY − 90): cabeza, hombros, polo y lanyard dentro.
const SRC = R + 'ai-generations/2026-09-26_web-movil/plates/M1-avanza-polo.png', K = 1.1
const PW = Math.round(1024 * K), PH = Math.round(1792 * K), PL = Math.round(CX - 467 * K), PT = Math.round(CY - 90 - 425 * K)
const photo = 'data:image/jpeg;base64,' + (await sharp(SRC).resize(PW, PH).jpeg({ quality: 88 }).toBuffer()).toString('base64')
const dimPhoto = 'data:image/jpeg;base64,' + (await sharp(SRC).resize(W, H, { fit: 'cover', position: 'top' }).jpeg({ quality: 80 }).toBuffer()).toString('base64')
const ring = `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const page = `<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}
body{margin:0;background:${DARK}}#st{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${DARK};transform:scale(${S});transform-origin:0 0}
.abs{position:absolute;inset:0}</style></head><body><div id="st">
<img id="dim" src="${photo}" style="position:absolute;left:${PL}px;top:${PT}px;width:${PW}px;height:${PH}px;filter:grayscale(.6) brightness(.22);opacity:0">
<div id="clip" class="abs" style="clip-path:circle(0px at ${CX}px ${CY}px)"><img id="ph" src="${photo}" style="position:absolute;left:${PL}px;top:${PT}px;width:${PW}px;height:${PH}px;transform-origin:${CX - PL}px ${CY - PT}px"></div>
<svg class="abs" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><circle id="rg" cx="${CX}" cy="${CY}" r="${P.ring.r}" fill="none" stroke="#72ded8" stroke-opacity="0" stroke-width="${P.ring.strokePx}"/>
<g id="trail"></g><path id="arc" fill="none" stroke="${T}" stroke-width="${P.arc.strokePx}" stroke-linecap="round"/><circle id="sph" r="${P.sphereRadiusPx}" fill="${T}"/>
<circle id="p1" fill="none" stroke="${T}" stroke-width="2"/><circle id="p2" fill="none" stroke="${T}" stroke-width="1.5"/></svg>
<p id="q" style="position:absolute;left:140px;top:214px;margin:0;font:300 40px/1.2 Pop;color:${SOFT};white-space:nowrap;opacity:0">${ring}¿Tu marketing mide<br>lo que vende?</p>
<p id="a" data-sel style="position:absolute;left:128px;top:352px;margin:0;font:760 170px Bric;letter-spacing:-.05em;line-height:.92;color:#fff"><span id="w1" style="display:inline-block;transform-origin:0 80%;opacity:0">Ahora</span><br><span id="w2" style="display:inline-block;transform-origin:0 80%;opacity:0">${answerHtml('sí', T)}</span></p>
<div id="sel" class="abs" style="opacity:0"></div>
</div></body></html>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W * S, height: H * S } })
await pg.setContent(page, { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
// selección de producción, calculada una vez sobre la respuesta asentada
await pg.evaluate(() => { for (const id of ['w1', 'w2']) document.getElementById(id).style.opacity = 1 })
const box = await pg.evaluate(() => { const e = document.getElementById('a'); const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); const s = 2; return { left: b.left * s, top: b.top * s + b.height * s * 0.1, right: b.right * s, bottom: b.bottom * s - b.height * s * 0.05 } })
const m = resolveCollaborationSelectionIntent({ targetId: 'r', targetKind: 'text', variant: 'eight-handles', padding: 'standard', overlay: 'subtle', cursors: [{ id: 'g', kind: 'collaborator', targetId: 'r', anchor: 'bottom-end', action: 'resize', label: 'Growth', participantKind: 'role' }] })
const rs = renderCollaborationSelection({ manifest: m, targetBounds: box, canvas: { width: W, height: H }, measureLabel: (l, s) => l.length * s * 0.62, presentation: { collaboratorScale: 1.6 } })
await pg.evaluate(svg => { document.getElementById('sel').innerHTML = svg }, `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0">${rs.underlay}${rs.overlay}</svg>`)
await pg.evaluate(() => { for (const id of ['w1', 'w2']) document.getElementById(id).style.opacity = 0 })
// curvas (motion.curves: llega = emphasized; se transforma = standard)
const clamp = x => Math.max(0, Math.min(1, x))
const seg = (t, a, b) => clamp((t - a) / (b - a))
const outCubic = x => 1 - (1 - x) ** 3
const outBack = (x, s = 1.2) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2 // llega con sobrepaso
const inOut = x => x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
const A0 = P.arc.startDeg, A1 = P.arc.endDeg
const DUR = 4.6, N = Math.round(DUR * FPS)
for (let i = 0; i < N; i++) {
  const t = i / FPS
  const st = {
    // 0–0,3 anticipación: el anillo aparece chico; 0,3–0,8 la lente se abre (llega con curva enfatizada)
    ringR: t < 0.3 ? 70 * outCubic(seg(t, 0, 0.3)) : 70 + (P.ring.r - 70) * outCubic(seg(t, 0.3, 0.8)),
    ringOp: 0.28 * seg(t, 0, 0.2),
    clipR: RP * outCubic(seg(t, 0.35, 0.85)),
    dim: seg(t, 0.35, 0.8),
    // la foto entra cerca y se asienta; en el sostén respira hasta un 10 % (escala logarítmica)
    zoom: t < 1.2 ? 1.2 - 0.2 * outCubic(seg(t, 0.35, 1.2)) : Math.exp(Math.log(1.08) * inOut(seg(t, 2.4, 4.6))),
    // 0,8–1,2 el arco corre (tramo rápido con estela); la esfera golpea a 1,2 con pulso y eco
    sweep: (A1 - A0) * outCubic(seg(t, 0.8, 1.2)),
    fast: t > 0.8 && t < 1.2,
    pulse: seg(t, 1.2, 1.55),
    q: seg(t, 1.2, 1.45),
    w1: outBack(seg(t, 1.35, 1.65)), w1o: seg(t, 1.35, 1.45),
    w2: outBack(seg(t, 1.6, 1.95), 1.6), w2o: seg(t, 1.6, 1.7),
    sel: seg(t, 2.0, 2.25), selS: 1.04 - 0.04 * outCubic(seg(t, 2.0, 2.3))
  }
  await pg.evaluate(({ st, CX, CY, A0, RP }) => {
    const $ = id => document.getElementById(id)
    const pt = (d, r) => [CX + r * Math.cos(d * Math.PI / 180), CY + r * Math.sin(d * Math.PI / 180)]
    const arc = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}` }
    $('rg').setAttribute('r', st.ringR); $('rg').setAttribute('stroke-opacity', st.ringOp)
    $('clip').style.clipPath = `circle(${st.clipR}px at ${CX}px ${CY}px)`
    $('dim').style.opacity = 0
    $('ph').style.transform = `scale(${st.zoom})`
    const r = st.ringR, end = A0 + st.sweep
    // anticipación: la esfera retrocede un poco antes de salir
    const sphA = st.sweep > 0.5 ? end : A0 - 6 * Math.sin(Math.PI * Math.min(1, st.ringR / 90))
    $('arc').setAttribute('d', st.sweep > 0.5 ? arc(A0, end, r) : '')
    const [sx, sy] = pt(sphA, r); $('sph').setAttribute('cx', sx); $('sph').setAttribute('cy', sy)
    $('trail').innerHTML = st.fast ? [1, 2, 3].map(k => `<path d="${arc(Math.max(A0, end - 10 - k * 9), end - k * 9, r)}" fill="none" stroke="#36c8bf" stroke-opacity="${0.4 - k * 0.1}" stroke-width="${6.77 + k * 2}" stroke-linecap="round"/>`).join('') : ''
    const pr = st.pulse
    for (const [id, k, o] of [['p1', 2.8, .6], ['p2', 4.6, .3]]) { $(id).setAttribute('cx', sx); $(id).setAttribute('cy', sy); $(id).setAttribute('r', 13.54 * (1 + (k - 1) * pr)); $(id).setAttribute('stroke-opacity', pr > 0 && pr < 1 ? o * (1 - pr) : 0) }
    $('q').style.opacity = st.q; $('q').style.transform = `translateY(${(1 - st.q) * 16}px)`
    $('w1').style.opacity = st.w1o; $('w1').style.transform = `translateY(${(1 - st.w1) * 60}px) scale(${0.9 + 0.1 * st.w1})`
    $('w2').style.opacity = st.w2o; $('w2').style.transform = `translateY(${(1 - st.w2) * 60}px) scale(${0.85 + 0.15 * st.w2})`
    $('sel').style.opacity = st.sel; $('sel').style.transform = `scale(${st.selS})`; $('sel').style.transformOrigin = '380px 520px'
  }, { st, CX, CY, A0, RP })
  await pg.screenshot({ path: `${OUT}f/${String(i).padStart(4, '0')}.png` })
}
await b.close()
const sting = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/reveal/16x9/navy/efeonce-orbita-reveal_16x9_navy_30fps.mp4'
execSync(`ffmpeg -v error -y -framerate ${FPS} -i "${OUT}f/%04d.png" -c:v libx264 -pix_fmt yuv420p -vf scale=960:540 "${OUT}parte1.mp4"`)
execSync(`ffmpeg -v error -y -i "${sting}" -an -vf scale=960:540,fps=${FPS} -c:v libx264 -pix_fmt yuv420p "${OUT}sting.mp4"`)
execSync(`ffmpeg -v error -y -i "${OUT}parte1.mp4" -i "${OUT}sting.mp4" -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.25:offset=${(DUR - 0.25).toFixed(2)},format=yuv420p[v]" -map "[v]" -c:v libx264 -crf 20 -movflags +faststart "${OUT}motion-orbita-foto.mp4"`)
console.log(execSync(`ffprobe -v error -show_entries format=duration,size -of csv=p=0 "${OUT}motion-orbita-foto.mp4"`).toString())
