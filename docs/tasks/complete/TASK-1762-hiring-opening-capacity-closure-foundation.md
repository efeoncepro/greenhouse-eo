# TASK-1762 — Hiring Opening Capacity Closure and Candidate Disposition Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration|command|reader|sync`
- Epic: `EPIC-011`
- Status real: `Slices 1-5 code complete 2026-08-23; rollout pendiente (flags OFF, correo apagado, canary no ejercitable)`
- Rank: `TBD`
- Domain: `hr|data|ops`
- Blocked by: `none` — el ADR quedó `Accepted` el 2026-08-23 tras la enmienda de reconciliación de cupos
- Nota de desbloqueo (2026-08-23): el eje de desenlace y la causa gobernada están en producción; sólo queda la decisión de arquitectura
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-22 — HABILITADA por TASK-1765

- **El par `not_selected` + `capacity_filled` ya es escribible.** `decideHiringApplication` recibe
  `cause` y la persiste en el mismo `UPDATE` que el desenlace, en la entrada de historial y en el
  payload de `hiring.application.decided`. El Slice 3 de esta task puede llamarlo tal cual.
- **La causa entra en la comparación de replay**: misma idempotency key con distinta causa responde
  **409**, no un replay silencioso. Importa para el run por cohorte: si un item se reintenta con otra
  causa, es un conflicto que hay que ver, no una escritura que se descarta callada.
- **Errores canónicos disponibles**: `hiring_decision_cause_required` (422) y
  `hiring_decision_cause_not_allowed` (422). El worker no necesita inventar los suyos.
- **Sigue siendo tuyo `hiring_decision_not_selected`.** El selector de `send.ts` ya es un mapa
  explícito con **no-op declarado**: hoy un cierre `not_selected` **no manda ningún correo**, que es
  preferible a mandar uno de rechazo a quien nadie rechazó. Al crear el tipo, agregar su fila al mapa
  `DECISION_EMAIL_TYPE`, su `email_type_config` y su seed en `services/ops-worker/deploy.sh` — **NO**
  en Vercel, o el envío queda apagado sin que nada avise.
- Recordatorio del ADR §9: el desenlace de una cohorte cerrada por capacidad es `not_selected`, **no**
  `rejected`. Marcar 33 personas como rechazadas les atribuye un juicio que nadie emitió e infla la
  tasa de rechazo de su cohorte demográfica en el análisis de impacto adverso.

## Delta 2026-08-23 — recalibración de baseline pre-ejecución (el gap declarado era falso)

**La spec afirmaba «No existe capacidad por opening». Es falso, y la corrección cambia el diseño.**
`hiring_opening.requested_seats` existe desde `TASK-353` (`INTEGER NOT NULL DEFAULT 1 CHECK (>= 1)`,
migración `20260707235655376`), **el operador lo lee en la columna «Cupos» del Demand Desk**
(`DemandDeskView.tsx:981`) **y lo edita en el campo «Cupos»** del formulario (`:1240`, `min 1 max 100`).
Nada ramifica por él hoy: es descriptivo, sin consumidor de decisión.

**Consecuencia de diseño, ya aplicada al ADR (`Accepted` 2026-08-23):** `hiring_opening_capacity`
**NO guarda `target_seats`**. El conteo se queda donde ya vive y donde el operador ya lo ve; la tabla
nueva declara sólo el **opt-in y su gobernanza** (`opening_id` PK, `managed_since`, `set_by_user_id`,
`reason`, `policy_version`). `unmanaged` = **ausencia de fila de política**, no un `NULL` en el conteo.

Razón: un `target_seats` propio sería un **segundo «Cupos»** decidiendo el cierre de una cohorte real
mientras la pantalla que el operador usa muestra el primero. Es la falta que `arch-architect` marca como
la más común (*extender, no paralelizar*) y la que este dominio ya corrigió tres veces (`sent` ≠ entregado;
etapa ≠ desenlace; estado de la vacante ≠ desenlace de la persona).

Se descartó también hacer la columna nullable: las filas vivas dicen `1` y **no se puede distinguir
«alguien eligió 1» de «disparó el `DEFAULT 1`»**, así que no produce el `unmanaged` buscado.

