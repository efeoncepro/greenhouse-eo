# TASK-1757 — Rotar el acceso de un candidato sin avisarle lo deja fuera en silencio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-011`
- Status real: `Flag ON autorizado por el CEO; falta ejercitar una rotación real con el código desplegado`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Emitir un enlace seguro de recuperación **mata la credencial anterior del candidato** y se la entrega
en mano al operador. Si esa entrega falla, la persona queda sin acceso, sin saber por qué y con su
plazo corriendo. Esta task agrega el aviso al candidato —**sin la credencial**— y la señal que
detecta cuando ni el aviso salió.

## Why This Task Exists

El hueco lo destapó la auditoría adversarial del Slice 4 de TASK-1747, y lo confirmaron dos
revisiones independientes (dominio de talento y arquitectura) el 2026-08-20.

Tres hechos que lo hacen P1:

1. **La elegibilidad permite recuperar en `in_progress`.** Alguien puede estar respondiendo el test
   en otra pestaña y ser expulsado en silencio, con el reloj corriendo: la recuperación nunca
   devuelve tiempo.
2. **El sistema es ciego justo donde puede fallar.** La señal `hiring.assessment.access_never_exchanged`
   joinea contra `email_deliveries`, y una recuperación por `secure_link` **no produce fila de
   delivery** (`delivery_id` es `NULL` por CHECK de schema). El único canal donde la entrega puede
   fallar en silencio es precisamente el que esa señal no puede ver, por construcción.
3. **Contamina el instrumento.** Un candidato que no rinde por una falla de infraestructura no entra
   al pool como "no evaluado": entra como ausencia de evidencia, que se lee de facto como descarte.
   Y se lo come asimétricamente quien tiene menos capacidad de insistir.

El diseño original **no excluyó el aviso a propósito**: no aparece en el ADR de TASK-1746 ni entre
sus non-goals. Fue una omisión, no una decisión — pero como Privacidad aprobó el flujo *tal como
está especificado*, agregar un correo saliente candidate-facing sí necesita su propia puerta.

## Goal

Que ninguna rotación de credencial deje al candidato sin saber que su acceso cambió, y que cuando el
aviso no pueda salir, el sistema lo sepa y alguien pueda actuar antes de que se venza el plazo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**Coordinación de `send.ts` — tres tasks lo tocan.**

El ADR no cambia el aviso de rotación (no es candidate-facing de desenlace), pero **sí toca el mismo
archivo**: `notifications/send.ts:285` es el `no-op: etapa no candidate-facing` que el eje de desenlace
reescribe. `TASK-1754` reclama `src/lib/hiring/notifications/**` completo y `TASK-1762` también.

Acordar el orden de merge antes de tocar el bloque de rotación. El alcance de esta task no cambia.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- El aviso **NUNCA** lleva el enlace, el token ni nada derivable de ellos. El canal existe para
  entregar la credencial por una vía donde el operador verifica identidad.
- El aviso **NUNCA** usa el carril `token_sensitive`: no hay credencial que ligar, y el CHECK del
  receipt prohíbe un `delivery_id` en una fila `secure_link`.
- El disparo cuelga del **evento de dominio**, no del route handler: cualquier consumidor del
  command debe avisar por construcción.
- El aviso **NUNCA** sale con el buzón bloqueado por el proveedor. El command ya rechaza duro el
  canal de correo con esa misma evidencia.
- El ledger de recuperaciones es append-only y IDs-only: el aviso **NO** escribe ahí.

## Normative Docs

- `docs/tasks/complete/TASK-1746-assessment-access-recovery-command.md`
- `docs/tasks/in-progress/TASK-1747-application360-assessment-access-recovery-ui.md`
- `docs/manual-de-uso/hr/recuperar-acceso-a-test-de-candidato.md`

## Dependencies & Impact

### Depends on

- `src/lib/hiring/assessment/access-recovery/` (command y reader de TASK-1746)
- `src/lib/email/delivery.ts` + `src/lib/hiring/notifications/send.ts`
- `EVENT_TYPES.hiringAssessmentAccessRecoveryRecorded` (ya se publica; tenía cero consumidores)

### Blocks / Impacts

- TASK-1747 consume la predicción del aviso en su diálogo de recuperación.
- Toca el mismo archivo de projections que TASK-1689; coordinar si vuelve a estar activa.

### Files owned

- `src/lib/hiring/assessment/access-recovery/provider-block.ts`
- `src/emails/HiringAssessmentAccessRotatedEmail.tsx`
- `src/lib/reliability/queries/hiring-assessment-rotation-notice-signals.ts`
- El bloque de rotación en `send.ts` y su projection
- Sus tests

