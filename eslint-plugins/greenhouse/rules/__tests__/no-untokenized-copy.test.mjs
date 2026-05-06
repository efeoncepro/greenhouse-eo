// TASK-407 — tests para greenhouse/no-untokenized-copy.

import { RuleTester } from 'eslint'

import rule from '../no-untokenized-copy.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      }
    },
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/no-untokenized-copy', rule, {
  valid: [
    {
      code: "const t = getMicrocopy(); const label = t.months.short[period.month - 1]",
      name: 'month from microcopy dictionary'
    },
    {
      code: "const labels = ['Q1', 'Q2', 'Q3', 'Q4']",
      name: 'non-month array'
    },
    {
      code: "const t = getMicrocopy(); <Button>{t.actions.save}</Button>",
      name: 'cta from microcopy dictionary'
    },
    {
      code: '<Button>Guardar y emitir</Button>',
      name: 'domain-specific CTA not in base action set'
    }
  ],
  invalid: [
    {
      code: "const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']",
      errors: [{ messageId: 'monthArrayLiteral' }],
      name: 'short month array'
    },
    {
      code: "const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']",
      errors: [{ messageId: 'monthArrayLiteral' }],
      name: 'long month array'
    },
    {
      code: '<Button>Guardar</Button>',
      errors: [{ messageId: 'actionTextLiteral' }],
      name: 'base CTA text'
    },
    {
      code: '<Button>Cancelar</Button>',
      errors: [{ messageId: 'actionTextLiteral' }],
      name: 'base cancel CTA text'
    },
    {
      code: "<IconButton aria-label='Cerrar' />",
      errors: [{ messageId: 'ariaLiteral' }],
      name: 'existing aria literal coverage stays active'
    }
  ]
})
