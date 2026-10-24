# Release completo develop→main — Grader y clasificación comercial

Estado: **released**. Orquestador [39190761785](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39190761785) SUCCESS.
Manifest `2559e924207f-567833aa-c03b-483f-b4b4-55ad2aec512b` released02:51:39.621Z; health200 y watchdog ok6/6, drift0.
Coordinador único Codex. Julio autorizó promover todo develop; sin leads ficticios.

## Alcance y promoción íntegra

PR [257](https://github.com/efeoncepro/greenhouse-eo/pull/257) fusionó develop
`81f6ba525376c91110a55f8cf7343326bd22811d` a main
`2559e924207f5120232593e7e79b0f031cab6dc9` el19/10/2026 02:03:50Z (18/10 Chile).
128 archivos frente al release anterior; preflight ship, sin migraciones ni excepción.
Árbol de ambos refs `17cbf2d233b4ae70ffe852a2ac631c06e79f7866`, diff vacío: ningún
contenido comprometido de develop quedó fuera. Trabajo local ajeno sin commit preservado.
Checkout principal en develop; no se creó otro worktree.

## Validación del candidato

- 22 pruebas focales de clasificación/endpoint, TypeScript, lint y documentación PASS.
- CI push39185794267 y PR39185798009 SUCCESS; staging dpl_3Rg8sugJREgpYiMDMWRpHNki7Mnh READY.
- CI push:20.855 pruebas PASS,0 fallos,616 omitidas;2175 archivos aprobados.
- Smoke staging39186265352 y producción39188786401 SUCCESS.
- Las871 pruebas previas sobre0373930de se conservan como evidencia histórica, no como ejecución del nuevo SHA.

## Deployment y canarios productivos

Vercel `dpl_4HeNDmdSmyRa673gi78YFNfmqBLY` READY, alias greenhouse.efeoncepro.com y SHA/main
exactos (GET02:11:24Z). Flag Ads de proyecto true y clave presente en env/build del deployment,
creado después del flip previo; API sólo expone nombres, no el booleano congelado directamente.
Flags Grader sobre Forms e intake público true releídos02:12Z; sin flips adicionales.

Canarios02:11:30Z: CORS histórico204 con origin Think exacto y ajeno sin ACAO; POST JSON
malformado/null/array400 con private,no-store antes del intake. Clasificación:401 sin sesión,
400 schema inválido y409 precondiciones antiguas de Web. El tipo quote_request actual ya rechaza
from lead_magnet: no es una prueba aislada de hash CAS; esa rama está cubierta por unit tests.
GET antes/después conservó definición/versiones/destinos; contador de auditoría del command0→0.
Grader portátil v8/tokenized_report y health200. Ninguna corrección positiva ni lead/reserva de prueba.

## Medición y auditoría

API02:11:35Z:13 Forms comerciales+Discovery con Ads; Grader comercial, Contacto/ebooks fueraAds.
Heads, versiones y destinos anteriores preservados. Cero nuevas publicaciones de políticas.
GTM sin drift; API02:14:37Z confirma Web6/Server10, sin otra publicación. Ads6862539491: bindings
commercial_lead/meeting_booking ready; auto-tagging y términos de datos ON, owner correcto.
Ads jreyes@efeoncepro.com; Cloud julio.reyes@efeonce.org, proyecto efeonce-group. Sin cambio OAuth/IAM.

La clasificación usa auditoría neutral API Platform y UPDATE Forms en la misma transacción;
fallo de registro/cierre revierte. Permisos runtime SELECT/INSERT/UPDATE confirmados por metadata.
Actor/razón/hashes y commandExecutionId quedan auditados en una corrección real futura, sin PII.
Los canarios no ejecutaron una corrección positiva ni generaron un registro para fingir evidencia.

## Rollback y límites

Baseline capturado: main ec317c928fffcb919d71bdb62821b80280af2347, deployment
dpl_ER5v1bwisSTkfWE6BCd7jfJNLxvk y seis recursos Cloud Run Ready con revisiones/digests privados.
Usar rollback del control plane con ese baseline; no reejecutar correcciones ni políticas.
No hubo nuevas migraciones que revertir. Configuración/canarios no prueban recepción o atribución
Ads/Meta ni identidad nativa HubSpot de un lead real. Sin replay, backfill ni envío ficticio.

Contratos: [Grader](../../architecture/GROWTH_GRADER_COMMERCIAL_MEASUREMENT_V1.md),
[clasificación](../../architecture/GROWTH_FORMS_COMMERCIAL_CLASSIFICATION_CORRECTION_V1.md).

## Cierre del control plane

CI main39188181495 y CI Deep39188181478 SUCCESS sobre el SHA exacto; preflight local y
orquestador verdes, sin override ni retry. Dos rondas Production aprobadas para el mismo intento.
Azure validó plantillas y resolvió no_infra_diff; no se ejecutó Bicep.

| Recurso | Revisión/configuración activa | SHA | Estado |
|---|---|---|---|
| ops-worker | ops-worker-00782-2qf | 81f6ba525 | Ready,100% |
| commercial-cost-worker | commercial-cost-worker-00701-gnw | 2559e9242 | Ready,100% |
| ico-batch-worker | ico-batch-worker-00513-d6v | 2559e9242 | Ready,100% |
| hubspot-greenhouse-integration | hubspot-greenhouse-integration-00201-thl | 2559e9242 | Ready,100% |
| auth-server | auth-server-00160-lqp | 81f6ba525 | Ready,100% |
| artifact-worker Job | imagen81f6ba525, digest a2bd4ed939bb… | 81f6ba525 | Ready,configuración |

Ops/Auth/Artifact omitieron build/deploy mediante sus guardas: logs confirman rutas runtime/config
sin cambios. Los árboles completos81f6ba525 y2559e9242 son idénticos. El watchdog reconoce6/6
sin drift ni datos faltantes. Se verificó el digest del Job por Artifact Registry; no se ejecutó
un job sintético. Commercial Cost/ICO/HubSpot sirven el SHA de main.

El HTTP200 post-workers consta en el workflow02:50:01Z y GET independiente02:52:53Z. La lectura
final de GTM conserva6/10 y Ads/flags siguen correctos02:50–02:51Z. El manifest dejó vacíos
worker_revisions/post_release_health/workflow_runs: esta evidencia de runtime procede de GitHub,
GCP y watchdog independientes; no se afirma que esos detalles estén persistidos en el manifest.
No se reescribió ese registro por SQL.

Cierre documental sólo sobre cambios propios en develop, sin otro push a main. WIP ajeno protegido
por hashes y staging privado; no se creó otro checkout. [Evidencia saneada](2026-10-18-grader-commercial-measurement-production-release.evidence.json).
