import type { ContentFactoryBrief, ContentFactoryGeneratedDraft } from './contracts'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const slugifyPublicSiteDraft = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)

const sentence = (value: string) => value.trim().replace(/[.!?]+$/g, '')

const buildSeoDescription = (brief: ContentFactoryBrief) => {
  const keyword = brief.primaryKeyword ? ` sobre ${brief.primaryKeyword}` : ''
  const offer = brief.offer ? ` y ${brief.offer}` : ''

  return sentence(`Guia practica${keyword} para ${brief.audience}${offer}, con enfoque operativo y gobernado.`).slice(0, 165)
}

const buildPostContent = (brief: ContentFactoryBrief) => {
  const objective = sentence(brief.objective)
  const audience = sentence(brief.audience)
  const offer = sentence(brief.offer ?? 'convertir una idea en un siguiente paso medible')
  const keyword = sentence(brief.primaryKeyword ?? 'AI aplicada al crecimiento')
  const secondaryKeywords = (brief.secondaryKeywords ?? []).slice(0, 4)
  const ctaTarget = sentence(brief.cta.target)

  return [
    '<!-- wp:heading {"level":2} -->',
    `<h2>${escapeHtml(objective)}</h2>`,
    '<!-- /wp:heading -->',
    '',
    '<!-- wp:paragraph -->',
    `<p>${escapeHtml(
      `Para ${audience}, ${keyword} no deberia partir desde una herramienta aislada. El punto de partida es entender que decision comercial queremos mejorar, que datos sostienen esa decision y que evidencia necesita revisar una persona antes de actuar.`
    )}</p>`,
    '<!-- /wp:paragraph -->',
    '',
    '<!-- wp:paragraph -->',
    `<p>${escapeHtml(
      `El enfoque de Efeonce es tratar la AI como una capacidad operacional: contexto claro, contratos verificables, trazabilidad y una ruta de revision humana. Eso permite producir contenido, propuestas o acciones con velocidad sin perder gobierno.`
    )}</p>`,
    '<!-- /wp:paragraph -->',
    '',
    '<!-- wp:heading {"level":3} -->',
    '<h3>Como aterrizar la idea</h3>',
    '<!-- /wp:heading -->',
    '',
    '<!-- wp:list -->',
    '<ul>',
    `<li>${escapeHtml(`Definir el objetivo: ${objective}.`)}</li>`,
    `<li>${escapeHtml(`Alinear el mensaje al publico: ${audience}.`)}</li>`,
    `<li>${escapeHtml(`Conectar la oferta con una accion concreta: ${offer}.`)}</li>`,
    `<li>${escapeHtml('Validar el resultado antes de publicarlo o enviarlo a un cliente.')}</li>`,
    '</ul>',
    '<!-- /wp:list -->',
    '',
    '<!-- wp:paragraph -->',
    `<p>${escapeHtml(
      `La diferencia entre producir mas y producir mejor esta en la estructura. Un buen flujo separa la idea inicial, el borrador, la validacion, el review y la publicacion. Asi los agentes pueden acelerar el trabajo sin saltarse controles.`
    )}</p>`,
    '<!-- /wp:paragraph -->',
    '',
    '<!-- wp:heading {"level":3} -->',
    '<h3>Senales que conviene revisar</h3>',
    '<!-- /wp:heading -->',
    '',
    '<!-- wp:paragraph -->',
    `<p>${escapeHtml(
      `Antes de convertir este borrador en una pieza final, conviene revisar tono, claridad de la promesa, evidencia comercial, consistencia con la marca y el siguiente paso de conversion.`
    )}</p>`,
    '<!-- /wp:paragraph -->',
    '',
    secondaryKeywords.length
      ? [
          '<!-- wp:paragraph -->',
          `<p>${escapeHtml(`Temas relacionados para enriquecer el draft: ${secondaryKeywords.join(', ')}.`)}</p>`,
          '<!-- /wp:paragraph -->',
          ''
        ].join('\n')
      : '',
    '<!-- wp:quote -->',
    `<blockquote class="wp-block-quote"><p>${escapeHtml(
      'La AI aporta valor cuando trabaja con contexto, restricciones y evidencia, no cuando opera como una caja negra.'
    )}</p></blockquote>`,
    '<!-- /wp:quote -->',
    '',
    '<!-- wp:paragraph -->',
    `<p>${escapeHtml(
      `Siguiente paso sugerido: ${ctaTarget}. Este CTA debe mantenerse como draft/private hasta que Greenhouse complete validacion, review humano y aprobacion operacional.`
    )}</p>`,
    '<!-- /wp:paragraph -->'
  ]
    .filter(Boolean)
    .join('\n')
}

export const planGeneratedGutenbergPostDraft = (brief: ContentFactoryBrief): ContentFactoryGeneratedDraft => {
  if (brief.contractVersion !== 'contentFactoryBrief.v1') {
    throw new Error('content_factory_brief_contract_version_invalid')
  }

  if (brief.lane !== 'post_draft_gutenberg') {
    throw new Error('content_factory_brief_lane_not_gutenberg_post')
  }

  const slugBase = brief.primaryKeyword || brief.objective
  const slug = slugifyPublicSiteDraft(slugBase) || `greenhouse-draft-${Date.now()}`
  const seoTitle = sentence(brief.primaryKeyword || brief.objective).slice(0, 70)

  return {
    contractVersion: 'contentFactoryGeneratedDraft.v1',
    intent: brief.intent,
    lane: 'post_draft_gutenberg',
    sourceBriefId: brief.campaignId,
    title: sentence(brief.objective),
    slug,
    excerpt: sentence(`Una guia practica para ${brief.audience} sobre ${brief.primaryKeyword ?? brief.objective}.`).slice(0, 180),
    seo: {
      title: seoTitle,
      description: buildSeoDescription(brief),
      indexPolicy: 'index'
    },
    draft: {
      kind: 'gutenberg_post',
      postContent: buildPostContent(brief),
      observedBlocks: ['core/heading', 'core/list', 'core/paragraph', 'core/quote']
    },
    attribution: {
      campaignId: brief.campaignId,
      hubspotCampaignId: brief.hubspotCampaignId
    }
  }
}
