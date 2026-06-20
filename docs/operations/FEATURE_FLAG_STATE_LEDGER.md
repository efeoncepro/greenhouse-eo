# Greenhouse — Feature Flag State Ledger (env-var flags)

> **Tipo de documento:** Ledger operativo vivo (SSOT del ESTADO de los env-var flags)
> **Creado:** 2026-06-18 por Claude (TASK-1079 follow-up)
> **Última actualización:** 2026-06-18
> **Doc relacionado:** [GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md](../architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md) (los flags PG declarativos — mecanismo distinto, ver abajo)

## Por qué existe este doc

El desarrollo agéntico deja **deuda cognitiva**: una feature se implementa detrás de un flag `*_ENABLED` default-OFF, pasa todos los gates, se mergea… y **el flag nunca se prende** en staging/prod porque nadie lo registró en un lugar encontrable. Este ledger es ese lugar: un vistazo único de **qué flags están prendidos dónde** y **qué queda pendiente de prender**.

Es **encontrable** desde: `CLAUDE.md` (Runtime Rollout Completion Gate), `AGENTS.md`, y el índice de `docs/operations/`.

## Dos mecanismos de flags (no confundir)

| Mecanismo | Dónde vive el estado | Cómo se prende | Gobierna |
|---|---|---|---|
| **Env-var flags** (`*_ENABLED`) — **este doc** | Vercel env vars (por environment) + `.env.local` | `vercel env add` + **redeploy** | Casi todo: features de runtime, integraciones, rollouts graduales sin tabla |
| **PG rollout flags** (`home_rollout_flags`) | PostgreSQL `greenhouse_serving.home_rollout_flags` | Admin endpoint, **sin redeploy** (resolver con cache 30s) | Variantes de shell/home + kill-switches per-block con scope `user>role>tenant>global` |

> Este ledger cubre **los env-var flags**. Para los PG flags, ver el platform doc. Un mismo dominio puede usar ambos.

## ⚠️ Reglas duras

- **NUNCA** declarar un env-var flag nuevo (`*_ENABLED`) sin agregar una fila a **§ Inventario** y, si queda code-complete pero sin prender, a **§ Pendientes de acción** — en el mismo PR.
- **NUNCA** considerar un flag "rolled out" hasta verlo en el environment correcto (`vercel env ls`) **+ redeploy aplicado**. `code complete` ≠ `operationally complete` (ver Runtime Rollout Completion Gate en `CLAUDE.md`).
- **SIEMPRE** que prendas/apagues un flag en un environment, actualizá la **§ Snapshot** (con fecha) y, si cerró un pendiente, sacá la fila de **§ Pendientes de acción**.
- **NUNCA** confíes en este doc como verdad live para una decisión crítica — la **verdad live es `vercel env ls`**. Este doc es el ledger humano (intención + pendientes + último snapshot conocido).
- Para flags `NEXT_PUBLIC_*`: se hornean en el bundle **en build time** → prenderlos requiere un **build fresco** (push o redeploy con build cache desmarcado), no un redeploy que reusa build.

---

## § Pendientes de acción (la parte que se olvida)

> Flags **code-complete** esperando un flip. Esta es la cola anti-deuda-cognitiva. Sacá la fila cuando el flip esté aplicado + verificado.

