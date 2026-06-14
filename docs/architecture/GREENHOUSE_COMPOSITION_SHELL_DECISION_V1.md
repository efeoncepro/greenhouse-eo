# Greenhouse Composition Shell Decision V1

## ADR Metadata

- Status: `Accepted` (aceptado por el operador 2026-06-13; pressure-test de 3 skills convergente — arch + product-ui + modern-web)
- Date: `2026-06-13`
- Owner: UI Platform / Product Design / Architecture
- Scope: shell de layout vertical (`src/@layouts/**`, `LayoutContent`/`StyledMain`), patrones de reestructuración in-place (`AdaptiveSidecarLayout`, `NexaMomentComposition`, `OrganizationWorkspaceShell`), View Transitions same-document, motion tokens, GVC
- Reversibility: `Two-way-but-slow` (aditivo + opt-in + flag; revertir tras adopción de varias surfaces es costoso, pero el path `LayoutContent` legacy queda intacto para las que no opten)
- Confidence: `Medium`
- Blast radius: **Large** (toca el shell que usa cada superficie) → tratado como cuadrante STOP: ADR antes de código + rollout staged + instrumentación de reversibilidad
- Companion architecture: `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_UI_PLATFORM_V1.md` (TASK-1114 Slice 1, 2026-06-13)
- Implementation task: pendiente — generar vía `greenhouse-task-planner` al aceptar
- Validated as of: `2026-06-13` (runtime: `LayoutContent`, `AdaptiveSidecarLayout`, `NexaMomentComposition` placement `composed`)

## Context

Hoy el shell de layout vertical es una **caja estática**: `LayoutContent` renderiza `StyledMain` (`src/@layouts/styles/shared/StyledMain.tsx`) — un `<main>` con `padding` + `max-inline-size: ${compactContentWidth}px` (1440) centrado + `:has(.contentHeightFixed)` para el modo flex/overflow. El shell **no participa** en *cómo* se arman, animan o reestructuran los hijos a lo largo del tiempo. Renderiza children y se aparta.

Consecuencia (el dolor que motiva esta decisión, reportado por el operador 2026-06-13): **cada patrón que necesita reestructurar la superficie inventó su propia solución ad-hoc**, sin substrato compartido y sin contrato común de morph / a11y / View Transitions:

- `AdaptiveSidecarLayout` (TASK-1028) — modos `push`/`inline`/`overlay`/`temporary`; reserva espacio y reflowea el contenido principal. Reestructuración ad-hoc.
- `NexaMomentComposition` (TASK-1110, GAP A del Moment Fabric) — variants `leadOverlay`/`anchoredAside`/`inlineExpand`; compone un Momento Nexa con el host vivo, con su propio grid + View Transitions per-instance + anclaje `data-nexa-anchor`. Reestructuración ad-hoc.
- `OrganizationWorkspaceShell` (TASK-611) — ya tiene una frontera shell/content + `drawerSlot`. Reestructuración ad-hoc.

Los tres resuelven **la misma pregunta** — *"¿cómo transformo el layout de esta superficie, con coreografía y a11y, sin pelear contra la rigidez del `<main>` plano?"* — cada uno por su lado. Falta la **capa de abajo**.

Esto no es teoría: el ADR del Adaptive Sidecar (`GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`) ya declaró el disparador de esta escalación en su sección *Revisit When*:

> *"A shell-level sidecar host is needed by more than two domains."*

Estamos en ese punto. La decisión no es inventar una abstracción especulativa: es **promover el substrato que tres consumidores ya están reimplementando** (regla de tres), respetando que el propio sistema marcó el momento.

### El error de modelo mental que esta decisión corrige

Hubo una tentación inicial de "darle capacidades conversacionales al shell" (meter Nexa en `LayoutContent`). Eso **viola** la regla dura de UI platform: *el dominio entra por datos, nunca por chrome en el shell*. Esta decisión es lo contrario: el shell gana **mecanismo de coreografía de layout neutral** (regiones, composiciones, morph) — la misma categoría que MUI layout, View Transitions o los motion tokens — **no** política de dominio. Mecanismo en el shell ✅ · política/dominio en el shell ❌.

## Decision

Greenhouse adopta el **Composition Shell**: un **substrato de coreografía de layout, domain-neutral, aditivo y opt-in**, del cual los patrones de reestructuración in-place (`AdaptiveSidecarLayout`, `NexaMomentComposition`, `OrganizationWorkspaceShell`) son **consumers**.

