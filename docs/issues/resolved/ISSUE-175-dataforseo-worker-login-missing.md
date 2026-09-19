# ISSUE-175 — DataForSEO falla en ops-worker por login ausente

## Ambiente

Cloud Run `ops-worker`, compartido por staging y producción, `efeonce-group/us-east4`.

## Detectado

2026-09-19, keyword discovery de la organización propia de Efeonce. Diagnóstico de solo lectura seguido por instrucción del operador: «Corrígelo», con «Avanza todo sin preguntarme» vigente.

## Síntoma

Tres runs (`seokdr-3b7eae8b-8a9b-4352-8030-95e3ba3d33d9`, `seokdr-8a427aa6-f2dd-4fa5-8b93-b43631149d1e`, `seokdr-5ba0bf09-ca7c-4a72-a946-749dd1e33405`) fallaron con `provider_error`, seis intentos cada uno, cero candidatos y cero costo registrado. Target `seot-efeonce-own-brand` (CL/es).

## Causa raíz

La revisión `ops-worker-00697-59f` (creada 2026-09-18T13:34:04.734518Z, GIT_SHA `bda1cf2cd9383450f5b0cd15bfceead644d31f08`) carece de `DATAFORSEO_API_LOGIN`, con password ref y discovery ON. Cloud Logging confirma que esa revisión procesó los tres fallos a las 2026-09-19T13:54:01.747560Z. El cliente lanza antes del fetch; el runner cuenta esa excepción como `provider_error`. El deploy omite login vacío y reemplaza el conjunto completo de env vars, sin guard. El secret de GitHub existe desde 2026-06-28; no se atribuye su ausencia a credencial inexistente ni al tag.

## Impacto

P1: discovery habilitado pero inutilizable en la revisión afectada. Comprobado en Efeonce; potencialmente todos los consumers DataForSEO del worker. Pruebas locales exitosas no certifican Cloud Run.

## Solución

`issue + TASK`: TASK-1341 ya gobierna el guard DataForSEO. Se restauró login en la misma imagen preservando las otras env vars. El hardening local impide despliegues incompletos antes del build, comprueba env efectiva y clasifica configuración ausente sin acusar al proveedor. No rotar password ni alterar las corridas históricas. Canary nuevo, acotado a Efeonce, preview y presupuesto antes de encolar.

## Verificación

- Config restaurada a las 2026-09-19: revisión `ops-worker-00698-9m9`, 100% del tráfico. Imagen fijada al mismo digest `gcr.io/efeonce-group/ops-worker@sha256:f5862e782f840174672b3c925de21d27f15d8f7348ef0282d76f40b308b3914c`, sin compilar/promover código ajeno. Comparación profunda del spec de ambas revisiones: sólo login añadido y referencia de imagen fijada a digest; todas las otras env vars, secrets, recursos y ajustes iguales.
- Login transferido desde la configuración local previamente verificada sin imprimirlo; password/IAM sin cambios. Secret GitHub `DATAFORSEO_API_LOGIN` ya existente (updatedAt 2026-06-28T12:31:29Z); no se leyó ni cambió su valor.
- `node services/ops-worker/dataforseo-config.mjs --service ops-worker --project efeonce-group --region us-east4`: falla contra 00697 por login ausente y pasa contra 00698.
- Canary `seokdr-43c277a6-b109-4110-9693-c280f2344846`: command `queueKeywordDiscovery`, preview permitido USD 0.0612, tope de verificación USD 0.07, idempotencia `issue-175-discovery-worker-recovery-2026-09-19`, mismo target propio CL/es, 1 seed y suggestions limit 10. Lo ejecutó el scheduler existente, no un runner local.
- PG: `succeeded`, `provider_calls=1`, `candidate_count=10`, `actual_cost_usd=0.013200`, `error_code=NULL`; 10 candidatos persistidos; empezó 16:14:00.466Z y terminó 16:14:01.586Z.
- Cloud Logging 2026-09-19T16:14:01.594291Z, revisión 00698: `pending=1 processed=1 succeeded=1 partial=0 noResults=0 budgetBlocked=0 failed=0`.
- Ledger propio `labs/seo/invoiced`: 8 llamadas / USD 0.108000 antes → 9 / USD 0.121200 después; delta coincide exactamente con el costo del canary. Las tres corridas fallidas siguen intactas.
- No-regresión: 59 tests focales de guard/deploy, cliente, breaker, spend, discovery y adapter AIO; configuración no relacionada preservada. No se alteró UI, seguimiento de keywords, resultados históricos ni política de presupuesto.
- **Separación de estados:** incidente recuperado en runtime; guard preventivo, verificador CI y error tipado implementados bajo TASK-1341, sin push ni despliegue de ese código. La imagen viva conserva el código anterior. Smoke AIO del alcance original de TASK-1341 no ejecutado; no se infiere de un canary Labs.
- Retiro del riesgo de recurrencia: integrar el guard de TASK-1341 en el flujo normal. Hasta entonces, el deploy manual debe recibir login explícito; un deploy sin él podría volver a borrarlo. Owner: TASK-1341 / Ops.


## Estado

resolved — incidente recuperado; hardening versionado en TASK-1341; integración y smoke AIO pendientes

## Relacionado

- [TASK-1341](../../tasks/in-progress/TASK-1341-dataforseo-aio-runtime-config-guard.md)
- `src/lib/ai/dataforseo.ts`, `src/lib/growth/seo/keyword-discovery/runner.ts`
- `services/ops-worker/deploy.sh`, `.github/workflows/ops-worker-deploy.yml`
