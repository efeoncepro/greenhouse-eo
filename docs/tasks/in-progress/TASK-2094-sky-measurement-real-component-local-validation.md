# TASK-2094 — SKY: contrato de medición y validación local con componentes reales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-057`
- Status real: `204 pruebas locales PASS; recomendación técnica B por permisos/Finance/routing/historia; integración integral y aceptación ADR pendientes`
- Rank: `2094`
- Domain: `identity|data|insights`
- Blocked by: `TASK-2096–2101 y preparación local TASK-2102 para certificación M4; consumers por hito en EPIC-057. Baseline 204 casos ya entregado, sin bloqueo retroactivo.`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`

## Summary

Formaliza el contrato candidato del Blog y ejercita componentes reales sobre PostgreSQL efímero y fixtures
sintéticas para comparar A′/B. Distingue caracterización de defectos actuales, pruebas del contrato candidato
y evidencia pendiente. No implementa el split productivo ni duplica las dueñas de scope/reporting.

## Why This Task Exists

TASK-2073 compara un modelo en memoria. La revisión de seis frentes encontró contratos no ejercitados:
sesión real, Finance, scope por host, calidad por fuente y corrida AEO nativa. Se necesita evidencia integrada.

## Goal

- Contrato Blog verificable: GA4, GSC y AEO nativo por host/ventana/calidad.
- Ejecutar readers/commands reales y SQL actual con fixtures idénticos A′/B.
- Registrar decisión posible, bloqueos y límites sin afirmar rollout o historia real certificada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

ADR Proposed; Organization/Spaces/Service separados. DB local efímera no sustituye migrations autorizadas.

## Normative Docs

- `docs/audits/client-portal/2026-11-01-sky-deep-review/README.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Discovery c618bc662; autorización del operador de avanzar contrato y pruebas locales, sin producción.

### Blocks / Impacts

- TASK-2033/1960 conservan scope e informe por Servicio; TASK-1852 conserva enablement.
- TASK-2073 permanece complete; esta unidad sustituye el tipo de evidencia, no reabre su simulador.

### Files owned

- `scripts/experiments/sky-measurement-bridge/`
- Contrato técnico Blog y auditoría local bajo `docs/architecture/` y `docs/audits/client-portal/`.
- Esta task, plan e índices acotados; skills Insights espejo sólo para continuidad local.

## Current Repo State

### Already exists

- `src/lib/tenant/identity-store.ts` y `scripts/setup-postgres-identity-v2.sql`.
- `src/lib/finance/canonical.ts`, `src/lib/services/upsert-service-from-hubspot.ts`.
- `src/lib/efeonce-insights/adapters/aeo-adapter.ts`, `src/lib/growth/seo/content-scope/contracts.ts`.

### Gap

SQL, callbacks, permisos/contexto candidato, P&L y writer de proyectos ya ejercitados localmente; ICO sólo a nivel de llamadas. Integración HTTP/UI, concurrencia, delivery e historia integrales pendientes. La validación editorial por módulo no garantiza
las tres fuentes requeridas; scope v1 ignora host. Propiedad histórica y distribución siguen sin certificar.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/experiments/sky-measurement-bridge/`, fuera de consumers runtime.
- Future candidate home: `remain-shared`
- Boundary: pruebas locales de primitives existentes y contrato candidato; sin API nueva.
- Server/browser split: Node local, nunca browser ni Next entrypoint.
- Build impact: `none`; reutiliza Vitest/TypeScript/pg existentes, sin paquetes nuevos.
- Extraction blocker: implementación futura de grants, ownership y adapters por sus dueñas.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`, prueba aislada de semántica sensible, no cambio runtime.
- Impacto principal: `reader`, commands y vistas reales ejercitados localmente.
- Source of truth afectado: ninguno compartido; fixtures y cluster efímero exclusivo.
- Consumidores afectados: operador y tasks dueñas.
- Runtime target: `local`.

### Contract surface

- Contrato existente a respetar: owners nombrados en Current Repo State.
- Contrato nuevo o modificado: receipts/gate Blog candidato bajo experiments; nunca importado por src.
- Backward compatibility: compatible; los imports de producción no cambian.
- Full API parity: no nueva capability; harness CLI local consume primitives existentes.

### Data model and invariants

- Entidades/tablas/views afectadas: copia mínima sintética de greenhouse_core/finance/serving en PG local.
- Invariantes: datos inventados; misma batería A′/B; preservar hash de filas históricas control.
- Write-target allowlist: sólo cluster privado validado por socket/data_directory; ninguna DB compartida.
- Tenant/space boundary: probar Organization/Space/client/grants sin introducir bypass en src.
- Idempotency/concurrency: replay real donde exista; ausencia de pruebas de locks declarada.
- Audit/outbox/history: stubs de transporte explícitos, fixtures locales; no emisión externa.

### Migration, backfill and rollout

