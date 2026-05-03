// Local ESLint plugin for Greenhouse-specific rules.
// Registered in eslint.config.mjs as `greenhouse`.
//
// Rules:
//   - no-raw-table-without-shell                    (TASK-743) — operational data table density
//   - no-hardcoded-fontfamily                       (TASK-567) — typography contract gate
//   - no-untokenized-copy                           (TASK-265) — microcopy contract gate
//   - no-untokenized-fx-math                        (TASK-766) — finance CLP currency reader gate
//   - no-untokenized-expense-type-for-analytics     (TASK-768) — expense_type/income_type only for fiscal/SII; analytics use economic_category

import noRawTableWithoutShell from './rules/no-raw-table-without-shell.mjs'
import noHardcodedFontfamily from './rules/no-hardcoded-fontfamily.mjs'
import noUntokenizedCopy from './rules/no-untokenized-copy.mjs'
import noUntokenizedFxMath from './rules/no-untokenized-fx-math.mjs'
import noUntokenizedExpenseTypeForAnalytics from './rules/no-untokenized-expense-type-for-analytics.mjs'

const plugin = {
  meta: {
    name: 'eslint-plugin-greenhouse',
    version: '1.4.0'
  },
  rules: {
    'no-raw-table-without-shell': noRawTableWithoutShell,
    'no-hardcoded-fontfamily': noHardcodedFontfamily,
    'no-untokenized-copy': noUntokenizedCopy,
    'no-untokenized-fx-math': noUntokenizedFxMath,
    'no-untokenized-expense-type-for-analytics': noUntokenizedExpenseTypeForAnalytics
  }
}

export default plugin
