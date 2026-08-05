> # ⚠️ TASK-1559 — DUEÑO REAL: TASK-1526 (Globe Producer Resilient Feed and Viewer)
>
> Esta task se creó sin ver que ese dominio ya tenía dueña. **No se retira porque su código YA SHIPPEÓ** y varios
> commits la referencian: retirarla dejaría esas referencias huérfanas. Queda como **registro de lo que se
> entregó**; la spec del dominio es de la task dueña, y ahí está el puntero a lo que aquí se construyó.
>
> Regla que sale de esto: antes de crear una task, barrer el registry por el DOMINIO, no por el nombre que se le
> quiere dar al trabajo. "Feed + viewer sobre el payload cliente" y "Resilient Feed and Viewer" son la misma
> superficie con dos nombres.

# TASK-1559 — Globe Producer Feed + Viewer sobre el payload cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1559-globe-feed-viewer-client-port.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1559-globe-feed-viewer-client-port-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `CODE-COMPLETE EN MAIN — el Status decia 'falta push a main + deploy' y era falso (barrido 2026-07-30): esta en main de efeonce-globe (494caa0, c9ceabc) y el MOTION que declaraba faltante tambien (TASK-1565 Slices 1-6, 1c0684e). NO ES CERRABLE TODAVIA (verificado 2026-07-30): su criterio 7 exige before/after desktop y 390px, y NO existe ninguna captura suya en apps/studio-client/.captures/ (solo axis-pilot, tailwind-engine y las tres de TASK-1552). Los invariantes de concurrencia SI tienen tests verdes (watermark: 'la marca solo avanza'; epoch: 'DESCARTA un delta con revision menor o igual') y el cliente NO mintea URLs firmadas. Lo que falta es EVIDENCIA VISUAL, no codigo`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none` (TASK-1558 LIVE 2026-07-25; las primitives existen)
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- GitHub Issue: `TBD`

## Corrección de contrato 2026-07-25 — `Motion: none` era falso

**El header de esta task decía `Motion: none` y `UI impact: interaction`. Las dos cosas estaban mal**, y el
costo fue medible: el motion nunca entró al scope de ningún slice, así que el feed shippeó con **4 de 11**
animaciones del diseño aprobado, y las 7 ausentes son las que dan personalidad — entre ellas el isotipo de
Globe respirando mientras genera, que es el momento de marca de la superficie.

Medido contra `Globe Creative Producer.dc.html` el 2026-07-25:

| | Prototipo aprobado | Implementado |
|---|---|---|
| `@keyframes` | 11 | 4 |
| animaciones en uso | 12 | 4 |
| `transition` declaradas | 9 | 6 |

**Lo que se corrigió:** `UI impact: motion`, `Motion:` apunta al contrato real, y el contrato de motion
**compartido** vive en `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` — compartido y
no per-task porque el isotipo generando se usa en el feed **y** en el composer, y dos definiciones del mismo
momento de marca divergen.

**Lo que NO se corrigió acá:** la implementación. Va en `TASK-1565`, que cubre feed + composer juntos para no
definir el isotipo dos veces.

**La lección de proceso:** una task cuyo diseño aprobado tiene 11 keyframes no puede declarar `Motion: none`,
y el agente que la ejecuta debió cuestionar el contrato en vez de ejecutar contra él. El gate de task-lint
sólo verifica que el campo exista y apunte a un archivo — no puede saber si el diseño tiene motion.

## Estado 2026-07-25 — code complete, rollout pendiente

Los cuatro slices están cerrados y verificados en un browser real. **No está en el runtime**: el deploy
exige que el SHA esté en `refs/heads/main` de `efeonce-globe`, y ese push no se hizo. Por la regla de
Runtime Rollout Completion Gate el estado correcto es `code complete, rollout pendiente`, no `complete`.

| Slice | Estado | Evidencia |
|---|---|---|
| 1 — transporte + reconciliador | ✅ | 18 tests; `85c0d1f` |
| 2 — feed | ✅ source-led | 6 defectos corregidos mirando el frame; `15eb6dd` + `c9ceabc` |
| 3 — viewer | ✅ | `governed-media.ts` + 11 tests; 4 códigos distinguidos en browser; `1e605d5` |
| 4 — cutover + canary | ✅ | ruta `/producer/feed` + 6 tests; 3 invariantes en browser real; `d198b89` |

