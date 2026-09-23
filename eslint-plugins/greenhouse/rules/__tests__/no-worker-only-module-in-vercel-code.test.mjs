// ISSUE-177 — tests de greenhouse/no-worker-only-module-in-vercel-code
//
// Cubre las cuatro fronteras de la regla con todas las formas de import que el parser de TS entrega:
//   - el barrel del motor: sólo tipos (declaración entera o especificadores inline);
//   - la entrada liviana `pure`: siempre permitida;
//   - un deep-import al motor (alias o relativo): error incluso de tipos;
//   - los paquetes de navegador/PDF: error como valor, permitidos como tipo.
// Y las exenciones: el propio motor, los tests y todo lo que vive fuera de `src/`.

import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../no-worker-only-module-in-vercel-code.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

const RENDER_FILE = '/repo/src/lib/efeonce-insights/render/x.ts'
const ROUTE_FILE = '/repo/src/app/api/platform/app/insights/catalog/route.ts'

ruleTester.run('greenhouse/no-worker-only-module-in-vercel-code', rule, {
  valid: [
    // ✅ Barrel, sólo tipos
    {
      code: "import type { CompositionPlanInput, CompositionSlideInput } from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'import type desde el barrel'
    },
    {
      code: "import { type CompositionPlanInput, type CompositionSlideInput } from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'todos los especificadores type inline desde el barrel'
    },
    {
      code: "export type { SlotValues } from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'export type desde el barrel'
    },
    {
      code: "export { type SlotValues } from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'export con especificador type inline desde el barrel'
    },
    {
      code: "import type * as Composer from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'import type de namespace desde el barrel'
    },
    // ✅ La entrada liviana, con valores
    {
      code: "import { paginateFlow, type FlowBlock } from '@/lib/artifact-composer/pure'",
      filename: RENDER_FILE,
      name: 'valor desde la entrada pure'
    },
    {
      code: "export { hashResolvedManifest } from '@/lib/artifact-composer/pure'",
      filename: '/repo/src/lib/commercial/tenders/proposals/render-jobs.ts',
      name: 're-export de un valor desde pure'
    },
    {
      code: "const { paginateFlow } = await import('@/lib/artifact-composer/pure')",
      filename: ROUTE_FILE,
      name: 'import dinámico de pure'
    },
    {
      code: "import { paginateFlow } from '../../artifact-composer/pure'",
      filename: RENDER_FILE,
      name: 'ruta relativa a pure'
    },
    // ✅ Paquetes de navegador/PDF sólo como tipo
    {
      code: "import type { Browser } from 'playwright'",
      filename: RENDER_FILE,
      name: 'tipo de playwright'
    },
    {
      code: "import type { PDFDocument } from 'pdf-lib'",
      filename: ROUTE_FILE,
      name: 'tipo de pdf-lib'
    },
    // ✅ Nada que ver con la regla
    {
      code: "import { GH_INSIGHTS } from '@/lib/copy/insights'",
      filename: RENDER_FILE,
      name: 'import ajeno al motor'
    },
    {
      code: "import { paginateFlow } from '@/lib/artifact-composer-legacy'",
      filename: RENDER_FILE,
      name: 'un módulo con prefijo parecido no es el motor'
    },
    {
      code: "import { chunkByCapacity } from './composition-helpers'",
      filename: RENDER_FILE,
      name: 'relativo que no entra al motor'
    },
    // ✅ Exentos: el propio motor
    {
      code: "import { chromium } from 'playwright'\nimport { PDFDocument } from 'pdf-lib'",
      filename: '/repo/src/lib/artifact-composer/render.ts',
      name: 'el motor importa sus dependencias'
    },
    {
      code: "import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'",
      filename: '/repo/src/lib/artifact-composer/catalogs/insights-deck/index.ts',
      name: 'un archivo del motor queda fuera de la regla'
    },
    // ✅ Exentos: tests
    {
      code: "import { resolvePlan } from '@/lib/artifact-composer'\nimport { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'",
      filename: '/repo/src/lib/commercial/tenders/proposals/authoring/__tests__/diagnostico-compose-integration.test.ts',
      name: 'archivo bajo __tests__'
    },
    {
      code: "import { PDFDocument } from 'pdf-lib'",
      filename: '/repo/src/lib/hiring/candidate-review/parser.test.ts',
      name: 'archivo *.test.ts'
    },
    {
      code: "import { composeArtifact } from '@/lib/artifact-composer'",
      filename: '/repo/src/lib/efeonce-insights/render/render.live.test.ts',
      name: 'archivo *.live.test.ts'
    },
    {
      code: "import { chromium } from 'playwright'",
      filename: '/repo/src/app/foo.spec.tsx',
      name: 'archivo *.spec.tsx'
    },
    // ✅ Fuera de src/: ahí vive el worker
    {
      code: "import { composeArtifact } from '@/lib/artifact-composer'\nimport { SlideGeometryError } from '@/lib/artifact-composer/render'",
      filename: '/repo/services/artifact-worker/main.ts',
      name: 'el worker queda fuera de la regla'
    }
  ],
  invalid: [
    // ❌ Barrel, valor
    {
      code: "import { paginateFlow } from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'valor desde el barrel (el caso del 2026-09-22)',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "import { type CompositionPlanInput, paginateFlow } from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'import mixto tipo + valor desde el barrel',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "import * as Composer from '@/lib/artifact-composer'",
      filename: ROUTE_FILE,
      name: 'namespace de valores desde el barrel',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "import '@/lib/artifact-composer'",
      filename: ROUTE_FILE,
      name: 'import de efecto del barrel',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "export { paginateFlow } from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 're-export de un valor del barrel',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "export * from '@/lib/artifact-composer'",
      filename: RENDER_FILE,
      name: 'export * del barrel',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "const composer = await import('@/lib/artifact-composer')",
      filename: ROUTE_FILE,
      name: 'import dinámico del barrel',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "const composer = require('@/lib/artifact-composer')",
      filename: ROUTE_FILE,
      name: 'require del barrel',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "import { paginateFlow } from '../../artifact-composer'",
      filename: RENDER_FILE,
      name: 'valor desde el barrel por ruta relativa',
      errors: [{ messageId: 'barrelValue' }]
    },
    {
      code: "import { paginateFlow } from '@/lib/artifact-composer/index'",
      filename: RENDER_FILE,
      name: 'valor desde el barrel con /index explícito',
      errors: [{ messageId: 'barrelValue' }]
    },
    // ❌ Deep-imports: error incluso de tipos
    {
      code: "import { paginateFlow } from '@/lib/artifact-composer/paginate'",
      filename: RENDER_FILE,
      name: 'deep-import a un módulo puro (la mitigación que pure reemplaza)',
      errors: [{ messageId: 'deepPath' }]
    },
    {
      code: "import type { ArtifactCatalog } from '@/lib/artifact-composer/catalog'",
      filename: RENDER_FILE,
      name: 'deep-import sólo de tipos',
      errors: [{ messageId: 'deepPath' }]
    },
    {
      code: "import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'",
      filename: ROUTE_FILE,
      name: 'deep-import a un catálogo',
      errors: [{ messageId: 'deepPath' }]
    },
    {
      code: "import { pptCssVar } from '@/lib/artifact-composer/brand-packs/axis'",
      filename: ROUTE_FILE,
      name: 'deep-import a un brand pack',
      errors: [{ messageId: 'deepPath' }]
    },
    {
      code: "export { hashResolvedManifest } from '@/lib/artifact-composer/manifest-hash'",
      filename: '/repo/src/lib/commercial/tenders/proposals/render-jobs.ts',
      name: 're-export desde un interno',
      errors: [{ messageId: 'deepPath' }]
    },
    {
      code: "import { renderSlide } from '../../artifact-composer/render'",
      filename: RENDER_FILE,
      name: 'deep-import relativo desde src/lib/efeonce-insights/render',
      errors: [{ messageId: 'deepPath' }]
    },
    {
      code: "const m = await import('@/lib/artifact-composer/render')",
      filename: ROUTE_FILE,
      name: 'import dinámico de un interno',
      errors: [{ messageId: 'deepPath' }]
    },
    // ❌ Paquetes de navegador/PDF como valor
    {
      code: "import { chromium } from 'playwright'",
      filename: RENDER_FILE,
      name: 'playwright como valor',
      errors: [{ messageId: 'workerOnlyPackage' }]
    },
    {
      code: "import { PDFDocument } from 'pdf-lib'",
      filename: ROUTE_FILE,
      name: 'pdf-lib como valor',
      errors: [{ messageId: 'workerOnlyPackage' }]
    },
    {
      code: "import { test } from '@playwright/test'",
      filename: RENDER_FILE,
      name: '@playwright/test como valor',
      errors: [{ messageId: 'workerOnlyPackage' }]
    },
    {
      code: "const chromium = require('@sparticuz/chromium')",
      filename: ROUTE_FILE,
      name: 'require de @sparticuz/chromium',
      errors: [{ messageId: 'workerOnlyPackage' }]
    },
    {
      code: "const puppeteer = await import('puppeteer-core')",
      filename: ROUTE_FILE,
      name: 'import dinámico de puppeteer-core',
      errors: [{ messageId: 'workerOnlyPackage' }]
    },
    {
      code: "import { chromium } from 'playwright-core/lib/server'",
      filename: RENDER_FILE,
      name: 'subruta de un paquete del worker',
      errors: [{ messageId: 'workerOnlyPackage' }]
    }
  ]
})
