# TASK-1813 — Compatibilidad OAuth del MCP Efeonce con Codex y Claude

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|identity|integration|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; MCP main; checkout compartido de cada repo, sin cambiar ramas ni usar worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Corregir la interoperabilidad OAuth del gateway existente `mcp.efeonce.org`: Codex rechaza su discovery antes
de autenticar. Entregar configuración y pruebas de conexión nueva en Codex y Claude Code, con scopes mínimos,
callbacks válidos, rollout reversible y evidencia de lectura real. No construye otro broker ni habilita B2B.

## Why This Task Exists

El protected-resource anuncia al gateway como authorization server, pero su metadata devuelve el issuer de
Entra. El intento con Codex `0.152.0` falla con `OAuth authorization server issuer does not match authorization
metadata origin`. El canary existente va directo a Entra y no prueba ese discovery. Además, apagar el shim
reintroduce scopes sin cualificar y el workflow lo reactiva si la variable queda vacía.

El operador confirmó crear esta task, no implementarla. El fallo de OAuth es independiente de los commits de
la skill Berel en `main`: no se debe resolver esta task alterando la historia Git ni el trabajo de otra sesión.
Evidencia, límites y fuentes: [auditoría 2026-09-02](../../audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md).

## Goal

- Discovery coherente y autenticación soportada desde el resource canónico en ambos clientes objetivo.
- Una sesión nueva de Codex y una de Claude Code pueden listar e invocar una lectura autorizada sin gasto.
- Mantener issuer/audience/expiry/scopes, autorización downstream y escrituras fail-closed.
- Documentar la ruta operativa real y evitar que un deploy posterior restaure el defecto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Un único resource: `https://mcp.efeonce.org/mcp`; Entra continúa como issuer interno real.
- Gateway adapter-neutral, sin emitir tokens, proxear auth de negocio, duplicar identidad ni acceder a DB.
- Identidad humana y credencial workload downstream separadas; ningún scope de escritura se agrega al cliente
  público compartido para conseguir un smoke verde.
- Reabrir mediante decisión fechada el disparador de incompatibilidad del ADR del gateway antes del cutover;
  no reescribir retrospectivamente el ADR aceptado. Indexar la decisión aceptada donde corresponda.
- Skills: `efeonce-mcp-platform` + `mcp-craft`; secret hygiene/cloud para configuración; QA y documentation
  governor para verificación/cierre. La skill de Berel no concede conectividad ni permisos MCP.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`
- `../efeonce-mcp/AGENTS.md` — contrato propio, obligatorio antes de editar el runtime hermano.

## Dependencies & Impact

### Depends on

- Foundation ya existente de `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`.
  No requiere completar toda esa task; sí coordinar el overlap de auth/discovery/deploy antes de editar.
- Entra/resource y cliente público pre-registrado existentes; grants/redirects actuales requieren readback
  sanitizado al ejecutar. No se asume que el consentimiento efectivo coincida con una lista documental.
- Clientes objetivo/versiones y autorización interactiva del operador para el smoke de cada cliente.

### Blocks / Impacts

- Alta/reconexión de Codex y regresión de Claude Code; claude.ai/Desktop si se confirman como consumidores activos.
- `TASK-1631` conserva broker/CIMD/B2B/grants externos: consume el aprendizaje, no bloquea la corrección interna.
- `TASK-659` conserva auth hosted del MCP interno; no se crea otra implementación de esa foundation.
- La referencia `TASK-1654` del shim no tiene archivo/fila propios verificados: formalizar la trazabilidad hacia
  esta task, sin inventar que se completó una task inexistente.
- Trabajo concurrente de `TASK-1805` en Greenhouse y el manifiesto del gateway: no absorberlo en un deploy OAuth.

### Files owned

Ownership acotado a OAuth; los archivos compartidos requieren coordinación con sus dueños activos.

- `../efeonce-mcp/src/app.ts`
- `../efeonce-mcp/src/config.ts`
- `../efeonce-mcp/src/auth/token-verifier.ts` — preservar contrato; modificar sólo si el plan demuestra necesidad.
- `../efeonce-mcp/test/dcr-shim.test.ts` y `../efeonce-mcp/test/app.test.ts`
- `../efeonce-mcp/scripts/oauth-canary.mjs`
- `../efeonce-mcp/.github/workflows/deploy.yml`
- Tests/helpers nuevos de discovery bajo `../efeonce-mcp/test/` y `../efeonce-mcp/scripts/`, con nombres en el plan.
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` y `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/documentation/plataforma/efeonce-mcp-gateway.md`
- `docs/manual-de-uso/plataforma/operar-efeonce-mcp-gateway.md`
- `.codex/skills/efeonce-mcp-platform/SKILL.md` y `.claude/skills/efeonce-mcp-platform/SKILL.md`
- Esta task, auditoría y entradas acotadas en índices/Handoff/changelog.