## Current Repo State

### Already exists

- El evento se publica dentro de la misma transacción que la rotación, así que el aviso se
  considera si y sólo si la rotación commiteó.
- El patrón de consumer reactivo de correo, con seis hermanos en `hiring-lifecycle-emails.ts`.
- `email_type_config` como kill-switch por tipo, flipeable sin redeploy.
- El test anti-fuga de los correos del ciclo, que ya existía para esta clase de regresión.

### Gap

- Ningún consumidor del evento: la rotación era silenciosa para el candidato.
- Ninguna señal cubría el fallo de entrega en mano.
- El predicado de "el proveedor bloqueó esta dirección" estaba escrito dos veces, verbatim.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/` + `src/lib/sync/projections/` + `src/lib/reliability/queries/`
- Future candidate home: `remain-shared`
- Boundary: consumer reactivo del ops-worker; ningún handler de Vercel lo ejecuta.
- Server/browser split: la decisión pura es isomorfa (la consume la UI); el envío es server-only.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_hiring.hiring_assessment_access_recovery` (lectura)
- Consumidores afectados: ops-worker (consumer), Application 360 (predicción)
- Runtime target: `ops-worker`

### Contract surface

- Contrato existente a respetar: el command de TASK-1746 y su ADR; el ledger append-only.
- Contrato nuevo o modificado: tipo de correo `hiring_assessment_access_rotated`, projection
  `hiring_assessment_access_rotated_email`, señal `hiring.assessment.access_recovery.rotation_unnotified`.
- Backward compatibility: `compatible` — nada existente cambia de forma.
- Full API parity: sin capability nueva. El aviso no es una acción que alguien ejecute: es
  consecuencia de una ya autorizada. Colgar del evento de dominio es lo que hace que TODO consumidor
  del command lo obtenga por construcción.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva. Una fila de seed en `email_type_config`.
- Invariantes que no se pueden romper:
  - El aviso NUNCA contiene el enlace ni el token.
  - El aviso NUNCA sale con el buzón bloqueado por el proveedor.
  - El ledger de recuperaciones no recibe escrituras nuevas.
- Write-target allowlist: N/A — sólo `email_deliveries`, vía el primitive canónico.
- Tenant/access boundary: sin cambios; el consumer corre server-side.
- Idempotencia/concurrencia: llave determinista por RECUPERACIÓN, no por evento. Un replay del
  command retorna antes del publish, así que no genera un segundo aviso.
- Migración/backfill/rollback: seed `enabled = FALSE`. Rollback = `SET enabled = FALSE`.
- Datos sensibles: el correo es PII y vive en `email_deliveries`, como los otros seis de hiring. El
  aviso NO lleva bearer, así que no necesita el carril token-sensitive y sí puede auditarse.
- Audit/signal posture: la traza es la fila de `email_deliveries` (`source_entity = recoveryId`); el
  skip queda en el reactive log con su causa.
- Runtime evidence: ejercitar el consumer contra una rotación real antes del flip.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Lo completa el agente que TOMA la task, no quien la crea.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Decisión pura.** `decideAssessmentAccessRotationNotice` en el vocabulario isomorfo,
  con sus cinco motivos de omisión. ✅
- **Slice 2 — Predicado único.** Extraer "el proveedor bloqueó esta dirección" a una fuente única
  antes de agregar el tercer consumidor. ✅
- **Slice 3 — Tipo, plantilla y puerta.** Correo sin credencial + migración con seed `FALSE`. ✅
- **Slice 4 — Consumer.** Sender + projection + test anti-fuga extendido. ✅
- **Slice 5 — Predicción en la superficie.** El operador ve ANTES de confirmar si el candidato va a
  ser avisado. ✅
- **Slice 6 — Señal + rollout.** Señal de rotaciones sin aviso ✅; `reply-to` en la plataforma ✅;
  CLI gobernado del kill-switch ✅; flip aplicado con autorización del CEO ✅.

## Out of Scope

- Extender el plazo del candidato cuando la entrega falla. El command nunca agrega tiempo y hay un
  flujo gobernado de accommodations; cambiarlo es decisión de negocio.
- Un botón de auto-reenvío en el correo: anularía la verificación de identidad.
- El acuse de entrega del operador (marcar "entregado"), que es follow-up.
- El canal `email`, que ya lleva el aviso y la credencial en el mismo mensaje.

## Detailed Spec

