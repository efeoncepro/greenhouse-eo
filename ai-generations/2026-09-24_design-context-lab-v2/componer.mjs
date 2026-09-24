import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

const root = path.dirname(new URL(import.meta.url).pathname)
const W = 1080, H = 1350
const ink = '#141414', paper = '#F5F0E6', blue = '#0375DB', orange = '#F55D01', lime = '#6EC207'
const coverPath = path.join(root, 'plates/01-portada-plate.png')
const closePath = path.join(root, 'plates/07-cierre-plate.png')
const logo = (await fs.readFile(path.resolve(root, '../../public/branding/logo-full.svg'))).toString('base64')
const bricolage = (await fs.readFile(path.resolve(root, '../../src/assets/fonts/BricolageGrotesque-Variable.ttf'))).toString('base64')
const poppins = (await fs.readFile(path.resolve(root, '../../src/assets/fonts/Poppins-Bold.ttf'))).toString('base64')
const poppinsReg = (await fs.readFile(path.resolve(root, '../../src/assets/fonts/Poppins-Regular.ttf'))).toString('base64')

const pages = [
  { n: '01', title: '¿QUÉ LLEVA LA OLLA?\nDE UNA PIEZA DIGITAL?', body: 'La receta empieza antes del prompt.', kind: 'cover' },
  { n: '02', label: 'INGREDIENTE 01 · BRIEF', title: '¿QUÉ DEBE\nLOGRAR?', body: 'Objetivo. Audiencia. Mensaje. Acción.\n\nSi eso no está claro, solo estamos mezclando cosas.', bubble: 'Primero, el para qué.', crop: {left: 0, top: 150, width: 570, height: 780}, photoSide: 'right', tag: '¡PLOP!' },
  { n: '03', label: 'INGREDIENTE 02 · IDENTIDAD + ASSETS', title: '¿QUÉ LA HACE\nNUESTRA?', body: 'Marca, referencias aprobadas, producto, imágenes y recursos disponibles.\n\nLa identidad da sabor. Los assets, materia.', crop: {left: 545, top: 160, width: 570, height: 890}, photoSide: 'left', tag: '¡CLIC!' },
  { n: '04', label: 'INGREDIENTE 03 · CANAL + FORMATO', title: '¿DÓNDE VA\nA VIVIR?', body: 'Canal, ubicación, proporción y lectura.\n\nLa misma idea se recompone para cada espacio; no se recorta al final.', crop: {left: 390, top: 390, width: 620, height: 920}, photoSide: 'right', tag: '4:5 · 1:1 · 9:16' },
  { n: '05', label: 'INGREDIENTE 04 · CONCEPTO + DIRECCIÓN', title: 'LA IDEA\nCONDUCE.', body: 'Un mensaje, una decisión visual y un copy que trabajan juntos.\n\nEl prompt traduce esa dirección. No la inventa.', crop: {left: 300, top: 720, width: 820, height: 620}, photoSide: 'left', tag: '¡AJÁ!' },
  { n: '06', label: 'INGREDIENTE 05 · PROMPT + MODELO', title: 'HERRAMIENTAS,\nNO RECETA.', body: 'El prompt describe cómo ejecutar el contexto. El modelo produce una versión.\n\nElegir y dirigir siguen siendo trabajo creativo.', crop: {left: 410, top: 620, width: 700, height: 700}, photoSide: 'right', tag: 'PROMPT ≠ IDEA' },
  { n: '07', label: 'EL INGREDIENTE X · CRITERIO', title: '¿SE ENTIENDE?\n¿SE SIENTE DE MARCA?\n¿FUNCIONA AQUÍ?', body: 'Revisar, corregir y volver a mezclar también es diseñar.\n\nContexto + idea + dirección + ejecución + criterio = pieza con intención.', kind: 'close', tag: 'GUÁRDALO' },
]

const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const lines = (text, x, y, lineH, size, family, weight=700, fill=ink) => String(text).split('\n').map((line,i) => `<text x="${x}" y="${y+i*lineH}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`).join('')
const logoSvg = (x,y,w) => `<image x="${x}" y="${y}" width="${w}" height="${w*196.68/837.07}" href="data:image/svg+xml;base64,${logo}" />`
const defs = `<defs>
  <style>@font-face{font-family:Bricolage;src:url(data:font/ttf;base64,${bricolage})} @font-face{font-family:Poppins;src:url(data:font/ttf;base64,${poppins})} @font-face{font-family:PoppinsR;src:url(data:font/ttf;base64,${poppinsReg})}</style>
  <pattern id="dots" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="${blue}" opacity=".18"/></pattern>
  <pattern id="dotsOrange" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="${orange}" opacity=".22"/></pattern>
  <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%"><feDropShadow dx="10" dy="12" stdDeviation="0" flood-color="${ink}"/></filter>
  <clipPath id="photoClip"><rect x="0" y="0" width="1" height="1" rx="0"/></clipPath>
 </defs>`

