// TASK-1697 Slice 3 — tests for greenhouse/growth-substrate-boundary
//
// Valida las DOS direcciones de la rule angosta sobre las 5 formas de import
// (estático, dinámico, require, export-from, ruta relativa que escapa):
//   (1) nadie fuera de ai-visibility/** importa ai-visibility/probes/**
//   (2) site-substrate/** no importa @/lib/growth/* ni escapa por relativa

import { RuleTester } from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../growth-substrate-boundary.mjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module'
  }
})

ruleTester.run('greenhouse/growth-substrate-boundary', rule, {
  valid: [
    // ✅ el dominio AEO importa sus propios probes (interno)
    {
      code: "import { createProbeFetcher } from '../probes/safe-fetch'",
      filename: '/repo/src/lib/growth/ai-visibility/brand-intelligence/fetch-site-content.ts',
      name: 'AEO importa probes internos (permitido)'
    },
    {
      code: "import { runProbes } from '@/lib/growth/ai-visibility/probes/gatherer'",
      filename: '/repo/src/lib/growth/ai-visibility/run-engine.ts',
      name: 'AEO importa probes por alias (permitido)'
    },
    // ✅ cualquier dominio consume el SUSTRATO (la puerta correcta)
    {
      code: "import { createSiteFetcher } from '@/lib/growth/site-substrate'",
      filename: '/repo/src/lib/growth/seo/site-audit/collector.ts',
      name: 'SEO consume el sustrato por el barrel (permitido)'
    },
    // ✅ el sustrato se importa a sí mismo por relativas internas
    {
      code: "import { readBodyWithCap } from './read-body'",
      filename: '/repo/src/lib/growth/site-substrate/site-fetch.ts',
      name: 'sustrato importa interno (permitido)'
    },
    // ✅ el sustrato usa sus transversales permitidas (la carta las gobierna el test de frontera)
    {
      code: "import { captureWithDomain } from '@/lib/observability/capture'",
      filename: '/repo/src/lib/growth/site-substrate/site-fetch.ts',
      name: 'sustrato importa observability (permitido por la rule; allowlist del test)'
    },
    // ✅ tests excluidos
    {
      code: "import { createProbeFetcher } from '@/lib/growth/ai-visibility/probes/safe-fetch'",
      filename: '/repo/src/lib/growth/seo/__tests__/fixture.test.ts',
      name: 'tests excluidos'
    }
  ],

  invalid: [
    // ❌ (1) otro dominio entra a probes/** por alias
    {
      code: "import { createProbeFetcher } from '@/lib/growth/ai-visibility/probes/safe-fetch'",
      filename: '/repo/src/lib/growth/seo/site-audit/collector.ts',
      errors: 1,
      name: 'SEO deep-importa probes (bloqueado)'
    },
    // ❌ (1) por ruta relativa que escapa del dominio
    {
      code: "import { runProbes } from '../../ai-visibility/probes/gatherer'",
      filename: '/repo/src/lib/growth/seo/site-audit/collector.ts',
      errors: 1,
      name: 'SEO entra a probes por relativa (bloqueado)'
    },
    // ❌ (1) import dinámico
    {
      code: "const mod = await import('@/lib/growth/ai-visibility/probes/command')",
      filename: '/repo/src/lib/finance/some-reader.ts',
      errors: 1,
      name: 'import dinámico a probes desde otro dominio (bloqueado)'
    },
    // ❌ (1) require
    {
      code: "const probes = require('@/lib/growth/ai-visibility/probes/registry')",
      filename: '/repo/scripts/growth/some-tool.ts',
      errors: 1,
      name: 'require a probes desde tooling (bloqueado)'
    },
    // ❌ (1) export ... from (el mismo agujero con otra sintaxis)
    {
      code: "export { createProbeFetcher } from '@/lib/growth/ai-visibility/probes/safe-fetch'",
      filename: '/repo/src/lib/growth/seo/index.ts',
      errors: 1,
      name: 'barrel ajeno re-exporta probes (bloqueado)'
    },
    // ❌ (2) el sustrato importa un dominio growth
    {
      code: "import { isGraderEnabled } from '@/lib/growth/ai-visibility/flags'",
      filename: '/repo/src/lib/growth/site-substrate/site-fetch.ts',
      errors: 1,
      name: 'sustrato importa growth/* (bloqueado)'
    },
    // ❌ (2) el sustrato escapa por ruta relativa
    {
      code: "import { isGraderEnabled } from '../ai-visibility/flags'",
      filename: '/repo/src/lib/growth/site-substrate/site-fetch.ts',
      errors: 1,
      name: 'sustrato escapa por relativa (bloqueado)'
    },
    // ❌ (2) export ... from que escapa
    {
      code: "export { something } from '../seo/helpers'",
      filename: '/repo/src/lib/growth/site-substrate/index.ts',
      errors: 1,
      name: 'barrel del sustrato re-exporta hacia afuera (bloqueado)'
    }
  ]
})

console.log('greenhouse/growth-substrate-boundary: rule tests OK')
