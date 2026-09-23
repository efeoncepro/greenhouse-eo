// `pnpm foto:componer:cta:mutantes [--solo <nombre,...>] [--jobs <n>]` — puntuación de mutantes del compositor de CTA.
//
// Una guarda que ningún mutante hace fallar no está probada (auditoría adversarial 2026-09-23, hallazgo 16). Este
// catálogo rompe a propósito cada guarda —en el compositor, en el gate, en el arnés de regresión o en un módulo puro— y
// corre las pruebas que la cuidan. Un mutante queda DETECTADO sólo si alguna prueba falla POR LA RAZÓN ESPERADA (su
// patrón aparece en la salida): fallar por otra causa no prueba la guarda. Imprime la puntuación y sale con 1 si un
// mutante sobrevive o si su cambio ya no aplica (el catálogo quedó viejo respecto del código).
//
// Nada toca los archivos reales: cada mutante es una copia `.componer-cta@mut-<nombre>.regresion.mjs` junto al original
// (en .gitignore), y se borra al terminar.
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d)
const SOLO = opt('--solo', null)?.split(',')
const JOBS = Number(opt('--jobs', 2))
const F = rel => path.join(ROOT, 'scripts/foto', rel)

// objetivo: 'compositor' | 'gate' | 'regresion' → corre las pruebas con --compositor/--gate/--regresion;
//           'modulo' → corre la prueba unitaria del módulo contra el mutante.
export const CATALOGO = [
  // ── Tramo 1 · Integridad
  { nombre: 't1-sin-bloqueo', objetivo: 'compositor', cambios: [['tomarBloqueo(`${PLAN_DIR}/out`)', '// mutante: sin bloqueo']], pruebas: 'P10', espera: /rechaza composición concurrente ✗/ },
  { nombre: 't1-cache-confiada', objetivo: 'compositor', cambios: [["if (m.plateSha === plateSha && m.modelo === 'medium' && m.version === VERSION_SEGMENTACION && m.ancho === pw && m.alto === ph && m.mascaraSha === sha(png)) alphaPng = png", 'alphaPng = png']], pruebas: 'P03', espera: /caché envenenada también aborta: false/ },
  { nombre: 't1-escribe-durante', objetivo: 'compositor', cambios: [['  const salidas = []\n', '  const salidas = { push: (...xs) => { for (const [rel, d] of xs) escribirAtomico(`${OUT}/${rel}`, d) }, [Symbol.iterator]: function* () {} }\n']], pruebas: 'P03', espera: /sin archivos tras abortar: false/ },
  { nombre: 't1-qa-compartido', amplio: true, objetivo: 'compositor', cambios: [['const QA_FILE = rutaQa(OUT, PLAN)', "const QA_FILE = path.join(OUT, 'qa.json')"]], pruebas: 'P10', espera: /el QA queda en qa-<plan>\.json ✗/ },
  { nombre: 't1-parcial-pisa', objetivo: 'compositor', cambios: [['if (!only.length) fs.rmSync(QA_FILE, { force: true })', 'fs.rmSync(QA_FILE, { force: true })']], pruebas: 'P10', espera: /la corrida parcial conserva el resto ✗/ },
  { nombre: 't1-sin-esquema', amplio: true, objetivo: 'compositor', cambios: [['    const r = validarPiezaEsquema(p)\n', '    const r = { errores: [], avisos: [] }\n']], pruebas: 'P07', espera: /id con ruta \(\.\.\/\) ✗/ },
  { nombre: 'gate-sin-huellas', objetivo: 'gate', cambios: [['if (!legado) {\n  const comando = huellaComando({ compositor: COMANDO })', 'if (false) {\n  const comando = huellaComando({ compositor: COMANDO })']], pruebas: 'P10', espera: /rechaza plan cambiado ✗/ },
  { nombre: 'gate-acepta-sin-mascara', objetivo: 'gate', cambios: [["if (!legado && guarda === 'sin-mascara') {", 'if (false) {']], pruebas: 'P10', espera: /rechaza sin máscara ✗/ },
  { nombre: 'gate-ignora-nulo', objetivo: 'gate', cambios: [['    if (!m) {\n      console.error(`✗ ${r.id}: «${voz}» no tiene medición de accesibilidad. Una voz sin medir no pasa.`)\n      fallos++\n      continue\n    }\n', '    if (!m) continue\n']], pruebas: 'P10', espera: /rechaza medición ausente ✗/ },
  // ── Tramo 2 · Contraste real
  { nombre: 't2-trazo-es-la-caja', objetivo: 'compositor', cambios: [['for (const [id, m] of Object.entries(medirTrazos(bareRgb, texto))) {', 'for (const [id, m] of Object.entries(medirTrazos(bareRgb, Buffer.alloc(texto.length, 255)))) {']], pruebas: 'P09', espera: /oráculo del trazo: \d+ voces, [1-9]\d* desacuerdos/ },
  { nombre: 't2-sin-piso-trazo', objetivo: 'compositor', cambios: [['        return cajas && trazos', '        return cajas']], pruebas: 'P04,P05', espera: /01-fuera-916 sin reserva ×[\d.]+: ✗/ },
  { nombre: 't2-borde-2px', objetivo: 'compositor', cambios: [['const grosorBorde=outline?Math.max(2,Math.ceil(W/ANCHO)):2;', 'const grosorBorde=2;']], pruebas: 'P09', espera: /bordes ≥ 1 CSS px: 0\// },
  { nombre: 't2-sin-protect', objetivo: 'compositor', cambios: [['if (protegidas.length) throw Error(', 'if (false) throw Error(']], pruebas: 'P06', espera: /texto sobre zona protegida rechazado: false/ },
  { nombre: 'gate-t2-sin-trazo', objetivo: 'gate', cambios: [["    } else if (m.metodo === 'pixel' && !m.glifo.cumpleWcag) {", '    } else if (false) {']], pruebas: 'P10', espera: /rechaza trazo bajo umbral ✗/ },
  { nombre: 'gate-t2-sin-anillo', objetivo: 'gate', cambios: [["    } else if (voz === 'cta-borde' && (!m.anillo.cumpleWcag || m.anillo.grosorCssPx < 1)) {", '    } else if (false) {']], pruebas: 'P10', espera: /rechaza borde que se mezcla en el teléfono ✗/ },
  { nombre: 't2-variantes-sin-degradacion', objetivo: 'modulo', modulo: 'cta-variantes.mjs', prueba: 'cta-variantes.test.mjs', cambios: [["if (v === 'outline' && tintaSegura && tintaSegura !== colores.tinta) intentos.push", 'if (false) intentos.push']], espera: /Degradación canónica/ },
  // ── Tramo 3 · Esquema e invariantes
  { nombre: 't3-sin-cobertura-glifos', objetivo: 'compositor', cambios: [['      if (faltan.length) e(`\\`${campo}\\` usa caracteres', '      if (false) e(`\\`${campo}\\` usa caracteres']], pruebas: 'P07', espera: /emoji que la fuente no tiene ✗/ },
  { nombre: 't3-sin-invariantes', objetivo: 'compositor', cambios: [['  if (maquetacion.length) throw new LienzoError(', '  if (false) throw new LienzoError('], ['  if (maquetacionFinal.length) throw new LienzoError(', '  if (false) throw new LienzoError(']], pruebas: 'P06', espera: /firma sobre el texto rechazada: false/ },
  { nombre: 't3-busqueda-ignora-reserva', objetivo: 'compositor', cambios: [['|| maquetacion.length || reservaRota.length)) return { ok: false, hits, resuelta }', '|| maquetacion.length)) return { ok: false, hits, resuelta }']], pruebas: 'P06', espera: /v03 01-fuera-916 compone dentro de su reserva: false/ },
  { nombre: 'gate-t3-sin-invariantes', objetivo: 'gate', cambios: [['invariantesMaquetacion({ ancho: L.canvas.width, alto: L.canvas.height, elementos: L.maquetacion.elementos })', '[]']], pruebas: 'P10', espera: /recalcula las invariantes sobre el layout ✗/ },
  { nombre: 't3-entidades-sin-decodificar', objetivo: 'modulo', modulo: 'svg-texto.mjs', prueba: 'svg-texto.test.mjs', cambios: [['    .replace(/&(lt|gt|quot|apos);/g, (_, e) => NOMBRADAS[e])\n', '']], espera: /Decodifica las entidades/ },
  { nombre: 't3-invariantes-sin-firma', objetivo: 'modulo', modulo: 'cta-invariantes.mjs', prueba: 'cta-invariantes.test.mjs', cambios: [["e.tipo === 'texto' || e.tipo === 'cta' || e.tipo === 'firma'", "e.tipo === 'texto' || e.tipo === 'cta'"]], espera: /El botón bajo la firma/ },
  // ── Tramo 4 · El canon hecho regla
  { nombre: 't4-sin-zona-axis', objetivo: 'compositor', cambios: [["  const zonaDeclarada = s.safeArea === 'axis' ? zonaAxis(W, H) : s.safeArea", "  const zonaDeclarada = s.safeArea === 'axis' ? null : s.safeArea"]], pruebas: 'P06', espera: /zona de AXIS con safeArea "axis": false/ },
  { nombre: 't4-columna-corrida', objetivo: 'compositor', cambios: [["const xCta=cc=>(cc.x==='columna'?(cc.variant==='text'?x-cc.paddingX:x):W*cc.x);", "const xCta=cc=>(cc.x==='columna'?x+20:W*cc.x);"]], pruebas: 'P06', espera: /CTA y descriptor en la columna: false/ },
  { nombre: 't4-sin-firma-auto', objetivo: 'compositor', cambios: [["    if (s.logo.y === 'auto') {", '    if (false) {']], pruebas: 'P06', espera: /firma automática 20 % legible dentro de la zona: false/ },
  { nombre: 'gate-t4-sin-firma', objetivo: 'gate', cambios: [['  if (!p.logo && !p.firma && !externa) {', '  if (false) {']], pruebas: 'P10', espera: /rechaza pieza sin firma declarada ✗/ },
  { nombre: 'gate-t4-sin-concepto', objetivo: 'gate', cambios: [['  if ((!p.lead || !p.after) && !p.conceptoReducido && bloquea(', '  if (false && bloquea(']], pruebas: 'P10', espera: /rechaza concepto sin cierre ✗/ },
  { nombre: 'gate-t4-sin-excepciones', objetivo: 'gate', cambios: [['  const e = exceptuada(p, regla)\n', '  const e = null\n']], pruebas: 'P10', espera: /acepta la excepción auditada y la imprime ✗/ },
  { nombre: 'gate-t4-sin-zona', objetivo: 'gate', cambios: [['  } else if (r.fueraDeZona?.length && bloquea(', '  } else if (false && bloquea(']], pruebas: 'P10', espera: /rechaza texto fuera de la zona de AXIS ✗/ },
  { nombre: 't4-alt-anuncia-boton', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['`Llamado a la acción: «${accion[0]}»`', '`Botón: «${accion[0]}»`']], espera: /Texto alternativo/ },
  // ── Tramo 6 · El gate no miente: «no certificable» sale con 3, certificación por reproducción, firma en el pie
  { nombre: 't6-legado-certifica', objetivo: 'gate', cambios: [['  noCertificable.push(`${qaLegado} es del formato anterior', '  void (`${qaLegado} es del formato anterior']], pruebas: 'P10', espera: /formato anterior: no certificable \(sale con 3\) ✗/ },
  { nombre: 't6-comando-certifica', objetivo: 'gate', cambios: [['      noCertificable.push(`${p.id}: se compuso con otra versión del comando', '      void (`${p.id}: se compuso con otra versión del comando']], pruebas: 'P10', espera: /otra versión del comando: no certificable \(3\) ✗/ },
  { nombre: 't6-cache-ajena-certifica', objetivo: 'gate', cambios: [["  if (!legado && segmentada && mascara?.origen !== 'fresca' && mascara?.origen !== 'cache-canonica') noCertificable.push(", '  if (false) noCertificable.push(']], pruebas: 'P10', espera: /caché de máscaras ajena: no certificable \(3\) ✗/ },
  { nombre: 't6-gesto-certifica', objetivo: 'gate', cambios: [['  if (p.gesture) noCertificable.push(', '  if (false) noCertificable.push(']], pruebas: 'P10', espera: /gesto manuscrito: no certificable \(3\) ✗/ },
  { nombre: 't6-no-certificable-sale-0', objetivo: 'gate', cambios: [['  process.exit(3)\n', '']], pruebas: 'P10', espera: /formato anterior: no certificable \(sale con 3\) ✗/ },
  { nombre: 't6-reproducir-no-compara', objetivo: 'gate', cambios: [['          else if (!existsSync(reproducido) || sha(readFileSync(entregado)) !== sha(readFileSync(reproducido))) distintos.push(`out/${f}`)', '          else if (false) distintos.push(`out/${f}`)']], pruebas: 'P10', espera: /--reproducir rechaza lo que el comando no produce ✗/ },
  { nombre: 't6-gate-sin-banda-firma', objetivo: 'gate', cambios: [['    if (r.firma?.auto && r.firma.encontrada) {', '    if (false) {']], pruebas: 'P10', espera: /rechaza firma automática por encima del contenido ✗/ },
  { nombre: 't6-gate-sin-trazo-firma', objetivo: 'gate', cambios: [["} else if (!trazo.cumpleWcag && bloquea(p, 'firma-contraste',", "} else if (false && bloquea(p, 'firma-contraste',"]], pruebas: 'P10', espera: /rechaza trazo de la firma bajo 4,5:1 ✗/ },
  { nombre: 't6-firma-sube-sin-tope', objetivo: 'compositor', cambios: [['  const techo = Math.max(Math.ceil(zona.y0 * H), ...ocupados.map(o => Math.ceil(o.bottom + holgura)))', '  const techo = Math.ceil(zona.y0 * H)']], pruebas: 'P06', espera: /la firma automática nunca sube por encima del contenido \(KV-06-169\): false/ },
  { nombre: 't6-mascara-sin-origen', objetivo: 'compositor', cambios: [["  let origen = MASK_CACHE === MASK_CACHE_REPO ? 'cache-canonica' : 'cache-externa'", "  let origen = 'cache-canonica'"]], pruebas: 'P10', espera: /caché de máscaras ajena: no certificable \(3\) ✗/ },
  // ── Tramo 7 · Umbrales que no se aflojan y excepciones con tope, plate y aprobador registrado
  { nombre: 't7-placement-afloja', objetivo: 'compositor', cambios: [['const ANCHO = Math.min(ANCHO_PANTALLA, s.placement?.anchoCssPx ?? ANCHO_PANTALLA)', 'const ANCHO = s.placement?.anchoCssPx ?? ANCHO_PANTALLA']], pruebas: 'P10', espera: /placement no afloja ✗/ },
  { nombre: 't7-cta-sin-piso', objetivo: 'compositor', cambios: [['pisoTexto:UMBRALES.normalTextContrast,', '']], pruebas: 'P10', espera: /el QA del CTA grande se mide con 4,5:1 ✗/ },
  { nombre: 't7-crece-con-excepcion', objetivo: 'compositor', cambios: [['  const reservaRota = fueraDeReserva({ elementos: elementosMaquetacion(firmaPrevista), reserva: s.editorialReserve })', "  const reservaRota = fueraDeReserva({ elementos: elementosMaquetacion(firmaPrevista), reserva: (s.excepciones ?? []).some(e => e.regla === 'reserva-editorial') ? null : s.editorialReserve })"]], pruebas: 'P06', espera: /crecer no usa la excepción de la reserva: false/ },
  { nombre: 't7-sin-velo', objetivo: 'compositor', cambios: [['    if (rescatadas.length) accesibilidad.rescate =', '    if (false) accesibilidad.rescate =']], pruebas: 'P10', espera: /muestra la voz que pasa sólo gracias al velo ✗/ },
  { nombre: 't7-gate-cta-umbral', objetivo: 'gate', cambios: [["    if (voz === 'cta' && !legado && (m.umbralWcag < MIN_TEXTO", "    if (false && (m.umbralWcag < MIN_TEXTO"]], pruebas: 'P10', espera: /CTA siempre ≥ 4,5:1 ✗/ },
  { nombre: 't7-gate-dominante-mayor', objetivo: 'gate', cambios: [["  if (mayores.length && bloquea(p, 'dominante-mayor',", "  if (false && bloquea(p, 'dominante-mayor',"]], pruebas: 'P10', espera: /rechaza dominante que no es la voz mayor ✗/ },
  { nombre: 't7-gate-aprobador-libre', objetivo: 'gate', cambios: [['  return Boolean(a) && (!a.soloPruebas || !(ORIGEN ?? path.resolve(plan)).startsWith(REPO))', '  return true']], pruebas: 'P10', espera: /rechaza excepción de aprobador no registrado ✗/ },
  { nombre: 't7-gate-plate-libre', objetivo: 'gate', cambios: [['      : e.plate !== plateDe(p) ?', '      : false ?']], pruebas: 'P10', espera: /rechaza excepción aprobada para otro plate ✗/ },
  { nombre: 't7-gate-sin-tope-libre', objetivo: 'gate', cambios: [["        : medida && typeof e.hasta !== 'number' ?", '        : false ?']], pruebas: 'P10', espera: /rechaza excepción sin tope ✗/ },
  { nombre: 't7-gate-tope-libre', objetivo: 'gate', cambios: [["          : medida && !(medida.sentido === 'min' ? medida.valor >= e.hasta : medida.valor <= e.hasta) ?", '          : false ?']], pruebas: 'P10', espera: /rechaza excepción que no cubre la medida ✗/ },
  { nombre: 't7-gate-salida-libre', objetivo: 'gate', cambios: [['  if (aprobadorValido(declaracion?.aprobadoPor)) {', '  if (true) {']], pruebas: 'P10', espera: /rechaza sin-firma sin aprobador ✗/ },
  { nombre: 't7-variantes-cta-grande', objetivo: 'modulo', modulo: 'cta-variantes.mjs', prueba: 'cta-variantes.test.mjs', cambios: [['  const umbral = UMBRALES.normalTextContrast', '  const umbral = cssPx >= 24 ? UMBRALES.largeTextContrast : UMBRALES.normalTextContrast']], espera: /El CTA grande también exige/ },
  // ── Tramo 8 · Entradas y bordes
  { nombre: 't8-sin-mayusculas', objetivo: 'compositor', cambios: [['  if (casi.length) errores.push(', '  if (false) errores.push(']], pruebas: 'P07', espera: /ids que sólo difieren en mayúsculas ✗/ },
  { nombre: 't8-plate-sin-nombre', objetivo: 'compositor', cambios: [['    await sharp(path.resolve(PLAN_DIR, s0.plate)).stats()', '    void 0']], pruebas: 'P07', espera: /plate ilegible, con su pieza ✗/ },
  { nombre: 't8-final-ignorado', objetivo: 'compositor', cambios: [['  const out = s.final ? sharp(master).resize({ width: s.final[0], height: s.final[1] }) : sharp(master)', '  const out = sharp(master)']], pruebas: 'P10', espera: /el tamaño entregado es el del plan ✗/ },
  { nombre: 't8-gate-sin-tamano', objetivo: 'gate', cambios: [['      else if (esperado && (dims[0] !== esperado[0] || dims[1] !== esperado[1])) fallas.push(', '      else if (false) fallas.push(']], pruebas: 'P10', espera: /rechaza PNG de otro tamaño ✗/ },
  { nombre: 't8-gate-sin-corchetes', objetivo: 'gate', cambios: [['  if (a.corchetes && (a.corchetes.grosorCssPx < 1', '  if (false && (a.corchetes.grosorCssPx < 1']], pruebas: 'P10', espera: /avisa corchetes bajo 1 CSS px ✗/ },
  { nombre: 't8-alt-sin-rol', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['    ? [accion[0] && `Llamado a la acción: «${accion[0]}»`', '    ? [accion[0] && !yaDicho(accion[0]) && `Llamado a la acción: «${accion[0]}»`']], espera: /el rol del CTA se anuncia siempre/ },
  { nombre: 't8-alt-subcadena', objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['  const yaDicho = t => citas(escena).some(c => contieneFrase(c, t))', '  const yaDicho = t => Boolean(escena) && escena.toLowerCase().includes(t.toLowerCase())']], espera: /el rol del CTA se anuncia siempre/ },
  { nombre: 't8-entidad-revienta', objetivo: 'modulo', modulo: 'svg-texto.mjs', prueba: 'svg-texto.test.mjs', cambios: [["const desdeCodigo = cp => (Number.isFinite(cp) && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : '\\ufffd')", 'const desdeCodigo = cp => String.fromCodePoint(cp)']], espera: /Una entidad fuera de Unicode no revienta/ },
  // ── Tramo 9 · Proceso
  { nombre: 't9-reclamo-sin-candado', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [['      fs.writeFileSync(reclamo, String(process.pid), { flag: \'wx\' })', '      void 0']], espera: /Reclamar un bloqueo muerto deja un solo dueño/ },
  { nombre: 't9-senal-deja-bloqueo', objetivo: 'modulo', modulo: 'cta-integridad.mjs', prueba: 'cta-integridad.test.mjs', cambios: [['      for (const [senal, codigo] of Object.entries(SENALES)) process.once(senal, () => { soltar(); process.exit(codigo) })', '      void SENALES']], espera: /Ctrl-C suelta el bloqueo/ },
  { nombre: 't9-sin-aviso-entre-planes', objetivo: 'compositor', cambios: [['  if (compartidos.length) console.warn(', '  if (false) console.warn(']], pruebas: 'P10', espera: /avisa id que otro plan de la carpeta registra ✗/ },
  { nombre: 'reg-sin-manifiesto-verde', objetivo: 'regresion', cambios: [["} else if (!fs.existsSync(COBERTURA) && (!SOLO || args.includes('--cobertura'))) {", '} else if (false) {']], pruebas: 'P02', rapido: true, espera: /sin manifiesto de cobertura falla ✗/ },
  { nombre: 'reg-sin-veredicto-gate', objetivo: 'regresion', cambios: [["    else if (gateNuevas.length || gateQuitadas.length) r.tipo = 'gate'", "    else if (false) r.tipo = 'gate'"]], pruebas: 'P02', rapido: true, espera: /un cambio del veredicto del gate es una diferencia ✗/ },
  { nombre: 'gate-t9-firma-caja', objetivo: 'gate', cambios: [['} else if (c < FIRMA_MIN_CONTRASTE && bloquea(p, \'firma-contraste\', `la firma mide ${c}:1 contra su fondo', '} else if (false && bloquea(p, \'firma-contraste\', `la firma mide ${c}:1 contra su fondo']], pruebas: 'P10', espera: /rechaza firma bajo 4,5:1 en su caja ✗/ },
  { nombre: 'gate-t9-cta-caja', objetivo: 'gate', cambios: [['  } else if (c.cta < MIN_TEXTO) {', '  } else if (false) {']], pruebas: 'P10', espera: /rechaza CTA bajo 4,5:1 en su caja ✗/ },
  { nombre: 'gate-t9-descriptor-caja', objetivo: 'gate', cambios: [["  if (typeof c.descriptor === 'number' && c.descriptor < MIN_TEXTO) {", '  if (false) {']], pruebas: 'P10', espera: /rechaza descriptor bajo 4,5:1 en su caja ✗/ },
  { nombre: 'gate-t9-jerarquia', objetivo: 'gate', cambios: [["  if (typeof r.ratioDominanteEntrada === 'number' && r.ratioDominanteEntrada < 3 && bloquea(", '  if (false && bloquea(']], pruebas: 'P10', espera: /rechaza jerarquía bajo tres veces ✗/ },
  { nombre: 't9-firma-ignora-protect', objetivo: 'compositor', cambios: [['      const protect = (s.protect ?? []).map(z => ({ left: z.box[0] * W, top: z.box[1] * H, right: z.box[2] * W, bottom: z.box[3] * H }))', '      const protect = (s.protect ?? []).map(z => ({ left: z.x0 * W, top: z.y0 * H, right: z.x1 * W, bottom: z.y1 * H }))']], pruebas: 'P06', espera: /la firma automática respeta las zonas protect: false/ },
  { nombre: 't9-gate-sin-rol-alt', objetivo: 'gate', cambios: [["  if (!legado && piezas.find(x => x.id === r.id)?.cta && !/Llamado a la acción: «/.test(a.altText ?? '')) {", '  if (false) {']], pruebas: 'P10', espera: /rechaza texto alternativo sin el rol del CTA ✗/ },
  // Canarios: rompen algo AJENO al patrón. El arnés tiene que clasificarlos como «falla por otra razón».
  { nombre: 'canario-compositor-revienta', canario: true, objetivo: 'compositor', cambios: [['const QA_FILE = rutaQa(OUT, PLAN)', "const QA_FILE = (() => { throw new Error('canario: el compositor revienta') })()"]], pruebas: 'P10', espera: /rechaza plan cambiado ✗/ },
  { nombre: 'canario-modulo-ajeno', canario: true, objetivo: 'modulo', modulo: 'accesibilidad.mjs', prueba: 'accesibilidad.test.mjs', cambios: [['export const razonWcag = (l1, l2) =>', 'export const razonWcag = (l1, l2) => 1 || ']], espera: /Texto alternativo: el rol del CTA se anuncia siempre/ },
  // ── Firma externa (seguimiento del 2026-09-23: la firma la pone otra herramienta después del compositor)
  { nombre: 'fx-compositor-ignora-firma-externa', objetivo: 'compositor', cambios: [["    ...(firmaExternaDeclarada(s) ? [{ id: 'firma-externa', box: cajaFirmaExterna(s) }] : []),\n", ''], ["...(firmaExternaDeclarada(s) ? [{ id: 'firma-externa', box: cajaFirmaExterna(s) }] : [])]", ']']], pruebas: 'P06', espera: /firma externa sobre el texto rechazada: false/ },
  { nombre: 'gate-sin-contrato-firma-externa', objetivo: 'gate', cambios: [['  if (externa) {', '  if (false) {']], pruebas: 'P10', espera: /mide el contrato de la firma externa ✗/ },
  { nombre: 'gate-no-reconoce-firma-externa', objetivo: 'gate', cambios: [["  const externa = !p.logo && (p.firma?.modo === 'externa' || (p.firma == null && typeof p.signatureY === 'number'))", '  const externa = false']], pruebas: 'P10', espera: /acepta signatureY como firma externa ✗|mide el contrato de la firma externa ✗/ },
  // ── Tramo 5 · Arnés y pruebas
  { nombre: 't5-crecer-ignora-zona', objetivo: 'compositor', cambios: [['if (opts.dry && (violaDeclarada || hits.length || fuera || fueraDeZona.length || ', 'if (opts.dry && (violaDeclarada || hits.length || fuera || ']], pruebas: 'P06', espera: /crecimiento frenado por la zona declarada: false/ },
  { nombre: 'reg-vacio-verde', objetivo: 'regresion', cambios: [['if (!casos.size) {', 'if (false) {']], pruebas: 'P02', rapido: true, espera: /vacío falla ✗/ },
  { nombre: 'reg-sin-cobertura', objetivo: 'regresion', cambios: [['if (faltantes.length) console.log(', 'if (false) console.log(']], pruebas: 'P02', rapido: true, espera: /pieza faltante de la cobertura falla ✗/ },
  { nombre: 'reg-sin-avisos', objetivo: 'regresion', cambios: [["    else if (avisosNuevos.length || avisosPerdidos.length) r.tipo = 'avisos'\n", '']], pruebas: 'P02', rapido: true, espera: /un aviso nuevo es una diferencia ✗/ },
  { nombre: 'reg-ref-no-hermetica', objetivo: 'modulo', modulo: 'regresion-ref.mjs', prueba: 'regresion-ref.test.mjs', cambios: [['      return `${pre}${q}${destino.startsWith', '      return `${pre}${q}${esp}${q}` || `${pre}${q}${destino.startsWith']], espera: /sin reescribir/ }
]

