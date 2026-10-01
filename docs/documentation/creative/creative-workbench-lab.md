# Creative Workbench — Design System Lab

Tipo: documentación funcional. Corte: 2026-10-01. Cliente del snapshot: `sky-airline`.
Estado publicado, hashes y pendientes: [continuidad vigente](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md).
Uso: [manual del Lab](../../manual-de-uso/creative/usar-creative-workbench-lab.md).

## Propósito y alcance

El Lab es la biblioteca del Design System de SKY como cliente de Efeonce. Presenta el sistema,
sus decisiones y referencias para consultar, comparar y preparar producción. Su identidad visible
es Efeonce | SKY; los títulos nombran bibliotecas y tareas del equipo. Las tarifas, fechas y legales
embebidos en referencias siguen siendo históricos y requieren validación para una campaña nueva.

La modernización integral PR16 y la corrección de selectores PR17 conservan las cinco rutas del
snapshot y el contrato marca → composición → receta versionada → adaptación → corrida. El Lab
inspecciona referencias admitidas; jobs, producción por lotes y aprobación humana siguen en sus
carriles propios. Otro cliente requiere su pack y snapshot admitidos.

## Bibliotecas y revisión

| Superficie | Qué permite y qué conserva |
| --- | --- |
| Vista general `/` | Relato del sistema, composiciones paginadas, recetas, cuatro muestras propias revisadas y acceso a adaptaciones. La portada usa artwork real completo. |
| Composiciones y recetas | Biblioteca por entidad; detalle de receta con pasos, componentes y variantes propios. El diálogo devuelve el foco al origen; ampliar una pieza conserva el contexto de la receta. |
| Adaptaciones `/#adaptaciones` | 126 referencias originales, búsqueda por destino/formato/dimensiones, filtro por familia y carga progresiva. Orden de lectura y proporción nativa conservados. |
| Inspector `/#pieza=<formatId>` | Variantes de la receta a la izquierda, original completo sobre navy al centro y zonas/campos propios a la derecha. Retorno conserva búsqueda/scroll; descarga obtiene el original. |
| Tokens `/tokens/` | 108 tokens del cliente: paletas, búsqueda, filtro por colección, valores/aliases y copia con procedencia. Primitives 27, Semantic 33 y Typography 48. |
| Tipografía `/tipografia/` | Cinco muestras Metric trazadas a SVG desde caras verificadas; los binarios privados no se distribuyen. |
| Recursos `/recursos/` | Recursos admitidos y relaciones con componentes/composiciones/recetas. Un módulo semántico no se confunde con un logo oficial. |
| Guía `/lab-guide/` | Recorrido funcional del Lab y límites de referencia/producción. |
| Íconos `/iconos/` — unidad local | 101 familias SKY, 1.919 variantes por kind/tamaño y archivo de 303 originales/alternativas; búsqueda, SVG y selector para agentes. Candidatos separados del pack; no admite recursos al producir. |

La sexta página es una extensión local posterior al snapshot PR17 publicado. Su
presencia en localhost no acredita disponibilidad en Vercel. Recursos y navegación
la enlazan en el build nuevo; su estado/cobertura se leen en
[continuidad vigente](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md).
Los SVG conservan color/geometría SKY, mientras controles y tipografía usan Efeonce.
No se atribuye licencia abierta ni aprobación de campaña a la importación.

La mesa seleccionada en Product Design, opción 2, continúa como tres regiones de trabajo.
Las variantes vienen de la receta admitida; compartir destino o dimensiones no crea esa relación.
Zonas ausentes no heredan contenido ni legal. El contorno opcional muestra geometría real sin
modificar el PNG descargable. La UI móvil pone el original antes del inspector y ofrece variantes
horizontales, sin cortar artwork para llenar una tarjeta.

## Identidad, tokens y superficies

Bricolage Grotesque estructura títulos del host y Poppins lectura y controles. Sus cinco WOFF2
locales están admitidos con licencia OFL. Logo, formas y roles Efeonce proceden de la proyección
AXIS sellada; `host-theme.css` materializa sus roles en el pipeline de la app. El host no añade
firma, color o fuentes Efeonce al artwork SKY ni sustituye los 108 valores cliente. Metric y
recursos SKY conservan su pack/licencia/admisión propios.

El criterio vigente v5/v6 usa un panel por tarea y cards de entidades seleccionables. Interiores de
recetas, disclosures, campos, fuentes y metadatos se leen en filas, espacio y divisores; no se añade
una card por dato. Chevron, acciones y campos tienen margen interno. Una receta modal ya contiene
su contexto y sus variantes no reciben otro envoltorio redundante.

## Menús abiertos y accesibilidad

V6 completa los dos selectores existentes: familias y colecciones. `FilterSelect` comparte un panel
host con filas de 44 px, nombre, conteo real y check de selección. El popover usa la capa superior
nativa, mide el viewport, permite scroll y cambia de lado si falta espacio; en móvil familia ocupa
su fila completa. El select original conserva valor y eventos para los filtros existentes.

Flechas, Home/End y búsqueda por texto navegan sin aplicar el filtro hasta Enter/Espacio. Escape
cancela; Tab cierra y avanza; clic exterior cierra; reset sincroniza valor/texto/selección. El foco
permanece en el combobox con el estado activo anunciado. Sin JavaScript o Popover API permanece
el select etiquetado del navegador; el inventario HTML completo sigue accesible.

## Coreografía y estabilidad

GSAP/ScrollTrigger compone el hero y una escena de tres originales al bajar, mediante scroll
nativo. La escena completa requiere ancho superior a 1050 px y altura mínima de 650 px. Móvil
mantiene una presentación compacta y `prefers-reduced-motion` elimina el ensamblaje y las entradas.
El cambio de preferencia revierte el contexto; entrar al inspector también revierte la escena.

Las bibliotecas permanecen estables: no entradas por cada card/fila, loops ambientales ni refresh
global al abrir un desplegable. Modal y menú tienen sólo una transición local; reduced motion la
elimina. Sin JS el contenido está visible, recetas como disclosure y galerías como grid natural.
La evolución v3/v4 con más envoltorios se conserva como historia; no es el criterio visual vigente.

## Publicación y fuentes canónicas

El corte v6 está en [Vercel protegido](https://creative-workbench-sky.vercel.app/), PR17/main
`7e4c617`. Evidencia de build, CI, protección, readback remoto y navegador:
[auditoría v6](../../audits/creative-workbench/2026-10-01-lab-premium-v6-documentation-closure.md).
La publicación no habilita acceso anónimo, IA, Efeonce ID ni nuevos Packages. El dominio
institucional previsto `creative.efeonce.org` necesita su verificación independiente.

La implementación activa pertenece al repo Workbench: `docs/architecture/workbench-lab-navigation.md`,
`docs/architecture/workbench-lab-efeonce-host.md`, `docs/ui/visual-directions/workbench-surface-economy-v5.md`,
`docs/ui/visual-directions/workbench-filter-selects-v6.md` y `docs/ui/motion/workbench-premium-v2.md`.
Greenhouse conserva este router funcional y la skill de enseñanza; no duplica el renderer ni sus
valores CSS. Pendientes de distribución, licencias, IA y auth: matriz del estado vigente.
