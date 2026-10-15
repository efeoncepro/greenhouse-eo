/**
 * Registro declarativo de destinos HubSpot de los Growth Forms del sitio público.
 *
 * Fuente única de: qué formulario HubSpot recibe cada Growth Form y a qué property va cada
 * campo. Lo consume `activate-hubspot-direct-destinations.ts` (dry-run por defecto).
 *
 * Reglas del registro:
 * - El target se resuelve por `formKey` (identidad pública estable), nunca por slug o página.
 * - `ghKey` es una clave de `normalized_fields_json`: un campo del `field_schema` o un derivado
 *   de `namePolicy.split_full_name` (`firstName` / `lastName`).
 * - Los `select` NO declaran opciones acá: se derivan del `field_schema` publicado, para que
 *   HubSpot nunca se desalinee del contrato de Greenhouse.
 * - Todo vive en el objeto contacto: el adapter envía `{ name, value }` sin `objectTypeId`.
 * - Este archivo es server-side. Nada de acá llega al render contract ni al navegador.
 */

export const HUBSPOT_PORTAL_ID = '48713323'

/** Grupo de properties donde nacen las properties creadas por este registro. */
export const HUBSPOT_PROPERTY_GROUP = {
  name: 'greenhouse_growth_forms',
  label: 'Formularios del Sitio (Greenhouse)',
} as const

/**
 * Formulario HubSpot cuya configuración (idioma, avisos, display) se clona al crear uno nuevo.
 * Debe ser un formulario `embedType: V3` («Contact Form - EO»): los del editor nuevo (V4, como
 * «AEO - Lead Form») no se pueden crear ni modificar por API.
 */
export const HUBSPOT_REFERENCE_FORM_ID = '8bee8dca-27f2-4ca5-ac09-7606351c7e72'

export type HubSpotDestinationFieldKind =
  /** Property que ya existe en el portal (estándar o custom previa). Nunca se crea ni se edita. */
  | 'existing'
  /** Property de texto de una línea, creada por el registro si falta. */
  | 'text'
  /** Property enumeration/select creada con las opciones del `field_schema` de Greenhouse. */
  | 'select'

export interface HubSpotDestinationFieldSpec {
  ghKey: string
  property: string
  /** Etiqueta legible de la property / campo del formulario en HubSpot. */
  label: string
  kind: HubSpotDestinationFieldKind
  description?: string
}

export interface HubSpotDestinationSpec {
  formKey: string
  slug: string
  /** Landing donde vive el formulario; se usa como `pageUri` del smoke. */
  pageUrl: string
  hubspotForm: {
    /** GUID de un formulario HubSpot existente. Si falta, se busca por `name` o se crea. */
    id?: string
    name: string
  }
  fields: HubSpotDestinationFieldSpec[]
}

const existing = (ghKey: string, property: string, label: string): HubSpotDestinationFieldSpec => ({
  ghKey,
  property,
  label,
  kind: 'existing',
})

const text = (ghKey: string, property: string, label: string, description: string): HubSpotDestinationFieldSpec => ({
  ghKey,
  property,
  label,
  kind: 'text',
  description,
})

const select = (ghKey: string, property: string, label: string, description: string): HubSpotDestinationFieldSpec => ({
  ghKey,
  property,
  label,
  kind: 'select',
  description,
})

const FIRST_NAME = existing('firstName', 'firstname', 'Nombre')
const LAST_NAME = existing('lastName', 'lastname', 'Apellidos')
const EMAIL = existing('email', 'email', 'Correo')
const PHONE = existing('phone', 'phone', 'Teléfono')
const COMPANY = existing('companyName', 'company', 'Empresa')
const WEBSITE = existing('website', 'website', 'Sitio web')