const ARCHIVO = { compositor: 'componer-cta.mjs', gate: 'componer-cta.gate.mjs', regresion: 'componer-cta.regresion.mjs' }
const BANDERA = { compositor: '--compositor', gate: '--gate', regresion: '--regresion' }

function mutar(m) {
  const original = m.objetivo === 'modulo' ? m.modulo : ARCHIVO[m.objetivo]
  let src = fs.readFileSync(F(original), 'utf8')

  for (const [buscar, reemplazar] of m.cambios) {
    if (!src.includes(buscar)) throw new Error(`el cambio ya no aplica en ${original}: «${buscar.slice(0, 70)}…» (el catálogo quedó viejo)`)
    src = src.replace(buscar, reemplazar)
  }

  const archivo = F(`.componer-cta@mut-${m.nombre}.regresion.mjs`)

  fs.writeFileSync(archivo, src)

  if (m.objetivo !== 'modulo') return { archivos: [archivo], comando: ['scripts/foto/componer-cta.pruebas.mjs', '--solo', m.pruebas, BANDERA[m.objetivo], path.relative(ROOT, archivo), ...(m.rapido ? ['--p02-rapido'] : [])] }

  const prueba = F(`.componer-cta@mut-${m.nombre}-prueba.regresion.mjs`)

  fs.writeFileSync(prueba, fs.readFileSync(F(m.prueba), 'utf8').replace(`from './${m.modulo}'`, `from './${path.basename(archivo)}'`))

  return { archivos: [archivo, prueba], comando: ['--test', path.relative(ROOT, prueba)] }
}

