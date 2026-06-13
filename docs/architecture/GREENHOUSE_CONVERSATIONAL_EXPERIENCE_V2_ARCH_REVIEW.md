# Conversational Experience Platform V2 — Architecture Review (gate)

> **Tipo:** Revisión de arquitectura (pre-Accept gate)
> **Fecha:** 2026-06-12
> **Autor:** Claude (arch-architect + modern-web-guidance + greenhouse-product-ui-architect)
> **Revisa:** `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md` + `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md` (ADR `Proposed`) + `TASK-1095` (plataforma) + `TASK-1096` (Nexa Answers, en construcción con Codex)
> **Veredicto:** la arquitectura es **sólida**; requiere **ajustes de reconciliación de contratos** porque TASK-1096 se está construyendo UI-first **antes** del contrato de TASK-1095, y ya hay **3 forks** que conviene cerrar antes de que osifiquen.

## Por qué este documento existe

El diseño (ADR + V2 spec) está bien: non-goals, alternativas rechazadas, reversibility, revisit-triggers y self-critiques 12/36m alineados con los patrones canónicos de Greenhouse (Full API Parity, primitive+variants+kinds, Adaptive Sidecar, MCP como lane técnico, autorización server-side, degradación honesta, sin identidades paralelas).

El problema **no es el diseño** — es la **secuencia**. El Slice 0 de TASK-1095 dice "no implementar runtime hasta aceptar el ADR", pero en la práctica:

- `NexaAnswersCanvas` + `NexaAnswerBubble` **ya existen** (TASK-1096 §"Slice progress"), con su **propio** `surfaceContext` local, su propia máquina de estados y ~15 kinds.
- `surfaceContext` **no existe en código** como el tipo canónico de 1095 (§19/§20 del V2 spec).
- El runtime sigue **Home-shaped** (`/api/home/nexa` + `HomeSnapshot`); no hay endpoint de embedded-answer.
- El ADR sigue `Proposed`.

Es decir: **el producto (1096) está definiendo de facto el contrato que la plataforma (1095) debía definir primero** — el failure mode HIGH que el propio risk-matrix de 1095 nombra ("la plataforma nace acoplada"), ya ocurriendo en el plano del canvas.

---

## Ajustes requeridos (gate antes de `Accepted`)

### P0 — Reconciliar AHORA (antes de que 1096 sume más capas)

#### A1 — `surfaceContext` está duplicado → aterrizar el SSOT y mergear el allowlist del canvas

- **Hallazgo:** 1095 §7 define `NexaSurfaceContext` (incluye `entityRefs`, `timeRange`, `capabilities`, `provenanceRefs`, `trustCueInputs`). El `NexaAnswersCanvas` tiene su propio `NexaAnswersSurfaceContext` (incluye `allowedRenderers`, `allowedActions`; **dropea** entityRefs/capabilities/provenanceRefs/timeRange). No es superset ni subset — **divergieron**. Es el "surfaceContext becomes a loose bag → soft fork" del self-critique a 12 meses, ya ocurriendo.
- **Lente:** arch-architect overlay #8 (SSOT) + 12-month self-critique del propio V2.
- **Ajuste:** TASK-1095 aterriza `surfaceContext` como **SSOT** (módulo types-only es suficiente para empezar: `src/lib/nexa/surface-context.ts`). El canvas lo **consume**, no define el suyo. La reconciliación es **MERGE, no "el canvas estaba mal"**: el `allowedRenderers`/`allowedActions` del canvas es un **renderer-allowlist de seguridad valioso** → el contrato canónico debe **absorberlo** (es exactamente el "capability como input a affordances, no bypass" del §13).
- **Acceptance:** un solo tipo `NexaSurfaceContext` exportado desde `src/lib/nexa/`; el canvas importa ese tipo; cero shape local divergente; el allowlist queda en el contrato canónico.

#### A2 — La máquina de estados del canvas mezcla 3 dimensiones ortogonales → descomponer

