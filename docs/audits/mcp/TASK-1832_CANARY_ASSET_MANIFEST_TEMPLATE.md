# TASK-1832 — template de manifiesto de assets canary

Copiar este archivo a `TASK-1832_CANARY_ASSET_MANIFEST_<run_id>.md` **antes del primer write** de una corrida.
El documento registra los identificadores necesarios para revocar y eliminar el fixture sin buscar por nombre,
correo o fecha. No incluir tokens, códigos, cookies, secretos, hashes de sesión/token ni correos completos.

## Identidad de la corrida

- `run_id`: `PENDIENTE`
- `canary_registration_id`: `PENDIENTE`
- `environment`: `PENDIENTE`
- `state`: `planned | provisioned | revoked | deletion_ready | deleted | blocked`
- `created_at`: `PENDIENTE`
- `created_by`: `PENDIENTE`
- `reason`: `TASK-1832 external MCP compatibility certification`
- `expires_at`: `PENDIENTE`
- `delete_after`: `PENDIENTE`
- `cleanup_approved_by`: `PENDIENTE`

## Organización efímera

- `organization_id`: `PENDIENTE`
- `public_id`: `PENDIENTE`
- `organization_name`: `PENDIENTE` — formato no humano y determinista, con `TASK-1832` + `run_id`
- `active`: `false`
- `status`: `inactive`
- `organization_type`: `other`
- `lifecycle_stage`: `disqualified`
- `tax_id`: `null`
- `hubspot_company_id`: `null`
- `commercial_data_expected`: `false`
- `organization_lifecycle_history_expected`: `0`

La creación debe abortar si no puede sostener estos valores o si genera historia comercial. No se reutiliza una
organización existente. En particular, `EO-ORG-0050` no es elegible porque ya tiene commercial party e historia
de lifecycle append-only.

## Inventario exacto

Una fila por asset. Los identificadores son IDs públicos/primarios no secretos. `shared` significa que la corrida
lo usa pero nunca lo elimina; `run_owned` significa que el command puede retirarlo sólo mediante este registro.

| Sistema/tabla                                    | ID exacto                                   | Ownership        | Relación con la corrida  | Estado            | Acción de retiro      | Readback                            |
| ------------------------------------------------ | ------------------------------------------- | ---------------- | ------------------------ | ----------------- | --------------------- | ----------------------------------- | ----------- |
| `greenhouse_core.organizations`                  | `PENDIENTE`                                 | `run_owned`      | organización canary      | `planned`         | hard delete al final  | `PENDIENTE`                         |
| `greenhouse_core.organization_lifecycle_history` | `conteo esperado: 0`                        | `forbidden`      | bloqueo de borrado       | `planned`         | nunca crear/borrar    | `PENDIENTE`                         |
| `greenhouse_core.external_canary_registrations`  | `PENDIENTE`                                 | `run_owned`      | raíz del fixture         | `planned`         | revocar y eliminar    | `PENDIENTE`                         |
| `greenhouse_core.external_identity_environments` | `PENDIENTE`                                 | `shared          | run_owned`               | issuer externo    | `planned`             | conservar salvo ownership exclusivo | `PENDIENTE` |
| `greenhouse_core.external_organization_bindings` | `PENDIENTE`                                 | `run_owned`      | binding purpose canary   | `planned`         | revocar y eliminar    | `PENDIENTE`                         |
| `greenhouse_core.external_capability_grants`     | `PENDIENTE`                                 | `run_owned`      | capability read-only     | `planned`         | revocar y eliminar    | `PENDIENTE`                         |
| `greenhouse_core.external_member_invitations`    | `PENDIENTE`                                 | `run_owned`      | alta sintética           | `planned`         | revocar y eliminar    | `PENDIENTE`                         |
| `greenhouse_core.identity_profiles`              | `PENDIENTE`                                 | `run_owned`      | persona `smoke_test`     | `planned`         | desactivar y eliminar | `PENDIENTE`                         |
| `greenhouse_core.identity_profile_source_links`  | `PENDIENTE`                                 | `run_owned`      | identidad login          | `planned`         | desactivar y eliminar | `PENDIENTE`                         |
| `greenhouse_auth.oauth_clients`                  | `PENDIENTE`                                 | `shared          | run_owned`               | cliente de prueba | `planned`             | retirar; eliminar sólo si exclusivo | `PENDIENTE` |
| `greenhouse_auth.authorization_contexts`         | `PENDIENTE`                                 | `run_owned`      | contexto server-selected | `planned`         | revocar y eliminar    | `PENDIENTE`                         |
| `greenhouse_auth.client_consents`                | `PENDIENTE`                                 | `run_owned`      | consentimiento           | `planned`         | revocar y eliminar    | `PENDIENTE`                         |
| `greenhouse_auth.authorization_codes`            | `conteo; sin hash`                          | `run_owned`      | code PKCE                | `planned`         | expirar/eliminar      | `PENDIENTE`                         |
| `greenhouse_auth.refresh_tokens`                 | `conteo; sin hash`                          | `run_owned`      | familia refresh          | `planned`         | revocar/eliminar      | `PENDIENTE`                         |
| `greenhouse_auth.access_tokens`                  | `conteo; sin jti`                           | `run_owned`      | access tokens            | `planned`         | revocar/eliminar      | `PENDIENTE`                         |
| sesiones/evidencia upstream                      | `conteo; sin hash`                          | `run_owned       | shared`                  | autenticación     | `planned`             | cerrar; proteger sesión compartida  | `PENDIENTE` |
| audit append-only identidad/OAuth                | `rango temporal + correlation_id redactado` | `retained_audit` | evidencia                | `planned`         | conservar sin FK      | `PENDIENTE`                         |