async function cropData(file, crop) {
  const buffer = await sharp(file).extract(crop).resize(720, 900, {fit:'cover',position:'centre'}).jpeg({quality:90}).toBuffer()
  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

function comicMarks(page, idx) {
  const orangeBurst = `<path d="M948 46l14 28 31-11-12 31 31 13-30 14 13 31-32-9-11 31-15-28-29 18 4-33-34-4 25-23-20-27 33 4 7-33 25 22z" fill="${orange}" stroke="${ink}" stroke-width="5"/>`
  const badge = `<circle cx="52" cy="98" r="40" fill="${idx%2?orange:blue}" stroke="${ink}" stroke-width="5"/><text x="52" y="108" text-anchor="middle" font-family="Bricolage" font-size="26" font-weight="800" fill="white">${page.n}</text>`
  return badge + (idx===0 ? '' : orangeBurst)
}

async function render(page, idx) {
  const source = page.kind === 'close' ? closePath : coverPath
  const sourceData = (page.kind === 'cover' || page.kind === 'close') ? `data:image/png;base64,${(await fs.readFile(source)).toString('base64')}` : await cropData(source, page.crop)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}`
  if (page.kind === 'cover') {
    svg += `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" href="${sourceData}"/><path d="M0 0H1080V1350H0Z" fill="none" stroke="${ink}" stroke-width="14"/>`
    svg += `<rect x="58" y="38" width="666" height="322" rx="5" fill="${paper}" stroke="${ink}" stroke-width="8" filter="url(#shadow)"/><rect x="58" y="38" width="666" height="322" fill="url(#dots)" opacity=".48"/>`
    svg += `<text x="96" y="107" font-family="Poppins" font-size="22" font-weight="700" letter-spacing="1.3" fill="${blue}">LABORATORIO EFEONCE · SANTIAGO</text>`
    svg += lines(page.title, 93, 153, 59, 49, 'Bricolage', 850, ink)
    svg += `<rect x="96" y="278" width="470" height="5" fill="${orange}"/>${lines(page.body,96,318,32,23,'PoppinsR',400,ink)}`
    svg += `<path d="M755 67h266q25 0 25 25v94q0 26-25 26H825l-35 36 4-36h-39q-25 0-25-26V92q0-25 25-25" fill="white" stroke="${ink}" stroke-width="7"/><text x="784" y="119" font-family="Bricolage" font-size="25" font-weight="700" fill="${ink}">Nexa:</text><text x="784" y="156" font-family="Poppins" font-size="20" font-weight="700" fill="${ink}">«Primero, contexto.</text><text x="784" y="185" font-family="Poppins" font-size="20" font-weight="700" fill="${ink}">Después, experimento.»</text>`
    svg += `<rect x="0" y="1248" width="1080" height="102" fill="${paper}" stroke="${ink}" stroke-width="8"/><text x="60" y="1308" font-family="Poppins" font-size="22" font-weight="700" fill="${ink}">YO, EL PROFESOR, CAMBIO LA RECETA.</text>${logoSvg(806,1274,216)}`
  } else if (page.kind === 'close') {
    svg += `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" href="${sourceData}"/><path d="M0 0H1080V1350H0Z" fill="none" stroke="${ink}" stroke-width="14"/>`
    svg += `<rect x="58" y="52" width="728" height="486" rx="4" fill="${paper}" stroke="${ink}" stroke-width="8" filter="url(#shadow)"/><rect x="58" y="52" width="728" height="486" fill="url(#dotsOrange)" opacity=".4"/>`
    svg += `<text x="95" y="112" font-family="Poppins" font-size="22" font-weight="700" letter-spacing="1.5" fill="${orange}">${esc(page.label)}</text>`
    svg += lines(page.title,96,195,72,51,'Bricolage',850,ink)
    svg += `<rect x="96" y="421" width="630" height="5" fill="${blue}"/>${lines('Revisar, corregir y volver a mezclar',96,466,34,22,'PoppinsR',400,ink)}${lines('también es diseñar.',96,499,34,22,'PoppinsR',400,ink)}`
    svg += `<rect x="0" y="1117" width="1080" height="233" fill="${paper}" stroke="${ink}" stroke-width="8"/><text x="66" y="1173" font-family="Poppins" font-size="20" font-weight="700" fill="${blue}">LA FÓRMULA</text>${lines('Contexto + idea + dirección + ejecución + criterio',66,1226,34,25,'Bricolage',750,ink)}<text x="66" y="1295" font-family="Poppins" font-size="22" font-weight="700" fill="${orange}">GUÁRDALO PARA TU PRÓXIMA PIEZA  →</text>${logoSvg(806,1284,216)}`
  } else {
    const photoX = page.photoSide === 'left' ? 48 : 526
    const textX = page.photoSide === 'left' ? 572 : 72
    const photoW = 506, photoY = 206, photoH = 1010
    const blob = await sharp(Buffer.from(sourceData.split(',')[1],'base64')).png().toBuffer()
    svg += `<rect x="0" y="0" width="1080" height="1350" fill="${paper}"/><rect x="0" y="0" width="1080" height="180" fill="${idx%2?blue:ink}"/>`
    svg += `<text x="145" y="67" font-family="Poppins" font-size="18" font-weight="700" letter-spacing="1.6" fill="white">LA RECETA DE UNA PIEZA DIGITAL</text><text x="145" y="131" font-family="Bricolage" font-size="30" font-weight="800" fill="white">${esc(page.label)}</text>`
    svg += `<rect x="${photoX+9}" y="${photoY+11}" width="${photoW}" height="${photoH}" fill="${idx%2?orange:blue}" stroke="${ink}" stroke-width="7"/>`
    svg += `<image x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,${blob.toString('base64')}" stroke="${ink}" stroke-width="7"/>`
    svg += `<path d="M${photoX} ${photoY}h${photoW}v${photoH}H${photoX}z" fill="none" stroke="${ink}" stroke-width="8"/>`
    svg += `<rect x="${textX-12}" y="${photoY+30}" width="454" height="${idx===5?660:700}" fill="white" stroke="${ink}" stroke-width="7" filter="url(#shadow)"/><rect x="${textX-12}" y="${photoY+30}" width="454" height="16" fill="${idx%2?orange:blue}"/>`
    svg += lines(page.title,textX+18,photoY+142,64,48,'Bricolage',850,ink)
    const bodyY = photoY + (page.title.split('\n').length*64) + 198
    svg += lines(page.body.split('\n').flatMap((p)=>p===''?['']:wrap(p,30)).join('\n'), textX+18,bodyY,34,23,'PoppinsR',400,ink)
    svg += `<path d="M0 1270H1080V1350H0Z" fill="${paper}" stroke="${ink}" stroke-width="7"/><text x="57" y="1320" font-family="Poppins" font-size="18" font-weight="700" letter-spacing="1" fill="${ink}">DEL LABORATORIO DEL PROFESOR · EFEONCE</text>${logoSvg(806,1284,216)}`
    if (idx===1 || idx===4) svg += `<rect x="${photoX+24}" y="${photoY+35}" width="178" height="53" rx="24" fill="${orange}" stroke="${ink}" stroke-width="5" transform="rotate(-8 ${photoX+24} ${photoY+35})"/><text x="${photoX+39}" y="${photoY+70}" font-family="Bricolage" font-size="25" font-weight="900" fill="white">${esc(page.tag)}</text>`
    if (idx===3) svg += `<rect x="${photoX+35}" y="${photoY+750}" width="234" height="60" fill="${blue}" stroke="${ink}" stroke-width="5"/><text x="${photoX+48}" y="${photoY+789}" font-family="Poppins" font-size="20" font-weight="700" fill="white">${esc(page.tag)}</text>`
  }
  svg += comicMarks(page,idx)
  svg += `</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

function wrap(text, max) {
  const words = text.split(/\s+/); const out=[]; let line=''
  for (const word of words) { const next=line ? `${line} ${word}` : word; if (next.length>max && line) {out.push(line);line=word} else line=next }
  if (line) out.push(line)
  return out
}

const outDir = path.join(root,'finales')
const pdf = await PDFDocument.create()
for (let i=0;i<pages.length;i++) {
  const page=pages[i]; const png=await render(page,i)
  const filename=`${String(i+1).padStart(2,'0')}-${['portada','brief','identidad-assets','canal-formato','concepto-direccion','prompt-modelo','ingrediente-x'][i]}.png`
  await fs.writeFile(path.join(outDir,filename),png)
  const embedded=await pdf.embedPng(png); const p=pdf.addPage([576,720]); p.drawImage(embedded,{x:0,y:0,width:576,height:720})
}
await fs.writeFile(path.join(outDir,'linkedin-carrusel-design-contexto.pdf'),await pdf.save())
console.log(`Rendered ${pages.length} PNG slides and LinkedIn PDF in ${outDir}`)