El Composition Shell **no reemplaza** `LayoutContent`. Una superficie que no opta sigue exactamente como hoy. Una superficie que opta declara una **composición** y el substrato se encarga del grid de regiones, la transición entre composiciones (morph in-place) y la asignación de `view-transition-name` a las regiones que persisten.

Sigue la metodología canónica **Primitive + Variants + Kinds** (`GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`):

- **Regiones** (la estructura): vocabulario cerrado de slots nombrados — propuesta inicial `lead` · `primary` · `aside` · `dock` · `overlay`. Una superficie coloca contenido en regiones en lugar de pelear con un `<main>` plano.
- **Composiciones** (los variants funcionales, no skins): presets nombrados — propuesta inicial `single` · `leadPlusContext` · `split` · `focused`. Una superficie declara "estoy en composición X" y transiciona a "Y".
- **Kinds → composición** (semántica de dominio/workflow): un kind resuelve a una composición existente vía controller. **NUNCA** una composición nueva por dominio.

### Frontera de scope — qué SÍ y qué NO es consumer

Una precisión sobre el encuadre confirmado ("Nexa/Sidecar/Floating sean consumers"): el substrato unifica **coreografía de regiones de página** (reflow del layout in-place). Por eso:

- **Consumers del modelo de regiones/composiciones:** `AdaptiveSidecarLayout`, `NexaMomentComposition`, `OrganizationWorkspaceShell` — todos reflowean la página.
- **NO consumer del modelo de regiones:** `GreenhouseFloatingSurface` es **anclado-transitorio** (popover/menu/tooltip) — *no* reflowea la página, es otra preocupación. **Puede** consumir el contrato compartido de motion tokens + View Transitions del substrato, pero no entra en el grid de regiones. Tratarlo como región sería forzar la abstracción.

### Mechanism vs policy (lo que reconcilia con la regla dura)

El substrato provee **mecanismo** (regiones + composiciones + máquina de estados de layout + ownership de View Transitions + reflow adaptativo). Las superficies proveen **política** (qué composición, qué contenido, qué dominio). El substrato **nunca** conoce el dominio.

## Runtime Contract (V1 — propuesto, a detallar en la companion spec al aceptar)

V1 introduce una **layout primitive de shell** + su controller, consumibles por las superficies que opten:

- **Modelo de regiones**: slots nombrados con `min-inline-size` declarado por región (resuelve la deuda que el ADR Sidecar marcó: "Layouts must define minimum viable main-content widths").
- **Composiciones nombradas** + resolver `kind → composición` (P+V+K).
- **Máquina de estados de layout** (`dormant → composing → composed`, espejo del shape que `NexaMomentComposition` ya usa) — transiciones enumeradas; el host conduce el estado (igual que la lente y el sidecar controller `reduceAdaptiveSidecarState`).
- **Ownership de View Transitions**: el substrato asigna `view-transition-name` a las regiones que persisten → el morph es FLIP-correcto **sin que cada surface lo cablee**. Reusa el helper canónico `startViewTransition` (TASK-525/1102), **no** lo forkea.
- **Reflow adaptativo**: container queries a nivel región (degradación honesta sin soporte).
- **Contrato de coreografía**: duraciones/easing/stagger desde los motion tokens (`src/components/greenhouse/motion`), cero hardcode. `prefers-reduced-motion` horneado (swap instantáneo).
- **Contrato a11y**: focus routing tras el morph (al contenido nuevo, una vez, sin robar foco en re-render), un solo live region, regiones in-flow como `role="region"`/`complementary` (nunca `aria-modal` para reflow in-place).
- **Convive con `compactContentWidth: 1440`**: el substrato opera *dentro* del contrato de ancho vigente (no lo flipea a `wide` — regla dura existente). Si una composición necesita más ancho, es decisión de `design-system-governance`, no un bypass.

**Gate de validación (la primitive se gana su lugar o no se mergea):** expresar **al menos un consumer existente** en términos del substrato y demostrar que **se simplifica**. Candidato primario: `NexaMomentComposition` (TASK-1110 ya vivo, ya tiene el morph). Segundo: `AdaptiveSidecarLayout` (sibling más cercano). Si la migración *complica* al consumer, el substrato está mal modelado → se devuelve.

**Out of scope V1** (deferidos, explícitos): (a) transiciones **cross-route / "mover a interfaz nueva"** (cross-document View Transitions + App Router) — el operador mismo separó esto del transform in-place; va a V2 y es la mitad más riesgosa. (b) Reemplazo de `LayoutContent`. (c) Convertir `FloatingSurface` en consumer de regiones. (d) Regiones user-resizable/pinned. (e) Estado shell-level/global (URL/history) — V1 es route-local, como eligió el ADR Sidecar.

