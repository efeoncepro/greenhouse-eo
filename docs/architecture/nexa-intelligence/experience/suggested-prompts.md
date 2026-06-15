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

## Delta TASK-1139 — enriquecimiento (Tier 2.1)

- **Affordance por `hint`:** la card de un prompt data-aware muestra un ícono Tabler coloreado por categoría (`anomaly→alert-triangle/warning`, `risk→flame/error`, `pending→clock/info`, `kpi→chart-dots/primary`) vía MUI palette (token, no HEX). Los prompts de plantilla (Tier 1/1.5) no traen `hint` → sin ícono. El hook devuelve `{ text, hint? }` (antes `string[]`).
- **Entrypoint correcto:** `NexaPageContextValue` declara `entrypoint?: 'agency' | 'finance'`; el shell lo deriva de `projection.entrypointContext`; el hook lo envía como `?entrypoint=`; el composer lo pasa al reader → la projection usa la visibilidad de facets correcta (finance vs agency).
- **Cache de ruta:** el composer cachea in-memory (TTL 30s, keyed `subject:context:entity:entrypoint`) **solo** los resultados `data_aware`. NO cachea `template_fallback` (barato + evita fallback stale tras un flip). Helper de test `__clearDataAwareSuggestedPromptsCache`.
- **Reliability (re-scope honesto):** un signal de *fallback-rate* dedicado NO se construyó — `getCloudSentryIncidents` solo filtra por `domain` (no por sub-tag `source`), así que un signal separable barato no existe. Las fallas inesperadas del path ya ruedan al rollup de incidentes del dominio `agency` (vía `captureWithDomain('agency', { source: 'nexa_suggested_prompts_*' })`). El signal de tasa de uso real (`data_aware` vs `template_fallback` por turno) pertenece a **TASK-1129** (telemetría por turno), su fuente correcta.

## Delta TASK-1141 — registry de resolvers + contexto `personal` (Mi espacio)

- **Composer = registro `context → resolver`:** `resolveDataAwareSuggestedPrompts` despacha a `DATA_AWARE_RESOLVERS[context]`. Agregar una superficie data-aware = agregar un resolver (cero cambio del orquestador). El resolver `client` = la lógica org de TASK-1087 (extraída, byte-idéntica — tests anti-regresión verdes). Un contexto sin resolver → `template_fallback`.
- **Contexto `personal` (Mi espacio, `/my/*`):** la layout `/my` declara `NexaContextScope entityKind='member' entityId={tenant.memberId} contextKey='personal'`. El resolver `personal` (`data-aware-personal-resolver.ts`, server-only) arranca los prompts desde los **pendientes del propio colaborador** — V1: vacaciones propias en curso + aprobaciones del equipo esperando (reusa `listLeaveRequestsFromPostgres`, cero SQL nuevo).
- **Anti-oracle (trivial):** el resolver `personal` usa **SIEMPRE** `subject.memberId` (verdad de sesión), **NUNCA** el `entityId` del cliente → un usuario no puede pedir los pendientes de otro. El `tenant` viaja al composer desde la sesión (anti-tamper), no del query.
- **`NexaPageEntityKind`** += `member`; **`NexaPromptContextKey`** += `personal`; el hook ya no gatea por contexto (envía `entityKind`, el server decide vía el registry).
- **Follow-ups del resolver `personal`:** ficha incompleta (`workforce_intake_status`) + liquidación lista (payslip del mes) — readers a sumar; el copy ya existe (`personal_intake_incomplete`/`personal_payslip_ready`).

## Delta TASK-1143 — contexto `finance` (Finanzas global)

- **Resolver `finance`** (`data-aware-finance-resolver.ts`, server-only) en el registry: arranca los prompts del dashboard `/finance` desde las anomalías del ledger (descuadre / saldos desactualizados / gastos sin anclar / chequeos degradados) reusando `getFinanceLedgerHealth` (cero recompute). `entityKind='finance_scope'`, `entityId='finance-global'` (sentinel — el scope es el tenant). **Anti-oracle:** gatea por el route_group `finance` del subject (no revela anomalías financieras a quien no las ve). Counts/estados, NUNCA montos. Distinto de la **ficha de cliente en Finanzas** (`/finance/clients/[id]`), que ya es data-aware vía contexto `client`.

## Delta TASK-1144 — `personal` suma performance (ICO)

- El resolver `personal` ahora compone también la **performance del colaborador** (métricas ICO propias) vía `readMemberMetrics(memberId, year, month)`: `context.overdueTasks > 0` → "Tienes N entregables atrasados" (anomaly); con actividad ICO sin atrasos → "¿Revisamos tu desempeño?" (kpi). Las 3 fuentes (vacaciones + ICO) corren con `Promise.allSettled` → **degradación independiente** (si el ICO en BigQuery falla, las vacaciones siguen).
- **Pago/liquidación: follow-up.** El reader de histórico (`pgGetMemberPayrollEntries`) no distingue recencia ni expone el estado del período en la entry → una señal "liquidación del mes lista" honesta necesita una query nueva ("liquidación exportada del período actual", validada contra PG). El copy `personal_payslip_ready` queda stubbeado para ese follow-up. No se shippeó una señal always-on/imprecisa.

## Procedencia

TASK-1078 (Tier 1/1.5 — floating chat + `NexaContextScope`) · **TASK-1087 (Tier 2 — data-aware)** · **TASK-1139 (Tier 2.1 — hint UI + entrypoint + cache)** · **TASK-1141 (registry + contexto `personal`)** · **TASK-1143 (contexto `finance`)** · **TASK-1144 (`personal` + performance ICO)**.
