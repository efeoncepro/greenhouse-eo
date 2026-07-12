/**
 * artifact-worker — SELFTEST de la imagen (TASK-1391, robustez sistémica).
 *
 * Cierra la clase de fragilidad "la imagen diverge de lo que el runtime necesita y nos enteramos
 * en Cloud Run": este selftest corre DENTRO del pipeline de build (paso de Cloud Build post-build)
 * y ejercita, sin DB y sin flag, exactamente las capas que ya fallaron una vez en runtime:
 *
 *   1. El shim + tsx + aliases `@/` resuelven (si llegamos a correr, resolvieron).
 *   2. El catálogo está COMPLETO en la imagen: registry + los 25 contratos + plantillas legibles.
 *   3. El brand pack es ÍNTEGRO: cada TTF existe y su sha256 coincide con el seal declarado.
 *   4. Chromium arranca con el launch canónico (--no-sandbox incluido: como root en contenedor,
 *      sin él ni abre) y una lámina probe llena + screenshotea de verdad (fuentes cargadas
 *      fail-closed incluido — es el mismo camino del gate visual).
 *
 * Un fallo acá ABORTA EL DEPLOY. Nunca más un ENOENT descubierto por una ejecución productiva.
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  fillSlide,
  launchComposerBrowser,
  loadRegistry,
  loadTemplateContract,
  synthesizeProbeSlots
} from '@/lib/artifact-composer'
import { resolveBrandSeal } from '@/lib/artifact-composer/catalog'
import { deckAxisCatalog, deckAxisCatalogDir } from '@/lib/artifact-composer/catalogs/deck-axis'

const fail = (step: string, detail: string): never => {
  console.error(`[selftest] ✗ ${step}: ${detail}`)
  process.exit(1)
}

const ok = (step: string, detail = '') => console.log(`[selftest] ✓ ${step}${detail ? ` — ${detail}` : ''}`)

export const runSelftest = async (): Promise<void> => {
  // 1+2 · Catálogo completo: registry + TODOS los contratos + plantillas legibles.
  const assets = { templatesDir: deckAxisCatalog.templatesDir }
  const registry = await loadRegistry(assets).catch(e => fail('registry', String(e)))

  const templates = (registry as unknown as { templates: Array<{ name: string; prototype: string }> }).templates

  for (const entry of templates) {
    await loadTemplateContract(assets, registry, entry.name as never).catch(e =>
      fail(`contrato ${entry.name}`, String(e))
    )
    await fs.access(path.join(deckAxisCatalogDir, entry.prototype)).catch(() =>
      fail(`plantilla ${entry.name}`, `${entry.prototype} no está en la imagen`)
    )
  }

  ok('catálogo completo', `${templates.length} plantillas + contratos`)

  // 3 · Integridad del font pack: cada TTF existe y su sha256 coincide con el declarado.
  //     El SoT del NOMBRE DE ARCHIVO es fonts.json del pack (campo `file`) — nunca derivarlo.
  const seal = await resolveBrandSeal(deckAxisCatalog).catch(e => fail('brand seal', String(e)))
  const packDir = path.resolve(deckAxisCatalogDir, '../../brand-packs/axis')

  const fontsManifest = JSON.parse(await fs.readFile(path.join(packDir, 'fonts.json'), 'utf8')) as {
    fonts: Array<{ family: string; weight: number; style: string; file: string; sha256: string }>
  }

  if ((seal.fonts?.length ?? 0) !== fontsManifest.fonts.length) {
    fail('font seal', `el seal declara ${seal.fonts?.length ?? 0} fuentes y fonts.json ${fontsManifest.fonts.length}`)
  }

  for (const font of fontsManifest.fonts) {
    // Las fuentes viven duplicadas pack+catálogo (sync por composer:brand-pack); el render las
    // carga del CATÁLOGO — se verifica esa copia, que es la que Chromium usa.
    const fontPath = path.join(deckAxisCatalogDir, 'fonts', path.basename(font.file))

    const bytes = await fs
      .readFile(fontPath)
      .catch(() => fail(`fuente ${font.family} ${font.weight} ${font.style}`, `${fontPath} no está en la imagen`))

    const digest = crypto.createHash('sha256').update(bytes as Buffer).digest('hex')

    if (digest !== font.sha256) {
      fail(
        `fuente ${font.family} ${font.weight} ${font.style}`,
        `checksum ${digest.slice(0, 12)}… ≠ declarado ${font.sha256.slice(0, 12)}…`
      )
    }
  }

  ok('font pack íntegro', `${fontsManifest.fonts.length} fuentes verificadas por checksum (catálogo)`)

  // 4 · Chromium + render real de una lámina probe (mismo camino que el gate visual: fillSlide
  //     + screenshot, sin assert de fit — el probe no es contenido real).
  const probeEntry = templates[0]!
  const contract = await loadTemplateContract(assets, registry, probeEntry.name as never)
  const browser = await launchComposerBrowser().catch(e => fail('chromium launch', String(e)))

  try {
    const page = await browser.newPage({ viewport: contract.viewport, deviceScaleFactor: 1 })

    await fillSlide(
      page,
      path.join(deckAxisCatalogDir, probeEntry.prototype),
      {
        slideId: 'selftest-probe',
        contentType: (registry as unknown as { templates: Array<{ name: string; contentType: string }> }).templates.find(t => t.name === probeEntry.name)?.contentType ?? 'cover',
        template: probeEntry.name as never,
        slots: synthesizeProbeSlots(contract) as never
      },
      contract,
      { resolvers: deckAxisCatalog.resolvers, layoutHooks: deckAxisCatalog.layoutHooks }
    ).catch(e => fail('fillSlide probe', String(e)))

    const shot = await page.screenshot()

    if (shot.byteLength < 10_000) {
      fail('screenshot probe', `PNG sospechosamente vacío (${shot.byteLength} bytes)`)
    }

    ok('render probe', `${probeEntry.name} → PNG ${Math.round(shot.byteLength / 1024)} KB (fuentes fail-closed OK)`)
  } finally {
    await browser.close()
  }

  console.log('[selftest] ✓✓ imagen apta: catálogo + fuentes + Chromium + render verificados')
}
