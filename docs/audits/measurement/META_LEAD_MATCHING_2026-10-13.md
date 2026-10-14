# Lead matching Meta y Google — 2026-10-13

## Resultado

**Released y activado** mediante release completo develop→main PR254, main d692ab51dc48,
manifest released y orquestador38483437158 success. [Dossier de release y recibos](../releases/2026-10-13-full-develop-matching-release.md).
GTM Server live6/Web live5; captura Vercel y Meta/Google/retención Ops activos de forma persistente.
La primera aceptación/reserva comercial consentida post-activación queda sin observar;
TASK-2034 conserva Status real Parcial. No se confunde preparación con entrega provider real.

## Configuración y cadena

- GA4 cuenta252968286/propiedad486264460/stream10593675149, G-KYPPY57M14,
  jreyes@efeoncepro.com. UPD y reconocimiento aceptados tras autorización; automática OFF,
  Signals OFF (no prerrequisito UPD). Ads link10593794382/customer9531478329, personalización activa.
- Siete audiencias90d creadas/releídas: AEO, SEO, web, contacto, social, reuniones y comerciales.
  Clasificadores del mismo generate_lead; nuevas dimensiones lead_source y scheduler_key.
- MP secret16122785915 y secretos scoped GCP payload-key/ingress-token/ga4-api-secret versión1;
  grant por secreto al portal SA, refs pinned. Resolución efectiva verificada dentro del worker,
  no sólo mediante lectura local. Vercel real usa service_account_key del mismo principal.
- Source Forms aceptado/Meetings confirmado prepara hashes Meta/Google diferentes y toma
  contexto publicitario granular con veto Sec-GPC. Unknown/denied/stale/GPC omite medición,
  nunca rechaza el negocio ni infiere publicidad del consentimiento de procesamiento.
- SAVEPOINT/proyección AES-GCM/AAD y unique source; UUID/tiempo durables, destinos independientes,
  cinco intentos24h, claims SKIP LOCKED/lease/CAS, ciphertext eliminado48h. Worker Forms ya existente.
- Meta recibe sólo el ingreso backend autenticado del GTM Server existente. Client31/template30/
  trigger33; tag6 sólo [11,33], legacyLead12/17 retirados. Sin Test Events code al publicar.
  GA4 forwarding requiere Client Name=GA4, preserva espejo y excluye backend; Google UPD
  utiliza user_data MP top-level sin events ni otro generate_lead, con client_id real + ads/analytics.
  Nunca PII/hash en dataLayer, parámetros ordinarios, dimensiones o URLs.

## Verificación

- 71 tests10archivos +21Client tests PASS, tipos/lint y bundles Forms/Meetings/worker PASS.
  CI remoto main20.100 PASS/616 skipped/0 failed y build/Deep/smoke success; no repetir build/suite
  local que saturó el equipo. CI fallaba por heap6GiB; corrección hereda8GiB canónicos sin omitir gates.
  API cero pasos y UI Starting job eran incompletas, no prueba de inactividad del runner.
- Meta Preview/Test Events **Procesado/Servidor** con em/ph/fn/ln y clasificadores ambos hosts:
  db9788fc-85d8-4315-8033-2ac2eb2ad06a, bc3e69f5-8573-46ce-828b-a2450dd3e694.
  Seis negativos400/401; replay conserva ID/tiempo, sin afirmar dedupe de atribución.
- SQL post-release aplicada23:34/23:35Z; ocho permisos app y capability catalog verificados.
  Canary con rol real greenhouse_app prueba SAVEPOINT/idempotencia/claims paralelos/leaseCAS/
  retención y elimina fixtures de medición. Sin escritura de negocios ni salida provider.
- Versión6 congelada verificada antes de publicar23:38:57Z; tres negativos live prueban gates
  auth/consentimiento/identidad cruda sin disparar Meta. Web5 sin cambio.
- Worker00775-fnh100% con tres flags true y canary200 que resuelve tres secretos reales;
  processed0/unavailableDestinations[]. GitHub repo vars persistentes, sin override Production.
- Captura true exacta en Vercel; deployment dpl_BxU6V7EGpo5R3REbazWxhXLsrVZT READY,
  alias canónico confirmado. Bundles portables tienen measurementContext/consentimiento,
  cache must-revalidate. Watchdog ok6/6 sin drift ni mensajes Teams.

## Límites, pendiente y rollback

No se crearon submissions, bookings, CRM, quotes, pagos, campañas ni backfill de contactos.
Test Events y controles de cola/credenciales no prueban la primera conversión comercial real
post-flip ni tamaño/elegibilidad de audiencias, calidad o rendimiento. Ese es el único acceptance
runtime de matching todavía abierto; registrar fuente consentida→ledger→ack→recepción provider
cuando ocurra, sin fabricar negocio. Incidente económico mindicador separado sigue abierto,
con excepción y Sentry detallados en el dossier; no se afirma arreglado.

Rollback: captura y senders OFF en configuración durable y revisión live, retención ON;
restaurar GTM5 sólo tras detener backend; no borrar key/ciphertext vigente48h, mantener SQL y recibos.
No otro proyecto/servicio/cron. Canon [08 §4.2](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13),
[ADR](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md) y
[TASK-2034](../../tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md).
