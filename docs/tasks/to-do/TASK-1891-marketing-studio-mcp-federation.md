# TASK-1891 — Federar Efeonce Marketing Studio en Efeonce MCP

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-25

- TASK-1890 dejó listo el lado de Studio: artefacto `studio-tool-manifest.v1` en `GET https://studio.efeonce.org/api/v1/tool-manifest` (12 tools `studio.*` + 5 exclusiones, `manifestHash`, schemas autocontenidos, cuatro `annotations`, `capability` y `apiScope` por tool), bearer `api_client` con scope `studio:read` y organización canónica, y el secreto `marketing-studio-mcp-gateway-token` (token del cliente del gateway en producción, org Efeonce).
- `studio.asset.preview` apunta a `GET /api/v1/assets/{assetId}/preview?size=thumb|preview` (imagen WebP), no a `/renditions/{id}`.
- El manual `marketing-studio` declara `provider: 'marketing-studio'` en el manifiesto de manuales de Greenhouse: Greenhouse sólo valida el prefijo `studio.`; **el guard del gateway debe verificar que cada tool de su `appliesTo` exista en el artefacto sincronizado**. Servirlo en producción requiere el release de Greenhouse.
- Capability `marketing_studio.campaign.read` registrada (grant: `efeonce_admin`, `efeonce_account`, `efeonce_operations`).

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
- Epic: `EPIC-049`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1890`
- Branch: `efeonce-mcp main vía PR (auto-deploy de Cloud Run) · Greenhouse develop (docs); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega al gateway `mcp.efeonce.org` un provider `marketing-studio` que publica todas las tools del manifiesto de
Studio (TASK-1890). El provider delega en `/api/v1` con identidad de servicio, aplica la política de persona
(capability `marketing_studio.campaign.read` + membership de organización) y se protege con un guard de paridad
contra el artefacto sincronizado. Así cualquier agente autorizado lee campañas, piezas, copys, anuncios, plan de
medios, calendario y decisiones de Studio, y ve las piezas como imagen.

## Why This Task Exists

El operador exige acceso por MCP a absolutamente todo Studio para agentes autorizados, con semántica
interpretable. El gateway es el único adaptador MCP gobernado de Efeonce (canonical resource
`https://mcp.efeonce.org/mcp`). Un servidor MCP propio de Studio duplicaría OAuth, consentimiento y política, y lo
prohíbe el ADR del gateway.

## Goal

- Todas las tools del manifiesto de Studio están disponibles en el gateway, sin tools ausentes: lo que no se federa figura como exclusión con razón.
- La persona se autoriza por capability y membership; la organización nunca viene libre.
- Un guard de CI detecta la deriva entre el manifiesto de Studio y la superficie federada.
- Evidencia viva de autorización y denegación desde una sesión MCP real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (§9 versión, §11 status)
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El gateway no contiene lógica de campañas ni SQL: sólo transporte al contrato `/api/v1`.
- Las lecturas van en el scope base `efeonce.mcp.read`, porque el scope responde a la clase de riesgo, no a cada capability. La autorización fina es la capability `marketing_studio.campaign.read`, verificada por persona. Las escrituras futuras tendrán su propio scope de clase y nunca se cablean al cliente público compartido.
- El provider nace deshabilitado y falla cerrado; un Studio degradado no rompe el discovery de otros providers.
- `efeonce.gateway.status` reporta el provider nuevo en el mismo PR, probado por la puerta HTTP.
- Bump de versión del servidor (agregar = minor) y `pnpm surface:baseline` después de decidir el bump.

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `references/capability-intake.md` + `references/verification-matrix.md`
- Skill `mcp-craft` (descripciones, forma de respuesta, contenido de imagen, drift gates, radar de protocolo)

## Dependencies & Impact

### Depends on

- `TASK-1890`: manifiesto `tool-manifest.json` con `manifestHash`, bearer de servicio, `GET /api/v1/assets/{id}`, capability `marketing_studio.campaign.read`, manual `marketing-studio` y secreto `marketing-studio-mcp-gateway-token`.

### Blocks / Impacts

- Tasks futuras de EPIC-049 que agreguen escrituras: extienden este provider y su scope de clase.
- Efeonce Insights / Wave pueden componer lecturas de Studio vía MCP.

### Files owned

