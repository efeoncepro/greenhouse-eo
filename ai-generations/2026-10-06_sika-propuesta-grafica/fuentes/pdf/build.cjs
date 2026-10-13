// PDF de la propuesta: cada tablero del lienzo es una página a su tamaño (texto vectorial), imágenes en JPEG.
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright'); const sharp = require('sharp'); const { PDFDocument } = require('pdf-lib')
const S = process.argv[2], OUT = process.argv[3]
const src = fs.readFileSync(S + '/preview/shot.cjs', 'utf8'); const map = eval('(' + src.match(/const map=(\{[\s\S]*?\});/)[1] + ')')
const canvas = JSON.parse(fs.readFileSync(S + '/canvas/project/canvas.json', 'utf8'))
const ORDER = ['Portada', 'Evolucion', 'Referencia', 'MasterGraphic', 'Main', 'Construccion', 'Versiones', 'Arquitectura', 'Recursos', 'Movimiento', 'Incorrectos', 'Aplicaciones', 'Audiencias', 'Titular', 'Facebook', 'Instagram', 'Storyboard', 'Sikaflex', 'ViscoCrete', 'PDV', 'Contraportada']
;(async () => {
  fs.mkdirSync(S + '/pdf/img', { recursive: true })
  const jpg = {}
  for (const [id, rel] of Object.entries(map)) {
    const f = S + '/' + rel; if (!fs.existsSync(f)) continue
    const o = S + '/pdf/img/' + id + '.jpg'
    if (!fs.existsSync(o)) { const m = await sharp(f).metadata(); const im = sharp(f).flatten({ background: '#ffffff' }); if (m.hasAlpha) { await sharp(f).resize({ width: Math.min(m.width, 2400), withoutEnlargement: true }).png().toFile(o.replace('.jpg', '.png')); jpg[id] = o.replace('.jpg', '.png'); continue } await im.resize({ width: Math.min(m.width, 2400), withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile(o) }
    jpg[id] = fs.existsSync(o) ? o : o.replace('.jpg', '.png')
  }
  const b = await chromium.launch(); const merged = await PDFDocument.create()
  for (const name of ORDER) {
    const bd = canvas.boards[name + '.dc.html']; const w = bd.w, h = bd.h
    let s = fs.readFileSync(S + '/canvas/project/' + name + '.dc.html', 'utf8')
    s = s.replace(/<script src="\.\/support\.js"><\/script>/, '').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '')
    s = s.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => 'file://' + jpg[id])
    s = s.replace('</head>', `<style>@page{size:${w}px ${h}px;margin:0}html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}</style></head>`)
    const f = S + '/pdf/' + name + '.html'; fs.writeFileSync(f, s)
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto('file://' + f, { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
    const buf = await p.pdf({ width: w + 'px', height: h + 'px', printBackground: true, pageRanges: '1' }); await p.close()
    const d = await PDFDocument.load(buf); const [pg] = await merged.copyPages(d, [0]); merged.addPage(pg); console.log('·', name, w + 'x' + h)
  }
  await b.close()
  merged.setTitle('Sika Mexicana · Propuesta creativa POSIBLE · Efeonce Creative Studio'); merged.setAuthor('Efeonce Creative Studio'); merged.setSubject('Licitación Wherex N.º 1164')
  fs.writeFileSync(OUT, await merged.save()); console.log('ok', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB')
})()
