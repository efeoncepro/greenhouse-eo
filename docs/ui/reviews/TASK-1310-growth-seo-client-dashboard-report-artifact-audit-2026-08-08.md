# TASK-1310 — Auditoría integral UI y plan premium

**Fecha:** 2026-08-08  
**Estado:** auditoría cerrada · implementación congelada hasta ejecutar el plan  
**Superficies:** `/growth/seo`, `/growth/seo/report` y `/growth/seo/report?print=1`  
**Tenant de evidencia:** Grupo Berel, sesión cliente local  
**Dirección objetivo:** producto analítico editorial, con rigor de Semrush y acabado de suite Adobe; sin card soup ni patrones genéricos de generación automática.

## 1. Alcance y método

Se revisó la UI visible y su contrato de interacción, no solo el componente que renderiza el gráfico:

- shell global, breadcrumb, encabezado, metadatos y CTA;
- navegación de sección y relación entre menú vertical principal y navegación SEO;
- resumen ejecutivo, KPI primario, cobertura y señales secundarias;
- evolución temporal, leyenda, tooltips, estado de datos escasos y tabla alternativa;
- mapa SEO × AEO, ejes, estados, distribución, solapamiento de puntos, tabla y cross-link;
- report web, versión imprimible, disclosure y consistencia entre adapters;
- copy, nomenclatura, fuentes, fechas de corte, jerarquía tipográfica y mensajes repetidos;
- focus, teclado, targets, nombres accesibles, semántica de charts/tables y reduced motion;
- desktop 1440 y móvil iPhone 13, overflow, densidad, ritmo y performance de captura;
- estados de locked, no organization, no GSC, no snapshots, error, parcial y ausencia de AEO mediante
  lectura de código y contrato de copy, aunque no todos tengan fixture GVC en esta corrida.

Se usaron los contratos de `greenhouse-ai-design-studio`, `modern-web-guidance`, `greenhouse-ui-review`,
`greenhouse-ui-enterprise-review`, `greenhouse-ux-content-accessibility`, `greenhouse-typography-accessibility`,
`greenhouse-microinteractions-auditor`, `motion-design`, `microinteraction-systems-architect`,
`greenhouse-browser-diagnostics` y `greenhouse-qa-release-auditor`. Modern Web Guidance se consultó con
telemetría deshabilitada para layout intrínseco, accesibilidad, legibilidad y layouts complejos.

## 2. Baseline verificable

Estas capturas son la evidencia actual. No se debe usar el scorecard anterior como prueba de acabado: fue
generado antes de la última ronda de cambios y contradice el estado observado aquí.

| Superficie | Evidencia | Resultado técnico | Lectura visual |
|---|---|---|---|
| Dashboard | `.captures/2026-08-08T10-25-07_growth-seo-client` | `exitCode: 1`; 2 violaciones axe de contraste en tabs y 15 warnings de targets de 23 px | Resumen contenido en una card decorada; evolución demasiado vacía; quadrant repetitivo |
| Report web | `.captures/2026-08-08T10-26-02_growth-seo-report` | `exitCode: 0`; 10 warnings de targets de 23 px; runtime limpio | Artifact correcto, pero repite la misma gramática de card + strip + módulos coloreados |
| Report print | `.captures/2026-08-08T10-26-35_growth-seo-report-print` | `exitCode: 0`; `qualityFindings: []`; runtime limpio | Es la superficie más sobria; conserva la estructura, pero necesita una relación de fechas/fuentes más clara |

Baseline de captura:

- dashboard: FCP aproximado 8.1 s, 856 nodos, 24.7 MB transferidos, heap aproximado 491 MB;
- report web: FCP aproximado 4.5 s, 1.175 nodos, 24.8 MB transferidos, heap aproximado 462 MB;
- print: FCP aproximado 4.6 s, 703 nodos, 21.5 MB transferidos, heap aproximado 322 MB.

Estos datos vienen de una corrida local de desarrollo con ECharts, fuentes y shell completos; sirven como
señal de riesgo y no como benchmark de producción. No se agregará una dependencia ni un segundo runtime de
charts para resolver un problema visual.

## 3. Veredicto