La configuración local de cada cliente queda fuera de Git. Su edición, limpieza de credenciales o cambios en
Entra se presentan con diff/alcance explícito al operador; nunca se copian tokens entre clientes.

## Current Repo State

### Already exists

- Gateway local inspeccionado en `58517f00e550748e271c9b2138970d32290e0c80`; verificar SHA y WIP al tomarla.
- PRM root/path-specific, metadata AS espejada, `/register` fijo y auth antes de dispatch en `src/app.ts`.
- `test/dcr-shim.test.ts` cubre tres comportamientos del shim, pero no el fetch AS ni la igualdad de issuer.
- Canary PKCE con authorize/token construidos directamente desde Entra: prueba token/downstream, no discovery.
- Configuración `efeonce` registrada en Codex local, auth unknown tras intento fallido; ninguna tool callable
  verificada en esta sesión. El alta en config no refresca por sí sola las herramientas de una sesión abierta.

### Gap

- Mismatch observado live; scopes requestables y challenge divergen; OFF no durable en deploy.
- Falta prueba de login fresco de ambos clientes y callbacks de la versión instalada.
- No está verificado que Entra directo + pre-registro cierre todo: Codex conserva validación de metadata incluso
  con client ID. El reporte upstream #40885 requiere contraste, no se asume aplicable a `0.152.0`.
- ADR/skill afirman tolerancia general de clientes a partir de evidencia histórica; deben fechar/versionar soporte.

### Hechos verificados 2026-09-03 (código de Codex `rust-v0.152.0` + `rmcp =3.1.3`, discovery vivo, spec `2026-07-28`)

Verificados leyendo fuente y runtime, no memoria. Cambian el orden de riesgos del plan B «Entra directo»:

- **El mismatch es exactamente `AuthorizationServerMismatch` de rmcp** (`validate_authorization_metadata_issuer`): issuer
  presente y distinto → error duro; issuer ausente → tolerado porque Codex llama `set_allow_missing_issuer(true)`.
  Pre-registrar `oauth.client_id` **no lo evita**: `resolve_authorization_manager` resuelve y valida metadata igual.
- **Entra directo SÍ es descubrible por rmcp**: para issuer con path prueba 4 candidatos y el tercero
  (`/{tenant}/v2.0/.well-known/openid-configuration`) responde 200 con `issuer` idéntico; los dos de path-insertion dan 404.
- **Segundo rechazo normativo detrás del primero:** la OIDC discovery de Entra **no publica `code_challenge_methods_supported`**
  (verificado en vivo). La spec `2026-07-28` §security-considerations dice que si falta, el cliente **MUST refuse to proceed**
  (aplica a RFC 8414 y a OIDC). rmcp 3.1.3 sólo emite `warn!` y sigue, así que Codex hoy pasa; un cliente estricto no.
  El shim inyecta `["S256"]` en la metadata espejada: es una **segunda función del shim** que el ADR no documenta, y el
  «fixture conforme» de Slice 1 debe cubrir esta dimensión, no sólo el issuer.
- **Scopes bajo plan B fallan en dos pasos si no se corrige el challenge:** (1) `codex mcp login` sin `--scopes` usa los
  `scopes_supported` del PRM — hoy los **cinco cualificados, escrituras incluidas** (`efeonce.mcp.seo.write` es `type: Admin`)
  → Entra exige consentimiento admin → `OAuthProviderError` → Codex reintenta **sin scopes** (`should_retry_without_scopes`);
  (2) rmcp entonces siembra desde el `scope` del challenge 401, que en vivo es **`efeonce.mcp.read` sin cualificar** → Entra lo
  resuelve contra Graph (`AADSTS650053`). Corrección concreta: PRM `scopes_supported` = mínimo de lectura (step-up de
  escrituras por `403 insufficient_scope`, como manda `mcp-craft/security-and-auth.md`), y challenge con scope cualificado.
