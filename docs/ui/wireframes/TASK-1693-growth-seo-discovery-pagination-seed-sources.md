# Wireframe — TASK-1693 · Recorrer la corrida completa y elegir de dónde salen las seeds

> **Alcance deliberadamente parcial.** Este documento **no** re-describe la lente `Descubrir`: su
> contrato vivo es
> [`TASK-1665-growth-seo-keyword-discovery-workbench.md`](TASK-1665-growth-seo-keyword-discovery-workbench.md)
> (regiones R0–R4, builder, run status, canvas, drawer) y sigue vigente sin cambios. Acá viven **sólo
> las tres afordancias que TASK-1693 agrega** sobre esa superficie ya shipeada: la paginación
> acumulativa, el selector de fuente de seed y los filtros del canvas aplicados server-side.
> **NUNCA** rediseñar el canvas, el drawer ni el conmutador de lentes partiendo de este archivo.

- Visual direction mode: repo-native-benchmark
- Product Design asset: docs/ui/wireframes/TASK-1693-growth-seo-discovery-pagination-seed-sources.md (benchmark repo-native; la fuente visual viva es la propia superficie shipeada, `src/views/greenhouse/admin/growth/seo/keywords/discovery/`)

**Benchmark declarado:** la superficie existente en producción más su lente hermana
`Oportunidades` (`KeywordOpportunityTable.tsx`), que ya resolvió el encoding `◑` + fecha de captura +
«Barrera de enlaces» que esta lente hereda. No hay dirección visual nueva que explorar: son tres
afordancias sobre una composición aprobada y en uso. Dos de las tres ya están diseñadas en el
wireframe de TASK-1665 (§B. Fuentes y §Filtros); la tercera —la paginación— es lo único que este
documento aporta de cero.

## Decision

**Paginación acumulativa sobre el cursor del reader, servida como una acción secundaria al pie del
canvas.** El operador pide la página siguiente, las filas se agregan al final y las ya leídas no se
desmontan ni se reordenan. No hay paginador numerado, no hay scroll infinito y no se sube el techo
del `limit`.

Las tres razones, en orden de peso:

1. **El cursor no es un índice de páginas.** `readKeywordDiscovery` serializa un **offset** sobre un
   orden compuesto en memoria (`reader.ts:300`, `nextCursor = String(offset + limit)` en `:706`). Un
   paginador numerado prometería saltar a la página 7 y volver a la 3; el contrato no sostiene ni el
   salto ni la vuelta. Ofrecer un control que el contrato no puede honrar es la clase de mentira que
   esta lente existe para no cometer.
2. **El canvas es de comparación, no de lectura lineal.** El operador contrasta candidatos entre sí
   antes de comprometer gasto recurrente. El scroll infinito le quita el ancla y deja al teclado sin
   punto de retorno; el paginador numerado le borra de la vista lo que venía comparando.
3. **El techo no es el problema.** Subir `limit` de 50 a 200 (`MAX_DISCOVERY_READ_LIMIT`) no cierra el
   gap —el universo llega a `MAX_DISCOVERY_CANDIDATES_PER_RUN = 500`— y multiplica por cuatro el
   trabajo de la primera pintada de una tabla de nueve columnas.

**La afordancia NO se ofrece sobre una corrida `pending`/`running`.** Ahí el universo crece bajo los
pies y el polling de 20 s ya reproyecta la primera página: paginar produciría filas duplicadas o
saltadas sin que nadie lo note. Se ofrece sólo con la corrida terminada.

**El selector de fuente es un `ToggleButtonGroup` de cuatro opciones**, no un `Select`: las cuatro
caben, cada una necesita su línea de ayuda visible —porque la diferencia entre ellas es de costo y de
calidad de dato, no de preferencia— y el builder ya usa ese control para métodos y alcance.

## Desktop Target

Viewport de referencia **1440×900**. Se conserva `SurfaceRecipe kind='analyticsReport'` con
`plane='none'` y `AdaptiveSidecarLayout`; las tres afordancias entran **dentro de las superficies que
ya existen**, sin agregar una cuarta card al cuerpo.

