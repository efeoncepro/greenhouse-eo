# TASK-1827 — Payroll cross-client E2E and operational release proof

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
- Rank: `12`
- Domain: `hr|payroll|platform`
- Blocked by: `TASK-1816, TASK-1817, TASK-1818, TASK-1819, TASK-1820, TASK-1821, TASK-1822, TASK-1823, TASK-1824, TASK-1825, TASK-1826, TASK-1813`
- Branch: `Greenhouse develop; checkout compartido actual; sin worktrees ni cambio de branch automático`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Certificar el recorrido y recuperación Payroll en portal, API, Nexa y clientes MCP soportados mediante pruebas con datos acotados y evidencia de runtime. Reemplazar el smoke legacy por controles de invariantes, efectos, privacidad y delivery que no contaminan la base compartida.

## Why This Task Exists

Reemplaza TASK-730: elegir diciembre de 2026 no aísla datos, un metadata._test supuesto no prueba soporte, DELETE por flag global puede borrar filas ajenas y close/exported no acredita pago ni entrega. La auditoría mostró errores que un happy path con 2xx no detecta. Esta task integra pruebas del programa; cada task previa conserva su propia regresión.


Supersesión: [task anterior cerrada por supersesión](../complete/TASK-730-payroll-e2e-smoke-lane.md). Su cierre es documental, no evidencia de implementación. Esta task reinicia aceptación desde supuestos auditados del 2026-09-03.

## Goal

