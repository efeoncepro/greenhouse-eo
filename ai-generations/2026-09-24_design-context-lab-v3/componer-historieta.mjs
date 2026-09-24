import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

const root = path.dirname(new URL(import.meta.url).pathname)
const repo = path.resolve(root, '../..')
const W = 1080, H = 1350
const ink = '#111111', paper = '#F5F0E6', blue = '#0375DB', orange = '#F55D01', white = '#FFFFFF'
const photos = {
  lab: path.join(root,'plates/01-laboratorio.png'),
  ingredients: path.join(root,'plates/02-ingredientes.png'),
  mix: path.join(root,'plates/03-mezcla.png'),
  review: path.join(root,'plates/04-revision.png'),
}
const fontB = (await fs.readFile(path.join(repo,'src/assets/fonts/BricolageGrotesque-Variable.ttf'))).toString('base64')
const fontP = (await fs.readFile(path.join(repo,'src/assets/fonts/Poppins-Bold.ttf'))).toString('base64')
const fontR = (await fs.readFile(path.join(repo,'src/assets/fonts/Poppins-Regular.ttf'))).toString('base64')
const logo = (await fs.readFile(path.join(repo,'public/branding/logo-full.svg'))).toString('base64')

const pages = [
  { header:'LA MISIÓN', panels:[
    {photo:'lab',crop:{left:0,top:240,width:1152,height:500},box:{x:24,y:102,w:1032,h:383},caption:'SANTIAGO · LABORATORIO EFEONCE',captionKind:'narrator'},
    {photo:'lab',crop:{left:100,top:270,width:470,height:540},box:{x:24,y:499,w:506,h:325},bubble:['EL PROFESOR','Hoy toca crear una pieza digital.'],bubbleAt:'bottom'},
    {photo:'lab',crop:{left:625,top:275,width:470,height:540},box:{x:550,y:499,w:506,h:325},bubble:['NEXA','¿Qué necesitamos saber antes de mezclar?'],bubbleAt:'bottom'},
    {photo:'ingredients',crop:{left:0,top:360,width:1152,height:530},box:{x:24,y:840,w:1032,h:390},caption:'¡LOS INGREDIENTES DEL CONTEXTO!',captionKind:'action'},
  ]},
  { header:'LOS INGREDIENTES', panels:[
    {photo:'ingredients',crop:{left:0,top:210,width:740,height:480},box:{x:24,y:102,w:690,h:410},caption:'NEXA PONE EL BRIEF JUNTO A LA OLLA.',captionKind:'narrator'},
    {photo:'ingredients',crop:{left:760,top:400,width:390,height:550},box:{x:734,y:102,w:322,h:410},bubble:['NEXA','¿Para quién es y qué debe lograr?'],bubbleAt:'bottom'},
    {photo:'ingredients',crop:{left:0,top:590,width:610,height:590},box:{x:24,y:530,w:440,h:700},bubble:['EL PROFESOR','Audiencia, mensaje y acción.'],bubbleAt:'bottom'},
    {photo:'mix',crop:{left:0,top:370,width:1152,height:650},box:{x:484,y:530,w:572,h:700},caption:'IDENTIDAD, FORMATO, IDEA Y DIRECCIÓN.',captionKind:'action'},
  ]},
  { header:'LA REVELACIÓN', panels:[
    {photo:'mix',crop:{left:0,top:280,width:1152,height:470},box:{x:24,y:102,w:1032,h:365},caption:'CON CONTEXTO, ELEGIMOS PROMPT + MODELO PARA EJECUTAR LA IDEA.',captionKind:'narrator'},
    {photo:'mix',crop:{left:315,top:700,width:520,height:430},box:{x:24,y:483,w:506,h:340},sfx:'¡PLOP!'},
    {photo:'review',crop:{left:180,top:370,width:790,height:540},box:{x:550,y:483,w:506,h:340},bubble:['NEXA','¿Se entiende? ¿Se siente de marca? ¿Funciona aquí?'],bubbleAt:'bottom'},
    {photo:'review',crop:{left:0,top:670,width:1152,height:480},box:{x:24,y:840,w:1032,h:390},caption:'¡EL INGREDIENTE X ERA EL CRITERIO!',captionKind:'reveal',sub:'Contexto + idea + dirección + ejecución + criterio = pieza con intención.  ·  Guárdalo para tu próxima pieza.'},
  ]},
]

