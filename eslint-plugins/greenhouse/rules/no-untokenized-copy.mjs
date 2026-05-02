// TASK-265 Slice 5a — greenhouse/no-untokenized-copy
//
// Bloquea microcopy hardcodeado en UI productiva. La capa canonica de copy
// vive en dos lugares:
//
//   1. src/config/greenhouse-nomenclature.ts — product nomenclature + nav
//   2. src/lib/copy/ — microcopy funcional shared (locale-aware)
//
// Esta rule detecta strings literales en patterns de alto impacto detectados
// por el audit 2026-05-02 (~630 strings residuales):
//
//   1. aria-label literal      (405 instancias detectadas)
//   2. Status maps inline      (100 instancias) — { label: 'Pendiente' }
//      en objetos con shape de status (claves operativas como pending,
//      active, approved, rejected, etc.)
//   3. Loading strings inline  (94 instancias) — 'Cargando...', 'Guardando...',
//      'Procesando...', etc. en JSX text o string props
//   4. Empty state strings     (31 instancias) — 'Sin datos', 'Sin resultados',
//      'No hay', 'No se encontraron', etc.
//   5. Cobertura secundaria    — label, placeholder, helperText, title
//      cuando son literales (cobertura conservadora; ya estan mayormente
//      tokenizados en el codebase actual)
//
// Mensajes accionables apuntan al namespace correcto de src/lib/copy.
//
// Patron heredado de no-hardcoded-fontfamily (TASK-567) y
// no-raw-table-without-shell (TASK-743): AST vanilla, .mjs, mensajes
// granulares por tipo de drift.
//
// Modo inicial: warn (no bloquea CI mientras TASK-407/408 ejecutan sweep).
// Modo final:   error (post cierre TASK-408).
//
// Spec: docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md
// Foundation: src/lib/copy/types.ts (namespaces canonicos)
// Skill governance: ~/.claude/skills/greenhouse-ux-writing/skill.md

const LOADING_PATTERNS = [
  /^\s*Cargando\.{2,3}\s*$/i,
  /^\s*Guardando\.{2,3}\s*$/i,
  /^\s*Procesando\.{2,3}\s*$/i,
  /^\s*Enviando\.{2,3}\s*$/i,
  /^\s*Subiendo\.{2,3}\s*$/i,
  /^\s*Descargando\.{2,3}\s*$/i,
  /^\s*Sincronizando\.{2,3}\s*$/i,
  /^\s*Generando\.{2,3}\s*$/i,
  /^\s*Validando\.{2,3}\s*$/i,
  /^\s*Autenticando\.{2,3}\s*$/i
]

const EMPTY_PATTERNS = [
  /^\s*Sin datos\s*$/i,
  /^\s*Sin resultados\s*$/i,
  /^\s*No hay (datos|resultados|elementos|registros)\b/i,
  /^\s*No se encontraron\b/i,
  /^\s*Lista vac[ií]a\s*$/i
]

// Status map keys that signal we're inside a status/state object literal.
// When a Property has key `label` and any sibling has key matching one of
// these, we treat the literal value as a status map drift.
const STATUS_OBJECT_KEYS = new Set([
  'pending',
  'active',
  'inactive',
  'approved',
  'rejected',
  'draft',
  'review',
  'inReview',
  'in_review',
  'completed',
  'cancelled',
  'canceled',
  'archived',
  'scheduled',
  'paused',
  'expired',
  'blocked',
  'enabled',
  'disabled',
  'paid',
  'unpaid',
  'partial',
  'overdue',
  'failed',
  'succeeded',
  'success'
])

// Status literal values that, when seen as `label: 'Pendiente'`, indicate
// a Spanish status label that should live in the dictionary.
const STATUS_VALUE_PATTERNS = [
  /^(Activo|Inactivo|Pendiente|Aprobado|Rechazado|Borrador|En revisi[oó]n|Completado|Cancelado|Archivado|Programado|Pausado|Vencido|Bloqueado|Habilitado|Deshabilitado|Pagado|Sin pagar|Parcial|Atrasado|Fall[oó]|Exitoso|En curso|Sin iniciar|En l[ií]nea|Sin conexi[oó]n|Disponible|No disponible)$/
]

const SECONDARY_PROPS = new Set(['label', 'placeholder', 'helperText', 'title', 'subtitle'])

const matchesAny = (value, patterns) => {
  if (typeof value !== 'string') return false

  return patterns.some(pattern => pattern.test(value))
}

const extractLiteralString = node => {
  if (!node) return null

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map(q => q.value && q.value.cooked).join('')
  }

  return null
}

const extractFromJsxAttributeValue = attrValue => {
  if (!attrValue) return null

  // <Foo label='Save' />
  if (attrValue.type === 'Literal' && typeof attrValue.value === 'string') {
    return attrValue.value
  }

  // <Foo label={'Save'} />
  if (attrValue.type === 'JSXExpressionContainer') {
    const expr = attrValue.expression

    if (expr.type === 'Literal' && typeof expr.value === 'string') return expr.value

    if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0) {
      return expr.quasis.map(q => q.value && q.value.cooked).join('')
    }
  }

  return null
}

const isSiblingStatusKey = property => {
  // Walk up to ObjectExpression parent and check if any other property has
  // a key in STATUS_OBJECT_KEYS. This identifies status/state map shapes.
  const parentObj = property.parent

  if (!parentObj || parentObj.type !== 'ObjectExpression') return false

  return parentObj.properties.some(prop => {
    if (prop === property) return false
    if (prop.type !== 'Property') return false

    const key = prop.key

    if (!key) return false

    const keyName = key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : null

    return keyName && STATUS_OBJECT_KEYS.has(keyName)
  })
}

