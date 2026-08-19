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
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

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

**Hallazgo que condiciona el diseño (verificado contra PG el 2026-08-18):** **61 de 62 postulaciones
tienen `decision IS NULL`**. El reader se guarda con
`NOT EXISTS (… open_app.decision IS NULL)` — una postulación abierta en cualquier vacante reactiva la
base de retención de esa persona. Con casi todo el universo sin decisión registrada, **el barrido
está hoy prácticamente inerte para 58 personas**. Construir el borrado sobre un detector que casi no
puede disparar daría una falsa sensación de cumplimiento: la task tiene que resolver primero si el
reloj arranca sólo con `decision` o también con el cierre por `stage` (ver `## Open Questions`).

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

## Architecture Alignment

Revisar y respetar:

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
- **El reader no muta.** `listOverdueCandidateRetentions` se mantiene read-only. El command consume
  su salida; jamás al revés.
- **La retención es CIEGA a la procedencia.** Ningún barrido de esta task filtra por `data_origin`
  (TASK-1739): la obligación legal no depende de que un dato parezca de prueba, y una persona mal
  marcada como sintética no puede quedar fuera del barrido.
- **Full API Parity.** El borrado es una capability con contrato gobernado en `src/lib/**`; el CLI es
  un consumer más, no el dueño de la lógica.

## Normative Docs

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

### Blocks / Impacts

- La señal `hiring.candidate_document.retention_overdue` pasa de "alarma sin acción posible" a
  "cola drenable"; su interpretación operativa cambia y hay que documentarlo.
- `TASK-1739` comparte la mecánica de purga pero **no el criterio**: aquella borra por procedencia,
  esta por vencimiento de finalidad. No compartir allowlist ni CLI.
- People Ops adquiere una capacidad destructiva nueva: requiere manual antes del primer uso.

### Files owned

- `src/lib/hiring/documents/retention-purge.ts` (+ tests)
- `src/lib/hiring/documents/retention.ts` (sólo si el reloj cambia — ver Open Questions)
- `scripts/hiring/purge-expired-candidate-documents.ts`
- `migrations/<timestamp>_task-1744-candidate-document-retention-audit.sql`
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
  `src/lib/reliability/queries/hiring-candidate-retention-overdue.ts`.
- Contrato nuevo o modificado: `planCandidateDocumentPurge`, `applyCandidateDocumentPurge`,
  tabla de audit `greenhouse_hiring.candidate_document_purge_audit`, capability
  `hiring.candidate_document.purge`.
