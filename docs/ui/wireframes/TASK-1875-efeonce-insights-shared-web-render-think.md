# TASK-1875 — contrato visual de la vista web compartida de Insights (Think)

Diseño inicial 2026-09-15; **reescrito el 2026-09-28 para describir lo construido y aprobado** (dirección A,
«tablero de respuestas», web nativa). La versión anterior describía una página editorial larga con índice lateral
y primitivas `EditionMasthead`/`FactCallout`: el operador la rechazó al verla («el PDF con vida») y no se construyó.
Superficie pública SSR en `efeonce-think` (`think.efeoncepro.com/insights/r/<token>`), render tonto de
`InsightWebModelV1` (TASK-1848, `modelVersion` 1.x). Es el nodo S6 del master flow
`docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`.

- Visual direction mode: `source-led`
- Product Design asset: docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/desktop-first-fold.png
  (captura del runtime aprobado; el dossier completo vive en la misma carpeta, con su `README.md` y el scorecard
  `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think.scorecard.json`).
- Fuente de la dirección: canvas «Insights en vivo» aprobado por el operador el 2026-09-28
  (<https://claude.ai/artifact/EGh8K8eyKA8XNhETCQ1W4T>) y el loop posterior en localhost. El canvas vive fuera del
  repo; la fuente durable y verificable es el runtime (`efeonce-think`, ver Implementation Mapping) más el dossier.
- Norma de marca: `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` y línea gráfica «La órbita»
  (`docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md`); roles de color de datos de
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`; contrato de contenido en
  `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §6/§8.
- Scope: sólo la página compartida, su modo presentación y sus cuatro estados seguros. La biblioteca y el detalle
  autenticados son de TASK-1849.
- Targets: desktop 1440×900 · mobile 390×844 (quiebres de layout a 1000 px y 720 px).

## Desktop Target

Página web nativa sobre fondo oscuro de marca (token `orbita.ground`, `--ins-ground`) con interiores de lectura en
papel (`--ins-paper`). No es el PDF animado: abre con la respuesta, los hallazgos se exploran en su lugar y cada módulo
es una escena narrada. De arriba a abajo:

1. **Portada a pantalla completa** (`header.ins-hero`, `data-capture="masthead"`), oscura:
   - Barra: lockup «Efeonce | Insights» negativo (`/branding/insights/insights-lockup-negative.svg`,
     `axis-brand-assets` 0.4.0) + chips de estado del enlace: «Enlace vigente» (punto con pulso) y «vence el …».
   - Cuerpo: kicker (título del informe · período), **titular = la primera afirmación del resumen ejecutivo** en
     Bricolage grande, la bajada con el resto de las afirmaciones, «Preparado para» + logo del cliente cuando el
     modelo 1.1 lo trae (sobre una placa clara cuando `variant: 'default'`), y la meta: organización, código
     `EO-INS-…` y versión, «datos al …».
   - **Una sola órbita, la de acento** (`trajectory.accent`): anillo fino, arco de 50° (de 250° a 300°), esfera en
     la punta con su anillo «en vivo» y halo detrás. Queda fuera de la columna de texto. No hay órbita que mida:
     el modelo no declara una cifra de portada y el arco nunca decora un número.
   - Indicador de scroll (flecha a «Lo esencial del mes»).
2. **Banda de período abierto** (sólo si `asOfMax` es anterior al último día del período): navy, bajo la portada.
3. **Barra fija** (`nav.ins-topbar`, `position: sticky`): aparece compacta al salir de la portada. De izquierda a
   derecha: órbita pequeña que marca el avance de la lectura, filtros por módulo (pastillas «Todo» + un botón por
   módulo, `aria-pressed`), enlace «Plan» (si hay acciones), botón «Presentar», botón de ícono «Copiar enlace» y
   botón primario «Descargar» (sólo si hay una descarga disponible).
4. **«Lo esencial del mes»** (`section#hallazgos`, `data-capture="summary"`), oscura: grilla de hallazgos. El
   primero (lead) ocupa el ancho completo con la cifra en acento a gran tamaño; los demás van en pares. Cada
   hallazgo: chip de módulo, **cifra protagonista** (el `display` del primer hecho citado; «Sin dato» si el valor es
   nulo), la afirmación, y la procedencia (marca Medido/Estimado + fuente). Al abrirlo, la evidencia aparece
   **dentro de la misma tarjeta**, que pasa a ancho completo: conclusión, figura compacta, «Lo que significa» /
   «Próximo paso», ficha (métrica, fuente, fecha de corte) y acciones «Copiar enlace a este hallazgo» y «Cerrar».
   En un modelo v1 los hallazgos salen de las afirmaciones del resumen que citan hechos.
5. **Panel de decisión** «Para decidir en la reunión» (navy) con el texto `model.decision` y un enlace al plan.
6. **Una escena por capítulo** (`section.ins-scene`, `data-capture="chapter-<módulo>"`), sobre papel:
   - Cabecera: chip «01 · SEO», título del capítulo y su apertura (`chapter.opening`).
   - **Figura principal narrada** (la primera figura que tiene lectura): la figura queda fija a la izquierda
     (≈ 7/5 del ancho) mientras a la derecha avanzan los pasos — cifra principal con su bajada → conclusión (h3) →
     «Lo que significa» → «Próximo paso» (panel). La figura cambia de estado con cada paso. Debajo de la figura, la
     fila de procedencia: unidad, fuente(s), fecha de corte y marca Medido/Estimado.
   - **Figuras secundarias** como bloques alternados (texto e imagen cambian de lado): etiqueta de familia
     («Conversión», «Contra la meta», …), cifra, conclusión, significado y próximo paso.
   - Afirmaciones y hechos sueltos del capítulo (los que ninguna figura dibuja).
   - **Límites del capítulo** (`data-capture="limits"`), con el texto del modelo.
   - Capítulo sin cifras: una línea con el motivo; nunca un cero ni una figura vacía.
7. **Toda figura** (`ChartFigure`): título, leyenda cuando hay más de una serie o partes, interruptor
   «Gráfico / Tabla» (`aria-pressed`) y la tabla equivalente con `<caption>` y encabezados con `scope`. Grupos de
   barras con detalle al pasar o enfocar. Se dibuja en el servidor, sin librería de gráficos, en 15 familias:
   `bar`, `bar_grouped`, `bar_stacked`, `line`, `pie`, `donut`, `scatter` (series) y `bullet`, `gauge` (270°),
   `waterfall`, `funnel` (con tasas de paso «pasa el 53,7 %» desde `derived.funnelStepRates`), `heatmap`
   (intensidad por luminancia, cifra impresa en la celda), `waffle` (100 celdas, restos mayores sobre la suma de
   las partes, paridad con `waffleGeometry` del PDF), `venn_two` (áreas proporcionales) y `upset` (datos propios).
   Toda cifra impresa sale de `fact.display`.
8. **Plan de acción** (`section#plan`): contador grande de acciones, título, términos «Cómo lo mediremos»
   (`measurement`) y «Qué necesitamos de ustedes» (`ask`) en paneles navy, y la lista numerada de acciones con el
   chip del módulo de su primer hecho.
9. **«Cómo se midió»** (`section#metodologia`, `data-capture="methodology"`): `<details>` cerrado con metodología,
   límites de la edición y referencias.
10. **Descargas** (`section#descargas`, `data-capture="downloads"`): «Informe completo» (PDF A4) y «Presentación»
    (PDF 16:9). Disponible → botón «Descargar PDF» a `?descargar=<output>`; no disponible → el texto «No disponible
    en esta edición». Nunca un botón inerte.
11. **Footer compacto** (`data-capture="footer"`), oscuro: logo Efeonce de 200 px, eslogan en su bloque oficial
    («Empower your Growth», 12 px), contacto en una línea, y fila base con el aviso del enlace (personal, revocable,
    fecha de vencimiento) y la línea legal de confidencialidad con organización, código y versión.
12. **Modo presentación** (diálogo `role="dialog"` `aria-modal="true"`): el mismo modelo en láminas — portada,
    una por hallazgo, decisión, plan (máximo 5 acciones) y cierre (logo + eslogan). Barra inferior con pista de
    teclado, anterior / contador «n de N» / siguiente, «Salir de la presentación» y barra de progreso.

Estados a pantalla completa en la misma ruta (`StatusScreen` del hub, con Nexa y la marca): `not_found` (404),
`gone` (410), `rate_limited` (429) y `error` (502). Ninguno muestra organización ni código de informe.

## Mobile Target

390×844. Portada a `100svh` con la órbita reducida (340 px) arriba a la derecha y el cuerpo del texto debajo; sólo
el primer chip de estado; sin indicador de scroll. Kicker en dos líneas. La barra fija baja a 56 px y sólo muestra
la órbita de avance y los filtros, que se desplazan en horizontal dentro de su carril (nunca la página). Las
acciones de la barra se mudan a un **dock fijo inferior** con «Copiar enlace» y «Descargar» (primario); la página
reserva 76 px al final para que el footer quede completo sobre el dock. Hallazgos en una columna. Escenas en una
columna: la figura deja de ser fija y los pasos se leen de corrido debajo, todos visibles. Bloques secundarios en
una columna. Bullet, embudo y heatmap reacomodan su grilla; el footer se centra y el contacto va en columna. El
aviso de copia es un toast sobre el dock. `document.documentElement.scrollWidth === clientWidth` obligatorio,
también con el fixture extremo (textos y cifras largas, nueve hallazgos).

## Action Hierarchy

1. **Leer la respuesta** (portada) y **abrir un hallazgo** para ver su evidencia.
2. **Recorrer las escenas** por módulo; filtrar por módulo desde la barra.
3. **Presentar** en una reunión (modo presentación).
4. **Descargar** el PDF disponible (primario en barra y dock; también en la sección de descargas).
5. **Copiar enlace** (a la página o a un hallazgo, `#h-<claimId>`).
6. Cambiar entre gráfico y tabla; abrir «Cómo se midió».

Sin CTA comercial: el destinatario ya es cliente. Sólo los estados `not_found` y `gone` ofrecen «Escribir a
Efeonce» como salida.

## Visual Fidelity Mapping

- **Color, curvas y duraciones**: todo sale de `efeonce-think/src/lib/insights-tokens.ts` (línea «La órbita»,
  valores 1:1 de `@efeoncepro/axis-tokens` 0.3.23 y `axis-brand-assets` 0.4.0) como variables `--ins-*`; ningún
  componente del informe escribe un HEX ni una curva propia (las duraciones de coreografía larga viven en
  `insights.css`, ver el contrato de motion). El informe NO usa la paleta del Grader.
- **Roles de dato**: actual = navy sobre papel / teal sobre oscuro; anterior = teal profundo sobre papel /
  periwinkle sobre oscuro (`dataRoles`); actual y anterior también se separan por luminosidad.
- **Acento**: nunca en texto bajo 24 px (las etiquetas de familia usan tinta suave); los segmentos apilados sólo
  llevan etiqueta interior en series oscuras y la del segmento superior va sobre la columna (AA).
- **Tipografía**: Bricolage Grotesque (idea: titular, cifras) y Poppins (estructura), cifras tabulares; siete
  archivos de fuente (123 KB).
- **Órbita**: anatomía de `orbitMeasure` (`trajectory.accent`, estela de 50°, halo 1,86 R) escalada por ancho;
  una sola órbita a la vista (la de la portada, que luego reaparece pequeña en la barra).
- **Marca**: lockup Insights y logo Efeonce oficiales en negativo en pantalla y positivo en impresión; eslogan con
  sus pesos oficiales.
- **Figuras**: geometría de `insights-chart-geometry.ts` con las mismas convenciones que `chart-geometry` de los
  PDF (TASK-1847/1889); fidelidad semántica (mismos hechos, ejes y unidades), no de píxel.
- **Estados**: `StatusScreen` del hub sin cambios. **Iconografía**: trazo mínimo propio, todavía no el set «Trazo»
  de AXIS (deuda declarada).

## Copy Ledger

Chrome del hub en `efeonce-think/src/lib/insights-copy.ts`, dos diccionarios con la misma forma: `INSIGHTS_COPY`
(es-CL, tuteo) y `INSIGHTS_COPY_EN` (en-US). La página elige por `model.locale` (por defecto es-CL) y `<html lang>`
lo sigue. Claves principales (es-CL):

- Portada y estado: `linkActive` «Enlace vigente», `expiresShort` «vence el {fecha}», `preparedFor` «Preparado
  para», `editionValue` «{código} · versión {n}», `dataAsOf` «datos al {fecha}», `periodPartial` «Período abierto:
  la fuente aún no cerró este período.», `periodPartialDetail`.
- Barra y dock: `filterAll` «Todo», `filterPlan` «Plan», `present` «Presentar», `copyLink` «Copiar enlace»,
  `downloadShort` «Descargar», `linkCopied` «Enlace copiado», `filtersLabel`, `dockLabel`, `statusLabel`.
- Hallazgos: `findingsTitle` «Lo esencial del mes», `findingsLead` «Toca un hallazgo para ver su evidencia.»,
  `findingOpen` «Ver evidencia», `findingClose` «Cerrar», `copyFindingLink` «Copiar enlace a este hallazgo»,
  `noEvidenceChart`, `decisionTitle` «Para decidir en la reunión».
- Escenas y figuras: `moduleLabel` (SEO / Respuestas de IA / Entrega creativa), `familyLabel` (15 familias),
  `meaningTitle` «Lo que significa», `nextStepTitle` «Próximo paso», `viewChart` «Gráfico», `viewTable` «Tabla»,
  `viewSwitch`, `funnelRate` «pasa el {tasa}», `provenanceUnit`/`provenanceSource`/`asOf`, `observed` «Medido»,
  `estimated` «Estimado», `absent` «Sin dato», `absentReason`, `limitsTitle`, `chapterEmpty`, `chartTableOnly`.
- Plan, metodología y descargas: `planTitle` «Plan de acción», `planLead`, `measurementTitle` «Cómo lo
  mediremos», `askTitle` «Qué necesitamos de ustedes», `howMeasured` «Cómo se midió», `howMeasuredLead`,
  `downloadsTitle`, `downloadLabel`, `downloadFormat`, `downloadCta` «Descargar PDF», `downloadUnavailable`.
- Presentación: `presentLabel`, `presentHint` «Flechas para avanzar · Esc para salir», `presentPrev`,
  `presentNext`, `presentCounter` «{n} de {N}», `presentExit` «Salir de la presentación».
- Pie: `linkNotice` «Este enlace es personal y puede revocarse.», `linkExpires` «Vence el {fecha}.»,
  `confidential`.

Todo lo editorial (afirmaciones, lecturas, decisión, plan, límites, metodología, referencias, etiquetas de
métricas) viene escrito en el modelo y NO se reescribe en Think.

## State Copy

| Estado | Cuándo | Copy visible | Recuperación |
| --- | --- | --- | --- |
| ready | `200` con el modelo completo | La portada con la respuesta del mes; todo el chrome de arriba | No aplica: lectura, filtros, presentación y descargas |
| loading | Nunca hay spinner: SSR entrega el HTML completo | Ninguno; el motion sólo arma lo que ya está pintado | Si el JS no monta en 3 s se retira el motion y la página queda completa |
| empty | Capítulo sin cifras, hallazgo sin figura propia | «Este capítulo no tiene cifras en esta edición.» o el motivo del modelo; «Este hallazgo no tiene una figura propia en esta edición.» | Ninguna acción: el motivo es la respuesta |
| partial | `asOfMax` anterior al cierre del período; una descarga sin archivo | «Período abierto: la fuente aún no cerró este período.» + «Las cifras son las del corte indicado y no se actualizan solas.»; «No disponible en esta edición» | La descarga pedida sin archivo redirige con 303 al informe, que muestra el estado real |
| error | Greenhouse 5xx, red caída o `modelVersion` mayor no soportada → 502 | «No pudimos cargar el informe.» + «Intenta de nuevo en unos minutos.» | Recargar más tarde; sin nombre del cliente ni código |
| denied | Token desconocido, expirado, malformado o flag OFF → 404 (indistinguible) | «Este enlace no existe o expiró.» + «Pide un enlace nuevo a quien te lo compartió.» | CTA «Escribir a Efeonce» (correo de ventas) |
| gone | Grant revocado o edición retirada → 410 | «Este informe fue retirado.» + «Si necesitas una versión vigente, pídela a tu contacto en Efeonce.» | CTA «Escribir a Efeonce» |
| rate_limited | Límite de lecturas → 429 | «Demasiadas lecturas en poco tiempo.» + «Intenta de nuevo en unos minutos.» | Esperar y recargar |

`denied` y `gone` son los estados de permiso de esta superficie: el token es la autorización y Greenhouse la valida
en cada request. El copy en inglés sigue la misma tabla desde `INSIGHTS_COPY_EN.states`.

## Accessibility Contract

- Skip link «Saltar al contenido» a `#hallazgos`. Jerarquía: h1 = titular de la portada; h2 = «Lo esencial del
  mes», cada capítulo, el plan y descargas; h3 = conclusiones de figuras. Los h2 de destino llevan `tabindex="-1"`.
- Hallazgos: botón con `aria-expanded` + `aria-controls` hacia una `region` rotulada; Escape cierra y devuelve el
  foco al botón del hallazgo.
- Filtros: `role="group"` rotulado, botones con `aria-pressed`. Interruptor gráfico/tabla: grupo rotulado con
  `aria-pressed`. Sin JS se ven gráfico y tabla a la vez.
- Figuras: tabla equivalente con `<caption>`, `scope="col"` y `scope="row"`; waffle y Venn con `role="img"` y
  `aria-label` que resume las partes; los detalles de barra aparecen al pasar **o al enfocar**, nunca sólo al pasar.
- Presentación: `role="dialog"` + `aria-modal`, foco atrapado con Tab/Shift+Tab, contador en `aria-live="polite"`,
  láminas no visibles con `aria-hidden` + `inert`, foco devuelto al botón que la abrió.
- Toast de copia en `role="status"` + `aria-live="polite"`. Dock rotulado.
- Contraste AA medido contra el fondo efectivo (4,5:1; 3:1 desde 24 px o 18,66 px en negrita) en 1440 y 390, con los
  fixtures completo y extremo (`scripts/audit-insights-a11y.mjs`): todo AA. Recorrido con Tab: entre 64 y 71
  paradas según fixture y viewport, todas con foco visible y sin trampas.
- `prefers-reduced-motion: reduce`: toda la interacción, ninguna animación, contenido idéntico.
- Marcas Medido/Estimado por forma (anillo lleno o punteado) y texto, nunca sólo por color.

## Implementation Mapping

- Ruta: `efeonce-think/src/pages/insights/r/[token].astro` — SSR, `prerender = false`; cabeceras
  `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`;
  `BaseLayout` con `analytics={false}` (sin GTM, `meta referrer no-referrer`), `canonical="/insights"` genérico e
  imagen OG `/branding/insights/og-insights.png` sin datos del informe.
- Cliente: `efeonce-think/src/lib/insights.ts` → `fetchSharedInsightEdition(token)` contra Greenhouse
  `GET /api/public/insights/shared/[token]` (TASK-1848), acepta `modelVersion` 1.x; cabeceras server-side
  `x-efeonce-think-key` (`GREENHOUSE_THINK_KEY`, excepción del guard de ráfagas del WAF, TASK-1876) y
  `x-vercel-protection-bypass` (`GREENHOUSE_API_BYPASS`, sólo staging). Fixtures `fixture-*` sólo en `astro dev`.
- Proxies en la misma URL, para que el HTML nunca escriba el token: `?descargar=report_pdf|deck_pdf` →
  `fetchSharedInsightOutput` (303 al informe si no hay archivo) y `?logo=1` → `fetchSharedInsightLogo` (mismo gate
  del token; 404 si no hay). «Copiar enlace» arma la URL desde `location` en el navegador.
- Vista: `src/lib/insights-view.ts` (`buildFindings`, `findEvidence`, `buildModules`, `splitSummary`,
  `chartFactIds`) — selecciona y agrupa, nunca crea cifras ni textos.
- Componentes: `src/components/insights/ChartFigure.astro` (15 familias + tabla + interruptor),
  `ModuleScene.astro` (escena por capítulo), `FactMark.astro` (Medido/Estimado); reuse `StatusScreen`
  (`src/components/primitives/StatusScreen.astro`).
- Geometría: `src/lib/insights-chart-geometry.ts`. Tokens: `src/lib/insights-tokens.ts`. Copy:
  `src/lib/insights-copy.ts`. Interacción y motion: `src/scripts/insights-report.ts`. Estilos:
  `src/styles/insights.css`. Marca: `public/branding/insights/*`.
- Datos: sólo el modelo; sin commands. Paridad con el portal (TASK-1849) por construcción: el modelo web es
  proyección de los mismos DTOs.
- Estados implementados: ready, período parcial, capítulo vacío, hallazgo sin figura, descarga no disponible, v1 sin
  campos editoriales v2, en-US, extremo, not_found, gone, rate_limited, error, móvil, movimiento reducido,
  presentación e impresión.

## GVC Scenario Plan

- Quality profile: `premium`.
- Herramienta: el hub no usa el DSL GVC de Greenhouse. `efeonce-think/scripts/capture-insights-report.mjs`
  (Playwright, desktop 1440×900 y mobile 390×844, `prefers-reduced-motion: reduce` para ver el estado final) contra
  `astro dev` en el puerto 4331 con los fixtures del modelo 1.1.
- Capturas (34): `first-fold`, `summary`, `finding-open`, `chapter-figure`, `chapter-table-open`, `chapter-aeo`,
  `chapter-ico`, `partial-first-fold`, `limits`, `downloads`, `downloads-unavailable`, `status-not-found`,
  `status-gone`, `status-rate-limited`, `status-error`, `footer` × 2 viewports, más `present-cover` y
  `present-finding` en desktop.
- Marcadores `data-capture`: `masthead`, `summary`, `chapter-seo|aeo|ico`, `limits`, `methodology`, `downloads`,
  `footer`.
- Assertions (`scripts/verify-insights-report.mjs`, «Todo verde»): HTTP por fixture (200/404/410/429/502),
  cabeceras no-store/noindex/no-referrer, el HTML nunca contiene el token ni la ruta del lector, sin GTM, cifras
  del modelo impresas tal cual, «Sin dato» en vez de cero, banda de período abierto, modelo v1, descarga sin archivo
  → 303, en-US, logo 200/404, tasas del embudo, interacción (hallazgo, `aria-expanded`, filtro), presentación con
  teclado y foco devuelto, impresión, logos de impresión ocultos en pantalla.
- Scroll-width: `scrollWidth - clientWidth === 0` en 1440 y 390, con y sin movimiento reducido, antes y después de
  interactuar, y con el fixture extremo.
- Accesibilidad: `scripts/audit-insights-a11y.mjs` (contraste AA y recorrido con Tab en 1440 y 390).
- Unitarias: `tests/insights.test.ts` (14 pruebas: vista, evidencia y geometría de las 15 familias).
- Review dossier: `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/` (README con la
  reproducción) y scorecard `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think.scorecard.json`
  (promedio 4,56; piso 4,3 en iconografía; veredicto `pass-local`).
- Baseline decision / surface ID: `think.insights.shared`, superficie nueva sin baseline previa; el dossier del
  2026-09-28 es la primera baseline. Se compara con el Grader sólo por consistencia de marca, no por igualdad.

## Design Decision Log

- **Dirección A, web nativa** en vez de la página editorial con índice lateral: el operador rechazó la primera
  versión al verla («el PDF con vida»). La portada responde la pregunta del mes, «Lo esencial» se abre como
  evidencia y cada módulo es una escena narrada.
- **Más impacto a pedido del operador**: portada a pantalla completa con la órbita, cifras grandes y
  scrollytelling en la figura principal de cada módulo.
- **Una sola órbita, la de acento**, porque el modelo no declara una cifra de portada que la órbita pueda medir; la
  misma órbita reaparece pequeña en la barra y ahí sí mide el avance de la lectura.
- **Todas las familias en la narrativa** (a pedido): las 15 familias de TASK-1845 y TASK-1888 con las convenciones
  de geometría de los PDF; el waffle reparte las 100 celdas por restos mayores sobre la suma de las partes.
- **Evidencia dentro de la tarjeta**, no en un modal ni en otra tarjeta: evita card-on-card y deja un enlace
  directo por hallazgo.
- **Footer compacto** a pedido: logo, eslogan oficial, contacto y una fila base.
- **Descarga ausente en un fixture es deliberada**: la edición no la trae; se muestra «No disponible en esta
  edición», no es una capacidad faltante.
- **Acento nunca en texto bajo 24 px**; etiquetas de familia en tinta suave; etiquetas de segmentos apilados sólo
  dentro de series oscuras y la del segmento superior sobre la columna, para sostener AA.
- **La impresión es respaldo**: el PDF descargable es el camino optimizado para imprimir; la hoja de impresión sólo
  garantiza logos en positivo, sin transiciones, tablas visibles y sin controles.
- **Fuentes recortadas** a siete archivos (123 KB).
- **`no-store` y resolución por request**: revocar revoca en la lectura siguiente; el token nunca va al HTML, a
  analytics ni al Referer.
- Alternativas descartadas: vista dentro del portal con sesión (operador, 2026-09-15), PDF embebido (no responsive
  ni revocable en vivo), dashboard con filtros de período (la edición es congelada), página editorial con índice
  (rechazada por el operador el 2026-09-28).

## Lo que este contrato no cubre

- La prueba contra una edición real de staging con un enlace sintético: las capturas y verificaciones usan
  fixtures del modelo 1.1. Queda pendiente y necesita autorización del operador.
- El set de íconos «Trazo» de AXIS: deuda compartida con los catálogos PDF, se adopta en una tarea propia.
- La paridad visual con el portal autenticado (TASK-1849): sólo la paridad de datos, por construcción.
