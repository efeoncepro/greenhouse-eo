/**
 * TASK-2051 — Builds source/fixture.json: the approved canvas content expressed as the data contract that WordPress
 * (TASK-2050 readers) fills in production. Literals are read from the frozen canvas logic, not retyped, so the bound
 * template fed with this fixture must reproduce the canvas byte for byte (test-bound-equivalence.cjs).
 */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const SRC = path.join(__dirname, 'source')
const assets = JSON.parse(fs.readFileSync(path.join(SRC, 'assets.json'), 'utf8'))
const railV2 = require('./lib/rail-v2.cjs')

Object.assign(assets, railV2.RAIL_ASSETS)
const reference = fs.readFileSync(path.join(SRC, 'Portada-v3.reference.dc.html'), 'utf8')
const logic = reference.slice(reference.indexOf('<script type="text/x-dc"'))

function literal(re) {
  const m = logic.match(re)

  if (!m) throw new Error('Literal not found: ' + re)

  return vm.runInNewContext('(' + m[1] + ')')
}

const blob = key => '/_blob/' + assets[key].id

const slides = literal(/const S = (\[[\s\S]*?\n    \]);\n/).map(s => ({ ...s, href: '#', authorInitials: '[AA]', authorName: '[Autor real]' }))
const topics = literal(/const T = (\[[\s\S]*?\n    \]);\n/).map(t => ({ ...t, href: '#' }))
const archive = literal(/const Y = (\{[\s\S]*?\n    \});\n/)

for (const y of Object.values(archive)) {
  y.moreHref = '#'
  y.rows = y.rows.map(r => ({ ...r, href: '#' }))
}