**Para prenderlo** (necesita autorización del operador porque es push a un repo de producto):

```bash
git -C ~/Documents/efeonce-globe push origin main
gh workflow run deploy-internal.yml -R efeoncepro/efeonce-globe \
  -f service=globe-studio-internal -f target_sha=<SHA de main>
```

Verificación post-deploy: `GET /producer/feed` con sesión interna devuelve el shell del payload cliente
(no el rótulo `<small>Producer</small>`), `GET /producer` sigue devolviendo el vanilla, y el feed pinta
thumbnails reales de las piezas retenidas.

**Rollback:** el flag `client_app_enabled` NO sirve acá (está en `true` desde el share board y apagarlo
también apagaría el share board). El rollback es revertir el commit de la ruta y redeployar — la ruta es
aditiva, así que revertirla no toca `/producer` ni ninguna superficie existente.

## Delta 2026-07-25 — el feed se reconstruyó source-led, no se portó

**Qué cambió respecto de lo que la task asumía.** El Slice 2 decía "port del feed". Se ejecutó primero
como port y salió mal: la card quedó con ~4 de 15 elementos y 0 de sus 8 acciones, porque se construyó
desde un fragmento de CSS de `producer-ui.ts` en vez de desde la superficie renderizada. El operador lo
detectó de inmediato. La segunda vuelta se hizo **source-led contra el prototipo aprobado medido**
(`~/Documents/Globe/Producer/`), y quedó registrada como decisión en el Delta de ADR-014.

**Por qué source-led es lo correcto y no una preferencia.** El prototipo aprobado es la autoridad de forma, y
el vanilla nunca implementó el target completo.

⚠️ **Corregido 2026-07-25:** este párrafo decía "el vanilla llama 12 de los ~74 contratos, así que es el cuello
de botella y no el tesoro". **El número era falso: son 38.** Medí `producer-client.ts` (el transporte) sin ver
que `producer-controller.ts` despacha 29 más por el camino genérico `client.reader('id')`. El argumento "es un
subconjunto chico, rebuildearlo arriesga poco" era más fuerte de lo que la evidencia sostiene. La decisión
source-led se mantiene, pero el riesgo de perder capacidad es mayor, y por eso `TASK-1564` lleva una regla de
reconciliación explícita de cinco clases. Detalle en `legacy-parity.ts` y en el Delta de ADR-014.

**Criterio de retiro del legacy (habilita TASK-1560).** `apps/studio-client/src/data/legacy-parity.ts`
+ su test. **No es un `grep`** — un `grep` pasa con el id escrito en un comentario. El test *despacha*
cada capability por el transporte nuevo, y un guard bidireccional compara el inventario contra lo que el
vanilla llama de verdad en las dos direcciones (omitir infla el criterio en un sentido; declarar de más
lo vuelve inalcanzable en el otro).

⚠️ **La primera versión de ese guard leía sólo el transporte y por eso declaraba 12 de 38.** Ahora lee los dos
archivos, clasifica por camino de despacho, y tiene un piso numérico que atrapa la re-subestimación. El
inventario también declara la **superficie** de cada capability, así que el reparto (composer 14 · viewer 6 ·
library 6 · credits 4 · feed 4 · review 4) muestra que el composer es el cuello de botella del retiro.

**Invariante recalibrado.** `globe.producer.feed.live.changes` **no tenía consumidor**: aparecía en una
sola línea del repo (su declaración en contracts). Lo que el Producer llama "feed" hoy es
`globe.producer.asset.list`, o sea una lista completa cada vez. Esta task porta dos invariantes
temporales y **construye** el tercero.

**Afordancias sin contrato, declaradas y no fingidas.** Serie, Compartir board y la búsqueda se
renderizan **deshabilitadas con su razón visible**. La búsqueda es el caso peligroso: filtrar sólo la
página cargada se ve idéntico a buscar en el corpus y declararía un alcance falso.

**Defectos que sólo aparecieron mirando el frame** (los tres pasaban lint, tsc y tests):

| Defecto | Por qué no lo atrapó ningún gate |
|---|---|
| La CSP del shell es `img-src 'self' blob:`, así que el grain como `data:` URI quedaba **bloqueado** | La textura simplemente no existía y no había error visible. Se resolvió con `<svg>` inline — **no** relajando la CSP por decoración |
| `aspect-ratio` + `max-height` en el hero estrangula el **ancho**, no la altura | El media encogía a ~900px dejando el hero vacío a la derecha; el CSS "se lee" correcto |
| A 390px el header se **solapaba** y los cinco filtros se apretaban encima | El overflow de página seguía en 0: el flex comprimía en vez de desbordar |