// ── Tramo 9 (auditoría de arquitectura, N5): la puntuación sobrestimaba. Un mutante que sólo hacía reventar al
// compositor ponía en ✗ TODAS las verificaciones de P10, incluida la que buscaba su patrón, y contaba como «detectado
// por la razón esperada»; y en los módulos el patrón era el nombre de la prueba, que también aparece con ✔. Ahora:
//   · cada conjunto de pruebas corre una vez SIN mutante (corrida base), y la razón esperada tiene que CAMBIAR: el
//     patrón aparece con el mutante y no en la base;
//   · en los módulos, el patrón se busca sólo en las líneas `✖` (la prueba que falla, no la que pasa);
//   · si el mutante tumba más de la mitad de lo que pasaba en la base —o revienta una prueba— es un COLAPSO: falla por
//     otra razón, aunque el patrón aparezca;
//   · los mutantes `canario` rompen algo AJENO a su patrón a propósito: el arnés tiene que clasificarlos como «falla
//     por otra razón». Si los da por detectados, el arnés volvió a sobrestimar.
const correr = comando => run(process.execPath, comando, { cwd: ROOT, timeout: 60 * 60e3, maxBuffer: 64e6 }).then(r => ({ code: 0, texto: r.stdout + r.stderr }), e => ({ code: e.code ?? 1, texto: String(e.stdout ?? '') + String(e.stderr ?? '') }))

