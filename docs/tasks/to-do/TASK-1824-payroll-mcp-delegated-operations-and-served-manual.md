# TASK-1824 — Payroll MCP delegated operations and served manual

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
- Backend impact: `integration`
- Epic: `EPIC-043`
- Status real: `Diseño; sin implementación ni runtime verificado en esta task`
- Rank: `9`
- Domain: `hr|payroll|platform`
- Blocked by: `TASK-1820, TASK-1821, TASK-1822, TASK-1823, TASK-1813; hito de delegación interna Payroll coordinado con TASK-1631`
- Branch: `Greenhouse develop; checkout compartido actual; sin worktrees ni cambio de branch automático`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Exponer el ciclo Payroll a Codex y Claude mediante adapters MCP delegados que consumen los commands, readers y operaciones durables del dominio. Publicar un manual operativo servido y una matriz exhaustiva de capacidades expuestas o excluidas, sin trasladar reglas de cálculo al gateway.

## Why This Task Exists

El baseline del 03/09 encontró cero tools Payroll en el manifiesto interno y en la introspección del gateway con providers fixture. Esa introspección no fue tools/list autenticado de producción. Una skill local de auditoría no equivale a una tool callable ni a un manual recuperable por el agente; OAuth interoperable tampoco acredita autorización Payroll.


## Goal

- Permitir descubrir, preparar, calcular, consultar, generar documentos y solicitar su envío por los contratos canónicos, con confirmación proporcional a cada efecto.
- Conservar actor, scope, período, versión, monedas e intención entre propuesta, ejecución y readback.
- Demostrar conectividad autenticada de cada cliente soportado sin ampliar grants del cliente público compartido.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

ADR: aplicar la decisión aprobada de publicación/versionado y acceso delegado del epic. Un cambio de auth o frontera compartida necesita decisión explícita antes de implementación; este plan no la aprueba.

## Normative Docs

- `docs/epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md`
- `docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

Las referencias al baseline son evidencia fechada; revalidar código/runtime al ejecutar. No usar su snapshot como disponibilidad presente.


## Dependencies & Impact

### Depends on

- TASK-1820, TASK-1821, TASK-1822, TASK-1823 y TASK-1813, más hito de identidad delegada interna Payroll coordinado con el owner TASK-1631. No se exige completar su programa B2B/WorkOS/Globe: se exige contrato verificable de actor interno, scope, revocación y decisión de acceso aprobada antes de writes. Integrar sólo contratos ya entregados y verificados; diseño/mocks no cierran dependencia de runtime.
- Identidad/grants TASK-1631 y recurso TASK-658 cuando corresponda; OAuth TASK-1813 no se duplica aquí.

### Blocks / Impacts

- Cierre operativo EPIC-043 y TASK-1827 como certificación transversal.

### Files owned

- Lane ecosystem: contrato/rutas Payroll pertenecen a TASK-1821; esta task coordina su consumo y no duplica writers.
- Federación: provider/allowlist/exclusiones del repo existente efeonce-mcp, con ruta y ownership a verificar en su checkout compartido autorizado antes de editar; ninguna ruta local no comprobada se declara vigente.

- `src/mcp/greenhouse/tool-manifest.ts`
- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/tools.ts`
- `src/mcp/greenhouse/skill-manifest.ts`
- `src/mcp/greenhouse/__tests__`
- `docs/mcp/skills`
- `docs/tasks/to-do/TASK-1824-payroll-mcp-delegated-operations-and-served-manual.md`

Ownership restringido a adapters/tests/docs de esta task. Los commands y schema compartidos se coordinan con su owner; no se modifican concurrentemente.

## Current Repo State

### Already exists

- Manifiesto source of truth en src/mcp/greenhouse/tool-manifest.ts, registro derivado en server.ts y catálogo de manuales skill-manifest.ts.
- La federación es un consumidor separado: el repo efeonce-mcp decide qué cruza; un tool interno no demuestra su disponibilidad pública.

### Gap

