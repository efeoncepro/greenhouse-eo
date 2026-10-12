// Anexo gráfico v2 (12/10): parte del PDF aprobado del 06/10 y cambia sólo lo que cambió.
//  · página 17: storyboard nuevo (reel «El agua siempre busca una entrada»), página completa desde Storyboard.dc.html;
//  · páginas 3 y 13: se le habla a Sika (ustedes). Se re-renderiza el tablero y se pega SÓLO la franja del texto cambiado
//    sobre la página original (las imágenes del tablero no hacen falta: tienen alto fijo y no mueven el layout).
// Uso: node anexo-pdf.cjs <pdf v1> <carpeta con Storyboard/Audiencias/Referencia .dc.html> <salida.pdf>
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright'); const { PDFDocument, PDFName, PDFString } = require('pdf-lib')
const [V1, DIR, OUT] = process.argv.slice(2)
const HERE = __dirname
const LOCAL = {
  '2c9f9d574dddf747156a9cf67a920140': path.join(HERE, 'img/lockup.svg'),
  '2d47ba48d70f372d27bf1ba8b8597a09': path.join(HERE, '../../node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg'),
  '748e26a939d29ec4642e7c225a51275d': path.join(HERE, 'img/qr-reel.png'),
  bc46e7f7b533df63dd5fa54bb8323a93: 'sb-01', c1c51298f825042d46ff5d26de29448f: 'sb-02', '16978260965bd23d4ffbf20982cc5cab': 'sb-03', c2e80751eae04b0d4e527a2c63e5ccbe: 'sb-04',
  df49ef07513c1a2d11930a4f9de361a8: 'sb-05', '71c55686e6c2fc640105a0a16f8e0db3': 'sb-06', '705a8abea6989334f5ce22c49c610316': 'sb-07', ef598dbca9f1e31636e6e52d055bc950: 'sb-08'
}
const file = id => { const v = LOCAL[id]; return v ? 'file://' + (v.startsWith('sb-') ? path.join(HERE, 'reel/v2/sb', v + '.jpg') : v) : 'about:blank' }
const html = (name, w, h) => {
  let s = fs.readFileSync(path.join(DIR, name), 'utf8')
  s = s.replace(/<script src="\.\/support\.js"><\/script>/, '').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '')
  s = s.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => file(id))
  return s.replace('</head>', `<style>@page{size:${w}px ${h}px;margin:0}html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}</style></head>`)
}
;(async () => {
  const b = await chromium.launch(); const tmp = path.join(HERE, 'out', '_anexo'); fs.mkdirSync(tmp, { recursive: true })
  const render = async (name, w, h, find) => {
    const f = path.join(tmp, name + '.html'); fs.writeFileSync(f, html(name, w, h))
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto('file://' + f, { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
    const box = find ? await p.evaluate(t => { const e = [...document.querySelectorAll('div,h1')].filter(d => d.children.length < 3 && d.textContent.includes(t)).pop(); const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }, find) : null
    const buf = await p.pdf({ width: w + 'px', height: h + 'px', printBackground: true, pageRanges: '1' }); await p.close()
    return { doc: await PDFDocument.load(buf), box }
  }
  const out = await PDFDocument.load(fs.readFileSync(V1))
  // página 17 · storyboard nuevo
  const sb = await render('Storyboard.dc.html', 2400, 1120)
  const [np] = await out.copyPages(sb.doc, [0]); out.removePage(16); out.insertPage(16, np)
  { // enlace clicable sobre el bloque del QR (arriba a la derecha): x 1960–2344, y 56–200 px
    const pg = out.getPage(16); const { height: H } = pg.getSize(); const k = 0.75
    const ref = out.context.register(out.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [1960 * k, H - 200 * k, 2344 * k, H - 56 * k], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of('https://think.efeoncepro.com/muestras/sika-posible-dde148ea051c') } }))
    pg.node.set(PDFName.of('Annots'), out.context.obj([ref])) }
  // franjas de texto: [página (0-based), tablero, ancho, alto, texto ancla, desde arriba (px) o null = según la caja]
  const patch = async (idx, name, w, h, find, y0, y1) => {
    const r = await render(name, w, h, find); const page = out.getPage(idx); const { height: PH, width: PW } = page.getSize(); const k = PW / w
    const top = y0 ?? r.box.top - 6, bottom = y1 ?? r.box.bottom + 6
    const emb = await out.embedPage(r.doc.getPage(0), { left: 0, right: w * 0.75, bottom: (h - bottom) * 0.75, top: (h - top) * 0.75 })
    page.drawPage(emb, { x: 0, y: PH - bottom * k, width: PW, height: (bottom - top) * k })
    console.log('·', name, 'franja', Math.round(top), '–', Math.round(bottom), 'px')
  }
  await patch(2, 'Referencia.dc.html', 2240, 1294, null, 0, 136)
  await patch(12, 'Audiencias.dc.html', 1600, 844, 'Responde a lo que pidieron')
  await b.close()
  out.setTitle('Sika Mexicana · Propuesta creativa POSIBLE · Efeonce Creative Studio')
  fs.writeFileSync(OUT, await out.save()); console.log('ok', out.getPageCount(), 'páginas', (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB')
})()
