# TASK-1671 / `/admin/growth/seo/audit` — Hallazgos de SITIO

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1671 — Growth SEO: superficie de los hallazgos de sitio en la auditoría`
- Product Design asset: docs/ui/wireframes/TASK-1671-growth-seo-site-findings-audit-surface.md
  (benchmark repo-native; la fuente visual viva es la superficie ya shipeada
  `src/views/greenhouse/admin/growth/seo/audit/SiteAuditView.tsx`, con su wireframe hermano
  docs/ui/wireframes/TASK-1309-growth-seo-site-audit-ui.md y el master flow
  docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md §S4). La dirección NO se inventa: esta
  task **extiende una pantalla viva**.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: operador Efeonce (Growth/AM) diagnosticando un dominio; el texto viaja
  después al cliente vía el artefacto de `TASK-1672`, así que **cada frase tiene que sobrevivir
  fuera de la pantalla**.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_AUDIT.site` (nuevo sub-namespace) +
  `GH_GROWTH_SEO_AUDIT_ISSUES` (las 7 fichas de TASK-1670, YA escritas y con drift test).
- Primitive decision: `reuse` total. Composition Shell + `Card` de la receta vigente,
  `GreenhouseChip` (severidad), `EmptyState` no aplica (ver §Estados). `new`: **cero primitives**.
  Lo único nuevo es un eje de alcance en `groupAuditIssues` y una región de layout.
- UI ready target: `yes`

## Brief

- Primary user: operador Growth que abre la auditoría de un dominio y necesita saber, antes que
  nada, **si los motores de IA pueden leer el sitio**.
- User moment: el mismo de siempre (revisar el último crawl), pero con una pregunta nueva que
  hasta hoy la pantalla no podía responder y respondía con silencio.
- Job to be done: leer el veredicto de acceso del dominio **antes** de bajar a la lista de
  problemas por página, y poder repetírselo al cliente sin que el cliente concluya que el
  informe miente.
- Primary decision signal: **acceso de retrieval**. Si está cortado, todo lo demás de la pantalla
  es secundario — un sitio invisible para los motores de IA no se arregla optimizando títulos.
- Non-goals: arreglar el bloqueo (es diagnóstico), configurar el WAF, reemplazar la lista de
  issues de página, y **crear una segunda lista con su propia lógica de orden**.

## Decision

**Los hallazgos de dominio se muestran en una región propia arriba de la lista priorizada,
alimentada por el MISMO agrupador con un eje de alcance.** No es una segunda lista y no es una
fila más: es una tercera superficie `contained` —la última que el presupuesto de chrome permite—
que responde una pregunta distinta de la que responde la lista.

La dirección visual se hereda íntegra de la superficie viva (`SiteAuditView.tsx`): misma receta,
mismo `Card`, mismo lenguaje de severidad (icono + label + color), misma tipografía del theme.
**Cero primitives nuevas, cero gramática visual nueva.** Lo único que se agrega es una región y
un eje de datos.

Por qué esta y no otra: la lista prioriza por "N páginas afectadas", y un `robots.txt` no
pertenece a una página. Dejar los hallazgos de dominio ahí los hunde al fondo de su propio tier
con un número falso; sacarlos a una lista aparte crea dos sistemas de orden que envejecen
distinto. La región propia con agrupador compartido es la única opción que respeta *"un solo
sistema de hallazgos"* y a la vez ordena bien.

## El problema de diseño, en una línea

La lista prioriza por **"N páginas afectadas"**. Un `robots.txt` no pertenece a una página:
pertenece al dominio. Con `affectedPages = 1` un hallazgo `critical` de sitio queda **último
dentro de su propio tier**, debajo de cualquier problema de página con alcance masivo — y
rotulado con un número falso. El orden existe para que "400 imágenes sin `alt` no entierren un
5xx"; acá enterraría al hallazgo más caro del informe.

## Direcciones comparadas

