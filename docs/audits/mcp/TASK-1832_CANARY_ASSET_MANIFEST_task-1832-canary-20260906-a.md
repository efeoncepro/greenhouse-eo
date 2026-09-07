# TASK-1832 — manifiesto de assets canary `task-1832-canary-20260906-a`

Este manifiesto se creó y versionó antes del primer write. Registra sólo identificadores operativos no secretos;
no contiene correos completos, tokens, códigos, cookies, verifiers, hashes de sesión/token ni secretos.

## Identidad de la corrida

- `run_id`: `task-1832-canary-20260906-a`
- `canary_registration_id`: `xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09`
- `environment`: `efeonce-auth` — asset compartido, nunca eliminar
- `state`: `production_observation_active`; helper/Codex y negativas principales certificados, Claude y
  clientes hospedados abiertos
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
| `greenhouse_core.external_organization_bindings` | `xob-cd920afa-b667-47b7-8293-3c60e3b83630` | `run_owned` | `active`, purpose `canary`, gv `6` | revocar y eliminar | designated admin `null`; gv avanzó únicamente por revoke/regrant del drill de authority |
| `greenhouse_core.external_capability_grants` | `xcg-4e5b6ad7-cb61-4017-bebe-342d92e2d276`; `xcg-8f109cf4-5a64-4151-abb3-04b6ce87bef0`; `xcg-cd62a05b-e3b2-4851-824f-285ed9358486` | `run_owned` | dos revocados; último activo y personal; los tres exclusivamente `growth.seo.observation.read` | revocar el último y eliminar los tres | el segundo fue el grant temporal del drill; deny del token previo en `19.272 s`; actor/audit presentes |
| `greenhouse_core.external_member_invitations` | `xmi-697bc1d8-7ea9-4844-a724-a2b381ca6190` | `run_owned` | `revoked`, preparación M365 descartada | eliminar | correo entregado; revocada 2026-09-06T20:02:54Z antes de aceptar |
| `greenhouse_core.external_member_invitations` | `xmi-b7cfc54e-ba90-402d-8eeb-bea047ea6da5` | `run_owned` | `linked`, M365 definitivo | revocar y eliminar | alias `m***@efeoncepro.com`; proveedor `delivered` 2026-09-06T20:03:02Z; aceptación scanner-safe por POST 2026-09-06T20:15:37Z |
| `greenhouse_core.identity_profiles` | `identity-external-idp-efeonce-auth-subject-s-hgu2lxgqznnz2zl8-p6pwro-petyd`; public ID `EO-ID0651` | `run_owned` | `active`, `external_contact`, `data_origin=smoke_test` | desactivar y eliminar | creado por aceptación 2026-09-06T20:15:37Z; agregado global smoke `31`; Person 360 `0` |
| `greenhouse_core.identity_profile_source_links` | `identity-link-identity-external-idp-efeonce-auth-subject-s-hgu2lxgqznnz2zl8-p6pwro-petyd-external-idp-efeonce-auth-subject-s-hgu2lxgqznnz2zl8-p6pwro-petyd` | `run_owned` | `active`, login identity | desactivar y eliminar | creado por aceptación 2026-09-06T20:15:37Z; environment `efeonce-auth` |
| `greenhouse_core.external_member_invitations` | `xmi-57f6a062-f880-4a4c-9fc3-59c4ebd371f9`; `xmi-1c3108fe-cfb9-491b-bdbe-cbdbf783aaa7` | `run_owned` | `revoked`, preparaciones Gmail con delivery fallido | eliminar | el proceso local no tenía `RESEND_API_KEY` montada; sin aceptación ni perfil |
| `greenhouse_core.external_member_invitations` | `xmi-0b307567-2021-4f33-b8ea-48598a34c39d` | `run_owned` | `linked`, Gmail definitivo | revocar y eliminar | alias plus del buzón personal autorizado; aceptación scanner-safe por POST 2026-09-06T21:39:23Z |
| `greenhouse_core.identity_profiles` | `identity-external-idp-efeonce-auth-subject-ndbbfxl3ak35xuutezx-9rhdc8gskvxp`; public ID `EO-ID0652` | `run_owned` | `active`, `external_contact`, `data_origin=smoke_test` | desactivar y eliminar | creado por aceptación Gmail; Person/Account 360 y referencias compartidas `0` |
| `greenhouse_core.identity_profile_source_links` | `identity-link-identity-external-idp-efeonce-auth-subject-ndbbfxl3ak35xuutezx-9rhdc8gskvxp-external-idp-efeonce-auth-subject-ndbbfxl3ak35xuutezx-9rhdc8gskvxp` | `run_owned` | `active`, login identity | desactivar y eliminar | environment `efeonce-auth`; sesión Gmail revocada por logout |
| `greenhouse_auth.oauth_clients` | `dcr-ALdh2JDA2Xzhuc3jOUjOug`; `dcr-BUH0dB4xom-wZugb3OBQQA`; `dcr-ELRjkviZ2KxbTgYxT8RNAQ`; `dcr-ewCa7Jz0kUAnJLjgSBVSFw`; `dcr-fOOO1RuglvD_P7wWo4_6tQ`; `dcr-gQLXOM43jMpEbK_kdU7jyw`; `dcr-jkPKgzeGBIIpDkm-K2VE_A`; `dcr-KyBCYOHdxdNCdlpaFQydyQ`; `dcr-N7QUFAYRBtdCdE0e9lLLkw`; `dcr-PUG3vKJazGat7ZCy6ELAAA`; `dcr-t5589eJ6GGyqUoX5Q9fidQ`; `dcr-UObj1hqiy-IDu0D1Q4fPuQ`; `dcr-uwWiXNXjqOuAlOABetZPiA`; `dcr-Vm23fM_YY-4j5bYBdDfzFA` | `run_owned` | `14`, todos marcados `registration_kind=dcr`, `created_by=dcr` y `metadata_json.dcr.software_id=run_id`; incluye intentos fallidos, helper, Claude, Codex y diagnóstico de sesión | retirar después de hijos | dry-run 2026-09-07T00:50Z confirmó ownership exclusivo; configs locales Claude/Codex retiradas |
| `greenhouse_auth.authorization_contexts` | hijos de los DCR exactos | `run_owned` | `4`, creados por los cuatro intentos diagnósticos con sesión interna persistente | revocar y eliminar por `client_id`; conservar la sesión/identidad interna compartida | todos sus clientes están marcados con el `run_id`; organización canary referenciada `0` |
| `greenhouse_auth.client_consents` | hijos de los DCR exactos | `run_owned` | `13` | revocar y eliminar | el consentimiento válido mostró sólo organización canary y scope base; cuatro filas diagnósticas pertenecen exclusivamente a DCR run-owned |
| `greenhouse_auth.authorization_codes` | hijos de los DCR exactos; conteo sin hash | `run_owned` | `13` | expirar/eliminar | dry-run post-clientes 2026-09-07T00:50Z |
| `greenhouse_auth.refresh_tokens` | familias de los DCR exactos; conteo sin hash | `run_owned` | `18`; familias del helper revocadas | revocar/eliminar | dry-run post-clientes 2026-09-07T00:50Z |
| `greenhouse_auth.access_tokens` | familias de los DCR exactos; conteo sin `jti` | `run_owned` | `18`; tokens previos al grant revocado y familias del helper ya denegados | revocar/eliminar | dry-run post-clientes 2026-09-07T00:50Z |
| `greenhouse_auth.sessions` | environment + subjects de los dos source links exactos; conteo sin hash | `run_owned` | `12`, activas `0`; una sesión de consentimiento se reutilizó durante la matriz | revocar y eliminar antes del source link | Chrome, Safari y Gmail cerraron sesión; una sesión passkey anterior aún vigente se revocó por el store canónico después del readback |
| `greenhouse_auth.magic_link_tokens` | environment + subjects exactos; conteo sin token/hash | `run_owned` | `8`, consumidos o vencibles | eliminar antes del source link | incluye bootstrap, Gmail y reentrada M365; ningún token/hash se persiste en evidencia |
| `greenhouse_auth.passkey_credentials` | environment + subject exactos; IDs nunca documentados | `run_owned` | `2`: una revocada tras intento incompleto y una activa para la ventana canary | revocar y eliminar antes del source link | credencial activa fingerprint `89864e99148e470e`; attachment `platform`; transports `hybrid,internal` |
| `greenhouse_auth.passkey_challenges` | subject o `correlation_id=run_id`; conteo sin challenge/hash | `run_owned` | `5`, consumidos | eliminar antes del source link | registro, login y step-up reales ejercitados |
| perfil local de Chrome | `.auth/passkey-task-1832-canary-20260906-a` | `run_owned_local` | activo durante la ventana canary | borrar sólo después de revocar/eliminar la credencial servidor | permisos `0700`; ignorado por Git |
| buzón M365 controlado | alias preexistente `m***@efeoncepro.com` | `shared` | `delivery verified` | conservar; no se creó alias | accesible como buzón compartido desde la cuenta del operador; mensaje visible 2026-09-06T20:03Z |
| `greenhouse_notifications.email_deliveries` | `2108c319-c433-4c82-90e0-e5304b6fde5c` | `retained_audit` | `delivered`, `auth_server_magic_link` | conservar sin PII en este manifest | enviado y entregado 2026-09-06T20:44:46Z; sin bounce/error; consumido en Chrome 2026-09-06T20:49:06Z |
| buzón Gmail personal del operador | cuenta preexistente `j***@gmail.com` | `operator_owned`, no Efeonce | `delivery_and_login_verified` | conservar; eliminar sólo artefactos canary asociados | autorizado por el operador; plus-address aislado, invitación y magic link visibles y consumidos 2026-09-06 |
| `greenhouse_notifications.email_deliveries` | `0741cdf1-4a43-4f04-9119-e4ae099a49a6`; `58d2d0f1-9214-4b92-ac34-e5e96d038196` | `retained_audit` | `failed`, `external_access_invitation` | conservar sin PII | dos intentos locales fallaron antes de montar el secreto por referencia; ningún token consumido |
| `greenhouse_notifications.email_deliveries` | `20e4396f-642c-44a7-89e4-dcc35a25b461`; `9a338ba2-74a3-4b7d-a048-56e793b9e4b4` | `retained_audit` | `delivered`, invitación + magic link Gmail | conservar sin PII | provider `delivered` a 2026-09-06T21:35:17Z y 21:39:26Z; sin bounce/error |
| `gs://efeonce-group-greenhouse-public-media-dev/emails/efeonce-wordmark-white.png` | objeto compartido de marca; 4099 bytes | `shared`, no run-owned | `active`, reparado | conservar; nunca incluir en cleanup canary | el objeto faltaba (404) y el correo mostraba imagen rota; se subió desde el asset versionado, HTTP 200 `image/png` y Gmail revalidado visualmente 2026-09-06 |
| audit append-only identidad/OAuth | `run_id` + rango temporal | `retained_audit` | `planned` | conservar sin FK | `PENDIENTE` |