const isInsideAnotherStatusEntry = property => {
  // Detect the inverse pattern: { pending: { label: 'Pendiente' } } where
  // the property `label: 'Pendiente'` lives inside a value that is itself a
  // value of a Property whose key is in STATUS_OBJECT_KEYS.
  const objParent = property.parent

  if (!objParent || objParent.type !== 'ObjectExpression') return false

  const propParent = objParent.parent

  if (!propParent || propParent.type !== 'Property') return false

  const grandKey = propParent.key

  if (!grandKey) return false

  const grandKeyName = grandKey.type === 'Identifier' ? grandKey.name : grandKey.type === 'Literal' ? String(grandKey.value) : null

  return Boolean(grandKeyName && STATUS_OBJECT_KEYS.has(grandKeyName))
}

const isInsideJsxAttribute = property => {
  // Walk up looking for JSXAttribute (sx, style, slotProps, InputProps, etc.)
  // We do NOT trigger for `label`/`placeholder` etc. inside arbitrary objects
  // unless they are within a JSX attribute or styled() call. This reduces
  // false positives in test fixtures, payload builders, etc.
  let current = property.parent

  while (current) {
    if (current.type === 'JSXAttribute') return true

    if (current.type === 'CallExpression') {
      const callee = current.callee

      if (callee && callee.type === 'Identifier' && callee.name === 'styled') return true
    }

    current = current.parent
  }

  return false
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded microcopy literals in product UI. Use src/lib/copy or src/config/greenhouse-nomenclature.ts (TASK-265 contract).',
      recommended: true
    },
    schema: [],
    messages: {
      ariaLiteral:
        "aria-label literal hardcoded. Use `getMicrocopy().aria.<key>` from `@/lib/copy` (TASK-265 namespace `aria`). For domain-specific aria-labels, define them in greenhouse-nomenclature.ts and invoke skill `greenhouse-ux-writing`.",
      statusMapLiteral:
        "Status label literal in status map. Use `getMicrocopy().states.<key>` from `@/lib/copy` (TASK-265 namespace `states`) instead of inline ['Activo', 'Pendiente', ...]. Audit 2026-05-02 detected 100 instances.",
      loadingLiteral:
        "Loading/processing literal hardcoded. Use `getMicrocopy().loading.<key>` from `@/lib/copy` (TASK-265 namespace `loading`). Available: loading, saving, processing, sending, etc.",
      emptyLiteral:
        "Empty state literal hardcoded. Use `getMicrocopy().empty.<key>` from `@/lib/copy` (TASK-265 namespace `empty`). Available: noData, noResults, searchEmpty, firstUseTitle, etc.",
      secondaryLiteral:
        "Hardcoded copy literal in `{prop}` prop. Use `getMicrocopy()` from `@/lib/copy` for shared microcopy or `greenhouse-nomenclature.ts` for product nomenclature. Skill `greenhouse-ux-writing` valida tono."
    }
  },
  create(context) {
    return {
      // 1. aria-label literal (highest impact: 405 instances)
      JSXAttribute(node) {
        const name = node.name && node.name.name

        if (name !== 'aria-label') return

        const value = extractFromJsxAttributeValue(node.value)

        if (value === null) return
        if (value.trim().length === 0) return

        context.report({
          node: node.value || node,
          messageId: 'ariaLiteral'
        })
      },

      // 2. Status maps + 4. Empty states + secondary props (label/placeholder/etc)
      Property(node) {
        const key = node.key

        if (!key) return

        const keyName = key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : null

        if (!keyName) return

        const value = extractLiteralString(node.value)

        if (value === null) return
        if (value.trim().length === 0) return

        // Status map detection
        if (keyName === 'label') {
          if (matchesAny(value, STATUS_VALUE_PATTERNS) && (isSiblingStatusKey(node) || isInsideAnotherStatusEntry(node))) {
            context.report({ node: node.value, messageId: 'statusMapLiteral' })

            return
          }
        }

        // Loading detection in any property value
        if (matchesAny(value, LOADING_PATTERNS)) {
          context.report({ node: node.value, messageId: 'loadingLiteral' })

          return
        }

        // Empty state detection in any property value
        if (matchesAny(value, EMPTY_PATTERNS)) {
          context.report({ node: node.value, messageId: 'emptyLiteral' })

          return
        }

        // Secondary coverage: label/placeholder/helperText/title/subtitle
        // ONLY when inside JSX attribute or styled() — avoid false positives
        // in payload builders, test fixtures, etc.
        if (SECONDARY_PROPS.has(keyName) && isInsideJsxAttribute(node)) {
          // Already covered by status detection above; double-check we're not
          // re-reporting a status case.
          if (!matchesAny(value, STATUS_VALUE_PATTERNS) && !matchesAny(value, LOADING_PATTERNS) && !matchesAny(value, EMPTY_PATTERNS)) {
            context.report({
              node: node.value,
              messageId: 'secondaryLiteral',
              data: { prop: keyName }
            })
          }
        }
      },

      // 3. Loading + 4. Empty states as JSX text nodes
      // <Typography>Cargando...</Typography> or <Box>{'Sin datos'}</Box>
      JSXText(node) {
        const value = node.value

        if (typeof value !== 'string') return
        if (value.trim().length === 0) return

        if (matchesAny(value, LOADING_PATTERNS)) {
          context.report({ node, messageId: 'loadingLiteral' })

          return
        }

        if (matchesAny(value, EMPTY_PATTERNS)) {
          context.report({ node, messageId: 'emptyLiteral' })
        }
      }
    }
  }
}
