# TASK-1825 — Payroll Nexa governed complete operations

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
- Epic: `EPIC-043`
- Status real: `Diseño; sin implementación ni runtime verificado en esta task`
- Rank: `10`
- Domain: `hr|payroll|platform`
- Blocked by: `TASK-1820, TASK-1821, TASK-1822, TASK-1823`
- Branch: `Greenhouse develop; checkout compartido actual; sin worktrees ni cambio de branch automático`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Conectar el ciclo Payroll completo al runtime gobernado de Nexa usando las operaciones y comandos del epic. Sustituir la lectura SQL agregada por el reader canónico con período explícito y monedas separadas; las acciones conservan confirmación, versión e idempotencia.

## Why This Task Exists

Reemplaza TASK-1215, cuyo supuesto de un runtime Nexa global con un único write y un subset de Payroll ya no define el objetivo. registry.ts ya registra acciones de otros dominios y confirm.ts usa executeApiPlatformCommand. check_payroll aún consulta el último período por SQL, suma monedas y presenta CLP: se elimina esa divergencia, no se agrega otro motor.


Supersesión: [task anterior cerrada por supersesión](../complete/TASK-1215-payroll-nexa-write-actionability.md). Su cierre es documental, no evidencia de implementación. Esta task reinicia aceptación desde supuestos auditados del 2026-09-03.

## Goal

- Ofrecer lectura y propuesta de todas las capacidades obligatorias del recorrido Payroll, con exclusiones explícitas para el resto.
- Confirmar acciones sobre contexto y versión precisos; reanudar operación después de desconexión sin repetir efectos.
- Mantener el anti-oracle de explain_my_pay y no ampliar datos personales por reutilizar la lectura de operador.

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
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/nexa-intelligence/README.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md`

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

- TASK-1820, TASK-1821, TASK-1822, TASK-1823. Integrar sólo contratos ya entregados y verificados; diseño/mocks no cierran dependencia de runtime.
- Identidad/grants TASK-1631 y recurso TASK-658 cuando corresponda; OAuth TASK-1813 no se duplica aquí.

### Blocks / Impacts

- Cierre operativo EPIC-043 y TASK-1827 como certificación transversal.

### Files owned

- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/nexa-contract.ts`
- `src/lib/nexa/actions/registry.ts`
- `src/lib/nexa/actions/confirm.ts`
- `src/lib/nexa/actions/types.ts`
- `src/lib/nexa/actions`
- `docs/architecture/nexa-intelligence`
- `docs/tasks/to-do/TASK-1825-payroll-nexa-governed-complete-operations.md`

Ownership restringido a adapters/tests/docs de esta task. Los commands y schema compartidos se coordinan con su owner; no se modifican concurrentemente.

## Current Repo State

### Already exists

- src/lib/nexa/actions/registry.ts define NexaActionDefinition y acciones de Hiring/Proposal Studio; confirm.ts revalida gates e input antes de executeApiPlatformCommand.
- src/lib/nexa/nexa-tools.ts tiene check_payroll y explain_my_pay; el primero agrega net/gross sin moneda ni período de entrada.

### Gap