**Guarda que reemplaza al invariante «target_seats > 0; ausencia no se interpreta como uno»:** con
política vigente, `requested_seats` sólo cambia por el command de capacidad (capability
`hiring.opening.capacity.confirm` + audit); `updateHiringOpening` lo rechaza. Sin política, la columna
conserva su comportamiento actual. Defensa en profundidad: guarda de aplicación + trigger + audit + señal.

**Otros supuestos recalibrados:**

- La spec cita «15 y 33 personas». Hoy (2026-08-23, PG real) son **36** en `EO-OPN-0061` y **14** en
  `EO-OPN-0009`.
- **Ambas openings tienen 0 `selected`**, así que la capacidad no puede estar llena y el canary de Slice 5
  no es ejercitable sin seleccionar a alguien primero. No es agenda: condiciona el plan de rollout.
- `TASK-1765` está `complete` y **en producción** desde el release `709e15f6688e`: `not_selected`,
  `capacity_filled` y el `cause` de `decideHiringApplication` ya existen. Slice 3 los consume tal cual.
- `TASK-1764` sigue `to-do`: sin ella el `EmailType` nuevo cae al perfil de footer legacy en silencio.
  Bloquea **sólo** Slice 4, no Slices 1-3.

## Delta 2026-08-23 (2) — decisión resuelta: el cierre masivo NO se federa como acción de agente

`TASK-1773` dejaba abierto si el carril gobernado federa también el cierre masivo o sólo la decisión
individual. **Queda resuelto acá para que no siga siendo un supuesto: no se federa.**

El cierre masivo es un efecto externo irreversible sobre decenas de personas y su gate es una
confirmación humana contra un digest fresco. Federarlo convertiría el `preview → confirm` en una
llamada, que es exactamente el gate que el ADR existe para imponer — y bajo el AI Act, selección es
alto riesgo con supervisión humana obligatoria: una acción de agente que cierra una cohorte es
precisamente la decisión automatizada que no se puede tomar.

**Lo que el carril SÍ expone, y basta para Full API Parity:** el `preview` de la cohorte (lectura) y
el `status` del run (lectura). Un agente puede explicar a cuántas personas afectaría un cierre y en
qué va uno en curso; no puede dispararlo. Es el mismo reparto que ya rige en el resto de Hiring: el
LLM propone y lee, el humano confirma en el endpoint de confirmación.

La decisión individual (`decideHiringApplication`) conserva su propio contrato y no cambia acá.

## Delta 2026-08-23 (3) — cierre: los 5 slices, y qué falta para que exista en runtime

**`code complete, rollout pendiente`.** Nada de esto está encendido: los dos flags nacen OFF y el
`EmailType` nuevo nace `enabled=false` por seed. Hoy no cambia nada para ningún candidato.

| Slice | Qué quedó |
|---|---|
| 1 | Política de capacidad **sin conteo** + trigger de guarda sobre `requested_seats` + capabilities |
| 2 | Preview con `effectDigest` + confirm durable con run/items + status reader |
| 3 | Reconciler vía command canónico + presupuesto de reintentos + cuarentena + 2 señales |
| 4 | `EmailType` propio + variante consent-aware + seed apagado + 2 flags en `ops-worker` |
| 5 | Ruta `GET/POST /api/hiring/openings/[id]/capacity-closure` + doc funcional + manual |

### Bloqueadores de rollout — reales, no de agenda

1. **El canary NO es ejercitable hoy.** Las dos vacantes vivas tienen **0 `selected`**, así que la
   capacidad nunca está llena y el confirm se niega con `hiring_opening_capacity_not_filled`, que es
   la conducta correcta. Ejercitar el camino completo exige seleccionar a alguien primero.
2. **`TASK-1764` sigue `to-do`.** Sin ella, `hiring_decision_not_selected` cae al perfil de footer
   **legacy en silencio**. Bloquea el correo, no el cierre — por eso los flags son independientes.
3. **Falta sign-off de Talent y Privacidad** sobre el copy y el gate de consentimiento.

### Lo que NO se verificó, y hay que decirlo

- **Ningún cierre real se ejecutó.** Los live tests del reconciler son read-only sobre datos de
  candidatos a propósito: escribir un desenlace desde un test tocaría a una persona verdadera de las
  ~50 de la base compartida, y el desenlace es append-only.
