// TASK-1038 — tests anti-regresión para greenhouse/no-fontsize-inline-typography.
//
// Confirma que la rule:
//   1. Detecta fontSize literal inline en <Typography> (sx/style/prop).
//   2. NO reporta fontSize en íconos / Box / otros elementos (scopeada a
//      Typography → cero falsos positivos de íconos — el insight del rule).
//   3. NO reporta fontSize dinámico (arrow/variable/interpolación).
//   4. NO reporta Typography que usa variant + otras props (fontWeight, etc.).

import { RuleTester } from 'eslint'

import rule from '../no-fontsize-inline-typography.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true }
    }
  }
})

ruleTester.run('no-fontsize-inline-typography', rule, {
  valid: [
    { code: 'const a = <Typography variant="h4">Título</Typography>', name: 'variant del SoT (correcto)' },
    { code: 'const a = <Typography sx={{ fontWeight: 600 }}>X</Typography>', name: 'fontWeight inline (no es fontSize)' },
    { code: 'const a = <i className="tabler-trash" style={{ fontSize: 18 }} />', name: 'ícono <i> con fontSize (legítimo)' },
    { code: 'const a = <Box sx={{ fontSize: 14 }}>icon</Box>', name: 'Box con fontSize (fuera de scope, no Typography)' },
    { code: 'const a = <Typography sx={{ fontSize: theme => theme.typography.h5.fontSize }}>X</Typography>', name: 'fontSize dinámico (no literal)' },
    { code: 'const a = <Typography sx={{ fontSize: size }}>X</Typography>', name: 'fontSize variable (no literal)' },
    { code: 'const a = <Typography variant="caption" color="text.secondary">meta</Typography>', name: 'variant + color (correcto)' }
  ],
  invalid: [
    {
      code: 'const a = <Typography sx={{ fontSize: "0.85rem" }}>X</Typography>',
      errors: [{ messageId: 'inlineFontSize' }],
      name: 'fontSize string rem inline en Typography'
    },
    {
      code: 'const a = <Typography sx={{ fontSize: 14 }}>X</Typography>',
      errors: [{ messageId: 'inlineFontSize' }],
      name: 'fontSize número inline en Typography'
    },
    {
      code: 'const a = <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>X</Typography>',
      errors: [{ messageId: 'inlineFontSize' }],
      name: 'fontSize inline aunque tenga variant'
    },
    {
      code: 'const a = <Typography fontSize="0.85rem">X</Typography>',
      errors: [{ messageId: 'inlineFontSize' }],
      name: 'fontSize como prop directa'
    },
    {
      code: 'const a = <Typography style={{ fontSize: "14px" }}>X</Typography>',
      errors: [{ messageId: 'inlineFontSize' }],
      name: 'fontSize en style (no sx)'
    }
  ]
})