| # | Dirección | Por qué se descartó / eligió |
|---|---|---|
| A | **Fila más en la lista, con badge de alcance** | Rechazada. Comparte la maquinaria de orden, que es lo que hay que evitar: `priorityScore` multiplica por `affectedPages` y los hunde igual. Arreglarlo con un número sintético (`affectedPages = crawledPages`) es mentir sobre el alcance para ganar posición — la task lo rechaza explícitamente. |
| B | **Segunda lista, con su propio orden** | Rechazada. Dos listas de hallazgos en una pantalla obligan al operador a decidir cuál mirar primero, y cada una envejece con reglas distintas. La task lo prohíbe: *"un solo sistema de hallazgos"*. |
| C | **Una región propia ARRIBA de la lista, alimentada por el MISMO agrupador con un eje de alcance** ✅ | **Elegida.** `groupAuditIssues` gana `scope`; la vista particiona el resultado en vez de agrupar dos veces. El orden interno de los de sitio usa el mismo comparador **sin el factor de alcance** —constante entre ellos, por lo tanto sin poder de discriminación—. Una sola fuente de agrupación, dos regiones de render. |

## Layout Skeleton

La pantalla vigente tiene dos superficies `contained` en el first fold (salud · issues). Esta
task agrega **una tercera y última**: el presupuesto de chrome queda en su techo, no lo cruza.

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Sin cambios (breadcrumb, título, Space, freshness, `[Correr auditoría]`) | vigente | vigente |
| 1 | Health summary | Sin cambios. ⚠️ Sus conteos por severidad **siguen contando sólo hallazgos de página**: mezclarlos rompería la relación parte-todo de la banda y el filtro `?severity=` | vigente | vigente |
| **2** | **Acceso y presentación del sitio** (NUEVO) | Veredicto de dominio, **antes** de la lista. Tres densidades según estado (ver abajo). Nunca dice "páginas afectadas" | `Card` de la receta + `GreenhouseChip` | `readSiteAuditReport` → findings con `findingScope === 'site'` |
| 3 | Prioritized issues list | Sin cambios estructurales; su subtítulo pasa a declarar que lista **problemas por página**, para que la partición sea legible | vigente | findings `findingScope === 'page'` |
| 4 | Issue group drill | Sin cambios para página. Un grupo de SITIO **no abre drill de URLs** (no hay URLs que listar): su detalle se muestra inline en la región 2 | vigente | vigente |

### Región 2 — tres densidades, una sola posición

La posición no cambia entre estados: una región que aparece y desaparece haría saltar la página y
enseñaría al operador a no confiar en que estaba mirando lo mismo ayer.

| Densidad | Cuándo | Qué muestra |
|---|---|---|
| **Confirmación** | Los 4 chequeos pasaron | Una fila compacta: título + "Verificado" + los 4 chequeos como confirmaciones breves. **Es información, no decoración**: hasta hoy el silencio de esta pantalla significaba "no lo miramos", y ahora significa "lo miramos y está bien" |
| **Hallazgos** | ≥1 hallazgo de sitio | Filas de hallazgo, ordenadas por severidad ▸ valor ÷ esfuerzo. Cada fila: severidad (icono + label + color) · nombre · **dónde se detectó** · qué está bloqueado · el hint inline |
| **Parcial** | ≥1 `site_check_unverified` | Los chequeos que sí se pudieron medir con su resultado, **más** una línea aparte y de menor peso: "No pudimos verificar: {chequeo} — {razón}". Nunca al mismo peso visual que un hallazgo |

### Anatomía de una fila de hallazgo de sitio

```
⛔ Crítico   Los motores de IA no pueden leer el sitio          Todo el sitio
             En robots.txt · OAI-SearchBot, PerplexityBot y 3 más
             El archivo robots.txt le niega el paso a los rastreadores que citan
             páginas en las respuestas de ChatGPT, Perplexity y Claude.
```

Tres decisiones dentro de esa fila:

1. **"Todo el sitio"** ocupa el lugar donde una fila de página dice "N páginas afectadas". Misma
   posición, misma función —declarar alcance— y por eso no hace falta explicarla.
2. **"En robots.txt" / "En el borde (CDN/WAF)"** es obligatorio y es la línea que sostiene la
   credibilidad del informe: un cliente que lee "bloqueas crawlers de IA", abre su `robots.txt`,
   lo ve limpio y concluye que el informe está equivocado — y con él, el resto del reporte.
3. **El hint va inline, no en tooltip.** En la lista de página el hint es opcional porque el
   nombre del check basta; acá el nombre no basta y el texto viaja al cliente.

### El caso que decide si esta pantalla es honesta

`ai_training_crawlers_blocked` **no puede verse como un defecto**. Es una decisión de derechos
sobre el contenido, legítima y frecuente. Tratamiento:

- Severidad `notice` (la que trae el dato), como cualquier otro `notice`.
- **Chip de alcance con etiqueta propia: "Decisión declarada"**, en lugar del genérico "Info".
  Es la única diferencia visual, y existe porque `notice` describe *prioridad* y acá hace falta
  describir *naturaleza*.
- El hint inline (ya redactado como postura en `GH_GROWTH_SEO_AUDIT_ISSUES`) **nunca se colapsa**.

🔴 **Stop condition:** si en implementación este hallazgo termina renderizado igual que un
defecto —mismo chip, mismo tono, hint escondido—, la pantalla falla su propósito aunque los
cuatro gates pasen. Un `critical` falso en un documento con nuestro nombre cuesta más que el
hallazgo que gana.

## Copy Ledger

Las 7 fichas (`label` + `hint`) ya existen en `GH_GROWTH_SEO_AUDIT_ISSUES` (TASK-1670) con test
de drift bidireccional. Acá sólo el chrome de la región, en `GH_GROWTH_SEO_AUDIT.site`:

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `…site.title` | 2 | Acceso y presentación del sitio | — | `h2` |
| `…site.subtitle` | 2 | Lo que vale para todo el dominio, no para una página | — | declara la partición |
| `…site.scopeLabel` | 2 | Todo el sitio | — | ocupa el lugar de "N páginas afectadas" |
| `…site.postureLabel` | 2 | Decisión declarada | — | reemplaza "Info" SÓLO en hallazgos de postura |
| `…site.verified` | 2 | Verificado | — | densidad confirmación |
| `…site.verifiedHint` | 2 | Revisamos el acceso de los motores de IA, los datos estructurados y el mapa del sitio. | — | dice QUÉ se verificó: "verificado" sin objeto no es información |
| `…site.whereRobots` | 2 | En robots.txt | — | lugar de detección |
| `…site.whereEdge` | 2 | En el borde (CDN o firewall) | — | lugar de detección |
| `…site.whereHome` | 2 | En la portada | — | lugar de detección (JSON-LD) |
| `…site.whereSitemap` | 2 | En el mapa del sitio | — | lugar de detección |
| `…site.blockedAgents` | 2 | {first} y {n} más | `{first}`, `{n}` | lista acotada de bots; nunca los 5 crudos |
| `…site.blockedAgentsAll` | 2 | {agents} | `{agents}` | ≤2 bots: se nombran completos |
| `…site.edgeCleanRobots` | 2 | el robots.txt está limpio | — | acompaña al hallazgo de borde: es la mitad que lo hace creíble |
| `…site.unverifiedTitle` | 2 | No pudimos verificar | — | encabeza la línea parcial |
| `…site.unverifiedItem` | 2 | {check} — {reason} | `{check}`, `{reason}` | razón SIEMPRE presente |
| `…site.checkAiAccess` | 2 | Acceso de los motores de IA | — | nombre legible del chequeo |
| `…site.checkEdge` | 2 | Acceso en el servidor | — | |
| `…site.checkStructuredData` | 2 | Datos estructurados | — | |
| `…site.checkSitemap` | 2 | Mapa del sitio | — | |
| `…issues.subtitleScoped` | 3 | Ordenados por impacto y esfuerzo · problemas por página | — | reemplaza el subtítulo vigente; hace legible la partición |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Acceso y presentación del sitio | **Densidad confirmación** (0 hallazgos): "Verificado" + "Revisamos el acceso de los motores de IA, los datos estructurados y el mapa del sitio." · **Densidad hallazgos** (≥1): filas con severidad · alcance · lugar · hint | ninguna en la región: la remediación vive fuera del portal (editar `robots.txt`, ajustar el WAF) y el hint la nombra | La confirmación **NO es un empty state**: es un resultado positivo medido. Un `EmptyState` diría "no hay nada acá", que es lo contrario de lo que pasó |
| loading | — | skeleton de la región con la MISMA altura que la densidad confirmación | — | altura fija: sin ella la página salta al resolver |
| empty | *(la región no se renderiza)* | — | — | El run **no midió** el sitio: cero filas `scope='site'` (run histórico o previo al flip). No puede decir "Verificado" porque no se midió. Se detecta por ausencia de filas en el run, NUNCA consultando el flag desde el cliente |
| partial | Acceso y presentación del sitio | los chequeos medidos con su resultado **más** una línea de menor peso: "No pudimos verificar: {check} — {reason}" | ninguna: la razón es del sitio auditado y no es accionable desde acá | ni sano ni roto; nunca al mismo peso visual que un hallazgo |
| error | Acceso y presentación del sitio | ningún chequeo se pudo medir: las 4 líneas "No pudimos verificar: {check} — {reason}" | reintentar con `[Correr auditoría]` de R0 — acción vigente, **no se duplica** dentro de la región | dominio inalcanzable; **jamás** se lee como sano. Si quien falla es el reader, la región no se renderiza: el error de página vigente cubre la pantalla y la región no inventa su propio error boundary |
| denied | *(la región no se renderiza)* | — | — | sin `growth.seo.observation.read` la page guard corta antes; la región no re-verifica permisos ni muestra mensaje propio |

