# TASK-1854 — Inicio y Mis servicios: resultados, avance y próximos pasos: wireframe

Diseño inicial 2026-09-09; UI ready: no. Sin implementación ni evidencia GVC.

- Visual direction mode: repo-native-benchmark
- Product Design asset: docs/ui/visual-directions/TASK-1854-client-home-services-and-cycle-experience.md

## Desktop Target

Cabecera de servicio/período y frescura sobre una superficie dominante; consultar servicio y atender el próximo pendiente es la acción
principal. Resumen de resultados → avance del período → pendientes → detalle con links Insights/revisión.

## Mobile Target

390px: una columna, encabezado compacto y acción alcanzable; tabla se adapta a lista sin ocultar estado,
fuente o siguiente paso. Adjuntos/errores no ensanchan la página.

## Action Hierarchy

Consultar servicio y atender el próximo pendiente → consultar detalle/historial → retorno al servicio. Acciones denegadas no se prometen.

## Visual Fidelity Mapping

AXIS/MUI: typography variants Geist/Poppins, spacing, palette semantic, radius y density desde theme;
WorkbenchHeader fuera del plano del body. Sin colores/medidas inventados ni cards anidadas decorativas.

## State Copy

Loading conserva estructura; empty explica causa; degraded conserva cobertura; error mantiene inputs;
denied no revela objeto; recibido no equivale a aceptado. Copy reusable en diccionario del dominio.

## Accessibility Contract

Teclado y foco visibles, error summary conectado a campos, retorno de foco, reduced motion y
scrollWidth === clientWidth. Estado por texto además de color.

## Implementation Mapping

src/views/greenhouse/client-portal/ y entrada existente /home. Consume DTO autorizado de TASK-1853, SEO TASK-1690, revisión TASK-289 e Insights TASK-1849. Reuse de CompositionShell/WorkbenchHeader y controles canónicos.
Rutas/variants finales y primer fold se sellan en diseño antes de UI ready yes.

## GVC Scenario Plan

Escenario propuesto scripts/frontend/scenarios/task1854-client-services.scenario.ts; premium,
1440/390px; captura first fold/detail/empty/error/partial/denied y entrada con/sin sesión por aviso.
Dossier y baseline antes de cierre; assertions de aislamiento, estado correcto, foco y scroll-width.

## Design Decision Log

Seleccionada como hipótesis: ficha contextual con evidencia/acción dominante. Grilla uniforme pierde
jerarquía; cola pura no explica desempeño del servicio. Comparación en visual direction; falta validar
first fold sobre fixtures y GVC, por eso UI ready sigue no.