const comandoBase = m => (m.objetivo === 'modulo' ? ['--test', `scripts/foto/${m.prueba}`] : ['scripts/foto/componer-cta.pruebas.mjs', '--solo', m.pruebas, ...(m.rapido ? ['--p02-rapido'] : [])])
const bases = new Map()

const base = m => {
  const k = comandoBase(m).join(' ')

  if (!bases.has(k)) bases.set(k, correr(comandoBase(m)))

  return bases.get(k)
}

// Verificaciones con nombre en la salida: `nombre ✓|✗` (P07, P10, arnés), `nombre: true|false` (P03–P06) y las líneas
// `✔|✖ nombre` de node:test.
export function chequeos(texto) {
  const m = new Map()

  for (const linea of String(texto).split('\n')) {
    const t = linea.trim()
    const nodo = t.match(/^([✔✖]) (.+?)(?: \([\d.]+ms\))?$/)

    if (nodo) { m.set(nodo[2], nodo[1] === '✔'); continue }

    for (const seg of t.split(' · ')) {
      const a = seg.match(/^(.+?) ([✓✗])(?: \(.*\))?$/)

      if (a && !/^[✓✗] P\d\d /.test(seg)) { m.set(a[1], a[2] === '✓'); continue }
      const b = seg.match(/^(.+?): (true|false)\b/)

      if (b) m.set(b[1], b[2] === 'true')
    }
  }

  return m
}

