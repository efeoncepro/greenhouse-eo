# Offboarding Laboral y Contractual

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.6
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-09-03 por Claude (TASK-1349)
> **Documentacion tecnica:** [GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md)
> **ADRs relacionados:**
> - [GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md](../../architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md) (TASK-890, TASK-1349)
> - [GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md](../../architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md) (TASK-891)

---

## Que es un caso de offboarding

Un caso de offboarding representa una salida laboral o contractual formal. No es lo mismo que desactivar un usuario, cerrar una sesion o marcar un colaborador como inactivo.

El caso guarda:

- persona y colaborador afectado
- relacion laboral/contractual afectada
- causal de salida
- fecha efectiva de salida
- ultimo dia trabajado
- estado del proceso
- lane operacional que debe continuar

La fecha `contractEndDate` sigue existiendo como dato contractual y puede abrir una revision, pero no es la fuente de verdad de salida. La salida real vive en el caso con `effective_date` y `last_working_day`.

## Estados

| Estado | Significado |
| --- | --- |
| `draft` | Caso manual creado por HR, aun editable. |
| `needs_review` | Caso abierto por una senal automatica o administrativa; requiere revision humana. |
| `approved` | Salida aprobada con fecha efectiva. |
| `scheduled` | Salida programada con ultimo dia trabajado. |
| `blocked` | Hay un bloqueo que impide seguir. |
| `executed` | Caso ejecutado. |
| `cancelled` | Caso cancelado. |

## Revisión de un caso (TASK-1349)

Un caso ya creado puede revisarse una o varias veces mientras no esté en estado terminal (`executed` o `cancelled`). Revisar es una decisión humana explícita entre dos opciones — nunca se infiere de la fecha ni de la fuente del caso:

- **`access_only` (solo acceso)**: la señal que abrió o mantiene el caso fue solo una baja de acceso (SCIM/Admin). La separación sigue siendo `identity_only`, se declara la fecha en que se dio de baja el acceso, y la relación laboral, la compensación y el member **no cambian**. El caso queda listo para cerrarse como cierre informativo directo (acción "Ejecutar").
- **`relationship_ended` (terminó la relación)**: la relación realmente terminó. Exige una causal explícita (renuncia, despido, fin de contrato a plazo fijo, mutuo acuerdo, término de contrato u otra) — nunca se infiere —, la fecha efectiva y el último día trabajado. Con esos datos, Greenhouse recalcula la lane y los requisitos con la matriz canónica de lanes.

Reglas que aplican a ambas decisiones:

- El motivo de la revisión es obligatorio y debe tener al menos 10 caracteres; queda en el registro de auditoría append-only del caso.
- La revisión exige la versión vigente del caso (`expectedUpdatedAt`). Si el caso cambió desde que se abrió la pantalla, Greenhouse rechaza el guardado (conflicto de versión) y pide recargar antes de reintentar.
- Revisar nunca cancela el caso ni crea uno nuevo — corrige el mismo caso que se está mirando.
- Si el caso ya tenía una aprobación o programación previa y la revisión cambia algo material, esa aprobación queda invalidada y el caso vuelve a "Requiere revisión", salvo que quien revisa también tenga permiso de aprobar y decida aprobar en el mismo acto.

**Guardia de aprobación**: un caso que nació de una señal de acceso (`identity_only`, sin revisión) no puede aprobarse, programarse ni ejecutarse todavía — Greenhouse lo rechaza y pide revisarlo primero. Contener el caso (bloquearlo) o cancelarlo sigue permitido en cualquier momento.

> Detalle técnico: comando `reviewOffboardingCase` (`src/lib/workforce/offboarding/store.ts`), reglas puras en `review-policy.ts`, previsualización sin escritura en `review-preview.ts`, guardia de transición en `state-machine.ts`.

## Lanes

Greenhouse resuelve una lane para orientar los pasos posteriores:

- `internal_payroll`: relacion Chile interna. Requiere cierre de payroll, reconciliacion de vacaciones/licencias y documentos HR.
- `external_payroll`: EOR/Deel u otro proveedor. Greenhouse no calcula finiquito interno, pero deja evidencia y handoff.
- `non_payroll`: honorarios/contractor fuera de payroll dependiente.
- `identity_only`: senal de acceso o SCIM. No representa salida laboral por si sola.
- `relationship_transition`: cambio de relacion sin necesariamente cerrar acceso.
- `unknown`: datos insuficientes; HR debe revisar.

## Triggers actuales

- HR puede abrir un caso manual desde `/hr/offboarding`.
- TASK-867: `/hr/offboarding` consume `OffboardingWorkQueue`, una proyeccion read-only que muestra estado operativo, proximo paso, progreso y acciones principales sin recalcular en React ni hacer fetch por fila.
- People 360 muestra un CTA `Iniciar offboarding` cuando no hay caso activo.
- SCIM/Admin al desactivar identidad abre un caso `needs_review` de tipo `identity_only`, en vez de esconder la accion como salida laboral.
- HR puede ejecutar una revision de contratos proximos/vencidos. Esa revision crea casos `needs_review` con source `contract_expiry`; no ejecuta salida automaticamente.

## Frontera con Payroll

TASK-760 crea el caso y la lane. TASK-761 agrega el aggregate de finiquito para la lane `internal_payroll`. TASK-762 agrega el documento formal desde el settlement aprobado, con aprobacion documental independiente, asset privado y estados de emision/firma/ratificacion.

El motor de finiquito consume un caso aprobado o agendado con `effective_date`, `last_working_day`, causal y snapshot contractual. No calcula desde `member.active` ni desde `contractEndDate` directo. El documento formal consume el settlement aprobado; no recalcula montos desde datos vivos.

Para V1 solo se soporta renuncia de trabajador dependiente Chile con payroll interno. Honorarios, Deel/EOR, contractors e internacional quedan bloqueados como regimenes no soportados por el engine interno.

## Ejecución coherente por lane (TASK-1349)

Cuando un caso pasa a `executed`, el efecto depende de la lane, no de un único camino genérico:

- **Caso `identity_only` (solo acceso)**: la ejecución es informativa. No toca compensación, no toca la relación laboral y no toca el registro del colaborador.
- **Caso de término real** (`relationship_ended` revisado, con `last_working_day` real): antes de ejecutar, Greenhouse rechaza el cierre si existen versiones de compensación que empiezan después del último día trabajado (no las borra — pide corregirlas o supersederlas primero). La vigencia de compensación se cierra en el último día trabajado. Terminar la relación legal y marcar al colaborador como inactivo (`members.active=false`) queda detrás del flag `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` (**prendido en Production y staging desde el 2026-09-03**, release `62356c9b7fd4`). Las salidas ejecutadas antes de esa fecha no recibieron el writeback: se cierran con la recuperación gobernada.

> Detalle técnico: `applyOffboardingLifecycleEffects` (`src/lib/workforce/offboarding/member-lifecycle.ts`); error `compensation_future_version_conflict` (409) cuando hay versiones futuras sin resolver.

## Transicion employee -> contractor/honorarios

Cuando una persona termina una relacion dependiente y luego inicia una etapa contractor u honorarios, Greenhouse no reactiva ni convierte la relacion anterior.

El contrato vigente es:

- el caso de offboarding dependiente debe quedar ejecutado
- la relacion `employee` queda historica con `effective_to`
- se abre una nueva relacion `contractor`
- si la etapa es honorarios, se marca como subtipo `honorarios`
- no se crea un ajuste de payroll ni una compensacion mensual nueva en esta foundation
- el pago contractor futuro debe venir desde engagement, evidencia/invoice y Finance, no desde finiquito

People 360 muestra esa historia como `Relacion laboral cerrada` y `Relacion contractor/honorarios activa` para evitar ambiguedad operativa.

## Cierre con proveedor externo (TASK-890, desde 2026-05-15)

