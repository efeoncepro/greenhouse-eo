# Handoff activo

## 2026-07-30 — TASK-1600: implementación y release gobernado regularizado

TASK-1600 ya migró Greenhouse al paquete AXIS `0.2.1` (sucesor compatible de la publicación manual histórica
`0.2.0`), invirtió el drift gate y dejó
los tests de contraste/semántica, typecheck, build, PDFs, capturas GVC light/dark y rollback rehearsal verdes.
El frame de rampas compara 0.00% desktop y 0.01% mobile; queda pendiente aprobación o re-baseline explícito
para la diferencia de altura del full-page histórico (12 px desktop, 2 px mobile). El commit Greenhouse es
`f4163965e`; Axis está publicado en `main` (`dba1922`). El tag `v0.2.1` existe y el run gobernado
`30525304584` terminó en `success` tras ejecutar build, typecheck, tests, contrato tag↔versión y publish
idempotente. `0.2.0` queda documentada como publicación manual legacy sin tag propio.

## 2026-07-30 — AXIS: migración de credenciales y release productivo cerrados

Estado honesto: **complete**. La migración Axis quedó operativa con el secreto
`projects/efeonce-group/secrets/axis-packages-read-token` activo. El secreto legacy de `efeonce-globe` fue
eliminado y el PAT legacy fue revocado después de verificar el release. El PAT temporal de migración sigue
activo como medida interina; la identidad de máquina continúa pendiente únicamente antes del rollout externo.

El release productivo `30502476429` terminó en `success` sobre
`41fa94846d0ca18a0f83529dc90cdc2da15a632d`. CI, deep verification, Playwright smoke, workers, HubSpot,
Vercel y health checks quedaron verdes. Los canaries del piloto usan `playwright-core` con
`channel: 'chrome'`; el rollback interno de `globe-studio-internal` y `globe-api-internal` fue ejercitado,
verificado y restaurado.

Fuente operativa: [`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`](docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)
y [`AXIS_CONTINUITY_MAP_2026-07-29.md`](docs/operations/AXIS_CONTINUITY_MAP_2026-07-29.md).

## 2026-07-29 — Social Media: modelo, diferenciación y Run & Gun consolidados

Se creó el modelo inicial de Social Media como servicio humano, recurrente y gestionado por un Managed Squad:

- [`Product Service Contract`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_PRODUCT_SERVICE_CONTRACT_V1.md)
- [`Business Model`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md)
- [`Pricing Integrity Pack`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_INTEGRITY_PACK_V1.md)
- [`Market Research`](docs/audits/commercial/SOCIAL_MEDIA_SERVICE_MARKET_RESEARCH_2026-07-29.md)
- [`Subservices Catalog`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md)
- [`Search + Social Visibility Composition`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md)
- [`Social Media Operating Model`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md)
- [`Social Media Customer Model`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md)
- [`Search + Social Measurement Contract`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_MEASUREMENT_CONTRACT_V1.md)
- [`Pricing Validation Addendum`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_VALIDATION_ADDENDUM_2026-07-29.md)
- [`Differentiation & Positioning`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_DIFFERENTIATION_POSITIONING_V1.md)

El servicio opera sin Globe. Globe queda como capacidad futura opcional y no forma parte de la promesa ni del pricing
base. Paid Social, Creator/UGC, crisis, 24/7 y Producción Especial son módulos separados. Estado honesto:
**`Approved for validation`**: la documentación, diferenciación y guardrails están consolidados; faltan validación
comercial, capacidad, cost-to-serve, pricing aprobado y pilotos. No es `Commercially approved` ni habilita venta self-serve.

La investigación recomienda como beachhead B2B experto con voceros accesibles, oferta compleja y necesidad de
autoridad/demanda. Siguiente paso: validar composición real del squad, SLA de community, cost-to-serve, margen,
pricing y dos pilotos de tres meses con Strategy, Commercial, Finance, Legal/IP y Operations.

Actualización de posicionamiento: Efeonce cuenta con **Efeonce Run & Gun Studio** y equipos profesionales para producción
rápida en terreno. Se documentó como ventaja de delivery componible con Social Media, con SOW y derechos propios
cuando implica jornadas, crew, movilidad, talentos o postproducción ampliada.

Se productizó la oferta candidata en [`Efeonce Run & Gun Production — Offer V1`](docs/services/creative-services/EFEONCE_RUN_AND_GUN_PRODUCTION_OFFER_V1.md), con cuatro paquetes, unidad de valor por jornada/sprint gobernado, scope, dependencias, quality gates, derechos, fallbacks y métricas de validación. **Efeonce Run & Gun Studio** nombra la capability/infraestructura; **Efeonce Run & Gun Production** nombra el servicio comercial. Pricing y capacidad exacta siguen pendientes de Finance/Operations.

La continuidad canónica y los índices ya enlazan el paquete completo: diferenciación y posicionamiento, Run & Gun,
operación, medición Search + Social, pricing validation y customer model. No se modificaron modelos ni skills en esta
actualización; sólo se sincronizaron índices y continuidad documental.

## 2026-07-29 — Release completo: develop promovido y producción verificada

Estado honesto: **complete**. PR #166 promovió todo `develop` a `main` mediante el merge
`0b4bdd6acb401ef0b108e27f1a8f1d80c469a0ed`; no hubo cherry-picks ni release parcial de AXIS. CI, CI Deep,
Playwright smoke, CLAUDE/context governance y Vercel pasaron para ese SHA. El orquestador oficial
`30473069894`, sin bypass ni break-glass, terminó `success` y dejó el manifest
`0b4bdd6acb40-2608542b-b1e5-4b3b-b24e-5036501dfef1` en `released`. El intento obsoleto `30465872005` quedó
cancelado.

