# Operar el Hiring Handoff (decisión → onboarding/downstream)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-10 por Claude (TASK-356)
> **Ultima actualizacion:** 2026-07-13 por Codex (TASK-1368)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) · [Task TASK-356](../../tasks/complete/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md)
> **Documentacion funcional:** [Hiring Desk](../../documentation/hr/hiring-desk.md) §Handoff downstream

## Para qué sirve

Cuando decides una postulación como **seleccionada** en el Hiring Desk, Greenhouse crea solo (en segundos, vía el pipeline reactivo) un **handoff**: la ficha que dice "esta persona fue seleccionada para este destino y espera aprobación". El handoff es el puente gobernado entre reclutamiento y el equipo receptor (HRIS para contratación interna, Staff Augmentation para placements). Nada se contrata ni se activa solo: cada paso lo confirma una persona.

## Antes de empezar

- Necesitas la capability `hiring.handoff.approve` (la tienen los roles internos de gobernanza de hiring: admin, HR manager, operaciones — los mismos que pueden decidir una postulación).
- Application 360 muestra el estado del handoff para decisiones `selected` + `internal_hire` y permite aprobarlo si tienes la capability. La cola de activación vive en `HR → Onboarding & Offboarding → Contrataciones listas`.
- Los lectores de la cola (bridges) están detrás del flag `HIRING_HANDOFF_BRIDGES_ENABLED`. El handoff se **materializa siempre**, con o sin flag — el flag solo controla quién puede leer la cola.

## Paso a paso

1. **Decidir la postulación** en el Hiring Desk (`selected` + destino). No hay paso extra: el handoff aparece solo.
2. **Revisar el handoff**: verifica destino, fecha tentativa y entidad legal propuesta. La entidad legal es **propuesta no vinculante** — la clasificación del contrato la hace el equipo receptor con Legal, nunca reclutamiento.
3. **Aprobar** (`approve`): habilita el handoff para el equipo receptor. Solo destinos con equipo receptor en Greenhouse (`internal_hire`, `staff_augmentation`) se pueden aprobar. Para `internal_hire`, puedes aprobar desde Application 360 si el bridge card muestra el estado pendiente.
4. *(Opcional)* **Iniciar preparación** (`setup`): marca que el receptor ya está trabajando la incorporación.
5. **Completar** (`complete`): SOLO el equipo receptor, y siempre con la **referencia de evidencia** (`downstreamRef`: el id del colaborador creado o del placement). Para `internal_hire`, el cierre normal ocurre desde Activation Lane tras completar el intake. Sin evidencia el sistema lo rechaza.
6. **Cancelar** (`cancel`): si el proceso no sigue (candidato desiste, se resolvió fuera del sistema). Se puede desde pendiente, aprobado o bloqueado.

## Qué significan los estados

| Estado | Significado |
|---|---|
| Pendiente de aprobación | El handoff nació de una selección y espera tu aprobación. |
| Aprobado | Visible para el equipo receptor (cola de onboarding / intents de Staff Aug). |
| En preparación | El receptor está ejecutando la incorporación. |
| Completado | Cerrado con evidencia (colaborador o placement creado). |
| Bloqueado | Requiere intervención humana. El motivo siempre es un código con mensaje claro: destino sin equipo receptor, datos faltantes, o la decisión cambió/se revocó **después** de aprobar. |
| Cancelado | El proceso no siguió. Una nueva selección posterior reutiliza la misma ficha (reabre). |

Señales en `/admin/operations` (módulo **Hiring / ATS**): *Handoffs bloqueados sin resolver* (>48h) y *Contrataciones internas sin onboarding* (>72h). En estado sano ambas están en 0.

## Qué no hacer

- **No re-decidas una postulación esperando que el handoff aprobado "se actualice solo"**: después de aprobar, un cambio de decisión lo **bloquea** para revisión humana (es intencional — el receptor pudo haber empezado).
- **No completes sin evidencia real**: `downstreamRef` es el contrato de cierre; nunca marques completado "porque ya se hizo".
- **No intentes crear el colaborador/placement desde hiring**: eso es de HRIS (TASK-770) y Staff Augmentation. El handoff solo transporta la intención.
- **No edites filas de `hiring_handoff` o su audit por SQL**: el audit es append-only con triggers; usa el command.

## Problemas comunes

- **"Decidí selected y no aparece el handoff"**: el pipeline reactivo corre en el ops-worker cada pocos minutos. Si tras ~10 min no aparece, revisa `/admin/operations` (lane `people` del consumer reactivo) y `outbox_reactive_log` para el evento `hiring.application.decided`.
- **"Handoff bloqueado: destino sin equipo receptor"**: `contractor`, `partner` y `reasignación interna` aún no tienen receptor en Greenhouse (V1). Coordina fuera del portal y cancela o espera el bridge (contractor → EPIC-013).
- **"Quiero rehacer un handoff cancelado"**: re-decide la postulación como `selected` — la ficha se reabre sola con la nueva decisión.
- **Backfill** (si hubo decisiones `selected` antes de un despliegue del consumer): `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/backfill-handoffs.ts` (dry-run; agregar `--apply` tras revisar).
- **Smoke de diagnóstico** (con proxy PG): `scripts/hiring/_sanity-handoff-reactive.ts` valida materialize + replay + supersede + revocación end-to-end con datos sintéticos y limpieza automática.

## Referencias técnicas

- Dominio: `src/lib/hiring/handoff/**` · consumer: `src/lib/sync/projections/hiring-handoff-materialize.ts`
- API: `POST /api/hiring/handoffs/[id]/(approve|setup|complete|cancel)`
- Cola 770: `listInternalHireReadyForOnboarding()` · Staff Aug: `listStaffAugmentationHandoffIntents()` · Person 360: `getHiringJourneyForPerson()`
- Copy es-CL: `src/lib/copy/hiring.ts` · Flag: `HIRING_HANDOFF_BRIDGES_ENABLED` (ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)