- Migration posture: `none` fuera del cluster efímero; no archivos en migrations ni ejecución migrate.
- Default state: ejecución manual local, sin flags productivos.
- Backfill plan: ninguno; no copiar datos de SKY.
- Rollback path: detener y retirar sólo cluster efímero creado por runner; preservar evidencia.
- External coordination: ninguna; ADR/provisioning futuros separados.

### Security and access

- Auth/access gate: fixtures, sin sesiones reales; red externa denegada por sandbox.
- Sensitive data posture: entorno saneado y sin lectura de .env/credenciales.
- Error contract: fallar ante destino no local; logs sólo sintéticos.
- Abuse/rate-limit posture: sin endpoint; runner y suite acotados.

### Runtime evidence

- Local checks: Vitest propio; tsc y lint focal; manifests de componentes y límites.
- DB/runtime checks: PG16 por socket único, data_directory verificado, stop en finally.
- Integration checks: SQL/commands reales; proveedores/transportes sustituidos explícitamente.
- Reliability signals/logs: recibo local de tests; no señales productivas.
- Production verification sequence: excluida; no production runtime impact.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->
<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato y entorno

- Contrato candidato Blog y runner saneado con PG16 efímero.

### Slice 2 — Componentes reales

- Casos A′/B sobre sesión SQL, Finance y Services; scope/adapter/generation AEO reales.
- Batería adversarial del contrato de medición y evidencia de regresiones existentes.

### Slice 3 — Evaluación

- Matriz observada, límites y decisión del bridge condicionada a evidencia suficiente.

## Out of Scope

- Producción, staging compartido, credenciales, datos de SKY, deploy/push, envíos o corridas pagadas.
- Cambiar runtime, crear Spaces/client reales, reatribuir Diseño, aceptar ADR por inferencia.
- Declarar 59 escenarios aprobados sin ejecutarlos; inventar semántica Google mediante mocks.

## Detailed Spec

Comparar dos Spaces con client compartido y con bridge hijo, alternando metadata y replays. Cargar la vista
session_360 desde SQL versionado y ejecutar resolver Finance/upsert Services existentes. Inputs sintéticos;
mantener la lógica bajo prueba y sustituir sólo proveedores/transporte. Medición exige receipts por productor
actual con población/calidad verificadas; AEO conserva observaciones desconocidas y panel completo.

## Rollout Plan & Risk Matrix

Repo-only, no production runtime impact. No aplicar SQL a la instancia compartida.

### Slice ordering hard rule

Contrato/aislamiento → pruebas → evidencia. Ninguna prueba activa flags ni provisioning.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Conexión externa accidental | DB/proveedores | low | env saneado, socket exacto, sandbox sin red IP | fallo del runner |
| Falso PASS por mocks | Arquitectura | medium | listar lógica real y stubs, negativos y controles | evidencia insuficiente |
| WIP ajeno | Repo | medium | paths propios y commit acotado | git diff |

### Feature flags / cutover

Sin flags ni cutover. Contrato candidato permanece fuera del runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | Retirar documento/tooling local | minutos | sí |
| 2 | Stop del cluster privado en finally | segundos | sí |
| 3 | Corregir recibo conservando procedencia | minutos | sí |

### Production verification sequence

No se ejecuta en esta unidad local; la apertura real tiene gates independientes.

### Out-of-band coordination required

Ninguna, repo-only. Elección definitiva/rollout después de evidencia suficiente y aceptación explícita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] EPIC-057 M4: integrar contratos locales TASK-2096–2102 y slices multi-Space de TASK-2033/1960/1848/1849/1853/1854; pruebas HTTP/API/MCP/cache/export y GVC de sus dueñas, sin duplicar implementación.
- [ ] Matriz integral enlaza cada caso con evidencia: grants/refresh concurrente/revocación durante write, bindings/replay/batch parcial, allocations, historia as-of/recuperación y tres productores; motor ICO real aislado distinto de mock de llamadas.
- [ ] Manifest habilitable distingue capacidades verificadas, cerradas y fuentes/ventanas incompletas; briefs1855/1856 sólo obligatorios si se abren. Entregar a TASK-1852 sin autorizar canary real ni exigir cierre total de su foundation.
- [ ] El harness carga `session_360` desde la migración vigente (hoy TASK-987), no desde `scripts/setup-postgres-identity-v2.sql`; los casos de sesión del 01-11 se reejecutan contra esa vista y se registra la diferencia.

- [x] Contrato nombra host, producer, binding, periodo, calidad, comparación y cero observado.
- [x] Runner impide red externa y conexiones compartidas; PG16 efímero se detiene tras la prueba.
- [x] Componentes actuales de identidad/Finance/Services ejecutados contra PostgreSQL real para A′/B.
- [x] Scope/reducers/adapter/generation reales ejercitados, sin sustituir lógica bajo prueba.
- [x] Gate candidato rechaza fuentes ausentes, referrals como AEO y hechos sólo comparativos.
- [x] Source of truth, acceso, idempotencia, errores, historia y rollback explícitos; sin schema runtime nuevo.
- [x] Matriz separa resultados actuales, contrato candidato y pruebas pendientes; elección sólo si evidencia basta.

