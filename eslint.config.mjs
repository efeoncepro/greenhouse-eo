// @ts-check

/**
 * TASK-514 — ESLint flat config (ESLint 9.x).
 *
 * Migra .eslintrc.js (legacy) a la flat config canonica del ecosistema 2025.
 * Preserva 1:1 las reglas, ignorePatterns y resolver de TypeScript que el
 * portal venia ejecutando, asi `pnpm lint` produce el mismo output que en
 * eslint 8.
 *
 * Para los configs upstream que aun publican en formato legacy
 * (next/core-web-vitals + plugin:import/recommended) usamos `FlatCompat`.
 * El resto se compone con flat config nativo (typescript-eslint, prettier).
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

import greenhousePlugin from './eslint-plugins/greenhouse/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default [
  /*
    Ignore patterns. Equivalente flat-config del antiguo `ignorePatterns`
    en `.eslintrc.js` + ignores adicionales que en eslint 8 absorbia
    `.eslintignore` o el cwd-relative resolver, y que en flat config debemos
    declarar explicitos.
  */
  {
    ignores: [
      'next-env.d.ts',
      'src/types/db.d.ts',
      '.next/**',
      '.next-local/**',
      '**/.next-local/**',
      'node_modules/**',
      '**/node_modules/**',
      'full-version/**',
      'demo-configs/**',
      '.claude/**',
      '.codex/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'out/**',
      'public/**',
      'docs/**',
      'migrations/**',
      'src/iconify-bundle/bundle-icons-css.ts',
      'src/assets/iconify-icons/generated-icons.css',
      'scripts/lib/server-only-shim.cjs',
      'scripts/lib/server-only-empty.cjs',
      'tests/playwright/test-results/**',
      'artifacts/**',
      '**/* (1).js',
      '**/* (1).jsx',
      '**/* (1).ts',
      '**/* (1).tsx'
    ]
  },

  /*
    Recommended bases (todas en flat-config nativo, sin FlatCompat):
    - eslint-config-next/core-web-vitals trae react, react-hooks,
      jsx-a11y, @next/next y eslint-plugin-import ya registrados — por
      eso NO importamos importPlugin.flatConfigs.* aqui (registrarlo dos
      veces dispara "Cannot redefine plugin import").
    - typescript-eslint metapackage: array flat-ready, ya registra parser
      y plugin para *.ts / *.tsx.
  */
  ...nextCoreWebVitals,
  ...tseslint.configs.recommended,

  /*
    Reglas custom del portal (1:1 con .eslintrc.js previo). Estas son las
    convenciones que el equipo viene aplicando — modificar requiere
    coordinacion separada.
  */
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module'
    },
    settings: {
      react: {
        version: 'detect'
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      },
      'import/resolver': {
        node: {},
        typescript: {
          project: resolve(__dirname, 'tsconfig.json')
        }
      }
    },
    rules: {
      'jsx-a11y/alt-text': 'off',
      'react/display-name': 'off',
      'react/no-children-prop': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-page-custom-font': 'off',

      /*
        TASK-514 — Out-of-scope new rules.
        eslint-config-next 16 trae el bundle React Compiler / React 19
        (react-hooks/set-state-in-effect, react-hooks/refs, etc.). Esta
        task es 1:1; mantenemos estas reglas off para preservar el
        baseline pre-migration. La adopcion de React Compiler queda como
        follow-up cuando el equipo coordine refactors per-componente.
      */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/component-hook-factories': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/gating': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/config': 'off',
      'react-hooks/fbt': 'off',
      'react-hooks/fire': 'off',
      'react-hooks/todo': 'off',

      // import/no-anonymous-default-export es nuevo del eslint-plugin-import
      // 2.32 y dispara en .config.mjs files. Off para mantener 1:1.
      'import/no-anonymous-default-export': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'import/no-named-as-default': 'off',
      'lines-around-comment': [
        'error',
        {
          beforeBlockComment: true,
          beforeLineComment: true,
          allowBlockStart: true,
          allowObjectStart: true,
          allowArrayStart: true
        }
      ],
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'any',
          prev: 'export',
          next: 'export'
        },
        {
          blankLine: 'always',
          prev: ['const', 'let', 'var'],
          next: '*'
        },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var']
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['function', 'multiline-const', 'multiline-block-like']
        },
        {
          blankLine: 'always',
          prev: ['function', 'multiline-const', 'multiline-block-like'],
          next: '*'
        }
      ],
      'newline-before-return': 'error',
      'import/newline-after-import': [
        'error',
        {
          count: 1
        }
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', ['internal', 'parent', 'sibling', 'index'], ['object', 'unknown']],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before'
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before'
            },
            {
              pattern: '~/**',
              group: 'external',
              position: 'before'
            },
            {
              pattern: '@/**',
              group: 'internal'
            }
          ],
          pathGroupsExcludedImportTypes: ['react', 'type'],
          'newlines-between': 'always-and-inside-groups'
        }
      ]
    }
  },

  /*
    TypeScript-only override: matchea el bloque overrides del .eslintrc.js
    legacy. Aplica solo a *.ts / *.tsx + iconify-bundle.
  */
  {
    files: ['**/*.ts', '**/*.tsx', 'src/iconify-bundle/**'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-var-requires': 'off'
    }
  },

  /*
    TASK-743 — Operational data table density contract gate.
    Aplica solo a archivos que pueden contener tablas operativas: src/views,
    src/components, src/app. La regla solo dispara cuando el archivo importa
    Table desde @mui/material, asi que el override es barato y limpio.

    TASK-567 — Typography contract gate (fontFamily literals).
    Aplica al mismo scope. Excluimos:
      - src/components/theme/**          (theme source-of-truth)
      - src/@core/theme/**               (Vuexy theme primitive)
      - src/app/global-error.tsx         (corre antes del theme MUI)
      - src/emails/**                    (emails con webfont fallback propio)
      - src/lib/finance/pdf/**           (react-pdf no usa MUI variants)
    Modo inicial 'warn' (TASK-567 Slice 3a). Sweep automatizado limpia el
    inventario inicial; despues se promueve a 'error' (Slice 3b) para que
    cualquier regresion bloquee CI.
  */
  {
    files: ['src/views/**/*.tsx', 'src/components/**/*.tsx', 'src/app/**/*.tsx'],
    plugins: {
      greenhouse: greenhousePlugin
    },
    rules: {
      'greenhouse/no-raw-table-without-shell': 'error',
      'greenhouse/no-hardcoded-fontfamily': 'error',
      // TASK-265 Slice 5a — microcopy contract gate.
      // Modo inicial 'warn' (gate establecido, no bloquea CI mientras
      // TASK-407 + TASK-408 ejecutan sweep). Cierre TASK-408 promueve
      // a 'error'. Detecta aria-label literales (caso dominante: 405
      // instancias), status maps inline (100), loading strings (94),
      // empty states (31) + cobertura secundaria de label/placeholder/
      // helperText/title/subtitle.
      'greenhouse/no-untokenized-copy': 'warn'
    }
  },

  /*
    TASK-766 Slice 3 — Finance CLP currency reader gate.
    Aplica a TODO el codigo del portal (incluye API routes .ts y libs).
    Mode 'error' desde el primer commit: cero tolerancia a legacy (cualquier
    hit es risk de KPIs inflados en produccion). Slice 3 migra cash-out;
    Slice 4 audita el resto del portal antes de mergear. Las excepciones
    explicitas (helpers/readers canonicos, tests del rule) viven en el
    bloque de override de abajo.
  */
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      greenhouse: greenhousePlugin
    },
    rules: {
      'greenhouse/no-untokenized-fx-math': 'error',
      'greenhouse/no-untokenized-expense-type-for-analytics': 'error'
    }
  },
  {
    files: [
      'src/components/theme/**',
      'src/@core/theme/**',
      'src/app/global-error.tsx',
      'src/app/public/**',
      'src/emails/**',
      'src/lib/finance/pdf/**'
    ],
    rules: {
      'greenhouse/no-hardcoded-fontfamily': 'off',
      'greenhouse/no-untokenized-copy': 'off'
    }
  },

  // TASK-766 Slice 3 — la lint rule no-untokenized-fx-math se desactiva
  // SOLO en los helpers/readers canónicos donde el patrón aparece como
  // referencia en docstrings y assertion strings de tests (NO en SQL real).
  // El patrón está prohibido en cualquier otro file del portal.
  {
    files: [
      'src/lib/finance/expense-payments-reader.ts',
      'src/lib/finance/income-payments-reader.ts',
      'src/lib/finance/__tests__/expense-payments-reader.test.ts',
      'src/lib/finance/__tests__/income-payments-reader.test.ts',
      'eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs',
      'eslint-plugins/greenhouse/rules/__tests__/no-untokenized-fx-math.test.mjs'
    ],
    rules: {
      'greenhouse/no-untokenized-fx-math': 'off'
    }
  },

  // TASK-768 Slice 8 — la lint rule no-untokenized-expense-type-for-analytics
  // se desactiva para usos legitimos:
  //  * SII / IVA / VAT / chile-tax engine (taxonomia fiscal por contrato)
  //  * Resolver canonico + tests + backfill (necesitan leer expense_type
  //    como hint del transparent map)
  //  * Readers que exponen ambas dimensiones simultaneamente
  //  * cash-out filter operativo (UI permite filter por taxonomia fiscal;
  //    el KPI rollup analitico ya migra a byEconomicCategory en Slice 7)
  //  * account-balances label fiscal (label "Cotizacion Previred" para UX
  //    bancaria, no analytical KPI)
  //  * processor-digest payroll digest (operacional, no analytical)
  //  * payroll-expense-materialization-lag signal (materializacion proxy,
  //    no analytical bucket — TASK-765 ownership preservado)
  {
    files: [
      'src/lib/finance/expense-payments-reader.ts',
      'src/lib/finance/income-payments-reader.ts',
      'src/lib/finance/__tests__/expense-payments-reader.test.ts',
      'src/lib/finance/__tests__/income-payments-reader.test.ts',
      'src/lib/finance/economic-category/**',
      'scripts/finance/backfill-economic-category.ts',
      'src/lib/tax/**',
      'src/lib/finance/expense-tax-snapshot.ts',
      'src/lib/finance/income-tax-snapshot.ts',
      'src/lib/finance/expense-taxonomy.ts',
      'src/lib/finance/vat-ledger.ts',
      'src/lib/finance/account-balances.ts',
      'src/lib/finance/processor-digest.ts',
      'src/lib/reliability/queries/payroll-expense-materialization-lag.ts',
      'src/app/api/finance/cash-out/route.ts',
      'src/app/api/admin/finance/expenses/[id]/economic-category/**',
      'src/app/api/admin/finance/income/[id]/economic-category/**',
      'eslint-plugins/greenhouse/rules/no-untokenized-expense-type-for-analytics.mjs',
      'eslint-plugins/greenhouse/rules/__tests__/no-untokenized-expense-type-for-analytics.test.mjs'
    ],
    rules: {
      'greenhouse/no-untokenized-expense-type-for-analytics': 'off'
    }
  },


  /*
    Prettier compat — DEBE ir al final. Apaga reglas que conflictuan con
    el formatter para evitar fights.
  */
  prettierConfig
]
