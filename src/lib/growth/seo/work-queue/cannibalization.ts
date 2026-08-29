import 'server-only'

/**
 * TASK-1700 — Predicado ÚNICO de canibalización. Lo comparten los dos colectores que
 * enrutan el verbo, y por eso vive acá y no dentro de ninguno de los dos.
 *
 * ═══ Por qué existe (el defecto que corrige `incremental-clicks-v2`) ═══
 *
 * v1 preguntaba `COUNT(DISTINCT page) > 1`: "¿aparece más de una página del sitio?". Medido
 * contra berel.com sobre 28 días, ese predicado NO mide canibalización — mide MARCA:
 *
 * | población | queries | share medio de la página principal | páginas |
 * |---|---|---|---|
 * | no-marca  | 154 | 80,7 % | 6,1  |
 * | marca     | 602 | 34,2 % | 17,6 |
 *
 * El 80 % de lo que v1 llamaba "canibalizado" eran queries de marca, donde el sitio ocupa
 * legítimamente su propia SERP con sitelinks. El caso insignia lo dice solo: `pinturas` tenía
 * 41 páginas y **99,3 %** de las impresiones concentradas en una — la cola son 40 páginas con
 * migajas, no 41 URLs peleándose una intención. v1 le decía al operador "fusiona 41 URLs"
 * sobre la query de mayor demanda del sitio: la acción equivocada sobre el ítem #1.
 *
 * ═══ Las dos condiciones, y por qué NO basta una ═══
 *
 * 1. **Concentración**: la página principal se queda con ≤ `cannibalizationMaxMainPageShare`.
 *    Se mide sobre la PRINCIPAL y no sobre la segunda a propósito: con una principal al 50 %
 *    y cinco colas al 10 %, la segunda da 10 % y un umbral sobre ella diría "sana" teniendo
 *    la mitad del share disuelto. El share de la principal es robusto a cualquier número de
 *    colas chicas; su complemento (1 − principal) es la MISMA métrica, no otra.
 * 2. **No-marca**: sin esta condición el predicado colapsa en un detector de marca — 577 de
 *    las 620 queries que la concentración sola marcaría son de marca.
 *
 * ═══ De dónde sale "marca" (y qué NO se hizo) ═══
 *
 * NO se acopló a `grader_profiles.brand_name`: es captura de leads del grader público —
 * mayoría con `organization_id` nulo y filas de smoke — no un SSOT de marca por organización.
 * Colgar el score versionado de ahí sería inventarle un dueño a un concepto que no lo tiene.
 *
 * Se deriva del dato que el propio agregado YA posee: la etiqueta del `root_domain` del
 * target (`berel.com` → `berel`). Es una aproximación DECLARADA en la versión, no una
 * verdad: una marca cuyo dominio no contenga su nombre no se detecta. La dirección del error
 * está elegida — un falso negativo devuelve a v1 para ESA query; un falso positivo silencia
 * una canibalización real. Por eso el umbral de largo: bajo 4 caracteres se exige palabra
 * completa, porque `sky` como subcadena se come `whisky` y `skyline`.
 *
 * 🔴 Esto NO toca `ctrCurveScope`, que sigue en `all_rows` en v2. Con el primitive de marca
 * ya disponible, derivar la curva de filas no-marca es posible — y es un cambio que mueve
 * TODOS los scores. Shipearlo en la misma versión que este predicado haría imposible
 * atribuir un movimiento de ranking a uno o al otro. Es `incremental-clicks-v3`.
 */

import type { PriorityScoreConfig } from './score-versions'

