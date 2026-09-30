import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  isNative,
  loadControl,
  memberClients,
  loadManifest,
  planFromSource,
  reconcile,
  retiredCommandsIn,
  ROOT,
  sha256,
  TEMPLATE_REL,
  validateNativePatterns,
  verifySeal,
  withOverlay
} from './lib.mjs'
import { isNative as gateIsNative } from './template/gates/lib.mjs'
import { validarPieza } from './template/gates/piezas.mjs'

type Entry = { kind: string; content: Buffer }

describe('creative-workbench — plan de exportación', () => {
  let plan: Map<string, Entry>
  let report: {
    counts: Record<string, number>
    externalPackages: string[]
    requiredDependencies: Record<string, string>
    native: string[]
    nativeSkipped: string[]
    skillOverlays: Record<string, string[]>
  }

  beforeAll(async () => {
    // El sync real exporta un ref de git; aquí se valida la forma del plan sobre el working tree.
    ;({ plan, report } = (await planFromSource(ROOT, 'working-tree')) as unknown as {
      plan: typeof plan
      report: typeof report
    })
  }, 120_000)

  it('trae las cinco clases de archivo', () => {
    for (const kind of ['template', 'skill', 'code', 'doc', 'generated']) expect(report.counts[kind]).toBeGreaterThan(0)
  })

  it('espeja cada skill para Claude y Codex', () => {
    for (const skill of loadManifest().skills) {
      expect(
        plan.has(`.claude/skills/${skill}/SKILL.md`) ||
          [...plan.keys()].some(k => k.startsWith(`.claude/skills/${skill}/`))
      ).toBe(true)
      expect([...plan.keys()].some(k => k.startsWith(`.codex/skills/${skill}/`))).toBe(true)
    }
  })

  it('no exporta código ni docs de dominios internos', () => {
    const { code, docs } = loadManifest()
    const forbidden = [...code.forbiddenRoots, ...docs.forbiddenRoots]

    for (const rel of plan.keys()) {
      expect(forbidden.some((root: string) => rel === root || rel.startsWith(`${root}/`))).toBe(false)
    }
  })

  it('no exporta tests, .env ni la plantilla de package.json', () => {
    for (const rel of plan.keys()) {
      expect(rel).not.toMatch(/\.(test|spec)\.(m?[jt]s|tsx)$/)
      expect(path.basename(rel)).not.toMatch(/^\.env(?!\.example$)/)
      expect(rel).not.toBe('package.base.json')
      expect(rel.startsWith(TEMPLATE_REL)).toBe(false)
    }
  })

  it('el código de los CLIs sigue viajando y declara las dependencias que necesita', () => {
    expect(plan.has('scripts/ai/generate-image.ts')).toBe(true)
    expect(plan.has('scripts/lib/server-only-shim.cjs')).toBe(true)
    expect(report.externalPackages).toContain('@efeoncepro/axis-tokens')
    expect(report.requiredDependencies['@efeoncepro/axis-tokens']).toBeTruthy()
  })

  it('no entrega rutas nativas aunque la plantilla las tenga, y sí los gates', () => {
    const { native } = loadManifest()

    expect(report.native).toEqual(native.paths)

    for (const rel of plan.keys()) expect(isNative(rel, native.paths)).toBe(false)

    for (const rel of ['package.json', 'AGENTS.md', '.claude/hooks/guard.mjs']) {
      expect(plan.has(rel)).toBe(false)
      expect(report.nativeSkipped).toContain(rel)
    }

    for (const rel of ['gates/managed-drift.mjs', 'gates/lib.mjs', '.github/workflows/gates.yml'])
      expect(plan.has(rel)).toBe(true)
  })

  it('la configuración generada sale de control.json y nunca lleva una llave cruda', () => {
    const { gcp } = loadControl()
    const env = plan.get('.env.example')!.content.toString()

    expect(env).toContain(`GCP_PROJECT=${gcp.project}`)
    for (const line of env.split('\n').filter(l => l.includes('_SECRET_REF=')))
      expect(line).toMatch(/_SECRET_REF=projects\/[^/]+\/secrets\/[^/]+\/versions\/latest$/)
    expect(env).not.toMatch(/sk-|AIza/)
  })
})

