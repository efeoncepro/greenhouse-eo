import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NANO_BANANA_MODEL } from '@/lib/ai/nano-banana-cli'
import { runNanoCli } from './nano-banana'

vi.mock('@/lib/google-credentials', () => ({ getGoogleProjectId: () => 'efeonce-group', createGoogleAuth: () => ({ getClient: async () => ({ getAccessToken: async () => ({ token: 'test-token-never-log' }) }) }) }))

describe('Nano CLI operational behavior', () => {
  let dir: string
  let image: Buffer
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nano-test-'))
    image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#0088ff' } }).png().toBuffer()
    fetchMock = vi.fn().mockImplementation(async () => Response.json({ modelVersion: NANO_BANANA_MODEL, candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: image.toString('base64') }, thoughtSignature: 'opaque' }] } }], usageMetadata: { totalTokenCount: 1121 } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })
  afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await rm(dir, { recursive: true, force: true }) })

  it('dry run never contacts Google or creates a session', async () => {
    const session = join(dir, 'session.json')

    await runNanoCli(['--prompt', 'circle', '--resolution', '4K', '--search', 'both', '--session', session, '--dry-run'])
    expect(fetchMock).not.toHaveBeenCalled()
    await expect(stat(session)).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it.each([['--mask', 'mask.png'], ['--seed', '123'], ['--temperature', '0'], ['--resolution', '512']])('rejects unsupported %s before spending', async (flag, value) => {
    await expect(runNanoCli(['--prompt', 'circle', '--dry-run', flag, value])).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('requires explicit spend switch and respects nominal output budget', async () => {
    await expect(runNanoCli(['--prompt', 'circle', '--out', join(dir, 'x.png')])).rejects.toThrow('--yes')
    await expect(runNanoCli(['--prompt', 'circle', '--out', join(dir, 'x.png'), '--yes', '--resolution', '4K', '--max-output-usd', '0.05'])).rejects.toThrow('supera')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('writes real JPEG bytes, metadata and a private session; next turn sends signatures', async () => {
    const session = join(dir, 'session.json')
    const first = join(dir, 'first.jpg')

    await runNanoCli(['--prompt', 'circle', '--out', first, '--session', session, '--yes'])
    expect((await sharp(await readFile(first)).metadata()).format).toBe('jpeg')
    expect((await stat(session)).mode & 0o777).toBe(0o600)
    await runNanoCli(['--prompt', 'make it red', '--out', join(dir, 'second.png'), '--session', session, '--yes'])
    const body = JSON.parse(fetchMock.mock.calls[1][1].body)

    expect(body.contents).toHaveLength(3)
    expect(body.contents[1].parts[0].thoughtSignature).toBe('opaque')
    expect(JSON.parse(await readFile(`${first}.json`, 'utf8')).usage.totalTokenCount).toBe(1121)
  })
  it('does not overwrite output or contact Google when it exists', async () => {
    const out = join(dir, 'existing.png')

    await writeFile(out, image)
    await expect(runNanoCli(['--prompt', 'circle', '--out', out, '--yes'])).rejects.toThrow('ya existe')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('refuses MIME-spoofed input before spending', async () => {
    const input = join(dir, 'fake.png')

    await writeFile(input, 'not an image')
    await expect(runNanoCli(['--prompt', 'edit', '--image', input, '--out', join(dir, 'out.png'), '--yes'])).rejects.toThrow('contenido')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('reports HTTP failures without exposing their body or retrying; session stays untouched', async () => {
    fetchMock.mockResolvedValue(new Response('SECRET_PAYLOAD', { status: 403 }))
    const session = join(dir, 'session.json')

    await expect(runNanoCli(['--prompt', 'circle', '--out', join(dir, 'x.png'), '--session', session, '--yes'])).rejects.toThrow('HTTP 403')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await expect(stat(session)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stat(`${session}.lock`)).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('countTokens uses its own endpoint and does not generate', async () => {
    fetchMock.mockResolvedValue(Response.json({ totalTokens: 3 }))
    await runNanoCli(['--prompt', 'circle', '--count-tokens'])
    expect(fetchMock.mock.calls[0][0]).toContain(':countTokens')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('generationConfig')
  })
})
