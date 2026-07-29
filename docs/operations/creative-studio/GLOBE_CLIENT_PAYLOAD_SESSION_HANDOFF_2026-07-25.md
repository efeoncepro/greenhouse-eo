# Handoff — payload cliente de Globe, sesión 2026-07-25

> **Tipo:** Handoff de sesión (para retomar en frío)
> **Creado:** 2026-07-25 por Claude
> **Ámbito:** ADR-014 (payload cliente de Globe) · `EPIC-028`
> **Estado del runtime:** revisión viva `globe-studio-internal-00076-z2x`, imagen `c453d7dec82e`
> **Repos:** `efeonce-globe` (código) · `greenhouse-eo` (control plane documental)

## Cómo leer este documento

La sesión entregó cosas reales y también se degradó al final, entrando en un loop de
parche → deploy → parche que costó **cinco ciclos de deploy** para un solo transporte. Este handoff separa las
dos cosas a propósito: **qué quedó funcionando** y **qué patrón lo hizo caro**, porque el segundo es lo que
determina cómo debería trabajarse mañana.

---

## 1. Estado exacto, verificado (no de memoria)

### Runtime

| | |
|---|---|
| Revisión viva | `globe-studio-internal-00076-z2x` |
| Imagen | `c453d7dec82e` |
| **Hay 1 commit SIN desplegar** | `0fd28ab` (fill-mode + lift de hover) |
| `pnpm check` · tests · `pnpm build` | verdes · **98/98** · verde |
| Ambos repos | working tree limpio, todo commiteado y pusheado salvo `0fd28ab` (commiteado, sin push) |

### Qué está vivo y funcionando en `https://globe.efeoncepro.com`

- **`/shares/:shareId`** — share board del cliente, LIVE desde antes de esta sesión.
- **`/producer`** — el Producer legacy, **intacto con su composer**. Verificado con sesión real: 15 cards,
  rótulo `<small>Producer</small>` presente, `composer: 1`. **Esta verificación es la que protege al operador**
  y hay un test que la afirma con el flag encendido.
- **`/producer/feed`** — el feed nuevo sobre el payload cliente, **con datos de producción**: 15 piezas reales
  (Nano Banana Pro, Seed Audio, ElevenLabs Multilingual v2, Seedance 2.0), créditos reales (10/6/20/16 cr),
  thumbnails cargando por `blob:` con `naturalWidth > 0`, aurora de fondo, isotipo respirando en corridas
  activas, y **`routeId` sin filtrarse** (el legacy sí lo filtra, 45 veces en el DOM).

### Cómo verificar el runtime con sesión real (el instrumento que hay que reusar)

No hay forma de mintear una sesión interna a mano; el camino es el SSO federado:

```bash
cd ~/Documents/efeonce-globe && set -a; source ~/Documents/greenhouse-eo/.env.local; set +a
GLOBE_WEB_BASE_URL=https://globe.efeoncepro.com \
GREENHOUSE_BASE_URL=https://greenhouse.efeoncepro.com \
GREENHOUSE_AGENT_SECRET="$AGENT_AUTH_SECRET" \
GREENHOUSE_AGENT_EMAIL=agent@greenhouse.efeonce.org \
GREENHOUSE_VERCEL_BYPASS="$VERCEL_AUTOMATION_BYPASS_SECRET" \
node scripts/smoke-human-federation.mjs
```

Da `human_federation_ok` y **emite cookie de sesión**. Para renderizar con esa sesión, el patrón es hacer las
tres piernas del SSO y manejar Playwright **en el mismo proceso**, así la cookie nunca se imprime ni se
escribe a disco. Dos gotchas: el bypass de Vercel viaja **sólo** al origen de Greenhouse, y
`waitUntil: 'networkidle'` **nunca resuelve** porque el feed reanuda cada 4s — usar `domcontentloaded`.

---

## 2. 🔴 El patrón que hizo caro el final de la sesión

**Reescribí el transporte en vez de portarlo, y `producer-client.ts` ya tenía las cuatro respuestas.** Cada
error costó un ciclo completo de deploy:

| # | Lo que asumí | Lo que el legacy ya tenía | Síntoma en producción |
|---|---|---|---|
| 1 | un `/v1/ui/dispatch` único | `endpoints.readers` + `endpoints.commands` separados | `404 not_found`, feed vacío |
| 2 | envelope sin `apiVersion` | lo manda, y el servidor lo **exige** | `400 invalid_request` |
| 3 | la respuesta **es** el dato | `if (!isRecord(result.data)) throw; return result.data` | 200 con datos y la UI decía "no pudimos cargar" |
| 4 | los bytes salen del reader | **dos pasos**: descriptor con grant → `GET /v1/outputs/{sha}` | `<img>` con Blob de JSON: se veía el `alt` encima |

**Y contradice mi propia regla escrita horas antes.** La clase 2 de la reconciliación prototipo-vs-legacy
(`TASK-1552`) dice: *"invariantes de runtime → autoridad del **LEGACY**. Ya portados y **no se rediseñan**"*.
El transporte **es** clase 2.

