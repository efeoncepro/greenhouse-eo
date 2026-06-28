import type { ProbeKind, ProbeResult } from '../probes/contracts'
import type { PublicGraderReport, PublicReportRecommendation } from '../report/contracts'
import {
  FIX_IT_ARTIFACT_VERSION,
  type FixItArtifact,
  type FixItArtifactSource,
  type FixItProfileInput,
  isMeasuredGap,
  recommendationKeys
} from './contracts'

const safeSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'ai-visibility'

const normalizeOrigin = (websiteUrl: string | null): string | null => {
  if (!websiteUrl) return null

  try {
    const withScheme = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`
    const url = new URL(withScheme)

    return url.origin
  } catch {
    return null
  }
}

const joinUrl = (origin: string | null, path: string): string | null => {
  if (!origin) return null

  return new URL(path, origin).toString()
}

const compactJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

const markdownList = (items: string[]): string =>
  items.length > 0 ? items.map(item => `- ${item}`).join('\n') : '- Pendiente de completar con URLs reales del sitio.'

const buildSource = (report: PublicGraderReport, probes: ProbeResult[]): FixItArtifactSource => ({
  artifactVersion: FIX_IT_ARTIFACT_VERSION,
  reportVersion: report.reportVersion,
  recommendationPackVersion: report.recommendationPackVersion,
  scoreVersion: report.provenance.scoreVersion,
  probeLayerVersions: [...new Set(probes.map(probe => probe.probeLayerVersion))].sort()
})

const probeGapKinds = (probes: ProbeResult[], kinds: ProbeKind[]): ProbeKind[] =>
  probes.filter(probe => kinds.includes(probe.probeKind) && isMeasuredGap(probe)).map(probe => probe.probeKind)

const describeEntity = (profile: FixItProfileInput): string => {
  const category = profile.category?.trim()
  const market = profile.market?.trim()

  if (category && market) return `${profile.brandName} es una marca de ${category} que opera en ${market}.`
  if (category) return `${profile.brandName} es una marca de ${category}.`

  return `${profile.brandName} es la entidad de marca evaluada por el AI Visibility Grader.`
}

const buildJsonLdContent = (profile: FixItProfileInput): { content: string; pendingFields: string[] } => {
  const origin = normalizeOrigin(profile.websiteUrl)
  const pendingFields: string[] = []

  if (!origin) pendingFields.push('website_url')
  pendingFields.push('logo_url', 'same_as_profiles')

  const organization = {
    '@type': 'Organization',
    '@id': origin ? `${origin}/#organization` : '#organization',
    name: profile.brandName,
    url: origin ?? undefined,
    description: describeEntity(profile),
    sameAs: []
  }

  const service = profile.category
    ? {
        '@type': 'Service',
        '@id': origin ? `${origin}/#service` : '#service',
        name: profile.category,
        serviceType: profile.category,
        areaServed: profile.market,
        provider: { '@id': organization['@id'] }
      }
    : null

  if (!profile.category) pendingFields.push('service_type')

  const graph = service ? [organization, service] : [organization]

  return {
    content: compactJson({
      '@context': 'https://schema.org',
      '@graph': graph
    }),
    pendingFields
  }
}

export const buildJsonLdArtifact = (
  profile: FixItProfileInput,
  report: PublicGraderReport,
  probes: ProbeResult[]
): FixItArtifact => {
  const { content, pendingFields } = buildJsonLdContent(profile)
  const gapKinds = probeGapKinds(probes, ['json_ld', 'knowledge_graph', 'wikidata'])

  return {
    kind: 'json_ld_starter',
    filename: `${safeSlug(profile.brandName)}-organization-service.jsonld`,
    mimeType: 'application/ld+json',
    title: 'Organization / Service JSON-LD starter',
    description: 'Snippet inicial de schema.org para declarar la entidad de marca y su servicio principal.',
    content,
    publicSafe: true,
    source: buildSource(report, probes),
    derivedFrom: {
      recommendationGapKeys: recommendationKeys(report.recommendations),
      probeKinds: gapKinds
    },
    pendingFields
  }
}