## Preflight y retiro

- [x] Schema aplicado y baseline agregado limpio: registry/bindings canary `0`, purpose drift `0`, Person 360 `0`.
- [x] Gateway productivo compatible y gate canary `true`: SHA `8438c5fa87ed`, rev
      `efeonce-mcp-gateway-00044-4kj`, Ready/100 %.
- [x] Auth-server productivo compatible y gate canary `true`: SHA `fb5fc082aa92`, rev
      `auth-server-00041-ltv`, Ready/100 %.
- [x] Vercel Production sirve `fb5fc082aa92`; release
      `fb5fc082aa92-3f2c8706-24fa-452d-be8f-6feea7b8cdd9` en estado `released`.
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
- [x] Gmail autorizado: el correo base preexistente se rechazó como colisión y no produjo write; el alias plus
      dedicado quedó ligado a `EO-ID0652` con `data_origin=smoke_test`. Invitación y magic link tuvieron provider
      `delivered`, ambos se consumieron mediante confirmación POST y la sesión `amr=magic_link` quedó revocada por
      logout. El wordmark roto se corrigió en el bucket público compartido y se verificó en el mismo mensaje.
- [x] Cleanup dry-run post-Gmail: dos profiles/source links, cinco invitaciones, `9` sesiones, `7` magic links,
      `2` passkeys y `5` challenges; `unexpectedRefs=0`. Los blockers siguen siendo los tres esperados durante
      la ventana (`registration_active|active_authority|active_auth`) y no hubo mutación.