- [x] Usuarios Diseño/SEO/dual, revocación y renovación ejecutados con lógica real y contexto candidato en PG local; 78 casos y límites en auditoría.
- [x] Recomendación técnica B sustentada en comparación local: trigger de allocations, P&L, reparto, writer Notion y reconstrucción histórica; 37 casos nuevos.
- [ ] Decisión definitiva sustentada por integración de autoridad, ownership e historia completos; HTTP/UI, concurrencia, motor ICO y distribución aún sin certificar. No confundir con la recomendación local B ya emitida.

Evidencia de los criterios marcados: [evaluación y recibo](../../audits/client-portal/2026-11-01-sky-real-component-validation/README.md).
Se cumplen sólo en el alcance sintético declarado; ningún criterio marcado acredita rollout o historia real.

## Verification

- `node scripts/experiments/sky-measurement-bridge/run-local.mjs`
- `pnpm task:lint --task TASK-2094`
- `node scripts/experiments/sky-measurement-bridge/check-types.mjs`
- ESLint focal del tooling y cierre documental focal.

## Avance 2026-11-01

Primer incremento `149aed558`: 89 pruebas. Incremento autorizado de permisos/contexto: **167/167 PASS**,
78 nuevas (39 A′ y 39 B), App sessions/callbacks cookie/listado Insights reales y contexto candidato SQL.
[Auditoría y límites](../../audits/client-portal/2026-11-01-sky-space-context-validation/README.md).
Typecheck focal con ampliación NextAuth: 0 diagnósticos incluyendo dependencias importadas (corrige el checker
anterior sin esa ampliación; no es typecheck global). No acepta bridge ni corrige src. Próximo: owner/routing de
writers y preservación histórica; HTTP/UI/refresh concurrente/issuer quedan explícitamente pendientes.

Incremento posterior autorizado «Ok vamos»: **204/204 PASS**, 37 nuevas (20 Finance/PG, 14 writer Notion/PG,
3 ICO/puerto SQL simulado). [Evidencia, recomendación y límites](../../audits/client-portal/2026-11-01-sky-finance-routing-validation/README.md).
Se recomienda B; A′ exigiría normalización financiera adicional sin ventaja demostrada de permisos.
Se preservan períodos previos al calcular el nuevo y se prueba rollback real, pero un rebuild histórico
usa actividad actual y el writer acepta reasignación/replay antiguo. Próximo: U01 contexto en ruta/reader
real local, seguido por bindings y protección temporal; no otro discovery general. No cambia src/producción.

## Closing Protocol

- [x] Status real y checkboxes reflejan evidencia, sin fingir rollout.
- [x] Task/registry/README/handoff sincronizados.
- [x] Contrato, manual local y evaluación enlazados; dueñas existentes conservadas.
- [x] Commits sólo propios, sin push ni modificaciones de historia de Diseño.

Gates: task lint 0 errores/0 warnings; ESLint y sintaxis PASS; ops lint sin errores con 15 advertencias
de epics ajenos. Closure focal con 2 advertencias revisadas. Context strict global conserva 3 excesos
preexistentes; [dictamen actualizado](../../audits/client-portal/2026-11-01-sky-space-context-validation/QA.md).

Corte Finance/routing posterior: typecheck/lint/task PASS; ops sin errores con 17 warnings ajenos.
Context strict pasa tras rotaciones de otros agentes. [QA actual](../../audits/client-portal/2026-11-01-sky-finance-routing-validation/QA.md)
registra alcance, gates y continuidad de bitácoras en el checkout compartido. Los recibos anteriores no cambian.

## Follow-ups

TASK-2033/1960 implementan scope/reporting; foundations Identity/Services/Finance según ADR.
Las pruebas faltantes de la matriz de seis frentes permanecen visibles y bloquean aceptación no sustentada.

## Delta 2026-11-06 — Adscripción a EPIC-057

[EPIC-057](../../epics/in-progress/EPIC-057-operational-accounts-under-organization.md) coordina el trabajo.
Los 204 casos del 01-11 siguen siendo el baseline, sin nueva corrida ni cambio de recibos. Las nuevas tasks
implementan contratos; esta task conserva verificación integral local y decisión sustentada. No se crea otra
QA duplicada. El baseline permite iniciar foundations sin esperar el cierre final de esta misma task.

## Delta 2026-11-06 — Revisión contra código

[Revisión del programa](../../audits/client-portal/2026-11-06-operational-accounts-code-review/README.md): un revisor
reejecutó `run-local.mjs` (204 PASS, mismos siete archivos). Hallazgo H1: `run-local.mjs:46-50` toma la vista de
sesión del script de setup, que ordena por `updated_at`; la vigente devuelve una fila por Space y la resolución
toma la primera sin orden. Las conclusiones de sesión del 01-11 describen esa vista antigua. Se agrega el criterio.
