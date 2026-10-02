import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { DATAFORSEO_CATALOG, type DataForSeoCatalogEndpoint } from '@/lib/ai/dataforseo-catalog'

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  'docs/architecture/GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md'
)

const FAMILY_ORDER = [
  'content_analysis',
  'business_data',
  'keywords_data',
  'merchant',
  'app_data',
  'appendix',
  '$path',
  '$path.ai'
] as const

const FAMILY_GUIDANCE: Record<string, { label: string; posture: string; eventualUse: string; decisionGate: string }> = {
  content_analysis: {
    label: 'Content Analysis',
    posture: 'Candidata 1',
    eventualUse:
      'Brand monitoring web: menciones, sentiment, distribución de rating y tendencias por frase o categoría para retainers y QBR.',
    decisionGate:
      'Definir owner y consumer presupuestario, retención de menciones, taxonomía de sentimiento y separación respecto de LLM Mentions.'
  },
  business_data: {
    label: 'Business Data',
    posture: 'Candidata 2, alcance acotado',
    eventualUse: 'SEO local y reputación: listings, Google Business, reviews, Q&A, hoteles, Trustpilot y Tripadvisor.',
    decisionGate:
      'Limitar fuentes/casos, resolver datos personales y licencias, definir identidad de locales, deduplicación y owner de presupuesto.'
  },
  keywords_data: {
    label: 'Keywords Data',
    posture: 'Condicional',
    eventualUse:
      'Planificación paid y estacionalidad: datos Google Ads/Bing, Google Trends, DataForSEO Trends y clickstream. Labs sigue siendo el default orgánico.',
    decisionGate:
      'Exigir caso donde Labs no alcance, fijar fuente/metodología por serie, evitar mezclar escalas y asignar consumer SEO o media.'
  },
  merchant: {
    label: 'Merchant',
    posture: 'Dormant hasta caso e-commerce',
    eventualUse:
      'Inteligencia de ecommerce: Google Shopping y Amazon para productos, sellers, precios, reviews y disponibilidad competitiva.',
    decisionGate:
      'Requiere cliente e-commerce, SKU/ASIN SSOT, política de matching, cobertura geográfica, presupuesto y límites contractuales.'
  },
  app_data: {
    label: 'App Data',
    posture: 'Dormant hasta caso app',
    eventualUse:
      'ASO e inteligencia de apps: búsquedas, charts, fichas, categorías y reviews de Google Play y App Store.',
    decisionGate:
      'Requiere cliente/app en cartera, app identity SSOT, mercados, cadencia, presupuesto y separación de métricas entre stores.'
  },
  appendix: {
    label: 'Appendix',
    posture: 'Infraestructura, no familia de producto',
    eventualUse:
      'Diagnóstico de cuenta, status/errores y recuperación gobernada de webhooks. `user_data` ya alimenta health fuera del allowlist.',
    decisionGate:
      'No agregar al allowlist de familias. Cada operación requiere contrato explícito; webhook resend necesita seguridad e idempotencia.'
  },
  $path: {
    label: 'Plantillas `$path`',
    posture: 'No habilitar',
    eventualUse:
      'Artefactos genéricos extraídos de la documentación; no representan una familia o endpoint concreto operable.',
    decisionGate:
      'Excluir de decisiones de producto; corregir el extractor si empiezan a contaminar conteos o navegación.'
  },
  '$path.ai': {
    label: 'Plantilla `$path.ai`',
    posture: 'No habilitar',
    eventualUse: 'Artefacto genérico de documentación para rutas AI; no es una capacidad concreta.',
    decisionGate: 'Excluir del allowlist y de cualquier estimación de cobertura operativa.'
  }
}

const fallbackFamilyGuidance = (family: string) => ({
  label: family,
  posture: 'Sin clasificar; requiere triage',
  eventualUse: 'Familia nueva detectada en la documentación oficial; evaluar su contrato antes de asignarle valor.',
  decisionGate: 'Clasificar la familia y completar el gate común antes de cualquier habilitación.'
})

const has = (endpoint: DataForSeoCatalogEndpoint, fragment: string) => endpoint.path.includes(fragment)