export const buildLlmsTxtArtifact = (
  profile: FixItProfileInput,
  report: PublicGraderReport,
  probes: ProbeResult[]
): FixItArtifact => {
  const origin = normalizeOrigin(profile.websiteUrl)
  const home = origin
  const services = joinUrl(origin, '/servicios')
  const about = joinUrl(origin, '/sobre-nosotros')
  const contact = joinUrl(origin, '/contacto')

  const links = [
    home ? `[Home](${home}): punto de entrada canónico de la marca.` : null,
    services ? `[Servicios](${services}): listar servicios, casos de uso y diferenciadores.` : null,
    about ? `[Sobre ${profile.brandName}](${about}): historia, equipo, credenciales y entidad.` : null,
    contact ? `[Contacto](${contact}): canal público de contacto comercial.` : null
  ].filter((item): item is string => Boolean(item))

  const content = `# ${profile.brandName}

> ${describeEntity(profile)}

## Sobre

${markdownList(links)}

## Contenido que conviene curar

- Casos de uso, resultados o ejemplos propios.
- Guías y páginas que respondan preguntas comerciales frecuentes.
- Páginas de servicio o pricing si existen públicamente.
- Fuentes, estudios, prensa o perfiles que prueben la entidad de marca.

## Nota de implementación

Mantén este archivo sincronizado con el sitio real. \`llms.txt\` es un starter de bajo costo; no reemplaza JSON-LD, contenido citable ni presencia de entidad fuera del sitio.
`

  return {
    kind: 'llms_txt_starter',
    filename: 'llms.txt',
    mimeType: 'text/plain',
    title: 'llms.txt starter',
    description: 'Archivo inicial para curar URLs públicas relevantes para motores de respuesta IA.',
    content,
    publicSafe: true,
    source: buildSource(report, probes),
    derivedFrom: {
      recommendationGapKeys: recommendationKeys(report.recommendations),
      probeKinds: probeGapKinds(probes, ['llms_txt', 'sitemap'])
    },
    pendingFields: origin ? ['high_value_content_urls'] : ['website_url', 'high_value_content_urls']
  }
}

const primaryRecommendation = (report: PublicGraderReport): PublicReportRecommendation | null =>
  report.recommendations[0] ?? null

export const buildContentBriefArtifact = (
  profile: FixItProfileInput,
  report: PublicGraderReport,
  probes: ProbeResult[]
): FixItArtifact => {
  const recommendation = primaryRecommendation(report)
  const targetTopic = profile.category ?? 'la categoria principal de la marca'
  const competitors = profile.competitorsDeclared.slice(0, 5)

  const content = `# Content Brief AEO-ready — ${profile.brandName}

## 1. Definición

- Tema / query principal: ${targetTopic}
- Intención: comercial / informacional, validar con prompts reales.
- Motores objetivo: Google AI Overviews / ChatGPT Search / Perplexity / Gemini.
- Audiencia / ICP: comprador que evalúa ${targetTopic}.
- Objetivo de negocio: convertir un gap de visibilidad IA en conversación comercial.
- URL destino: pendiente de definir.

## 2. Gap prioritario detectado

- Gap: ${recommendation?.title ?? 'Sin gap priorizado disponible en el reporte público.'}
- Acción sugerida: ${recommendation?.action ?? 'Completar con el gap priorizado del reporte.'}
- Motion: ${report.recommendedMotion ?? 'pendiente'}
- Competidores declarados: ${competitors.length ? competitors.join(', ') : 'pendiente'}

## 3. Estructura citable

- H1: Qué es ${targetTopic} y cuándo conviene elegir ${profile.brandName}
- Answer capsule: escribir 40-60 palabras con respuesta directa, factual y sin prometer rankings.
- H2: Qué problema resuelve ${targetTopic}
- H2: Cómo comparar alternativas en ${profile.market}
- H2: Qué evidencia revisar antes de contratar
- H2: Próximo paso recomendado

## 4. Elementos obligatorios

- Tabla comparativa con criterios de decisión.
- Lista numerada de pasos o checklist.
- Datos, casos o ejemplos propios con fuente.
- Links a fuentes autoritativas y perfiles oficiales.
- Schema sugerido: Article + Organization/Service + BreadcrumbList.

## 5. Medición

- KPI clásico: impresiones/clicks de la URL en Search Console.
- KPI AEO: presencia/citación en el panel de prompts del AI Visibility Grader.
- Fecha de refresh: 60 días después de publicar.
`

  return {
    kind: 'content_brief_aeo',
    filename: `${safeSlug(profile.brandName)}-aeo-content-brief.md`,
    mimeType: 'text/markdown',
    title: 'Content brief AEO-ready',
    description: 'Brief inicial para convertir el gap principal del reporte en una pieza citable.',
    content,
    publicSafe: true,
    source: buildSource(report, probes),
    derivedFrom: {
      recommendationGapKeys: recommendation ? [recommendation.gapKey] : [],
      probeKinds: probeGapKinds(probes, ['json_ld', 'llms_txt', 'knowledge_graph', 'wikidata', 'reddit_ugc'])
    },
    pendingFields: ['target_url', 'source_links', 'owned_data_points']
  }
}

