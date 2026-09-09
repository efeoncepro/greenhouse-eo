# TASK-1853 — Lectura cliente de servicios, avance y métricas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Epic: `EPIC-046`
- Status real: `Diseño registrado por autorización del operador 2026-09-09; sin implementación ni rollout`
- Rank: `2`
- Domain: `platform|data|delivery`
- Blocked by: `TASK-1852`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega un contrato de lectura permitido por organización, servicio y período para avance, piezas, estados y métricas existentes. Los productores conservan datos/fórmulas; el BFF compone la proyección cliente y Efeonce Insights consume los mismos productores.

## Why This Task Exists

Los datos de Commercial, Delivery e ICO existen en superficies distintas y no equivalen aún a un resumen del servicio entendible y seguro para el cliente. No hay evidencia para inventar cuotas, SLA o equivalencias entre piezas principales y derivados.

## Goal

- Materializar P02 de EPIC-046 con ownership acotado y evidencia por cuenta.
- Reader por servicio/período con lista de piezas, estado canónico, fuente, asOf, unidad, cobertura, comparativo válido y valores nullable. DTO browser-safe separado de stores.
- Cerrar con documentación, pruebas, runtime y rollback propios; crear esta task no activa el servicio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md` — decisión aceptada, EPIC-046.
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` y `agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` bajo docs/architecture.
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§7.1/9.1: audiencias, canales y deep links.
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` — identidad no concede módulos.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

Reglas: BFF hoja, productores como SoT, autorización server-side por objeto, no import de stores en browser ni nuevo sender/Pool. No hardcode de cuenta en reglas de producto.

## Normative Docs

- `docs/epics/to-do/EPIC-046-client-services-visibility-and-self-service.md`.
- `docs/context/00_INDEX.md`, `docs/context/10_experiencia-cliente.md` y `docs/context/05_voz-tono-estilo.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md` para entrada/retorno; no adquirir su ownership.
- Skills: greenhouse-task-planner y greenhouse-documentation-governor; al implementar, skill de dominio y greenhouse-qa-release-auditor.

## Dependencies & Impact

### Depends on

TASK-1852 fija scope/fuentes; TASK-1690 conserva SEO; TASK-1106 conserva métricas Account 360. TASK-1845 coordina evidencia Insights, sin import inverso desde BFF.

### Blocks / Impacts

TASK-1854 y TASK-1855; adapters Insights TASK-1845; el dashboard y la edición comparten hechos con cortes distintos.

### Files owned

- src/lib/client-portal/readers/curated/ y dto/ (proyección del servicio)
- src/lib/delivery/ (reader service-progress propuesto, sólo si falta reader productor)
- src/app/api/client-portal/ (adapter fino)
- src/mcp/greenhouse/ (registro de reader cuando corresponda, serializado)

## Current Repo State

### Already exists

- `src/lib/client-portal/readers/curated/account-summary.ts`
- `src/lib/client-portal/readers/curated/ico-overview.ts`
- `src/lib/account-360/facets/delivery.ts`
- `src/lib/agency/space-360.ts`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/delivery/task-status-canonical.ts`

### Gap

Los datos de Commercial, Delivery e ICO existen en superficies distintas y no equivalen aún a un resumen del servicio entendible y seguro para el cliente. No hay evidencia para inventar cuotas, SLA o equivalencias entre piezas principales y derivados.

Baseline de código y documentos de esta planificación; flags, datos y entrega productiva se verifican al ejecutar, no se infieren del epic.

## Modular Placement Contract

- Topology impact: `api`
- Current home: src/lib/delivery/ como productor y src/lib/client-portal/ como BFF hoja.
- Future candidate home: `remain-shared`
- Boundary: Reader por servicio/período con lista de piezas, estado canónico, fuente, asOf, unidad, cobertura, comparativo válido y valores nullable. DTO browser-safe separado de stores.
- Server/browser split: DTO tipado browser-safe; stores, policy, secretos y providers sólo server-side.
- Build impact: sin dependencias pesadas previstas; no nuevo runtime ni imports globales. Cualquier dependencia nueva requiere mapping de consumidores.
- Extraction blocker: sesión/autorización y productores compartidos; no crear apps/packages ni repartir transacciones por red.


## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: Commercial/Account 360, Delivery y readers ICO; fuentes sincronizadas canónicas, sin store duplicado de métricas.
- Consumidores afectados: UI/API/MCP/Nexa; worker sólo para efectos async autorizados.
- Runtime target: local, staging y production; worker reactivo existente si hay eventos.

### Contract surface

