/**
 * Cablea el `RuleTester` de ESLint a los hooks de vitest.
 *
 * Sin esto, `RuleTester.run()` ejecuta sus aserciones SÍNCRONAS al importar el módulo y no
 * registra ninguna suite: vitest reporta «No test suite found in file» y marca el archivo como
 * fallado aunque la regla esté bien. Ese fue el segundo motivo por el que los 23 tests de reglas
 * del repo nunca dieron una señal utilizable — el primero fue que ni la ruta `eslint-plugins/`
 * ni la extensión `.mjs` entraban en ningún `include` de `vitest.config.ts`.
 *
 * Con los hooks cableados, cada caso `valid`/`invalid` se convierte en un `it` de verdad: se
 * cuenta, se nombra y falla solo, en vez de reventar el import entero.
 */
import { RuleTester } from 'eslint'
import { afterAll, describe, it } from 'vitest'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only
RuleTester.afterAll = afterAll