Falta lane/provider Payroll, contrato delegado, herramientas, manual servido y prueba cliente real. Los nombres finales de tools y rutas se derivan del catálogo TASK-1821, no de los botones de UI.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/mcp/greenhouse/tool-manifest.ts` y consumidores declarados; gateway se coordina como repo existente separado.
- Future candidate home: `remain-shared`
- Boundary: adapter/test consume reader/command/operation canónico, no tablas para reproducir reglas.
- Server/browser split: stores, auth, secretos y SDKs quedan server-only; browser recibe DTO mínimo autorizado.
- Build impact: manifiestos/manuales y fixtures deben entrar en su build consumidor; no agregar SDK pesado al cliente ni nuevos servicios.
- Extraction blocker: autenticación delegada, contratos de versión/operación y rollout coordinado; no se crean apps/packages por planificación.


## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: commands/readers de `src/lib/payroll` y operaciones TASK-1821/1822/1823; adapters no son dueños de importes.
- Consumidores afectados: portal, Nexa, API Platform, MCP y worker, según el alcance de esta task.
- Runtime target: local aislado → staging verificado → production autorizada; nunca inferir equivalencia de ambientes por nombre.

### Contract surface

- Contrato existente a respetar: `src/lib/payroll`, `src/lib/api-platform/core/commands.ts` y arquitectura de full API parity.
- Contrato nuevo o modificado: Payroll MCP delegated operations and served manual; nombres/DTO finales salen de TASK-1821 y se fijan antes de wiring.
- Backward compatibility: `gated`; lectores existentes conservan su permiso y las nuevas escrituras sólo entran tras prerequisitos verificados.
- Full API parity: adapters reutilizan el mismo command/reader con actor, scope, período, versión y key; no direct stores como atajo.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_payroll.payroll_periods`, `greenhouse_payroll.payroll_entries` mediante contrato canónico; persistencia de operaciones y delivery pertenece a TASK-1822/1823.
- Invariantes: cantidades por moneda; versión aprobada exacta; history inmutable; falta de dato no se convierte en cero; confirmación no sobrevive a cambios materiales.
- Write-target allowlist: esta task no incorpora tablas de negocio nuevas ni writes directos; cualquier nuevo destino requiere decisión en su task dueña antes de aplicar.
- Tenant/space boundary: identidad y scope derivados de sesión/token validado; nunca member/client/space de input como autoridad.
- Idempotency/concurrency: misma intención/payload retorna operación previa; payload distinto y key igual produce conflicto. Pruebas incluyen crash/retry y revocación; wrapper no equivale a garantía de todos los efectos.
- Audit/outbox/history: commands emiten auditoría canónica y correlación de operación; no duplicar eventos desde adapter. Redactar PII y credenciales.

### Migration, backfill and rollout

- Migration posture: ninguna migración de negocio prevista aquí; schema de operaciones/recibos es de TASK-1822/1823 y se verifica antes del consumer.
- Default state: nuevos writes deshabilitados hasta gates; lectura sólo con permisos efectivos.
- Backfill plan: no backfill automático; histórico se diagnostica en lectura y recovery se autoriza aparte.
- Rollback path: retirar exposición nueva y revertir adapter; preservar operaciones en vuelo e historial. Un envío aceptado no se deshace.
- External coordination: HR/Finance validan sujetos/acciones; gateway/identidad y proveedor email sólo según matriz de dependencia y autorización.

### Security and access

- Auth/access gate: capability de dominio en ejecución y acceso a recurso, además del gate de superficie.
- Sensitive data posture: nómina/PII; no logs de importes nominales ni tokens, no URLs públicas permanentes de recibos.
- Error contract: errores canónicos de API Platform, captureWithDomain y código de conflicto/bloqueo; no raw errors ni ok:true ante fallo parcial.
- Abuse/rate-limit posture: límites del runtime, una operación por intención, límites batch y reintento acotados en el dominio; no loops ilimitados del agente.

### Runtime evidence

- Local checks: suites focales indicadas en Verification, con fixtures aislados y controles negativos.
- DB/runtime checks: readback de versión/operación e inventario de efectos sólo sobre sujetos autorizados.
- Integration checks: sesión/cliente propio, permiso vigente, efecto y readback; una llamada 2xx o tools/list no acredita finalización.
- Reliability signals/logs: correlación de command/operation/outbox y estado por etapa sin PII; nombres nuevos se registran canónicamente, no se asumen existentes.
- Production verification sequence: orden completo en Rollout; documentar timestamps y revisiones.

### Acceptance criteria additions

