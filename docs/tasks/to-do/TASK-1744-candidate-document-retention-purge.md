# TASK-1744 — Borrado gobernado de documentos de candidato vencidos (Ley 21.719)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr|identity|data`
- Blocked by: `TASK-1748` (2026-08-22: el eje de desenlace de `TASK-1765` YA existe y los Slices 1 y 2 pueden ramificar por `not_selected`/`unresponsive`. Lo que falta es el `CHECK` del invariante, que espera a que `TASK-1748` mueva sus 32 filas; hasta entonces el detector se sigue congelando)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-22 — parcialmente desbloqueada por TASK-1765

- **Los literales por los que ramifican los Slices 1 y 2 ya existen**: `not_selected` y `unresponsive`
  están en `HIRING_DECISIONS` (`src/types/hiring.ts`) y admitidos por el `CHECK` de base. La escalera
  de retención ya puede enumerarlos.
- **`decision_cause` existe** y es una bicondicional garantizada por la base: no-null si y sólo si
  `decision='not_selected'`. Si la escalera de retención quiere distinguir un cierre por capacidad de
  uno por cancelación de la búsqueda, el valor está ahí y es enum, no prosa.
- **El detector todavía se puede congelar.** El `CHECK` del invariante NO está aplicado: sigue
  esperando a que `TASK-1748` mueva sus 32 filas. Mientras tanto, el `NOT EXISTS ... decision IS NULL`
  de `documents/retention.ts:90-94` sigue bloqueando el borrado para esas identidades. La señal
  `hiring.application.closed_without_outcome` (`/admin/operations`) reporta el estado real y separa
  las filas REALES —que sí congelan retención de una persona verdadera— de las sintéticas.
- Recordatorio del H-23, que sigue abierto y es de esta task: la escalera omite `backup_selected` y
  cae a `ELSE NULL`. Con el eje nuevo hay que enumerar los **seis** desenlaces explícitamente, no
  cinco y un `ELSE`.

## Summary

Greenhouse detecta documentos de candidatos no contratados cuya finalidad de tratamiento ya se agotó,
pero **no puede borrarlos**: `src/lib/hiring/documents/retention.ts` expone la deuda y su propio
docstring declara que el borrado es un follow-up con owner People Ops. Esta task cierra ese follow-up
con el command gobernado que falta: plan → allowlist humana → apply con actor, motivo y audit,
soft-delete del asset (nunca DELETE físico) y un lane separado para el documento de identidad.

## Why This Task Exists

La Ley 21.719 no fija un plazo: exige que el tratamiento tenga una **finalidad** y que los datos no se
conserven más allá de ella. Terminado el proceso de selección, la finalidad de guardar el CV y la
identidad de quien no fue contratado se agota. Greenhouse ya declaró su plazo (12 meses,
`CANDIDATE_DOCUMENT_RETENTION_MONTHS`) y ya sabe **quién está vencido** — lo que no existe es la
capacidad de actuar sobre esa lista.

Hoy el ciclo está partido por la mitad:

- `listOverdueCandidateRetentions` detecta y la señal `hiring.candidate_document.retention_overdue`
  alerta. Detectar sin poder borrar convierte la señal en una alarma que nadie puede apagar.
- El borrado de documentos de **personas reales** es irreversible. Por eso el módulo eligió a
  propósito no borrar: *"un reader que borra en silencio es peor que la deuda"*. La decisión fue
  correcta; lo que falta es su contraparte gobernada, no relajar el reader.

**La urgencia es baja y está verificada, no supuesta.** Al 2026-08-18 hay **una sola** postulación
con decisión (rechazada el 12-ago-2026); su ventana vence en agosto de 2027. No hay deuda acumulada
que drenar hoy: la task se construye antes de necesitarla, que es exactamente cuando conviene
construir una capacidad destructiva.

**Hallazgo que condicionaba el diseño (verificado contra PG el 2026-08-18):** **61 de 62
postulaciones tienen `decision IS NULL`**. El reader se guarda con
`NOT EXISTS (… open_app.decision IS NULL)` — una postulación abierta en cualquier vacante reactiva la
base de retención de esa persona. Con casi todo el universo sin decisión registrada, el barrido
estaba prácticamente inerte para 58 personas, y la task tenía que resolver primero si el reloj
arrancaba sólo con `decision` o también con el cierre por `stage`.

**El ADR del vocabulario cambia la naturaleza de ese hallazgo, no su número.** Bajo el invariante
`stage='closed'` ⟺ desenlace declarado, una postulación cerrada sin desenlace es **irrepresentable**:
cerrar es decidir, y el `PATCH` de etapa no puede escribir `closed`. El criterio del detector deja de
ser una elección de esta task y pasa a ser un invariante que se consume — **el reloj arranca sólo con
el desenlace, y al cerrar siempre hay uno**.

Dos matices sobreviven y hay que declararlos:

- **Las 32 filas `closed` sin desenlace que existen hoy no son procesos reales**: las escribió el
  archivado de datos sintéticos de `TASK-1739`. Migrarlas al eje de archivado es trabajo de
  `TASK-1748`, que corre antes del `CHECK`. Esta task **no** las toca ni purga sobre ellas.