| Flag | Owner | Estado actual | Acción pendiente | Nota |
|---|---|---|---|---|
| `RETENTION_POSITION_ENABLED` | TASK-1188 | OFF/default en todos los environments (verdad live: `vercel env ls`) · **code-complete + shadow** | (1) **validación contable** de la cifra de retenciones shadow vs el F29 real (2026-05 = 242.623 CLP, 2026-06 = 138.646 CLP); (2) flip del flag; (3) redeploy del ops-worker si se agrega materialización reactiva. | Línea de retenciones del F29 (child B de TASK-1186). Default OFF → el endpoint `GET /api/finance/retention/monthly-position` marca `enabled:false` (shadow), nadie trata la cifra como oficial. La data shadow existe en `retention_monthly_positions` (materializada manualmente). |
| `NEXA_INTERACTION_LANE_ENABLED` + `NEXT_PUBLIC_NEXA_INTERACTION_LANE_ENABLED` | TASK-1079 | **staging:** env vars SET (2026-06-18), **redeploy pendiente** · prod: OFF | (1) redeploy de staging con **build fresco** (NEXT_PUBLIC se hornea en build) → habilita "Lateral" en el menú de modo de Nexa. (2) prod = decisión del operador tras sign-off | Lane sidecar de Nexa (concepto C). Default-safe: solo habilita la opción, el default sigue siendo el flotante. |
| `NOTION_DUE_DATE_CAPTURE_ENABLED` (M0) + `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (M2) | TASK-921/922 (consumido por TASK-1169 → TASK-1170) | OFF/default por environment (verdad live: `vercel env ls`) | **NO bloquea TASK-1169** (su materializador/reconciliación/signal corren sin flag, shadow). Pero el OTD-imputable member×month tiene cobertura de freeze casi nula sobre la cohorte productiva hasta que estos flags estén ON + se backfillee el M2 shadow sobre la cohorte. Prender + backfill es prerequisito del reloj ≥30d y del cutover **TASK-1170**, no de esta task. | Dependencia de rollout documentada en ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.11 + Handoff. El flip productivo del bono es TASK-1170 (gateado, ≥30d shadow + sign-off). |

| `NOTION_OTD_WRITEBACK_ENABLED` + per-cliente `_EFEONCE` / `_SKY` | TASK-927 | OFF/default en todos los environments (verdad live: `vercel env ls`) · **code complete, rollout pendiente** | Writeback `[GH] OTD` a Notion (display-only, client-facing). Activación gateada al operador: (1) crear la propiedad `[GH] OTD` (select, read-only) en Notion Efeonce + Sky; (2) redeploy del ops-worker (registra el Cloud Scheduler `ops-otd-writeback` + endpoint `/otd/writeback`); (3) flip del flag per-cliente con el gate `delivery.attributable_lateness.shadow_terminal_open` en steady=0. | Display-only, NUNCA toca el bono. Default OFF → cero writes hasta activar. El batch es no-op con flag OFF aunque el job exista. Spec: TASK-927 + OTD_V1 §Delta 2026-06-20. |

_(Agregá acá cualquier flag que dejes code-complete sin prender. Si está vacío, ¡no hay deuda pendiente!)_

---

## § Snapshot de estado por environment

> Snapshot **2026-06-18** vía `vercel env ls`. Un flag **ausente** de una columna = NO seteado = OFF/default en ese environment. **Verdad live: `vercel env ls`.**

| Flag | Production | staging | Preview/dev | Owner |
|---|---|---|---|---|
| `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (+`NEXT_PUBLIC`) | ✅ | ✅ | — | TASK-1085 |
| `NEXA_SYSTEM_PROMPT_V2_ENABLED` | ✅ | ✅ | — | TASK-1124 |
| `NEXA_ACTION_RUNTIME_ENABLED` | ✅ | ✅ | — | TASK-1137 |
| `NEXA_AUTO_ROUTER_ENABLED` | ✅ | ✅ | — | TASK-1091 |
| `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` (`NEXT_PUBLIC`) | ✅ | ✅ | — | TASK-1087 |
| `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED` | — | ✅ | — | TASK-1156 |
| `NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED` | — | ✅ | — | TASK-1124 |
| `NEXA_ANSWERS_CANVAS_LENS_ENABLED` | — | ✅ | — | TASK-1101 |
| `NEXA_INTERACTION_LANE_ENABLED` (+`NEXT_PUBLIC`) | — | ✅ (redeploy pend.) | — | TASK-1079 |
| `NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` | ✅ | ✅ | ✅ | TASK-1078 |
| `KNOWLEDGE_SEARCH_HYBRID_ENABLED` | — | ✅ | — | TASK-1151 |
| `KNOWLEDGE_SEARCH_RERANK_ENABLED` | — | ✅ | — | TASK-1140 |
| `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` | ✅ | — | — | TASK-1094 |
| `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` | ✅ | — | — | TASK-913 |
| `HOME_V2_ENABLED` | — | ✅ | — | TASK-696/780 |
| `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` (+`NEXT_PUBLIC`) | ✅ | ✅ | Preview | TASK-1001/1009 |
| `CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED` | ✅ | — | — | TASK-1001 |
| `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED` | ✅ | ✅ | Preview | TASK-1017 |
| `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` | ✅ | ✅ | Preview | TASK-872 |
| `PAYROLL_PARTICIPATION_WINDOW_ENABLED` | ✅ | ✅ | — | TASK-890 |
| `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` | ✅ | ✅ | — | TASK-891 |
| `LEAVE_PARTICIPATION_AWARE_ENABLED` | ✅ | ✅ | — | TASK-892 |
| `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` | ✅ | ✅ | Preview | TASK-872 |
| `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` | ✅ | ✅ | — | EPIC-013 |
| `FINANCE_BIGQUERY_WRITE_ENABLED` | ✅ | — | — | Finance |
| `FINANCE_RECONCILIATION_AI_ENABLED` | ✅ | — | — | TASK-934 |
| `FINANCE_DISTRIBUTION_AI_ENABLED` | ✅ | — | — | Finance |
| `FINANCE_CORE_MXN_ENABLED` | — | ✅ | Preview | Finance MXN |
| `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED` | — | ✅ | Preview | Finance MXN |
| `FINANCE_MXN_PAYMENT_ORDERS_ENABLED` | — | ✅ | Preview | Finance MXN |
| `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED` | — | ✅ | Preview | Finance/Nubox |
| `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED` | — | ✅ | — | Kortex bridge |
| `KORTEX_COMMAND_*` / `KORTEX_GITHUB_*` (varios) | — | ✅ | — | Kortex bridge |
| `WORKFORCE_CONTRACTING_AI_ENABLED` | — | — | Dev/Preview | TASK-1019 |

