/**
 * TASK-1340 — Fixtures del render contract para tests + preview interno.
 * Deterministas (GVC estable); espejan el primer CTA real publicado por TASK-1339.
 */
import type { CtaRenderContractMirror } from './contract'
import { RENDERER_CONTRACT_VERSION } from './version'

const base = (overrides: Partial<CtaRenderContractMirror> & { slug: string }): CtaRenderContractMirror => ({
  contractVersion: RENDERER_CONTRACT_VERSION,
  cta: {
    ctaId: `cdef-fixture-${overrides.slug}`,
    slug: overrides.slug,
    campaignSlug: 'ai-visibility-grader',
    ctaVersionId: `cver-fixture-${overrides.slug}`,
    version: 1,
    locale: 'es-CL',
  },
  placement: 'embedded',
  interruptive: false,
  content: {
    eyebrow: 'Diagnóstico gratuito',
    headline: '¿Cómo ve la IA a tu marca?',
    body: 'Mide tu visibilidad en ChatGPT, Gemini y Perplexity con el AI Visibility Grader y recibe un informe accionable.',
    ctaLabel: 'Haz el diagnóstico gratis',
    dismissLabel: 'Ahora no',
    footnote: 'Toma menos de 2 minutos.',
  },
  action: { kind: 'open_growth_form', formSlug: 'ai-visibility-grader', formKey: '69cd5269-5f97-4d32-99c4-0b23f41aa2f5' },
  variantId: 'control',
  surfacePolicy: { surfaceId: 'csur-fixture', allowedOrigins: [], rendererChannel: 'preview' },
  ...overrides,
})

