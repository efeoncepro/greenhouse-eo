import path from 'node:path'
import { componer } from './capas.mjs'
import { piezas, piezas2, piezas3, piezas4, piezasG, piezasG2 } from '../brief/matriz.mjs'
const TODAS = [...piezas, ...piezas2, ...piezas3, ...piezas4, ...piezasG, ...piezasG2]
const RUN='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-19_capa-grafica-foto'
const base=TODAS.find(p=>p.id==='V33-916-caja-objeto')
const plate=path.resolve(RUN, base.plate)
const REGIONES=['upper-start','upper-center','upper-end','center-start','center','center-end','lower-start','lower-center','lower-end']
console.log('región         placa de Nexa contra la foto')
for(const r of REGIONES){
  const pieza=JSON.parse(JSON.stringify(base))
  const sel=pieza.capas.find(c=>c.tipo==='seleccion')
  sel.cursores=sel.cursores.map(c=>c.estado==='moving'?{...c,region:r}:c)
  try{
    const {informe}=await componer({pieza, plate})
    const s=informe.find(c=>c.tipo==='seleccion')
    const pl=s.evidencia.contrastePlacaContraFoto[0]
    const fuera=!s.evidencia.dentroDelLienzo||s.evidencia.placasPegadasAlBorde.length
    console.log('  '+r.padEnd(15)+(pl?pl.contraste:'—')+(pl&&pl.contraste>=3?' ✓':'  ')+(fuera?' (fuera del lienzo)':''))
  }catch(e){console.log('  '+r.padEnd(15)+'error: '+e.message.slice(0,50))}
}
