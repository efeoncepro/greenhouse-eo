import {
  EFEONCE_LEGAL_ADDRESS_FALLBACK,
  EFEONCE_LEGAL_NAME_FALLBACK,
  EFEONCE_OPERATING_MARKETS,
  EFEONCE_SOCIAL_LINKS,
  EFEONCE_TAX_ID_FALLBACK
} from '@/config/efeonce-brand'

export type FooterProfileId =
  | 'internal_operational'
  | 'access_security'
  | 'relationship_transactional'
  | 'regulated_transactional'
  | 'subscription_marketing'

export interface FooterProfileMock {
  id: FooterProfileId
  name: string
  description: string
  context: string
  help?: string
  reference?: string
  socialLinks?: typeof EFEONCE_SOCIAL_LINKS
  controls?: readonly string[]
  legalLines?: readonly string[]
  legalNotice?: string
  rules: {
    social: boolean
    unsubscribe: boolean
    postalAddress: boolean
    legalNotice: string
  }
}

const LEGAL_ENTITY_LINE = `${EFEONCE_LEGAL_NAME_FALLBACK} · RUT ${EFEONCE_TAX_ID_FALLBACK}`
const HEADQUARTERS_LINE = `Casa matriz · ${EFEONCE_LEGAL_ADDRESS_FALLBACK}`
const ENTITY_LEGAL_LINES = [LEGAL_ENTITY_LINE, HEADQUARTERS_LINE] as const

export const FOOTER_PROFILE_MOCKS: readonly FooterProfileMock[] = [
  {
    id: 'internal_operational',
    name: 'Operación interna',
    description: 'Avisos internos sobre sistemas, colas y tareas operativas.',
    context: 'Aviso interno enviado desde Greenhouse, la plataforma de Efeonce.',
    reference: 'Referencia operativa: OP-2026-0187',
    legalLines: ENTITY_LEGAL_LINES,
    rules: {
      social: false,
      unsubscribe: false,
      postalAddress: true,
      legalNotice: 'Referencia operativa, si corresponde'
    }
  },
  {
    id: 'access_security',
    name: 'Acceso y seguridad',
    description: 'Invitaciones, credenciales, recuperación de acceso y alertas de seguridad.',
    context: 'Enviado desde Greenhouse, la plataforma de Efeonce.',
    help: 'Si no solicitaste esta acción, repórtala de inmediato.',
    controls: ['Reportar un problema de seguridad'],
    legalLines: ENTITY_LEGAL_LINES,
    rules: {
      social: false,
      unsubscribe: false,
      postalAddress: true,
      legalNotice: 'Aviso de seguridad, si corresponde'
    }
  },
  {
    id: 'relationship_transactional',
    name: 'Relación y servicio',
    description: 'Hiring, onboarding y mensajes que acompañan una relación activa.',
    context: 'Este mensaje forma parte de tu proceso con Efeonce.',
    help: 'Si necesitas ayuda, puedes responder a este mensaje.',
    legalLines: ENTITY_LEGAL_LINES,
    rules: {
      social: false,
      unsubscribe: false,
      postalAddress: true,
      legalNotice: 'Privacidad contextual, si aplica'
    }
  },
  {
    id: 'regulated_transactional',
    name: 'Operaciones reguladas',
    description: 'Finanzas, nómina y documentos sujetos a obligaciones específicas.',
    context: 'Este correo corresponde a una operación formal gestionada por Efeonce.',
    controls: ['Privacidad', 'Términos y condiciones'],
    legalLines: ENTITY_LEGAL_LINES,
    legalNotice: 'Conserva este correo como respaldo de la operación y su referencia.',
    reference: 'Referencia: TX-2026-00482',
    rules: {
      social: false,
      unsubscribe: false,
      postalAddress: true,
      legalNotice: 'Según la obligación aplicable'
    }
  },
  {
    id: 'subscription_marketing',
    name: 'Marketing y suscripciones',
    description: 'Contenido promocional o editorial que la persona eligió recibir.',
    context: 'Recibes este correo porque elegiste recibir contenidos de Efeonce.',
    socialLinks: EFEONCE_SOCIAL_LINKS,
    controls: ['Gestionar preferencias', 'Dejar de recibir estos correos', 'Privacidad'],
    legalLines: [LEGAL_ENTITY_LINE, EFEONCE_OPERATING_MARKETS.join(' · '), HEADQUARTERS_LINE],
    rules: {
      social: true,
      unsubscribe: true,
      postalAddress: true,
      legalNotice: 'Privacidad y finalidad comercial'
    }
  }
] as const