// En los módulos el patrón vale en una línea `✖` o en el informe de fallas de node:test (el mensaje de una aserción),
// nunca en una línea `✔`.
const aparece = (m, texto) => {
  if (m.objetivo !== 'modulo') return m.espera.test(texto)
  const t = String(texto)
  const i = t.indexOf('failing tests:')

  return t.split('\n').some(l => l.trim().startsWith('✖') && m.espera.test(l)) || (i >= 0 && m.espera.test(t.slice(i)))
}

export function clasificar(m, salidaBase, salida) {
  if (salida.code === 0) return 'sobrevive'
  const b = chequeos(salidaBase.texto)
  const x = chequeos(salida.texto)
  const pasaban = [...b].filter(([, ok]) => ok).map(([k]) => k)
  const caidos = pasaban.filter(k => x.get(k) !== true)
  const revienta = /error de la prueba/.test(salida.texto) && !/error de la prueba/.test(salidaBase.texto)
  // `amplio`: una guarda de la que dependen muchas verificaciones (el esquema) tumba legítimamente más de la mitad.
  const colapso = revienta || (!m.amplio && pasaban.length >= 4 && caidos.length > pasaban.length / 2)
  const cambia = aparece(m, salida.texto) && !aparece(m, salidaBase.texto)

  return cambia && !colapso ? 'detectado' : 'falla-por-otra-razon'
}