describe('creative-workbench — nota de workbench en las skills', () => {
  it('se inserta después del frontmatter del SKILL.md de las skills que usan comandos retirados', () => {
    let plan: Map<string, Entry>
    let report: { skillOverlays: Record<string, string[]> }

    return planFromSource(ROOT, 'working-tree').then(result => {
      ;({ plan, report } = result as unknown as {
        plan: Map<string, Entry>
        report: { skillOverlays: Record<string, string[]> }
      })

      expect(report.skillOverlays['greenhouse-ai-image-generator']).toEqual(
        expect.arrayContaining(['ai:image', 'foto:*'])
      )

      for (const mirror of ['.claude', '.codex']) {
        const text = plan.get(`${mirror}/skills/design-studio/SKILL.md`)!.content.toString()

        expect(text.startsWith('---\n')).toBe(true)
        expect(text).toContain('> **En el Creative Workbench, lee esto primero.**')
        expect(text.indexOf('En el Creative Workbench')).toBeGreaterThan(text.indexOf('\n---\n', 3))
        expect(text).toContain('`pnpm ai:image`')
      }

      expect(report.skillOverlays.copywriting).toBeUndefined()
      expect(plan.get('.claude/skills/copywriting/SKILL.md')!.content.toString()).not.toContain(
        'En el Creative Workbench'
      )
    })
  }, 120_000)

  it('normaliza los comandos y funciona sin frontmatter', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wb-overlay-'))

    writeFileSync(
      path.join(dir, 'a.md'),
      'Corre `pnpm foto:*`, luego pnpm ai:image, y pnpm run assets:pull. No pnpm build.'
    )
    writeFileSync(path.join(dir, 'b.ts'), 'pnpm ai:fal')
    expect(retiredCommandsIn(['a.md', 'b.ts'], dir, { retiredPrefixes: ['foto:', 'ai:', 'assets:pull'] })).toEqual([
      'ai:image',
      'assets:pull',
      'foto:*'
    ])
    rmSync(dir, { recursive: true, force: true })

    expect(withOverlay('# Skill', 'Nota: {{comandos}}', ['ai:image']).toString()).toBe(
      'Nota: `pnpm ai:image`\n\n# Skill'
    )
  })
})

describe('creative-workbench — rutas nativas', () => {
  const reserved = ['gates/**', '.github/workflows/gates.yml', '.workbench/**']

  it('acepta rutas exactas y carpetas completas', () => {
    expect(() => validateNativePatterns(['AGENTS.md', 'brands/**', 'tools/doctor.mjs'], reserved)).not.toThrow()
  })

  it('rechaza globs, rutas que escapan, el sello y lo reservado', () => {
    for (const bad of [
      './AGENTS.md',
      'brands/',
      'a/./b',
      'a//b',
      'a\\b',
      'tools/*.mjs',
      '../x',
      '/abs',
      '.workbench/sync.lock.json',
      'gates/**',
      'gates/lib.mjs',
      '.github/**'
    ])
      expect(() => validateNativePatterns([bad], reserved), bad).toThrow()
  })

  it('package.json y pnpm-lock.yaml son nativos juntos o ninguno', () => {
    expect(() => validateNativePatterns(['package.json'], reserved)).toThrow(/los dos o ninguno/)
    expect(() => validateNativePatterns(['package.json', 'pnpm-lock.yaml'], reserved)).not.toThrow()
  })

  it('el matcher de los gates y el del plano de control son el mismo', () => {
    const patterns = ['AGENTS.md', 'brands/**']

    for (const rel of ['AGENTS.md', 'AGENTS.md.bak', 'brands/sky/pack.json', 'brandsx/a', 'x/AGENTS.md'])
      expect(gateIsNative(rel, patterns)).toBe(isNative(rel, patterns))
  })

  it('el manifest vigente no declara nativo nada reservado', () => {
    const { native } = loadManifest()

    expect(() => validateNativePatterns(native.paths, native.reserved)).not.toThrow()
    expect(native.reserved).toEqual(expect.arrayContaining(['gates/**', '.workbench/**']))
  })
})