- **Hallazgo:** 1095 canónica = `idle|composing|submitted|thinking|answered|degraded` (6, puro lifecycle). Canvas = `idle|submitted|thinking|streaming|answered|proofOpen|followup|compacted|degraded|error` (10). El enum del canvas **colapsa tres ejes**: (a) lifecycle, (b) **disclosure** (`proofOpen`), (c) **posición de turno** (`followup`/`compacted`). Dropea `composing`.
- **Lente:** arch-architect **regla dura**: "NUNCA mezclar dimensiones ortogonales en un solo enum" (mismo principio que `engagement_kind` vs `commercial_terms`).
- **Ajuste:** descomponer en **3 dimensiones**:
  - **lifecycle** (los 6 canónicos de 1095; `error` se suma como 7º estado legítimo: `error` = fallo duro vs `degraded` = parcial),
  - **disclosure** (proof `collapsed|expanded`),
  - **turn** (`current|compacted`).
  El canvas modela el producto cartesiano de esas 3, no un enum plano de 10. Restaurar `composing`.
- **Acceptance:** el lifecycle del canvas == los estados canónicos de 1095; `proofOpen`/`followup`/`compacted` se modelan como dimensiones separadas, no como estados de lifecycle.

#### A3 — Reconciliar `capabilities.action` + `sensitivity` con el modelo real de entitlements

- **Hallazgo:** 1095 §7 define `capabilities: [{capability, action: 'read'|'suggest'|'draft'|'execute', scope: string}]` — un vocabulario de `action` **nuevo** que no matchea el enum de acciones del catálogo de entitlements; `scope: string` es loose. Las 5 `sensitivity tiers` (`public_internal|tenant_internal|restricted|confidential|redacted`) **no tienen mapeo** al modelo de acceso real (el ADR lo difiere como pre-Accept gate — correcto, pero es load-bearing para los pilotos finance/person).
- **Lente:** arch-architect overlay #7 (capabilities granulares) + #16 (Full API Parity) + 4-pillar Safety.
- **Ajuste:** reconciliar `action` + `scope` con la firma real `can(subject, capability, action, scope)` (scope `own|tenant|all`) **antes** de cualquier piloto no-Knowledge. Mapear las 5 sensitivity tiers a capabilities/entitlements reales (o reducir a las que tengan correlato).
- **Acceptance:** el shape de `capabilities` valida contra el catálogo real; las sensitivity tiers tienen mapeo documentado a `can()`/route_groups antes del piloto finance/person.

### P1 — Antes del primer piloto no-Knowledge

#### A4 — Falta el contrato server-side (Full API Parity al revés)

- **Hallazgo:** no existe endpoint de embedded-answer ni reader que **construya el `surfaceContext` server-side**; el runtime es Home-shaped. La forma del `surfaceContext` la está dictando lo que necesitan los **fixtures de UI**, no lo que un reader puede proveer **de forma segura** (trustCueInputs, provenanceRefs).
- **Lente:** arch-architect overlay #16 (Full API Parity: "modelar el reader/command PRIMERO, la UI después").
- **Ajuste:** definir en 1095 la **interfaz del input contract** (el reader "build surfaceContext server-side" + la shape del endpoint embedded-answer) **aunque sea stub/interface**, antes de que los fixtures de 1096 endurezcan. Así la UI consume una shape **construible server-side**, no una inventada.
- **Acceptance:** existe un interface/stub server-side del builder de `surfaceContext` + la shape del endpoint embedded-answer, referenciado por los fixtures.

#### A5 — Explosión prematura de `kinds` en `NexaAnswerBubble`

- **Hallazgo:** ~15 kinds (`financeChartAnswer`, `financeMetricSummary`, `commercialMetricSummary`, `agencyMetricSummary`, `peopleMetricSummary`, … `surfaceActionPlan`) = producto cartesiano `4 variants × ~5 dominios`, **antes de que exista un consumer no-Knowledge real**.
- **Lente:** greenhouse-product-ui-architect: *los kinds resuelven a una variant, no proliferan*; "no agregar una variant que solo cambia color/icono"; kinds per-dominio sin consumer = especialización fantasma.
- **Ajuste:** colapsar a las **4 variants** (`explanation|chart|metricSummary|actionPlan`) + el **dominio como dimensión del `surfaceContext`**, resuelto por un resolver `kind→variant`. Diferir los kinds per-dominio hasta que cada dominio sea consumer real.
- **Acceptance:** `NexaAnswerBubble` expone las 4 variants + un resolver; los kinds per-dominio que no tienen consumer real se difieren o se generan por resolver, no se listan a mano.

#### A6 — Contrato a11y del answer-turn (pertenece a 1095, no a cada consumer)

