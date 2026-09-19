# TASK-1881 — Visual Direction: Operational Leadership

## Meta

Diseño propuesto 2026-09-19, no captura ni evidencia de UI implementada. Source mode: `repo-native-benchmark`. Fuente duradera: este documento, wireframe/flow/motion hermanos y código actual de PersonActivityTab. UI ready permanece no hasta validar contrato real de TASK-1880 y revisión de diseño.

## Experience thesis

Leer resultados del equipo y calidad de evidencia sobre la cartera dinámica del líder/período antes de interpretar un desempeño individual. El piloto no fija número de cuentas ni sujetos. El perfil conserva su identidad y contexto; una hoja analítica editorial evita cinco tarjetas que aparenten cinco scores comparables.

## Alternatives

1. Cinco KPI cards: descartada; ACC/FRM/STI son familias/evidencias, no porcentajes equivalentes, y la confianza quedaría secundaria.
2. Página nueva de liderazgo: descartada; duplica navegación/identidad y aleja evidencia del perfil.
3. Hoja analítica dentro de Actividad: elegida. Encabezado de período/alcance, dos anclas numéricas POTD/FTR, tabla de cuentas, cola de excepciones y tendencia con drill-down contextual.

## Targets and signature

Desktop 1440×1000: contenido del perfil existente, plano único, cuenta→excepción→evidencia con aside sólo al abrir detalle. Lista paginada con búsqueda/filtros para 1, 5, 51 o 201 cuentas; resumen del scope completo autorizado independiente de página.
Mobile 390×844: orden idéntico en una columna, filas de cuenta apiladas semánticamente; sidecar adaptativo ocupa superficie móvil canónica.
Firma: cifras con fracción y estado de cobertura junto al valor, no badge genérico de éxito. «Datos insuficientes» tiene la misma dignidad visual que un resultado válido.

## Tokens and primitives

Reuse CompositionShell, SurfaceRecipe kind analyticsReport, WorkbenchHeader kind report, PeriodNavigator, MetricTrendCard y ContextualSidecar/AdaptiveSidecarLayout.
Tipografía, spacing, palette, breakpoints, elevation y motion salen del theme/primitives vigentes, nunca hex/píxeles ornamentales nuevos. Mapeo final se comprueba contra exports al implementar.
Valores tabulares y jerarquía tipográfica institucional; semántica de color acompañada por texto/ícono. Sin assets publicitarios, gradientes hero, medallas, ring score ni rojo/verde como única lectura.

## Baseline and quality

Primer baseline NUEVO se aprueba sólo con capturas runtime; hoy no existe screenshot de esta feature.
GVC `qualityProfile: premium`, dossier desktop/mobile/estados; media ≥4.5, piso ≥4, dimensiones críticas ≥4.5. Revisión enterprise y tokens, teclado, reduced motion, contraste y scrollWidth obligatorios.


## Dynamic portfolio direction

La jerarquía no cambia por cardinalidad: alcance/cobertura → resumen → lista de cuentas → evidencia. Cuentas pendientes ocupan filas honestas, no desaparecen. Counts por métrica, labels/plurales dinámicos y estado scopeChanged; sin números de cuentas ni marcas fijos en copy. Probar 0/1/5/51/201, dos líderes y alta/revocación. El gate de diseño sigue pendiente; no hay capturas runtime.
