# TASK-1599 — Contrato tipográfico del payload cliente de Globe + jerarquía del Producer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1599-globe-client-typographic-contract-producer-hierarchy.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `COMPLETE 2026-07-29. Tres commits desplegados y verificados en vivo en https://globe.efeoncepro.com/producer con sesión real a 1440px. Declaró CINCO puntos abiertos, TRES sin dueño; DOS de esos tres (bolder del UA y fuga del axis-pilot-canary) se cerraron el mismo día en 403d346, desplegado y medido sobre globe-studio-internal-00101-x2d (imagen 403d3464e88e) — ver Delta 2026-07-29. Sigue abierto sin dueño el H9 del feed.`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-1599-globe-client-typographic-contract-producer-hierarchy`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el contrato tipográfico del payload cliente de Globe y corrige la jerarquía del Producer. Trece
sitios pedían un corte de fuente que no se carga, y el navegador lo **sintetiza**: engrosa el trazo
artificialmente sin fallar ningún gate. Dos gates nuevos cierran esa clase y la clase hermana —una
utilidad de fuente que el theme no puede generar y por lo tanto no emite CSS—. Sobre esa base se
corrigió la jerarquía del Producer (nueve hallazgos de una revisión en vivo) y se cerró una regresión
propia introducida al reordenar las acciones del prompt.

## Why This Task Exists

`TASK-1561` cerró los literales de tipografía en el payload y dejó nombrado, sin cerrar, el fallo peor:
*un peso que no existe se sintetiza — el navegador deforma las letras sin fallar nada, y pasa todos los
gates*. Eso siguió siendo cierto hasta hoy. Los cortes realmente cargados son tres —Poppins 700, Geist
400 y Geist 600— y trece sitios pedían Geist@700, incluidos los tres KPI de crédito del encabezado, que
son de los pocos números que un operador compara de una pantalla a otra.

Es la misma forma de fallo que produjo 63 colores irrepetibles, un escalón más adentro: el gate cubría
*qué se declara*, no *quién pide qué*. Un contrato verificado sólo en la declaración no es un contrato
verificado.

La revisión en vivo que siguió expuso que dos supuestos de la superficie eran falsos:

- El panel de créditos **no se rompía por el número**. Llevaba `max-w-full`, y sobre un elemento
  `absolute` esa medida resuelve contra el bloque contenedor —el `<details>`, o sea el ancho del
  disparador—. Los tres síntomas visibles eran **un** bug.
- `Listo` y `Completada` no eran dos palabras para lo mismo: son **dos ejes** del contrato,
  `coarseProgress` y `state`. Tratarlas como sinónimos dejaba una clave de copy sin ningún consumidor.

## Goal

- Ningún sitio del payload pide un par familia×peso que no esté cargado, y un gate lo impide hacia
  adelante desde el **sitio de uso**.
- Ninguna utilidad de fuente escrita en el payload puede quedar sin emitir CSS en silencio.
- Los números vivos del Producer se comparan sin bailar, y el porcentaje del donut nunca contradice la
  cifra que tiene al lado.
- La jerarquía del Producer queda corregida en su causa —el bloque contenedor, los dos ejes del
  contrato— y no por síntoma.
