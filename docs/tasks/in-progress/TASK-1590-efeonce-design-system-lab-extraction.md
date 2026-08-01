# TASK-1590 — AXIS Design System Lab Extraction

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1590-efeonce-design-system-lab.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1590-efeonce-design-system-lab-motion.md`
- Backend impact: `none`
- Epic: `optional`
- Status real: `EN EJECUCIÓN 2026-08-01`. El Lab ya existe en `../axis-design-system/apps/lab`, pero hoy es Vite + TypeScript vanilla. Esta ejecución migra ese contenedor a Astro 7, mantiene el despliegue público en el Vercel de AXIS y conserva la frontera: sólo tokens/registry publicados o workspace del repo AXIS; nunca imports desde Greenhouse/Globe. La referencia se renderiza en HTML/CSS; la interactividad se limita a islas o scripts mínimos. La contradicción con TASK-1382 queda resuelta para esta superficie: Labs no es build unit de Greenhouse.
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `none`
- Branch: `task/TASK-1590-efeonce-design-system-lab-extraction`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Separar el Pattern Lab del runtime Greenhouse y migrarlo a Astro 7 en el repo AXIS, desplegado en su
proyecto Vercel público. `/design-system` seguirá siendo catálogo/control plane de Greenhouse durante la
migración.

## Delta 2026-08-01 — migración Vite → Astro 7 y foundation documental

Implementación realizada en `efeoncepro/axis-design-system`:

- `apps/lab` usa `astro@7.1.6`, `@astrojs/check@0.9.10` y `output: 'static'`.
- Astro Content Loader valida el registry publicado y genera el catálogo, rutas estáticas por pattern y documentación MDX.
- `@astrojs/sitemap` genera el sitemap público; metadata canonical/Open Graph vive en el layout compartido.
- Búsqueda usa un script vanilla mínimo; Vitest cubre helpers y Playwright cubre Chromium/WebKit desktop/mobile,
  navegación, estado vacío y screenshot de smoke. No hay React, Next, Actions, adapters de Greenhouse/Globe ni SSR.
- `vercel.json` declara `framework: "astro"`, conserva `apps/lab/dist` y mantiene el sitio público.
- `pnpm design:check`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm test:e2e` del workspace
  AXIS pasan; `astro check` devuelve 0 errores, warnings y hints.

Este slice cierra la foundation de infraestructura/documentación, no la cobertura total del Lab: todavía faltan
fixtures visuales completos por contrato y la migración ordenada del catálogo que hoy vive en Greenhouse.

### Delta 2026-08-01 (b) — rollout público y primer slice Greenhouse

- Deployment Vercel `dpl_8TohYh27fJizvDVC3MV5aoemvFPK` quedó `READY` con framework Astro, Node 24 y salida
  `apps/lab/dist`; alias público: `https://axis-design-system-lab.vercel.app`.
- `/`, `/docs/`, `/patterns/efeonce.status/`, `/patterns/efeonce.progress/`,
  `/references/colors/` y `/sitemap-index.xml` responden `200` sin protección SSO.
- Los primeros slices migrados desde Greenhouse son `colors` y `typography`: referencias HTML/CSS que leen
  `axisRamp` y `axisTypography` desde `@efeoncepro/axis-tokens`, sin copiar `AxisColorLabView` ni
  `CanonicalTypographyView`, ni importar Greenhouse.
- El inventario de rutas y la clasificación inicial están en
  [`AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md`](../../architecture/AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md).

### Delta 2026-08-01 (c) — geometry y elevation

- AXIS publica `/references/geometry/` y `/references/elevation/` como rutas estáticas token-backed.
- `axisGeometry` conserva el spacing 1..16 + 25 y los radius `xs`..`display`/`round`; `axisElevation` conserva
  los roles semánticos `none`, `raised`, `floating`, `overlay`, `modal` y `overflow` reservado.
- El bloque pasó build, typecheck, tests unitarios, lint y 14 pruebas E2E en Chromium y mobile.

### Delta 2026-08-01 (d) — primer bloque pure-UI

