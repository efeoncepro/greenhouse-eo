# Offboarding Laboral y Contractual

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-11 por Codex
> **Documentacion tecnica:** [GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md)

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

## Acceso

- Surface visible: view `equipo.offboarding` en `/hr/offboarding`.
- Autorizacion fina: capability `hr.offboarding_case` con acciones `read`, `create`, `update`, `approve`, `manage`.
- Finiquito: capability `hr.final_settlement` con acciones `read`, `create`, `update`, `approve`, `manage`.
- Documento de finiquito: capability `hr.final_settlement_document` con acciones `read`, `create`, `update`, `approve`, `manage`.
- La cola operacional `GET /api/hr/offboarding/work-queue` exige lectura de las tres capabilities anteriores y no crea capabilities nuevas.
- Route groups reutilizados: `hr` y `people`.
- Startup policy: sin cambios.

## Referencias

- [Manual de uso — Offboarding](../../manual-de-uso/hr/offboarding.md)
- [GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md)
- [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
