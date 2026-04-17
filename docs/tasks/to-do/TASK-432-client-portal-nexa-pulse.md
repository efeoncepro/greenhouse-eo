# TASK-432 — Client Portal Nexa Pulse (Client-Facing Insights)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (puede paralelizarse con TASK-435 y TASK-436)
- Branch: `task/TASK-432-client-portal-nexa-pulse`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (Eje 2)

## Summary

Expone Nexa Insights en el Client Portal (`/client/pulse`) con tono adaptado a audiencia externa y scope duro por `client_id`. Convierte Nexa de herramienta interna a artefacto comercial visible: los clientes enterprise de Efeonce (aerolíneas, bancos, manufactura) ven narrativas ejecutivas sobre su propia operación sin exponer data sensible de otros clientes ni detalles internos de team members.

## Why This Task Exists

Nexa ya está maduro internamente (Finance + ICO + Weekly Digest), pero **el cliente no lo ve**. Los clientes enterprise:

- Justifican el spend ante CFO/procurement con evidencia visible del valor de la agencia.
- Esperan portals de nivel enterprise — hoy el portal cliente muestra data operativa sin narrativa.
- Compiten mentalmente con herramientas enterprise que ya usan (Sprinklr, Brandwatch, etc.). Nexa client-facing diferencia.

Sin esta task, Nexa es un cost center interno. Con esta task, es revenue enabler visible y argumento comercial en QBRs.

## Goal

- Surface `/client/pulse` con `NexaInsightsBlock` scoped al `client_id` del portal cliente.
- Prompt LLM dedicado que genere narrativas con tono externo/ejecutivo.
- Scope duro a nivel reader + guard de ruta: un cliente nunca ve insights de otro.
- Redacción de mentions internas (`member:*`, referencias a root-cause operativo interno) antes del render client-facing.
- Pre-aprobación via flag `client_visible` — un insight no es client-facing por default.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — contrato `client_scope` (Eje 2).
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — patterns de reader y UI.
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — dimensiones (client_id, organization_id).
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — guard de surface cliente.

Reglas obligatorias:

- Scope duro en el reader: validar `client_id` contra la sesión activa, no contra un query param.
- Ningún insight client-facing puede contener `@[name](member:ID)` ni información individual de colaboradores.
- Un insight no es client-facing por default. El LLM worker decide según prompt; ops puede override via `client_visible=false`.
- Advisory-only: sin mutaciones automáticas, sin acciones que el cliente pueda gatillar sobre operaciones internas.
- El prompt client-facing requiere review de UX writing antes de productivizarse.