- Los puntos que quedaron abiertos quedan declarados como abiertos, con dueño cuando lo hay y **sin
  dueño cuando no lo hay**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md` (**ADR-016**,
  `Accepted` 2026-07-27) — el payload cliente usa Tailwind v4 con `tokens.ts` como theme. Ningún valor
  de diseño literal en `className`; todo sale del theme, que sale del SSOT.
- `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` — SSOT del movimiento del
  payload; esta task no lo modifica.
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El theme **se genera** desde el SSOT (`pnpm theme:generate`). Nunca se aliasea con
  `@theme inline { --text-xs: var(--text-xs) }`: nombre igual a ambos lados es referencia circular, y
  rinde mal **con el build verde**.
- Nunca documentar un anti-patrón dentro del árbol que Tailwind escanea: lee los `.ts` como texto plano
  y materializa el ejemplo como clase real.
- Globe es un **producto comercial** de Efeonce; su estadio de rollout es internal-only. Estadio ≠
  naturaleza: no se dimensiona a la baja "porque es interno".
- La documentación gobernante de Globe vive en Greenhouse, nunca en `efeonce-globe/docs/**`.

## Normative Docs

- `docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md` — valores exactos del composer, medidos.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — continuidad de runtime de Globe.
- `docs/tasks/complete/TASK-1561-globe-design-gate-typography-hardening.md` — predecesor directo: cerró
  los **literales**; esta task cierra la **síntesis** que aquélla dejó nombrada y abierta.

## Dependencies & Impact

### Depends on

- `TASK-1561` — el gate de tipografía sobre literales, ya cerrado. Los dos gates nuevos se agregan al
  mismo archivo que aquélla creó.
- `TASK-1485` / ADR-016 — el motor de estilos y el SSOT de tokens; el token `--rail-scrim` nace ahí.
- `TASK-1556` — el payload cliente y su capa de copy.

### Blocks / Impacts

- `TASK-1560` Slice 2 — ampliar la frontera del gate a `apps/studio-web`. Hereda **dos clases más** que
  verificar, y hereda además el límite medido hoy: un gate que escanea `className` no ve lo que llega
  por herencia del HTML.
- `TASK-1485` — dueña del motor de estilos y de la reescritura de los gates; su superficie ganó dos
  gates y un token.
- `TASK-1552` — dueña del composer; su superficie cambió hoy sin cambiar sus supuestos.
- `TASK-1559` / `TASK-1526` — dueñas del feed; el H9 de la tarjeta destacada quedó **medido y sin
  arreglar**, con sus bloqueadores nombrados.

### Files owned

Repo hermano `efeonce-globe`, payload `apps/studio-client`:

- `src/gates/design-contract.test.ts` — los dos gates nuevos
- `src/format/credits.ts` + su test — primitive nueva de formato
- `src/tokens/tokens.ts` — token `--rail-scrim`
- `src/styles/tailwind.css` — las cinco reglas `.pf__*`
- `src/copy/index.ts` — retiro de `stateCompleted`
- `src/ProducerHeader.tsx` · `src/composer/ProducerComposer.tsx` ·
  `src/composer/ComposerToolDock.tsx` · `src/feed/ProducerFeed.tsx` · `src/primitives/index.tsx` ·
  `src/dialogs/*`

Repo `greenhouse-eo`:

- `docs/tasks/complete/TASK-1599-globe-client-typographic-contract-producer-hierarchy.md`
- `docs/ui/wireframes/TASK-1599-globe-client-typographic-contract-producer-hierarchy.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Current Repo State

### Already exists

- El motor de estilos de ADR-016 instalado, el theme generado desde el SSOT y los cuatro gates que
  muerden la sintaxis de utilidades (`TASK-1485`, commits `804b7d7` + `91432ed`).
- El gate de literales de tipografía y su frontera declarada (`TASK-1561`, `6e8ef5a`).
- El payload cliente completo en Tailwind, con el composer, el dock y el feed ya migrados.
- En `greenhouse-eo`: el commit `f36483910` agregó `generated/**` a los ignores de ESLint, porque 43
  errores de un trabajo ajeno en curso bloqueaban el pre-push de todo el repo; y `f4930e995` creó el
  overlay tipográfico de Globe.

### Gap

Lo que quedaba abierto al cerrar esta task. **Tres de los cinco no tenían dueño**, y así se declararon;
**dos de esos tres se cerraron el mismo día en `403d346`** (ver `## Delta 2026-07-29 — dos gaps cerrados`).

1. ~~**El preflight de Tailwind no se emite — SIN DUEÑO.**~~ **CERRADO en `403d346`.** La regla del
   navegador `b, strong { font-weight: bolder }` pedía el corte fuerte **por herencia, sin que ninguna
   clase lo dijera**; el gate escanea `className`, no elementos HTML, así que el caso le era
   **estructuralmente invisible**. Apareció tres veces el mismo día. Cerrado con un peso declarado del
   SSOT en `@layer base`, **sin adoptar preflight**. La **categoría** —lo que entra por el nombre del
   elemento— sigue viva.
2. 🔴 **La frontera de los gates — SIGUE ABIERTA.** Escanean sólo `apps/studio-client/src`.
   `apps/studio-web` no está vigilado: **184 hex crudos y 4 familias literales** medidos hoy. Dueño:
   `TASK-1560` Slice 2.
3. ~~**Fuga del `axis-pilot-canary` — SIN DUEÑO.**~~ **CERRADA en `403d346`.** Mataba el envoltorio de
   `pnpm` y no el `vite` nieto, que sobrevivía reteniendo los pipes: **`pnpm test` no terminaba solo** y
   dejaba un huérfano en el puerto 4326 por corrida (se acumularon doce, uno de tres días). Cerrada
   señalando al **grupo** de procesos y esperando la muerte del nieto.
4. **H9 del feed (tarjeta destacada) — SIN DUEÑO asignado en esta task.** No se arregló, y los
   bloqueadores están medidos: el 45 % vacío es alto fijo en la hoja más un pie `absolute`; y el `…` del
   título **no es CSS** — `DISPLAY_TITLE_MAX_LENGTH = 96` recorta por conteo de caracteres en
   `packages/domain/src/producer-live-feed.ts`, antes de que exista layout, así que **ningún ancho lo
   arregla**. La superficie es de `TASK-1559`/`TASK-1526`; ninguna de las dos declara hoy este hallazgo.
5. **El póster de video** es `TASK-1569` y **no se tocó**. Sin cambio de estado.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-client` (payload cliente de browser, servido por
  `studio-web`). El control plane documental es `greenhouse-eo`.
- Future candidate home: `remain-shared` — el payload cliente ya vive en su propia unidad; esta task no
  mueve fronteras.
- Boundary: los gates de contrato de diseño y el SSOT de tokens del payload. Consumidores autorizados:
  las superficies de `apps/studio-client/src/**`. `apps/studio-web` queda **fuera** de la cobertura
  actual, y esa frontera es explícita, no accidental.
- Server/browser split: todo lo tocado es browser. Ningún store, secreto, SDK de proveedor ni acceso a
  datos entra al payload.
- Build impact: `none` — dos asertos más en una suite ya existente y un archivo de formato de ~30
  líneas. Sin dependencia nueva.
- Extraction blocker: `none`.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno de Efeonce en el Producer de Globe, con sesión real.
- Momento del flujo: permanente — el encabezado de créditos y el composer están en pantalla siempre.
- Resultado perceptible esperado: el trazo deja de verse deformado; el panel de créditos deja de
  romperse; las cifras dejan de bailar; el porcentaje deja de contradecir al número que tiene al lado.
- Fricción que debe reducir: un operador que no puede confiar en el número de crédito que ve.
- No-goals UX: no se rediseña el composer, no se cambia el flujo de creación, no se oculta información
  de crédito.

### Surface & system decision

- Surface: `https://globe.efeoncepro.com/producer` — encabezado, composer, dock y feed.
- Composition Shell: `no aplica` — es un contrato de Greenhouse; Globe tiene su propio payload.
- Primitive decision: `new` para `src/format/credits.ts` (formato de cifras de crédito, con test);
  `reuse` para todo lo demás.
- Adaptive density / The Seam: `no aplica` — mismo motivo que Composition Shell.
- Floating/Sidecar/Dialog decision: el panel de créditos es una superficie desplegable **ya existente**
  (`<details>` + `absolute`). Esta task corrige su medida; no cambia su naturaleza ni agrega otra.
- Copy source: `apps/studio-client/src/copy/index.ts` — capa de copy del payload cliente.
- Access impact: `none`.

### State inventory

- Default: encabezado con los tres KPI legibles; composer con su campo de prompt.
- Loading: marca de generación del payload, sin cambios en esta task.
- Empty: feed sin generaciones; la tarjeta destacada no se pinta.
- Error: la tarjeta declara el fallo con razón; nunca un cero silencioso.
- Degraded / partial: se muestra lo recuperado; lo que falta no se falsea.
- Permission denied: capability bloqueada con **razón visible**, nunca `disabled` mudo (invariante
  heredada de `TASK-1555`, conservada).
- Long content: **éste era el bug**. El número largo de crédito parecía la causa; el contenedor lo era.
- Mobile / compact: fuera del alcance declarado de esta task; los canarios que ya cubrían 390/320
  siguen verdes.
- Keyboard / focus: sin cambios; la apertura por teclado del selector se conserva.
- Reduced motion: sin cambios; el contrato vigente manda.

### Interaction contract

- Primary interaction: escribir el prompt y generar.
- Hover / focus / active: sin cambios.
- Pending / disabled: sin cambios; lo bloqueado sigue trayendo su razón en texto.
- Escape / click-away: el panel de créditos conserva el comportamiento nativo del elemento desplegable.
- Focus restore: sin cambios.
- Latency feedback: sin cambios.
- Toast / alert behavior: sin cambios.

### Motion & microinteractions

- Motion primitive: `none` — esta task no agrega ni modifica movimiento. El contrato vigente
  (`GLOBE_CLIENT_MOTION_CONTRACT_V1`) manda y no se tocó.
- Enter / exit · Layout morph · Stagger: sin cambios.
- Timing / easing token: sin cambios.
- Reduced-motion fallback: sin cambios; el gate existente lo sigue exigiendo.
- Non-goal motion: no se introduce ningún efecto temporal nuevo.

### Implementation mapping

- Route / surface: `/producer` del payload cliente.
- Primitive / variant / kind: `src/format/credits.ts` nueva; el resto reusa.
- Component candidates: `ProducerHeader.tsx`, `composer/ProducerComposer.tsx`,
  `composer/ComposerToolDock.tsx`, `feed/ProducerFeed.tsx`, `primitives/index.tsx`, `dialogs/*`.
- Copy source: `src/copy/index.ts`.
- Data reader / command: ninguno nuevo. Esta task no toca backend.
- API parity: no aplica — no se agrega acción de negocio.
- Access / capability: sin cambios.
- States to implement: ninguno nuevo; se corrigen los existentes.

### GVC scenario plan

- Scenario file: **no aplica** — GVC es el harness de Greenhouse (portal Next.js + `agent-session` de
  NextAuth). El payload de Globe es otro runtime, en otro repo, detrás del front door de Globe. Forzar
  un escenario sería fabricar evidencia.
- Evidencia equivalente realmente ejecutada: canario del composer **163/163**, canario del motor
  **8/8**, y revisión humana en vivo a 1440px contra la revisión desplegada.
- Por eso `UI ready` queda en `no`: el semáforo está definido contra un harness que no alcanza esta
  superficie, y la preparación de la superficie es de `TASK-1552`.

### Design decision log

- Decision: aparear familia×peso **en el sitio de uso**, y rechazar toda utilidad de fuente que el theme
  no pueda generar.
- Alternatives considered: validar sólo la declaración de `@font-face` (no ve quién pide qué); agregar
  los escalones faltantes al theme (agregar un escalón al SSOT es decisión de diseño, no arreglo de
  compilación).
- Why this pattern: el defecto no vive donde se declara sino donde se pide. Un gate que verifica la
  declaración protege la declaración, no el contrato.
- Reuse / extend / new primitive: `new` sólo para el formato de cifras; los gates **extienden** el
  archivo que `TASK-1561` creó.
- Open risks: el preflight no emitido dejaba el peso heredado fuera del alcance de cualquier gate que
  escanee `className`. **Cerrado en `403d346`** con un peso declarado del SSOT en `@layer base`: el reset
  vuelve innecesario el gate para este caso. Persiste la **categoría** — otro elemento HTML con default
  propio del UA vuelve a caer fuera de todo escaneo de clases.

### Visual verification

- GVC scenario: no aplica (ver arriba).
- Viewports: 1440px en revisión humana; 1440/390/320 en los canarios ya existentes.
- Required captures: revisión en vivo sobre el deploy real, no capturas de mockup.
- Required `data-capture` markers: no aplica.
- Scroll-width check: el desborde del cuerpo del composer contra el riel se verificó corregido en vivo.
- Accessibility/focus checks: sin regresión; la plomería de anuncios del port se conserva intacta.
- Before/after evidence: la revisión en vivo antes y después de cada uno de los tres despliegues.
- Known visual debt: H9 del feed, con bloqueadores medidos y declarados.
- Visual scorecard: no aplica — el harness de scorecard es de Greenhouse y no alcanza este runtime.
- Quality threshold: no aplica por la misma razón.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No se llena al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato tipográfico y sus dos gates (`68a2cbe`) ✅

- Los trece sitios que pedían Geist@700 pasan a un par familia×peso realmente cargado. Incluye los tres
  KPI de crédito del encabezado y cinco reglas `.pf__*` de la hoja.
- Gate nuevo `never asks a family for a cut it does not load` — aparea familia y peso **en el sitio de
  uso**, no en la declaración.
- Gate nuevo `never writes a font utility the theme cannot generate` — `font-normal` y `font-medium` no
  emitían CSS y nadie se enteraba.
- `tabular-nums` en siete números vivos.
- Los tokens de rótulo que se estaban usando como prosa vuelven a su token.

### Slice 2 — Jerarquía del Producer (`d009871`) ✅

Nueve hallazgos de una revisión visual en vivo. Los dos de fondo:

- **El panel de créditos.** No se rompía por el número: llevaba `max-w-full`, y sobre un elemento
  `absolute` esa medida resuelve contra el bloque contenedor —el `<details>`, o sea el ancho del
  disparador—. Los tres síntomas visibles eran **un solo bug**, y se corrige en el contenedor.
- **`Listo` vs `Completada`.** No eran dos palabras: son dos ejes del contrato, `coarseProgress` y
  `state`. Al separarlos, la clave de copy `stateCompleted` quedó huérfana y se borró.

### Slice 3 — Cierre de la regresión propia (`b9112a8`) ✅

- Bajar las acciones del prompt al flujo hizo desbordar el cuerpo: un renglón quedaba cortado a media
  letra contra el riel translúcido. Se cierra con el token nuevo `--rail-scrim`, no devolviendo las
  acciones a su lugar anterior.
- `Math.floor` en el porcentaje del donut: con `round` decía `100 %` junto a `Gastado 166`.

## Out of Scope

- **La frontera del gate hacia `apps/studio-web`.** Es `TASK-1560` Slice 2, por diseño: ampliar la
  cobertura con los archivos legacy vivos deja el gate rojo, y eso se resuelve con el borrado, no acá.
- **El H9 del feed.** Se midió, no se arregló. Uno de sus bloqueadores vive en
  `packages/domain/src/producer-live-feed.ts`, fuera del payload cliente.
- **El póster de video.** Es `TASK-1569`; no se tocó.
- **La revisión compacta (390px) del Producer.** Los canarios que ya la cubrían siguen verdes, pero esta
  task no reclama haberla revisado visualmente.
- **El preflight de Tailwind.** Se diagnosticó y se declaró abierto; no se decidió su remedio, porque
  emitir el preflight cambia el reset de toda la superficie y esa es una decisión del motor
  (ADR-016 / `TASK-1485`), no de esta task. **Delta: el preflight sigue fuera** — lo que se cerró después
  (`403d346`) fue el síntoma, neutralizando `b, strong` con un peso del SSOT. Ver Follow-ups.
- **Cualquier cambio de backend, de capability o de scope de autenticación.**

## Detailed Spec

### Por qué el gate del sitio de uso, y no el de la declaración

Los cortes cargados son tres: Poppins 700, Geist 400, Geist 600. La declaración estaba sana. Lo que
estaba mal era **quién pedía qué**: trece sitios pedían Geist@700. Cuando un navegador recibe una
petición de peso sin archivo correspondiente, no falla: **sintetiza** — engrosa el trazo por algoritmo.
El resultado se ve mal y no rompe nada. Ni el build, ni el lint, ni el canario, ni el gate anterior.

Por eso el gate nuevo aparea **familia × peso en el sitio de uso**. Es la única posición desde la que el
par es observable.

### Por qué el segundo gate

`font-normal` y `font-medium` estaban escritas y **no emitían CSS**: el theme, generado desde el SSOT,
no podía producirlas. Una utilidad que no emite es indistinguible de un olvido. El gate la rechaza; si
el escalón hace falta, se agrega al SSOT como decisión explícita.

### El bloque contenedor

`max-w-full` es `max-width: 100%`, y `100%` de un elemento posicionado `absolute` se resuelve contra su
**bloque contenedor**, que es el ancestro posicionado más cercano. En el panel de créditos ése es el
propio `<details>`: el ancho del disparador. De ahí salían los tres síntomas —recorte, ancho absurdo,
quiebre del número— que parecían tres bugs distintos.

**Regla transferible:** antes de culpar al contenido por un desborde, verificar contra qué se está
midiendo. Un porcentaje sobre un elemento posicionado casi nunca mide lo que uno cree.

### Los dos ejes del contrato

`coarseProgress` responde *¿terminó de trabajar?*; `state` responde *¿en qué estado quedó?*. Son
ortogonales. `Listo` pertenece al primero y `Completada` al segundo; tratarlas como sinónimos colapsaba
dos dimensiones en una. Al separarlas, `stateCompleted` quedó sin ningún consumidor y se borró:
conservarla habría dejado el sinónimo servido para el próximo agente.

### La regresión y el velo

Bajar las acciones del prompt al flujo fue una mejora de jerarquía que introdujo un defecto: el cuerpo
desbordó y el último renglón quedó cortado a media letra contra el riel translúcido. Se cerró con el
token `--rail-scrim` en el SSOT, porque el velo del riel **es un valor de diseño** y ADR-016 prohíbe que
un valor de diseño viva literal en `className`.

`Math.floor` en el donut: `round` producía `100 %` cuando todavía quedaba crédito, junto a la cifra
`Gastado 166` que decía lo contrario. Un porcentaje que contradice al número que tiene al lado destruye
la confianza en ambos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

El orden fue y debe leerse así: **Slice 1 → Slice 2 → Slice 3**.

- Slice 1 (contrato tipográfico + gates) va primero **por necesidad**: corregir jerarquía sobre trazos
  sintetizados es medir sobre una superficie que miente. La revisión del Slice 2 sólo tiene sentido con
  el trazo real en pantalla.
- Slice 3 existe **porque** el Slice 2 lo causó. Un cierre de regresión nunca precede a la regresión.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cambiar el peso pedido altera la jerarquía percibida más allá de lo previsto | UI (Producer) | medium | Revisión humana en vivo a 1440px después de cada despliegue, no sólo canarios | Revisión visual del operador |
| El gate nuevo produce falsos positivos y bloquea trabajo ajeno | UI / tooling | low | Los dos gates se ejercitaron contra el payload completo antes del despliegue; 129/129 verdes | `node --test` rojo en la suite del payload |
| El gate da falsa sensación de cobertura completa | UI / tooling | **high** | Declarado explícito: el peso heredado por preflight no emitido es invisible al gate. **Punto 1 cerrado en `403d346`** con un reset en `@layer base`, no con un gate; la categoría (defaults del UA) sigue sin cobertura automática | Ninguna señal automática — sólo aparece en revisión visual |
| El token `--rail-scrim` se usa fuera del riel y se convierte en un gris genérico | design tokens | low | Nombre acotado a su función; el SSOT es único | Deriva visible en revisión |
| La corrección del contenedor rompe el panel en anchos que no se revisaron | UI (Producer) | low | Canarios existentes a 1440/390/320 verdes | Canario del composer rojo |
| El H9 medido y no arreglado se pierda como conocimiento | UI (feed) | medium | Bloqueadores escritos con archivo y constante exactos, acá y en el handoff de runtime | — |

### Feature flags / cutover

**Sin flag — cambio aditivo con cutover inmediato.** Ningún flag nuevo, ninguna variable de entorno
nueva. Los dos gates son asertos de una suite ya existente; la corrección tipográfica y de jerarquía es
render. Nada que prender: el despliegue de la imagen **es** el cutover.

Consecuencia asumida: no hay apagado gradual. El remedio es el despliegue anterior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (`68a2cbe`) | Desplegar la imagen anterior en `globe-studio-internal`. Revertir el commit si además hay que quitar los gates | ~5 min | sí |
| Slice 2 (`d009871`) | Ídem. El borrado de `stateCompleted` se revierte con el commit | ~5 min | sí |
| Slice 3 (`b9112a8`) | Ídem. Revertir sin revertir el Slice 2 **reabre la regresión**: van juntos | ~5 min | sí, apareado con el Slice 2 |

Ningún slice muta estado durable: sin migraciones, sin backfills, sin transiciones de máquina de
estados. El rollback es de imagen.

### Production verification sequence

Ejecutado en este orden, con verificación antes de avanzar:

1. Local: `build` 0 · `eslint` 0 · `node --test` **129/129** · canario de motor **8/8** · canario del
   composer **163/163**.
2. Desplegar a `globe-studio-internal` y confirmar la revisión Ready con 100 % del tráfico.
3. Revisión humana en vivo en `https://globe.efeoncepro.com/producer` con sesión real a 1440px.
4. Repetir 1-3 por cada uno de los tres commits. El paso 3 del Slice 2 fue lo que **expuso** la
   regresión que el Slice 3 cerró — esa es la razón de que el paso 3 no sea opcional.
5. Estado final verificado: revisión **`globe-studio-internal-00100-9kq`**, imagen
   `…/globe-studio-internal:b9112a80985d`, 100 % del tráfico.

### Out-of-band coordination required

**N/A — cambio de repo y despliegue.** Ningún sistema externo requiere coordinación humana: sin Azure,
sin secretos, sin propiedades de terceros, sin comunicación a operadores por cambio de comportamiento de
negocio. Lo visible cambió para mejor y no altera ninguna decisión operativa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Ningún sitio del payload pide un par familia×peso que no esté cargado; los trece sitios quedaron
      corregidos.
- [x] Existe un gate que aparea familia y peso **en el sitio de uso** y que rompe si el par no está
      cargado.
- [x] Existe un gate que rechaza toda utilidad de fuente que el theme no pueda generar.
- [x] Los siete números vivos del Producer usan `tabular-nums`.
- [x] El porcentaje del donut usa `Math.floor` y no puede mostrar `100 %` con crédito restante.
- [x] El panel de créditos se corrigió en el bloque contenedor, no truncando el número.
- [x] `coarseProgress` y `state` quedan tratados como ejes distintos, y `stateCompleted` fue eliminada
      por quedar sin consumidor.
- [x] El velo del riel es un token del SSOT (`--rail-scrim`), no un valor literal en `className`.
- [x] `build` 0, `eslint` 0, `node --test` 129/129, canario de motor 8/8, canario del composer 163/163.
- [x] Los tres commits están desplegados y verificados en vivo sobre la revisión activa de
      `globe-studio-internal`, con sesión real a 1440px.
- [x] Los cinco puntos abiertos están declarados con su estado, y los tres que no tienen dueño se
      declaran **sin dueño**, sin inventar responsables.
- [x] Se declaró `Execution profile: ui-ux` y `UI impact: layout` según el alcance real.
- [x] Se declaró `Wireframe:` y el archivo existe.
- [x] `UI ready` permanece `no`, con la razón escrita: el semáforo se define contra un harness de
      Greenhouse que no alcanza el payload de Globe, y la preparación de la superficie es de `TASK-1552`.
- [x] El copy visible del payload sigue viviendo en su capa de copy; no nació texto suelto.

## Verification

Ejecutado en `efeonce-globe`:

- `build` — 0 errores
- `eslint` — 0 errores
- `node --test` — **129/129**
- canario de motor — 8/8 asertos
- canario del composer — 163/163 asertos
- Revisión humana en vivo: `https://globe.efeoncepro.com/producer`, sesión real, 1440px, contra la
  revisión desplegada.

Verificación de la revisión viva (no supuesta):

```bash
gcloud run services describe globe-studio-internal \
  --region southamerica-west1 --project efeonce-globe
# → globe-studio-internal-00100-9kq · 100% · imagen …/globe-studio-internal:b9112a80985d
```

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real (`complete`)
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `docs/tasks/TASK_ID_REGISTRY.md` registró el ID y corrigió el siguiente ID libre
- [x] `Handoff.md` — la continuidad de runtime de Globe vive en
      `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`, actualizado con los tres SHA
      desplegados, lo visible del Producer y los puntos abiertos 1-3
- [x] `changelog.md` — entrada agregada (el cambio es visible y Globe ya se registra ahí); el detalle de
      runtime vive en el handoff de Globe, que sigue siendo su registro canónico
- [x] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas (`TASK-1560`, `TASK-1485`,
      `TASK-1552`)
- [x] la revisión viva se **verificó** con `gcloud run services describe`, no se supuso

## Follow-ups

- ~~**Sin dueño — el preflight de Tailwind no se emite.**~~ **CERRADO 2026-07-29 en `403d346`**, sin
  adoptar preflight: `b, strong { font-weight: var(--weight-semibold) }` en `@layer base` de
  `styles/tailwind.css`. 600 y no `inherit` porque `inherit` mata el énfasis. Medido en el runtime vivo
  (revisión `globe-studio-internal-00101-x2d`) con `getComputedStyle` sobre los 25 `<strong>`/`<b>` del
  Producer: 24 Geist@600, 1 Poppins@700, **cero sintetizados**. Consecuencia vigente: el énfasis sobre Geist
  **topa en 600** — más peso es `font-display` (Poppins 700). **Lo que NO se cerró es la categoría:** lo que
  entra por el nombre del elemento sigue siendo invisible a un gate de `className`, así que otro elemento con
  default propio del UA reabre el agujero. Detalle en el contrato de tipografía §6.
- **`TASK-1560` Slice 2** — la frontera de los gates hacia `apps/studio-web`, que hoy tiene 184 hex
  crudos y 4 familias literales medidos. Hereda las dos clases nuevas.
- ~~**Sin dueño — fuga del `axis-pilot-canary`.**~~ **CERRADO 2026-07-29 en `403d346`.** `pnpm exec vite` no
  es un proceso sino tres (wrapper de `pnpm`, su `node`, el `vite` nieto) y el `kill` alcanzaba sólo al
  primero. El arreglo: `detached: true` + `process.kill(-pid, …)` al **grupo** de procesos, esperando a que
  muera con escalón a `SIGKILL` — sin ese `await` el proceso puede terminar antes de que el nieto suelte el
  puerto, que es el mismo bug con otro disfraz. En Windows se conserva `server.kill()`. Medición:
  `pnpm --filter @efeonce-globe/studio-client test` → **exit 0 en 29 s** (antes: indefinido), 129/129, tres
  canarios verdes, cero huérfanos en el 4326. **El workaround manual del puerto queda retirado.**
- **H9 del feed, medido y no arreglado.** El 45 % vacío es alto fijo en la hoja más un pie `absolute`; y
  el `…` del título **no es CSS** — `DISPLAY_TITLE_MAX_LENGTH = 96` recorta por conteo de caracteres en
  `packages/domain/src/producer-live-feed.ts`, antes de que exista layout. Ningún ancho lo arregla. La
  superficie es de `TASK-1559`/`TASK-1526`; conviene que una de las dos lo adopte explícitamente.
- **`TASK-1569`** — el póster de video, sin tocar y sin cambio de estado.
- El ignore de `generated/**` en ESLint (`f36483910`) se agregó para desbloquear el pre-push del repo
  ante 43 errores de un trabajo ajeno en curso. Conviene revisar que la exclusión siga siendo la
  correcta cuando ese trabajo cierre.

## Delta 2026-07-29 — creación

Task creada el mismo día del trabajo, ya cerrada: nace y muere `complete` porque los tres commits están
desplegados y verificados en vivo antes de escribirla.

**Nota de gobernanza sobre el ID.** El pie de `TASK_ID_REGISTRY.md` declaraba `TASK-1587` como siguiente
ID libre, pero la **tabla del mismo archivo** ya registraba hasta `TASK-1598`, y esos archivos existen en
disco. El pie estaba obsoleto respecto de su propia tabla. Se reservó `TASK-1599`, verificado libre
contra el sistema de archivos y contra el registry, y se corrigió el pie. Barrido hecho **por dominio y
superficie**, no por título: la vecina real de esta task es `TASK-1561` (misma superficie: los gates de
contrato de diseño del payload), y no comparten ninguna palabra del título.

## Delta 2026-07-29 — dos gaps cerrados en `403d346`

Dos de los tres puntos que esta task declaró **sin dueño** se cerraron en código, se desplegaron y se
midieron contra el runtime vivo el mismo día. La task no se reescribe: su registro de lo que **hizo** sigue
intacto, y acá se declara lo que cambió después.

| Gap | Estado | Cierre | Medición |
|---|---|---|---|
| 1 · `bolder` del UA | ✅ cerrado | `b, strong { font-weight: var(--weight-semibold) }` en `@layer base` de `apps/studio-client/src/styles/tailwind.css`. **Sin adoptar preflight**; 600 y no `inherit` porque `inherit` mata el énfasis | `getComputedStyle` sobre los 25 `<strong>`/`<b>` del Producer vivo: 24 Geist@600, 1 Poppins@700, **`SINTETIZADOS: []`** |
| 3 · fuga del `axis-pilot-canary` | ✅ cerrado | `detached: true` + `process.kill(-pid, …)` al **grupo** de procesos, esperando la muerte con escalón a `SIGKILL`. `server.kill()` se conserva en Windows | `pnpm --filter @efeonce-globe/studio-client test` → **exit 0 en 29 s** (antes: indefinido), 129/129, tres canarios verdes, cero huérfanos en el 4326 |
| 4 · H9 del feed | 🔴 abierto | — | Bloqueadores medidos y vigentes: alto fijo en la hoja más pie `absolute`; `DISPLAY_TITLE_MAX_LENGTH = 96` recorta por conteo de caracteres en `packages/domain/src/producer-live-feed.ts` |

**Lo que NO cerró el gap 1:** la categoría. Un defecto que entra por el **nombre del elemento** sigue siendo
invisible a cualquier gate que lea `className`; el reset cubre `b`/`strong`, no un elemento futuro con otro
default del UA. **Y el workaround del gap 3 —correr los canarios por separado y liberar el 4326 a mano— queda
retirado:** sostener un workaround para un bug muerto hace pagar el costo dos veces y enseña a desconfiar del
comando canónico.

Revisión viva verificada con `gcloud run services describe globe-studio-internal`:
`globe-studio-internal-00101-x2d`, imagen `…globe-studio-internal:403d3464e88e`.

## Open Questions

- ~~¿Emitir el preflight de Tailwind, o construir una verificación que lea el HTML renderizado?~~
  **Resuelto por una tercera vía en `403d346`:** neutralizar `b, strong` en `@layer base` con un peso del
  SSOT. El preflight sigue fuera (decisión de ADR-016, intacta) y el gate sobre HTML renderizado sigue sin
  existir. **Lo que queda abierto es la categoría:** ¿hace falta un gate estructural que exija peso declarado
  en todo elemento con default del UA (`h1`–`h6`, `th`)? Hoy el mecanismo es el reset, que cubre los
  elementos que conocemos, no los que alguien introduzca después.
- ¿Quién adopta el H9 del feed — `TASK-1559` o `TASK-1526`? Ambas tocan la superficie; ninguna declara
  hoy el hallazgo.