- Backward compatibility: `compatible` — todo es aditivo; el reader no cambia de firma.
- Full API parity: el borrado vive como command en `src/lib/**` con capability + audit; el CLI lo
  consume igual que lo haría una superficie de People Ops o Nexa. Apto para
  `propose → confirm → execute` sin trabajo extra: `plan` produce la propuesta, la allowlist humana
  es la confirmación y `apply` es el único punto de mutación.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.assets`,
  `greenhouse_core.person_identity_documents`, `greenhouse_hiring.candidate_facet`,
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
- Tenant/space boundary: sin cambios; el barrido es interno y no deriva `space_id`.
- Idempotency/concurrency: apply en lotes de 1 con CAS sobre el estado esperado del asset; un asset
  ya `deleted` se reporta como `skipped`, no como error. Reejecutar el mismo allowlist es idempotente.
- Audit/outbox/history: tabla nueva append-only con trigger que rechaza UPDATE y DELETE, y grant sin
  DELETE para `greenhouse_runtime` (dos capas, patrón de TASK-1736/1739).

### Migration, backfill and rollout

- Migration posture: `additive` (tabla de audit); el borrado en sí es `destructive` y gobernado.
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
  read-only y contrastar su salida contra `listOverdueCandidateRetentions`.
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

### Slice 1 — Resolver el arranque del reloj

- Decidir y documentar si la retención arranca sólo con `decision` o también con el cierre por
  `stage` (`rejected`/`withdrawn`), con el dato en mano: 61 de 62 postulaciones sin `decision`.
- Ajustar `listOverdueCandidateRetentions` si la decisión lo exige, con test que cubra ambos caminos.
- Sin este slice, el resto opera sobre un detector que casi no dispara.

### Slice 2 — Audit append-only del borrado

- Migración additive: `greenhouse_hiring.candidate_document_purge_audit`
  (`purge_id`, `candidate_facet_id`, `identity_profile_id`, `lane` ∈ `document|identity_document`,
  `asset_id`, `reason` ∈ `consent_withdrawn|retention_window_elapsed`, `before_status`,
  `after_status`, `actor_user_id`, `justification`, `created_at`), con trigger que rechaza UPDATE y
  DELETE y grant sin DELETE.
- Bloque `DO` anti pre-up-marker que aborta si la tabla o el trigger no quedaron creados.

### Slice 3 — Command canónico del lane documentos

- `src/lib/hiring/documents/retention-purge.ts`: `planCandidateDocumentPurge` (read-only, consume el
  reader) y `applyCandidateDocumentPurge` (allowlist + actor + `justification` ≥ 10 caracteres, lotes
  de 1, CAS sobre el estado del asset, audit por fila).
- Soft-delete: `assets.status = 'deleted'`. Nunca DELETE físico.
- Capability + grant + coverage test en el mismo PR.

### Slice 4 — CLI de operación

- `scripts/hiring/purge-expired-candidate-documents.ts` + script npm
  `hiring:documents:purge-expired`, con los modos dry-run / emit-allowlist / apply / rollback.
- Header del CLI con la advertencia de PII y la prohibición de pegar su salida en logs compartidos.

### Slice 5 — Lane del documento de identidad

- Barrido separado sobre `greenhouse_core.person_identity_documents` del candidato, con su propia
  entrada de allowlist y su propio `lane` en el audit.
- Va después del lane de documentos porque toca el core de personas y su blast radius es mayor.

### Slice 6 — Señal + triple documentación

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

### 3. El plan propone; el humano dispone

El plan imprime, por candidato: identificadores, motivo del vencimiento, fecha de cierre y conteo de
documentos. **Nunca** nombre, correo ni contenido. El humano poda la allowlist línea a línea y el
apply toca sólo lo aprobado. Un candidato con proceso abierto en otra vacante no aparece nunca en el
plan: su base de retención está reactivada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `Slice 1 (reloj)` → `Slice 2 (audit)` → `Slice 3 (command)` → `Slice 4 (CLI)`. Sin resolver el
  reloj, el command opera sobre un detector inerte; sin audit, el borrado no es defendible.
- `Slice 5 (identidad)` **DEBE** ir después del `Slice 4` aplicado y verificado: toca el core de
  personas y su blast radius es mayor.
- `Slice 6` puede correr en paralelo con el `Slice 5` una vez cerrado el `Slice 4`.
- **Prohibido** ejecutar cualquier apply sin sign-off de People Ops.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se borra el documento de un candidato con proceso vivo | hiring / privacidad | low | el reader excluye a quien tiene postulación abierta; allowlist humana; CAS por fila | reclamo de HR; fila del audit con `before_status` restaurable |
| Se borra a un contratado por error de clasificación | hiring / workforce | low | `selected`/`backup_selected` excluidos en el reader; test de los cuatro caminos | `retention_overdue` con conteo anómalo |
| El apply cascadea y revienta contra una tabla append-only | assets / scan | medium | soft-delete por diseño; jamás DELETE físico; el precedente TASK-1378 ya lo probó | el CLI aborta loud |
| El plan imprime PII en un log compartido | privacidad | medium | plan sin nombre ni correo; allowlist gitignoreada; audit sin PII; advertencia en el header del CLI | revisión de artefactos de CI |
| La señal queda en alarma permanente y se normaliza ignorarla | reliability | medium | el Slice 6 la vuelve drenable y distingue purgado de pendiente | la propia señal sin volver a 0 tras un apply |
| El reloj no arranca nunca porque nadie registra `decision` | hiring / compliance | **high** | es el Slice 1: hoy 61 de 62 postulaciones no tienen decisión | `retention_overdue` en 0 con volumen alto de postulaciones cerradas de facto |

### Feature flags / cutover

Sin flag. La puerta es **capability + allowlist humana + sign-off de People Ops**, no un interruptor:
un flag encendido jamás debe autorizar por sí solo un borrado de PII. El command nace inerte porque
sin allowlist no muta nada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; el reader vuelve a su criterio anterior | < 10 min | sí |
| Slice 2 | `pnpm migrate:down` (drop de la tabla de audit) o dejarla inerte | < 10 min | sí |
| Slice 3 | revert PR; sin allowlist el command no muta nada | < 10 min | sí |
| Slice 4 | restaurar `assets.status` desde `before_status` del audit, por registro | < 5 min por registro | sí |
| Slice 5 | restaurar el estado previo del documento de identidad desde el audit | < 5 min por registro | sí |
| Slice 6 | desregistrar la señal del registry | < 10 min | sí |
| Lane de storage (futuro, opt-in) | **no reversible** — el objeto se fue del bucket | sin retorno | **no** |

### Production verification sequence

1. `pnpm migrate:up` (Slice 2) y verificar la tabla de audit y su trigger contra `information_schema`
   y `pg_trigger`; ejercitar el rechazo de UPDATE y DELETE.
2. Correr el plan read-only y contrastar su salida contra `listOverdueCandidateRetentions`: deben
   coincidir exactamente.
3. Verificar que ningún candidato con proceso abierto ni contratado aparece en el plan.
4. Sign-off de People Ops sobre la allowlist podada, fila por fila.
5. Apply sobre **un solo** registro. Verificar el soft-delete, la fila de audit y que el documento
   dejó de ser legible por la ruta de assets.
6. Ejercitar el rollback de ese registro y confirmar que vuelve a su estado previo.
7. Recién entonces, apply del resto de la allowlist.
8. Confirmar que `hiring.candidate_document.retention_overdue` baja exactamente en lo purgado.

### Out-of-band coordination required

- **Sign-off de People Ops** antes de cualquier apply: es la única mutación destructiva de la task.
- **Revisión de Legal/Privacidad** del plazo declarado (12 meses) y de si corresponde avisar al
  candidato antes del borrado.
- **Aviso a HR** de que los documentos purgados dejan de estar disponibles en Application 360.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El criterio de arranque del reloj queda decidido y documentado, con test que cubre ambos caminos.
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

## Follow-ups

- Superficie de People Ops para operar la cola sin CLI (requiere wireframe propio).
- Lane de eliminación del objeto en el bucket, opt-in e irreversible, sólo tras estabilizar el
  soft-delete.
- Extender el criterio de retención a Growth Forms si allí se capturan documentos de candidato.

## Open Questions

- **¿El reloj arranca sólo con `decision`, o también con el cierre por `stage`?** Hoy 61 de 62
  postulaciones tienen `decision IS NULL`, así que el detector está casi inerte. Si el proceso real
  cierra por `stage` (`rejected`/`withdrawn`) sin registrar `decision`, el criterio actual nunca
  vencerá nada. Resolver con People Ops mirando cómo cierran de verdad los procesos, antes del
  Slice 2.
- **¿Corresponde avisar al candidato antes de borrar sus documentos?** Es decisión de
  Legal/Privacidad y cambia el alcance del Slice 6.