describe('creative-workbench — reconciliación del sync', () => {
  const entry = (text: string) => ({ kind: 'template', content: Buffer.from(text) })
  const hash = (text: string) => sha256(Buffer.from(text))

  it('suelta sin borrar lo que pasó a nativo y borra lo que dejó de exportarse', () => {
    const plan = new Map([['gates/lib.mjs', entry('v2')]])

    const previous = {
      files: {
        'gates/lib.mjs': hash('v1'),
        'AGENTS.md': hash('a'),
        'tools/viejo.mjs': hash('x'),
        'pnpm-lock.yaml': 'h'
      }
    }

    const out = reconcile({
      plan,
      previous,
      native: ['AGENTS.md', 'pnpm-lock.yaml'],
      targetHash: (rel: string) => ({ 'gates/lib.mjs': hash('v1') })[rel] ?? null
    })

    expect(out.changed).toEqual(['gates/lib.mjs'])
    expect(out.removed).toEqual(['tools/viejo.mjs'])
    expect(out.handedOff).toEqual(['AGENTS.md', 'pnpm-lock.yaml'])
    expect(out.collisions).toEqual([])
  })

  it('no pisa un archivo que existe y el sello no gestionaba', () => {
    const plan = new Map([['tools/marca.mjs', entry('del plan')]])

    const out = reconcile({
      plan,
      previous: { files: {} },
      native: [],
      targetHash: () => hash('del workbench')
    })

    expect(out.collisions).toEqual(['tools/marca.mjs'])
    expect(out.changed).toEqual([])
  })

  it('en el bootstrap (sin sello) todo lo del plan es suyo', () => {
    const out = reconcile({
      plan: new Map([['README.md', entry('nuevo')]]),
      previous: null,
      targetHash: () => hash('viejo')
    })

    expect(out.changed).toEqual(['README.md'])
    expect(out.collisions).toEqual([])
  })
})

describe('creative-workbench — integridad del sello', () => {
  const plan = new Map([['gates/lib.mjs', { kind: 'template', content: Buffer.from('g') }]])
  const expected = { plan, report: { native: ['AGENTS.md'] } }

  const good = {
    source: { commit: 'a'.repeat(40) },
    native: ['AGENTS.md'],
    files: { 'gates/lib.mjs': sha256(Buffer.from('g')), 'pnpm-lock.yaml': 'x' }
  }

  it('acepta el sello que el sync habría escrito', () => expect(verifySeal(good, expected)).toEqual([]))

  it('detecta una ruta eximida a mano, una huella reescrita y un archivo soltado del sello', () => {
    expect(verifySeal({ ...good, native: ['AGENTS.md', 'gates/**'] }, expected).join(' ')).toMatch(/native sellado/)
    expect(verifySeal({ ...good, files: { ...good.files, 'gates/lib.mjs': 'otra' } }, expected).join(' ')).toMatch(
      /huella/
    )
    expect(verifySeal({ ...good, files: { 'pnpm-lock.yaml': 'x' } }, expected).join(' ')).toMatch(/sello no lo tiene/)
  })

  it('un sello sin commit de origen no es íntegro', () => {
    expect(verifySeal({ ...good, source: {} }, expected)).toEqual([
      'el sello no declara su commit de origen: no se puede verificar'
    ])
  })

  it('workbench.config.json se compara exacto: ahí viven proyecto y buckets', () => {
    const withConfig = {
      plan: new Map([...plan, ['workbench.config.json', { kind: 'generated', content: Buffer.from('{"p":"a"}') }]]),
      report: expected.report
    }

    const lock = { ...good, files: { ...good.files, 'workbench.config.json': sha256(Buffer.from('{"p":"otro"}')) } }

    expect(verifySeal(lock, withConfig).join(' ')).toMatch(/workbench.config.json: la huella/)
  })

  it('el reporte de exportación sólo tiene que existir: depende de la versión del generador', () => {
    const withReport = {
      plan: new Map([...plan, ['.workbench/export-report.json', { kind: 'generated', content: Buffer.from('nuevo') }]]),
      report: expected.report
    }

    const lock = { ...good, files: { ...good.files, '.workbench/export-report.json': sha256(Buffer.from('viejo')) } }

    expect(verifySeal(lock, withReport)).toEqual([])
  })
})

