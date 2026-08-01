# TASK-1485 — Globe Design System Governance and Incremental Pattern Registry

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `component`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1485-globe-design-system-pattern-lab.md`
- Flow: `docs/ui/flows/TASK-1485-globe-design-system-pattern-lifecycle-flow.md`
- Motion: `docs/ui/motion/TASK-1485-globe-design-system-motion-governance.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `EN EJECUCIÓN 2026-07-30 — Slices 0-1 (tokens). Re-scopeada: adoptar AXIS en Globe, no crear un DS propio. 🔴 Slice 0 NO es de Globe: axis-tokens es mono-marca y no contiene la marca de Globe (naranja #FF6500), así que AXIS publica primero. Slices 2-3 (registry/fixtures/gates) BLOQUEADOS: sus contratos UI (wireframe/flow/motion) son stubs de 8-16 líneas que describen el Pattern Lab Globe retirado por el re-scope — necesitan reautoría o retiro antes de tocar JSX. UI ready sigue en no y es correcto`
- Rank: `TBD`
- Domain: `creative|ui-platform|governance|accessibility`
- Blocked by: `TASK-1455`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-07-27 — ADR-016: el motor de estilos del payload cliente entra a esta task

El barrido por dominio (regla de `EPIC-028`) confirma que **esta task es la dueña** del motor de estilos: su
Summary ya declara que *«Globe posee e implementa tokens seleccionados, patterns, components, motion y
runtime»*. No se crea task nueva.

[**ADR-016**](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md) propone
adoptar **Tailwind v4** con el SSOT de tokens como theme. Estado `Proposed`: no se ejecuta sin aceptación.

**Qué lo motivó (medido, no opinión):** seis colisiones de CSS global en una sola sesión — cuatro donde la hoja
legacy pisó markup nuevo, una donde renombrar clases desconectó el glow del prompt, y el descubrimiento de que
66 de 84 clases del composer vivían en la hoja del legacy. Ninguna es error de criterio: todas son consecuencia
de CSS global sin scope con dos hojas conviviendo.

**Slice que entra a esta task (bloqueado por aceptación del ADR):**

- Instalar Tailwind v4 en `apps/studio-client` y exponer `src/tokens/tokens.ts` como su theme — **un token se
  declara una vez, ahí**.
- **Reescribir los tres gates** (`design-contract.test.ts` ×3 + `reduced-motion.test.ts`) para que muerdan la
  sintaxis de utilidades: `text-[#hex]`, `p-[13px]`, duraciones literales. **Es precondición, no follow-up** —
  un gate que deja de morder al cambiar de motor no era un gate.
- Migrar superficie por superficie, con **diff visual contra el render anterior** en cada una. Nunca big-bang.
- Orden propuesto: composer (el que duele) → feed → viewer → share.

