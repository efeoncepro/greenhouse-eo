import path from 'node:path'
import { componer } from './capas.mjs'
import * as M from '../brief/matriz.mjs'
const RUN='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-19_capa-grafica-foto'
const TODAS=[...M.piezas,...M.piezas2,...M.piezas3,...M.piezas4,...M.piezasG,...M.piezasG2]
const base=TODAS.find(p=>p.id==='V42-45-todo-junto')
const plate=path.resolve(RUN, base.plate)
const textos={
  'acento al INICIO':'[[La obra]], a la vista.',
  'acento al MEDIO':'La [[obra]], a la vista.',
  'acento al FINAL':'La obra, a la [[vista]].'
}
console.log('posición del acento en la línea   resultado')
for(const [n,t] of Object.entries(textos)){
  const p=JSON.parse(JSON.stringify(base))
  p.capas[0].texto=t
  try{
    const {informe}=await componer({pieza:p, plate})
    const s=informe.find(c=>c.tipo==='seleccion')
    console.log('  '+n.padEnd(32)+(s.pasa?'✓ pasa':'✗ '+(s.evidencia.sinCombinacionValida?'ninguna ancla cabe':'falla')))
  }catch(e){console.log('  '+n.padEnd(32)+'error '+e.message.slice(0,40))}
}