### Por qué 98 tests verdes no atraparon ninguno

**Los dobles no tenían la forma del contrato y el canary servía la ruta que yo había inventado.** Los stubs
devolvían `{ ok: true }` desnudo, así que un transporte que no desenvuelve pasaba; el canary respondía en
`/v1/ui/dispatch` porque yo lo había escrito ahí también. **El harness probaba mis suposiciones.**

Ya corregido: stubs con `readerEnvelope`/`commandEnvelope`/`envelopeFor(url)`, canaries sirviendo
`/v1/readers` + `/v1/commands` + `/v1/session`, y guards de regresión para los cuatro casos.

### El mismo patrón, cuatro veces en la sesión

1. el criterio de retiro midió **12 de 38** capabilities (leía el archivo que elegí, no la realidad);
2. afirmé que "Serie" y "Compartir" **no tenían contrato** — los dos existen;
3. `TASK-1559` se ejecutó con `Motion: none` y el feed shippeó con **4 de 11** animaciones;
4. dije "el contenido está en las tasks dueñas" sin abrir sus campos de contrato.

**Los cuatro son conclusión antes de barrido**, y los cuatro los detectó el operador. El remedio cuesta
segundos y es siempre el mismo: **correr el comando que prueba la afirmación antes de escribirla.**

---

## 3. Gobernanza: cinco tasks duplicadas, retiradas

Se crearon `1559`, `1562`, `1563`, `1564`, `1565` sin barrer el registry **por dominio**. Cada una pisaba
territorio existente:

| Creada | Dueña real | Qué se hizo |
|---|---|---|
| `TASK-1563` menciones | `TASK-1522` | **retirada**, contenido + criterios movidos |
| `TASK-1564` composer | `TASK-1552` + `TASK-1532` + `TASK-1555` + `TASK-1530/1531` | **retirada**, repartida |
| `TASK-1565` motion | `TASK-1523` | **retirada**, contenido movido |
| `TASK-1559` feed+viewer | `TASK-1526` (**`complete`**) | **conservada**: su código ya shippeó y hay commits que la nombran |
| `TASK-1562` share projection | `TASK-1522` | **conservada**, misma razón |
| (biblioteca, por escribir) | `TASK-1520` | **evitada a tiempo** |

**Causa:** barrí por **nombre**, no por **dominio**. *"Feed + viewer sobre el payload cliente"* y *"Resilient
Feed and Viewer"* son la misma superficie con dos nombres. La regla quedó escrita en cuatro lugares:
`TASK_PROCESS.md`, las skills `greenhouse-globe` y `greenhouse-task-planner` (Claude **y** Codex), y el router
de `CLAUDE.md`.

⚠️ **Matiz que hay que registrar:** `TASK-1526` está **`complete`**, así que `TASK-1559` no duplicaba trabajo en
curso — duplicaba una task **cerrada**, y el port al payload nuevo es trabajo genuinamente distinto. La
duplicación fue de **spec**, no de esfuerzo.

---

## 4. Dónde vive el motion (la pregunta que quedó abierta)

Tres dueños, tres alcances distintos. **No hay una sola task de motion.**

| Alcance | Dueña | Doc |
|---|---|---|
| **Contratos visual/flow/motion de la suite** — isotipo generando, aurora, skeleton, tokens, gate de reduced-motion | `TASK-1523` | `TASK-1523-...-motion.md` + `TASK-1523-globe-client-motion-implementation-plan.md` |
| **Motion del feed/viewer** — entrada por key, lift, reveal de acciones, apertura del viewer | `TASK-1526` (**complete**) | `TASK-1526-...-motion.md` ⚠️ |
| **Motion del composer** — estimado atenuado, barra de progreso, `overlayIn` | `TASK-1552` | `TASK-1552-...-motion.md` |
| SSOT de valores medidos | — | `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` |

### 🔴 `TASK-1526` ya tenía contrato de motion del feed y no lo leí

Y mi implementación **violaba una de sus dos reglas**:

- **`animation-fill-mode` no debe ser `both`/`forwards`** — *"el estilo final base vuelve a ser propiedad de la
  card"*. Yo usaba `both`, y el efecto es latente y silencioso: la animación conserva su último keyframe como
  estilo de origen-animación, y eso **le gana a cualquier `transform` posterior**. El lift de hover de una card
  que ya entró dejaría de funcionar, sin error, y **sólo para las cards que animaron**. Corregido a `backwards`
  en `0fd28ab`.
- **entrada y lift no animan `transform` en el mismo nodo a la vez** — no estaba violada, y ahora se sostiene
  por construcción (entrada por `animation`, lift por `transition`).

Y al leerlo apareció un gap: **el lift de hover del prototipo faltaba**. Mi versión sólo cambiaba el borde; el
prototipo hace `translateY(-3px)` con una sombra de **tres capas**. Token `--card-lift`, en `0fd28ab`.

