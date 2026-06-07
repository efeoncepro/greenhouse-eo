// Tests anti-regresión para greenhouse/no-hardcoded-hex-color.
//
// Confirma que la rule:
//   1. Detecta HEX crudo en sx/style (Property) y en JSXAttribute (color=).
//   2. Detecta HEX embebido en gradientes / box-shadow.
//   3. NO reporta valores dinámicos (interpolación / theme / variable).
//   4. NO reporta tokens (theme.palette.*, var(--mui-palette-*)).
//   5. NO reporta anchors href="#id" ni ids (skip de keys no-color).

import { RuleTester } from 'eslint'

import rule from '../no-hardcoded-hex-color.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true }
    }
  }
})

ruleTester.run('no-hardcoded-hex-color', rule, {
  valid: [
    { code: "const a = <Box sx={{ color: 'var(--mui-palette-primary-main)' }} />", name: 'CSS var token' },
    { code: 'const a = <Box sx={{ color: theme => theme.palette.primary.main }} />', name: 'theme callback' },
    { code: 'const a = <Box sx={{ bgcolor: token }} />', name: 'variable dinámica' },
    { code: "const a = <Box sx={{ color: `${dynamic}` }} />", name: 'template con interpolación' },
    { code: "const a = <a href='#escala'>x</a>", name: 'anchor word id (no hex)' },
    { code: "const a = <Box sx={{ color: 'primary.main' }} />", name: 'palette path string' },
    { code: "const a = <Chip sx={{ borderRadius: 1 }} />", name: 'no color' },
    { code: "const a = <a href='#fff'>x</a>", name: 'anchor que parece hex pero key href se saltea' }
  ],
  invalid: [
    {
      code: "const a = <Box sx={{ color: '#6ec207' }} />",
      name: 'hex en sx.color',
      errors: [{ messageId: 'hardcodedHex' }]
    },
    {
      code: "const a = <Box sx={{ backgroundColor: '#FFF' }} />",
      name: 'hex corto en sx',
      errors: [{ messageId: 'hardcodedHex' }]
    },
    {
      code: "const a = <Box color='#0a0a0a' />",
      name: 'hex en JSXAttribute color',
      errors: [{ messageId: 'hardcodedHex' }]
    },
    {
      code: "const a = <Box sx={{ boxShadow: '0 2px 4px #00000020' }} />",
      name: 'hex 8-dígitos embebido en box-shadow',
      errors: [{ messageId: 'hardcodedHex' }]
    },
    {
      code: "const styles = { root: { border: '1px solid #d1d5db' } }",
      name: 'hex embebido en border compuesto (object literal)',
      errors: [{ messageId: 'hardcodedHex' }]
    }
  ]
})
