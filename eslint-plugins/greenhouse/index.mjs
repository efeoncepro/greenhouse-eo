// Local ESLint plugin for Greenhouse-specific rules.
// Registered in eslint.config.mjs as `greenhouse`.
//
// Rules:
//   - no-raw-table-without-shell      (TASK-743) — operational data table density
//   - no-hardcoded-fontfamily         (TASK-567) — typography contract gate

import noRawTableWithoutShell from './rules/no-raw-table-without-shell.mjs'
import noHardcodedFontfamily from './rules/no-hardcoded-fontfamily.mjs'

const plugin = {
  meta: {
    name: 'eslint-plugin-greenhouse',
    version: '1.1.0'
  },
  rules: {
    'no-raw-table-without-shell': noRawTableWithoutShell,
    'no-hardcoded-fontfamily': noHardcodedFontfamily
  }
}

export default plugin