- AXIS publica contratos y fixtures para `button`, `chip`, `breadcrumbs`, `disclosure`, `loaders` y
  `floating-surface`, sin importar primitives Greenhouse/MUI, auth, API o dominio.
- El Lab Astro genera 14 páginas estáticas y el catálogo contiene 8 contratos publicados.
- La verificación actual pasa build, typecheck, tests, lint y 16 E2E en Chromium y mobile; `/design-system`
  sigue siendo fallback porque aún falta comparación visual/consumer parity ruta por ruta.

### Delta 2026-08-01 (e) — motion y border beam

- AXIS publica `efeonce.motion` y `efeonce.border-beam`; el primero conserva la escala de duración/easing y el
  segundo una fixture de borde de superficie sin dependencias GSAP/Nexa.
- El Lab genera 16 páginas estáticas, con 10 contratos publicados; pasan 19 tests de tokens y 16 E2E en Chromium
  y mobile. La referencia Greenhouse permanece como fallback para comparar consumidores.

### Delta 2026-08-01 (f) — shell y density

- AXIS publica `efeonce.composition-shell` y `efeonce.card-density` como fixtures de layout estático, con orden
  de landmarks, composición responsive y prioridad de contenido documentados.
- El Lab genera 18 páginas estáticas y 12 contratos publicados; los E2E Chromium/mobile pasan después de verificar
  las nuevas rutas. No se trasladaron Portal context, telemetry ni componentes MUI.

### Delta 2026-08-01 (g) — catálogo pure-UI ampliado

- AXIS publica `efeonce.charts`, `efeonce.roadmap-timeline`, `efeonce.team-avatar-group` y
  `efeonce.surface-recipes` como contratos estáticos, sin motores de charts ni datos de producto.
- El Lab genera 22 páginas estáticas y 16 contratos publicados; los E2E Chromium/mobile pasan. La paridad visual
  con los canaries consumidores sigue pendiente antes de retirar cualquier ruta Greenhouse.

### Delta 2026-08-01 (h) — gradients y utilities

- AXIS publica `efeonce.gradients` como fixture de superficie tokenizada con intensidad y modo estático.
- `utilities` queda explícitamente fuera del primer traslado: Activity Timeline mezcla evidencia operativa,
  personas, adjuntos, timestamps y semántica de auditoría; requiere un contrato de producto separado.
- El Lab genera 23 páginas estáticas y 17 contratos publicados; los E2E Chromium/mobile pasan.

### Delta 2026-08-01 (i) — activity timeline

- `utilities` se extrae como `efeonce.activity-timeline`, con eventos ordenados, timestamps legibles, estados,
  persona y adjunto de fixture; no se trasladan datos operativos ni registros de auditoría.
- El Lab genera 24 páginas estáticas y 18 contratos publicados; build, typecheck, tests y 16 E2E Chromium/mobile
  pasan.

### Delta 2026-08-01 (j) — brand logo provenance gate

- AXIS publica `efeonce.brand-logos` como fixture de gobernanza con estados `approved`, `pending-provenance` y
  `rejected`, accessible names y status visible.
- No se copian SVGs de terceros ni nodos privados de Figma: los assets reales quedan pendientes de source,
  licencia y checksum versionado.
- El Lab genera 25 páginas estáticas y 19 contratos publicados; build, typecheck, tests y 16 E2E pasan.

### Delta 2026-08-01 (k) — leaderboard y brand motion

- AXIS publica `efeonce.leaderboard` como contrato de referencia para periodo, estado de run, podium, ranking
  ordenado y score; la fixture usa valores sintéticos y no traslada participantes ni datos operativos.
- AXIS publica `efeonce.brand-motion` como referencia HTML/CSS estática para la firma orbital, con estado de
  órbita única, variante ambiental y fallback `prefers-reduced-motion`. No se copian el SVG experimental ni GSAP
  desde Greenhouse.
- El Lab genera 27 páginas estáticas y 21 contratos publicados. Build, typecheck, tests, lint y 16 E2E Chromium/
  mobile pasan. `axis.efeonce.org` está asociado al proyecto Vercel; la resolución DNS de HostGator aún debe
  propagarse antes de cerrar el smoke por dominio custom.