const esc = s => String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const defs = `<defs>
 <style>@font-face{font-family:Bricolage;src:url(data:font/ttf;base64,${fontB})} @font-face{font-family:Poppins;src:url(data:font/ttf;base64,${fontP})} @font-face{font-family:PoppinsR;src:url(data:font/ttf;base64,${fontR})}</style>
 <pattern id="halftone" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.15" fill="${blue}" opacity=".28"/></pattern>
 <pattern id="dots-orange" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.25" fill="${orange}" opacity=".3"/></pattern>
 <filter id="panel-shadow" x="-15%" y="-15%" width="140%" height="145%"><feDropShadow dx="7" dy="8" stdDeviation="0" flood-color="${ink}"/></filter>
 <clipPath id="comic-frame"><rect x="0" y="0" width="1" height="1"/></clipPath>
 </defs>`

async function photoData(key,crop,w,h){
  const bytes=await sharp(photos[key]).extract(crop).resize(w,h,{fit:'cover',position:'centre'}).jpeg({quality:91}).toBuffer()
  return `data:image/jpeg;base64,${bytes.toString('base64')}`
}
function wrapLine(s,maxChars){const out=[];let line='';for(const word of s.split(/\s+/)){const t=line?`${line} ${word}`:word;if(t.length>maxChars&&line){out.push(line);line=word}else line=t}if(line)out.push(line);return out}
function textLines(text,x,y,sz,lineH,family='Poppins',weight=700,fill=ink,anchor='start'){
  const rows=String(text).split('\n').flatMap(l=>l===''?['']:wrapLine(l,Math.max(8,Math.floor(620/(sz*.55)))))
  return rows.map((r,i)=>`<text x="${x}" y="${y+i*lineH}" text-anchor="${anchor}" font-family="${family}" font-size="${sz}" font-weight="${weight}" fill="${fill}">${esc(r)}</text>`).join('')
}
function burst(x,y,scale=1,fill=orange){
 const pts=[]; for(let i=0;i<20;i++){const a=-Math.PI/2+i*Math.PI/10;const r=(i%2?30:45)*scale;pts.push(`${x+Math.cos(a)*r},${y+Math.sin(a)*r}`)}
 return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${ink}" stroke-width="4"/>`
}
function bubble(x,y,w,h,who,copy){
 const copyLines=wrapLine(copy,Math.max(18,Math.floor((w-44)/13)))
 const boxH=h-20
 const title=`<text x="${x+22}" y="${y+27}" font-family="Poppins" font-size="15" font-weight="700" letter-spacing=".7" fill="${blue}">${esc(who)}</text>`
 const body=copyLines.map((line,i)=>`<text x="${x+22}" y="${y+54+i*23}" font-family="PoppinsR" font-size="18" font-weight="500" fill="${ink}">${esc(line)}</text>`).join('')
 const tail=`<path d="M${x+72} ${y+boxH-2}l-14 20 37-20z" fill="${white}" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`
 const patch=`<path d="M${x+12} ${y+boxH-1}h88" stroke="${white}" stroke-width="7"/>`
 return `<rect x="${x+5}" y="${y+7}" width="${w}" height="${boxH}" rx="18" fill="${ink}"/><rect x="${x}" y="${y}" width="${w}" height="${boxH}" rx="18" fill="${white}" stroke="${ink}" stroke-width="5"/>${tail}${patch}${title}${body}`
}
function captionBox(x,y,w,h,text,kind='narrator',sub=''){
 const isAction=kind==='action'||kind==='reveal'; const bg=kind==='action'||kind==='reveal'?orange:paper
 const fg=kind==='action'||kind==='reveal'?white:ink
 const label=kind==='narrator'?`<text x="${x+13}" y="${y+20}" font-family="Poppins" font-size="12" font-weight="700" letter-spacing="1.2" fill="${blue}">NARRADOR</text>`:''
 const rows=wrapLine(text,Math.max(14,Math.floor((w-28)/(kind==='action'||kind==='reveal'?18:14))))
 const sy=y+(label?48:34)
 const main=rows.map((line,i)=>`<text x="${x+14}" y="${sy+i*(isAction?31:24)}" font-family="Bricolage" font-size="${isAction?24:18}" font-weight="780" fill="${fg}">${esc(line)}</text>`).join('')
 const subTxt=sub?`<text x="${x+14}" y="${y+h-14}" font-family="PoppinsR" font-size="17" font-weight="500" fill="${fg}">${esc(sub)}</text>`:''
 return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}" stroke="${ink}" stroke-width="4"/>${label}${main}${subTxt}`
}

