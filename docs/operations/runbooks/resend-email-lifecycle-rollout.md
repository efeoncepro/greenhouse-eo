# Runbook — Lifecycle global de correo con Resend

> **Owner:** TASK-1745 / ISSUE-160
>
> **Alcance:** infraestructura transversal de correo Greenhouse; no pertenece sólo a Hiring.
>
> **Estado al 2026-08-19:** código listo localmente; runtime, migraciones, secreto, webhook, reconciliación y smokes no verificados ni activados por este documento.

## Propósito

Activar de forma gradual el observer inbound de Resend sin interrumpir el sender outbound. El webhook convierte
eventos firmados del proveedor en evidencia durable de lifecycle para todos los `email_type`; no envía correos,
no participa en `sendEmail` y no convierte `sent` en prueba de entrega.

Fuentes canónicas:

- [Arquitectura global de webhooks](../../architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md)
- [ADR de recovery y delivery](../../architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md)
- [Crear webhook por API](https://resend.com/docs/api-reference/webhooks/create-webhook)
- [Actualizar o deshabilitar webhook por API](https://resend.com/docs/api-reference/webhooks/update-webhook)
- [Verificar requests firmados](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Retries y replays](https://resend.com/docs/webhooks/retries-and-replays)
- [Tracking de links](https://resend.com/docs/dashboard/domains/tracking)

## Invariantes de seguridad y disponibilidad

1. `POST /api/webhooks/resend` verifica el raw body con `svix-id`, `svix-timestamp` y `svix-signature` antes de
   parsear o persistir. El `svix-id` es la clave de dedupe; Resend entrega al menos una vez y no garantiza orden.
2. `RESEND_WEBHOOK_SIGNING_SECRET` es un secreto inbound distinto de `RESEND_API_KEY`. El endpoint resuelve sólo
   el secreto de firma: un cold start o Secret Manager caído devuelve `503` para conservar el retry del proveedor.
   Nunca se responde `2xx ignored` cuando falta firma, secreto o recibo durable.
3. El observer inbound nunca importa ni llama `sendEmail`, no construye el cliente outbound y no modifica el
   scheduler de retry. Borrar/deshabilitar el webhook reduce observabilidad; no apaga el correo del sistema.
4. La inbox guarda evidencia normalizada y token-free. No persiste body completo, contenido del correo, URLs
   bearer, firmas ni secretos. Clicks guardan como máximo el origin seguro, nunca path, query o fragment.
5. `status='sent'` significa **aceptado para despacho**. Sólo un evento firmado o una observación explícita de la
   API de Resend establece `provider_status`; `opened` y `clicked` son engagement, no prueba de entrega.
6. Una reconciliación nunca reenvía, rota credenciales ni inventa timestamps. Es dry-run por defecto, aplica por
   CAS sólo cuando lifecycle está vacío y pierde precedencia frente a evidencia firmada posterior.
7. Un `email.complained` puede desactivar la suscripción exacta; bounce/complaint emiten outbox. Antes de ampliar
   eventos, el canary debe probar esos efectos y su idempotencia sobre una identidad consentida.

## Preflight obligatorio

- Confirmar autorización de rollout y una ventana de bajo riesgo.
- Verificar el SHA a desplegar y que los tests de `route`, `resend-webhook`, `resend-reconciliation` y `delivery`
  estén verdes.
- Consultar Platform Health y el sender actual. Registrar tasa de error y despachos aceptados como baseline.
- Ejecutar `pnpm pg:connect:status` y revisar **todas** las migraciones pendientes. No usar
  `pnpm pg:connect:migrate` a ciegas: la instancia PostgreSQL es compartida por los runtimes.
- Leer el estado real mediante Resend API/CLI (`webhooks list`, domain readback), Vercel y Cloud Run. Un runbook o
  ledger no demuestra runtime.
- Confirmar un inbox de canary consentido. No usar una candidatura real sin autorización ni enviar un bearer de
  assessment como primer smoke.

## Orden de rollout

### 1. Base de datos antes de consumers

1. Revisar y aplicar la migración global
   `20260819064224037_task-1745-resend-provider-lifecycle.sql` mediante el carril canónico.
2. Hacer readback de:
   - tabla `greenhouse_notifications.email_provider_events`;
   - columnas `provider_status*` en `email_deliveries`;
   - constraints de status/source/evidence;
   - grant `SELECT, INSERT, UPDATE` para `greenhouse_runtime`;
   - cero cambios sobre la state machine outbound `email_deliveries.status`.
3. Si el release también incluye TASK-1746, aplicar después
   `20260819072130586_task-1746-assessment-access-recovery.sql` y ejecutar, **antes de desplegar cualquier writer
   que rote tokens**, el índice no transaccional:

   ```bash
   pnpm pg:connect:shell < scripts/operations/task-1746-create-token-intent-index.sql
   ```

   El script bloquea duplicados, índice inválido y contrato divergente; el readback debe mostrar
   `unique=true`, `valid=true`, `ready=true`, tres columnas y el predicado exacto. No lo ejecutes dentro del
   runner transaccional: usa `CREATE UNIQUE INDEX CONCURRENTLY` para no bloquear el correo global.

**Rollback DB:** antes de cualquier evento, puede evaluarse el down con la política normal de migraciones. Una vez
que exista evidencia de provider/recovery, no se borra historial para “volver atrás”: se deja el código dormant,
se deshabilita el webhook/flags y se prepara una migración forward. El down de TASK-1746 bloquea si existen receipts,
events o purge audit.

### 2. Deploy dormant y prueba de independencia

1. Desplegar Vercel con el handler corregido y **sin webhook registrado**.
2. Verificar que una request sin firma válida no produce `2xx` y que una falla de resolución del secret produce
   `503` redactado. No registrar payload, headers Svix ni raw errors.
3. Enviar un correo transaccional consentido por el camino existente y comprobar que Resend lo acepta aunque el
   webhook no exista. Si el sender se degrada, detener el rollout: el observer no es una mitigación del sender.
4. Si TASK-1746 viaja en el mismo release, desplegar ops-worker con
   `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED=false`. Confirmar además que el scheduler
   `ops-hiring-assessment-public-access-retention` existe a las `04:17` y que su primera ejecución queda steady.

### 3. Crear el webhook y custodiar el secreto

Resend permite crear/listar/leer/actualizar/deshabilitar/eliminar webhooks por dashboard, API, SDK o CLI. La API
`POST /webhooks` devuelve `id` y `signing_secret`; las lecturas también pueden devolver el secreto. Por eso:

- usa una sesión operativa aprobada con `RESEND_API_KEY` inyectada, no pegada en el comando;
- no imprimas ni serialices la respuesta completa;
- transfiere `signing_secret` directamente, en memoria, a Secret Manager como scalar crudo;
- registra como evidencia sólo webhook ID, endpoint, eventos, status y timestamp;
- no guardes el secreto en `/tmp`, shell history, captura, ticket, docs, logs o output de CI.

Contrato de configuración:

| Campo         | Valor/condición                                                                           |
| ------------- | ----------------------------------------------------------------------------------------- |
| Endpoint      | `https://greenhouse.efeoncepro.com/api/webhooks/resend`                                   |
| Primer set    | `email.sent` únicamente, para el canary inicial                                           |
| Secret GCP    | `greenhouse-resend-webhook-signing-secret`                                                |
| Ref runtime   | `RESEND_WEBHOOK_SIGNING_SECRET_SECRET_REF` apuntando al secret anterior                   |
| Valor directo | `RESEND_WEBHOOK_SIGNING_SECRET`; sólo fallback gobernado, nunca junto a un ref divergente |

Si el secreto todavía no está listo cuando Resend intenta entregar, el `503` es esperado y reintentable. Publica
el scalar limpio por stdin, otorga `secretAccessor` sólo a la identidad Vercel consumidora, configura el ref y
redeploya. La creación del secreto no prueba que el cold start lo resuelva: fuerza una instancia fría y valida
una firma real antes de ampliar eventos.

### 4. Canary firmado y ampliación global

1. Habilitar el webhook sólo con `email.sent` y enviar un correo consentido sin bearer.
2. Verificar en una misma correlación:
   - Resend aceptó el outbound;
   - el request llegó firmado;
   - existe una única fila `email_provider_events` con `event_source='webhook'` y
     `signature_verified=true`;
   - la delivery correcta recibió `provider_status='sent'` sin alterar `status`;
   - replay manual produce dedupe sin segundo efecto.
3. Repetir con una entrega real y comprobar `email.delivered` o el terminal honesto que devuelva el proveedor.
4. Sólo después, actualizar el webhook al set global:
   `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`,
   `email.complained`, `email.suppressed`, `email.opened` y `email.clicked`.
5. Confirmar `email.delivery.lifecycle_health` en steady y revisar bounce/complaint/outbox sin PII en logs.

No crees un webhook separado por Hiring: duplicaría eventos y efectos. El endpoint global correlaciona por
`resend_id` y sirve a todo `email_type`.

### 5. Reconciliación acotada

Ejecuta siempre dry-run primero:

```bash
pnpm email:resend:reconcile -- --limit=50 --lookback-days=30
```

Revisa `providerErrors`, `unsupported`, `wouldApply` y el cursor. Sólo con el reporte aprobado:

```bash
pnpm email:resend:reconcile -- --apply --limit=50 --lookback-days=30
```

Para eventos firmados pendientes cuya delivery aún no era visible:

```bash
pnpm email:resend:reconcile -- --redrive-pending --limit=50
```

Reglas:

- lotes `1..200`, lookback `1..90` días;
- continuar por `nextCursor`, sin loops ilimitados;
- `provider_error` permanece desconocido y se reintenta después;
- un `last_event` no soportado se registra como observación ignorada, no como lifecycle;
- no volver a ejecutar `--apply` a ciegas tras timeout: primero relee DB y proveedor.

### 6. Gate de links fragmentados de assessment

Este gate afecta sólo el cutover de TASK-1746; el webhook global puede operar antes.

1. Leer el dominio remitente mediante Resend API y comprobar `click_tracking=false`. Resend modifica los links
   cuando el tracking está activo; un acceso bearer fragmentado no se habilita sin un readback explícito que
   confirme `false`.
2. Si está activo, **bloquear el flip**. Cambiar tracking es una mutación global del dominio y requiere aprobación
   separada, evaluación de métricas afectadas y rollback; no se corrige automáticamente desde este runbook.
3. Con tracking falso, enviar un canary y verificar el HTML/href recibido:
   `/public/assessment/access#access=...`. El token no debe aparecer en path/query, redirect, logs o analytics.
4. Verificar las cuatro rutas live, exchange same-origin, cookie `__Host-` HttpOnly y que una nueva rotación invalida
   sesión/token previos.
5. Sólo entonces cambiar el SoT de ops-worker y desplegar
   `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED=true`. Rollback: `false` + redeploy; el enlace legacy queda
   preservado mientras el flag está OFF.

## Rate limit y retención de acceso público

El acceso público usa doble bucket durable, ambos HMAC y sin IP/credential crudos:

| Superficie    | IP/hora | Credencial/hora |
| ------------- | ------: | --------------: |
| exchange      |     120 |              10 |
| session read  |     600 |             120 |
| session write |     300 |              60 |

En Vercel sólo se confía `x-vercel-forwarded-for`; si no existe, el gate falla cerrado. Una credencial inválida no
crea buckets de cardinalidad arbitraria: el bucket credential se reclama sólo después de validar y bloquear la
sesión/credencial. No subas límites para resolver abuso o un proxy compartido sin evidencia y revisión de seguridad.

El owner diario llama `run_assessment_public_access_retention()` en hasta 10 lotes/20 segundos: máximo 50.000
sesiones y 200.000 buckets por corrida. Debe devolver `steady=true`; de lo contrario emite
`assessment_public_access_retention_overdue`. El job elimina sesiones/buckets expirados, no receipts ni audit de
recovery. La purga de recovery por consentimiento/retención es una operación separada, gobernada y append-only;
workforce/selected nunca entra a la purga de candidato.

## Readbacks de cierre

No declares `complete` sin evidencia live de todos estos puntos:

- migration status y constraints/grants exactos;
- índice token-intent válido/ready/unique si aplica TASK-1746;
- deployment Vercel y ops-worker sobre el SHA esperado, flags reales leídos desde runtime;
- webhook Resend único, endpoint/eventos/status correctos, sin exponer `signing_secret`;
- cold-start firmado, replay deduplicado y correo real con transición DB;
- sender outbound estable durante una falla deliberada del observer;
- reconciliación dry-run y apply acotado, con desconocidos preservados;
- `click_tracking=false` por API/readback y href recibido intacto antes del flag de sesión pública;
- rate limiter y purge bounded steady; señales sin backlog;
- logs/Sentry/outbox/DB sin bearer, firma, body de correo ni raw provider error.

Hasta completar esa lista, el estado correcto es **code complete, rollout pendiente**.

## Rollback

| Síntoma                   | Acción inmediata                                              | Lo que no debes hacer                                    |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| errores del webhook       | deshabilitar el webhook por API/dashboard                     | no tocar `RESEND_API_KEY` ni apagar el sender            |
| firma/secret drift        | deshabilitar webhook, corregir origen, redeploy, nuevo canary | no responder `2xx` sin verificación                      |
| proyección errónea        | deshabilitar webhook y parar reconciliación                   | no borrar inbox/audit ni sobrescribir hechos firmados    |
| link fragmentado alterado | mantener flag de sesión pública OFF                           | no compartir el link transformado ni activar por presión |
| rate/retention no steady  | mantener cutover OFF y diagnosticar buckets/job               | no desactivar límites o purga silenciosamente            |

Resend permite `PATCH /webhooks/:id` con `status='disabled'` y `DELETE /webhooks/:id`. Prefiere deshabilitar durante
la investigación para conservar configuración; elimina sólo si el endpoint/secret se retira definitivamente. Según
Resend, al deshabilitar o eliminar el endpoint cesan sus reintentos; usa replay manual después del arreglo si el
evento todavía está disponible.
