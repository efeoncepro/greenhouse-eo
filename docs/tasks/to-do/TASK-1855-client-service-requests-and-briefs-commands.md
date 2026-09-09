# TASK-1855 — Solicitudes y briefs del servicio: commands y seguimiento

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
- Backend impact: `command`
- Epic: `EPIC-046`
- Status real: `Diseño registrado por autorización del operador 2026-09-09; sin implementación ni rollout`
- Rank: `4`
- Domain: `delivery|data|platform`
- Blocked by: `TASK-1852, TASK-1853`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa el recurso de solicitud del servicio y los commands para crear, completar y seguir briefs, con responsabilidad, historial y eventos notificables. Valida servicio/scope y conecta con el flujo operativo existente, diferenciando recibido, aceptado, planificado y entregado.

## Why This Task Exists

Los pedidos no tienen aún un recorrido cliente verificable de acuse, responsable, respuesta y resolución. BCS calcula calidad de un brief, pero no es el recurso de solicitud ni su lifecycle; una solicitud tampoco modifica un contrato.

## Goal

- Materializar P06 de EPIC-046 con ownership acotado y evidencia por cuenta.
- Commands propuestos create/complete/read/transition de solicitud con actor, org, servicio, versión esperada e idempotency key; nombres/rutas definitivos se sellan en Discovery. Publicación de eventos tras commit y respuesta de aceptación durable.
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

TASK-1852/1853 fijan servicio y scope. TASK-220 conserva BCS; TASK-291 su scorecard cliente. TASK-289 conserva aprobación de assets. Hub TASK-690–693 y TASK-1759 conservan routing/transporte; coordinar mapping sin doble envío.

### Blocks / Impacts

TASK-1856 consumer UI; notificaciones P09 para recibida/información requerida/respuesta/resolución. TASK-1845 crea informes por su command separado.

### Files owned

- src/lib/delivery/service-requests/ (nuevo propuesto tras comparar recursos existentes)
- src/app/api/client-portal/ (adapters finos de solicitudes)
- migrations/ (sólo DDL aditivo aprobado)
- src/lib/sync/projections/notifications.ts (mapping acotado, serializado con TASK-1759/Hub)
- src/mcp/greenhouse/ (registro serializado)

## Current Repo State

### Already exists

- `src/lib/delivery/task-status-canonical.ts`
- `src/lib/ico-engine/brief-clarity.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/notifications/notification-service.ts`
- `src/lib/client-portal/guards/require-view-code-access.ts`

### Gap

Los pedidos no tienen aún un recorrido cliente verificable de acuse, responsable, respuesta y resolución. BCS calcula calidad de un brief, pero no es el recurso de solicitud ni su lifecycle; una solicitud tampoco modifica un contrato.

Baseline de código y documentos de esta planificación; flags, datos y entrega productiva se verifican al ejecutar, no se infieren del epic.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: src/lib/delivery/ para commands y worker reactivo existente para efectos.
- Future candidate home: `remain-shared`
- Boundary: Commands propuestos create/complete/read/transition de solicitud con actor, org, servicio, versión esperada e idempotency key; nombres/rutas definitivos se sellan en Discovery. Publicación de eventos tras commit y respuesta de aceptación durable.
- Server/browser split: DTO tipado browser-safe; stores, policy, secretos y providers sólo server-side.
- Build impact: sin dependencias pesadas previstas; no nuevo runtime ni imports globales. Cualquier dependencia nueva requiere mapping de consumidores.
- Extraction blocker: sesión/autorización y productores compartidos; no crear apps/packages ni repartir transacciones por red.


## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: Agregado Delivery de solicitud/brief; se debe resolver el recurso/store vigente antes del DDL. Si falta, store aditivo bajo greenhouse_delivery, nunca bajo el BFF cliente.
- Consumidores afectados: UI/API/MCP/Nexa; worker sólo para efectos async autorizados.
- Runtime target: local, staging y production; worker reactivo existente si hay eventos.

### Contract surface

- Contrato existente a respetar: src/lib/delivery/task-status-canonical.ts y ADR EPIC-046.
- Contrato nuevo o modificado: Commands propuestos create/complete/read/transition de solicitud con actor, org, servicio, versión esperada e idempotency key; nombres/rutas definitivos se sellan en Discovery. Publicación de eventos tras commit y respuesta de aceptación durable.
- Backward compatibility: gated/aditivo; no cambiar el DTO consumido sin versionar o adaptar.
- Full API parity: commands/readers únicos; App/Ecosystem API y MCP son adapters, no implementaciones paralelas.

### Requisitos del contrato UI detallado — TASK-1856

Wireframe y flow `docs/ui/{wireframes,flows}/TASK-1856-client-service-request-and-brief-self-service-ui*` contienen R0–R5, matrices de campos/constraints y F56-01..08. Son requerimientos propuestos a conciliar aquí, no schemas existentes:

