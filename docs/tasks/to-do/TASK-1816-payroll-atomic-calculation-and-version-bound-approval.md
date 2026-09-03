# TASK-1816 — Payroll Atomic Calculation and Version-bound Approval

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
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
- Status real: `Especificada el 2026-09-03; sin implementación ni rollout; evidencia base fechada pendiente de convertir en regresiones`
- Rank: `1`
- Domain: `payroll|finance|hr|data`
- Blocked by: `none`
- Branch: `develop; checkout compartido; sin ramas por task ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Publicar cada cálculo completo como una revisión identificable y vincular aprobación y cierre a esa revisión. Un fallo parcial, un timeout o una carrera no puede dejar montos mezclados aprobados ni revertir una exportación.

## Why This Task Exists

F14 reprodujo un período approved con dos netos 84.750: el recálculo persistió 76.275 para la primera persona, falló en la segunda, conservó 84.750 para ella y close aceptó. El control exitoso dejó ambos en 76.275 e invalidó aprobación. F7 mostró aprobación sobre datos cambiados y carrera con exportación. Son reproducciones locales fechadas, no diagnóstico de todos los períodos reales.

Unidad U01 de EPIC-043, formalizada por solicitud del operador. TASK-1625 conserva coordinación histórica
con los issues ISSUE-130; no representa una segunda implementación. Esta especificación no certifica arreglo,
no habilita ejecución financiera y no hereda supuestos operativos del backlog anterior.

## Goal

- Resolver la inconsistencia de esta unidad en el command y la persistencia canónicos.
- Probar resultados, fallos y concurrencia con evidencia durable, sin depender de un test textual del código.
- Entregar un contrato programático reutilizable y un rollout verificable sin modificar historia por inferencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias: Payroll posee cálculo y versiones; Finance posee obligaciones/pagos; adapters no recalculan.
Identificar o proponer ADR acotado antes de modificar source of truth, schema, eventos o semántica financiera.
No hay ADR aceptado por esta task. Conservar la topología actual y el acceso fino de cada consumidor.

## Normative Docs

- `docs/epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md`
- `docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- Skills: `greenhouse-payroll-auditor`, `software-architect-2026`; para efectos Finance, `greenhouse-finance-accounting-operator`; cierre con QA y documentación.

## Dependencies & Impact

### Depends on

- Bloqueos de ejecución: `none`. Leer sus contratos vigentes antes de editar; el diseño puede prepararse en paralelo.
- Canon y baseline anteriores. Revalidar código/schema y configuración del runtime al iniciar; el snapshot del 2026-09-03 no es estado live permanente.

### Blocks / Impacts

- TASK-1820 consume diagnósticos; TASK-1821 integra comandos/API; TASK-1822 compone operaciones recuperables.
- TASK-1823 documentos, TASK-1824 MCP, TASK-1825 Nexa, TASK-1826 UI y TASK-1827 verificación integral consumen el resultado.
- Cambios en `calculate-payroll.ts`, `postgres-store.ts`, lifecycle y eventos se integran secuencialmente con TASK-1816–1819; no otorgar ownership concurrente del mismo archivo.

### Files owned

- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/persist-entry.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/close-payroll-period.ts`
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
- Tests colocados junto a los archivos anteriores y documentación de sus contratos; archivos nuevos sólo si Discovery demuestra una frontera necesaria.
- Consumers de sync/eventos fuera de estos paths requieren asignar su slice antes de editar; no se incluyen pools, gateway, UI ni workers genéricos por defecto.

## Current Repo State

### Already exists

- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/persist-entry.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/close-payroll-period.ts`
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`

Los paths fueron comprobados al formalizar. Hay stores, commands y tests que se deben extender; no se crea
un motor paralelo. La baseline enlaza reproducciones extensas locales: copiar los casos mínimos relevantes a
tests versionados antes de considerar suficiente su evidencia.

### Gap

F14 reprodujo un período approved con dos netos 84.750: el recálculo persistió 76.275 para la primera persona, falló en la segunda, conservó 84.750 para ella y close aceptó. El control exitoso dejó ambos en 76.275 e invalidó aprobación. F7 mostró aprobación sobre datos cambiados y carrera con exportación. Son reproducciones locales fechadas, no diagnóstico de todos los períodos reales.

No se ejecutaron cálculos, pagos ni correos reales para esta formalización. Los casos locales no describen la
frecuencia ni los sujetos afectados en producción. El inventario exacto de tablas y callers se confirma en Discovery.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/payroll/**` y sus adapters actuales; Finance conserva `src/lib/finance/**`.
- Future candidate home: `remain-shared`
- Boundary: calculatePayroll, aprobación y closePayrollPeriod sobre una revisión completa; la revisión aprobada es precondición del cierre.
- Server/browser split: commands, SQL, auth y datos sensibles permanecen server-only; browser consume DTOs sanitizados.
- Build impact: sin SDK nuevo ni filesystem input adicional; compila en el portal y consumers actuales. Los cambios de inputs de worker deben pasar sus gates de build y runtime.
- Extraction blocker: transacciones, autorización y eventos del dominio compartido; esta task no crea servicios, apps o packages.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: greenhouse_payroll.payroll_periods y greenhouse_payroll.payroll_entries; audit/outbox existentes asociados al período.
- Consumidores afectados: Product API y consumers de Payroll/Finance; API Platform/MCP/Nexa mediante TASK-1821/1824/1825.
- Runtime target: local primero; staging y producción del portal y consumers afectados mediante release autorizado.

### Contract surface

- Contrato existente a respetar: archivos de Files owned y tipos de `src/types/payroll.ts`.
- Contrato nuevo o modificado: calculatePayroll, aprobación y closePayrollPeriod sobre una revisión completa; la revisión aprobada es precondición del cierre.
- Backward compatibility: conservar identificadores/campos válidos; clientes antiguos reciben conflicto explícito si falta una precondición imprescindible, nunca un éxito degradado.
- Full API parity: negocio en primitive; routes sólo adaptan transporte/auth. TASK-1821 integra lanes, TASK-1824/MCP y TASK-1825/Nexa consumen el contrato, sin copiar reglas.

### Data model and invariants

- Entidades/tablas/views afectadas: greenhouse_payroll.payroll_periods y greenhouse_payroll.payroll_entries; audit/outbox existentes asociados al período.
- Invariantes: revisión completa y autorización vigentes, pertenencia de entry al período/persona, dimensiones monetarias separadas, historia exportada y pagos preservados.
- Write-target allowlist: inventariar destinos reales antes de código; si existe boundary test del dominio, declarar toda tabla nueva con justificación en el mismo PR. No crear un allowlist decorativo para eludir la frontera.
- Tenant/space boundary: resolver actor, entidad/período y membresía desde recursos canónicos; IDs enviados no confieren acceso; deny de actor ajeno o grant revocado sin efectos.
- Idempotency/concurrency: intención y versión esperada, rechazo de contenido cambiado bajo clave repetida, lock/CAS/transaction según ADR; no prometer exactly-once por transporte.
- Audit/outbox/history: correlación por command/revisión y actor; writes y eventos correspondientes atómicos, historia append-only, sin payloads PII completos.

### Migration, backfill and rollout

- Migration posture: no schema comprometido todavía; cualquier cambio requerido será additive y compatible, registrado en pending-migrations y probado con datos sintéticos antes de rollout.
- Default state: conservar comportamiento soportado hasta gate; un writer nuevo no entra sin compatibilidad validada de sus consumers.
- Backfill plan: inventario histórico read-only; ningún apply implícito. Recovery separado por sujetos/versiones exactos y command autorizado, con preview y readback.
- Rollback path: detener nueva ejecución por control operativo vigente, revertir código compatible; no borrar revisiones, eventos ni movimientos ya confirmados.
- External coordination: responsable Payroll/Finance y release; cambios de permisos, env o workers sólo si son necesarios y declarados con evidencia.

