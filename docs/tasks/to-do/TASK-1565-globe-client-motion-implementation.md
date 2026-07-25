# TASK-1565 — Motion del payload cliente de Globe (feed + composer)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1565-globe-client-motion-implementation.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1565-globe-client-motion-implementation-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `to-do — el contrato está escrito; falta implementarlo`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1564` (parcialmente — el isotipo se puede construir antes, pero el motion del composer necesita el composer)
- Branch: `task/TASK-1565-globe-client-motion-implementation`
- GitHub Issue: `TBD`

## Summary

Implementa el motion del payload cliente de Globe según `GLOBE_CLIENT_MOTION_CONTRACT_V1.md`: las **7
animaciones ausentes** del feed, la primitive `GlobeGeneratingMark` compartida con el composer, y el gate
mecánico que impide que el contrato de `prefers-reduced-motion` se pierda en el próximo componente.

## Why This Task Exists

`TASK-1559` se ejecutó con **`Motion: none`** en su contrato de UI. Fue un error de autoría, y el costo fue
medible: el feed shippeó con **4 de 11** animaciones del diseño aprobado.

| | Prototipo aprobado | Implementado en TASK-1559 |
|---|---|---|
| `@keyframes` | 11 | 4 |
| animaciones en uso | 12 | 4 |
| `transition` declaradas | 9 | 6 |

Las 7 ausentes no son adorno: incluyen **el isotipo de Globe respirando mientras genera**, que es el momento de
marca de la superficie, y el shimmer del skeleton, que es lo que distingue "cargando" de "roto".

Y existe como task **propia y compartida** en vez de dentro de TASK-1564 porque el isotipo generando vive en el
feed **y** en el composer. Implementarlo dentro de una de las dos lo definiría para esa superficie, y la otra
lo copiaría — dos definiciones del mismo momento de marca divergen.

## Goal

Que el payload cliente de Globe tenga el motion del diseño aprobado, con el contrato de reduced-motion
**verificado por un gate** y no por disciplina.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- **`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`** — SSOT. Esta task lo implementa; no lo redefine.
- **ADR-014** — el payload cliente materializa sus propios componentes y tokens (§8). Nada de Greenhouse.
- **WCAG 2.2** — 1.4.13 (contenido en hover/focus), 2.3.3 (animación por interacción).

## Normative Docs

- `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md`
- `docs/ui/motion/TASK-1559-globe-feed-viewer-client-port-motion.md`
- `docs/ui/motion/TASK-1564-globe-composer-client-port-motion.md`

## Dependencies & Impact

- **Depende de:** el SSOT de tokens (`tokens.ts`) para agregar 9 tokens de motion. El motion del composer
  depende de que el composer exista (`TASK-1564`).
- **Impacta a:** `TASK-1559` (cierra su deuda de motion), `TASK-1564` (le entrega `GlobeGeneratingMark`),
  y toda superficie futura del payload — el gate de reduced-motion las gobierna.

### Files owned

- `apps/studio-client/src/primitives/GlobeGeneratingMark.tsx` — la primitive nueva
- `apps/studio-client/src/primitives/globe-generating-mark.css`
- `apps/studio-client/src/styles/motion.css` — aurora y keyframes compartidos
- `apps/studio-client/src/gates/reduced-motion.test.ts` — el gate nuevo
- `apps/studio-client/scripts/producer-motion-canary.mjs` — el canary de interacción
- `apps/studio-client/src/tokens/tokens.ts` — 9 tokens (compartido; sólo se agrega)
- `apps/studio-client/src/surfaces/producer/feed/producer-feed.css` — `candIn` y `skel` (compartido)

## Current Repo State

**Ya existe:**

- 4 animaciones: `pf-enter`, `pf-thumb-in`, `pv-enter`, `gl-stage-in`, cada una con su reduced-motion.
- Tokens `--duration-none|short|medium` y `--ease-enter`, cuyo valor **ya coincide** con el `--ease` del
  prototipo (`cubic-bezier(.2,.8,.2,1)`) — no hay conversión que decidir.
- El gate de motion literal en `design-contract.test.ts`.

**Gap:**

