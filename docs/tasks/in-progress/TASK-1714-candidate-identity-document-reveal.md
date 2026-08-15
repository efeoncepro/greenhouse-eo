# TASK-1714 — Candidate identity document reveal (camino auditado para candidatos sin member)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|agency|identity|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El reveal auditado de un documento de identidad existe solo anclado a `memberId`
(`/api/hr/people/[memberId]/legal-profile/document/[documentId]/reveal`). Un candidato no
tiene member hasta el handoff, así que hoy **no hay ningún camino** —correcto ni incorrecto—
para revelar el RUT/pasaporte que `captureCandidateIdentityDocument` ya sabe capturar. Esta
task abre ese camino: capability propia, command con verificación de pertenencia (anti-IDOR)
y ruta canónica anclada por `candidateFacetId`.

## Why This Task Exists

TASK-1362 cerró el sustrato documental del candidato y dejó escrito el invariante:
*"NUNCA exponer `value_full` de un documento de identidad por el resolver. Sale sólo por el
reveal auditado de TASK-784 (capability + reason ≥5 chars + audit append-only)"*. Ese reveal,
sin embargo, se construyó en TASK-784 para **personas con member** y su route toma `memberId`
en el path (`requireHrCoreReadTenantContext` + lookup por member). Un candidato se ancla por
`identity_profile_id` / `candidate_facet_id` (invariante duro del mismo TASK-1362: *"NUNCA
anclar un documento de candidato por `member_id`"*).

Resultado: el dominio puede **escribir** el documento de identidad de un candidato y
**mostrarlo enmascarado**, pero nadie puede leerlo legítimamente. La consecuencia práctica es
peor que la funcional — cuando People Ops necesita el RUT para preparar el contrato, lo pide
por un canal fuera del portal (mail, WhatsApp), que es exactamente el flujo que el reveal
auditado existe para evitar: el dato sale igual, sin capability, sin motivo y sin trail.

Además, `TASK-1715` (panel de Documentos real) no puede cerrar su estado `identity` sin este
contrato: quedaría con el mismo candado decorativo que motivó todo el trabajo.

## Goal

- Un command canónico que revele el documento de identidad de un candidato verificando que el
  documento **pertenece** a ese candidato antes de devolver nada.
- Una capability propia y estrecha (`hiring.candidate.reveal_identity`) granteada al tier de
  gobernanza de hiring, sin ampliar el radio de la capability person-wide.
- Una ruta canónica anclada por `candidateFacetId`, con errores canónicos y sin PII en logs.
- Trail de auditoría real (append-only + outbox) reusando la maquinaria de TASK-784, sin
  duplicarla.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Delta 2026-07-10 — Candidate document capture)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§Person legal profile)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón capability ⇒ grant + coverage)

Reglas obligatorias:

- **NUNCA** anclar un documento de candidato por `member_id`. El ancla es
  `identity_profile_id` / `candidate_facet_id` (invariante TASK-1362).
- **NUNCA** devolver `value_full` sin capability + `reason` ≥5 caracteres + entrada de
  auditoría escrita en la misma transacción.
- **NUNCA** loggear `value_full`, `value_normalized` ni el `reason` crudo en Sentry o consola.
- **NUNCA** aceptar un `documentId` sin comprobar que su `profile_id` es el
  `identity_profile_id` del `candidateFacetId` del path (anti-IDOR).
- **NUNCA** persistir una capability nueva sin su grant a ≥1 rol real en el mismo PR
  (`capability-grant-coverage.test.ts` rompe el build).
- **NUNCA** retornar prosa en inglés al cliente: usar `canonicalErrorResponse`.

## Normative Docs

- `docs/tasks/complete/TASK-1362-candidate-document-capture.md` (sustrato + invariantes)
- `docs/tasks/complete/TASK-784-person-legal-profile.md` (patrón de reveal auditado) `[verificar path exacto]`
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (nodo N5)

## Dependencies & Impact

### Depends on

- `greenhouse_core.person_identity_documents` + `person_identity_document_audit_log` (TASK-784)
- `revealPersonIdentityDocument` — `src/lib/person-legal-profile/reveal.ts:46`
- `greenhouse_hiring.candidate_facet` + `getCandidateFacetById` — `src/lib/hiring/store.ts:596`
- `capabilities_registry` (seed por migración) + `src/lib/entitlements/runtime.ts`

### Blocks / Impacts