```
┌── R1 · Builder ────────────────────────────────────────────────────────────┐
│ Seeds  [textarea]                    Fuentes de seed                       │
│                                      (•) Consultas medidas  ◦ Keywords     │
│                                          28 días · sin costo    seguidas   │
│                                      ◦ Seeds escritas       ◦ Dominio      │
│                                                                propio      │
│ Métodos [Sugerencias][Relacionadas][Ideas]   Alcance [Rápido][Completo]    │
│ ── Banda de costo ───────────────────────────────────────────────────────  │
│ 12 seeds · 2 llamadas · USD 0,04 estimado · Cupo: USD 3,20   [ Descubrir ] │
└────────────────────────────────────────────────────────────────────────────┘

┌── R3 · Canvas ─────────────────────────────────────────────────────────────┐
│ FILTROS          │ 312 candidatos                                          │
│ Buscar […]       │ ┌──────────────────────────────────────────────────┐   │
│ Procedencia ▾    │ │ Keyword │ Proc. │ Intención │ ◑ Vol │ Barrera │ … │   │
│ Intención   ▾    │ │ …50 filas…                                        │   │
│ Estado      ▾    │ └──────────────────────────────────────────────────┘   │
│ Volumen mín […]  │              ┌─────────────────────────┐                │
│ [Limpiar]        │              │  Cargar 50 más          │  ← secundario  │
│                  │              └─────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────────┘
```

La afordancia de paginación vive **al pie de la tabla, centrada, ancho contenido**: no ocupa el ancho
completo, porque un botón full-width al final de una lista se lee como el cierre de un formulario.

## Mobile Target

Viewport de referencia **390×844**. El canvas ya alterna a card list por CSS; la afordancia existe en
las dos presentaciones y **no se duplica**.

- Los filtros colapsan al botón `Filtros (N)` que abre drawer con foco, tal como ya declara
  TASK-1665 §Filtros. Esta task no cambia ese patrón: lo cablea.
- El selector de fuente pasa a `ToggleButtonGroup` en columna, ancho completo, con su ayuda debajo de
  cada opción. Cuatro opciones apiladas caben sin truncar la etiqueta más larga («Consultas medidas»).
- La afordancia de paginación queda al final de la card list, alcanzable con el pulgar, con
  `margin-block-start` de escala 4n para no pegarse a la última card.
- Sin scroll horizontal de página: `documentElement.scrollWidth <= clientWidth` a 390px es evidencia
  requerida, no ausencia de findings.

## Action Hierarchy

Tres niveles, y la distancia entre el primero y el segundo es lo que este documento protege:

| Nivel | Acción | Control | Por qué ese peso |
|---|---|---|---|
| Primaria | `Descubrir` (encolar corrida) | `GreenhouseAsyncActionButton` `variant='contained'` dentro de la banda de costo | **Gasta.** Es la única acción de la superficie que compromete presupuesto del proveedor, y por eso vive pegada a la cifra que dice cuánto |
| Secundaria | `Cargar 50 más` | Botón `variant='outlined'`, ancho contenido, al pie del canvas | **Lee.** No gasta, no dispara `POST`, no crea corrida. Pintarla `contained` la haría competir con la única acción que sí cuesta dinero |
| Terciaria | Filtros, selector de fuente, `Limpiar filtros` | `CustomTextField` / `ToggleButtonGroup` / `Button variant='text'` | Configuran la pregunta; no la ejecutan |

🔴 **La paginación NUNCA se pinta como la acción primaria.** Dos botones `contained` en la misma
pantalla, uno que gasta y otro que no, es exactamente cómo alguien confirma un gasto creyendo que
está paginando.

## Visual Fidelity Mapping

Cero valores literales. Todo sale del tema.

| Señal visual | Token / primitive | Nunca |
|---|---|---|
| Botón de paginación | `Button variant='outlined' color='primary'` (MUI base, tema Greenhouse) | `sx={{ backgroundColor: '#…' }}` |
| Separación del pie de tabla | `Stack spacing` sobre la escala `4n` del tema | `marginTop: '18px'` |
| Estado `loading` de la afordancia | `GreenhouseAsyncActionButton` state `loading` (spinner del primitive) | spinner propio ni skeleton que reemplace la tabla |
| Selector de fuente | `ToggleButtonGroup` + `selectionGroupSx` ya definido en el builder | un `selectionGroupSx` paralelo |
| Anillo de foco | el de `selectionGroupSx` (heredado, no redefinido) | `outline` literal |
| Ayuda de cada fuente | `Typography variant='body2' color='text.secondary'` | `fontSize` inline |
| Fuente no disponible | `ToggleButton disabled` + su copy de razón visible | ocultar la opción en silencio |
| Tipografía | Geist por variantes del tema; display Poppins por variante | `fontFamily` literal, jamás DM Sans |
| Transición de filas nuevas | tokens de motion vigentes | milisegundos literales |

## Copy Ledger

Todo en `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_KEYWORDS.discovery`. Tono heredado del bloque:
nunca prometer tráfico ni ranking; «descubrir» ≠ «seguir»; la ausencia de dato se nombra, no se
rellena. Validado con `greenhouse-ux-writing` antes de escribir JSX.