- **La inercia que queda no es del criterio, es de la operación.** 61 postulaciones abiertas son
  procesos que nadie cerró. El ADR obliga a declarar el desenlace al cerrar; no cierra procesos por
  su cuenta.

## Goal

- Que exista un **command canónico** capaz de borrar los documentos vencidos con humano en el loop,
  audit append-only y rollback declarado, sin que ningún reader borre por su cuenta.
- Que el borrado sea **soft-delete del asset** y jamás un DELETE físico que choque con las tablas
  append-only de escaneo.
- Que el documento de identidad del candidato tenga su propio lane, separado del CV, porque vive en
  el core de personas y no en el dominio Hiring.
- Que la señal de retención pueda volver a `0` por acción gobernada, en vez de quedar como una alarma
  permanente que el operador aprende a ignorar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**Su Slice 1 queda RESUELTO por el ADR, pero no como la task lo planteaba, y aparece trabajo nuevo.**

- **Slice 1 y su Open Question quedan cerrados.** Preguntaban si el reloj arranca sólo con `decision` o
  también con el cierre por `stage` (`rejected`/`withdrawn`). El ADR retira esos literales del enum de
  etapas (§3, §6) y hace `stage='closed'` ⟺ desenlace declarado (§5): **post-ADR el reloj arranca sólo con
  el desenlace, y por construcción siempre hay uno al cerrar.**
- **Trabajo nuevo que la task no tiene:** el trigger de retención de recibos
  (`migrations/20260819072130586_…:891-906`) evalúa `NEW.stage='selected'` y `NEW.stage IN
  ('rejected','withdrawn')`. Al retirarse esos literales, **esa mitad del `CASE` se vuelve código muerto en
  silencio** y todo cae al `ELSE NULL`. Hay que reescribirlo contra el desenlace y **enumerar
  `backup_selected`, `not_selected` y `unresponsive`**, que hoy ya caen al `ELSE NULL` (hallazgo H-23 de la
  auditoría — trampa armada, con 0 filas afectadas hoy).
- **Tensión a declarar:** `not_selected` es la población objetivo del Talent Pool (ADR §4) y a la vez entra
  al reloj de 12 meses. Retención y pool son ejes distintos; declararlo explícito.
- `Blocked by`: `TASK-1765` — el invariante entra antes que el barrido, para no purgar sobre un detector en
  transición.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (§3–§6, §10)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **Person-first.** El CV es un asset anclado al `candidate_facet_id`; el documento de identidad vive
  en `greenhouse_core.person_identity_documents` y pertenece a la persona, no al proceso. Son dos
  lanes con dueños distintos y no se mezclan en un solo barrido.
- **Nunca DELETE físico de un asset.** `greenhouse_core.asset_scan_results` tiene trigger
  `RAISE EXCEPTION` en DELETE y cascadea desde `assets`. El patrón canónico del dominio es marcar el
  asset como `deleted` (soft-delete), tal como resolvió `scripts/hiring/purge-task-1378-test-applications.ts`.
- **Backfill/borrado mutante = acto humano.** `dry-run → allowlist humana revisada → apply con
  actor + reason + audit → rollback declarado`, el mismo patrón ya en producción en
  `src/lib/hiring/candidate-intake/remediate.ts`.
- **El reloj arranca con el desenlace, no con la etapa.** El ADR retira `rejected`/`withdrawn` del
  enum de etapas y hace `stage='closed'` ⟺ desenlace: **NUNCA** ramificar retención por un literal de
  `stage`, ni en SQL embebido ni en un trigger.
- **Retención y Talent Pool son ejes distintos.** `not_selected` es la población objetivo del pool
  (ADR §4) y a la vez entra al reloj de 12 meses: se borra el documento, **no** la membresía.
- **El reader no muta.** `listOverdueCandidateRetentions` se mantiene read-only. El command consume
  su salida; jamás al revés.
- **La retención es CIEGA a la procedencia.** Ningún barrido de esta task filtra por `data_origin`
  (TASK-1739): la obligación legal no depende de que un dato parezca de prueba, y una persona mal
  marcada como sintética no puede quedar fuera del barrido.
- **Full API Parity.** El borrado es una capability con contrato gobernado en `src/lib/**`; el CLI es
  un consumer más, no el dueño de la lógica.

## Normative Docs

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` — fija el
  invariante que esta task consume y la escalera de retención que hay que enumerar (§10).
- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` — hallazgo **H-23**: la
  escalera del trigger de recibos ya deja caer desenlaces al `ELSE NULL`.
- `migrations/20260819072130586_task-1746-assessment-access-recovery.sql` (líneas 886-917) — trigger
  vigente de retención de recibos, que este barrido reescribe por forward-fix.
- `docs/tasks/complete/TASK-1362-candidate-document-capture.md` — declara este borrado como
  follow-up con owner People Ops; es la task que esta cierra.
- `docs/tasks/complete/TASK-1714-candidate-identity-document-reveal.md` — contrato del documento de
  identidad del candidato (capability `hiring.candidate.reveal_identity`, audit de revelado).
- `scripts/hiring/purge-task-1378-test-applications.ts` — precedente real de purga: descubrió el
  choque con el trigger append-only y resolvió con soft-delete.