- `TASK-1715` — el panel de Documentos consume esta ruta para su estado `identity`.
- Nexa / MCP — obtienen la capacidad por Full API Parity sin trabajo adicional.
- Signal `identity.legal_profile.reveal_anomaly_rate` — empieza a ver revelaciones de
  candidatos; su lectura no cambia (lee el mismo audit log).

### Files owned

- `src/lib/hiring/documents/reveal-identity-document.ts` (nuevo)
- `src/lib/hiring/documents/reveal-identity-document.test.ts` (nuevo)
- `src/lib/hiring/documents/index.ts` (export)
- `src/app/api/hiring/candidate-facets/[candidateFacetId]/identity-documents/[documentId]/reveal/route.ts` (nuevo)
- `src/lib/entitlements/runtime.ts` (grant)
- `migrations/*-task-1711-candidate-identity-reveal-capability.sql` (seed registry)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (delta)

## Current Repo State

### Already exists

- `captureCandidateIdentityDocument` — `src/lib/hiring/documents/capture-identity-document.ts`
  (escribe el documento anclado al `identity_profile_id`, post-decisión favorable).
- `resolveCandidateDocuments` — devuelve `identityDocuments[]` con `documentId`,
  `displayMask`, `verificationStatus`. Nunca `value_full`.
- `revealPersonIdentityDocument` — `src/lib/person-legal-profile/reveal.ts`: valida `reason`
  ≥5, rechaza `archived`/`expired` (409), escribe audit + outbox en una transacción y
  devuelve el valor. **No** chequea autorización adentro (por diseño: defensa en la ruta).
- Ruta member-scoped: `src/app/api/hr/people/[memberId]/legal-profile/document/[documentId]/reveal/route.ts`.
- `canAccessHiringCandidateDocument` — `src/lib/hiring/documents/access.ts`.

### Gap

- No existe ruta ni command para revelar un documento de identidad **de un candidato**.
- La única capability de reveal (`person.legal_profile.reveal_sensitive`) está granteada solo
  a `FINANCE_ADMIN` + `EFEONCE_ADMIN` (`src/lib/entitlements/runtime.ts:1851`); el tier que
  opera hiring (`HR_MANAGER`) no la tiene, y otorgársela abriría el reveal sobre **toda**
  persona del módulo HR.
