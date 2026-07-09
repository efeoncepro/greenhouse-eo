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
// Nombre, Apellido, Correo (gate corporate_email), Rol (opcional), consent.
export const STANDARD_EBOOK_FIELDS = [
  { key: 'firstName', type: 'text', label: 'Nombre', required: true, autocomplete: 'given-name', validator: 'text', maxLength: 120 },
  { key: 'lastName', type: 'text', label: 'Apellido', required: true, autocomplete: 'family-name', validator: 'text', maxLength: 120 },
  { key: 'email', type: 'email', label: 'Correo corporativo', required: true, autocomplete: 'email', inputMode: 'email', validator: 'corporate_email', maxLength: 200 },
  {
    key: 'role',
    type: 'select',
    label: '¿Cuál es tu rol? (opcional)',
    placeholder: 'Selecciona',
    required: false,
    options: [
      { value: 'direccion', label: 'Dirección / C-level' },
      { value: 'marketing', label: 'Marketing / Growth' },
      { value: 'seo_contenidos', label: 'SEO / Contenidos' },
      { value: 'producto_tech', label: 'Producto / Tech' },
      { value: 'otro', label: 'Otro' },
    ],
  },
  { key: 'marketingConsent', type: 'consent', required: true },
] as const

// El gate de correo corporativo (bloquea free/disposable), estándar para todos los ebooks.
export const STANDARD_EBOOK_VALIDATION = { emailPolicy: { mode: 'block_field', field: 'email' } as const }

// greenhouse_only: el lead se captura en Greenhouse; entrega HubSpot + email de respaldo = follow-up.
// El ebook se entrega gated por handoff tokenizado (assetDownload), NO por form_destination.
export const STANDARD_EBOOK_DESTINATION_POLICY = {
  mode: 'greenhouse_only',
  engineDestinations: false,
  rationale:
    'Lead capturado en Greenhouse. Entrega HubSpot + email de respaldo = follow-up. El ebook se entrega gated por handoff tokenizado (assetDownload), no por form_destination.',
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
  copy: { helps: Record<string, string>; submit: string; noticeText: string; privacyUrl: string; consentLabel: string }
}

// La ruta gated de descarga es determinista por slug (el primitive de plataforma).
export const downloadPathTemplateForSlug = (slug: string): string =>
  `/api/public/growth/forms/${slug}/asset/{handle}`

// ── El registry ───────────────────────────────────────────────────────────────
export const EBOOK_FORMS: EbookFormConfig[] = [
  {
    slug: 'efeonce-web-agentica-ebook',
    name: 'Efeonce · Ebook El fin de la web',
    purpose: 'Lead magnet del ebook "El fin de la web" (marketing + IA) — landing /web-agentica.',
    surfaceId: 'fhsf-web-agentica-ebook',
    surfaceName: 'Efeonce Think — Ebook web agéntica',
    origins: ['https://think.efeoncepro.com'],
    asset: { objectName: 'ebooks/web-agentica/el-fin-de-la-web.pdf', fileName: 'El-fin-de-la-web-Efeonce.pdf', ttlHours: 72 },
    success: {
      title: 'Tu ebook va en camino',
      body: 'Te enviamos «El fin de la web» a tu correo y lo abrimos aquí mismo. ¿No ves el email? Revisa spam o promociones en unos minutos.',
      rewardTitle: 'El fin de la web',
      rewardBody: 'Marketing digital + IA. Léelo en 20 minutos, aplícalo esta semana.',
      bridge: { label: 'Medir mi visibilidad', href: '/brand-visibility' },
    },
    consentVersion: 'efeonce-web-agentica-ebook-consent-v1',
    copy: {
      helps: {
        'firstName.help': 'Así sabemos cómo saludarte.',
        'lastName.help': 'Para personalizar bien la conversación.',
        'email.help': 'Usa tu correo corporativo. El ebook está pensado para equipos y marcas reales.',
        'role.help': 'Nos ayuda a mandarte contenido que sí te sirve.',
      },
      submit: 'Enviarme el ebook',
      noticeText:
        'Efeonce Group SpA usará estos datos para enviarte el ebook y contenido relacionado. Puedes darte de baja cuando quieras.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
      consentLabel: 'Acepto recibir el ebook y contenido de Efeonce. Baja cuando quieras.',
    },
  },
]

export const getEbookFormConfig = (slug: string): EbookFormConfig | undefined =>
  EBOOK_FORMS.find(e => e.slug === slug)