- [x] Ceremonia de expiración natural repetida sin revocar antes la familia: DCR `dcr-N7QUFAYRBtdCdE0e9lLLkw`,
      fingerprint `75eb972f8b2f1eae`, `gv=6`; después de `899 s` el access token obtuvo `401 invalid_token` y
      sólo entonces se rotó el refresh y se revocó la familia.
- [x] Guarda de población ejercitada con DCR `dcr-KyBCYOHdxdNCdlpaFQydyQ`: el consentimiento mostró la
      organización canary exacta y el helper confirmó `organizationIdMatches=true`; base-only e internal-only
      siguieron fail-closed. La sesión M365 terminó en logout y el readback posterior revocó la única sesión
      passkey anterior aún vigente; sesiones canary activas `0`.
- [x] Cleanup dry-run final de esta fase: `14` DCR marcados con el `run_id`, `13` codes/consents, `18`
      refresh/access tokens y `4` contexts client-scoped; `unexpectedRefs=0`. Los cuatro DCR usados por error
      con una sesión interna siguen siendo run-owned y el cleanup sólo elimina sus hijos por `client_id`, nunca
      la sesión ni la identidad compartida. No queda `oauth_client_not_run_owned`.
- [x] Greenhouse promovido a `main` y Vercel Production `READY`; orchestrator run `34066743296` success y
      watchdog agregado `ok` (tres señales GitHub `unknown` por ausencia del token observador).