- **`offline_access`:** rmcp lo añade sólo si el AS lo anuncia en `scopes_supported`. Entra directo lo anuncia (refresh token
  OK); la metadata espejada del shim **no** → con el shim no hay refresh token. Verificar renovación en ambos modos.
- **Callback de Codex ≠ callbacks registrados:** Entra no anuncia `authorization_response_iss_parameter_supported` → Codex
  entra en modo `CallbackSpecific` y usa `http://127.0.0.1:<puerto>/callback/<id>` con `<id>` = SHA-256 de la URL del servidor
  (para `https://mcp.efeonce.org/mcp`: `boTaDHiFl7aq`). Registrados hoy (`az ad app show`, 2026-09-03): `http://localhost`,
  `http://localhost:8765/callback`, `https://claude.ai/api/mcp/auth_callback`. Ninguno calza. Docs Entra: el puerto se ignora
  para redirects loopback, la ruta **no**; `http://127.0.0.1` con esquema http sólo se agrega vía `replyUrlsWithType` en el
  manifest. Si el puerto se ignora también para `127.0.0.1` (no verificado) el mínimo sería `http://127.0.0.1/callback/boTaDHiFl7aq`.
  Configurar `oauth.callback_url = "http://localhost/..."` no sirve: Codex sólo inyecta el puerto del listener cuando el host
  es `127.0.0.1`.
