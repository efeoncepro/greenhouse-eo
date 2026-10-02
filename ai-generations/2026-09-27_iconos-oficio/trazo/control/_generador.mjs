import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_iconos-oficio/trazo'
mkdirSync(OUT, { recursive: true })
const f = (n) => +n.toFixed(2)
const P = (x, y) => `${f(x)} ${f(y)}`
const G = {}
const add = (key, label, use, mode, rest, response, dot) => { G[key] = { key, label, use, mode, rest, response: mode === 'complete' ? rest : response, dot } }

// 1 correo: sobre; la esfera sella el vértice de la solapa (replace)
{
  const ENV = 'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z'
  const vx = 12, vy = 12.5
  const L = Math.hypot(9, 5.5), ux = 9 / L, uy = 5.5 / L, cut = 3.1
  add('correo', 'Correo', 'Revenue · email marketing, correo', 'replace',
    [ENV, 'M3 7l9 5.5l9 -5.5'],
    [ENV, `M3 7L${P(vx - ux * cut, vy - uy * cut)}`, `M21 7L${P(vx + ux * cut, vy - uy * cut)}`],
    [vx, vy])
}
// 2 telefono: auricular + dos ondas; la onda externa se vuelve esfera (replace)
{
  const H = 'M5.5 4h3.5l1.5 4.5l-2 1.25a10.5 10.5 0 0 0 5.75 5.75l1.25 -2l4.5 1.5v3.5a1.5 1.5 0 0 1 -1.5 1.5a16 16 0 0 1 -14.5 -14.5a1.5 1.5 0 0 1 1.5 -1.5z'
  add('telefono', 'Teléfono', 'Área · llamadas, contacto', 'replace',
    [H, 'M14.5 7a2.5 2.5 0 0 1 2.5 2.5', 'M14.5 4a5.5 5.5 0 0 1 5.5 5.5'],
    [H, 'M14.5 7a2.5 2.5 0 0 1 2.5 2.5'],
    [18.5, 5.5])
}
// 3 calendario: el día marcado se vuelve esfera (replace)
{
  const B = 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z'
  const base = [B, 'M8 3v4', 'M16 3v4', 'M3 10h18', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01', 'M8 17.5h.01', 'M12 17.5h.01']
  add('calendario', 'Calendario', 'Growth · agenda, fechas', 'replace', [...base, 'M16 17.5h.01'], base, [16, 17.5])
}
// 4 reunion: dos globos; la esfera aparece en el globo del frente (complete)
{
  const FRONT = 'M5 8h8a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-5l-3 3v-3a2 2 0 0 1 -2 -2v-5a2 2 0 0 1 2 -2z'
  const BACK = 'M9 8v-3a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2v3l-3 -3h-1'
  add('reunion', 'Reunión', 'Área · reuniones, conversación', 'complete', [FRONT, BACK], null, [9, 12.5])
}
// 5 objetivo: diana; el centro se vuelve esfera (replace)
{
  const c = (r) => `M${12 - r} 12a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
  add('objetivo', 'Objetivo', 'Growth · objetivos, metas, KPI', 'replace', [c(9.5), c(5.75), 'M12 12h.01'], [c(9.5), c(5.75)], [12, 12])
}
// 6 presentacion: pizarra en trípode; la esfera es el punto que se presenta (complete)
{
  const BOARD = 'M4.5 3.5h15a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1 -1.5 1.5h-15a1.5 1.5 0 0 1 -1.5 -1.5v-8.5a1.5 1.5 0 0 1 1.5 -1.5z'
  add('presentacion', 'Presentación', 'Growth · presentaciones, workshops', 'complete',
    [BOARD, 'M7 8h5', 'M7 11h8', 'M12 15v6', 'M8.5 15l-2.5 6', 'M15.5 15l2.5 6'], null, [16.5, 7.75])
}
// 7 contrato: documento; el final de la línea de firma se vuelve esfera (replace)
{
  const DOC = 'M6 3h8l4 4v14h-12z'
  const base = [DOC, 'M14 3v4h4', 'M9 8.5h2', 'M9 12h6']
  add('contrato', 'Contrato', 'Área · contratos, acuerdos', 'replace', [...base, 'M9 17h6'], [...base, 'M9 17h2.25'], [14.5, 17])
}
// 8 checklist: dos ítems hechos y uno pendiente; la esfera cierra el pendiente (complete)
{
  add('checklist', 'Checklist', 'Área · tareas, entregables', 'complete',
    ['M3.5 6l1.75 1.75l3 -3', 'M11 6h9.5', 'M3.5 12l1.75 1.75l3 -3', 'M11 12h9.5', 'M11 18h9.5'], null, [5.75, 18])
}
// 9 codigo: </>; la barra se vuelve esfera (replace)
{
  add('codigo', 'Código', 'Engine · desarrollo, código', 'replace',
    ['M7.5 7.5l-4.5 4.5l4.5 4.5', 'M16.5 7.5l4.5 4.5l-4.5 4.5', 'M13.75 5l-3.5 14'],
    ['M7.5 7.5l-4.5 4.5l4.5 4.5', 'M16.5 7.5l4.5 4.5l-4.5 4.5'], [12, 12])
}
// 10 base-de-datos: cilindro (óvalos de 4 arcos circulares); la esfera aparece en la cara superior (complete)
{
  const a = 8, b = 3.25, r2 = 2, r1 = ((a - r2) ** 2 + b * b - r2 * r2) / (2 * (b - r2))
  const S = a - r2, Bd = r1 - b
  const n = Math.hypot(S, Bd), jx = S + (r2 * S) / n, jy = (r2 * Bd) / n
  const X = (dx) => f(12 + dx)
  const oval = (cy) => `M${X(-a)} ${cy}A${r2} ${r2} 0 0 1 ${X(-jx)} ${f(cy - jy)}A${f(r1)} ${f(r1)} 0 0 1 ${X(jx)} ${f(cy - jy)}A${r2} ${r2} 0 0 1 ${X(a)} ${cy}A${r2} ${r2} 0 0 1 ${X(jx)} ${f(cy + jy)}A${f(r1)} ${f(r1)} 0 0 1 ${X(-jx)} ${f(cy + jy)}A${r2} ${r2} 0 0 1 ${X(-a)} ${cy}z`
  const bottom = (cy) => `M${X(-a)} ${cy}A${r2} ${r2} 0 0 0 ${X(-jx)} ${f(cy + jy)}A${f(r1)} ${f(r1)} 0 0 0 ${X(jx)} ${f(cy + jy)}A${r2} ${r2} 0 0 0 ${X(a)} ${cy}`
  const ty = 5.5, my = 11.75, by = 18
  add('base-de-datos', 'Base de datos', 'Engine · datos, bases de datos', 'complete',
    [oval(ty), `M${X(-a)} ${ty}V${by}`, `M${X(a)} ${ty}V${by}`, bottom(my), bottom(by)], null, [12, ty])
}
// 11 nube: unión de tres círculos; la esfera aparece dentro (complete)
{
  const C1 = [6.75, 14, 4], C2 = [11.75, 10.25, 5.25], C3 = [17.25, 13.5, 4.5]
  const inter = (a, b, pickUpper) => {
    const [x0, y0, r0] = a, [x1, y1, r1] = b
    const d = Math.hypot(x1 - x0, y1 - y0), A = (r0 * r0 - r1 * r1 + d * d) / (2 * d), h = Math.sqrt(r0 * r0 - A * A)
    const xm = x0 + (A * (x1 - x0)) / d, ym = y0 + (A * (y1 - y0)) / d
    const p1 = [xm + (h * (y1 - y0)) / d, ym - (h * (x1 - x0)) / d], p2 = [xm - (h * (y1 - y0)) / d, ym + (h * (x1 - x0)) / d]
    return p1[1] < p2[1] ? p1 : p2
  }
  const i32 = inter(C3, C2), i21 = inter(C2, C1)
  const d = `M${P(C1[0], 18)}H${f(C3[0])}A${C3[2]} ${C3[2]} 0 0 0 ${P(...i32)}A${C2[2]} ${C2[2]} 0 0 0 ${P(...i21)}A${C1[2]} ${C1[2]} 0 0 0 ${P(C1[0], 18)}z`
  add('nube', 'Nube', 'Engine · nube, hosting', 'complete', [d], null, [12, 14.25])
}
// 12 integracion: dos mitades de un conector, separadas; la esfera las une (complete)
{
  const th = -Math.PI / 4, cs = Math.cos(th), sn = Math.sin(th)
  const R = (x, y) => { const dx = x - 12, dy = y - 12; return P(12 + dx * cs - dy * sn, 12 + dx * sn + dy * cs) }
  const r = 4
  const left = `M${R(8.25, 12 - r)}L${R(8.25, 12 + r)}L${R(7, 12 + r)}A${r} ${r} 0 0 1 ${R(7, 12 - r)}z`
  const right = `M${R(15.25, 12 - r)}L${R(15.25, 12 + r)}L${R(16.5, 12 + r)}A${r} ${r} 0 0 0 ${R(16.5, 12 - r)}z`
  add('integracion', 'Integración', 'Revenue · integraciones, conectores', 'complete',
    [left, right, `M${R(8.25, 10)}L${R(9.5, 10)}`, `M${R(8.25, 14)}L${R(9.5, 14)}`, `M${R(3, 12)}L${R(1, 12)}`, `M${R(20.5, 12)}L${R(22.75, 12)}`], null, [12, 12])
}
// 13 seguridad: candado; el ojo de la cerradura se vuelve esfera (replace)
{
  const BODY = 'M6.5 10.5h11a2.5 2.5 0 0 1 2.5 2.5v5.5a2.5 2.5 0 0 1 -2.5 2.5h-11a2.5 2.5 0 0 1 -2.5 -2.5v-5.5a2.5 2.5 0 0 1 2.5 -2.5z'
  const SH = 'M7.5 10.5v-3a4.5 4.5 0 0 1 9 0v3'
  add('seguridad', 'Seguridad', 'Engine · seguridad, privacidad', 'replace', [BODY, SH, 'M12 14.75v1.75'], [BODY, SH], [12, 15.75])
}
// 14 ubicacion: pin; el ojo del pin se vuelve esfera (replace)
{
  const cx = 12, cy = 9.5, Rr = 7, tip = 21.5
  const dd = tip - cy, beta = Math.acos(Rr / dd)
  const tx = Rr * Math.sin(beta), ty = cy + Rr * Math.cos(beta)
  const PIN = `M${cx} ${tip}L${P(cx - tx, ty)}A${Rr} ${Rr} 0 1 1 ${P(cx + tx, ty)}z`
  add('ubicacion', 'Ubicación', 'Área · ubicación, oficinas', 'replace', [PIN, 'M9.5 9.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0'], [PIN], [cx, cy])
}
// 15 reloj: la punta del minutero se vuelve esfera (replace)
{
  const FACE = 'M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0'
  add('reloj', 'Reloj', 'Área · plazos, tiempo', 'replace', [FACE, 'M12 6.5v5.5h3.5'], [FACE, 'M12 9.75v2.25h3.5'], [12, 6.5])
}

for (const g of Object.values(G)) writeFileSync(`${OUT}/${g.key}.json`, JSON.stringify(g, null, 2) + '\n')
console.log(Object.keys(G).join(' '))