---

## § Cómo prender un env-var flag

```bash
# 1) Agregar la var al environment correcto (scalar crudo, sin comillas/newline)
printf %s "true" | vercel env add <FLAG_NAME> <environment> --scope efeonce-7670142f
#    environments: Production | staging | preview | development  (staging = custom env)
#    Si el flag tiene mirror NEXT_PUBLIC_*, agregar AMBAS.

# 2) Redeploy (las env vars NO se toman en caliente):
#    - server var (*_ENABLED): aplica en el próximo deploy.
#    - NEXT_PUBLIC_* : se hornea en build → requiere BUILD FRESCO
#      (push a la rama del env, o Redeploy con "Use existing Build Cache" DESMARCADO).

# 3) Verificar el consumer real (no solo que la var exista):
vercel env ls | grep <FLAG_NAME>
#    + abrir la surface en el environment y confirmar el comportamiento.
```

Para **apagar** (rollback): `vercel env rm <FLAG_NAME> <environment> --scope efeonce-7670142f` + redeploy. (Quitar la var = OFF/default.)

Para los **PG rollout flags** (`home_rollout_flags`): se prenden vía admin endpoint sin redeploy — ver el platform doc.

---

## § Inventario completo (referencia por dominio)

> Todos los `*_ENABLED` referenciados en código. **Default = OFF** salvo nota. Owner = task ancla. El estado live por env está arriba (§ Snapshot) o en `vercel env ls`.