🔴 **La distinción del último caso es la más fácil de romper y la más cara.** "Cero hallazgos de
sitio" tiene dos causas opuestas: *se midió y está sano* o *no se midió*. Renderizar ambas como
"Verificado" reintroduce el falso sano que TASK-1670 existe para cerrar, esta vez en la UI. Se
resuelve leyendo si el run trae filas `scope='site'`, no consultando el flag desde el cliente.

## Accessibility Contract

- Heading order: `h1` "Auditoría del sitio" → `h2` salud → **`h2` "Acceso y presentación del
  sitio"** → `h2` "Issues priorizados" → (drill) `h3`. La región nueva es hermana, no hija.
- Chart/table alternatives: N/A (sin gráficos nuevos).
- Aria labels: severidad con `aria-label` que incluye el label textual, igual que la lista
  vigente; el chip "Decisión declarada" **es texto**, no un icono con tooltip.
- Color-independent state labels: icono + label + color, hard rule heredada. El hallazgo de
  postura se distingue por **palabra** ("Decisión declarada"), no por matiz de color — que es
  justamente lo que un daltónico no vería.
- Focus notes: la región no captura foco al montar; sus filas no son interactivas (no hay drill),
  así que no entran al orden de tabulación como controles falsos.
- Reduced motion: sin animación de entrada propia.