**Referencia para la migración:** [`GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)
consolida geometría, valores exactos, estados, motion, iconografía y asertos del composer. Está escrita para que
la reescritura sea **traducción mecánica**, no reinterpretación — y es independiente del motor de estilos.

**Lo que destraba:** el Slice 0 de `TASK-1552` se retira —mover 272 reglas que se van a reescribir es trabajo
desechable— y `TASK-1560` se destraba por el mismo camino.

## Delta 2026-07-30 — 🔴 su premisa central contradice el ADR de ownership de AXIS

El Summary de esta task declara que **Globe posee e implementa tokens seleccionados, patterns, components,
motion y runtime**, y su Goal pide un **Pattern Lab Globe**. Las dos cosas son incompatibles con el estado
vigente del ecosistema:

1. **[`EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1`](../../architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md)
   (`Accepted`, corregido 2026-07-30)**: AXIS posee la **especificación completa** —primitivo, semántico y
   **componente**— y cada producto sólo traduce a su motor. Si Globe posee sus patterns y sus components, el
   mismo pattern puede verse distinto en cada producto, que es exactamente lo que el ADR existe para
   impedir. El operador lo nombró así: *"si un botón se va a comportar igual pero se va a ver distinto donde
   lo pongan, ¿qué sentido tiene tener un design system?"*.
2. **El Lab vive en el Vercel de AXIS** (decisión del operador 2026-07-30, `TASK-1590` § Delta (b)). Un
   Pattern Lab Globe sería un segundo Lab.

**Esto ya venía señalado y nadie lo cerró.** `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1` dice desde su
redacción que *"`TASK-1485` pasa a ser un consumer/piloto de la plataforma compartida y **debe actualizarse
antes de promover el registry como estable**"*, y el continuity map del 2026-07-29 lo listaba como **P4
bloqueado por diseño**. El ADR corregido agrava la distancia: `1485` no sólo deja de ser dueño del registry,
deja de ser dueño de sus tokens y patterns.

### Lo que SIGUE siendo válido de esta task

No queda sin sujeto — buena parte se sostiene:

- **Globe no hereda MUI/Vuexy.** Cierto, y el ADR lo preserva explícitamente: los adapters son nativos.
- **El lifecycle `candidate → trial → stable`** con anatomy, states, responsive, a11y, motion y evidence.
  Es el mismo del contrato compartido.
- **El motor de estilos del payload cliente** (ADR-016, Tailwind v4 sobre el SSOT) — ya implementado y sin
  relación con esta contradicción.
- **La identidad de la suite Capacity** — es producto, no design system.

### Lo que hay que re-scopear

- *"Globe posee e implementa tokens seleccionados, patterns, components"* → Globe **traduce** la
  especificación de AXIS a Tailwind. Puede tener patterns **propios** de su dominio (los cinco tests del
  ADR), pero no versiones propias de patterns compartidos.
- *"Pattern Lab Globe"* → fixtures de Globe **dentro del Lab de AXIS**, que es donde el diff cross-runtime
  compara los dos adapters (`TASK-1601`).

**No ejecutar esta task como está escrita.** Decisión de re-scope: del operador.

## Summary

**Re-scopeada 2026-07-30.** Adoptar AXIS en Globe: traducir a Tailwind la especificación que AXIS publica,
aportar los fixtures de Globe al Lab de AXIS, y gobernar únicamente los patterns **propios del dominio de
Globe** — los que no suben porque conocen su negocio. Greenhouse conserva el gobierno del proceso.

Globe **no hereda MUI/Vuexy** (eso se mantiene íntegro) pero **tampoco es dueño de la apariencia de un
pattern compartido**: si el mismo pattern se ve distinto en cada producto, el design system no sistematiza
nada. Globe traduce; no diseña.

El **color scheme y la arquitectura de superficie** del payload cliente entran acá por
[ADR-017](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md): el runtime
está pintado con una paleta inventada por un prototipo (`#4db8ff`), mientras la marca real de Globe es
**naranja `#FF6500`** y las superficies del theme ya existen. Esta task las adopta — no las redefine.

🔴 **Su primer paso NO es de Globe.** `@efeoncepro/axis-tokens` es **mono-marca**: `axisRamp.primary[500]`
es `#0375db`, el azul de Greenhouse, y **el naranja de Globe no existe en el paquete** (sólo en Figma, que
ya está modelado multi-marca). Traducir la especificación de AXIS es hoy materialmente imposible para el
color, porque no hay de dónde traducir. La brecha se cierra en AXIS: ver
[propuesta con las mediciones](../../architecture/EFEONCE_AXIS_SURFACE_SCALE_AND_ACCENT_PROPOSAL_V1.md).

> *Alcance anterior, retirado:* «Crear el Design System propio de Globe (…) Globe posee e implementa tokens
> seleccionados, patterns, components, motion y runtime sin heredar el Design System de Greenhouse», más un
> Pattern Lab Globe. Contradecía el ADR de ownership de AXIS y la decisión de que el Lab vive en el Vercel
> de AXIS. Ver Delta 2026-07-30.

## Why This Task Exists

La shell inicial resolvió identidad, pero los workbenches siguientes necesitan consistencia sin acoplar Globe
a Vuexy/MUI/CompositionShell ni improvisar patterns aislados por pantalla.

## Goal

Que Globe consuma el registry y la especificación de AXIS, aporte sus fixtures al Lab compartido, y que
cada pattern **propio de Globe** nazca `candidate` demostrando anatomy, states, responsive, a11y, motion y
evidence antes de promoverse.

El lifecycle `candidate → trial → stable` se conserva **tal cual** — es el mismo del contrato compartido, no
uno paralelo.

También se conserva la identidad internacional de la suite **Capacity**: la capacidad es la superficie de
producto; `credits` es la unidad operativa, no el nombre de una wallet ni una equivalencia monetaria. Eso es
**producto, no design system**, y no lo toca el re-scope.

> *Retirado del Goal:* «un registry versionado y un Pattern Lab Globe». El registry es el de AXIS y el Lab
> es uno solo, en el Vercel de AXIS. Globe aporta fixtures, no un segundo Lab.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/ui/visual-directions/TASK-1474-globe-studio-workbench-direction.md`
- `docs/ui/visual-directions/TASK-1483-globe-credits-operations-workbench-direction.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` sólo como quality/evidence bar, no inheritance.

## Dependencies & Impact

### Depends on

- `TASK-1455` para shell Orbital Threshold, brand assets y runtime UI verificado.
- 🔴 **AXIS publicando la marca de Globe.** El paquete es mono-marca hoy; sin estructura multi-marca +
  los cuatro planos de superficie + el mapeo dark de `secondary`, los slices de color **no pueden
  arrancar**. No se destraba declarando los valores en Globe (ver § Out of Scope).

### Blocks / Impacts

- `TASK-1474` y `TASK-1483` registran/extienden patterns Globe mediante este lifecycle.
- Futuras surfaces Globe deben decidir `reuse | extend | new`, sin copiar patterns Greenhouse por defecto.

### Files owned

- En Greenhouse: decision log, registry metadata, lifecycle, QA/evidence y baseline references de Globe.
- En Globe: `apps/studio-web` Pattern Lab y packages/paths UI propios que Plan Mode defina.

No posee el Design System de Greenhouse ni autoriza dependencias Vuexy/MUI/React.

## Current Repo State

### Already exists

- Globe tiene shell branded HTML/CSS/TS y assets/tokens iniciales de Orbital Threshold.

### Gap

- No hay registry/lifecycle propio, pattern contracts ni ownership formal entre gobierno Greenhouse y runtime Globe.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `governance/evidence Greenhouse; source/runtime Globe`
- Future candidate home: `remain-shared`
- Boundary: `Globe Design System`
- Server/browser split: `pattern metadata build-time; runtime browser-safe sin secrets`
- Build impact: `Globe pattern lab + Greenhouse gates/GVC`
- Extraction blocker: `ninguno`

## UI/UX Contract

- Visual direction: `docs/ui/visual-directions/TASK-1485-globe-design-system-direction.md`
- Wireframe: `docs/ui/wireframes/TASK-1485-globe-design-system-pattern-lab.md`
- Flow: `docs/ui/flows/TASK-1485-globe-design-system-pattern-lifecycle-flow.md`
- Motion: `docs/ui/motion/TASK-1485-globe-design-system-motion-governance.md`
- Ownership: `Greenhouse governs; Globe designs/implements/owns its UI language`.
- Inheritance: `none by default`; selected shared brand colors require explicit token decision/provenance.
- Registry lifecycle: `candidate -> trial -> stable -> deprecated -> retired` con owner/version/evidence.
- Pattern contract: anatomy, slots, variants, states, density, responsive, content, a11y, motion, do/don't.
- Visual evidence: Pattern Lab desktop/mobile, keyboard, reduced motion, contrast y regression baselines.
- Suite identity: `Capacity` / `Capacidad`, `Studio Capacity` / `Capacidad del estudio`, `credits` / `créditos`.
- Cross-locale semantics: la identidad visual no depende del idioma; copy keys, estados y labels tienen fuente
  canónica por locale y conservan el mismo significado operativo.

### Credit identity and semantic contract

Los créditos son las unidades atómicas de capacidad creativa gobernada. No son dinero, saldo, wallet, token
negociable ni una segunda contabilidad. Cada representación visual debe explicar no sólo cuántos créditos existen,
sino qué capacidad está disponible, comprometida, consumiéndose o confirmada, en qué ámbito y con qué nivel de
certeza.

La primitive canónica se compone de tres capas:

1. **Credit Unit** — cantidad, unidad, formato, locale y estado de dato.
2. **Credit Phase** — fase operativa: `estimated`, `reserved`, `consuming`, `settled`, `released`, `blocked`,
   `partial`, `stale` o `unknown`.
3. **Capacity Context** — ámbito y causalidad: workspace, proyecto, pool, grant, run o evento de ledger.

La unidad mínima visible siempre contiene `cantidad + unidad + fase`. En superficies operativas añade el ámbito:

```text
24 credits · Reserved
24 créditos · Reservado
```

```text
24 credits · Reserved · Campaign A · Run 042
24 créditos · Reservado · Campaña A · Run 042
```

Un número desnudo (`24`, `184`, `−12`) no es una representación válida de credits.

#### Fases y comportamiento

| Phase | Meaning | Visual behavior |
|---|---|---|
| `estimated` | cálculo previo, aún no comprometido | azure tenue, marcado como estimate vigente |
| `reserved` | capacidad retenida para una acción | amber tonal, segmento anclado al runway |
| `consuming` | consumo activo del run | pulso azure breve, sin loop permanente |
| `settled` | consumo confirmado por el ledger | estado estable, rastro confirmado |
| `released` | reserva devuelta a capacidad disponible | segmento se reintegra sin dramatización |
| `blocked` | la acción no puede continuar | rojo tonal, causa y recovery visibles |
| `partial` | respuesta incompleta o cobertura parcial | amber y explicación de cobertura |
| `stale` | dato fuera de freshness válida | amber, timestamp y acción de refresh |
| `unknown` | ausencia de dato confiable | `—` y explicación; nunca se presenta como `0` |

#### Visual identity: Horizon + Orbit

La identidad visual de credits es **Horizon + Orbit**. El horizonte representa el límite de capacidad; el orbe
representa la unidad creativa; la órbita representa reservas y asignaciones; el pulso representa consumo activo; la
estela representa consumo confirmado; la banda discontinua representa proyección e incertidumbre.

El `Credit Unit` usa un orbital capacity mark, no una moneda. No utiliza signo monetario, tarjeta, relieve de moneda,
wallet, token crypto ni ticker financiero. La forma puede ser circular por continuidad con Globe, pero nunca debe
parecer una pieza de dinero.

La paleta expresa fase, no valor monetario: azure para capacidad activa, amber para reserva/proyección/atención,
verde tonal para operación confirmada, rojo tonal para bloqueo/error y azul grisáceo para estados liberados o
cerrados. Todo estado combina color con icono, label y texto.

#### Magnitude, phase and authority

Cada componente debe distinguir tres dimensiones:

- **Magnitude:** cuántos créditos.
- **Phase:** qué ocurrió o qué está ocurriendo con ellos.
- **Authority:** qué workspace, proyecto, pool, grant, run o evento los explica.

`Available`, `Budget`, `Consumed` y `Projected usage` no son sinónimos ni comparten el mismo tratamiento visual:

| Concept | Meaning | Canonical treatment |
|---|---|---|
| `Available` | capacidad actualmente utilizable | horizonte abierto / capacidad activa |
| `Budget` | límite autorizado | línea o marco de contención |
| `Consumed` | uso confirmado | segmento o rastro settled |
| `Projected usage` | posible uso futuro | banda de confianza, nunca certeza falsa |

#### Surface hierarchy

La misma primitive adopta cuatro densidades, sin crear identidades distintas:

- **Ambient:** Producer header, feed y context rail; muestra `Credit Pulse`.
- **Decision:** estimate, CTA y budget block; muestra consecuencia y vigencia antes de ejecutar.
- **Operational:** Capacity Workbench, pools y forecast; muestra runway, fases y asignaciones.
- **Evidence:** ledger, manifest e inspector; muestra evento, impacto, actor, ámbito y enlace causal.

El output creativo sigue siendo el héroe en Producer, Feed y Library. Credits sólo gana protagonismo en Capacity y
en los puntos donde una decisión de gasto, reserva o bloqueo requiere comprensión.

#### Motion and data honesty

Motion explica causalidad, no valor. `estimated → reserved` ancla un segmento; `reserved → consuming` activa un pulso
breve; `consuming → settled` deja un rastro estable; `released` devuelve capacidad al horizonte. No hay count-up
celebratorio, ticker, shake, flicker ni animación que sugiera velocidad o dinero.

`null`, `partial`, `stale`, `denied` y `unknown` nunca se normalizan a cero. Toda proyección distingue actual de
posible y toda cifra muestra freshness cuando el contrato lo exige.

#### Locale and copy contract

La identidad visual y el modelo de estados son independientes del idioma. Las copy keys permanecen estables y los
valores se localizan:

| Semantic key | English | Español |
|---|---|---|
| `globe.capacity.nav` | `Capacity` | `Capacidad` |
| `globe.capacity.title` | `Studio Capacity` | `Capacidad del estudio` |
| `globe.capacity.unit` | `credits` | `créditos` |
| `globe.capacity.estimated` | `Estimated` | `Estimado` |
| `globe.capacity.reserved` | `Reserved` | `Reservado` |
| `globe.capacity.settled` | `Settled` | `Liquidado` |
| `globe.capacity.projected` | `Projected usage` | `Consumo proyectado` |
| `globe.capacity.review` | `Review capacity` | `Revisar capacidad` |

La traducción no puede cambiar la jerarquía, la fase, la autoridad ni la diferencia entre estimate, reservation y
settlement.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

Los slices están ordenados por dependencia: **el 0 no se ejecuta en Globe**, y sin él los slices de color
no arrancan.

### Slice 0 — AXIS publica lo que Globe va a consumir *(fuera de Globe)*

- Estructura **multi-marca** en `@efeoncepro/axis-tokens` — hoy es mono-marca y no contiene la marca de
  Globe. Alcance mínimo: namespace por marca, sin migrar los productos existentes.
- Los **cuatro planos de superficie** (hundido / `body-bg` / `paper` / elevado), en light y dark.
- El **mapeo dark de `secondary`** — ningún escalón alcanza el piso de texto en oscuro; el único morado
  legible es `orchid-300` (4,80:1).
- Publicar versión. Globe está pineado en `0.1.5` y el paquete va en `0.2.1`.

Mediciones y alternativas: [propuesta a AXIS](../../architecture/EFEONCE_AXIS_SURFACE_SCALE_AND_ACCENT_PROPOSAL_V1.md).

### Slice 1 — `tokens.ts` pasa de SSOT a adapter

- Importar de `@efeoncepro/axis-tokens` y mapear rol → nombre CSS del payload. Hoy el archivo tiene **cero
  imports** y ~100 literales; al cerrar no debe declarar **ningún** valor de color de marca ni de superficie.
- **Drift guard** que falle si reaparece un hex de superficie o de marca declarado localmente. Sin él, el
  paralelismo vuelve solo y en silencio: el theme generado seguiría verde.
- Aplicar la arquitectura de ADR-017: **el contenedor del contenido se hunde; las piezas suben a `paper`**.
- Aplicar las reglas de uso medidas: CTA con texto oscuro, sombra de marca ≠ sombra de superficie,
  presupuesto del naranja (CTA · estado activo · foco, y nada más).

### Slice 2 — Registry y contratos sobre la especificación de AXIS

- Registry machine-readable con IDs `globe.*`, lifecycle, version, owner, consumers y evidence refs, para
  los patterns **propios del dominio de Globe** — no para versiones propias de patterns compartidos.
- Aportar los **fixtures de Globe al Lab de AXIS** (no un segundo Lab).
- Registrar la shell vigente y los contracts fundacionales, sin biblioteca big-bang.
- Habilitar `Creative Desk` y `Runway Control Plane` como candidates independientes; registrar
  `Capacity Observatory` como composición transversal (`Credit Pulse`, `Runway Plane`, `Risk Rail`,
  `Allocation Navigator`, `Evidence Ledger`, `Governed Command Dock`).

### Slice 3 — Promotion gates

- Lint anti-unregistered-pattern / anti-cross-system-import y decisión `reuse | extend | new` por task.
- Gates a11y/GVC/reduced-motion/overflow y proceso de deprecation/migration.
- Cierre: `pnpm theme:generate` + gate del theme generado, contraste re-medido en el runtime desplegado
  contra el **plano de menor contraste** de cada texto, y GVC premium con piezas reales de las tres
  modalidades — incluida al menos una de dominante fría.

## Out of Scope

- 🔴 **Declarar valores de color en Globe «mientras AXIS los publica».** Teclear el valor dos veces es el
  defecto que el Delta 2026-07-29 (a) de `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1` ya documenta:
  `warning` y `danger` divergieron así, inertes, sin que nada lo detectara. Si el Slice 0 no cerró, los
  slices de color **esperan**.
- Copiar Greenhouse UI, Vuexy, MUI, CompositionShell, recipes, layouts o motion patterns.
- Un segundo Pattern Lab. El Lab vive en el Vercel de AXIS; Globe aporta fixtures.
- Versiones propias de patterns compartidos — Globe traduce la especificación, no la reinterpreta.
- **El momento de marca.** Adoptar el theme deja el chasis correcto pero no entrega un momento visual
  dominante; eso es composición y pertenece a `TASK-1523`.
- Diseñar todos los patterns futuros por adelantado.
- Business logic, credits calculations o provider workflows.

## Detailed Spec

Ejecutar con `pnpm codex:task-hook TASK-1485 --develop` tras goal aprobado. La primera decisión de Plan Mode
es el package/path owner dentro de Globe; el registry canónico y su evidencia permanecen gobernados desde
Greenhouse. Cada nueva surface puede crear candidates en su task, pero promueve sólo por este contrato.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| Globe hereda Greenhouse accidentalmente | lint dependency/import + ADR no-inheritance | import cross-system |
| registry sin runtime truth | conformance Pattern Lab/source/evidence | entry sin consumer/source |
| big-bang design system | candidate on demand + consumers reales | pattern sin use case |
| drift visual/a11y | baseline multi-state + promotion gates | regression/axe/overflow |

- Feature flag: Pattern Lab internal-only.
- Rollback: retirar candidate/consumer, conservar version/evidence; stable usa deprecation, no delete.
- Verification: registry lint -> Pattern Lab -> keyboard/a11y -> GVC desktop/mobile -> consumers pilot.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR/decision declara Greenhouse governance, Globe ownership/runtime y no inheritance automática.
- [ ] Registry machine-readable valida ID/version/lifecycle/owner/consumer/evidence.
- [ ] Cada pattern documenta anatomy, states, responsive, a11y, motion y content contract.
- [ ] `Capacity Observatory` queda registrado como composición transversal con variantes compactas y full-workbench.
- [ ] Credit Unit, Credit Phase y Capacity Context tienen contract, fixtures y variantes por superficie.
- [ ] Las fases, freshness, partial/unknown y la diferencia available/budget/consumed/projected tienen evidencia.
- [ ] Horizon + Orbit se documenta y se prueba sin iconografía de wallet, token o dinero.
- [ ] English y Español conservan las mismas semantic keys, estados, jerarquía y alternativas accesibles.
- [ ] Pattern Lab muestra fixtures desktop/mobile/keyboard/reduced motion y estados honestos.
- [ ] No existen imports/dependencies de UI Greenhouse en Globe salvo contrato explícitamente aprobado.
- [ ] Compartir colores queda token-by-token documentado; no arrastra patterns ni semantics completas.
- [ ] `TASK-1474`/`1483` pueden registrar candidates sin esperar una biblioteca exhaustiva.

## Verification

- `pnpm task:lint --task TASK-1485`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- GVC Pattern Lab desktop/mobile cuando exista runtime.

## Closing Protocol

- [ ] `UI ready: yes` sólo con registry/decision/Pattern Lab/gates/evidence completos.
- [ ] Registry, README, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- Cada product task conserva ownership de su composition y propone candidates; esta task gobierna promoción.

---

## Delta 2026-07-29 — el motor que gobiernas ganó dos gates y un token, y mostró un límite

Cerró [`TASK-1599`](../complete/TASK-1599-globe-client-typographic-contract-producer-hierarchy.md) sobre el
motor de estilos y los gates que esta task declara suyos. **No transfiere propiedad**: se registra acá para
que el próximo agente no re-decida lo ya decidido.

**Dos gates nuevos** en `apps/studio-client/src/gates/design-contract.test.ts`:

- `never asks a family for a cut it does not load` — aparea familia×peso **en el sitio de uso**. La
  declaración de `@font-face` estaba sana; el defecto era **quién pedía qué**: 13 sitios pedían Geist@700
  con sólo Poppins 700 · Geist 400 · Geist 600 cargados, y el navegador lo **sintetizaba** — trazo
  deformado, build/lint/canario/gate todos verdes.
- `never writes a font utility the theme cannot generate` — `font-normal` y `font-medium` estaban escritas
  y **no emitían CSS**, porque el theme generado desde el SSOT no podía producirlas. Se decidió que falle
  en vez de agregar los escalones: **agregar un escalón al SSOT es decisión de diseño, no arreglo de
  compilación**.

**Token nuevo en el SSOT:** `--rail-scrim`, el velo del riel del flujo del composer. Nació en
`tokens/tokens.ts` y no como valor literal, por la regla dura de ADR-016.

**Límite del enfoque, medido hoy y sin dueño.** Los cuatro gates —y estos dos— escanean `className`. El
**preflight de Tailwind no se emite**, así que la regla del navegador `b, strong { font-weight: bolder }`
pide el corte fuerte **por herencia, sin que ninguna clase lo diga**: estructuralmente invisible a
cualquier verificación que lea utilidades. Apareció tres veces en un solo día.

Las dos salidas posibles se identificaron y **ninguna se tomó**, porque ambas son decisiones del motor:
emitir el preflight (cambia el reset de toda la superficie) o construir una verificación que lea el HTML
renderizado en vez del `className` (un tipo de gate que hoy no existe). **Hoy ninguna task lo reclama.**