- `docs/tasks/complete/TASK-1739-hiring-synthetic-data-provenance.md` — purga de datos
  **sintéticos**; lane distinto y explícitamente no reutilizable acá.

## Dependencies & Impact

### Depends on

- `src/lib/hiring/documents/retention.ts` — detector vigente (`listOverdueCandidateRetentions`,
  `CANDIDATE_DOCUMENT_RETENTION_MONTHS`, `resolveRetentionMonths`).
- `src/lib/reliability/queries/hiring-candidate-retention-overdue.ts` — señal vigente.
- `greenhouse_core.assets` con `retention_class = 'hiring_candidate_document'` y el estado `deleted`.
- `greenhouse_core.person_identity_documents` (TASK-784/1714).
- `greenhouse_hiring.candidate_facet` (`consent_status`, `retention_policy`).
- `TASK-1765` — enum de desenlaces (`not_selected`, `unresponsive`) y `CHECK stage='closed'` ⟺
  desenlace. Los `Slice 1` y `Slice 2` ramifican por esos literales: escribirlos antes es ramificar
  por valores que todavía no existen.
- `greenhouse_hiring.hiring_assessment_access_recovery` + su trigger de retención
  (`migrations/20260819072130586_task-1746-assessment-access-recovery.sql:886-917`).

### Blocks / Impacts

- La señal `hiring.candidate_document.retention_overdue` pasa de "alarma sin acción posible" a
  "cola drenable"; su interpretación operativa cambia y hay que documentarlo.
- `TASK-1739` comparte la mecánica de purga pero **no el criterio**: aquella borra por procedencia,
  esta por vencimiento de finalidad. No compartir allowlist ni CLI.
- People Ops adquiere una capacidad destructiva nueva: requiere manual antes del primer uso.
- `TASK-1746` es dueña de la migración original del trigger de retención de recibos; esta task lo
  reescribe con `CREATE OR REPLACE` en una migración **nueva** y deja el puntero en su spec.
- `TASK-1748` migra las 32 filas sintéticas `closed` sin desenlace al eje de archivado. Esta task no
  las toca: son datos sintéticos, no una cola de retención.

### Files owned

- `src/lib/hiring/documents/retention-purge.ts` (+ tests)
- `src/lib/hiring/documents/retention.ts` (sólo si el reloj cambia — ver Open Questions)
- `scripts/hiring/purge-expired-candidate-documents.ts`
- `migrations/<timestamp>_task-1744-candidate-document-retention-audit.sql`
- `migrations/<timestamp>_task-1744-assessment-recovery-retention-outcome.sql` (forward-fix
  `CREATE OR REPLACE` del trigger; **nunca** editar la migración ya aplicada de `TASK-1746`)
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/reliability/queries/hiring-candidate-retention-overdue.ts`
- `docs/documentation/hr/retencion-de-documentos-de-candidatos.md`
- `docs/manual-de-uso/hr/purgar-documentos-de-candidatos-vencidos.md`

## Current Repo State

### Already exists

- Detector completo y correcto: `listOverdueCandidateRetentions` con las dos razones
  (`consent_withdrawn` inmediato, `retention_window_elapsed` por ventana) y override por candidato
  (`retain_months:N`).
- Señal de reliability registrada en el módulo `hiring`.
- Patrón `dry-run → allowlist → apply → rollback` en producción (`remediate.ts` + su CLI).
- Precedente de soft-delete de assets frente al trigger append-only de escaneo.
- Exclusión correcta de `selected`/`backup_selected`: al ser contratados pasan a workforce y les
  aplica la retención laboral, mucho más larga.

### Gap

- **No existe ningún command de borrado.** El docstring de `retention.ts` lo declara explícitamente
  como follow-up no implementado.
- No existe capability ni grant para autorizar el borrado.
- No existe tabla de audit del borrado de documentos: sin ella el acto no es defendible ante una
  auditoría de la Ley 21.719.
- El documento de identidad del candidato no tiene lane de retención propio.
- La señal no distingue "vencido y pendiente" de "vencido y ya purgado".
- **El trigger de retención de recibos ramifica por etapas que el ADR retira.**
  `refresh_assessment_access_recovery_retention_for_application()`
  (`migrations/20260819072130586_task-1746-assessment-access-recovery.sql:892-902`) evalúa
  `NEW.stage = 'selected'` y `NEW.stage IN ('rejected', 'withdrawn')`: al retirarse esos literales,
  esa mitad del `CASE` queda muerta **en silencio** y todo cae al `ELSE NULL`, que es retención que
  nunca expira. Hoy `backup_selected` y `on_hold` ya caen ahí (hallazgo H-23), con 0 filas afectadas:
  trampa armada, no incendio.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/hiring/documents/**` + `scripts/hiring/**`, ejecutado en el runtime Next.js
  de Vercel y en CLI local contra Cloud SQL vía proxy.
- Future candidate home: `domain-package`
- Boundary: el primitive canónico es `src/lib/hiring/documents/retention-purge.ts`, que expone el
  plan y el command de aplicación. Consumers autorizados: el CLI de purga, la señal de reliability y
  una futura superficie de People Ops. Ningún consumer marca assets como `deleted` con SQL propio.
