# TASK-1841 — Efeonce ID First Consented Customer Pilot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Especificación registrada 2026-09-06; sin organización elegida, invitación, grant, tratamiento cliente, rollout ni evidencia. Empieza sólo después de la certificación sintética TASK-1832, assurance TASK-1833 y cierre de las pantallas TASK-1835.`
- Rank: `TBD`
- Domain: `platform|identity|integration|ops|customer`
- Blocked by: `TASK-1832, TASK-1833, TASK-1835`
- Branch: `Greenhouse develop; efeonce-mcp main; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Incorporar la primera organización cliente real a Efeonce ID y MCP después de que Efeonce haya terminado
todo el QA técnico con canaries sintéticos. El cliente no actúa como tester: recibe un onboarding normal,
consiente el acceso y usa una sola capacidad read-only útil, con soporte, observación y rollback inmediato.

## Why This Task Exists

La certificación sintética prueba protocolo, navegadores, correo, tokens, aislamiento y revocación, pero no
prueba comprensión, confianza, consentimiento ni valor real. Mezclar ambos objetivos en TASK-1832 trasladaba
fallos técnicos a una persona cliente y volvía ambiguo el cierre. Esta task conserva una frontera comercial y
operativa explícita: sólo comienza con readiness técnica y security assurance cerradas.

## Goal

- Elegir por decisión explícita una organización `client|both` + `active_client` existente en Account 360.
- Invitar a un administrador real con información previa, consentimiento y canal de soporte; nunca pedirle
  ejecutar una matriz técnica ni compartir códigos, tokens, capturas sensibles o logs.
- Otorgar una sola capability read-only existente, ligada a su organización y útil para el piloto.
- Verificar login, consentimiento, lectura propia, aislamiento y revocación mediante observación de Efeonce.
- Completar 7 días de señales estables y una revisión conjunta antes de proponer segunda organización/capability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- La organización la elige y aprueba el operador por ID de Account 360; nunca por dominio de correo, signup,
  similitud de nombre ni creación oportunista.
- El command comercial `bindExternalOrganization` conserva su gate vigente: organización activa,
  `organization_type IN ('client','both')` y `lifecycle_stage='active_client'`.
- El cliente recibe una experiencia de piloto, no un guion de QA. Efeonce ya probó la matriz en TASK-1832.
- Una capability read-only, sin writes, gasto, administración amplia ni datos de otras organizaciones.
- Identidad, Person 360, Account 360, binding, grants y entitlements siguen siendo fuentes separadas y
  canónicas; autenticarse no concede permisos.
- Evidencia redactada: nunca tokens, códigos, cookies, secretos, correo completo o datos cliente en repo/logs.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md`
- `docs/tasks/in-progress/TASK-1832-efeonce-mcp-client-canaries-and-first-customer-cohort.md`
- `docs/tasks/to-do/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md`
- `docs/tasks/in-progress/TASK-1835-efeonce-id-login-consent-screens.md`
- `docs/tasks/complete/TASK-1837-efeonce-id-external-invitation-delivery-delegated-authority.md`

## Dependencies & Impact

### Depends on

- `TASK-1832`: matriz de clientes y canary externo sintético completos, incluidos Chrome/Safari y cleanup.
- `TASK-1833`: assurance, privacidad, retención, rotación y respuesta a incidentes cerradas para el alcance.
- `TASK-1835`: login/consentimiento/recuperación con evidencia visual y accesible completa.
- `TASK-1631` + `TASK-1837`: binding, invitación entregada por el sistema, designated admin y grants auditados.

### Blocks / Impacts

- Segunda organización cliente, segunda capability y cualquier write federado.
- Declaración comercial de Efeonce ID/MCP como disponible para clientes externos más allá del piloto.
- `TASK-1834` puede dark-deploy antes; la activación cliente amplia debe consumir la evidencia de este piloto.

### Files owned

- `docs/operations/runbooks/mcp-customer-organization-onboarding.md`
- `docs/audits/mcp/EFEONCE_ID_FIRST_CUSTOMER_PILOT_<fecha>.md`
- Deltas de estado/evidencia en `TASK-1631`, `TASK-1832`, `TASK-1833`, `TASK-1835` y EPIC-044.

## Current Repo State

### Already exists

- `bindExternalOrganization`, invitaciones y grants de `src/lib/identity/external-access/**`.
- Entrega automática y autoridad delegada de TASK-1837 en producción.
- Emisor, sesión, OAuth, refresh/revocación y gateway multi-issuer construidos; la evidencia completa previa
  al cliente pertenece a TASK-1832/1833.

### Gap

