import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

import { test } from 'vitest'

import { assertDataForSeoConfig, revisionEnvironment } from './dataforseo-config.mjs'

const configured = {
  GROWTH_SEO_ENABLED: 'true',
  GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED: 'false',
  DATAFORSEO_API_LOGIN: 'fixture@example.test',
  DATAFORSEO_API_PASSWORD_SECRET_REF: 'fixture-password'
}

test('enabled SEO and AIO independently require complete configuration', () => {
  for (const flag of ['GROWTH_SEO_ENABLED', 'GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED']) {
    const env = { ...configured, GROWTH_SEO_ENABLED: 'false', [flag]: 'true' }

    assert.doesNotThrow(() => assertDataForSeoConfig(env))

    for (const key of ['DATAFORSEO_API_LOGIN', 'DATAFORSEO_API_PASSWORD_SECRET_REF']) {
      for (const value of [undefined, '', '  ']) {
        assert.throws(() => assertDataForSeoConfig({ ...env, [key]: value }), new RegExp(key))
      }
    }
  }
})

test('disabled consumers need no credentials; malformed flags cannot bypass validation', () => {
  assert.doesNotThrow(() =>
    assertDataForSeoConfig({ GROWTH_SEO_ENABLED: 'false', GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED: 'false' })
  )
  assert.throws(() => assertDataForSeoConfig({ ...configured, GROWTH_SEO_ENABLED: 'yes' }), /Invalid boolean/)
})

test('reads actual revision env and detects the incident configuration', () => {
  const revision = {
    spec: {
      containers: [
        {
          env: Object.entries(configured)
            .filter(([name]) => name !== 'DATAFORSEO_API_LOGIN')
            .map(([name, value]) => ({ name, value }))
        }
      ]
    }
  }

  assert.throws(() => assertDataForSeoConfig(revisionEnvironment(revision)), /DATAFORSEO_API_LOGIN/)
  revision.spec.containers[0].env.push({ name: 'DATAFORSEO_API_LOGIN', value: configured.DATAFORSEO_API_LOGIN })
  assert.doesNotThrow(() => assertDataForSeoConfig(revisionEnvironment(revision)))
  assert.throws(() => revisionEnvironment({}), /no container/)
})

test('real deploy stops before cloud calls/build when login is absent in either environment', () => {
  for (const environment of ['staging', 'production']) {
    const result = spawnSync('bash', ['services/ops-worker/deploy.sh'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 5000,
      env: { NODE_ENV: 'test', PATH: process.env.PATH, ENV: environment, DATAFORSEO_API_LOGIN: '' }
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /DataForSEO configuration missing: DATAFORSEO_API_LOGIN/)
    assert.doesNotMatch(result.stdout, /Build|gcloud|deployment/)
  }
})

test('preflight never exposes supplied values on failure', () => {
  const result = spawnSync(process.execPath, ['services/ops-worker/dataforseo-config.mjs', '--preflight'], {
    encoding: 'utf8',
    env: { NODE_ENV: 'test', ...configured, DATAFORSEO_API_PASSWORD_SECRET_REF: '' }
  })

  assert.equal(result.status, 1)
  assert.doesNotMatch(result.stdout + result.stderr, /fixture@example/)
})
