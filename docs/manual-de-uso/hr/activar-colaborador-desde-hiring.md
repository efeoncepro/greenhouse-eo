# Activar un colaborador desde Hiring (bridge de activación)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-10 por Claude (TASK-770)
> **Ultima actualizacion:** 2026-07-13 por Codex (TASK-1368)
> **Documentacion tecnica:** [Greenhouse_HRIS_Architecture_v1](../../architecture/Greenhouse_HRIS_Architecture_v1.md) · [Task TASK-770](../../tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md) · [Task TASK-1400](../../tasks/complete/TASK-1400-hiring-activation-blocker-resolution-api.md) · [Task TASK-1368](../../tasks/complete/TASK-1368-hiring-activation-lane-ui.md)
> **Manual hermano:** [Operar el Hiring Handoff](operar-hiring-handoff.md) (el tramo anterior: decisión → handoff aprobado)

## Para qué sirve

Cuando un handoff de **contratación interna** queda aprobado, este bridge convierte a la persona seleccionada en colaborador **sin duplicar identidad y sin activar nada antes de tiempo**: crea la ficha de colaborador en estado "pendiente de intake" (invisible para nómina y capacidad), abre el checklist de onboarding y cierra solo cuando HR completó la ficha por el flujo normal de Workforce Activation.

Este flujo empieza después de la decisión humana. Un assessment enviado o scorecard finalizado no activa a nadie por sí solo: el assessment alimenta la decisión; la decisión `selected` + destino `internal_hire` crea/aprueba el handoff; el handoff aprobado alimenta esta lane.

## Antes de empezar

- Necesitas la capability `hiring.activation.review` (HR, admins). Crear la ficha usa además `workforce.member.intake.update`; abrir onboarding usa `hr.onboarding_instance`.
- Los flags `HIRING_ACTIVATION_ENABLED` y `HIRING_HANDOFF_BRIDGES_ENABLED` están prendidos en producción desde 2026-07-14. Si se apagan por rollback, la UI muestra un estado honesto de bridge deshabilitado.
- El handoff debe estar **aprobado** (ver manual hermano).

## Paso a paso

1. Desde Hiring Desk, abre la postulación en **Application 360 → Decisión**. Si está `selected` + destino `internal_hire`, revisa el bridge de handoff. Si aparece pendiente y tienes permiso, usa **Aprobar handoff**; luego usa **Abrir Activation Lane**.
2. También puedes entrar directo a **HR → Onboarding & Offboarding → Contrataciones listas** (`/hr/onboarding?lane=hiring-activation`). Los deep links desde el desk llevan `applicationId`/`handoffId` para abrir el caso correcto.
3. **Revisar la cola**: handoffs de contratación interna aprobados con el estado del caso. Si la cola está vacía, el target aún no está aprobado o los flags están apagados, la pantalla lo declara; no hay fallback silencioso al primer caso.
4. Abrir un caso para ver **journey**, readiness y próximos pasos. Usa **Ver postulación 360** si necesitas volver al origen de la decisión.
5. **Reclamar el caso** (`review`): crea la solicitud de activación (una por handoff; repetir no duplica).
6. **Crear la ficha** (`create-member`): Greenhouse busca si la persona ya tiene ficha (misma identidad, o mismo correo sin identidad enlazada) y **enlaza o reactiva antes que crear**. La ficha queda con intake pendiente — nómina y capacidad no la ven. Si hay conflicto de identidad, el caso queda **bloqueado con motivo** y lo resuelve People Ops (nunca se fusiona solo).
7. **Abrir onboarding** (`open-onboarding`): asegura el checklist (si no hay template aplicable, el caso queda bloqueado con motivo — crea el template y reintenta).
8. **Completar la ficha laboral** en Workforce Activation (`/hr/workforce/activation`), como cualquier intake: readiness + completar ficha. **Este paso NO es del bridge** — es el flujo canónico existente.
9. **Cerrar** (`complete`): el bridge verifica que la ficha esté completa y marca el handoff como completado con la evidencia (`member:<id>`). Si la ficha no está completa, rechaza con mensaje claro.

## Resolver blockers desde la lane

La UI de TASK-1368 consume el resolver real de TASK-1400. Cuando un caso está bloqueado:

- Si el blocker es accionable (`retry-create-member` o `retry-open-onboarding`), el dialog envía `POST /api/hr/hiring-activation/[id]/resolve-blocker` con motivo opcional, refresca el detalle y muestra si quedó resuelto o sigue bloqueado.
- Si el blocker es manual/no resoluble por API, la lane muestra la surface alternativa (por ejemplo Workforce Activation o templates) y no promete éxito falso.
- Si el blocker quedó stale por cambios concurrentes, la lane refresca el detail antes de permitir otro intento.

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
- **"Bridge de activación deshabilitado"**: revisa los flags `HIRING_ACTIVATION_ENABLED` y `HIRING_HANDOFF_BRIDGES_ENABLED`; la UI no inventa datos mientras estén apagados.
- **Smoke de diagnóstico** (con proxy PG): `scripts/hiring/_sanity-hiring-activation.ts` valida el flujo completo con datos sintéticos y limpieza automática.

## Referencias técnicas

- Dominio: `src/lib/workforce/hiring-activation/**` · API: `POST /api/hr/hiring-activation/[id]/(review|create-member|open-onboarding|complete|cancel|resolve-blocker)`
- Flags: `HIRING_ACTIVATION_ENABLED` + `HIRING_HANDOFF_BRIDGES_ENABLED` (ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)
- Maquinaria reusada: `completeWorkforceMemberIntake` · `resolveWorkforceActivationReadiness` · `createOnboardingInstance`
