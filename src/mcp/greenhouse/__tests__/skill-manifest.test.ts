/**
 * TASK-1804 — El manifiesto de manuales es fuente sólo si algo falla cuando deja de serlo.
 *
 * Tres capas, en el orden de `MCP_TOOL_SURFACE_INVARIANTS.md` §3:
 *
 *   1. La construcción del servidor real es el guard estructural: valida manifiesto ↔ filesystem
 *      en las dos direcciones. Acá se verifica que el repo REAL construye y que el catálogo
 *      coincide con el manifiesto.
 *   2. El poder de detección se ejercita con estados sintéticos — sobre la función pura y sobre un
 *      filesystem temporal — porque un guard que nunca se pone rojo no prueba nada.
 *   3. El control del riesgo central de la task: el test de FUGA recorre todo `docs/mcp/skills/**`
 *      y falla ante un patrón de secreto, un UUID, un identificador de organización, una ruta del
 *      repo privado o un identificador interno. La revisión humana NO es el control; esto lo es.
 *
 * Y la paridad entre consumidores: la tool y el recurso `skill://` devuelven el MISMO cuerpo que el
 * catálogo, byte a byte, porque los dos lo piden al mismo lane.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createGreenhouseMcpServer } from '../server'
import {
  GreenhouseMcpSkillCatalogError,
  getGreenhouseMcpSkillCatalog,
  listGreenhouseMcpSkills,
  buildGreenhouseMcpSkillCatalogArtifact,
  buildGreenhouseMcpSkillCatalogFromArtifact,
  parseGreenhouseMcpSkillFrontmatter,
  readGreenhouseMcpSkill,
  resolveGreenhouseMcpSkillAudiences
} from '../skill-catalog'
import { loadGreenhouseMcpSkillCatalogFromFilesystem, observeGreenhouseMcpSkillFiles } from '../skill-catalog-fs'
import {
  buildGreenhouseMcpSkillUri,
  computeGreenhouseMcpSkillCoverage,
  GREENHOUSE_MCP_SKILL_MANIFEST,
  GREENHOUSE_MCP_SKILLS_ROOT,
  type GreenhouseMcpSkillManifestEntry
} from '../skill-manifest'
import { GREENHOUSE_MCP_TOOL_MANIFEST, GREENHOUSE_MCP_TOOL_MANIFEST_BY_NAME } from '../tool-manifest'

const stubConfig = {
  apiBaseUrl: 'https://example.invalid',
  consumerToken: 'stub',
  externalScopeType: 'other' as const,
  externalScopeId: 'stub',
  apiVersion: '2026-04-25',
  requestTimeoutMs: 1_000
}

describe('manifiesto de manuales MCP — el repo real (TASK-1804)', () => {
  const catalog = getGreenhouseMcpSkillCatalog()

  it('construye el catálogo con exactamente los manuales del manifiesto, en su orden', () => {
    expect(catalog.skills.map(skill => skill.name)).toEqual(GREENHOUSE_MCP_SKILL_MANIFEST.map(entry => entry.name))
    expect(catalog.skills).toHaveLength(3)
  })

  it('name y description salen del frontmatter, no de una transcripción', () => {
    for (const skill of catalog.skills) {
      const frontmatter = parseGreenhouseMcpSkillFrontmatter(skill.body)

      expect(frontmatter.name).toBe(skill.name)
      expect(frontmatter.description).toBe(skill.description)
      expect(skill.description.length).toBeGreaterThan(40)
    }
  })

  it('toda tool gobernada existe en el manifiesto de tools', () => {
    for (const entry of GREENHOUSE_MCP_SKILL_MANIFEST) {
      for (const tool of entry.appliesTo) {
        expect(GREENHOUSE_MCP_TOOL_MANIFEST_BY_NAME.has(tool), `${entry.name} gobierna ${tool}`).toBe(true)
      }
    }
  })

  it('toda tool que compromete presupuesto está gobernada por seo-spend-discipline', () => {
    const governed = new Set(GREENHOUSE_MCP_SKILL_MANIFEST.find(entry => entry.name === 'seo-spend-discipline')?.appliesTo)

    for (const tool of GREENHOUSE_MCP_TOOL_MANIFEST.filter(entry => entry.spendsProviderBudget)) {
      expect(governed.has(tool.name), `${tool.name} gasta y el manual de gasto no la gobierna`).toBe(true)
    }
  })

  it('ningún manual nace con audience client hasta que existan grants por tenant', () => {
    expect(GREENHOUSE_MCP_SKILL_MANIFEST.every(entry => entry.audience === 'internal')).toBe(true)
  })

  it('el catálogo anuncia resúmenes, nunca cuerpos', () => {
    const summaries = listGreenhouseMcpSkills(catalog, resolveGreenhouseMcpSkillAudiences('internal'))

    expect(summaries).toHaveLength(3)

    for (const summary of summaries) {
      expect(Object.keys(summary).sort()).toEqual(['appliesTo', 'audience', 'description', 'name', 'uri'])
      expect(summary.uri).toBe(buildGreenhouseMcpSkillUri(summary.name))
    }
  })

  it('un binding de cliente no ve ningún manual internal, ni en catálogo ni en detalle', () => {
    const clientAudiences = resolveGreenhouseMcpSkillAudiences('organization')

    expect(listGreenhouseMcpSkills(catalog, clientAudiences)).toEqual([])
    expect(readGreenhouseMcpSkill(catalog, 'seo-spend-discipline', clientAudiences)).toBeNull()
    // Inexistente y no visible son INDISTINGUIBLES: anti-oráculo.
    expect(readGreenhouseMcpSkill(catalog, 'no-such-manual', clientAudiences)).toBeNull()
    expect(readGreenhouseMcpSkill(catalog, 'no-such-manual', resolveGreenhouseMcpSkillAudiences('internal'))).toBeNull()
  })

  it('la description de get_greenhouse_skill nombra cada manual: es la única palanca en contexto', () => {
    const server = createGreenhouseMcpServer(stubConfig, {
      fetch: (async () => new Response('{}')) as unknown as typeof fetch
    })

    const registered = (server as unknown as { _registeredTools: Record<string, { description?: string }> })
      ._registeredTools

    const description = registered.get_greenhouse_skill?.description ?? ''

    for (const entry of GREENHOUSE_MCP_SKILL_MANIFEST) {
      expect(description).toContain(entry.name)
    }
  })

  it('get_greenhouse_skill es lectura pura en el manifiesto de tools', () => {
    const entry = GREENHOUSE_MCP_TOOL_MANIFEST_BY_NAME.get('get_greenhouse_skill')

    expect(entry).toBeDefined()
    expect(entry?.writes).toBe(false)
    expect(entry?.spendsProviderBudget).toBe(false)
    expect(entry?.domain).toBe('platform')
  })
})

describe('poder de detección de la cobertura (estados sintéticos, función pura)', () => {
  const entry: GreenhouseMcpSkillManifestEntry = {
    name: 'synthetic-manual',
    audience: 'internal',
    sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/synthetic-manual/SKILL.md`,
    appliesTo: ['get_context']
  }

  const file = {
    sourcePath: entry.sourcePath,
    frontmatterName: 'synthetic-manual',
    frontmatterDescription: 'Sintético — caso base.'
  }

  const tools = [{ name: 'get_context' }]

  it('el caso base no reporta nada', () => {
    expect(computeGreenhouseMcpSkillCoverage({ manifest: [entry], files: [file], tools })).toEqual([])
  })

  it('un manual declarado sin archivo se pone rojo NOMBRÁNDOLO', () => {
    const findings = computeGreenhouseMcpSkillCoverage({ manifest: [entry], files: [], tools })

    expect(findings.map(finding => finding.code)).toEqual(['declared_without_file'])
    expect(findings[0].message).toContain('synthetic-manual')
  })

  it('un archivo sin declaración se pone rojo NOMBRÁNDOLO', () => {
    const rogue = { ...file, sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/rogue/SKILL.md`, frontmatterName: 'rogue' }
    const findings = computeGreenhouseMcpSkillCoverage({ manifest: [entry], files: [file, rogue], tools })

    expect(findings.map(finding => finding.code)).toEqual(['file_without_declaration'])
    expect(findings[0].message).toContain('rogue/SKILL.md')
  })

  it('un frontmatter cuyo name no coincide con la clave se pone rojo', () => {
    const findings = computeGreenhouseMcpSkillCoverage({
      manifest: [entry],
      files: [{ ...file, frontmatterName: 'another-name' }],
      tools
    })

    expect(findings.map(finding => finding.code)).toEqual(['frontmatter_name_mismatch'])
  })

  it('un frontmatter sin description se pone rojo', () => {
    const findings = computeGreenhouseMcpSkillCoverage({
      manifest: [entry],
      files: [{ ...file, frontmatterDescription: null }],
      tools
    })

    expect(findings.map(finding => finding.code)).toEqual(['frontmatter_description_missing'])
  })

  it('una tool gobernada que no existe (renombrada o typo) se pone rojo nombrando la tool', () => {
    const findings = computeGreenhouseMcpSkillCoverage({
      manifest: [{ ...entry, appliesTo: ['get_context', 'get_seo_ghost_tool'] }],
      files: [file],
      tools
    })

    expect(findings.map(finding => finding.code)).toEqual(['applies_to_unknown_tool'])
    expect(findings[0].message).toContain('get_seo_ghost_tool')
  })

  it('un manual sin tools gobernadas, un nombre inválido y una ruta fuera de la raíz se ponen rojos', () => {
    const findings = computeGreenhouseMcpSkillCoverage({
      manifest: [
        { ...entry, appliesTo: [] },
        { ...entry, name: 'Bad.Name', sourcePath: '.claude/skills/x/SKILL.md', appliesTo: ['get_context'] }
      ],
      files: [file, { ...file, sourcePath: '.claude/skills/x/SKILL.md', frontmatterName: 'Bad.Name' }],
      tools
    })

    expect(findings.map(finding => finding.code).sort()).toEqual(
      ['applies_to_empty', 'invalid_name', 'source_path_outside_root'].sort()
    )
  })

  it('un nombre duplicado se pone rojo', () => {
    const findings = computeGreenhouseMcpSkillCoverage({ manifest: [entry, entry], files: [file], tools })

    expect(findings.map(finding => finding.code)).toContain('duplicate_name')
  })
})

describe('poder de detección de la cobertura (filesystem sintético)', () => {
  const roots: string[] = []

  const makeRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'gh-mcp-skills-'))

    roots.push(root)

    return root
  }

  const writeSkill = (root: string, name: string, body?: string) => {
    const dir = join(root, GREENHOUSE_MCP_SKILLS_ROOT, name)

    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'SKILL.md'),
      body ?? `---\nname: ${name}\ndescription: Manual sintético ${name}.\n---\n\n# ${name}\n\nCuerpo.\n`,
      'utf8'
    )
  }

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true })
    }
  })

  const manifestFor = (...names: string[]): GreenhouseMcpSkillManifestEntry[] =>
    names.map(name => ({
      name,
      audience: 'internal',
      sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/${name}/SKILL.md`,
      appliesTo: ['get_context']
    }))

  it('carga un catálogo válido y expone cuerpo verbatim + hash', () => {
    const root = makeRoot()

    writeSkill(root, 'alpha')

    const catalog = loadGreenhouseMcpSkillCatalogFromFilesystem({ root, manifest: manifestFor('alpha'), tools: [{ name: 'get_context' }] })

    expect(catalog.skills).toHaveLength(1)
    expect(catalog.skills[0].body.startsWith('---\nname: alpha')).toBe(true)
    expect(catalog.skills[0].contentHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('un manual declarado sin archivo hace fallar la carga nombrándolo', () => {
    const root = makeRoot()

    writeSkill(root, 'alpha')

    expect(() =>
      loadGreenhouseMcpSkillCatalogFromFilesystem({ root, manifest: manifestFor('alpha', 'beta'), tools: [{ name: 'get_context' }] })
    ).toThrow(/beta/)
  })

  it('un archivo sin declaración hace fallar la carga nombrándolo', () => {
    const root = makeRoot()

    writeSkill(root, 'alpha')
    writeSkill(root, 'orphan')

    let caught: unknown

    try {
      loadGreenhouseMcpSkillCatalogFromFilesystem({ root, manifest: manifestFor('alpha'), tools: [{ name: 'get_context' }] })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(GreenhouseMcpSkillCatalogError)
    expect((caught as GreenhouseMcpSkillCatalogError).findings.map(finding => finding.code)).toEqual([
      'file_without_declaration'
    ])
  })

  it('un directorio inexistente se observa como vacío (y por tanto todo lo declarado falla)', () => {
    const root = makeRoot()

    expect(observeGreenhouseMcpSkillFiles(root)).toEqual([])
    expect(() =>
      loadGreenhouseMcpSkillCatalogFromFilesystem({ root, manifest: manifestFor('alpha'), tools: [{ name: 'get_context' }] })
    ).toThrow(/declara "alpha"/)
  })

  it('un frontmatter ilegible se observa como sin name (y falla como mismatch)', () => {
    const root = makeRoot()

    writeSkill(root, 'alpha', '# Sin frontmatter\n')

    expect(() =>
      loadGreenhouseMcpSkillCatalogFromFilesystem({ root, manifest: manifestFor('alpha'), tools: [{ name: 'get_context' }] })
    ).toThrow(/frontmatter|name=/)
  })
})

describe('el artefacto generado es el runtime, y coincide con el filesystem (TASK-1804)', () => {
  // El verificador REAL es `pnpm mcp:skills:check` (local:check + CI): compara bytes del artefacto
  // committeado contra el filesystem. Este test lo replica en proceso para que un manual editado
  // sin regenerar se ponga rojo también en `pnpm test`.
  it('el catálogo de runtime (artefacto) es byte-idéntico al del filesystem', () => {
    const fromFs = loadGreenhouseMcpSkillCatalogFromFilesystem()
    const runtime = getGreenhouseMcpSkillCatalog()

    expect(runtime.catalogHash).toBe(fromFs.catalogHash)
    expect(runtime.skills.map(skill => [skill.name, skill.contentHash, skill.body])).toEqual(
      fromFs.skills.map(skill => [skill.name, skill.contentHash, skill.body])
    )
  })

  it('el artefacto es determinista: regenerarlo desde el filesystem produce los mismos bytes', () => {
    const fromFs = loadGreenhouseMcpSkillCatalogFromFilesystem()

    const artifactOnDisk = JSON.parse(
      readFileSync(join(process.cwd(), 'src/mcp/greenhouse/skill-catalog.generated.json'), 'utf8')
    )

    expect(buildGreenhouseMcpSkillCatalogArtifact(fromFs)).toEqual(artifactOnDisk)
  })

  it('un artefacto editado a mano (cuerpo cambiado) LANZA por contentHash', () => {
    const artifact = buildGreenhouseMcpSkillCatalogArtifact(loadGreenhouseMcpSkillCatalogFromFilesystem())

    artifact.skills[0].body = `${artifact.skills[0].body}\n<!-- edición a mano -->\n`

    expect(() => buildGreenhouseMcpSkillCatalogFromArtifact(artifact)).toThrow(/contentHash/)
  })

  it('un artefacto viejo (manifiesto con un manual más) LANZA nombrando el manual', () => {
    const artifact = buildGreenhouseMcpSkillCatalogArtifact(loadGreenhouseMcpSkillCatalogFromFilesystem())

    const manifest = [
      ...GREENHOUSE_MCP_SKILL_MANIFEST,
      {
        name: 'brand-new-manual',
        audience: 'internal' as const,
        sourcePath: `${GREENHOUSE_MCP_SKILLS_ROOT}/brand-new-manual/SKILL.md`,
        appliesTo: ['get_context']
      }
    ]

    expect(() => buildGreenhouseMcpSkillCatalogFromArtifact(artifact, manifest)).toThrow(/brand-new-manual/)
  })

  it('un artefacto cuyo appliesTo divergió del manifiesto LANZA', () => {
    const artifact = buildGreenhouseMcpSkillCatalogArtifact(loadGreenhouseMcpSkillCatalogFromFilesystem())

    artifact.skills[0].appliesTo = [...artifact.skills[0].appliesTo, 'get_context']

    expect(() => buildGreenhouseMcpSkillCatalogFromArtifact(artifact)).toThrow(/no coincide con el manifiesto/)
  })
})

describe('test de FUGA — ningún manual publica contenido interno', () => {
  /**
   * Cada patrón es una clase de dato que NUNCA debe cruzar al consumidor MCP. Se enumeran con su
   * razón para que agregar uno sea un acto explícito.
   */
  const FORBIDDEN: ReadonlyArray<{ reason: string; pattern: RegExp }> = [
    { reason: 'UUID (ids de aplicación Entra, clientes OAuth, bindings)', pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i },
    { reason: 'identificador de organización real', pattern: /\borg-[0-9a-f]{6,}/i },
    { reason: 'identificadores públicos internos de org/consumer/binding', pattern: /\bEO-(?:ORG|SPK|SPB)-\d+/ },
    { reason: 'ruta del repositorio privado', pattern: /(?:^|[\s(`'"])(?:src|docs|services|scripts|migrations|tests)\/[A-Za-z0-9_./-]+/m },
    { reason: 'skills internas del repo', pattern: /\.(?:claude|codex)\// },
    { reason: 'identificador de task o issue interna', pattern: /\b(?:TASK|ISSUE|EPIC|MINI)-\d{2,4}\b/ },
    { reason: 'proyecto GCP', pattern: /\befeonce-group\b/ },
    { reason: 'revisión de Cloud Run o proyecto Vercel', pattern: /\b(?:efeonce-mcp-gateway-\d{5}|prj_[A-Za-z0-9]{10,})/ },
    { reason: 'nombre de secreto de Secret Manager', pattern: /\bgreenhouse-[a-z0-9-]*(?:token|secret|password|api-key)\b/ },
    { reason: 'referencia a secreto por env', pattern: /_SECRET_REF\b/ },
    { reason: 'token o clave con forma de secreto', pattern: /\b(?:sk-ant-|sk-|ghspk_|AKIA)[A-Za-z0-9_-]{8,}/ },
    { reason: 'bloque PEM', pattern: /-----BEGIN /},
    { reason: 'bearer token literal', pattern: /Bearer\s+[A-Za-z0-9._-]{16,}/ },
    { reason: 'email interno', pattern: /@(?:efeonce|greenhouse)\.[a-z]+/i }
  ]

  it('recorre todo docs/mcp/skills/** y no encuentra ningún patrón prohibido', () => {
    const catalog = getGreenhouseMcpSkillCatalog()

    expect(catalog.skills.length).toBeGreaterThan(0)

    const leaks: string[] = []

    for (const skill of catalog.skills) {
      for (const { reason, pattern } of FORBIDDEN) {
        const match = pattern.exec(skill.body)

        if (match) {
          leaks.push(`${skill.sourcePath}: ${reason} → "${match[0]}"`)
        }
      }
    }

    expect(leaks, leaks.join('\n')).toEqual([])
  })

  it('el poder de detección es real: un cuerpo con un UUID, una ruta src/ y un org-id se detecta', () => {
    const poisoned = [
      'client 32617b87-e7ef-493a-838f-1ff3f0213b93',
      'see src/mcp/greenhouse/server.ts',
      'org-32333527-02a8-487b-819e-6f76a761777d',
      'ver TASK-1804'
    ].join('\n')

    const hits = FORBIDDEN.filter(({ pattern }) => pattern.test(poisoned)).map(({ reason }) => reason)

    expect(hits.length).toBeGreaterThanOrEqual(4)
  })
})

describe('paridad entre consumidores — tool ≡ recurso skill:// ≡ catálogo', () => {
  const catalog = getGreenhouseMcpSkillCatalog()

  const laneFetch = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)

    const envelope = (data: unknown) =>
      Response.json({ requestId: 'req-skill', servedAt: new Date().toISOString(), version: '2026-04-25', data, meta: {} })

    if (url.pathname === '/api/platform/ecosystem/mcp/skills') {
      return envelope({
        skills: listGreenhouseMcpSkills(catalog, resolveGreenhouseMcpSkillAudiences('internal')),
        count: catalog.skills.length
      })
    }

    const match = /^\/api\/platform\/ecosystem\/mcp\/skills\/([^/]+)$/.exec(url.pathname)

    if (match) {
      const skill = readGreenhouseMcpSkill(catalog, decodeURIComponent(match[1]), resolveGreenhouseMcpSkillAudiences('internal'))

      if (!skill) {
        return Response.json({ requestId: 'req-skill', version: '2026-04-25', errors: [{ code: 'not_found', message: 'nf' }] }, { status: 404 })
      }

      return envelope({
        name: skill.name,
        description: skill.description,
        audience: skill.audience,
        appliesTo: skill.appliesTo,
        uri: skill.uri,
        contentHash: skill.contentHash,
        body: skill.body
      })
    }

    return new Response('{}', { status: 404 })
  }) as unknown as typeof fetch

  const server = createGreenhouseMcpServer(stubConfig, { fetch: laneFetch })

  const internals = server as unknown as {
    _registeredTools: Record<string, { handler: (args: unknown, extra: unknown) => Promise<unknown> }>
    _registeredResourceTemplates: Record<
      string,
      { readCallback: (uri: URL, variables: Record<string, string | string[]>, extra: unknown) => Promise<unknown> }
    >
  }

  it('la tool devuelve el manual como TEXTO y el cuerpo es byte-idéntico al catálogo', async () => {
    for (const skill of catalog.skills) {
      const result = (await internals._registeredTools.get_greenhouse_skill.handler({ name: skill.name }, {})) as {
        content: Array<{ type: string; text: string }>
        structuredContent: { ok: boolean; data: { body: string } }
        isError: boolean
      }

      expect(result.isError).toBe(false)
      expect(result.content[0].text).toBe(skill.body)
      expect(result.structuredContent.data.body).toBe(skill.body)
    }
  })

  it('el recurso skill:// devuelve el MISMO cuerpo que la tool', async () => {
    for (const skill of catalog.skills) {
      const result = (await internals._registeredResourceTemplates.greenhouse_skill.readCallback(
        new URL(skill.uri),
        { name: skill.name },
        {}
      )) as { contents: Array<{ uri: string; mimeType: string; text: string }> }

      expect(result.contents[0].uri).toBe(skill.uri)
      expect(result.contents[0].mimeType).toBe('text/markdown')
      expect(result.contents[0].text).toBe(skill.body)
    }
  })

  it('sin name la tool lista el catálogo nombrando cada manual, sin cuerpos', async () => {
    const result = (await internals._registeredTools.get_greenhouse_skill.handler({}, {})) as {
      content: Array<{ text: string }>
      structuredContent: { data: { skills: Array<Record<string, unknown>> } }
    }

    for (const skill of catalog.skills) {
      expect(result.content[0].text).toContain(skill.name)
      expect(result.content[0].text).not.toContain('# The competitor loop')
    }

    expect(result.structuredContent.data.skills.every(skill => !('body' in skill))).toBe(true)
  })

  it('un manual inexistente o no visible es un 404 honesto, no un cuerpo vacío', async () => {
    const result = (await internals._registeredTools.get_greenhouse_skill.handler({ name: 'no-such-manual' }, {})) as {
      isError: boolean
      structuredContent: { ok: boolean; status: number }
    }

    expect(result.isError).toBe(true)
    expect(result.structuredContent.status).toBe(404)
  })
})
