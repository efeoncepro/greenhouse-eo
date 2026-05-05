/**
 * Greenhouse — ISO 3166-1 alpha-2 country dataset (canonical, es-CL labels).
 *
 * Single source of truth para selectores de pais en todo el portal.
 * NO hardcodear listas parciales en componentes — siempre importar de aqui.
 *
 * Greenhouse opera con colaboradoras en multiples paises (LATAM + Europa +
 * US + others). El dataset es la lista completa ISO; cada componente puede
 * filtrar/priorizar segun necesidad (e.g. priorizar LATAM al inicio).
 */

export interface CountryInfo {
  /** ISO 3166-1 alpha-2 uppercase. */
  code: string

  /** Nombre en es-CL. */
  name: string

  /** Emoji flag (Regional Indicator Symbols). */
  flag: string
}

/**
 * Helper: ISO alpha-2 → emoji flag via Regional Indicator Symbols.
 *  'C','L' → 🇨🇱
 */
const flagFromCode = (code: string): string => {
  if (code.length !== 2) return '🌐'
  const A = 0x1f1e6 - 'A'.charCodeAt(0)
  const upper = code.toUpperCase()

  return String.fromCodePoint(upper.charCodeAt(0) + A) + String.fromCodePoint(upper.charCodeAt(1) + A)
}

/**
 * Lista canonica ISO 3166-1 (~250 paises). Incluye nombre en es-CL.
 * Source: ISO 3166-1 + es traducciones consolidadas.
 *
 * Mantenimiento: si emerge un pais nuevo (raro — el ultimo fue Sudan del Sur
 * en 2011), agregar fila aqui. NUNCA crear sub-listas en componentes.
 */