La tensión central es que el enlace seguro existe *porque* el correo falló, así que avisar por
correo puede ser inútil o dañino. Se resuelve en dos planos: el motivo declarado fija la intención,
el estado del proveedor fija la factibilidad, y **la factibilidad manda y es fail-closed**.

El párrafo de "responde este correo y lo reponemos" no es cierre de cortesía: es la condición que
hace legítimo el aviso. Un correo que anuncia una entrega que después no ocurre deja al candidato
peor que el silencio.

## Rollout Plan & Risk Matrix

Nace apagado por seed. El deploy es ordinario; el flip es una decisión separada.

### Slice ordering hard rule

- Slice 2 va ANTES del Slice 4: el tercer copy-paste del predicado es cómo se convierte en tres que
  divergen en silencio.
- Slice 5 va ANTES del flip: el operador tiene que ver la predicción antes del primer aviso real, no
  después.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Alguien agrega el enlace al correo "para ayudar" | Hiring | Media | Cinco tests anti-fuga con la fila de origen envenenada | Suite de hiring |
| El backfill del primer drenaje avisa a todo el histórico | Hiring | Alta | Seed `FALSE`: el consumer corre pero `sendEmail` corta en el kill-switch | Reactive log |
| El aviso sale a un buzón bloqueado y quema reputación | Notificaciones | Media | Guarda fail-closed con la misma evidencia que el command | `email.delivery.*` |
| El SQL de la señal y la función TS divergen | Reliability | Alta | Test de paridad sobre la unión de motivos | Suite de reliability |

### Feature flags / cutover

`email_type_config.hiring_assessment_access_rotated = FALSE`. Fila en el ledger. Subordinado a
`HIRING_LIFECYCLE_EMAILS_ENABLED` (ya ON en el ops-worker).

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1–5 | revert del commit | minutos | sí |
| 6 (flip) | `SET enabled = FALSE` | inmediato, sin redeploy | sí |

### Production verification sequence

1. Ejercitar una rotación real en staging con el flag ON y confirmar que el correo llega SIN enlace.
2. Confirmar que con buzón bloqueado no sale nada y el skip queda en el reactive log.
3. Verificar que la señal reporta `ok` con los datos de hoy.

### Out-of-band coordination required

Resuelto: el CEO autorizó el flip y comprometió el buzón atendido (2026-08-20). Queda la parte
operativa —que alguien efectivamente lea y responda `people@efeoncepro.com`— que no es código.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La decisión de avisar vive en una función pura isomorfa, consumida por el envío y la pantalla.
- [x] El predicado de buzón bloqueado tiene una sola fuente.
- [x] El correo no contiene el enlace ni el token, y hay tests que lo hacen cumplir.
- [x] El disparo cuelga del evento de dominio, no del route handler.
- [x] El dedupe es por recuperación, no por evento.
- [x] El correo nace apagado por seed, con guarda que aborta si llegara encendido.
- [x] El operador ve antes de confirmar si el candidato va a ser avisado.
- [x] Existe señal con `steady = 0` para rotaciones sin aviso.
- [x] Hay test de paridad entre el SQL de la señal y la función TS.
- [x] Sign-off del CEO sobre el copy y la condicionalidad (2026-08-20).
- [x] `reply-to` implementado en la plataforma y comprometido por el CEO como buzón atendido.
- [ ] Rotación real ejercitada con el flag ON.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/hiring src/lib/reliability src/lib/sync src/lib/email`
- Rotación real en staging con el flag ON

## Closing Protocol

- [ ] Lifecycle y ubicación del archivo reflejan estado real.
- [ ] README y registry sincronizados.
- [ ] Handoff y changelog registran la evidencia runtime.
- [ ] Delta en el ADR de TASK-1746 registrando que el aviso se agregó y por qué.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` pasan al cierre.

## Follow-ups

- Acuse de entrega del operador: una revelación sin confirmar es una entrega pendiente, no una tarea
  terminada. Sin eso, el operador cierra la pestaña y el caso desaparece de su cabeza.
- Extensión retrospectiva del DTO de disponibilidad (`notifiedAt` / `noticeStatus`) para responder
  "¿se le avisó?" desde la ficha sin mirar el dashboard de reliability.
- Destacar en la superficie cuando el test está `in_progress`: "esta persona está rindiendo ahora
  mismo" cambia por completo el costo de una entrega tardía.

## Open Questions

- ¿Una entrega fallida debe reponer plazo al candidato? Hoy el sistema dice que no, y eso es una
  política, no un defecto. La firma People Ops.
- ¿La fila de `email_deliveries` del aviso se purga junto al ledger cuando el candidato retira su
  consentimiento?
