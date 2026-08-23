# TASK-928 — Reliability/Admin N+1 batching and request cache

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `En implementacion directa en develop por override operador 2026-05-24`
- Rank: `TBD`
- Domain: `platform|reliability|performance|payroll`
- Blocked by: `none`
- Branch: `develop` (operator override: no branch switch)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Eliminar los N+1 reales reportados por Sentry en `/admin/ops-health`, `/admin/integrations`, `/admin/views`, `/hr/payroll*` y synthetic cron. El objetivo no es mutear performance issues, sino reducir las consultas repetidas con batching, cache request-scoped y readers agregados medibles.

## Why This Task Exists

El reporte semanal Sentry `2026-05-15` a `2026-05-22` mostro issues N+1 ongoing/escalating. En esta sesion se corrigio solo el N+1 mas acotado del synthetic cron (`recordProbeResults()` bulk insert). Quedan rutas admin/payroll compartidas donde silenciar Sentry esconderia latencia y carga innecesaria sobre Postgres.

## Goal

- Agrupar consultas repetidas de health signals, locale, table presence y view metadata.
- Introducir cache request-scoped para lecturas comunes dentro de una misma request.
- Mantener Sentry performance activo hasta verificar caida real post-deploy.
- Agregar tests que prueben conteo de queries o readers agregados, no solo snapshots.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/audits/sentry/SENTRY_WEEKLY_REMEDIATION_AUDIT_2026-05-24.md`

Reglas obligatorias:

- No bajar sampling ni cambiar fingerprints Sentry para esconder N+1.
- No crear pools nuevos ni readers paralelos fuera del access model canonico.
- No meter cache global cross-request sin invalidacion clara; V1 es request-scoped.
- Medir antes/despues con Sentry y/o tests de query count.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Bulk insert synthetic ya implementado localmente en `src/lib/reliability/synthetic/persist.ts`.

### Blocks / Impacts

- Reduce ruido y carga de `/admin/operations`.
- Mejora latencia de rutas admin y payroll sin cambiar UX.

### Files owned

- `src/app/(dashboard)/admin/**`
- `src/app/api/admin/**`
- `src/lib/reliability/**`
- `src/lib/platform-health/**`
- `src/lib/payroll/**`
- `tests/**`

## Current Repo State

### Already exists

- Readers de reliability overview y admin health.
- Sentry performance issues detectando N+1.
- Synthetic cron bulk insert implementado como primer slice acotado.
- Platform Health ya tiene cache TTL in-process y `getReliabilityOverview()` ya acepta sources preloaded.
- `syncViewRegistryCatalog()` sincroniza el registry en cada GET de `/admin/views`, pero antes de esta task lo hacia con un UPSERT por vista.
- Payroll projected reutiliza `fetchKpisForPeriod()`; el fallback live ICO para miembros no materializados/stale debe batcharse en el reader canonical, no en la UI.

### Gap

- Admin/integrations/views y payroll siguen haciendo lecturas repetidas por request.
- No hace falta crear cache global nuevo: el slice seguro es deduplicar promises/preloaded sources dentro de la request y reemplazar loops por bulk readers.

## Discovery / Audit Decisions 2026-05-24

- `pnpm pg:doctor` verde contra `efeonce-group:us-east4:greenhouse-pg-dev`; no hay migraciones requeridas.
- No se cambia sampling, fingerprint ni estado Sentry. El closeout queda post-deploy 24-48h.
- Access model sin cambios: `routeGroups`, `views`, `entitlements` y startup policy preservan semantica actual.
- Worktree en `develop` tiene WIP ajeno/previo; la implementacion debe stagear selectivamente y no revertir archivos no relacionados.
- Se descarta cache cross-request nuevo para V1: se reutiliza el TTL de Platform Health donde existe y se hace request fan-out dedupe/preload.

## Scope

### Slice 1 — Query inventory and baseline

- Mapear cada issue Sentry N+1 a route, reader y query repetida.
- Registrar baseline antes de cambios con issue IDs y conteo aproximado.

### Slice 2 — Request-scoped cache primitive

- Crear una primitiva liviana request-scoped para lecturas idempotentes dentro de server requests.
- No usar cache global salvo TTL e invalidacion justificados por dominio.

### Slice 3 — Admin health/integrations/views batching

- Reemplazar loops con readers agregados para health signals, integration status y view metadata.
- Preservar degradacion honesta si una lectura falla.

### Slice 4 — Payroll locale/read batching

- Agrupar lecturas repetidas en `/hr/payroll*`, especialmente locale/config comun.
- Asegurar que cambios de calendario/payroll no queden cacheados fuera de request.

### Slice 5 — Verification and Sentry closeout

- Tests focales de query count o mocks de reader.
- Post-deploy: validar caida en Sentry por 24-48h antes de resolver issues.

## Out of Scope

- Cambios visuales en dashboards admin/payroll.
- Cambios de schema salvo que el baseline demuestre que un indice additive es necesario.
- Cerrar issues Sentry antes de evidencia runtime.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3/4 -> Slice 5. No cerrar Sentry antes de Slice 5 post-deploy.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cache stale dentro de request larga | admin/payroll | low | cache request-scoped solamente | tests + Sentry perf |
| Reader agregado cambia semantica parcial | reliability | medium | preservar estados degraded por item | unit tests por reader |
| Aumento accidental de blast radius | platform | medium | PR pequeno por ruta si discovery lo exige | `pnpm test` focal + Sentry |

### Feature flags / cutover

Sin flag para refactors internos request-scoped y readers agregados. Si aparece un cambio de serving compartido o cache cross-request, agregar flag explicitamente antes de implementarlo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | doc-only | inmediato | si |
| 2 | revert PR | <10 min | si |
| 3 | revert PR o route-level reader fallback | <15 min | si |
| 4 | revert PR | <15 min | si |
| 5 | no runtime | inmediato | si |

### Production verification sequence

1. `pnpm pg:doctor`.
2. Tests focales de reliability/admin/payroll.
3. `pnpm lint`.
4. `pnpm build`.
5. Deploy.
6. Revisar Sentry performance 24-48h; solo entonces resolver issues que no recurran.

## Verification

- `pnpm exec vitest run <tests focales>`
- `pnpm lint`
- `pnpm build`
- Sentry performance post-deploy.

## Implementation Progress 2026-05-24

### Delivered locally

- `/admin/views`: `syncViewRegistryCatalog()` reemplaza el UPSERT por vista por un bulk upsert con `UNNEST`, dentro de la misma transaccion y preservando el deactivate de vistas removidas.
- `/admin/views`: `getAdminPersistedViewAccessGovernance()` resuelve acceso role/view una sola vez y deriva `roleAccess` + `roleAccessSource` desde el mismo resultado.
- Platform Health: `fetchAllSources()` reutiliza las promises de operations y synthetics y las entrega como preloaded sources a `getReliabilityOverview()` cuando estan sanas.
- Payroll projected: `fetchKpisForPeriod()` reemplaza el fallback live por-miembro por `computeMemberMetricsBatch()`, manteniendo materialized-first y missing-member accounting.

### Verification local

- `pnpm pg:doctor` -> green.
- `pnpm exec vitest run src/lib/admin/view-access-store.test.ts src/lib/platform-health/composer.test.ts src/lib/platform-health/composer-fetch.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts` -> 4 files / 13 tests passing.
- `pnpm exec vitest run src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/payroll/project-payroll.test.ts src/views/greenhouse/payroll/ProjectedPayrollView.test.tsx` -> 3 files / 23 tests passing.
- `pnpm exec tsc --noEmit` -> green.
- `pnpm lint` -> green.

### Pending before lifecycle complete

- Optional `pnpm build` if this remains the final integration batch on `develop`.
- Post-deploy Sentry performance review for 24-48h before resolving N+1 issues.

## Delta 2026-08-21 — El presupuesto del control plane se consume esperandose a si mismo

Diagnostico verificado en codigo durante la revision de los hallazgos de confiabilidad que `TASK-1432` (2026-07-18) y `TASK-1710` (2026-08-15) reportaron sin causa. Esta task es la dueña declarada de `src/lib/platform-health/**` y `src/lib/reliability/**`, asi que el trabajo entra aca como ampliacion de alcance y no como task nueva.

**El hallazgo.** `platform-health.v1` devuelve `overallStatus='unknown'` y `agentAutomationSafe=false` porque la fuente `reliability_control_plane` agota su presupuesto de 6000 ms. No es un query lento: es un error de composicion. En `src/lib/platform-health/composer.ts:273-291`, `withSourceTimeout` arranca el cronometro de 6000 ms y lo primero que ejecuta dentro es `await Promise.all([operationsPromise, syntheticsPromise])`, donde `operationsPromise` tiene presupuesto propio de 5000 ms (`:263-266`) y `syntheticsPromise` de 3000 ms (`:268-271`). Si `operations` tarda 4 s, al control plane le quedan menos de 2 s para ejecutar `getReliabilityOverview`, que es una cadena de 157 `await` de nivel superior estrictamente secuenciales (`src/lib/reliability/get-reliability-overview.ts:1455-2900`; `grep -c "      : await "` devuelve 157), cuyos primeros siete son red externa — BigQuery, API de Vercel, API de GitHub, Sentry via `hydrateDomainIncidents` (`:1462-1520`, `:2892-2909`). Es aritmeticamente imposible, no un problema de carga.

**Agravantes verificados.**

- El timeout no cancela al productor (`src/lib/platform-health/with-source-timeout.ts:53-56`): los ~19 s del overview se siguen pagando en PostgreSQL aunque el payload ya salio.
- El estado degradado se cachea 30 s (`src/lib/platform-health/cache.ts:21`, `composer.ts:382-384`), asi que la degradacion es pegajosa entre requests.
- El comentario del cache subestima el fan-out real: dice que el composer abre 7 source readers (`cache.ts:9`), cuando una de esas 7 fuentes son 157 readers en serie.
- `SourceResult` mide `durationMs` (`with-source-timeout.ts:28`, `:80`) pero `buildDegradedSourceList` no lo propaga (`composer.ts:232-255`) y `PlatformHealthDegradedSource` no tiene el campo (`src/types/platform-health.ts:77-82`). Por eso la pregunta "que reader consume el presupuesto" lleva un mes sin respuesta: no hay telemetria per-source en produccion.
- La cadena de consecuencia esta confirmada: timeout produce `value=null` -> `modules=[]` (`composer.ts:334`) -> `rollupOverallStatus([])` devuelve `'unknown'` (`:199-200`) -> `moduleByKey` devuelve `undefined` y los seis flags de `safe-modes.ts:62-116` colapsan juntos a `false`. El diseño fail-closed es correcto; el problema es que una fuente lenta produce el mismo veredicto que una plataforma caida, sin distinguirlos.

**Consecuencia operativa.** Ningun consumer en runtime ramifica sobre `safeModes` — el grep solo devuelve el tipo, el derivador y el esquema de salida de la tool MCP (`src/mcp/greenhouse/tools.ts:54`). El bloqueo es normativo, no mecanico: lo aplican los agentes por doctrina (`docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`). El daño real es que el preflight canonico lleva un mes emitiendo un veredicto indistinguible entre "plataforma rota" y "el compositor no alcanzo a leer", lo que entrena a operadores y agentes a ignorarlo. Ademas produce un bloqueo circular: `TASK-1710` se autobloquea con ese flag, asi que el programa que corregiria el timeout esta gobernado por el flag que el timeout mantiene en `false`.

**Alcance que se agrega a esta task.**

1. Sacar la espera de `operationsPromise` y `syntheticsPromise` de dentro del presupuesto de `reliability_control_plane`: resolverlas fuera y pasarlas ya materializadas a `produce()`, o dar al control plane un presupuesto que descuente el de sus dependencias. Recupera hasta 5 de los 6 segundos sin tocar un solo query.
2. Propagar `durationMs` por fuente a `degradedSources[]` y agregar medicion por reader dentro de `getReliabilityOverview`. Es aditivo al contrato de `platform-health.v1`, no breaking.
3. Paralelizar la cadena de 157 `await` en lotes con `Promise.allSettled`, preservando el manejo de error por señal para no perder la degradacion honesta. Esto ataca tambien los ~19 s del overview directo, que es el mismo endpoint que ya rompia el presupuesto de un smoke Playwright (`docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md:265`).

**Prohibido explicitamente.** Subir el presupuesto de 6000 ms para que el sintoma desaparezca. `TASK-1710` lo prohibe y con razon: enmascara la composicion incorrecta y deja los 19 s intactos.

**Nota de prioridad.** Esta task figura `P2` y su `Status real` dice implementacion directa en develop por override del operador del 2026-05-24, es decir cerca de tres meses sin cierre. El alcance que entra por este Delta es el unico camino declarado para restaurar un preflight interpretable, y `TASK-1432` ya la declaraba dependencia principal (referencia que `TASK-1710` perdio). Corresponde reevaluar la prioridad con el operador.

### Acceptance Criteria — Delta 2026-08-21

- [ ] `reliability_control_plane` deja de esperar `operationsPromise` y `syntheticsPromise` dentro de su propio presupuesto, verificado leyendo `composer.ts` y con test que fije la composicion.
- [ ] `GET /api/admin/platform-health` devuelve `overallStatus` distinto de `unknown` en staging, con `reliability_control_plane` ausente de `degradedSources[]`.
- [ ] `degradedSources[]` expone `durationMs` por fuente y el tipo `PlatformHealthDegradedSource` lo declara; el cambio es aditivo y no rompe consumers existentes.
- [ ] Existe medicion por reader dentro de `getReliabilityOverview` que permite nombrar cual consume mas presupuesto, y el resultado de la primera medicion queda registrado.
- [ ] La cadena de readers de nivel superior corre en lotes concurrentes y la degradacion honesta por señal se conserva: una señal que falla no tumba el resto.
- [ ] El presupuesto de 6000 ms no fue aumentado.
- [ ] `agentAutomationSafe` vuelve a `true` en staging cuando los modulos requeridos estan sanos, y sigue en `false` cuando alguno esta realmente en error — es decir, el flag vuelve a distinguir ambos casos.
- [ ] Latencia del overview directo medida antes y despues, con ambos numeros registrados.
- [ ] `TASK-1710` y `TASK-1432` reciben `Delta` indicando que el carril de control plane quedo cubierto por esta task.

### Corrección 2026-08-21 al Delta anterior — parte del trabajo ya está entregada

Al releer `## Implementation Progress 2026-05-24` de esta misma task, el punto 1 del Delta anterior queda mal descrito. Ese registro dice:

> *"Platform Health: `fetchAllSources()` reutiliza las promises de operations y synthetics y las entrega como preloaded sources a `getReliabilityOverview()` cuando estan sanas."*

Es correcto y está en el código: las promesas **se comparten**, no se piden dos veces. Esa mitad ya se hizo.

Lo que queda es más chico y más quirúrgico de lo que decía el Delta: **el cronómetro de 6000 ms de `reliability_control_plane` arranca antes de esperar esas promesas compartidas**. En `src/lib/platform-health/composer.ts:273-291`, `withSourceTimeout` inicia su presupuesto y lo primero que ejecuta dentro es `await Promise.all([operationsPromise, syntheticsPromise])`, cuyos presupuestos propios son 5000 ms y 3000 ms. El problema no es "se pide dos veces" — es **"el reloj corre mientras espero a otro"**.

Por lo tanto el arreglo no es reutilizar las promesas (ya está), sino **sacar la espera de dentro del presupuesto**: resolverlas antes de abrir el cronómetro del control plane y pasar los valores ya materializados, o descontar del presupuesto del control plane el de sus dependencias.

El resto del Delta anterior — la cadena de 157 `await` secuenciales, la falta de `durationMs` por fuente, y la prohibición de subir el timeout — se mantiene sin cambios.