- Repo `efeonce-mcp`: `src/providers/marketing-studio.ts`, `src/providers/marketing-studio-tool-manifest.generated.ts`, `src/providers/marketing-studio-tool-parity.ts`, registro en `src/mcp.ts`, políticas en `src/auth/tool-policy.ts`, `src/config.ts`, `.github/workflows/deploy.yml` (env/secret), `scripts/marketing-studio-canary.mjs`, `surface-baseline.json`, `package.json` (versión)
- Greenhouse: `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (sección del provider), `docs/architecture/marketing-studio/**`, skill `efeonce-mcp-platform` (ambos espejos)

## Current Repo State

### Already exists

- Gateway `efeonce-mcp` 1.7.0 con providers Greenhouse (SEO, Insights, Hiring, Identity, Client Services, Skills) y Globe; políticas por tool (`src/auth/tool-policy.ts`, membership + capabilities); `efeonce.organizations.list` para resolver organizaciones autorizadas.
- Patrón de artefacto sincronizado con hash y guard bidireccional (`greenhouse-tool-manifest.generated.ts`, `greenhouse-seo-tool-parity.ts`).
- `get_greenhouse_skill` sirve manuales desde Greenhouse (servirá `marketing-studio` tras TASK-1890).

### Gap

- Ningún provider de Studio, ni sync de su manifiesto, ni política de sus tools.
- Ninguna tool devuelve imágenes de piezas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-mcp (Cloud Run efeonce-mcp-gateway) consumiendo studio.efeonce.org/api/v1`
- Future candidate home: `api`
- Boundary: `el gateway transporta; Studio decide datos y visibilidad; Greenhouse decide capability y membership`
- Server/browser split: `n/a (servidor a servidor)`
- Build impact: `none en greenhouse-eo`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `superficie pública del gateway MCP`
- Consumidores afectados: `Claude, Codex, ChatGPT y agentes internos conectados a mcp.efeonce.org`
- Runtime target: `production (Cloud Run efeonce-mcp-gateway)`

### Contract surface

- Contrato existente a respetar: `manifiesto de Studio (TASK-1890); tool-policy del gateway; protected-resource metadata con sólo el scope base`
- Contrato nuevo o modificado: `tools studio.* (según manifiesto); provider marketing-studio en efeonce.gateway.status`
- Backward compatibility: `compatible (minor: agrega tools)`
- Full API parity: `tools generadas desde el manifiesto que ya cubre todo /api/v1; guard bidireccional`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna (sin datos propios en el gateway)`
- Invariantes que no se pueden romper:
  - Cada tool del manifiesto está registrada, o el guard falla nombrándola; cada tool registrada existe en el manifiesto.
  - `inputSchema`/`outputSchema` federados idénticos a los del manifiesto, salvo divergencia declarada con razón.
  - `organizationId` sólo se acepta si pertenece a las organizaciones autorizadas de la persona (membership); nunca se infiere de email o dominio.
  - Ninguna respuesta incluye tokens, cabeceras de autorización ni ids internos no contractuales.
  - `studio.asset.preview` devuelve la miniatura (≤640 px) como contenido de imagen, nunca el original ni URLs firmadas.
- Write-target allowlist: `N/A — sólo lecturas`
- Tenant/space boundary: `persona → membership (Greenhouse) → organizationId → Studio intersecta con el api_client del gateway`
- Idempotency/concurrency: `N/A — lecturas`
- Audit/outbox/history: `logs del gateway con correlationId y sujeto hasheado; Studio registra correlationId`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `MARKETING_STUDIO_PROVIDER_ENABLED=false hasta pasar el canary en producción`
- Backfill plan: `N/A`
- Rollback path: `flag del provider a false y redeploy, o revert del PR (deploy automático)`
- External coordination: `secreto marketing-studio-mcp-gateway-token con secretAccessor para la SA del gateway; variable en deploy.yml (--set-secrets destructivo: declarar todo en el mismo flag)`

### Security and access

- Auth/access gate: `OAuth del gateway (issuer nativo o Entra según política) + scope base + capability marketing_studio.campaign.read + membership; hacia Studio, bearer de servicio`
- Sensitive data posture: `información comercial interna (presupuestos propuestos, copys); sin PII personal`
- Error contract: `errores tipados del gateway (policy_blocked, not_found anti-oráculo, invalid_request, upstream_unavailable) mapeados desde el contrato de Studio`
- Abuse/rate-limit posture: `rate limit del gateway; timeouts explícitos por llamada`

### Runtime evidence

- Local checks: `pnpm check en efeonce-mcp (guard, políticas, versión, surface)`
- DB/runtime checks: `N/A`
- Integration checks: `canary del provider contra producción: allow, deny (org ajena → not_found), fault (Studio caído → upstream_unavailable sin romper otros providers), imagen de preview`
- Reliability signals/logs: `efeonce.gateway.status lista marketing-studio enabled`
- Production verification sequence: `ver Rollout Plan`

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Sync del manifiesto y guard

- `pnpm studio:manifest:sync` descarga el artefacto versionado (desde el repo de Studio, no desde el deployment vivo) a `marketing-studio-tool-manifest.generated.ts` y verifica `manifestHash`.
- Guard bidireccional manifiesto ↔ tools registradas ↔ exclusiones, con test que falla nombrando la tool.

### Slice 2 — Provider y tools

- `src/providers/marketing-studio.ts`: cliente con timeout, correlationId y bearer desde Secret Manager; mapeo de errores.
- Registro de cada tool con `annotations` (`readOnlyHint: true`) y descripciones del manifiesto; `studio.asset.preview` responde con contenido `image`.
- `efeonce.gateway.status` reporta `marketing-studio`.

### Slice 3 — Política y configuración

- `tool-policy.ts`: lectura con `requiredCapabilities: ['marketing_studio.campaign.read']`, `organizationPolicy: 'membership'` y los issuers y poblaciones internas que soporte el binding vigente; nativo externo no, hasta que exista un grant de cliente.
- `config.ts` + `deploy.yml`: `MARKETING_STUDIO_PROVIDER_ENABLED`, `MARKETING_STUDIO_API_URL`, secreto del token.

### Slice 4 — Versión, deploy y canary

- Bump minor + `pnpm surface:baseline`; PR con CI verde; deploy automático.
- Canary `scripts/marketing-studio-canary.mjs` con flag ON en producción: allow / deny / fault / preview. Flag ON definitivo sólo con canary verde.
- Evidencia de una sesión MCP humana (`tools/list` con las tools `studio.*` y una lectura real).

### Slice 5 — Documentación

- Runbook del gateway (sección del provider), arquitectura de Studio (§Agentes), skill `efeonce-mcp-platform` (ambos espejos), Handoff y changelog.

## Out of Scope

- Escrituras de Studio y su scope de clase (task de commands de EPIC-049).
- Acceso de clientes externos (requiere grant, consentimiento y piloto).
- Login web de Studio.

## Detailed Spec

Contrato de tools: el que publica el manifiesto de TASK-1890 (tabla en su Detailed Spec). El gateway no redefine nombres ni descripciones.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1890 cerrada (artefacto, secreto, capability y manual en producción) → Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- El flag del provider queda OFF en el primer deploy; se prende sólo tras el canary.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Deploy del gateway borra env o secretos por `--set-*` destructivo | Cloud Run | medium | declarar todo en `deploy.yml` en el mismo flag; revisar la revisión activa | status tool / health |
| Persona sin capability lee campañas | identity | low | política con capability + test de denegación | canary deny |
| Studio caído rompe el discovery del gateway | MCP | low | provider aislado, timeouts, degradación a `upstream_unavailable` | canary fault |
| Deriva manifiesto ↔ gateway | MCP | medium | guard bidireccional + sync con hash | CI rojo |
| Superficie cambia sin bump | MCP | low | `test/version.test.ts` + `surface.ts` | CI rojo |

### Feature flags / cutover

- `MARKETING_STUDIO_PROVIDER_ENABLED` (default `false`) en `deploy.yml` y en la revisión activa. Revertir = `false` + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–3 | revert del PR | minutos | sí |
| Slice 4 | flag OFF + redeploy, o volver a la revisión anterior | <10 min | sí |
| Slice 5 | revert de docs | minutos | sí |

### Production verification sequence

1. PR con CI verde; deploy con flag OFF; `efeonce.gateway.status` muestra el provider `disabled`.
2. Flag ON; canary del provider (allow, deny, fault, preview) contra producción.
3. Sesión MCP humana: `tools/list` y una lectura real de `studio.attention.get`.
4. Readback de la revisión activa: env y secretos presentes.

### Out-of-band coordination required

- Una sesión humana para el login OAuth del canary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Todas las tools del manifiesto de Studio están registradas en el gateway, y el guard falla nombrando cualquier tool faltante o sobrante.
- [ ] Con capability y membership, `studio.attention.get` y `studio.campaign.get` devuelven los datos de producción.
- [ ] Una organización ajena devuelve `not_found`, y una persona sin capability recibe denegación.
- [ ] Con Studio inaccesible, sus tools devuelven `upstream_unavailable` y los demás providers siguen sirviendo.
- [ ] `studio.asset.preview` devuelve una imagen WebP de ≤640 px.
- [ ] `efeonce.gateway.status` lista `marketing-studio` como `enabled` en la revisión activa.
- [ ] La versión del gateway subió un minor y `surface-baseline.json` quedó actualizado.
- [ ] Runbook, arquitectura, skill (ambos espejos), Handoff y changelog actualizados.

## Verification

- `pnpm check` en `efeonce-mcp`
- `node scripts/marketing-studio-canary.mjs` contra producción
- Sesión MCP humana con `tools/list` + lectura

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] EPIC-049 actualizado

## Follow-ups

- Tools de escritura con su scope de clase cuando exista la task de commands.
- Acceso de clientes externos con grant, consentimiento y piloto.