- No hay organización cliente seleccionada ni consentimiento para piloto.
- No existe evidencia de experiencia real, valor, soporte o estabilidad de una organización cliente.
- El runbook actual no separa todavía certificación sintética de onboarding cliente.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/identity/external-access/**`, `services/auth-server/**`, gateway `efeonce-mcp` y runbooks Greenhouse
- Future candidate home: `remain-shared`
- Boundary: commands/readers canónicos de binding/invitación/grant; issuer y gateway sólo consumen el contexto autorizado
- Server/browser split: navegador usa pantallas/rutas públicas; stores, tokens, policy, PII y audit permanecen server-only
- Build impact: `none`
- Extraction blocker: transacción y autoridad canónica viven en Greenhouse; emisor/gateway son consumidores separados

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_core.organizations`, `external_organization_bindings`, `external_member_invitations`, `external_capability_grants`, identidad/audit del emisor
- Consumidores afectados: cliente piloto, Account 360, Person 360, auth-server, gateway MCP, provider y soporte Efeonce
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: commands de `TASK-1631/1837`, token/contexto de `TASK-1829/1831`, pantallas de `TASK-1835`
- Contrato nuevo o modificado: ninguno; esta task ejecuta un rollout sobre contracts certificados
- Backward compatibility: `not applicable`
- Full API parity: todas las mutaciones usan commands canónicos con capability, idempotencia y audit; nunca SQL

### Data model and invariants

- Entidades/tablas/views afectadas: filas existentes de organización, binding, invitation, membership, grant, consent, session y OAuth token ledger
- Invariantes que no se pueden romper:
  - `Autenticación exitosa sin binding/grant vigente no confiere acceso.`
  - `Una organización, un administrador y una capability read-only durante toda la cohorte inicial.`
  - `Revocar grant/binding deniega tokens vigentes dentro del SLO probado antes de ampliar.`
- Write-target allowlist: `N/A — no crea tablas ni nuevos destinos; consume commands existentes`
- Tenant/space boundary: organización aprobada por ID; contexto derivado server-side y revalidado antes del dispatch
- Idempotency/concurrency: idempotency keys por alta/invitación/grant/revocación; no repetir onboarding por timeout
- Audit/outbox/history: actor, razón, organización y outcome en ledgers canónicos; sin secretos ni PII innecesaria

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: organización sin binding/grant hasta aprobación explícita y preflight verde
- Backfill plan: `none — no se reclasifican ni crean organizaciones/personas`
- Rollback path: revocar grant y binding por commands + gate externo del gateway OFF; preservar audit
- External coordination: consentimiento de la organización, administrador nominal, horario, soporte y contacto de incidente

### Security and access

- Auth/access gate: sesión Efeonce ID + binding + grant + contexto + policy por tool/capability/organización
- Sensitive data posture: identidad y datos cliente mínimos; evidencia redactada y retención conforme a privacy review
- Error contract: errores canónicos recuperables; correlation ID para soporte, sin raw errors
- Abuse/rate-limit posture: límites del emisor/invitaciones; una organización y una capability; kill switch probado

### Runtime evidence

- Local checks: readback de versiones/runbooks; no mocks como sustituto del rollout
- DB/runtime checks: organización elegible, binding/grant/consent/session/audit antes y después; cero autoridad residual tras rollback
- Integration checks: invitación, login, consentimiento, lectura propia, deny ajeno y revocación con token vigente
- Reliability signals/logs: señales auth/oauth/person/external binding/gateway steady; negativas etiquetadas como prueba
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist — N/A, no hay tablas nuevas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime/DB evidence covers onboarding, access, isolation, revocation and cleanup.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crearla.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Selección, consentimiento y preflight

- Operador selecciona una organización elegible existente y una capability read-only útil; Product/Security/
  Privacy confirman alcance, soporte, retención y rollback. La organización acepta el piloto y designa admin.
- Readback de TASK-1832/1833/1835 completas, versiones servidas, flags, signals y ausencia de incidentes abiertos.

### Slice 2 — Onboarding normal acompañado

- Enviar invitación por el sistema; el cliente completa login y consentimiento sin compartir secretos ni seguir
  un guion técnico. Efeonce observa correlation IDs, audit y señales desde sus superficies operativas.
- Confirmar acceso propio read-only y rechazo de contexto ajeno; no ejecutar negativas disruptivas con el cliente.

### Slice 3 — Observación y decisión

- Observar 7 días, atender incidencias por runbook y recoger feedback de comprensión/valor/soporte.
- Revalidar grant/binding; ejecutar rollback controlado o continuar con el mismo alcance. Segunda organización o
  capability requiere decisión/task posterior, nunca expansión implícita.

## Out of Scope

- Pedir al cliente probar navegadores, PKCE, tokens, refresh, revocación, fallas o herramientas distintas.
- Más de una organización, administrador inicial o capability; cualquier write, gasto o acceso interno.
- Migraciones, nuevos providers de login, cambios de entitlement o correcciones técnicas descubiertas durante
  el piloto; vuelven a su task dueña y el rollout se pausa.
- Presentar el piloto como disponibilidad general, SSO enterprise, SLA o certificación de seguridad.

## Detailed Spec

- El brief al cliente explica propósito, datos visibles, duración, capability, soporte, revocación y privacidad
  en lenguaje de producto. No usa términos «canary», «penetration test» ni solicita capturas con información.
- Efeonce ejecuta las negativas técnicas antes del onboarding en TASK-1832. Durante el piloto sólo confirma
  aislamiento mediante sus propios readers y un contexto controlado, sin inducir errores al cliente.
- Cualquier error de login/consentimiento genera correlation ID y soporte; no se pide repetir indefinidamente.
- El feedback humano se guarda como conclusión redactada, separado de tokens, logs y datos del cliente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1832 + TASK-1833 + TASK-1835 completas → Slice 1 aprobada → Slice 2 → observación 7 días → Slice 3.
- Un blocker, señal error, incidente de identidad o revocación fuera de SLO detiene el rollout y ejecuta rollback.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cliente recibe un fallo técnico no descubierto | customer/auth | low | certificación sintética completa + horario acompañado + stop rule | auth/gateway error por correlation ID |
| Autenticación se confunde con autorización | identity/MCP | medium | binding/grant/context revalidados; deny ajeno observado | `unbound_dispatch_attempt` / `revoked_still_dispatching` |
| Piloto se expande sin decisión | governance | medium | una org/una capability; no auto-grants; cierre humano | binding/grant fuera del allowlist |
| Revocación no corta token vigente | security | low | SLO probado y kill switch antes de invitar | `revoked_still_dispatching` |
| Evidencia expone PII o secretos | privacy | low | redacción, correlation IDs y retención aprobada | hallazgo de privacy review |

### Feature flags / cutover

- Sin flag nuevo: el binding/grant de una organización es el cutover. El gate externo del gateway es kill switch
  global; no se apaga por una incidencia menor sin evaluar consumidores existentes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | no crear binding/invitación/grant; registrar no-go | inmediato | sí |
| Slice 2 | revocar grant + binding por command; revocar consent/sesiones cuando corresponda | < 5 min | sí |
| Slice 3 | mantener revocado y cerrar piloto; preservar audit y soporte | < 10 min | sí |

### Production verification sequence

1. Confirmar tasks bloqueantes completas y runtime exacto servido.
2. Leer organización Account 360 y elegibilidad; registrar aprobación/consentimiento sin mutar.
3. Crear binding, invitación y grant read-only por commands con idempotency/actor/razón.
4. Confirmar entrega y sesión sin leer/copiar el token; cliente consiente y usa la capacidad.
5. Verificar lectura propia, deny ajeno y signals; no pedir acciones técnicas al cliente.
6. Observar 7 días y revalidar autoridad diariamente.
7. Ejecutar revocación controlada o documentar continuación en el mismo alcance; nunca ampliar automáticamente.

### Out-of-band coordination required

- Aprobación del operador, organización cliente y administrador; Product/Security/Privacy; soporte y ventana de
  incidente. Ningún correo o invitación sale antes de tener esas aprobaciones registradas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] TASK-1832, TASK-1833 y TASK-1835 están completas con evidencia vigente; ningún skip cuenta como verde.
- [ ] Organización existente `client|both` + `active_client` elegida explícitamente; no se creó/reclasificó para el piloto.
- [ ] Organización y administrador aceptaron alcance, datos, duración, soporte, revocación y privacidad.
- [ ] Una sola capability read-only fue otorgada por command auditado; no existen writes ni grants implícitos.
- [ ] Invitación, login y consentimiento se completaron sin transportar ni registrar secretos.
- [ ] Cliente accede sólo a su organización; contexto ajeno e internal-only permanecen denegados.
- [ ] Revocación/rollback fue probado antes de la invitación y queda ejecutable en < 5 min durante el piloto.
- [ ] Siete días de señales y readbacks diarios no muestran acceso huérfano, revocado o cross-tenant.
- [ ] Feedback humano distingue comprensión/valor/soporte de la certificación técnica.
- [ ] Decisión final `continue_same_scope|rollback|propose_expansion` registrada; expansión exige trabajo separado.
- [ ] Runbook y expediente redactado permiten soporte/repetición sin conocimiento tribal.

## Verification

- `pnpm task:lint --task TASK-1841`
- `pnpm docs:closure-check`
- Readbacks canónicos de organización, binding, grant, consent, session, OAuth ledger y gateway policy.
- Evidencia redactada en `docs/audits/mcp/EFEONCE_ID_FIRST_CUSTOMER_PILOT_<fecha>.md`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron sincronizados
- [ ] `Handoff.md` y `changelog.md` registran únicamente estado/evidencia vigente
- [ ] se ejecutó chequeo de impacto cruzado sobre TASK-1631/1831/1832/1833/1834/1835/1837/1838
- [ ] documentación funcional y manual de onboarding/soporte reflejan la experiencia real y su rollback

## Follow-ups

- Segunda organización o capability sólo después del verdict de esta task, con scope y owner explícitos.
- Writes federados permanecen en los epics/tasks dueños y exigen gates de gasto/acción propios.

## Open Questions

- Organización y capability read-only candidatas: decisión comercial posterior, no requerida para registrar la task.