- **Hallazgo:** ninguno de los dos docs especifica el contrato a11y del answer-turn. El estado `streaming` ya existe en el canvas aunque streaming esté deferido.
- **Lente:** modern-web-guidance (`accessibility`: landmarks + jerarquía de headings + live regions; `interactive-content-reveal` / `declarative-dialog-popover-control` para el proof on-demand) + a11y-architect.
- **Ajuste:** especificar en **1095** (cross-surface) el contrato a11y del answer-turn: `aria-live="polite"` para turnos/respuestas que aparecen async **sin robar foco al composer**; landmark/role + jerarquía de headings de la conversación; proof on-demand con patrón `dialog`/`popover` declarativo top-layer; `prefers-reduced-motion` horneado. `streaming`: o se dropea hasta el follow-up de streaming, o se especifica su a11y ahí.
- **Acceptance:** 1095 documenta el contrato a11y del answer-turn; el canvas lo implementa; GVC `quality.keyboard` cubre el proof disclosure y el foco post-submit.

### P2 — Higiene de plataforma

#### A7 — Reliability signal de salud propia (no solo analytics de producto)

- **Hallazgo:** §15 lista eventos (trust cue state, proof open/collapse, degraded reason) que son **analytics de producto**, no reliability signals al estilo Greenhouse (detector steady=0 cableado a `/admin/operations`). El precedente existe (TASK-1085: `no_source_answer_rate`, `low_citation_rate`, `stale_source_retrievals`).
- **Lente:** arch-architect overlay #8 ("reliability signals everywhere") + 4-pillar Resilience.
- **Ajuste:** sumar ≥1 reliability signal de salud de la plataforma conversacional (ej. `nexa.conversation.surface_context_invalid` o `nexa.conversation.rehydration_failed`, moduleKey `nexa`/`delivery`, steady=0), distinto del analytics de producto.
- **Acceptance:** ≥1 signal en `src/lib/reliability/queries/` cableado al registry.

---

## 4-Pillar — lectura rápida del diseño (no de la implementación)

- **Safety:** ✅ fuerte en intención (server-side authz, safe refs, sensitivity tiers, MCP como lane separado). ⚠️ residual: las sensitivity tiers **sin mapeo real** (A3) son una promesa, no un control, hasta el piloto person/finance.
- **Robustness:** ⚠️ el enum de estados mezclado (A2) + el `surfaceContext` forkeado (A1) son invariantes de contrato que pueden derivar bajo concurrencia de dominios. Reconciliar antes de multi-consumer.
- **Resilience:** ⚠️ degradación honesta bien especificada en UX; falta el reliability signal de salud propia (A7) + el contrato de rehidratación de threads viejos con provenance V2 (mencionado como riesgo, no como test).
- **Scalability:** ✅ el modelo (un reader → muchas surfaces, answer-turn separado de placement) escala. ⚠️ la explosión de kinds (A5) es deuda de mantenimiento, no de runtime.

## Lo que está muy bien (no tocar)

- Answer-first / evidencia progresiva (Layer 0–3) / trust cue taxonomy / confidence semantics separadas.
- Boundary de autorización server-side + "safe refs, no raw records".
- MCP como Layer 3 + Insights "promotable, no chat-by-default".
- Facade-sobre-rename para `NexaKnowledgeAnswerSurface` (la decisión de reversibilidad correcta).
- ADR con alternativas rechazadas, reversibility, revisit-triggers, self-critiques.

## Recomendación de secuencia

1. **Aterrizar primero** (mínimo viable de 1095, types-only): `surfaceContext` SSOT (A1, con el allowlist mergeado) + el state machine descompuesto (A2) + el contrato a11y del answer-turn (A6).
2. **Recién entonces** seguir endureciendo 1096 sobre ese contrato (kinds resueltos por resolver — A5; canvas consumiendo el SSOT).
3. **Antes del piloto no-Knowledge:** A3 (entitlements/sensitivity) + A4 (server contract) + A7 (signal).
4. **Aceptar el ADR** cuando A1/A2/A3/A6 estén resueltos (los demás pueden quedar como deferred documentados).

Estos 4 ajustes (A1/A2/A3/A6) se suman a la lista de pre-Accept gates que el ADR ya tiene en su sección "Decision Status Notes".
