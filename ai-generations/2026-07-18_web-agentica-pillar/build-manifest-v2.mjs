import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const runDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(runDir, '../..')
const report = JSON.parse(await readFile(path.join(runDir, 'build-report-v2.json'), 'utf8'))

const fileRecord = async relativePath => {
  const absolute = path.join(root, relativePath)
  const data = await readFile(absolute)
  return {
    path: relativePath,
    sha256: createHash('sha256').update(data).digest('hex'),
    bytes: (await stat(absolute)).size
  }
}

const mediaRegistry = {
  'v02-frontera-operativa:desktopLight': { id: 251470, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-frontera-operativa-desktop-light-web-1600-v4.webp' },
  'v02-frontera-operativa:mobileLight': { id: 251471, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-frontera-operativa-mobile-light-web-1200-v4.webp' },
  'v02-frontera-operativa:desktopDark': { id: 251472, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-frontera-operativa-desktop-dark-web-1600-v4.webp' },
  'v02-frontera-operativa:mobileDark': { id: 251473, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-frontera-operativa-mobile-dark-web-1200-v4.webp' },
  'v03-arquitectura-compartida:desktopLight': { id: 251474, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-arquitectura-compartida-desktop-light-web-1600-v4.webp' },
  'v03-arquitectura-compartida:mobileLight': { id: 251475, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-arquitectura-compartida-mobile-light-web-1200-v4.webp' },
  'v03-arquitectura-compartida:desktopDark': { id: 251476, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-arquitectura-compartida-desktop-dark-web-1600-v4.webp' },
  'v03-arquitectura-compartida:mobileDark': { id: 251477, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-arquitectura-compartida-mobile-dark-web-1200-v4.webp' },
  'v04-cadena-autoridad:desktopLight': { id: 251479, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-cadena-autoridad-desktop-light-web-1600-v1.webp' },
  'v04-cadena-autoridad:mobileLight': { id: 251480, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-cadena-autoridad-mobile-light-web-1200-v1.webp' },
  'v04-cadena-autoridad:desktopDark': { id: 251481, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-cadena-autoridad-desktop-dark-web-1600-v1.webp' },
  'v04-cadena-autoridad:mobileDark': { id: 251482, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-cadena-autoridad-mobile-dark-web-1200-v1.webp' }
}

const variantRecord = variant => ({
  viewport: variant.viewport,
  theme: variant.theme,
  source: { ...variant.source, mime: 'image/svg+xml', width: variant.width, height: variant.height },
  master: { ...variant.master, mime: 'image/png', colorSpace: 'sRGB', width: variant.width, height: variant.height },
  derivative: { ...variant.web, mime: 'image/webp', colorSpace: 'sRGB', width: variant.width, height: variant.height },
  contextualProof: variant.contextualProof,
  qa: {
    reviewedAtOriginalResolution: true,
    articleWidth: variant.measuredArticleWidth,
    projectedRenderHeight: variant.projectedRenderHeight,
    clipping: false,
    brokenBrandAsset: false
  },
  media: { ...mediaRegistry[`${variant.conceptId}:${variantKey(variant)}`], mime: 'image/webp', readback: 'pass' }
})

const variantKey = variant => `${variant.viewport}${variant.theme[0].toUpperCase()}${variant.theme.slice(1)}`
const governedVariants = variants => Object.fromEntries(variants.map(variant => [variantKey(variant), variant.web.path]))

const heroMaster = await fileRecord('tmp/web-agentica-visuals/web-agentica-dos-operadores-master.png')
const heroFeatured = await fileRecord('tmp/web-agentica-visuals/web-agentica-dos-operadores-featured-1600-v1.webp')
const heroOg = await fileRecord('tmp/web-agentica-visuals/web-agentica-dos-operadores-og-1440x757-v1.jpg')

const assets = [
  {
    conceptId: 'WAG-V01',
    slot: 'hero_featured_og',
    function: 'Presentar una infraestructura web compartida por una persona y un agente sin sugerir reemplazo humano.',
    explanatoryDelta: 'Instala la tesis de dos operadores sobre una base compartida antes de entrar a la arquitectura.',
    status: 'integrated_private',
    deliveryContract: {
      viewport: 'crop_safe',
      theme: 'single_theme',
      canvas: 'opaque',
      skin: 'efeonce_core',
      rationale: 'La portada necesita estabilidad cromática y foco central para featured y Open Graph.'
    },
    production: { kind: 'generated-conceptual', master: { ...heroMaster, mime: 'image/png', width: 1536, height: 1024 }, derivatives: [{ role: 'featured', ...heroFeatured, mime: 'image/webp', width: 1600, height: 900 }, { role: 'openGraph', ...heroOg, mime: 'image/jpeg', width: 1440, height: 757 }] },
    metadata: { alt: 'Una persona y un agente de IA convergen sobre la misma infraestructura web compartida.', caption: null, description: 'Portada editorial conceptual; no representa una interfaz, producto ni cliente real.' },
    media: { featured: { id: 251453, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-dos-operadores-featured-1600-v1.webp' }, openGraph: { id: 251454, url: 'https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-dos-operadores-og-1440x757-v1.jpg' } }
  },
  {
    conceptId: 'WAG-V02',
    slot: 'body_operability_map',
    context: 'Después de distinguir sitio tradicional, sitio con IA, sitio preparado y web agéntica.',
    function: 'Mostrar que operabilidad externa y gobierno crecen juntos y que la IA interna no basta.',
    notFunction: 'No es un ranking universal ni una promesa de automatización total.',
    explanatoryDelta: 'Convierte la taxonomía en un mapa de dos ejes: el salto decisivo es autoridad acotada, auditable y revocable, no más IA dentro del sitio.',
    status: 'integrated_private',
    deliveryContract: {
      viewport: 'art_directed',
      theme: 'light_dark',
      canvas: 'opaque',
      skin: 'efeonce_core',
      rationale: 'La progresión requiere composición horizontal en desktop y vertical en móvil; el canvas coincide exactamente con el blanco y el negro plomo del tema, sin fondo decorativo.'
    },
    variants: governedVariants(report.variants.filter(item => item.conceptId === 'v02-frontera-operativa')),
    productionVariants: report.variants.filter(item => item.conceptId === 'v02-frontera-operativa').map(variantRecord),
    metadata: { title: 'De una interfaz a un contrato operativo', alt: 'Cuatro etapas aumentan la operabilidad para agentes externos y el gobierno de las acciones: sitio tradicional, sitio con IA, sitio preparado y web agéntica.', caption: 'La transición decisiva no es “más IA”, sino autoridad acotada, auditable y revocable.', description: 'Mapa editorial determinístico de la frontera entre IA interna y operación externa gobernada.' },
    rights: { sourceAssets: ['public/branding/logo-full.svg', 'public/branding/logo-negative.svg'], license: 'Efeonce original', provenance: 'SVG determinístico; sin generación de imagen ni assets de terceros.', disclosure: 'none' },
    qa: { status: 'integration_pass', renderer: 'Chromium via Playwright', themesReviewed: true, responsiveReviewed: true, findings: [], integration: 'private' }
  },
  {
    conceptId: 'WAG-V03',
    slot: 'body_shared_architecture',
    context: 'En la sección sobre los cambios de arquitectura de un proyecto web.',
    function: 'Mostrar que interfaz humana, WebMCP y API consumen capacidades, gobierno, datos y reglas compartidos.',
    notFunction: 'No es un diagrama de despliegue completo ni afirma que WebMCP reemplace una API.',
    explanatoryDelta: 'Localiza la frontera de reutilización: cambian las interfaces, pero no el contrato de capacidades, gobierno y datos.',
    status: 'integrated_private',
    deliveryContract: {
      viewport: 'art_directed',
      theme: 'light_dark',
      canvas: 'opaque',
      skin: 'efeonce_core',
      rationale: 'Las capas se comparan en paralelo en desktop y se apilan en móvil; el exterior coincide con el tema y no crea una lámina visual separada.'
    },
    variants: governedVariants(report.variants.filter(item => item.conceptId === 'v03-arquitectura-compartida')),
    productionVariants: report.variants.filter(item => item.conceptId === 'v03-arquitectura-compartida').map(variantRecord),
    metadata: { title: 'Una base, dos formas de operar', alt: 'La interfaz humana, WebMCP y la API consumen las mismas capacidades gobernadas, los mismos datos y las mismas reglas del negocio.', caption: 'La interfaz cambia; el contrato de capacidades, gobierno y datos permanece compartido.', description: 'Diagrama editorial determinístico de arquitectura compartida para personas y agentes.' },
    rights: { sourceAssets: ['public/branding/logo-full.svg', 'public/branding/logo-negative.svg'], license: 'Efeonce original', provenance: 'SVG determinístico; sin generación de imagen ni assets de terceros.', disclosure: 'none' },
    qa: { status: 'integration_pass', renderer: 'Chromium via Playwright', themesReviewed: true, responsiveReviewed: true, findings: [], integration: 'private' }
  },
  {
    conceptId: 'WAG-V04',
    slot: 'body_authority_chain',
    context: 'Dentro de la sección sobre confianza, identidad y autoridad delegada.',
    function: 'Mostrar la cadena persona, agente u operador, capacidad del sitio y sistema de registro.',
    notFunction: 'No es un estándar de identidad, flujo OAuth completo ni garantía de seguridad.',
    explanatoryDelta: 'Separa identidad, alcance delegado, confirmación y evidencia recuperable, y ubica cada gate en el recorrido de una acción.',
    status: 'integrated_private',
    deliveryContract: {
      viewport: 'art_directed',
      theme: 'light_dark',
      canvas: 'opaque',
      skin: 'efeonce_core',
      rationale: 'La cadena se lee horizontalmente en desktop y como recorrido vertical en móvil; el canvas coincide con el tema y no agrega decoración ambiental.'
    },
    variants: governedVariants(report.variants.filter(item => item.conceptId === 'v04-cadena-autoridad')),
    productionVariants: report.variants.filter(item => item.conceptId === 'v04-cadena-autoridad').map(variantRecord),
    metadata: { title: 'Cadena de autoridad para agentes', alt: 'Una persona delega una intención a un agente u operador; la capacidad del sitio valida identidad, alcance y confirmación antes de registrar un resultado auditable, revocable y recuperable.', caption: 'Identificar al agente no basta: la empresa debe comprobar autoridad, alcance, confirmación y evidencia.', description: 'Infografía editorial determinística de la cadena de autoridad entre persona, agente u operador, capacidad del sitio y sistema de registro.' },
    rights: { sourceAssets: ['public/branding/logo-full.svg', 'public/branding/logo-negative.svg'], license: 'Efeonce original', provenance: 'SVG determinístico; sin generación de imagen ni assets de terceros.', disclosure: 'none' },
    qa: { status: 'integration_pass', renderer: 'Chromium via Playwright', themesReviewed: true, responsiveReviewed: true, findings: [], integration: 'private' }
  }
]

const manifest = {
  manifestId: 'greenhouse-cf-web-agentica-pillar-v3-visuals-v5',
  runId: '2026-07-18_web-agentica-pillar',
  article: { postId: 249387, slug: 'web-agentica-agentes-ia', status: 'draft_private' },
  visualSystem: {
    name: 'Una base, dos operadores',
    motif: 'Recorridos que avanzan desde interfaz hacia capacidades y gobierno',
    themeContract: 'Light #FFFFFF and dark #111013; no decorative canvas, bubbles, gradients or outer rounded frame',
    responsiveContract: 'Desktop horizontal and mobile vertical art direction at 860px',
    brandSignature: 'Official Efeonce wordmarks only, small and peripheral',
    forbidden: ['decorative bubbles', 'colored editorial canvas', 'gradients or glow', 'generic SaaS dashboard', 'single composition scaled to mobile', 'simulated product UI']
  },
  production: { builder: 'ai-generations/2026-07-18_web-agentica-pillar/build-assets.mjs', report: 'ai-generations/2026-07-18_web-agentica-pillar/build-report-v2.json', renderer: report.renderer },
  assets
}

const serialized = `${JSON.stringify(manifest, null, 2)}\n`
await writeFile(path.join(root, 'docs/public-site/WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json'), serialized)
await writeFile(path.join(root, 'tmp/web-agentica-pillar-v3-visual-manifest.json'), serialized)
process.stdout.write(JSON.stringify({ ok: true, assets: assets.length }, null, 2) + '\n')
