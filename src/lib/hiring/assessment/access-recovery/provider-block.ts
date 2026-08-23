import 'server-only'

/**
 * TASK-1757 — fuente ÚNICA de "el proveedor bloqueó esta dirección".
 *
 * El predicado estaba escrito dos veces, verbatim: en `assertEmailProviderAllowsRecovery`
 * (guardrail del command, que rechaza el envío) y en el LATERAL de `availability.ts` (que le
 * dice al operador si el canal está disponible). El propio `availability.ts` advierte en prosa
 * que la divergencia entre predicados espejados es LA clase de bug de este dominio: si la UI
 * ofrece un canal que el command rechaza, el operador quema un intento; si lo esconde cuando el
 * command lo permitiría, le oculta al candidato la única salida que le queda.
 *
 * Se extrae ANTES de agregar el tercer consumidor (el aviso de rotación), no después: un tercer
 * copy-paste es cómo un predicado compartido se convierte en tres que divergen en silencio.
 */

/** Estados del proveedor que prohíben un envío nuevo a esa dirección. */
export const BLOCKING_PROVIDER_STATUSES: ReadonlySet<string> = new Set([
  'bounced',
  'complained',
  'suppressed',
])

/**
 * Condición de bloqueo sobre una fila de `email_deliveries`.
 *
 * Mira las marcas de lifecycle Y el `provider_status` porque son dos caminos distintos hacia el
 * mismo hecho: el webhook del proveedor sella la marca temporal, y la reconciliación posterior
 * escribe el estado. Confiar sólo en uno deja bloqueos invisibles según por dónde llegó la
 * evidencia.
 */
export const providerBlockedConditionSql = (alias: string): string =>
  `(${alias}.bounced_at IS NOT NULL OR ${alias}.complained_at IS NOT NULL
     OR ${alias}.suppressed_at IS NOT NULL
     OR ${alias}.provider_status IN ('bounced','complained','suppressed'))`

/**
 * Estado bloqueante normalizado de una fila. El orden NO es alfabético ni casual: `complained`
 * gana sobre `bounced` y `bounced` sobre `suppressed` porque expresan intención decreciente —
 * "me marcó como spam" es una señal explícita de la persona y manda sobre cualquier otra.
 */
export const providerBlockStatusSql = (alias: string): string =>
  `CASE
     WHEN ${alias}.complained_at IS NOT NULL OR ${alias}.provider_status='complained' THEN 'complained'
     WHEN ${alias}.bounced_at IS NOT NULL OR ${alias}.provider_status='bounced' THEN 'bounced'
     WHEN ${alias}.suppressed_at IS NOT NULL OR ${alias}.provider_status='suppressed' THEN 'suppressed'
   END`

/** Orden canónico: la evidencia más reciente del proveedor gana. */
export const providerBlockRecencySql = (alias: string): string =>
  `COALESCE(${alias}.provider_event_created_at, ${alias}.provider_observed_at, ${alias}.updated_at) DESC,
   ${alias}.created_at DESC`

/**
 * Subconsulta completa: el estado bloqueante vigente de una dirección, o `NULL` si no hay ninguno.
 * `emailExpr` es la expresión SQL con el correo (columna o parámetro), no un literal.
 */
export const providerBlockStatusForEmailSql = (emailExpr: string): string =>
  `(SELECT ${providerBlockStatusSql('delivery')}
      FROM greenhouse_notifications.email_deliveries delivery
     WHERE LOWER(delivery.recipient_email) = LOWER(${emailExpr})
       AND ${providerBlockedConditionSql('delivery')}
     ORDER BY ${providerBlockRecencySql('delivery')}
     LIMIT 1)`