export const HUBSPOT_DESTINATION_SPECS: HubSpotDestinationSpec[] = [
  {
    formKey: 'b120566a-dd1a-43c8-956a-4e0121e805b8',
    slug: 'efeonce-aeo-diagnostic',
    pageUrl: 'https://efeoncepro.com/aeo-2/',
    hubspotForm: { id: '8649e76c-8b01-41f3-9b0c-5713d7b4dba6', name: 'AEO - Lead Form' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      existing('brandName', 'company', 'Marca'),
      existing('brandWebsite', 'website', 'Sitio web de la marca'),
      existing('country', 'pais_gh', 'País'),
      existing('companySize', 'tamano_de_la_empresa', 'Tamaño de la empresa'),
      existing('mainCompetitor', 'marca_de_competencia', 'Marca de competencia'),
    ],
  },
  {
    formKey: '5c7d7db7-be47-4137-b20a-b2a1f5be9ebd',
    slug: 'efeonce-contacto',
    pageUrl: 'https://efeoncepro.com/contacto/',
    hubspotForm: { id: '8bee8dca-27f2-4ca5-ac09-7606351c7e72', name: 'Contact Form - EO' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      PHONE,
      COMPANY,
      existing('country', 'country', 'País'),
      existing('contactReason', 'motivo_del_contacto', 'Motivo del contacto'),
      text('subject', 'gh_form_asunto', 'Asunto del Mensaje', 'Asunto que la persona escribió en el formulario de contacto del sitio.'),
      existing('message', 'message', 'Mensaje'),
    ],
  },
  {
    formKey: '18b228e9-106a-402e-a6f2-a8c5469e73d7',
    slug: 'efeonce-content-marketing',
    pageUrl: 'https://efeoncepro.com/servicio-marketing-de-contenidos/',
    hubspotForm: { name: 'Lead Gen - Content Marketing' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      COMPANY,
      select('mode', 'gh_form_content_modalidad', 'Modalidad de Trabajo (Content Marketing)', 'Modalidad de trabajo elegida en el formulario de Content Marketing.'),
      existing('challenge', 'message', 'Desafío'),
    ],
  },
  {
    formKey: 'bb220383-530e-4b3c-891f-bbdc75d7d112',
    slug: 'efeonce-hubspot-scope',
    pageUrl: 'https://efeoncepro.com/servicios-contratar-hubspot/',
    hubspotForm: { name: 'Lead Gen - Servicios HubSpot' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      PHONE,
      COMPANY,
      existing('jobTitle', 'jobtitle', 'Cargo'),
      select('scenario', 'gh_form_hubspot_escenario', 'Situación con HubSpot', 'En qué punto está la empresa con HubSpot al pedir la reunión.'),
      text('currentHubs', 'gh_form_hubspot_hubs_actuales', 'Hubs que Usa Hoy', 'Hubs de HubSpot que la empresa ya usa (selección múltiple, separados por coma).'),
      text('interests', 'gh_form_hubspot_intereses', 'Intereses en HubSpot', 'Productos y capacidades de HubSpot que le interesan (selección múltiple, separados por coma).'),
      select('teamSize', 'gh_form_hubspot_tamano_equipo', 'Tamaño del Equipo (HubSpot)', 'Tamaño del equipo que usará HubSpot.'),
      select('timeline', 'gh_form_hubspot_plazo', 'Plazo para Avanzar (HubSpot)', 'Cuándo quiere avanzar con el proyecto HubSpot.'),
      select('budgetStatus', 'gh_form_hubspot_presupuesto', 'Estado del Presupuesto (HubSpot)', 'Estado del presupuesto para el proyecto HubSpot.'),
      existing('context', 'message', 'Contexto'),
    ],
  },
  {
    formKey: 'd2c68012-2a6b-41d6-b3dd-4b8ccbff6ee3',
    slug: 'efeonce-creator-influence-brief',
    pageUrl: 'https://efeoncepro.com/servicios/agencia-de-influencers/',
    hubspotForm: { name: 'Lead Gen - Influencer Marketing' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      COMPANY,
      select('market', 'gh_form_influencer_mercado', 'Mercado (Influencer Marketing)', 'Mercado donde quiere activar creadores.'),
      select('activationType', 'gh_form_influencer_tipo_activacion', 'Tipo de Activación (Influencer Marketing)', 'Tipo de activación con creadores que busca.'),
      existing('objective', 'message', 'Objetivo'),
    ],
  },
  {
    formKey: '00231d6c-e1a0-4857-ae5b-a27262ae8b69',
    slug: 'efeonce-desarrollo-web-cotizacion',
    pageUrl: 'https://efeoncepro.com/desarrollo-sitios-web/',
    hubspotForm: { name: 'Lead Gen - Desarrollo Web' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      COMPANY,
      WEBSITE,
      select('companySize', 'gh_form_web_tamano_empresa', 'Tamaño de Empresa (Desarrollo Web)', 'Tamaño de la empresa declarado al cotizar un sitio web.'),
      select('projectStage', 'gh_form_web_etapa_proyecto', 'Etapa del Proyecto (Desarrollo Web)', 'Tipo de proyecto web que quiere cotizar.'),
      existing('objective', 'message', 'Objetivo'),
    ],
  },
  {
    formKey: '7772dcf4-e2ca-4f5b-b386-2db92659b050',
    slug: 'efeonce-seo-diagnostic',
    pageUrl: 'https://efeoncepro.com/servicios/posicionamiento-seo/',
    hubspotForm: { name: 'Lead Gen - SEO' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      COMPANY,
      WEBSITE,
      select('role', 'gh_form_seo_rol', 'Rol (SEO)', 'Rol de la persona que pide el diagnóstico SEO.'),
      select('targetMarket', 'gh_form_seo_mercado', 'Mercado Principal (SEO)', 'Mercado principal donde quiere posicionarse.'),
      select('mainGoal', 'gh_form_seo_objetivo', 'Objetivo Principal (SEO)', 'Qué quiere mejorar primero con SEO.'),
      select('seoCurrentState', 'gh_form_seo_estado_actual', 'Estado Actual del SEO', 'Cómo trabaja hoy su SEO.'),
      select('monthlyInvestmentRange', 'gh_form_seo_inversion_mensual', 'Inversión Mensual Pensada (SEO)', 'Rango de inversión mensual que tiene pensado, en USD.'),
      select('projectTimeline', 'gh_form_seo_plazo', 'Plazo para Avanzar (SEO)', 'Cuándo quiere avanzar con el proyecto SEO.'),
      existing('context', 'message', 'Contexto adicional'),
    ],
  },
  {
    formKey: 'f83cb310-2477-4776-adb0-57fb07e95594',
    slug: 'efeonce-social-audit',
    pageUrl: 'https://efeoncepro.com/servicios/redes-sociales/',
    hubspotForm: { name: 'Lead Gen - Redes Sociales' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      COMPANY,
      existing('role', 'jobtitle', 'Cargo'),
      text('brandPresence', 'gh_form_social_presencia_marca', 'Presencia de Marca (Redes Sociales)', 'Perfiles o canales de la marca que la persona declaró al pedir la auditoría de redes.'),
      select('primaryObjective', 'gh_form_social_objetivo', 'Objetivo Principal (Redes Sociales)', 'Objetivo principal que busca con redes sociales.'),
    ],
  },
  {
    formKey: 'e913d958-2ad7-48a5-8015-dbff53eca4a3',
    slug: 'efeonce-creative-diagnostic',
    pageUrl: 'https://efeoncepro.com/agencia-creativa/',
    hubspotForm: { name: 'Lead Gen - Agencia Creativa' },
    fields: [
      FIRST_NAME,
      LAST_NAME,
      EMAIL,
      PHONE,
      existing('companyName', 'company', 'Empresa o sitio web'),
      select('role', 'gh_form_creative_rol', 'Rol (Agencia Creativa)', 'Rol de la persona que pide el diagnóstico creativo.'),
      select('mainBlocker', 'gh_form_creative_freno', 'Principal Freno (Agencia Creativa)', 'Qué frena hoy al equipo de marketing o marca, según la persona.'),
      select('marketingTeamSize', 'gh_form_creative_tamano_equipo', 'Tamaño del Equipo de Marketing (Agencia Creativa)', 'Tamaño declarado del equipo de marketing.'),
      select('startTimeline', 'gh_form_creative_plazo', 'Plazo para Partir (Agencia Creativa)', 'Cuándo quiere partir con el trabajo creativo.'),
      existing('context', 'message', 'Contexto'),
    ],
  },
]
