// Blocks runtime surfaces from importing mockup-only modules.
//
// Mockups can reuse runtime shells, but runtime must not import from `/mockup/`.
// This protects copy governance, data semantics, and debug/prototype labels
// from leaking into production routes.

const isMockupFile = filename => /[/\\]mockup[/\\]/.test(filename)

const importsMockupModule = source => {
  if (typeof source !== 'string') return false

  return /(^|[/\\])mockup([/\\]|$)/.test(source)
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow runtime UI files from importing modules under /mockup/. Extract a shared runtime shell instead.',
      recommended: true
    },
    schema: [],
    messages: {
      runtimeMockupImport:
        'Runtime UI must not import from `/mockup/`. Extract shared code outside mockup and let the mockup wrapper import the shared shell.'
    }
  },
  create(context) {
    const filename = context.getFilename()

    if (isMockupFile(filename)) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source && node.source.value

        if (!importsMockupModule(source)) return

        context.report({
          node: node.source,
          messageId: 'runtimeMockupImport'
        })
      },

      ExportNamedDeclaration(node) {
        const source = node.source && node.source.value

        if (!importsMockupModule(source)) return

        context.report({
          node: node.source,
          messageId: 'runtimeMockupImport'
        })
      },

      ExportAllDeclaration(node) {
        const source = node.source && node.source.value

        if (!importsMockupModule(source)) return

        context.report({
          node: node.source,
          messageId: 'runtimeMockupImport'
        })
      }
    }
  }
}
