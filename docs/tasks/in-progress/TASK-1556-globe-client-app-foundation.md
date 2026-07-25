# TASK-1556 — Globe Client Application Foundation + Share Board

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1556-globe-client-app-foundation.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Discovery`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-1556-globe-client-app-foundation`
- GitHub Issue: `TBD`

## Summary

Implementa el **Slice 0 de ADR-014** en `efeonce-globe`: el payload de browser deja de ser HTML concatenado en
strings + código serializado con `Function.prototype.toString()` y pasa a ser una aplicación cliente tipada y
componetizada (Vite + React), servida como assets estáticos por el **mismo** `studio-web`. El seam se valida
construyendo el **share board** — la única superficie que un cliente externo ve hoy. Nacen el SSOT de tokens, la
capa de copy y los gates de calidad de UI, que Globe hoy no tiene. Todo detrás de un flag default-OFF.

## Why This Task Exists

Efeonce Globe es un **producto comercial** (ADR-010), pero su capa de browser no puede sostener lo que el producto
promete, y esto es verificable:

- `producer-controller.ts` (**4.999 líneas**, toda la interacción) declara `// studio-web intentionally compiles
  without lib.dom` y a continuación `type HTMLElement = any`, `declare const window: any` y un shim de `document`
  escrito a mano. **La capa donde viven los bugs de UI no tiene tipos.**
- El controlador se serializa con `.toString()`, así que **no puede importar nada**. El propio código documenta el
  impuesto: *"the controller body is serialized with `.toString()`, so it cannot close over the copy module."*
- Hay **cuatro bloques `:root` de tokens en tres archivos** (dos dentro de `producer-ui.ts`), y **184 hex crudos
  con 63 colores únicos** evadiendo los ~30 tokens semánticos. **Nada puede detenerlo**: Greenhouse tiene cinco
  gates de UI (`design:lint`, `design-contract:lint`, `ui:code-lint`, `ui:visual-gate`, `ui:quality`); **Globe no
  tiene ninguno**, y un `String.raw` no se lintea.
- La superficie client-facing (`/shares/:shareId`) son **15 líneas** con 3.071 caracteres de CSS en una sola línea,
  con los tokens de marca re-tipeados a mano **que ya driftearon** respecto del Producer, auto-rotulada `Producer`
  y con un link a `/legal/terms` que devuelve **JSON crudo** al browser.

El modelo de negocio le pide a la UI cuatro cosas que este sustrato **estructuralmente no puede expresar**:
densidad por modo comercial (`CREDIT_MODEL_V1.md:217-218`), proyección audience-aware con confidencialidad de
margen (`:209-215`), procedencia no destructiva (`BUSINESS_MODEL_V1.md:86-92`) y rótulos que aún no están decididos
(`Globe Credits` está bloqueado). Y el horizonte son tres superficies client-facing más — Storyboard con markup
vectorial e *"inmediatez similar a Frame.io"*, Video Effectiveness y delivery — **ninguna escrita todavía**.

Esta task no corre contra un bloqueo: la distancia a comercial son `TASK-1521` y `TASK-1480`. Se hace **ahora
porque es barato ahora**, con cero superficie de cliente ya construida sobre el payload viejo.

## Goal

- El browser recibe un bundle tipado y cacheable en vez de HTML concatenado; `studio-web` conserva intacto su rol
  de BFF, la sesión SSO, la CSP por nonce y el trust boundary.
- El **share board** —la cara del cliente— queda reconstruido con componentes, estados honestos y su primer canary
  visual, sin rótulos internos ni links muertos.
- Nace el **SSOT de tokens** de Globe: los cuatro `:root` paralelos colapsan en uno, y un hex crudo **falla el build**.
- Nace la **capa de copy** lista para locale, sin literales en JSX.
- Globe estrena los gates de calidad de UI que hoy no existen.
- Todo convive detrás de `GLOBE_CLIENT_APP_ENABLED` (default `false`): apagar el flag devuelve el payload viejo intacto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — **ADR-014, la decisión que
  esta task implementa**. Leer completa antes de Discovery.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — ADR-005, §3 y §4
  siguen normativos: el browser nunca llama la API privada; la política de surface se enforce-a en ingress/dispatch.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` — ADR-004: la mitad
  de **host** sigue diferida; esta task sólo ejerce la de **framework**.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` — ADR-010:
  Globe es producto comercial, no lab interno.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — ADR-003: naming
  client-facing (nombre del modelo público; slug/costo/margen prohibidos).