## Desktop Target — 1440×900

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ R0  Growth / Search Visibility / SEO / Auditoría      Space ▾   [Correr]      │
│     Auditoría del sitio · berel.com     Último crawl: hace 2 días             │
├──────────────────────────────────────────────────────────────────────────────┤
│ R1  ╔══════════════════════════════════════════════════════════════════════╗ │
│     ║ SALUD DEL SITIO   95        banda severidad (filtro)   100 páginas   ║ │
│     ╚══════════════════════════════════════════════════════════════════════╝ │
├──────────────────────────────────────────────────────────────────────────────┤
│ R2  ╔══════════════════════════════════════════════════════════════════════╗ │
│     ║ Acceso y presentación del sitio                                      ║ │
│     ║ Lo que vale para todo el dominio, no para una página                 ║ │
│     ║ ─────────────────────────────────────────────────────────────────────║ │
│     ║ ⛔ Crítico  Los motores de IA no pueden leer el sitio  Todo el sitio ║ │
│     ║            En robots.txt · OAI-SearchBot, PerplexityBot y 3 más      ║ │
│     ║            {hint inline, una o dos líneas}                           ║ │
│     ║ ─────────────────────────────────────────────────────────────────────║ │
│     ║ ⓘ Decisión declarada  Entrenamiento bloqueado        Todo el sitio  ║ │
│     ║            En robots.txt · GPTBot, Google-Extended y 3 más           ║ │
│     ║            {hint de postura, NUNCA colapsado}                        ║ │
│     ║ ─────────────────────────────────────────────────────────────────────║ │
│     ║ No pudimos verificar: Mapa del sitio — el robots.txt nos prohíbe…    ║ │
│     ╚══════════════════════════════════════════════════════════════════════╝ │
├──────────────────────────────────────────────────────────────────────────────┤
│ R3  ╔══════════════════════════════════════════════════════════════════════╗ │
│     ║ Issues priorizados                                                   ║ │
│     ║ Ordenados por impacto y esfuerzo · problemas por página              ║ │
│     ║ ⛔ Error 4xx …………………………………… 12 páginas afectadas   [Ver →]         ║ │
│     ╚══════════════════════════════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Tres superficies `contained`, ninguna más.** R1 salud · R2 acceso · R3 issues. Es el techo del
  presupuesto de chrome, y por eso R2 no se parte en sub-cards por chequeo: sería card-on-card.
- **El first fold contiene la respuesta a la pregunta nueva.** En 1440×900 R2 entra completa o al
  menos su primera fila: si el acceso está cortado, el operador lo ve sin hacer scroll. Ése es el
  único cambio de jerarquía que esta task introduce, y es deliberado.
- **R2 vive entre salud y lista, no arriba de todo.** El health score sigue siendo la entrada de
  la pantalla; el acceso es la primera lectura *cualitativa* después del número.
- Las filas de R2 **no llevan afordancia de click**: no hay drill de URLs para un hallazgo de
  dominio, y un `[Ver →]` que no lleva a ninguna parte es una promesa rota.
- Sin rieles de color laterales ni tarjetas con franja: la severidad la porta el chip
  (icono + label + color), igual que en R3. Una segunda gramática visual para lo mismo haría que
  el operador crea que son dos sistemas distintos.

## Mobile Target — 390×844

```text
R0  Auditoría del sitio · berel.com
    hace 2 días              [Correr]

R1  ╔════════════════════════════════════╗
    ║ SALUD  95        100 páginas       ║
    ║ banda severidad (wrap)             ║
    ╚════════════════════════════════════╝

R2  ╔════════════════════════════════════╗
    ║ Acceso y presentación del sitio    ║
    ║ ────────────────────────────────── ║
    ║ ⛔ Crítico                         ║
    ║ Los motores de IA no pueden leer   ║
    ║ el sitio                           ║
    ║ Todo el sitio                      ║
    ║ En robots.txt · OAI-SearchBot y    ║
    ║ 4 más                              ║
    ║ {hint}                             ║
    ╚════════════════════════════════════╝

R3  Issues priorizados …
```

- **La fila se apila, no se comprime.** A 390px severidad, nombre, alcance y lugar van en líneas
  propias. Comprimir "En robots.txt · OAI-SearchBot, PerplexityBot y 3 más" en una línea produce
  truncado, y el lugar de detección es justamente lo que no puede truncarse: es la mitad que
  sostiene la credibilidad.
- **La lista de bots se acota siempre** (`{first} y {n} más`), en los dos viewports. No es una
  concesión de mobile: cinco tokens crudos no se leen en ningún ancho.
