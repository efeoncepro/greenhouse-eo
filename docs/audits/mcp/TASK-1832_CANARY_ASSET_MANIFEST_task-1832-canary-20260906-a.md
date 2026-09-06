# TASK-1832 — manifiesto de assets canary `task-1832-canary-20260906-a`

Este manifiesto se creó y versionó antes del primer write. Registra sólo identificadores operativos no secretos;
no contiene correos completos, tokens, códigos, cookies, verifiers, hashes de sesión/token ni secretos.

## Identidad de la corrida

- `run_id`: `task-1832-canary-20260906-a`
- `canary_registration_id`: `xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09`
- `environment`: `efeonce-auth` — asset compartido, nunca eliminar
- `state`: `browser_certified`; autoridad canary todavía activa para la matriz OAuth/MCP
- `created_at`: `2026-09-06T19:43:30Z`
- `created_by`: `jreye` mediante sesión admin gobernada
- `reason`: `TASK-1832 external MCP compatibility certification`
- `expires_at`: `2026-09-14T19:43:30Z`
- `delete_after`: `2026-09-13T19:43:30Z`, después de siete días steady y readback
- `cleanup_approved_by`: `operador, autorización de rollout 2026-09-06`; apply condicionado a preflight verde

## Organización efímera

- `organization_id`: `org-602d7057-7fd5-47e7-b73b-21892e3f06e7`
- `public_id`: `EO-CANARY-d3bbbff7-0f75-40a2-bc1b-93a2b91e8ca2`
- `organization_name`: `Efeonce MCP Canary — task-1832-canary-20260906-a`
- `external_organization_ref`: `task-1832:task-1832-canary-20260906-a`
- `active`: `false`
- `status`: `inactive`
- `organization_type`: `other`
- `lifecycle_stage`: `disqualified`
- `tax_id`: `null`
- `hubspot_company_id`: `null`
- `commercial_data_expected`: `false`
- `organization_lifecycle_history_expected`: `0`

La organización es nueva y dedicada. No reutiliza `EO-ORG-0050`, Efeonce ni una party cliente/prospecto.

## Inventario exacto

`PENDIENTE DE COMMAND` sólo se permite para un ID que todavía no existe; se reemplaza inmediatamente después de
que el command gobernado lo devuelva. Un asset no previsto deja la corrida `blocked`.