Agregar cualquier asset descubierto antes de continuar. Un asset no inventariado deja el manifiesto en
`blocked`; nunca se corrige omitiéndolo del readback.

## Preflight de eliminación

- [ ] Gates canary OFF o registro revocado; no existe dispatch autorizado.
- [ ] Binding, grants, invitations, consents, authorization contexts y familias de token están revocados.
- [ ] Terminó la ventana de observación o existe aprobación explícita para retiro anticipado.
- [ ] `organization_lifecycle_history = 0`.
- [ ] Spaces, memberships, client users, CRM, HubSpot, clientes, contratos, deals, quotes, ingresos y assets de
      marca = `0`.
- [ ] El catálogo PostgreSQL fue consultado en el momento del cleanup; todas las FKs tienen conteo `0` o una
      regla explícita `run_owned` en la allowlist del command.
- [ ] `unexpected_refs = 0` y `shared_asset_delete_attempts = 0`.
- [ ] Audit retenido no tiene FK hacia la organización, registro, binding o perfiles que se eliminarán.

## Ejecución del retiro

El wrapper sólo invoca el command server-side; no contiene SQL ni borra por nombre/correo.

```text
pnpm identity:external-canary:readback
pnpm identity:external-canary:cleanup -- --registration <id> --reason "TASK-1832 inspección de retiro"
pnpm identity:external-canary:cleanup -- --registration <id> --reason "TASK-1832 retiro aprobado" --apply --confirm-registration <mismo-id>
pnpm identity:external-canary:readback
```

El primer y el último comando son readbacks agregados de sólo lectura. El primer cleanup es dry-run por defecto;
el segundo sólo puede aplicar con el perfil DB migrator y exige que la confirmación coincida byte por byte con
el registro. El endpoint admin de cleanup no tiene autoridad para hard delete bajo el rol runtime.

- `dry_run_at`: `PENDIENTE`
- `dry_run_result`: `PENDIENTE`
- `apply_at`: `PENDIENTE`
- `apply_actor`: `PENDIENTE`
- `apply_result`: `PENDIENTE`
- `refusal_reason`: `PENDIENTE`

Orden lógico: cortar emisión/dispatch → revocar sesiones/tokens/consents/contextos → revocar invitaciones y
grants → revocar binding/registro → retirar source links/profiles run-owned → eliminar relaciones operativas
run-owned → eliminar organización. Los assets `shared` y el audit append-only nunca se eliminan.

## Readback final

- [ ] `organizations`: `0` para `organization_id` exacto.
- [ ] `external_canary_registrations`: `0` operativo para `canary_registration_id` exacto.
- [ ] Bindings, grants, invitations, profiles, links, contextos, consents, codes y tokens run-owned: `0`.
- [ ] Person 360, Account 360, CRM y métricas comerciales: `0` resultados.
- [ ] Intento con token previo: denegado.
- [ ] Audit redactado: presente y consultable, sin secretos ni FK bloqueante.
- [ ] `state`: `deleted` sólo después de todos los readbacks anteriores.

## Excepciones y bloqueo

Si aparece una FK no inventariada, historia de lifecycle, un dato comercial o un asset compartido, el command
debe detenerse sin mutar y registrar `state=blocked`, tabla, conteo y owner. Resolver la dependencia mediante su
command dueño; nunca desactivar constraints, triggers append-only ni borrar evidencia para forzar el cleanup.