- **Ningún correo se envió.** La variante nueva se ejercitó por registro y preview, nunca por entrega.
- El readback de aceptación (`cero rejected`, `cero sin capacity_filled`) corre verde **sobre cero
  items decididos**: prueba que el invariante no se viola, no que el camino funciona.

### Follow-up abierto

El seed de `TASK-1757` (`20260820045834971`) tiene el mismo `Down` con `DELETE` sobre una tabla
fail-open. Su fila está hoy `enabled=true`, así que **no hay riesgo vivo** — borrarla la deja en el
mismo estado efectivo. Es una trampa latente que se arma sólo si alguien pausa ese correo y después
revierte la migración. Necesita forward fix propio; no se toca desde esta task.

## Summary

Crea la fuente de verdad de cupos por vacante y el cierre durable de una cohorte. El operador obtiene un preview,
confirma el efecto y un worker registra en cada candidatura restante el desenlace `not_selected` con causa
`capacity_filled` mediante el command canónico, emitiendo el email empático correcto sin duplicados y sin inventar
consentimiento de Banco de Talentos. Nadie queda marcado `rejected` por un cupo que tomó otra persona.

## Why This Task Exists

`TASK-1689` posee el correo individual y `TASK-1721` excluye deliberadamente capacity/opening closure. Hoy no hay
cupos declarados, run de cierre, confirmación, recuperación parcial, ni un eje que distinga un **descarte**
(`rejected`, juicio desfavorable sobre la persona) de una **sin selección** por vacante completada (`not_selected`
con causa `capacity_filled`, donde nadie juzgó a nadie). Inferirlo desde `hiring_opening.status` o ejecutar un batch
SQL rompería los boundaries de Hiring.

## Goal

- Modelar capacidad sin mezclarla con publicación ni persistir un contador derivado.
- Ejecutar `preview → confirm → run` con cohorte exacta, idempotencia, audit, outbox y recovery.
- Reusar el command de decisión y el pipeline de email de `TASK-1689` con una variante propia de «sin selección»,
  copy personalizado y consentimiento verdadero.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**El ADR §9 ENMIENDA esta task.** El desenlace de una cohorte cerrada por capacidad es **`not_selected`
con causa `capacity_filled`, NO `rejected`**.

Razón: `rejected` es un juicio sobre la persona. Aplicarlo a una cohorte que nadie juzgó le atribuye una
causa falsa **en el registro** (aunque el correo diga otra cosa), la deja fuera del Talent Pool por defecto,
sesga a cualquier revisor futuro que lea su historia, y **distorsiona el análisis de impacto adverso**:
inflaría la tasa de rechazo de la cohorte demográfica que estuviera ahí. El nombre de la causa se conserva
tal como esta task ya lo especifica.

**Puntos a reescribir:** el Summary («rechaza cada candidatura restante» → «registra el desenlace
`not_selected` con causa `capacity_filled`»); el gap («rechazo directo» → «descarte vs sin selección»); las
decisiones vigentes que excluyen `selected|rejected|withdrawn` (faltan `not_selected` y `unresponsive`, y
**`on_hold` deja de ser desenlace** — una pausa vive en la etapa `decision_pending`, así que esa categoría
del preview cambia de «decisión `on_hold`» a «etapa `decision_pending` sin desenlace»); el Slice 3
(`decideHiringApplication` debe recibir desenlace **y** causa — hoy no acepta ninguno de los dos); el email
(`not_selected + capacity_filled` es «esta vez elegimos a otra persona», **no** el template de rechazo); el
flag `HIRING_CAPACITY_REJECTION_EMAIL_ENABLED` y el signal `capacity_rejection_failed`, cuyos nombres quedan
mentirosos.

`Blocked by`: además del ADR de capacidad, ahora **`TASK-1765`** — el eje de desenlace no existe todavía.