async function renderPage(page,pIndex){
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}<rect width="${W}" height="${H}" fill="${paper}"/><rect x="0" y="0" width="1080" height="70" fill="${ink}"/><rect x="0" y="70" width="1080" height="15" fill="${blue}"/><text x="29" y="45" font-family="Poppins" font-size="17" font-weight="700" letter-spacing="2" fill="white">LABORATORIO EFEONCE  ·  DESIGN CONTEXT</text><text x="1050" y="47" text-anchor="end" font-family="Bricolage" font-size="24" font-weight="800" fill="${orange}">${page.header}  /  0${pIndex+1}</text>`
 for(let i=0;i<page.panels.length;i++){
   const p=page.panels[i],{x,y,w,h}=p.box
   const data=await photoData(p.photo,p.crop,w,h)
   svg+=`<rect x="${x+5}" y="${y+7}" width="${w}" height="${h}" fill="${i%2?orange:blue}" stroke="${ink}" stroke-width="7"/><image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" href="${data}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${ink}" stroke-width="8"/>`
   if(p.caption){
     const bh=p.captionKind==='action'?90:(p.captionKind==='reveal'?122:78)
     const by=y+h-bh
     svg+=captionBox(x+10,by,w-20,bh,p.caption,p.captionKind,p.sub)
   }
   if(p.bubble){
     const bh=p.bubble[1].length>42?132:116
     svg+=bubble(x+18,y+h-bh-15,w-36,bh,p.bubble[0],p.bubble[1])
   }
   if(p.ribbon){
     const tagW=Math.min(w-38,Math.max(170,p.ribbon.length*12+38))
     const capH=148, capY=y+h-capH
     svg+=`<rect x="${x+8}" y="${capY}" width="${w-16}" height="${capH-8}" fill="${paper}" stroke="${ink}" stroke-width="5"/>`
     svg+=`<path d="M${x+8} ${capY+37}h${w-16}" stroke="${i%2?blue:orange}" stroke-width="8"/>`
     svg+=`<text x="${x+24}" y="${capY+29}" font-family="Poppins" font-size="15" font-weight="700" letter-spacing=".4" fill="${i%2?blue:orange}">${esc(p.ribbon)}</text>`
     svg+=textLines(p.text,x+24,capY+78,21,29,'Bricolage',750,ink)
   }
   if(p.sfx){
     svg+=burst(x+w-75,y+65,.95,orange)
     svg+=`<text x="${x+w-75}" y="${y+72}" text-anchor="middle" transform="rotate(-9 ${x+w-75} ${y+72})" font-family="Bricolage" font-size="23" font-weight="900" fill="white" stroke="${ink}" stroke-width="1">${esc(p.sfx)}</text>`
   }
 }
 svg+=`<rect x="0" y="1274" width="1080" height="76" fill="${paper}" stroke="${ink}" stroke-width="6"/><text x="27" y="1321" font-family="Poppins" font-size="15" font-weight="700" letter-spacing="1.2" fill="${ink}">UN EXPERIMENTO DE DIRECCIÓN CREATIVA · 0${pIndex+1}/03</text><image x="850" y="1291" width="198" height="47" href="data:image/svg+xml;base64,${logo}"/><rect x="0" y="1338" width="1080" height="12" fill="${orange}"/></svg>`
 return sharp(Buffer.from(svg)).png().toBuffer()
}

const outDir=path.join(root,'finales')
const pdf=await PDFDocument.create()
for(let i=0;i<pages.length;i++){
 const png=await renderPage(pages[i],i)
 const name=`0${i+1}-pagina-${['mision','receta','revelacion'][i]}.png`
 await fs.writeFile(path.join(outDir,name),png)
 const emb=await pdf.embedPng(png);const p=pdf.addPage([576,720]);p.drawImage(emb,{x:0,y:0,width:576,height:720})
}
await fs.writeFile(path.join(outDir,'linkedin-fotocomics-design-context.pdf'),await pdf.save())
console.log(`Rendered ${pages.length} comic pages; 4 photographic panels per page.`)
