import type { RenderContract } from './contract'

/** Fixture browser-safe mínimo (static) para tests + preview. */
export const staticContractFixture = (over: Partial<RenderContract> = {}): RenderContract => ({
  contractVersion: 'greenhouse-growth-public-forms.v1',
  form: {
    formId: 'form_demo',
    formKey: '00000000-0000-4000-8000-0000000000de',
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

/**
 * Fixture TASK-1256: integridad de datos — email corporativo gateado (`validator:
 * corporate_email`), teléfono E.164 por país, RUT (national_id CL) y URL. Sirve para
 * ver las máscaras (Slice 1) + el submit-gating (Slice 2) en el preview interno / GVC.
 */
export const dataIntegrityContractFixture = (): RenderContract =>
  staticContractFixture({
    composition: 'static',
    fields: [
      {
        key: 'work_email',
        type: 'email',
        label: 'Correo de trabajo',
        required: true,
        autocomplete: 'email',
        inputMode: 'email',
        validator: 'corporate_email',
      },
      { key: 'company', type: 'text', label: 'Empresa', required: true, autocomplete: 'organization' },
      {
        key: 'phone',
        type: 'tel',
        label: 'Teléfono',
        autocomplete: 'tel',
        inputMode: 'tel',
        validator: 'e164_phone',
        validatorParams: { country: 'CL' },
      },
      { key: 'national_id', type: 'national_id', label: 'RUT', validatorParams: { country: 'CL' } },
      { key: 'website', type: 'url', label: 'Sitio web', inputMode: 'url' },
      { key: 'message', type: 'textarea', label: 'Cuéntanos tu objetivo', maxLength: 300 },
    ],
  })

/** Fixture TASK-1320: success card/reward gobernada desde success_behavior_json. */
export const successCardContractFixture = (): RenderContract =>
  staticContractFixture({
    successBehavior: {
      kind: 'asset_access',
      presentation: 'success_card',
      title: 'Recibimos tu información',
      body: 'Tu solicitud quedó registrada. Revisaremos las señales públicas de tu marca y te mostraremos el siguiente paso.',
      steps: [
        { label: 'Validamos la información enviada.' },
        { label: 'Revisamos el contexto público de tu marca.' },
        { label: 'Te proponemos el siguiente paso.' },
      ],
      reward: {
        kind: 'ebook',
        title: 'Te dejamos un recurso para empezar',
        body: 'Puedes abrirlo ahora sin volver a completar el formulario.',
        action: {
          kind: 'download',
          label: 'Descargar ebook',
          href: 'https://efeoncepro.com/recursos/aeo.pdf',
          target: '_blank',
        },
      },
      actions: [
        {
          kind: 'schedule',
          label: 'Agendar una conversación',
          href: 'https://efeoncepro.com/contacto/',
          target: '_self',
        },
      ],
      supportingNote: 'Confirmamos recepción en Greenhouse; la entrega a sistemas externos ocurre después.',
    },
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

/**
 * TASK-2045 — Popup «Quiero ser partner» (canvas «Partners — Efeonce» v14): grilla 2×2 con ancho declarado,
 * consentimiento compacto con el enlace en la frase y éxito con el glifo de La órbita y «Cerrar». Fixture de
 * referencia del kit de formularios diseñados (TASK-2044); el copy es el del diseño aprobado.
 */
export const partnerApplicationContractFixture = (): RenderContract =>
  staticContractFixture({
    form: {
      formId: 'form_partner_demo',
      formKey: '00000000-0000-4000-8000-0000000000ef',
      slug: 'efeonce-partner-application',
      formVersionId: 'fv_partner_demo_1',
      version: 1,
      locale: 'es-CL',
      formKind: 'contact',
    },
    fields: [
      { key: 'fullName', type: 'text', label: 'Nombre y apellido', placeholder: 'Tu nombre', required: true, autocomplete: 'name', presentation: { width: 'half', icon: 'user' } },
      { key: 'email', type: 'email', label: 'Correo de trabajo', placeholder: 'tu@empresa.com', required: true, autocomplete: 'email', inputMode: 'email', presentation: { width: 'half', icon: 'mail' } },
      { key: 'company', type: 'text', label: 'Empresa o plataforma', placeholder: 'Nombre de la plataforma', required: true, autocomplete: 'organization', presentation: { width: 'half', icon: 'briefcase' } },
      { key: 'website', type: 'url', label: 'Sitio web', placeholder: 'https://', autocomplete: 'url', inputMode: 'url', presentation: { width: 'half', icon: 'globe' } },
      { key: 'offer', type: 'textarea', label: '¿Qué ofreces y a quién le sirve?', placeholder: 'Tu tecnología, el problema que resuelve y el tipo de cliente', required: true, presentation: { width: 'full', icon: 'message' } },
    ],
    copy: { submit: 'Enviar propuesta →' },
    consent: {
      presentation: 'compact',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
      privacyLinkLabel: 'política de privacidad',
      checkboxes: [
        { key: 'privacy', label: 'Acepto que Efeonce use estos datos para responder mi propuesta, según su {privacyLink}.', required: true },
      ],
    },
    successBehavior: {
      kind: 'inline_message',
      presentation: 'success_card',
      icon: 'orbit',
      title: 'Recibido',
      body: 'Gracias por escribirnos. Revisamos tu propuesta y te contactamos por correo.',
      // `steps: []` explícito: sin él la tarjeta muestra los pasos por defecto del diccionario.
      steps: [],
      actions: [{ kind: 'dismiss', label: 'Cerrar' }],
    },
  })