El ADR de capacidad (`GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1`) sigue `Proposed`, así que se
corrige **en sitio**, no se supersede.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (§9 enmienda la disposición de la cohorte)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Selección, cierre de publicación y capacidad llena son hechos distintos.
- El desenlace de una cohorte cerrada por capacidad es `not_selected` con causa `capacity_filled`. **NUNCA `rejected`**:
  ese literal es un juicio sobre la persona y aplicarlo a quien nadie juzgó le atribuye una causa falsa en el registro,
  la saca del Talent Pool por defecto y distorsiona el análisis de impacto adverso.
- El desenlace describe qué le pasó a la persona; el estado de la vacante entra como **causa**, nunca como etiqueta.
- No hay cierre masivo de cohorte ni email externo sin preview fresco y confirmación humana.
- Cada aplicación cambia mediante el command canónico y conserva historia de supersede.
- `data_origin` nunca gatea comunicaciones; consentimiento sí gobierna la promesa de contacto futuro.

## Normative Docs

- `docs/tasks/complete/TASK-1689-hiring-lifecycle-transactional-emails.md`
- `docs/tasks/to-do/TASK-1721-governed-hiring-selection-journey-orchestrator.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/context/05_voz-tono-estilo.md`

## Dependencies & Impact

### Depends on

- `TASK-1765`: el eje de desenlace (`selected|backup_selected|not_selected|rejected|withdrawn|unresponsive`) y la
  causa gobernada (`capacity_filled|opening_closed|process_cancelled`). Hoy no existen; esta task los consume.
- `TASK-1764` (`EPIC-042`): resuelve el perfil de footer **por `EmailType`**. El tipo nuevo
  `hiring_decision_not_selected` debe declararse ahí en el mismo PR; si no, **cae al perfil legacy en silencio**.
- `src/lib/hiring/decide.ts`, outbox/projection y email log existentes.
- `greenhouse_hiring.talent_pool_membership` y su policy vigente de consentimiento futuro.

### Blocks / Impacts

- Bloquea `TASK-1763`.
- Impacta `TASK-1721` como next action observable, sin absorber su saga de selección.
- Extiende el consumer cerrado de `TASK-1689`; no reabre esa task histórica.
- Agrega un `EmailType` al inventario que `TASK-1764` está cohortizando: coordinar el perfil, no promoverlo por fuera.

### Files owned

- `src/lib/hiring/opening-capacity/**` *(nuevo)*
- `src/lib/hiring/decide.ts` y contratos/eventos de decisión, sólo en la causa allowlisted
- `src/lib/hiring/notifications/**`
- `src/emails/HiringDecisionEmail.tsx`
- `services/ops-worker` en el registro/caller del reconciler
- `migrations/*task-1762*hiring*capacity*.sql`
- reliability, capabilities, flags y docs de Hiring afectados

## Current Repo State

### Already exists

- Decisión atómica con lock, idempotency key, historia y `hiring.application.decided`.
- Email `hiring_decision_rejected` con anti-stale, dedupe y kill-switch independiente.
- Banco de Talentos con consentimiento futuro explícito, vigente y reversible.

### Gap

- No existe capacidad por opening ni cierre de cohorte.
- No existe el eje de desenlace ni la causa gobernada: `decideHiringApplication` no acepta ninguno de los dos, así que
  hoy el único cierre representable es `rejected` — el literal que el ADR de vocabulario prohíbe para este caso.
- El recipient context no resuelve causa de decisión ni consentimiento vigente.
- No hay ledger/run por item, recovery parcial o signal de cierre atascado.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/hiring`, Vercel adapters y ops-worker compartido
- Future candidate home: `domain-package`
- Boundary: `previewHiringOpeningCapacityClosure`, `confirmHiringOpeningCapacityClosure`, status reader y reconciler; todos los consumers llaman estos primitives
- Server/browser split: DB, locks, PII, consent policy y worker son server-only; DTO preview/status es browser-safe y allowlisted
- Build impact: `none; sin SDK ni filesystem input nuevo`
- Extraction blocker: `transacciones PG, decision command, outbox, email log y auth/capabilities compartidas`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration|command|reader|sync`
- Source of truth afectado: `hiring opening capacity + application decision history + closure run ledger`
- Consumidores afectados: `Hiring Desk, Product API/MCP futuro, ops-worker, notifications, Platform Health`
- Runtime target: `local|staging|production|worker`

### Contract surface