- Plantilla versionada por servicio/tipo con required, constraints, enums, dependencias y defaults autorizados; límites concretos propuestos en wireframe. Cliente/API/MCP usan una validación común, sin schemas divergentes por nombre de cuenta.
- Tipos/cantidad/tamaño de adjuntos desde policy; estados upload/validación separados, referencias privadas por objeto, rechazo/revocación, URLs temporales y limpieza de huérfanos. No aceptar storage 2xx como validación final.
- Create idempotente por intención/payload y lookup de reconciliación tras respuesta perdida; resultado pendiente/fallo definitivo sin efecto/recurso durable distinguibles. Definir recuperación autenticada tras recarga antes de habilitar submit.
- Completar información conserva brief original, aporte/revisión y expectedVersion; conflicto devuelve estado autorizado sin sobrescritura ni retry automático con versión nueva.
- Listado/historial paginado y orden estable del servidor; filtros sólo cuando estén soportados. Leer solicitud no implica leer todas las de la organización.
- Estados de solicitud, Delivery, publicación, sync y notificación separados. Fecha solicitada no se convierte en compromiso; un fallo del canal no revierte create.
- V1 permite revisión local del formulario sin crear recurso. No promete borrador durable: si se incorpora, definir commands read/write/discard, actor/org, TTL, retención, conflictos y restauración antes de mostrar Guardar borrador.
- Rutas nuevas propuestas bajo `/home/services/[serviceId]/requests` requieren guard por vista/objeto y coordinación con TASK-1852; no heredar permiso de escritura de Home.

### Data model and invariants

- Entidades/tablas/views afectadas: Agregado Delivery de solicitud/brief; se debe resolver el recurso/store vigente antes del DDL. Si falta, store aditivo bajo greenhouse_delivery, nunca bajo el BFF cliente.
- Invariantes que no se pueden romper: aislamiento organización/objeto, contrato distinto de permiso y ausencia distinta de cero; no import inverso desde BFF.
- Write-target allowlist: declarar y justificar toda tabla nueva en boundary test del dominio si existe; read-only no escribe ni habilita módulos.
- Tenant/space boundary: organización y scope desde principal/contexto canónico y target revalidado; rechazar IDs arbitrarios.
- Idempotency/concurrency: reads sin efectos; writes usan key estable y versión esperada/transaction; retry nunca repite efecto externo ya confirmado.
- Audit/outbox/history: writes e intención durable se correlacionan; no evento por simple GET; logs sanitizados.

### Migration, backfill and rollout

- Migration posture: additive sólo después de justificar recurso/DDL en Slice 1.
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

### Slice 1 — Recurso y contrato de solicitud

- Comparar requests/tasks/briefs ya existentes y fijar agregado, estados y transiciones permitidas; justificar cada nueva tabla y el ownership en ADR antes de migrar. Declarar requester, owner, servicio, versión y referencias privadas de adjuntos.

### Slice 2 — Commands y reconciliación

- Crear/completar/leer y transicionar con validación, concurrencia e idempotencia; acuse durable separado de aceptación. Integrar provider operativo por adapter; retry no crea otra pieza y fallo externo mantiene estado recuperable.

### Slice 3 — Eventos, paridad y rollout

- Emitir eventos de cambios materiales con destinatarios resueltos por primitives; routing/email/Teams pertenecen a sus dueñas. Exponer misma operación UI/API/MCP/Nexa, pruebas de fuga/replay/fallo y manual de recuperación.

## Out of Scope

- UI, CMS/publicación de contenidos, modificar precios/cupos/contratos, aprobación nativa de assets, cálculo BCS, generación Insights, app móvil o nuevo Hub.
- Sin commit/push/deploy, cambios live ni envíos como consecuencia de registrar la task. Subagentes y cambios de rama no autorizados.

## Detailed Spec

Agregado Delivery de solicitud/brief; se debe resolver el recurso/store vigente antes del DDL. Si falta, store aditivo bajo greenhouse_delivery, nunca bajo el BFF cliente.

Commands propuestos create/complete/read/transition de solicitud con actor, org, servicio, versión esperada e idempotency key; nombres/rutas definitivos se sellan en Discovery. Publicación de eventos tras commit y respuesta de aceptación durable.

Los paths marcados propuestos son diseño, no código existente. Discovery debe verificar API/DDL/rutas y resolver ownership antes de implementar; una ampliación material vuelve al ADR/plan. Esta task es P06, no un cambio de prioridad de otras dueñas.

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

- [ ] Requisitos del contrato UI detallado conciliados con schema/readers/commands reales y pruebas de comportamiento; documentar cada constraint o destino pendiente antes de habilitar el consumer.

- [ ] DDL sólo después de demostrar ausencia de recurso equivalente; no se duplica BCS, aprobación, contrato ni solicitud de generación Insights.
- [ ] Doble submit/retry y transición concurrente no duplican pedido ni efecto externo; historia y outbox quedan coherentes con el commit.
- [ ] Adjuntos se autorizan por objeto/org; no hay URL pública ni lectura cruzada; límites/tipos se validan en servidor.
- [ ] Recibido no significa aceptado/planificado/entregado; toda solicitud tiene responsable o cola operativa explícita y recuperación de sync fallido.
- [ ] El cambio material produce un evento correlacionado y mínimo; un estado resuelto detiene recordatorios, sin sender paralelo ni GET mutante.

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