**Pendiente de este Slice:** thumbnails reales por retrieval gobernado para assets retenidos (hoy la
card sostiene una composición de color determinista derivada del `stableKey` hasta que lleguen bytes).

## Summary

Porta el **feed vivo y el viewer** del Producer al payload cliente. Es el **Slice 4 de ADR-014** y el
slice de **concurrencia**: acá viven la reconciliación por watermark, la cancelación por epoch y el
refresh de sesión single-flight — comportamientos verificados en vivo que un port puede regresar en
silencio.

## Why This Task Exists

`TASK-1556` dejó el sustrato y ADR-014 declaró el orden, pero el feed no tenía task. Y no es una
superficie más: es la única del roadmap cuyos invariantes son **temporales**, no visuales. Un port
que renderice bien y reconcilie mal produce una UI que se ve correcta y muestra el candidato
equivocado — la clase de fallo que ninguna captura detecta.

### ⚠️ Recalibración 2026-07-25 — uno de los tres no existe

Verificado contra el repo antes de escribir código: **la reconciliación por watermark NO está
implementada en el cliente.** `globe.producer.feed.live.changes` aparece en **una sola línea** de todo el
repo (`packages/contracts/src/producer-live-feed.ts:10`) y no tiene un solo consumidor. El reader está
registrado server-side (`app.ts:1526`, detrás de `GLOBE_PRODUCER_LIVE_FEED_ENABLED`) y ningún código de
browser lo llama: los readers que el cliente usa son `catalog`, `fleet`, **`asset.list`**, `estimate`,
`prepare`, `execute`, `cancel`, `experiment.get`, `status`, `output.get`, `favorite`, `copyAsReference`
(`producer-client.ts:132-145`). Lo que el Producer llama "feed" hoy es `asset.list`, y la reconciliación
incremental que el reader del feed vivo fue construido para soportar nunca se conectó.

O sea que esta task **porta dos invariantes y construye el tercero**. El riesgo también cambia de signo:
no hay regresión posible en algo que no existe, pero sí hay diseño nuevo — cuándo se llama `.changes` vs
`.list`, qué pasa cuando la marca se pierde, y cómo se fusiona una página con lo que ya está en pantalla.

Los dos que **sí** existen y se portan con su forma intacta:

- **Epoch por operación** — `workspaceEpoch` + `assertCurrentEpoch(epoch)` después de cada await
  (`producer-client.ts:475`).
- **Refresh single-flight, ≤1 reintento** — `sessionAuthorityRefresh: { epoch, promise }`
  (`producer-client.ts:165`) reusa la promesa en vuelo del mismo epoch, y el reintento va con
  `allowAuthorityRecovery = false` (`:483`), o sea uno y no más.

Los tres comportamientos que deben sobrevivir:

- **Watermark**: `globe.producer.feed.live.changes` resume desde una marca; perderla duplica o saltea.
- **Epoch por operación**: elegir B nunca puede ser sobrescrito por la respuesta tardía de A.
- **Refresh single-flight con a lo sumo UN reintento**, preservando body, correlation e idempotency —
  un `execute` es una operación que **gasta**.

## Goal

- El feed y el viewer corren sobre componentes tipados, consumiendo los contratos de `packages/contracts`.
- Los tres invariantes de concurrencia quedan **cubiertos por tests**, no sólo portados.
- Los cuatro códigos de error siguen siendo distinguibles (Delta de ADR-005).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — ADR-014, Slice 4.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — ADR-005 y
  su **Delta**: el contrato del feed vivo (`feed.live.list` + `feed.live.changes`), `displayTitle`
  client-safe, y los cuatro códigos que **nunca** colapsan en un preview roto.

Reglas obligatorias:

- **NUNCA** reintentar a ciegas un command que gasta tras un timeout de cliente: primero leer el estado.
- **NUNCA** derivar `displayTitle` del prompt ni dejar una receta faltante como título permanente.
- **NUNCA** mintear URLs firmadas en el cliente: los bytes salen por el path gobernado de retrieval.
- **NUNCA** colapsar `authentication_required` / `not_found` / `access_denied` / `dependency_unavailable`.

## Normative Docs