La UI está funcionalmente avanzada, pero no está lista para llamarse premium. La causa raíz es una gramática
de superficies todavía demasiado modular: cada bloque intenta demostrar importancia con borde, fondo, rail,
icono, color o elevación. El resultado tiene evidencia correcta, pero no una narrativa visual dominante.

Diagnóstico orientativo, escala 1–5, antes de la ejecución del plan:

| Dimensión | Baseline | Motivo |
|---|---:|---|
| Jerarquía | 2.8 | El h1 y el KPI existen, pero los bloques posteriores vuelven a competir por atención |
| Economía de superficies | 1.8 | Card principal + strip contenido + mini superficies + chart/table containers |
| Densidad y ritmo | 2.2 | Evolución desperdicia espacio; quadrant y report serializan demasiada información |
| Charts | 2.1 | Evolución casi no cuenta una historia con 8/90 días; quadrant apila puntos en x=45 |
| Tables | 2.5 | Semántica útil, pero zebra, chips y 50 filas producen muro operativo |
| Copy y provenance | 2.6 | Hay lenguaje honesto, pero títulos genéricos, repetición y fechas de fuentes mezcladas |
| Controls | 2.3 | CTA claro, pero leyendas pequeñas y disclosure sin `aria-controls` explícito |
| Typography | 2.6 | Demasiado overline/caps y auxiliares repetidos; en móvil la lectura se comprime |
| Color | 2.7 | Estados diferenciados, pero el color se repite en todos los niveles y pierde jerarquía |
| Responsive | 2.2 | En móvil el chrome fijo tapa el inicio de Evolución; report es demasiado largo para escaneo |
| Accessibility | 2.0 | Axe fallido en dashboard y targets de 23 px; charts necesitan una relación más explícita con su tabla |
| Motion | 1.9 | Hay animación técnica, pero no feedback de decisión; hover lift añade ruido |
| Coherencia report/dashboard | 2.8 | Comparten modelo, pero el report hereda la misma densidad en lugar de convertirse en artifact |

**Release gate actual: bloqueado.** Se desbloquea únicamente cuando la nueva evidencia GVC tenga captura limpia,
axe limpio, targets correctos, sin overflow y una revisión visual que confirme la dirección, no solo la ausencia
de errores.

## 4. Hallazgos por superficie

### 4.1 Shell, header y navegación

**Hallazgos**

1. La navegación SEO horizontal dentro de `CompositionShell composition='single'` respeta la restricción del
   usuario de no competir con el menú vertical principal. Esta decisión se conserva.
2. El documento de dirección y el wireframe todavía describen `masterDetail` y un rail SEO lateral. Hay drift
   documental: si no se corrige, el siguiente cambio volverá a introducir la composición equivocada.
3. El chrome fijo del portal tapa contenido en la captura móvil de Evolución. El dashboard no tiene el mismo
   inset superior que el report.
4. El encabezado combina eyebrow, h1, descripción, chip de fecha y CTA en una composición correcta, pero el
   chip de fecha y el CTA compiten más de lo necesario. La fecha no distingue Search Console de seguimiento de
   posición.
5. `tabler-sparkles` se usa como icono de Resumen y `tabler-sparkles-off` para ausencia de AEO. En el contexto
   de esta superficie eso se percibe como el lenguaje visual de tres estrellas que el usuario pidió retirar.

**Decisión de plan**

- Mantener una sola navegación SEO horizontal, con tabs reales y foco visible.
- Añadir un inset compartido y medible para el chrome fijo, sin hacks específicos de un frame.
- Definir la fecha como provenance por fuente; no mostrar una única fecha si las fuentes tienen cortes distintos.
- Usar `tabler-star` para la señal AEO y `tabler-star-off` para ausencia, y usar un icono de análisis para
  Resumen. No se cambia el icono de AEO global del producto fuera del alcance de TASK-1310.

### 4.2 Resumen / Evidence Narrative

**Hallazgos**

1. El resumen vive en una `Card` con tinte lavanda, rail verde, círculo decorativo y hover lift. Es la fuente
   principal de la sensación plana/genérica: la decoración no añade lectura y el hover no representa una acción.