Cuando un caso de offboarding tiene lane `external_payroll` (colaborador con `payroll_via='deel'` o `relationship_type='eor'`), Greenhouse NO emite finiquito Chile — el cierre operativo y el finiquito legal viven en el proveedor externo (Deel, EOR u otro).

Desde TASK-890, la accion primaria "Cerrar con proveedor" en `/hr/offboarding` deja de ser un link silencioso a `/hr/payroll` y dispara un dialog auditado:

1. **Motivo del cierre** (obligatorio, minimo 10 caracteres) — queda en el audit log append-only del caso.
2. **Referencia del proveedor** (opcional) — texto corto tipo "Deel termination ID 4587" para trazabilidad.
3. **Confirmacion** transiciona el caso a `status='approved'` via `POST /api/hr/offboarding/cases/[id]/transition` con la flag `externalProviderCloseReason`.

Efecto downstream:

- El resolver canonico `resolveExitEligibilityForMembers` (TASK-890 Slice 2) detecta el caso `external_payroll` en `status>='approved'` con `last_working_day` en el periodo y aplica `projectionPolicy='exclude_from_cutoff'` — el colaborador deja de aparecer en nomina interna proyectada cuando el feature flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` esta activo.
- Mientras el flag esta en `false` (default V1.0 hasta staging shadow compare verde ≥7d), el comportamiento legacy se mantiene bit-for-bit.

Capabilities requeridas (defense in depth dual-gate):

- `workforce.offboarding.close_external_provider:update` (granular TASK-890) — solo HR / FINANCE_ADMIN / EFEONCE_ADMIN.
- `hr.offboarding_case:approve|manage` (existente TASK-760) segun la transicion del state machine.

## Drift contrato member ↔ relacion legal (TASK-890 Slice 6 + TASK-891)

Un caso comun en colaboradores que pasan de empleado dependiente a contractor/Deel es que el member runtime declara `contract_type='contractor' / payroll_via='deel'` pero la relacion legal activa en `greenhouse_core.person_legal_entity_relationships` sigue como `relationship_type='employee'`.

**Detección (TASK-890 Slice 6)**: signal `identity.relationship.member_contract_drift` (subsystem `Identity & Access`) cuenta members en drift. Severity:

- `ok` cuando count = 0 (steady state)
- `warning` cuando count > 0 AND `oldestDriftAgeDays < 30` (drift reciente)
- `error` cuando count > 0 AND `oldestDriftAgeDays >= 30` (drift sostenido, escala automaticamente post TASK-891 V1.0)

**Resolución (TASK-891 V1.0, desde 2026-05-15)**: comando auditado `reconcileMemberContractDrift` accesible desde el form admin `/admin/identity/drift-reconciliation`. Cierra la relacion `employee` activa (`effective_to=NOW() + status='ended'`) y abre nueva relacion `contractor` (con subtype `contractor | honorarios` persistido en `metadata_json`) en una sola transaccion atomica. Emite outbox events `person_legal_entity_relationship.deactivated` + `person_legal_entity_relationship.created` con correlation forensic via `metadata_json.reconciliationContext` + marker append-only en `notes` de ambas filas.

**Quién puede resolver**: solo `EFEONCE_ADMIN` (capability granular `person.legal_entity_relationships.reconcile_drift:update`). Delegación a HR queda V1.1 post 30d steady sin incidentes.

**NUNCA auto-mutar**: V1.0 ship únicamente comando operator-initiated. Auto-reconciliation desde cron viola la regla canonical "NUNCA auto-mutar Person 360 desde un read path". Decisión V2 contingente con HR approval explícito y ADR nuevo.

**Reversibilidad**: append-only audit. Una reconciliación errónea se revierte ejecutando una NUEVA reconciliación inversa que vuelve la relación a su estado anterior — el historial preserva ambos eventos.

## Closure Completeness (TASK-892) — el cierre es de 4 capas, no 1

A partir de 2026-05-15 el cierre operativo de un offboarding case se evalua sobre **4 capas ortogonales**. La UI muestra un badge canonico que sintetiza el estado real de las 4 capas:

- **`En curso`**: case lifecycle abierto (draft / needs_review / approved / scheduled). Layers 2-4 son informativas.
- **`Cierre parcial`**: case lifecycle `executed` o `cancelled`, pero hay capas Person 360 / payroll sin alinear. La UI muestra una seccion "Capas pendientes" con CTAs al step canonico (e.g. reconciliar drift Person 360 via TASK-891 dialog).
- **`Cerrado completamente`**: las 4 capas alineadas. Sin pending steps.
- **`Bloqueado`**: case.status = `blocked`. Operador debe resolver el blocker antes de avanzar.

### Por que importa

El work-queue derivation original calculaba `primaryAction` desde una sola dimension (`closureLane`), ignorando drift Person 360 + payroll scope. Caso real (Maria Camila Hoyos, 2026-05-15): case `executed` con drift Person 360 sin reconciliar mostraba boton "Cerrar con proveedor" obsoleto que reabriria un layer ya terminal.

Post TASK-892, ese mismo caso muestra `closureState='partial'` + step canonico `reconcile_drift` con CTA al dialog auditado de TASK-891. El operador ve la realidad operativa, no un boton de capa equivocada.

### Capas y como se detectan

| Capa | Tabla canonical | Detector |
|------|------------------|----------|
| Case lifecycle | `work_relationship_offboarding_cases.status` | column directa |
| Member runtime | `members.contract_type / payroll_via / pay_regime` | helper `detectMemberRuntimeAlignment` |
| Person 360 relationship | `person_legal_entity_relationships` | helper `detectPersonRelationshipDrift` (mirror exacto del signal `identity.relationship.member_contract_drift`) |
| Payroll scope | TASK-890 resolver `resolveExitEligibilityForMembers` | branch sobre `projectionPolicy` |

### Reliability signal

`hr.offboarding.completeness_partial` (subsystem Identity & Access). Cuenta cases terminales con drift Person 360 detectado. Steady state esperado: 0. Cuando warning > 0, operador puede ejecutar reconciliacion desde `/admin/identity/drift-reconciliation` o desde la seccion "Capas pendientes" del case inspector.

## Salidas sin resolver y nómina (TASK-1349, ADR 2026-09-03)

`members.active` refleja disponibilidad **actual**, no un filtro histórico: un colaborador ya inactivo conserva íntegro un mes anterior ya pagado y se mantiene proyectado hasta el corte del período donde su salida tomó efecto. Un reingreso (compensación que empieza después del corte) no hereda la salida anterior.

El punto que sí bloquea nómina es otro: una salida **sin resolver** (caso en `draft`, `needs_review` o `blocked`) cuya señal — sus fechas declaradas, o si no hay fechas, la fecha en que se creó el caso — cae en o antes del período. En ese caso el colaborador se mantiene proyectado, pero Greenhouse **bloquea** calcular o aprobar el período hasta que HR decida (revisar el caso). Si el resolver de elegibilidad no puede correr, tampoco se autoriza el cálculo — el sistema nunca asume "sin problema" ante una falla.

Todo esto corre bajo el flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED`, hoy encendido en producción y en staging.