- Contrato existente a respetar: `decideHiringApplication`, `hiring.application.decided`, email log y Talent Pool consent policy
- Contrato nuevo o modificado: capacity policy; preview/confirm/status; closure run/items; el par desenlace `not_selected` + causa `capacity_filled` que `TASK-1765` habilita en el command
- Backward compatibility: `gated`; openings sin capacity permanecen `unmanaged`
- Full API parity: UI/API/Nexa/MCP futuros consumen los mismos readers/commands; ningún adapter calcula cohorte o escribe tablas

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_opening_capacity`, `hiring_opening_closure_run`, `hiring_opening_closure_run_item`, `hiring_application` sólo vía command e historia existente
- Invariantes que no se pueden romper:
  - `target_seats > 0`; ausencia no se interpreta como uno.
  - Cupos ocupados se derivan de decisiones vigentes `selected`; no existe contador paralelo.
  - Una opening tiene como máximo un run vigente por versión/digest y cada item una terminalidad observable.
  - Quedan fuera de la cohorte las candidaturas con desenlace vigente ya terminal: `selected`, `not_selected`,
    `rejected`, `withdrawn` y `unresponsive`.
  - `backup_selected` (desenlace vigente, compromiso abierto) y la pausa —que **ya no es un desenlace `on_hold`** sino
    **etapa `decision_pending` sin desenlace declarado**— se muestran como categorías separadas del preview y sólo
    entran al run si la confirmación las incluye explícitamente.
  - El desenlace que el run escribe es siempre `not_selected` con causa `capacity_filled`; ningún item escribe `rejected`.
  - **Un `EmailType` por desenlace. La causa modula el CUERPO, no el tipo.** Es lo que fija el techo y evita la
    explosión combinatoria: de los 6 desenlaces del ADR sólo 4 comunican (`selected`, `rejected`, `not_selected`,
    `withdrawn`) y `unresponsive` no manda nada, así que el enum crece **a lo sumo** hasta 4 tipos de decisión. Las 3
    causas (`capacity_filled`, `opening_closed`, `process_cancelled`) viven **dentro** del cuerpo de `not_selected`;
    **NUNCA** se crea un `EmailType` por par desenlace×causa.
  - Otras openings de la misma persona nunca cambian.
- Write-target allowlist: registrar las tres tablas nuevas en `src/lib/hiring/boundary-domain.test.ts` con justificación en el mismo PR
- Tenant/space boundary: opening/application IDs se resuelven server-side bajo capability Hiring; browser no aporta tenant ni cohorte
- Idempotency/concurrency: digest/version + idempotency key de confirmación; lock/CAS del opening; item key `runId+applicationId`; delivery at-least-once con dedupe
- Audit/outbox/history: run/items y decision history auditables; payloads sólo IDs, causa y contadores, sin PII

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flags OFF`; openings existentes quedan unmanaged, sin backfill inferido
- Backfill plan: `none`; configuración manual explícita por opening, luego canary allowlisted
- Rollback path: flags OFF detienen nuevos confirms/reconciler; items ya decididos no se revierten; recovery reanuda pendientes y correo se pausa por kill-switch
- External coordination: aprobación Talent/Privacidad del copy y consentimiento; Operations para worker/flags/canary

### Security and access

- Auth/access gate: capabilities granulares `hiring.opening.capacity.read|confirm`; actor humano obligatorio en confirm
- Sensitive data posture: PII sólo al re-leer recipient; no viaja en preview event, logs ni signals
- Error contract: `hiring_opening_capacity_unmanaged`, `hiring_opening_capacity_not_filled`, `hiring_opening_closure_preview_stale`, `hiring_opening_closure_conflict`, `hiring_opening_closure_partial_failure`
- Abuse/rate-limit posture: cohort cap configurable, worker por lotes, retry budget, circuit breaker y kill-switch de correo

### Runtime evidence

