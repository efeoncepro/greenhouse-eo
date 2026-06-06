/**
 * Microcopy es-CL: comingSoon (página full-page de lanzamiento + countdown +
 * captura de email).
 *
 * Tono cálido y creativo anclado a la marca Greenhouse (invernadero → crecer /
 * germinar / florecer). Primera persona plural, tuteo es-CL, sentence case.
 * Un único emoji 🌱 (plantita) marca, de forma consistente, las líneas de la
 * metáfora de crecimiento/floración (descripción + toasts + launching) — NUNCA
 * en título/eyebrow/labels ni en errores. Las unidades del countdown van
 * separadas para pluralización.
 */

import type { ComingSoonCopy } from '../../types'

export const comingSoon: ComingSoonCopy = {
  eyebrow: 'Próximamente',
  title: 'Algo nuevo está creciendo',
  description:
    'Estamos cultivando la próxima evolución de tu ecosistema. Déjanos tu correo y te avisaremos apenas florezca. 🌱',
  emailLabel: 'Correo electrónico',
  emailPlaceholder: 'ej. nombre@empresa.com',
  notifyCta: 'Notifícame',
  notifyCtaLoading: 'Registrando…',
  useAnotherEmail: '¿Prefieres otro correo?',
  invalidEmail: 'Ingresa un correo válido (ej. nombre@empresa.com).',
  successToast: 'Listo. Te avisaremos apenas florezca. 🌱',
  alreadySubscribedToast: 'Ya estás en la lista. Te avisaremos apenas florezca. 🌱',
  errorToast: 'No pudimos registrar tu correo. Inténtalo de nuevo.',
  countdownDays: 'Días',
  countdownHours: 'Horas',
  countdownMinutes: 'Minutos',
  countdownSeconds: 'Segundos',
  launching: 'Abriendo el invernadero… 🌱'
}