- Probar el mismo contrato y readback entre superficies con fixture controlado y registro de versiones de cliente/runtime.
- Ejercitar fallos parciales, carreras, reintentos, revocación y reanudación junto a sus controles exitosos.
- Cerrar sólo con despliegue, configuración y efectos comprobados; mantener evidencia de límites y recovery histórica separada.

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
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md`

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

- TASK-1816, TASK-1817, TASK-1818, TASK-1819, TASK-1820, TASK-1821, TASK-1822, TASK-1823, TASK-1824, TASK-1825, TASK-1826, TASK-1813. Integrar sólo contratos ya entregados y verificados; diseño/mocks no cierran dependencia de runtime.
- Identidad/grants TASK-1631 y recurso TASK-658 cuando corresponda; OAuth TASK-1813 no se duplica aquí.

### Blocks / Impacts

- Cierre operativo EPIC-043 y decisión de cierre de las doce unidades del epic.

### Files owned

- `tests/e2e/smoke/hr-payroll.spec.ts`
- `tests/e2e/fixtures`
- `src/lib/payroll`
- `docs/audits/payroll`
- `docs/tasks/to-do/TASK-1827-payroll-cross-client-e2e-and-operational-release-proof.md`

Ownership restringido a adapters/tests/docs de esta task. Los commands y schema compartidos se coordinan con su owner; no se modifican concurrentemente.

## Current Repo State

### Already exists

- tests/e2e/smoke/hr-payroll.spec.ts y fixtures de autenticación en tests/e2e/fixtures ya existen; no asumir que crean nóminas sintéticas completas.
- Baseline docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md conserva evidencia local y límites, incluidos F6 retirado y D4 con proveedor simulado.

### Gap

No hay prueba reciente del recorrido completo Codex/Claude ni equivalencia de resultados portal/API/Nexa. Las imágenes worker, permisos y modo delivery deben verificarse al probar, no inferirse del código local.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `tests/e2e/smoke/hr-payroll.spec.ts` y consumidores declarados; gateway se coordina como repo existente separado.
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
- Contrato nuevo o modificado: Payroll cross-client E2E and operational release proof; nombres/DTO finales salen de TASK-1821 y se fijan antes de wiring.
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
- Rollback path: detener harness/canary y preservar evidencia, operaciones iniciadas e historial; retirar sólo fixtures propias con el mecanismo aprobado. El rollback funcional se deriva a la task dueña, sin editar adapters desde esta verificación. Un envío aceptado no se deshace.
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

### Slice 1 — Harness aislado y matriz de pruebas

- Construir fixture PostgreSQL local aislado a partir de schema/migraciones vigentes y commands reales; cada fila creada se inventaría con scope único y IDs exactos.
- No escoger una fecha futura como aislamiento ni crear campos/routes de limpieza ficticios. Live tests usan pnpm test:live serializado y fixtures por scope; nunca source .env.local.
- Matriz cubre Chile dependiente/honorarios e internacional, distintas monedas, permisos, dos versiones exportadas, neto cero, leave multimes y TZ; expectativa derivada del contrato, no snapshots ciegos del defecto.

### Slice 2 — Pruebas de integridad y recuperación

- Integrar regresiones de F1–F5/F7–F15 y D1–D4 con referencias a sus tasks. F6 permanece reclasificado; no borrar salario previo para satisfacer el test.
- Inyectar fallo en segunda persona, approve concurrente, close sobre versión cambiada, doble replay, acknowledgement incierto, PDF fallido y aceptación de correo seguida de fallo ledger.
- Afirmar filas/versión/obligaciones/artefactos e intents exactos; un test verde debe probar arreglo y control exitoso, no sólo reproducir defecto.

### Slice 3 — Equivalencia de superficies y clientes reales

- Correr portal, API, Nexa, Codex y Claude Code sobre fixtures equivalentes con mismos inputs/versiones; comparar outputs por moneda y efectos, no IDs aleatorios entre runs.
- Registrar cliente/version, auth propia, entorno, SHA/revisión de portal/provider/gateway/worker y modo delivery. Desktop/claude.ai se prueban separadamente si se anuncian.
- Antes de cualquier ejecución live, obtener autorización de operaciones, IDs de prueba y allowlist exacta de destinatarios; no derivar autorización de este documento. Si no existe aislamiento comprobable, bloquear mutaciones live y continuar pruebas locales/lecturas.

### Slice 4 — Rollout, evidencia e histórico

- Auditar configuración, flags, migraciones, grants, worker imagen/revisión y webhooks mediante readback actual; comparar portal/worker delivery mode.
- Correlacionar operación→command→outbox→documento→email→provider; accepted no delivered, order no bank payment. Crear dossier con fechas, resultados, skipped y pendientes.
- Revisar histórico en lectura para detectar mezcla/aprobaciones/versiones/obligaciones residuales. Recovery requiere plan independiente, evidencia previa, autorización explícita y ejecución por commands con readback. No borrar o corregir nóminas automáticamente como cleanup.

## Out of Scope

- Cron de limpieza global o DELETE por metadata; fecha futura como aislamiento.
- Marcar pagos ficticios, ejecutar bancos/Deel o enviar a personas reales para probar entrega.
- Duplicar el trabajo funcional de TASK-1816..1826 o certificar ausencia absoluta de bugs.

## Detailed Spec

La prueba viva nunca comparte candidatos escogidos por ORDER BY LIMIT ni confunde marca sintética con permisos para mutar. Cleanup local destruye sólo la instancia aislada; en base compartida usa inventario exacto de fixtures aprobadas y comportamiento de retiro permitido por dominio, nunca DELETE por flag global ni cron automático. Los correos reales requieren allowlist interceptada/enforced antes de provider; confirmar dispatch una sola vez con identidad estable y revisar eventos del provider. Falla/skip de canary deja rollout pendiente, no se publica success mediante comando manual. No hay transferencia bancaria requerida para la aceptación; se ejercitan estados financieros con fixtures o evidencias legítimas, nunca mark-paid ficticio.

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
| 2 | Detener harness/canary y conservar inventario de fixtures; retirar sólo fixtures locales propias mediante teardown verificado | En la sesión de prueba | Sí local; efectos live se conservan |
| 3 | Detener nuevas ejecuciones del harness; consultar operaciones iniciadas y escalar rollback funcional a la task dueña, sin editar adapters desde esta task | Inmediato para detener canary | Parcial; historial y envíos aceptados se conservan |
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

- [ ] Todas las regresiones obligatorias tienen test conductual y control exitoso; el dossier declara los mocks y las fronteras no ejercitadas.
- [ ] El harness local usa schema vigente y aislamiento comprobable; ningún período fijo o metadata supuesto funciona como frontera de seguridad.
- [ ] Las mutaciones live y envíos tienen autorización, sujetos e IDs exactos y recipient allowlist antes de ejecutarse; sin ello se reportan pendientes.
- [ ] Mismo input/version produce resultado equivalente portal/API/Nexa/MCP y trazas de commands canónicos.
- [ ] Codex y Claude Code completan flujo autorizado y recuperación con sesión propia y versiones registradas; otros clientes anunciados tienen evidencia independiente.
- [ ] Resultados skipped/blocked/partial no se publican como success ni se confunde accepted con delivered o exported con paid.
- [ ] Configuración y revisiones desplegadas, modos delivery y permisos coinciden con contrato o su discrepancia bloquea promoción.
- [ ] Readback de obligaciones, operaciones, assets privados y eventos provider demuestra ausencia de duplicación según los escenarios acordados.
- [ ] Inventario de fixtures se concilia al terminar sin DELETE genérico; no hay nuevas obligaciones, comunicaciones o cambios de personas reales fuera del scope.
- [ ] Revisión histórica produce hallazgos o evidencia negativa fechada; cualquier reparación está autorizada y separada de cleanup/tests.

## Verification

- pnpm test:live sólo para suite live autorizada y serializada; leer passed/skipped y teardown, no únicamente exit code.
- pnpm qa:gates --changed y suites focales de commands/operaciones/MCP/Nexa; no reemplazan canary real.
- E2E local con fixture aislado y GVC revisada de TASK-1826; canary de clientes con readback y timestamps.
- `pnpm task:lint --task TASK-1827` con template=1, legacy=0, errors=0, warnings=0.
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
