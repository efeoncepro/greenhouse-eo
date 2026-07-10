# Activar un colaborador desde Hiring (bridge de activación)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-10 por Claude (TASK-770)
> **Ultima actualizacion:** 2026-07-10 por Claude (TASK-770)
> **Documentacion tecnica:** [Greenhouse_HRIS_Architecture_v1](../../architecture/Greenhouse_HRIS_Architecture_v1.md) · [Task TASK-770](../../tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md)
> **Manual hermano:** [Operar el Hiring Handoff](operar-hiring-handoff.md) (el tramo anterior: decisión → handoff aprobado)

## Para qué sirve

Cuando un handoff de **contratación interna** queda aprobado, este bridge convierte a la persona seleccionada en colaborador **sin duplicar identidad y sin activar nada antes de tiempo**: crea la ficha de colaborador en estado "pendiente de intake" (invisible para nómina y capacidad), abre el checklist de onboarding y cierra solo cuando HR completó la ficha por el flujo normal de Workforce Activation.

## Antes de empezar

- Necesitas la capability `hiring.activation.review` (HR, admins). Crear la ficha usa además `workforce.member.intake.update`; abrir onboarding usa `hr.onboarding_instance`.
- Los flags `HIRING_ACTIVATION_ENABLED` y `HIRING_HANDOFF_BRIDGES_ENABLED` deben estar prendidos (hoy OFF por defecto — la UI llega con TASK-1368).
- El handoff debe estar **aprobado** (ver manual hermano).

## Paso a paso

1. **Revisar la cola** (`GET /api/hr/hiring-activation`): handoffs de contratación interna aprobados con el estado del caso.
2. **Reclamar el caso** (`review`): crea la solicitud de activación (una por handoff; repetir no duplica).
3. **Crear la ficha** (`create-member`): Greenhouse busca si la persona ya tiene ficha (misma identidad, o mismo correo sin identidad enlazada) y **enlaza o reactiva antes que crear**. La ficha nace pendiente de intake — nómina y capacidad no la ven. Si hay conflicto de identidad, el caso queda **bloqueado con motivo** y lo resuelve People Ops (nunca se fusiona solo).
4. **Abrir onboarding** (`open-onboarding`): asegura el checklist (si no hay template aplicable, el caso queda bloqueado con motivo — crea el template y reintenta).
5. **Completar la ficha laboral** en Workforce Activation (`/hr/workforce/activation`), como cualquier intake: readiness + completar ficha. **Este paso NO es del bridge** — es el flujo canónico existente.
6. **Cerrar** (`complete`): el bridge verifica que la ficha esté completa y marca el handoff como completado con la evidencia (`member:<id>`). Si la ficha no está completa, rechaza con mensaje claro.

## Qué significan los estados

| Estado | Significado |
|---|---|
| Pendiente de revisión HR | Caso reclamado, sin ficha aún. |
| Ficha creada | La persona ya tiene ficha de colaborador (pendiente de intake). |
| Onboarding abierto | Checklist asegurado y enlazado. |
| Bloqueado | Conflicto de identidad, template faltante o datos legales incompletos — el motivo siempre es un código con mensaje. |
| Activo | Ficha completa + handoff cerrado con evidencia. |
| Cancelado | El proceso no siguió. |

Señal de operaciones: *Activaciones de hiring atascadas* (`workforce.hiring_activation_stuck`, módulo Workforce) — casos con ficha creada pero intake sin completar por más de 7 días. En estado sano está en 0.

## Qué no hacer

- **No completes la ficha "por fuera"** (SQL o edición directa): el bridge verifica el estado real y el flujo canónico de Workforce Activation es el único que activa.
- **No resuelvas un caso bloqueado por identidad fusionando personas a mano**: pide a People Ops revisar (el bloqueo existe para prevenir el incidente de identidad duplicada).
- **No esperes que el bridge cree accesos, login o nómina**: eso llega después (SCIM/Entra enlazará la misma ficha sin duplicar; nómina entra cuando el intake se completa).

## Problemas comunes

- **"Ya es colaborador activo" al crear la ficha**: la persona ya trabaja en Efeonce — el destino correcto era reasignación interna, no contratación. Cancela y corrige la decisión en Hiring.
- **"Sin template de onboarding aplicable"**: crea/activa un template para el contract type del colaborador en HR → Onboarding → Templates y reintenta.
- **Smoke de diagnóstico** (con proxy PG): `scripts/hiring/_sanity-hiring-activation.ts` valida el flujo completo con datos sintéticos y limpieza automática.

## Referencias técnicas

- Dominio: `src/lib/workforce/hiring-activation/**` · API: `POST /api/hr/hiring-activation/[id]/(review|create-member|open-onboarding|complete|cancel)`
- Flags: `HIRING_ACTIVATION_ENABLED` + `HIRING_HANDOFF_BRIDGES_ENABLED` (ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)
- Maquinaria reusada: `completeWorkforceMemberIntake` · `resolveWorkforceActivationReadiness` · `createOnboardingInstance`