- Server/browser split: módulo `server-only`; nunca cruza al bundle de cliente.
- Build impact: `none` — sin dependencias nuevas ni entrypoints globales.
- Extraction blocker: el borrado cruza `greenhouse_hiring` (facet) y `greenhouse_core`
  (assets, documentos de identidad) en una misma transacción; mientras Person y assets vivan en el
  core compartido, el paquete no se extrae solo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.assets` (documentos) y
  `greenhouse_core.person_identity_documents` (identidad); `greenhouse_hiring.candidate_facet` aporta
  consentimiento y política de retención.
- Consumidores afectados: CLI de purga, señal de reliability, People Ops.
- Runtime target: `local` (CLI) + `production` (señal; base compartida con staging/dev)

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/documents/retention.ts`
  (`listOverdueCandidateRetentions`, `resolveRetentionMonths`),
  `src/lib/reliability/queries/hiring-candidate-retention-overdue.ts`,
  `greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()`.
- Contrato nuevo o modificado: `planCandidateDocumentPurge`, `applyCandidateDocumentPurge`,
  tabla de audit `greenhouse_hiring.candidate_document_purge_audit`, capability
  `hiring.candidate_document.purge`, y el **cuerpo del trigger de retención de recibos**, reescrito
  para ramificar por desenlace en vez de por etapa.
- Backward compatibility: `compatible` — todo es aditivo; el reader no cambia de firma.
- Full API parity: el borrado vive como command en `src/lib/**` con capability + audit; el CLI lo
  consume igual que lo haría una superficie de People Ops o Nexa. Apto para
  `propose → confirm → execute` sin trabajo extra: `plan` produce la propuesta, la allowlist humana
  es la confirmación y `apply` es el único punto de mutación.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.assets`,
  `greenhouse_core.person_identity_documents`, `greenhouse_hiring.candidate_facet`,
  `greenhouse_hiring.hiring_assessment_access_recovery` (vía trigger),
  `greenhouse_hiring.candidate_document_purge_audit` (nueva).
- Invariantes que no se pueden romper:
  - **Jamás un DELETE físico de un asset.** El soft-delete (`status = 'deleted'`) es la única forma;
    `asset_scan_results` es append-only y cascadea desde `assets`.
  - **Un candidato contratado nunca entra al barrido.** `selected`/`backup_selected` pasan a la
    retención laboral.
  - **El consentimiento retirado vence de inmediato** y ninguna ventana lo sobrevive.
  - **El barrido es ciego a `data_origin`** (TASK-1739): la obligación legal no depende de la
    procedencia declarada del dato.
  - **El audit nunca guarda nombre, correo ni contenido del documento**: sólo identificadores,
    conteos, motivo y actor.
  - **Una postulación viva reactiva la base de retención**: mientras exista un proceso abierto de esa
    persona, sus documentos no vencen.
  - **El reloj arranca con el desenlace, nunca con un literal de `stage`.** Ni el reader ni el
    trigger de recibos pueden ramificar por etapa (ADR §5).
  - **Ningún desenlace cae al `ELSE NULL` del trigger de recibos.** Ese `ELSE NULL` significa
    exactamente «sin desenlace = proceso vivo», y sólo eso; queda comentado en el cuerpo de la
    función para que nadie lo relea como un olvido.
  - **Retención y Talent Pool son ejes distintos**: purgar los documentos de un `not_selected` no lo
    saca del pool, y pertenecer al pool no lo excluye del barrido.
- Tenant/space boundary: sin cambios; el barrido es interno y no deriva `space_id`.
- Idempotency/concurrency: apply en lotes de 1 con CAS sobre el estado esperado del asset; un asset
  ya `deleted` se reporta como `skipped`, no como error. Reejecutar el mismo allowlist es idempotente.
- Audit/outbox/history: tabla nueva append-only con trigger que rechaza UPDATE y DELETE, y grant sin
  DELETE para `greenhouse_runtime` (dos capas, patrón de TASK-1736/1739).

### Migration, backfill and rollout

- Migration posture: `additive` (tabla de audit) + forward-fix `CREATE OR REPLACE` del trigger de
  retención de recibos (**nunca** editar la migración ya aplicada de `TASK-1746`); el borrado en sí
  es `destructive` y gobernado.
- Default state: `read-only` — sin allowlist no hay mutación posible.
- Backfill plan: no hay backfill. El apply opera sobre la lista vencida del día, con allowlist
  revisada línea a línea.
- Rollback path: el asset soft-deleted se restaura devolviendo `status` a su valor previo, tomado del
  audit. **El objeto en el bucket sí se elimina de forma irreversible** si el lane de storage se
  activa: por eso ese lane es opt-in explícito y va después (ver `Slice ordering hard rule`).
- External coordination: sign-off de People Ops antes del primer apply; revisión de Legal/Privacidad
  del plazo declarado y del texto del aviso a candidatos.

### Security and access

- Auth/access gate: capability nueva `hiring.candidate_document.purge` en `capabilities_registry` +
  catálogo TS + grant a `efeonce_admin` únicamente, **en el mismo PR** (guard
  `capability-grant-coverage.test.ts`).
- Sensitive data posture: `PII`. El plan imprime identificadores y conteos; **nunca** nombre, correo
  ni contenido. Su salida es stdout local y allowlist gitignoreada.
- Error contract: el CLI falla loud en es-CL con `captureWithDomain(err, 'hr.hiring', …)`; si se
  expone ruta API, `canonicalErrorResponse` con código propio.
- Abuse/rate-limit posture: `none` — superficie no expuesta a internet; el gate es capability +
  allowlist humana + sign-off.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring/documents`, `pnpm local:check`.