- `scrollWidth == clientWidth` obligatorio. El hint es texto que fluye, nunca `white-space: nowrap`.
- El chip "Decisión declarada" **no se abrevia** a 390px. Si no cabe, envuelve; abreviarlo lo
  devuelve a ser un "Info" genérico y pierde su única razón de existir.

## Action Hierarchy

Esta región es de **lectura, no de acción** — y declararlo es la decisión, no una omisión.

| Nivel | Acción | Dónde | Por qué acá |
|---|---|---|---|
| Primaria de la pantalla | `[Correr auditoría]` | R0 (vigente) | Sigue siendo la única acción primaria; esta task no le agrega competencia |
| Secundaria | Filtro por severidad | R1 banda (vigente) | Acota lo que se **lista** en R3 |
| Terciaria | `[Ver →]` drill de grupo | R3 (vigente) | Sólo para hallazgos de página: hay URLs que mostrar |
| **Ninguna** | **R2 no tiene acciones** | — | Un hallazgo de dominio no tiene URLs que abrir ni nada que configurar desde acá. La remediación vive fuera del portal (editar `robots.txt`, ajustar el WAF) |

🔴 Consecuencia de diseño que hay que sostener: **R2 no compite por la acción primaria**. La
tentación es agregarle un `[Cómo arreglarlo]` o un `[Ver detalle]`; ambos serían chrome que no
lleva a ninguna parte. El hint inline ES la remediación que podemos dar honestamente.

Nota sobre el filtro: el filtro de severidad de R1 acota **R3**, no R2. Un `?severity=critical`
no puede esconder un hallazgo de dominio `notice`, porque R2 no es una lista explorable sino un
veredicto — y ocultar la mitad de un veredicto lo convierte en otro veredicto.

## Visual Fidelity Mapping

| Cue | Token/patrón | Intent preserved | Literal rejected |
|---|---|---|---|
| severidad | `GreenhouseChip` + `theme.palette.{error,warning,info}` | continuidad con R3: un solo lenguaje de gravedad | riel de color lateral / card con franja |
| alcance del hallazgo | texto "Todo el sitio" en la posición del conteo | comparabilidad con "N páginas afectadas" | badge decorativo o icono de globo |
| postura ≠ defecto | label textual "Decisión declarada" | naturaleza, no prioridad | matiz de color distinto (invisible para daltónicos) |
| lugar de detección | `body2` + `text.secondary` bajo el título | credibilidad verificable por el cliente | tooltip (no viaja al artefacto de 1672) |
| "no verificado" | fila de menor peso, `text.secondary`, sin chip | ni sano ni roto | chip `notice` (lo igualaría a un hallazgo) |
| separación entre hallazgos | `Divider` de la receta | ritmo de lectura | card por hallazgo (card-on-card) |
| jerarquía de la región | `h2` + `Card` de la receta vigente | hermana de salud e issues | superficie con elevación propia |
| tipografía | Geist + variantes del theme | continuidad con la pantalla | `fontSize` inline |

## Implementation Mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/audit/page.tsx` (sin cambios de ruta,
  guard ni viewCode; sin entrada nueva en `route-reachability-manifest`).
- Primitives: reuse total de la receta vigente de `SiteAuditView.tsx`.
- Component candidates: `SiteAuditView.tsx` gana una función de render de la región 2. **Si esa
  función supera ~120 líneas, se extrae** a `SiteAuditSiteFindings.tsx` — el archivo ya está en
  970 líneas y no puede crecer sin frontera.
- Data reader / command: `readSiteAuditReport` **sin cambios de shape** — ya expone
  `findingScope` por finding (TASK-1670). Cero backend en esta task (`Backend impact: none`).
