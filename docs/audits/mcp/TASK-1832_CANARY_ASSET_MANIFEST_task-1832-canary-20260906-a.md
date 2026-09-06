# TASK-1832 — manifiesto de assets canary `task-1832-canary-20260906-a`

Este manifiesto se creó y versionó antes del primer write. Registra sólo identificadores operativos no secretos;
no contiene correos completos, tokens, códigos, cookies, verifiers, hashes de sesión/token ni secretos.

## Identidad de la corrida

- `run_id`: `task-1832-canary-20260906-a`
- `canary_registration_id`: `xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09`
- `environment`: `efeonce-auth` — asset compartido, nunca eliminar
- `state`: `planned`
- `created_at`: `2026-09-06T19:43:30Z`
- `created_by`: `jreye` mediante sesión admin gobernada
- `reason`: `TASK-1832 external MCP compatibility certification`
- `expires_at`: `2026-09-14T19:43:30Z`
- `delete_after`: `2026-09-13T19:43:30Z`, después de siete días steady y readback
- `cleanup_approved_by`: `operador, autorización de rollout 2026-09-06`; apply condicionado a preflight verde

## Organización efímera

- `organization_id`: `org-602d7057-7fd5-47e7-b73b-21892e3f06e7`
- `public_id`: `EO-CANARY-d3bbbff7-0f75-40a2-bc1b-93a2b91e8ca2`
- `organization_name`: `TASK-1832 canary task-1832-canary-20260906-a`
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
| `greenhouse_core.organizations` | `org-602d7057-7fd5-47e7-b73b-21892e3f06e7` | `run_owned` | `planned` | hard delete final | `0 antes del write` |
| `greenhouse_core.organization_lifecycle_history` | organización exacta; conteo esperado `0` | `forbidden` | `planned` | nunca crear/borrar | `0 antes del write` |
| `greenhouse_core.external_canary_registrations` | `xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_core.external_identity_environments` | `efeonce-auth` | `shared` | `active preexistente` | conservar | `verificación pendiente` |
| `greenhouse_core.external_organization_bindings` | `PENDIENTE DE COMMAND` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_core.external_capability_grants` | `PENDIENTE DE COMMAND`; sólo `growth.seo.observation.read` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_core.external_member_invitations` | `PENDIENTE DE COMMAND` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_core.identity_profiles` | `PENDIENTE DE ACCEPT`; sólo `smoke_test` | `run_owned` | `planned` | desactivar y eliminar | `0 antes del write` |
| `greenhouse_core.identity_profile_source_links` | `PENDIENTE DE ACCEPT` | `run_owned` | `planned` | desactivar y eliminar | `0 antes del write` |
| `greenhouse_auth.oauth_clients` | DCR de esta corrida; `PENDIENTE DE DCR` | `run_owned` | `planned` | retirar; eliminar si exclusivo | `0 antes del write` |
| `greenhouse_auth.authorization_contexts` | cliente + organización exactos; `PENDIENTE` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_auth.client_consents` | cliente + perfil canary; `PENDIENTE` | `run_owned` | `planned` | revocar y eliminar | `0 antes del write` |
| `greenhouse_auth.authorization_codes` | corrida exacta; conteo sin hash | `run_owned` | `planned` | expirar/eliminar | `0 antes del write` |
| `greenhouse_auth.refresh_tokens` | familia de esta corrida; conteo sin hash | `run_owned` | `planned` | revocar/eliminar | `0 antes del write` |
| `greenhouse_auth.access_tokens` | familia de esta corrida; conteo sin `jti` | `run_owned` | `planned` | revocar/eliminar | `0 antes del write` |
| sesiones del emisor | perfiles canary; conteo sin hash | `run_owned` | `planned` | cerrar | `0 antes del write` |
| buzón M365 controlado | alias/ID redactado; `PENDIENTE` | `shared` | `planned` | retirar alias si se crea | `no almacenar correo completo` |
| buzón Google controlado | alias/ID redactado; `PENDIENTE` | `shared` | `planned` | retirar alias si se crea | `no almacenar correo completo` |
| audit append-only identidad/OAuth | `run_id` + rango temporal | `retained_audit` | `planned` | conservar sin FK | `PENDIENTE` |

## Preflight y retiro

- [x] Schema aplicado y baseline agregado limpio: registry/bindings canary `0`, purpose drift `0`, Person 360 `0`.
- [x] Gateway compatible desplegado con gate canary `false`: SHA `8438c5fa87ed`, rev `00041-7dq`.
- [x] Auth-server compatible desplegado con gate canary `false`: SHA `dbeaef62de54`, rev `00034-85c`.
- [x] Vercel staging compatible y `READY`: `dpl_CqFcRkQCqJYa2aShQRYabqCV29h2`.
- [ ] Greenhouse promovido a `main` y Vercel Production `READY`.
- [ ] Buzones controlados verificados y profiles `smoke_test` creados sin colisión.
- [ ] Gates coordinados ON; revisión y comportamiento real verificados.
- [ ] Matriz, negativas, refresh y revocación completados.
- [ ] Cleanup dry-run: `deletionReady=true`, `unexpectedRefs=0`, sin blockers/shared delete attempts.
- [ ] Siete días steady o aprobación explícita de retiro anticipado.
- [ ] Cleanup apply y readback cero de todos los IDs exactos.

## Registro de retiro

- `dry_run_at`: `PENDIENTE`
- `dry_run_result`: `PENDIENTE`
- `apply_at`: `PENDIENTE`
- `apply_actor`: `PENDIENTE`
- `apply_result`: `PENDIENTE`
- `refusal_reason`: `PENDIENTE`

El estado `deleted` se usa únicamente después de releer cero en organización, registro, binding, grants,
invitaciones, perfiles, links, contextos, consents, codes, tokens y sesiones, con Person/Account 360 y
superficies comerciales en cero. El audit redactado se conserva.
