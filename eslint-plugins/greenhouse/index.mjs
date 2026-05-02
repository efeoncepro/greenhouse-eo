// Local ESLint plugin for Greenhouse-specific rules.
// Registered in eslint.config.mjs as `greenhouse`.
//
// Rules:
//   - no-raw-table-without-shell      (TASK-743) — operational data table density
//   - no-hardcoded-fontfamily         (TASK-567) — typography contract gate
//   - no-untokenized-copy             (TASK-265) — microcopy contract gate

import noRawTableWithoutShell from './rules/no-raw-table-without-shell.mjs'
import noHardcodedFontfamily from './rules/no-hardcoded-fontfamily.mjs'
import noUntokenizedCopy from './rules/no-untokenized-copy.mjs'

const plugin = {
  meta: {
    name: 'eslint-plugin-greenhouse',
    version: '1.2.0'
  },
  rules: {
    'no-raw-table-without-shell': noRawTableWithoutShell,
    'no-hardcoded-fontfamily': noHardcodedFontfamily,
    'no-untokenized-copy': noUntokenizedCopy
  }
}

export default plugin
