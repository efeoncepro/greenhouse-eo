# EPIC-025 — Vivir el Why: co-creación + educación del cliente en el producto

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-025-vivir-el-why-cocreacion-educacion-cliente`

## Summary

El **Why de marca** de Efeonce (*no te entregamos crecimiento, lo construimos contigo —y te dejamos más capaz de sostenerlo*; SSOT `docs/context/09_marca-agencia.md` → §El Golden Circle) tiene tres pilares: **co-creación · educación · integralidad**. Hoy el producto cumple bien la *cara de "ver"* (transparencia radical, ~90%), pero deja sin construir las caras de **"actuar juntos"** (co-creación) y **"hacer más capaz"** (educación) *para el cliente dentro del portal*. Este epic coordina el programa que hace que el Why se **viva** en el producto —no solo se declare— cerrando esas dos caras, reusando las plantillas que ya existen en el runtime.

## Why This Epic Exists

Dos escaneos del repo (2026-07-08) confirmaron una asimetría estructural: **la inteligencia que co-crea y educa apunta hacia adentro (operadores) y hacia afuera (prospectos), pero no hacia el cliente que pagó por vivir el Why.**

- **Co-creación (hoy solo "ver"):** el portal cliente es un plano de observación —10 capabilities `client_*` todas `.read`— con exactamente **dos** verbos reales (generar export, disparar un run AEO de su org). Aprobar/rechazar entregables, pedir variantes, mandar briefs y dar feedback **no tienen ni schema, ni command, ni capability, ni ruta**: siguen viviendo fuera de Greenhouse (Frame.io, Notion, email). El context pack ya lo marca como el **gap #1** (self-service del cliente ~55%, `docs/context/14`).
- **Educación (hoy promesa + outbound):** el mejor motor de coaching del producto —**Nexa Insights** (causa-raíz + acción recomendada)— está **cerrado al tenant externo en V1**; Nexa opera como Q&A reactivo con el prompt V2/coach y el retrieval de conocimiento **default-OFF**; y no existe ninguna señal de que el cliente se vuelva **más capaz** con el tiempo (el BCS se calcula puntual, sin tendencia por cliente; cero literacy/adopción).

Esto no cabe en una sola task: cruza client-portal, entitlements, Nexa, ICO/brief-clarity, Full API Parity y experiencia de cliente. Es un **programa de visión de producto**: el norte al que el runtime debe converger para que el Why sea vivencia. La buena noticia —y la razón de que sea un epic de *extensión*, no de invención— es que **las plantillas ya existen**; falta apuntarlas al cliente.

## Outcome

- El cliente **actúa dentro del sistema**: aprueba/rechaza entregables, pide trabajo/variantes y manda briefs desde el portal, por contrato gobernado (no por email/Frame.io/Notion).
- El cliente **se vuelve más capaz dentro del producto**: recibe sus propios insights de delivery (por qué + qué hacer) y un Nexa en modo coach, no solo Q&A.
- La promesa *"más capaz"* queda **medida y mostrada**: tendencia de calidad de brief + adopción por cliente, visible para el cliente (el Why probado con dato, como manda la regla anti-humo del Golden Circle).
- El gap #1 (self-service del cliente) baja de ~55% hacia "aprobar + solicitar", cerrando la cara de co-creación del Why.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` + `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (todo verbo nuevo = capability + chokepoint + acción gobernada `propose→confirm→execute`)
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (BFF / anti-corruption layer; el cliente es cliente de primitives server-side)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capabilities `client_portal.*` per-org; grant + coverage en el mismo PR)
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (Nexa: el LLM no escribe directo; muta sólo en el endpoint de confirmación humana)
- SSOT del Why: `docs/context/09_marca-agencia.md` → §El Golden Circle de Efeonce.

## Child Tasks

> Aún **por autorar** (via `greenhouse-task-planner`). Nombres/roles propuestos, agrupados por pilar del Why.

**Co-creación — el cliente actúa:**
- `TASK-###` — **Deliverable feedback & approval loop (client-facing, gobernado).** Aprobar/rechazar/pedir variantes de un entregable desde el portal. **Reusa la plantilla del AEO run gobernado (TASK-1277)**: capability fina `client_portal.deliverable.*` + chokepoint + `propose→confirm→execute` + audit/outbox. Trae adentro la aprobación que hoy vive en Frame.io (y que alimenta el FTR%).
- `TASK-###` — **Client request/brief intake (client-facing).** El cliente manda briefs/solicitudes desde el portal (aggregate + command + capability), engancha la cola de trabajo interna.

**Educación — el cliente se vuelve más capaz:**
- `TASK-###` — **Abrir Nexa Insights al tenant externo (client-scoped).** Exponer al cliente sus propios insights de delivery (causa-raíz + acción recomendada) que hoy excluyen al tenant externo en V1, con scope/entitlement per-org.
- `TASK-###` — **Nexa client coach rollout.** Encender el prompt V2 + retrieval de conocimiento (flags default-OFF), enmarcar Nexa como coach para el cliente (explicar su operación, guiar próxima acción), respetando el runtime de acción gobernada.

**Integralidad / "más capaz" medido:**
- `TASK-###` — **Client capability signal.** Convertir el BCS en **tendencia por cliente** + señal de literacy/adopción, y **mostrársela al cliente** ("tus briefs se afilaron; N rondas ahorradas"). Cierra el loop de la promesa *"más capaz"*.

## Existing Related Work

- **`TASK-1277`** — AEO run gobernado client-facing (`growth.ai_visibility.run.portal`): **la plantilla canónica** de acción gobernada del cliente a replicar.
- **Nexa Insights** (`src/lib/nexa/insight-focus.ts`, `NexaInsightDetailView`, TASK-947): el motor de coaching a abrir al cliente.
- **`brief-clarity.ts`** (BCS): la métrica de capacidad a volver longitudinal.
- **Gap #1 declarado:** `docs/context/14_modelo-negocio-asaas.md` (self-service 55%), `00_INDEX.md` (gap self-service), `10_experiencia-cliente.md` (journey).
- Client portal domain: `src/lib/client-portal/*` (BFF read-only hoy), `src/config/entitlements-catalog.ts` (bloque client-facing `.read`).

## Exit Criteria

- [ ] El cliente puede **aprobar/rechazar un entregable** desde el portal, por acción gobernada (capability + chokepoint + audit), sin email/Frame.io.
- [ ] El cliente puede **mandar un brief/solicitud** desde el portal.
- [ ] El cliente ve **sus propios insights de delivery** (causa-raíz + acción) dentro del portal.
- [ ] Nexa opera como **coach client-facing** (no solo Q&A), con los flags correspondientes ON en producción y verificados.
- [ ] Existe y se muestra al cliente una **señal longitudinal de capacidad** (tendencia BCS/adopción por cliente).
- [ ] Todo verbo nuevo cumple **Full API Parity** (capability + grant + coverage + contrato gobernado; Nexa/MCP lo operan por construcción).

## Non-goals

- No mover la aprobación de contenido a un producto nuevo: se **trae adentro** de Greenhouse reusando patrones existentes.
- No construir "algo Nexa-específico": Nexa es un consumer más del contrato gobernado (Full API Parity).
- No romper el aislamiento multi-tenant ni exponer datos cross-tenant.
- No es trabajo del sitio público (eso es EPIC-019 / PDR-010/011); este epic es **producto/portal**.
- No reemplaza el Runtime Rollout Completion Gate: cada task cierra con rollout real, no "code complete".
