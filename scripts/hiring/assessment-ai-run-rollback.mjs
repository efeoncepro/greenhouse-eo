#!/usr/bin/env node
// TASK-1734 Slice 6 — entry `pnpm hiring:ai:run-rollback`.
//
// Wrapper fino: delega en el CLI TypeScript (assessment-ai-run-rollback.ts) vía tsx con
// el shim de `server-only` (mismo patrón que hiring:ai:promotion-eval). La LÓGICA vive en
// la primitive canónica `rollbackAssessmentAiScoringRuns`
// (src/lib/hiring/assessment/ai/scoring-run/rollback.ts) — este archivo no re-implementa
// nada; solo forwardea argumentos (--apply, --reason <code>, --actor <userId>).
//
// Dry-run por DEFAULT; `--apply` es explícito. Exit code 1 si el apply deja residual.

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'tsx',
    '--require',
    './scripts/lib/server-only-shim.cjs',
    'scripts/hiring/assessment-ai-run-rollback.ts',
    ...process.argv.slice(2),
  ],
  { cwd: repoRoot, stdio: 'inherit' },
)

process.exit(result.status ?? 1)