describe('creative-workbench — control.json', () => {
  it('cada miembro declara GitHub, identidad Google y clientes válidos', () => {
    const control = loadControl()

    for (const m of control.members) {
      expect(m.github).toMatch(/^[A-Za-z0-9-]+$/)
      expect(m.gcp).toBeTruthy()
      for (const c of memberClients(m, control)) expect(control.clientes).toContain(c)
    }
  })

  it('"todos" da acceso a todos los clientes, y un miembro puede restringirse', () => {
    const control = { clientes: ['efeonce', 'berel', 'sky'], clientesPorDefecto: 'todos' }

    expect(memberClients({}, control)).toEqual(['efeonce', 'berel', 'sky'])
    expect(memberClients({ clientes: ['sky'] }, control)).toEqual(['sky'])
    expect(memberClients({}, { clientes: ['sky'] })).toEqual([])
    expect(loadControl().clientesPorDefecto).toBe('todos')
  })
})

describe('creative-workbench — gate de piezas', () => {
  const ctx = { cliente: 'berel', slug: 'banner-otono', clientes: ['efeonce', 'berel', 'sky'], workBucket: 'wb' }

  const base = {
    cliente: 'berel',
    slug: 'banner-otono',
    titulo: 't',
    formato: 'banner',
    responsable: 'Ana',
    estado: 'brief',
    entregables: []
  }

  const entregable = { ruta: 'gs://wb/berel/banner-otono/abc/x.png', sha256: 'a'.repeat(64) }

  it('acepta una pieza en brief', () => expect(validarPieza(base, ctx)).toEqual([]))

  it('exige aprobación con fecha, entregables y otra persona para aprobar', () => {
    expect(validarPieza({ ...base, estado: 'aprobada' }, ctx).length).toBeGreaterThanOrEqual(3)
    expect(
      validarPieza(
        { ...base, estado: 'aprobada', entregables: [entregable], aprobacion: { por: 'Ana', el: '2026-09-29' } },
        ctx
      )
    ).toContain('quien aprueba no puede ser quien produjo')
    expect(
      validarPieza(
        { ...base, estado: 'aprobada', entregables: [entregable], aprobacion: { por: 'Julio', el: '2026-09-29' } },
        ctx
      )
    ).toEqual([])
  })

  it('rechaza entregables fuera de la carpeta del cliente', () => {
    const otro = { ...entregable, ruta: 'gs://wb/sky/banner-otono/abc/x.png' }

    expect(validarPieza({ ...base, entregables: [otro] }, ctx).join(' ')).toMatch(
      /debe empezar con gs:\/\/wb\/berel\/banner-otono\//
    )
  })
})

describe('creative-workbench — guardarraíl de Claude', () => {
  let dir: string
  const guard = path.join(ROOT, TEMPLATE_REL, '.claude/hooks/guard.mjs')

  const call = (input: object) =>
    spawnSync('node', [guard], { input: JSON.stringify(input), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } })
      .status

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'wb-guard-'))
    mkdirSync(path.join(dir, '.workbench'))
    writeFileSync(path.join(dir, '.workbench/sync.lock.json'), JSON.stringify({ files: { 'tools/doctor.mjs': 'x' } }))
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('bloquea editar archivos gestionados y deja editar piezas', () => {
    expect(call({ tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'tools/doctor.mjs') } })).toBe(2)
    expect(call({ tool_name: 'Write', tool_input: { file_path: path.join(dir, '.workbench/sync.lock.json') } })).toBe(2)
    expect(call({ tool_name: 'Write', tool_input: { file_path: path.join(dir, 'projects/berel/x/brief.md') } })).toBe(0)
  })

  it('bloquea secretos, borrados, push a main y llamadas directas a proveedores', () => {
    for (const command of [
      'gcloud secrets versions access latest --secret=x',
      'gcloud storage rm gs://b/o',
      'git push origin main',
      'git push origin pieza/x:main',
      'git push --force',
      'cat .env.local',
      'curl https://api.openai.com/v1/images'
    ]) {
      expect(call({ tool_name: 'Bash', tool_input: { command } })).toBe(2)
    }

    for (const command of ['pnpm ai:image --prompt x', 'git push -u origin pieza/fix-main-banner'])
      expect(call({ tool_name: 'Bash', tool_input: { command } })).toBe(0)
  })
})