### Security and access

- Auth/access gate: capabilities y grants vigentes del recurso, revalidados en command; no conceder admin broad ni confiar sólo en sesión del adapter.
- Sensitive data posture: montos/identificadores mínimos en pruebas y logs; fixtures sintéticas, sin nombres, bancos o correos reales.
- Error contract: reutilizar PayrollValidationError y mapping canónico; conflicto de versión, fuente faltante y falla de persistencia distinguibles; nada de raw SQL/errors externos.
- Abuse/rate-limit posture: conservar límites del adapter y proteger concurrencia por período; retry acotado y explícito, no bucle que recalcule indefinidamente.

### Runtime evidence

- Local checks: regresiones conductuales por hallazgo, control sano y negativo, integración PostgreSQL local con commits/rollback reales.
- DB/runtime checks: read-only de revisión, estado, rows, eventos y effects de la fixture autorizada; no source de .env.local ni SQL mutante de reparación.
- Integration checks: command y ruta real, consumidores afectados, timeout/retry e intento denegado; mocks sólo para fronteras externas identificadas.
- Reliability signals/logs: reutilizar catálogo existente; registrar señales nuevas si faltan, con conteo de conflictos/fallos y correlación, sin afirmar nombres no registrados.
- Production verification sequence: la sección de rollout es obligatoria; SHA del portal y revisión/tráfico de workers por separado.

### Acceptance criteria additions

- [ ] Source of truth, superficies, callers y destinos de escritura confirmados con código/schema actuales.
- [ ] Invariantes monetarios, pertenencia, auth y concurrencia verificadas por estado persistido.
- [ ] Tablas nuevas documentadas en allowlist existente cuando aplique, con justificación; o evidencia de que no hay nuevos destinos.
- [ ] Migración, compatibilidad, rollback y revisión histórica read-only documentados y comprobados proporcionalmente.
- [ ] Evidencia DB/runtime posterior a release registra resultados reales y limitaciones.
- [ ] Errores sanitizados, audit/eventos y señales no filtran información sensible.

## Capability Definition of Done — Full API Parity gate

- [ ] Primitive de dominio reúne semántica, auth fina, idempotencia, audit/eventos y errores; no se publica un store como sustituto.
- [ ] Capabilities/grants modificados tienen cobertura de allow/deny/revocación; al introducir una capability, registry y grant a rol operativo real viajan juntos.
- [ ] Product API usa el primitive; adapters adicionales tienen owner TASK-1821/1824/1825 y condición de retiro de brecha: no cerrar EPIC-043 con consumer divergente.
- [ ] La intención admite propose → confirm → execute vinculada a versión; no ejecuta desde una propuesta sin autorización.

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

### Slice 1 — Contrato de publicación y regresión

Proponer ADR acotado comparando transacción de publicación con lock/CAS versus drafts preparados y publicación atómica. Medir duración, cardinalidad y lecturas externas; no sostener un lock mientras se consulta un proveedor. Registrar precondiciones, revisión y mapa de transiciones. Incorporar F7/F14 como tests conductuales con PostgreSQL local real y barreras deterministas.

### Slice 2 — Writer atómico

Separar preparación de publicación. Confirmar entries, revisión y anulación de aprobación dentro de la frontera elegida. El retiro de entries stale se limita a una revisión editable sin referencias financieras y bajo política explícita; nunca borrar versiones exportadas, entries de un período reopened ni deuda histórica legítima para igualar resultados (coordinar TASK-1818/1819); fallos de audit/outbox deben revertir el write correspondiente. Detectar cambios de inputs entre preparación y commit y rechazar o recomputar según el ADR. No capturar errores de clonación de ajustes como éxito silencioso.

### Slice 3 — Lifecycle y adapters

