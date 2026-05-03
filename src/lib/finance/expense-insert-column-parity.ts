// TASK-765 Slice 2: Helper de paridad column-count vs expression-count para
// INSERTs SQL embebidos en TS. El error PG `INSERT has more target columns
// than expressions` es no recuperable y dejo el materializador
// `finance_expense_reactive_intake` en dead-letter el 2026-05-01, bloqueando
// 6 expenses para el periodo 2026-04 y por lo tanto 2 payment_orders zombie.
//
// Este helper es la red de seguridad anti-regresion: cualquier INSERT
// embebido en TS puede pasarse aqui y el resultado dice si el conteo de
// columnas en la lista de columnas matches el conteo de expressions en el
// VALUES.
//
// Reglas de parsing:
//
// - column list = entre el primer "(" despues de INTO ... y el ")" de
//   cierre. Comma-separated. Whitespace tolerado.
// - expression list = entre el "(" despues de VALUES y el ")" de cierre.
//   Comma-separated. Permite literals (FALSE, NOW(), CURRENT_TIMESTAMP),
//   placeholders ($1, $2::cast), y nested function calls (con balance de
//   parentesis).
//
// El helper NO ejecuta SQL — solo parsea el string. Es safe para tests
// unitarios sin DB. Para validacion runtime (e.g. catch real column drift)
// el equipo debe correr el materializador end-to-end contra dev (este test
// detecta drift estatico, no semantico).

export interface ParityResult {
  ok: boolean
  columnCount: number
  expressionCount: number
  columns?: string[]
  expressions?: string[]
  reason?: string
}

interface ParseRange {
  inner: string
  start: number
  end: number
}

/**
 * Encuentra el rango balanceado de parentesis empezando desde
 * `openIdx` (donde haystack[openIdx] === '('). Devuelve el contenido
 * dentro del paren matching, los indices, o null si no balancea.
 */
const findBalancedParens = (haystack: string, openIdx: number): ParseRange | null => {
  if (haystack[openIdx] !== '(') return null

  let depth = 0
  let inSingleQuote = false
  let inDoubleQuote = false

  for (let i = openIdx; i < haystack.length; i++) {
    const ch = haystack[i]
    const prev = i > 0 ? haystack[i - 1] : ''

    // Escape simple para strings — no soporta dollar-quoted strings (suficiente para INSERTs).
    if (ch === "'" && prev !== '\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (ch === '"' && prev !== '\\' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (inSingleQuote || inDoubleQuote) continue

    if (ch === '(') depth++
    else if (ch === ')') {
      depth--

      if (depth === 0) {
        return {
          inner: haystack.slice(openIdx + 1, i),
          start: openIdx,
          end: i
        }
      }
    }
  }

  return null
}

/**
 * Split top-level por coma respetando parentesis y comillas. Mantiene
 * "func(x, y)" como un solo token.
 */
const splitTopLevelCommas = (s: string): string[] => {
  const result: string[] = []
  let depth = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let buf = ''

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const prev = i > 0 ? s[i - 1] : ''

    if (ch === "'" && prev !== '\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      buf += ch
      continue
    }

    if (ch === '"' && prev !== '\\' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      buf += ch
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '(') depth++
      else if (ch === ')') depth--

      if (ch === ',' && depth === 0) {
        result.push(buf.trim())
        buf = ''
        continue
      }
    }

    buf += ch
  }

  if (buf.trim()) result.push(buf.trim())

  return result
}

/**
 * Asserta que un INSERT statement tiene paridad column-count vs
 * expression-count. Devuelve `ParityResult` con detalle parseado.
 *
 * Uso tipico (vitest):
 *   expect(checkInsertParity(sql).ok).toBe(true)
 *
 * Para INSERTs construidos dinamicamente (e.g. anchored-payments.ts usa
 * `${cols.join(', ')}`), pasa el SQL renderizado para el caso concreto
 * que se quiere validar.
 */
export const checkInsertParity = (sql: string): ParityResult => {
  // Encontrar "INSERT INTO <table> (" — la primera lista de parens
  // despues de INTO es la column list.
  const intoMatch = sql.match(/INSERT\s+INTO\s+[\w.]+\s*\(/i)

  if (!intoMatch) {
    return {
      ok: false,
      columnCount: 0,
      expressionCount: 0,
      reason: 'No se encontro patron `INSERT INTO <table> (`'
    }
  }

  const columnsOpenIdx = intoMatch.index! + intoMatch[0].length - 1
  const columnsRange = findBalancedParens(sql, columnsOpenIdx)

  if (!columnsRange) {
    return {
      ok: false,
      columnCount: 0,
      expressionCount: 0,
      reason: 'No se cerro la column list'
    }
  }

  const columns = splitTopLevelCommas(columnsRange.inner).filter(Boolean)

  // Encontrar el primer "VALUES (" despues de la column list.
  const tail = sql.slice(columnsRange.end + 1)
  const valuesMatch = tail.match(/VALUES\s*\(/i)

  if (!valuesMatch) {
    return {
      ok: false,
      columnCount: columns.length,
      expressionCount: 0,
      columns,
      reason: 'No se encontro patron `VALUES (`'
    }
  }

  const valuesOpenIdx = columnsRange.end + 1 + valuesMatch.index! + valuesMatch[0].length - 1
  const valuesRange = findBalancedParens(sql, valuesOpenIdx)

  if (!valuesRange) {
    return {
      ok: false,
      columnCount: columns.length,
      expressionCount: 0,
      columns,
      reason: 'No se cerro la expression list'
    }
  }

  const expressions = splitTopLevelCommas(valuesRange.inner).filter(Boolean)

  return {
    ok: columns.length === expressions.length,
    columnCount: columns.length,
    expressionCount: expressions.length,
    columns,
    expressions,
    reason:
      columns.length === expressions.length
        ? undefined
        : `Mismatch: ${columns.length} columnas vs ${expressions.length} expressions`
  }
}