- DB/runtime checks: tras `pnpm pg:connect:migrate`, verificar la tabla de audit y su trigger contra
  `information_schema` + `pg_trigger`; ejercitar el rechazo de UPDATE/DELETE; correr el plan
  read-only y contrastar su salida contra `listOverdueCandidateRetentions`. Para el trigger de
  recibos: leer el cuerpo vigente con `pg_get_functiondef` y confirmar que no nombra ninguna etapa
  retirada, y ejercitar **los seis desenlaces** en una transacción con ROLLBACK verificando
  `retention_class` y `retention_expires_at` en cada uno.
- Integration checks: `n/a` — sin provider externo en el camino.
- Reliability signals/logs: `hiring.candidate_document.retention_overdue` debe poder volver a `0`
  tras un apply.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no se llena al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Consumir el invariante del reloj (ya no hay nada que decidir acá)

- **El arranque del reloj lo fija el ADR, no esta task.** `stage='closed'` ⟺ desenlace declarado
  (§5), y `rejected`/`withdrawn` salen del enum de etapas (§3, §6): el reloj arranca **sólo** con el
  desenlace y, por construcción, cerrar siempre declara uno. El guard vigente del reader
  (`WHERE ha.decision IS NOT NULL`, `src/lib/hiring/documents/retention.ts:69`) queda
  estructuralmente correcto; lo que cambia es que deja de ser una elección de implementación.
- Enumerar los **seis** desenlaces en el reader, con test por cada uno: `selected`/`backup_selected`
  fuera del barrido (retención laboral, hoy vía `was_hired`, `retention.ts:65`) y `not_selected`,
  `rejected`, `withdrawn`, `unresponsive` dentro. Con seis valores, "el resto entra por descarte"
  deja de ser aceptable como implícito.
- Reescribir el docstring de `retention.ts:20-26`, que hoy describe el arranque del reloj con
  literales de etapa retirados, citando el ADR como fuente del criterio.
- Test que prueba que una postulación abierta (`decision IS NULL`) sigue reactivando la base de
  retención de esa persona (`retention.ts:90-94`): eso el ADR no lo cambia.

### Slice 2 — Reescribir el trigger de retención de recibos contra el desenlace

El trigger `greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()`
(`migrations/20260819072130586_task-1746-assessment-access-recovery.sql:886-917`) ramifica hoy por
literales de **etapa**:

- `retention_class`: `WHEN retention_class = 'workforce_record' OR NEW.stage = 'selected' OR
  NEW.decision = 'selected' THEN 'workforce_record' ELSE 'hiring_candidate_recovery'`.
- `retention_expires_at`: la misma condición → `NULL`; luego `WHEN NEW.stage IN ('rejected',
  'withdrawn') OR NEW.decision IN ('rejected', 'withdrawn') THEN COALESCE(NEW.decision_at, NOW()) +
  INTERVAL '12 months'`; y `ELSE NULL`.

Al retirarse `selected`, `rejected` y `withdrawn` del enum de etapas, **esa mitad del `CASE` se
vuelve código muerto en silencio**: no falla, no avisa, sólo deja de matchear. Y lo que no matchea
cae al `ELSE NULL`, que significa **retención que nunca expira**.

- Forward-fix con migración **nueva** (`CREATE OR REPLACE FUNCTION`); jamás editar la migración ya
  aplicada de `TASK-1746`.
- La rama `workforce_record` ramifica sólo por desenlace: `NEW.decision IN ('selected',
  'backup_selected')`. **`backup_selected` hoy cae al `ELSE NULL`** — es la mitad del hallazgo H-23.
- La rama del reloj de 12 meses **enumera los cuatro desenlaces no contratados**: `rejected`,
  `withdrawn`, `not_selected` y `unresponsive`. Los dos últimos nacen con `TASK-1765` y caerían al
  `ELSE NULL` desde el primer día si no se enumeran ahora.
- `on_hold` deja de ser desenlace (ADR §6): una pausa no cierra nada, así que **no** entra a la
  escalera y su caída al `ELSE NULL` es correcta. Escribirlo como comentario en la función, junto al
  significado del `ELSE NULL` («sin desenlace = proceso vivo»), para que no se relea como olvido.
- El trigger deja de leer `NEW.stage` para clasificar; conservarlo en el `AFTER UPDATE OF stage,
  decision, decision_at` sólo como condición de disparo es correcto.
- Guard test que falla si el cuerpo de la función vuelve a nombrar una etapa retirada, y ejercicio
  contra PG real de los seis desenlaces.

### Slice 3 — Audit append-only del borrado