| Key | Estado | Texto |
|---|---|---|
| `results.loadMore` | nueva | `Cargar {count} más` |
| `results.loadMoreAria` | nueva | `Cargar los siguientes {count} candidatos de la corrida` |
| `results.loadMoreError` | nueva | `No pudimos traer más candidatos. Los que ya ves siguen acá.` |
| `results.countTruncated` | **se conserva** | `{shown} de {count} candidatos` — sigue siendo cierto mientras quede cursor |
| `results.truncatedNotice` | **se reescribe** | Hoy promete «se podrá recorrer cuando la lente tenga paginación». Esa promesa deja de ser cierta al shipear esta task: el aviso se retira cuando ya no queda cursor y su texto deja de hablar del futuro |
| `results.count` | existe | `{count} candidatos` — pasa a usarse cuando se recorrió todo |
| `results.emptyFiltered` | **existe, sin consumer** | `Ningún candidato coincide con los filtros.` — gana consumidor con los filtros server-side |
| `builder.sourcesLabel` | **existe, sin consumer** | `Fuentes de seed` |
| `builder.sourceGsc` / `sourceGscHelper` / `sourceGscUnavailable` | **existen, sin consumer** | `Consultas medidas` / `…últimos 28 días. Sin costo de proveedor.` / `No hay consultas medidas` |
| `builder.sourceTracked` / `sourceTrackedHelper` / `sourceTrackedUnavailable` | **existen, sin consumer** | `Keywords seguidas` / `No crea seguimiento nuevo.` / `Todavía no sigues keywords` |
| `builder.sourceManual` / `sourceManualHelper` | **existen, sin consumer** | `Seeds escritas` / `El texto que ingresaste como punto de partida.` |
| `builder.sourceDomain` / `sourceDomainHelper` | **existen, sin consumer** | `Dominio propio` / `Usa datos estimados y tiene costo.` |
| `builder.seedsErrorEmpty` | **existe, sin consumer** | `Agrega al menos una seed.` — gana consumidor cuando la fuente elegida exige seeds |
| rechazos del primitive | nuevas | prosa es-CL para `no_gsc_queries`, `no_tracked_keywords`, `target_domain_requires_keywords_for_site`; **nunca** el código crudo |

🔴 **La lente `●` de la seed no se propaga al candidato.** Que las seeds vengan de GSC (demanda
medida) no vuelve medidos los resultados: el proveedor devuelve estimaciones. Ninguna etiqueta,
ningún chip y ningún helper puede sugerir lo contrario.

## State Copy

Seis estados, cada uno con copy visible y recuperación declarada.

| Estado | Situación | Copy visible | Recuperación ofrecida |
|---|---|---|---|
| ready | corrida terminada, quedan páginas | `countTruncated` + botón `loadMore` con el tamaño real de la página siguiente | Cargar más. Sin límite de veces hasta agotar el cursor |
| loading | página siguiente en vuelo | El botón pasa a `loading`; **las filas ya cargadas no se desmontan ni se reordenan** | Ninguna necesaria; una sola petición en vuelo a la vez |
| empty | sin corrida, o corrida sin candidatos | `EmptyState` vigente (`empty.title` / `empty.noTargetTitle`); con filtros activos y cero coincidencias, `emptyFiltered` | Sin corrida: encolar una. Con filtros: `Limpiar filtros` |
| partial | corrida `partial`, o corrida viva | Se pagina **sólo** sobre lo materializado; con corrida `pending`/`running` la afordancia **no se renderiza** y el estado del run manda | Esperar a que termine. No se ofrece paginar sobre un universo en movimiento |
| error | la página siguiente falla | `loadMoreError` en la live region ya montada; **lo cargado se conserva** | Reintentar **sólo** si el error canónico trae `actionable: true`; si es estructural, no se ofrece |
| denied | sin `growth.seo.target.configure` | El selector de fuente y el CTA de gasto **no se renderizan** (no se deshabilitan); el motivo se dice en la banda de costo | Ninguna en pantalla. **Paginar sigue disponible**: leer no gasta y no requiere ese permiso |

Regla transversal heredada: **ningún estado ofrece una acción que no puede tener efecto.**

## Accessibility Contract

- Se **reusa** la live region `role='status' aria-live='polite'` del workbench. **NUNCA** se monta una
  segunda: dos regiones vivas compiten y el lector anuncia una sola de forma impredecible.
- Tras cargar una página el foco **no salta** al inicio de la tabla ni a la primera fila nueva: queda
  en la afordancia, que es donde estaba. El resultado se anuncia por la live region.