- Grouping: `groupAuditIssues` gana `scope` en `SeoAuditIssueGroup` y **excluye `affectedPages`
  del `priorityScore` cuando `scope === 'site'`**. La vista particiona; no agrupa dos veces.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_AUDIT.site` (nuevo) + fichas vigentes.
- Access / capability: sin capability nueva; hereda `growth.seo.observation.read`.
- API parity: sin superficie programática nueva. Los hallazgos ya viajan por el reader canónico,
  así que Nexa y el lane ecosystem los reciben por construcción desde TASK-1670.
- GVC markers: `seo-audit-site-findings` (nuevo). Los vigentes no se tocan.

## GVC Scenario Plan

- Quality profile: `premium`.
- Review dossier: `docs/ui/reviews/TASK-1671-site-findings/` — dossier generado con
  `pnpm fe:capture:review` sobre la corrida de esta task, requerido antes de la aceptación.
- Baseline decision: **repo-native**. La baseline es la superficie viva de `TASK-1309` en su
  estado actual; se promueve como nueva baseline sólo después de la aceptación del primer fold y
  del scorecard. No se rebaselina el gate visual sin declararlo en `BASELINE_DELTAS.md`.
- Scenario file: `scripts/frontend/scenarios/growth-seo-audit.scenario.ts` (extender, no crear).
- Route: `/admin/growth/seo/audit`.
- Viewports: desktop 1440×900 + 390×844.
- Required steps: cargar ruta con sesión de operador → mirar la región 2 → verificar que la lista
  de página sigue debajo y sin cambios → 390px.
- Required captures: `seo-audit-site-findings` en **densidad hallazgos** y en **densidad
  confirmación**; primer fold desktop y 390px.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, `scrollWidth == clientWidth` en ambos
  viewports, la fila de postura muestra su texto "Decisión declarada", ninguna fila de sitio
  contiene la cadena "páginas afectadas".
- Datos: el flag está OFF, así que **no hay hallazgos de sitio en la base**. La evidencia GVC se
  produce sembrando un run de prueba en local; si no se puede, se declara y el criterio de
  aceptación queda sin tildar. **No se tilda contra un mock de componente.**

## Design Decision Log

- Decision: región propia arriba de la lista, alimentada por el mismo agrupador (dirección C).
  Alternatives: fila en la lista con badge (A) · segunda lista (B). Why: A los hunde por
  construcción y "arreglarlo" exige un `affectedPages` sintético que miente sobre el alcance; B
  crea dos sistemas de orden que envejecen distinto. C respeta *"un solo sistema de hallazgos"* y
  resuelve el orden retirando el factor que no discrimina.
- Decision: el `priorityScore` de un grupo de sitio **no** usa `affectedPages`. Why: es constante
  (1) entre todos ellos, así que no aporta información y sí distorsiona; el orden real entre
  hallazgos de dominio es severidad ▸ valor ÷ esfuerzo.
- Decision: la región tiene tres densidades y **una sola posición**. Why: state-design — una
  región que aparece y desaparece hace saltar la página y erosiona la confianza en que se está
  mirando lo mismo que ayer.
- Decision: "Verificado" es un estado de resultado, **no** un `EmptyState`. Why: hasta hoy el
  silencio significaba "no lo miramos". Decir "lo miramos y está bien" es el entregable.
- Decision: distinguir "cero hallazgos porque está sano" de "cero hallazgos porque no se midió"
  leyendo las filas del run, no el flag. Why: el flag es server-side y multi-runtime; consultarlo
  desde el cliente sería a la vez imposible y la respuesta equivocada — lo que importa es si ESE
  run midió, no si la capacidad está encendida hoy.
- Decision: el hallazgo de postura lleva etiqueta **textual** propia. Why: a11y floor (el color no
  puede ser el portador) + la razón de producto: `notice` describe prioridad, no naturaleza.
- Decision: "dónde se detectó" es obligatorio en cada fila. Why: es la línea que impide que el
  cliente abra su `robots.txt` limpio y concluya que el informe miente — perdiendo el hallazgo y
  la credibilidad del resto.
- Decision: los conteos por severidad de la región 1 **siguen contando sólo página**. Why:
  mezclar rompe la relación parte-todo de la banda y el filtro `?severity=`, que acota lo que se
  lista y nunca lo que se cuenta.
- Reuse / extend / new primitive: **reuse total, cero primitives nuevas**. Open risks: sin datos
  reales (flag OFF) la evidencia GVC depende de sembrar un run local.
- Follow-up: `TASK-1672` consume esta partición para poner los hallazgos de sitio ANTES de la
  lista en el artefacto descargable. No se anticipa acá.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded (`{first}`, `{n}`, `{agents}`, `{check}`, `{reason}`).
- [ ] Partial/degraded states are explicit (verificado / hallazgos / parcial / sin medir).
- [ ] No copy implies a guarantee when data is estimated/stale (el "no medido" nunca dice sano).
- [ ] Charts have table/text alternatives (N/A — sin gráficos nuevos).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [ ] Design decision log explains reuse/extend/new before JSX starts.

## Token mapping

| Necesidad | Token / patrón | Nunca |
|---|---|---|
| Superficie de la región | `Card` + `CardContent` de la receta vigente (misma que salud e issues) | `Paper` con elevación propia; card dentro de card |
| Severidad crítica | `theme.palette.error` vía `GreenhouseChip` | HEX literal; riel lateral de color |
| Severidad aviso | `theme.palette.warning` vía `GreenhouseChip` | ídem |
| Severidad info / postura | `theme.palette.info` vía `GreenhouseChip` + label textual propio | distinguir la postura por matiz de color |
| Texto secundario (lugar, hint) | `color='text.secondary'` + variante `body2` del theme | `fontSize` inline; `opacity` sobre texto |
| Línea "no verificado" | `color='text.secondary'` + `caption`, sin chip | chip `notice` (la igualaría a un hallazgo) |
| Separación entre filas | `Divider` de la receta | borde manual; card por fila |
| Ritmo vertical | escala de spacing `4n` del theme | px sueltos |
| Tipografía | Geist + variantes del theme (`h2`, `body2`, `caption`) | DM Sans; `fontSize` inline |
| Motion | ninguno propio; la región no anima su entrada | transición de aparición que compita con el contenido |

## Anti-patterns

- 🔴 **Renderizar el hallazgo de postura igual que un defecto.** Mismo chip genérico "Info", hint
  colapsado en tooltip, o tono de alarma en el copy. Es el modo de falla más caro de esta
  pantalla: un `critical` percibido sobre una decisión legítima destruye la credibilidad del
  resto del informe.
- 🔴 **Decir "Verificado" cuando el run no midió.** "Cero hallazgos de sitio" tiene dos causas
  opuestas; colapsarlas reintroduce en la UI el falso sano que TASK-1670 cerró en el motor.
- 🔴 **Un `affectedPages` sintético** (por ejemplo, el total de páginas crawleadas) para que el
  hallazgo suba en el orden. Miente sobre el alcance para ganar posición.
- **Una segunda lista con su propio orden.** Dos listas de hallazgos obligan al operador a decidir
  cuál mirar primero y envejecen con reglas distintas.
- **Card por hallazgo** dentro de la región (card-on-card) o una card por cada uno de los 4
  chequeos. Card soup y cruce del presupuesto de chrome.
- **Riel de color lateral o tarjeta con franja** como lenguaje de estado: el repo ya porta la
  severidad en el chip, y una segunda gramática sugiere dos sistemas distintos.
- **Omitir el lugar de detección.** Sin "En robots.txt" / "En el borde", el cliente abre su
  archivo limpio y concluye que el informe miente.
- **Tooltip para el hint.** No viaja al artefacto descargable de `TASK-1672` ni al lector de
  pantalla con el mismo peso.
- **`[Ver →]` en una fila de sitio.** No hay URLs que listar: es una promesa rota.
- **Mezclar los hallazgos de sitio en los conteos por severidad de la banda** de la región 1:
  rompe la relación parte-todo y el contrato del filtro `?severity=`.
