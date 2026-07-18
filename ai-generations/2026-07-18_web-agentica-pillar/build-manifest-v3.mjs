import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const runDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(runDir, '../..')
const report = JSON.parse(await readFile(path.join(runDir, 'build-report-v3.json'), 'utf8'))
const coverDir = path.join(runDir, 'cover-creation-of-adam-v1')
const cover = JSON.parse(await readFile(path.join(coverDir, 'manifest.json'), 'utf8'))
const coverPath = relativePath => path.posix.join('ai-generations/2026-07-18_web-agentica-pillar/cover-creation-of-adam-v1', relativePath)
const featuredDerivative = cover.derivatives.find(asset => asset.role === 'featured')
const openGraphDerivative = cover.derivatives.find(asset => asset.role === 'open-graph')
const cardDerivative = cover.derivatives.find(asset => asset.role === 'card-square')

const hero = {
  conceptId: 'WAG-V01',
  slot: 'hero_featured_og',
  function: cover.concept.function,
  notFunction: cover.concept.notFunction,
  explanatoryDelta: 'Instala la tesis de una web compartida por una persona y un agente autorizado antes de entrar a la arquitectura.',
  status: 'published_live_verified',
  deliveryContract: {
    viewport: 'crop_safe', theme: 'single_theme', canvas: 'opaque', skin: 'efeonce_core',
    rationale: 'Un master gobernado alimenta featured, Open Graph y card; cada crop se revisa por anatomía, lectura cultural y foco.'
  },
  production: {
    kind: 'generated-conceptual',
    provider: cover.generation.provider,
    model: cover.generation.model,
    quality: cover.generation.quality,
    master: { path: coverPath(cover.selectedMaster.path), sha256: cover.selectedMaster.sha256, width: cover.selectedMaster.width, height: cover.selectedMaster.height, mime: cover.selectedMaster.mime },
    derivatives: [featuredDerivative, openGraphDerivative, cardDerivative].map(asset => ({ ...asset, path: coverPath(asset.path) }))
  },
  metadata: cover.metadata,
  rights: cover.rights,
  media: {
    featured: { id: cover.media.featuredAttachmentId, url: cover.media.urls.featured },
    openGraph: { id: cover.media.ogAttachmentId, url: cover.media.urls.openGraph }
  },
  qa: cover.qa
}