- El botón declara `aria-label` con el conteo (`loadMoreAria`), porque «Cargar 50 más» fuera de
  contexto no dice de qué.
- Las cuatro opciones de fuente son un grupo etiquetado por `sourcesLabel`; una opción no disponible
  usa `disabled` **con su razón visible**, nunca se oculta — desaparecer una opción le impide al
  operador entender por qué no la tiene.
- Orden de tabulación = orden visual: filtros → tabla → afordancia de paginación.
- Foco visible sobre la afordancia y sobre el selector, heredado de `selectionGroupSx`.
- `prefers-reduced-motion: reduce` elimina la transición de entrada de las filas nuevas conservando el
  estado final idéntico.

## Implementation Mapping

- **Ruta / surface:** `/admin/growth/seo/keywords?view=discovery` →
  `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` (rama `activeLens === 'discovery'`,
  `:135-247`). Mismo `viewCode`; no nace surface nueva ni destino de navegación.
- **Composición:** `SurfaceRecipe kind='analyticsReport'` `plane='none'` + `AdaptiveSidecarLayout`.
  Sin cambios.
- **Componentes:** `KeywordDiscoveryWorkbench.tsx` (estado de páginas acumuladas + fuente elegida),
  `KeywordDiscoveryResults.tsx` (afordancia de página siguiente), `KeywordDiscoveryBuilder.tsx`
  (selector de fuente + costo por fuente), `keyword-discovery-query.ts` (filtros de URL, **se cablea**).
- **Reader (primera página, server):** `readKeywordDiscovery` con `limit` explícito; se propaga
  `nextCursor`. Cursor = offset serializado (`reader.ts:300`, `:706`); **la UI nunca lo compone**.
- **Ruta (páginas siguientes, cliente):** `GET /api/admin/growth/seo/keyword-discovery?organizationId=…&runId=…&cursor=…`
  — ya acepta `limit` y `cursor` (`route.ts:244-292`). **Cero contrato nuevo.**
- **Encolado:** `POST` `intent: 'queue'` con `seedSource` + `mixedMeasuredSource`; la ruta ya los
  valida contra `SEO_DISCOVERY_SOURCE_KINDS` (`route.ts:174-192`). Hoy el cliente hardcodea `'manual'`.
- **Resolución de seeds:** `resolveSeeds` cubre las cinco fuentes (`queue.ts:284-330`) con rechazos
  tipados. **No se toca el primitive.**
- **Errores:** `throwIfNotOk` + `isCanonicalApiError` ya importados en el workbench; `actionable`
  decide si se ofrece reintento.
- **Copy:** `GH_GROWTH_SEO_KEYWORDS.discovery` en `src/lib/copy/growth.ts`.
- **Primitive decision:** `reuse` — `DataTableShell`, `GreenhouseAsyncActionButton`,
  `ToggleButtonGroup`, `CustomTextField`, `EmptyState`. Ninguna primitive nueva.