> Detalle técnico: [GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md](../../architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md); resolver en `src/lib/payroll/exit-eligibility/**`; warning bloqueante `unresolved_exit_signal` y error `exit_eligibility_unavailable` en `src/lib/payroll/calculate-payroll.ts` / `payroll-readiness.ts`.

## Cola de offboarding — señales más precisas (TASK-1349)

En `/hr/offboarding`, un caso de acceso todavía sin revisar se muestra como **"Por clasificar"** (ya no como "Cierre contractual", etiqueta que solo aplica a honorarios). Una vez revisado como solo acceso, se muestra **"Solo acceso"**. El progreso de las lanes que no tienen finiquito ahora refleja pasos reales — clasificado, fechas declaradas, decisión tomada, ejecutado — en vez de mostrar siempre "2/2". La acción **"Revisar caso"** está disponible para cualquier caso no terminal, incluidos los bloqueados.

En el cierre del caso: una capa cuyo estado se desconoce ya no cuenta como completa — aparece el paso "Verificar capas sin confirmar". Y si la salida quedó ejecutada pero el colaborador sigue activo (salidas ejecutadas antes del 2026-09-03, cuando el writeback aún no existía, o por una inconsistencia), aparece el paso **"Cerrar ciclo de vida del colaborador"**, que lleva a la recuperación gobernada — nunca a un ajuste manual en base de datos.