- Contrato existente a respetar: src/lib/client-portal/readers/curated/account-summary.ts y ADR EPIC-046.
- Contrato nuevo o modificado: Reader por servicio/período con lista de piezas, estado canónico, fuente, asOf, unidad, cobertura, comparativo válido y valores nullable. DTO browser-safe separado de stores.
- Backward compatibility: gated/aditivo; no cambiar el DTO consumido sin versionar o adaptar.
- Full API parity: commands/readers únicos; App/Ecosystem API y MCP son adapters, no implementaciones paralelas.

### Data model and invariants

- Entidades/tablas/views afectadas: Commercial/Account 360, Delivery y readers ICO; fuentes sincronizadas canónicas, sin store duplicado de métricas.
- Invariantes que no se pueden romper: aislamiento organización/objeto, contrato distinto de permiso y ausencia distinta de cero; no import inverso desde BFF.
- Write-target allowlist: declarar y justificar toda tabla nueva en boundary test del dominio si existe; read-only no escribe ni habilita módulos.
- Tenant/space boundary: organización y scope desde principal/contexto canónico y target revalidado; rechazar IDs arbitrarios.
- Idempotency/concurrency: reads sin efectos; writes usan key estable y versión esperada/transaction; retry nunca repite efecto externo ya confirmado.
- Audit/outbox/history: writes e intención durable se correlacionan; no evento por simple GET; logs sanitizados.

### Migration, backfill and rollout

- Migration posture: none prevista; reutilizar stores existentes.
- Default state: read-only/disabled para capacidad nueva; acceso existente preservado.
- Backfill plan: no masivo. Si hace falta, preview por allowlist y evidencia/compensación antes de apply.
- Rollback path: deshabilitar nuevo consumer/capacidad, compensar sólo writes propios con commands y preservar audit.
- External coordination: runtime de fuentes, invitaciones/piloto y canales según TASK-1852; no nueva plataforma.

### Security and access

- Auth/access gate: sesión válida + entitlements/acción/scope del primitive; cliente no recibe autoridad por rol, URL o token issuer.
- Sensitive data posture: DTO mínimo sin secretos, costos, datos laborales ni contenido interno; adjuntos privados por objeto.
- Error contract: errores canónicos del dominio, sin raw errors; context_required/denied sin enumeración.
- Abuse/rate-limit posture: paginación/límites por actor/organización; writes con replay guard, sin refresh facturable implícito.

### Runtime evidence

- Local checks: tests focales de autorización, datos y concurrencia; lint/typecheck proporcionales.
- DB/runtime checks: pnpm test:live serializado y readback de filas/audit/reader, sin export global de env.
- Integration checks: API/MCP mismos resultados; provider/worker sólo cuando participen en el efecto.
- Reliability signals/logs: errores/frescura/correlación del dominio; registrar señal nueva antes de afirmar que existe.
- Production verification sequence: la secuencia del Rollout Plan es obligatoria y por cuenta.

### Acceptance criteria additions

- [ ] SoT y consumers verificados; allowlist de escritura actualizada si existe y cada tabla nueva justificada.
- [ ] Migración/rollback y negativos de acceso/tenant probados contra runtime cuando aplique.
- [ ] UI/API/MCP/Nexa operan el mismo primitive con errores y permisos idénticos; manifests/docs/manuals actualizados.
- [ ] Audit/outbox e idempotencia verificados para writes; lectura no produce cambios ni mensajes.


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

### Slice 1 — Contrato y productores

- Fijar mapping del servicio a fuente/piezas/período; reutilizar readers productores y extenderlos sólo en el campo faltante. Separar principal, derivado y subtarea antes de contar.

### Slice 2 — Proyección autorizada y paridad

- Construir reader y DTO cliente con filtros de organización/servicio en servidor, límites/paginación y metadatos; adapters API/MCP sobre el mismo primitive. Ningún costo/margen/dato laboral cruza.

### Slice 3 — Conciliación y disponibilidad

- Comparar muestras de ambas cuentas contra fuentes; cubrir ausencia, cero, degradación y falta de contrato. Verificar latencia, negativos de acceso y fechas; documentar contratos funcionales y de agente.

## Out of Scope

- Nueva fórmula ICO/SEO, scorecard standalone TASK-295, BCS TASK-291, UI, cambios comerciales, cálculo de ROI o generación de informes.
- Sin commit/push/deploy, cambios live ni envíos como consecuencia de registrar la task. Subagentes y cambios de rama no autorizados.

## Detailed Spec

Commercial/Account 360, Delivery y readers ICO; fuentes sincronizadas canónicas, sin store duplicado de métricas.

Reader por servicio/período con lista de piezas, estado canónico, fuente, asOf, unidad, cobertura, comparativo válido y valores nullable. DTO browser-safe separado de stores.

