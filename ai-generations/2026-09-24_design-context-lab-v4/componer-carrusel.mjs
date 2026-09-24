import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

const root = path.dirname(new URL(import.meta.url).pathname)
const repo = path.resolve(root, '../..')
const W = 1122, H = 1402
const artDir = path.join(root, 'ilustraciones')
const outDir = path.join(root, 'finales')
await fs.mkdir(outDir, { recursive: true })
const assets = [
  path.join(artDir, '01-mision-polo-credencial.png'),
  path.join(artDir, '02-ingredientes-polo-credencial.png'),
  path.join(artDir, '03-revelacion-polo-credencial.png'),
]
const fontB = (await fs.readFile(path.join(repo, 'src/assets/fonts/BricolageGrotesque-Variable.ttf'))).toString('base64')
const fontP = (await fs.readFile(path.join(repo, 'src/assets/fonts/Poppins-Bold.ttf'))).toString('base64')
const blue = '#0375DB', orange = '#F55D01', ink = '#090909', white = '#FFFFFF', yellow = '#FFE839'

function text(x, y, str, { size = 28, fill = ink, family = 'Bricolage', weight = 800, anchor = 'middle', stroke = '', strokeWidth = 0 } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke" stroke-linejoin="round"` : ''}>${str}</text>`
}
function tag(x, y, w, h, label, fill = yellow, color = ink, size = 21) {
  return `<path d="M${x+8} ${y+4}l${w-8} 0 7 7v${h-11}l-7 7H${x+8}l-7-7V${y+11}z" fill="${ink}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${ink}" stroke-width="5"/>${text(x+w/2,y+h/2+size*.34,label,{size,fill:color})}`
}
function speakerLines(x, y, speaker, lines, { size=30, line=38, color=ink } = {}) {
  let s = text(x,y,speaker,{size:16,fill:blue,family:'Poppins',weight:700})
  lines.forEach((lineText,i)=>{s += text(x,y+34+i*line,lineText,{size,fill:color,family:'Bricolage',weight:750})})
  return s
}
function overlay(page) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><style>@font-face{font-family:Bricolage;src:url(data:font/ttf;base64,${fontB})} @font-face{font-family:Poppins;src:url(data:font/ttf;base64,${fontP})}</style></defs>`
  if (page === 0) {
    s += text(630,69,'¿QUÉ LLEVA UNA PIEZA DIGITAL?',{size:18,fill:ink})
    s += speakerLines(881,478,'EL PROFESOR',['¡Hoy toca crear','una pieza digital!'],{size:33,line:41})
    s += speakerLines(223,777,'NEXA',['¿Qué necesitamos','saber antes de','mezclar?'],{size:27,line:34})
    s += tag(54,976,430,58,'INGREDIENTES DEL CONTEXTO',orange,white,20)
  }
  if (page === 1) {
    s += speakerLines(989,59,'NEXA',['¿Para quién es y','qué debe lograr?'],{size:25,line:31})
    s += tag(45,614,1030,51,'OBJETIVO  ·  AUDIENCIA  ·  MENSAJE  ·  ACCIÓN',yellow,ink,22)
    s += speakerLines(151,726,'EL PROFESOR',['Marca, assets,','canal y formato.'],{size:19,line:25})
    s += speakerLines(991,741,'NEXA',['Y una idea','con dirección.'],{size:23,line:28})
    s += tag(114,1304,894,54,'IDENTIDAD + ASSETS + FORMATO + IDEA',blue,white,23)
  }
  if (page === 2) {
    s += tag(375,284,372,48,'PROMPT  +  MODELO',yellow,ink,21)
    s += `<path d="M820 475l45-68 39 49 42-83 62 100-54 93-111-12z" fill="${orange}" stroke="${ink}" stroke-width="8"/>`
    s += text(910,515,'¡PLOP!',{size:39,fill:white,stroke:ink,strokeWidth:5})
    s += tag(35,912,310,48,'¿SE ENTIENDE?',white,ink,18)
    s += tag(395,912,330,48,'¿SE SIENTE DE MARCA?',white,ink,17)
    s += tag(785,912,294,48,'¿FUNCIONA AQUÍ?',white,ink,18)
    s += text(561,1161,'¡EL INGREDIENTE X!',{size:37,fill:yellow,stroke:ink,strokeWidth:12})
    s += text(561,1210,'¡ERA EL CRITERIO!',{size:37,fill:white,stroke:ink,strokeWidth:12})
    s += tag(218,1315,686,47,'PIEZAS DIGITALES CON INTENCIÓN',blue,white,21)
  }
  s += `</svg>`
  return Buffer.from(s)
}

const pdf = await PDFDocument.create()
for (let i=0;i<assets.length;i++) {
  const plate = await fs.readFile(assets[i])
  const composed = await sharp(plate).composite([{input:overlay(i)}]).png().toBuffer()
  const final = await sharp(composed).resize(1080,1350).png().toBuffer()
  const name = `0${i+1}-slide-${['mision','mezcla','criterio'][i]}.png`
  await fs.writeFile(path.join(outDir,name),final)
  const embedded = await pdf.embedPng(final)
  const page = pdf.addPage([576,720])
  page.drawImage(embedded,{x:0,y:0,width:576,height:720})
}
await fs.writeFile(path.join(outDir,'linkedin-comic-design-context.pdf'),await pdf.save())
const previews = await Promise.all(['01-slide-mision.png','02-slide-mezcla.png','03-slide-criterio.png'].map(async name =>
  sharp(path.join(outDir,name)).resize(360,450).png().toBuffer()
))
await sharp({ create: { width: 1080, height: 450, channels: 4, background: '#090909' } })
  .composite(previews.map((input,i)=>({input,left:i*360,top:0})))
  .png().toFile(path.join(outDir,'preview-carrusel.png'))
console.log('Created 3 illustrated 4:5 carousel slides and a 3-page LinkedIn PDF.')
