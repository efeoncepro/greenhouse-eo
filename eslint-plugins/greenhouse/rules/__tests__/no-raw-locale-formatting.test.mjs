// TASK-429 — tests para greenhouse/no-raw-locale-formatting.

import { RuleTester } from 'eslint'

import rule from '../no-raw-locale-formatting.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-raw-locale-formatting', rule, {
  valid: [
    {
      code: "formatCurrency(total, 'CLP')",
      name: 'money via canonical helper'
    },
    {
      code: "formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' })",
      name: 'datetime via canonical helper'
    },
    {
      code: "label.toLocaleLowerCase('es-CL')",
      name: 'locale-aware string casing is not numeric/date formatting'
    }
  ],
  invalid: [
    {
      code: "new Intl.NumberFormat('es-CL').format(value)",
      errors: [{ message: /Formato locale directo/u }],
      name: 'raw Intl.NumberFormat'
    },
    {
      code: "new Intl.DateTimeFormat('es-CL').format(date)",
      errors: [{ message: /Formato locale directo/u }],
      name: 'raw Intl.DateTimeFormat'
    },
    {
      code: "value.toLocaleString('es-CL')",
      errors: [{ message: /Formato toLocale\* directo/u }],
      name: 'raw toLocaleString'
    },
    {
      code: "date.toLocaleDateString('es-CL')",
      errors: [{ message: /Formato toLocale\* directo/u }],
      name: 'raw toLocaleDateString'
    }
  ]
})
