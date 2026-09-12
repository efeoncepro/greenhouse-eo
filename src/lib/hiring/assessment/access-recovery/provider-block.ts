import 'server-only'

/**
 * TASK-1757 — fuente ÚNICA de "el proveedor bloqueó esta dirección".
 *
 * ISSUE-172 (2026-09-12): el predicado se mudó a `@/lib/email/provider-block` porque también lo
 * consume la plataforma de correo (reintento y revive de `email_deliveries`), y email no puede
 * depender de hiring. Este path se conserva como re-export para los consumidores del dominio;
 * NUNCA volver a definir el predicado acá.
 */
export {
  BLOCKING_PROVIDER_STATUSES,
  providerBlockedConditionSql,
  providerBlockStatusSql,
  providerBlockRecencySql,
  providerBlockStatusForEmailSql,
} from '@/lib/email/provider-block'