- **Access / capability:** `growth.seo.observation.read` para leer y paginar;
  `growth.seo.target.configure` para elegir fuente y encolar. **Ninguna capability nueva.**

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts` — **se extiende
  el existente**, no se crea uno paralelo.
- Quality profile: premium
- **Viewports:** `desktop` 1440×900 + `mobile` 390×844.
- **Baseline decision:** se compara contra la baseline de TASK-1665 para la misma surface. Todo delta
  de píxeles se declara en `BASELINE_DELTAS.md` con su razón; se espera delta real en R1 (el selector
  de fuente es superficie nueva dentro del builder) y en el pie de R3 (la afordancia). El canvas y el
  drawer **no deben moverse**: un delta ahí es regresión, no rebaseline.
- **Review dossier:** `pnpm fe:capture:review growth-seo-keyword-discovery`, adjunto en
  `docs/ui/reviews/`.
- **Scroll-width evidence:** `documentElement.scrollWidth <= clientWidth` capturado explícitamente en
  desktop 1440 y en 390px. El gate exige la evidencia, no la ausencia de findings.
- **Reduced motion:** captura con `prefers-reduced-motion: reduce`; el estado final debe ser idéntico.
- **`data-capture` requeridos:** `seo-keyword-discovery-builder` y `seo-keyword-discovery-cost` (ya
  existen), `seo-keyword-discovery-results` (ya existe), `seo-keyword-discovery-candidate` (ya existe)
  y **`seo-keyword-discovery-pagination`** (nuevo, sobre la afordancia).
- **Capturas requeridas:** canvas primera página · canvas tras cargar la siguiente · builder con el
  selector de fuente · banda de costo con una fuente medida seleccionada · canvas en 390px.
- **Assertions:** el conteo servido **crece** al paginar y coincide con las filas visibles; el total
  **no cambia**; ninguna acción de paginación dispara un `POST`; sin scroll horizontal de página.
- **Semilla:** el escenario **no dispara una corrida real** (gasta). Se captura sobre la última corrida
  ya materializada del Space Berel; si no hubiera una con más de una página, se declara en el dossier
  en vez de forzar gasto para una captura.

## Design Decision Log

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Paginación acumulativa («cargar más») | Paginador numerado con salto a página arbitraria | El cursor es un offset serializado sobre un orden en memoria, no un índice navegable. Prometer el salto y la vuelta es prometer lo que el contrato no sostiene |
| Paginación acumulativa | Scroll infinito automático | Rompe la comparación entre filas —que es lo que el operador hace en este canvas— y deja al teclado sin ancla de retorno |
| Paginación acumulativa | Subir `limit` a 200 y no paginar | No cierra el gap (el universo llega a 500) y cuadruplica el trabajo de la primera pintada de una tabla de nueve columnas |
| Afordancia `outlined`, no `contained` | Botón primario al pie | Dos `contained` en pantalla, uno que gasta y otro que no, es cómo alguien confirma un gasto creyendo que pagina |
| Afordancia ausente en corrida viva | Deshabilitarla con tooltip | Sobre un universo que crece, paginar duplica o saltea filas **sin aviso**. Un control ausente es más honesto que uno apagado que sugiere que el problema es temporal de UI |
| `ToggleButtonGroup` para fuentes | `Select` desplegable | Las cuatro caben, y cada una necesita su ayuda visible: la diferencia entre ellas es de costo y de calidad de dato, no de preferencia |
| Fuente sin insumo = `disabled` + razón | Ocultar la opción | Ocultarla le impide al operador entender por qué no la tiene. Y degradar a `manual` en silencio sería peor: creería que corrió lo que pidió |
| Filtros server-side | Filtrar en cliente sobre la página cargada | Filtrar en cliente sobre un cursor paginado **mentiría sobre el universo filtrado**: diría «3 candidatos» cuando hay 40 en las páginas no cargadas |
| `maxDifficulty` **no** se ofrece | Exponerlo como control | `TASK-1694` lo declara no-op y lo reporta en `ignoredFilters`. Ofrecerlo sería devolverle al operador la decisión errada que `ISSUE-152` documenta |

## Token mapping

- Color: `theme.palette.*` vía variantes de MUI (`primary` para la acción de gasto, `text.secondary`
  para ayudas). **Cero HEX literal.**
- Spacing: escala `4n` del tema por `Stack spacing` / `sx` con múltiplos. **Cero px literal.**
- Tipografía: variantes del tema (Geist producto, Poppins display). **Cero `fontSize` inline, jamás
  DM Sans.**
- Motion: tokens vigentes del tema; `prefers-reduced-motion` respetado. **Cero ms literal.**
- Radios y elevación: los de la recipe `analyticsReport`; no se introduce elevación nueva.

## Anti-patterns

- **NUNCA** pintar la afordancia de paginación como acción primaria (`contained`). Compite con la
  única acción que gasta.
- **NUNCA** ofrecer paginar sobre una corrida `pending`/`running`.
- **NUNCA** componer el cursor a mano en el cliente: se reusa el que devolvió el reader, tal cual.
- **NUNCA** montar una segunda live region: el workbench ya tiene la suya.
- **NUNCA** degradar a `manual` una fuente sin insumo. Se muestra no disponible con su razón.
- **NUNCA** propagar la lente `●` de la seed al candidato: los resultados del proveedor son `◑`.
- **NUNCA** exponer `maxDifficulty` como filtro visible.
- **NUNCA** filtrar en cliente sobre una página: el conteo mentiría sobre el universo filtrado.
- **NUNCA** desmontar o reordenar las filas ya cargadas al traer una página nueva.
- **NUNCA** agregar una cuarta card al cuerpo: las afordancias entran en las superficies existentes.

## Fuera de alcance

- Rediseño del canvas, del drawer, del conmutador de lentes o de la banda de costo.
- Cambiar el orden gobernado del reader, sus llaves de desempate o `MAX_DISCOVERY_CANDIDATES_PER_RUN`.
- Crear rutas, readers, commands, columnas o migraciones.
- Los writers de action kinds faltantes (TASK-1692) y el filtro de barrera en la API (TASK-1694, ya
  cerrada).