Reglas obligatorias:

- **NUNCA** mover el host, la sesión, el BFF ni el trust boundary en esta task.
- **NUNCA** aflojar la CSP: el bundle se sirve con `nonce`, jamás `'unsafe-inline'` ni `'strict-dynamic'`.
- **NUNCA** meter lógica de autoridad en el cliente.
- **NUNCA** importar primitives, `CompositionShell`, MUI o AXIS de `greenhouse-eo` (`TASK-1540`).
- **NUNCA** declarar tipos DOM como `any` ni shims de `document`/`window` en el payload nuevo.
- **NUNCA** correr el dev server con `--host` / `server.host`: 13 de los 19 advisories históricos de Vite son
  bypasses de `server.fs.deny` o lectura arbitraria del dev server, y **todos** exigen exponerlo a la red.
- **NUNCA** retirar una superficie vieja antes de que su reemplazo tenga cobertura equivalente.

## Normative Docs

- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` — §197-218: qué debe mostrar la
  UI y **qué nunca** (costo vendor, margen, slug, prompts, datos de otro workspace); densidad por modo comercial.
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md` — §86-92: doctrina de autoría
  (`aportado | derivado | sugerido`; el original visible hasta que una persona acepte).
- `docs/ui/wireframes/TASK-1556-globe-client-app-foundation.md` — el wireframe de esta task.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — estado vivo del runtime; **nunca** inferirlo de un
  número histórico.

## Dependencies & Impact

### Depends on

- Nada bloqueante. `apps/studio-web/src/assets.ts` (allowlist de assets estáticos) y la CSP con nonce
  (`apps/studio-web/src/app.ts:2495`) ya existen y no cambian.

### Blocks / Impacts

- `TASK-1555` (selector de modelos, **in-progress**) y `TASK-1552` (composer) aterrizan en el composer: coordinar
  para no portar dos veces. Ver §Rollout.
- `TASK-1505` Slice 5 (UI del share) — esta task lo absorbe para la superficie share.
- `TASK-1547` (Storyboard), `TASK-1540` (Video Effectiveness), `TASK-1472` (delivery): **nacen** en el payload
  nuevo, no se portan.
- `TASK-1557` (Cloud CDN sobre `/assets`) queda desbloqueada al existir el bundle.

### Files owned

En `efeonce-globe` (repo hermano):

- `apps/studio-client/**` 🆕 (toda la app cliente)
- `apps/studio-web/src/shell.ts` 🆕
- `apps/studio-web/src/assets.ts` (entradas del bundle)
- `apps/studio-web/src/public-share-ui.ts` (se retira al cerrar el flag)
- `apps/studio-web/src/app.ts` (sólo el branch de render del share tras el flag)
- `infra/terraform/variables.tf` (`client_app_enabled`)

En `greenhouse-eo`:

- `docs/ui/wireframes/TASK-1556-globe-client-app-foundation.md`
- `docs/ui/reviews/TASK-1556-globe-client-app-foundation.scorecard.json`

## Current Repo State

### Already exists

- `apps/studio-web/src/assets.ts` — allowlist explícito de assets estáticos, ya sirve una hoja de estilos externa
  (`/assets/icons/tabler-icons.min.css`) **con nonce**. El bundle se sirve por el mismo mecanismo.
- `apps/studio-web/src/app.ts:2495` — CSP `default-src 'none'; script-src 'nonce-<n>'; style-src 'nonce-<n>'`.
  Un `<script nonce src>` externo **ya está permitido** por esa misma política (verificado).
- `apps/studio-web/src/public-share-ui.ts` — la superficie a reconstruir (15 líneas).
- `GET /shares/:shareId` + `GET /v1/shares/resolve` + `GET /v1/shares/:id/media` — el transporte del grant,
  sin cambios.
- `packages/contracts` — tipos versionados que el cliente va a importar.
- `scripts/producer-gvc-fixture.mjs` + `scripts/producer-ui-canary.mjs` — el patrón de canary a espejar.

### Gap

- **Cero** archivos `.css` en el repo; **cero** bundlers (`vite|webpack|esbuild|rollup|parcel|next|tailwind|postcss`
  no aparecen en ninguno de los 11 `package.json`). Build = `tsc -p tsconfig.json`. **No hay HMR.**