const routeUse = (endpoint: DataForSeoCatalogEndpoint) => {
  const lifecycle = has(endpoint, '/task_post') || has(endpoint, '/task_get/') || has(endpoint, '/tasks_ready')

  if (lifecycle)
    return 'Lifecycle asíncrono de la operación correspondiente; submit, disponibilidad y recuperación sin resubmit.'

  if (
    /\/(locations|languages|categories|available_filters|industries|job_functions|status)(\/|$)/.test(endpoint.path)
  ) {
    return 'Metadata/preflight para validar geografía, idioma, categoría, filtros o estado antes de una compra.'
  }

  if (has(endpoint, '/locations_and_languages')) return 'Metadata/preflight combinado de mercados e idiomas admitidos.'
  if (has(endpoint, '/errors')) return 'Catálogo o consulta de errores del proveedor para diagnóstico sanitizado.'
  if (has(endpoint, '/user_data'))
    return 'Health de cuenta, saldo y límites; ya se usa por el carril especial de conexión.'
  if (has(endpoint, '/webhook_resend'))
    return 'Recuperación gobernada de una entrega webhook fallida, con idempotencia y destino validado.'

  switch (endpoint.family) {
    case 'content_analysis':
      if (has(endpoint, '/sentiment_analysis/'))
        return 'Clasificar tono/connotación de menciones web para brand monitoring.'
      if (has(endpoint, '/phrase_trends/'))
        return 'Serie temporal de menciones de una frase, marca, producto o ejecutivo.'
      if (has(endpoint, '/category_trends/')) return 'Evolución de menciones dentro de una categoría competitiva.'
      if (has(endpoint, '/rating_distribution/')) return 'Distribución de ratings asociada al corpus de menciones.'
      if (has(endpoint, '/summary/')) return 'Resumen agregado del corpus antes de comprar o presentar detalle.'

      return 'Buscar menciones web y evidencia por keyword, marca, entidad o dominio.'
    case 'business_data':
      if (has(endpoint, '/business_listings/'))
        return 'Descubrir y comparar negocios/locales por categoría, mercado y filtros.'

      if (has(endpoint, '/extended_reviews/') || has(endpoint, '/reviews/')) {
        return 'Capturar reviews y reputación por fuente sin mezclarlas en una métrica opaca.'
      }

      if (has(endpoint, '/questions_and_answers/'))
        return 'Auditar preguntas/respuestas públicas como señal de intención y soporte local.'
      if (has(endpoint, '/my_business_info/'))
        return 'Ficha pública de Google Business para presencia local y consistencia de datos.'
      if (has(endpoint, '/my_business_updates/'))
        return 'Posts/actualizaciones de Google Business para actividad local y benchmarking.'
      if (has(endpoint, '/hotel_info/')) return 'Ficha hotelera, amenities y datos competitivos del vertical de viajes.'
      if (has(endpoint, '/hotel_searches/')) return 'Descubrimiento hotelero por mercado para benchmark de categoría.'
      if (has(endpoint, '/search/'))
        return 'Descubrir entidades o perfiles en Trustpilot/Tripadvisor antes de recuperar reviews.'

      return 'Operación de reputación/local data de la fuente indicada por la ruta.'
    case 'keywords_data':
      if (has(endpoint, '/audience_estimation/'))
        return 'Estimar audiencia Bing Ads por industria y función laboral para media planning.'
      if (has(endpoint, '/keyword_performance/'))
        return 'Performance paid estimada en Bing para planificación de campañas.'
      if (has(endpoint, '/keyword_suggestions_for_url/'))
        return 'Expandir keywords Bing desde una URL para paid/search planning.'
      if (has(endpoint, '/keywords_for_keywords/')) return 'Expandir semillas con datos Ads de la plataforma declarada.'
      if (has(endpoint, '/keywords_for_site/')) return 'Descubrir keywords Ads asociadas a un dominio o sitio.'
      if (has(endpoint, '/search_volume_history/'))
        return 'Histórico de demanda Bing para estacionalidad y planificación.'
      if (has(endpoint, '/search_volume/'))
        return 'Volumen Ads actual; usar sólo cuando Labs no cubra el objetivo metodológico.'
      if (has(endpoint, '/ad_traffic_by_keywords/'))
        return 'Forecast de tráfico/costo Google Ads para presupuestación paid.'
      if (has(endpoint, '/google_trends/explore/'))
        return 'Popularidad relativa de Google Trends; comparar sólo dentro del mismo request.'
      if (has(endpoint, '/dataforseo_trends/demography/'))
        return 'Distribución demográfica relativa para ángulos de audiencia.'
      if (has(endpoint, '/dataforseo_trends/subregion_interests/'))
        return 'Interés relativo por subregión para priorización geográfica.'
      if (has(endpoint, '/dataforseo_trends/merged_data/'))
        return 'Serie combinada de tendencias para análisis temporal comparativo.'
      if (has(endpoint, '/dataforseo_trends/explore/'))
        return 'Tendencia relativa de demanda con el motor propio del proveedor.'
      if (has(endpoint, '/clickstream_data/'))
        return 'Volumen de búsqueda calibrado por clickstream; conservar metodología por serie.'

      return 'Metadata o dato paid/trends de la plataforma indicada por la ruta.'
    case 'merchant':
      if (has(endpoint, '/amazon/asin/')) return 'Ficha y evidencia de un ASIN para inteligencia de producto.'
      if (has(endpoint, '/amazon/products/')) return 'Descubrimiento competitivo de productos Amazon por query/mercado.'
      if (has(endpoint, '/amazon/sellers/')) return 'Perfil y surtido de sellers Amazon.'
      if (has(endpoint, '/google/product_info/')) return 'Ficha de producto Google Shopping.'
      if (has(endpoint, '/google/products/'))
        return 'Resultados/productos Shopping para share of shelf, precio y competencia.'
      if (has(endpoint, '/google/reviews/')) return 'Reviews de producto/merchant en Google Shopping.'
      if (has(endpoint, '/google/sellers/')) return 'Sellers y enlaces de anuncios Shopping.'

      return 'Metadata o lifecycle del marketplace declarado.'
    case 'app_data':
      if (has(endpoint, '/app_info/')) return 'Ficha de app, publisher, rating y metadata ASO.'
      if (has(endpoint, '/app_list/')) return 'Charts/listas de apps para benchmark de categoría.'
      if (has(endpoint, '/app_listings/search/')) return 'Buscar apps/listings por término y mercado.'
      if (has(endpoint, '/app_reviews/')) return 'Reviews de apps para reputación, temas y pain points.'
      if (has(endpoint, '/app_searches/')) return 'Resultados de búsqueda del store para ranking y competencia ASO.'

      return 'Metadata o lifecycle del store declarado.'
    default:
      return FAMILY_GUIDANCE[endpoint.family]?.eventualUse ?? 'Ruta catalogada sin caso futuro clasificado.'
  }
}