2. El `SignalStrip` aparece como otra card blanca con tres rails, tres iconos dentro de tiles y tres columnas.
   Junto a la card principal forma una pila de contenedores que el usuario percibe como card soup.
3. El KPI primario mejoró al abandonar el gran fondo verde, pero sigue dentro de una superficie cromática y
   comparte el peso visual con el rail de señales.
4. La frase “La lectura empieza aquí” es genérica y no usa el dato que el usuario necesita decidir. Existe
   `titleWithPosition`, pero no participa en la jerarquía visible.
5. “Base medida 31” y “Atención 50” parecen contradictorios si se leen como un mismo universo. En realidad
   provienen de lectores/ventanas distintas: la UI no lo explica con suficiente precisión.
6. La leyenda “Medido · Search Console / Estimado · seguimiento de posición” está en el footer del resumen,
   lejos de los bloques que usan cada fuente.

**Decisión de plan**

- Convertir el primer fold en un único canvas editorial abierto: veredicto dinámico → métrica primaria → rail
  de evidencia → siguiente acción.
- El rail será una banda integrada, con separadores y color semántico solo en valores/rails; sin outer card,
  icon tiles repetidos ni sombra.
- El veredicto debe responder “qué pasa” en una frase con el dato actual y una segunda línea de contexto.
- Cada métrica debe llevar su fuente o agruparse por fuente; no mezclar conteos sin lineage visible.
- Mantener un solo CTA primario (`Ver informe`) y convertir acciones secundarias en links de texto.
- Eliminar círculo decorativo, `transform: translateY` y shadow hover en la superficie de evidencia.

### 4.3 Evolución

**Hallazgos**

1. El chart ocupa un canvas grande para un rango de 90 días, pero solo hay 8 días medidos y las últimas
   observaciones se concentran en posición 1. La mayor parte de la superficie es vacío sin explicación visual.
2. La UI dice que los huecos quedan visibles, pero solo los deja como espacio vacío. El usuario no distingue
   “sin medición”, “sin cambio” y “punto superpuesto”.
3. Se usan cinco series destacadas con cinco colores y estilos de línea; en un dataset escaso esto produce una
   leyenda más prominente que el dato.
4. La leyenda interactiva usa `ButtonBase` de 23 px de alto. GVC lo reporta repetidamente por debajo del mínimo.
5. “Ver datos de la evolución” tiene `aria-expanded`, pero no un `aria-controls`/panel explícito en el código
   observado. La tabla existe como fallback, pero la relación entre gráfico y tabla puede ser más semántica.
6. `areaStyle` y `markPoint` agregan ornamentación a un gráfico con una sola lectura efectiva; no aumentan la
   capacidad de decisión.
7. El título, subtítulo, coverage note, source note y chart stage label repiten la misma instrucción de lectura.

**Decisión de plan**

- Diseñar tres estados explícitos: historial suficiente, historial escaso y serie plana/superpuesta. No
  interpolar ni fabricar variación.
- En estado escaso, priorizar una línea temporal de observaciones reales y una banda de cobertura de 90 días;
  los días sin datos se representan como ausencia nombrada, no como un canvas vacío.
- En estado plano o superpuesto, mantener la posición exacta y explicar la concentración con un resumen de
  distribución; no introducir jitter que falsee la posición.
- Reducir el chart a una figura editorial con un solo caption visible y la tabla como alternativa asociada.
- Usar leyenda controlable con altura mínima de 36–44 px, foco visible y `aria-pressed`; mantener color + forma
  + nombre, pero quitar la apariencia de pills.
- Quitar el área rellena y los lifts; conservar solo una entrada sutil del chart y énfasis de hover/focus,
  anulados por reduced motion.

### 4.4 Quadrant 360 / Visibility Map

**Hallazgos**

1. La superficie actual contiene un callout de dominio, cuatro mini tarjetas de distribución, un contenedor
   de chart, una nota y una tabla con chips por fila. Es el caso más claro de card soup.
2. El chart repite color de quadrant en `markArea`, puntos, estados y chips. La paleta semántica deja de ser
   una señal y se convierte en wallpaper.
