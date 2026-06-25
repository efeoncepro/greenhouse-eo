import type { RenderContract } from './contract'

/** Fixture browser-safe mínimo (static) para tests + preview. */
export const staticContractFixture = (over: Partial<RenderContract> = {}): RenderContract => ({
  contractVersion: 'greenhouse-growth-public-forms.v1',
  form: {
    formId: 'form_demo',
    slug: 'ai-visibility-intake',
    formVersionId: 'fv_demo_1',
    version: 1,
    locale: 'es-CL',
    formKind: 'lead_magnet',
  },
  composition: 'static',
  fields: [
    { key: 'work_email', type: 'email', label: 'Correo de trabajo', required: true, autocomplete: 'email', inputMode: 'email' },
    { key: 'brand', type: 'text', label: 'Marca', required: true, autocomplete: 'organization' },
    { key: 'phone', type: 'tel', label: 'Teléfono', autocomplete: 'tel', inputMode: 'tel' },
    { key: 'message', type: 'textarea', label: 'Cuéntanos tu objetivo', maxLength: 500 },
  ],
  conditions: [],
  copy: {},
  consent: {
    noticeText: 'Tratamos tus datos según nuestra política de privacidad.',
    privacyUrl: 'https://efeonce.com/privacidad',
    checkboxes: [{ key: 'tos', label: 'Acepto ser contactado por Efeonce', required: true }],
  },
  successBehavior: { kind: 'inline_message', message: '¡Listo! Te enviamos el material a tu correo.' },
  surfacePolicy: { surfaceId: 'wordpress-public', allowedOrigins: [], rendererChannel: 'preview' },
  telemetryPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
  ...over,
})

/** Fixture conditional_simple: muestra `budget` solo si interest incluye growth. */
export const conditionalContractFixture = (): RenderContract =>
  staticContractFixture({
    composition: 'conditional_simple',
    fields: [
      {
        key: 'interest',
        type: 'select',
        label: 'Interés',
        required: true,
        options: [
          { value: 'awareness', label: 'Awareness' },
          { value: 'growth', label: 'Growth' },
        ],
      },
      {
        key: 'budget',
        type: 'text',
        label: 'Presupuesto',
        visibleWhen: [{ field: 'interest', equals: 'growth' }],
        requiredWhen: [{ field: 'interest', equals: 'growth' }],
      },
    ],
    consent: undefined,
  })

/** Fixture multi_step_light de 2 pasos. */
export const multiStepContractFixture = (): RenderContract =>
  staticContractFixture({
    composition: 'multi_step_light',
    fields: [
      { key: 'work_email', type: 'email', label: 'Correo', required: true, autocomplete: 'email' },
      { key: 'brand', type: 'text', label: 'Marca', required: true },
    ],
    steps: [
      { key: 's1', label: 'Contacto', fieldKeys: ['work_email'] },
      { key: 's2', label: 'Marca', fieldKeys: ['brand'] },
    ],
    consent: undefined,
  })
