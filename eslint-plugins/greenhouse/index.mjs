// Local ESLint plugin for Greenhouse-specific rules.
// Registered in eslint.config.mjs as `greenhouse`.
//
// Rules:
//   - no-raw-table-without-shell                    (TASK-743) — operational data table density
//   - no-hardcoded-fontfamily                       (TASK-567) — typography contract gate
//   - no-untokenized-copy                           (TASK-265) — microcopy contract gate
//   - no-raw-locale-formatting                      (TASK-429) — locale-aware formatting helper gate
//   - no-runtime-mockup-import                      (runtime must not import mockup-only modules)
//   - no-untokenized-fx-math                        (TASK-766) — finance CLP currency reader gate
//   - no-untokenized-expense-type-for-analytics     (TASK-768) — expense_type/income_type only for fiscal/SII; analytics use economic_category

import noRawTableWithoutShell from './rules/no-raw-table-without-shell.mjs'
import noHardcodedFontfamily from './rules/no-hardcoded-fontfamily.mjs'
import noUntokenizedCopy from './rules/no-untokenized-copy.mjs'
import noRawLocaleFormatting from './rules/no-raw-locale-formatting.mjs'
import noRuntimeMockupImport from './rules/no-runtime-mockup-import.mjs'
import noUntokenizedFxMath from './rules/no-untokenized-fx-math.mjs'
import noUntokenizedExpenseTypeForAnalytics from './rules/no-untokenized-expense-type-for-analytics.mjs'
import noInlineFacetVisibilityCheck from './rules/no-inline-facet-visibility-check.mjs'

const plugin = {
  meta: {
    name: 'eslint-plugin-greenhouse',
    version: '1.5.0'
  },
  rules: {
    'no-raw-table-without-shell': noRawTableWithoutShell,
    'no-hardcoded-fontfamily': noHardcodedFontfamily,
    'no-untokenized-copy': noUntokenizedCopy,
    'no-raw-locale-formatting': noRawLocaleFormatting,
    'no-runtime-mockup-import': noRuntimeMockupImport,
    'no-untokenized-fx-math': noUntokenizedFxMath,
    'no-untokenized-expense-type-for-analytics': noUntokenizedExpenseTypeForAnalytics,
    'no-inline-facet-visibility-check': noInlineFacetVisibilityCheck
  }
}

export default plugin