3. Los datos actuales tienen 47 keywords en Riesgo, 3 Invisibles y AEO=45 repetido. Los puntos se superponen
   cerca de x=45; el mapa correcto está mostrando baja varianza, pero la UI lo hace parecer un gráfico pobre.
4. La tabla de 50 filas domina la pantalla y cada fila repite un chip amarillo. El usuario pierde el foco de
   la lectura del dominio.
5. El CTA `Ver detalle de AEO` usa un botón outlined que compite con el mapa. La relación debe ser contextual,
   no un segundo CTA primario.
6. El texto “SEO y AEO son ejes distintos; no se promedian…” aparece como nota de chart y como copy cercano;
   puede ser una sola regla editorial con un tratamiento más discreto.

**Decisión de plan**

- Mantener el scatter como mapa ortogonal, pero convertirlo en una figura de evidencia, no en una tarjeta.
- Retirar fondos de cuatro cuadrantes y reservar tonos para puntos, estado de dominio y distribución.
- Reemplazar las cuatro mini tarjetas por una sola rail de distribución: cuatro columnas separadas por reglas,
  label + count + icono semántico, sin fondo ni radius individual.
- Tratar el estado del dominio como una línea de lectura con icono, label y explicación, no como callout con tile.
- Mostrar primero un excerpt priorizado de keywords y una acción “Ver las 50 keywords”; la tabla completa queda
  disponible mediante disclosure y en la versión imprimible.
- Sustituir chips por estado textual con icono/forma; el color queda secundario.
- Manejar concentración sin jitter: mostrar el valor exacto, el conteo de puntos y una lectura explícita de baja
  variación cuando corresponda.
- Convertir “Ver detalle de AEO” en link contextual con el icono de una estrella, no en botón competidor.

### 4.5 Report web

**Hallazgos**

1. El masthead es la parte más cercana al tono editorial, pero después vuelve a card de veredicto + SignalStrip
   + quadrant + evolución. El artifact deja de sentirse como informe y se vuelve dashboard largo.
2. En móvil se renderiza todo en serie: resumen, 50 filas del quadrant y evolución. Es legible al zoom de captura,
   pero no es una lectura ejecutiva eficiente.
3. La fecha del masthead usa `seo.asOfDate` (en la captura: 2026-08-05), mientras el chart de evolución muestra
   un último corte 2026-08-08. Es una inconsistencia de provenance que debe resolverse, no maquillarse.
4. El botón se llama “Descargar informe”, pero ejecuta `window.print()`. El comportamiento y el nombre no coinciden.
5. El estado `Lectura completa` usa chip; junto con el chip “Informe client-safe” suma dos cápsulas antes del
   contenido. Puede expresarse como metadata editorial.
6. El report web hereda el problema de targets de leyenda de Evolución y el mismo tratamiento de tabla extensa.

**Decisión de plan**

- Mantener masthead sobrio y convertir el cuerpo en un report editorial con secciones claramente separadas,
  no en cards apiladas.
- En web mostrar lectura ejecutiva, distribución resumida y excerpts; el detalle completo se abre con disclosure
  o se entrega en print/PDF.
- Resolver provenance por fuente: `corte Search Console`, `último seguimiento de posición` y, si aplica,
  `ventana AEO`. Nunca una sola fecha que parezca representar todos los lectores.
- Renombrar la acción a “Imprimir / guardar PDF” mientras el runtime siga siendo `window.print()`.
- Mantener el mismo model y adapters; la mejora es de composición y disclosure, no un fork de datos.

### 4.6 Report print

**Hallazgos**

1. Es la superficie más calmada porque ya eliminó charts vivos y gran parte de la ornamentación.
2. Su tabla de resumen, quadrant y evolución es útil, pero algunos encabezados están hardcodeados (`Keyword`,
   `SEO`, `AEO`, `Lectura`, `Fecha`) en lugar de salir del ledger de copy.
3. El attachment muestra una selección de 8 señales, mientras web intenta mostrar el detalle completo. La
   diferencia puede ser válida, pero necesita declararse como “señales prioritarias” y “detalle completo”.
4. La inconsistencia de fechas del web también afecta la confianza del attachment.

**Decisión de plan**

