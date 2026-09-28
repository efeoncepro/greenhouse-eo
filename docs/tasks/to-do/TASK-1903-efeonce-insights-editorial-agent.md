# TASK-1903 — Efeonce Insights: agente redactor de informes de clientes

## Delta 2026-09-28 — operable por MCP en dos modos (decisión del operador)

- El operador pidió que el agente redactor sea **operable por MCP en ambos modos**: (1) **operar el redactor de
  Greenhouse** —pedir la propuesta, leerla y aceptar o rechazar campo por campo— y (2) **autor externo**: un agente
  conectado al MCP (Claude, ChatGPT u otro cliente) lee el contexto permitido y **envía él mismo** la propuesta, que
  pasa por las mismas validaciones y la misma aceptación humana. Se agregan el Slice 4 (autor externo), los
  contratos `InsightAgentContextV1` y `submitAgentProposal`, las tools MCP con sus banderas del manifiesto, y
  decisiones nuevas del Slice 0 (confirmación humana por MCP y salida de datos a un modelo externo). La Cartera
  pasa a ser el Slice 5 y la verificación, el Slice 6.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-045`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `insights`
- Blocked by: `none` (el contrato editorial v2 y los catálogos premium quedaron completos y en producción el 2026-09-26)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un agente con capacidades agénticas (usa herramientas, trabaja en varios pasos y verifica su salida) redacta la
parte de un informe de Insights que hoy nadie produce: qué significa cada hallazgo para el cliente, el próximo paso,
la decisión que se le propone, cómo se medirá y qué se le pide, más un plan de acción. Trabaja sobre la evidencia
sellada y el contexto autorizado del cliente. **Nunca emite ni envía**: propone, una persona revisa y confirma, y
recién ahí la edición avanza. Opera la cartera de clientes con las recurrencias existentes y deja cada edición en
revisión. El modelo se elige por una comparación medida entre proveedores; el operador propone OpenAI como candidato
principal.

Todo es operable por MCP en dos modos: se opera el redactor de Greenhouse (pedir, leer, aceptar o rechazar por
campo), o un agente externo conectado al MCP redacta la propuesta él mismo sobre el mismo contexto permitido. En los
dos casos la propuesta pasa por las mismas validaciones, queda con su procedencia y sólo una persona la acepta.

## Why This Task Exists

El 2026-09-25 el operador aprobó los PDFs de Berel (`EO-INS-000019`) y Sky (`EO-INS-000022`) con el contrato
editorial v2 (TASK-1888), los catálogos premium (TASK-1889) y la autoría IA acotada. Al aprobarlos pidió «un agente
para que haga los informes de los clientes». Lo que existe hoy no lo cubre:

- **La autoría IA vigente sólo reformula.** `src/lib/efeonce-insights/editorial/ai-authoring.ts`
  (`authorPlanWithBoundedAi`) reescribe el texto de cada claim y tiene prohibido agregar comparaciones, causas o
  cifras. Medido con Berel y Sky: `gemini-2.5-flash-lite` casi no cambió las frases. La calidad del texto sale hoy
  de los hallazgos deterministas de TASK-1888, no de la IA.
- **Los campos editoriales de mayor valor quedan vacíos.** `decision`, `measurement` y `ask` «no tienen productor
  determinista» (arquitectura §6, TASK-1888); «Próximo paso» sólo existe en casos triviales; el plan de acción no
  tiene autor. En el canvas aprobado esos textos se escribieron a mano.
- **Nadie opera la cartera.** Las recurrencias de TASK-1848 generan ediciones como borrador, pero no hay quién
  revise la calidad antes de que llegue a una persona, avise cuando la evidencia no alcanza ni prepare el lote por
  cliente.

El ADR de la plataforma (`EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`, decisión 5) ya permite que la IA «organice y
redacte desde evidencia permitida» y le prohíbe calcular KPIs, inventar causalidad, crear promesas o decidir
permisos/publicación. La implementación actual es más estrecha que el ADR. Falta decidir explícitamente hasta dónde
puede interpretar el agente, qué contexto puede leer y cómo se marca una hipótesis: eso es el Slice 0.

## Goal

- Registrar la decisión de arquitectura del agente (delta del ADR de Insights) y que el operador la acepte antes de
  construir.
- Elegir el modelo con una comparación medida y registrada, con el modelo de OpenAI propuesto por el operador
  como candidato principal.
- Un agente que, sobre una edición en revisión, produzca una propuesta editorial completa, validada contra los
  hechos sellados, con procedencia y costo registrados, que una persona acepta o rechaza campo por campo.
- La cartera de clientes con recurrencia activa llega a revisión con la propuesta del agente ya hecha, dentro de un
  techo de costo por organización y mes.
- Paridad completa: todo lo que el agente propone y lo que la persona confirma existe por API y MCP.
- Operable por MCP en modo **operación**: tools para pedir la propuesta al redactor de Greenhouse, leerla y aceptar o
  rechazar por campo, con el mismo command que la API y la UI.
- Operable por MCP en modo **autor externo**: un agente conectado al MCP lee el contexto permitido de una edición
  (`InsightAgentContextV1`) y envía su propuesta (`submitAgentProposal`); Greenhouse la valida igual que la del
  redactor interno, registra quién la escribió y la deja para aceptación humana. El agente externo nunca acepta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md` — decisión 5 (IA acotada a autoría) y la 7 (Full API
  parity desde nacimiento).
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` — §6 (contrato editorial v2, límites honestos de
  `decision`/`measurement`/`ask`) y §7 (API, MCP y autorización).
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — runtime de acción gobernada
  `propose → confirm → execute` (TASK-1137) y abstracción de proveedores.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` — §Invariantes de proveedores LLM (cliente
  canónico `src/lib/ai/`, secretos por `*_SECRET_REF`).
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` — manifiesto como única fuente de tools
  (§0: banderas ortogonales `writes` y `spendsProviderBudget`), la superficie agéntica como contrato (§1), guardas
  sostenidas por mecanismo (§3), federar es parte de «listo» (§5) y manual servido por el protocolo (§8).
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` §22 + `EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
  + `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` D8–D11 — consentimiento, scopes y autoridad de persona.
  Skill `efeonce-mcp-platform`.

Reglas obligatorias:

- **El LLM nunca escribe estado.** Propone un parche al plan; la persona confirma; un command determinista lo
  aplica. Emitir, compartir y enviar siguen siendo commands humanos con su propio gate
  (`INSIGHTS_ISSUANCE_ENABLED`, TASK-1848).
- **Toda cifra impresa sale de un hecho sellado** y pasa por `validateEditorialPlan` + `PLAN_TEXT_LIMITS`. El
  agente no crea cifras nuevas: la regla de TASK-1888 («por cuánto» contra la meta queda fuera del validador) se
  mantiene salvo que el Slice 0 la cambie de forma explícita.
- **Causalidad:** sólo con evidencia citada. Una explicación sin evidencia va marcada como hipótesis o no va (lo
  decide el Slice 0).
- **Sin SDK paralelo:** los proveedores se llaman por `src/lib/ai/` (`openai.ts`, `anthropic.ts`,
  `google-genai.ts`). Si falta un bucle de herramientas en el cliente canónico, se extiende ahí.
- **Por MCP, ninguna tool acepta sin una persona.** Un agente (interno o externo) propone; aceptar exige un actor
  persona con autoridad de revisión y el mecanismo de confirmación que fije el Slice 0. Una sesión con binding de
  servicio o un agente actuando solo nunca acepta.
- **El autor externo pasa por la misma puerta.** Una propuesta enviada por MCP se valida con el mismo código que la
  del redactor interno (`validateEditorialPlan`, `PLAN_TEXT_LIMITS`, citas por frase); no existe una validación
  «más liviana» para agentes externos.
- **Replay determinista:** una edición sellada no vuelve a llamar al modelo; la propuesta aceptada queda congelada
  con su procedencia (modelo, versión de prompt, herramientas usadas, tokens, costo), nunca la cadena de
  razonamiento.

## Normative Docs

- Skill `efeonce-insights` (contratos, operación y lecciones; toda task de EPIC-045 la actualiza al cerrar).
- Skill `ai-model-selection` y `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`. Hoy la guía
  cubre sólo imagen, video y audio: no hay ficha de LLM. Esta task agrega la primera, medida.
- Skill `greenhouse-nexa-conversational` (loop de acción gobernada y proveedores).
- `docs/context/05_voz-tono-estilo.md` (voz de Efeonce para el texto del informe).

## Dependencies & Impact

### Depends on

- TASK-1888 (contrato editorial v2: `readings`, `essentials`, `decision`/`measurement`/`ask`, `PLAN_TEXT_LIMITS`,
  hallazgos deterministas) y TASK-1889 (catálogos que dibujan esos campos) en producción.
- TASK-1848 (recurrencias, borradores y entrega) para el slice de cartera.
- Runtime de acción gobernada de Nexa (TASK-1137): `src/lib/nexa/actions/{types,registry}.ts`.

### Blocks / Impacts

- TASK-1849 (biblioteca en el portal): recibe la revisión por campo de la propuesta del agente como superficie
  (follow-up `ui-ux`; esta task no dibuja UI).
- TASK-1901 y TASK-1902 (más familias de gráfico): más evidencia le da más material al agente; no se bloquean.
- Skill `efeonce-mcp-platform`: tools nuevas federadas en `efeonce-mcp` con scope propio de escritura.
- Manifiesto de tools `src/mcp/greenhouse/tool-manifest.ts` (dominio `insights`) y su inventario generado
  (`pnpm mcp:manifest:generate` / `pnpm mcp:manifest:check`).
- Manual servido por MCP `docs/mcp/skills/efeonce-insights/SKILL.md` (recetas de los dos modos; sin TASK ids, rutas ni
  ids internos: test de fuga; `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`).
- Gateway `efeonce-mcp` (repo hermano): federación de las tools nuevas, versión y canary.

### Files owned

- `src/lib/efeonce-insights/editorial/agent/**` (nuevo)
- `src/lib/efeonce-insights/commands/**` (commands de solicitar, aceptar y rechazar propuesta) [verificar forma
  exacta del directorio de commands]
- `src/lib/efeonce-insights/editorial/ai-authoring.ts` (convive o se reemplaza según el Slice 0)
- `src/lib/ai/openai.ts` (bucle de herramientas si el ganador es OpenAI) y equivalentes si gana otro proveedor
- `scripts/insights/agent-bakeoff.ts` (nuevo)
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md` (delta)
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (primera ficha LLM)
- `src/lib/efeonce-insights/editorial/agent/context.ts` (nuevo: `InsightAgentContextV1`, compartido por el redactor
  interno y el autor externo) [verificar ubicación final en el Slice 2]
- Rutas de lane de propuestas en `src/app/api/platform/{app,ecosystem}/insights/**` [verificar forma exacta]
- `src/mcp/greenhouse/tool-manifest.ts` (entradas nuevas del dominio `insights`) y su inventario generado
- `docs/mcp/skills/efeonce-insights/SKILL.md` (recetas de operación y de autor externo)
- Federación en el gateway `efeonce-mcp` (repo hermano; coordinar con su dueño y su pipeline de deploy)

## Current Repo State

### Already exists

- Autoría IA acotada: `src/lib/efeonce-insights/editorial/ai-authoring.ts` (`authorPlanWithBoundedAi`,
  `INSIGHTS_AUTHORING_PROMPT_VERSION_V2`, una reparación, fallback determinista por claim), detrás de
  `INSIGHTS_AUTHORING_AI_ENABLED` (hoy OFF en todos los ambientes).
- Validación de cifras y topes: `src/lib/efeonce-insights/editorial/plan-validation.ts`,
  `PLAN_TEXT_LIMITS` en `src/lib/efeonce-insights/contracts/plan.ts`.
- Hallazgos deterministas: `src/lib/efeonce-insights/editorial/editorial-v2.ts` (TASK-1888).
- Recurrencias: `src/lib/efeonce-insights/schedules/{commands,contracts,store,tick}.ts` (TASK-1848; tick en
  `ops-worker`).
- Vista previa local con autoría: `scripts/insights/preview-edition.ts --editorial-v2 --ai-authoring`.
- Clientes LLM canónicos: `src/lib/ai/openai.ts` (Responses API: `runOpenAIResponsesWebSearch`,
  `generateStructuredOpenAI`), `src/lib/ai/anthropic.ts`, `src/lib/ai/google-genai.ts`
  (`generateStructuredGemini`).
- Acción gobernada: `src/lib/nexa/actions/types.ts` (`NexaActionProposal`) y `registry.ts`.

### Gap

- No hay agente: nada escribe `decision`/`measurement`/`ask`, ni «Próximo paso» con fundamento, ni plan de acción.
- Ningún cliente canónico expone un bucle de herramientas (tool calling de varios pasos) genérico
  [verificar en `anthropic.ts` y en el runtime de Nexa].
- No existe ficha de modelos de texto en la guía de selección: la elección de modelo LLM hoy no tiene evidencia
  registrada.
- La revisión humana es por edición completa; no existe aceptar o rechazar una propuesta campo por campo.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/editorial/` (dominio Insights) y clientes de `src/lib/ai/`.
- Future candidate home: `remain-shared`
- Boundary: el agente es un productor más del plan editorial; consume readers y hechos sellados de Insights y del
  contexto autorizado del cliente, nunca tablas de otros dominios por SQL directo.
- Server/browser split: agente, herramientas y commands son server-only; al cliente sólo viaja el DTO de la propuesta.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: plan editorial de la edición (`greenhouse_insights.insight_editorial_plans`) y la
  propuesta del agente (tabla nueva o columna; la forma exacta se decide en el Slice 2 [verificar]).
- Consumidores afectados: render (TASK-1846/1889), portal (TASK-1849), MCP (`efeonce-mcp`), recurrencias
  (TASK-1848).
- Runtime target: Vercel (commands), `ops-worker` (lote de cartera), `staging` y `production`.

### Contract surface

- Contrato existente a respetar: `EditorialPlanV1` v2 (TASK-1888), `validateEditorialPlan`, `PLAN_TEXT_LIMITS`,
  máquina de estados de la edición (`edition-state-machine.ts`).
- Contrato nuevo o modificado:
  - `InsightAgentProposalV1`: parche por campo, con `factIds` citados por cada texto, procedencia
    (`author.kind: internal_agent | external_agent`; para el externo, el cliente MCP y la persona de la sesión; el
    modelo que declare queda como `declared`, no verificado) y costo (sólo para el redactor interno).
  - `InsightAgentContextV1`: el contexto permitido de una edición en revisión (hechos sellados, hallazgos
    deterministas, plan vigente con su `planHash`, `PLAN_TEXT_LIMITS`, formato de citas y el contexto que autorice el
    Slice 0). Es la MISMA entrada para el redactor interno y para el autor externo.
  - Commands `requestAgentProposal` (redactor interno), `submitAgentProposal` (autor externo),
    `acceptAgentProposalFields`, `rejectAgentProposal`; reader `getAgentProposal` / `listAgentProposals`.
- Backward compatibility: `compatible`. Sin flag, todo sigue como hoy; un plan sin propuesta compone igual.
- Full API parity: lane app/ecosystem + tools MCP para leer el contexto, solicitar, enviar (autor externo), leer,
  aceptar y rechazar, con el mismo command canónico que usará la UI. Tabla de tools en `## Detailed Spec`.

### Data model and invariants

- Entidades/tablas/views afectadas: plan editorial (sin mutación hasta confirmar) y propuesta del agente (nueva,
  append-only).
- Invariantes que no se pueden romper:
  - El agente nunca emite, comparte ni envía.
  - Toda cifra del texto propuesto sale de un hecho sellado y pasa el validador; si no pasa, ese campo se descarta.
  - Una edición ya emitida no cambia: la propuesta aplica sólo a ediciones en revisión.
  - Replay sin llamar al modelo.
  - Costo por edición y por organización al mes con techo duro; al superarlo, la edición sigue con el texto
    determinista y queda una señal.
  - La propuesta de un autor externo se valida con el mismo código que la interna; un campo que no pasa se descarta
    con motivo y el autor lo ve en la respuesta de la tool.
  - Un autor (interno o externo) nunca acepta su propia propuesta; aceptar exige una persona con autoridad de revisión
    y la confirmación que defina el Slice 0.
  - Una propuesta se liga al `planHash` del contexto que leyó; si el plan cambió, enviar o aceptar falla con
    `409 plan_changed` (nunca se aplica sobre un plan distinto al que vio el autor).
- Write-target allowlist: tabla de propuestas del agente; el plan editorial sólo por el command de aceptación.
- Tenant/space boundary: el agente sólo lee hechos y contexto de la organización de la edición.
- Idempotency/concurrency: una propuesta vigente por edición, hash de plan y autor; solicitar o enviar dos veces con la
  misma `idempotencyKey` devuelve la misma. Aceptar compara el `proposalHash` (compare-and-set).
- Audit/outbox/history: eventos `insights.agent_proposal.created|accepted|rejected` en el catálogo de eventos, con
  `authorKind` en el payload (sin texto del plan ni datos del cliente).

### Migration, backfill and rollout

- Migration posture: `expand` (aditiva).
- Default state: flag nuevo `INSIGHTS_AGENT_AUTHORING_ENABLED` OFF en todos los runtimes, con fila en el ledger.
- Backfill plan: ninguno.
- Rollback path: apagar el flag; las propuestas quedan como historial sin efecto.
- External coordination: proveedor LLM elegido (secreto por `*_SECRET_REF`); costo aprobado por el operador.

### Security and access

- Auth/access gate: capability nueva `insights.agent_proposal.review` (aceptar/rechazar), con grant a un rol real
  en el mismo PR; solicitar exige la misma autoridad que revisar la edición. Leer el contexto y enviar como autor
  externo exigen autoridad sobre la edición de esa organización (capability exacta en el Slice 0).
- MCP: las tools que escriben usan el scope de clase `efeonce.mcp.insights.write` (hoy ningún cliente lo porta; el
  Slice 0 define qué clientes lo reciben). `request_insight_agent_proposal` declara `spendsProviderBudget: true`.
  Aceptar por MCP sólo con actor persona (nunca binding de servicio) y con el mecanismo de confirmación del Slice 0.
- Salida de datos: en el modo autor externo, los hechos de un cliente viajan al modelo del cliente MCP que usa la
  persona. Quién puede hacerlo y con qué clientes lo decide el Slice 0 (gobierno de datos de IA).
- Sensitive data posture: al modelo sólo viajan hechos sellados y contexto allowlisted; nada de PII operativa.
- Error contract: `canonicalErrorResponse` en lanes; errores del proveedor saneados.
- Abuse/rate-limit posture: techo de costo, pasos y tokens por propuesta; una solicitud por edición a la vez.

### Runtime evidence

- Local checks: tests del agente con proveedor simulado; guarda que falla si una cifra no citada llega a la
  propuesta; `pnpm local:check`.
- DB/runtime checks: migración aplicada y verificada (bloque DO).
- Integration checks: comparación de modelos (Slice 1) y propuesta real sobre Berel y Sky en staging.
- Reliability signals/logs: señal de propuestas descartadas por validador y de techo de costo alcanzado.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con rutas reales.
- [ ] Invariantes explícitas, incluida «el agente nunca emite ni envía».
- [ ] Migración aditiva con bloque DO, flag OFF por defecto y rollback por flag.
- [ ] Evidencia de staging con ediciones reales listada.

## Capability Definition of Done — Full API Parity gate

- Commands canónicos en `src/lib/efeonce-insights/**`, consumidos por lane app/ecosystem y por tools MCP
  federadas en `efeonce-mcp` con scope propio de escritura.
- La aceptación humana es el único camino que muta el plan (`propose → confirm → execute`).
- Capability registrada en `capabilities_registry` + catálogo TS + grant a rol real en el mismo PR.
- Tools MCP en `src/mcp/greenhouse/tool-manifest.ts` con `writes` y `spendsProviderBudget` correctos, federadas en
  `efeonce-mcp` (versión nueva del gateway), con manual servido actualizado y canary contra el lane. Sin federar, la
  paridad por MCP no está hecha.

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

### Slice 0 — Decisión de arquitectura (delta del ADR de Insights)

- Delta `Proposed` en `EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md` que defina:
  - qué campos escribe el agente;
  - qué contexto puede leer (hechos sellados, ediciones emitidas anteriores de la misma organización, servicios
    contratados, metas);
  - cómo cita cada texto (`factIds` por frase);
  - cómo marca una hipótesis de causa, o si la prohíbe;
  - qué no hace nunca;
  - techo de costo;
  - si reemplaza o convive con `authorPlanWithBoundedAi`;
  - **confirmación humana por MCP**: cómo cuenta una aceptación hecha desde un cliente MCP. Opciones a decidir:
    (a) aceptar por MCP con actor persona + `proposalHash` y confirmación explícita del usuario en el cliente
    (elicitation de MCP si el gateway la soporta [verificar]); (b) por MCP sólo proponer y leer, y aceptar en el
    portal o el lane app; (c) aceptar por MCP con un código de confirmación que la persona obtiene fuera del agente.
    En ningún caso un agente acepta solo;
  - **autor externo**: qué personas y qué clientes MCP pueden leer `InsightAgentContextV1` y enviar propuestas
    (internos de Efeonce, clientes sobre su propia organización, o ambos), la capability que lo gobierna y si el autor
    puede ser la misma persona que acepta;
  - **salida de datos a un modelo externo**: qué contexto del cliente puede viajar al modelo del cliente MCP y con qué
    términos (skill `greenhouse-ai-creative-rights-governance` + `legal-privacy-ip-operator`).
- El operador lo acepta antes del Slice 2. Fila en `DECISIONS_INDEX.md`.

### Slice 1 — Comparación de modelos medida

- `scripts/insights/agent-bakeoff.ts`: misma evidencia sellada, al menos Berel `EO-INS-000019` y Sky
  `EO-INS-000022`, más una tercera edición si existe.
- Candidatos:
  - el modelo de OpenAI más capaz disponible en la cuenta al ejecutar, propuesto por el operador
    [verificar id y acceso];
  - uno de Anthropic;
  - uno de Gemini;
  - todos por los clientes canónicos.
- Métricas por candidato:
  - violaciones del validador;
  - afirmaciones sin respaldo (juez + revisión humana);
  - calidad del español con la voz de Efeonce;
  - confiabilidad del uso de herramientas;
  - latencia;
  - tokens y costo por edición.
- Revisión ciega del operador: textos sin nombre de modelo.
- Resultado registrado y primera ficha LLM en la guía de selección (`[verificado]` con fecha).

### Slice 2 — Agente y propuesta

- Herramientas del agente: leer hechos y plan de la edición, hallazgos deterministas, ediciones emitidas
  anteriores (resumen) y contexto permitido por el Slice 0.
- Bucle de varios pasos con presupuesto (pasos, tokens y costo) en el cliente canónico del proveedor ganador.
- Salida: `InsightAgentProposalV1`, que pasa `validateEditorialPlan` + `PLAN_TEXT_LIMITS`; un campo que no pasa se
  descarta con motivo.
- Migración aditiva y flag `INSIGHTS_AGENT_AUTHORING_ENABLED`.

### Slice 3 — Revisión humana y paridad (MCP modo operación)

- Commands `requestAgentProposal`, `acceptAgentProposalFields` (por campo, con `proposalHash`) y
  `rejectAgentProposal`, con evento, auditoría e idempotencia; readers `getAgentProposal` y `listAgentProposals`.
- Lane app/ecosystem con los mismos errores canónicos (`agent_authoring_disabled` 503, `plan_changed` 409, cupo 429,
  404 anti-oráculo para otra organización).
- Tools MCP del modo operación (ver tabla en `## Detailed Spec`) en el manifiesto, federadas en `efeonce-mcp` con el
  mecanismo de confirmación del Slice 0.
- Receta «operar el redactor» en el manual servido `docs/mcp/skills/efeonce-insights/SKILL.md`.
- Aceptar produce un plan nuevo validado; la edición sigue en revisión hasta la emisión humana.

### Slice 4 — Autor externo por MCP

- `InsightAgentContextV1` y el command `submitAgentProposal`: el agente externo lee el contexto permitido y envía
  `InsightAgentProposalV1`. Greenhouse la pasa por el mismo validador que la interna, descarta con motivo lo que no
  pasa, la guarda append-only con `author.kind = external_agent` y la deja para aceptación humana.
- Tools MCP `get_insight_agent_context` (lectura) y `submit_insight_agent_proposal` (escritura sin gasto de proveedor),
  federadas en `efeonce-mcp`.
- Receta «redactar como autor externo» en el manual servido: cómo leer el contexto, cómo citar (`factIds` por frase),
  los límites de texto y qué hacer con un campo rechazado.
- Tests: la misma propuesta inválida se rechaza igual por la vía interna y la externa; un autor externo no puede
  aceptar su propia propuesta; otra organización responde 404; el `planHash` viejo responde 409.

### Slice 5 — Cartera

- Las recurrencias de TASK-1848 solicitan la propuesta al generar el borrador, con techo por organización y mes.
- Aviso al responsable de la cuenta cuando la edición queda en revisión, o cuando la evidencia no alcanza.
- Una señal de fiabilidad para propuestas fallidas.

### Slice 6 — Verificación con ediciones reales

- Staging, flag ON: propuesta para Berel y Sky, revisión y aceptación del operador, PDF compuesto con los campos
  aceptados.
- Por MCP, desde un cliente conectado con sesión de persona: los dos modos de punta a punta (pedir al redactor y
  aceptar; enviar como autor externo y aceptar) sobre una edición interna, con la confirmación del Slice 0.
- Aprobación del operador antes de habilitar producción.

## Out of Scope

- Emitir, compartir o enviar automáticamente. Sigue siendo una decisión humana, con los gates de TASK-1848.
- UI de revisión por campo en el portal: follow-up `ui-ux` en TASK-1849.
- Calcular cifras nuevas o KPIs, y modificar adapters o evidencia.
- Cambiar los catálogos o el diseño aprobado (TASK-1889).
- Fuentes de contexto no allowlisted en el Slice 0 (correo, chats, documentos sueltos).
- Que un agente externo acepte, emita, comparta o envíe: sólo propone.
- Medir o pagar el costo del modelo que usa el autor externo: corre en la cuenta del cliente MCP, fuera de Greenhouse.
- Cambiar el mecanismo de consentimiento o los scopes base del gateway más allá de lo que decida el Slice 0.

## Detailed Spec

Qué escribe el agente, sobre la base de lo que ya produce TASK-1888:

| Campo del plan | Hoy | Con el agente |
|---|---|---|
| `readings[].conclusion` | hallazgo determinista | se conserva; el agente puede proponer una redacción mejor que cite los mismos hechos |
| `readings[].meaning` | sólo si agrega algo, casi siempre vacío | interpretación para el cliente con hechos citados |
| `readings[].nextStep` | sólo casos triviales | próximo paso concreto, sin promesas |
| `decision` / `measurement` / `ask` | vacíos (sin productor) | propuesta de decisión, cómo se medirá y qué se pide al cliente |
| `actions[]` (impacto, esfuerzo, semanas) | sin autor | plan de acción ligado a hallazgos |
| tesis y esenciales | hallazgos deterministas | se conservan; redacción opcional |

La propuesta nunca reemplaza un hallazgo determinista por una afirmación sin hechos. Si el agente no puede
respaldar un campo, lo deja vacío y lo dice en la propuesta.

Tools MCP (nombres propuestos; se confirman al registrar el manifiesto, siguiendo el estilo vigente del dominio
`insights`):

| Tool | Modo | Command / reader | `writes` | `spendsProviderBudget` |
|---|---|---|---|---|
| `get_insight_agent_context` | autor externo | reader `InsightAgentContextV1` | no | no |
| `submit_insight_agent_proposal` | autor externo | `submitAgentProposal` | sí | no |
| `request_insight_agent_proposal` | operación | `requestAgentProposal` | sí | sí |
| `get_insight_agent_proposal` | ambos | `getAgentProposal` | no | no |
| `list_insight_agent_proposals` | ambos | `listAgentProposals` | no | no |
| `accept_insight_agent_proposal_fields` | ambos | `acceptAgentProposalFields` (persona + `proposalHash` + confirmación del Slice 0) | sí | no |
| `reject_insight_agent_proposal` | ambos | `rejectAgentProposal` | sí | no |

Si el Slice 0 elige la opción (b), `accept_insight_agent_proposal_fields` no se federa y la aceptación queda en el
portal o el lane app; el resto de la tabla se mantiene.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 aceptado por el operador → Slice 1 (modelo elegido) → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
  Sin decisión aceptada no se construye; sin modelo elegido no se cablea proveedor. El Slice 4 (autor externo)
  puede construirse en paralelo al Slice 1 una vez listo `InsightAgentContextV1` (Slice 2), porque no depende del
  modelo elegido. Ninguna tool MCP de escritura se federa antes de que el Slice 0 fije la confirmación humana.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Texto con una afirmación falsa o sin respaldo llega a un cliente | Insights / cliente | medium | validador de cifras + citas por frase + revisión humana obligatoria + no envío automático | propuestas descartadas por validador; rechazo humano |
| Causalidad inventada | Insights | medium | regla del Slice 0 (hipótesis marcada o prohibida) + juez en el Slice 1 | rechazo humano por campo |
| Costo del proveedor fuera de control | finanzas / proveedor | low | techo por propuesta, por organización y por mes; flag | señal de techo alcanzado |
| Dependencia de un proveedor | plataforma | medium | proveedor detrás del cliente canónico; comparación re-ejecutable | falla de proveedor → texto determinista |
| Datos de un cliente en el contexto de otro | acceso | low | herramientas acotadas a la organización de la edición; test de aislamiento | test de aislamiento |
| Un agente conectado por MCP acepta sin que una persona lo decida | Insights / MCP | medium | aceptar exige actor persona + `proposalHash` + confirmación del Slice 0; el autor nunca acepta lo suyo; bindings de servicio excluidos | eventos `accepted` con `authorKind` y actor; test negativo |
| El autor externo envía texto inventado o cifras sin respaldo | Insights | medium | mismo validador que el interno + citas por frase + revisión humana | propuestas externas descartadas por validador |
| Datos de un cliente salen a un modelo externo no autorizado | datos / legal | medium | regla del Slice 0 (quién, qué contexto, qué clientes MCP); contexto mínimo; sin PII | auditoría de lecturas de `get_insight_agent_context` |
| La propuesta se aplica sobre un plan que cambió después | Insights | low | `planHash` y `proposalHash` (compare-and-set) → `409 plan_changed` | 409 en el lane |

### Feature flags / cutover

- `INSIGHTS_AGENT_AUTHORING_ENABLED` (Vercel + `ops-worker`), OFF por defecto, fila en el ledger. Staging primero;
  producción sólo con aprobación del operador tras el Slice 5.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | revertir el delta del ADR | inmediato | si |
| Slice 1 | ninguno (script local) | n/a | si |
| Slice 2 | flag OFF | < 5 min | si |
| Slice 3 | flag OFF; las propuestas quedan como historial; retirar la tool del gateway con su versión anterior | < 15 min | si |
| Slice 4 | flag OFF (el lane responde `agent_authoring_disabled`); retirar las dos tools del gateway | < 15 min | si |
| Slice 5 | flag OFF en `ops-worker` (`deploy.sh` + revisión activa) | < 15 min | si |
| Slice 6 | flag OFF en staging | < 5 min | si |

### Production verification sequence

1. Staging con flag ON: propuesta real de Berel y Sky, aceptada por el operador, PDF compuesto; los dos modos por MCP
   de punta a punta sobre una edición interna.
2. Producción con flag ON sólo en organizaciones internas; una edición interna real revisada por el operador.
3. Ampliar a clientes por organización, con techo de costo.

### Out-of-band coordination required

- Operador: aceptar el Slice 0, revisar a ciegas la comparación de modelos, aprobar el costo por organización.
- Dueño del gateway `efeonce-mcp`: federación de las tools nuevas, versión y deploy (repo hermano con su propio
  pipeline; PR, no commit directo a `main`).
- Proveedor elegido: acceso al modelo y secreto en Secret Manager.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El delta del ADR está `Accepted` por el operador y registrado en `DECISIONS_INDEX.md`.
- [ ] La comparación de modelos corrió sobre al menos Berel y Sky con los tres proveedores, con métricas y revisión
  ciega del operador registradas, y la guía de selección tiene su primera ficha LLM con fecha.
- [ ] Ninguna cifra de una propuesta aceptada deja de pasar `validateEditorialPlan` (test que lo falsifica).
- [ ] El agente no puede emitir, compartir ni enviar: no hay camino de código desde la propuesta a esos commands
  sin confirmación humana (test).
- [ ] Aceptar y rechazar por campo existen por API y MCP con el mismo command.
- [ ] Modo operación por MCP: pedir, leer, aceptar y rechazar funcionan desde un cliente MCP con sesión de persona,
  con la confirmación definida en el Slice 0 (evidencia en staging).
- [ ] Modo autor externo por MCP: `get_insight_agent_context` y `submit_insight_agent_proposal` funcionan desde un
  cliente MCP; la propuesta queda con `author.kind = external_agent` y espera aceptación humana (evidencia en staging).
- [ ] La misma propuesta inválida se rechaza igual por la vía interna y por la externa (test).
- [ ] Ningún agente acepta sin persona: una sesión con binding de servicio y el propio autor no pueden aceptar (test).
- [ ] Otra organización responde 404 anti-oráculo y un `planHash` desactualizado responde 409 (test).
- [ ] Tools en el manifiesto con `writes` y `spendsProviderBudget` correctos, `pnpm mcp:manifest:check` verde y
  federadas en `efeonce-mcp` con versión nueva y canary contra el lane.
- [ ] Manual servido con las recetas de los dos modos, `pnpm mcp:skills:check` verde y sin fugas (test).
- [ ] El techo de costo corta la propuesta y deja el texto determinista (test).
- [ ] Berel y Sky en staging: propuesta aceptada por el operador y PDF compuesto con esos campos.
- [ ] Flag con fila en el ledger y runtimes declarados (Vercel + `ops-worker` en `deploy.sh`).

## Verification

- `pnpm local:check`
- Tests focales del agente, de los commands y del aislamiento por organización
- `pnpm vitest run src/lib/efeonce-insights`
- `pnpm task:lint --task TASK-1903`
- `pnpm mcp:manifest:check` y `pnpm mcp:skills:check`
- Canary del lane y de las tools federadas en el gateway, en staging
- Comparación de modelos y vista previa con ediciones reales (evidencia en la task)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada (espejo `.codex` incluido), arquitectura §6/§7 y manual de operación.
- [ ] Manual servido por MCP y skill `efeonce-mcp-platform` al día con las tools nuevas y la confirmación humana.

## Follow-ups

- Revisión por campo de la propuesta en el portal (TASK-1849, `ui-ux`).
- Ampliar las fuentes de contexto (por ejemplo, notas de cuenta o entregables) si el Slice 0 las deja para después.

## Open Questions

- Contexto permitido al agente más allá de los hechos sellados: lo define el Slice 0 con el operador.
- Si el agente reemplaza `authorPlanWithBoundedAi` o convive con ella: lo define el Slice 0.
- Techo de costo por organización y mes: lo fija el operador con los datos del Slice 1.
- Cómo se confirma una aceptación hecha desde un cliente MCP (opciones a, b o c del Slice 0): lo decide el operador.
- Quién puede actuar como autor externo (internos, clientes sobre su organización o ambos) y con qué clientes MCP; si
  el autor puede ser la misma persona que acepta: lo decide el Slice 0.
- Qué contexto del cliente puede viajar al modelo de un cliente MCP externo: lo decide el Slice 0 con gobierno de
  datos de IA.
