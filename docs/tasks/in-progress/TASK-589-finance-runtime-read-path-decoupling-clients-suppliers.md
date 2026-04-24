# TASK-589 — Finance Read Path Provisioning Decoupling & Directory Hardening

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
- Epic: `[optional EPIC-###]`
- Status real: `Verification`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-589-finance-read-path-provisioning-decoupling`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Corregir de forma estructural la deuda de `ensureFinanceInfrastructure()` en el runtime interactivo de Finance y cerrar los `500` visibles de `/finance/clients` y `/finance/suppliers` sin dejar el mismo problema vivo en otros `GET /api/finance/**`. La task no busca “tapar” los errores actuales, sino separar provisioning de runtime y endurecer los directorios operativos sobre contratos Postgres-canónicos.

## Why This Task Exists

Hoy el módulo Finance todavía arrastra dos deudas de arquitectura en su lane operativo:

- `GET /api/finance/clients` ejecuta `ensureFinanceInfrastructure()` antes de leer datos, y ese helper hace `CREATE TABLE` / `ALTER TABLE` en BigQuery dentro del request path. En staging ya explotó con `Job exceeded rate limits: Your table exceeded quota for table update operations.`
- `GET /api/finance/suppliers` depende de una query Postgres con expresiones `ARRAY_AGG(...)[1]` que ya fallaron live con `syntax error at or near "["`.
- Discovery confirmó además que el problema de `ensureFinanceInfrastructure()` no está aislado a `clients`: también aparece en otros `GET /api/finance/**` (`clients/[id]`, `suppliers` fallback, `suppliers/[id]` fallback, dashboards, summaries, `expenses/meta`, etc.), lo que convierte esta deuda en un patrón transversal del módulo.

Ambos problemas son distintos en superficie, pero comparten la misma deuda de fondo: el read path de Finance mezcla infraestructura, fallback legacy y composición de directorios operativos en lugares donde debería existir un contrato Postgres-canónico, explícito y testeable.

## Goal

- Sacar todo provisioning y DDL de BigQuery fuera de los `GET /api/finance/**` interactivos.
- Convertir `clients` y `suppliers` en directorios operativos apoyados en read models canónicos de PostgreSQL.
- Dejar un boundary reusable para que el resto de los read paths Finance consuman readiness/fallback sin volver a invocar DDL en runtime.
- Dejar BigQuery como soporte analítico / compatibilidad transicional, no como dependencia implícita del runtime principal de Finance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- ningun `GET /api/finance/**` puede ejecutar provisioning, DDL o bootstrap de infraestructura como side effect
- `greenhouse_finance` y `greenhouse_core` son el runtime operacional canónico; BigQuery queda para analytics, backfills o compatibilidad explícita
- cualquier fallback legacy debe ser observable, clasificado y fail-safe; nunca silencioso ni acoplado a mutaciones infra
- los directorios operativos deben mantener tenant isolation y filtrar por `space_id` o contexto canónico equivalente
- si se crean proyecciones o vistas de lectura, deben vivir en dominio Finance y no recomputar inline reglas complejas por handler
- la remediación debe aplicarse como patrón shared del módulo, no como fix aislado solo en una route

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/finance/ciclo-de-vida-party-comercial.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-050-finance-client-canonical-runtime-cutover.md`
- `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/suppliers/route.ts`
- `src/app/api/finance/suppliers/[id]/route.ts`
- `src/app/api/finance/dashboard/aging/route.ts`
- `src/app/api/finance/dashboard/summary/route.ts`
- `src/app/api/finance/dashboard/cashflow/route.ts`
- `src/app/api/finance/dashboard/by-service-line/route.ts`
- `src/app/api/finance/income/summary/route.ts`
- `src/app/api/finance/expenses/summary/route.ts`
- `src/app/api/finance/expenses/meta/route.ts`
- `src/lib/finance/schema.ts`
- `src/lib/finance/postgres-store.ts`
- `docs/architecture/schema-snapshot-baseline.sql`

### Blocks / Impacts

- estabilidad de `/finance/clients`
- estabilidad de `/finance/suppliers`
- estabilidad de dashboards y summaries Finance que hoy todavía dependen de `ensureFinanceInfrastructure()`
- follow-ups de observabilidad y hardening del módulo Finance
- cualquier lane que siga asumiendo que `ensureFinanceInfrastructure()` puede correrse dentro de requests interactivos

### Files owned

- `docs/tasks/in-progress/TASK-589-finance-runtime-read-path-decoupling-clients-suppliers.md`
- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/suppliers/route.ts`
- `src/app/api/finance/suppliers/[id]/route.ts`
- `src/app/api/finance/dashboard/**`
- `src/app/api/finance/*/summary/**`
- `src/app/api/finance/expenses/meta/route.ts`
- `src/lib/finance/schema.ts`
- `src/lib/finance/postgres-store.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/`

## Current Repo State

### Already exists

- `TASK-050` ya movió `Finance Clients` a un baseline Postgres-first y dejó BigQuery como fallback explícito, no como source of truth principal.
- `TASK-166` ya formalizó el cutover de writes Finance hacia PostgreSQL y declaró que los remanentes reales estaban en read paths/hydration.
- `GET /api/finance/clients` y `GET /api/finance/suppliers` ya tienen carriles Postgres-first implementados.
- `project_context.md` ya documenta que:
  - `GET /api/finance/clients` y detail resuelven `client_id` canónico y contactos preferentemente desde memberships / org canónica
  - `suppliers` create/update ya siembran memberships y usan `primary_contact_*` como cache transicional

### Gap

- `clients` sigue acoplando el read path a `ensureFinanceInfrastructure()` y por eso puede caer por cuota de updates de tabla en BigQuery aunque el problema sea solo una lectura.
- `suppliers` sigue dependiendo de una query SQL frágil para resolver contacto principal y conteos.
- varios otros `GET /api/finance/**` siguen usando `ensureFinanceInfrastructure()` como preflight o fallback mutante, así que arreglar solo `clients`/`suppliers` dejaría la raíz viva en el módulo.
- el módulo todavía no separa claramente:
  - provisioning infra
  - runtime readiness
  - read models operativos

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

### Slice 1 — Boundary shared: provisioning vs runtime

- dividir el contrato actual de `ensureFinanceInfrastructure()` en carriles separados:
  - provisioning / bootstrap con permiso de DDL
  - runtime readiness read-only para requests interactivos
- introducir un boundary reusable (`assert/readiness` vs `provision/bootstrap`) para el módulo Finance
- eliminar la ejecución de DDL BigQuery desde todos los `GET /api/finance/**` que hoy dependan de `ensureFinanceInfrastructure()`
- dejar el carril de provisioning explícito y operable fuera del request path (deploy, admin action o worker dedicado según Discovery)

### Slice 2 — Read model canónico de Clients

- consolidar `clients` sobre un reader Postgres-canónico que no dependa de bootstrap infra ni de fallback BigQuery silencioso
- si Discovery confirma que hace falta una vista/proyección específica (`v_client_directory` o equivalente), crearla y mover el endpoint a ese contrato
- preservar filtros, paginación, métricas básicas y enrichments operativos sin reintroducir identidad paralela

### Slice 3 — Read model canónico de Suppliers

- reemplazar el patrón SQL frágil de `ARRAY_AGG(...)[1]` por selección explícita del contacto primario / mejor contacto usando `row_number()` o `ORDER BY ... LIMIT 1`
- si Discovery lo justifica, encapsular la lectura en un reader o vista canónica (`v_supplier_directory` o equivalente)
- mantener el contrato funcional actual de la lista/detail sin depender de sintaxis ambigua o difícil de optimizar

### Slice 4 — Adopción transversal en read paths Finance

- aplicar el boundary nuevo a los otros `GET /api/finance/**` que hoy siguen invocando `ensureFinanceInfrastructure()`
- priorizar rutas ya en producción/staging con mayor visibilidad operativa: dashboards, summaries y `expenses/meta`
- preservar compatibilidad funcional y fallback explícito donde todavía sea necesario BigQuery

### Slice 5 — Observabilidad y tests de no-regresión

- agregar tests de integración para los readers de `clients` y `suppliers`
- agregar guardas que comprueben que los `GET` críticos no ejecutan DDL
- instrumentar errores/fallbacks para distinguir:
  - runtime data/read failure
  - infra readiness failure
  - fallback legacy explícito

## Out of Scope

- rediseñar la UI de `/finance/clients` o `/finance/suppliers`
- reabrir el write cutover de `TASK-166`
- convertir todo Finance a “sin BigQuery” en una sola pasada
- arreglar bugs funcionales de Finance no relacionados con provisioning en runtime o con el SQL frágil de suppliers
- mezclar esta lane con observabilidad cloud o billing export

## Detailed Spec

La corrección robusta esperada es:

1. **Sacar el DDL del runtime interactivo**
   - `ensureFinanceInfrastructure()` no puede seguir ejecutándose como preflight de lectura.
   - El runtime debería consumir un `assertFinanceReadiness()` o equivalente que lea estado, no que mutile tablas.
   - El patrón debe ser reusable para el resto del módulo, no una excepción puntual de `clients`.

2. **Tratar `clients` como directorio operativo, no analítico**
   - La lista de clientes debe resolverse desde el grafo canónico (`greenhouse_core`, `greenhouse_finance`, `greenhouse_crm`) y/o desde una proyección Postgres estable.
   - BigQuery puede seguir existiendo como soporte transicional, pero no como bootstrap obligatorio del request.

3. **Tratar `suppliers` como directorio operativo con contacto principal explícito**
   - La selección de contacto principal debe expresarse con SQL clara y portable.
   - No se debe depender de indexación sobre agregados para resolver un contacto líder.

4. **Formalizar el boundary**
   - provisioning infra
   - readiness runtime
   - readers operativos
   - fallback legacy explícito

5. **Absorber los demás GET afectados**
   - La task debe remover el uso runtime de `ensureFinanceInfrastructure()` donde hoy sigue vivo en reads de Finance con visibilidad real.
   - Si alguna surface todavía requiere BigQuery, debe usar un guard read-only y un fallback explícito, nunca DDL en request.

6. **Actualizar documentación**
   - la arquitectura Finance debe dejar claro que los reads operativos no corren DDL
   - la documentación funcional del módulo debe reflejar el contrato nuevo si cambia el comportamiento visible o las dependencias operativas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ya no ejecutan DDL ni provisioning BigQuery en request time
- [ ] `GET /api/finance/suppliers` y `GET /api/finance/suppliers/[id]` dejan de depender de la sintaxis frágil `ARRAY_AGG(...)[1]`
- [ ] los demás `GET /api/finance/**` afectados por `ensureFinanceInfrastructure()` quedan migrados al boundary read-only nuevo o documentados explícitamente como follow-up si Discovery demuestra que uno es bloqueante por razones mayores
- [ ] existe un reader / read model canónico para `clients` y otro para `suppliers`, o Discovery documenta por qué uno de ellos reutiliza suficientemente un reader existente
- [ ] el fallback legacy, si persiste, queda explícito, observable y separado del path principal
- [ ] existen tests que cubren la no-regresión de ambos endpoints y previenen volver a ejecutar provisioning en `GET`
- [ ] la documentación técnica y funcional relevante queda sincronizada con el nuevo boundary

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual o preview de:
  - `/finance/clients`
  - `/finance/suppliers`
  - `GET /api/finance/clients`
  - `GET /api/finance/suppliers`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedó documentado dónde vive el carril de provisioning Finance y cómo se opera sin pasar por requests interactivos

## Follow-ups

- evaluar si otras rutas `GET /api/finance/**` siguen llamando `ensureFinanceInfrastructure()` y deben absorber el mismo boundary
- si Discovery encuentra que el problema es transversal, considerar un programa corto de hardening para read paths operativos de Finance

## Open Questions

- qué carril operativo debe ser el owner definitivo del provisioning Finance: deploy hook, admin action protegida u `ops-worker`
- si conviene materializar `v_client_directory` / `v_supplier_directory` como vistas SQL, readers Kysely o proyecciones persistidas según costo y frecuencia real de uso