- Conservar el tratamiento sobrio y la tabla completa donde el formato lo permita.
- Hacer explícitas las secciones prioritarias/completas y usar el mismo copy/provenance del web.
- Añadir reglas de impresión: captions/headers repetibles, `break-inside: avoid` por sección y tablas sin
  contenedores redondeados.

## 5. Auditoría de copy, jerarquía y nomenclatura

### Problemas de contenido

- “La lectura empieza aquí” no es un veredicto: no informa del estado.
- “Search visibility 360”, “Visibility Map” y “Search Visibility 360” aparecen con capitalización/idioma
  mezclados. Se debe elegir una convención por rol: nombre de producto como marca; títulos y labels en sentence
  case.
- “Atención” no dice qué universo mide. Debe nombrar la señal y su fuente.
- La instrucción sobre posición invertida aparece demasiadas veces en Evolución y report.
- `reportReadout`, `report.summary` y la nota de metodología repiten la misma promesa. Una frase debe vender la
  lectura; otra debe explicar metodología.
- “Descargar informe” no describe el comportamiento real.
- Las leyendas de origen están lejos de las métricas y no están asociadas al chart de evolución.

### Reglas de copy para la ejecución

- Títulos: una promesa concreta, no una frase de ambientación.
- Subtítulos: una sola idea, máximo dos líneas en desktop y tres en móvil.
- Labels: sentence case; reservar overline para un único eyebrow por superficie.
- Métricas: label + valor + unidad/fuente; evitar “keywords” sin contexto cuando hay dos lectores.
- Estado: verbo o consecuencia (“Aún no hay medición”, “La conexión necesita atención”), no solo adjetivo.
- AEO: usar “citabilidad en IA” en la explicación; el icono único será estrella, nunca tres estrellas.
- Degradación: nunca convertir ausencia en 0 ni mezclar datos medidos y estimados.

## 6. Auditoría de accesibilidad, layout y motion

### Bloqueadores

- Axe detectó `color-contrast` 4.11:1 en el tab `Quadrant 360` contra `#f3f2f3`, por debajo del 4.5:1
  requerido para texto normal.
- El CTA report aparece en un frame con background indeterminado por overlap durante el probe de focus; hay que
  repetir el probe después de corregir el chrome/floating layer.
- GVC detectó botones de leyenda de 53×23, 103×23, 102×23, 109×23 y 77×23 px.

### Reglas de layout

- todo flex child que aloje chart/table debe permitir `min-inline-size: 0`;
- el scroll horizontal debe vivir en el `DataTableShell`, con `scrollbar-gutter: stable` y `overscroll-behavior:
  contain`, sin overflow de la página;
- el ancho de lectura debe ser editorial y no estirarse sin límite en report;
- el inset de chrome fijo se verifica con `scrollWidth === clientWidth` y con captura móvil real;
- no usar alturas rígidas para llenar vacío cuando el dataset es escaso;
- los headings y párrafos largos deben usar balance/pretty wrap cuando el sistema lo soporte.

### Reglas semánticas

- conservar `role=img` solo en el wrapper real del chart y relacionarlo con un caption visible y tabla/fallback;
- agregar `caption` a las tablas, aunque sea visually hidden cuando exista un heading visible;
- `aria-expanded` debe apuntar a `aria-controls` con un panel estable;
- no poner `aria-label` en un Box sin rol semántico;
- mantener color + texto + forma/icono en estados;
- foco visible, orden DOM lógico y restauración de foco al cerrar disclosure;
- reduced motion elimina entradas, desplazamientos, delays y animaciones de chart; no deja un estado “a medias”.

### Motion objetivo

Motion debe comunicar estado, no decorar superficies:

- entrada del contenido una sola vez, con distancia corta y token existente;
- cambio de tab con transición corta y estable, sin desplazar el layout completo;
- chart reveal únicamente cuando aporta orientación; sin área que “crece” como decoración;
- hover/focus resalta fila, serie o link; no levanta cards;
- progreso comunica cobertura y se desactiva en reduced motion;
- no se agrega una nueva librería ni una capa de animación paralela.

## 7. Dirección visual aprobada para ejecución

### Editorial Evidence Canvas

