# TASK-1658 — Drift de federación MCP del módulo SEO + punto ciego del guard de paridad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; gateway efeonce-mcp main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Tres tools SEO viven en el MCP interno de Greenhouse y **no están ni federadas ni excluidas** en
el gateway: `get_seo_overview_kpis`, `get_seo_performance`, `get_seo_performance_catalog`. Y el
guard que existe precisamente para impedir eso **no puede verlas**, porque compara su lista
esperada contra lo registrado en el gateway y nunca contra Greenhouse. Un guard verde que no
mira el lado por el que entra el error es peor que no tener guard: da confianza falsa.

## Why This Task Exists

`efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts` declara su propia regla en el
comentario de cabecera: *"si una tool interna de Greenhouse NO debe federarse, va en EXCLUSIONS
con razón — nunca simplemente ausente"*. Hoy `GREENHOUSE_SEO_TOOL_EXCLUSIONS` está **vacío** y
`EXPECTED_GREENHOUSE_SEO_TOOLS` cubre 8 de las 11 tools SEO que registra
`src/mcp/greenhouse/server.ts`. Las 3 ausentes no son una decisión documentada: son un olvido.

El problema de fondo no son las 3 tools —son de `TASK-1306`/`TASK-1307` y federarlas es
mecánico— sino **la dirección en que el guard mira**. El guard verifica *"el gateway registró
todo lo que dijimos que registraría"*. Nunca verifica *"dijimos todo lo que Greenhouse tiene"*.
Esa asimetría hace que el modo de falla real —alguien construye una tool en Greenhouse y se
olvida de tocar el gateway— sea **estructuralmente invisible**, que es exactamente el hábito que
el operador ya identificó como problema: una tool viva adentro y no federada es una capacidad
que nadie puede usar desde un asistente.

Se detectó el 2026-08-07 al sincronizar la documentación de `TASK-1308`, contando el inventario
real a mano. Nada lo había reportado en meses.

## Goal

- Cada tool SEO del MCP interno de Greenhouse está **o federada o excluida con razón** — ninguna
  simplemente ausente.
- El guard de paridad detecta el olvido en la dirección Greenhouse → lista esperada, no sólo
  lista esperada → gateway.
- El guard falla en CI ante una tool nueva no declarada, en vez de quedarse verde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- El gateway es un **adaptador neutral**: una tool delega sólo a un reader o command canónico del
  provider. No se agrega lógica de dominio, DB ni SDK al gateway.
- **Un scope por CLASE de blast-radius, nunca uno por capability.** Las 3 tools de este drift son
  lecturas: van sobre `efeonce.mcp.read`, sin scope nuevo y **sin tocar Entra**.
- 🔴 **NUNCA** cerrar un `insufficient_scope` agregando un scope al cliente PKCE compartido. No
  aplica a esta task (son lecturas) pero la regla se lee entera antes de tocar el gateway.