Ese doc también ya especificaba, antes de que yo lo "descubriera": la entrada **una vez por key nueva**, y que
hover y `focus-within` son equivalentes con ningún CTA sólo en hover.

---

## 5. Qué está hecho, qué falta

### Hecho y verificado en browser

- **Transporte gobernado**: epoch, refresh single-flight ≤1 reintento, idempotencia obligatoria en commands,
  allowlist same-origin, `AbortController` por epoch, rutas y envelope del contrato real.
- **Reconciliación por marca**: fusión por `stableKey`, gana la `revision` más alta, la marca sólo avanza.
- **Resolver de bytes** con ciclo de vida de object URLs (revocar antes de reemplazar, `dispose`, sin huérfanos
  al superponer epoch).
- **Feed**: card completa, hero, toolbar (densidad/filtro/orden funcionales; Serie/Compartir/Buscar
  deshabilitados con su razón), thumbnails reales, 5 estados.
- **Viewer**: `<dialog>` nativo, 4 códigos de negación distinguidos, "Reintentar" sólo donde sirve, estados
  "no hay bytes" y "en papelera" que **no son errores**.
- **Motion**: isotipo (4 animaciones en fase por token compartido), aurora, `candIn` por primera aparición,
  shimmer del skeleton, **gate de reduced-motion** con 7 tests, canary con 13 asserts en los dos modos.
- **Criterio de retiro del legacy**: inventario ejecutable de **38** capabilities con su `surface`
  (composer 14 · viewer 6 · library 6 · credits 4 · feed 4 · review 4).

### Falta, en orden de prioridad sugerido

1. **Desplegar `0fd28ab`** (fill-mode + lift). Un push y un `workflow_dispatch`.
2. **Dos defectos visibles en el frame vivo**, chicos y acotados:
   - el `<img>` de thumbnail se renderiza también en cards de **audio**, que no tienen imagen → se ve el `alt`
     encima de la forma de onda. No debería renderizarse para audio;
   - sólo **3 de 15** thumbnails resolvieron en 6s: el tope de 12 se resuelve **secuencialmente**. Hay que medir
     si conviene paralelizar de a 3-4.
3. **Las tres cosas del legacy que el diff encontró y no porté** (declaradas, no silenciadas):
   `gateFor`/`assertAvailable` (chequear disponibilidad **antes** de despachar, para deshabilitar el control en
   vez de gastar un round-trip), el flujo de reautenticación con `returnPath`, y el resto de la cobertura de
   epoch (el legacy la aplica en 19 puntos, el nuevo en 5).
4. **Composer** (`TASK-1552` + `TASK-1532` + `TASK-1555`), con el Slice 1 ya construido
   (`composer-recipe.ts`, 17 tests) registrado en `TASK-1532`.
5. **Motion del composer** (`TASK-1552`) y `coachPulse` cuando exista onboarding (`TASK-1523`).

### Bloqueos declarados

- **`TASK-1553`** (resolución de modelo por-ruta en los adapters) bloquea que el selector **ejecute** un 2.º
  modelo del mismo proveedor. Puede **listar** la flota; esas opciones van deshabilitadas con su razón.
- **`TASK-1560`** (retiro del legacy) necesita las 38 capabilities cubiertas; hoy faltan composer, library y
  review.

---

## 6. Cómo trabajar esto mañana (lo que yo debí hacer)

1. **Cargar la skill `greenhouse-globe` ANTES de tocar nada.** Existe, tiene el mapa de dueños por superficie, y
   no la cargué hasta que el operador lo señaló.
2. **Barrer el registry por DOMINIO** antes de crear cualquier task. `TASK_PROCESS.md` §Barrido por dominio.
3. **Leer los docs de UI de la task dueña** —wireframe, flow, **motion**— antes de escribir CSS. `TASK-1526`
   tenía su contrato de motion y me habría ahorrado dos defectos.
4. **Para todo lo que sea invariante de runtime, PORTAR de `producer-client.ts` función por función**, no
   reescribir. Es clase 2 de la regla de reconciliación.
5. **Que los dobles tengan la forma del contrato.** Antes de confiar en un test verde: ¿este stub devuelve lo
   que el servidor devuelve? ¿este canary sirve la ruta que el servidor sirve? Si la respuesta sale de mi
   cabeza y no de `app.ts`, el test prueba mi suposición.
6. **Un ciclo de verificación contra el runtime real por cada tanda**, no por cada línea. Los cinco deploys de
   esta sesión fueron un defecto por deploy; con un diff sistemático **antes** del primero, habría sido uno.

---

## Referencias

- ADR gobernante: `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`
  (ADR-014 + su Delta 2026-07-25)
- SSOT de motion: `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md`
- Epic: `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
  (§Delta 2026-07-25)
- Gates y canaries: `docs/operations/creative-studio/GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md`
- Manual operativo: `docs/manual-de-uso/creative-studio/operar-feed-viewer-producer-globe.md`
- Inventario de paridad: `efeonce-globe/apps/studio-client/src/data/legacy-parity.ts`