const COUNTRY_NAMES_ES: ReadonlyArray<readonly [string, string]> = [
  ['AD', 'Andorra'],
  ['AE', 'Emiratos Arabes Unidos'],
  ['AF', 'Afganistan'],
  ['AG', 'Antigua y Barbuda'],
  ['AI', 'Anguila'],
  ['AL', 'Albania'],
  ['AM', 'Armenia'],
  ['AO', 'Angola'],
  ['AQ', 'Antartida'],
  ['AR', 'Argentina'],
  ['AS', 'Samoa Americana'],
  ['AT', 'Austria'],
  ['AU', 'Australia'],
  ['AW', 'Aruba'],
  ['AX', 'Islas Aland'],
  ['AZ', 'Azerbaiyan'],
  ['BA', 'Bosnia y Herzegovina'],
  ['BB', 'Barbados'],
  ['BD', 'Banglades'],
  ['BE', 'Belgica'],
  ['BF', 'Burkina Faso'],
  ['BG', 'Bulgaria'],
  ['BH', 'Barein'],
  ['BI', 'Burundi'],
  ['BJ', 'Benin'],
  ['BL', 'San Bartolome'],
  ['BM', 'Bermudas'],
  ['BN', 'Brunei'],
  ['BO', 'Bolivia'],
  ['BQ', 'Caribe Neerlandes'],
  ['BR', 'Brasil'],
  ['BS', 'Bahamas'],
  ['BT', 'Butan'],
  ['BV', 'Isla Bouvet'],
  ['BW', 'Botsuana'],
  ['BY', 'Bielorrusia'],
  ['BZ', 'Belice'],
  ['CA', 'Canada'],
  ['CC', 'Islas Cocos'],
  ['CD', 'Congo (RDC)'],
  ['CF', 'Republica Centroafricana'],
  ['CG', 'Congo'],
  ['CH', 'Suiza'],
  ['CI', 'Costa de Marfil'],
  ['CK', 'Islas Cook'],
  ['CL', 'Chile'],
  ['CM', 'Camerun'],
  ['CN', 'China'],
  ['CO', 'Colombia'],
  ['CR', 'Costa Rica'],
  ['CU', 'Cuba'],
  ['CV', 'Cabo Verde'],
  ['CW', 'Curazao'],
  ['CX', 'Isla de Navidad'],
  ['CY', 'Chipre'],
  ['CZ', 'Republica Checa'],
  ['DE', 'Alemania'],
  ['DJ', 'Yibuti'],
  ['DK', 'Dinamarca'],
  ['DM', 'Dominica'],
  ['DO', 'Republica Dominicana'],
  ['DZ', 'Argelia'],
  ['EC', 'Ecuador'],
  ['EE', 'Estonia'],
  ['EG', 'Egipto'],
  ['EH', 'Sahara Occidental'],
  ['ER', 'Eritrea'],
  ['ES', 'Espana'],
  ['ET', 'Etiopia'],
  ['FI', 'Finlandia'],
  ['FJ', 'Fiyi'],
  ['FK', 'Islas Malvinas'],
  ['FM', 'Micronesia'],
  ['FO', 'Islas Feroe'],
  ['FR', 'Francia'],
  ['GA', 'Gabon'],
  ['GB', 'Reino Unido'],
  ['GD', 'Granada'],
  ['GE', 'Georgia'],
  ['GF', 'Guayana Francesa'],
  ['GG', 'Guernsey'],
  ['GH', 'Ghana'],
  ['GI', 'Gibraltar'],
  ['GL', 'Groenlandia'],
  ['GM', 'Gambia'],
  ['GN', 'Guinea'],
  ['GP', 'Guadalupe'],
  ['GQ', 'Guinea Ecuatorial'],
  ['GR', 'Grecia'],
  ['GS', 'Georgia del Sur'],
  ['GT', 'Guatemala'],
  ['GU', 'Guam'],
  ['GW', 'Guinea-Bisau'],
  ['GY', 'Guyana'],
  ['HK', 'Hong Kong'],
  ['HM', 'Islas Heard y McDonald'],
  ['HN', 'Honduras'],
  ['HR', 'Croacia'],
  ['HT', 'Haiti'],
  ['HU', 'Hungria'],
  ['ID', 'Indonesia'],
  ['IE', 'Irlanda'],
  ['IL', 'Israel'],
  ['IM', 'Isla de Man'],
  ['IN', 'India'],
  ['IO', 'Territorio Britanico del Oceano Indico'],
  ['IQ', 'Irak'],
  ['IR', 'Iran'],
  ['IS', 'Islandia'],
  ['IT', 'Italia'],
  ['JE', 'Jersey'],
  ['JM', 'Jamaica'],
  ['JO', 'Jordania'],
  ['JP', 'Japon'],
  ['KE', 'Kenia'],
  ['KG', 'Kirguistan'],
  ['KH', 'Camboya'],
  ['KI', 'Kiribati'],
  ['KM', 'Comoras'],
  ['KN', 'San Cristobal y Nieves'],
  ['KP', 'Corea del Norte'],
  ['KR', 'Corea del Sur'],
  ['KW', 'Kuwait'],
  ['KY', 'Islas Caiman'],
  ['KZ', 'Kazajistan'],
  ['LA', 'Laos'],
  ['LB', 'Libano'],
  ['LC', 'Santa Lucia'],
  ['LI', 'Liechtenstein'],
  ['LK', 'Sri Lanka'],
  ['LR', 'Liberia'],
  ['LS', 'Lesoto'],
  ['LT', 'Lituania'],
  ['LU', 'Luxemburgo'],
  ['LV', 'Letonia'],
  ['LY', 'Libia'],
  ['MA', 'Marruecos'],
  ['MC', 'Monaco'],
  ['MD', 'Moldavia'],
  ['ME', 'Montenegro'],
  ['MF', 'San Martin (parte francesa)'],
  ['MG', 'Madagascar'],
  ['MH', 'Islas Marshall'],
  ['MK', 'Macedonia del Norte'],
  ['ML', 'Mali'],
  ['MM', 'Myanmar'],
  ['MN', 'Mongolia'],
  ['MO', 'Macao'],
  ['MP', 'Islas Marianas del Norte'],
  ['MQ', 'Martinica'],
  ['MR', 'Mauritania'],
  ['MS', 'Montserrat'],
  ['MT', 'Malta'],
  ['MU', 'Mauricio'],
  ['MV', 'Maldivas'],
  ['MW', 'Malaui'],
  ['MX', 'Mexico'],
  ['MY', 'Malasia'],
  ['MZ', 'Mozambique'],
  ['NA', 'Namibia'],
  ['NC', 'Nueva Caledonia'],
  ['NE', 'Niger'],
  ['NF', 'Isla Norfolk'],
  ['NG', 'Nigeria'],
  ['NI', 'Nicaragua'],
  ['NL', 'Paises Bajos'],
  ['NO', 'Noruega'],
  ['NP', 'Nepal'],
  ['NR', 'Nauru'],
  ['NU', 'Niue'],
  ['NZ', 'Nueva Zelanda'],
  ['OM', 'Oman'],
  ['PA', 'Panama'],
  ['PE', 'Peru'],
  ['PF', 'Polinesia Francesa'],
  ['PG', 'Papua Nueva Guinea'],
  ['PH', 'Filipinas'],
  ['PK', 'Pakistan'],
  ['PL', 'Polonia'],
  ['PM', 'San Pedro y Miquelon'],
  ['PN', 'Pitcairn'],
  ['PR', 'Puerto Rico'],
  ['PS', 'Palestina'],
  ['PT', 'Portugal'],
  ['PW', 'Palaos'],
  ['PY', 'Paraguay'],
  ['QA', 'Qatar'],
  ['RE', 'Reunion'],
  ['RO', 'Rumania'],
  ['RS', 'Serbia'],
  ['RU', 'Rusia'],
  ['RW', 'Ruanda'],
  ['SA', 'Arabia Saudita'],
  ['SB', 'Islas Salomon'],
  ['SC', 'Seychelles'],
  ['SD', 'Sudan'],
  ['SE', 'Suecia'],
  ['SG', 'Singapur'],
  ['SH', 'Santa Elena'],
  ['SI', 'Eslovenia'],
  ['SJ', 'Svalbard y Jan Mayen'],
  ['SK', 'Eslovaquia'],
  ['SL', 'Sierra Leona'],
  ['SM', 'San Marino'],
  ['SN', 'Senegal'],
  ['SO', 'Somalia'],
  ['SR', 'Surinam'],
  ['SS', 'Sudan del Sur'],
  ['ST', 'Santo Tome y Principe'],
  ['SV', 'El Salvador'],
  ['SX', 'San Martin (parte neerlandesa)'],
  ['SY', 'Siria'],
  ['SZ', 'Esuatini'],
  ['TC', 'Islas Turcas y Caicos'],
  ['TD', 'Chad'],
  ['TF', 'Territorios Australes Franceses'],
  ['TG', 'Togo'],
  ['TH', 'Tailandia'],
  ['TJ', 'Tayikistan'],
  ['TK', 'Tokelau'],
  ['TL', 'Timor Oriental'],
  ['TM', 'Turkmenistan'],
  ['TN', 'Tunez'],
  ['TO', 'Tonga'],
  ['TR', 'Turquia'],
  ['TT', 'Trinidad y Tobago'],
  ['TV', 'Tuvalu'],
  ['TW', 'Taiwan'],
  ['TZ', 'Tanzania'],
  ['UA', 'Ucrania'],
  ['UG', 'Uganda'],
  ['UM', 'Islas menores de los Estados Unidos'],
  ['US', 'Estados Unidos'],
  ['UY', 'Uruguay'],
  ['UZ', 'Uzbekistan'],
  ['VA', 'Ciudad del Vaticano'],
  ['VC', 'San Vicente y las Granadinas'],
  ['VE', 'Venezuela'],
  ['VG', 'Islas Virgenes Britanicas'],
  ['VI', 'Islas Virgenes Estadounidenses'],
  ['VN', 'Vietnam'],
  ['VU', 'Vanuatu'],
  ['WF', 'Wallis y Futuna'],
  ['WS', 'Samoa'],
  ['XK', 'Kosovo'],
  ['YE', 'Yemen'],
  ['YT', 'Mayotte'],
  ['ZA', 'Sudafrica'],
  ['ZM', 'Zambia'],
  ['ZW', 'Zimbabue']
]

