/**
 * Contenido público compartido por todas las vacantes de Efeonce.
 *
 * No vive dentro de cada opening: copiarlo produciría drift entre vacantes. Los textos se
 * versionan aquí, se muestran en HTML y se incorporan al JobPosting desde la misma fuente.
 * La autoridad del bloque de beneficios es el Efeonce Candidate Benefits Charter.
 */
export const EFEONCE_CAREERS_STANDARD_CONTENT_VERSION = 1 as const

export const EFEONCE_CAREERS_COMPANY_CONTEXT =
  'Efeonce es una plataforma de servicios de marketing y crecimiento habilitada por IA. Integramos estrategia, creatividad, tecnología, datos y operación para construir crecimiento con nuestros clientes y convertir cada aprendizaje en sistemas reutilizables.'

/** Baseline global publicable. Deliberadamente excluye el monto del aporte de equipo. */
export const EFEONCE_CAREERS_STANDARD_BENEFITS = [
  '15 días hábiles de vacaciones remuneradas al año, más 1 día por cada año continuo cumplido hasta llegar a 20; los feriados corporativos de Chile se conceden aparte.',
  '2 días flotantes, 2 días de bienestar y hasta 16 horas remuneradas al año para atenciones médicas, administradas con privacidad.',
  'Permisos remunerados para situaciones importantes como matrimonio o unión civil, nacimiento o adopción, mudanza, duelo y deberes cívicos.',
  'US$50 mensuales para conectividad o coworking y apoyo confidencial de salud mental y bienestar.',
  '5 días de aprendizaje y un wallet anual de US$500 para desarrollo relevante al rol.',
  'Oportunidades de capacitación y certificación con partners internacionales como HubSpot, Google, Meta, Salesforce, OpenAI, Automattic, Truora y Aircall, según pertinencia y disponibilidad.'
] as const

export const resolveEfeonceCareersBenefits = (roleBenefits: readonly string[] = []): string[] => {
  const seen = new Set<string>()

  return [...EFEONCE_CAREERS_STANDARD_BENEFITS, ...roleBenefits].filter(benefit => {
    const key = benefit.replace(/\s+/g, ' ').trim().toLocaleLowerCase('es-CL')

    if (!key || seen.has(key)) return false
    seen.add(key)

    return true
  })
}