## Normative Docs

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md`
- `src/lib/finance/ai/llm-enrichment-reader.ts` — patrón de reader a clonar
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
- `src/views/greenhouse/finance/FinanceDashboardView.tsx` — patrón UI

## Dependencies & Impact

### Depends on

- Finance Signal Engine operativo (TASK-245, ya cerrado).
- ICO Signal Engine operativo.
- Client Portal ya existe con `/client/pulse` u homólogo (validar estructura actual en planning).

### Blocks / Impacts

- Abre la puerta a que `TASK-436` (push crítico) empuje señales al cliente si hay severity crítica y `client_visible=true` — validar si eso entra en scope o queda para follow-on.
- Impacta contratos de enrichment existentes al agregar `client_visible` + `client_facing_narrative`.

### Files owned

- Migración PG: columnas `client_visible`, `client_facing_narrative` en `finance_ai_signal_enrichments` + `ico_ai_signal_enrichments`
- `src/lib/nexa/client-facing/` (nuevo) — reader + prompt worker
- `src/views/greenhouse/client/` — surface en `/client/pulse`
- `src/app/api/client/nexa/` — endpoint API scoped
- Prompt templates: `finance_signal_client_facing_v1.ts`, `ico_signal_client_facing_v1.ts`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + backfill strategy

- Migración PG: `client_visible BOOLEAN DEFAULT FALSE`, `client_facing_narrative TEXT NULL` en los 2 enrichment tables.
- Regenerar tipos con `pnpm db:generate-types`.
- Decidir: ¿backfill de enrichments existentes (con re-enrichment LLM)? ¿o solo enrichments nuevos tienen client-facing? Recomendación: **solo nuevos** para evitar costo y riesgo de narrativa interna filtrada. Documentar la decisión.

### Slice 2 — Prompts client-facing

- Clonar `finance_signal_enrichment_v1` y `ico_signal_enrichment_v1`.
- Adaptar tono: audiencia externa (cliente enterprise), omisión de detalles operativos internos (team members, root cause interna).
- Incluir instrucción explícita: NO generar mentions `member:*`; mentions solo `client:*` o agregados.
- Versionar con `prompt_version = 'finance_signal_client_facing_v1'`, `'ico_signal_client_facing_v1'`.
- Review del prompt con UX writing skill (`greenhouse-ux-writing`) antes de productivizar.

### Slice 3 — LLM worker extension

- Extender `finance-ai/llm-enrichment-worker.ts` e `ico-engine/ai/llm-enrichment-worker.ts` para, adicionalmente a la narrativa interna, generar la narrativa client-facing cuando aplique.
- Heurística inicial de `client_visible`: el worker la calcula a `true` si la narrativa no contiene referencias a team members y la severity es `warning` o `info` (evitar mandar `critical` sin revisión por default — configurable).
- Un campo `client_visible` en `false` deja el enrichment visible internamente pero no al cliente.

### Slice 4 — Reader client-scoped

- Nuevo: `src/lib/nexa/client-facing/reader.ts` con:
  - `readClientFacingFinanceEnrichments(clientId, period, limit)`
  - `readClientFacingIcoEnrichments(clientId, period, limit)`
  - Filtro duro: `client_visible = TRUE`, `status = 'succeeded'`, `client_id = :clientId`.
  - Devuelve `client_facing_narrative` (no el `narrative` interno).
- Tests unitarios: confirmar que un clientId no ve enrichments de otro.

### Slice 5 — API endpoint

- `GET /api/client/nexa/insights` — scoped al `client_id` de la sesión cliente.
- Guard: usa el guard actual de client portal (validar session.user.tenant_type + client_id resolution).
- Response: shape compatible con `NexaInsightsBlock`.

### Slice 6 — UI surface en Client Portal

- Agregar `NexaInsightsBlock` al Pulse del client portal (`/client/pulse` o surface equivalente — validar nomenclatura actual).
- Tono y disclaimer adaptados: "Análisis generado sobre los datos de tu operación. Verifica con tu contacto Efeonce antes de actuar."
- Handling de empty state: si no hay insights client-facing para el período, mostrar mensaje neutral, no técnico.

### Slice 7 — Admin override

- Admin UI (tab en Admin Center o similar) para marcar/desmarcar `client_visible` en un enrichment específico.
- Uso: ops revisa un insight que pasó el filtro automático y decide no mostrarlo al cliente.
- Audit: `updated_by`, `updated_at`.

## Out of Scope

- Enrichments on-demand generados por el cliente (sigue siendo batch materializado).
- Client-facing causality cross-domain (reserva para follow-on).
- Push crítico al cliente por Slack/email — eso es decisión separada (ver TASK-436).
- Edición manual de narrativa client-facing por ops (solo on/off via flag).

## Acceptance Criteria

- [ ] Migración PG aplicada, tipos regenerados, `pg:doctor` healthy.
- [ ] Prompts client-facing versionados, reviewed con UX writing, productivos en el worker.
- [ ] Reader scoped devuelve solo enrichments del `client_id` de sesión. Test unitario confirma aislamiento.
- [ ] API endpoint guard-protected; acceso cross-client devuelve 403.
- [ ] `NexaInsightsBlock` render en Client Portal Pulse con disclaimer adaptado.
- [ ] Admin puede togglear `client_visible` y el cliente lo ve reflejado en siguiente request.
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.
- [ ] Validación manual en staging con un client_id de test.
- [ ] Ningún insight client-facing muestra mentions `member:*` (test automatizado contra muestra de enrichments generados).

## Verification

- Tests de integración: endpoint con session de cliente A no devuelve insights de cliente B.
- Tests automatizados sobre muestra de prompts en ambiente de pruebas para confirmar no-leak de internal info.
- Verificación manual en staging con cuenta cliente real (validación de UX writing).

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con delta de client-facing layer.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con estado de Eje 2.
- [ ] Notificar a Commercial/Sales que la feature está lista para demo en QBRs.
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El primer rollout es a todos los client_ids activos o solo a un grupo piloto? Recomendación: piloto con 2-3 clientes enterprise confirmados antes de general availability.
- ¿Los enrichments client-facing se generan para todos los períodos históricos o solo adelante? Decisión propuesta: solo adelante.
- ¿Cómo se maneja el caso de un cliente multi-organization (un cliente corporativo con varias orgs)? Scope por organization_id o client_id consolidado — validar con Finance.
