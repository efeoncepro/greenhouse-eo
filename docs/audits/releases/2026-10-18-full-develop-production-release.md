# Release completo develop → main — 18/10/2026

**Release de código cerrado: `released`, orquestador `SUCCESS`, watchdog `ok` (6/6, drift 0,
datos faltantes 0).** Todo el contenido committeado del candidato develop entró a main.
Google Ads conserva su rollout pendiente: flag OFF y ninguna publicación GTM en este release.
Todos los horarios de este documento son UTC.

## Alcance y autorización

- [PR #256](https://github.com/efeoncepro/greenhouse-eo/pull/256), merged 18:59:38Z.
- Develop promovido: `77763331c3618ab774a061e6e6bec0b287be54ce`.
- Main: `ec317c928fffcb919d71bdb62821b80280af2347`.
- Árbol de ambos: `60471bfbbc4ea0c01936cda4db25d5197209d3cd`; diff completo vacío.
- **1.583 archivos netos** frente a main anterior `9690efad`: sin cherry-picks ni exclusiones.
  El WIP ajeno del checkout compartido quedó fuera del release y del commit de cierre.
- Julio autorizó todo develop y confirmó «Autorizar excepción auditada del lote completo»
  a las 18:53:53Z. Ejecutor GitHub: `cesargrowth11`; Cloud: `julio.reyes@efeonce.org`.

La política clasifica `requires_break_glass` por las expansiones de recibos ya aplicadas,
el observador GTM de sólo lectura y la guarda de Vercel para el ref de validación exacto.
Se usó exclusivamente el override de batch del orquestador, con motivo y rollback auditados.
Los once checks ajenos a batch quedaron `ok`, tanto en la lectura local como en el artefacto
remoto. El payload preserva `readyToDeploy=false` y `overallStatus=degraded`, con una única
warning de batch; el opt-in explícito permitió exit 0. Ese payload no se reescribió a ready=true.
No se exceptuaron CI, Deep, smoke, readiness, migraciones ni salud.

## Validación y cierre canónico

| Evidencia | Resultado |
| --- | --- |
| [CI candidato 39154145689](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39154145689) | PASS: 20.817 aprobados, 616 omitidos, 0 fallos; build y size gate PASS |
| [Deep candidato 39154144028](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39154144028) | PASS: mismos conteos; cobertura de líneas 68,78% |
| [Smoke candidato 39154110809](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39154110809) | PASS: 50 aprobados, 1 omitido, 0 fallos o flaky |
| [CI main 39156691813](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39156691813) | PASS: 20.817 aprobados, 616 omitidos, 0 fallos; build 6m06s y size gate PASS; job 33m09s |
| [Deep main 39156691872](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39156691872) | PASS: mismos conteos; líneas 68,79%; duración 1.393,82s |
| [Smoke main 39156727369](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39156727369) | PASS: 50 aprobados, 1 omitido, 0 fallos o flaky; staging canónico con código main |
| [Orquestador 39159325900](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39159325900) | SUCCESS, 19:33:41–19:51:35Z; 24 jobs, ninguno fallido |
| Gates Production | Ambos aprobados: 19:38:14Z y 19:38:27Z |
| Post-release health | `/api/auth/health` HTTP 200, PASS 19:49:44Z |
| Manifest PostgreSQL | `ec317c928fff-33c067f4-bc76-4a21-a5e0-a37a99ac726b`, **released**, leído 19:51:44Z |
| Ventana del manifest | 19:38:10.068–19:51:25.548Z; 13m15,480s |
| Watchdog terminal | **ok**, 6/6 recursos, drift 0, datos faltantes 0; exit 0 |

El manifest conserva `workflow_runs=[]`, `worker_revisions={}`, `vercel_deployment_url=null`
y `post_release_health={}`: limitación vigente del writer. La evidencia independiente de
GitHub, Vercel y Cloud Run está adjunta; no se rellenaron esos campos por SQL. El audit de
transiciones conserva el override, actor y motivo. `operator_member_id` es null; la identidad
GitHub no se presenta como prueba de una capability humana Greenhouse.

El watchdog intermedio comparaba los recursos compartidos con el último orquestador exitoso
`9690efad`: drift 5 antes del nuevo run y 6 antes de que terminara el parent. Sólo después de
su conclusión se verificó **0/0**. No se siguió la recomendación transitoria de desplegar el SHA
anterior, ni se modificó el detector ni se hicieron deploys individuales.

## Runtime servido

Vercel Production **READY**, deployment `dpl_F13UyAaTEjkcttFKc7aZjjtgTFNt`,
[deployment](https://greenhouse-3f6nalcrn-efeonce-7670142f.vercel.app).
Alias [greenhouse.efeoncepro.com](https://greenhouse.efeoncepro.com) vinculado al mismo ID
con SHA exacto `ec317c928`; readback final 19:49:59Z. Staging conserva candidato 77763331 READY.
No hay deploy del ref de validación entre los últimos 100 observados.

Readback Cloud Run 19:49:53Z: seis recursos Ready; los cinco servicios con tráfico 100%.
Digests completos y URLs están en la [evidencia estructurada](2026-10-18-full-develop-production-evidence.json).

| Recurso | Revisión / tipo | SHA servido |
| --- | --- | --- |
| Ops | `ops-worker-00781-tjg` | 77763331, equivalente |
| Commercial | `commercial-cost-worker-00699-9c2` | ec317c928 |
| ICO | `ico-batch-worker-00511-5fm` | ec317c928 |
| HubSpot | `hubspot-greenhouse-integration-00200-6t4` | ec317c928 |
| Auth | `auth-server-00159-d9h` | 77763331, equivalente |
| Artifact | Cloud Run Job, sin revisión/tráfico | 77763331, equivalente |

Ops, Auth y Artifact omitieron rebuild por change-gate legítimo: logs, health/Ready y
**diff de árbol completo** 77763331→ec317c928 vacío. Auth conservó también su configuración.
No se reconstruyó para alinear una etiqueta. Ambos carriles Azure verificaron health, Bicep y
`no_infra_diff`; no aplicaron infraestructura. Artifact Ready acredita configuración disponible,
no una ejecución nueva de render ni una entrega de negocio.

## Schema y recibos

Las expansiones aditivas `20261018174803715_hubspot-native-form-receipts` y
`20261018174804112_meta-event-receipts` se aplicaron con autorización específica antes del
release. Readbacks: ambas filas pgmigrations a las 17:48:39.769537Z, tres columnas, tres CHECK
validados, índice, funciones y dos triggers. No quedan migraciones canónicas pendientes.
Conservar ese schema expandido en rollback. Las otras propuestas SQL pendientes no se aplicaron
por asociación. [Reparación y evidencia](2026-10-18-candidate-89d70ec13-review.md).

El dispatcher recuperó ticks naturales HTTP 200. Las dos submissions antes pendientes quedaron
`delivered` en ledger con **cero destinos directos habilitados y sin attempts de proveedor**.
En Ops 777, los ticks de 18:36/18:38Z volvieron HTTP 200, processed/delivered/failed 0/0/0.
No hubo replay manual. No se observó el shape `hubspotReceipts` en esos logs: la migración y la
salud no certifican un envío nativo HubSpot. Un ACK sGTM tampoco certifica recepción Graph,
matching, deduplicación ni atribución Meta.

## Canarios de contrato

Production 19:06Z, después del deployment exacto de main, **PASS**:

- GET admin measurement expone el nuevo `contract.googleAdsOnline`: 7/7 assertions y permiso
  de lectura. Baseline previo: HTTP 200 y contrato null. Actor dedicado
  `agent@greenhouse.efeonce.org`; Cloud conserva Julio.
- GET BUILDINFO y bundles Forms/Meetings/CTA: HTTP 200, headers y hashes registrados;
  Forms y Meetings contienen el literal nuevo `googleAdsConversion`. La versión por sí sola
  no distingue el cambio. Comparación anónima de cuerpo con origen inmutable no realizada:
  ese origen devuelve HTTP 302 por protección; alias/SHA verificado por API Vercel.
- Dos POST negativos, schema inválido antes de persistencia/proveedor: Forms HTTP 400 `invalid`
  y Meetings HTTP 400 `validation_failed`; ambos `private,no-store` y sin recibo Ads.
  No crean un lead ni una reserva, ni emiten un evento de proveedor.

Los canarios verifican el contrato desplegado. No equivalen a un lead comercial positivo,
una agenda real, recepción nativa HubSpot o una conversión atribuida en Google Ads/Meta.

## Medición pendiente de activación

Readback Vercel **19:49:57.865Z**: `GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED` ausente en
Production, sin otros bindings. El lector en main exige literal `true`: **Ads OFF**.
No se publicó GTM ni se activó una política Ads. EC y los opt-ins de recibos conservan sus gates.
Web5/Server9 son la última referencia previa, no un nuevo snapshot final.

Compatibilidad de bridges/renderers WordPress y Think, Preview funcional, política por fuente,
publicación GTM y EC efectiva conservan su secuencia independiente. No se fabricaron click IDs,
leads, reservas ni conversiones para producir evidencia; Meta/UPD y retención no cambian por
asociación. [Manual de activación](../../manual-de-uso/growth/activar-conversiones-google-ads.md),
[arquitectura](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md),
[ADR aceptado](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) y
[paquete Ads](../../operations/releases/google-ads-2026-10-18/README.md).

## Rollback y tiempos

Baseline anterior: manifest `9690efad0c1b-b80fdb2e-e48e-4d1b-9724-3dd3286b1baa`, released;
Vercel `dpl_843eUPPMzYQdBgxt9ELX3WD5w9oQ`,
[deployment anterior](https://greenhouse-bwiwqc757-efeonce-7670142f.vercel.app).
Revisiones iniciales: Ops00780-rhp, Commercial00697-tsc, ICO00509-9w4, HubSpot00199-cfn,
Auth00158-jcx. Job Artifact se revierte por imagen/digest, sin tráfico:
`sha256:84b97af033bcb216f6947048bcfc13e8f486558e7d2cb1efaf1020f6d7cc6d50`.
Los snapshots iniciales y los posteriores al staging compartido son puntos distintos.
Usar el control plane y preservar schema aditivo; nunca editar manifests por SQL.

Orquestador **17m54s**, manifest **13m15,480s**, runtime verde **16m03s** desde el dispatch.
Timer del agente iniciado 18:20:51Z, incluye lectura, preparación, ambas rondas CI, ejecución
y documentación. El corte y E2E redondeado se registran en el
[ledger obligatorio](../../operations/PRODUCTION_RELEASE_TIMING_LEDGER.md).
La espera principal fue la validación completa del candidato y del squash exacto; no se
relajaron gates. Aprendizaje operativo: el batch se compara contra el último manifest released,
y el watchdog intermedio usa el último workflow exitoso; conservar ambas evidencias hasta el cierre.

[Playbook](../../operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md),
[runbook](../../operations/runbooks/production-release.md),
[control plane](../../architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md) y
[ledger de flags](../../operations/FEATURE_FLAG_STATE_LEDGER.md) gobiernan esta operación.