/**
 * Lista canonica de paises (ISO 3166-1 alpha-2, ~250 entradas).
 * Frozen para prevenir mutaciones accidentales en consumers.
 */
export const COUNTRIES: ReadonlyArray<CountryInfo> = Object.freeze(
  COUNTRY_NAMES_ES.map(([code, name]) => Object.freeze({ code, name, flag: flagFromCode(code) }))
)

/**
 * Greenhouse opera principalmente en LATAM + ES + US. Esta lista priorizada
 * sirve para que los selectores muestren primero los paises mas comunes,
 * sin restringir el dataset completo.
 */
export const COUNTRY_PRIORITY_ORDER: ReadonlyArray<string> = [
  'CL', 'AR', 'CO', 'MX', 'PE', 'BR', 'EC', 'BO', 'PY', 'UY', 'VE',
  'NI', 'CR', 'GT', 'HN', 'SV', 'PA', 'DO', 'CU', 'PR',
  'ES', 'US',
  'CA', 'GB', 'FR', 'DE', 'IT', 'PT'
]

/**
 * Lista ordenada con los paises priorizados primero (en el orden de
 * COUNTRY_PRIORITY_ORDER) y luego el resto alfabetico.
 *
 * Use esta lista por default en selectores de pais.
 */
export const COUNTRIES_SORTED: ReadonlyArray<CountryInfo> = (() => {
  const map = new Map(COUNTRIES.map(c => [c.code, c]))
  const head: CountryInfo[] = []
  const seen = new Set<string>()

  for (const code of COUNTRY_PRIORITY_ORDER) {
    const entry = map.get(code)

    if (entry) {
      head.push(entry)
      seen.add(code)
    }
  }

  const tail = [...COUNTRIES]
    .filter(c => !seen.has(c.code))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return Object.freeze([...head, ...tail])
})()

/**
 * Lookup rapido por codigo. Devuelve `null` si no existe en ISO 3166-1.
 */
const COUNTRIES_BY_CODE: Map<string, CountryInfo> = new Map(COUNTRIES.map(c => [c.code, c]))

export const getCountryInfo = (code: string | null | undefined): CountryInfo | null => {
  if (!code) return null
  const upper = code.trim().toUpperCase()

  return COUNTRIES_BY_CODE.get(upper) ?? null
}

export const getCountryName = (code: string | null | undefined): string | null =>
  getCountryInfo(code)?.name ?? null

export const getCountryFlag = (code: string | null | undefined): string | null =>
  getCountryInfo(code)?.flag ?? null

export const isValidCountryCode = (code: string | null | undefined): boolean =>
  getCountryInfo(code) !== null