- Commit AXIS: `4b661db` (`feat(lab): add leaderboard reference contract`), publicado en `main`. La slice
  `brand-motion` queda pendiente de commit y despliegue en esta continuidad.

### Plan futuro para portar el Lab Greenhouse a AXIS

1. Inventariar las rutas actuales de `/design-system` y clasificarlas como contrato puro, fixture visual,
   consumidor MUI/Vuexy o superficie con API/dominio.
2. Llevar primero al AXIS Lab el inventario y las páginas pure-UI, transformando cada página en documentación
   derivada del registry; no copiar imports, datos, auth, adapters ni el shell de Greenhouse.
3. Para cada pattern, publicar en AXIS la spec/fixture mínima que falte y validar la implementación de referencia
   contra los canaries MUI/Vuexy y Tailwind mediante capturas y propiedades computadas.
4. Mantener `/design-system` como fallback hasta que el catálogo AXIS tenga parity de rutas, estados, copy,
   accesibilidad y evidencia; después retirar páginas una por una, nunca mediante un cutover masivo.

`TASK-1382` no participa en este traslado: su piloto necesita otro sujeto interno de Greenhouse para probar la
frontera de build units y la matriz de builds afectados.

El inventario operativo del traslado está en
[`AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md`](../../architecture/AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md).

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../axis-design-system/apps/lab` (Vite + TypeScript vanilla)
- Future candidate home: `../axis-design-system/apps/lab` (Astro 7)
- Boundary: Lab consume tokens/registry publicados o workspace AXIS; no importa Greenhouse/Globe, lógica de dominio ni secretos
- Server/browser split: `output: 'static'`; HTML/CSS de referencia por defecto, islas sólo para interacción del catálogo
- Build impact: build reproducible de Astro 7 dentro del workspace AXIS; no construye Greenhouse
- Extraction blocker: contenido completo de contratos y fixtures cross-runtime, no la infraestructura del Lab

## UI/UX Contract

- Primitive decision: `reuse` del lenguaje y fixtures existentes; `extend` sólo cuando el Lab necesite un shell propio.
- Responsive: 1440 px y 390 px.
- Accessibility: keyboard, focus, reduced motion, contrast y labels.
- Evidence: captures del Lab y diff contra primitives Greenhouse seleccionadas.

## Acceptance Criteria

- [x] Lab corre fuera de Greenhouse.
- [ ] Tiene catálogo searchable con owner, SoT, lifecycle y consumers.
- [ ] Tiene fixtures desktop/mobile/keyboard/reduced-motion.
- [x] Preview/Vercel existe en AXIS, es pública por decisión explícita y no retira `/design-system`.

## Delta 2026-07-30 — el estado real, el rol que le da el ADR y una contradicción abierta

Medido contra el runtime, no leído de la spec.

### Sus cuatro acceptance criteria, contrastados

| Criterio | Estado real |
|---|---|
| "Lab corre fuera de Greenhouse" | ✅ **cumplido**. `apps/lab` vive en `axis-design-system` y está desplegado en `axis-design-system-lab.vercel.app` |
| "Catálogo searchable con owner, SoT, lifecycle y consumers" | 🟡 **el buscador existe** (`registry-list` + filtro por `id`/`owner`/`lifecycle`), pero sobre **2 contratos** |
| "Fixtures desktop/mobile/keyboard/reduced-motion" | 🔴 el Lab tiene `evidence-panel` y `check`, pero los fixtures reales viven en los canaries de los consumidores, no en el Lab |
| "Preview Vercel sin mover producción ni retirar `/design-system`" | 🟡 el proyecto existe y `/design-system` sigue intacto (43 rutas), **pero el Lab es público**: responde `200` sin autenticación, y esta task pide `internal-only` |

### El hallazgo: existe el contenedor, no el contenido

**2 contratos en el Lab contra 43 rutas de `/design-system` en Greenhouse.** La extracción no está
*pendiente* — está *a medias, y del lado incómodo*: la infraestructura nació y el catálogo no se mudó.

Eso hace que la task se lea peor de lo que está en su criterio 1 y mucho mejor de lo que está en el resto.
Su `Current home` (`src/app/(dashboard)/design-system`) sigue siendo cierto, pero su premisa —"el Lab
independiente está pendiente"— ya no.

### Rol nuevo que le asigna el ADR de ownership (aceptado 2026-07-29)

[`EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1`](../../architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md)
le da al Lab una función que esta spec no contemplaba: si AXIS pasa a ser dueño del valor y del contrato,
**el Lab es la superficie donde se documenta el USO** — anatomy, estados, cuándo usar cuál, do/don't.

Hoy esa documentación **no existe en ninguna parte**: el gobierno vive en Greenhouse (decisiones, runbook,
tasks) y el catálogo de uso no está escrito. Eso refuerza el destino de esta task frente al de `TASK-1382`.

**Regla que no hay que romper al hacerlo:** el Lab **deriva del registry, nunca re-documenta**. Si alguien
escribe a mano "`efeonce.status` tiene 5 estados", eso drifta el día que el contrato cambie y nadie se
entera. Tiene que leerlo de `findPattern`, como ya hace con `id`, `version`, `owner` y `lifecycle`. Es el
mismo principio que el ADR aplica al valor: SSOT + derivación + gate, nunca copia.

### 🔴 Contradicción abierta con `TASK-1382`

`TASK-1382` (*Design System Labs build-unit pilot*, `to-do`) declara:

> *"Materializar la primera unidad de build independiente **de Greenhouse**: Design System Labs (…)
> demostrar que cambios Labs no construyen Portal"*

Son **dos destinos incompatibles para la misma superficie**:

- **Esta task**: el Lab vive en **AXIS**, otro repo, Vercel aparte.
- **`TASK-1382`**: Labs es un **build unit dentro de Greenhouse** (EPIC-026).

No pueden ser las dos, y **ninguna declara a la otra** en sus dependencias. `TASK-1382` es la que decide:
si Labs se queda como build unit de Greenhouse, esta task pierde su destino; si el catálogo se muda a AXIS,
`TASK-1382` pierde su sujeto. **Resolver antes de tomar cualquiera de las dos.**

### Decisión de acceso, pendiente y a propósito

El Lab está **público por omisión, no por decisión**. Un design system público no es un problema en sí
—Material, Carbon y Polaris lo son— pero esta task pide `internal-only` y la realidad dice otra cosa.
Antes de mudarle el catálogo de 43 rutas hay que decidir el nivel de acceso a propósito.

### Sobre los docs UI de esta task

`docs/ui/wireframes/TASK-1590-*.md` (6 líneas) y `docs/ui/motion/TASK-1590-*.md` (4 líneas) **son cortos
pero fieles**: describen registry-izquierda / preview-centro / evidencia-derecha con targets 1440 y 390, y
el Lab implementa exactamente eso (`registry-list`, `preview-panel`, `evidence-panel`). No son relleno para
el gate — son una declaración de dirección que ya se materializó.

Lo que **no** son es suficientes como contrato de implementación para mudar 43 rutas: falta el inventario de
superficies, el mapping a las rutas actuales de `/design-system`, los estados y el copy. `UI ready: no` es
correcto y debe seguir así hasta que eso exista.

## Delta 2026-07-30 (b) — destino y acceso DECIDIDOS por el operador

**Destino: el Lab vive en el Vercel de AXIS.** Confirmado por el operador. La razón que dio es la correcta
y conviene dejarla escrita porque es el criterio, no la preferencia: el Lab debe **consumir lo que AXIS
publica**, no el código de Greenhouse. Es un render de un contrato publicado — el mismo patrón de
`efeonce-think` sobre el modelo headless de reportes.

⚠️ **No confundir con `axis-headless`** (eje 2 del ADR: componentes con comportamiento y sin apariencia).
Acá "headless" describe el **desacople del Lab respecto de Greenhouse**, no la capa de comportamiento. Son
dos cosas distintas con la misma palabra.

Consecuencia dura: **el Lab nunca importa de `greenhouse-eo`.** Lee del registry publicado y de los tokens
publicados. Si necesita algo que AXIS no publica, el gap es de AXIS, no del Lab.

**Acceso: público, y ahora es una decisión, no una omisión.** El operador decide mantenerlo público y
revisar el nivel de acceso más adelante. Esto **supersede** el `internal-only` de la spec original de esta
task. Consecuencia operativa: el contenido del Lab se escribe sabiendo que es visible desde fuera — nada de
notas internas, nombres de clientes, capturas de datos reales ni referencias a decisiones no publicadas.

`TASK-1382` queda resuelta por esta decisión: Labs **no** es candidato a primer build unit de Greenhouse,
porque su destino no está en el repo. EPIC-026 necesita otro sujeto.

## Delta 2026-07-30 (c) — stack DECIDIDO: Astro, y qué renderiza el Lab

Decisión completa con su razonamiento en
[`EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1`](../../architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md)
§ Delta 2026-07-30 (stack del Lab). Lo ejecutable:

### El Lab se reescribe en **Astro**

Hoy es Vite + TS vanilla (~70 líneas, `innerHTML` + template strings). No hay estado ni backend que
preservar: **reescribir sale más barato que adaptar**.

Las cinco razones, en orden de peso:

1. **No ata el Lab al framework de un consumidor.** Un Lab en React ataría la documentación del design
   system a React —motor de dos consumidores hoy, no necesariamente de Wave—. Astro lo mantiene tan
   agnóstico como los paquetes. *La portabilidad no se negocia en la capa que documenta la portabilidad.*
2. **Islas cuando hagan falta, no antes.** El eje 2 (`axis-headless`) va a necesitar demostrar un
   `<Dialog>` interactivo, que es React: se agrega **una isla** en esa página, sin convertir el sitio.
3. **Es un sitio de documentación, no una app.** Content Collections + Zod dan contenido tipado; hoy los
   docs serían template strings.
4. **Zero JS por defecto** — la referencia en HTML + CSS se sirve sin una línea de JavaScript.
5. **El ecosistema ya lo usa** (`efeonce-think`), con skill `astro` y overlay.

Descartados: **Next** (ataría a React, y es framework de app para un sitio de contenido) y **Storybook**
(su modelo es *"componentes de un repo"*, no *"una spec y N implementaciones"*, y ata a un framework).

### Qué renderiza: una implementación de REFERENCIA, no los adapters

**El Lab NO importa los adapters de Greenhouse ni de Globe.** Eso sería el acoplamiento cross-repo de
`ISSUE-128`, que dejó el CI de Globe rojo 9 commits.

**El Lab implementa cada pattern desde su `spec`, en HTML + CSS puro.** Y eso es el mejor test que la spec
puede tener: si un pattern no se puede implementar sin inventar un valor, **la spec está incompleta**.

Da además el tercer punto de comparación —**MUI vs Tailwind vs referencia**—: si los dos adapters coinciden
entre sí pero difieren de la referencia, el problema está en la spec; si sólo uno difiere, está en ese
adapter. Con dos puntos no se distingue; con tres, sí.

Los **artefactos** de cada producto (captura + propiedades computadas) los emite cada consumidor con su
propia maquinaria y el Lab los muestra junto a la referencia. El Lab compara; no produce.

> **Frontera que no hay que confundir:** el Lab **es una app**, no un paquete publicado. Que implemente un
> pattern en CSS **no** viola la regla de que AXIS nunca publica apariencia implementada — nadie consume el
> Lab como dependencia.

### Qué agrega esto al alcance

- Reescritura del Lab en Astro (config, layout, Content Collections, deploy en el mismo proyecto Vercel).
- Una implementación de referencia por pattern, derivada de su `spec` — **depende de `TASK-1601` Slice 1**,
  que es quien crea la `spec`.
- La superficie que muestra referencia + artefactos lado a lado.

### Consecuencia para el orden

El **inventario de las 43 rutas** (Slice 0 de esta task) **no depende de nada** y puede arrancar ya. La
reescritura en Astro tampoco. Lo único que depende de `TASK-1601` es la implementación de referencia, que
necesita que la `spec` exista.

## Rollout / Rollback

- Preview primero; dominio interno después de revisión humana.
- `/design-system` queda como fallback y catálogo Greenhouse.