async function evaluar(m) {
  let archivos = []

  try {
    const mut = mutar(m)

    archivos = mut.archivos
    const [salidaBase, salida] = await Promise.all([base(m), correr(mut.comando)])

    if (salidaBase.code !== 0) return { nombre: m.nombre, estado: 'base-falla', error: `la corrida base (${comandoBase(m).slice(-3).join(' ')}) no pasa: el catálogo no se puede juzgar` }
    const estado = clasificar(m, salidaBase, salida)

    return { nombre: m.nombre, estado, canario: Boolean(m.canario) }
  } catch (e) {
    return { nombre: m.nombre, estado: 'catalogo-viejo', error: e.message }
  } finally {
    for (const f of archivos) fs.rmSync(f, { force: true })
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const lista = CATALOGO.filter(m => !SOLO || SOLO.includes(m.nombre))
  const cola = [...lista]
  const resultados = []

  console.log(`Puntuación de mutantes del compositor de CTA · ${lista.length} mutantes · ${JOBS} en paralelo`)

  await Promise.all(Array.from({ length: JOBS }, async () => {
    for (let m = cola.shift(); m; m = cola.shift()) {
      const r = await evaluar(m)

      resultados.push(r)
      const bien = r.canario ? r.estado === 'falla-por-otra-razon' : r.estado === 'detectado'

      console.log(`${bien ? '✓' : '✗'} ${r.nombre}: ${r.canario ? `canario, ${r.estado === 'falla-por-otra-razon' ? 'el arnés lo clasifica como falla por otra razón' : `el arnés lo dio por ${r.estado} (sobrestima)`}` : r.estado}${r.error ? ` — ${r.error}` : ''}`)
    }
  }))

  const reales = resultados.filter(r => !r.canario)
  const canarios = resultados.filter(r => r.canario)
  const detectados = reales.filter(r => r.estado === 'detectado').length
  const canariosBien = canarios.filter(r => r.estado === 'falla-por-otra-razon').length

  console.log(`\nPuntuación: ${detectados} de ${reales.length} mutantes detectados por la razón esperada${canarios.length ? ` · canarios: ${canariosBien} de ${canarios.length} clasificados como falla por otra razón` : ''}.`)
  process.exitCode = detectados === reales.length && canariosBien === canarios.length ? 0 : 1
}