- **Cero** gates de calidad de UI.
- **Cero** canary visual sobre la superficie client-facing.
- No existe SSOT de tokens ni capa de copy.
- No existe dirección visual aprobada para el share board (por eso `UI ready: no`).

## Modular Placement Contract

- Topology impact: `none`
- Current home: la implementación vive **íntegra en el repo hermano `efeonce-globe`** (`apps/studio-client`,
  `apps/studio-web`). En `greenhouse-eo` esta task sólo produce doc gobernante (wireframe + scorecard).
- Future candidate home: `remain-shared`
- Boundary: el cliente consume **sólo** rutas del BFF same-origin de `studio-web` y tipos de
  `@efeonce-globe/contracts`. No conoce la API IAM-private, ni credenciales, ni el dominio.
- Server/browser split: explícito y es el corazón de la task. Server = `studio-web` (sesión, CSP, nonce, BFF,
  serving). Browser = bundle sin secretos, sin lógica de autoridad, sin SDK de provider.
- Build impact: `dependencia pesada` — introduce Vite + React en `efeonce-globe`. Contenida a `apps/studio-client`;
  el resto de los packages no la hereda.
- Extraction blocker: `none` — el bundle es un artefacto estático servido por un allowlist que ya existe.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: **cliente externo de Efeonce** (equipo de marketing/creatividad), sin sesión en Globe, entrando por
  un enlace de revisión con token.
- Momento del flujo: revisión de una pieza creativa producida por Efeonce, compartida read-only.
- Resultado perceptible esperado: ve la pieza y su contexto con acabado de producto comercial, sin nomenclatura
  interna ni errores técnicos.
- Friccion que debe reducir: hoy la superficie luce desalineada con la marca (tokens drifteados), se llama
  `Producer` y puede escupir JSON crudo.
- No-goals UX: no se agregan acciones de escritura, comentarios del cliente ni descargas. El grant es read-only.

### Surface & system decision

- Surface: `GET /shares/:shareId` de Globe (sin sesión).
- Composition Shell: `no aplica` — es de Greenhouse; Globe tiene su propio sistema (`TASK-1540`).
- Primitive decision: `new` — nacen las primeras primitives de Globe (`Surface`, `Chip`, `FactList`, `CommentItem`,
  `MediaStage`, `StateBlock`) sobre el SSOT de tokens. Es el entregable de plataforma de la task.
- Adaptive density / The Seam: `no aplica` en esta superficie; el SSOT nace preparado para la densidad por modo
  comercial que consumirán las superficies siguientes.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: `apps/studio-client/src/copy/` 🆕 (equivalente en Globe de `src/lib/copy/*`).
- Access impact: `none` — la autorización es server-side por bearer `Globe-Share`, sin cambios.

### State inventory

Los diez estados están especificados con su copy y su ARIA en el wireframe (§Estados). Resumen:
Default · Loading (skeleton dimensionado, `aria-busy`) · Empty de comentarios · `authentication_required`
(`role="alert"`, enlace vencido) · `not_found` · `access_denied` · `dependency_unavailable` (**único con
Reintentar**) · Long content · Mobile 390px · Keyboard/focus · Reduced motion.

### Interaction contract

- Primary interaction: ver la pieza; reproducir si es video/audio.
- Hover / focus / active: `:focus-visible` ≥3:1 en el reintento y en elementos enfocables.
- Pending / disabled: el stage muestra skeleton, nunca un placeholder roto.
- Escape / click-away: no aplica (sin overlays).
- Focus restore: tras un reintento, el foco vuelve al botón.
- Latency feedback: skeleton dimensionado al activo; nunca spinner de página.
- Toast / alert behavior: `role="alert"` sólo para el enlace vencido; el resto es `role="status"`.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: fade corto del stage al resolver el activo. Sin motion decorativo.
- Layout morph / Stagger: ninguno.
- Timing / easing token: del SSOT (`--duration-short`, `--ease-enter`).
- Reduced-motion fallback: sin fade; el skeleton no titila.
- Non-goal motion: nada de parallax, autoplay decorativo ni loops.

### Implementation mapping