- Migración additive: `greenhouse_hiring.candidate_document_purge_audit`
  (`purge_id`, `candidate_facet_id`, `identity_profile_id`, `lane` ∈ `document|identity_document`,
  `asset_id`, `reason` ∈ `consent_withdrawn|retention_window_elapsed`, `before_status`,
  `after_status`, `actor_user_id`, `justification`, `created_at`), con trigger que rechaza UPDATE y
  DELETE y grant sin DELETE.
- Bloque `DO` anti pre-up-marker que aborta si la tabla o el trigger no quedaron creados.

### Slice 4 — Command canónico del lane documentos

- `src/lib/hiring/documents/retention-purge.ts`: `planCandidateDocumentPurge` (read-only, consume el
  reader) y `applyCandidateDocumentPurge` (allowlist + actor + `justification` ≥ 10 caracteres, lotes
  de 1, CAS sobre el estado del asset, audit por fila).
- Soft-delete: `assets.status = 'deleted'`. Nunca DELETE físico.
- Capability + grant + coverage test en el mismo PR.

### Slice 5 — CLI de operación

- `scripts/hiring/purge-expired-candidate-documents.ts` + script npm
  `hiring:documents:purge-expired`, con los modos dry-run / emit-allowlist / apply / rollback.
- Header del CLI con la advertencia de PII y la prohibición de pegar su salida en logs compartidos.

### Slice 6 — Lane del documento de identidad

- Barrido separado sobre `greenhouse_core.person_identity_documents` del candidato, con su propia
  entrada de allowlist y su propio `lane` en el audit.
- Va después del lane de documentos porque toca el core de personas y su blast radius es mayor.

### Slice 7 — Señal + triple documentación

- La señal distingue "vencido pendiente" de "vencido ya purgado" y puede volver a `0`.
- Técnica (delta en la arquitectura Hiring), funcional
  (`docs/documentation/hr/retencion-de-documentos-de-candidatos.md`) y manual
  (`docs/manual-de-uso/hr/purgar-documentos-de-candidatos-vencidos.md`).

## Out of Scope

- **Cambiar el plazo de 12 meses.** El plazo es una decisión de Legal/Privacidad, no de esta task.
  Acá sólo se construye la capacidad de ejecutarlo.
- **Retención laboral de contratados.** `selected`/`backup_selected` pasan a workforce y su plazo es
  mucho más largo; es otro dominio y otra task.
- **Purga de datos sintéticos.** Es `TASK-1739`, con criterio distinto (procedencia, no vencimiento)
  y allowlist propia. No compartir CLI ni allowlist.
- **Borrar filas de tablas append-only.** `asset_scan_results`, `candidate_identity_intake_evidence`,
  `candidate_identity_display_audit` y los audits del dominio quedan intactos.
- **Superficie UI.** La operación es por CLI; una pantalla de People Ops es follow-up con su propio
  wireframe.
- **Aviso automático al candidato.** Notificar el borrado es una decisión de comunicación y consentimiento,
  no un efecto colateral del barrido.
- **Implementar el eje de desenlace, su `CHECK` o la migración del enum de etapas.** Es `TASK-1765`;
  acá sólo se consume el vocabulario ya fijado.
- **Las 32 filas sintéticas en `stage='closed'` sin desenlace.** Las escribió el archivado de
  `TASK-1739` y las migra `TASK-1748`. No son cola de retención y este barrido no las mira.

## Detailed Spec

### 1. Por qué soft-delete y no borrado físico

El precedente ya pagó este costo: `purge-task-1378-test-applications.ts` intentó borrar assets y
chocó con el trigger `RAISE EXCEPTION` de `asset_scan_results`, que cascadea desde `assets`. La
resolución correcta fue marcar el asset como `deleted`. Se generaliza ese criterio: el soft-delete
retira el documento de toda lectura del dominio y preserva el rastro de que existió, que es
justamente lo que hace defendible el acto ante una auditoría.

Si más adelante se exige eliminar el objeto del bucket, ese es un **lane de storage separado**, opt-in
y explícitamente irreversible, que se ejecuta sólo después de que el soft-delete lleve tiempo estable.

### 2. Por qué el documento de identidad va en su propio lane

El CV es del proceso; el documento de identidad es de la persona y vive en el core
(`person_identity_documents`, TASK-784/1714). Mezclarlos en un solo barrido haría que una regla del
dominio Hiring decidiera sobre una tabla que también sirve a colaboradores y ex-colaboradores. Dos
lanes, dos entradas de allowlist, un solo audit con la columna `lane` que los distingue.

### 3. Retención y Talent Pool son ejes distintos

`not_selected` es a la vez la **población objetivo del Talent Pool** (ADR §4: a quien llegó al final
y no quedó es justo a quien quieres re-contactar) y una persona cuyos documentos entran al **reloj de
12 meses**. No hay contradicción, y no se resuelve eligiendo uno: pertenecer al pool es una relación
vigente con la persona; conservar su CV es un tratamiento de PII cuya finalidad ya se agotó. **Se
borra el documento, no la membresía.** Ni excluir del barrido a quien está en el pool, ni sacar del
pool a quien fue purgado.

### 4. Por qué un `CASE` muerto es peor que un error