La familia tendrá una sola gramática: canvas abierto, evidencia agrupada por fuente, una decisión dominante,
color semántico contenido y disclosure progresivo.

1. **Dashboard:** veredicto primero, evidencia después, exploración al final.
2. **Quadrant:** mapa ortogonal memorable; la distribución explica el mapa, no lo duplica.
3. **Report:** artifact editorial; el lector puede compartirlo sin sentir que recibió un dashboard recortado.

La firma visual no será glass, gradiente, neón, sombras teatrales, círculos decorativos, pilas de cards ni una
pared de pills. El premium vendrá de composición, tipografía, proporción, provenance, estados y calidad del dato.

### Principios de decisión

| Principio | Aplicación |
|---|---|
| Una superficie, una responsabilidad | Una sección puede tener un canvas; no se anidan cards salvo que exista una interacción independiente |
| El dato manda | Si el dataset es escaso, la forma cambia y lo declara; no se rellena el vacío con decoración |
| Color con jerarquía | Tono fuerte para estado/acción; tonos suaves solo como apoyo; no repetir el mismo wash en cada nivel |
| Evidencia trazable | Fuente, ventana y fecha aparecen junto a la lectura que explican |
| Disclosure progresivo | First fold muestra síntesis; detalle completo queda accesible y verificable |
| AEO con una estrella | `tabler-star`/`tabler-star-off` dentro de TASK-1310; sin `tabler-sparkles` |
| Interacción honesta | Un control se ve accionable, tiene target suficiente y anuncia su estado |
| Movimiento con intención | Feedback breve y reversible; reduced motion es un estado de primera clase |

## 8. Plan de ejecución por lotes

La implementación queda congelada hasta este punto. Se ejecutará secuencialmente; si un lote falla su gate,
no se empieza el siguiente.

### Lote 0 — Reconciliación de contrato y tokens

- actualizar dirección visual, wireframe y task para eliminar `masterDetail`/rail SEO lateral;
- documentar la nueva decisión `single + tabs`, el símbolo AEO y la gramática de canvas abierto;
- cerrar el ledger de copy/provenance y definir nombres de fuente/ventana/fecha;
- revisar reuse/extend/new primitive; preferir `SignalStrip variant='integrated'`, `DataTableShell` y tokens
  existentes;
- no tocar API, readers, auth, menú vertical principal ni model compartido.

**Gate:** diff de contrato coherente, sin nuevos literales de diseño ni ADR innecesario.

### Lote 1 — Shell, header y resumen

- corregir safe-area/inset móvil del contenido;
- reemplazar hero card + círculo + hover lift por canvas abierto;
- convertir SignalStrip a rail integrada;
- hacer dinámico el veredicto y separar las fuentes de métricas;
- reducir overlines/chips y dejar un único CTA primario;
- migrar iconos de AEO a estrella única y Resumen a icono analítico;
- corregir contraste de tabs/CTA y estados de foco.

**Gate:** GVC dashboard desktop/mobile, axe 0, sin target <24 px, sin overflow, revisión visual del first fold.

### Lote 2 — Evolución y datos escasos

- implementar estados suficiente/escaso/plano sin interpolación;
- cambiar el stage a una figura con caption, coverage rail y ausencia nombrada;
- quitar area fill y ornamento que no comunique;
- rehacer leyenda con target mínimo y `aria-pressed` legible;
- enlazar toggle con tabla mediante `aria-controls`, caption y foco;
- mantener el chart lazy y reducir el costo DOM.

**Gate:** GVC de Evolución y tabla en desktop/mobile, datos exactos preservados, axe 0, lectura del gráfico
comprensible sin tooltip, reduced-motion verificado.

### Lote 3 — Quadrant y tabla priorizada

- convertir callout + cuatro mini cards en línea de dominio + rail de distribución;
- reducir washes, radius y repetición cromática;
- tratar concentración de puntos sin jitter ni score fusionado;
- mostrar excerpt priorizado y disclosure al detalle completo;
- reemplazar chips de fila por estado textual/iconográfico;
- convertir cross-link AEO en link contextual con estrella única.