Ver el wireframe §Implementation Mapping (paths, primitives, readers, estados). Resumen del seam:
`shell.ts` 🆕 emite el documento mínimo con nonce → `assets.ts` sirve el bundle → `studio-client` monta React →
los datos salen de `GET /v1/shares/resolve` y los bytes de `GET /v1/shares/:id/media` como Blob URL. Ningún
contrato de API cambia.

### GVC scenario plan

Ver el wireframe §GVC Scenario Plan. Nota de repo: **Globe no corre el GVC de Greenhouse**; el equivalente es su
fixture/canary propio, que esta task extiende a la primera superficie client-facing —
`apps/studio-client/scenarios/share-board.fixture.mjs` 🆕, viewports `1440×1000` + `390×844`, `qualityProfile:
premium`, baseline nuevo `globe.share-board`.

### Design decision log

Ver el wireframe §Design Decision Log (decisión, cuatro alternativas rechazadas con razón, riesgos abiertos).

### Visual verification

Ver el wireframe §Visual verification. Incluye **captura del estado actual antes de tocar nada** — la línea base
que hoy no existe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Seam de build y serving (flag apagado)

- `apps/studio-client` con Vite + React; build a assets estáticos con hash.
- `apps/studio-web/src/shell.ts`: documento HTML mínimo con `nonce`.
- `assets.ts`: entradas del bundle, servidas con `nonce`.
- Flag `GLOBE_CLIENT_APP_ENABLED` declarado en `infra/terraform/variables.tf` con default `false`
  (**nunca** sólo en `terraform.tfvars`, que está gitignoreado).
- **Las dos compuertas de ADR-014** resueltas acá: (a) `react-router@8.3.0` corre sobre Vite 8;
  (b) smoke de producción real que ejercita las dependencias en el browser.

### Slice 2 — SSOT de tokens + capa de copy + primitives base

- Módulo de tokens que colapsa los cuatro `:root` en uno, con drift guard.
- Capa de copy en es-CL, sin literales en JSX, lista para locale.
- Primitives base: `Surface`, `Chip`, `FactList`, `CommentItem`, `MediaStage`, `StateBlock`.

### Slice 3 — Gates de calidad de UI

- Lint de estilos: **hex crudo = error**, no advertencia.
- Lint de a11y de componentes.
- Typecheck del cliente con `lib.dom` y el `strict` del monorepo.
- Registro de los tests nuevos en el script `test` de su package (los scripts **enumeran archivos a mano**: un
  `*.test.ts` no registrado **nunca corre** y la suite queda verde por no haberlo mirado).

### Slice 4 — Share board reconstruido

- La superficie completa con sus diez estados, sobre las primitives del Slice 2.
- Se retira el rótulo `Producer` y se resuelve el link a `/legal/terms` (implementarlo o retirarlo).
- Fixture/canary visual `share-board` + scorecard.

### Slice 5 — Cutover y retiro

- Flip del flag a `true` tras canary verde.
- Se retira `public-share-ui.ts` y su rama de render.
- El flag se retira con el código.

## Contratos que deben sobrevivir al port (verificados 2026-07-25)

Aplican a los slices de port del Producer (composer, feed), que son tasks posteriores — se registran acá
porque esta task declara el strangler y es donde un agente futuro los va a buscar. **Todo port parte del
HEAD vigente de `efeonce-globe`, no de una lectura anterior**: lo desplegado incluye isotipos reales, flota
completa por modalidad, modos de imagen, seed honesto y filtros corregidos (`TASK-1555`, hasta `45235cc`).
Un port contra un estado viejo los pierde en silencio.

1. **`producer-copy.ts` es SoT de copy.** La capa de copy nueva **lo absorbe**, no lo re-crea. Recrearlo
   produciría dos fuentes de verdad y el drift es invisible hasta que un texto queda desactualizado en una.

2. **`MODEL_ISOTYPES` (`producer-controller.ts:378`) + `apps/studio-web/public/models/`** son **dato con
   implicancia legal**: las marcas vienen de simple-icons v16.27.0 bajo CC0-1.0, **sin modificar**, y su
   `README.md` documenta fuente y licencia por archivo. **NUNCA** re-transcribirlas a mano — es exactamente
   lo que ese README prohíbe. El port re-apunta el mapa; no vuelve a dibujar los assets. Ojo: `TASK-1557`
   toca los mismos archivos al fijar su política de caché.

