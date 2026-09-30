import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  isNative,
  loadControl,
  loadManifest,
  planFromSource,
  reconcile,
  ROOT,
  sha256,
  TEMPLATE_REL,
  validateNativePatterns,
  verifySeal
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
  }

  beforeAll(async () => {
    // El sync real exporta un ref de git; aquí se valida la forma del plan sobre el working tree.
    ;({ plan, report } = await planFromSource(ROOT, 'working-tree'))
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

describe('creative-workbench — rutas nativas', () => {
  const reserved = ['gates/**', '.github/workflows/gates.yml', '.workbench/**']

  it('acepta rutas exactas y carpetas completas', () => {
    expect(() => validateNativePatterns(['AGENTS.md', 'brands/**', 'tools/doctor.mjs'], reserved)).not.toThrow()
  })

  it('rechaza globs, rutas que escapan, el sello y lo reservado', () => {
    for (const bad of ['tools/*.mjs', '../x', '/abs', '.workbench/sync.lock.json', 'gates/**', 'gates/lib.mjs', '.github/**'])
      expect(() => validateNativePatterns([bad], reserved), bad).toThrow()
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
      files: { 'gates/lib.mjs': hash('v1'), 'AGENTS.md': hash('a'), 'tools/viejo.mjs': hash('x'), 'pnpm-lock.yaml': 'h' }
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
  const good = { native: ['AGENTS.md'], files: { 'gates/lib.mjs': sha256(Buffer.from('g')), 'pnpm-lock.yaml': 'x' } }

  it('acepta el sello que el sync habría escrito', () => expect(verifySeal(good, expected)).toEqual([]))

  it('detecta una ruta eximida a mano, una huella reescrita y un archivo soltado del sello', () => {
    expect(verifySeal({ ...good, native: ['AGENTS.md', 'gates/**'] }, expected).join(' ')).toMatch(/native sellado/)
    expect(verifySeal({ ...good, files: { ...good.files, 'gates/lib.mjs': 'otra' } }, expected).join(' ')).toMatch(
      /huella/
    )
    expect(verifySeal({ ...good, files: { 'pnpm-lock.yaml': 'x' } }, expected).join(' ')).toMatch(/sello no lo tiene/)
  })
})

describe('creative-workbench — control.json', () => {
  it('cada miembro declara GitHub, identidad Google y clientes válidos', () => {
    const control = loadControl()

    for (const m of control.members) {
      expect(m.github).toMatch(/^[A-Za-z0-9-]+$/)
      expect(m.gcp).toBeTruthy()
      for (const c of m.clientes ?? []) expect(control.clientes).toContain(c)
    }
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