export const CTA_FIXTURES: Record<string, { label: string; build: () => CtaRenderContractMirror }> = {
  default: {
    label: 'Default (embedded)',
    build: () => base({ slug: 'ai-visibility-report-followup' }),
  },
  spotlight: {
    label: 'Spotlight (gradiente de marca)',
    build: () => base({ slug: 'ai-visibility-report-followup-spotlight', styleVariant: 'spotlight' }),
  },
  minimal: {
    label: 'Minimal (editorial)',
    build: () => base({ slug: 'ai-visibility-report-followup-minimal', styleVariant: 'minimal' }),
  },
  banner: {
    label: 'Inline banner',
    build: () => base({ slug: 'ai-visibility-report-followup-banner', placement: 'inline_banner' }),
  },
  longCopy: {
    label: 'Copy largo (truncado con gracia)',
    build: () =>
      base({
        slug: 'ai-visibility-report-followup-long',
        content: {
          eyebrow: 'Diagnóstico gratuito de visibilidad en motores de IA',
          headline: 'Descubre exactamente cómo los motores de respuesta con IA describen, citan y recomiendan a tu marca hoy',
          body: 'Los compradores ya no buscan: preguntan. Mide tu visibilidad en ChatGPT, Gemini y Perplexity con el AI Visibility Grader, identifica las brechas frente a tu competencia y recibe un informe accionable con los pasos concretos para aparecer en las respuestas.',
          ctaLabel: 'Generar mi informe de visibilidad',
          dismissLabel: 'Ahora no, gracias',
          footnote: 'Gratis. Toma menos de 2 minutos y no necesitas tarjeta.',
        },
      }),
  },

  // ── TASK-1429 — slide_in interruptivo (pairwise placement × appearance × contenido) ──
  slideIn: {
    label: 'Slide-in (interruptivo, default)',
    build: () => base({ slug: 'ai-visibility-slide-in', placement: 'slide_in', interruptive: true }),
  },
  slideInSpotlight: {
    label: 'Slide-in spotlight (máximo énfasis tokenizado)',
    build: () =>
      base({ slug: 'ai-visibility-slide-in-spotlight', placement: 'slide_in', interruptive: true, styleVariant: 'spotlight' }),
  },
  slideInMinimal: {
    label: 'Slide-in minimal (editorial, peek-friendly)',
    build: () =>
      base({ slug: 'ai-visibility-slide-in-minimal', placement: 'slide_in', interruptive: true, styleVariant: 'minimal' }),
  },
  slideInLongCopy: {
    label: 'Slide-in copy largo (límite de alto + scroll interno)',
    build: () =>
      base({
        slug: 'ai-visibility-slide-in-long',
        placement: 'slide_in',
        interruptive: true,
        content: {
          eyebrow: 'Siguiente paso sugerido',
          headline: 'Descubre exactamente cómo los motores de respuesta con IA describen, citan y recomiendan a tu marca hoy',
          body: 'Los compradores ya no buscan: preguntan. Mide tu visibilidad en ChatGPT, Gemini y Perplexity con el AI Visibility Grader, identifica las brechas frente a tu competencia y recibe un informe accionable con los pasos concretos para aparecer en las respuestas de los motores.',
          ctaLabel: 'Generar mi informe de visibilidad',
          dismissLabel: 'Ahora no, gracias',
          footnote: 'Gratis. Toma menos de 2 minutos y no necesitas tarjeta.',
        },
      }),
  },
  slideInUnknownAppearance: {
    label: 'Slide-in appearance desconocida (fallback default)',
    build: () =>
      base({ slug: 'ai-visibility-slide-in-unknown', placement: 'slide_in', interruptive: true, styleVariant: 'campaign-neon' }),
  },

  // ── TASK-1431 — familia navigate (mismo shell visual; solo cambia el executor) ──
  linkUrlInternal: {
    label: 'link_url interno (path same-origin, mismo contexto)',
    build: () =>
      base({
        slug: 'navigate-link-internal',
        action: { kind: 'link_url', href: '/servicios/aeo', newContext: false },
        content: {
          eyebrow: 'Sigue explorando',
          headline: 'Conoce el servicio AEO de Efeonce',
          body: 'Qué incluye, cómo se mide y qué resultados esperar en tu visibilidad con IA.',
          ctaLabel: 'Ver el servicio AEO',
          dismissLabel: 'Ahora no',
        },
      }),
  },
  linkUrlExternalNewTab: {
    label: 'link_url externo (https, pestaña nueva + rel seguro)',
    build: () =>
      base({
        slug: 'navigate-link-external',
        action: { kind: 'link_url', href: 'https://efeoncepro.com/blog/', newContext: true },
        content: {
          eyebrow: 'Desde el blog',
          headline: 'Ideas y guías del equipo Efeonce',
          body: 'Contenido práctico sobre crecimiento, IA y operación de marketing.',
          ctaLabel: 'Ir al blog de Efeonce',
          dismissLabel: 'Ahora no',
        },
      }),
  },
  thinkTool: {
    label: 'open_think_tool (hub Think + campaign context UTM)',
    build: () =>
      base({
        slug: 'navigate-think-tool',
        action: {
          kind: 'open_think_tool',
          href: 'https://think.efeoncepro.com/brand-visibility?utm_source=greenhouse_cta&utm_campaign=ai-visibility',
          newContext: false,
        },
        content: {
          eyebrow: 'Herramienta gratuita',
          headline: 'Mide tu visibilidad en motores de IA',
          body: 'El AI Visibility Grader analiza cómo te citan ChatGPT, Gemini y Perplexity.',
          ctaLabel: 'Abrir el AI Visibility Grader',
          dismissLabel: 'Ahora no',
        },
      }),
  },
  bookMeeting: {
    label: 'book_meeting (agenda gobernada; navegación-only)',
    build: () =>
      base({
        slug: 'navigate-book-meeting',
        action: { kind: 'book_meeting', href: 'https://meetings.hubspot.com/efeonce/diagnostico', newContext: true },
        content: {
          eyebrow: 'Conversemos',
          headline: 'Agenda una reunión con el equipo',
          body: 'Se abrirá la agenda para que elijas el horario que te acomode.',
          ctaLabel: 'Abrir la agenda',
          dismissLabel: 'Ahora no',
          footnote: 'Sin compromiso. Eliges tú el horario.',
        },
      }),
  },
}