3. 🔴 **Markers de captura que se setean en RUNTIME, no en el markup.** `producer-model-picker` y
   `producer-model-trigger` **no existen en el HTML**: los asigna imperativamente el controlador
   (`producer-controller.ts:2078` y `:2102`, vía `element.dataset.capture = …`). Un port a componentes, donde
   lo natural es escribir `data-capture` en JSX, puede perderlos **sin que nada falle en Globe** — porque el
   consumidor que se rompe es el escenario GVC `scripts/frontend/scenarios/task-1555-model-selector.scenario.ts`,
   que vive en **Greenhouse** y hoy está **sin trackear en git**. Marcadores acoplados verificados:
   `producer-model-picker`, `producer-model-trigger`, `producer-model-state`, `producer-model-needs-mode`,
   `producer-fleet-state`, `producer-composer`, `producer-console`, `producer-first-fold`, `producer-full-page`.
   **Acción previa a cualquier port del composer:** commitear ese escenario y añadir una aserción que falle si
   un marker desaparece, para que la ruptura sea ruidosa y del lado correcto.

4. **Invariantes de dominio que el port no puede aflojar**: `availability` es server-authoritative (viene del
   reader `globe.producer.fleet.list`, la UI no la deriva) · un estado no disponible se comunica con
   `aria-disabled` **más su razón**, nunca sólo deshabilitado · cero slug de proveedor, costo vendor o margen
   en el DOM, en cualquier audiencia.

## Out of Scope

- **Producer, launch y error**: siguen en el payload viejo hasta sus propios slices/tasks. Convivencia esperada.
- **Cualquier cambio al BFF, la sesión, la CSP, el ALB, la API privada o los workers.**
- **Cualquier capability, reader, command o migración nueva.** Backend impact es `none` a propósito.
- **Cloud CDN** — es `TASK-1557`, bloqueada por ésta.
- **Resize de Cloud Run y Cloud SQL** — es `TASK-1521`, con su propia secuencia y costo.
- **Light mode y white-label por cliente** — no se implementan; el SSOT nace capaz de expresarlos sin refactor.
- **Storyboard, Video Effectiveness y delivery** — nacen en el payload nuevo, no se portan acá.

## Detailed Spec

El detalle vive en dos documentos que **no se duplican aquí**:

- **Qué se construye y por qué:** `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`
  (ADR-014) — stack pineado, alternativas rechazadas (Astro, Next, TanStack Start, Web Components), los 4 pilares,
  el análisis de riesgo enterprise de la dependencia y las reglas duras.
- **Cómo se ve y cómo se comporta:** `docs/ui/wireframes/TASK-1556-globe-client-app-foundation.md` — regiones,
  contrato de audiencia, los diez estados con ARIA, implementation mapping, plan de canary y decision log.

**Stack pineado** (verificado contra el registry npm el 2026-07-25, versiones **exactas**, sin `^`):
`vite@8.1.x` · `react@19.2.8` · `react-router@8.3.0` (framework mode, **SSR apagado**) ·
`babel-plugin-react-compiler@1.0.0` (activar **después** de que `eslint-plugin-react-hooks` pase limpio).
`@tanstack/react-router` es sustituto aceptable del router si Discovery prefiere su type-safety;
**`@tanstack/react-start` NO** (10 meses en RC, sin GA ni usuarios de producción nombrados).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (seam) → Slice 2 (tokens/copy/primitives) → Slice 3 (gates) → Slice 4 (share board) → Slice 5 (cutover).
- **Slice 3 (gates) DEBE cerrar antes que Slice 4.** Construir la superficie sin el lint de tokens reintroduce el
  problema que la task existe para cerrar: hoy hay 184 hex crudos porque nada los detiene.
- **Slice 5 no arranca sin canary verde del Slice 4.** El payload viejo no se retira antes de tener cobertura
  equivalente.