- [ ] Source of truth, contrato, consumidores y boundaries de acceso comprobados por tests conductuales.
- [ ] Idempotencia, concurrencia, errores y trazabilidad comprobados sin confiar sólo en metadata de tools.
- [ ] Migraciones/flags/grants y rollback verificados antes de rollout; límites irreversibles documentados.
- [ ] Capability Definition of Done satisfecha: registro de capability, reader/command, API, acceso, audit, idempotencia y exposición agéntica o exclusión explícita, sin lógica de negocio UI.


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

### Slice 1 — Matriz de capacidades y decisión de acceso

- Enumerar cada capability del catálogo TASK-1821 con reader/command, tool interna, adapter ecosystem, decisión gateway, gate, efecto y motivo de exclusión. Incluir preparación, cálculo, ajustes, aprobación/cierre, documentos, comunicaciones y seguimiento.
- Acordar ADR de lane delegada con TASK-1631: actor humano verificable, audience/scope acotados, expiración y revocación. TASK-1813 conserva discovery/OAuth de clientes. No registrar un ejecutor arbitrario de URL o SQL.

### Slice 2 — Lecturas y manual operativo servido

- Registrar tools de lectura de períodos, preflight, resultados por moneda, estado de operación y documentos ya existentes; ninguna lectura genera PDF ni encola envíos.
- Crear manual en docs/mcp/skills y registrarlo en skill-manifest.ts con prerequisitos, resolución de período, comandos, confirmaciones, recuperación y lenguaje de estados. Espejar la skill operativa en .claude/.codex; la skill auditor mantiene su especialidad.
- Actualizar manifesto generado por introspección y catalogación; metadata writes y spendsProviderBudget separadas, schemas cerrados y selección de tools evaluada.

### Slice 3 — Escrituras y federación acotada

- Adapters invocan TASK-1821/1822/1823 con versión esperada e intención estable. Autorización se reevalúa en cada comando y al recuperar assets; no confiar en schema/tool description.
- Retornar operationId, estado, etapas, resultados parciales y siguiente acción permitida. Timeout implica consultar operación existente, no recrearla automáticamente.
- En el checkout compartido del gateway autorizado para implementación, actualizar provider/allowlist/exclusiones y su guard de paridad; localizar rutas reales antes de editar. No crear clone/worktree ni copiar reglas del dominio.

### Slice 4 — Canary de clientes y documentación

- Probar transporte real, tools/list autorizado, manual recuperado, lectura y escritura de fixture aprobada por cliente soportado, registrando versión del cliente y SHA/revisión del provider/gateway.
- Mantener “no verificado” si sólo hay introspección local o discovery OAuth; TASK-1827 valida el recorrido transversal completo.

## Out of Scope

- Implementar OAuth alternativo o duplicar TASK-1813/TASK-1631.
- Ampliar grants del cliente OAuth público compartido, ejecutar bancos/Deel o construir un motor Payroll en MCP.
- Suponer que publicar el schema habilita runtime o que un GET con efectos es read-only.

## Detailed Spec

El DTO transporta período/versión y cantidades tipadas por moneda, fecha de lectura y estado; null distingue ausencia de cero. La propuesta de envío ata versión, artefactos y destinatarios canónicos; “calcula” por sí solo no autoriza enviar correo ni pagar. Una autorización explícita del flujo completo puede cubrir etapas conocidas, pero cambios materiales invalidan esa confirmación. El MCP coordina adapters; el worker TASK-1822 ejecuta. Revocación entre tools/list y tools/call debe bloquear; no basta ocultar tools. Descripciones no sustituyen permisos ni invariantes entre llamadas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. Fixtures/diseño pueden empezar antes de dependencias; exposición de writes y canary esperan sus contratos cerrados. Integración con archivos compartidos secuencial y con owner. No habilitar para compensar una dependencia rota.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Actor revocado o scope ajeno | Identity/Payroll | medium | Reautorizar en ejecución y asset read | Denegación estructurada; prueba de cero efectos |
| Retry duplica efecto externo | Payroll/email/Finance | high | Intención estable y readback de operación | Múltiples efectos para mismo intent |
| Snapshot se reporta como operativo | Release/ops | high | Timestamp, SHA, revisión y canary real | Evidencia incompleta o skipped |
| Fixture contamina base compartida | Payroll/Finance | medium | Aislamiento local primero y allowlist live exacta | Filas/efectos fuera del inventario |

