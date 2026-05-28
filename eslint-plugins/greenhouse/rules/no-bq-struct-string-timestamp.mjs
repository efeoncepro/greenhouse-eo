// TASK-941 / ISSUE-082 — greenhouse/no-bq-struct-string-timestamp
//
// Bloquea declarar un campo `TIMESTAMP`/`DATETIME`/`DATE`/`TIME` dentro de un
// struct-type map de BigQuery DML, es decir el `ARRAY<STRUCT<...>>` que se pasa
// como `types: { rows: [STRUCT] }` en `bigQuery.query({ query, params, types })`
// cuando se usa `INSERT ... SELECT FROM UNNEST(@rows)`.
//
// Bug class (ISSUE-082, verificado en vivo): el cliente Node de BigQuery NO
// coacciona un ISO string (`new Date().toISOString()`) al tipo TIMESTAMP cuando
// el campo vive dentro de un STRUCT. Escribe NULL silenciosamente. Resultado:
// `ico_engine.ai_signals.generated_at` quedó 100% NULL Mar-May 2026 → el
// enriquecedor descartaba todas las señales → runs `succeeded` con 0 procesadas
// (falso-sano). Feb (streaming insert legacy) tenía 0 NULL; el cambio a DML
// UNNEST (TASK-900 follow-up) introdujo la regresión.
//
// **Fix canonical**: declarar el campo `STRING` en el struct + convertir en SQL
// con `TIMESTAMP(s.<col>)` en el SELECT del UNNEST. Elimina por completo la
// dependencia de la coerción struct del cliente (la conversión vive en SQL).
//
//   ✗ const T = { generated_at: 'TIMESTAMP', ... }   // en types: { rows: [T] } → NULL
//   ✓ const T = { generated_at: 'STRING', ... }       // + TIMESTAMP(s.generated_at) en SELECT
//
// ─── Por qué SOLO array elements (no flat maps) ────────────────────────────
//
// El bug es EXCLUSIVO de `ARRAY<STRUCT>`. La rule dispara únicamente cuando el
// type-map es un ELEMENTO de un ArrayExpression (`[{...}]` o `[NAMED_CONST]`),
// que es la única forma sintáctica de un struct param. NO matchea:
//   - Schemas de CREATE TABLE (`{ computed_at: 'TIMESTAMP', ... }` flat) — ahí
//     TIMESTAMP es el tipo real de la columna, correcto.
//   - Params escalares (`types: { calculatedAt: 'TIMESTAMP' }` flat) — un scalar
//     TIMESTAMP param SÍ acepta ISO string; el bug no aplica.
// Falsos positivos confirmados al diseñar (ico-engine/schema.ts, payroll/*) eran
// exactamente esos dos casos flat → excluidos por el gate "array element".
//
// Heurística secundaria: el struct object debe tener ≥2 valores que sean tipos
// escalares BQ (`STRING`/`INT64`/`FLOAT64`/`BOOL`/...), señal inequívoca de un
// struct-type map (descarta arrays de objetos arbitrarios). Resuelve identifiers
// (`[AI_SIGNAL_STRUCT_TYPES]`) a su declaración const para cubrir el patrón real.
//
// Modo `error` desde commit-1 (post Slice 1 hay 0 violaciones).
// Override legítimo: `// eslint-disable-next-line greenhouse/no-bq-struct-string-timestamp`.
//
// Spec: CLAUDE.md sección Nexa Insights / ISSUE-082 / TASK-941.

const BQ_SCALAR_TYPES = new Set([
  'STRING',
  'BYTES',
  'INT64',
  'INTEGER',
  'FLOAT64',
  'FLOAT',
  'NUMERIC',
  'BIGNUMERIC',
  'BOOL',
  'BOOLEAN',
  'JSON',
  'GEOGRAPHY'
])

const BQ_TEMPORAL_TYPES = new Set(['TIMESTAMP', 'DATETIME', 'DATE', 'TIME'])

