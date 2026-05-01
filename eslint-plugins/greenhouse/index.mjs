// TASK-743 — Local ESLint plugin for Greenhouse-specific rules.
// Registered in eslint.config.mjs as `greenhouse`.

import noRawTableWithoutShell from './rules/no-raw-table-without-shell.mjs'

const plugin = {
  meta: {
    name: 'eslint-plugin-greenhouse',
    version: '1.0.0'
  },
  rules: {
    'no-raw-table-without-shell': noRawTableWithoutShell
  }
}

export default plugin
