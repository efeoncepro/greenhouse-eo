import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveSecret = vi.fn()

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

const {
  callLicitalabTool,
  LICITALAB_MCP_URL,
  LicitalabConfigurationError,
  listLicitalabTools,
  parseJsonRpcBody,
  searchLicitalabSupport
} = await import('./client')

const API_KEY = 'll_test_key_do_not_leak'

const jsonResponse = (body: unknown, status = 200, contentType = 'application/json') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': contentType } })

const toolText = (payload: unknown, isError = false) => ({
  jsonrpc: '2.0',
  id: 1,
  result: { content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }], isError }
})

describe('cliente LicitaLAB', () => {
  beforeEach(() => {
    resolveSecret.mockReset()
    resolveSecret.mockResolvedValue({ source: 'secret_manager', value: API_KEY })
  })

  it('envía la key como Bearer al endpoint MCP y omite argumentos undefined', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(toolText({ code: 'X', documents: [], total: 0 })))

    const result = await callLicitalabTool('listOpportunityDocumentsTool', { code: 'X', country: undefined }, { fetchImpl })

    expect(result.ok).toBe(true)
    expect(result.payload).toEqual({ code: 'X', documents: [], total: 0 })

    const [url, init] = fetchImpl.mock.calls[0]

    expect(url).toBe(LICITALAB_MCP_URL)
    expect(init.headers.Authorization).toBe(`Bearer ${API_KEY}`)

    const body = JSON.parse(init.body)

    expect(body.method).toBe('tools/call')
    expect(body.params).toEqual({ name: 'listOpportunityDocumentsTool', arguments: { code: 'X' } })
  })

  it('status unsupported (tool que exige OAuth) es un fallo con el mensaje del proveedor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(toolText({ status: 'unsupported', error: 'Esta herramienta requiere una sesión de usuario.' }))
    )

    const result = await callLicitalabTool('providerReportTool', { taxNumber: '1-9' }, { fetchImpl })

    expect(result.ok).toBe(false)
    expect(result.status).toBe('unsupported')
    expect(result.errorDetail).toContain('sesión de usuario')
  })

  it('status indexing/partial son respuestas válidas, no fallos', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(toolText({ status: 'indexing', chunks: [] })))

    const result = await callLicitalabTool('getOpportunityDocumentTool', { code: 'X', query: 'q' }, { fetchImpl })

    expect(result.ok).toBe(true)
    expect(result.status).toBe('indexing')
  })

  it('isError de la tool se reporta como fallo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(toolText('code inválido', true)))

    const result = await callLicitalabTool('listOpportunityDocumentsTool', { code: '' }, { fetchImpl })

    expect(result.ok).toBe(false)
    expect(result.errorDetail).toBe('code inválido')
  })

  it('un error HTTP nunca expone la key aunque el servidor la refleje', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: `bad key ${API_KEY}` }, 401))

    const result = await callLicitalabTool('searchSupportTool', { question: 'hola' }, { fetchImpl })

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(401)
    expect(result.errorDetail).not.toContain(API_KEY)
    expect(result.errorDetail).toContain('<redacted>')
  })

  it('un fallo de red se devuelve como resultado, no como excepción', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('socket hang up'))

    const result = await callLicitalabTool('searchSupportTool', { question: 'hola' }, { fetchImpl })

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(0)
    expect(result.errorDetail).toContain('socket hang up')
  })

  it('sin key configurada lanza LicitalabConfigurationError sin llamar a la red', async () => {
    resolveSecret.mockResolvedValue({ source: 'unconfigured', value: null })

    const fetchImpl = vi.fn()

    await expect(callLicitalabTool('searchSupportTool', { question: 'hola' }, { fetchImpl })).rejects.toBeInstanceOf(
      LicitalabConfigurationError
    )
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('support traduce el país al vocabulario de esa tool (chile/peru)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(toolText({ answer: 'ok' })))

    await searchLicitalabSupport({ question: 'hola', country: 'CL' }, { fetchImpl })

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).params.arguments).toEqual({ question: 'hola', country: 'chile' })
  })

  it('tools/list normaliza el inventario', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'searchSupportTool', description: 'Busca.', inputSchema: {} }] } })
    )

    const result = await listLicitalabTools({ fetchImpl })

    expect(result.ok).toBe(true)
    expect(result.payload).toEqual([{ name: 'searchSupportTool', description: 'Busca.', inputSchema: {} }])
  })
})

describe('parseJsonRpcBody', () => {
  it('lee JSON directo', () => {
    expect(parseJsonRpcBody('{"result":1}', 'application/json')).toEqual({ result: 1 })
  })

  it('lee el último mensaje de un stream SSE', () => {
    const body = 'event: message\ndata: {"result":1}\n\nevent: message\ndata: {"result":2}\n\n'

    expect(parseJsonRpcBody(body, 'text/event-stream')).toEqual({ result: 2 })
  })

  it('devuelve null ante un body ilegible', () => {
    expect(parseJsonRpcBody('<html>', 'text/html')).toBeNull()
  })
})
