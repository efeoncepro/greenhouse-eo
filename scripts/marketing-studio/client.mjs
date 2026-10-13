import { randomUUID } from 'node:crypto'

export class CliError extends Error {}

export function redact(value, secrets = []) {
  if (Array.isArray(value)) return value.map(item => redact(item, secrets))

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /^(authorization|access[_-]?token|refresh[_-]?token|token|secret|cookie|set-cookie)$/i.test(key)
          ? '[REDACTED]'
          : redact(item, secrets)
      ])
    )
  }

  if (typeof value !== 'string') return value
  let result = value.replace(/https?:\/\/[^\s"<>]+/g, url =>
    /[?&](?:x-goog-|x-amz-|signature=|upload_id=|token=)|\/api\/v1\/media\//i.test(url) ? '[REDACTED_URL]' : url
  )

  result = result.replace(/\/api\/v1\/media\/[^\s"<>]+/g, '[REDACTED_URL]')

  for (const secret of secrets.filter(Boolean)) result = result.split(secret).join('[REDACTED]')

  return result
}

export function schemaRoot(schema) {
  if (schema?.$ref?.startsWith('#/definitions/')) return schema.definitions?.[schema.$ref.split('/').at(-1)] ?? schema

  return schema
}

export class StudioClient {
  constructor({ baseUrl = 'https://studio.efeonce.org', token, fetchImpl = fetch, log = () => {} } = {}) {
    const url = new URL(baseUrl)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)

    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    ) {
      throw new CliError('La base debe ser un origen HTTPS (HTTP sólo para localhost).')
    }

    if (token && /\s/.test(token)) throw new CliError('Credencial inválida: contiene espacios.')
    this.baseUrl = url.origin
    this.token = token
    this.fetch = fetchImpl
    this.log = value => log(redact(value, [token]))
  }

  async request(path, options = {}) {
    if (!path.startsWith('/api/v1/') || new URL(path, this.baseUrl).origin !== this.baseUrl)
      throw new CliError('Ruta fuera de Studio.')
    let response

    try {
      response = await this.fetch(this.baseUrl + path, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(60_000),
        headers: {
          Accept: 'application/json',
          ...options.headers,
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
        }
      })
    } catch {
      throw new CliError('No se pudo completar la solicitud a Studio (red, timeout o redirección).')
    }

    if (!response.ok) {
      let code = 'request_failed'

      try {
        const data = await response.json()

        if (typeof data.code === 'string' && /^[a-z0-9_:-]{1,100}$/i.test(data.code)) code = data.code
      } catch {
        /* Do not expose raw HTML or provider errors. */
      }

      throw new CliError(`Studio HTTP ${response.status}: ${code}. No se reintentó la escritura.`)
    }

    return response
  }

  async discover() {
    const [openapi, manifest] = await Promise.all([
      this.request('/api/v1/openapi.json').then(r => r.json()),
      this.request('/api/v1/tool-manifest').then(r => r.json())
    ])

    if (!openapi.paths || !Array.isArray(manifest.tools) || openapi.info?.version !== manifest.apiVersion) {
      throw new CliError('OpenAPI y manifiesto incompatibles; vuelve a intentar tras el despliegue.')
    }

    const tools = new Map(manifest.tools.map(tool => [tool.operationId, tool]))

    this.operations = new Map()
    this.aliases = new Map()

    for (const [path, methods] of Object.entries(openapi.paths)) {
      if (!path.startsWith('/api/v1/') || path.includes('?') || path.includes('#'))
        throw new CliError('Ruta de contrato inválida.')

      for (const [method, spec] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'patch', 'delete', 'head'].includes(method)) continue
        const id = spec.operationId

        if (!id || this.operations.has(id)) throw new CliError('operationId ausente o duplicado.')
        const tool = tools.get(id)
        const writes = !['get', 'head'].includes(method)

        if (tool && (tool.path !== path || tool.method !== method.toUpperCase() || tool.writes !== writes))
          throw new CliError('Transporte del manifiesto no coincide con OpenAPI.')
        if (writes && (!tool?.transport || !['T1', 'T2'].includes(tool.riskTier)))
          throw new CliError('Escritura sin contrato de riesgo/transporte.')
        if (!tool && !manifest.exclusions?.some(entry => entry.operationId === id && entry.path === path))
          throw new CliError('Operación sin tool ni exclusión documentada.')
        const operation = { id, path, method: method.toUpperCase(), writes, spec, tool }

        this.operations.set(id, operation)

        if (tool) {
          if (this.aliases.has(tool.name)) throw new CliError('Nombre de tool duplicado.')
          this.aliases.set(tool.name, id)
        }
      }
    }

    if (this.aliases.size !== manifest.tools.length) throw new CliError('Hay tools sin operación OpenAPI.')
    this.openapi = openapi
    this.manifest = manifest

    return this
  }

  operation(name) {
    const operation = this.operations?.get(this.aliases.get(name) ?? name)

    if (!operation) throw new CliError('Operación desconocida; usa list o describe.')

    return operation
  }

  describe(name) {
    const { id, path, method, spec, tool } = this.operation(name)

    return {
      operationId: id,
      method,
      path,
      summary: spec.summary,
      description: spec.description,
      parameters: spec.parameters ?? [],
      body: spec.requestBody?.content?.['application/json']?.schema ?? null,
      tool: tool ?? null
    }
  }

  async call(name, { params = {}, body, apply = false, confirm = false, key, revision } = {}) {
    const op = this.operation(name)
    const headers = {}
    const query = new URLSearchParams()
    let path = op.path
    const definitions = op.spec.parameters ?? []

    for (const name of Object.keys(params)) {
      if (name === 'dryRun') throw new CliError('Usa --apply o --dry-run para controlar dryRun.')
      if (!definitions.some(p => p.name === name && ['path', 'query'].includes(p.in)))
        throw new CliError(`Parámetro desconocido: ${name}. Usa describe.`)
    }

    for (const parameter of definitions.filter(p => ['path', 'query'].includes(p.in) && p.name !== 'dryRun')) {
      const value = params[parameter.name]

      if (value === undefined && parameter.required) throw new CliError(`Falta --param ${parameter.name}=…`)
      if (value === undefined) continue
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
        throw new CliError('Los parámetros deben ser escalares.')
      if (parameter.in === 'path') {
        if (['.', '..', ''].includes(String(value))) throw new CliError('Parámetro de ruta inválido.')
        path = path.replace(`{${parameter.name}}`, encodeURIComponent(String(value)))
      } else query.set(parameter.name, String(value))
    }

    if (/\{[^}]+\}/.test(path)) throw new CliError('Faltan parámetros de ruta.')
    const bodySchema = op.spec.requestBody?.content?.['application/json']?.schema

    if (body !== undefined && !bodySchema) throw new CliError('Esta operación no acepta un cuerpo JSON.')
    if (body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body)))
      throw new CliError('El cuerpo debe ser un objeto JSON.')
    if (op.spec.requestBody?.required && body === undefined)
      throw new CliError('Falta --file con el cuerpo JSON. Consulta describe.')
    const shape = schemaRoot(bodySchema)

    if (body && shape) {
      for (const field of shape.required ?? [])
        if (!(field in body)) throw new CliError(`Falta campo del cuerpo: ${field}.`)

      if (shape.additionalProperties === false)
        for (const field of Object.keys(body)) {
          if (!Object.hasOwn(shape.properties ?? {}, field))
            throw new CliError(`Campo desconocido del cuerpo: ${field}.`)
        }
    }

    if (op.writes) {
      if (apply && op.tool.riskTier === 'T2' && !confirm)
        throw new CliError('T2 requiere --apply --confirm y autoridad de persona en el servidor.')
      if (apply && !this.token)
        throw new CliError('Una escritura requiere STUDIO_API_TOKEN, --token-file o --token-secret.')
      if (op.tool.transport.ifMatch === 'required' && revision === undefined)
        throw new CliError('Falta --if-match con la revisión leída del servidor.')

      if (revision !== undefined) {
        if (op.tool.transport.ifMatch === 'none' || !/^[1-9][0-9]*$/.test(String(revision)))
          throw new CliError('If-Match no permitido o inválido.')
        headers['If-Match'] = String(revision)
      }

      key ??= `cli-${randomUUID()}`
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new CliError('Idempotency-Key inválida (8–128 caracteres).')
      headers['Idempotency-Key'] = key
      if (op.tool.transport.dryRun) query.set('dryRun', String(!apply))
      this.log({ operationId: op.id, apply, idempotencyKey: key, revision: revision ?? null })
      if (!apply && !op.tool.transport.dryRun)
        return {
          status: 0,
          data: {
            status: 'local_plan',
            operationId: op.id,
            reason: 'La API no ofrece dryRun; no se envió una mutación.'
          },
          key
        }
    } else if (apply || confirm || key || revision !== undefined)
      throw new CliError('Flags de escritura recibidos para una lectura.')
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const response = await this.request(path + (query.size ? `?${query}` : ''), {
      method: op.method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    })

    const type = response.headers.get('content-type') ?? ''
    const data = response.status === 204 ? null : type.includes('json') ? await response.json() : null

    return { status: response.status, data, response, key }
  }
}
