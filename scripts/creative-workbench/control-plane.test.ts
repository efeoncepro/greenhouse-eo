import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadControl, loadManifest, planFromSource, ROOT, TEMPLATE_REL } from './lib.mjs'
import { validarPieza } from './template/gates/piezas.mjs'

type Entry = { kind: string; content: Buffer }

describe('creative-workbench — plan de exportación', () => {
  let plan: Map<string, Entry>
  let report: { counts: Record<string, number>; externalPackages: string[] }

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

  it('el código de los CLIs llega con los scripts que lo invocan', () => {
    const pkg = JSON.parse(plan.get('package.json')!.content.toString())

    for (const script of ['ai:image', 'ai:fal', 'foto:prompt', 'foto:generar', 'doctor', 'instalar', 'gates'])
      expect(pkg.scripts[script]).toBeTruthy()
    expect(plan.has('scripts/ai/generate-image.ts')).toBe(true)
    expect(plan.has('scripts/lib/server-only-shim.cjs')).toBe(true)
    expect(report.externalPackages).toContain('@efeoncepro/axis-tokens')
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