### Feature flags / cutover

Conservar flags vigentes de consumidores y su registro; el gate acotado de las nuevas escrituras se define con la task dueña antes del rollout, default disabled. No inventar aquí una env vigente ni asumir que NODE_ENV distingue staging/prod. Verificar VERCEL_ENV y runtime worker. Lecturas autorizadas pueden habilitarse antes; escrituras nunca por mera publicación de schema.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revertir contrato no expuesto/fixtures locales | En la sesión de verificación | Sí, sin mutaciones productivas |
| 2 | Retirar adapter nuevo y conservar ruta anterior autorizada | Según deploy medido en ensayo | Sí para exposición, no para efectos ya aceptados |
| 3 | Deshabilitar nuevas solicitudes; consultar/drenar operaciones existentes | Medido antes del canary | Parcial; historial y envíos aceptados se conservan |
| 4 | Detener promoción, conservar evidencia y registrar incidente | Inmediato al detectar fallo | Sí para promoción; recovery requiere plan separado |

### Production verification sequence

1. Tests locales aislados y validación de dependencias; evidencia negativa de acceso y efectos.
2. Readback de código desplegado, flags, grants, schema y worker antes de staging; no asumir base distinta.
3. Canary con fixture/sujetos/recipientes y acciones explícitamente autorizados; verificar cada etapa antes de avanzar.
4. Repetir en producción sólo con alcance aprobado y configuración corroborada; guardar operación y readbacks redactados.
5. Consultar estado hasta terminal o bloqueo explícito; alertas/reintentos/rollback ensayados. Cualquier fallo conserva rollout pendiente.

### Out-of-band coordination required

HR/Finance para alcance, identidad/gateway para grants y clientes, email para prueba de destinatarios. No renovar tokens, otorgar permisos ni enviar mensajes por el mero registro de esta task. Las acciones requieren autorización vigente del operador y acceso canónico.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La matriz enumera todas las capabilities de TASK-1821 y cada fila tiene exposición real o exclusión justificada; no se declara full parity con filas desconocidas.
- [ ] tools/list y tools/call autenticados prueban el mismo contrato esperado; se prueba llamada directa denegada aunque el nombre de tool sea conocido.
- [ ] Inputs manipulados, scope ajeno, token expirado/revocado y falta de actor delegado no producen efectos ni exponen PII.
- [ ] Repetir la misma intención tras timeout recupera una operación; versión o destinatarios cambiados requieren nueva confirmación.
- [ ] El manual se obtiene por la tool servida en el gateway y sus instrucciones coinciden con tools reales; espejos .claude/.codex pasan su gate.
- [ ] El manifiesto generado y registro real coinciden; writes y spendsProviderBudget reflejan sus efectos independientemente.
- [ ] Codex y Claude Code tienen evidencias separadas de sesión propia; cualquier soporte Desktop/claude.ai exige su propia prueba o queda excluido explícitamente.

## Verification

- pnpm mcp:manifest:generate && pnpm mcp:manifest:check
- pnpm skills:mirrors
- Tests de src/mcp/greenhouse/__tests__ y guard de paridad del gateway con registro real; selección semántica de tools, no conteo textual.
- `pnpm task:lint --task TASK-1824` con template=1, legacy=0, errors=0, warnings=0.
- `pnpm docs:closure-check` y `pnpm docs:context-check:strict` al cierre documental.

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry reflejan estado real; no cerrar si queda rollout pendiente.
- [ ] Acceptance Criteria y Status real muestran evidencia por slice, incluyendo pruebas no ejecutadas.
- [ ] Handoff, manual técnico/operativo y arquitectura dueña actualizados; changelog sólo por comportamiento real.
- [ ] Dependencias y epic actualizados sin cerrar otras tasks por asociación.
- [ ] Evidencia accesible en repositorio, sin secretos/PII y con límites de mocks, versiones y runtime.

## Follow-ups

- Necesidades fuera del contrato aprobado se registran con owner; no ampliar silenciosamente a auto-pago, identidad general o rediseño.

## Open Questions

- Los DTO y gates definitivos se fijan al cerrar TASK-1821/1822/1823; mientras tanto no se implementan adapters contra interfaces supuestas.
- Cada cliente anunciado debe disponer de autenticación propia y fixture autorizado; ausencia mantiene su certificación pendiente.