- Local checks: state machine, cohort policy, consent variants, duplicate confirm, concurrent decision, replay y PII redaction
- DB/runtime checks: constraints/uniques, lock races, run/item reconciliation y readbacks
- Integration checks: descarte directo (`rejected`); cierre por capacidad (`not_selected` + `capacity_filled`) con/sin consent; backup opt-in; worker crash/resume; email dedupe
- Reliability signals/logs: `hiring.opening.capacity_closure_stuck`, `hiring.opening.capacity_closure_partial_failed`, `hiring.opening.capacity_decision_drift`, `hiring.notification.capacity_filled_email_failed`
- Production verification sequence: migration → flags OFF → dry-run preview → canary allowlisted → crash/resume drill → Talent valida emails → ampliación acotada

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, access boundary and idempotency/concurrency posture are explicit.
- [ ] Las tablas nuevas están en el allowlist deliberado de writes del dominio.
- [ ] Migration, rollout y rollback son proporcionales al efecto externo irreversible.
- [ ] Runtime evidence incluye duplicate, stale, partial failure y consent variants.
- [ ] Un readback prueba que la cohorte cerrada por capacidad quedó `not_selected` + `capacity_filled`, cero filas `rejected`.
- [ ] Ningún payload/log/signal expone PII ni copy candidato-facing.

## Capability Definition of Done — Full API Parity gate

- [ ] Preview/confirm/status/reconcile son primitives gobernados, no click handlers.
- [ ] Capabilities + grants reales y coverage test nacen en el mismo PR.
- [ ] Confirm exige actor, idempotency key, versión/digest fresco, audit y errores sanitizados.
- [ ] Product API/MCP se implementan o quedan como task follow-up explícita sobre el mismo contrato.
- [ ] UI, worker y notifications no duplican reglas de cohorte, capacidad ni consentimiento.

<!-- ZONE 2 — PLAN MODE: no completar al registrar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Capacity policy y preview read-only

- Migración aditiva, constraints/allowlist, reader de capacidad y preview con categorías/exclusiones/digest.
- Configurar capacidad exige capability y audit; opening sin configuración sigue sin automatización.

### Slice 2 — Confirmación y run durable

- Command confirm con revalidación bajo lock, run/items, event/audit y status reader.
- Cero cambio de aplicaciones o email dentro de la transacción de confirmación.

### Slice 3 — Reconciler por aplicación

- Worker idempotente usa `decideHiringApplication` pasando **desenlace `not_selected` Y causa `capacity_filled`**,
  actor/causation y supersede válido.
- Hoy ese command **no acepta ninguno de los dos parámetros**: el eje de desenlace y el enum de causa los provee
  `TASK-1765`. Este slice los consume; no los inventa localmente ni los infiere del literal `rejected`.
- Recovery de partial failures, retry budget, quarantine y signals.

### Slice 4 — Copy y comunicación consent-aware

- La variante por capacidad (`not_selected` + `capacity_filled`) dice «esta vez elegimos a otra persona». **No es el
  template de descarte**: el agradecimiento de `rejected` sigue siendo suyo y no se reusa acá.
- Esa variante nace con `EmailType` propio `hiring_decision_not_selected`; **no reusa** el histórico
  `hiring_decision_rejected`. Razón principal: **`EmailType` no es una etiqueta descriptiva, es un discriminante por
  el que el sistema RAMIFICA** — patrón §9 aplicado a la capa de correo. Tres puntos de rama verificados en código:
  1. **Kill-switch por tipo**: `src/lib/email/delivery.ts:131` (`SELECT enabled, paused_reason FROM
     greenhouse_notifications.email_type_config WHERE email_type = $1`) y otra vez bajo lock en `:336` (`FOR SHARE`).
  2. **Perfil de footer**: `TASK-1764` (`EPIC-042`) resuelve la presentación **por `EmailType`**.
  3. **Selector del tipo en el envío**: `src/lib/hiring/notifications/send.ts:358` es hoy un ternario binario
     (`decision === 'selected' ? 'hiring_decision_selected' : 'hiring_decision_rejected'`) que **colapsa todo lo
     no-seleccionado en `rejected`**. Ese es el callsite exacto que mislabelaría un envío de «sin selección».
