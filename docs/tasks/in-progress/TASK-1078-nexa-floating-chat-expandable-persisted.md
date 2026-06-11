# TASK-1078 — Nexa floating chat: panel expandible + historial persistido

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Slice 1 COMPLETO (mockup concepto B con acabado enterprise, pulido en loop GVC + skills). Slices 2-4 (runtime persistente + non-modal a11y + cutover) PENDIENTES.`
- Rank: `TBD`
- Domain: `ui|delivery|identity`
- Blocked by: `none`
- Branch: `task/TASK-1078-nexa-floating-chat-expandable-persisted`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Rediseñar el chat flotante de Nexa (`NexaFloatingButton.tsx`) al **concepto B (panel expandible)** producto del `product-design-loop`: el panel crece de dock compacto → workspace ancho con **rail de historial** + grilla de prompts sugeridos + selector de modelo. Adopta la **persistencia multi-thread que YA existe** (`greenhouse_ai.nexa_threads`/`nexa_messages` + store + API + `NexaThreadSidebar`, hoy solo en el Home) en lugar del `useLocalRuntime` efímero del floating. Shell tokenizado (elevación por roles, non-modal), reuse del SDK headless. NO toca backend/migraciones — la persistencia ya está.

## Why This Task Exists

El chat flotante de Nexa hoy: panel desktop = `Card` fija 400×550 con `boxShadow:24` + `borderRadius:4` crudos, header mini, y `useLocalRuntime` → **un solo thread efímero, sin historial** (cada apertura empieza de cero, se pierde al recargar). El Home, en cambio, ya tiene historial persistido (`NexaThreadSidebar` + `nexa_threads`/`nexa_messages` + `/api/home/nexa/threads`). El floating quedó atrás: no persiste, no escala a sesiones de trabajo, y su acabado no está al bar enterprise 2026 (sombra/radio crudos en vez de roles de elevación tokenizados).

El `product-design-loop` (corrido 2026-06-11) generó 3 conceptos divergentes; el operador eligió **B** e instruyó **historial real**. Al investigar se confirmó que la persistencia NO es greenfield — ya existe y solo hay que **reusarla en el floating**. Esto baja el scope de "feature con migraciones" a "task frontend de reuse".

## Goal

- El panel flotante de Nexa expande de dock compacto a workspace ancho (compacto ↔ expandido) con un control claro de collapse/expand.
- El floating persiste conversaciones (adopta el thread-list runtime + `nexa_threads`/`nexa_messages` que el Home ya usa) y muestra un **rail de historial** reusando `NexaThreadSidebar`.
- Empty-state con grilla de prompts sugeridos (`ThreadPrimitive.Empty`/`Suggestion`) + selector de modelo visible (`NexaModelSelector`).
- Shell tokenizado: elevación por rol (`overlay`→`modal` al expandir, NO `boxShadow:24`), radius `lg`, spacing 4n, non-modal (Escape + click-fuera + return-focus al FAB), composer `field-sizing:content`.
- Evidencia GVC desktop + mobile mirada de los estados (compacto, expandido, empty, con-historial, loading).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `CLAUDE.md` → "Patron canonico Adaptive Sidecar (TASK-1028)", "Patron canonico Floating Surface (TASK-1033)", "Elevation / Shadow tokens (TASK-1049)", "Typography System".
- `docs/architecture/ui-platform/PRIMITIVES.md` + `STATE.md` + `MOTION.md`.
- `DESIGN.md` (contrato visual agent-facing) + `GREENHOUSE_DESIGN_TOKENS_V1.md`.

Reglas obligatorias:

- Reuse-first: NUNCA reinventar burbujas/composer (SDK `@assistant-ui/react` headless ya envuelto en `NexaThread`) ni el historial (store + API + `NexaThreadSidebar` ya existen).
- Elevación = rol semántico (`theme.greenhouseElevation.*`), NUNCA `boxShadow:24` ni `Paper elevation={n}`.
- Copy es-CL visible → `src/lib/copy/*` (regla `greenhouse/no-untokenized-copy`); validar con `greenhouse-ux-writing`.
- Cero hardcode HEX/px/fontFamily (lint gates).

## Normative Docs

- `src/lib/nexa/nexa-contract.ts` — `NexaThreadListItem`, `NexaResponse`, tipos del dominio Nexa.
- `scripts/frontend/scenarios/_README.md` — DSL GVC + gates `quality.*`.

## Dependencies & Impact

### Depends on

- `greenhouse_ai.nexa_threads` + `greenhouse_ai.nexa_messages` (existen) + `src/lib/nexa/store.ts` (`listNexaThreads`, …).
- API `/api/home/nexa/threads` + `/api/home/nexa/threads/[threadId]` (existen).
- `@assistant-ui/react` v0.12.21 (headless primitives — `ThreadPrimitive`/`ComposerPrimitive`/`MessagePrimitive`).
- El runtime que persiste usado por `HomeView` (`AssistantRuntimeProvider runtime={...}` línea ~485) — `[verificar]` cuál hook/runtime exacto persiste (Discovery: extraerlo a un hook reusable si está inline en HomeView).

### Blocks / Impacts

- Habilita la **follow-up de C** (lane sidecar full-height) + la preferencia de "modo de interacción con Nexa" (ver Follow-ups). C es **deferred-but-committed** por decisión del operador.
- `NexaFloatingButton.tsx` es consumido por `src/app/(dashboard)/layout.tsx` — cualquier regresión afecta todas las rutas (salvo `/home` donde el floating se oculta).

### Files owned

- `src/components/greenhouse/NexaFloatingButton.tsx` (rework shell)
- `src/app/(dashboard)/nexa/floating-chat/mockup/page.tsx` (nuevo — GVC)
- `src/views/greenhouse/nexa/floating-chat/mockup/*` (nuevo — mockup view)
- `src/lib/nexa/use-nexa-runtime.ts` `[verificar/posible]` — hook reusable si hay que extraer el runtime persistente de HomeView
- `src/lib/copy/*` (copy es-CL del shell)
- `scripts/frontend/scenarios/nexa-floating-chat-*.json` (scenarios GVC)

## Current Repo State

### Already exists

- **Persistencia Nexa completa**: tablas `greenhouse_ai.nexa_threads`/`nexa_messages`, store `src/lib/nexa/store.ts`, API `/api/home/nexa/threads[/[threadId]]`.
- **Historial UI**: `src/views/greenhouse/home/components/NexaThreadSidebar.tsx` (agrupado por fecha) — hoy solo en Home.
- **Thread reusable**: `NexaThread.tsx` (646 líneas, SDK headless + MUI) — compartido Home + floating.
- **Selector de modelo**: `NexaModelSelector.tsx`.
- **Floating actual**: `NexaFloatingButton.tsx` — FAB + panel (Drawer mobile / Card fija desktop) + `useLocalRuntime` efímero.
- **Primitives de elevación + sidecar**: `theme.greenhouseElevation.*`, `AdaptiveSidecarLayout`/`ContextualSidecar` (para C, no para B).
- **Conceptos IA del loop**: `.captures/concepts/nexa-floating-chat/` (concept-a/b/c + manifest.json, gitignored).

### Gap

- El floating usa `useLocalRuntime` (efímero) en vez del runtime persistente del Home → sin historial.
- No tiene estado expandido ni rail de historial.
- Shell con `boxShadow:24`/`borderRadius:4` crudos (no roles de elevación / tokens).
- `[verificar]` si el runtime persistente del Home está extraído como hook reusable o inline en `HomeView` (si inline, extraerlo es parte del scope).

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mockup tokenizado del shell B + GVC ✅ COMPLETO (2026-06-11)

- Route `src/app/(dashboard)/nexa/floating-chat/mockup/page.tsx` + view, runtime mock (mensajes + thread-list sembrados) para capturar determinístico.
- Shell expandido concepto B: header (presencia + controles + collapse/close), rail de historial (mock), `NexaThread`, empty-state con grilla de prompts, composer.
- Tokenizado: elevación por rol, radius `lg`, spacing 4n, tipografía SoT. Cero hardcode.
- Scenarios GVC (compacto, expandido, empty, con-historial) + `quality.layout`/`quality.keyboard`/`quality.enterpriseRubric`. Iterar hasta verse enterprise (desktop + mobile).
- **Resultado real:** la sesión 2026-06-11 llevó el mockup MUY por encima del scope original — ver `## Delta 2026-06-11` para el inventario completo de componentes, decisiones y fixes. **Cambio de scope:** el `NexaModelSelector` se ELIMINÓ del header (decisión del operador: "Nexa elige el modelo automáticamente"); el empty-state ya NO lo muestra. El acceptance criterion del selector queda obsoleto (ver Delta).

### Slice 2 — Adoptar runtime persistente + rail de historial real

- `[verificar]` extraer el runtime persistente de `HomeView` a un hook reusable (`useNexaRuntime`) si está inline; reusarlo en el floating reemplazando `useLocalRuntime`.
- Reusar `NexaThreadSidebar` como rail del panel expandido (mismo store + API).
- Nuevo thread / seleccionar thread del historial / persistir mensajes — verificado end-to-end contra `/api/home/nexa/threads`.

### Slice 3 — State machine compacto↔expandido + non-modal + a11y

- Estado `collapsed | expanded`; elevación `overlay`→`modal` al expandir; control de expand/collapse.
- Non-modal: Escape cierra, click-fuera cierra, return-focus al FAB; foco atrapado solo en el panel; `role` correcto.
- Composer `field-sizing:content` (autosize vertical, patrón modern-web-guidance) vía `sx` sobre el slot del SDK.

### Slice 4 — Cutover flag + GVC baseline + port a runtime

- Flag `NEXA_FLOATING_EXPANDABLE_ENABLED` (default `false`) que togglea el shell nuevo vs el actual.
- `baseline.surfaceId` + `fe:capture:diff --promote` del mockup aprobado; runtime corre el diff.
- Sacar el shell runtime fuera de `/mockup/`; GVC desktop+mobile del runtime real.

## Out of Scope

- **Concepto C (lane sidecar full-height)** + la preferencia de "modo de interacción con Nexa" → follow-up dedicada (deferred-but-committed).
- Cambios al backend de persistencia (tablas/store/API ya existen — solo se reusan).
- Cambios al motor de respuesta de Nexa (`/api/home/nexa` stateless del turno) ni a tools.
- Rediseño del FAB trigger (se mantiene; el usuario eligió alcance "visual + affordances", no "repensar FAB").
- Rediseño del Nexa del Home (esta task es solo el floating; el Home ya tiene historial).

## Detailed Spec

**Concepto elegido (B):** panel anclado derecha que crece de dock compacto a workspace ancho. Rail izquierdo de conversaciones (historial), columna principal de thread, empty-state con grilla 2×2 de prompts sugeridos con íconos, selector de modelo visible en header, composer full-width con autosize. Referencia visual: `.captures/concepts/nexa-floating-chat/concept-b-expandable-panel.png` (intención, NO valores literales).

**Decisión de primitive (reportada en Fase 3 del loop):**
- Reuse: `NexaThread` (SDK headless), `NexaModelSelector`, `NexaThreadSidebar`, store + API de threads, `ThreadPrimitive.Empty`/`Suggestion`.
- Extend: el shell de `NexaFloatingButton` (estado expandible + tokens + non-modal). NO es una primitive nueva — es rework del componente existente.
- NO usar `AdaptiveSidecarLayout` aquí (eso es para C). B es un panel flotante anclado, no un lane in-flow.

**Mockup-first:** runtime mock con mensajes + thread-list sembrados para GVC determinístico, luego port al runtime persistente real (Slice 4).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (mockup + GVC) → Slice 2 (runtime persistente) → Slice 3 (expandible + a11y) → Slice 4 (cutover flag + port runtime).
- Slice 4 (flag) DEBE shippear con default `false`; el cutover a `true` solo tras GVC runtime verde + verificación de persistencia end-to-end.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión del floating en TODAS las rutas (consumido por `(dashboard)/layout.tsx`) | UI | medium | flag `NEXA_FLOATING_EXPANDABLE_ENABLED` default `false` + GVC baseline diff | GVC `quality.runtime` (console.error/hydration) |
| Extraer el runtime de HomeView rompe el Nexa del Home | UI | medium | extraer a hook sin cambiar comportamiento del Home + GVC del Home antes/después | GVC Home scenario |
| Persistencia escribe threads basura desde el floating | identity/data | low | reusar store + API existentes sin cambios; verificar scoping por member como el Home | (sin signal — emerge en `nexa_threads` inspección) |
| Composer `field-sizing` no soportado en algún browser | UI | low | fallback honesto (textarea con max-block-size); progressive enhancement | GVC `quality.layout` |

### Feature flags / cutover

- Env/constante `NEXA_FLOATING_EXPANDABLE_ENABLED` (default `false`) togglea shell nuevo vs actual. Revert: flag `false` + redeploy (<5 min Vercel). Additive — el shell viejo queda intacto hasta el flip.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 1 (mockup) | borrar route mockup | sí (additive, gitignored captures) |
| 2 (runtime) | flag off → vuelve a `useLocalRuntime` | sí |
| 3 (expandible) | flag off | sí |
| 4 (cutover) | flag `false` + redeploy | sí |

### Production verification sequence

- GVC runtime desktop+mobile verde (compacto/expandido/empty/historial).
- Persistencia: crear conversación desde el floating → aparece en `nexa_threads` scoped al member → recargar → historial presente.
- El Home Nexa intacto (sin regresión por la extracción del runtime).

### Out-of-band coordination required

- Ninguna. No toca SCIM/SSO/payroll/finance/release/cron/outbox/migrations.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El panel flotante expande de compacto a ancho y colapsa, con control visible.
- [ ] Una conversación iniciada en el floating persiste (visible tras reload, en `nexa_threads` scoped al member) y aparece en el rail de historial.
- [ ] El rail de historial reusa `NexaThreadSidebar` (no una implementación paralela).
- [ ] Empty-state muestra prompts sugeridos vía `ThreadPrimitive.Suggestion`; selector de modelo visible vía `NexaModelSelector`.
- [ ] Elevación por rol (`theme.greenhouseElevation.*`), cero `boxShadow:24`/`borderRadius` numérico crudo; cero hardcode HEX/px/fontFamily (lint verde).
- [ ] Non-modal: Escape cierra, click-fuera cierra, foco vuelve al FAB; foco atrapado en el panel mientras está abierto.
- [ ] Flag `NEXA_FLOATING_EXPANDABLE_ENABLED` default `false`; con `false` el comportamiento es el actual bit-for-bit.
- [ ] Copy es-CL en `src/lib/copy/*` (no literales inline en runtime).
- [ ] El Nexa del Home sin regresión.

## Verification

- `pnpm local:check:ui` (lint + tsc + design:lint + build).
- `pnpm fe:capture` runtime desktop + mobile (compacto/expandido/empty/historial) + gates `quality.layout`/`quality.keyboard`/`quality.enterpriseRubric` mirados.
- Verificación de persistencia end-to-end contra `/api/home/nexa/threads`.

## Closing Protocol

- Mover a `complete/`, `Lifecycle: complete`, sincronizar `docs/tasks/README.md`.
- Invocar `greenhouse-documentation-governor`.
- Cerrar la follow-up de C en `Follow-ups` con su estado.

## Follow-ups

- **[deferred-but-committed] Concepto C — lane sidecar full-height + preferencia de modo de interacción con Nexa.** El operador (2026-06-11) decidió preservar C para producirla DESPUÉS de B, como parte de una elección user-facing del "modo de interacción con Nexa" (dock compacto / panel expandible B / lane sidecar C). C mapea a `AdaptiveSidecarLayout` + `ContextualSidecar` (primitive canónica), desktop lane `role=complementary` / mobile Drawer. Concepto IA: `.captures/concepts/nexa-floating-chat/concept-c-sidecar-lane.png` (gitignored — descripción preservada aquí porque el PNG no es trackeable). Crear como TASK derivada cuando B cierre.
- **[deferred] Concepto A — dock compacto pulido** como el tercer modo de la preferencia (el más liviano). Concepto: `concept-a-compact-dock.png`.
- **[deferred-but-committed] Prompts sugeridos CONTEXTUALES (Tier 1 frontend + Tier 2 backend).** La UX ya está resuelta en el mockup (2026-06-11): el empty hero muestra un **chip de contexto** + una grilla de prompts que dependen de la pantalla/contexto (mock: General / Finanzas · P&L / Cliente · Sky Airline / Nómina; los de Cliente interpolan el nombre de la entidad). Falta cablear el runtime:
  - **Tier 1 — resolver frontend (sin backend, primer paso):** `resolveNexaSuggestedPrompts(context)` que mapea `{ routeFamily, entity, role }` → un set curado de templates con el nombre de la entidad interpolado (ej. `/agency/clients/[id]` → "¿Cómo viene {cliente} este mes?", `/finance/*` → P&L/gasto/margen/flujo, `/hr/payroll/*` → nómina/variaciones/cierre). El `NexaFloatingButton` (global) lee la ruta actual (Next router) + un contexto liviano provisto por la página (un `NexaContextProvider` o un mapping ruta→familia) + el rol del subject → elige el set. Determinístico, cero costo IA, cero datos. **Es el MVP de contextualidad.**
  - **Tier 2 — endpoint data-aware (backend, follow-up):** `GET /api/nexa/suggested-prompts?context=...` que devuelve prompts **basados en señales reales** de la entidad/pantalla (anomalías, pendientes, KPIs en rojo) — ej. "2 cuentas cayeron >10% este mes, ¿las vemos?", "Quedan 3 finiquitos por ratificar antes del cierre". Curado por reglas o generado por IA con allowlist de contexto (ningún dato sensible al prompt). Necesita los readers de cada dominio + posible cache. Gateado por capability/rol como el resto de Nexa.
  - **Contrato de contexto canónico:** alinear con WebMCP `navigator.modelContext` (exponer el contexto de la página al asistente) como dirección futura — la página declara su contexto, Nexa lo consume. Hoy basta el resolver frontend.
  - Mock de referencia: `NEXA_PROMPT_CONTEXTS` + control "Contexto" en `NexaFloatingChatMockupView`. Evidencia GVC: scenario `nexa-ctx` (cambio Finanzas/Cliente).
- **[deferred-but-committed] Extraer `NexaComposer` (input + botón enviar + `NexaGlowBorder`) como primitive canónica del Design System.** Decisión del operador (2026-06-11): cuando el chat de Nexa quede cerrado/corregido, el composer completo (campo de texto sin box propio + botón enviar navy↔teal compacto + glow "línea de luz" de dos capas) debe vivir como **primitive canónica** en `src/components/greenhouse/primitives/` con su **entrada en `/admin/design-system`** + **reglas de uso** documentadas. Nace anticipando **Primitive + Variants + Kinds** (eventualmente se le agregan variants/kinds — p.ej. composer de chat / inline-edit / search). Protocolo completo: barrel export + resolver `kind→variant`, a11y/responsive/reduced-motion horneados, cero hardcode (solo tokens AXIS + brand Nexa SSOT + escala tipográfica SoT), Lab `/admin/design-system/nexa-composer` (gate `administracion.design_system`, alcanzable por nav + route-reachability), evidencia GVC desktop+mobile, nodo AXIS Figma referenciado, contrato en `ui-platform/PRIMITIVES.md` (+ ADR si platform-level). Hoy `NexaGlowBorder` ya es primitive; falta envolver input+botón+glow como un único `NexaComposer` reusable y subirlo al DS. **NO ahora** — al cierre del rediseño.

## Delta 2026-06-11 — Slice 1 cerrado: mockup concepto B con acabado enterprise

Sesión completa de polish en loop GVC + skills product-design (`modern-ui`, `greenhouse-ux`, `state-design`, `greenhouse-microinteractions-auditor`, `typography-design`, `greenhouse-ux-writing`, `modern-web-guidance`, skills de marca Efeonce). El mockup pasó de shell base a un panel con acabado enterprise. **Route live:** `/nexa/floating-chat/mockup` (toggles `Estado` · `Footprint` · `Contexto` — controles del mockup, no parte del diseño).

### Clasificación canónica (decisión 2026-06-11)

Lo que construimos es un **patrón compuesto (composition / organismo platform-level)**, NO una primitive suelta — misma categoría que `NexaInsightsBlock`. Razón: tiene 5 regiones (header presencia · rail glass · cuerpo de conversación · empty hero · composer) y no se forkea por superficie. Sus **átomos sí son primitives** (`NexaGlowBorder` ✅ existe; `NexaComposer`/`NexaPresenceMark`/`NexaSenderMark` se extraen — ver follow-ups). **Quedó canonizado con página propia en el Design System:** `/design-system/nexa-chat` (catálogo `Patterns` · kind `Pattern` · `NexaChatLabView`), registrado en `DesignSystemCatalogView` + `route-reachability-manifest` (0 orphans), documentado en `docs/architecture/ui-platform/PATTERNS.md` (sección "Nexa Chat Pattern"). El patrón es el contrato canónico: toda superficie de Nexa-como-chat lo reusa.

### Componentes / primitives (creados o tocados)

- **`NexaGlowBorder`** — primitive nueva (`src/components/greenhouse/primitives/NexaGlowBorder.tsx`, exportada en el barrel). Borde "línea de luz" del composer: **dos anillos enmascarados** (`mask-composite: exclude` + `border-radius: inherit`) — trazo nítido (`blur 1.6px`) + halo difuso (`blur 5px`) — con piso teal siempre encendido + barrido lento (`@property --nexa-beam-angle` + `@keyframes`), bloom en dos capas, `prefers-reduced-motion` horneado, `focusRingColor` opcional (pinta el acento de foco en la MISMA caja → sin box anidado de radio distinto). Tokenizado al brand Nexa SSOT. **Candidata a expandirse a `NexaComposer` (ver follow-up).**
- **`NexaSenderMark`** (local en `NexaThread`) — avatar por-mensaje de Nexa: glyph (sonrisa teal + sparkle **blanco**) inline-SVG sobre **disco navy circular** + anillo teal sutil. Iteró: navy-square (pesado) → glyph-solo (sin presencia) → círculo gris (lavado) → cara real (rechazada) → **disco navy + glyph** (presencia minimalista, elegida). El SVG va inline para controlar colores (sonrisa `electricTeal`, sparkle `common.white`).
- **`HeaderIconButton`** (local en el mockup) — botón circular del header reusable (nueva conversación `+` / expandir / cerrar): `Box component='button'` para controlar el fondo sin que el `:hover` del `IconButton` de MUI lo pise (mismo patrón que el botón enviar). Reposo = solo ícono; hover/focus = círculo gris translúcido. **Patrón canónico:** cuando el `:hover bgcolor` de un `IconButton` MUI no rinde, usar `Box component='button'`.
- **`NexaThread`** (compartido con Home) — editado: avatares por-mensaje → `NexaSenderMark`; wordmark "Nexa" en **Poppins** (variant `h4` display SoT, jerarquía header 20px / labels 16px); botón enviar reescrito como `Box component='button'` navy↔teal compacto (30px) con SVG `stroke` JS-resuelto; composer envuelto en `NexaGlowBorder`; `.MuiFilledInput-root` de Vuexy **anulado** (border/shadow/bg) — era el "box interno de radio 6 + sombra azul" que rompía la estética; viewport de mensajes con más margen lateral (16→24); composer sobre blanco (sin banda gris `background.default` ni borde) → experiencia conversacional continua.
- **`NexaFloatingChatMockupView`** — el panel: header navy (cara real 44px + "Nexa" Poppins + dot "En línea" con **ping de presencia** CSS), **rail glass** + **conversación con runtime propio keyed** (nueva conversación fluida), empty hero con **saludo rotativo** + **prompts contextuales** + **firma Efeonce**.

### Decisiones de diseño por área

- **Botón enviar** (`greenhouse-ux` + microinteractions): navy reposo / teal hover, 30px, icono SVG blanco (stroke JS-resuelto, no `currentColor` que fallaba), sombra ligera, disabled sutil.
- **Glow "línea de luz"** (`modern-ui`): dos capas (trazo+halo), piso teal vivo, difuso, no "tren" ni "watermark". Foco = azul (modernidad) + teal, mismo radio.
- **Avatar por-mensaje** (`modern-ui` content-first): disco navy + glyph (presencia minimalista). Cara real solo en header + empty hero.
- **Header**: 3 controles con **hover consistente** (círculo gris vía `HeaderIconButton`); botón "nueva conversación" = `+` minimalista (no pencil); dot "En línea" con glow + ping.
- **Nueva conversación fluida** (`state-design` + microinteractions): `ConversationArea` con runtime propio **keyed** → re-montar = chat limpio (runtime vacío) + el empty hero entra con fade/translate. El empty hero se decide por `messages.length === 0` (se oculta solo al enviar), no estático.
- **Saludo rotativo** (`greenhouse-ux-writing`): `NEXA_EMPTY_GREETINGS` (30 saludos cortos, 1 línea, ocurrentes, es-CL tuteo, saludan al usuario por nombre `NEXA_USER_NAME`, estructura variada). Rota por `conversationKey % 30`. En runtime el nombre sale de la sesión.
- **Rail de historial** (`modern-ui` + `state-design` + `typography-design`): buscador con filtro + clear, items accesibles (teclado/focus/press), **activo = píldora tintada** (sin barra de acento — eso es nav-rail, no lista de chat), kebab (renombrar/eliminar) en hover/focus, estados **empty** (primera vez) + **filtered-empty**, microinteracciones con reduced-motion, jerarquía label↔ítem (labels muted + tracking + separación entre grupos), márgenes laterales con respiro.
- **Glassmorfismo del rail** (`modern-ui` glass rule + `a11y-architect`): capa única translúcida `alpha(white, 0.68)` + `backdrop-filter: blur(24px) saturate(180%)` + borde hairline + fallback opaco `@supports`. **Estructural:** el panel pasó a `transparent` (header navy / rail glass / conversación blanca opaca cada uno con su fondo) para que el rail vea/desenfoque la página detrás. Fix de la esquina inferior-izquierda recta: `borderBottomLeftRadius` propio (el `backdrop-filter` rompe el clip redondeado del padre).
- **Prompts contextuales** (`modern-web-guidance` + product-design): `NEXA_PROMPT_CONTEXTS` (4 contextos mock: General / Finanzas · P&L / Cliente · Sky Airline / Nómina) con **chip de contexto** + prompts que cambian (Cliente interpola la entidad). Arquitectura Tier 1/2 en follow-ups. Chip de "Vista general" sin ícono (el sparkle decorativo chocaba).
- **Firma de marca Efeonce** (skills Efeonce + `modern-ui`): wordmark canónico `/branding/logo-full.svg` recoloreado a **gris sólido** vía `mask` (no opacidad, que se ve watermark), pequeño, en el óvalo sobre el composer, **solo empty-state**. **Excepción de marca deliberada** (la arquitectura dice Greenhouse en-app; Nexa-by-Efeonce es momento de marca sutil) — pendiente confirmación final del operador. En dark mode futuro usar `logo-negative.svg`.

### Bugs encontrados + fix (clase reusable)

- **Box interno de radio distinto en el composer**: causa = `.MuiFilledInput-root` de Vuexy (radius 6 + borde/sombra azul). Fix: anular border/shadow/bg del FilledInput; el acento de foco lo pinta `NexaGlowBorder` en la misma caja. Diagnóstico vía probe DOM (no adivinar radios).
- **Icono blanco del botón enviar invisible** con `color/currentColor`: fix = SVG inline con `stroke={theme.palette.common.white}` (JS-resuelto).
- **Grilla de prompts no clickeable**: el `<div>` vacío del viewport del `NexaThread` (renderizado después del hero) interceptaba los clicks. Fix: `zIndex: 2` en el empty hero. (Verificado con Playwright: el click reportaba "subtree intercepts pointer events".)
- **Hover del botón header no rendía** (solo `IconButton` MUI): fix = `Box component='button'`.
- **Esquina inferior-izquierda recta** tras el glass: `backdrop-filter` rompe el `overflow:hidden`+`border-radius` del panel → radio propio en el rail.

### Evidencia GVC

Scenarios usados/creados durante la sesión: `nexa-floating-chat` (composer idle/foco/hover/con-texto), `nexa-new-conversation` (reset fluido → empty hero), `nexa-ctx` (cambio de contexto Finanzas/Cliente), `nexa-promptclick` (verificación de clickabilidad), + capturas ad-hoc de header/rail/esquina. (Los `.captures/` son gitignored; los scenarios `nexa-new-conversation` quedaron committeados como evidencia del flujo.)

### Lo que QUEDA PENDIENTE de la task

- **Slice 2 — runtime persistente + rail real**: reemplazar `useLocalRuntime` por el runtime persistente del Home (extraer a hook `useNexaRuntime` si está inline), reusar `NexaThreadSidebar` como rail (mismo store + `/api/home/nexa/threads`), cablear nuevo-thread / seleccionar-thread / persistir scoped al member. **El mockup usa mock data — nada se persiste todavía.**
- **Slice 3 — non-modal + a11y + autosize**: estado `collapsed|expanded` real en el `NexaFloatingButton` global; non-modal (Escape cierra, click-fuera cierra, return-focus al FAB, foco atrapado, `role` correcto); composer `field-sizing:content`.
- **Slice 4 — cutover**: flag `NEXA_FLOATING_EXPANDABLE_ENABLED` (default `false`), `baseline.surfaceId` + `fe:capture:diff --promote`, sacar el shell fuera de `/mockup/`, GVC runtime desktop+mobile, verificar Home Nexa sin regresión.
- **Follow-ups committeados** (ver arriba): prompts contextuales Tier 1/2 (runtime), `NexaComposer` primitive al DS, Concepto C (lane sidecar) + preferencia de modo, Concepto A (dock).
- **Confirmación del operador** sobre la firma Efeonce en-app (excepción de marca).
- **Port a runtime de lo construido en el mockup**: saludo rotativo (nombre desde sesión), prompts contextuales (resolver Tier 1), glass rail, header controls, brand signature — todo vive hoy en el mockup; el Slice 4 los lleva al `NexaFloatingButton` real.

## Delta 2026-06-11 (2ª sesión) — Slices 2-4 + refactor Home + refinamientos UX (local-first, sin push)

Decisión del operador (3 preguntas): **glass rail + capa de datos** · **panel live como componente real ya** · **refactor Home ahora** → Slices 2+3+4 + refactor Home consolidados en una tanda. Todo verificado con Playwright/GVC; `pnpm local:check` verde. **NO pusheado** (espera confirmación).

### Implementado y verificado

- **Backend (Full API Parity, sin migración — tablas ya existían)**: `renameNexaThread`/`deleteNexaThread` en `src/lib/nexa/store.ts` + `PATCH`/`DELETE` en `/api/home/nexa/threads/[threadId]`.
- **Hooks compartidos**: `src/lib/nexa/use-nexa-runtime.ts` (`useNexaPersistentRuntime` — adapter canónico threadId-in-body + captura threadId + suggestions + modelo/localStorage + `mapThreadMessagesToInitial` para rehidratar; **borró** `createFloatingAdapter` y el adapter inline de Home) + `use-nexa-thread-history.ts` (list/group/rename/delete/refetch).
- **Refactor Home**: `HomeView` consume `useNexaPersistentRuntime` (dedup del adapter); sin regresión (renderiza completo, solo el warning de hidratación genérico pre-existente de Vuexy).
- **Panel live** (port verbatim del mockup, mock→datos reales): `src/views/greenhouse/nexa/floating-chat/{NexaFloatingPanel,NexaHistoryRail}.tsx`. Saludo rotativo con nombre de sesión, rail glass real, conversación con runtime persistente keyed (switch de thread sin reload). Montado en `NexaFloatingButton` detrás de `NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` (default OFF → path viejo bit-for-bit) + state machine compacto↔expandido + **non-modal a11y** (FocusTrap + ClickAwayListener + Escape + return-focus al FAB).
- **Flag**: `src/lib/nexa/flags.ts` (`isNexaFloatingExpandableEnabled`).
- **Persistencia end-to-end verificada**: send → thread persistido (scoped al member) → rail 0→1 → **reload cold → thread persiste**. 0 errores de consola.
- **Refinamientos UX (skills product-design + loop GVC)**:
  - **Thinking beat**: era doble avatar (mensaje vacío + `ThinkingIndicator` standalone con skeleton estático) → **un solo avatar** + `GreenhouseThinkingBeat` mientras el mensaje corre sin contenido (eliminado el standalone). Refinado: alineado a la "N" de Nexa + **5 dots + `motion='wave'`**. Primitive `GreenhouseThinkingBeat` extendido **aditivo** (`dotCount` + `motion: bounce|wave`, defaults preservan otros consumers; test verde).
  - **Scroll**: contención (`min-height:0` en la cadena flex + `overscroll-behavior: contain`) → scrollea el chat, no la página. Scrollbar moderno **auto-hide** con fade (hover/focus/`data-scrolling` + idle ~1s). Hook `useChatScrollState`.
  - **Márgenes**: padding lateral del contenido a 32px (alineado al composer).
  - **Sombra header on-scroll**: aparece sólo cuando hay contenido scrolleado (`isScrolled`), sólo en el panel (`hideHeader`).
  - **Prompts contextuales Tier 1**: `src/lib/nexa/suggested-prompts.ts` (`resolveNexaPromptContext` por ruta) + 4 contextos en `GH_NEXA.floating.prompt_contexts` (general/finance/client/payroll), cableado al empty hero. Verificado: `/finance` → "Finanzas · P&L".

### Pendientes (estado al cierre de esta sesión)

- **[en fix, esta sesión] 2 bugs UI**: (a) el scroll deja **bajar pero no subir** (el auto-scroll-to-bottom de assistant-ui pelea con `scroll-behavior: smooth`); (b) la **sombra de profundidad header↔canvas no se percibe** (demasiado sutil) → hacerla visible minimalista.
- **[fuera de scope — task aparte] 2 bugs BACKEND de Nexa** (en `nexa-service.ts`/tools, NO tocados por esta task): (1) Gemini 400 `function_response` rechaza el campo `id` en conversaciones multi-turno con tools → la respuesta falla; (2) una tool construye fecha inválida `2026-06-31` → error PG. Son del motor de respuesta de Nexa (out of scope explícito). Crear ISSUE/TASK derivada.
- **[HECHO + verificado, esta sesión] Tier 1.5 — interpolación del nombre real de la entidad** ("Cliente · Grupo Berel"): `NexaContextProvider` (split setter/value, `src/lib/nexa/nexa-page-context.tsx`) envuelve páginas + FAB en `(dashboard)/layout.tsx`; la página declara la entidad con `<NexaContextScope entityName={…} />` (renderiza null). `resolveNexaPromptContext(pathname, pageContext)` interpola `{entity}` en los 4 prompts Cliente + agrega "· {nombre}" al label. **Wiring de 1 punto por entrypoint** (no por página): cableado en `OrganizationEnterpriseWorkspaceRuntime` (cubre `/agency/organizations/[id]`, runtime TASK-1059) **y** en `OrganizationWorkspaceShell` (cubre `/finance/clients/[id]`, que aún usa el shell legacy). Si la página no declara entidad → cae a "este cliente" (genérico, honesto). **Verificado GVC** (Playwright autenticado, dev local): Grupo Berel → chip "Cliente · Grupo Berel" + prompts "¿Cómo viene Grupo Berel este mes?", "Riesgo de churn de Grupo Berel", "Rentabilidad de Grupo Berel", "Próximas renovaciones de Grupo Berel" (captura `.captures/nexa-tier15/02-berel-wired.png`).
- **[HECHO, esta sesión] Tier 2 — prompts data-aware → TASK derivada creada**: `TASK-1087` (`docs/tasks/to-do/TASK-1087-nexa-contextual-prompts-tier-2-data-aware.md`, registrada). Endpoint server-side que deriva prompts de señales reales (anomalías ICO / pendientes / KPIs en rojo / churn) reusando readers canónicos, con allowlist + anti-oracle + degradación honesta a Tier 1/1.5 + flag default false.
- **[HECHO + verificado, esta sesión] Canonización de los átomos del chat (Primitive + Variants + Kinds)**: extraídos como primitives canónicas, **copia byte-a-byte del runtime** (no del mockup) → cero regresión visual/funcional/microinteracción (verificado por computed-styles + GVC):
  - `NexaComposer` (`src/components/greenhouse/primitives/NexaComposer.tsx`) — unidad glow + input + botón send/stop + disclaimer; presentacional/runtime-agnóstica (la consumer cablea assistant-ui vía `asChild`). Partes: `NexaComposerInput` (caja Vuexy FILLED anulada → el glow pinta todo) + `NexaComposerActionButton` variants `send` navy↔teal / `stop` navy↔gris.
  - `NexaFace` (variants `hero` 76 / `header` 44 borde teal / `message` 32; single source `NEXA_FACE_SRC`).
  - `NexaPresenceMark` ("En línea" ↔ "Pensando…" crossfade + elipsis animada, reduced-motion horneado).
  - Consumidos por Home + panel flotante (`NexaThread`/`NexaFloatingPanel`) → dedupe. Barrel + Lab specimen vivo `/design-system/nexa-chat` (`NexaChatLabView`) + contrato en `ui-platform/PRIMITIVES.md` (fila "Nexa chat atoms"). `NexaGlowBorder` ya era primitive. Pendiente: `NexaSenderMark` (avatar por-mensaje navy+glyph).
- **[HECHO, 2026-06-11] Cutover — flag ON en todos los entornos.** El flag `NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` se encendió (`true`) por decisión explícita del operador en los **3 scopes de Vercel**: **Production**, **staging** (custom env → `dev-greenhouse.efeoncepro.com`) y **Preview (develop)** — replicando el patrón de `NEXT_PUBLIC_CLIENT_LIFECYCLE_ONBOARDING_ENABLED`. Seteado con `printf %s "true"` (sin newline — crítico: el check es `=== 'true'`, un newline lo deja OFF silenciosamente). Como `NEXT_PUBLIC` se inlinea en build-time, se hizo **redeploy** (rebuild del MISMO commit, sin tocar el orquestador de release ni los workers Cloud Run): Production `greenhouse-mza7nhn76` ● Ready + staging `greenhouse-ntqq4o7w4` ● Ready (`--target staging`). **El flag vive a nivel de proyecto → los próximos deploys de main/develop lo mantienen ON automáticamente.** Verificado: operador confirmó que el chat expandible aparece en runtime. **Contexto:** el código del chat ya estaba en main desde el release `371e95c47`; solo faltaba encender el flag (nace OFF por diseño). **Pendiente cosmético (no bloqueante):** `baseline.surfaceId` + `fe:capture:diff --promote` (paridad mockup↔runtime) + GVC **mobile** del runtime.
- **Composer `field-sizing:content`**: diferido (MUI multiline ya autosize via maxRows; el `field-sizing` nativo queda como enhancement).
- **[HECHO, 2026-06-11] `NexaSenderMark` primitive** — extraído byte-a-byte (ver arriba). Quedan: **Concepto C (sidecar) + preferencia de modo** + **Concepto A (dock)**: follow-ups committeados.
- **Confirmación operador**: firma Efeonce en-app (excepción de marca).
- **Docs governance + cierre**: invocar `greenhouse-documentation-governor` + mover task a `complete/` tras confirmación del operador.

### Archivos owned (esta sesión)

Nuevos: `src/lib/nexa/{flags,use-nexa-runtime,use-nexa-thread-history,suggested-prompts,nexa-page-context}.ts(x)`, `src/views/greenhouse/nexa/floating-chat/{NexaFloatingPanel,NexaHistoryRail,nexa-scrollbar}.ts(x)`, `src/components/greenhouse/primitives/{NexaComposer,NexaFace,NexaPresenceMark}.tsx`, `docs/tasks/to-do/TASK-1087-nexa-contextual-prompts-tier-2-data-aware.md`. Modificados: `src/app/(dashboard)/layout.tsx`, `src/app/api/home/nexa/threads/[threadId]/route.ts`, `src/lib/nexa/store.ts`, `src/lib/copy/nexa.ts`, `src/components/greenhouse/NexaFloatingButton.tsx`, `src/components/greenhouse/primitives/{index.ts,GreenhouseThinkingBeat.tsx,greenhouse-thinking-beat-controller.ts}`, `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx`, `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`, `src/views/greenhouse/home/HomeView.tsx`, `src/views/greenhouse/home/components/NexaThread.tsx`, `src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`, `docs/architecture/ui-platform/PRIMITIVES.md`, `docs/tasks/TASK_ID_REGISTRY.md`.
