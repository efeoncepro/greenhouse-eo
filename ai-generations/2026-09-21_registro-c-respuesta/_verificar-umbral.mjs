// ¿El `top` declarado sobrevive a un umbral más bajo? Si al bajar el umbral aparece sujeto MÁS ARRIBA,
// mi medición se saltó una parte oscura del sujeto y la guarda quedó optimista — el lado peligroso.
import sharp from 'sharp'; import { readFile } from 'node:fs/promises'
const piezas = JSON.parse(await readFile(process.argv[2],'utf8'))
for (const p of piezas) {
  if (!p.subjectProtection) { console.log(`${p.id}\t(false)`); continue }
  const lay = JSON.parse(await readFile(`out/${p.id}-layout.json`,'utf8'))
  const bs = lay.elements.map(e=>e.box)
  const x0=Math.round(Math.min(...bs.map(b=>b.left))), x1=Math.round(Math.max(...bs.map(b=>b.right)))
  const fondo = Math.round(Math.max(...bs.map(b=>b.bottom)))   // el borde inferior del texto
  const { data, info } = await sharp(p.plate).greyscale().raw().toBuffer({resolveWithObject:true})
  const tops={}
  for (const u of [0.42,0.25,0.15,0.10]) {
    let t=null
    for(let y=0;y<info.height&&t===null;y++){let n=0
      for(let x=x0;x<x1;x++) if(data[y*info.width+x]/255>u) n++
      if(n>=25) t=y}
    tops[u]=t
  }
  const decl=p.subjectProtection.top, min=tops[0.10]
  const holgura = min - 24 - fondo
  console.log(`${p.id}\tdeclarado=${decl}\t0.42=${tops[0.42]} 0.25=${tops[0.25]} 0.15=${tops[0.15]} 0.10=${tops[0.10]}\ttexto termina=${fondo}\tholgura=${holgura}${holgura<0?'  🔴 EL TEXTO PISA':''}`)
}
