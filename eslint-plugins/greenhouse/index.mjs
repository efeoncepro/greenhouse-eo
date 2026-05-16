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
//   - no-inline-facet-visibility-check              (TASK-611) — organization workspace projection gate
//   - cloud-run-services-must-init-sentry           (TASK-844) — Cloud Run Node service entrypoints must invoke initSentryForService
//   - no-cross-domain-import-from-client-portal     (TASK-822) — client_portal is a leaf of the DAG; producer domains MUST NOT import it
//   - no-untokenized-business-line-branching        (TASK-827) — UI components must NOT branch by session.user.tenantType/businessLines/serviceModules/tenant_capabilities — use resolver canonical (TASK-825)
//   - no-inline-payroll-scope-gate                  (TASK-890) — consumers MUST NOT recompose the offboarding × payroll scope gate inline; use canonical resolver
//   - no-extract-epoch-from-date-subtraction        (TASK-893 hotfix #3) — bloquea EXTRACT(EPOCH FROM (X - Y)) cuando X o Y es DATE (rompe runtime PG)

import noRawTableWithoutShell from './rules/no-raw-table-without-shell.mjs'
import noHardcodedFontfamily from './rules/no-hardcoded-fontfamily.mjs'
import noUntokenizedCopy from './rules/no-untokenized-copy.mjs'
import noRawLocaleFormatting from './rules/no-raw-locale-formatting.mjs'
import noRuntimeMockupImport from './rules/no-runtime-mockup-import.mjs'
import noUntokenizedFxMath from './rules/no-untokenized-fx-math.mjs'
import noUntokenizedExpenseTypeForAnalytics from './rules/no-untokenized-expense-type-for-analytics.mjs'
import noInlineFacetVisibilityCheck from './rules/no-inline-facet-visibility-check.mjs'
import cloudRunServicesMustInitSentry from './rules/cloud-run-services-must-init-sentry.mjs'
import noCrossDomainImportFromClientPortal from './rules/no-cross-domain-import-from-client-portal.mjs'
import noUntokenizedBusinessLineBranching from './rules/no-untokenized-business-line-branching.mjs'
import noInlinePayrollScopeGate from './rules/no-inline-payroll-scope-gate.mjs'
import noExtractEpochFromDateSubtraction from './rules/no-extract-epoch-from-date-subtraction.mjs'

const plugin = {
  meta: {
    name: 'eslint-plugin-greenhouse',
    version: '1.8.0'
  },
  rules: {
    'no-raw-table-without-shell': noRawTableWithoutShell,
    'no-hardcoded-fontfamily': noHardcodedFontfamily,
    'no-untokenized-copy': noUntokenizedCopy,
    'no-raw-locale-formatting': noRawLocaleFormatting,
    'no-runtime-mockup-import': noRuntimeMockupImport,
    'no-untokenized-fx-math': noUntokenizedFxMath,
    'no-untokenized-expense-type-for-analytics': noUntokenizedExpenseTypeForAnalytics,
    'no-inline-facet-visibility-check': noInlineFacetVisibilityCheck,
    'cloud-run-services-must-init-sentry': cloudRunServicesMustInitSentry,
    'no-cross-domain-import-from-client-portal': noCrossDomainImportFromClientPortal,
    'no-untokenized-business-line-branching': noUntokenizedBusinessLineBranching,
    'no-inline-payroll-scope-gate': noInlinePayrollScopeGate,
    'no-extract-epoch-from-date-subtraction': noExtractEpochFromDateSubtraction
  }
}

export default plugin