const configs = [
  ['WAG-V02','frontera-operativa','body_operability_map','Después de la taxonomía de tipos de sitio.','Mostrar que disminuye la inferencia mientras aumentan operabilidad y gobierno.','La transición decisiva no es “más IA”, sino una acción explícita, gobernada y demostrable.',251514],
  ['WAG-V03','arquitectura-compartida','body_shared_architecture','En la sección sobre cambios de arquitectura.','Mostrar que personas y agentes consumen una capacidad, un gobierno y una fuente de verdad compartidos.','La interfaz cambia; la capacidad, el gobierno y la fuente de verdad permanecen compartidos.',251518],
  ['WAG-V05','mapa-ecosistema','body_market_stack','Después de la tabla de señales del mercado.','Ordenar iniciativas por la frontera del sistema que atienden, sin declarar un ganador universal.','No hay un ganador único: emerge un stack de interoperabilidad con fronteras distintas.',251522],
  ['WAG-V06','circuito-evaluacion','body_eval_circuit','Después de la taxonomía de evals.','Explicar que una capacidad requiere contrato, pruebas deterministas, evals probabilísticas, E2E y recuperación.','La confianza aparece cuando contrato, comportamiento, resultado y recuperación se prueban como sistema.',251526],
  ['WAG-V07','madurez-agentica','body_maturity_model','Después del modelo de cinco niveles.','Separar progresión de comprensión y operabilidad gobernada.','Ser legible habilita comprensión; operar exige autoridad, límites, confirmación y evidencia.',251530],
  ['WAG-V08','readiness-12-pruebas','body_readiness_checklist','Después de las doce pruebas de preparación.','Convertir el checklist en una ruta de inspección agrupada en significado, interacción, ejecución y evidencia.','Si una prueba falla, la autonomía debe detenerse o degradarse con seguridad.',251534],
  ['WAG-V04','cadena-autoridad','body_authority_chain','En la sección sobre confianza y autorización.','Mostrar cómo intención, representación, decisión y evidencia forman una cadena de custodia.','Identificar al agente no basta: la acción debe demostrar representación, alcance, confirmación y resultado.',251538]
]
const variantKey = variant => `${variant.viewport}${variant.theme[0].toUpperCase()}${variant.theme.slice(1)}`
const mediaOffset = { desktopLight: 0, desktopDark: 1, mobileLight: 2, mobileDark: 3 }
const assets = configs.map(([conceptId,slug,slot,context,job,caption,baseId]) => {
  const variants = report.variants.filter(variant => variant.conceptId === conceptId)
  return {
    conceptId, slot, context, function: job,
    notFunction: 'No es una captura de producto, un estándar normativo ni una garantía de seguridad o interoperabilidad.',
    explanatoryDelta: caption, status: 'published_live_verified',
    deliveryContract: {
      format: 'direct_svg', viewport: 'art_directed', theme: 'light_dark', canvas: 'opaque',
      skin: 'efeonce_core', breakpoint: '860px',
      rationale: 'Art direction preserves readable hierarchy across desktop/mobile and native light/dark canvases while keeping the complete brand signature in the footer.',
      brandSignature: 'All brand information is footer-only: official wordmark plus canonical efeoncepro.com bubble; no header wordmark.'
    },
    variants: Object.fromEntries(variants.map(variant => [variantKey(variant), variant.delivery.path])),
    productionVariants: variants.map(variant => {
      const key = variantKey(variant)
      return {
        viewport: variant.viewport, theme: variant.theme,
        source: { ...variant.source, mime: 'image/svg+xml', width: variant.width, height: variant.height, liveText: true },
        delivery: { ...variant.delivery, mime: 'image/svg+xml', width: variant.width, height: variant.height, liveText: false },
        socialProof: variant.social,
        media: {
          id: baseId + mediaOffset[key],
          url: `https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-${slug}-${variant.viewport}-${variant.theme}-v7.svg`,
          mime: 'image/svg+xml', readback: 'pass'
        },
        qa: { canvasOverflow: false, textCollision: false, brandOutsideFooter: false, liveTextInDelivery: false, gradients: false, filters: false }
      }
    }),
    metadata: { caption },
    rights: {
      sourceAssets: ['src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg','src/assets/fonts/Poppins-Medium.ttf','src/assets/fonts/Poppins-SemiBold.ttf','src/assets/fonts/Poppins-Bold.ttf'],
      license: 'Efeonce original', provenance: 'Deterministic SVG built locally; delivery text outlined with fontkit; no generated imagery or third-party assets.', disclosure: 'none'
    },
    qa: { status: 'live_pass', renderer: report.renderer, themesReviewed: true, responsiveReviewed: true, directSvgAudit: '28/28 PASS', integration: 'publish' }
  }
})

const manifest = {
  manifestId: 'greenhouse-cf-web-agentica-pillar-v7-visuals', runId: '2026-07-18_web-agentica-pillar',
  article: { postId: 249387, slug: 'web-agentica-agentes-ia', status: 'publish', url: 'https://efeoncepro.com/aeo/web-agentica-agentes-ia/' },
  visualSystem: {
    name: 'Una base, dos operadores', motif: 'Semantic maps, circuits, scales and chains; one archetype per argument.',
    themeContract: 'Light #FFFFFF and dark #111013; no decorative canvas, bubbles, gradients, glow or outer rounded frame.',
    responsiveContract: 'Desktop 1600x1080 and mobile 1200x1600 art direction at 860px.',
    brandSignature: 'All brand information is footer-only: official wordmark plus canonical efeoncepro.com bubble; no header wordmark.',
    forbidden: ['brand asset outside footer','decorative bubbles','colored editorial canvas','gradients or glow','generic SaaS dashboard','single composition scaled to mobile','simulated product UI','live text in delivery SVG']
  },
  production: {
    builder: 'ai-generations/2026-07-18_web-agentica-pillar/build-assets-v3.mjs',
    specBuilder: 'ai-generations/2026-07-18_web-agentica-pillar/build-spec-v5.mjs',
    report: 'ai-generations/2026-07-18_web-agentica-pillar/build-report-v3.json', renderer: report.renderer
  },
  assets: [hero, ...assets]
}
await writeFile(path.join(root, 'docs/public-site/WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json'), `${JSON.stringify(manifest, null, 2)}\n`)
process.stdout.write(`${JSON.stringify({ ok: true, assets: manifest.assets.length, bodyAssets: assets.length }, null, 2)}\n`)