- `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`
- `docs/tasks/complete/TASK-1526-globe-producer-resilient-feed-viewer.md` — la implementación vigente
  que se porta; su comportamiento es el contrato.

## Dependencies & Impact

### Depends on

- **`TASK-1558`**: las primitives base nacen ahí. Portar el feed antes obligaría a inventarlas dos veces.
- `TASK-1556` (complete): payload, tokens, copy y gates.

### Blocks / Impacts

- Es prerrequisito de `TASK-1560` (retiro del payload legacy): mientras el feed no porte, no se puede
  retirar `producer-controller.ts`.

### Files owned

- `apps/studio-client/src/surfaces/producer/feed/**` 🆕 y `.../viewer/**` 🆕
- `apps/studio-client/src/data/**` (cliente del feed; se extiende, no se duplica)
- `apps/studio-web/src/producer-client.ts` — transporte, se porta antes que el render

## Current Repo State

### Already exists

- El comportamiento vigente en `producer-controller.ts` / `producer-client.ts`, verificado en vivo.
- Los readers `globe.producer.feed.live.list` y `.changes`.
- El payload cliente y sus gates (`TASK-1556`).

### Gap

- Los tres invariantes de concurrencia **no tienen tests**: viven en JS serializado sin tipos, y su
  evidencia es que funcionaron en vivo, no que estén cubiertos.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-client`
- Future candidate home: `remain-shared`
- Boundary: consume readers gobernados vía BFF same-origin; cero lógica de autoridad en el cliente.
- Server/browser split: la autoridad y la proyección del feed son server-side; el browser sólo reconcilia.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno de Efeonce sobre el Producer.
- Momento del flujo: seguimiento de corridas en curso y revisión de candidatos.
- Resultado perceptible: el feed refleja el estado real sin duplicar, saltear ni mostrar el candidato de otra operación.
- No-goals UX: sin rediseño visual — es un **port**, no un rediseño. El aspecto se preserva.

### Surface & system decision

- Surface: feed + viewer del Producer.
- Primitive decision: `reuse` — consume las primitives que nacen en `TASK-1558`.
- Copy source: `apps/studio-client/src/copy/index.ts` (absorbe lo que corresponda de `producer-copy.ts`).
- Access impact: `none`.

### State inventory

Default · Loading · Empty · `authentication_required` · `not_found` · `access_denied` ·
`dependency_unavailable` · run activo · run terminal · Long content · Mobile · Keyboard/focus · Reduced motion.

### Interaction contract

Selección de candidato cancelable por epoch; reintento explícito sólo donde es seguro; foco preservado
al llegar items nuevos (nunca robar el foco del usuario por una actualización del feed).

### Motion & microinteractions

Sin motion nuevo: se preserva el vigente, leído de los tokens de motion del SSOT.

### Implementation mapping

Transporte primero (`producer-client.ts` → `src/data/`), render después. Cada invariante de
concurrencia se porta **con su test**, no después.

### GVC scenario plan

Canary propio siguiendo el patrón `seam-smoke-server.mjs` + driver Playwright en `scripts/frontend/`,
con escenarios de llegada de item nuevo, selección concurrente y sesión expirada.

### Design decision log

Es un port, no un rediseño: la decisión de diseño ya está tomada y verificada. Lo que se decide acá es
cómo se cubren los invariantes temporales con tests.

### Visual verification

Before/after del feed y del viewer, desktop y 390px.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Transporte tipado + tests de concurrencia

- Cliente del feed en `src/data/`, tipado desde `packages/contracts`.
- Tests de watermark, epoch y refresh single-flight **antes** de tocar el render.

### Slice 2 — Feed

- La lista viva sobre primitives, con sus estados y `displayTitle` client-safe.

### Slice 3 — Viewer

- Inspección de candidato, media por el path gobernado, cancelación por epoch.

### Slice 4 — Canary y cutover

- Canary con escenarios de concurrencia; flip tras verde.

### Slice 5 — Movido a TASK-1643: continuidad de acciones (2026-08-05)

El hallazgo y su evidencia permanecen en esta task porque nacieron al auditar el port del feed, pero la implementación
de los handlers y del handoff sale de aquí. `TASK-1559` conserva transporte, render, reconciliación, estados del feed
y viewer; `TASK-1643` posee `ProducerFeedRoute`/action rail y la continuidad `feed → composer`.

La evidencia que motivó la separación sigue siendo load-bearing: `ProducerFeedRoute.tsx` pasaba callbacks no-op,
el control se veía habilitado, `POST /v1/commands` quedaba en cero y Reference/Recreate no llegaban al composer.
`TASK-1643` debe cerrar también Favorite/Download y los estados honestos; no se debe reintroducir la misma familia
como un scope oculto de esta task.

## Out of Scope

- Rediseño visual del feed o del viewer.
- Composer (`TASK-1552`), library (`TASK-1520`), share board (`TASK-1558`).
- Retiro del payload legacy (`TASK-1560`).

## Detailed Spec

El contrato de comportamiento es `TASK-1526` (complete) más el Delta de ADR-005. No se re-especifica
acá: se porta, y lo que hoy es comportamiento verificado en vivo pasa a ser comportamiento **cubierto**.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (transporte + tests) **antes** que cualquier render. Portar el render primero deja los
invariantes temporales sin red justo mientras se los mueve.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión de watermark → items duplicados o salteados | UI / confianza | **medium** | Tests antes del port; canary con llegada de item nuevo | Feed mostrando duplicados |
| Regresión de epoch → se muestra el candidato de otra operación | UI / correctitud | medium | Test de selección concurrente | Candidato equivocado tras elegir rápido |
| Reintento ciego de un command que gasta | Créditos | **low pero costoso** | Leer estado antes de decidir; nunca reintentar a ciegas | Doble cargo en el ledger |
| El feed roba el foco al llegar un item | a11y | medium | Test de foco; canary con teclado | Foco saltando durante la navegación |

### Feature flags / cutover

`client_app_enabled` (ya existe). El feed viejo convive hasta el flip.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-3 | Revert PR; el flag apagado deja el feed viejo | <15 min | sí |
| 4 | Flag a `false` + apply | <10 min | sí |

### Production verification sequence

1. Slices 1-3 con flag `false` → gates verdes.
2. Canary con los tres escenarios de concurrencia.
3. Flip y observación de un ciclo real de generación.

### Out-of-band coordination required

`N/A — repo-only`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los tres invariantes de concurrencia (watermark, epoch, single-flight) tienen test propio y verde.
- [ ] Los cuatro códigos de error son distinguibles en la UI.
- [ ] `displayTitle` nunca sale del prompt ni queda como receta faltante.
- [ ] El cliente no mintea URLs firmadas.
- [ ] Los 6 gates de UI pasan.
- [ ] Con el flag en `false` el feed viejo responde idéntico.
- [ ] Before/after desktop y 390px.

## Verification

`pnpm check` · `pnpm build` · gates de `studio-client` · canary de concurrencia.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` y `GLOBE_RUNTIME_HANAOFF.md` actualizados
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] `TASK-1560` notificada: el feed dejó de bloquear el retiro

