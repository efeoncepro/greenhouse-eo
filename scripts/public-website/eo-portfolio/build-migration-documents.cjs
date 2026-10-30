#!/usr/bin/env node
/**
 * TASK-2049 Slice 2 — builds the portfolio-entry.v1 documents of the 15 real Ohio entries from two inputs: the
 * read-only export (`export-ohio-real-entries.php`) and the versioned migration map (`migration-map-*.json`), which holds
 * the text of each project written from what its Ohio entry already publishes. Media come only from the export (real
 * dimensions from the Media Library); nothing is invented and no figure is added. Output: one bundle
 * `{ "projects": [...] }` for `wp eo-portfolio apply --file=<bundle>` (all or nothing) and the redirect map
 * `/project/<old>/` → `/portafolio/<new>/`.
 *
 *   node scripts/public-website/eo-portfolio/build-migration-documents.cjs <export.json> <map.json> <out-dir>
 */
const fs = require('node:fs')
const path = require('node:path')

const [exportFile, mapFile, outDir] = process.argv.slice(2)
if (!exportFile || !mapFile || !outDir) {
  console.error('Uso: build-migration-documents.cjs <export.json> <map.json> <out-dir>')
  process.exit(2)
}
const exported = JSON.parse(fs.readFileSync(exportFile, 'utf8'))
const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'))
const byId = new Map(exported.entries.map((e) => [e.id, e]))

const fail = (message) => { console.error(message); process.exit(1) }
const clip = (text, max) => (text.length <= max ? text : text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…')
const whole = (text, max) => (text.length <= max ? text : fail(`SEO title over ${max} characters, write a shorter seoTitle in the map: ${text}`))
const month = (yyyymmdd) => (/^\d{8}$/.test(yyyymmdd || '') ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}` : null)

const projects = []
const redirects = []
for (const p of map.projects) {
  const e = byId.get(p.id)
  if (!e) fail(`La entrada ${p.id} no está en el export.`)
  if (e.status !== 'publish') fail(`La entrada ${p.id} (${e.slug}) no está publicada; la aprobación del mapa sólo cubre publicadas.`)
  // The map may correct how Ohio wrote the client's name (the brand's own spelling); otherwise Ohio's.
  const client = String(p.client || e.fields.project_client || '').trim()
  if (!client) fail(`La entrada ${p.id} no tiene cliente.`)
  // The gallery, in the order Ohio shows it; the featured image only if the gallery does not already hold it.
  const seen = new Set()
  const images = []
  for (const img of [...e.images, ...(e.thumbnail ? [e.thumbnail] : [])]) {
    if (!img || img.missing || seen.has(img.id)) continue
    if (!img.width || !img.height) fail(`La imagen ${img.id} de ${e.slug} no tiene dimensiones en la biblioteca.`)
    seen.add(img.id)
    images.push(img)
  }
  if (!images.length) fail(`La entrada ${e.slug} no tiene imágenes.`)
  const media = images.map((img, i) => ({
    id: `pieza-${i + 1}`,
    kind: 'image',
    mediaId: img.id,
    width: img.width,
    height: img.height,
    alt: clip(`${client}: ${p.chapter.toLowerCase()}, lámina ${i + 1} de ${images.length}`, 300)
  }))
  const doc = {
    schema: 'portfolio-entry.v1',
    slug: p.slug,
    client: { name: client, industry: p.industry },
    title: p.title,
    audience: p.audience,
    need: p.need,
    line: p.line,
    services: p.services,
    steps: p.steps,
    hero: { mediaRef: 'pieza-1' },
    chapters: [{ name: p.chapter, media }],
    clientApproval: { ref: clip(`${map.approval.refPrefix}${e.path}`, 160), date: map.approval.date, scope: map.approval.scope },
    // A title is written whole (≤ 65), never clipped with «…»: a clipped one reached Google on 10 projects (2026-10-30).
    seo: { title: whole(p.seoTitle || `${client}: ${p.title}`, 65), description: clip(p.need + '.', 170) }
  }
  if (p.kind && p.kind !== 'campaign') doc.kind = p.kind
  const from = p.keepPeriod ? month(e.fields.project_date) : null
  if (from) doc.period = { from, to: null }
  const link = String(e.fields.project_link || '')
  if (/^https:\/\/www\.behance\.net\//.test(link)) doc.links = { canonicalCase: link }
  projects.push(doc)
  redirects.push({ id: e.id, from: e.path, to: `/portafolio/${p.slug}/` })
}
if (projects.length !== exported.entries.length) fail(`El mapa cubre ${projects.length} de ${exported.entries.length} entradas.`)
if (new Set(projects.map((d) => d.slug)).size !== projects.length) fail('Hay slugs repetidos en el mapa.')

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'projects.json'), JSON.stringify({ projects }, null, 2) + '\n')
fs.writeFileSync(path.join(outDir, 'redirects.json'), JSON.stringify({ schema: 'eo-portfolio-redirects.v1', redirects }, null, 2) + '\n')
console.log(`${projects.length} documentos y ${redirects.length} redirecciones en ${outDir}`)