Aprobar sólo una revisión persistida completa; compare-and-set evita aprobar una revisión reemplazada. Close valida estado y revisión bajo la misma protección. Repetir la misma intención devuelve el mismo resultado; clave repetida con contenido diferente se rechaza. Routes llaman los commands y conservan guards; TASK-1821 completa el catálogo y lanes.

### Slice 4 — Verificación y publicación

Probar doble calculate, calculate/approve, approve/close y calculate/close con ambos órdenes y timeout. Registrar readback de estado, revisión, entries, audit y eventos; coordinar el contrato con TASK-1817/1818/1819 antes de editar archivos compartidos.

## Out of Scope

- Implementar UI, MCP, Nexa, branding/PDF/email o reemplazar sus owners.
- Ejecutar transferencias, marcar pagos, enviar correos o alterar grants durante planificación.
- SQL de reparación, backfills masivos, borrado de historia, cambios de contrato laboral o reactivación de personas.
- Extraer microservicios, cambiar branch, crear worktrees o absorber refactors generales.

## Detailed Spec

calculatePayroll, aprobación y closePayrollPeriod sobre una revisión completa; la revisión aprobada es precondición del cierre.

El criterio de éxito compara datos persistidos y resultados del command antes/después de cada fallo. No basta
un HTTP 2xx, una assertion sobre el string SQL, una llamada mock o un estado calculado en memoria. Mantener
un registro por caso con input sintético, revisión inicial, barrera/fallo, resultado esperado, estado final y
rastro de eventos. Las diferencias de moneda se validan por separado y con la regla de redondeo vigente.

Resolver en ADR la representación mínima de revisión y el protocolo de preparación/publicación; no se prescribe mantener llamadas externas dentro de una transacción.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 y decisión de arquitectura → Slice 2 → Slice 3 → Slice 4. Los cambios del writer y readers deben ser
compatibles antes de exponer el nuevo contrato. Esta foundation se integra antes de TASK-1817–1819; no editar sus mismos archivos en
paralelo. Un test local no habilita recovery histórico ni cierra la validación runtime de TASK-1827.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Publicar revisión incompleta o incoherente | Payroll | high | Fixtures de fallo, CAS/lock y publicación atómica | Diferencia entre revisión/entries o conflicto inesperado |
| Interpretar historia como duplicación y perder deuda | Finance | medium | Snapshot read-only, política por estado y no borrar pagos | Totales por moneda/obligación divergentes |
| Portal y consumer usan contratos distintos | API/worker | medium | Compatibilidad de schema/evento y readback de ambos despliegues | Evento rechazado, backlog o efecto no conciliado |
| Rechazo legítimo bloquea una corrida existente | Payroll | medium | Preflight diagnóstico y runbook operativo, sin fallback permisivo | Aumento de errores de fuente/precondición |

### Feature flags / cutover

No se inventa una flag nueva en la especificación. Discovery registra flags reales aplicables y decide si el
cutover necesita una nueva registrada y probada; una flag no puede reactivar una escritura conocida como
inconsistente. El control de contención debe bloquear nuevas operaciones afectadas conservando lecturas e
historia, con mecanismo y propietario verificados antes de producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revertir tests/contrato propuesto antes de adopción | Medir en revisión | Sí |
| 2 | Revertir código compatible, detener nuevos writes; conservar schema additive y revisiones | Medir en staging | Parcial después de writes |
| 3 | Restaurar adapter/consumer compatible sin repetir efectos confirmados | Medir en staging | Parcial |
| 4 | Suspender promoción si readback falla; recuperación individual gobernada | Según diagnóstico | Sin borrado de historia |

No se prescribe comando destructivo de rollback sin diseño/schema aprobados. Si una migración o recuperación
mutante resulta necesaria, su comando inverso/compensatorio debe existir y estar probado antes de apply.

### Production verification sequence

