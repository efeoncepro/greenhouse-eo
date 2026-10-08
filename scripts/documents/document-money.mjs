// Dinero y FX para artefactos documentales locales. No amplía FinanceCurrency,
// el pricing engine, providers ni readiness de Greenhouse. Usa ISO/Intl para
// presentación y ratios decimales BigInt para redondear una sola vez (half-up).
const supported = new Set(Intl.supportedValuesOf('currency'))
const maxMinor = BigInt(Number.MAX_SAFE_INTEGER)

export function currencyInfo(currency, locale) {
  if (typeof currency !== 'string' || !supported.has(currency))
    throw new Error('Moneda ISO 4217 no soportada: ' + currency)
  const resolvedLocale = locale ?? (currency === 'PEN' ? 'es-PE' : 'es-CL')
  const formatter = new Intl.NumberFormat(resolvedLocale, { style: 'currency', currency })
  const precision = formatter.resolvedOptions().maximumFractionDigits

  return { currency, locale: resolvedLocale, precision, scale: 10n ** BigInt(precision) }
}

function fraction(value) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)))
    throw new Error('Importe decimal inválido')
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value))

  if (!match || (match[2]?.length ?? 0) > 12)
    throw new Error('Decimal positivo sin separadores ni exponentes requerido')

  return { numerator: BigInt(match[1] + (match[2] ?? '')), denominator: 10n ** BigInt(match[2]?.length ?? 0) }
}

export function roundRatio(numerator, denominator) {
  if (numerator < 0n || denominator <= 0n) throw new Error('Ratio no negativo requerido')

  return (2n * numerator + denominator) / (2n * denominator)
}

function safe(minor) {
  if (minor > maxMinor) throw new Error('Importe excede precisión monetaria segura')

  return minor
}

export function toMinor(value, currency) {
  const { scale, precision } = currencyInfo(currency),
    ratio = fraction(value)

  const scaled = ratio.numerator * scale

  if (scaled % ratio.denominator !== 0n) throw new Error(`${currency}: máximo ${precision} decimales monetarios`)

  return safe(scaled / ratio.denominator)
}

export function fromMinor(minor, currency) {
  const { scale } = currencyInfo(currency)

  const value = Number(safe(minor)) / Number(scale),
    ratio = fraction(value)

  if (ratio.numerator * scale !== minor * ratio.denominator)
    throw new Error('Importe excede precisión monetaria segura de presentación')

  return value
}

export function taxMinor(net, rate) {
  if (
    typeof rate !== 'number' ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 1 ||
    Math.abs(rate * 10000 - Math.round(rate * 10000)) > 1e-8
  )
    throw new Error('La tasa debe estar entre 0 y 1, con hasta cuatro decimales')
  const r = fraction(rate)

  return safe(roundRatio(net * r.numerator, r.denominator))
}

function isDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}

export function validateFx(fx, from, to, documentDate) {
  currencyInfo(from)
  currencyInfo(to)
  if (!fx || fx.from !== from || fx.to !== to || from === to)
    throw new Error('FX debe declarar el par exacto de origen y destino')
  const rate = fraction(fx.rate)

  if (rate.numerator === 0n) throw new Error('Tipo de cambio debe ser positivo')
  if (!isDate(fx.date) || !isDate(documentDate) || fx.date > documentDate)
    throw new Error('Fecha FX válida y no posterior al documento requerida')
  if (typeof fx.source !== 'string' || !fx.source.trim()) throw new Error('Fuente FX requerida')
  let url

  try {
    url = new URL(fx.sourceUrl)
  } catch {
    throw new Error('URL de fuente FX requerida')
  }

  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Fuente FX debe ser HTTPS sin credenciales')
  if (!['reference_conversion', 'fixed_quote_conversion'].includes(fx.purpose))
    throw new Error('Propósito FX explícito requerido')

  return rate
}

export function createMoneyPresentation({ currency, locale, presentation, date }) {
  const source = currencyInfo(currency),
    target = currencyInfo(presentation?.currency ?? currency, presentation?.locale ?? locale)

  const converted = target.currency !== source.currency

  if (!converted && presentation?.fx) throw new Error('No se acepta FX con monedas iguales')

  const rate = converted
    ? validateFx(presentation?.fx, currency, target.currency, date)
    : { numerator: 1n, denominator: 1n }

  const convertMinor = (value, divisor = 1) => {
    if (!Number.isSafeInteger(divisor) || divisor < 1) throw new Error('Divisor entero positivo requerido')
    // La división mensual ocurre antes de redondear, sin convertir un promedio USD ya redondeado.

    return safe(
      roundRatio(
        toMinor(value, currency) * rate.numerator * target.scale,
        rate.denominator * source.scale * BigInt(divisor)
      )
    )
  }

  const convert = (value, divisor = 1) => fromMinor(convertMinor(value, divisor), target.currency)
  const format = (value, divisor = 1) => formatMoney(convert(value, divisor), target.currency, target.locale)

  return {
    sourceCurrency: currency,
    currency: target.currency,
    locale: target.locale,
    precision: target.precision,
    converted,
    fx: converted ? structuredClone(presentation.fx) : null,
    convert,
    convertMinor,
    format
  }
}

export function formatMoney(amount, currency, locale) {
  const info = currencyInfo(currency, locale)

  // También admite referencias mensuales fraccionarias; nunca se usan para sumar facturas.
  const ratio = fraction(amount),
    minor = safe(roundRatio(ratio.numerator * info.scale, ratio.denominator))

  const value = fromMinor(minor, currency)

  if (currency === 'CLP') return '$' + new Intl.NumberFormat(info.locale, { maximumFractionDigits: 0 }).format(value)
  if (currency === 'USD')
    return (
      'US$' + new Intl.NumberFormat(info.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    )

  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: info.precision,
    maximumFractionDigits: info.precision
  })
    .format(value)
    .replaceAll('\u00a0', ' ')
}