| Sistema/tabla | ID exacto o selector run-owned | Ownership | Estado | Retiro | Readback |
| --- | --- | --- | --- | --- | --- |
| `greenhouse_core.organizations` | `org-602d7057-7fd5-47e7-b73b-21892e3f06e7` | `run_owned` | `provisioned` | hard delete final | postura no comercial; FKs inesperadas `0` |
| `greenhouse_core.organization_lifecycle_history` | organización exacta; conteo esperado `0` | `forbidden` | `absent` | nunca crear/borrar | `0` en censo 2026-09-06T19:54Z |
| `greenhouse_core.external_canary_registrations` | `xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09` | `run_owned` | `active` | revocar y eliminar | creado 2026-09-06T19:53:50Z; expira 2026-09-14T19:43:30Z |
| `greenhouse_core.external_identity_environments` | `efeonce-auth` | `shared` | `active preexistente` | conservar | `verificación pendiente` |
| `greenhouse_core.external_organization_bindings` | `xob-cd920afa-b667-47b7-8293-3c60e3b83630` | `run_owned` | `active`, purpose `canary`, gv `2` | revocar y eliminar | creado 2026-09-06T19:53:56Z; designated admin `null`; gv subió al crear el grant personal |
| `greenhouse_core.external_capability_grants` | `xcg-4e5b6ad7-cb61-4017-bebe-342d92e2d276`; sólo `growth.seo.observation.read` | `run_owned` | `active`, personal | revocar y eliminar | creado 2026-09-06T20:20:11Z para el profile exacto; actor y audit presentes |
| `greenhouse_core.external_member_invitations` | `xmi-697bc1d8-7ea9-4844-a724-a2b381ca6190` | `run_owned` | `revoked`, preparación M365 descartada | eliminar | correo entregado; revocada 2026-09-06T20:02:54Z antes de aceptar |
| `greenhouse_core.external_member_invitations` | `xmi-b7cfc54e-ba90-402d-8eeb-bea047ea6da5` | `run_owned` | `linked`, M365 definitivo | revocar y eliminar | alias `m***@efeoncepro.com`; proveedor `delivered` 2026-09-06T20:03:02Z; aceptación scanner-safe por POST 2026-09-06T20:15:37Z |
| `greenhouse_core.identity_profiles` | `identity-external-idp-efeonce-auth-subject-s-hgu2lxgqznnz2zl8-p6pwro-petyd`; public ID `EO-ID0651` | `run_owned` | `active`, `external_contact`, `data_origin=smoke_test` | desactivar y eliminar | creado por aceptación 2026-09-06T20:15:37Z; agregado global smoke `31`; Person 360 `0` |
| `greenhouse_core.identity_profile_source_links` | `identity-link-identity-external-idp-efeonce-auth-subject-s-hgu2lxgqznnz2zl8-p6pwro-petyd-external-idp-efeonce-auth-subject-s-hgu2lxgqznnz2zl8-p6pwro-petyd` | `run_owned` | `active`, login identity | desactivar y eliminar | creado por aceptación 2026-09-06T20:15:37Z; environment `efeonce-auth` |
| `greenhouse_auth.oauth_clients` | DCR de esta corrida; selector exacto `metadata_json.dcr.software_id=run_id`; ID `PENDIENTE DE DCR` | `run_owned` | `planned` | retirar después de hijos; eliminar sólo si el selector y todos sus artefactos son exclusivos | `0 antes del write`; helper exige `--run-id` |
| `greenhouse_auth.authorization_contexts` | cliente + organización exactos; `PENDIENTE` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_auth.client_consents` | cliente + perfil canary; `PENDIENTE` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_auth.authorization_codes` | corrida exacta; conteo sin hash | `run_owned` | `planned` | expirar/eliminar | `0 antes del write` |
| `greenhouse_auth.refresh_tokens` | familia de esta corrida; conteo sin hash | `run_owned` | `planned` | revocar/eliminar | `0 antes del write` |
| `greenhouse_auth.access_tokens` | familia de esta corrida; conteo sin `jti` | `run_owned` | `planned` | revocar/eliminar | `0 antes del write` |
| `greenhouse_auth.sessions` | environment + subject del source link exacto; conteo sin hash | `run_owned` | `8`, todas revocadas/cerradas | eliminar antes del source link | Chrome y Safari cerraron sesión; activas `0` a 2026-09-06T21:16Z |
| `greenhouse_auth.magic_link_tokens` | environment + subject exactos; conteo sin token/hash | `run_owned` | `6`, consumidos o vencibles | eliminar antes del source link | incluye bootstrap de certificación; ninguno se persiste en evidencia |
| `greenhouse_auth.passkey_credentials` | environment + subject exactos; IDs nunca documentados | `run_owned` | `2`: una revocada tras intento incompleto y una activa para la ventana canary | revocar y eliminar antes del source link | credencial activa fingerprint `89864e99148e470e`; attachment `platform`; transports `hybrid,internal` |
| `greenhouse_auth.passkey_challenges` | subject o `correlation_id=run_id`; conteo sin challenge/hash | `run_owned` | `5`, consumidos | eliminar antes del source link | registro, login y step-up reales ejercitados |
| perfil local de Chrome | `.auth/passkey-task-1832-canary-20260906-a` | `run_owned_local` | activo durante la ventana canary | borrar sólo después de revocar/eliminar la credencial servidor | permisos `0700`; ignorado por Git |
| buzón M365 controlado | alias preexistente `m***@efeoncepro.com` | `shared` | `delivery verified` | conservar; no se creó alias | accesible como buzón compartido desde la cuenta del operador; mensaje visible 2026-09-06T20:03Z |
| `greenhouse_notifications.email_deliveries` | `2108c319-c433-4c82-90e0-e5304b6fde5c` | `retained_audit` | `delivered`, `auth_server_magic_link` | conservar sin PII en este manifest | enviado y entregado 2026-09-06T20:44:46Z; sin bounce/error; consumido en Chrome 2026-09-06T20:49:06Z |
| buzón Google controlado | alias/ID redactado; `PENDIENTE` | `shared` | `planned` | retirar alias si se crea | `no almacenar correo completo` |
| audit append-only identidad/OAuth | `run_id` + rango temporal | `retained_audit` | `planned` | conservar sin FK | `PENDIENTE` |

