# TASK-2007 — Dirección de primitivas de producto AXIS

## Visual Direction Contract

- Visual direction mode: repo-native-benchmark
- Source: `../axis-design-system/apps/lab/src/components/FormsReference.astro`, `FormsShowcase.ts`, `FormsExamples.ts`; tokens `axisForms` y botones vigentes.
- Desktop target: 1440 × 1000; mobile target: 390 × 844, estrés 320 px.
- Action hierarchy: label → valor elegido → contexto secundario → acción; una acción principal por composición. No alterar la identidad existente.
- Visual fidelity mapping: conservar alturas, tipografía, colores, foco y densidad de Forms; media ocupa el slot de icono, con fallback textual. Popups reutilizan el posicionador top-layer vigente.
- Composición: cabecera editorial existente; selector enriquecido y resultado; formulario de preferencias con feedback; colección pequeña con filtros y paginación; disclosure CTA. Una columna móvil, contenido largo envuelto.

## State Inventory

Default, loading, empty, error/retry, disabled, selección conservada entre resultados remotos, imagen rota, required, reset cancelado, RTL, reduced motion. No acciones de negocio ni permisos propios; consumidor gobierna autorización y servidor.

## Implementation Mapping

- AXIS contracts/forms.ts: opción serializable con media y grupos.
- AXIS primitives: Select/Combobox existentes extendidos; componentes React de feedback/disclosure/selección múltiple/tabs, fecha/rango nativos y archivo nativo.
- AXIS registry/capabilities.ts: disponibilidad por export y set compatible; Lab proyecta el mismo inventario.
- Lab: composiciones con exports reales y copy local de demostración. Sin integración de Growth ni cambio de pins.

## GVC Scenario Plan

- Quality profile: `premium`.
- Viewports: desktop 1440, mobile 390 y 320; RTL, contraste forzado y reduced motion.
- Scenario: AXIS `apps/lab/src/test/e2e/product-primitives.spec.ts` y suites forms existentes.
- Required captures: selección abierta, remoto error y recuperación, colección y CTA abierto; `data-product-demo` identifica la superficie.
- Assertions: foco/teclado, FormData/reset, nombres accesibles, sin scroll horizontal de página (`scrollWidth <= clientWidth`).
- Review dossier: AXIS `docs/quality/product-primitives.md`.
- Baseline decision: conservar diseño Forms publicado; cambios nuevos revisados localmente. No actualizar snapshots sin mirar.

## Design Decision Log

Extender el modelo serializable compatible con RadioOption, sin React en contracts. Media decorativa y label obligatorio. NativeSelect mantiene fallback textual/optgroup. Listbox no contiene botones interactivos; acciones de retry/clear fuera de opciones. Búsqueda remota pertenece al consumidor. Fecha/rango y subida conservan controles nativos; no inventar calendario ni uploader servidor. Dialog modal separado de disclosure y complementary pasivo.

- Product Design asset: docs/ui/wireframes/TASK-2007-axis-product-primitives.md

## Desktop Target

1440 × 1000: marco editorial del Lab; ejemplos con ancho de lectura existente. Controles alineados por label y una acción principal por formulario. Lista popup anclada al control sin empujar contenido.

## Mobile Target

390 × 844 y 320 px: una columna, ancho fluido, texto largo envuelve y acciones mantienen target táctil de Forms. Popup se limita al viewport y se reposiciona al abrir teclado.

## Action Hierarchy

Elegir y confirmar son principales. Limpiar, restablecer y cerrar son secundarios. Retry aparece junto al fallo, nunca dentro de un option. Tabs cambian contexto local sin afirmar guardado.

## Visual Fidelity Mapping

Label/ayuda/valor usan axisForms. Media usa slot de icono, radio avatar circular y logo contain; fallback conserva tamaño. Densidad, foco y colores siguen tokens existentes. CTA usa Button y región inline.

## Copy Ledger

Copy local del Lab: «Organización», «Proveedor», «País y prefijo», «Reintentar», «Limpiar selección», «Restablecer», «Guardar preferencias». Primitives reciben mensajes del consumidor para no imponer idioma.

## State Copy

| Estado | Copy visible | Recuperación |
| --- | --- | --- |
| ready | Elige una organización. | Abrir y seleccionar. |
| loading | Buscando organizaciones… | Mantener selección; esperar resultado. |
| empty | No hay coincidencias. | Cambiar o limpiar búsqueda. |
| partial | Se conserva tu selección anterior. | Reintentar consulta sin perder valor. |
| error | No pudimos cargar las opciones. | Reintentar. |
| denied | No tienes acceso a esta opción. | Opción deshabilitada; elegir otra. |

## Accessibility Contract

Labels visibles obligatorios. Media decorativa; nombres vienen del texto. Listbox sin acciones anidadas. Teclado, reset cancelable y FormData. Estado comunicado sin robar foco. Dialog modal separado; disclosure devuelve foco sólo al cerrar desde dentro.

## Decision

Extender Forms de AXIS, preservando su jerarquía y primitivas nativas. MultiSelect usa disclosure con checkboxes y chips, con semántica de grupo explícita; no se declara listbox. Una composición operativa demuestra el conjunto sin añadir un DataGrid.

## Token mapping

axisForms gobierna tamaño de target, gaps, radios, bordes, foco, paletas, tamaños de texto y densidad. Button y RemovableChip conservan sus contratos. No se modifica el archivo de tokens compartido con el trabajo de Claude.

## Anti-patterns

No convertir una muestra del Lab en una export supuesta, ni declarar una release por el package.json. No usar iconos como sustituto del label, acciones dentro de options, feedback que robe foco ni overlays pasivos que bloqueen navegación.


## Extensión aprobada — Growth CTA y Scheduler, 2026-10-05

Aprobación explícita del operador: «Aprobado todo». `/references/growth-cta/#banners` compara
`inline_banner/minimal` (editorial compacto, reglas finas, menos altura) y
`inline_banner/spotlight` (navy profundo, titular mayor, botón y nota próximos). Columnas apiladas
en móvil, sin overflow. Las otras presentaciones reales son embedded y slide_in; no se simulan
sticky_banner/popup_modal/floating_button.

Titular preservado: anillo en eyebrow superior, esfera al final del titular grande. Última palabra
y esfera forman un cierre inseparable mediante helper gráfico canónico. `headlineMarks` es opt-in;
`headlineEmphasis` destaca una frase exacta y única con Bricolage 700 sobre introducción 400;
no cambia el copy accesible ni infiere énfasis por palabras. Botón conserva padding en hover/foco.
Agenda en ventana ligera o debajo del CTA comparte estado; header funcional expandido omite marcas.

Scheduler muestra día + calendario/cantidad, indisponibilidad explícita y leyenda; cuatro campos
con íconos funcionales y labels, emblema de celebración y recibo fecha/hora/zona desde confirmed.
Motion scoped por mes/paso, fallback, cancelación y reduced motion; sin ornamento de órbita.
Valores: axisGrowthCta/axisScheduler y primitives, nunca copias de CSS del Lab. Fuente/QA: AXIS
`GROWTH_CTA_COMPOSITION_DECISION_V1.md`, `SCHEDULER_COMPOSITION_DECISION_V1.md` y dossiers.
40/40 journeys CTA más 4/4 afectados finales PASS; publicación, AT físico y adopción pendientes.
