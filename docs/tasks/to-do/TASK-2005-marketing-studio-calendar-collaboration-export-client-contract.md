# TASK-2005 — Marketing Studio: contrato del calendario para colaborar, exportar y compartir

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-10-04 tras la aprobación del operador de la página v3.3 del canvas; ningún slice empezado`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-2001 (activaciones, evidencia y registro de eventos) · TASK-1913 para el slice de propuestas de agentes`
- Branch: `efeonce-marketing-studio main (migraciones, dominio, rutas, registro, manifiesto) · Greenhouse develop (docs, reader de feriados si falta en el lane ecosystem) · efeonce-mcp rama + PR (sync del manifiesto); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Contrato que necesita la siguiente iteración del calendario de activaciones: historial y comentarios por activación,
acciones en lote (reprogramar y cancelar), exportar (CSV con los filtros y suscripción iCal privada), vista de cliente de
sólo lectura, feriados y fechas comerciales por mercado, identidad visual de la campaña y propuestas de activación hechas
por agentes que una persona acepta. La UI que lo consume es TASK-2006.

## Why This Task Exists

El operador aprobó el 2026-10-04 la página «v3.3 · Siguiente iteración y después» del canvas «Efeonce Marketing Studio»
(renders en `docs/ui/visual-sources/TASK-2006-marketing-studio-calendar-next-iteration-ui/`) y la decisión de hacer las
cuatro funciones «para más adelante». Ninguna existe en el contrato de TASK-2001: sin readers y commands propios, la UI
tendría que inventar lógica (exportar, decidir qué ve un cliente, sumar comentarios), lo que rompe Full API Parity.

## Goal

- Cada función de v3.3 es un reader o command de `/api/v1` con su tool MCP, operable por persona, agente o CLI.
- El cliente ve sólo sus campañas, sin evidencia interna ni acciones, por una capability propia.
- Una propuesta de agente nunca es una activación hasta que una persona la acepta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (§15)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- Toda capacidad nace en el registro de operaciones con tool o exclusión justificada (skill `efeonce-marketing-studio`).
- La UI no calcula: estados, avisos, filas de exportación y lo que ve el cliente salen del servidor.
- Un agente propone y una persona confirma; el agente nunca escribe una activación `planned` por su cuenta.
- Feriados desde el calendario operativo canónico de Greenhouse (`src/lib/calendar/operational-calendar.ts`, Nager.Date + overrides), nunca una tabla paralela de feriados nacionales.

## Normative Docs

- `docs/tasks/to-do/TASK-2001-marketing-studio-campaign-activations-execution-evidence.md`
- `docs/tasks/to-do/TASK-2002-marketing-studio-activations-calendar-ui.md`
- `docs/ui/wireframes/TASK-2006-marketing-studio-calendar-next-iteration.md`

## Dependencies & Impact

### Depends on

- TASK-2001: `studio.activation`, `studio.execution_record`, registro de eventos por activación, `rescheduleActivation`, `cancelActivation`.
- TASK-1905: catálogo de canales y mercado como atributo de la activación.
- TASK-1913: work items y asignaciones de agentes (sólo para el slice de propuestas).
- `src/lib/calendar/operational-calendar.ts` y `src/lib/calendar/nager-date-holidays.ts` (Greenhouse).

### Blocks / Impacts

- TASK-2006 (UI de la siguiente iteración) consume todo este contrato.
- TASK-1892 / TASK-1910: dueños de las métricas que la hoja muestra como «Resultados»; esta task no las calcula.
- TASK-1898: la vista de cliente depende de cómo entra una persona cliente a Studio.

### Files owned

- `efeonce-marketing-studio/packages/database/migrations/<ts>_calendar-collaboration.sql` `[verificar nombre al crear]`
- `efeonce-marketing-studio/packages/domain/src/activations/{comments,bulk,export,proposals}.ts` `[verificar]`
- `efeonce-marketing-studio/packages/domain/src/readers/{client-calendar,calendar-markers}.ts` `[verificar]`
- `efeonce-marketing-studio/packages/contracts/src/operations-activations.ts` + `generated/tool-manifest.json`
- `efeonce-marketing-studio/apps/web/src/app/api/v1/{activations,calendar}/**`

## Current Repo State

### Already exists

- Diseño aprobado de la UI en `docs/ui/visual-sources/TASK-2006-marketing-studio-calendar-next-iteration-ui/approved-v33-*.webp`.
- Contrato base de activaciones y registro de eventos especificado en TASK-2001 (sin implementar).
- Calendario operativo con feriados en Greenhouse (`src/lib/calendar/`).

### Gap

- No hay comentarios, exportación, feed iCal, vista de cliente, fechas comerciales, identidad de campaña en el reader ni propuestas de agente.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-marketing-studio` — `packages/domain`, `packages/contracts`, `apps/web/src/app/api/v1`
- Future candidate home: `remain-shared`
- Boundary: commands y readers de activaciones de Studio; consumidores autorizados: web de Studio, MCP federado, CLI `pnpm studio`, Nexa
- Server/browser split: lógica y datos sólo en el servidor; el navegador llama `/api/v1` y descarga el CSV o la URL del feed
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (tablas nuevas aditivas, una capability nueva de lectura para cliente, un feed público firmado)
- Impacto principal: `api`
- Source of truth afectado: `studio.activation_comment`, `studio.calendar_feed`, `studio.commercial_date`, `studio.activation_proposal` (nuevas); `studio.campaign` (identidad visual, si falta)
- Consumidores afectados: web (calendario, hoja, Hoy), MCP, CLI, Nexa
- Runtime target: `staging` → `production`

### Contract surface

- Contrato existente a respetar: readers y commands de TASK-2001; registro de eventos; `GET /api/v1/calendar`.
- Contrato nuevo o modificado:
  - Comentarios: `listActivationComments`, `addActivationComment` (T1), `editActivationComment` y `deleteActivationComment` sólo del autor (T1); menciones que generan un ítem de atención en Hoy.
  - Lote: `bulkRescheduleActivations`, `bulkCancelActivations` (T1) con resultado por ítem (`ok | conflict | not_allowed`) y un `Idempotency-Key` por lote.
  - Exportar: `exportCalendar` (CSV con los mismos filtros del reader, columnas fijas y documentadas); `createCalendarFeed` / `revokeCalendarFeed` (T1) que emiten una URL iCal privada y revocable por persona.
  - Cliente: `getClientCalendar` (T0) con sólo las campañas de la organización, estados simplificados («Planificada» / «Publicada») y sin evidencia, herramientas ni bandejas.
  - Marcadores: `listCalendarMarkers` (T0) que une feriados por mercado (calendario operativo de Greenhouse) y fechas comerciales (`studio.commercial_date`: nombre, mercado, fecha o «por confirmar», fuente).
  - Identidad: el reader del calendario devuelve por campaña su portada (`cover_asset_version_id`) o un monograma; nunca un color inventado.
  - Propuestas: `listActivationProposals`, `acceptActivationProposal` (crea la activación `planned` con la persona como actor), `discardActivationProposal`; un agente crea propuestas sólo por su work item (TASK-1913), con motivo y evidencia.
- Backward compatibility: `compatible` — todo es aditivo; el reader del calendario agrega campos.
- Full API parity: cada operación con ruta `/api/v1`, entrada en el registro con `riskTier` y tool MCP; la UI de TASK-2006 escribe sólo por ellas.

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.activation_comment`, `studio.calendar_feed`, `studio.commercial_date`, `studio.activation_proposal`, `studio.campaign`.
- Invariantes que no se pueden romper:
  - Un comentario pertenece a una activación de la misma organización; borrar es lógico y queda en el registro de eventos.
  - Un lote nunca deja estados a medias sin informarlo: cada ítem devuelve su resultado y el lote es idempotente.
  - El feed iCal sólo expone campaña, canal, hora y estado simplificado; nunca copy completo, evidencia interna ni tokens; se revoca al instante.
  - `getClientCalendar` jamás devuelve campañas de otra organización ni nombres de herramientas internas.
  - Una propuesta aceptada crea una activación con actor persona y referencia a la propuesta; una propuesta descartada no vuelve sola.
  - Fechas comerciales «por confirmar» no se dibujan en un día concreto.
- Write-target allowlist: `N/A` (Studio no tiene boundary test de destinos de escritura).
- Tenant/space boundary: organización vía la campaña (`scopeCampaigns`) en todos los readers y commands.
- Idempotency/concurrency: `Idempotency-Key` en lote y comentarios; `If-Match` por activación en el lote.
- Audit/outbox/history: cada command escribe en el registro de eventos de TASK-2001 y en `audit_event`.

### Migration, backfill and rollout

- Migration posture: `additive` (tablas nuevas).
- Default state: flag OFF `STUDIO_CALENDAR_COLLAB_ENABLED` (web y MCP).
- Backfill plan: sembrar `studio.commercial_date` con las fechas que el operador confirme (Black Friday; CyberMonday Chile «por confirmar»).
- Rollback path: flag OFF; `migrate down` sólo sin comentarios ni feeds creados.
- External coordination: la capability de cliente se registra en Greenhouse (registry + grant en el mismo PR).

### Security and access

- Auth/access gate: lectura `marketing_studio.campaign.read`; escritura `marketing_studio.campaign.write` (T1); cliente `marketing_studio.calendar.client_read` (nueva, con grant a un rol cliente real); feed iCal por token firmado de un solo uso por persona, rotado al revocar.
- Sensitive data posture: comentarios pueden tener nombres de personas (no PII sensible); el feed no expone copy ni evidencia.
- Error contract: `comment_not_found`, `comment_not_author`, `bulk_partial`, `feed_revoked`, `proposal_already_decided`, `client_scope_denied` (catálogo cerrado, es-CL).
- Abuse/rate-limit posture: exportación acotada a un año por solicitud; feed con caché y límite por token.

### Runtime evidence

- Local checks: tests de cada command (autor, idempotencia del lote, revocación del feed), leak test de `getClientCalendar` y del feed, paridad del registro.
- DB/runtime checks: migración up/down/up en staging; feed iCal importado en un cliente de calendario real.
- Integration checks: feriados de Chile y Perú desde el calendario operativo de Greenhouse.
- Reliability signals/logs: `audit_event` por command; conteo de feeds activos en el health profundo.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist del dominio donde exista: `N/A`.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `packages/domain/src/activations` y `readers`, no en la UI.
- [ ] Cada función modelada como recurso con commands, no como handler de pantalla.
- [ ] Read como reader canónico; write como command con autorización fina, idempotencia, audit y errores canónicos.
- [ ] Capability `marketing_studio.calendar.client_read` + grant en el mismo PR.
- [ ] Camino programático: `/api/v1` + tool MCP + CLI `pnpm studio`.
- [ ] Writes aptos para `propose → confirm → execute`; las propuestas de agente son exactamente ese loop.
- [ ] Un primitive, muchos consumers.
- [ ] Parity check = SÍ.

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

### Slice 1 — Comentarios e identidad

- Tabla y commands de comentarios con menciones a Hoy; reader del calendario con portada o monograma por campaña.

### Slice 2 — Lote

- `bulkRescheduleActivations` y `bulkCancelActivations` con resultado por ítem, idempotencia y eventos.

### Slice 3 — Exportar y feed

- `exportCalendar` (CSV) y feed iCal privado con creación y revocación.

### Slice 4 — Marcadores

- `listCalendarMarkers` con feriados por mercado desde Greenhouse y `studio.commercial_date` con su semilla.

### Slice 5 — Vista de cliente

- `getClientCalendar` con capability propia, grant y leak test.

### Slice 6 — Propuestas de agente

- `activation_proposal` y sus commands sobre los work items de TASK-1913.

### Slice 7 — Registro, manifiesto y paridad MCP

- Entradas en el registro, tools en el manifiesto, sync del gateway y prueba por sesión MCP real.

## Out of Scope

- La UI (TASK-2006); métricas de resultados (TASK-1892/1910); arrastrar para reprogramar; publicar en herramientas.

## Detailed Spec

Diseño de referencia: wireframe de TASK-2006 y renders `approved-v33-*.webp`. Columnas del CSV: campaña, activación,
modality, family, platform, placement, account, mercado, fecha planificada, estado de ejecución, herramienta, fecha en la
herramienta, publicada, permalink, tracking URL. Evento iCal: título «{campaña} · {platform} · {placement}», hora en la
zona de la cuenta y estado en la descripción.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 → 4 en orden; Slice 5 después de registrar la capability; Slice 6 sólo con TASK-1913 vivo; Slice 7 cierra cada slice.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El cliente ve datos de otra organización o evidencia interna | identity | low | `scopeCampaigns` + leak test + capability propia | test rojo; `audit_event` con `client_scope_denied` |
| Un feed filtrado expone el plan | identity | low | token por persona, revocable, sin copy ni evidencia | conteo de feeds en health |
| Un lote deja estados a medias | UI / data | medium | resultado por ítem + idempotencia | `bulk_partial` en audit |
| Un agente crea activaciones sin persona | data | low | sólo `activation_proposal`; aceptar exige persona | audit sin actor persona |

### Feature flags / cutover

- `STUDIO_CALENDAR_COLLAB_ENABLED` (default OFF) en web y MCP; se prende tras staging.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–4 | flag OFF; revert | <10 min | si |
| Slice 5 | flag OFF + quitar grant | <10 min | si |
| Slice 6 | flag OFF; propuestas quedan sin efecto | <10 min | si |
| Slice 7 | revert del manifiesto y sync | <15 min | si |

### Production verification sequence

1. Migración y tests en staging con el flag ON.
2. Leak test del cliente y del feed contra staging.
3. Push de Studio con autorización del operador; flag ON en producción.
4. Prueba por sesión MCP real de cada operación nueva.

### Out-of-band coordination required

- Confirmación del operador de las fechas comerciales y del rol cliente que recibe la capability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Comentarios, lote, exportar, feed, marcadores, vista de cliente y propuestas existen como operaciones `/api/v1` con tool MCP.
- [ ] `getClientCalendar` y el feed pasan un leak test: sin otras organizaciones, sin evidencia interna ni nombres de herramientas.
- [ ] Un lote devuelve resultado por ítem y repetirlo con la misma clave no duplica cambios.
- [ ] Los feriados salen del calendario operativo de Greenhouse; las fechas «por confirmar» no se dibujan en un día.
- [ ] Una propuesta de agente sólo se convierte en activación cuando una persona la acepta.
- [ ] `pnpm check` y `pnpm build` de Studio verdes; prueba por sesión MCP real registrada.

## Verification

- `pnpm check`, `pnpm test` y `pnpm build` (Studio)
- Leak test y prueba por sesión MCP real
- Feed iCal importado en un cliente de calendario

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] skill `efeonce-marketing-studio` actualizada (contratos, operaciones, lecciones)

## Follow-ups

- Arrastrar para reprogramar (usa `rescheduleActivation` de TASK-2001).

## Open Questions

- ¿Qué rol cliente real recibe `marketing_studio.calendar.client_read` y cómo entra a Studio (TASK-1898)?
- ¿El feed iCal es por persona o también por campaña compartible con el cliente?
