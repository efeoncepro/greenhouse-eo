import 'server-only'

/**
 * TASK-1375 — Registry config-driven de los Growth Forms de ebook lead magnets.
 *
 * Agregar un ebook nuevo = agregar una entrada acá + correr `pnpm growth:forms:publish-ebook
 * --slug <slug> --apply`. NO se reimplementa el flujo por ebook (playbook
 * docs/reference/ebook-lead-magnet-playbook.md). Los campos, policies y consent son ESTÁNDAR
 * y compartidos; cada ebook solo declara lo que cambia (slug, nombre, asset, copy del thank-you,
 * origin, consent version).
 */

// ── Campos estándar (compartidos por todos los ebooks) ────────────────────────
// Nombre completo, Correo (gate corporate_email), Empresa y Rol opcionales.
// El consentimiento se declara una sola vez en `copy.checkboxes` del render contract;
// no debe duplicarse como campo del schema.
export const STANDARD_EBOOK_FIELDS = [
  {
    key: 'fullName',
    type: 'text',
    label: 'Nombre completo',
    required: true,
    autocomplete: 'name',
    validator: 'text',
    maxLength: 160
  },
  {
    key: 'email',
    type: 'email',
    label: 'Correo corporativo',
    required: true,
    autocomplete: 'email',
    inputMode: 'email',
    validator: 'corporate_email',
    maxLength: 200
  },
  {
    key: 'company',
    type: 'text',
    label: 'Empresa',
    required: false,
    autocomplete: 'organization',
    validator: 'text',
    maxLength: 160
  },
  {
    key: 'role',
    type: 'select',
    label: '¿Cuál es tu rol?',
    placeholder: 'Selecciona',
    required: false,
    options: [
      { value: 'direccion', label: 'Dirección / C-level' },
      { value: 'marketing', label: 'Marketing / Growth' },
      { value: 'seo_contenidos', label: 'Contenidos / Estrategia' },
      { value: 'producto_tech', label: 'Producto / Tech' },
      { value: 'otro', label: 'Otro' }
    ]
  }
] as const

// El gate de correo corporativo (bloquea free/disposable), estándar para todos los ebooks.
export const STANDARD_EBOOK_VALIDATION = {
  emailPolicy: { mode: 'block_field', field: 'email' } as const,
  namePolicy: {
    mode: 'split_full_name' as const,
    sourceField: 'fullName',
    firstNameField: 'firstName',
    lastNameField: 'lastName',
    confidenceField: 'nameParseConfidence'
  }
}

// El submit público siempre verifica Turnstile; el renderer necesita este contrato browser-safe
// para obtener el token invisible antes de enviar. La misma site key ya gobierna los formularios
// públicos de Think, incluido el hostname think.efeoncepro.com.
export const STANDARD_EBOOK_UI_POLICY = {
  composition: 'static',
  security: {
    captcha: {
      provider: 'turnstile',
      required: true,
      mode: 'invisible',
      siteKey: '0x4AAAAAADqwX2R7v-k9pItv',
      execution: 'submit'
    }
  }
} as const

// greenhouse_only: el lead se captura en Greenhouse; entrega HubSpot + email de respaldo = follow-up.
// El ebook se entrega gated por handoff tokenizado (assetDownload), NO por form_destination.
export const STANDARD_EBOOK_DESTINATION_POLICY = {
  mode: 'greenhouse_only',
  engineDestinations: false,
  rationale:
    'Lead capturado en Greenhouse. Entrega HubSpot + email de respaldo = follow-up. El ebook se entrega gated por handoff tokenizado (assetDownload), no por form_destination.'
}

export interface EbookFormConfig {
  /** slug público estable del form (kebab). Deriva el surface `fhsf-<slug-corto>`. */
  slug: string
  name: string
  purpose: string
  surfaceId: string
  surfaceName: string
  /** origins autorizados (CORS + surface auth) — p.ej. el origin de Think. */
  origins: string[]
  /** asset entregable en el bucket PRIVADO (subido con `growth:forms:upload-asset`). */
  asset: { objectName: string; fileName: string; ttlHours?: number }
  /** thank-you inline (success_card). El botón de descarga lo pinta la landing con el handoff. */
  success: {
    title: string
    body: string
    rewardTitle: string
    rewardBody: string
    /** puente (un solo next step). href root-relative same-origin o https absoluto. */
    bridge: { label: string; href: string }
  }
  consentVersion: string
  /** copy de ayuda + aviso legal del form. */
  copy: {
    helps: Record<string, string>
    errors?: Record<string, string>
    submit: string
    noticeText: string
    privacyUrl: string
    consentLabel: string
  }
}

// La ruta gated de descarga es determinista por slug (el primitive de plataforma).
export const downloadPathTemplateForSlug = (slug: string): string => `/api/public/growth/forms/${slug}/asset/{handle}`

// ── El registry ───────────────────────────────────────────────────────────────
export const EBOOK_FORMS: EbookFormConfig[] = [
  {
    slug: 'efeonce-web-agentica-ebook',
    name: 'Efeonce · Ebook El fin de la web solo para humanos',
    purpose: 'Lead magnet del ebook "El fin de la web solo para humanos" (web agéntica) — landing /web-agentica.',
    surfaceId: 'fhsf-web-agentica-ebook',
    surfaceName: 'Efeonce Think — Ebook web agéntica',
    origins: ['https://think.efeoncepro.com'],
    asset: {
      objectName: 'ebooks/web-agentica/el-fin-de-la-web.pdf',
      fileName: 'El-fin-de-la-web-Efeonce.pdf',
      ttlHours: 72
    },
    success: {
      title: 'Tu descarga está lista',
      body: 'El PDF ya se está descargando. Si necesitas abrirlo otra vez, usa el botón mientras esta página siga abierta.',
      rewardTitle: 'El fin de la web solo para humanos',
      rewardBody: 'Cinco actos y un checklist para entender la web agéntica y actuar esta semana.',
      bridge: { label: 'Medir mi visibilidad en IA', href: '/brand-visibility' }
    },
    consentVersion: 'efeonce-web-agentica-ebook-consent-v2',
    copy: {
      helps: {
        'fullName.help': 'Así personalizamos el envío.',
        'email.help': 'Usa tu correo corporativo para recibir el ebook.',
        'company.help': 'Opcional: nos ayuda a contextualizar el contenido.',
        'role.help': 'Opcional: nos ayuda a enviarte contenido relevante.'
      },
      errors: {
        'fullName.error.required': 'Escribe tu nombre completo para enviarte el ebook.',
        'email.error.required': 'Usa un correo corporativo para recibir el ebook.',
        'consent.error.required': 'Necesitas aceptar para recibir el ebook.'
      },
      submit: 'Enviar y descargar el ebook',
      noticeText:
        'Efeonce Group SpA usará estos datos para enviarte el ebook y contenido relacionado. Puedes darte de baja en cualquier momento.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
      consentLabel:
        'Acepto recibir el ebook y contenido relacionado de Efeonce. Puedo darme de baja en cualquier momento.'
    }
  }
]

export const getEbookFormConfig = (slug: string): EbookFormConfig | undefined => EBOOK_FORMS.find(e => e.slug === slug)