## Follow-ups

- `TASK-1560` — retiro del payload legacy.
- `TASK-1643` — wiring de acciones y continuidad feed → composer.

## Open Questions

- ¿La librería de estado/data-fetching se decide acá o se hereda de lo que `TASK-1558` haya elegido?
  Resolver leyendo lo que 1558 dejó, no re-decidiendo.

## Delta 2026-07-29 — el `<img>` del feed sólo se monta cuando los bytes pueden ser una imagen

Defecto **visto en producción** por el operador, no por un gate: las cards de video mostraban el prompt
desparramado sobre el póster con el icono de imagen rota.

**Causa.** El feed resuelve `item.output.sha256` — los BYTES DE LA SALIDA. Para una imagen eso es la
imagen; para un video es el MP4, y un `<img>` no lo decodifica: el browser pinta su texto `alt` encima.

**⚠️ El mismo defecto ya se había corregido para audio**, y su comentario lo documenta: *«el `<img>` quedaba
sin bytes que decodificar y el browser pintaba su texto alt sobre la forma de onda. Se veía en producción
como el título del foley encima de las barras»*. Pero el guard se escribió como `isAudio` —nombrado por el
caso que lo motivó y no por su razón— así que **video quedó fuera y el bug volvió con otra modalidad**.

**Corrección.** Renombrado a `hasPoster` (`modality !== 'audio' && modality !== 'video'`) y aplicado a las
**dos** superficies: la card destacada y la card normal. Sólo la normal estaba en el reporte; la destacada
tenía el mismo hueco. Un guard nombrado por su caso sirve una vez; nombrado por su significado cierra la
familia entera.