- Las dos compuertas de Vite 8 se resuelven en **Slice 1**, no después.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `react-router@8.3.0` no corre sobre Vite 8 (piso declarado `Vite 7+`, compat con 8 **sin confirmar**) | UI / build | medium | Compuerta en Slice 1; fallback a `vite@7.3.x` el mismo día | Falla el build o el runtime del seam |
| Semántica CJS estricta de Rolldown → `TypeError: e is not a function` **en el browser, pasando CI** | UI / build | medium | Smoke de producción real que ejercita las deps; no basta CI | Error en consola del browser, no en CI |
| El share board queda peor que el actual (dirección visual no existe) | UI | medium | `UI ready: no` hasta que Discovery produzca la dirección; captura before/after; scorecard con piso 4 | Scorecard bajo umbral o `BLOCK` de review |
| Fuga de slug/costo/margen a la audiencia `client` | Confidencialidad comercial | low | Proyección tipada + assertion en el canary de que el DOM no los contiene | Assertion del fixture en rojo |
| Un test nuevo no se registra en el script `test` del package y nunca corre | QA | **high** (ya pasó dos veces en Globe) | Verificar que el archivo aparece en la salida del run, no sólo que existe | Suite verde con menos archivos de los esperados |
| Regresión de estados (colapsar los 4 códigos de error) | UI / soporte | low | Unión discriminada: colapsarlos es error de compilación; canary cubre vencido y degradado | Estado genérico visible en captura |
| Deriva de tokens durante la convivencia de payloads | UI | medium | El SSOT es fuente única desde Slice 2; el payload viejo no se toca, se retira | Lint de estilos en rojo |
| Memoria 7× en dev de Rolldown ([rolldown#9330](https://github.com/rolldown/rolldown/issues/9330), abierto) | DX | medium | Sólo afecta la máquina de desarrollo, no el build de Cloud Run; documentar | Dev server lento o OOM local |

### Feature flags / cutover

- **`GLOBE_CLIENT_APP_ENABLED`**, declarado en `infra/terraform/variables.tf` con default **`false`**.
  **NUNCA** dejar su estado real sólo en `terraform.tfvars` (gitignoreado): un flag cuyo valor vive en un archivo
  sin trackear es el mismo problema de estado efímero que moverlo con `gcloud`, mejor disfrazado.
- Con el flag en `false`, `GET /shares/:shareId` sigue sirviendo `renderPublicSharePage` **sin cambio alguno**.
- Flip a `true` sólo tras canary verde del Slice 4. Revert: flag a `false` + apply. Tiempo: <10 min.
- **Recordatorio de runtime:** en Cloud Run el SoT es Terraform; una mutación con `gcloud` fuera de un incidente
  documentado muere en el próximo `tofu apply`, en silencio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR. El flag está en `false`: nada cambió en runtime | <15 min | sí |
| Slice 2 | Revert PR. Los tokens nuevos no los consume ninguna superficie viva todavía | <15 min | sí |
| Slice 3 | Revert PR. Los gates sólo corren en CI | <15 min | sí |
| Slice 4 | Flag a `false` + apply → vuelve el share board viejo intacto | <10 min | sí |
| Slice 5 | **Parcial**: el payload viejo ya fue retirado. Revert del PR de retiro restituye `public-share-ui.ts` | <30 min | parcial |

### Production verification sequence

1. Slice 1 en `main` de Globe con flag `false` → `pnpm check` + `pnpm build` verdes → deploy → verificar que
   `/shares/:shareId` responde **idéntico** a antes (el flag apagado no cambia nada).
2. Compuerta (a): montar el router sobre Vite 8 en el seam → verde o fallback a `7.3.x`.
3. Compuerta (b): smoke de producción real en browser ejercitando las dependencias → verde.
4. Slices 2-3 → los gates corren en CI y bloquean; verificar que **fallan** ante un hex crudo introducido a
   propósito (probar el gate, no asumirlo).
5. Slice 4 → canary `share-board` en ambos viewports + estados vencido/degradado + assertion de no-fuga →
   scorecard ≥4,5 promedio, piso 4 → review sin `BLOCK`.
6. Flip del flag → verificar `/shares/:shareId` con un grant real, desktop y mobile.
7. Slice 5 → retiro + `pnpm check` + `pnpm build` + canary verdes.

### Out-of-band coordination required

- **Coordinación con `TASK-1555`** (in-progress) y `TASK-1552`: ambas aterrizan en el composer. Esta task **no
  toca el composer**, pero al llegar el slice del composer (task futura) hay que decidir si se porta lo que 1555
  construyó o se reimplementa sobre componentes. Declararlo antes de empezar ese slice, no después.
- Nada más: no hay cambios en Azure, GCP IAM, secretos, HubSpot ni comunicación a operadores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El payload del share board no contiene código serializado con `Function.prototype.toString()` ni tipos DOM
      declarados como `any`; compila con `lib.dom` y el `strict` del monorepo.
- [ ] Existe **un solo** módulo de tokens; `grep` de `:root` en `apps/studio-client` devuelve exactamente uno.
- [ ] Un hex crudo introducido a propósito **falla el build** (probado, no asumido).
- [ ] Cero literales de copy visible en JSX; todo sale de la capa de copy.
- [ ] El DOM servido al cliente **no contiene** el slug del proveedor, la taxonomía `house`, el costo vendor ni el
      margen — verificado por assertion del canary.
- [ ] La página no se auto-rotula `Producer` y no queda ningún link que devuelva JSON a un browser.
- [ ] Los diez estados del wireframe están implementados; `authentication_required`, `not_found`, `access_denied`
      y `dependency_unavailable` son **distinguibles** y sólo el último ofrece Reintentar.
- [ ] Canary `share-board` verde en `1440×1000` y `390×844`, con `scrollWidth <= clientWidth` en ambos.
- [ ] Existe evidencia **before/after** del share board.
- [ ] `GLOBE_CLIENT_APP_ENABLED` está declarado en `variables.tf` con default `false`; con el flag apagado la
      superficie responde idéntica a hoy.
- [ ] La CSP no cambió: sigue siendo `script-src 'nonce-<n>'; style-src 'nonce-<n>'`, sin `unsafe-inline` ni
      `strict-dynamic`.
- [ ] `pnpm check` y `pnpm build` verdes en `efeonce-globe`, y cada test nuevo **aparece en la salida del run**.
- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: primitive`; `UI ready` pasó a `yes` sólo tras completar
      implementation mapping, GVC scenario plan y design decision log, con `pnpm task:lint --task TASK-1556` limpio.
- [ ] El wireframe declarado existe y es sustantivo (no un stub para pasar el gate).
- [ ] Scorecard: promedio ≥4,5, piso 4, fidelidad y resistencia a template ≥4,5.

## Verification

En `efeonce-globe`:

- `pnpm check` (typecheck + `node --test`)
- `pnpm build`
- Los gates nuevos de UI (lint de estilos + a11y)
- Canary `share-board` desktop + mobile
- Smoke de producción real en browser (compuerta de Rolldown/CJS)

En `greenhouse-eo`:

- `pnpm task:lint --task TASK-1556`
- `pnpm ui:wireframe-check --task TASK-1556`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` (y `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`) quedaron actualizados
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ADR-014 quedó actualizada con el resultado de las dos compuertas de Vite 8 (verde, o Delta declarando el
      fallback a `7.3.x`)
- [ ] `TASK-1557` (Cloud CDN) quedó desbloqueada y notificada

## Follow-ups

- Slices siguientes de ADR-014: launch + error → composer → feed/viewer → library/colecciones + retiro del payload
  viejo. Cada uno es su propia task.
- `TASK-1557` — Cloud CDN path-scoped sobre `/assets`.
- `TASK-1521` — dimensionamiento comercial del runtime (Cloud Run + Cloud SQL REGIONAL), independiente de esta task.
- Decisión de producto pendiente: **light mode** (hoy dark-only, nunca decidido) y **theming/white-label por
  cliente** (hoy sólo aparece como precondición de la hipótesis B2B2B).

## Open Questions

- **Dirección visual del share board**: no existe. Discovery debe producirla con `design-studio` /
  `product-design-loop` antes de escribir JSX. Bloquea `UI ready: yes`, no bloquea los Slices 1-3.
- **`/legal/terms`**: ¿se implementa la página o se retira el link? Es decisión de producto/legal, no técnica.
- ~~**Router**~~ — **RESUELTA (2026-07-25, Slice 1).** Gana `react-router@8.3.0`. El argumento de
  `@tanstack/react-router` (search params como estado tipado y validado) **no es evaluable en el Slice 1**: el
  seam tiene una ruta trivial sin estado en la URL, y la superficie que discriminaría es el composer. Se decide
  igual con la evidencia disponible —madurez, ciclo mayor anual predecible y compuerta (a) verde— porque dejar
  la decisión flotando es cómo termina decidiéndose por inercia. Rationale completo en ADR-014 §Decisión punto 1.