const escapeCell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ')

const renderFamily = (family: string, endpoints: DataForSeoCatalogEndpoint[]) => {
  const guidance = FAMILY_GUIDANCE[family] ?? fallbackFamilyGuidance(family)
  const getCount = endpoints.filter(endpoint => endpoint.method === 'GET').length
  const postCount = endpoints.filter(endpoint => endpoint.method === 'POST').length

  return [
    `## ${guidance.label} — ${endpoints.length} ${endpoints.length === 1 ? 'ruta' : 'rutas'}`,
    '',
    `- Postura: **${guidance.posture}**.`,
    `- Para qué podría servir: ${guidance.eventualUse}`,
    `- Gate específico: ${guidance.decisionGate}`,
    `- Mix actual: ${getCount} GET · ${postCount} POST.`,
    '',
    '| Método | Ruta | Uso eventual |',
    '| --- | --- | --- |',
    ...endpoints.map(
      endpoint => `| ${endpoint.method} | \`${escapeCell(endpoint.path)}\` | ${escapeCell(routeUse(endpoint))} |`
    ),
    ''
  ].join('\n')
}

export const buildDataForSeoEnablementRegister = () => {
  const endpoints = DATAFORSEO_CATALOG.endpoints.filter(endpoint => endpoint.execution.status === 'catalog_only')
  const grouped = new Map<string, DataForSeoCatalogEndpoint[]>()

  for (const endpoint of endpoints) grouped.set(endpoint.family, [...(grouped.get(endpoint.family) ?? []), endpoint])

  const orderedFamilies = [
    ...FAMILY_ORDER.filter(family => grouped.has(family)),
    ...[...grouped.keys()].filter(family => !FAMILY_ORDER.includes(family as (typeof FAMILY_ORDER)[number])).sort()
  ]

  const productRoutes = endpoints.filter(endpoint =>
    ['keywords_data', 'business_data', 'app_data', 'merchant', 'content_analysis'].includes(endpoint.family)
  )

  const infrastructureRoutes = endpoints.length - productRoutes.length

  const sections = orderedFamilies.flatMap(family => {
    const familyEndpoints = grouped.get(family)

    return familyEndpoints ? [renderFamily(family, familyEndpoints)] : []
  })

  return `# DataForSEO Catalog-only Enablement Register V1

> Estado: inventario, no autorización · Generado desde \`data/dataforseo/endpoints.v3.json\` · Snapshot
> ${DATAFORSEO_CATALOG.generatedAt} · Digest \`${DATAFORSEO_CATALOG.source.contentDigest}\`

## Propósito

Registrar **todas** las rutas oficiales que la CLI conoce pero Greenhouse no autoriza. Este documento no amplía el
allowlist, no crea entitlement y no habilita gasto. Su función es evitar que una futura evaluación empiece desde
cero o confunda existencia en el proveedor con disponibilidad en Greenhouse.

El snapshot contiene ${DATAFORSEO_CATALOG.endpoints.length} endpoints: ${DATAFORSEO_CATALOG.endpoints.length - endpoints.length}
ejecutables y ${endpoints.length} \`catalog_only\`. De estos últimos, ${productRoutes.length} pertenecen a cinco
familias de producto potencialmente habilitables y ${infrastructureRoutes} son rutas de infraestructura o plantillas
de documentación que no equivalen a una capability.

## Gate común para habilitar una familia

1. ADR o delta aceptado con owner, caso de uso, consumer presupuestario y límites de datos/licencia.
2. Familia explícita en \`DATAFORSEO_FAMILIES\`; nunca prefijo libre ni bypass por SDK/curl.
3. Migración del CHECK de \`seo_provider_spend_daily\` + test de paridad TS↔SQL antes del primer POST.
4. Entitlement, estimador/ceiling, spend recorder, breaker y runtime owner definidos.
5. Contrato validado primero en sandbox cuando exista; luego canary mínimo con organización y techo explícitos.
6. Preset/command, normalización, procedencia, cache/checkpoint e idempotencia según el lifecycle de la familia.
7. Skill, documentación funcional/técnica/manual, task, handoff y changelog sincronizados.

Habilitar una familia no obliga a exponer todas sus rutas: el ADR puede limitar el scope a operaciones concretas.
Las rutas \`task_post\`, \`tasks_ready\` y \`task_get\` forman un solo lifecycle y nunca se evalúan como productos
independientes.

## Resumen de priorización

| Familia | Rutas | Postura | Valor eventual |
| --- | ---: | --- | --- |
${orderedFamilies.map(family => {
  const familyEndpoints = grouped.get(family) ?? []
  const guidance = FAMILY_GUIDANCE[family] ?? fallbackFamilyGuidance(family)

  return `| \`${family}\` | ${familyEndpoints.length} | ${guidance.posture} | ${guidance.eventualUse} |`
}).join('\n')}

${sections.join('\n')}
## Regeneración y verificación

Después de \`pnpm dataforseo:catalog:sync\`:

\`\`\`bash
pnpm exec tsx scripts/dataforseo/generate-enablement-register.ts
pnpm exec tsx scripts/dataforseo/generate-enablement-register.ts --check
\`\`\`

El modo \`--check\` falla si el registro no coincide byte-for-byte con el catálogo vigente.
`
}

const main = async () => {
  const rendered = buildDataForSeoEnablementRegister()

  if (process.argv.includes('--check')) {
    const current = await readFile(OUTPUT_PATH, 'utf8')

    if (current !== rendered) throw new Error(`Registro DataForSEO desactualizado: ${OUTPUT_PATH}`)
    console.log(`Registro DataForSEO vigente: ${OUTPUT_PATH}`)

    return
  }

  await writeFile(OUTPUT_PATH, rendered, 'utf8')
  console.log(`Registro DataForSEO generado: ${OUTPUT_PATH}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