- **Claude Code instalado: `2.1.186`.** Las docs vigentes documentan `--client-id`, `--callback-port` (redirect
  `http://localhost:PORT/callback`) y `oauth.authServerMetadataUrl` (bypass del discovery; sus `scopes_supported` sobreescriben
  los del servidor, así que con Entra directo hay que fijar `oauth.scopes`). Verificar que esa versión los soporte antes de
  contar con ellos; no extrapolar a claude.ai/Desktop.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-mcp/src/app.ts`, `src/config.ts`, auth y deploy del gateway; contratos en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: discovery OAuth del recurso MCP y verificación de token; consumers Codex/Claude, providers intactos.
- Server/browser split: validación y configuración en servidor; cliente usa PKCE, sin secretos ni SDK privilegiado en browser.
- Build impact: tests/helpers de discovery en Node del gateway; ninguna dependencia runtime nueva asumida ni build del portal requerido para arreglar OAuth.
- Extraction blocker: no se extrae runtime; cambiar issuer/broker exigiría `TASK-1631` y aprobación independiente.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: configuración Entra + discovery/config/deploy del gateway, no bases de negocio.
- Consumidores afectados: Codex CLI/app local, Claude Code y conectores Claude activos identificados.
- Runtime target: `local` para regresión; entorno previo autorizado y `production` para certificación final.

### Contract surface

- Contrato existente a respetar: PRM root/path-specific, challenges `/mcp`, validación JWT y dispatch en `../efeonce-mcp/src/app.ts`.
- Contrato nuevo o modificado: discovery coherente, scope requestable y modo de despliegue explícito; onboarding por cliente.
- Backward compatibility: `gated`; la retirada del shim puede requerir reconfiguración/relogin. No prometer transparencia.
- Full API parity: no se agrega capability de negocio; las mismas tools/readers existentes siguen siendo el contrato programático.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; sin DB, migración ni nuevas organizaciones/bindings.
- Invariantes que no se pueden romper:
  - Resource público único; issuer real, JWKS, audience Entra y expiración verificables antes del dispatch.
  - Scope requestable cualificado para Entra distinto del `scp` interno; no ampliar grants por un error de cliente.
  - Scopes mínimos de onboarding separados de catálogo de capacidades y de escrituras/gasto fail-closed.
- Write-target allowlist: no aplica; no se agrega destino de escritura de negocio.
- Tenant/space boundary: identidad verificada y policy downstream existentes; no confiar en email, tenant libre o nombre del cliente.
- Idempotency/concurrency: discovery read-only repetible; sin registro dinámico mutante; probar peticiones concurrentes
  sin contaminación por cliente. Si queda caché, contrato explícito de timeout/retry/TTL sin filtrar errores upstream.
- Audit/outbox/history: sin outbox nuevo; evidencia sanitizada por cliente/versión/etapa y request ID; sin tokens ni PII.

### Migration, backfill and rollout

- Migration posture: `none`; migración operativa de configuración de clientes, no de datos.
- Default state: acceso actual protegido; nueva ruta sólo tras ADR/plan aprobado y pruebas previas.
- Backfill plan: ninguno; no revocar consentimientos o credenciales globalmente para probar un login nuevo.
- Rollback path: revisión/configuración exactas previas del gateway + restauración acotada del cliente; sin cambiar resource.
- External coordination: operador Platform/Identity, sesiones cliente y aprobación de deploy; Entra sólo si callbacks
  u otra necesidad comprobada lo exige, con before/after y sin reemplazar arrays ajenos.

### Security and access

- Auth/access gate: Entra PKCE S256 + JWT issuer/audience/expiry/scopes; capacidades/entitlements downstream intactos.
- Sensitive data posture: nunca registrar tokens, codes, cookies, URLs OAuth con query, secrets ni payloads personales.
- Error contract: conservar 401 `invalid_token`, 403 `insufficient_scope`, 503 `oauth_not_configured` y errores sanitizados.
- Abuse/rate-limit posture: mantener límites de body/timeout/host/origin; sin bypass TLS, issuer, scopes o ingress.

### Runtime evidence

- Local checks: `pnpm check` en `efeonce-mcp`; fixtures conductuales coherente/incoherente y configuración ON/OFF.
- DB/runtime checks: sin DB; readback de revisión, modo, metadata y challenges en el hostname canónico.
- Integration checks: login nuevo → tools visibles → lectura sin gasto por cliente; negativos sin llamadas downstream.
- Reliability signals/logs: etapas discovery/registration/callback/token/tool distinguidas, status y correlación sin datos sensibles.
- Production verification sequence: el orden y stop conditions de Rollout Plan son obligatorios; canary directo no sustituye cliente real.

### Acceptance criteria additions

- [ ] Fuente, contratos y consumidores confirmados con archivos y objetos reales al ejecutar.
- [ ] Invariantes, tenant/access y concurrencia preservados mediante pruebas conductuales.
- [ ] Ninguna tabla ni write-target de negocio añadida; si se requiere, detener y replanificar.
- [ ] Postura sin backfill y rollback de configuración verificadas proporcionalmente.
- [ ] Evidencia runtime por cliente registrada separadamente de tests y del canary directo.
- [ ] Errores/auditoría sanitizados sin secretos ni datos personales en artefactos.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability`. Esta task repara discovery/issuer OAuth y configuración de deploy del gateway;
no introduce ni modifica una capability de negocio (ninguna acción nueva sobre estado, permisos, datos,
aprobaciones, exports, recoveries, reportes o configuración de dominio). Las tools/readers existentes
son el mismo contrato programático antes y después; ningún capability/entitlement nuevo se registra ni
se otorga. Si el plan aprobado terminara requiriendo una capability nueva (por ejemplo, un grant por
cliente), este gate se completa en ese momento, no aquí.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato de interoperabilidad y regresión reproducible

- Decisión fechada sobre discovery/pre-registro y matriz por cliente/producto/versión; documentar alternativas
  y el cambio de supuesto del ADR. Evaluar primero Entra directo + client ID pre-registrado, no imponerlo sin prueba.
- Harness reproducible sin secretos: fixture conforme con AS distinto del recurso y fixture mismatch rechazado.
  Distinguir fallo gateway de fallo upstream del cliente antes de escoger versión o configuración.
  El fixture «conforme» debe tener la forma real de Entra —OIDC path-append, **sin** `code_challenge_methods_supported`,
  sin `registration_endpoint`, con `offline_access` en `scopes_supported`— para que un cliente que aplique el MUST de PKCE
  falle en el harness y no en producción (ver «Hechos verificados 2026-09-03»).