**Nexa / Knowledge** (`src/lib/nexa/flags.ts`, `src/lib/knowledge/search/flags.ts`):
`NEXA_FLOATING_EXPANDABLE_ENABLED` (panel B, TASK-1078) · `NEXA_INTERACTION_LANE_ENABLED` (lane C, TASK-1079) · `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (TASK-1085) · `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED` (TASK-1156) · `NEXA_AUTO_ROUTER_ENABLED` (TASK-1091) · `NEXA_SYSTEM_PROMPT_V2_ENABLED` (TASK-1124) · `NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED` (TASK-1124) · `NEXA_ACTION_RUNTIME_ENABLED` (TASK-1137) · `NEXA_ANSWERS_CANVAS_LENS_ENABLED` (TASK-1101) · `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` (TASK-1087) · `KNOWLEDGE_SEARCH_HYBRID_ENABLED` (TASK-1151) · `KNOWLEDGE_SEARCH_RERANK_ENABLED` (TASK-1140) · `KNOWLEDGE_REACTIVE_EMBEDDING_ENABLED` (TASK-1155) · `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` (TASK-1094). Provider pin (no `*_ENABLED`): `NEXA_PROVIDER`.

**Payroll / Workforce:** `PAYROLL_PARTICIPATION_WINDOW_ENABLED` (TASK-890) · `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (TASK-891) · `LEAVE_PARTICIPATION_AWARE_ENABLED` (TASK-892) · `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` · `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (TASK-872) · `WORKFORCE_ACTIVATION_READINESS_GUARD_ENABLED` · `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` (TASK-872) · `WORKFORCE_CONTRACTING_AI_ENABLED` (TASK-1019).

**Finance:** `FINANCE_BIGQUERY_WRITE_ENABLED` · `FINANCE_RECONCILIATION_AI_ENABLED` (TASK-934) · `FINANCE_DISTRIBUTION_AI_ENABLED` · `FINANCE_CORE_MXN_ENABLED` · `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED` · `FINANCE_MXN_PAYMENT_ORDERS_ENABLED` · `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED` · `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`. **Contractor:** `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` · `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` (EPIC-013).

**ICO / Delivery metrics:** `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED` · `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED` · `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED` · `ATTRIBUTABLE_LATENESS_OTD_ENABLED` · `OTD_CLASSIFIER_GH_SHADOW_ENABLED` · `CT_DAYS_CANONICAL_FORMULA_ENABLED` · `CT_SLO_PCT_METRIC_ENABLED` · `NOTION_RPA_WRITEBACK_ENABLED` · `NOTION_FTR_WRITEBACK_ENABLED` · `NOTION_OTD_WRITEBACK_ENABLED` (+ `_EFEONCE`/`_SKY`, TASK-927) · `NOTION_DUE_DATE_CAPTURE_ENABLED` · `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` (TASK-900…943).

**Client lifecycle / Onboarding:** `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` (+`NEXT_PUBLIC`) · `CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED` · `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` · `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED` · `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED` (TASK-991…1017).

**UI / Design tokens:** `HOME_V2_ENABLED` (TASK-696/780) · `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED` · `NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED` (TASK-1034/1053).

**Kortex bridge / sister platform:** `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED` · `KORTEX_COMMAND_ADAPTER_ENABLED` · `KORTEX_COMMAND_ADMIN_ENABLED` · `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED` · `KORTEX_GITHUB_COMMANDS_ENABLED` · `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED`.

**Mirrors `NEXT_PUBLIC_*` (client-readable)** — pares de un flag server que la UI necesita leer client-side: `NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` · `NEXT_PUBLIC_NEXA_INTERACTION_LANE_ENABLED` · `NEXT_PUBLIC_NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` · `NEXT_PUBLIC_NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` · `NEXT_PUBLIC_CLIENT_LIFECYCLE_ONBOARDING_ENABLED` · `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED` · `NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED`. Recordá: se hornean en build → prenderlos requiere build fresco.

> Para regenerar/auditar el inventario desde código + cruzarlo contra Vercel y este ledger:
> **`pnpm flags:audit`** (resalta: en código sin registrar · ON en staging pero no prod · OFF everywhere · en Vercel sin código). `--strict` falla si hay flags en código sin registrar acá. Script: `scripts/ci/feature-flags-audit.mjs`.

---

## § Mantenimiento

Este ledger es **doc viva**. Al cerrar una task con flag:

1. Agregá el flag al **§ Inventario** (dominio correcto) en el PR de la feature.
2. Si queda code-complete sin prender → fila en **§ Pendientes de acción**.
3. Al prender/apagar en cualquier env → actualizá **§ Snapshot** con fecha y, si cerraste un pendiente, remové su fila.
4. Refrescá el snapshot completo periódicamente con `vercel env ls` (la verdad live).

**Idea de follow-up (no implementada):** un `pnpm flags:audit` que cruce los flags de código vs `vercel env ls` y resalte "en staging pero no en prod" / "en código pero sin registrar acá" — automatizaría la detección de deuda. Si se materializa, este doc se vuelve el output humano de ese script.