**Gate:** GVC quadrant desktop/mobile, table scroll contenido, no overflow de página, sin dependencia de color,
tabla completa accesible y visualmente secundaria al mapa.

### Lote 4 — Report web y print

- aplicar la misma jerarquía al artifact sin volver a crear cards;
- hacer explícita la proveniencia por fuente y resolver el desfase 2026-08-05/2026-08-08;
- cambiar “Descargar informe” por el nombre real del comportamiento;
- usar excerpt en web y detalle completo en print/PDF con copy explícito;
- unificar captions/headers de tablas desde copy canónico;
- mantener el adapter print sobrio, con reglas de page break y sin contenedores redondeados.

**Gate:** GVC report web/print desktop/mobile, runtime limpio, captura sin warnings, coherencia de fechas y
lectura ejecutiva en el primer viewport.

### Lote 5 — Estados, interacción y motion

- capturar o verificar locked, no organization, no GSC, no snapshots, error, parcial y no AEO;
- probar navegación por teclado, foco de tabs, disclosure, scroll region y link AEO;
- verificar `prefers-reduced-motion`, hover/focus y ausencia de desplazamientos decorativos;
- revisar copy final contra sentence case, tuteo neutral y nomenclatura.

**Gate:** estados no inventan ceros, foco restaurable, axe 0, reduced motion estable, ningún estado queda con
jerarquía distinta o apariencia de error cuando es una ausencia esperada.

### Lote 6 — QA visual, performance y cierre

- ejecutar capturas GVC por escenario con sesión Berel local y tiempo acotado;
- inspeccionar manualmente cada frame desktop/mobile, no aceptar solo el JSON;
- revisar manifest: `qualityFindings: []`, `exitCode: 0`, runtime/hydration/http en cero, enterprise rubric pass;
- ejecutar lint/tests focales, `git diff --check` y `pnpm qa:gates --changed` con timeout acotado;
- no ejecutar build completo sin necesidad: el usuario pidió proteger el equipo y la baseline tiene alto
  consumo de heap;
- actualizar scorecard solo con evidencia nueva y dejar estado honesto en Handoff/task.

## 9. Loop GVC y criterio de aceptación final

Cada lote se valida con la misma secuencia:

1. ejecutar solo el escenario afectado con timeout acotado y la sesión Berel existente;
2. revisar desktop y iPhone 13: primer fold, scroll, chart, tabla, foco y estados;
3. leer el manifest y los JSON axe; cualquier error o warning de layout bloquea el lote;
4. verificar `scrollWidth === clientWidth` del documento y scroll horizontal únicamente dentro de tables;
5. ejecutar `git diff --check` y la validación focal proporcional;
6. registrar hallazgo, corregir causa raíz, repetir la captura y solo entonces avanzar.

La entrega se considera premium cuando:

- no hay card soup: cada canvas tiene una función y las agrupaciones se leen como una composición;
- el primer fold explica estado, significado, fuente y siguiente paso sin hover;
- Evolución no presenta un vacío ambiguo con pocos datos;
- Quadrant muestra el patrón real sin convertir la concentración en un gráfico falso;
- tablas son tranquilas, navegables, semánticas y progresivas;
- copy, fechas y fuentes son internamente consistentes;
- AEO usa un símbolo único y no tres estrellas;
- desktop y móvil se sienten diseñados para su viewport, no simplemente comprimidos;
- motion comunica transición/estado y desaparece correctamente con reduced motion;
- GVC termina con `qualityFindings: []`, axe limpio, runtime limpio, sin overflow y scorecard visual ≥4.5/5,
  sin dimensión por debajo de 4/5.

## 10. Límites explícitos

- No se reintroduce un menú SEO lateral que compita con el menú vertical principal.
- No se cambia el source of truth de SEO/AEO ni se fusionan ambos en un score.
- No se crea un endpoint para resolver una preferencia visual.
- No se modifica el model de report compartido salvo que la auditoría de fechas demuestre un contrato faltante;
  la primera opción es resolverlo en el adapter/copy.
- No se agregan dependencias pesadas, builds completos ni procesos sin timeout.
- No se promociona a staging/producción en este loop; el cierre será `code complete, rollout pendiente` si
  solo queda la promoción.
