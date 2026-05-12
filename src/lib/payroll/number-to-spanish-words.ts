/**
 * TASK-862 Slice B — Convert CLP amounts to Spanish (es-CL) words for legal documents.
 *
 * Used in finiquito clausula segunda: "...la cantidad de $ 3.055.000.-
 * (tres millones cincuenta y cinco mil pesos chilenos)..."
 *
 * Range: 0 to 999_999_999_999 (twelve digits). Beyond throws to surface a real
 * data issue rather than silently truncate.
 *
 * Decimals: truncated via Math.trunc — CLP has no centavos in legal context.
 * Negative amounts: throw — legal documents do not represent negative cash flow
 * as a word phrase (a negative finiquito blocks emission at the readiness layer).
 *
 * Apocopation rules (canonical es-CL):
 *   - 1 + masculine noun -> "un peso" (NOT "uno peso")
 *   - 21 + masculine noun -> "veintiún pesos" (NOT "veintiuno pesos")
 *   - 31, 41, ... 91 -> "treinta y un pesos", "cuarenta y un pesos"
 *   - 1_000_000 -> "un millón" (NOT "uno millón")
 *   - 21_000_000 -> "veintiún millones"
 *   - X million -> "X millones" (plural), 1 -> "un millón"
 *   - 1000 -> "mil" (NOT "un mil")
 *   - 21_000 -> "veintiún mil"
 *
 * The function is pure, dependency-free, and deterministic — suitable for use in
 * @react-pdf/renderer at PDF generation time.
 */

const UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
const TENS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

const MAX_SUPPORTED = 999_999_999_999

export interface NumberToSpanishWordsOptions {
  /**
   * Currency suffix appended after the words. Default 'pesos chilenos' (legal
   * finiquito form). Override to 'pesos' (BICE-style) or '' for unit-less use.
   * The function handles the singular form ('peso') when amount === 1.
   */
  currencySuffix?: string
  /**
   * If true, currency suffix is omitted entirely (returns the raw cardinal).
   * Useful for non-monetary uses (days, units).
   */
  omitCurrency?: boolean
}

const writeUnderHundred = (n: number, isBeforeMasculineNoun: boolean): string => {
  if (n === 0) return ''

  if (n < 10) {
    if (n === 1 && isBeforeMasculineNoun) return 'un'

    return UNITS[n]
  }

  if (n < 20) return TEENS[n - 10]

  if (n < 30) {
    if (n === 20) return 'veinte'
    const ones = n - 20

    if (ones === 1) return isBeforeMasculineNoun ? 'veintiún' : 'veintiuno'

    return `veinti${UNITS[ones]}`
  }

  const tensIndex = Math.floor(n / 10)
  const onesPart = n % 10

  if (onesPart === 0) return TENS[tensIndex]

  const onesWord = onesPart === 1 && isBeforeMasculineNoun ? 'un' : UNITS[onesPart]

  return `${TENS[tensIndex]} y ${onesWord}`
}

const writeUnderThousand = (n: number, isBeforeMasculineNoun: boolean): string => {
  if (n === 0) return ''

  if (n < 100) return writeUnderHundred(n, isBeforeMasculineNoun)

  if (n === 100) return 'cien'

  const hundredsIndex = Math.floor(n / 100)
  const remainder = n % 100

  if (remainder === 0) return HUNDREDS[hundredsIndex]

  return `${HUNDREDS[hundredsIndex]} ${writeUnderHundred(remainder, isBeforeMasculineNoun)}`
}

const writeCardinal = (n: number, isBeforeMasculineNoun: boolean): string => {
  if (n === 0) return 'cero'

  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const remainder = n % 1000

  const parts: string[] = []

  if (millions > 0) {
    if (millions === 1) {
      parts.push('un millón')
    } else {
      // "millones" is masculine plural; the cardinal modifier uses masculine apocope
      const millionsWord = writeCardinal(millions, true)

      parts.push(`${millionsWord} millones`)
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mil')
    } else {
      const thousandsWord = writeCardinal(thousands, true)

      parts.push(`${thousandsWord} mil`)
    }
  }

  if (remainder > 0) {
    parts.push(writeUnderThousand(remainder, isBeforeMasculineNoun))
  }

  return parts.join(' ')
}

/**
 * Convert a CLP amount (or any non-negative integer) to es-CL words.
 *
 * @example
 * formatClpInWords(0) // "cero pesos chilenos"
 * formatClpInWords(1) // "un peso chileno"
 * formatClpInWords(21) // "veintiún pesos chilenos"
 * formatClpInWords(100) // "cien pesos chilenos"
 * formatClpInWords(1000) // "mil pesos chilenos"
 * formatClpInWords(1_000_001) // "un millón un pesos chilenos" (legally correct)
 * formatClpInWords(3_055_000) // "tres millones cincuenta y cinco mil pesos chilenos"
 * formatClpInWords(9_068_600) // "nueve millones sesenta y ocho mil seiscientos pesos chilenos"
 * formatClpInWords(3_055_000, { currencySuffix: 'pesos' }) // "tres millones cincuenta y cinco mil pesos"
 * formatClpInWords(15, { omitCurrency: true }) // "quince"
 *
 * @throws RangeError when amount is negative, non-finite, or exceeds 999_999_999_999.
 */
export const formatClpInWords = (amount: number, options?: NumberToSpanishWordsOptions): string => {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`formatClpInWords: amount must be finite (got ${amount}).`)
  }

  if (amount < 0) {
    throw new RangeError(`formatClpInWords: negative amounts are not supported (got ${amount}).`)
  }

  const integer = Math.trunc(amount)

  if (integer > MAX_SUPPORTED) {
    throw new RangeError(`formatClpInWords: amount exceeds maximum ${MAX_SUPPORTED} (got ${integer}).`)
  }

  const omitCurrency = options?.omitCurrency === true
  const isBeforeMasculineNoun = !omitCurrency
  const cardinal = writeCardinal(integer, isBeforeMasculineNoun)

  if (omitCurrency) return cardinal

  const suffix = options?.currencySuffix ?? 'pesos chilenos'

  if (suffix.length === 0) return cardinal

  // Singularize: 'pesos chilenos' -> 'peso chileno' when amount === 1
  const finalSuffix = integer === 1
    ? suffix
      .replace(/\bpesos\b/, 'peso')
      .replace(/\bchilenos\b/, 'chileno')
    : suffix

  return `${cardinal} ${finalSuffix}`
}