- Toda tool federada nace con entrada en el parity file **y** cobertura en el canary.

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` — contrato de federación y verificación
- `.claude/rules/growth-seo.md` — el mandato "todo reader nuevo expone su MCP tool en el mismo PR"
- `efeonce-mcp/AGENTS.md` — contrato de paridad del gateway

## Dependencies & Impact

### Depends on

- `src/mcp/greenhouse/server.ts` — las 11 tools SEO ya registradas (`TASK-1306`/`1307`/`1308`/`1645`)
- `src/app/api/platform/ecosystem/growth/seo/**` — el lane que las 3 tools necesitarían; **[verificar]**
  si existe endpoint ecosystem para overview-kpis / performance / performance-catalog, o si hay que
  crearlo (cambia el Effort de `Bajo` a `Medio`)

### Blocks / Impacts

- `TASK-1631` — cliente con grant revocable; no bloquea pero comparte superficie de gateway
- Cualquier task futura de EPIC-022 que agregue un reader: hereda el guard corregido

### Files owned

- `efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts`
- `efeonce-mcp/src/providers/greenhouse-seo.ts`
- `efeonce-mcp/src/mcp.ts`
- `efeonce-mcp/scripts/greenhouse-seo-canary.mjs`
- `docs/tasks/to-do/TASK-1658-mcp-seo-federation-drift-parity-guard-blind-spot.md`

## Current Repo State

### Already exists

- `src/mcp/greenhouse/server.ts` — 11 tools SEO registradas: 9 lecturas
  (`get_seo_backlink_profile`, `get_seo_entitlement`, `get_seo_keyword_opportunities`,
  `get_seo_overview_kpis`, `get_seo_performance`, `get_seo_performance_catalog`,
  `get_seo_rank_evolution`, `get_seo_site_audit_report`, `get_seo_visibility_360`) + 2 escrituras
  (`track_seo_keywords`, `untrack_seo_keywords`)
- `efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts` — `EXPECTED_GREENHOUSE_SEO_TOOLS` con
  8 entradas y `GREENHOUSE_SEO_TOOL_EXCLUSIONS` vacío
- `efeonce-mcp/scripts/greenhouse-seo-canary.mjs` — canary que ya cubre las 8

### Gap

- 3 tools ni federadas ni excluidas: `get_seo_overview_kpis`, `get_seo_performance`,
  `get_seo_performance_catalog`
- El guard compara `EXPECTED_*` contra lo registrado **en el gateway**; no existe ninguna
  verificación contra el inventario real de Greenhouse, así que el olvido en esa dirección no
  produce señal alguna
- `GREENHOUSE_SEO_TOOL_EXCLUSIONS` vacío no distingue "no hay exclusiones" de "nadie las declaró"

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-mcp` (Cloud Run, gateway) + `src/mcp/greenhouse/` (Vercel, Greenhouse)
- Future candidate home: `remain-shared`
- Boundary: el gateway delega a `POST /api/platform/ecosystem/growth/seo/*`; el inventario
  canónico de tools SEO es `src/mcp/greenhouse/server.ts`
- Server/browser split: `n/a` — ambos runtimes son server-only
- Build impact: `none`
- Extraction blocker: `none` — el acoplamiento es por contrato HTTP, no por código compartido

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `src/mcp/greenhouse/server.ts` (inventario canónico de tools SEO)
- Consumidores afectados: `MCP` (clientes vía `mcp.efeonce.org`)
- Runtime target: `production` (gateway Cloud Run) — Greenhouse no cambia

### Contract surface

- Contrato existente a respetar: `efeonce-mcp/src/providers/greenhouse-seo-tool-parity.ts`
- Contrato nuevo o modificado: 3 métodos en `GreenhouseSeoProvider` + 3 `registerTool` + el guard
  extendido a la dirección Greenhouse → esperada
- Backward compatibility: `compatible` — sólo agrega tools; ninguna existente cambia de forma
- Full API parity: las 3 tools consumen el lane ecosystem, el mismo reader que ya sirve a la UI —
  no readers paralelos

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (el gateway no toca DB)
- Invariantes que no se pueden romper:
  - El gateway **nunca** consulta Postgres/BigQuery ni resuelve entitlement: delega al lane
  - Toda tool declarada en `EXPECTED_*` debe existir en el MCP de Greenhouse, y viceversa toda
    tool SEO de Greenhouse debe estar en `EXPECTED_*` **o** en `EXCLUSIONS` con razón
  - Las 3 son **lecturas**: van sobre `efeonce.mcp.read`; agregar un scope acá sería violar la
    regla de un scope por clase de blast-radius
- Tenant/space boundary: la deriva el lane desde el binding del consumer, igual que las 8 vigentes
- Idempotency/concurrency: `n/a` — sólo lecturas
- Audit/outbox/history: `none` — las lecturas no emiten evento; el lane ya registra la llamada

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled` — quedan tras el flag `GREENHOUSE_SEO_PROVIDER_ENABLED` que ya existe
- Backfill plan: `n/a`
- Rollback path: revert PR + redeploy del gateway; o `GREENHOUSE_SEO_PROVIDER_ENABLED=false` para
  apagar el provider entero
- External coordination: **ninguna** — son lecturas sobre el scope base; el corolario de la regla
  de scopes es exactamente que la tool N+1 de un dominio ya federado no toca Entra

### Security and access

- Auth/access gate: `efeonce.mcp.read` (scope base) + token de consumer con binding en el lane
- Sensitive data posture: métricas SEO agregadas por organización; sin PII
- Error contract: `GreenhouseSeoProviderError` con passthrough del 404 anti-oracle del lane, sin
  cuerpo crudo — igual que las 8 vigentes
- Abuse/rate-limit posture: heredada del lane; sin cambios

### Runtime evidence

- Local checks: `npm test` en `efeonce-mcp` (el guard corre como test) + `npm run check`
- DB/runtime checks: `n/a`
- Integration checks: `scripts/greenhouse-seo-canary.mjs` extendido a las 3 tools, con allow +
  deny anti-oracle
- Reliability signals/logs: sin señal nueva; el conteo de tools del smoke del front door sirve de
  verificación
- Production verification sequence: ver Zone 3

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cerrar el punto ciego del guard

- Extender el guard para que compare contra el **inventario real de Greenhouse**, no sólo contra
  lo registrado en el gateway. Dos caminos posibles, a decidir en Discovery: (a) un manifiesto de
  tools SEO que Greenhouse publique y el guard consuma; (b) una lista espejo committeada en el
  gateway con un test que falle si `EXPECTED_ ∪ EXCLUSIONS` no la cubre entera.
- El guard debe fallar con el **nombre** de la tool no declarada, no con un conteo.
- Test de regresión que agregue una tool ficticia al inventario y verifique que el guard se pone
  rojo. Sin ese test, el guard nuevo tampoco prueba nada.

### Slice 2 — Federar las 3 tools ausentes

- Método en `GreenhouseSeoProvider` por cada una, delegando al lane ecosystem correspondiente
- `registerTool` en `src/mcp.ts` con el chequeo de `BASE_READ_SCOPE`
- Entrada en `EXPECTED_GREENHOUSE_SEO_TOOLS` con razón sustantiva
- **[verificar] antes de empezar:** si alguna no tiene endpoint en el lane ecosystem, crearlo es
  parte del slice y sube el Effort

### Slice 3 — Canary y documentación

- Extender `scripts/greenhouse-seo-canary.mjs`: allow + deny anti-oracle por cada tool nueva
- Actualizar el inventario de tools en `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`, en
  ambos bundles de `efeonce-mcp-platform` y en las skills comerciales que citan el conteo
  (`seo-aeo-practice`, `growth-marketing-cro`)

## Out of Scope

- **Cablear cualquier scope al cliente PKCE compartido.** Fuera de alcance por decisión de
  seguridad, no por tamaño: ver la frontera de grant en el ADR del gateway.
- Crear scopes nuevos en Entra. Las 3 son lecturas.
- El cliente con grant revocable — es `TASK-1631`.
- Extender el mismo guard a otros providers (Globe). Si el patrón sirve, se generaliza en task
  aparte para no mezclar dominios.

## Detailed Spec

El inventario verificado el 2026-08-07:

| Tool | En Greenhouse | En `EXPECTED_*` | Acción |
|---|---|---|---|
| `get_seo_backlink_profile` | sí | sí | ninguna |
| `get_seo_entitlement` | sí | sí | ninguna |
| `get_seo_keyword_opportunities` | sí | sí | ninguna |
| `get_seo_rank_evolution` | sí | sí | ninguna |
| `get_seo_site_audit_report` | sí | sí | ninguna |
| `get_seo_visibility_360` | sí | sí | ninguna |
| `track_seo_keywords` | sí | sí | ninguna |
| `untrack_seo_keywords` | sí | sí | ninguna |
| `get_seo_overview_kpis` | sí | **no** | federar o excluir |
| `get_seo_performance` | sí | **no** | federar o excluir |
| `get_seo_performance_catalog` | sí | **no** | federar o excluir |

⚠️ **Al contar tools con grep, incluir dígitos en el patrón.** `get_seo_visibility_360` se escapa
de `'[a-z_]*seo[a-z_]*'` y produce un inventario corto que parece un drift mayor del real. Pasó
durante la detección.

**Excluir es una respuesta válida.** Si `get_seo_performance_catalog` es un helper de UI sin
sentido para un agente, va a `EXCLUSIONS` con esa razón escrita. Lo que la regla prohíbe es la
ausencia silenciosa, no la decisión de no federar.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (guard) **antes** que Slice 2 (federar). Al revés, el guard nace verde sobre un estado
  ya corregido y nunca se comprueba que detecta el error que existe hoy — que es el único momento
  en que se puede probar contra un caso real.
- Slice 3 después de Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una de las 3 no tiene endpoint en el lane ecosystem y el slice se dispara en alcance | integración | medium | `[verificar]` en Discovery antes de tomar la task; si falta, se parte en task propia | el provider no compila contra el lane |
| El guard nuevo se vuelve ruidoso y alguien lo apaga | CI | low | falla nombrando la tool y aceptando `EXCLUSIONS` como respuesta legítima | guard deshabilitado o `EXCLUSIONS` usado como basurero |
| Deploy del gateway con provider caído deja el smoke rojo | gateway | low | `GREENHOUSE_SEO_PROVIDER_ENABLED=false` apaga el provider entero sin tocar los demás | canary del front door |

### Feature flags / cutover

Sin flag nuevo — las 3 tools quedan tras `GREENHOUSE_SEO_PROVIDER_ENABLED`, que ya gobierna el
provider. Cutover inmediato al deploy; revert por env var o revert del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (sólo toca test/guard) | < 5 min | sí |
| Slice 2 | revert PR + redeploy del gateway, o `GREENHOUSE_SEO_PROVIDER_ENABLED=false` | < 10 min | sí |
| Slice 3 | revert PR (canary + docs) | < 5 min | sí |

### Production verification sequence

1. `npm test` + `npm run check` verdes en `efeonce-mcp`, con el test que prueba que el guard
   detecta una tool no declarada.
2. Deploy del gateway; verificar que el conteo de tools del `tools/list` subió exactamente en 3.
3. `scripts/greenhouse-seo-canary.mjs` contra producción: allow + deny anti-oracle por tool nueva.
4. Confirmar que ninguna tool preexistente cambió de forma ni de scope.

### Out-of-band coordination required

**N/A — no toca Entra.** Es el corolario de la regla de scopes: las 3 son lecturas sobre el scope
base ya consentido. Si en Discovery aparece que alguna escribe, se detiene y se replantea: sería
otra clase de blast-radius y otra task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Toda tool SEO de `src/mcp/greenhouse/server.ts` está en `EXPECTED_GREENHOUSE_SEO_TOOLS` **o**
      en `GREENHOUSE_SEO_TOOL_EXCLUSIONS` con razón escrita; ninguna ausente
- [ ] El guard compara contra el inventario real de Greenhouse, no sólo contra lo registrado en
      el gateway
- [ ] Existe un test que agrega una tool no declarada y verifica que el guard **falla**
- [ ] El mensaje de fallo del guard nombra la tool, no un conteo
- [ ] Las tools federadas tienen cobertura allow + deny anti-oracle en el canary
- [ ] Ningún scope nuevo en Entra, y ningún cambio al `requiredResourceAccess` de ningún cliente
- [ ] El inventario de tools quedó sincronizado en runbook, ambos bundles de la skill y las skills
      comerciales que citan el conteo

## Verification

- `npm test` y `npm run check` en `efeonce-mcp`
- `node scripts/greenhouse-seo-canary.mjs` contra producción
- `pnpm lint` y `pnpm typecheck` en `greenhouse-eo` si el slice tocó el MCP interno
- Verificación manual del `tools/list` del gateway tras el deploy

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado

## Follow-ups

- Generalizar el guard corregido a los demás providers del gateway, si el patrón resulta.
- Evaluar si el inventario de tools debería publicarse como recurso del propio MCP de Greenhouse,
  para que el guard consuma una fuente viva en vez de una lista espejo.