- Contrato explícito para scopes de bootstrap, challenges, `resource` y callbacks reales. El cliente público
  sigue sin write scopes; `insufficient_scope` de una escritura no dispara ampliación automática.

### Slice 2 — Discovery, configuración y gates durables

- Implementar la decisión aprobada en gateway/config/workflow; OFF explícito no debe reactivar shim al redeploy.
- Desacoplar cualificación de scopes del shim; probar metadata y challenges observados, no texto fuente.
- Probar 401/403/503, issuer/audience/expiry, cero dispatch no autorizado, concurrencia y fallos de metadata.
- Mantener el canary directo como diagnóstico diferenciado; añadir cobertura del discovery que realmente usan clientes.

### Slice 3 — Onboarding y regresión de clientes

- Configuración mínima documentada de Codex y Claude Code; client ID público sin client secret, callbacks exactos
  soportados por cada versión y scopes de lectura necesarios. No presumir equivalencia con el callback del canary.
- Login fresco controlado en cada cliente sin borrar sesiones ajenas; nueva sesión de agente con tools visibles y
  una lectura real sin gasto. Verificar también continuidad/reconexión y renovación si el flujo emite refresh token.
- Inventariar claude.ai/Desktop activos y su configuración/certificación antes de retirar el shim; no extrapolar
  el resultado de Claude Code. Si no se pueden certificar, stop de promoción hasta decisión explícita del operador.

### Slice 4 — Cutover autorizado, rollback y documentación

- Deploy acotado al SHA aprobado y readback; no arrastrar cambios ajenos del gateway ni release del portal por reflejo.
- Ensayo previo de rollback y smokes post-cutover; diferencias de clientes, scopes y ausencia de ampliación documentadas.
- Actualizar triple documentación y mirrors de la skill; retirar la recomendación incompleta «unset y listo» y
  la afirmación no versionada de que todos toleran el mismatch. Formalizar la referencia huérfana del shim.

## Out of Scope

- Reconciliar `main`/`develop`, cherry-pick/rebase/reset/force-push, modificar protecciones GitHub o el playbook Berel.
- Registrar nueva app Entra, cambiar grants/redirects, publicar o desplegar sólo por haber creado esta task.
- Broker propio, CIMD en gateway, B2B, WorkOS, nuevas identidades o grants externos: pertenecen a `TASK-1631`.
- Abrir writes/gasto, usar bearer copiado de Claude, desactivar issuer/TLS o falsificar `issuer` del gateway.
- Migrar integralmente la versión de protocolo/SDK, inventario de tools o providers; reactivar Globe hibernado.
- UI propia de login, cambios en Notion, contenidos Berel o skills editoriales.

## Detailed Spec

La matriz debe distinguir cinco hitos: registro local, OAuth, discovery MCP, tool callable en sesión nueva y
readback real. Registrar resultado por hito/version/fecha; no declarar conexión por `enabled`, HTTP 200 de
metadata, scopes anunciados o tests sin credenciales. Elegir lectura mínima no facturable, preferentemente
`get_greenhouse_skill` si está disponible y autorizada; disponibilidad de provider se verifica, no se presupone.

Para la regresión de permisos, usar fixtures con firma/claims controlados y spy downstream. En vivo usar sólo
identidad de prueba legítima previamente disponible; no fabricar tokens ni revocar acceso real para conseguir
un negativo. Un scope no solicitado no prueba que no fue concedido: verificar claims efectivos de forma sanitizada.

Si una versión de Codex falla contra metadata conforme, entregar reproducción mínima y ruta soportada con evidencia
o declarar bloqueo upstream. No modificar el gateway para acomodar una comparación equivocada ni dar por aprobada
una actualización global de clientes. Los reportes de terceros son hipótesis hasta reproducir el mismo escenario.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (contrato + fixtures + aprobación humana) → Slice 2 (código/config/gates) → Slice 3 (clientes en entorno
previo) → Slice 4 (aprobación de cutover + producción). Si no existe entorno previo compatible con el resource,
presentar un canary productivo acotado y reversible para aprobación; no omitir el gate silenciosamente.

### Risk matrix