El `CASE` del trigger de recibos no va a fallar cuando las etapas se retiren: va a dejar de matchear.
Todo cae al `ELSE NULL`, que la tabla lee como «esta evidencia no vence nunca». Es la peor forma de
romperse — el sistema sigue verde, la señal sigue en cero, y el incumplimiento se acumula callado.
Por eso el arreglo enumera los seis desenlaces **explícitamente** y deja el `ELSE NULL` con un
significado escrito, en vez de confiar en que el default siga siendo el correcto después del próximo
cambio de vocabulario.

### 5. El plan propone; el humano dispone

El plan imprime, por candidato: identificadores, motivo del vencimiento, fecha de cierre y conteo de
documentos. **Nunca** nombre, correo ni contenido. El humano poda la allowlist línea a línea y el
apply toca sólo lo aprobado. Un candidato con proceso abierto en otra vacante no aparece nunca en el
plan: su base de retención está reactivada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **`Slice 1` y `Slice 2` van DESPUÉS de `TASK-1765`**: ramifican por `not_selected` y
  `unresponsive`, que ese eje crea. Escribirlos antes es ramificar por literales inexistentes.
- `Slice 1 (invariante del reloj)` → `Slice 2 (trigger de recibos)` → `Slice 3 (audit)` →
  `Slice 4 (command)` → `Slice 5 (CLI)`. Sin el trigger reescrito, el dominio queda con recibos en
  `retention_expires_at IS NULL` para desenlaces que sí deben expirar; sin audit, el borrado no es
  defendible.
- `Slice 6 (identidad)` **DEBE** ir después del `Slice 5` aplicado y verificado: toca el core de
  personas y su blast radius es mayor.
- `Slice 7` puede correr en paralelo con el `Slice 6` una vez cerrado el `Slice 5`.
- **Prohibido** ejecutar cualquier apply sin sign-off de People Ops.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se borra el documento de un candidato con proceso vivo | hiring / privacidad | low | el reader excluye a quien tiene postulación abierta; allowlist humana; CAS por fila | reclamo de HR; fila del audit con `before_status` restaurable |
| Se borra a un contratado por error de clasificación | hiring / workforce | low | `selected`/`backup_selected` excluidos en el reader; test de los cuatro caminos | `retention_overdue` con conteo anómalo |
| El apply cascadea y revienta contra una tabla append-only | assets / scan | medium | soft-delete por diseño; jamás DELETE físico; el precedente TASK-1378 ya lo probó | el CLI aborta loud |
| El plan imprime PII en un log compartido | privacidad | medium | plan sin nombre ni correo; allowlist gitignoreada; audit sin PII; advertencia en el header del CLI | revisión de artefactos de CI |
| La señal queda en alarma permanente y se normaliza ignorarla | reliability | medium | el Slice 7 la vuelve drenable y distingue purgado de pendiente | la propia señal sin volver a 0 tras un apply |
| El `CASE` del trigger de recibos queda muerto y todo cae al `ELSE NULL` | hiring / privacidad | **high** | es el Slice 2: la escalera se reescribe contra el desenlace y enumera los seis, con ejercicio contra PG real por cada uno | recibos con `retention_expires_at IS NULL` en postulaciones con desenlace no contratado |
| El reloj no arranca nunca porque nadie cierra los procesos | hiring / compliance | medium | el `CHECK` de `TASK-1765` hace imposible cerrar sin desenlace, pero no cierra procesos por su cuenta: queda como disciplina de operación con People Ops | `retention_overdue` en 0 con postulaciones abiertas hace meses |

### Feature flags / cutover

Sin flag. La puerta es **capability + allowlist humana + sign-off de People Ops**, no un interruptor:
un flag encendido jamás debe autorizar por sí solo un borrado de PII. El command nace inerte porque
sin allowlist no muta nada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; el reader vuelve a su criterio anterior | < 10 min | sí |
| Slice 2 | migración nueva con `CREATE OR REPLACE` que restaura el cuerpo previo de la función | < 10 min | sí |
| Slice 3 | `pnpm migrate:down` (drop de la tabla de audit) o dejarla inerte | < 10 min | sí |
| Slice 4 | revert PR; sin allowlist el command no muta nada | < 10 min | sí |
| Slice 5 | restaurar `assets.status` desde `before_status` del audit, por registro | < 5 min por registro | sí |
| Slice 6 | restaurar el estado previo del documento de identidad desde el audit | < 5 min por registro | sí |
| Slice 7 | desregistrar la señal del registry | < 10 min | sí |
| Lane de storage (futuro, opt-in) | **no reversible** — el objeto se fue del bucket | sin retorno | **no** |

### Production verification sequence

1. `pnpm migrate:up` (Slice 2) y leer el cuerpo vigente del trigger con `pg_get_functiondef`:
   no puede nombrar ninguna etapa retirada. Ejercitar los seis desenlaces en una transacción con
   ROLLBACK y confirmar `retention_class` y `retention_expires_at` en cada uno — en particular que
   `backup_selected` queda `workforce_record` y que `not_selected`/`unresponsive` reciben el reloj de
   12 meses.
2. `pnpm migrate:up` (Slice 3) y verificar la tabla de audit y su trigger contra `information_schema`
   y `pg_trigger`; ejercitar el rechazo de UPDATE y DELETE.
