import { GLOBE_CAPABILITIES } from '@efeonce-globe/contracts'
import { describe, expect, it } from 'vitest'

import {
  GLOBE_OIDC_SCOPES,
  GLOBE_PRODUCER_CAPABILITY_SCOPES,
  GLOBE_SHELL_CAPABILITY_SCOPES
} from './globe-oauth-grants'

/*
 * Guard de ISSUE-126 — el drift que estuvo dos días rompiendo la reconciliación en silencio.
 *
 * Greenhouse consume el vocabulario de capabilities de Globe como tarball `file:` VENDORIZADO
 * (`vendor/efeonce-globe/efeonce-globe-contracts-*.tgz`), y pone un subconjunto de ese vocabulario en
 * el `capabilityScopes` del cliente OAuth `globe`. El reconciliador de tenancy
 * (`src/lib/globe/tenancy-reconciler.ts`) deriva `desiredCapabilities` de esa misma política y valida
 * cada string contra el vocabulario vendorizado: una capability que la política declara y el
 * vocabulario no conoce hace `throw globe_tenancy_capability_invalid` y tumba la reconciliación
 * COMPLETA del workspace.
 *
 * Fue exactamente lo que pasó: el paso 3 del rollout de ADR-010 (2026-07-24) movió
 * `globe.model-rights.attest` y `.read` a `capabilityScopes`, el tarball vendorizado seguía con 51
 * capabilities en vez de 65, y `brokerExpiresAt` quedó congelado dos días mientras el Cloud Scheduler
 * reportaba `ENABLED`. Con `tenancy_mode = shadow` no se cayó nada; en `enforced` una proyección
 * stale DENIEGA TODO.
 *
 * Dos razones por las que este test es el guard correcto y no un lint más:
 *
 *  1. **Corre sin el repo hermano.** Compara la política de Greenhouse contra el vocabulario que
 *     Greenhouse REALMENTE tiene instalado — que es el par que se desincroniza. Un guard que
 *     necesitara `efeonce-globe` presente no correría en CI, o sea no correría cuando importa.
 *  2. **Falla en el commit que introduce el problema.** Agregar un scope al grant sin re-vendorizar
 *     el vocabulario rompe acá, en `pnpm test`, en vez de romper un cron async dos días después sin
 *     que ninguna señal lo diga.
 *
 * ⚠️ Y una trampa que hay que conocer al arreglar un drift de estos: **pnpm resuelve un `file:` por
 * nombre de archivo.** Reemplazar el contenido del tarball dejando el mismo nombre NO reinstala — hay
 * que borrar `node_modules/@efeonce-globe/contracts` (o bumpear la versión) y reinstalar. Verificado
 * en vivo: con el tarball nuevo en su lugar, `pnpm install` seguía sirviendo 51; recién tras borrar
 * el directorio pasó a 65. Un re-vendorizado "correcto" puede ser silenciosamente inefectivo.
 */
describe('vocabulario de capabilities de Globe vendorizado', () => {
  const vocabulary = new Set<string>(GLOBE_CAPABILITIES)
  const oidc = new Set<string>(GLOBE_OIDC_SCOPES)

  const capabilityScopes = [
    ...new Set([...GLOBE_PRODUCER_CAPABILITY_SCOPES, ...GLOBE_SHELL_CAPABILITY_SCOPES])
  ].filter(scope => !oidc.has(scope))

  it('conoce cada capability que el grant OAuth declara — el par que rompió ISSUE-126', () => {
    const unknown = capabilityScopes.filter(scope => !vocabulary.has(scope))

    expect(
      unknown,
      unknown.length === 0
        ? ''
        : [
            `El grant OAuth de Globe declara ${unknown.length} capability(es) que el vocabulario`,
            `vendorizado NO conoce: ${unknown.join(', ')}.`,
            '',
            'Esto NO es un problema de este test: es el drift que tumba la reconciliación de tenancy',
            'con `globe_tenancy_capability_invalid` y congela `brokerExpiresAt` (ISSUE-126).',
            '',
            'Arreglo, en este orden:',
            '  1. cd ../efeonce-globe/packages/contracts && pnpm pack --pack-destination /tmp/vendorpack',
            '  2. cp /tmp/vendorpack/efeonce-globe-contracts-*.tgz vendor/efeonce-globe/',
            '  3. rm -rf node_modules/@efeonce-globe/contracts   # pnpm resuelve el file: por NOMBRE',
            '  4. pnpm install',
            '',
            'Y la regla de ordenamiento: re-vendorizar el vocabulario ANTES de mover el scope en el',
            'broker, nunca después.'
          ].join('\n')
    ).toEqual([])
  })

  it('no declara scopes de capability vacíos ni duplicados, que degradarían el guard sin fallarlo', () => {
    expect(capabilityScopes.every(scope => scope.startsWith('globe.'))).toBe(true)
    expect(capabilityScopes.length).toBe(new Set(capabilityScopes).size)
  })

  it('mantiene el vocabulario por delante del grant: un grant que lo iguala es señal de que falta re-vendorizar', () => {
    /*
     * El vocabulario de Globe SIEMPRE es más grande que el grant humano: incluye capabilities de
     * workload (lab, evaluation, tenancy, promoción, crédito administrativo) que un humano nunca
     * recibe. Si el grant llegara a igualar o superar al vocabulario, no es que el grant creció:
     * es que el vocabulario quedó stale y el chequeo de arriba está a un scope de empezar a fallar.
     */
    expect(vocabulary.size).toBeGreaterThan(capabilityScopes.length)
  })
})