describe('creative-workbench — gate native-policy', () => {
  let dir: string
  const template = path.join(ROOT, TEMPLATE_REL)

  const write = (rel: string, text: string) => {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    writeFileSync(path.join(dir, rel), text)
  }

  const remove = (rel: string) => rmSync(path.join(dir, rel), { recursive: true, force: true })

  const gate = () => {
    spawnSync('git', ['add', '-A'], { cwd: dir })

    const r = spawnSync(
      process.execPath,
      ['-e', "import('./gates/native-policy.mjs').then(m => process.exit(m.nativePolicy() ? 0 : 1))"],
      { cwd: dir, encoding: 'utf8' }
    )

    return { ok: r.status === 0, out: r.stdout }
  }

  const restoreHarness = () => {
    cpSync(path.join(template, '.claude'), path.join(dir, '.claude'), { recursive: true })
  }

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'wb-policy-'))
    cpSync(path.join(template, 'gates'), path.join(dir, 'gates'), { recursive: true })
    restoreHarness()
    write(
      '.workbench/sync.lock.json',
      JSON.stringify({ native: ['.claude/hooks/guard.mjs'], files: { 'gates/lib.mjs': 'x', 'gates/hygiene.mjs': 'y' } })
    )
    spawnSync('git', ['init', '-q'], { cwd: dir })
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('el guardarraíl y los settings de la plantilla cumplen la política', () => {
    expect(gate()).toMatchObject({ ok: true })
  })

  it('admite el broker y los tests en test/, y rechaza hosts, SDKs, llaves e imports que llegan al proveedor', () => {
    write('services/production-broker/openai.mjs', "import OpenAI from 'openai'\nfetch('https://api.openai.com/v1')")
    write('services/production-broker/request.mjs', 'export const validate = x => x')
    write('tools/client.mjs', "import { validate } from '../services/production-broker/request.mjs'")
    write('test/broker.test.mjs', "assert(url !== 'https://api.openai.com')")
    expect(gate().ok).toBe(true)

    write('src/lib/ai/openai-image.ts', "export const gen = () => fetch('https://api.openai.com/v1/images')")
    write('tools/provider-doctor.ts', "fetch('https://api.openai.com/v1/models')")
    write('tools/gen.mjs', "import { GoogleGenAI } from '@google/genai'")
    write('tools/bare.mjs', "import 'openai'")
    write('tools/via-broker.mjs', "import { run } from '../services/production-broker/openai.mjs'")
    write('tools/via-engine.mjs', "const m = await import('../src/lib/ai/openai-image')")
    write('tools/env-key.mjs', 'const key = process.env.OPENAI_API_KEY')
    write('tools/secret.sh', 'gcloud secrets versions access latest --secret=workbench-openai-api-key')
    write('tools/rest.mjs', "fetch('https://secretmanager.googleapis.com/v1/projects/x/secrets/y')")
    write('tools/tests/sneaky.test.mjs', "fetch('https://api.anthropic.com/v1')")
    write(
      'package.json',
      JSON.stringify({ dependencies: { openai: '5.0.0', '@google-cloud/secret-manager': '6.0.0' } })
    )
    const result = gate()

    expect(result.ok).toBe(false)

    for (const expected of [
      'tools/provider-doctor.ts: api.openai.com',
      'tools/gen.mjs: @google/genai',
      'tools/bare.mjs: openai',
      'tools/via-broker.mjs: importa services/production-broker/openai.mjs',
      'tools/via-engine.mjs: importa src/lib/ai/openai-image.ts',
      'tools/env-key.mjs: OPENAI_API_KEY',
      'tools/secret.sh: gcloud secrets',
      'tools/rest.mjs: secretmanager.googleapis.com',
      'tools/tests/sneaky.test.mjs: api.anthropic.com',
      'package.json: declara openai'
    ])
      expect(result.out).toContain(expected)

    // Los engines gestionados necesitan el SDK de Secret Manager: declararlo no es una falta.
    expect(result.out).not.toContain('declara @google-cloud/secret-manager')
    expect(result.out).not.toContain('tools/client.mjs')
    remove('tools')
    remove('src')
    remove('package.json')
  })

  it('rechaza un guardarraíl que deja pasar todo, settings sin denegaciones y hooks apagados', () => {
    write('.claude/hooks/guard.mjs', 'process.exit(0)\n')
    write(
      '.claude/settings.json',
      JSON.stringify({
        disableAllHooks: true,
        permissions: { deny: [] },
        hooks: {
          PreToolUse: [
            { matcher: 'Bashx|Editx|Writex', hooks: [{ type: 'command', command: 'true # .claude/hooks/guard.mjs' }] }
          ]
        }
      })
    )
    const result = gate()

    expect(result.ok).toBe(false)
    expect(result.out).toContain('guard: debe bloquear `gcloud secrets')
    expect(result.out).toContain('guard: debe impedir editar .workbench/sync.lock.json')
    expect(result.out).toContain('disableAllHooks apaga el guardarraíl')
    expect(result.out).toContain('falta "Read(./.env.local)"')
    expect(result.out).toContain('el hook PreToolUse debe correr el guardarraíl')
    restoreHarness()
  })

  it('el guardarraíl corre en una copia: no puede tocar lo que revisan los demás gates', () => {
    write('tools/leak.mjs', "fetch('https://api.openai.com/v1')")
    write(
      '.claude/hooks/guard.mjs',
      "import { rmSync } from 'node:fs'\nrmSync(process.env.CLAUDE_PROJECT_DIR + '/tools/leak.mjs', { force: true })\nprocess.exit(2)\n"
    )
    const result = gate()

    expect(result.out).toContain('tools/leak.mjs: api.openai.com')
    expect(existsSync(path.join(dir, 'tools/leak.mjs'))).toBe(true)
    remove('tools')
    restoreHarness()
  })
})