3. Correr el plan read-only y contrastar su salida contra `listOverdueCandidateRetentions`: deben
   coincidir exactamente.
4. Verificar que ningún candidato con proceso abierto ni contratado aparece en el plan.
5. Sign-off de People Ops sobre la allowlist podada, fila por fila.
6. Apply sobre **un solo** registro. Verificar el soft-delete, la fila de audit y que el documento
   dejó de ser legible por la ruta de assets.
7. Ejercitar el rollback de ese registro y confirmar que vuelve a su estado previo.
8. Recién entonces, apply del resto de la allowlist.
9. Confirmar que `hiring.candidate_document.retention_overdue` baja exactamente en lo purgado.

### Out-of-band coordination required

- **Sign-off de People Ops** antes de cualquier apply: es la única mutación destructiva de la task.
- **Revisión de Legal/Privacidad** del plazo declarado (12 meses) y de si corresponde avisar al
  candidato antes del borrado.
- **Aviso a HR** de que los documentos purgados dejan de estar disponibles en Application 360.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El reader consume el invariante `stage='closed'` ⟺ desenlace y **enumera los seis
      desenlaces**, con test por cada uno: `selected`/`backup_selected` fuera, `not_selected`,
      `rejected`, `withdrawn` y `unresponsive` dentro.
- [ ] El docstring de `src/lib/hiring/documents/retention.ts` cita el ADR y ya no describe el
      arranque del reloj con literales de etapa retirados.
- [ ] El trigger `refresh_assessment_access_recovery_retention_for_application()` no nombra ninguna
      etapa retirada, verificado con `pg_get_functiondef` contra PG real, y su reescritura entró por
      migración nueva sin editar la de `TASK-1746`.
- [ ] La escalera del trigger asigna `workforce_record` a `selected`/`backup_selected` y el reloj de
      12 meses a `rejected`/`withdrawn`/`not_selected`/`unresponsive`; **ningún desenlace cae al
      `ELSE NULL`**, ejercitado uno por uno contra PG real.
- [ ] El `ELSE NULL` queda comentado en el cuerpo de la función como «sin desenlace = proceso vivo»,
      y `on_hold` queda declarado fuera de la escalera por no ser desenlace.
- [ ] Retención y Talent Pool quedan declarados como ejes distintos: purgar los documentos de un
      `not_selected` no lo saca del pool, y estar en el pool no lo excluye del barrido.
- [ ] `greenhouse_hiring.candidate_document_purge_audit` existe y rechaza UPDATE y DELETE, verificado
      contra PG real.
- [ ] `planCandidateDocumentPurge` es read-only: correrlo sin flags no muta ninguna fila.
- [ ] El plan no imprime nombre, correo ni contenido de documento en ninguna de sus salidas.
- [ ] El apply exige `--allowlist`, `--actor` y una justificación de al menos 10 caracteres.
- [ ] El apply opera en lotes de 1 con CAS y escribe una fila de audit por documento tocado.
- [ ] Un asset ya `deleted` se reporta `skipped` y no como error (idempotencia verificada).
- [ ] Ningún camino del command ejecuta un DELETE físico sobre `greenhouse_core.assets`.
- [ ] Un candidato con postulación abierta o contratado nunca aparece en el plan, con test.
- [ ] El rollback restaura `assets.status` desde el `before_status` del audit, verificado en vivo.
- [ ] La capability `hiring.candidate_document.purge` existe con grant a un rol real y pasa el guard
      de cobertura.
- [ ] Ningún barrido de esta task filtra por `data_origin`.
- [ ] `hiring.candidate_document.retention_overdue` vuelve a `0` tras purgar la cola.

## Verification

- `pnpm vitest run src/lib/hiring/documents`
- `pnpm local:check`
- `pnpm test`
- `pnpm build`
- Verificación en vivo contra PG del audit, el plan, un apply de un registro y su rollback.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] el docstring de `src/lib/hiring/documents/retention.ts` deja de declarar el borrado como
      follow-up pendiente y apunta al command canónico
- [ ] la spec de `TASK-1746` queda apuntando a la migración que reescribió su trigger de retención

## Follow-ups

- Superficie de People Ops para operar la cola sin CLI (requiere wireframe propio).
- Lane de eliminación del objeto en el bucket, opt-in e irreversible, sólo tras estabilizar el
  soft-delete.
- Extender el criterio de retención a Growth Forms si allí se capturan documentos de candidato.

## Open Questions

- ~~**¿El reloj arranca sólo con `decision`, o también con el cierre por `stage`?**~~ **RESUELTA
  (2026-08-22) por `GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1`.** El ADR retira
  `rejected`/`withdrawn` del enum de etapas (§3, §6) y hace `stage='closed'` ⟺ desenlace declarado
  (§5): el reloj arranca **sólo** con el desenlace y, al cerrar, siempre hay uno. La pregunta perdió
  su objeto — no queda camino de cierre sin desenlace registrado. Lo que queda es consumir el
  invariante (`Slice 1`), no decidirlo.
- **¿Corresponde avisar al candidato antes de borrar sus documentos?** Es decisión de
  Legal/Privacidad y cambia el alcance del `Slice 7`.
