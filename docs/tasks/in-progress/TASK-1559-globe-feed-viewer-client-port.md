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
- Status real: `code complete PARCIAL — estructura/estados/concurrencia cerrados y verificados; MOTION no implementado (4 de 11 animaciones) y declarado en TASK-1565; falta push a main + deploy`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none` (TASK-1558 LIVE 2026-07-25; las primitives existen)
- Branch: `task/TASK-1559-globe-feed-viewer-client-port`
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