- [x] Dos infraestructuras de correo verificadas y profiles `smoke_test` creados sin colisión — M365 corporativo
      y Gmail personal del operador autorizado. Gmail no se presenta como buzón controlado por Efeonce ni como
      evidencia comercial.
- [x] Gates coordinados ON; revisiones, SHA, reader y comportamiento real verificados.
- [ ] Matriz parcial: helper y Codex `PASS`; Claude Code 2.1.186 `FAIL` registrado en `TASK-1813` y clientes
      hospedados pendientes. Las cinco negativas, incluidos TTL natural `401 invalid_token`, refresh/familia y
      authority revocada en `19.272 s`, ya pasaron.
- [ ] Cleanup dry-run: `deletionReady=true`, `unexpectedRefs=0`, sin blockers/shared delete attempts.
- [x] Observación diaria programada en `task-1832-observaci-n-y-retiro-canary`; permanece silenciosa sin drift
      y sólo puede iniciar el retiro desde `delete_after` con todas las precondiciones verdes.
- [ ] Siete días steady o aprobación explícita de retiro anticipado.
- [ ] Cleanup apply y readback cero de todos los IDs exactos.

## Registro de retiro

- `dry_run_at`: `2026-09-07T00:50Z`, inspección post-clientes; no es el preflight final de borrado
- `dry_run_result`: `deletionReady=false`, `unexpectedRefs=0`, blockers esperados
  `registration_active|active_authority|active_auth`; 2 profiles/links, 5 invitaciones, 3 grants, 14 DCR,
  12 sesiones, 8 magic links, 2 passkeys, 5 challenges, 13 codes/consents, 18 refresh/access tokens y 4
  authorization contexts; sesiones activas `0`, `activeAuthorityCount=4`, `activeAuthCount=40`, sin intento de apply
- `apply_at`: `PENDIENTE`
- `apply_actor`: `PENDIENTE`
- `apply_result`: `PENDIENTE`
- `refusal_reason`: `PENDIENTE`

El estado `deleted` se usa únicamente después de releer cero en organización, registro, binding, grants,
invitaciones, perfiles, links, contextos, consents, codes, tokens y sesiones, con Person/Account 360 y
superficies comerciales en cero. El audit redactado se conserva.