Los paths marcados propuestos son diseño, no código existente. Discovery debe verificar API/DDL/rutas y resolver ownership antes de implementar; una ampliación material vuelve al ADR/plan. Esta task es P02, no un cambio de prioridad de otras dueñas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. Contrato/negativos antes de habilitación; staging/fixture técnico antes de piloto cliente autorizado. Dependencias condicionales se evalúan por superficie, sin bloquear el trabajo independiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Acceso o dato de otra cuenta | identity/portal | medium | Scope de servidor y prueba positiva/negativa por objeto | Denegación y correlación sanitizada; sin payload sensible |
| Estado o entrega anunciado sin evidencia | delivery/UI | medium | Estado canónico, revisión de fuente y readback por canal | Error/degradación explícitos y log del dominio |
| Duplicación durante retry/cutover | commands/notifications | medium | Idempotencia y un owner por efecto; UI no repite writes | Audit de conflicto/duplicado |

### Feature flags / cutover

Rollout por cohorte/módulo existente; no inventar nombres de flags activos. Toda capacidad nueva comienza deshabilitada o sólo lectura hasta evidencias. Si se necesita flag nueva, declararla en ledger antes del apply. TASK-1834 controla de forma independiente login legacy/nativo/recovery.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Retirar contrato nuevo no consumido; conservar baseline y evidencia | Una revisión | sí |
| 2 | Deshabilitar capacidad/cohorte nueva; restaurar consumer anterior. En writes, compensar con command y versión auditada, sin borrar historial | Medir y registrar en ensayo previo | parcial si hubo efecto externo |
| 3 | Pausar expansión y canal/schedule afectado; conservar entregas y evidencia, no reenviar automáticamente | Medir y registrar en ensayo previo | parcial; correo recibido no se revoca |

### Production verification sequence

1. Verificar contratos, dependencias y estado real de cohortes contra runtime; dry-run antes de writes.
2. Local/staging con fixture técnico y todos los negativos; verificar DB/worker cuando cambien.
3. Ensayar recuperación/rollback y registrar su comando exacto antes de mutaciones productivas.
4. Piloto autorizado por cuenta; leer resultado funcional, API y logs/ledger del runtime dueño.
5. Expandir sólo tras evidencia; mantener abierta si rollout, datos o canales siguen pendientes.

### Out-of-band coordination required

Fuentes de Berel/Sky, responsables, consentimiento de piloto y disponibilidad Teamsbot según matriz TASK-1852. No solicitar credenciales nuevas para suplir una integración inexistente. El registro documental no autoriza mensajes, invitaciones o cambios de proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Muestras de piezas/estados/métricas coinciden con productores y período sin doble conteo de derivados/subtareas.
- [ ] No se crea cuota, consumo, SLA o porcentaje de avance sin denominador contractual/operativo verificable.
- [ ] Ausencia, cero, no contratado y error se distinguen; SEO conserva su dueña TASK-1690 y no duplica fórmula.
- [ ] Insights consume productores y no importa el BFF; edición congelada y dashboard publican su corte.
- [ ] Reader API/MCP/UI devuelve misma proyección y deniega scope ajeno sin filtrar costos, márgenes ni compensaciones.

## Verification

- Task lint focal: template=1, legacy=0, errors=0, warnings=0 antes de registro.
- Implementación: `pnpm qa:gates --changed`, typecheck/lint y pruebas focales proporcionales; no guardas de forma textual como evidencia de comportamiento.
- SQL/runtime: `pnpm test:live`, serializado; nunca source de .env.local. Probar positivos/negativos e idempotencia cuando hay writes.
- UI/API/MCP comparten autoridad y resultado; evidencias sanitizadas, sin datos cliente usados como fixtures técnicos.
- `pnpm docs:closure-check`; después de toda edición `pnpm docs:context-check:strict` como último gate.

## Closing Protocol

- [ ] Status real, Lifecycle y carpeta reflejan evidencia; sin rollout se conserva abierto.
- [ ] Criterios tildados con evidencia concreta; no confundir código, deploy y operación.
- [ ] Registry/README/EPIC-046 y dependencias actualizados; manual técnico/funcional y recuperación proporcionados.
- [ ] Handoff/changelog y gates documentales al día; no commit/push automático.

## Follow-ups

Las dueñas citadas conservan su scope y epic. No crear tareas por gráfico, cuenta, endpoint o QA. Móvil/push y ampliación comercial quedan fuera de esta cohorte.


## Open Questions

Sin preguntas que bloqueen el registro. El plan de ejecución debe resolver los paths/DDL propuestos y readiness real antes de código. Para ejecutar en Codex: /goal explícito y task-hook; este registro no inicia implementación.