export const buildEntityActionBriefArtifact = (
  profile: FixItProfileInput,
  report: PublicGraderReport,
  probes: ProbeResult[]
): FixItArtifact | null => {
  const gaps = probeGapKinds(probes, ['knowledge_graph', 'wikidata', 'reddit_ugc'])

  if (gaps.length === 0) return null

  const wikidataGap = gaps.includes('wikidata')
  const kgGap = gaps.includes('knowledge_graph')
  const redditGap = gaps.includes('reddit_ugc')

  const content = `# Entity Action Brief — ${profile.brandName}

## Objetivo

Fortalecer la entidad pública de ${profile.brandName} para que motores de búsqueda y respuesta IA puedan reconocerla, desambiguarla y citar fuentes confiables.

## Acciones sugeridas

${kgGap ? '- Knowledge Graph: consolidar descripción canónica, Organization JSON-LD y perfiles `sameAs` autoritativos.' : '- Knowledge Graph: mantener consistencia entre sitio, perfiles y structured data.'}
${wikidataGap ? '- Wikidata: evaluar si la marca cumple criterios de notabilidad y preparar fuentes independientes antes de crear/editar una entrada.' : '- Wikidata: revisar que la entrada existente tenga sitio oficial y fuentes actualizadas.'}
${redditGap ? '- Reddit/UGC: identificar comunidades relevantes y participar con respuestas útiles; evitar spam o menciones artificiales.' : '- Reddit/UGC: monitorear menciones y responder cuando aporte valor real.'}

## Evidencia que falta reunir

- URLs de perfiles oficiales (LinkedIn, YouTube, Crunchbase u otros aplicables).
- Fuentes independientes: prensa, casos, entrevistas, directorios confiables.
- Descripción canónica de 1-2 frases, consistente en sitio y perfiles.
- Pruebas de categoría/mercado y casos de uso.

## Guardrails

- No crear perfiles o entradas promocionales sin fuentes.
- No prometer Knowledge Panel ni rankings.
- No usar UGC sintético ni spam en comunidades.
`

  return {
    kind: 'entity_action_brief',
    filename: `${safeSlug(profile.brandName)}-entity-action-brief.md`,
    mimeType: 'text/markdown',
    title: 'Entity action brief',
    description: 'Checklist accionable para fortalecer Knowledge Graph, Wikidata y presencia UGC sin tácticas riesgosas.',
    content,
    publicSafe: true,
    source: buildSource(report, probes),
    derivedFrom: {
      recommendationGapKeys: recommendationKeys(report.recommendations),
      probeKinds: gaps
    },
    pendingFields: ['authoritative_same_as_profiles', 'independent_sources']
  }
}

export const buildFixItArtifacts = (
  profile: FixItProfileInput,
  report: PublicGraderReport,
  probes: ProbeResult[]
): FixItArtifact[] => {
  const artifacts: FixItArtifact[] = [buildJsonLdArtifact(profile, report, probes)]

  artifacts.push(buildLlmsTxtArtifact(profile, report, probes))
  artifacts.push(buildContentBriefArtifact(profile, report, probes))

  const entityBrief = buildEntityActionBriefArtifact(profile, report, probes)

  if (entityBrief) artifacts.push(entityBrief)

  return artifacts
}