| Riesgo                                        | Sistema            | Probabilidad | Mitigation                                                           | Signal de alerta                          |
| --------------------------------------------- | ------------------ | ------------ | -------------------------------------------------------------------- | ----------------------------------------- |
| Codex mantiene rechazo con metadata conforme  | Cliente OAuth      | medium       | Fixture conforme + versión exacta + ruta soportada antes del cutover | Error de discovery antes de callback      |
| Claude pierde alta/reconexión al retirar shim | Clientes activos   | high         | Inventario y pruebas frescas por producto antes de promoción         | Registration/callback/token fallidos      |
| Scopes sin cualificar o exceso de permisos    | Entra/gateway      | high         | Requestable separado de `scp`, bootstrap mínimo y negativos          | AADSTS650053, scopes de write solicitados |
| Deploy restaura shim o incluye WIP ajeno      | Cloud Run/CI       | high         | Modo explícito, prueba de configuración efectiva, SHA aprobado       | PRM vuelve a anunciar gateway como AS     |
| Redirect exacto distinto del canary           | Entra/Codex/Claude | medium       | Verificar host/puerto/path por versión, cambio mínimo aprobado       | Redirect mismatch o callback timeout      |
| Falsa certificación por canary directo        | Operación          | high         | Hitos separados y tool invocada desde cada sesión nueva              | Auth verde pero tool no callable          |

### Feature flags / cutover

Hoy `OAUTH_PUBLIC_CLIENT_ID` activa shim y tiene fallback en deploy. El diseño debe volver esa elección explícita
y testeable sin inventar aquí el nombre de una flag. No basta eliminar la variable de Cloud Run. Conservar los
flags de providers y valores ajenos; nunca activar capacidades para validar OAuth.

### Rollback plan per slice

| Slice | Rollback                                                                                | Tiempo                                                   | Reversible?                                             |
| ----- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| 1     | Restaurar decisión propuesta/fixtures propios; ninguna mutación runtime                 | Inmediato documental                                     | Sí                                                      |
| 2     | Revert enfocado aprobado del cambio y configuración efectiva anterior                   | Antes de promoción; duración medida en ensayo            | Sí                                                      |
| 3     | Restaurar sólo config del servidor en cliente afectado; preservar otras sesiones/grants | Medir durante ensayo                                     | Sí; puede requerir relogin                              |
| 4     | Retornar tráfico a revisión previa exacta y restaurar fuente declarativa/config cliente | Objetivo menor a 30 minutos; verificar antes del cutover | Sí; restaura estado previo, no garantiza arreglar Codex |

El ejecutor registra nombres exactos de revisión y comandos de rollback tras readback. No inventarlos desde
historia ni usar un reset del checkout. Si el rollback recupera Claude pero vuelve a bloquear Codex, declararlo.

### Production verification sequence

1. Readback de revisión/config/grants pertinentes y snapshot sanitizado; aprobación de SHA y rollback.
2. Gates locales y flujo completo en entorno previo autorizado; inventario de clientes con compatibilidad explícita.
3. Despliegue autorizado del gateway; readback de configuración efectiva y metadata root/path-specific.
4. Requests sin token/insuficientes fallan cerrado; OAuth fresco de Codex y Claude Code.
5. Nueva sesión de cada cliente: lista de tools + invocación read-only y resultado verificable sin gasto.
6. Confirmar reconexión de consumidores activos y ausencia de cambios en scopes de escritura/providers.
7. Ante regresión de auth, permisos o consumidores, detener promoción y ejecutar rollback aprobado; registrar pendientes.

### Out-of-band coordination required

