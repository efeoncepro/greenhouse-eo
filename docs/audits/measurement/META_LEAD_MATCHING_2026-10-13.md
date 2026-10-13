# Lead matching Meta y Google — 2026-10-13

## Resultado y límites

El operador autorizó implementar/activar matching de formularios aceptados y reuniones
confirmadas para remarketing. Código preparado y probado en el checkout compartido;
**todavía sin release, SQL aplicada ni flags activados**. GTM Server/Web live 5/5 conserva
la medición anterior. El ingreso backend permanece en workspace 8, con test code retirado.

### Cambios externos realizados y releídos

- GA4 correcto, cuenta 252968286/propiedad 486264460/stream 10593675149, `G-KYPPY57M14`,
  usuario `jreyes@efeoncepro.com`. UPD y reconocimiento general activados tras autorización;
  colección automática OFF. Link Ads 9531478329/personalización ya activos, conservados.
- Siete audiencias 90 d: AEO, SEO, proyectos web, contacto, social, reuniones confirmadas y
  Leads comerciales. Reglas unen los clasificadores al mismo `generate_lead`. Dos dimensiones
  nuevas: `lead_source` y `scheduler_key`. Cuatro audiencias anteriores conservadas.
- MP secret `properties/486264460/dataStreams/10593675149/measurementProtocolSecrets/16122785915`.
  Tres secretos GCP versión 1: `greenhouse-measurement-payload-key`,
  `greenhouse-measurement-ingress-token`, `greenhouse-measurement-ga4-api-secret`.
  Grant por secreto a `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`; valores
  verificados en memoria, nunca impresos. Refs aún no configuradas en runtimes.
- GTM workspace 8, template 30/Client 31/variable 32/trigger 33 compilados. Draft añade ingreso
  autenticado y conserva triggers Lead 12/17 hasta el cutover. No publicado.
- Meta Test Events recibió fixtures de formulario y reunión como **Procesado / Servidor**,
  con correo/nombre/apellido/teléfono y clasificadores comerciales. UUIDs:
  `e407fecc-5d9e-4cb7-948d-0151d1d5fc57`, `ec437ec1-5429-4b00-98b9-b2b6e07e1af5`.
  Seis negativos (credencial falsa, denied, email sin hash por host) bloqueados400/401.
  Replay de otros dos UUIDs conserva ID/tiempo y devuelve200; Test Events muestra cada
  recepción. No se afirma dedupe de atribución ni volumen/calidad de coincidencia real.

No se crearon submissions, bookings, contactos CRM, campañas, gasto publicitario ni otro
proyecto/servicio/cron. No se enviaron contactos reales ni datos históricos.

## Implementación y verificación local

- Consentimiento publicitario granular opcional y veto `Sec-GPC`; unknown/denied/stale/GPC
  omite medición sin bloquear el negocio. Contactos sólo desde datos validados de la aceptación.
- Hashes Meta y Google separados, sin HMAC interno; Google MP `user_data` top-level sin
  events ni otro generate_lead. Nunca PII/hash en dataLayer o dimensiones GA4.
- Proyección AES-GCM, AAD por UUID, unique source y filas de delivery por destino.
  SAVEPOINT aísla instrumentación dentro de la transacción comercial. Retries estables,
  cinco intentos/24 h, lease/CAS y expiración que conserva una entrega con lease vigente.
  Ciphertext se elimina a48 h; retención funciona con ambos senders deshabilitados.
- Worker Forms existente, cadence 2 min: error de medición no altera su respuesta; secreto
  Google no disponible no detiene Meta ni viceversa.
- 71 tests/10 archivos y21 tests de Client PASS, TypeScript/ESLint PASS. Builds portables
  Forms/Meetings y bundle del ops-worker PASS. No se ejecutó una release production ni
  concurrencia SQL live; esas pruebas siguen pendientes junto al rollout.

Evidencia privada saneada en `.captures/meta-capi-diagnostic-2026-10-13/`:
`google-lead-audiences-receipt.json`, `matching-secrets-receipt.json`,
`matching-preview-canary.json`, `meta-lead-matching-processed.png/txt`,
`ga4-user-provided-data-enabled.png`, `ga4-lead-audiences-created.png`.
El parche reviewable `lead-matching-owned-source.patch` comprende26 rutas propias;
`lead-matching-owned-source-paths.txt` enumera su alcance. No cambia índice ni crea árbol Git.

## Integración y siguiente paso autorizado

El operador rechazó la excepción de checkout y ordenó **todo develop→main** el13/10.
Se conserva el checkout compartido y se prepara un commit sólo de medición; el release
incluye íntegra la rama develop existente, sin incorporar WIP ajeno no committeado.
Main previo:7182af769e71bc1ad978aa8a3459337f77c20ce6. Auditoría del batch observa cinco SQL
netas ya aplicadas, seis capabilities quoter presentes y ninguna release activa. La key
marketing_studio.catalog.manage continúa pendiente de SQL parked postrelease.

El preflight clasifica Finance/Auth/Cloud y requiere autorización formal del override de
batch; la orden de publicar todo no permite desactivar los demás gates. Build local completo
PASS; suite general interrumpida por saturación y timeouts al ejecutarse simultáneamente.
No quedan procesos de esos comandos. CI remoto validará el árbol exacto antes del merge.

Persistencia del worker: tres GitHub repo vars → env workflow → deploy.sh, defaultOFF,
replicando AUTH_SERVER_GC_ENABLED. Configurar vars y runtime juntos tras SQL/cutover;
rollback apaga senders y mantiene retención. Tres secret refs pinned version1 declaradas.

Tras release: aplicar migración parked con timestamp post-release, configurar refs pinned,
verificar secretos en runtime, habilitar captura y retención, publicar Client sin test code y
retirar triggers Meta Lead 12/17 en la misma versión antes de activar Meta backend. Activar
Google sólo con client_id real + analytics/ads consent; conservar PageView 11/GA4 mirror.
Verificar ledger, respuestaHTTP y provider por separado. Audiencias recién creadas no
acreditan tamaño/elegibilidad/serving ni resultado de campañas.

Rollback: senders/capture OFF, retención ON, conservar key y receipts; restaurar sender
anterior sólo después de detener backend. No rotar key mientras exista ciphertext vigente.
Canon [08 §4.2](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13),
[ADR](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md) y
[TASK-2034](../../tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md).