- Nada verifica hoy que un `documentId` pertenezca al candidato del path: una ruta ingenua
  sería un IDOR directo sobre PII de cualquier persona del sistema.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/hiring/documents/**` + `src/app/api/hiring/candidate-facets/**` en el portal Next.js
- Future candidate home: `domain-package`
- Boundary: command `revealCandidateIdentityDocument`; consumers autorizados son la ruta HTTP, Nexa y MCP
- Server/browser split: `server-only` estricto; el valor sensible jamás se serializa a un Client Component
- Build impact: `none`
- Extraction blocker: la transacción de audit vive en el pool PostgreSQL compartido con `person-legal-profile`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_core.person_identity_documents` + `person_identity_document_audit_log`
- Consumidores afectados: `UI (TASK-1715) | Nexa | MCP`
- Runtime target: `local → staging → production`

### Contract surface

- Contrato existente a respetar: `revealPersonIdentityDocument` (`src/lib/person-legal-profile/reveal.ts`), `canonicalErrorResponse` (`src/lib/api/canonical-error-response.ts`)
- Contrato nuevo: command `revealCandidateIdentityDocument` + `POST /api/hiring/candidate-facets/[candidateFacetId]/identity-documents/[documentId]/reveal`
- Backward compatibility: `compatible` — ruta nueva, nada existente cambia de forma
- Full API parity: la regla de negocio vive en `src/lib/hiring/documents/reveal-identity-document.ts`; la ruta HTTP, Nexa y MCP son tres clientes del mismo command

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.person_identity_documents` (lectura), `greenhouse_core.person_identity_document_audit_log` (append), `greenhouse_sync.outbox_events` (append), `greenhouse_hiring.candidate_facet` (lectura), `greenhouse_core.capabilities_registry` (seed)
- Invariantes que no se pueden romper:
  - `document.profile_id` debe ser exactamente el `identity_profile_id` del `candidateFacetId` del path; cualquier otra combinación responde `404`, no `403` (no confirma la existencia del documento ajeno)
  - `reason.trim().length >= 5` validado antes de tocar la fila
  - el `value_full` sale una sola vez en la respuesta HTTP y nunca se escribe a log, Sentry, outbox ni audit
  - la entrada de auditoría y la lectura del valor ocurren en la misma transacción
  - documento `archived` / `expired` no se revela (`409`)
- Tenant/space boundary: `requireInternalTenantContext`; `client_*` denegado por `canAccessHiringCandidateDocument` antes de cualquier lectura
- Idempotency/concurrency: **no idempotente por diseño** — cada reveal es un acceso real y debe dejar su propia entrada; el cliente evita el doble disparo bloqueando el CTA, no el servidor deduplicando
- Audit/outbox/history: append-only vía `writePersonIdentityDocumentAuditEntry` + outbox `person.identity_document.revealed_sensitive` (reuso, sin evento nuevo)

### Migration, backfill and rollout

- Migration posture: `seed` — insertar `hiring.candidate.reveal_identity` en `capabilities_registry` con marker `-- Up Migration` y bloque `DO` que aborta si la fila no quedó
- Default state: `enabled` — la capability nace granteada al tier de gobernanza; sin flag (la ruta no existe hoy, así que no hay comportamiento previo que preservar)
- Backfill plan: `N/A — no hay data que reprocesar`
- Rollback path: revert del PR + migración inversa que borra la fila del registry; la capability sin consumers es inerte
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: sesión interna + `canAccessHiringCandidateDocument` (capability `hiring.application.read`) + capability `hiring.candidate.reveal_identity`
- Sensitive data posture: `PII` — número de documento de identidad de una persona natural (Ley 21.719)
- Error contract: `canonicalErrorResponse` con `unauthorized` / `forbidden` / `not_found` / código de validación del motivo; `captureWithDomain` sin PII
- Abuse/rate-limit posture: sin rate-limit dedicado en V1 — el trail auditado + el signal `identity.legal_profile.reveal_anomaly_rate` son la detección; se documenta como deuda con condición de retiro (si el signal levanta anomalías reales, nace el límite)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring src/lib/person-legal-profile`
- DB/runtime checks: `pnpm pg:connect:migrate` + `SELECT` sobre `capabilities_registry` confirmando la fila; reveal real contra el proxy y `SELECT` sobre `person_identity_document_audit_log` confirmando `action='revealed_sensitive'`
- Integration checks: llamada autenticada a la ruta con persona agente `agent@greenhouse.efeonce.org` y con `agent-collaborator@` (debe dar `403`)
- Reliability signals/logs: `identity.legal_profile.reveal_anomaly_rate`
- Production verification sequence: migración → deploy → reveal de prueba sobre un candidato real seleccionado → verificar fila de auditoría → confirmar que `agent-collaborator` recibe `403`

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de pertenencia, motivo y no-log de PII explícitos y testeados.
- [ ] Migración de seed con bloque `DO` verificador; rollback declarado.
- [ ] Evidencia de DB (fila de auditoría) y de acceso (`403` con rol sin capability).
- [ ] Errores canónicos, sin prosa en inglés ni PII en la respuesta de error.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el command `src/lib/hiring/documents/reveal-identity-document.ts`, no en la ruta.
- [ ] Modelada como command sobre un recurso (`identity-documents/[id]/reveal`), no click-handler.
- [ ] Write con authorization fina (capability, no admin-coarse), audit, errores canónicos y observabilidad.
- [ ] Capability + grant + coverage test en el mismo PR.
- [ ] Camino programático: Product API interna; Nexa/MCP por parity.
- [ ] Apto para `propose → confirm → execute`: el motivo humano ES la confirmación; el LLM nunca revela por su cuenta.
- [ ] Un primitive, muchos consumers.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capability + grant + seed

- Agregar `hiring.candidate.reveal_identity` (module `hiring`, action `read`, scope `tenant`) al catálogo TS.
- Grant en `src/lib/entitlements/runtime.ts` al tier de gobernanza de hiring (`EFEONCE_ADMIN`, `HR_MANAGER`, `EFEONCE_OPERATIONS`) — el mismo bloque role-only que ya gobierna `hiring.application.decide`, sin `routeGroup internal`.
- Migración de seed en `capabilities_registry` con marker `-- Up Migration` + bloque `DO` verificador.
- `capability-grant-coverage.test.ts` verde.

### Slice 2 — Command con verificación de pertenencia

- `revealCandidateIdentityDocument({ candidateFacetId, documentId, actorUserId, actorEmail, reason, ipAddress, userAgent })`.
- Resuelve el facet, compara `document.profile_id` contra `facet.identityProfileId`, responde `HiringNotFoundError` si no coinciden.
- Delega en `revealPersonIdentityDocument` (audit + outbox + validación de estado ya resueltos ahí).
- Export desde `src/lib/hiring/documents/index.ts`.

### Slice 3 — Ruta canónica

- `POST /api/hiring/candidate-facets/[candidateFacetId]/identity-documents/[documentId]/reveal`.
- `requireInternalTenantContext` → `canAccessHiringCandidateDocument` → `can(...,'hiring.candidate.reveal_identity','read','tenant')`.
- Body `{ reason }`; respuesta `{ document, auditId, eventId }` con el valor y sin metadatos internos.
- Errores canónicos + `captureWithDomain` sin PII.

### Slice 4 — Tests y documentación

- Unit del command: pertenencia OK, pertenencia cruzada → `404`, motivo corto → error de validación, facet inexistente → `404`.
- Test de la ruta: sin capability → `403`; `client_*` → `403`.
- Delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` con los invariantes nuevos.

## Out of Scope

- La UI que consume esta ruta (**TASK-1715**).
- Reveal de direcciones de candidato (`revealPersonAddress`) — no hay captura de direcciones en hiring.
- Cambiar la ruta member-scoped de TASK-784.
- Rate-limit dedicado de revelaciones (deuda declarada, con condición de retiro).
- Unificar ambas rutas de reveal en una sola genérica: el ancla es distinta y la fusión prematura borraría el predicado de pertenencia que hace segura a cada una.

## Detailed Spec

### Por qué una capability nueva y no `person.legal_profile.reveal_sensitive`

Tres opciones se evaluaron:

| Opción | Consecuencia | Veredicto |
|---|---|---|
| Reusar `person.legal_profile.reveal_sensitive` | El tier que opera hiring (`HR_MANAGER`) no la tiene; para dársela habría que granteársela en el bloque HR, lo que abre el reveal sobre **toda** persona del módulo (colaboradores, ex-colaboradores, direcciones) | ❌ over-grant |
| Reusar `hiring.application.read` | Leer una ficha y ver el número de documento de identidad quedarían al mismo precio; contradice el invariante de TASK-1362 | ❌ under-gate |
| Capability nueva `hiring.candidate.reveal_identity` | Radio exacto: revelar la identidad **de un candidato**; granteable al tier de gobernanza de hiring sin tocar el módulo HR | ✅ |

La capability entra al bloque role-only que ya gobierna `hiring.application.decide` /
`hiring.opening.publish` — deliberadamente **sin** `routeGroup internal`, porque ese routeGroup
lo porta todo tenant interno (incluido `collaborator` y `designer`) y convertiría el reveal en
un permiso de facto universal. Es el mismo razonamiento documentado en el audit 2026-07-10 de
TASK-353.

### Contrato del command

```ts
export type RevealCandidateIdentityDocumentInput = {
  candidateFacetId: string
  documentId: string
  actorUserId: string
  actorEmail?: string | null
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

// Devuelve el documento CON value_full + auditId + eventId.
// Lanza HiringNotFoundError si el documento no pertenece al candidato.
export const revealCandidateIdentityDocument: (
  input: RevealCandidateIdentityDocumentInput,
) => Promise<{ document: PersonIdentityDocumentSensitive; auditId: string; eventId: string }>
```

### Anti-IDOR: por qué `404` y no `403`

Si el `documentId` existe pero pertenece a otra persona, responder `403` confirmaría su
existencia a quien está sondeando. El command responde `404` con el mismo mensaje que un
documento inexistente. La distinción entre "no existe" y "no es tuyo" queda solo en el log
interno (sin PII), nunca en la respuesta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (capability + grant + seed) → Slice 2 (command) → Slice 3 (ruta) → Slice 4 (tests/docs).
- Slice 3 **NO** puede shippear antes que Slice 1: una ruta que chequea una capability
  inexistente en `capabilities_registry` deja a todo el mundo fuera (o, si el check se
  escribiera laxo, a todo el mundo dentro).
- Slice 2 no puede saltarse la verificación de pertenencia "para después": sin ella la ruta es
  un IDOR sobre PII de cualquier persona del sistema.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| IDOR: revelar el documento de otra persona pasando un `documentId` ajeno | identity / PII | medium | verificación `document.profile_id === facet.identityProfileId` en el command + test de pertenencia cruzada | `identity.legal_profile.reveal_anomaly_rate` |
| Over-grant: la capability llega a roles sin necesidad operativa | identity | medium | grant role-only, sin `routeGroup internal`; coverage test | revisión de grants en el PR |
| PII en logs o en Sentry | observabilidad | low | `captureWithDomain` con contexto sin valores; el command nunca recibe el valor por parámetro | grep de `value_full` en el diff |
| Revelaciones masivas sin límite | identity | low | trail auditado + signal; deuda de rate-limit documentada con condición de retiro | `identity.legal_profile.reveal_anomaly_rate` |
| Migración de seed registra sin insertar (bug pre-up-marker) | migration | low | marker `-- Up Migration` + bloque `DO` con `RAISE EXCEPTION` | fallo de la propia migración |

### Feature flags / cutover

Sin flag — la ruta no existe hoy, así que no hay comportamiento previo que preservar y el
cutover es la propia existencia del endpoint. La capability actúa como el interruptor real:
revocarla en `runtime.ts` desactiva la capacidad sin tocar código de ruta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (borra la fila del registry) + revert del grant | <10 min | sí |
| Slice 2 | revert del PR; el command no tiene consumers hasta Slice 3 | <5 min | sí |
| Slice 3 | revert del PR; la ruta desaparece y la UI degrada a "sin permiso" | <5 min | sí |
| Slice 4 | n/a (tests y docs) | — | sí |

Ningún slice muta data existente: el único write es append-only al audit log, que es
precisamente lo que no se quiere revertir.

### Production verification sequence

1. `pnpm migrate:up` en staging + `SELECT` confirmando la fila en `capabilities_registry`.
2. Deploy a staging + `POST` de reveal con la persona agente superadmin sobre un candidato con
   documento capturado → `200` con valor.
3. `SELECT` sobre `person_identity_document_audit_log` → fila `revealed_sensitive` con el
   `reason` y el actor correctos.
4. `POST` con `agent-collaborator@greenhouse.efeonce.org` → `403`.
5. `POST` con un `documentId` de otra persona → `404` (verificación anti-IDOR en runtime real).
6. Repetir 1-5 en producción tras la promoción.
7. Observar `identity.legal_profile.reveal_anomaly_rate` durante 7 días.

### Out-of-band coordination required

`N/A — repo-only change`. Vale avisar a People Ops que el reveal de candidatos queda
disponible en el portal, para retirar el canal informal actual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `hiring.candidate.reveal_identity` en el catálogo TS y en `capabilities_registry`, granteada a ≥1 rol real, con `capability-grant-coverage.test.ts` verde.
- [ ] `revealCandidateIdentityDocument` responde `404` cuando el `documentId` pertenece a otra persona, con test que lo demuestra.
- [ ] La ruta responde `403` a un rol sin la capability y a cualquier `tenantType='client'`.
- [ ] Un motivo de menos de 5 caracteres es rechazado antes de leer la fila.
- [ ] Cada reveal exitoso deja exactamente una fila `revealed_sensitive` en el audit log y un evento en el outbox.
- [ ] Ni `value_full` ni `reason` aparecen en logs, Sentry ni en la respuesta de error.
- [ ] Todas las respuestas de error usan `canonicalErrorResponse`.
- [ ] La migración incluye marker `-- Up Migration` y bloque `DO` que aborta si la fila no quedó creada.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/hiring src/lib/entitlements`
- `pnpm pg:connect:migrate` + verificación SQL de la fila del registry
- Reveal real contra el proxy local + `SELECT` del audit log

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado ejecutado (mínimo: `TASK-1715`)
- [ ] Delta agregado a `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` con los invariantes nuevos

## Follow-ups

- Rate-limit / quota de revelaciones si el signal de anomalía levanta la mano (condición de retiro de la deuda declarada).
- Reveal de direcciones de candidato, si alguna vez se capturan.
- Evaluar unificación de las dos rutas de reveal cuando exista un tercer ancla — no antes.

## Open Questions

- ¿`EFEONCE_OPERATIONS` debe portar la capability, o el reveal de identidad se restringe a
  `EFEONCE_ADMIN` + `HR_MANAGER`? La propuesta incluye Operations por simetría con
  `hiring.application.decide`; People Ops puede acotarlo.