## Preflight y retiro

- [x] Schema aplicado y baseline agregado limpio: registry/bindings canary `0`, purpose drift `0`, Person 360 `0`.
- [x] Gateway compatible desplegado con gate canary `false`: SHA `8438c5fa87ed`, rev `00041-7dq`.
- [x] Auth-server compatible desplegado con gate canary `false`: SHA `dbeaef62de54`, rev `00034-85c`.
- [x] Vercel staging compatible y `READY`: `dpl_CqFcRkQCqJYa2aShQRYabqCV29h2`.
- [x] Registry + organización + binding creados por commands; aggregate readback `1/1`, purpose drift `0/0` y
      `smoke_in_person_360=0` a 2026-09-06T19:54:31Z.
- [x] Censo dinámico post-provisioning: `unexpectedRefs=0`; sólo registro/binding esperados. El dry-run se negó
      correctamente por `registration_active` + `active_authority`, sin mutar.
- [x] Buzón M365 definitivo elegido por el operador: cero colisión de profile, invitación emitida al alias
      preexistente, webhook `delivered` y mensaje visible. La invitación plus-address preparatoria se revocó antes
      de aceptar y queda inventariada para cleanup.
- [x] Magic link M365 consumido con POST scanner-safe en Chrome; sesión `amr=magic_link` persistida y luego
      revocada. Evidencia de entrega exacta: `2108c319-c433-4c82-90e0-e5304b6fde5c`.
- [x] Passkey de plataforma real registrada en Chrome, visible por el reader, usada para login descubrible y
      para step-up UV explícito sobre la misma sesión. `loginAuthLevel=primary` es el contrato esperado del login
      normal; el step-up dejó `amr=passkey,uv` y `step_up_at` real. Logout con sesiones activas `0`. Evidencia
      redactada local: `.captures/task-1832-passkey-2026-09-06T21-14-29Z/summary.json`.
- [x] Safari reutilizó la misma passkey descubrible en `https://auth.efeonce.org/login`, abrió sesión real
      `amr=passkey` a 2026-09-06T21:15:57Z y mostró la terminal de sesión; logout desde la UI dejó la fila
      revocada con razón `logout` y sesiones activas `0`.
- [x] Cleanup dry-run ampliado a auth/OAuth: `unexpectedRefs=0`; inventaría `8` sesiones, `6` magic links,
      `2` credenciales passkey y `5` challenges. El único `active_auth` es la credencial activa que se conserva
      deliberadamente durante la matriz; el plan se niega por `registration_active`, `active_authority` y
      `active_auth`, sin mutar.
- [ ] Greenhouse promovido a `main` y Vercel Production `READY`.
- [ ] Buzones controlados verificados y profiles `smoke_test` creados sin colisión — M365 completo y profile
      exacto creado; Google todavía pendiente y no se sustituirá por Gmail personal.
- [ ] Gates coordinados ON; revisión y comportamiento real verificados.
- [ ] Matriz, negativas, refresh y revocación completados.
- [ ] Cleanup dry-run: `deletionReady=true`, `unexpectedRefs=0`, sin blockers/shared delete attempts.
- [ ] Siete días steady o aprobación explícita de retiro anticipado.
- [ ] Cleanup apply y readback cero de todos los IDs exactos.

## Registro de retiro

- `dry_run_at`: `2026-09-06T21:16Z`, inspección post-browser; no es el preflight final de borrado
- `dry_run_result`: `deletionReady=false`, `unexpectedRefs=0`, blockers esperados
  `registration_active|active_authority|active_auth`; sin intento de apply
- `apply_at`: `PENDIENTE`
- `apply_actor`: `PENDIENTE`
- `apply_result`: `PENDIENTE`
- `refusal_reason`: `PENDIENTE`

El estado `deleted` se usa únicamente después de releer cero en organización, registro, binding, grants,
invitaciones, perfiles, links, contextos, consents, codes, tokens y sesiones, con Person/Account 360 y
superficies comerciales en cero. El audit redactado se conserva.