const literalStringValue = (node) => {
  if (!node) {
    return null
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }

  // `'TIMESTAMP' as const` (TSAsExpression)
  if (node.type === 'TSAsExpression') {
    return literalStringValue(node.expression)
  }

  return null
}

const propertyKeyName = (prop) => {
  if (!prop.key) {
    return null
  }

  if (prop.key.type === 'Identifier') {
    return prop.key.name
  }

  if (prop.key.type === 'Literal') {
    return String(prop.key.value)
  }

  return null
}

// Resuelve un Identifier (`[AI_SIGNAL_STRUCT_TYPES]`) a su ObjectExpression de
// declaración const, atravesando la cadena de scopes. Soporta `... as const`.
const resolveIdentifierObject = (identifier, context) => {
  let scope = context.sourceCode.getScope(identifier)

  while (scope) {
    const variable = scope.variables.find((entry) => entry.name === identifier.name)

    if (variable && variable.defs.length > 0) {
      const def = variable.defs[0]

      if (def.node.type === 'VariableDeclarator' && def.node.init) {
        let init = def.node.init

        if (init.type === 'TSAsExpression') {
          init = init.expression
        }

        return init.type === 'ObjectExpression' ? init : null
      }

      return null
    }

    scope = scope.upper
  }

  return null
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe declarar campos TIMESTAMP/DATETIME/DATE en un ARRAY<STRUCT> de BigQuery DML UNNEST. El cliente Node serializa ISO-string → NULL dentro de STRUCT. Usar STRING + TIMESTAMP() cast en el SELECT.',
      url: 'docs/issues/open/ISSUE-082-nexa-insights-false-healthy-destructive-replace-null-timestamps.md'
    },
    schema: [],
    messages: {
      structTimestamp:
        "Campo '{{field}}' declarado '{{type}}' en un ARRAY<STRUCT> de BigQuery DML. El cliente Node serializa ISO-string → NULL dentro del STRUCT. Declaralo 'STRING' y convertí en SQL con TIMESTAMP(s.{{field}}) en el SELECT del UNNEST (ISSUE-082)."
    }
  },

  create(context) {
    const reported = new Set()

    const checkStructObject = (objectNode) => {
      let bqTypedCount = 0
      const temporalProps = []

      for (const prop of objectNode.properties) {
        if (prop.type !== 'Property') {
          continue
        }

        const value = literalStringValue(prop.value)

        if (!value) {
          continue
        }

        if (BQ_SCALAR_TYPES.has(value)) {
          bqTypedCount += 1
        } else if (BQ_TEMPORAL_TYPES.has(value)) {
          bqTypedCount += 1
          temporalProps.push({ prop, type: value })
        }
      }

      // Un struct-type map BQ se reconoce por >=2 valores de tipo BQ. Sin ese
      // umbral, no es un struct types (evita arrays de objetos arbitrarios).
      if (bqTypedCount < 2) {
        return
      }

      for (const { prop, type } of temporalProps) {
        if (reported.has(prop)) {
          continue
        }

        reported.add(prop)

        context.report({
          node: prop,
          messageId: 'structTimestamp',
          data: {
            field: propertyKeyName(prop) ?? '<field>',
            type
          }
        })
      }
    }

    return {
      // ARRAY<STRUCT> param: el struct object es un elemento de un ArrayExpression,
      // ya sea inline (`[{...}]`) o por referencia (`[NAMED_STRUCT_TYPES]`).
      ArrayExpression(node) {
        for (const element of node.elements) {
          if (!element) {
            continue
          }

          if (element.type === 'ObjectExpression') {
            checkStructObject(element)
          } else if (element.type === 'Identifier') {
            const resolved = resolveIdentifierObject(element, context)

            if (resolved) {
              checkStructObject(resolved)
            }
          }
        }
      }
    }
  }
}
