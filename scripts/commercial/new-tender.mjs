/**
 * Scaffolder del workspace de una licitación/propuesta — el "DSR interno".
 *
 * `pnpm tender:new <slug>` crea la carpeta canónica del deal bajo
 * `docs/commercial/tenders/<slug>/` con su estructura estándar: el RFP, la investigación,
 * el manifiesto de artefactos vivos, la oferta técnica (copiada del template) y los anexos.
 *
 * POR QUÉ EXISTE: la estructura de SKY (bases/ + research + deck-plan.json + ofertas + INTERNOS)
 * funcionó, pero era ad-hoc. Este script la canoniza para que el próximo tender no la reinvente
 * ni olvide una carpeta (la de investigación, el manifiesto de artefactos). Es el F0 del
 * Digital Sales Room: primero el workspace interno del deal; el DSR externo del comprador es una
 * PROYECCIÓN posterior de sus artefactos client_facing (ver GREENHOUSE_DIGITAL_SALES_ROOM_*_V1.md).
 *
 * Decisión de arquitectura horneada: las FUENTES (oferta-tecnica.md, deck-plan.json) se quedan
 * como archivos git del repo — NO se vuelven proposal_assets en la DB. Conservan git-diff/review
 * y el composer las lee directo. El aggregate `Proposal` referencia esta carpeta por proposal_id
 * y guarda las SALIDAS versionadas (los PDF renderizados) + el snapshot de la quote.
 */

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TENDERS_DIR = join(REPO_ROOT, 'docs/commercial/tenders')
const TECHNICAL_OFFER_TEMPLATE = join(TENDERS_DIR, 'TECHNICAL_OFFER_TEMPLATE.md')

const slug = process.argv[2]?.trim()

if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Uso: pnpm tender:new <slug-kebab-case>')
  console.error('Ej.:  pnpm tender:new sky-blog-2027')
  process.exit(1)
}

const dealDir = join(TENDERS_DIR, slug)

if (existsSync(dealDir)) {
  console.error(`✗ Ya existe: docs/commercial/tenders/${slug}/ — no se sobrescribe.`)
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)

const readme = `# Licitación / Propuesta — ${slug}

> **Estado:** borrador · **Deadline:** <YYYY-MM-DD> · **Origen:** <public_tender | private_rfp | direct_sales>
> **Proposal (Studio):** <proposal_id cuando exista> · **Owner:** <nombre> · **Creado:** ${today}

Workspace interno del deal (el "DSR interno"). Las FUENTES viven acá como archivos git; las
SALIDAS versionadas (PDF renderizados) y la quote viven en el aggregate \`Proposal\`, que referencia
esta carpeta por \`proposal_id\`. Contrato de la carpeta: \`../TENDER_WORKSPACE_TEMPLATE.md\`.

## Artefactos

### ➡️ Client-facing (van al cliente — el \`.md\` es la FUENTE, el PDF se re-emite)

- \`oferta-tecnica.md\` — narrativa + ledger de evidencia (template canónico ya copiado).
- \`oferta-economica.md\` — la económica (ver \`pricing-garantias-finance.md\` de la skill).
- \`deck-plan.json\` — fuente de composición del deck (\`pnpm deck:compose <plan>\`).
- \`anexos/\` — administrativos (declaraciones, poderes, certificados).
- \`artifact-manifest.json\` — punteros a artefactos VIVOS (Radiografía, Grader) — por enlace.

### 🔒 INTERNOS — NUNCA van al cliente

- \`research/\` — diagnóstico, benchmark, VoC, fuentes crudas.
- \`*-INTERNO.md\` — squad-blueprint (loaded cost + piso), matriz de admisibilidad si aplica.

### Fuente normativa

- \`bases/\` — el RFP, bases admin/técnica/económica, aclaraciones del foro. **Manda sobre todo.**

## Qué falta

- [ ] Cargar el RFP en \`bases/\`.
- [ ] Correr admisibilidad + bid/no-bid (skill \`greenhouse-public-private-tenders\`).
- [ ] Investigación en \`research/\`; cifras al ledger de \`oferta-tecnica.md\`.
- [ ] Registrar artefactos vivos en \`artifact-manifest.json\`.
- [ ] Autorar \`deck-plan.json\` DESDE la oferta técnica; \`pnpm deck:compose\`.
- [ ] Registrar el deal como \`Proposal\` en el Studio y adjuntar las salidas.
`

const artifactManifest = {
  $schema: '../ARTIFACT_MANIFEST_SCHEMA.md',
  deal: slug,
  artifacts: [
    {
      id: 'ejemplo-radiografia',
      type: 'aeo_xray',
      url: 'https://think.efeoncepro.com/muestras/<slug>-<token>',
      as_of: today.slice(0, 7),
      audience: 'client_facing',
      render: 'by_link',
      backs_evidence: [],
      used_in: [],
      note: 'BORRAR este ejemplo. render:by_link SIEMPRE — la pieza viva se enlaza, nunca se captura.'
    }
  ]
}

mkdirSync(dealDir, { recursive: true })

for (const sub of ['bases', 'research', 'anexos']) {
  mkdirSync(join(dealDir, sub), { recursive: true })
  writeFileSync(join(dealDir, sub, '.gitkeep'), '')
}

const economicaStub = {
  $comment: 'Datos de la oferta económica. FUENTE única; el .xlsx brandeado se emite con `pnpm economica:build <este archivo>`. NUNCA un precio unitario por artículo (04_PRICING #2).',
  output: 'propuesta-economica.xlsx',
  title: 'PROPUESTA ECONÓMICA',
  subtitle: '<Servicio> — <Cliente>',
  currency: 'CLP',
  ivaRate: 0.19,
  meta: {
    Oferente: 'Efeonce Group SpA',
    Licitación: '<nombre de la licitación>',
    Fecha: '<mes año>',
    'Validez de la oferta': '<N días desde su recepción>'
  },
  sections: [
    {
      type: 'value-table',
      title: '1. Valor del servicio',
      columns: ['Plan', 'Alcance de la operación mensual', 'Valor mensual (neto, sin IVA)'],
      rows: [{ cells: ['Plan propuesto', '<alcance de la operación>', 0], strong: true }]
    },
    { type: 'totals', title: 'Detalle del valor mensual', basis: 0, label: 'Valor mensual neto' },
    { type: 'keyvalue', title: '2. Condiciones comerciales', rows: [{ cells: ['Precio', '<condición>'] }] }
  ],
  footerNote: 'Documento integrante de la oferta económica. Valores en pesos chilenos (CLP), netos sin IVA.'
}

writeFileSync(join(dealDir, 'README.md'), readme)
writeFileSync(join(dealDir, 'artifact-manifest.json'), `${JSON.stringify(artifactManifest, null, 2)}\n`)
writeFileSync(join(dealDir, 'economica.json'), `${JSON.stringify(economicaStub, null, 2)}\n`)

if (existsSync(TECHNICAL_OFFER_TEMPLATE)) {
  copyFileSync(TECHNICAL_OFFER_TEMPLATE, join(dealDir, 'oferta-tecnica.md'))
} else {
  writeFileSync(join(dealDir, 'oferta-tecnica.md'), '# Oferta Técnica\n\n<!-- Falta TECHNICAL_OFFER_TEMPLATE.md -->\n')
}

console.log(`✓ Workspace creado: docs/commercial/tenders/${slug}/`)
console.log('  bases/  research/  anexos/  README.md  oferta-tecnica.md  artifact-manifest.json')
console.log('\nSiguiente: cargá el RFP en bases/, corré admisibilidad + bid/no-bid, y llená el ledger de evidencia.')
