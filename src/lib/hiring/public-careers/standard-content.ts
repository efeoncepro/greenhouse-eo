/**
 * Contenido público compartido por todas las vacantes de Efeonce.
 *
 * No vive dentro de cada opening: copiarlo produciría drift entre vacantes. Los textos se
 * versionan aquí, se muestran en HTML y se incorporan al JobPosting desde la misma fuente.
 * La autoridad del bloque de beneficios es el Efeonce Candidate Benefits Charter.
 */
import { EFEONCE_OPERATING_MARKETS } from '@/config/efeonce-brand'

export const EFEONCE_CAREERS_STANDARD_CONTENT_VERSION = 2 as const

/**
 * «Chile, Estados Unidos, Colombia, México y Perú» compuesto desde el SSOT de marca.
 *
 * La huella operativa se hardcodeó mal antes en otras superficies: el sitio público todavía
 * muestra cuatro países y Estados Unidos entró recién el 2026-08-31 (`docs/context/01`). Leerla
 * de `EFEONCE_OPERATING_MARKETS` es la única forma de que este bloque no quede viejo solo.
 * Cobertura comercial ≠ oficina ni entidad legal en cada país: por eso dice «presencia».
 */
const OPERATING_MARKETS_SENTENCE = `${EFEONCE_OPERATING_MARKETS.slice(0, -1).join(', ')} y ${EFEONCE_OPERATING_MARKETS.at(-1)}`

/**
 * Contexto de compañía publicado en el bloque «Efeonce en breve» de toda vacante.
 *
 * Nivel de consciencia del lector: SOLUTION-AWARE. Un especialista senior conoce el mundo
 * agencia y no conoce Efeonce, así que el framework es BAB (contraste + mecanismo único), no
 * AIDA. La gran idea es una sola: **en la mayoría de las agencias el sistema lo pone la
 * persona; aquí el sistema ya existe.** Se rastrea a dos de las siete creencias contrarias
 * (`docs/context/05_voz-tono-estilo.md`): el problema es de arquitectura, no de talento; y la
 * creatividad que no se mide no se puede defender.
 *
 * Cómo se nombra la CATEGORÍA — patrón de dos capas de PDR-008 (Accepted):
 *   1. «agencia de marketing y tecnología», definición del operador (2026-09-09), más la huella
 *      operativa. El sitio público usa la variante con «digital» porque ahí es keyword de captura
 *      SEO; careers no compite por esa query, y el alcance real del trabajo es más ancho.
 *      Negar la categoría en careers deja a Efeonce sin categoría para su lector.
 *   2. Reencuadre OBLIGATORIO en la misma sección (§Reglas duras): «agencia» nunca queda como
 *      promesa suelta. Aquí lo hace el contraste de la segunda oración.
 *
 * El posicionamiento de PDR-012 («plataforma de servicios… habilitada por IA» / Integrated
 * Growth Partner / ASaaS / Growth OS) NO se aplica literal: ese PDR declara su superficie
 * —Home, About Us, sitio público, Think, landings de categoría y narrativa comercial— y careers
 * no está en ella. Lo que sí aporta es el MECANISMO: `medios` como capability propia y
 * `software propio` como prueba, nunca «tecnología» a secas, que es el claim sin mecanismo que
 * prohíbe la disciplina anti-humo de `docs/context/09_marca-agencia.md`.
 *
 * La convicción de cierre es del SSOT del Golden Circle (`09_marca-agencia.md` §WHY).
 *
 * Reglas de craft que este bloque tuvo que aprender a golpes:
 * - **Le habla al CANDIDATO, no al cliente.** La tercera oración existe para eso: traduce las
 *   capabilities a lo que gana quien va a trabajar aquí. Una versión previa era 100% «nosotros»
 *   y cero «tú» — en una vacante, eso es escribirle al comprador equivocado.
 * - **NUNCA liderar con siglas ni metodologías propias** (ICO, RpA, FTR, Loop Marketing):
 *   PDR-008 §Reglas duras las reserva para el bloque de prueba, y «Efeonce en breve» son los
 *   primeros 30 segundos de la vacante.
 * - **Un solo contraste, no tres.** Encadenar «no es X, sino Y» varias veces es un tell de
 *   AI-slop y suena a plantilla; el contraste vive en la segunda oración y en ningún otro lado.
 */
export const EFEONCE_CAREERS_COMPANY_CONTEXT = `Efeonce es una agencia de marketing y tecnología con presencia en ${OPERATING_MARKETS_SENTENCE}. La diferencia es que aquí creatividad, medios, web, CRM y data no son cinco proveedores que alguien tiene que conectar: son un solo equipo, con software propio detrás. Para ti eso significa briefs con contexto, decisiones con datos y trabajo que se puede defender. Y una convicción de fondo: el crecimiento no se entrega, se construye con el cliente hasta dejarlo más capaz de sostenerlo.`

/**
 * Calificador OBLIGATORIO del bloque de beneficios (Efeonce Candidate Benefits Charter,
 * §Approved copy block: "Adapt for length, but retain the meaning **and conditions**").
 *
 * Por qué no es opcional: la vinculación es Chile con contrato laboral local y, fuera de
 * Chile, internacional con pago directo de Efeonce, sobre 20 países elegibles. Publicar
 * "15 días hábiles de vacaciones remuneradas" sin esta condición le presenta a un candidato
 * de cualquiera de esos países un equivalente contractual como si fuera un derecho
 * estatutario idéntico al chileno — justo lo que el charter prohíbe representar.
 */
export const EFEONCE_CAREERS_BENEFITS_QUALIFIER =
  'La aplicación concreta de estos beneficios se formaliza según tu modalidad de contratación y país de residencia.'

/** Baseline global publicable. Deliberadamente excluye el monto del aporte de equipo. */
export const EFEONCE_CAREERS_STANDARD_BENEFITS = [
  '15 días hábiles de vacaciones remuneradas al año, más 1 día por cada año continuo cumplido hasta llegar a 20; los feriados corporativos de Chile se conceden aparte.',
  '2 días flotantes, 2 días de bienestar y hasta 16 horas remuneradas al año para atenciones médicas, administradas con privacidad.',
  'Permisos remunerados para situaciones importantes como matrimonio o unión civil, nacimiento o adopción, mudanza, duelo y deberes cívicos.',
  'US$50 mensuales para conectividad o coworking y apoyo confidencial de salud mental y bienestar.',
  '5 días de aprendizaje y un wallet anual de US$500 para desarrollo relevante al rol.',
  'Oportunidades de capacitación y certificación con partners internacionales como HubSpot, Google, Meta, Salesforce, OpenAI, Automattic, Truora y Aircall, según pertinencia y disponibilidad.'
] as const

/**
 * Beneficios publicables = baseline del charter + los propios del rol, deduplicados, y
 * SIEMPRE cerrados por el calificador de modalidad/país. El calificador va último y una sola
 * vez: es la condición que vuelve honesta a toda la lista, no un beneficio más.
 */
export const resolveEfeonceCareersBenefits = (roleBenefits: readonly string[] = []): string[] => {
  const seen = new Set<string>()

  const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('es-CL')

  const benefits = [...EFEONCE_CAREERS_STANDARD_BENEFITS, ...roleBenefits].filter(benefit => {
    const key = normalize(benefit)

    if (!key || key === normalize(EFEONCE_CAREERS_BENEFITS_QUALIFIER) || seen.has(key)) return false
    seen.add(key)

    return true
  })

  return benefits.length ? [...benefits, EFEONCE_CAREERS_BENEFITS_QUALIFIER] : []
}