describe('creative-workbench — managed-drift compara el sello del PR con el de la base', () => {
  let dir: string
  const template = path.join(ROOT, TEMPLATE_REL)
  const git = (...args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' })

  const drift = (headRef: string) =>
    spawnSync(
      process.execPath,
      ['-e', "import('./gates/managed-drift.mjs').then(m => process.exit(m.managedDrift() ? 0 : 1))"],
      { cwd: dir, encoding: 'utf8', env: { ...process.env, GITHUB_BASE_REF: 'main', GITHUB_HEAD_REF: headRef } }
    )

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'wb-drift-'))
    cpSync(path.join(template, 'gates'), path.join(dir, 'gates'), { recursive: true })
    mkdirSync(path.join(dir, '.workbench'))
    writeFileSync(path.join(dir, '.workbench/sync.lock.json'), JSON.stringify({ native: [], files: {} }))
    git('init', '-q')
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qam', 'x', '--allow-empty')
    git('add', '-A')
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base')
    git('update-ref', 'refs/remotes/origin/main', 'HEAD')
    writeFileSync(path.join(dir, '.workbench/sync.lock.json'), JSON.stringify({ native: ['gates/**'], files: {} }))
  })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('un PR que no es de sync no puede cambiar el sello', () => {
    const r = drift('codex/feature')

    expect(r.status).toBe(1)
    expect(r.stdout).toContain('este PR cambia el sello y no es un sync de greenhouse-eo')
  })

  it('un PR de sync sí (su autenticidad la verifica creative:status)', () => {
    expect(drift('sync/2026-09-30-abc').status).toBe(0)
  })
})