1. Revalidar branch/WIP, código, schema, flags, permisos y owners; mantener checkout compartido.
2. Completar regresiones locales con DB real y control sano; comparar estados, montos, revisiones/eventos.
3. Desplegar con autorización a staging y usar fixtures permitidas; recordar que los entornos comparten Cloud SQL, no asumir aislamiento de datos.
4. Verificar adapter/command, actor denegado y retry; cleanup sólo de fixtures propias. Si falla, detener promoción.
5. Release autorizado a producción; registrar SHA/alias activo y revisión/tráfico de cada worker afectado, migraciones y config.
6. Readback de canary autorizado y lectura histórica sin mutación; registrar divergencias y dueño. No ejecutar nómina real como smoke tácito.
7. Cerrar sólo con evidencia de runtime o declarar `code complete, rollout pendiente` y mantener task abierta.

### Out-of-band coordination required

Payroll/Finance aprueban cualquier política nueva de dinero/historia y el canary real. Release y owners de
consumers coordinan el orden. La creación documental no autoriza esos efectos ni cambios de permisos externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Fallo en segunda persona no publica mezcla: la última revisión completa permanece intacta o el período queda inequívocamente no aprobable; close rechaza el intento incompleto.
- [ ] El control de dos personas produce 76.275/76.275 y exige nueva aprobación; el test verifica montos y lifecycle, no texto SQL.
- [ ] Aprobación con revisión antigua y aprobación concurrente con cierre no alteran una exportación ni autorizan una revisión distinta.
- [ ] Dos intenciones concurrentes y retry tras timeout producen como máximo una publicación por intención, con revisión y resultado recuperables.
- [ ] Todo fallo de persistencia de entries, audit o outbox conserva la atomicidad documentada; no queda un evento que anuncie una revisión inexistente.
- [ ] ADR acotado identificado/aceptado cuando cambia source of truth, schema o semántica; ninguna decisión queda implícita.
- [ ] Contratos Backend/Data y Capability DoD completos con evidence, sin omitir auth, migración o runtime.
- [ ] Casos mínimos de auditoría están versionados; limitaciones y F6 retirado se conservan donde corresponda.
- [ ] Rollout y readback de runtimes afectados registrados; no se confunde código completo con operación verificada.

## Verification

- `pnpm task:lint --task TASK-1816` debe reportar template=1, legacy=0, errors=0, warnings=0.
- `pnpm vitest run src/lib/payroll` y suites Finance afectadas, focalizando el scope real.
- Integración PostgreSQL local para concurrencia/rollback; si se necesita entorno compartido, usar `pnpm test:live` con autorización y fixtures propias, nunca `source .env.local`.
- `pnpm typecheck`, lint focal y `pnpm qa:gates --changed` al implementar; build/worker gates cuando cambie su input.
- Readback real según Production verification sequence; los tests skipped no cuentan como evidencia.
- `pnpm docs:closure-check` y último gate `pnpm docs:context-check:strict` después del cierre documental.

## Closing Protocol

- [ ] Status real y AC reflejan evidencia; Lifecycle y carpeta coinciden, sin cerrar rollout pendiente.
- [ ] README, registry, EPIC-043, TASK-1625/issues relacionados y blockers downstream actualizados.
- [ ] Arquitectura técnica, documentación funcional, manual/runbook y contrato API actualizados proporcionalmente en sus homes canónicos.
- [ ] Handoff y changelog proporcionalmente actualizados; límites de evidencia explícitos.
- [ ] Verificaciones locales/runtime y rollback documentados; no se ejecutó recovery sin autorización específica.
- [ ] Revisado impacto sobre TASK-1816–1827 y owners externos, sin doble implementación.

## Follow-ups

- Recuperación histórica sólo si la lectura detecta casos; cada apply requiere alcance y aprobación propios.
- TASK-1827 consolida la evidencia integral y no reemplaza la regresión requerida en esta task.

## Open Questions

Resolver en ADR la representación mínima de revisión y el protocolo de preparación/publicación; no se prescribe mantener llamadas externas dentro de una transacción.
