# Plan — TASK-1629 Globe Admin CLI con OAuth PKCE y fondeo gobernado

## Discovery summary

- TASK-1566 cerró correctamente el command y la transacción, pero no entregó el consumer CLI declarado.
- Las rutas `/api/admin/globe/credit-funding/{propose,confirm}` dependen de NextAuth y no aceptan bearer app.
- `agent-session` permite seleccionar email y acuña una cookie; es E2E-only y no es autoridad humana durable.
- API Platform `app` ya tiene bearer, rehidratación de permisos, logs y rate limits.
- El broker sister-platform ya tiene Authorization Code, PKCE S256, state, TTL, one-time/replay, tokens opacos,
  revocación y audit. El único gap auth es que todo cliente requiere un consumer secret.
- ADR-015 gobierna la atribución autenticada y la separación Greenhouse/Globe; requiere delta append-only para
  formalizar el cliente público instalado y la excepción RFC 8252 de puerto loopback.
- El operador autorizó integrar el trabajo preservado en `develop` mediante PR, sin promoverlo a `main` ni
  ejecutar nuevas mutaciones de runtime.

## Solution quality assessment

La causa raíz es la ausencia de una credencial autenticada delegada para herramientas locales. Se extiende el broker
canónico; no se copian cookies, no se usa `agent-session`, no se agrega API key admin y no se duplica el fondeo.

## Access model

- `routeGroups`: sin cambio.
- `views` / `authorizedViews`: sin cambio; no hay UI nueva.
- `entitlements`: se reusan `platform.globe_credit_funding.propose|confirm` y se evalúan sobre el usuario OAuth.
- `startup policy`: sin cambio.
- Decisión: bearer prueba sesión; entitlement prueba autoridad; auth provenance selecciona política humana/agente.

## Architecture decision

- ADR existente: ADR-015, administración Globe desde Greenhouse.
- Delta requerido: public client PKCE y loopback `127.0.0.1` con puerto efímero, sin wildcard semántico.
- Status: delta append-only sobre ADR Accepted; no cambia la autoridad financiera ni la topología Greenhouse→Globe.

## Backend/data contract

- Source of truth: `sister_platform_oauth_clients.client_type` y stores OAuth existentes.
- Contract: authorize + token exchange; API Platform app routes adaptan el funding broker.
- Invariants: confidential exige secret; public rechaza secret y exige PKCE; loopback canónico sólo
  127.0.0.1/path exacto (el alias `localhost` medido en Vercel se resuelve antes de emitir el código);
  sesión agente confirma sólo en workspace delegado y bajo límites; idempotency distinta por fase.
- Migration: aditiva, default `confidential`, sin backfill mutante.
- Rollback: suspender public client y retirar routes/CLI; clientes existentes permanecen intactos.
- Evidence: tests negativos, migration readback, OAuth real, fondeo real y readback correlacionado.

## Skills

- `greenhouse-globe`: command, rollout y criterio UI final.
- `software-architect-2026`: frontera OAuth/API y disyunción de identidades.
- `greenhouse-task-planner`: registro TASK-1629.
- `greenhouse-agent`: implementación backend/TypeScript y routes.
- `greenhouse-secret-hygiene`: tokens, logs, env y registro del cliente.
- `greenhouse-qa-release-auditor`: verificación final.
- `greenhouse-documentation-governor`: cierre documental.
- `greenhouse-production-release`: despliegue gobernado.

## Estrategia de integración

Ejecución secuencial por el agente principal. No se usan subagentes ni worktrees aislados. La rama se construye
sin cambiar el checkout compartido y conserva las migraciones ya aplicadas con sus nombres históricos
`task-1616-*`; la task vigente es `TASK-1629`.

## Execution order

1. Registrar task/plan/ADR delta y baseline.
2. Slice 1: migration + OAuth public client + tests.
3. Slice 2: gate de delegación + routes API Platform.
4. Slice 3: CLI PKCE loopback y tests.
5. Integración local, lint/typecheck/test/build proporcional.
6. Aplicar migration/registrar client/deploy staging.
7. Autorizar en Chrome, fondear y verificar readback.
8. Continuar TASK-1614/R2V hasta promoción y asset UI retenido.
9. QA, docs, commits y limpieza de snapshots temporales; lifecycle queda abierto hasta integrar el PR.

## Files to create

- migrations históricas `task-1616-*` (no renombrar: ya fueron aplicadas)
- routes `src/app/api/platform/app/globe/credit-funding/**`
- `scripts/globe-credit-funding.mjs`
- tests focales

## Files to modify

- `src/lib/sister-platforms/oauth-broker.ts` — client type y redirect loopback.
- token route — secret condicional por client type.
- funding confirm/auth helper — provenance autenticada y límites.
- `package.json` — entrypoint CLI.
- ADR-015/manual/skill/task/handoff/changelog — contrato y operación.

## Files to delete

- Ninguno.

## Risk flags

- Auth y finanzas: backend-critical; pruebas negativas y staging real obligatorios.
- El authorize endpoint auto-emite code después de sesión; state/PKCE/redirect son load-bearing.
- No persistir access token en disco ni imprimirlo.
- No tocar el checkout UI de Claude ni el repo Globe compartido.

## Open questions

- Ninguna bloqueante. Refresh tokens quedan fuera; cada corrida autoriza de nuevo usando la sesión Chrome viva.