La pantalla dedicada a revisar un caso desde la cola (TASK-1814) todavía no existe; hoy la revisión se opera por API o por el script de recuperación descrito abajo.

## Ownership frente a reactivaciones e integraciones (TASK-1349)

- Si SCIM reactiva por OID a un colaborador cuya salida real ya fue ejecutada, Greenhouse no lo "resucita": el registro queda enlazado pero inactivo. Un reingreso real es un episodio nuevo, activado de forma gobernada — no una reactivación silenciosa del anterior.
- El backfill desde BigQuery (`pnpm backfill:postgres:canonical-360`) no sobrescribe `active` ni `contract_end_date` cuando Greenhouse ya es dueño de esa salida.

## Señales en Operaciones (TASK-1349)

Visibles en `/admin/operations`, estado estable esperado: 0.

| Señal | Qué detecta |
| --- | --- |
| `hr.offboarding.unresolved_exit_signal` | Salidas sin decidir cuya fecha bloquea el cálculo de nómina del período. |
| `hr.offboarding.executed_member_still_active` | Salida real ejecutada cuyo colaborador sigue activo (ver [ISSUE-117](../../issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md)). |
| `workforce.offboarding.deprovisioned_member_without_case` | Cuenta dada de baja de acceso sin que exista un caso de offboarding — solo detección, no corrige nada por sí sola. |

> Detalle técnico: `src/lib/reliability/queries/offboarding-exit-drift.ts`.

## Recuperación gobernada (TASK-1349)

Cuando un caso quedó atrás de la realidad (ejecutado pero colaborador activo, o solo-acceso que en verdad fue un término real), la corrección se hace con el script `pnpm workforce:offboarding:recovery` — nunca por SQL manual. El script corre en modo simulación por defecto y solo aplica cambios con `--apply --member <id>` explícito, usando los mismos commands canónicos que la API (revisar → aprobar → programar → ejecutar). Ver el manual de uso para el paso a paso.

## Acceso

- Surface visible: view `equipo.offboarding` en `/hr/offboarding`.
- Autorizacion fina: capability `hr.offboarding_case` con acciones `read`, `create`, `update`, `approve`, `manage`.
- Revisión de caso (TASK-1349): capability `workforce.offboarding.review_case`, acción `execute`, scope `tenant`. Rutas: `POST /api/hr/offboarding/cases/{caseId}/review` y `.../review/preview` (previsualización sin escritura); carril programático `POST /api/platform/app/hr/offboarding/cases/{caseId}/review[/preview]`.
- Cierre con proveedor externo (TASK-890): capability granular `workforce.offboarding.close_external_provider` con accion `update`.
- Reconciliacion drift Person 360 (TASK-891): capability granular `person.legal_entity_relationships.reconcile_drift` con accion `update`, scope `tenant`. V1.0 grant EFEONCE_ADMIN-only.
- Finiquito: capability `hr.final_settlement` con acciones `read`, `create`, `update`, `approve`, `manage`.
- Documento de finiquito: capability `hr.final_settlement_document` con acciones `read`, `create`, `update`, `approve`, `manage`.
- La cola operacional `GET /api/hr/offboarding/work-queue` exige lectura de las tres capabilities anteriores y no crea capabilities nuevas.
- Route groups reutilizados: `hr` y `people`.
- Startup policy: sin cambios.

## Referencias

- [Manual de uso — Offboarding](../../manual-de-uso/hr/offboarding.md)
- [GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md)
- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md](../../architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md)
