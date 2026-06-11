# TASK-1087 — Nexa Contextual Prompts Tier 2 (data-aware)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai|content`
- Blocked by: `none` (TASK-1078 Tier 1 + Tier 1.5 ya en `develop` local)
- Branch: `task/TASK-1087-nexa-contextual-prompts-tier-2`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy los prompts sugeridos del chat flotante de Nexa son **plantillas curadas por familia de ruta** (Tier 1) con el **nombre real de la entidad interpolado** (Tier 1.5, ej. "¿Cómo viene Grupo Berel este mes?"). Tier 2 los vuelve **data-aware**: en vez de plantillas fijas, sugiere preguntas basadas en **señales reales** de la entidad/pantalla (anomalías, pendientes, KPIs en rojo) — ej. "2 cuentas cayeron >10% este mes, ¿las vemos?", "Quedan 3 finiquitos por ratificar antes del cierre".

## Why This Task Exists

Tier 1/1.5 (TASK-1078) cierran la capa **frontend determinística** (resolver por ruta + interpolación del nombre que la página declara vía `NexaContextScope`). El gap real: los prompts no miran el estado del negocio — sugieren lo mismo aunque el cliente esté sano o en riesgo. El valor de un asistente proactivo está en arrancar la conversación desde lo que **de verdad** pasa (la anomalía, el pendiente, el número en rojo), no desde una plantilla. Eso requiere readers de dominio + un contrato server-side, fuera del alcance del resolver frontend.

## Goal

- Endpoint server-side `GET /api/nexa/suggested-prompts?context=<key>&entityId=<id>` que devuelva prompts derivados de señales reales (no plantillas fijas).
- Reusar readers canónicos existentes por dominio (NUNCA recomputar inline): Nexa Insights / anomalías (ICO `ai_signals_current`), pendientes de cierre (payroll/finiquitos), KPIs en rojo (account-360 / finance), churn risk (Commercial Health).
- Allowlist estricta de contexto al prompt: NUNCA datos sensibles (montos crudos de personas, tokens, PII) al texto del prompt — solo el "gancho" + un id para que Nexa resuelva el detalle con sus tools.
- Degradación honesta: si el reader falla o no hay señal, caer a los prompts Tier 1/1.5 (no romper, no inventar).
- Gateado por capability/rol como el resto de Nexa; cache razonable (las señales no cambian por segundo).
- Flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` default `false` (cutover tras validación).

## Dependencies & Impact

- **Depende de:** readers de dominio ya existentes (ICO `ai_signals_current`/Nexa Insights, Commercial Health, account-360 facets, payroll/finiquitos pendientes). Composer thin estilo TASK-1009 (componer readers, no recomputar).
- **Impacta a:** `src/lib/nexa/suggested-prompts.ts` (el resolver frontend pasa a fallback Tier 1/1.5 cuando el endpoint no responde o el flag está off), `NexaFloatingPanel` (consume el endpoint), `NexaContextScope` (sigue declarando entityId/contextKey).
- **Archivos owned:** `src/app/api/nexa/suggested-prompts/route.ts` (nuevo), `src/lib/nexa/suggested-prompts-data-aware.ts` (nuevo, server-only composer), `src/lib/nexa/suggested-prompts.ts` (extend: fallback layering).

## Detailed Spec (sketch)

- **Contrato:** versionado `nexa-suggested-prompts.v1`. Response: `{ context, entityName?, prompts: Array<{ text, hint?: 'anomaly'|'pending'|'risk'|'kpi', entityRef?: string }>, source: 'data_aware' | 'template_fallback' }`.
- **Composer server-only** (patrón TASK-1009 / TASK-835): resuelve scope (org→client→space) una vez + corre los readers en paralelo con `withSourceTimeout` + degradación honesta (`SourceResult<T>`). Un reader caído NO rompe — baja a fallback.
- **Allowlist de contexto** (arch §11 Workforce Contracting AI mold): `ALLOWED_FACT_CODES` — nunca salario/bank/PII al texto. El prompt lleva el gancho + `entityRef` (id), Nexa resuelve el detalle con sus tools.
- **Anti-oracle:** filtrar por subject (mismo principio que account-360 facets) — un prompt nunca revela existencia de algo que el usuario no puede ver.
- **Reliability signal** opcional `nexa.suggested_prompts.data_aware_degraded` (steady=0) si se quiere observar la tasa de fallback.

## Verification

- Endpoint devuelve prompts data-aware para una entidad con señales reales (ej. un cliente con anomalía ICO viva); fallback a Tier 1/1.5 cuando no hay señal o el flag está off.
- GVC: abrir Nexa en una ficha de cliente con anomalía → el primer prompt refleja la anomalía real (no la plantilla).
- `pnpm local:check` + tests focales del composer (degradación + allowlist + anti-oracle).
- Flag default `false` confirmado en todos los entornos antes de declarar operativo.

## Notes

- Dirección futura (no en V1): alinear el contrato de contexto con **WebMCP `navigator.modelContext`** — la página expone su contexto al asistente y Nexa lo consume. Hoy basta el composer server-side + `NexaContextScope`.
- Origen: follow-up Tier 2 de TASK-1078 (Nexa floating chat). Tier 1/1.5 ya cerrados.