- **Lo operativo lo sella:** un cierre por capacidad manda N correos de golpe (las vacantes vivas tienen 15 y 33
  personas); un descarte individual manda uno. Si un run sale mal a mitad hay que poder **pausar ese envío sin
  silenciar los correos de decisión individual**, y con tipo compartido el kill-switch apaga los dos. **El repo ya
  tomó esta decisión**: `hiring_decision_selected` y `hiring_decision_rejected` ya son tipos separados
  (`src/lib/email/types.ts:33-34`) exactamente para poder pausarlos por separado — `services/ops-worker/deploy.sh:399`
  lo dice con todas sus letras («especialmente `hiring_decision_rejected`, pausable aparte en `email_type_config`»).
  El tipo nuevo **sigue el diseño existente; no inventa una carga**.
- Refuerzo (secundario, no el argumento): el email log es append-only, así que registrar un «sin selección» bajo el
  tipo `rejected` deja escrito «rechazado» sobre quien no lo fue. Importa, pero el registro autoritativo es la
  decisión, no el log de correo.
- **NO es argumento**: el dedupe. Se resuelve por `source_event_id + source_entity + recipient_email`
  (`wasEmailAlreadySent`, `src/lib/email/delivery.ts:1404-1418`), **no por `EmailType`** — no invocarlo como razón.
- Costo declarado: una fila de `email_type_config` con su seed de migración, la fila de perfil de footer en
  `TASK-1764` y la fila del ledger de flags. Nada más.
- Ambas variantes se personalizan por nombre/vacante sin revelar score, desenlace interno ni razón de evaluación.
- Sólo la variante con consentimiento futuro vigente afirma Banco de Talentos; kill-switch y dedupe conservados.

### Slice 5 — API parity, rollout y operación

- Adapters governados, docs técnica/funcional/manual, flags/ledger, canary y drill de rollback/recovery.

## Out of Scope

- UI visible de preview/confirmación: `TASK-1763`.
- Revertir decisiones/emails al reabrir una vacante.
- Crear consentimiento, campañas de nurturing u outreach desde el cierre.
- Usar score, IA, ranking o `data_origin` para decidir la cohorte.
- Cambiar retención legal o borrar documentos/candidatos.

## Detailed Spec

El preview devuelve objetivo, seleccionados vigentes, cupos restantes, cohorte por estado, exclusiones, estado de
consentimiento agregado y `effectDigest`, sin PII innecesaria. La cohorte se agrupa por etapa y desenlace vigente, no
por un estado único. Confirm sólo procede cuando capacidad está llena y el
digest sigue vigente. El run persiste un item por aplicación antes de ejecutar efectos. Cada item llama el command
individual, y el email nace únicamente desde su evento persistido. `sent` sigue significando aceptación; la entrega
se observa por el lifecycle de Resend existente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- El preview/digest y constraints deben desplegar antes de habilitar confirm.
- El reconciler y sus signals deben estar operativos antes del primer canary con email.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Cerrar una cohorte equivocada | Hiring/data | medium | preview fresco, digest, lock, categorías visibles | `hiring.opening.capacity_decision_drift` |
| Duplicar desenlace/email en retry | outbox/email | medium | item idempotente + decision/email dedupe | duplicate invariant test |
| Run parcial queda oculto | worker/ops | medium | status por item + reconciler + signal | `hiring.opening.capacity_closure_partial_failed` |
| Prometer Banco de Talentos sin consentimiento | privacy/email | medium | policy re-read al enviar + tests negativos | consent-claim con estado no vigente |
| Correo correcto no llega | Resend | low | lifecycle existente + kill-switch/recovery | `hiring.notification.capacity_filled_email_failed` |
| Registrar la cohorte como `rejected` | Hiring/fairness | medium | command exige desenlace explícito; readback y test niegan `rejected` en items del run | readback del run con cero filas `rejected` |

### Feature flags / cutover

- `HIRING_OPENING_CAPACITY_CLOSURE_ENABLED` default OFF controla confirmación/ejecución.
- `HIRING_CAPACITY_FILLED_EMAIL_ENABLED` default OFF controla sólo la variante; además aplica kill-switch por tipo.
- Los nombres `HIRING_CAPACITY_REJECTION_EMAIL_ENABLED` y `hiring.notification.capacity_rejection_failed` quedan
  **descartados por mentirosos** post-ADR: nombran un rechazo que no ocurre. El rename es gratis y no deja deuda —
  `rg` confirma **cero ocurrencias en código**: nunca se declararon, así que no hay runtime, ledger ni runbook que migrar.
