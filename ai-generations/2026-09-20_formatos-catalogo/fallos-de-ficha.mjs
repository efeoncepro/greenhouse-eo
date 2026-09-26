// La prosa de la ficha sabe cosas que su verbatim no dice. Mi armador leía SOLO las líneas
// SCENE y FOREGROUND del bloque citado, así que descartaba todo lo que la ficha aprendió.
//
// 🔴 Caso fuente: generé T10-macro en los tres formatos. Su propia ficha dice «Fallo de serie:
// es pintura, y la serie tenía demasiadas piezas de pintura → nosotros NO somos Berel». El
// catálogo ya la había descartado y yo pagué tres planchas para redescubrirlo.
//
// Dos clases, y sólo una bloquea:
//   · «Fallo de serie» → descalifica la toma entera. BLOQUEA.
//   · «Fallos y fix»   → aprendizaje; la mayoría ya está incorporado al verbatim, pero algunos
//                        son CRITERIOS que nadie aplica si no los lee. Se muestran, no bloquean.
import fs from 'node:fs'

const doc = fs.readFileSync('docs/operations/brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md', 'utf8')
const fichas = doc.split(/\n### 3\.(\d+) /).slice(1)
export const NOTAS = {}

for (let i = 0; i < fichas.length; i += 2) {
  const n = fichas[i]
  // 🔴 La nota va DESPUÉS del verbatim, no antes: buscarla sólo en el encabezado daba cero
  // hallazgos y dejaba pasar justo la que bloquea. Se lee la ficha entera.
  const cuerpo = fichas[i + 1]
  const linea = (cuerpo.match(/^- \*\*Fallos?[^\n]*(?:\n  [^\n-][^\n]*)*/m) ?? [''])[0]
  if (!linea) continue
  NOTAS[n] = {
    texto: linea.replace(/^- \*\*Fallos?[^:]*:\*\*\s*/, '').replace(/\s+/g, ' ').trim(),
    bloquea: /Fallo de serie/.test(linea)
  }
}

if (process.argv[1].endsWith('fallos-de-ficha.mjs')) {
  for (const [n, e] of Object.entries(NOTAS)) {
    console.log(`${e.bloquea ? '🔴 BLOQUEA' : '  aviso  '}  T${n}  ${e.texto.slice(0, 118)}`)
  }
  console.log(`\n  ${Object.values(NOTAS).filter(e => e.bloquea).length} bloqueante(s) de ${Object.keys(NOTAS).length} fichas con nota`)
}
