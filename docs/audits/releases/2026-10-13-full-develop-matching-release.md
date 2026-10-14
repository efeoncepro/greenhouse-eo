# Release completo develop→main y matching — 2026-10-13

Estado: **released; matching activado**. Coordinador Codex. Julio autorizó todo develop
comprometido y las operaciones necesarias; WIP ajeno preservado. La primera conversión
comercial consentida con enriquecimiento sigue sin observarse; TASK-2034 permanece parcial.

## Código, CI y control plane

- PR [#254](https://github.com/efeoncepro/greenhouse-eo/pull/254), merge 22:40:23Z.
- Main `d692ab51dc486a0585b7950f95bb627197e6f2c6`, árbol idéntico al develop promovido
  `27403a1658306012d5bb993532ba6cbc83bdb55c`: 6154 rutas netas vs release anterior.
  El cierre documental posterior queda en develop para el próximo release.
- CI main [38479348660](https://github.com/efeoncepro/greenhouse-eo/actions/runs/38479348660)
  y Deep 38479348739 success; **20.100 pruebas aprobadas, 616 skipped, cero fallos**, build aprobado.
  Candidato CI 38475587661/build y smoke 38476441021 success; main smoke 38480495445 success.
- [Orquestador 38483437158](https://github.com/efeoncepro/greenhouse-eo/actions/runs/38483437158)
  success, 23:18:24Z–23:33:23Z; ambos gates Production aprobados por el carril canónico.
- Manifest `d692ab51dc48-571eef31-2bd1-43b4-b8c8-6da07041a71d` **released**,
  23:21:41.314Z–23:33:14.420Z. Post-release auth health success a 23:31:39Z.
- Azure health/Bicep success, `no_diff`, sin aplicar stacks. Watchdog final 23:58:53Z:
  **ok, 6/6, drift_count=0, data_missing_count=0**, sin dispatch Teams.
- Primer Vercel de código: `dpl_7ifmoLUmLVUB4xkmp3zXq94qDQ3v` READY. Tras activar captura:
  **`dpl_BxU6V7EGpo5R3REbazWxhXLsrVZT`**, mismo main, creado 23:46:08.595Z,
  READY 23:51:51.430Z, [deployment](https://greenhouse-2j83ta65l-efeonce-7670142f.vercel.app).
  Alias [greenhouse.efeoncepro.com](https://greenhouse.efeoncepro.com) releído sobre ese ID.
  Forms/Meetings portables sirven contexto consentido y cache `must-revalidate`.

## Runtime servido

SHA abreviado `aa9a7ee9a450` corresponde a
`aa9a7ee9a450d6228f684e6b773c350250b997e2`; `d692ab51dc48` es el main citado arriba.
Readback independiente 23:59:09Z; cada servicio Ready=True y 100% tráfico indicado.

| Recurso | Revisión / SHA | Imagen / digest |
| --- | --- | --- |
| ops-worker | 00775-fnh / aa9a7ee9a450 | gcr.io/efeonce-group/ops-worker@sha256:477927094cf15a6c316467a354760b461d380763133ecea78c657cf100707378 |
| commercial-cost-worker | 00691-vjl / d692ab51dc48 | gcr.io/efeonce-group/commercial-cost-worker@sha256:1349bff56c4c43622ca2973a043f14e39dd52092c7e12eb1f9d72056ee48d52e |
| ico-batch-worker | 00502-ls7 / d692ab51dc48 | gcr.io/efeonce-group/ico-batch-worker@sha256:d83d37cf5fca23b4c7c4eb69cb7004b8afd8119007de879cd6248d1bc787a026 |
| hubspot-greenhouse-integration | 00198-ft5 / d692ab51dc48 | gcr.io/efeonce-group/hubspot-greenhouse-integration@sha256:3b93a02a09087df561754d78de7a20ed271d3f79f9d15ccfb51e5902606d33d6 |
| auth-server | 00152-5dv / aa9a7ee9a450 | gcr.io/efeonce-group/auth-server@sha256:2a448d2d6b8b18e5b0f1c0906824a87627db76ce280fe3e3b0ac45948f315759 |
| artifact-worker (Job) | etiqueta aa9a7ee9a450 | us-east4-docker.pkg.dev/efeonce-group/cloud-run-source-deploy/artifact-worker:aa9a7ee9a450d6228f684e6b773c350250b997e2 |

Ops/Auth/Artifact fueron change-gated: comparación completa aa9→main, exactamente cinco rutas
sin diferencia runtime: ci.yml, CLAUDE.md, UI_PLATFORM_AGENT_INVARIANTS.md,
runbooks/production-release.md y build-sgtm-lead-draft.ts. No reconstrucción sólo por etiqueta.
El contrato nuevo sí se ejercitó dentro del worker destino con su identidad real.

## SQL y activación

Migraciones creadas por `pnpm migrate:create` y aplicadas después de released, perfil ops:

- `migrations/20261013233429748_task-2034-growth-measurement-enrichment.sql`,
  aplicada **23:34:44.561947Z**: proyección cifrada, deliveries/leases, constraints y ocho permisos DML app.
- `migrations/20261013233455807_task-1905-marketing-studio-catalog-capability.sql`,
  aplicada **23:35:02.261307Z**: registro `marketing_studio.catalog.manage`; sin ampliar grants MCP.

`pgmigrations.run_on` es timestamp sin zona en UTC: readback como texto, sin sumar tres horas.
Se retiran ambos parked SQL. `MIGRATE_SKIP_TYPES=true` permitido: contrato PG tipado explícito
ya compilado; regenerar src/types con la próxima actualización gobernada de proyecciones.
No se empujan tipos compartidos para provocar otro deploy ajeno al release.
Canary SQL con rol real `greenhouse_app` pasó idempotencia, SAVEPOINT, claims paralelos,
lease/CAS, retries/ID estable y retención48h con lease activo; fixtures de medición eliminadas.

Cutover **23:38:57.747Z**, GTM Server **GTM-K2X4ZTTK live 6**; web **GTM-NGHPGRLZ live 5**.
Client31/template30/trigger33 autenticados. Meta tag6 dispara sólo [11,33]; triggers Lead12/17
retirados. PageView y mirror GA4 conservados. Forwarding tag18/trigger20 exige Client Name=GA4,
excluye el Client backend y evita una segunda conversión GA4. Versión congelada verificada
antes del publish, sin Test Events code; template Meta oficial pin a575edb31aa447469b855c3006ed9991dad711cf.
Canary negativo live: 401 auth falsa, 400 publicidad denegada y 400 identidad cruda; Meta no disparó.

Tres GitHub repo vars persistentes y revisión Ops00775-fnh con valor exacto true:
`GROWTH_MEASUREMENT_META_ENABLED`, `GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED`,
`GROWTH_MEASUREMENT_RETENTION_ENABLED`. Sin overrides Production en GitHub.
Canary dentro del worker **HTTP200**, processed/httpAccepted/failed/staleFinalizations=0 y
unavailableDestinations=[]: resolución real de los tres secretos; cero efectos comerciales.
Luego Vercel `GROWTH_MEASUREMENT_CAPTURE_ENABLED=true` exacto y redeploy READY arriba.
Credencial Production `service_account_key`, principal greenhouse-portal@efeonce-group.iam.gserviceaccount.com;
refs pinned versión1. Secretos sin TTL/expireTime, IAM tagging sin condición temporal.
La configuración es permanente; las sesiones OAuth de las herramientas tienen su ciclo propio.

## Matching y límites de evidencia

[Contrato](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13).
Preview/Test Events Server mostró Processed, em/ph/fn/ln y clasificadores para ambos hosts,
fixtures db9788fc-85d8-4315-8033-2ac2eb2ad06a/bc3e69f5-8573-46ce-828b-a2450dd3e694.
Google UPD/ack, link Ads y siete audiencias90d releídos. Google usa user_data MP sin events,
client_id real y consentimiento analytics+ads; Meta usa aceptación backend y publicidad consentida.
No PII/hash en parámetros GA4 ordinarios, dataLayer, dimensiones o URLs.

**No ejercitada una aceptación/reserva comercial real tras el flip** ni su ledger/recepción
provider. No prueba volumen/calidad de coincidencia, audiencia elegible para serving, rendimiento
ni dedupe de atribución por un replay HTTP. No submissions/bookings/CRM/quotes/pagos sintéticos,
contactos históricos, campaña/gasto ni nuevo proyecto/servicio/cron para matching.

## Excepciones e incidencia abierta

Preflight batch Finance/Auth/Cloud: excepción auditada por el alcance completo expresamente
autorizado, sin afirmar acoplamiento ficticio ni emergencia. Los demás gates permanecieron.
Tras merge el cron23:05 registró TLS/timeout con mindicador.cl:
[Sentry7790958718](https://efeonce-group-spa.sentry.io/issues/7790958718/) y
[Sentry7790964540](https://efeonce-group-spa.sentry.io/issues/7790964540/).
Reprobes Production500; **ambos siguen abiertos**, handler/proveedor blobs idénticos al release7182af769.
Readback PG23:15Z: UF2026-10-11 age2d (<warning7/error30), USD_CLP2026-10-09,
UTM2026-10-01 e IPC2025-12-01 (antigüedad previa, no afirmada vigente).
Advisory aislado del proveedor declarado no bloqueante por Codex en la razón auditada antes de
aprobar gates; no se rebajan errores de CI/Deep/smoke/readiness ni se recalculan transacciones.

## Rollback y recibos

Apagar captura y ambos senders tanto en Vercel/GitHub vars como revisión live; retención ON.
Restaurar GTM5 sólo tras detener backend Meta. Conservar key48h, recibos y SQL aditivo;
rollback DDL de matching rechaza drop. Vercel previo de aplicación:
`dpl_A2HgtQRfKTcC6isrPitjHh4Gr47U` (7182af769). No rotar/borrar ciphertext vigente.

Evidencia saneada local en `.captures/meta-capi-diagnostic-2026-10-13/`:
`release-watchdog-final.json`, `final-matching-worker-runtime.json`,
`production-capture-ready.json`, `production-alias-after-capture.txt`,
`postrelease-schema-readback.json`, `measurement-queue-live-canary.json`,
`backend-lead-cutover-receipt.json`, `live-ingress-negative-canary.json`,
`measurement-repo-vars-readback.json`, `worker-matching-contract-canary.json`,
`vercel-capture-configuration-readback.json`, `vercel-credential-identity-readback.json`,
`production-renderer-readback.json`, `matching-secret-bindings-readback.json`,
`permanent-configuration-readback.json`, `meta-matching-latest-processed.png/txt`,
`main-preflight-final.json`, `sentry-release-blocker-7790958718.json`,
`sentry-release-blocker-7790964540.json`, `economic-runtime-errors-sanitized.json`,
`economic-indicator-freshness-readback.json`.

## Cierre documental y verificación proporcional

Task lint2034/1905 sin errores ni warnings; espejos release/GTM idénticos, skills:mirrors PASS.
Feature-flags audit strict/no-vercel PASS (valores live se verificaron por separado).
Migration marker gate0errores, dos warnings históricos ajenos1277/1700. Índice Creative Studio,
inventario de modelos y frescura strict PASS; TTLs de fichas informativos, sin ejecutar modelos.
Closure focal revisado: heurísticas ADR/context/registro-skills se resuelven con ADR Meta CAPI
existente, contrato08, changelog/Handoff y skills ya registradas; no cambió un contrato raíz
que requiera ampliar project_context. Context/Handoff/changelog strict0errores/0warnings.
Sin nueva suite/build local; pruebas completas remotas sobre SHA promovido arriba.
TASK-2034 sigue parcial exclusivamente por acceptance comercial real no ejercitado.