## Region Model (validado — skill pressure-test 2026-06-13)

El vocabulario de regiones **no es arbitrario**: lo deriva un constraint duro de plataforma + el mapeo real de los 3 consumers.

**Constraint de plataforma (modern-web-guidance / Chrome `same-document-transitions`):** la View Transitions API exige **≤ 1 elemento con un `view-transition-name` dado, antes y después** del cambio — si hay 2+, el DOM se actualiza al instante **sin** transición. Por lo tanto las regiones **deben ser roles singleton** (uno por página), nunca slots repetibles. Una "region card" repetible rompería el morph. Esto convierte el `view-transition-name` por región en el mecanismo FLIP del morph **gratis**: cada región persistente conserva su nombre estable across composiciones y el browser interpola posición/tamaño. (VT API + container queries son **Baseline desde 2023** → V1 in-place técnicamente de-riesgado.)

**Region set V1 (singleton, validado contra los consumers):**

| Región | Rol | `AdaptiveSidecarLayout` | `NexaMomentComposition` | `OrganizationWorkspaceShell` |
|---|---|---|---|---|
| `primary` | El contenido operativo principal (siempre presente; condensa, nunca desaparece) | `push`/`inline` main | host (condensado) | content |
| `aside` | Panel companion in-flow (reserva espacio, reflowea) | `push`/`inline` sidecar | `anchoredAside` | `drawerSlot` |
| `lead` | Bloque protagonista que lidera arriba (respuesta/insight), host debajo | — | `leadOverlay` (el Momento) | — |
| `dock` | Composer / action dock anclado (refinar, próxima acción) | — | composer + next-step | — |
| `overlay` | Fallback excepcional desktop cuando el contenido no puede reflowear safe + drawer temporal mobile | `overlay`/`temporary` | (mobile) | drawer temporal |

Los tres consumers colapsan limpio sobre `primary + aside + lead + dock + overlay`. `inlineExpand` (Nexa) = solo `primary` + `dock` expandido in-place. La companion spec formaliza la tabla `kind → composición` y los `min-inline-size` por región.

**Contrato a11y derivado del mismo guide (mandatory):** rutear el foco al heading recién revelado **tras `transition.finished`** (lo que `NexaMomentComposition` ya hace); sin soporte de VT → actualizar DOM + rutear foco igual (degradación honesta, never-hidden). Un solo live region.

## Alternatives Considered

- **Mantener los point solutions (status quo).** Rechazada: la rigidez es real; 3-4 consumidores reinventan regiones + morph + a11y sin contrato común; cada superficie nueva paga el costo de cero.
- **Hacer de `LayoutContent` el motor de coreografía (rip-and-replace del shell).** Rechazada: blast radius enorme, afecta cada superficie de golpe, viola la disciplina two-way-door. El substrato debe ser aditivo/opt-in.
- **Plegar esto dentro de TASK-1110 / `NexaMomentComposition`.** Rechazada: haría de una primitive Nexa-específica el substrato de facto → dominio filtrándose a la capa base. El substrato debe ser domain-neutral y dueño del modelo de regiones independiente de Nexa.
- **Generalizar `AdaptiveSidecarLayout` para cubrir todo.** Rechazada: su modelo mental es "panel al lado del contenido"; `leadOverlay`/`inlineExpand`/route-morph no encajan; estirarlo produce un god-component. Mejor: ambos pasan a ser consumers del substrato.
- **Framework de layout/animación de terceros.** Rechazada: View Transitions nativas + container queries + MUI + motion tokens existentes cubren la necesidad; una dep nueva = design-system drift sin resolver los constraints duros.

## Consequences

Positivas:

- Nexa Moments in-place, sidecars y workspace shell comparten **un** contrato de morph + a11y + View Transitions → reestructurar deja de ser cara y a-mano.
- `AdaptiveSidecarLayout`/`NexaMomentComposition`/`OrganizationWorkspaceShell` se re-expresan como composiciones, no como primitives paralelas.
- GVC verifica composiciones + transiciones de forma consistente (TASK-1018 layout-integrity gates aplican una vez, no por surface).
- El "Revisit When" del ADR Sidecar queda resuelto canónicamente en vez de por improvisación local.

Trade-offs / costos:

- Es platform-level: alto blast radius → exige rollout staged + flag + GVC antes de adopción amplia.
- Riesgo de "god layout engine": mitigado manteniendo V1 chico + el gate de validación (un consumer real debe simplificarse).
- Hay que definir el vocabulario de regiones contra las formas reales de los 3 consumers antes de congelarlo.
- Convivencia temporal: durante el rollout coexisten surfaces opt-in y legacy `LayoutContent`.