**Degradación mientras tanto.** El póster real de video llega con `TASK-1569` (proyección de derivados,
`to-do`). Hasta entonces la card cae a su composición de color + botón de play: información honesta en vez
de un error de decodificación.

**Alcance pendiente.** Este hallazgo salió de mirar producción, **no** de la auditoría de regresiones del
port —que cubrió composer, header y tool dock—. **Feed, viewer y share siguen sin auditar**, y este defecto
vino justamente de ahí: si el patrón se repitió en esas superficies, sigue invisible.
Ver [auditoría 2026-07-29 §5](../../audits/globe/GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md).

## Delta 2026-07-29 (2) — el H9 del hero, y un invariante de esta task que se está violando

Sale de una **revisión visual en vivo** del Producer desplegado (1440 px, sesión real), no de la suite:
build, ESLint, 129 tests y tres canarios estaban verdes con todo lo de abajo en pantalla. Se adopta acá
porque `TASK-1526`, la dueña real del dominio, está `complete` — colgarle alcance abierto a una task cerrada
la reabre por la puerta de atrás. Esta task queda como el registro vivo del feed sobre el payload cliente.

### 🔴 `displayTitle` SÍ sale del prompt — el criterio de aceptación no está cumplido

Esta task declara como regla obligatoria *«**NUNCA** derivar `displayTitle` del prompt ni dejar una receta
faltante como título permanente»*, y su criterio `[ ] displayTitle nunca sale del prompt` sigue **sin marcar**.
**Se está violando**, y la evidencia es el SQL del store
(`packages/database/src/stores/producer-live-feed-store.ts:140` y `:180`):

```sql
NULLIF(COALESCE(e.request->>'prompt', e.request#>>'{structuredBrief,ingredients,0,value}', …)) AS display_title
```

El prompt es **el primer término del `COALESCE`**. El fallback `displayTitle(route, capability)`
(`packages/domain/src/producer-live-feed.ts:254`) es la otra mitad que la regla prohíbe: la receta como
título permanente.

**Síntoma observable**, y es el que disparó la revisión: dos cards de video de la grilla son **literalmente
indistinguibles** — mismo degradado, mismo play, mismo título truncado en el mismo carácter, mismo modelo,
mismo estado, mismo crédito. No es un defecto de render: **son dos corridas del mismo prompt, y un prompt no
identifica una corrida**. Mientras el título sea el prompt, el feed no puede distinguir dos intentos de la
misma intención, que es exactamente lo que un operador hace todo el día.

**El criterio no se marca.** Queda declarado como abierto con su evidencia, que es lo contrario de darlo por
bueno porque la superficie renderiza.

### El `…` del título no es CSS, y ningún ancho lo arregla

`DISPLAY_TITLE_MAX_LENGTH = 96` (`producer-live-feed.ts:260`) recorta por **conteo de caracteres** y pega el
`…` **antes de que exista layout**. Con la columna al 100 % se vería el mismo `…`, ahora a mitad de línea.
Ensanchar la card no hace nada.

⚠️ **No se mueve a CSS sin decidirlo como contrato.** Ese recorte es parte de la **proyección** que consumen
MCP, SDK, CLI y cualquier plataforma hermana, no sólo la card web: mover el recorte al cliente significa que
el contrato deja de entregar un string acotado y **todos los demás consumidores heredan uno sin cota**. El
radio de impacto excede el feed.

### El 45 % vacío del hero es consecuencia de dos reglas correctas

`.pf__hero-media` tiene techo de altura y `.pf__hero-foot` es `position: absolute; inset-block-end: 0`, así
que el contenido **no puede empujar el alto**: crece hacia arriba desde el borde inferior y el sobrante queda
arriba. Las dos reglas están bien y el techo está argumentado en la propia hoja (*«sin él, a 1440 px un 16/7
da ~610 px y el hero se come el fold… el feed tiene que seguir siendo un feed»*).

El vacío aparece porque **el media no llena su caja**, y no la llena porque hoy es un placeholder. El hero de
audio **sí** la llena con su onda — por eso se ve razonable. **Está aguas abajo de `TASK-1569`** (póster de
video): redistribuir el espacio ahora es diseñar alrededor de un placeholder y volver a hacerlo cuando llegue
el arte real.