- **El envío es asíncrono y vive en el `ops-worker`, NO en Vercel.** El consumer reactivo que manda el correo corre
  en ese runtime (`services/ops-worker/deploy.sh:393-399`: «leen el flag SOLO acá — prenderlo en Vercel no hace
  nada»). Por lo tanto el seed de `email_type_config` para `hiring_decision_not_selected` y todo flag asociado se
  declaran en `services/ops-worker/deploy.sh` —que usa `--set-env-vars` **destructivo**, así que lo no declarado ahí
  se borra en el siguiente redeploy, en silencio— **y además** se aplican en vivo con `--update-env-vars` para efecto
  inmediato. Hacer sólo lo segundo deja el flag muerto en el próximo deploy; declararlo sólo en Vercel deja el envío
  apagado sin que nada avise, con la UI prometiendo un correo que nunca sale. Ya pasó en este repo.
- Ambos flags se registran en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR que los declara, con el
  runtime declarado en la fila (`ops-worker`), y se verifican en la **revisión activa** ejercitando el flujo real.
- Revert: flags OFF; no se intenta deshacer comunicaciones ya emitidas.

### Rollback plan per slice

- Slices 1–2: flag OFF y revert de código; tablas aditivas quedan inertes.
- Slice 3: pausar reconciler; reanudar sólo tras readback de items, nunca reiniciar run.
- Slice 4: kill-switch de email; decisiones quedan auditadas.
- Slice 5: fallback a la decisión individual manual existente, una aplicación a la vez.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Opening sin capacity no se autocierra ni asume un cupo.
- [ ] Seleccionar no cierra a terceros ni les notifica sin confirmación humana separada.
- [ ] Preview stale/conflict no crea run ni side effects.
- [ ] Un crash/replay converge sin decisiones ni correos duplicados.
- [ ] Sólo aplicaciones elegibles de la opening exacta cambian; `backup_selected` y las pausas (etapa
      `decision_pending` sin desenlace) requieren inclusión explícita.
- [ ] Toda candidatura cerrada por el run queda con desenlace `not_selected` y causa `capacity_filled`; ninguna
      queda registrada como `rejected`.
- [ ] El descarte directo (`rejected`) y la sin selección por capacidad (`not_selected` + `capacity_filled`) usan
      copy empático distinto y personalizado, y ninguno revela evaluación interna, score ni el literal del desenlace.
- [ ] `hiring_decision_not_selected` existe como `EmailType` propio, con fila de `email_type_config` pausable
      independiente del correo de descarte, y con perfil de footer declarado en `TASK-1764` (no cae a legacy).
- [ ] El seed y los flags están declarados en `services/ops-worker/deploy.sh`, aplicados en la revisión activa y
      registrados en el ledger con runtime `ops-worker`; el flujo real se ejercitó, no sólo el flag.
- [ ] “Mantendremos tu perfil” aparece sólo con consentimiento futuro vigente.
- [ ] Procedencia no gatea comunicaciones y los canaries usan destinatarios allowlisted.
- [ ] Signals, flags, docs y lifecycle de entrega quedan operativos y verificados.

## Verification

- `pnpm task:lint --task TASK-1762`
- tests focales `src/lib/hiring/opening-capacity`, `decide`, `notifications` y `boundary-domain`.
- migración/readback y pruebas concurrentes PG.
- canary allowlisted con descarte directo + cierre por capacidad, con y sin consentimiento vigente.
- `pnpm ops:lint --changed`, `pnpm qa:gates --changed`, `pnpm docs:closure-check`.

## Closing Protocol

- [ ] Lifecycle/carpeta, registry, README, EPIC-011, Handoff y changelog sincronizados.
- [ ] ADR de capacidad aceptado y concordante con el ADR de vocabulario, o el estado queda honestamente bloqueado.
- [ ] Flags/ledger, runbook y estado real por runtime documentados.
- [ ] TASK-1763 recibe el DTO/command final sin duplicar reglas.

## Follow-ups

- Product API/MCP write consumer separado si no entra en Slice 5.
- Capacidad por ubicación/jornada sólo si aparece evidencia de negocio que invalide el objetivo simple por opening.
