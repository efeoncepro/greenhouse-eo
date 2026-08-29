/**
 * TASK-1785 — El guard que le da mecanismo al riesgo `high` de la task.
 *
 * `tsc` ya impide que un reader devuelva un DTO sin `provenance`. Lo que `tsc` NO ve es una
 * SUPERFICIE nueva: una ruta agregada al lane ecosystem o una tool registrada en el MCP cuyo
 * contrato nunca declaró de qué naturaleza es lo que devuelve. Este test recorre el
 * FILESYSTEM y `server.ts` —no una lista escrita a mano— y exige que cada superficie viva
 * esté censada en `SEO_LENS_SURFACES`.
 *
 * ⚠️ Se mide cuando el test CORRE, no cuando alguien escribió el manifiesto. En un checkout
 * compartido una medición envejece en minutos; un guard que se mide a sí mismo al ejecutarse
 * no tiene esa ventana.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SEO_LENS_SURFACES } from '../lens-surface-manifest'

const ECOSYSTEM_SEO_DIR = join(process.cwd(), 'src/app/api/platform/ecosystem/growth/seo')
const MCP_SERVER = join(process.cwd(), 'src/mcp/greenhouse/server.ts')

/** Rutas reales bajo el lane, incluidas las anidadas (`keywords/track`). */
const collectRoutes = (dir: string, prefix = ''): string[] =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)

    if (!statSync(full).isDirectory()) return []

    const segment = prefix ? `${prefix}/${entry}` : entry
    const nested = collectRoutes(full, segment)

    // Un directorio puede tener su propio route.ts Y subdirectorios (p.ej. `keywords`).
    return readdirSync(full).includes('route.ts') ? [segment, ...nested] : nested
  })

const collectTools = (): string[] => {
  const source = readFileSync(MCP_SERVER, 'utf8')

  // ⚠️ DOS formas de que este patrón mienta, y las dos ya ocurrieron:
  //   - un prefijo `get_|run_|track_` se come `declare_seo_competitors` y `retire_…`;
  //   - una clase sin DÍGITOS se come `get_seo_visibility_360`, en silencio y sin fallar.
  // Se ancla en el dominio (`seo`) y admite dígitos. Hay regresión para las dos abajo.
  return [...source.matchAll(/registerTool\(\s*'([a-z0-9_]*seo[a-z0-9_]*)'/g)].map(match => match[1])
}

describe('censo de superficies SEO (TASK-1785)', () => {
  it('toda ruta viva del lane ecosystem está censada', () => {
    const routes = collectRoutes(ECOSYSTEM_SEO_DIR).sort()
    const censused = new Set(SEO_LENS_SURFACES.map(surface => surface.route).filter(Boolean))
    const missing = routes.filter(route => !censused.has(route))

    expect(
      missing,
      `Rutas del lane sin lente declarada: ${missing.join(', ')}. ` +
        'Agrégalas a SEO_LENS_SURFACES declarando si emiten cifras (figures), escriben (command) ' +
        'o devuelven estado (state), con la razón escrita.'
    ).toEqual([])
  })

  it('toda tool SEO registrada en el MCP está censada', () => {
    const tools = collectTools().sort()
    const censused = new Set(SEO_LENS_SURFACES.map(surface => surface.tool).filter(Boolean))
    const missing = tools.filter(tool => !censused.has(tool))

    expect(
      missing,
      `Tools MCP sin lente declarada: ${missing.join(', ')}. Una tool que cruza cifras sin ` +
        'declarar su naturaleza es exactamente lo que esta task existe para impedir.'
    ).toEqual([])
  })

  it('el censo no inventa superficies que ya no existen', () => {
    // La dirección inversa importa igual: un censo que nombra rutas muertas se lee como
    // cobertura y no cubre nada.
    const routes = new Set(collectRoutes(ECOSYSTEM_SEO_DIR))
    const tools = new Set(collectTools())

    const ghostRoutes = SEO_LENS_SURFACES.map(s => s.route).filter((r): r is string => Boolean(r) && !routes.has(r!))
    const ghostTools = SEO_LENS_SURFACES.map(s => s.tool).filter((t): t is string => Boolean(t) && !tools.has(t!))

    expect({ ghostRoutes, ghostTools }).toEqual({ ghostRoutes: [], ghostTools: [] })
  })

  it('encuentra las tools que un patrón de prefijos se comería', () => {
    // Regresión del error de conteo que ya costó un inventario mal reportado: filtrar por
    // `get_|run_|track_` deja fuera `declare_` y `retire_`, y el total sale corto sin que nada
    // falle. El patrón se ancla en el dominio, no en el verbo.
    const tools = collectTools()

    expect(tools).toContain('declare_seo_competitors')
    expect(tools).toContain('retire_seo_competitors')
    // Y el dígito: una clase `[a-z_]` deja fuera `360` sin que nada falle.
    expect(tools).toContain('get_seo_visibility_360')
  })

  it('toda superficie declara una razón: "no emite cifras" no puede ser un silencio', () => {
    const withoutReason = SEO_LENS_SURFACES.filter(surface => surface.reason.trim().length < 20)

    expect(withoutReason.map(surface => surface.route ?? surface.tool)).toEqual([])
  })
})