Menor, del mismo bloque: `.pf__duration { right: 43px }` escalona los créditos para dejarle sitio a
`.pf__select`, un control que **el hero no renderiza** — 26 px muertos contra el borde derecho.

### Descartado, para que no se reintente

Elegir el hero por *«el más nuevo que tenga arte»* llenaría el frame, pero **fabrica una jerarquía que el
contrato no trae** y haría saltar el hero de pieza mientras las miniaturas resuelven de forma asíncrona.

### Secuencia propuesta

1. `TASK-1569` (póster) primero: con arte real en la caja se sabe cuánto espacio sobra **de verdad**.
2. El título como **decisión de contrato** con ADR corto — no es trabajo de maqueta, y la pregunta real no es
   en cuántos caracteres cortar sino **si el título de una corrida debería ser su prompt**.

## Delta 2026-08-01 — el feed puede volver hacia atrás, y dos defectos de encabezado

Entregado y verificado en producción (`globe-studio-internal`, main `8989074`). PRs
[#69](https://github.com/efeoncepro/efeonce-globe/pull/69) y
[#73](https://github.com/efeoncepro/efeonce-globe/pull/73). Reportado por el operador mirando la pantalla; los
tres defectos tenían causa distinta de la aparente.

### Paginación — el backend ya paginaba y el cliente usaba medio contrato

`globe.producer.feed.live.*` pagina por **cursor keyset** (`updatedAt` + `stableKey`) con `nextCursor` desde
`TASK-1525`. `nextFeedRead` resolvía sólo el eje del FUTURO (marca → `changes`) y **el `nextCursor` para
retroceder se ignoraba**: el feed crecía sin techo por arriba y el histórico era inalcanzable. No faltaba
paginación — estaba a medio cablear, el mismo patrón que el control de compare de las cards, que apareció el
mismo día.

Se agrega el eje del pasado (`olderCursor` + `historyDone` + `olderFeedRead`) y el pie de lista `FeedTail`
con sus tres estados en una región: traer anteriores, fin del historial y fallo de una tanda.

🔴 **La regla que no se ve desde el cliente:** una página hacia atrás **NO puede mover el `watermark`**. El
backend lo calcula desde el ÚLTIMO item de la página, y en dirección `older` el último es el MÁS VIEJO —
adoptarlo hace retroceder la marca y el próximo ciclo re-trae todo lo ya visto, con la pantalla viéndose
perfecta. Los dos ejes viven en el mismo objeto y avanzan en direcciones opuestas, así que el modo
(`sync` | `changes` | `older`) viaja explícito y nunca se infiere. Simétrico: un delta de novedades no toca el
cursor del pasado, e invalidar la marca **conserva** el cursor del pasado.

Descartado scroll infinito (vuelve inalcanzable el pie de la aplicación y mueve el contenido bajo el cursor
con piezas generándose en vivo) y páginas numeradas (con items entrando por arriba, la página 2 cambia sola —
offset es incorrecto por construcción, y por eso el backend eligió cursor).

Verificado en vivo: **25 → 50 piezas** con un click, contador 26 → 51, y el pie sigue ofreciendo historial.
Seis tests nuevos en `producer-feed-reconciler.test.ts`, registrados y corriendo (143 → 149).

### La barra del encabezado — dos defectos, y una regresión propia entre medio

1. **`margin-inline-start: auto` + `flex-wrap`.** El empuje a la derecha es correcto mientras la barra quepa
   junto al título; al envolver **se lleva el empuje** y quedaba pegada a la derecha con 239 px de hueco
   muerto debajo. Reemplazado por `justify-content: space-between` en `.pf__head`.
2. **Tres alturas en la misma fila** (36 / 28 / 30): los bordes quedaban desalineados y la fila se leía
   irregular. Unificadas a 36.
3. 🔴 **La corrección de (1) creó una regresión:** `space-between` reparte HIJOS, y el encabezado tenía
   **cuatro** sueltos, así que también separó el contador de su título — medido, el título terminaba en 196 px
   y «26 piezas» arrancaba en 463. Se agrupan título + contador + píldora en `.pf__head-lead` para que el
   contenedor tenga los dos hijos que el reparto supone.

Medido en el runtime desplegado: alturas `36/36/36/36/36`, `margin-inline-start: 0px`, barra en x=0 (mismo
borde que el título) y contador a 208 px.

### El control de selección de las cards

`onSelect` se pasaba como no-op, así que el guard `disabled={onSelect === undefined}` nunca disparaba: **24
controles por pantalla** habilitados, sin su `title` y con `aria-pressed` fijo, que no hacían nada. El destino
existe sólo en el payload legacy (`#producer-compare-dialog`): al portar el feed viajó el control y no el
diálogo. Se omite la prop para que queden honestamente apagados. Dueña del compare cuando se porte:
`TASK-1520`.

Estaban además descentrados 1,5 px, y la causa no era ninguna regla propia: el `padding: 1px 6px` que el
navegador da a todo `<button>` — el payload corre sin preflight. Con 26 px de caja quedan 12 px de contenido
para un glifo de 15. **De 219 botones era el único afectado**; el umbral es 29 px para un glifo de 15.

### Follow-up abierto

La píldora **«N nuevas»**: hoy las novedades entran por `changes` y empujan el contenido. `state-design` pide
acumularlas y que el operador las traiga. Es el siguiente slice de esta superficie.

## Delta 2026-08-02 — card optimista y proyección de estado terminal

Globe `7a7235f`. `pnpm check` exit 0 con **1.491 tests** (1.482 antes); `studio-client` 163 → 172.

**El hueco que cierra.** Al apretar Generar no aparecía nada hasta recargar la app. El composer prometía
*«el feed se actualizará cuando la pieza esté lista»* y no lo cumplía: el feed proyecta **runs**, y entre el
envío y el primer delta no hay run que proyectar. Peor — un experimento que el compiler **niega antes de
crear el run** nunca llega a ser run, así que ese fallo era invisible para siempre.

**Caso fuente.** Un empate de `valid_from` entre dos versiones de la misma policy de rights negaba toda
generación antes de reservar créditos. El gate hacía lo correcto (cero cobro, `attempts: []`), pero hicieron
falta horas de lectura de readers para descubrir que el sistema estaba **negando** en vez de estar lento. El
operador sólo veía «Solicitud enviada» y silencio. Un gate que protege bien y comunica mal se percibe como
un producto roto. Detalle del incidente: `ISSUE-135` y `HANDOFF-GLOBE-RIGHTS-INCIDENT.md`.

**Cómo respeta la decisión de `ProducerWorkspace`.** Composer y feed siguen siendo hermanos y el feed sigue
descubriendo el trabajo por su marca de agua. Lo que viaja por el callback nuevo es una **promesa con
`experimentId`**, no una pieza: nunca entra a `items`, se descarta sola en cuanto el ingreso autoritativo
trae ese id, y no sobrevive a un reload. El estado vive en el workspace porque es justamente lo que ninguno
de los dos hermanos puede saber solo — el composer sabe que envió pero no qué muestra el feed; el feed sabe
qué muestra pero no que hubo un envío.

**Decisiones que no se deducen del diff:**

- La card se anuncia **entre `prepare` y `execute`**, no después. `execute` es la llamada que puede tardar;
  esperarla dejaría al operador otra vez frente a un botón que no hizo nada visible. En ese punto el
  `experimentId` ya es un hecho del servidor, así que la promesa no es una invención del cliente.
- Un fallo **no se descarta solo**: se queda con su motivo traducido y el código canónico visible para el
  reporte, hasta que el operador lo cierre. Un fallo que desaparece es indistinguible de uno que nunca
  ocurrió.
- **No ofrece «Reintentar»** cuando reintentar no resuelve — `generated_rights_policy_not_authorized` es una
  autoridad ausente, y ofrecer el botón haría repetir un gesto inútil mientras el problema real sigue sin dueño.
- Reusa `GlobeGeneratingMark`, el mismo globo que ya marca una pieza generándose. Un spinner propio sería un
  segundo vocabulario para el mismo estado.
- La reconciliación es por `experimentId`, nunca por posición ni por título: dos envíos con el mismo prompt
  son piezas distintas y el orden del feed no es el orden de envío.

**Archivos.** `data/producer-pending-submissions.ts` (+ 9 tests) · `copy/index.ts` · `ProducerWorkspace.tsx`
· `composer/ProducerComposer.tsx` · `feed/ProducerFeed.tsx` · `feed/ProducerFeedRoute.tsx`.

**Abierto.** Falta el estado terminal para un job que agotó reintentos (`ISSUE-135`): hoy un run zombi sigue
mostrándose como «generando» porque nadie declara que murió. Y falta GVC de la card en desktop + 390 px.