/**
 * 🔴 Fragmento SQL compartido: qué cuenta como PÁGINA QUE COMPITE.
 *
 * Se exporta como texto y lo insertan los dos colectores, en vez de escribirse dos veces.
 * Responde una pregunta de producto, no de rendimiento: «¿esta URL es fusionable con otra?».
 *
 * 🔴 Y separa DOS preguntas que parecen una sola. Mezclarlas invierte el veredicto:
 *
 * - **¿Una sola página se queda con la query?** → se mide sobre TODAS las páginas, home
 *   incluida. La home no es fusionable, pero sí puede ser la que GANA.
 * - **¿Hay algo que fusionar?** → se cuenta sólo sobre páginas fusionables.
 *
 * Lo destapó medir: al excluir la home también del denominador, `pinturas` pasó de 99,3 %
 * de concentración a 13,2 % y volvió a salir "canibalizada" — el mismísimo caso que v2
 * existe para corregir. Su página dominante ERA la home; sacarla dejaba 37 páginas repartiéndose
 * las migajas y eso se lee como dilución cuando es exactamente lo contrario.
 *
 * Excluye del CONTEO dos clases que no son fusionables, medidas contra berel.com:
 *
 * - **La home.** Está entre las dos páginas principales en 19 de 43 casos. Una home no se
 *   fusiona con una ficha de producto: aparece porque Google la considera relevante para la
 *   marca, no porque compita por la intención.
 * - **Assets** (PDF, imágenes). El caso `pintura autoenfriante` traía ficha (306) + home
 *   (302) + DOS PDF de ficha técnica (233). Recomendar "fusiona 4 páginas" ahí es pedirle al
 *   operador que fusione un PDF con una página web.
 *
 * Y colapsa variantes de la MISMA URL (`http`/`https`, con y sin `www`, barra final): 1.074
 * de 1.421 URLs distintas del sitio no estaban bajo el host canónico, así que el conteo
 * crudo inflaba "N páginas compiten" con duplicaciones de una sola página.
 *

 * Parámetros que asume del query host: `$1` organizationId · `$2` windowDays.
 */
export const SEO_COMPETING_PAGE_CTE = `content_page AS (
         SELECT query,
                -- El orden importa. Primero se corta query-string y fragmento: sin eso
                -- una URL con ?utm=1 y la misma sin parametro cuentan como dos paginas, y
                -- una ficha .pdf con #ancla no matchea el filtro de assets. Recien despues
                -- se pela el protocolo (case-insensitive: hay HTTPS:// en el crudo) y el
                -- www, y al final la barra: asi dominio.com/?utm=x termina en dominio.com,
                -- sin barra, y se reconoce como home en vez de colarse como contenido.
                regexp_replace(
                  regexp_replace(
                    regexp_replace(regexp_replace(page, '[?#].*$', ''), '^https?://', '', 'i'),
                    '^www[.]', '', 'i'
                  ),
                  '/$', ''
                ) AS norm_page,
                SUM(impressions) AS impressions
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1
            AND capture_date >= (CURRENT_DATE - $2::int)
          GROUP BY query, 2
       ),
       competing AS (
         SELECT query,
                -- Cuenta SOLO paginas fusionables: sin barra tras el host = home; un asset
                -- no se fusiona con una pagina.
                COUNT(*) FILTER (
                  WHERE norm_page LIKE '%/%'
                    AND norm_page !~* '[.](pdf|jpe?g|png|webp|gif|svg|zip|docx?|xlsx?)$'
                )                AS competing_pages,
                -- Concentracion sobre TODAS las paginas, home incluida.
                MAX(impressions) AS main_page_impressions,
                SUM(impressions) AS total_page_impressions
           FROM content_page
          GROUP BY query
       )`

/** Pliega acentos y baja a minúsculas. `normalizeMarketKeyword` no pliega acentos. */
const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/**
 * Etiqueta de marca derivada del dominio raíz. `www.berel.com` → `berel`,
 * `berel.com.mx` → `berel`. Devuelve `null` si no hay nada utilizable: sin etiqueta, el
 * predicado degrada a "ninguna query es de marca", que es exactamente v1.
 */
export const deriveBrandToken = (rootDomain: string | null | undefined): string | null => {
  if (!rootDomain) return null

  const host = fold(rootDomain.trim())
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

  const label = host.split('.')[0]?.replace(/[^a-z0-9]/g, '') ?? ''

  return label.length >= 2 ? label : null
}

/**
 * ¿Es query de marca? Subcadena para etiquetas de 4+ caracteres (así `berelex` y
 * `pinturas berel precios` caen del mismo lado, que es el correcto: ambas son marca);
 * palabra completa para etiquetas cortas, donde la subcadena arrastraría falsos positivos.
 */
/**
 * Distancia de edición ≤ 1 (Levenshtein truncado). No calcula la distancia: sólo responde
 * "¿es 1 o menos?", que es lo único que se pregunta, y sale del bucle apenas ve la segunda
 * diferencia.
 */
const withinOneEdit = (word: string, token: string): boolean => {
  if (Math.abs(word.length - token.length) > 1) return false

  let i = 0
  let j = 0
  let edits = 0

  while (i < word.length && j < token.length) {
    if (word[i] === token[j]) {
      i += 1
      j += 1
      continue
    }

    edits += 1

    if (edits > 1) return false

    if (word.length > token.length) i += 1
    else if (word.length < token.length) j += 1
    else {
      i += 1
      j += 1
    }
  }

  return edits + (word.length - i) + (token.length - j) <= 1
}

