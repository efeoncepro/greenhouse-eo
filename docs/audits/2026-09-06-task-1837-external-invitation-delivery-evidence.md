# TASK-1837 — evidencia de rollout parcial: entrega gobernada de la invitación externa

> **Tipo de documento:** Evidencia de rollout / auditoría de verificación
> **Fecha:** 2026-09-06
> **Task dueña:** `TASK-1837` (EPIC-044 U12) — `docs/tasks/in-progress/TASK-1837-efeonce-id-external-invitation-delivery-delegated-authority.md`
> **Estado que acredita:** `code complete; migración aplicada 2026-09-06; flags OFF; verificación viva de correo pendiente`

## Alcance y autorización

Checkout compartido `develop`, sin push. Commits locales de la task: `5518d868e` (Slice 1 entrega),
`6cb8042a8` (Slice 2 ciclo de vida), `c9371b28f` (Slice 3 revelación + capabilities), `4f03cdff6` (Slice 4
autoridad delegada), `189148c6e` (Slice 5a host del `redirect_uri` en el consentimiento).

Este documento registra lo que SÍ se ejecutó contra la instancia PostgreSQL compartida (dev/staging/prod) y
contra el smoke live, y delimita lo que NO se verificó. No autoriza flags, no acredita correo real enviado y no
declara la task `complete`. Los tokens de invitación, URLs con token y correos de personas reales nunca se
registran acá; el smoke usa exclusivamente la organización fixture.

## Migración aplicada a la instancia compartida

Comando: `pnpm pg:connect:migrate`.

- `20260906004450748_task-1837-external-invitation-delivery-lifecycle` — `run_on 2026-09-06T04:27:58Z`.
- `src/types/db.d.ts` regenerado: +4 campos en `external_member_invitations`.

Verificación posterior por `information_schema` / `pg_constraint` / `pg_indexes` (resumen):

| Objeto | Resultado |
| --- | --- |
| `external_member_invitations.delivery_status` | presente, `NOT NULL DEFAULT 'not_attempted'` |
| `external_member_invitations.delivery_attempts` | presente, `NOT NULL DEFAULT 0` |
| `external_member_invitations.last_delivery_at` | presente (`TIMESTAMPTZ`, nullable) |
| `external_member_invitations.last_delivery_error_code` | presente (`TEXT`, nullable) |
| CHECK `external_member_invitations_delivery_status_valid` | presente (5 valores) |
| CHECK `external_member_invitations_delivery_attempts_nonnegative` | presente |
| CHECK `external_identity_audit_log_event_type_valid` | ampliado con los 6 tipos nuevos (`invitation_resent`, `invitation_token_revealed`, `invitation_delivery_failed`, `invitation_delivery_bounced`, `designated_admin_assigned`, `designated_admin_cleared`) |
| Índice `external_member_invitations_open_delivery_idx` | presente (parcial, `status='issued'`) |
| `capabilities_registry` | `identity.external_invitation.issue_delegated` (create) y `identity.external_invitation.reveal_token` (execute) activas |
| `greenhouse_notifications.email_type_config` | `external_access_invitation` con `enabled=true` |

Bindings reales al momento de la migración: el único activo es `xob-139e3fe2…` con `population='internal'`
(piloto `TASK-1836`). **No existe ningún binding externo**; la migración es aditiva y no tocó filas existentes.

## Smoke live extendido (`--apply`)

Comando: `pnpm identity:external-access:smoke -- --apply` (2026-09-06, PG real vía proxy, perfil `runtime`).
El script `scripts/identity/external-access-smoke.ts` ahora cubre TASK-1837 además del ciclo de TASK-1631.
Fixture: organización `ZZZ Q2C Smoke Fixture` (`org-ddd962ae…`), environment `smoke-task-1631` (provider
`efeonce_auth`, issuer `https://smoke-task-1631.efeonce.invalid`).

Secuencia y resultados:

1. Binding `xob-97801b83-0594-48b2-982c-bc43d0b92caa` (grant version 1→4), grant `xcg-a8fff16a…`.
2. Invitación manual `xmi-7434c75a…` → `delivery: { mode: 'manual', status: 'not_attempted', attempts: 0,
   recipientMasked: 's***@efeonce.invalid' }`. Sin correo (el smoke pasa `delivery: 'manual'` explícito).
3. Reenvío → `xmi-49311507…` con token nuevo; la anterior queda `revoked` con `revoke_reason='resent'`.
4. `recordExternalInvitationDeliveryOutcome(failed)` → `status: 'failed'`, `attempts: 1`,
   `error: 'smoke_failed'`; audit `invitation_delivery_failed` + evento outbox
   `identity.external_invitation.delivery_failed`.
5. Revelación gobernada → `xmi-26f4bc35…`, `ttlMinutes: 60`, URL con la forma
   `https://smoke-task-1631.efeonce.invalid/i/<token>` (derivada del `issuer_url` del environment).
6. El token rotado (el del reenvío) es rechazado al aceptar: `invitation_not_open` ✔.
7. Aceptación con el token revelado → membership `linked`; `resolveExternalAccess` → `bound` con `admin: true`;
   audit `designated_admin_assigned`.
