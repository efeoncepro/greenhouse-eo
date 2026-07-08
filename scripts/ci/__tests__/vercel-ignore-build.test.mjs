import test from 'node:test'
import assert from 'node:assert/strict'

import { decideBuildAction, isSafeDocsOnlyPath } from '../vercel-ignore-build.mjs'

test('classifies ordinary docs and agent skill changes as safe docs-only paths', () => {
  assert.equal(isSafeDocsOnlyPath('docs/reference/measurement-gtm-ga4/README.md'), true)
  assert.equal(isSafeDocsOnlyPath('Handoff.md'), true)
  assert.equal(isSafeDocsOnlyPath('.codex/skills/greenhouse-task-planner/SKILL.md'), true)
})

test('treats deploy-control docs as deploy-affecting', () => {
  assert.equal(isSafeDocsOnlyPath('docs/operations/runbooks/production-release.md'), false)
  assert.equal(isSafeDocsOnlyPath('docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md'), false)
})

test('skips safe docs-only changes on develop', () => {
  const decision = decideBuildAction({
    changedFiles: ['docs/reference/measurement-gtm-ga4/README.md', '.claude/skills/foo/SKILL.md'],
    env: { VERCEL_GIT_COMMIT_REF: 'develop', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'staging' }
  })

  assert.equal(decision.action, 'skip')
})

test('continues the build when runtime, workflow, config, migration, or deploy script files change', () => {
  const cases = [
    'src/lib/foo.ts',
    'app/[lang]/page.tsx',
    'public/growth-forms/renderer.js',
    'package.json',
    'pnpm-lock.yaml',
    'vercel.json',
    '.github/workflows/ci.yml',
    'services/ops-worker/deploy.sh',
    'scripts/run-next-build.mjs',
    'migrations/202607080001_example.sql',
    'next.config.ts'
  ]

  for (const path of cases) {
    const decision = decideBuildAction({
      changedFiles: [path],
      env: { VERCEL_GIT_COMMIT_REF: 'develop', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'staging' }
    })

    assert.equal(decision.action, 'build', path)
  }
})

test('continues production builds on main until the release orchestrator supports skipped Vercel builds', () => {
  const decision = decideBuildAction({
    changedFiles: ['docs/reference/measurement-gtm-ga4/README.md'],
    env: { VERCEL_GIT_COMMIT_REF: 'main', VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production' }
  })

  assert.equal(decision.action, 'build')
})