## 4-Pillar Score

### Safety
- **What can go wrong**: regresión visual/a11y propagada (foco perdido en el morph, live region duplicada, layout roto) a través de muchas superficies.
- **Gates**: es **mecanismo de layout puro** — NO toca auth/datos, NO bypassa autorización (eso queda en consumers/readers). Dominio/política fuera del substrato (capa neutral). a11y horneada (focus routing una vez, reduced-motion, `view-transition` degrade-honest). Aditivo + opt-in + flag.
- **Blast radius if wrong**: platform-wide *solo si* cambia un default no-opt-in → mitigado: las surfaces optan explícitamente; el path legacy queda intacto.
- **Verified by**: scenarios GVC por composición (desktop+mobile) + TASK-1018 layout-integrity/keyboard quality gates + tests del controller `kind→composición`.
- **Residual risk**: una superficie que adopta mal el modelo de regiones puede degradar su a11y sin que un signal de runtime lo detecte (los signals de fiabilidad cubren paths async, no layout). El net es GVC + tests, no un signal steady=0.

### Robustness
- **Idempotency**: el morph es render-derivado del estado; re-render con el mismo estado = mismo layout (sin doble-efecto).
- **Atomicity**: la transición de composición es una operación de estado del host; el substrato no persiste nada.
- **Race protection**: máquina de estados de layout (`dormant/composing/composed`) con transiciones enumeradas; el host es el único conductor (igual que `reduceAdaptiveSidecarState`).
- **Constraint coverage** (degradación honesta, no DB): sin soporte de View Transitions → swap instantáneo; sin container queries → layout base; `prefers-reduced-motion` → sin morph; SSR/hydration de region slots verificado; contenido **never-hidden** durante el morph.
- **Verified by**: tests del controller (resolver + reducer) + GVC con animaciones congeladas + matriz de soporte de browser.

### Resilience
- **Retry policy**: N/A (no async). El fallo del morph degrada a swap; el contenido sigue visible.
- **Dead letter**: N/A.
- **Reliability signal**: **honesto — no hay signal de runtime para un substrato de layout** (a diferencia de paths async). La red de regresión es GVC (scenarios por composición) + los layout-integrity gates de TASK-1018 + tests del controller. Esto se nombra como límite, no se finge un signal.
- **Audit trail**: N/A (UI mechanism, sin mutación de estado de negocio).
- **Recovery procedure**: flag OFF → la surface vuelve al render legacy (`LayoutContent`). Rollback = flag, no migración.

### Scalability
- **Hot path Big-O**: render-time O(1) por superficie (sin trabajo por-ítem; sin N+1; sin data).
- **Index coverage**: N/A (no DB).
- **Async paths**: N/A.
- **Cost at 10x** (N surfaces × N composiciones): sub-lineal — el substrato es código compartido, no por-surface. View Transitions GPU-compositadas; container queries nativas. El costo marginal es bundle del substrato (chico por diseño) + render de las regiones declaradas.
- **Pagination**: N/A.

## Hard Rules

- **NUNCA** meter dominio/política en el Composition Shell. El substrato es mecanismo neutral (regiones + composiciones + morph). La política (qué composición, qué contenido, qué dominio) vive en el consumer.
- **NUNCA** reemplazar `LayoutContent`/`StyledMain` por el substrato. Es aditivo + opt-in; la surface que no opta queda intacta.
- **NUNCA** inventar una composición nueva por dominio. Un kind de dominio resuelve a una composición existente vía el controller (P+V+K).
- **NUNCA** forkear View Transitions ni motion: el substrato reusa `startViewTransition` (TASK-525/1102) + los motion tokens. Cero hardcode de duración/easing/ms.
- **NUNCA** ocultar contenido durante el morph (never-hidden) ni dejar al usuario atrapado mid-transición. Degradación honesta a swap instantáneo sin View Transitions / con reduced-motion.
- **NUNCA** flipear `compactContentWidth` a `wide` global para acomodar una composición. El substrato opera dentro del contrato de ancho; un cambio de ancho es decisión de `design-system-governance`.
- **NUNCA** tratar `GreenhouseFloatingSurface` como región de página (es anclado-transitorio; otra preocupación).
- **NUNCA** declarar la primitive completa sin: (a) un consumer existente re-expresado que **se simplifique**, (b) evidencia GVC desktop+mobile por composición, (c) tests del controller `kind→composición` + el reducer de estado.
- **SIEMPRE** mantener el flag default OFF hasta GVC verde + sign-off; rollout staged (un consumer → QA → ampliar).
- **SIEMPRE** declarar `min-inline-size` por región (deuda heredada del ADR Sidecar).