8. Lane delegada, ejercitada in-process por el administrador designado:
   - `issueDelegatedExternalInvitation` → `xmi-cdbc7139…`, `issuedBy: external-admin:identity-smoke-…` (positivo);
   - auto-elevación (`designatedAdmin: true`) → `invalid_request` 422;
   - binding ajeno → `forbidden` 403;
   - `listDelegatedExternalInvitations` sobre el binding propio → 4 filas.
9. Revocación del member administrador → `designated_admin_profile_id = NULL`; audit
   `designated_admin_cleared` ✔.

Audit final del binding (además de los eventos de TASK-1631): `designated_admin_assigned 1`,
`designated_admin_cleared 1`, `invitation_delivery_failed 1`, `invitation_resent 1`,
`invitation_token_revealed 1`.

### Señales de reliability tras el apply

- Read-only previo al apply: las 9 señales del grupo `getExternalIdentityBindingSignals` leen contra PG real
  (ok/warning), ninguna en `unknown`.
- Tras el apply: **`identity.external_invitation.token_revealed` se vio encender de `ok` a `warning` (1)** —
  la señal reacciona a la fila `invitation_token_revealed` del audit, como está contratada.
- `identity.external_invitation.undelivered` en `ok`: la invitación `failed` fue rotada por la revelación y ya
  no está abierta (`issued`), por lo que sale del universo de la señal.
- `identity.external_invitation.expired_unaccepted` en `ok`.
- Efecto colateral esperado durante 24 h: `token_revealed` en `warning` y
  `identity.external_binding.unbound_dispatch_attempt` en `warning` (denegaciones del smoke).

## Verificación local

| Gate | Resultado |
| --- | --- |
| `pnpm test` (suite completa) | 1750 archivos / 13.784 tests ✔, 0 fallidos |
| `pnpm typecheck` | exit 0 (con el `db.d.ts` regenerado) |
| `pnpm local:check` | exit 0 |
| `pnpm build` (producción) | **✔ (build de producción exit 0, 79 s)**; su resultado lo registra la sesión principal en Handoff/task |

## Límites — lo que NO se verificó

- **Ningún correo real fue enviado.** No existe binding externo (sólo `xob-139e…` interno) y el smoke emite con
  `delivery: 'manual'`. La plantilla `external_access_invitation`, el remitente Efeonce en Resend y el camino
  `/i/<token>` → aceptar → `linked` → magic link → sesión con una persona real siguen sin ejercitarse.
- **Flags NOT SET** en Vercel Production y staging: `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` y
  `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` quedan en default OFF (decisión: no prender sin un binding
  externo y una casilla controlada con la que verificar el correo). Con la lane delegada OFF, la ruta ecosystem
  responde 404.
- **Rebote real no forzado**: el consumer `external_invitation_delivery_bounced` (ops-worker) se probó por tests con
  mocks y el estado `bounced` sólo por el writer `recordExternalInvitationDeliveryOutcome`; no hubo rebote de Resend
  en vivo.
- **Federación de la lane delegada en el gateway (`efeonce-mcp`) pendiente** (`TASK-1831`/`TASK-1832`): los 4
  negativos y el positivo de arriba corrieron in-process contra los commands, no a través del gateway con
  `(environment, subject)`.
- **Consentimiento con host visible sin captura GVC** en runtime desplegado (el auth-server aún no se redeploya
  con `189148c6e`).
- **Sin deploy**: nada de esto está en staging ni en producción; los commits siguen locales.
- **Primera persona externa real** pendiente de la decisión del operador (organización cliente elegible + persona);
  es la misma decisión que bloquea el carril de tokens de `TASK-1830`.

## Próximos pasos

1. Push a `develop` → deploy staging (Vercel) + CI; auth-server y ops-worker se redeployan por sus workflows.
2. Deploy con flags OFF + smoke read-only verde (comportamiento previo intacto).
3. Operador designa organización cliente y persona/casilla controlada → prender
   `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` en staging → emitir → correo real → `/i/<token>` → aceptar →
   `linked` → magic link → sesión. Verificar dominio remitente Efeonce en Resend.
4. Rebote forzado → `delivery_status='bounced'` + señal `undelivered` encendida (ok→warning).
5. Federar la lane delegada en `efeonce-mcp` y repetir los 4 negativos desde el gateway (`TASK-1831`/`TASK-1832`).
6. Captura GVC del consentimiento con host visible sobre el auth-server desplegado.
7. Producción con 24 h de observación; primera persona externa real → nueva evidencia en `docs/audits/` →
   `TASK-1830`/`TASK-1832`.

## Referencias

- Invariantes: `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
  §"Entrega gobernada de la invitación externa y autoridad delegada (TASK-1837)".
- Señales: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (delta 2026-09-06).
- ADR: `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (delta 2026-09-06).
- Estado de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (filas `EXTERNAL_INVITATION_*`).
- Manual: `docs/manual-de-uso/identity/operar-binding-identidad-externa.md` §8.
- Evidencia previa del epic: `docs/audits/2026-09-04-epic-044-auth-rollout.md`.
