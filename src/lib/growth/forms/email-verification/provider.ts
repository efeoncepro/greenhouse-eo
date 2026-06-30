import 'server-only'

/**
 * TASK-1254 — Puerto del provider de verificación de email (Tier 2: deliverability/MX).
 *
 * Patrón puerto/adapter (estilo ZapSign, INTEGRATIONS_INFRA invariants): el dominio NUNCA
 * llama a la API del provider directo. El secreto vive server-only y se resuelve vía
 * `*_SECRET_REF`. Hoy el único adapter es `noopVerificationProvider` (no hay provider real
 * dado de alta todavía): devuelve `deliverable: 'unknown'` y `isReady() = false`, así el
 * orquestador degrada a Tier 1 sin gastar nada. Cuando se dé de alta el provider económico
 * recomendado (Abstract API u otro), se agrega su adapter acá y se enchufa en
 * `resolveVerificationProvider()` — un primitive, el resto del sistema no cambia.
 */

export type DeliverabilityVerdict = 'deliverable' | 'undeliverable' | 'risky' | 'unknown'

export interface ProviderVerificationResult {
  deliverable: DeliverabilityVerdict
  /** Identificador estable del provider que produjo el veredicto ('noop' | 'abstract' | …). */
  provider: string
}

export interface EmailVerificationProvider {
  /** Identificador estable (se persiste en el cache para auditoría). */
  readonly name: string
  /** ¿el provider está configurado (secreto presente) y habilitado por flag? */
  isReady(): boolean
  /**
   * Verifica deliverability de un email. CONTRATO: NUNCA throw por red/timeout — ante
   * cualquier fallo devolver `{ deliverable: 'unknown' }` para que el orquestador degrade
   * a Tier 1 sin romper el form. NUNCA exponer el payload crudo del provider al caller.
   */
  verify(email: string): Promise<ProviderVerificationResult>
}

/**
 * Adapter no-op (default mientras no haya provider real). No toca red, no factura, no
 * resuelve deliverability. Hace que todo el pipeline Tier 1 + cache + endpoint + gate
 * funcione end-to-end con `deliverable: 'unknown'`. Enchufar un provider real = agregar
 * su adapter + cambiar `resolveVerificationProvider()`.
 */
export const noopVerificationProvider: EmailVerificationProvider = {
  name: 'noop',
  isReady: () => false,
  verify: async () => ({ deliverable: 'unknown', provider: 'noop' }),
}

/**
 * Resuelve el adapter activo. Hoy siempre noop; cuando se dé de alta el provider real,
 * acá se decide por flag/secreto cuál usar (single seam, swappable).
 */
export const resolveVerificationProvider = (): EmailVerificationProvider => noopVerificationProvider