/**
 * ¿Es query de marca? Subcadena para etiquetas de 4+ caracteres (así `berelex` y
 * `pinturas berel precios` caen del mismo lado, que es el correcto: ambas son marca);
 * palabra completa para etiquetas cortas, donde la subcadena arrastraría falsos positivos.
 *
 * 🔴 Y tolerancia a UN error de tipeo, que no es un lujo: medido sobre berel.com, los errores
 * de tipeo de la marca eran el modo de falla DOMINANTE de la subcadena sola — `bereñ` (38
 * páginas), `verel`, `berol`, `berrl`, `betel`, `berem`, `bere`. Ninguno contiene `berel`, y
 * los siete son gente buscando la marca. Sin esta tolerancia, 16 queries de marca entraban
 * como canibalización y el operador recibía "fusiona 38 URLs" sobre un error de tipeo.
 *
 * La tolerancia se aplica sólo a palabras de 4+ caracteres: con 3 o menos, distancia 1 no
 * discrimina nada (`sol` y `col` distan 1).
 */
export const isBrandQuery = (normalizedKeyword: string, brandToken: string | null): boolean => {
  if (!brandToken) return false

  const folded = fold(normalizedKeyword)

  if (brandToken.length >= 4) {
    if (folded.includes(brandToken)) return true

    return folded.split(/[^a-z0-9]+/).some(word => word.length >= 4 && withinOneEdit(word, brandToken))
  }

  return new RegExp(`(^|[^a-z0-9])${brandToken}([^a-z0-9]|$)`).test(folded)
}

export interface CannibalizationInput {
  normalizedKeyword: string
  /** Páginas distintas del sitio que aparecieron para la query en la ventana. */
  competingPages: number
  /** Impresiones de la página que más aporta. */
  mainPageImpressions: number
  /** Impresiones sumadas sobre todas las páginas (granularidad `[query, page]` de GSC). */
  totalImpressions: number
  brandToken: string | null
}

export interface CannibalizationVerdict {
  cannibalized: boolean
  /** `null` cuando no se puede medir (una sola página, o total en cero). */
  mainPageShare: number | null
  isBrand: boolean
}

/**
 * 🔴 El ÚNICO lugar donde se decide si una query está canibalizada. Los dos colectores lo
 * llaman. Un predicado duplicado (uno en SQL, otro en TS) se separa en silencio y el dedup
 * por sujeto enmascara la divergencia: el ítem aparecería en los dos orígenes y la
 * precedencia elegiría uno sin que nadie note el drift.
 *
 * ⚠️ Con una precisión que hay que hacer y no esconder: el SQL de consolidación **sí** repite
 * una de las cláusulas, `competing_pages > 1`, como prefiltro de candidatas. Es definicional
 * (no se canibaliza con una sola página) y su único efecto es no traer filas que el predicado
 * descartaría igual. Lo que NO puede volver a pasar es que los dos colectores alimenten este
 * predicado con definiciones DISTINTAS de `competingPages`: la primera versión de v2 hacía
 * exactamente eso —consolidación leía el conteo de páginas fusionables y striking-distance el
 * conteo CRUDO, con home y assets— y abría un hueco por el que un ítem desaparecía de la cola
 * entera: una query con home + un producto salía canibalizada de un lado (2 páginas crudas) y
 * quedaba fuera del otro (1 sola fusionable). Los dos leen `content_competing_pages`.
 */
export const evaluateCannibalization = (
  input: CannibalizationInput,
  config: PriorityScoreConfig
): CannibalizationVerdict => {
  // 🔴 La VERSIÓN decide si la marca existe como concepto, no el caller. Sin esta línea el
  // predicado obedecía un `brandToken` que le llegara aunque la config declarara
  // `brandDetection: 'none'`, y la regla volvía a estar partida entre este archivo y el
  // sitio que construye el contexto — la misma clase de defecto que v2 corrige. Lo destapó
  // medir contra PG real: v1 reportaba 81 canibalizadas de 400 candidatas multi-página
  // cuando por definición debía reportar las 400.
  const brandToken = config.brandDetection === 'root_domain_label' ? input.brandToken : null
  const isBrand = isBrandQuery(input.normalizedKeyword, brandToken)

  if (input.competingPages <= 1 || !(input.totalImpressions > 0)) {
    return { cannibalized: false, mainPageShare: null, isBrand }
  }

  const mainPageShare = input.mainPageImpressions / input.totalImpressions

  return {
    cannibalized: !isBrand && mainPageShare <= config.cannibalizationMaxMainPageShare,
    mainPageShare,
    isBrand
  }
}
