// TASK-743 — greenhouse/no-raw-table-without-shell
//
// Falla si un archivo .tsx importa `Table` desde @mui/material y cumple alguna
// de las dos condiciones:
//   (A) en algun TableRow declarativo se renderizan > 8 TableCell directos.
//   (B) algun descendiente de TableBody es un input editable inline:
//       <input>, <TextField>, <CustomTextField>, <Slider>, <BonusInput>,
//       <InlineNumericEditor>.
//
// En cualquiera de los dos casos, exige que la tabla este envuelta en
// <DataTableShell> en algun ancestor del JSX (ya sea en este archivo o
// importado desde un wrapper externo). Un import explicito de DataTableShell
// en el archivo cuenta como evidencia de cumplimiento; si no existe, la regla
// reporta error.
//
// Spec: docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md

const EDITABLE_TAGS = new Set([
  'input',
  'TextField',
  'CustomTextField',
  'Slider',
  'BonusInput',
  'InlineNumericEditor'
])

const isMuiTableImport = node => {
  if (node.type !== 'ImportDeclaration') return false

  const source = node.source && node.source.value

  if (typeof source !== 'string') return false

  if (source !== '@mui/material' && source !== '@mui/material/Table') return false

  return node.specifiers.some(spec => {
    if (spec.type === 'ImportDefaultSpecifier' && source === '@mui/material/Table') return true
    if (spec.type !== 'ImportSpecifier') return false

    return spec.imported && spec.imported.name === 'Table'
  })
}

const isShellImport = node => {
  if (node.type !== 'ImportDeclaration') return false

  const source = node.source && node.source.value

  if (typeof source !== 'string') return false

  if (
    source !== '@/components/greenhouse/data-table' &&
    source !== '@/components/greenhouse/data-table/DataTableShell' &&
    !source.endsWith('/components/greenhouse/data-table') &&
    !source.endsWith('/components/greenhouse/data-table/DataTableShell')
  ) {
    return false
  }

  return node.specifiers.some(spec => {
    if (spec.type === 'ImportSpecifier') {
      return spec.imported && spec.imported.name === 'DataTableShell'
    }

    if (spec.type === 'ImportDefaultSpecifier') {
      return spec.local && spec.local.name === 'DataTableShell'
    }

    return false
  })
}

const getJsxName = node => {
  if (!node || node.type !== 'JSXElement') return null

  const opening = node.openingElement && node.openingElement.name

  if (!opening) return null

  if (opening.type === 'JSXIdentifier') return opening.name
  if (opening.type === 'JSXMemberExpression') return opening.property && opening.property.name

  return null
}

const collectChildJsxNames = (node, accumulator) => {
  if (!node) return

  if (Array.isArray(node)) {
    for (const child of node) collectChildJsxNames(child, accumulator)

    return
  }

  if (typeof node !== 'object') return

  if (node.type === 'JSXElement') {
    const name = getJsxName(node)

    if (name) accumulator.push(name)
    collectChildJsxNames(node.children, accumulator)

    return
  }

  if (node.type === 'JSXFragment') {
    collectChildJsxNames(node.children, accumulator)

    return
  }

  if (node.type === 'JSXExpressionContainer') {
    collectChildJsxNames(node.expression, accumulator)

    return
  }

  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    collectChildJsxNames(node.body, accumulator)

    return
  }

  if (node.type === 'CallExpression') {
    collectChildJsxNames(node.callee, accumulator)
    collectChildJsxNames(node.arguments, accumulator)

    return
  }

  if (node.type === 'ConditionalExpression') {
    collectChildJsxNames(node.consequent, accumulator)
    collectChildJsxNames(node.alternate, accumulator)

    return
  }

  if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
    collectChildJsxNames(node.left, accumulator)
    collectChildJsxNames(node.right, accumulator)

    return
  }

  if (node.type === 'BlockStatement') {
    collectChildJsxNames(node.body, accumulator)

    return
  }

  if (node.type === 'ReturnStatement') {
    collectChildJsxNames(node.argument, accumulator)

    return
  }

  if (node.type === 'JSXAttribute') {
    collectChildJsxNames(node.value, accumulator)

    return
  }

  if (node.children) collectChildJsxNames(node.children, accumulator)
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Operational tables (>8 cols or with inline editables) must be wrapped in <DataTableShell> (TASK-743 contract).',
      recommended: true
    },
    schema: [],
    messages: {
      missingShell:
        'Operational table requires <DataTableShell> wrapper (TASK-743 contract). See docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md.'
    }
  },
  create(context) {
    let importsMuiTable = false
    let importsShell = false
    const reports = []

    return {
      ImportDeclaration(node) {
        if (isMuiTableImport(node)) importsMuiTable = true
        if (isShellImport(node)) importsShell = true
      },
      JSXElement(node) {
        if (!importsMuiTable) return

        const name = getJsxName(node)

        // Detect TableRow with >8 direct TableCell children.
        if (name === 'TableRow') {
          const cellCount = (node.children || []).filter(child => {
            if (child.type !== 'JSXElement') return false

            return getJsxName(child) === 'TableCell'
          }).length

          if (cellCount > 8) reports.push({ node, reason: 'cells' })
        }

        // Detect editable descendant inside TableBody.
        if (name === 'TableBody') {
          const descendants = []

          collectChildJsxNames(node.children, descendants)

          if (descendants.some(tag => EDITABLE_TAGS.has(tag))) reports.push({ node, reason: 'editable' })
        }
      },
      'Program:exit'() {
        if (!importsMuiTable) return
        if (importsShell) return
        if (reports.length === 0) return

        for (const report of reports) {
          context.report({
            node: report.node,
            messageId: 'missingShell'
          })
        }
      }
    }
  }
}
