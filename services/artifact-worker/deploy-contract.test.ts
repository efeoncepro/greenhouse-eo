import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1391 — Contrato de deploy del artifact-worker (patrón ops-worker/deploy-contract).
 *
 * Cada assert acá es un bug REAL que ya ocurrió o una puerta de un solo sentido:
 * el objetivo es que la clase entera muera en CI, no en Cloud Run.
 */

const read = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8')
const dockerfile = read('Dockerfile')
const deploySh = read('deploy.sh')

const workflow = fs.readFileSync(
  path.join(__dirname, '../../.github/workflows/artifact-worker-deploy.yml'),
  'utf8'
)

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as {
  devDependencies: Record<string, string>
}

describe('artifact-worker · imagen', () => {
  it('la base Playwright está PINNEADA a la versión de @playwright/test del repo (otro Chromium = otro píxel)', () => {
    const declared = pkg.devDependencies['@playwright/test']!.replace(/^[\^~]/, '')
    const m = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)/.exec(dockerfile)

    expect(m, 'la base debe ser mcr.microsoft.com/playwright:vX.Y.Z (nunca un tag flotante)').toBeTruthy()
    expect(m![1]).toBe(declared)
  })

  it('copia scripts/lib COMPLETO (el shim requiere a sus vecinos — ENOENT del primer smoke)', () => {
    expect(dockerfile).toMatch(/COPY scripts\/lib\/ \.\/scripts\/lib\//)
    expect(dockerfile).not.toMatch(/COPY scripts\/lib\/server-only-shim\.cjs/)
  })

  it('el ENTRYPOINT corre main.ts vía tsx + shim (árbol fuente, sin bundle)', () => {
    expect(dockerfile).toContain('"npx", "tsx", "--require", "./scripts/lib/server-only-shim.cjs"')
    expect(dockerfile).toContain('services/artifact-worker/main.ts')
  })
})

describe('artifact-worker · deploy.sh (SoT de env vars del Job)', () => {
  it('una ejecución = un artefacto, y el retry es del DOMINIO (no de Cloud Run)', () => {
    expect(deploySh).toContain('--tasks=1')
    expect(deploySh).toContain('--parallelism=1')
    expect(deploySh).toMatch(/MAX_RETRIES="\$\{MAX_RETRIES:-0\}"/)
  })

  it('el flag ARTIFACT_RENDER_JOBS_ENABLED está DECLARADO (--set-env-vars es destructivo)', () => {
    expect(deploySh).toMatch(/ENV_VARS="\$\{ENV_VARS\},ARTIFACT_RENDER_JOBS_ENABLED=/)
  })

  it('el flag INSIGHTS_RENDER_ENABLED está DECLARADO con default ON en el Job único (TASK-1846)', () => {
    // Misma bug class que GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED (revisión 00473): un flag aplicado
    // sólo con --update-env-vars desaparece en el próximo deploy destructivo, sin ruido. Y el default
    // es ON porque el Job es único: con OFF, el primer deploy de release apagaría el reclamo en staging.
    expect(deploySh).toMatch(/ENV_VARS="\$\{ENV_VARS\},INSIGHTS_RENDER_ENABLED=/)
    expect(deploySh).toMatch(/INSIGHTS_RENDER_ENABLED:-true/)
  })

  it('el bucket de assets NO depende del carril: el Job es único y no puede darse vuelta por deploy (TASK-1846)', () => {
    expect(deploySh).toMatch(/^STORAGE_ENV="staging"$/m)
    expect(deploySh).not.toMatch(/if \[\[ "\$\{ENV\}" == "production" \]\]; then\s+STORAGE_ENV=/)
  })

  it('etiqueta el Job con EXPECTED_SHA y aborta si el árbol no es ese SHA (TASK-1846)', () => {
    expect(deploySh).toContain('GIT_SHA="${EXPECTED_SHA:-${HEAD_SHA}}"')
    expect(deploySh).toMatch(/if \[\[ "\$\{GIT_SHA\}" != "\$\{HEAD_SHA\}" \]\]; then[\s\S]*?exit 1/)
  })

  it('el SELFTEST de imagen corre en Cloud Build ANTES del deploy (la imagen se prueba a sí misma)', () => {
    expect(deploySh).toContain("args: ['run', '--rm', '${IMAGE}', '--selftest']")
  })

  it('verificación fail-loud de SHA post-deploy', () => {
    expect(deploySh).toContain('DEPLOYED_SHA')
    expect(deploySh).toMatch(/exit 1/)
  })
})

describe('artifact-worker · workflow (anti-stale)', () => {
  it('los paths cubren la superficie del worker (la cobertura exacta la exige worker:deploy-path-gate)', () => {
    for (const p of ['services/artifact-worker/**', 'services/_shared/**', 'scripts/lib/**', 'src/lib/**']) {
      expect(workflow, `falta el path ${p}`).toContain(`'${p}'`)
    }
  })

  it('producción sólo entra por workflow_call del orquestador, con SHA esperado (TASK-1846)', () => {
    expect(workflow).toMatch(/^\s{2}workflow_call:\n\s{4}inputs:\n\s{6}environment:/m)
    expect(workflow).toContain('expected_sha:')
    // Sin trigger de push a main: los workers nunca despliegan producción por push.
    expect(workflow).not.toMatch(/branches:\s*\n\s*-\s*main/)
    // Ningún flag por ambiente en el workflow: el SoT es deploy.sh (el Job es único).
    expect(workflow).not.toMatch(/INSIGHTS_RENDER_ENABLED:\s*'/)
  })
})

describe('composer · launch canónico apto para contenedor', () => {
  it('launchComposerBrowser incluye --no-sandbox (como root en contenedor Chromium no arranca sin él)', () => {
    const render = fs.readFileSync(
      path.join(__dirname, '../../src/lib/artifact-composer/render.ts'),
      'utf8'
    )

    expect(render).toContain("'--no-sandbox'")
  })
})
