# Experiencia — Prompts sugeridos contextuales (Tier 1 / 1.5 / 2)

> **Vista Nexa Intelligence.** Los prompts sugeridos son los **starters** del empty hero del chat
> flotante de Nexa (`NexaFloatingPanel` → `NexaEmptyHero`). NO son la inteligencia conversacional
> (esa vive en las capas system-prompt / behavior / knowledge): son el **gancho** que arranca la
> conversación. Esta capa documenta cómo se eligen.

## Qué es

Cuando el usuario abre el chat flotante sin conversación, ve una grilla de prompts sugeridos. Hay
tres tiers, cada uno más rico que el anterior, con **degradación honesta** entre ellos:

| Tier | Qué hace | Fuente | Estado |
|---|---|---|---|
| **Tier 1** (TASK-1078) | Set curado por **familia de ruta** (general/finance/client/payroll) | `resolveNexaPromptContext` (frontend, por `pathname`) | vivo, default |
| **Tier 1.5** (TASK-1078) | Interpola el **nombre real** de la entidad (ej. "¿Cómo viene Grupo Berel este mes?") | la página declara `entityName` vía `NexaContextScope` | vivo, default |
| **Tier 2** (TASK-1087) | Prompts **data-aware**: derivados de **señales reales** (anomalías / pendientes / KPIs en rojo) | endpoint `GET /api/nexa/suggested-prompts` → composer que reusa el reader compact-signals | **flag-gated**, default OFF |

## Cómo decide (degradación en cascada)

```text
flag OFF / sin entityId / contexto ≠ client / sin señal real / reader degradado / NotFound
   → Tier 1/1.5 (plantillas)               ← SIEMPRE el fallback honesto, nunca rompe, nunca inventa
flag ON + entityId + contexto client + señal real
   → Tier 2 (data-aware)                    ← reemplaza la grilla por los ganchos derivados
```

- **Frontend (panel):** `useDataAwareSuggestedPrompts(basePromptContext, pageContext)` — hook aditivo.
  Con el flag off o sin `entityId`, devuelve los prompts de plantilla **intactos** (byte-idéntico).
- **Endpoint:** `GET /api/nexa/suggested-prompts?context=<key>&entityId=<id>` — auth por `requireTenantContext`
  (subject del tenant en sesión, anti-tamper). **NUNCA 5xx**: siempre 200 con `source: 'data_aware' | 'template_fallback'`.
- **Composer (server-only):** `resolveDataAwareSuggestedPrompts` → reusa
  `readOrganizationWorkspaceCompactSignalsSafely` (ya compuesto, degradación-honesta, subject-gated)
  y mapea sus señales con `buildDataAwarePromptsFromCompactSignals` (mapper **puro**, allowlist).

## Contrato (`nexa-suggested-prompts.v1`)

SSOT de tipos: `src/lib/nexa/suggested-prompts-contract.ts` (puro, cliente+servidor — para que el
hook lo consuma sin arrastrar el composer server-only).

```ts
{ contractVersion: 'nexa-suggested-prompts.v1',
  context, entityName?,
  prompts: Array<{ text, hint?: 'anomaly'|'pending'|'risk'|'kpi', entityRef? }>,
  source: 'data_aware' | 'template_fallback' }
```

## Reglas duras

- **Allowlist categórica:** el texto del prompt se arma SOLO con la **categoría** de la señal
  (`facet` + `severidad`) + el **nombre** de la entidad (que el usuario ya ve). **NUNCA** echa
  `driver.value` ni `signal.body` (pueden traer montos crudos / PII). El detalle lo resuelve Nexa
  con sus tools; el `entityRef` lleva el id (forward-compat WebMCP `navigator.modelContext`).
- **Anti-oracle:** el reader compact-signals ya filtra drivers/signals/nextActions por los
  `visibleFacets` del subject → una señal de un facet no visible nunca origina un prompt. Un
  `NotFound` (el subject no ve la entidad) degrada a `template_fallback`, nunca revela existencia.
- **V1 solo contexto `client`** (org workspace, único que declara `entityId` hoy). `finance`/`payroll`/`general`
  caen a Tier 1/1.5 hasta que su página declare `entityId` + se wiree su resolver — el composer es
  un registro extensible por contexto.
- **Copy es-CL tuteo:** las plantillas viven en `GH_NEXA.floating.data_aware_prompts` (`src/lib/copy/nexa.ts`).

## Flag de rollout

`NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` (default **OFF**; con OFF, byte-idéntico a Tier 1/1.5).
NEXT_PUBLIC mirror para que el panel decida si hace el fetch; el endpoint también gatea server-side
(defense in depth). Rollout = decisión del operador tras validar con un cliente con señal viva.

## Código

- Frontend: `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx` (consume) ·
  `src/lib/nexa/use-data-aware-suggested-prompts.ts` (hook) · `src/lib/nexa/nexa-page-context.tsx`
  (`NexaContextScope` declara `entityId`/`entityKind`) · `src/lib/nexa/suggested-prompts.ts` (Tier 1/1.5).
- Backend: `src/app/api/nexa/suggested-prompts/route.ts` · `src/lib/nexa/suggested-prompts-data-aware.ts`
  (composer) · `src/lib/nexa/suggested-prompts-contract.ts` (contrato puro).
- Flag: `src/lib/nexa/flags.ts` → `isNexaSuggestedPromptsDataAwareEnabled()`.

## Procedencia

TASK-1078 (Tier 1/1.5 — floating chat + `NexaContextScope`) · **TASK-1087 (Tier 2 — data-aware)**.