- No existe `GlobeGeneratingMark` ni ninguna de sus 4 animaciones.
- No existe la aurora.
- `.pf__skeleton` es una caja estática: sin `skel`, "cargando" y "roto" se ven igual.
- `candIn` no existe: las cards aparecen sin entrada.
- No existe gate que verifique el contrato de reduced-motion.
- ⚠️ **Las acciones de la card NO tienen su contraparte de reduced-motion.** Hoy se revelan por hover; con
  movimiento apagado **desaparecen**. Es un defecto de accesibilidad vigente, no una mejora pendiente.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-client/src/{primitives,styles,gates}/**`
- Future candidate home: `remain-shared`
- Future home rationale: el motion es del payload cliente; no crea frontera nueva
- Boundary: `GlobeGeneratingMark` es una primitive con dos consumidores reales (feed y composer); los tokens
  viven en el SSOT y ninguna superficie declara duraciones propias
- Server/browser split: browser-only
- Build impact: `none` — salvo la decisión del isotipo (ver Open Questions)
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: operador interno de Efeonce
- Momento del flujo: mientras espera que su pieza se genere
- Resultado perceptible esperado: que la espera se sienta viva y de marca, no como una pantalla trabada
- Friccion que debe reducir: «¿esto está pasando o está colgado?»
- No-goals UX: motion en la lectura de metadata, en el cambio de densidad, o en el filtrado

### Surface & system decision

- Surface: `/producer/feed` y `/producer/compose` del payload cliente
- Composition Shell: `no aplica` — payload de Globe (ADR-014 §8)
- Primitive decision: `new` — `GlobeGeneratingMark`, con dos consumidores desde el día uno
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: `n/a`
- Copy source: `apps/studio-client/src/copy/index.ts` — el motion no agrega copy, pero **depende** de que el
  progreso textual exista, porque es el portador redundante
- Access impact: `none`

### State inventory

- Default: aurora a la deriva; cards en reposo
- Loading: skeleton con shimmer
- Empty: sin motion — un estado vacío que se mueve invita a esperar algo que no viene
- Error: sin motion, `role=alert` estático
- Degraded / partial: sin motion propio
- Permission denied: sin motion
- Long content: la aurora es del layout y no se repite por sección
- Mobile / compact: el isotipo se mantiene; la aurora es la primera candidata a apagarse por frame budget
- Keyboard / focus: `:focus-within` revela lo mismo que `:hover`, sin excepción
- Reduced motion: ver el SSOT §4 — y **la regla de las acciones de card es la que no puede perderse**

### Interaction contract

- Primary interaction: ninguna nueva; esta task no agrega controles
- Hover / focus / active: se conservan los existentes y se agrega la contraparte de reduced-motion
- Pending / disabled: el isotipo acompaña el pendiente; nunca lo reemplaza
- Escape / click-away: sin cambios
- Focus restore: sin cambios
- Latency feedback: el isotipo **es** el feedback de latencia de una generación
- Toast / alert behavior: sin cambios

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: `candIn` (.42s `both`) por primera aparición de `stableKey`; `overlayIn`/`sheetIn` para overlays
- Layout morph: ninguno — explícitamente rechazado para la parrilla del feed
- Stagger: ninguno. `candIn` corre por card en su primera aparición, no como secuencia orquestada — con el feed
  reanudando cada 4s, un stagger produciría olas periódicas sin información
- Timing / easing token: los 9 tokens nuevos del SSOT §5
- Reduced-motion fallback: SSOT §4, completo
- Non-goal motion: contadores animados, transición de layout, motion en estados vacíos o de error

### Implementation mapping

- Route / surface: `/producer/feed` y `/producer/compose`
- Primitive / variant / kind: `GlobeGeneratingMark` — kinds `inline` (card) y `stage` (hero/composer)
- Component candidates: `GlobeGeneratingMark`, `AuroraLayer`
- Copy source: sin copy nuevo
- Data reader / command: ninguno. Esta task no toca datos
- API parity: `n/a`
- Access / capability: `none`
- States to implement: los del inventario

### GVC scenario plan

- Scenario file: `apps/studio-client/scripts/producer-motion-canary.mjs`
- Route: `http://127.0.0.1:4323/producer/feed`
- Viewports: 1440 · 390
- Quality profile: `premium`
- Required steps: reposo → hover sobre card → corrida activa visible → pasada con `prefers-reduced-motion`
- Required captures: `reposo`, `hover-acciones`, `generando`, `reduce-acciones`, `reduce-generando`
- Required `data-capture` markers: `producer-runtime-feed`, `producer-generating-mark`
- Assertions: los 4 asserts obligatorios (abajo)
- Scroll-width checks: por panel y documento
- Reduced-motion / focus evidence: obligatoria — es la mitad del valor de esta task
- Review dossier: `docs/ui/reviews/TASK-1565-globe-client-motion-implementation.scorecard.json`
- Baseline decision / surface ID: `globe-producer-feed` (reusa el del feed)

### Design decision log

- Decision: contrato de motion **compartido** + primitive con dos consumidores + gate mecánico de reduced-motion
- Alternatives considered: (a) motion dentro de TASK-1564 — rechazado, definiría el isotipo para una superficie
  y la otra lo copiaría; (b) sólo el motion del feed ahora — rechazado por lo mismo; (c) una librería de
  animación — rechazado, todo el motion es declarativo y cíclico, y una librería agrega peso al payload
- Why this pattern: el gate es lo que convierte «acordate de la contraparte de reduced-motion» en algo que
  rompe el build
- Reuse / extend / new primitive: `new` con dos consumidores desde el día uno
- Open risks: 7 elementos animados por corrida activa; hay que medir con varias en vuelo

### Visual verification

- GVC scenario: `producer-motion-canary.mjs`
- Viewports: 1440 · 390
- Required captures: las 5 de arriba
- Required `data-capture` markers: los 2 de arriba
- Scroll-width check: sí
- Accessibility/focus checks: acciones visibles con `reduce`, isotipo presente con `animation-name: none`
- Before/after evidence: el feed actual (sin motion) vs el nuevo, mismo escenario
- Known visual debt: `coachPulse` no se implementa — no existe la superficie de onboarding
- Visual scorecard: `docs/ui/reviews/TASK-1565-globe-client-motion-implementation.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

<!-- ZONE 2 — PLAN MODE (lo completa el agente que toma la task) -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tokens + gate de reduced-motion

Los 9 tokens del SSOT §5 y el gate que exige contraparte de reduced-motion para toda regla con `animation:`.
**El gate primero**, porque escrito después se calibra para que pase lo que ya hay.

### Slice 2 — Corregir el defecto vigente de accesibilidad

Las acciones de la card pasan a `opacity: 1` + `pointer-events: auto` bajo `reduce`. Es un defecto **hoy**: con
movimiento apagado desaparecen cinco acciones por card.

### Slice 3 — `GlobeGeneratingMark`

La primitive con sus 4 animaciones en fase, dos kinds (`inline`, `stage`), y su contraparte de reduced-motion.
Consumida por el feed en corridas activas.

### Slice 4 — `candIn` + `skel`

Entrada por primera aparición de `stableKey` (no por render) y shimmer del skeleton.

### Slice 5 — Aurora

`AuroraLayer` con las 3 capas de duraciones distintas, `alternate`, y su apagado bajo `reduce`.

### Slice 6 — Canary de motion + evidencia

`producer-motion-canary.mjs` con los 4 asserts y las 5 capturas, en los dos modos.

### Slice 7 — Motion del composer

Sólo si `TASK-1564` está entregada: el estimado atenuado, la barra de progreso y `overlayIn`.

## Out of Scope

- **`coachPulse`.** No existe superficie de onboarding en el payload cliente.
- **Transición de layout en la parrilla.** Rechazada con razón en el contrato.
- **Contadores animados.** Un número que cuenta hacia arriba en un riel de gasto es decoración sobre plata.
- **Librerías de animación.**
- **Cambiar valores del SSOT.** Esta task implementa el contrato; si un valor está mal, se corrige el SSOT en
  su propio commit y con su razón.

## Detailed Spec

### El gate de reduced-motion es el entregable más durable

Sin gate, la regla de las acciones de card se pierde en el próximo componente que alguien escriba — que es
exactamente lo que ya pasó. El gate recorre los `.css` del payload y exige: **toda regla con `animation:` cuya
duración no sea `--duration-none` tiene que tener contraparte dentro de un bloque
`prefers-reduced-motion: reduce`**.

Y tiene que **morder de verdad**: el Slice 1 incluye romperlo a propósito (agregar una animación sin
contraparte) y verificar que falla, más verificar que **no** tiene falsos positivos sobre las 4 existentes.

### Las 4 animaciones del isotipo son un solo momento

`gBreathe` y `gHalo` comparten `--duration-breathe` — **el token compartido es el mecanismo que garantiza la
fase**, no un ahorro de líneas. Dos tokens con el mismo valor se desincronizan la primera vez que alguien
ajusta uno. `gFlame` corre más rápido a propósito. Las 4 chispas tienen duraciones deliberadamente no múltiplos
entre sí para que el patrón no se perciba repetido.

### `candIn` por primera aparición, no por render

El feed reanuda cada 4s. Una entrada que se dispara en cada reconciliación hace latir la pantalla completa cada
4 segundos. La animación pertenece a la **primera vez que un `stableKey` aparece**, y eso hay que sostenerlo con
estado, no con CSS.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

**Slice 1 (gate) antes que todo lo demás.** Un gate escrito después de las animaciones se calibra para que pase
lo que ya existe, y deja de ser un gate.

**Slice 2 antes de Slice 3.** Corregir un defecto de accesibilidad vigente pesa más que agregar una animación
nueva.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Costo de frame con varias corridas activas | rendimiento del browser | **Media** | medir con N corridas; `IntersectionObserver` si hace falta | perfil del canary |
| La regla de acciones se pierde de nuevo | accesibilidad | **Alta** sin gate | el gate del Slice 1 | falla de build |
| `candIn` re-disparándose en cada reanudación | percepción | Media | estado por `stableKey` + assert del canary | assert |
| `gBreathe`/`gHalo` desfasados | marca | Baja | token compartido | revisión visual |
| Aurora consumiendo CPU en pestaña de fondo | batería | Media | `document.visibilityState` (Open question) | medición manual |
| Motion tapando la falta de copy | honestidad | Media | el progreso textual es requisito, no opcional | assert del canary en modo `reduce` |

### Feature flags / cutover

Ninguno. El motion es aditivo sobre superficies ya servidas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revertir; el gate desaparece | < 5 min | sí |
| 2 | **no se revierte** — es una corrección de accesibilidad | — | no debería |
| 3-5 | revertir; las superficies vuelven a estar quietas | < 5 min | sí |
| 6 | revertir el canary | < 5 min | sí |
| 7 | revertir | < 5 min | sí |

### Production verification sequence

1. el feed con una corrida activa muestra el isotipo animado;
2. con `prefers-reduced-motion` en el sistema operativo, el isotipo está **visible y quieto**;
3. con `reduce` activo, las acciones de una card están visibles y son clickeables;
4. el skeleton hace shimmer;
5. la aurora se mueve y no se percibe repetición en un minuto de observación.

### Out-of-band coordination required

Ninguna. Sin infra, sin secretos, sin migraciones.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen las 11 animaciones del diseño aprobado, o las ausentes están declaradas con su razón (`coachPulse`).
- [ ] `GlobeGeneratingMark` es una primitive con **dos** consumidores reales (feed y composer si existe).
- [ ] `gBreathe` y `gHalo` usan el **mismo token** de duración.
- [ ] El gate de reduced-motion existe, **muerde** al agregar una animación sin contraparte, y **no** produce
      falsos positivos sobre las animaciones existentes.
- [ ] Con `reduce` activo: las acciones de la card están visibles con `pointer-events: auto`.
- [ ] Con `reduce` activo: el isotipo sigue en el DOM con `animation-name: none`.
- [ ] Con `reduce` activo: el progreso textual está presente — el motion nunca fue el único portador.
- [ ] `candIn` corre una vez por `stableKey` y **no** se re-dispara en una reanudación, verificado en el canary.
- [ ] El skeleton hace shimmer y se distingue de un estado roto.
- [ ] Ninguna duración ni curva literal: el gate de motion literal sigue verde.
- [ ] Canary con las 5 capturas en los dos modos, a 1440 y 390.
- [ ] Scorecard: promedio ≥ 4.5, piso ≥ 4, fidelidad y resistencia a template ≥ 4.5.
- [ ] `UI ready` pasa a `yes` sólo con mapping, plan GVC y decision log completos y `pnpm task:lint` sin findings.

## Verification

```bash
pnpm --filter @efeonce-globe/studio-client test
node apps/studio-client/scripts/producer-motion-canary.mjs
```

## Closing Protocol

1. Mover a `complete/` sólo con la verificación en runtime hecha, o declarar `code complete, rollout pendiente`.
2. Cerrar la deuda de motion registrada en `TASK-1559`.
3. Actualizar `GLOBE_CLIENT_MOTION_CONTRACT_V1.md` si la implementación obligó a cambiar un valor, **con su razón**.
4. Actualizar el runbook de gates con el gate nuevo y el canary de motion.

## Follow-ups

- `coachPulse` cuando exista la superficie de onboarding.
- Pausar la aurora con `document.visibilityState` si la medición lo justifica.
- Decidir el destino del isotipo: SVG inline vs asset del bundle (Open question del SSOT).

## Open Questions

- **¿El isotipo se inlinea o se sirve como asset?** Inline (como `GrainLayer`) no depende de `img-src` y no
  agrega una entrada al allowlist; como asset es más fácil de actualizar y no infla el bundle de JS. Decidir en
  el Slice 3 y registrarlo.
- **¿La aurora vive en el layout o por superficie?** Si vive por superficie se duplica en feed y composer, que
  comparten pantalla — y dos auroras superpuestas se ven mal.