const fixture = {
  // Where the canvas literal assets live (equivalence); production replaces them with Media Library URLs.
  assets: Object.fromEntries(Object.keys(assets).map(k => [k, blob(k)])),
  slides,
  topics,
  topicDefault: 'hubspot',
  topicsSource: 'Fuente: blog de Efeonce, 44 publicaciones al 23 oct 2026',
  total: 44,
  archive,
  years: ['2026', '2025', '2024', '2023'],
  archiveTitle: 'Todo el archivo · 44 publicaciones',
  questions: literal(/const chips = (\[[^\]]*\])\.map\(/),
  search: { action: '#' },
  subscribe: { action: '#' },
  glitch: {
    edition: { href: '#', label: 'EDICIÓN #17 · 28 JUL 2026', title: 'Agente rompe la jaula, la confianza reordena el frontier, la correa manda.' },
    flash: { href: '#', label: 'GLITCH FLASH · 28 SEP', title: 'Sonnet 5.5 roza a Opus, a mitad de precio' },
    back: [
      { href: '#', num: '#16', t: 'Open-weight que descargas, precio que miente, canal sin dueño' },
      { href: '#', num: '#15', t: 'Token barato, criterio caro, y las capas que no controlas' },
      { href: '#', num: '#14', t: 'El modelo a centavos, el checkout en vivo, el acceso con dueño' },
    ],
  },
  event: {
    show: true,
    allHref: '#',
    total: 4,
    chip: 'Webinar en vivo · Gratis · Cupos limitados',
    title: 'Cómo aparecer en las respuestas de ChatGPT',
    dek: '45 minutos con el equipo de Efeonce | AEO: qué miran los motores de respuesta, cómo medir tu visibilidad y qué cambiar en tu sitio esta misma semana.',
    when: 'Jueves 12 de noviembre · 10:00 (Chile)',
    duration: '45 minutos',
    modality: 'En línea',
    formAction: '#',
    doneLabel: 'Te esperamos el 12 de noviembre',
    calendarHref: '#',
    showSeats: true,
    seats: literal(/evSeats: ('[^']*')/),
    art: blob('slideAeo'),
    tag: 'Efeonce | AEO · Webinar',
    short: 'Jue 12 nov · 10:00',
    agendaTitle: 'Agenda · 45 minutos',
    startMs: Date.UTC(2026, 10, 12, 13, 0, 0),
    speakers: literal(/evSpk: (\[[\s\S]*?\n      \]),/),
    takeaways: literal(/evLearn: (\[[\s\S]*?\n      \]),/),
    agenda: literal(/evAgenda: (\[[\s\S]*?\n      \]),/),
    upcoming: literal(/evNext: (\[[\s\S]*?\n      \]),/).map(e => ({ ...e, href: '#' })),
    recordings: literal(/evRec: (\[[\s\S]*?\n      \]),/).map(r => ({ ...r, href: '#' })),
  },
  // «Para leer con calma» v2 (lib/rail-v2.cjs): the same cards on every board.
  rail: railV2.FIXTURE(blob),
}

// Glitch back-issue cells: positional styles of the canvas (first, middle, last).
fixture.glitch.back = fixture.glitch.back.map((g, i, arr) => ({
  ...g,
  style: i === 0 ? 'padding: 28px 28px 0;' : i === arr.length - 1 ? 'padding: 28px 0 0 28px; border-left: 1px solid rgba(207,228,250,0.16);' : 'padding: 28px 28px 0; border-left: 1px solid rgba(207,228,250,0.16);',
}))

fs.writeFileSync(path.join(SRC, 'fixture.json'), JSON.stringify(fixture, null, 2) + '\n')
console.log('fixture: slides', slides.length, 'topics', topics.length, 'years', Object.keys(archive).length)

/* ---------- Mobile board: the same content in the shape the mobile view model emits. ---------- */

const mRef = fs.readFileSync(path.join(SRC, 'Movil-v3.reference.dc.html'), 'utf8')
const mLogic = mRef.slice(mRef.indexOf('<script type="text/x-dc"'))

const mLiteral = re => {
  const m = mLogic.match(re)

  if (!m) throw new Error('Mobile literal not found: ' + re)

  return vm.runInNewContext('(' + m[1] + ')')
}

const mArchive = mLiteral(/const Y = (\{[\s\S]*?\n    \});\n/)

for (const y of Object.values(mArchive)) {
  y.moreHref = '#'
  y.rows = y.rows.map(r => ({ ...r, href: '#' }))
}

const mobile = {
  assets: fixture.assets,
  slides: mLiteral(/const S = (\[[\s\S]*?\n    \]);\n/).map(s => ({ ...s, href: '#' })),
  topics: mLiteral(/const T = (\[[\s\S]*?\n    \]);\n/).map(t => ({ ...t, href: '#' })),
  topicDefault: 'hubspot',
  topicsSource: fixture.topicsSource,
  total: 44,
  archive: mArchive,
  years: fixture.years,
  archiveTitle: 'Todo el archivo · 44',
  chips: [{ t: 'Ordenar mi CRM', href: '#' }, { t: 'Qué es Loop Marketing', href: '#' }],
  search: fixture.search,
  subscribe: fixture.subscribe,
  glitch: {
    edition: { href: '#', label: 'EDICIÓN #17 · 28 JUL', title: fixture.glitch.edition.title },
    flash: { href: '#', label: 'GLITCH FLASH · 28 SEP', title: fixture.glitch.flash.title },
    back: [
      { href: '#', num: '#16', t: 'Open-weight que descargas, precio que miente' },
      { href: '#', num: '#15', t: 'Token barato, criterio caro' },
    ],
  },
  event: {
    ...fixture.event,
    chip: 'Webinar en vivo · Gratis',
    dek: '45 minutos con el equipo de Efeonce | AEO: qué miran los motores de respuesta y qué cambiar en tu sitio esta misma semana.',
    seats: mLiteral(/evSeats: ('[^']*')/),
    speakers: mLiteral(/evSpk: (\[[\s\S]*?\n      \]),/),
    takeaways: mLiteral(/evLearn: (\[[\s\S]*?\n      \]),/),
    agenda: mLiteral(/evAgenda: (\[[\s\S]*?\n      \]),/),
    upcoming: mLiteral(/evNext: (\[[\s\S]*?\n      \]),/).map(e => ({ ...e, href: '#' })),
    recordings: mLiteral(/evRec: (\[[\s\S]*?\n      \]),/).map(r => ({ ...r, href: '#' })),
  },
  rail: railV2.FIXTURE(blob),
}

fs.writeFileSync(path.join(SRC, 'fixture.mobile.json'), JSON.stringify(mobile, null, 2) + '\n')
console.log('fixture mobile: slides', mobile.slides.length, 'rail', mobile.rail.length)
