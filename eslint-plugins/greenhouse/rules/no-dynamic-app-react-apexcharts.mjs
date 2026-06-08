// Prevents nested Next dynamic boundaries around the canonical ApexCharts
// wrapper. The wrapper itself owns `ssr:false` for `react-apexcharts`; product
// code imports it directly so Turbopack has one stable async chart boundary.

const GOVERNED_SRC_REGEX = /[/\\]src[/\\]/
const APP_REACT_APEX_CHARTS = '@/libs/styles/AppReactApexCharts'
const LEGACY_APEX_CHARTS = '@/libs/ApexCharts'

const isGovernedFile = filename => {
  if (!GOVERNED_SRC_REGEX.test(filename)) return false
  if (/[/\\]__tests__[/\\]/.test(filename)) return false
  if (/\.test\.(t|j)sx?$/.test(filename)) return false
  if (/\.spec\.(t|j)sx?$/.test(filename)) return false

  return true
}

const message =
  "Import AppReactApexCharts directly from '@/libs/styles/AppReactApexCharts'. " +
  "That wrapper owns the only next/dynamic ssr:false boundary for react-apexcharts; " +
  'wrapping it with another dynamic import can leave Turbopack react-loadable manifests pointing at missing chunks.'

const isAppReactApexChartsImport = node =>
  node &&
  node.type === 'ImportExpression' &&
  node.source &&
  node.source.type === 'Literal' &&
  node.source.value === APP_REACT_APEX_CHARTS

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevents nested dynamic imports around AppReactApexCharts; the wrapper owns the ApexCharts ssr:false boundary.',
      url: 'docs/architecture/ui-platform/PRIMITIVES.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (!isGovernedFile(filename)) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source && node.source.value

        if (source !== LEGACY_APEX_CHARTS) return

        context.report({
          node: node.source,
          message:
            "Do not import '@/libs/ApexCharts'. The legacy indirection was removed; use the canonical AppReactApexCharts wrapper instead."
        })
      },

      ImportExpression(node) {
        if (!isAppReactApexChartsImport(node)) return

        if (
          node.parent &&
          node.parent.type === 'ArrowFunctionExpression' &&
          node.parent.parent &&
          node.parent.parent.type === 'CallExpression' &&
          node.parent.parent.callee.type === 'Identifier' &&
          node.parent.parent.callee.name === 'dynamic'
        ) {
          return
        }

        context.report({ node: node.source, message })
      },

      CallExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'dynamic' ||
          node.arguments.length === 0 ||
          node.arguments[0].type !== 'ArrowFunctionExpression'
        ) {
          return
        }

        const body = node.arguments[0].body

        if (!isAppReactApexChartsImport(body)) return

        context.report({ node, message })
      }
    }
  }
}
