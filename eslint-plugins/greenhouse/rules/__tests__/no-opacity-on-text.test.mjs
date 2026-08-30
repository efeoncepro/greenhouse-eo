// TASK-1693 follow-up — tests anti-regresión para greenhouse/no-opacity-on-text.
//
// El caso `invalid` #1 es **el bug real**, verbatim: un conteo dentro de un
// `ToggleButton` con `opacity: 0.75`, que axe marcó `color-contrast` SERIOUS a
// 3.14:1 en los seis frames del capture premium mientras el lint estaba verde.
//
// Los `valid` no son relleno: cada uno es un caso donde la regla PODRÍA haber
// disparado y no debe, porque el alcance se eligió para cero falsos positivos.

import { RuleTester } from 'eslint'

import rule from '../no-opacity-on-text.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } }
  }
})

ruleTester.run('no-opacity-on-text', rule, {
  valid: [
    {
      code: "const a = <Typography variant='caption' color='text.secondary'>meta</Typography>",
      name: 'de-énfasis por token de color (la forma canónica)'
    },
    {
      code: "const a = <i className='tabler-trash' style={{ opacity: 0.6 }} />",
      name: 'ícono con opacidad — sin hijos de texto, fuera de scope'
    },
    {
      code: 'const a = <Box sx={{ opacity: 0.5 }}><Divider /></Box>',
      name: 'contenedor decorativo sin texto literal'
    },
    {
      code: 'const a = <Box sx={{ opacity: 0.4 }}>{value}</Box>',
      name: 'único hijo expresión — no se puede afirmar que sea texto sin adivinar'
    },
    {
      code: 'const a = <Typography sx={{ opacity: fadeIn ? 1 : collapsed }}>X</Typography>',
      name: 'opacidad dinámica (depende de estado) — juicio de review, no de lint'
    },
    {
      code: 'const a = <Typography sx={{ opacity: 1 }}>X</Typography>',
      name: 'opacidad 1 — no atenúa nada'
    },
    {
      code: "const a = <Box sx={{ backgroundColor: 'action.hover' }}>· {n}</Box>",
      name: 'texto literal sin opacidad'
    }
  ],
  invalid: [
    {
      // 🔴 EL BUG REAL (TASK-1693). El `· ` es el JSXText que lo vuelve decidible.
      code: "const a = <Box component='span' sx={{ marginInlineStart: 2, opacity: 0.75 }}>· {available}</Box>",
      name: 'caso fuente: conteo atenuado con opacity dentro de un ToggleButton',
      errors: [{ messageId: 'opacityOnText' }]
    },
    {
      code: "const a = <Typography variant='caption' sx={{ opacity: 0.7 }}>Sin dato</Typography>",
      name: 'Typography con opacity — siempre es texto',
      errors: [{ messageId: 'opacityOnText' }]
    },
    {
      code: "const a = <Typography style={{ opacity: '0.5' }}>X</Typography>",
      name: 'opacidad como string numérica en style',
      errors: [{ messageId: 'opacityOnText' }]
    },
    {
      code: 'const a = <Typography sx={theme => ({ color: theme.palette.text.primary, opacity: 0.6 })}>X</Typography>',
      name: 'sx como arrow que devuelve objeto',
      errors: [{ messageId: 'opacityOnText' }]
    }
  ]
})