Vercel Production está READY en `dpl_EkXUC1oCddYWvtWxB5sJVY7qXfkd`
(`greenhouse-7i34pkv5e-efeonce-7670142f.vercel.app`) y `greenhouse.efeoncepro.com/api/auth/health` responde
`200`. Cloud Run quedó Ready en `commercial-cost-worker-00411-q6j`, `ico-batch-worker-00234-58d` y
`hubspot-greenhouse-integration-00124-drd`, todos trazados al SHA de main. `ops-worker-00507-b4g` permanece
Ready en `49ea5741aec1`: el job oficial calculó diff vacío entre ese commit y el target para todas sus rutas runtime,
por lo que aplicó el change-gate canónico y omitió un redeploy label-only. El watchdog local sigue reportando ese
caso conocido como `worker_revision_drift`; no existe drift de código desplegable.

La causa raíz de los `401` no era un PAT vencido. El secreto es un PAT clásico válido: GitHub `/user` y el tarball
privado exacto respondieron `200`. El heredoc no quoted expandía `$$` al PID del shell antes de entregar el config a
Cloud Build, produciendo bearer tokens numéricos. Los deploy scripts ahora preservan el doble dólar para que Cloud
Build inyecte el secreto real. `ops-worker`, `commercial-cost-worker`, `ico-batch-worker` y el job staging-only
`artifact-worker` usan `secretEnv` → `.npmrc` efímero → BuildKit secret; `.npmrc` está excluido de los contextos y
los gates cubren los cuatro build units. Builds reales, imágenes sin token/runtime env y revisiones Cloud Run fueron
verificados.

La ubicación en `efeonce-globe` fue un acoplamiento legado deliberado y temporal; ya fue retirado. El secreto
activo vive en `efeonce-group`, el PAT legacy fue revocado y no se debe recrear el secreto en Globe por inercia.
El PAT temporal de migración permanece activo hasta la sustitución por una identidad de máquina antes del
rollout externo.

## 2026-07-29 — PR #164: main promovido, release bloqueado por latencia Sentry (fix en develop)

`develop` quedó en `2ecef6a5c4c8a79a738536fe04192b7343e358b0` y PR #164 promovió todo el contenido a `main` mediante
el merge completo `e711fe2560e3a7c2e7e8639e07a8a394e9582cdb`. CI, CI Deep, context-governance, CLAUDE, task-contract,
Design Contract, smoke afectado y Vercel pasaron. Vercel production quedó READY para ese SHA.

Los orchestrators `30452322643`, `30452924614`, `30453278402` y `30453818726` se detuvieron en preflight, antes de
crear manifest, aprobar Production o desplegar workers. El primer bloqueo fue `playwright_smoke` sin run para
`main`; el smoke manual canónico `30452463889` pasó verde y publicó resultados en Postgres. Los siguientes intentos
resolvieron smoke, CI y Vercel; `30452924614` encontró timeout de Sentry, `30453278402` encontró staging cancelado +
Sentry timeout y `30453818726` encontró Sentry timeout persistente con staging READY. La medición aisló la causa:
Secret Manager tardó ~1,1 s y la consulta Sentry con `limit=100` tardó ~8,5–9,1 s aunque devolvió cero issues. El
fix en develop reduce el límite a 10 (el umbral de bloqueo), da al check un presupuesto de 20 s y conserva el API
deadline interno de 15 s; también corrige la evidencia del runner para mostrar el timeout específico. Estado honesto:
**fix code complete en develop; rollout pendiente / operativamente bloqueado**. Falta llevar este fix a `main` mediante
el PR canónico, esperar sus gates y repetir el preflight sin bypass. No se usó bypass.

Cambios propios: autenticación efímera de paquetes privados AXIS en workflows, `NPM_RC` cifrado en Vercel `staging`,
Preview develop y Production, compactación documentada de contexto, corrección del presupuesto/auditoría de
`CLAUDE.md` y manifest de reachability. La credencial Vercel actual es operator-owned y debe rotarse por una
identidad read-only antes de rollout externo.

Los cambios locales ajenos siguen fuera de commits: `.vercel/project.json` y los dos artefactos SKY Blog. No se
implementó trabajo nuevo de AXIS/Globe.

## AXIS/Globe — continuidad sin implementación

Globe sigue siendo producto comercial Efeonce; su estadio técnico permanece `internal-only`/`internal_smoke`, con
externos gated por TASK-1480. Incluido en este release de Greenhouse: el fixture opt-in `/design-system/axis-adapters`,
la infraestructura de consumo privado y la documentación/gates asociados. La migración de credenciales, canaries,
release y rollback ya está cerrada; la promoción comercial sigue separada del piloto. TASK-1485 sigue `to-do` y depende de
TASK-1455/aceptación ADR-016; TASK-1552 mantiene
Slice 3 abierto (estados de error/cancelación, evidencia premium y operación live/internal-only); TASK-1480 requiere
cerrar dossier/evidencia del lane managed y no habilita runtime operado por cliente. ADR-010 mantiene atestación,
promoción por ruta y gates comerciales; ADR-016 exige Tailwind v4 + `tokens.ts` como theme y cero literales de diseño.

Siguiente task recomendado: **TASK-1480**, cerrar primero el readiness dossier del lane managed SKY con sus gates de
derechos, gasto, ruta, rollback, entrega segura, SOW y facturación; después coordinar TASK-1485/TASK-1552 según sus
dependencias. No implementar ese trabajo en esta sesión.

La historia anterior y los índices archivados viven en [Handoff.archive.md](Handoff.archive.md) y
`docs/operations/agent-context-history/`; no cargar esos shards completos al inicio.
