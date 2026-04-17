# Greenhouse — Nexa Expansion Architecture

> **Versión:** 1.0
> **Creado:** 2026-04-17 por agente con Julio Reyes
> **Estado:** Diseño
> **Relaciona:** `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`, `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`, `GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`

## Propósito

Definir la siguiente etapa de Nexa después del corte ICO + Finance + Weekly Digest. El foco no es agregar más superficies por sumar — es cerrar los 4 gaps que limitan el valor real de lo ya construido:

1. **Nexa es interno** — el cliente, que justifica el spend, no lo ve.
2. **Los insights describen, no actúan** — no hay CTAs, cada insight es lectura pasiva.
3. **Los dominios no se cruzan** — Finance, ICO y Capacity operan en silos a pesar de que la causalidad operativa es cross-domain.
4. **La distribución es 100% pull** — nadie avisa al usuario; hay que navegar al portal o abrir el email semanal.

Esta capa de expansión declara los contratos, engines y superficies que cierran esos gaps, y deja explícito qué sigue siendo out of scope.

## Contexto: estado actual de Nexa

### Superficies activas

| Surface | Scope | Lectura | Engine |
|---------|-------|---------|--------|
| Home / Pulse (chat + insights) | Cross-Space top insights | `readTopAiLlmEnrichments` | ICO |
| Agency ICO tab | Cross-Space | `readAgencyAiLlmSummary` | ICO |
| Space 360 Overview | Space-scoped | `readSpaceAiLlmSummary` | ICO |
| Person 360 Activity | Member-scoped | `readMemberAiLlmSummary` | ICO |
| Finance Intelligence | Portfolio + client | `readFinanceAiLlmSummary`, `readClientFinanceAiLlmSummary` | Finance |
| Weekly Executive Digest (email) | Cross-Space ICO-first | `build-weekly-digest.ts` | ICO |

### Engines maduros

- **ICO Signal Engine** — Z-score sobre `ico_organization_metrics` (otd_pct, rpa_avg, ftr_pct). Trigger diario vía Cloud Run `ops-worker`.
- **Finance Signal Engine** — Z-score sobre `client_economics` (net_margin_pct, gross_margin_pct, revenue/costs). Trigger on-demand vía `/finance/materialize-signals`.

### Stack canónico que todos los engines comparten

- Detector (per-domain) → `*_ai_signals` PostgreSQL
- LLM enrichment worker (Gemini 2.5 Flash, prompt domain-aware) → `*_ai_signal_enrichments`
- Readers tipados por scope (portfolio, entity, period)
- UI: `NexaInsightsBlock` con @mention parser
- Outbox events: `<domain>.ai_signals.materialized`, `<domain>.ai_llm_enrichments.materialized`

Este stack es replicable. Cualquier dominio con serie temporal mensual y métricas numéricas puede sumar un engine siguiendo el mismo patrón en ~1 task.

## Programa de expansión

La expansión se divide en 3 ejes independientes. Cada eje puede avanzar en paralelo con los otros.

### Eje 1 — Nuevos dominios con engine propio

Dominios que hoy tienen serie temporal, datos estructurados y decisiones operativas mensuales, pero no tienen signal engine:

- **Payroll** — cierre de período genera anomalías (overtime spikes, reliquidaciones, diferencias vs baseline). Hoy se revisa a ojo en ceremonia manual. Engine replicado de Finance sobre `greenhouse_payroll.*`.
- **Staff Augmentation** — assignment-level economics (margen por placement, riesgo de renewal). Engine usando el detector Finance scoped a `assignment_id` en vez de `client_id`.

No incluidos en esta lane pero candidatos a roadmap posterior:

- Capacity (carga de equipo, utilización, sobre-asignación)
- Delivery sprint-level (FTR por sprint, ciclo cierre)
- Commercial pipeline (HubSpot velocity, product mix)

### Eje 2 — Superficies de alto valor

Surfaces que consumen los engines existentes pero en audiencia o forma nueva:

- **Client Portal Pulse (client-facing)** — la misma data de insights pero scoped al client_id del portal cliente, con tono adaptado a audiencia externa. Reuso completo del stack Finance + ICO. Convierte Nexa de cost center interno a artefacto comercial visible al cliente enterprise.

### Eje 3 — Evoluciones transversales

No son engines ni surfaces nuevas — son capacidades que afectan todo lo existente y multiplican el valor de lo ya construido:

- **Insights accionables (CTAs)** — extensión del contrato de enrichments + del `NexaInsightsBlock` para incluir `recommendedAction.cta` con deep-link prefilled. Cierra el gap entre "ver el insight" y "hacer algo".
- **Distribución push (Slack / Teams)** — consumer adicional del outbox que empuja `severity='critical'` a canales operativos. Multiplica el ROI de todos los engines existentes.

### Follow-ons (a derivar cuando el core esté operativo)

Capacidades con valor alto pero que dependen de estabilidad de los ejes 1-3:

- **Cross-domain causality** — LLM prompt que recibe enrichments de 2+ dominios scoped al mismo entity/period y genera una narrativa meta ("Margen baja porque OTD cayó porque Capacity se sobrecargó"). Diferenciador técnico real vs herramientas single-domain.
- **Contextual chat per domain** — `NexaThread` acepta `domainContext` y el service carga tools scoped a esa vista. Convierte el chat generalista en copilot por surface.
- **Daily role-based briefing** — email o in-app diario con brief accionable por rol (ops lead, finance lead, HR admin), distinto del semanal ejecutivo.
- **Capacity Signal Engine** — ya mencionado en Tier 2 del roadmap de `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`.

## Contratos nuevos

### Contrato: `recommendedAction.cta` (Eje 3 — insights accionables)

Extensión del schema de enrichments. Agrega un campo estructurado opcional que el renderer UI convierte en botón/link:

```typescript
type RecommendedActionCta = {
  label: string                // "Abrir planificación"
  surface: 'capacity' | 'payroll' | 'finance' | 'agency' | 'people' | ...
  route: string                // '/agency/capacity?space_id=X'
  prefill?: Record<string, unknown>  // contexto pre-seleccionado
}

type EnrichmentRecord = {
  // ... campos existentes
  recommendedActionCta?: RecommendedActionCta | null
}
```

Reglas:

- `recommendedActionCta` siempre es **opcional**. El LLM no inventa routes — el prompt solo produce la narrativa; el builder deriva el CTA desde la metadata estructurada del signal (metric_id + scope + severity → template de CTA).
- Las CTAs son deep-links read-only o abren dialogs pre-filled. **No ejecutan mutaciones automáticas** (follow the existing `advisory-only` principle).
- UI: `NexaInsightsBlock` renderiza un button secundario al lado del `recommendedAction` cuando hay CTA; en email HTML renderiza un `<a>` con estilo consistente.

### Contrato: `client_scope` (Eje 2 — Client Portal Nexa)

Un insight client-facing requiere:

1. **Scope duro** — el reader nunca devuelve insights de otro `client_id`.
2. **Tone audiencia externa** — prompt dedicado (`finance_signal_client_facing_v1`, `ico_signal_client_facing_v1`) que omite detalles operativos internos (métricas de team members, root cause internal, mentions a `member:MEMBER_ID`).
3. **Redacción de mentions** — las mentions `member` y `space` no aparecen en insights client-facing; solo `client` y agregados.
4. **Pre-aprobación opcional** — flag `client_visible` en el enrichment. Un insight no es client-facing por default; el LLM worker decide según prompt, y ops puede marcarlo false si detecta info sensible.

```sql
ALTER TABLE greenhouse_serving.finance_ai_signal_enrichments
  ADD COLUMN client_visible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN client_facing_narrative TEXT NULL;
-- similar en ico_ai_signal_enrichments
```

Reader nuevo: `readClientFacingEnrichments(clientId, period)` que filtra `client_visible = TRUE` y devuelve `client_facing_narrative` en vez del narrative interno.

### Contrato: `critical_push` (Eje 3 — distribución push)

Un consumer nuevo del outbox reacciona a eventos `*.ai_llm_enrichments.materialized` con `severity='critical'`:

```
outbox event → dispatcher → Slack webhook / Teams connector
```

Reglas:

- Solo severity `critical`. `warning`/`info` van al digest semanal, no a push.
- Deduplicación: un mismo `signal_id` no se empuja dos veces aunque el enrichment se regenere.
- Routing por canal configurable: por dominio (ICO → #ops, Finance → #finance) y por entity (space X → #space-X si existe).
- Rate limit: máx N pushes por canal por hora para evitar spam.
- Payload: narrativa corta + link a la surface con el insight expandido.

## Dependencias entre ejes

- Eje 1 (nuevos engines) es independiente de los otros dos. Cada nuevo engine agrega volumen de signals sin requerir cambios en UI ni distribución.
- Eje 2 (Client Portal) depende de que al menos un engine esté maduro — hoy Finance + ICO cumplen.
- Eje 3 (actionable + push) beneficia a TODO lo existente retroactivamente. Cuanto antes se haga, más ROI multiplicado.

**Recomendación de secuencia:**

1. Eje 3 primero (actionable CTAs + push crítico) porque multiplica lo existente. Effort medio, impacto cross-cutting.
2. Eje 2 en paralelo (Client Portal) — es el mayor ROI de negocio.
3. Eje 1 incremental (Payroll, Staff Aug) — ROI operativo mensual.

## Out of scope explícito

- **Ejecución automática de acciones** desde insights. Nexa sigue siendo advisory-only por diseño (ver `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`). Las CTAs son deep-links, no mutaciones.
- **LLM sin ground truth** — todos los insights siguen originándose de un signal detectado sobre data estructurada. No se genera narrativa "libre" sin baseline numérico.
- **Cross-tenant visibility** — un cliente nunca ve insights de otro cliente. El reader client-facing valida `client_id` contra la sesión.
- **Real-time streaming** — los signals siguen siendo batch diario/mensual. El push es sobre eventos materializados, no sobre detección continua.
- **Adición de Nexa a superficies con baja densidad de señal** (config, admin forms, settings). No se diluye el componente.

## Governance y ownership

- **Engines** (Eje 1) son propiedad del dominio. Payroll Signal Engine → lo implementa HR/Payroll. Staff Aug → Agency.
- **Client Portal Pulse** (Eje 2) es propiedad compartida Agency + Finance + UX.
- **CTAs y push** (Eje 3) son propiedad de la capa Nexa. Cambios al contrato se revisan contra todos los engines consumidores.
- **Prompts LLM** versionados con `prompt_version` + `prompt_hash` como el resto. Prompt client-facing requiere review de UX writing (regla existente en `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`).

## Roadmap de implementación

### Programa inicial (tasks creadas)

- `TASK-432` — Client Portal Nexa Pulse (Eje 2, valor comercial)
- `TASK-433` — Payroll Signal Engine (Eje 1, valor operativo mensual)
- `TASK-434` — Staff Augmentation Signal Engine (Eje 1, revenue protection)
- `TASK-435` — Nexa Actionable Insights / CTA Contract (Eje 3, multiplicador)
- `TASK-436` — Nexa Critical Push Distribution (Eje 3, multiplicador de alcance)

### Follow-ons (a crear cuando el core esté operativo)

- Cross-domain causality engine
- Contextual chat per domain (extension de TASK-110)
- Daily role-based briefing (complemento del weekly digest)
- Capacity Signal Engine (Tier 2 ya mencionado en el roadmap base)

## Métricas de éxito

El programa es exitoso si, medido 90 días después del corte de Eje 2 + Eje 3:

- Al menos 1 QBR con cliente enterprise donde el Client Portal Pulse se usó como artefacto de presentación.
- >50% de signals `critical` fueron leídos por un humano dentro de 24h (hoy: dependemos de que abra el portal).
- >20% de insights con CTA tuvieron al menos un click hacia la surface de destino.
- Al menos 1 decisión operativa documentada derivada de un insight cross-domain.

Si estos números no se mueven, el programa no está entregando valor y hay que revisitar el diseño antes de sumar más ejes.
