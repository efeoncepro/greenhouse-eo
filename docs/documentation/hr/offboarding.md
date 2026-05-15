# Offboarding Laboral y Contractual

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.5
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-15 por Claude Opus (TASK-892 — closure completeness aggregate 4 capas)
> **Documentacion tecnica:** [GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md)
> **ADRs relacionados:**
> - [GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md](../../architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md) (TASK-890)
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

## Acceso

- Surface visible: view `equipo.offboarding` en `/hr/offboarding`.
- Autorizacion fina: capability `hr.offboarding_case` con acciones `read`, `create`, `update`, `approve`, `manage`.
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