Falta wiring Payroll al registry y contrato de lectura compartido. El scope anterior “subset de bajo riesgo” no satisface calcular, PDF y envío con readback. Esta task es adapter backend; no modifica JSX ni inventa una nueva superficie conversacional.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/nexa/nexa-tools.ts` y consumidores declarados; gateway se coordina como repo existente separado.
- Future candidate home: `remain-shared`
- Boundary: adapter/test consume reader/command/operation canónico, no tablas para reproducir reglas.
- Server/browser split: stores, auth, secretos y SDKs quedan server-only; browser recibe DTO mínimo autorizado.
- Build impact: manifiestos/manuales y fixtures deben entrar en su build consumidor; no agregar SDK pesado al cliente ni nuevos servicios.
- Extraction blocker: autenticación delegada, contratos de versión/operación y rollout coordinado; no se crean apps/packages por planificación.


## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: commands/readers de `src/lib/payroll` y operaciones TASK-1821/1822/1823; adapters no son dueños de importes.
- Consumidores afectados: portal, Nexa, API Platform, MCP y worker, según el alcance de esta task.
- Runtime target: local aislado → staging verificado → production autorizada; nunca inferir equivalencia de ambientes por nombre.

### Contract surface

- Contrato existente a respetar: `src/lib/payroll`, `src/lib/api-platform/core/commands.ts` y arquitectura de full API parity.
- Contrato nuevo o modificado: Payroll Nexa governed complete operations; nombres/DTO finales salen de TASK-1821 y se fijan antes de wiring.
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

### Slice 1 — Reader canónico y contratos de propuesta

- Sustituir SQL de check_payroll por reader TASK-1820/1821; aceptar período estable y resolver ambigüedad antes de proponer mutaciones. Monedas separadas en payload y resumen.
- Conservar explain_my_pay como self-only, con identidad de sesión; añadir pruebas anti-oracle al refactor.
- Versionar la matriz actionKey→command/operation, inputs y efecto para todas las capacidades del epic; el schema propuesta incluye período, versión esperada, etapas autorizadas y destinatarios cuando aplique.

### Slice 2 — Registro y confirmación determinista

- Agregar definiciones Payroll al runtime existente; propuesta lee/previsualiza y puede persistir su registro de control/auditoría canónico; nunca genera PDF ni escribe estado de negocio de nómina. No copiar fórmulas, acceso ni SQL de stores.
- Confirm vuelve a validar grants vigentes, input, estado/version y vínculo con la propuesta persistida. Cambiar período, neto o destinatarios después del preview causa conflicto o repropuesta.
- Reusar idempotencia del runtime y del command; comprobar mismo key+body replay y mismo key+body diferente conflict, incluyendo timeout y doble confirm.

### Slice 3 — Operación durable y comunicación honesta

- Resultado de execute devuelve operación existente de TASK-1822; consultar avances no dispara nuevamente la mutación. Resume restringido a lo pendiente con actor reautorizado.
- Los contratos de respuesta exponen fallos por etapa/artefacto/destinatario de TASK-1823 y distinguen accepted/delivered; exported jamás se presenta pagado.
- El renderer conversacional actual consume el contrato soportado; cualquier necesidad de nuevas affordances debe delimitarse en TASK-1826 antes de implementación, no introducir JSX en esta task.

### Slice 4 — Evaluación adversarial y documentación

- Evaluar “calcula la nómina”, período ambiguo, dos monedas, falta UF, revocación, versión obsoleta, reintento y pedido explícito de PDF/email. Separar exactitud de routing del estado real de ejecución.
- Actualizar capa Nexa pertinente, catálogo parity y manual técnico; si cambia system prompt, version/changelog/golden snapshot en su canon.

## Out of Scope

- Modificar UX/JSX del chat o crear un segundo runtime de acciones.
- Limitar silenciosamente el entregable al subset antiguo de TASK-1215.
- Cambiar modelo LLM, entregar datos de terceros a self-service o inferir confirmación de una instrucción externa.

## Detailed Spec

Una petición natural selecciona una intención allowlisted; no autoriza SQL, endpoints arbitrarios ni instrucciones de documentos externos. La confirmación debe corresponder a la propuesta leída, no aceptar parámetros reescritos del cliente con un key válido. Un “sí” posterior se resuelve a una propuesta inequívoca y vigente o solicita precisión. Datos de otra persona siguen sujetos a entitlement de operador; self-service no hereda permisos. La task no asume exactly-once porque confirm.ts tenga wrapper: lo prueba junto a la operación/efecto canónico y reporta qué frontera no cubre.

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

- [ ] check_payroll usa reader canónico y nunca suma USD+CLP; tests muestran período solicitado aunque exista otro cronológicamente posterior.
- [ ] Cada capability obligatoria tiene actionKey/reader y command/operation, o exclusión ratificada en el epic; no cierra como mero subset.
- [ ] Proponer no muta estado de negocio Payroll/Finance, genera PDF ni envía; permite el registro canónico proposed de control/auditoría. Tests afirman cero writes en categorías protegidas y conservación del evento legítimo. Confirmar revalida actor, capabilities, período, versión y payload autorizado.
- [ ] Revocación después de proponer, input manipulado y propuesta obsoleta bloquean con error canónico y cero efectos.
- [ ] Doble confirm/replay/reconexión preservan un operationId y efectos únicos conforme al contrato TASK-1822/1823.
- [ ] explain_my_pay mantiene pruebas self-only y anti-oracle; no acepta memberId arbitrario como escalamiento.
- [ ] Respuestas distinguen resultado parcial/encolado/aceptado/entregado y no anuncian pago por cerrar nómina.
- [ ] La task no cambia superficies JSX; cualquier contrato visual nuevo está asignado y aprobado antes de su implementación.

## Verification

- Tests src/lib/nexa/actions/confirm.test.ts, registry.test.ts, explain-my-pay-tool.test.ts y nuevos fixtures Payroll.
- pnpm nexa:doc-gate --changed
- Evaluación del routing con fixtures bilingües si se declara soporte, priorizando español del operador; un LLM transcript sin readback no acredita éxito.
- `pnpm task:lint --task TASK-1825` con template=1, legacy=0, errors=0, warnings=0.
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