## Revisit When

- Una superficie necesita transición **cross-route** real (mover a interfaz nueva) → dispara V2 (cross-document View Transitions + App Router).
- Dos composiciones concurrentes en la misma superficie → ADR nuevo (igual que el Sidecar trató dos sidecars concurrentes).
- El substrato necesita **estado shell-level/global** (URL/history) en lugar de route-local.
- El gate de validación falla (ningún consumer se simplifica) → la abstracción está mal y se devuelve.

## Open Questions (deliberadamente no decididas)

- ~~Vocabulario de regiones exacto~~ — **RESUELTO** (skill pressure-test 2026-06-13): `primary/aside/lead/dock/overlay`, derivado del constraint singleton de View Transitions + el mapeo de los 3 consumers (ver §Region Model). Los `min-inline-size` por región se afinan en la companion spec.
- **¿`OrganizationWorkspaceShell` es consumer o queda separado?** — depende de si su frontera shell/content + `drawerSlot` mapea al modelo de regiones.
- **Naming canónico**: "Composition Shell" (elegido por el operador) vs "Layout Choreography Substrate". Este doc usa Composition Shell.
- **Frontera con el Moment Fabric**: el substrato es UI-platform (regiones/morph/a11y); el Moment Fabric (TASK-1095/1096, lane Codex) es eligibility/context-adapter/action-boundary/señales. La costura sigue siendo `surfaceContext` + `renderPlan`. ¿Dónde vive el `placement: 'composed'` — en el substrato o en el surfaceContext? (Hoy vive en surfaceContext, TASK-1110.)

## Patrones canonizados que extiende / de los que diverge

1. **Adaptive Sidecar (TASK-1028 + `GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`)** — el substrato generaliza su "make room, don't overlay" + ejecuta su disparador *Revisit When* ("shell-level host needed by >2 domains"). El Sidecar pasa a ser consumer.
2. **Primitive + Variants + Kinds (`GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`)** — regiones = estructura, composiciones = variants, kinds → composición. Mismo molde.
3. **Motion Primitive + View Transitions helper (`GREENHOUSE_MOTION_PRIMITIVE_V1.md`, TASK-525/1102)** — el substrato los consume, no los forkea; el ownership de View Transitions a nivel shell es la pieza nueva.
4. **NexaMomentComposition (TASK-1110, Moment Fabric GAP A)** — el primer consumer "composed"; valida el substrato y mantiene la frontera UI-platform / Moment Fabric.

## Related Docs

- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md` + `GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md` (§13 GAP A)
- `docs/tasks/in-progress/TASK-1110-nexa-composition-runtime-wiring-knowledge-inplace.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Delta 2026-06-13 — Investigación de mercado + referencias canónicas

Evidencia nueva (no cambia la decisión; la afila). Investigación de cómo el mercado resuelve la coreografía de layout a nivel shell → **3 patrones convergentes** que validan el diseño:

1. **Los productos serios *nombran* sus layouts.** **Material 3 "Canonical Layouts"** ([m3.material.io](https://m3.material.io/foundations/adaptive-design/canonical-layouts)) define layouts nombrados (`list-detail`, `supporting-pane`, `feed`) que reflowean por *window size class* (compact/medium/expanded) con 1-2 paneles. **Carbon** nombra regiones de shell (UI Shell + content + dialogs); **Atlassian** trata el layout como *primitives* composables (Grid sobre CSS Grid API). → valida regiones + composiciones nombradas como primitive de shell, no layout por página.
2. **Separan "augmentar in-place" de "modo dedicado", con un puente entre ambos.** **Google AI Overviews** inyecta la respuesta **in-place** en la página actual (lidera, el resto sigue) = nuestro `lead` / **V1 in-place**. **Google AI Mode** es un **modo separado que el usuario elige** = **V2 cross-route** (lente dedicada). Google ship el "saltar de Overviews a AI Mode" = el **bridge** first-class. → valida que **V1 (in-place) vs V2 (cross-route) es el sequencing correcto**, no una concesión.
3. **"Adapt, not takeover" es el principio canónico de UI agéntica** (agentic-interfaces research: *inline microinteraction* / *side panel* / *proactive nudge*, host vivo + procedencia visible). → valida host-stays-alive + los placements `lead`/`aside`/inline.

**Cómo afina la aplicación (vinculante para la companion spec + TASK-1114):**

- **Adoptar el framing "canonical layouts" de M3**: las composiciones (`single/leadPlusContext/split/focused`) son los *canonical layouts de Greenhouse*, con su **disciplina de breakpoints** (compact/medium/expanded → el `aside` colapsa a `overlay`/`temporary` en compact — comportamiento que `AdaptiveSidecarLayout` ya hace). Mapear donde aplique: `split` ≈ list-detail / supporting-pane.
- **V1 = modelo AI Overviews (in-place); V2 = modelo AI Mode (route)**; el **bridge** es first-class desde V1.
- **`react-resizable-panels`** (bvaughn — resize + collapse + persistencia + a11y de teclado) queda para **V2** (regiones redimensionables/persistentes). V1 = regiones fijas + morph por View Transitions. NO mezclar resize con morph.
- Substrato V1 confirmado = **View Transitions API (Baseline 2025) + CSS grid + container queries (Baseline 2023)**; resize es capa aditiva posterior.

Fuentes: [M3 Canonical Layouts](https://m3.material.io/foundations/adaptive-design/canonical-layouts) · [Android Canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts) · [AI Mode vs AI Overviews](https://www.evertune.ai/resources/insights-on-ai/google-ai-mode-vs-google-ai-overviews-whats-the-difference) · [AI Overviews → AI Mode](https://www.techbuzz.ai/articles/google-links-ai-overviews-to-conversational-ai-mode) · [Where should AI sit in your UI?](https://uxdesign.cc/where-should-ai-sit-in-your-ui-1710a258390e) · [Agentic Interfaces](https://insights.theinteractive.studio/beyond-the-chat-agentic-interfaces-inside-your-product) · [View Transitions API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) · [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) · [Atlassian Primitives](https://atlassian.design/foundations/primitives) · [Carbon 2x Grid](https://carbondesignsystem.com/elements/2x-grid/usage/)

## Delta 2026-06-13 (b) — Contrato de fluidez + Adaptive Card + piloto

### Contrato de fluidez (lo que el shell hornea más allá de nombrar zonas)

Nombrar zonas es el esqueleto estático. La fluidez son **capacidades dinámicas neutrales** horneadas en el substrato. El consumer solo declara *qué composición + qué contenido*; el shell aporta:

**A. Movimiento** (V1): morph FLIP entre composiciones (`view-transition-name` por región persistente) · promoción shared-element (un card crece a `lead`) · orquestación enter/exit/reorder con stagger (motion tokens) · transiciones interrumpibles (V1 mínimo).

**B. Adaptación** (V1): regiones size-aware (container queries — el contenido reflowea a su espacio) · condensación honesta (condensa, no clipea) · resolución adaptativa por breakpoint (M3 compact/medium/expanded; `aside`→`overlay`/`temporary` en compact) · scroll anchoring + scroll-driven entrance.

**C. Continuidad de atención** (V1): anchoring cita↔host (highlight + scrollIntoView) · focus/announce routing tras `transition.finished` (un solo live region) · skeleton-to-content (skeleton dimensionado al contenido final → CLS=0).

**D. Gobierno del estado** (V1): máquina de estados de composición (transiciones enumeradas) · collision/arbitration (quién ocupa el `aside`, dirty-guard estilo sidecar reducer) · persistencia/restore sin flash (route-local V1; broad V2).

**Tradeoff horneado**: View Transitions, si se dispara una nueva mientras corre otra, **salta-y-reinicia** (no redirige el interpolado). Para interrupción *buttery* (drag, cambio de idea a media animación) el tool es **framer-motion `layout`** → el substrato consume **ambas** capas de motion (VT para morph estructural + framer-motion para lo interrumpible), no solo VT. Disciplina anti-"juguete": motion tokens cortos + `prefers-reduced-motion` (swap instantáneo) + menos-es-más (enterprise sobrio).

### Adaptive Card — capacidad HERMANA (el contenido, no el contenedor)

El shell mueve el *contenedor*; sin cards adaptables la fluidez se rompe en el micro (clipean al condensar). **El card se adapta, pero NO hereda del shell (acoplamiento) — es intrínsecamente adaptable** vía container queries (`container-type: inline-size`): responde a **su propio ancho**, no al shell. Así compone en cualquier contenedor (región, drawer, dashboard grid, mobile) **sin conocer el shell**; cuando el shell reflowea la región, el ancho del card cambia → su query dispara sola. **Componen sin cablearse.**

Contrato compartido (consistencia) = generaliza el **Density Contract de TASK-743** (tablas `compact/comfortable/expanded`) a cards: modos de fit canónicos (`full`/`condensed`/`peek`) + **condensación honesta** (state-design: versión real más chica, NUNCA clip/overflow/`$0` — KPI→value+label, chart→sparkline, list→menos filas + "+N"). El contrato define los modos; cada arquetipo de card implementa *qué* esconde por modo (diseño, no automático).

**Boundary:** Composition Shell (TASK-1114) = contenedor (regiones/composiciones/morph). Adaptive Card (TASK-1115) = contenido (card se adapta a su ancho). **El seam es la container query.** TASK-1114 solo (a) garantiza que las regiones son *query containers válidos* y (b) documenta que el card es dueño de su adaptación intrínseca. Ambas son útiles por separado; no mezclar dimensiones (1 task cada una).

### Piloto + rollout (flag OFF para legacy)

- **Piloto = la lente compuesta de Knowledge** (el consumer `NexaMomentComposition`, TASK-1110). Unifica el **gate de validación** (migrar `NexaMomentComposition` y que se simplifique) con el primer piloto real.
- **Flag por-surface, default OFF.** Las UI legacy quedan exactamente como hoy (`LayoutContent` intacto). El flag se enciende **solo para la surface piloto**. Revert = flag OFF (sin migración). Patrón consistente con los flags de la lente conversacional (`NEXA_ANSWERS_CANVAS_LENS_ENABLED`).
- **Adaptive Card NO bloquea el piloto**: el host de Knowledge no tiene grids densos de KPI que condensen fuerte; el piloto puede shippear con el shell morph y la Adaptive Card entra como follow-up (TASK-1115).

## Delta 2026-06-14 — veredicto del gate: SIBLINGS (forced merge rechazado) + per-instance VT (TASK-1114 complete)

El gate de validación (Slice 4: "¿un consumer real simplifica si delega en el substrato?") se ejecutó con contexto completo sobre `NexaMomentComposition`. **Resultado:**

1. **Gap encontrado + arreglado:** `CompositionShell` usaba `view-transition-name` **globales** → colisión con 2+ instancias por página (el Lab de `NexaMomentComposition` renderiza 2). Fix: `regionViewTransitionName(region, instanceId)` + `useId` (nombre base estable por región, escopado por instancia). El substrato ahora es **multi-instancia-safe**. Commit `9ad2ac077`.
2. **Forced merge RECHAZADO (over-abstraction):** `NexaMomentComposition` y `CompositionShell` tomaron micro-decisiones deliberadas distintas (grid split 50/50 vs ~68/32; host `opacity:1` vs `0.92`; región del moment con borde+bg vs plana; `inlineExpand` sin composición equivalente). Un byte-mirror exigiría inflar el substrato neutral con props Nexa-específicas (**domain leak**) o regresar la apariencia del primitive. Ninguna vale.

**Decisión canónica: SIBLINGS.** `CompositionShell` (substrato de layout neutral, general) y `NexaMomentComposition` (composición Nexa-específica con anclaje/next-step/bridge + sus micro-decisiones) **coexisten como hermanos**, compartiendo las piezas de bajo nivel (`startViewTransition`, motion tokens, el patrón per-instance VT) — **NINGUNO se construye sobre el otro**. Forzar la fusión sería el anti-patrón "estirar un primitive hasta volverlo god-component" (mismo principio que el ADR del Adaptive Sidecar rechaza). El gate cumplió su propósito: validar el substrato (no fusionar). **TASK-1114 → complete.**

## Delta 2026-06-14 (b) — hardening V1.1 (TASK-1119) + fluidez V1.2 (TASK-1117) shipped (aditivo, default byte-idéntico)

Tras congelar el substrato (TASK-1114), se cerró el trabajo pendiente REAL declarado en el ADR — todo **aditivo + opt-in**, sin cambiar el contrato público ni el comportamiento default (`fluidity='baseline'` ≡ V1 byte-a-byte). Resuelve el residual que el §4-Pillar nombró honesto ("un substrato de layout no tiene signal de runtime; la red es GVC + tests").

**TASK-1119 — Hardening / drift-prevention / observabilidad:**
- **Guard dev-time del singleton view-transition-name** (`composition-shell-vt-guard.ts`): detector puro de colisiones + registro refcount cross-instancia. Avisa en dev cuando dos elementos vivos reclaman el mismo nombre (el "morph silencioso": el browser salta la transición = corte duro). Non-blocking en prod. Es el complemento runtime del scoping per-instance.
- **Lint rule `greenhouse/no-ad-hoc-layout-morph`** (warn-first): el substrato es **dueño del namespace reservado `gh-region-*`** de view-transition-name. Hand-wirearlo en views/app/components re-introduce la colisión singleton. **PRECISA**: NO flagea las transiciones shared-element TASK-525 (`person-avatar-*`, `quote-identity-*`, `nexa-moment-*`) — otro namespace, patrón sancionado. Exentos por path: el substrato, el motion family, el Lab. Mirror de `no-direct-gsap-in-views`.
- **Telemetry opt-in** (`createCompositionShellEvent` + `compositionShellActionToTelemetryName`): factory pura mirror de `createAdaptiveSidecarEvent`. El consumer declara `onTelemetry`; el substrato emite `composition.compose`/`settle`/`reset`/`blocked_dirty` (no emite en no-ops). Sin sink → cero costo.
- **Reducer hardening**: tests property/concurrency (1k pasos × 20 seeds, pureza, redirección mid-morph, dirty-guard).
- **Baseline GVC durable committeado** (`scripts/frontend/baselines/design-system.composition-shell/`, 6 frames desktop+mobile): regresión visual byte-a-byte en cada cambio futuro. Cierra el "no hay signal de runtime" con la red de regresión visual.

**TASK-1117 — Fluidez (techo cinemático, opt-in `fluidity='rich'`):**
- **Entrada orquestada con stagger** (`composition-shell-motion.ts`, variants puros derivados de motion tokens: stagger 60 ms, ease emphasized `[0.2,0,0,1]`, 200 ms). El contenido entra con beat, no pop.
- **Morph interrumpible** (`morphStrategy='interruptible'`, framer-motion `layout`): redirigible a media animación (drag, cambio de idea). **Frontera dura** (motion-design skill): VT hace el morph ESTRUCTURAL de regiones, framer-motion `layout` el INTERRUMPIBLE, el reveal stagger la ENTRADA — **nunca animan la misma propiedad sobre el mismo nodo a la vez**. Coexisten, no pelean.
- **Promoción shared-element (card → lead)**: un view-transition-name compartido por snapshot (≤1 elemento por nombre) → el browser morfea la card creciendo al lead. Demo viva en el Lab.
- **Drawer temporal real en compact split**: `aside` deja de apilar y se vuelve drawer temporal (MUI `Drawer`, focus trap + aria-modal + Esc nativos). `resolveCompositionLayout` ya lo señalaba (`asideAsDrawer`); ahora el componente lo materializa con disclosure local (mecanismo, no dominio).
- **reduced-motion horneado** (`useReducedMotion`): swap instantáneo, never-hidden, compositor-only (transform/opacity).

**Evidencia:** 36 tests focales del substrato verde · 305 tests de `primitives/` verde · tsc 0 · lint rule RuleTester verde · GVC desktop+mobile mirado (single/leadPlusContext/split + drawer compact + telemetry en vivo) → baseline promovido. **TASK-1119 + TASK-1117 → complete.** El veredicto SIBLINGS se mantiene (no se fusiona con `NexaMomentComposition`).

## Delta 2026-06-14 (c) — Adaptive Card density contract shipped (TASK-1115, la capacidad HERMANA)

La capacidad hermana que el Delta 2026-06-13 (b) declaró ("el shell mueve el contenedor; sin cards adaptables la fluidez se rompe en el micro — clipean al condensar") está **shipped**. El boundary se respetó verbatim: **el card se adapta a su propio ancho (container query), NO hereda del shell — el seam es la container query.**

- **`card-density`** (capacidad COMPARTIDA, no un componente card nuevo): `useContainerDensity` (ResizeObserver SSR-safe) + `resolveCardDensity`/`resolveCardDensityRequest` resuelven los modos `full`/`condensed`/`peek` por el ancho del propio card. Generaliza el density contract de tablas (TASK-743) + reusa el patrón `size→behavior` de `resolveAdaptiveSidecarMode` (un solo motor de adaptación en la plataforma).
- **Condensación honesta** (state-design): cada modo es una versión real más chica; el dato clave (value) nunca desaparece; NUNCA clip/overflow/`$0`.
- **Adopción aditiva opt-in** (`density?: CardDensityRequest`, default `full` byte-idéntico): `MetricSummaryCard` + `MetricTrendCard`. NUNCA fork paralelo ni construir sobre `AdaptiveSidecarLayout` (es panel, no card) — se extienden los card primitives existentes.
- **Evidencia:** 8 tests del resolver + 313 tests de `primitives/` (0 regresión en `full`) · tsc 0 · Lab `/design-system/card-density` + baseline GVC durable desktop+mobile mirado (full/condensed/peek, condensación honesta sin clip). **TASK-1115 → complete.**