Operador Platform/Identity para consentimientos/pruebas interactivas, configuración de clientes, aprobación de
deploy y cambios Entra si el plan los justifica. Coordinar ediciones compartidas y SHA con la sesión activa de
`TASK-1805`; no interrumpirla ni cambiar su rama. Esta creación documental no otorga ninguna de esas autorizaciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Decisión aprobada con límite `TASK-1626`/`TASK-1631` y versiones/productos cliente registrados.
- [ ] Fixture de mismatch falla y fixture conforme con recurso/AS distintos pasa el verificador pertinente.
- [ ] Discovery live coherente: issuer no falsificado, resource único, PRM root/path y metadata AS compatibles.
- [ ] Scopes requestables cualificados en metadata/challenges en el modo elegido; `scp` interno se valida sin regresión.
- [ ] Bootstrap no solicita automáticamente scopes de escritura; permisos efectivos del cliente público permanecen de lectura.
- [ ] Configuración efectiva de deploy prueba que OFF no reactiva shim con variable vacía/ausente y preserva flags ajenos.
- [ ] Negativos issuer/audience/expiración/base-scope/write-scope y OAuth ausente mantienen 401/403/503 y cero dispatch indebido.
- [ ] Codex: login fresco + tools visibles en sesión nueva + lectura real sin gasto, con versión y evidencia sanitizada.
- [ ] Claude Code: mismo recorrido fresco y reconexión; continuidad de renovación probada si se emite refresh token.
- [ ] claude.ai/Desktop activos tienen evidencia propia o decisión explícita sobre no certificación antes de cutover.
- [ ] Callbacks efectivos verificados por host/puerto/path; no ampliación indiscriminada de redirects ni secretos copiados.
- [ ] Canary directo y prueba de discovery se reportan separados; no `skipped` ni configuración `enabled` como éxito.
- [ ] Rollout autorizado, SHA/revisión/config readback y rollback ensayado dentro del objetivo quedan registrados.
- [ ] Triple documentación y skill espejada reflejan soporte real; referencias huérfanas del shim quedan trazadas.
- [ ] No cambios de ramas/historia Git, B2B, providers, gasto o contenidos Berel incluidos en esta unidad.

## Verification

- En `../efeonce-mcp`: `pnpm check` (format/typecheck/test/build) + harness conductual de discovery y configuración.
- En los clientes: pruebas interactivas acotadas según matriz aprobada, sin imprimir URLs OAuth completas.
- En Greenhouse: `pnpm task:lint --task TASK-1813`, `pnpm ops:lint --changed`, `pnpm skills:mirrors` si cambia la skill.
- `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed` al implementar, con evidencia separada de cada repo/runtime.
- `pnpm docs:closure-check` acotado a archivos propios y `pnpm docs:context-check:strict` como último gate documental.

## Closing Protocol

- [ ] `Lifecycle` y `Status real` actualizados según evidencia; no cerrar si sólo hay código y falta rollout/cliente.
- [ ] Archivo en carpeta correcta y `docs/tasks/README.md`/registry sincronizados.
- [ ] Acceptance Criteria tildados sólo con evidencia; lo no verificado queda pendiente con razón.
- [ ] `Handoff.md` registra revisión/configuración verificadas, permisos, riesgos y siguiente paso.
- [ ] `changelog.md` registra el comportamiento cambiado, no confunde creación de task con implementación.
- [ ] Impacto cruzado revisado con `TASK-1626`, `TASK-1631`, consumidores activos y WIP concurrente.
- [ ] No commit, push ni deploy inferidos como cierre automático; reportar cada estado por separado.

## Follow-ups

- Broker/CIMD/identidad y grants por cliente continúan en `TASK-1631`; no abrir duplicada de esa migración.
- Incidente de commits Berel a `main` y protección de ramas se gestionan aparte, sin mutaciones Git en esta task.

## Open Questions

- ¿Qué productos/versiones Claude usa activamente el operador, además del Claude Code documentado?
- ¿Hay lane previo compatible con el resource canónico o se requiere aprobar un canary productivo controlado?
- ¿Codex instalado acepta el fixture conforme? Parcialmente respondido 2026-09-03 leyendo `rmcp 3.1.3`: descubre Entra
  por OIDC path-append y tolera la ausencia de `code_challenge_methods_supported` (sólo `warn!`). Queda por probar en vivo
  el recorrido completo: scopes cualificados en el challenge, callback `127.0.0.1/callback/<id>` aceptado por Entra y token
  con `scp` válido. El reporte upstream #40885 sigue sin reproducirse.
- ¿Entra ignora el puerto también para redirects `http://127.0.0.1/...` (no sólo `localhost`)? Determina si basta registrar
  `http://127.0.0.1/callback/boTaDHiFl7aq` o si Codex necesita `oauth.callback_port` fijo. Verificar con readback, no con docs.

Estas preguntas condicionan la ejecución/cutover, no impiden registrar la unidad. Ningún criterio de
implementación está tildado: el trabajo realizado hasta ahora es investigación y planificación.
