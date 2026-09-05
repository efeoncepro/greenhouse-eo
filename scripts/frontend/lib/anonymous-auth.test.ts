import { afterEach, describe, expect, it, vi } from 'vitest'

const browserMock = vi.hoisted(() => {
  const route = vi.fn()
  const context = { route, addInitScript: vi.fn(), tracing: { start: vi.fn() }, newPage: vi.fn(async () => ({})) }
  const browser = { newContext: vi.fn(async () => context) }

  return { browser, context, route, launch: vi.fn(async () => browser) }
})

vi.mock('playwright', () => ({ chromium: { launch: browserMock.launch }, devices: {} }))

import { launchCaptureSession } from './browser'
import { resolveEnvConfig } from './env'
import { resolveScenarioAuthentication, validateScenario } from './scenario'

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

describe('explicit anonymous capture authentication', () => {
  it('defaults to agent and rejects contradictory authentication before capture', () => {
    expect(resolveScenarioAuthentication({})).toBe('agent')
    expect(resolveScenarioAuthentication({ authentication: 'anonymous' })).toBe('anonymous')
    expect(() => validateScenario({ name: 'public', route: '/auth/login', viewport: { width: 800, height: 600 }, steps: [], authentication: 'anonymous', requiresStorageState: '.auth/existing.json' })).toThrow('cannot declare requiresStorageState')
  })

  it('does not require a staging bypass in anonymous mode while agent retains the gate', () => {
    vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', '')
    expect(() => resolveEnvConfig('staging')).toThrow('VERCEL_AUTOMATION_BYPASS_SECRET')
    expect(resolveEnvConfig('staging', 'anonymous').bypassSecret).toBeUndefined()
    vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', 'fixture-secret')
    expect(resolveEnvConfig('staging', 'anonymous').bypassSecret).toBeUndefined()
    expect(resolveEnvConfig('staging').bypassSecret).toBe('fixture-secret')
  })

  it('launches a genuinely empty browser and installs no credential routing even with legacy env state', async () => {
    const envConfig = { baseUrl: 'https://public.example', storageStatePath: '.auth/existing-with-cookies.json', agentEmail: 'agent@example', bypassSecret: 'fixture-secret', isProduction: false }

    await launchCaptureSession({ envConfig, authentication: 'anonymous', viewport: { width: 800, height: 600 }, recordVideoDir: '/tmp/capture-fixture' })
    expect(browserMock.browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ storageState: { cookies: [], origins: [] } }))
    expect(browserMock.route).not.toHaveBeenCalled()
  })

  it('keeps authenticated storage and origin-scoped bypass for the default agent mode', async () => {
    const envConfig = { baseUrl: 'https://private.example', storageStatePath: '.auth/agent.json', agentEmail: 'agent@example', bypassSecret: 'fixture-secret', isProduction: false }

    await launchCaptureSession({ envConfig, viewport: { width: 800, height: 600 }, recordVideoDir: '/tmp/capture-fixture' })
    expect(browserMock.browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ storageState: '.auth/agent.json' }))
    expect(browserMock.route).toHaveBeenCalledOnce()
  })
})
