import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // `include` vive en cada proyecto, no acá: heredado desde la raíz haría que un mismo archivo
    // corriera en los DOS proyectos (verificado — `config.test.ts` aparecía bajo `unit` y `live`).
    setupFiles: ['src/test/setup.ts'],

    /**
     * Los `*.live.test.ts` corren SERIALIZADOS entre sí; el resto conserva paralelismo por archivo.
     *
     * Por qué (2026-08-23): los live tests no corren contra bases efímeras — corren contra la
     * ÚNICA instancia Cloud SQL que comparten dev, staging y producción. El paralelismo por archivo
     * de vitest presupone un aislamiento que ahí no existe: dos archivos que tocan la misma
     * plantilla, la misma vacante o el mismo candidato se pisan, y el síntoma no es un error claro
     * sino un `..._stale` intermitente que parece flakiness y se "arregla" con un rerun.
     *
     * La alternativa —`fileParallelism: false` global— serializaría también los ~1300 tests
     * unitarios, que no comparten nada y no tienen por qué pagar el problema de sus vecinos.
     *
     * Escala sin coordinación: un archivo `*.live.test.ts` nuevo entra al proyecto serializado por
     * su nombre, sin registro que mantener ni índices que repartir.
     */
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
            'src/**/*.spec.ts',
            'src/**/*.spec.tsx',
            'scripts/**/*.test.ts',
            'scripts/**/*.test.tsx',
            'scripts/**/*.spec.ts',
            'scripts/**/*.spec.tsx',
            'services/**/*.test.ts',
            'services/**/*.spec.ts'
          ],
          // `setupFiles` NO se redeclara: `extends: true` ya lo hereda de la raíz. Declararlo acá
          // lo aplica DOS veces y MSW revienta con «Invariant Violation» al hacer `listen()` sobre
          // un server ya escuchando.
          exclude: ['**/node_modules/**', '**/*.live.test.ts']
        }
      },
      {
        /*
         * ⚠️ Los tests de las reglas ESLint propias (`RuleTester`) necesitan proyecto propio.
         *
         * Quedaban fuera por PARTIDA DOBLE: ni la ruta `eslint-plugins/` ni la extensión `.mjs`
         * entraban en ningún `include`, así que los 23 archivos existentes NUNCA se ejecutaron —
         * escritos, commiteados y decorativos. Eso vaciaba en silencio el contrato del repo para
         * reglas nuevas («rule + RuleTester»): la guarda de la guarda no corría.
         *
         * Además necesitan su propio `setupFiles`: `RuleTester` corre sus aserciones al importar y
         * no registra suite salvo que se le cableen los hooks de vitest. Sin eso, un archivo válido
         * igual falla con «No test suite found».
         *
         * Cableado el 2026-08-30, a raíz de TASK-1693: tres defectos reales en una sesión y el
         * lint verde en los tres.
         */
        extends: true,
        test: {
          name: 'lint-rules',
          include: ['eslint-plugins/**/*.test.mjs'],
          exclude: ['**/node_modules/**'],
          setupFiles: ['eslint-plugins/vitest-setup.mjs']
        }
      },
      {
        extends: true,
        test: {
          name: 'live',
          include: ['src/**/*.live.test.ts', 'scripts/**/*.live.test.ts', 'services/**/*.live.test.ts'],
          exclude: ['**/node_modules/**'],
          fileParallelism: false
        }
      }
    ],

    // Raised from Vitest default (5s) to give React component suites headroom
    // under v8 coverage instrumentation on GitHub runners. Multi-step dialog/form
    // tests in `pnpm test:coverage` were exceeding 5s in CI while passing locally
    // (ISSUE-052). 15s still catches genuinely hung tests.
    testTimeout: 15000,
    hookTimeout: 15000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: path.resolve(__dirname, 'artifacts/coverage')
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/@core'),
      '@layouts': path.resolve(__dirname, 'src/@layouts'),
      '@menu': path.resolve(__dirname, 'src/@menu'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@configs': path.resolve(__dirname, 'src/configs'),
      '@views': path.resolve(__dirname, 'src/views')
    }
  }
})
