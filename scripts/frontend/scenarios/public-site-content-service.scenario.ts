import type { CaptureScenario } from '../lib/scenario'

const serviceCards = [
  '.elementor-element-dba7ee5',
  '.elementor-element-bd90c02',
  '.elementor-element-696dde1',
  '.elementor-element-84a6a6a',
  '.elementor-element-3adb15a',
  '.elementor-element-b752881'
] as const

const sections = [
  ['offer', '.elementor-element-d33dd85', 'Bloque de oferta y promesa principal.'],
  ['why-us', '.elementor-element-9be021b', 'Razones para elegir la agencia.'],
  ['methodology-intro', '.elementor-element-a59049b', 'Introduccion de metodologia 3C.'],
  ['partners', '.elementor-element-899f1fc', 'Partners estrategicos y herramientas.'],
  ['team-feature', '.elementor-element-43ee1ea', 'Perfil destacado del equipo.'],
  ['expert-team', '.elementor-element-8bb05f4', 'Equipo experto y bullets de capacidad.'],
  ['testimonials', '.elementor-element-7c9eb66', 'Testimonios.'],
  ['cta', '.elementor-element-a78c166', 'CTA de asesoria.'],
  ['form-intro', '.elementor-element-9384b95', 'Intro del formulario HubSpot.'],
  ['form', '.elementor-element-b623a56', 'Formulario HubSpot embebido.'],
  ['faq-heading', '.elementor-element-3755fc0', 'Encabezado de preguntas frecuentes.'],
  ['faq', '.elementor-element-a4a0ebb', 'Acordeon de preguntas frecuentes.'],
  ['footer', '#colophon', 'Footer publico.']
] as const

export const scenario: CaptureScenario = {
  name: 'public-site-content-service',
  route: '/servicio-marketing-de-contenidos/?gh_layout_review=gvc-fullscan',
  viewport: { width: 1440, height: 900 },
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', device: 'iPhone 13' }
  ],
  initialHoldMs: 1800,
  finalHoldMs: 700,
  readiness: {
    waitForFonts: true,
    selector: '.page-headline',
    postReadyDelayMs: 800,
    timeout: 15000
  },
  assertions: [
    { kind: 'visible', selector: '.page-headline', reason: 'la landing publica debe cargar su hero' }
  ],
  quality: {
    allowLogin: true,
    runtime: {
      failOnConsoleError: false,
      failOnHttpStatus: false,
      ignoreUrlPatterns: [
        'google-analytics',
        'googletagmanager',
        'doubleclick',
        'facebook',
        'hubspot',
        'hsforms',
        'clarity'
      ]
    },
    layout: {
      enabled: true,
      failOnViolations: false,
      ignoreSelectors: [
        '.circle-cursor',
        '.clb-scroll-top',
        '.socialbar',
        '.social-bar',
        '.admin-bar',
        '#wpadminbar'
      ],
      allowHorizontalScrollSelectors: ['.ohio-widget.carousel']
    }
  },
  steps: [
    { kind: 'mark', label: 'hero', clipSelector: '.page-headline', note: 'Hero de servicio. Sin breadcrumb roto ni espacios duros.' },
    { kind: 'scroll', selector: '.elementor-element-d33dd85', scrollBlock: 'start' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'offer', clipSelector: '.elementor-element-d33dd85', note: 'Bloque de oferta y promesa principal.' },
    { kind: 'scroll', selector: '.elementor-element-1c7659d', scrollBlock: 'start' },
    { kind: 'sleep', ms: 500 },
    ...serviceCards.flatMap((selector, index) => [
      { kind: 'scroll' as const, selector, scrollBlock: 'center' as const },
      { kind: 'sleep' as const, ms: 650 },
      {
        kind: 'mark' as const,
        label: `services-card-${index + 1}`,
        clipSelector: selector,
        note: 'Tarjeta de servicio revelada por scroll.'
      }
    ]),
    { kind: 'scroll', selector: '.elementor-element-1c7659d', scrollBlock: 'start' },
    { kind: 'sleep', ms: 900 },
    { kind: 'mark', label: 'services-grid', clipSelector: '.elementor-element-1c7659d', note: 'Servicios de marketing de contenidos con reveal ya activado.' },
    ...sections.slice(1, 3).flatMap(([label, selector, note]) => [
      { kind: 'scroll' as const, selector, scrollBlock: 'start' as const },
      { kind: 'sleep' as const, ms: 700 },
      { kind: 'mark' as const, label, clipSelector: selector, note }
    ]),
    { kind: 'scroll', selector: '.elementor-element-a59049b', scrollBlock: 'start' },
    { kind: 'sleep', ms: 700 },
    {
      kind: 'mark',
      label: 'methodology-cards',
      note: 'Banda morada full-bleed con cards contenidas en ancho maximo; captura viewport para conservar contexto visual.'
    },
    ...sections.slice(3).flatMap(([label, selector, note]) => [
      { kind: 'scroll' as const, selector, scrollBlock: 'start' as const },
      { kind: 'sleep' as const, ms: 700 },
      { kind: 'mark' as const, label, clipSelector: selector, note }
    ]),
    { kind: 'scroll', scrollTo: 'top' },
    { kind: 'mark', label: 'full-page', fullPage: true, note: 'Landing completa con scroll, de hero a footer.' }
  ]
}
