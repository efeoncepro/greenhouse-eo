# TASK-1881 — Person Leadership Performance Wireframe

## Meta

Task: TASK-1881. Propuesta, no UI construida. UI rigor: ui-standard. Surface: /people/[memberId]?tab=activity.
Wireframe depende del reader de TASK-1880, no autoriza implementación.

## Brief

Cada líder y observadores internos autorizados necesitan entender si su equipo cumple en toda su cartera de responsabilidad del período, identificar bloqueos y diferenciar datos desconocidos de resultados malos. Daniela con SKY, Berel, Motogas y Efeonce es sólo el ejemplo del piloto. No modificar bono ni juzgarla por tareas propias.

## Product Design Source

Mode: repo-native-benchmark.
Source: docs/ui/visual-directions/TASK-1881-person-leadership-performance-direction.md.
Benchmark interno: PersonActivityTab y primitives SurfaceRecipe/CompositionShell. Las cuentas vienen del manifest de responsabilidad, no de constantes UI ni sólo del array de métricas. Direction elegida: hoja analítica dentro de Actividad.

## Desktop Target

Viewport 1440×1000. Propuesta de jerarquía:

```text
Person header / tabs existentes
Actividad
[Liderazgo operativo] [Contribución individual]
Liderazgo operativo                [Mes anterior | Septiembre | siguiente]
Período provisional • actualizado ... • alcance/manifest ...
N cuentas autorizadas • medibles/pendientes por métrica
[Buscar cuenta] [Estado de datos] [Filtro de cuenta]
POTD 9/12 · 75%          FTR 5/6 · cobertura 60% · confianza baja · RpA 2/6 = 0.33 rondas/asset
Cuenta      POTD/buckets   FTR + RpA/cobertura   Asignación   Riesgos
Cuenta A    ...           ...             ...          Ver evidencia
Cuenta B    pendiente de fuente                         Ver estado
... filas dinámicas del manifest autorizado ...
[Página anterior | rango/total autorizado | siguiente]
Excepciones priorizadas: sin owner / overdue / bloqueo ...
STI: tres cierres comparables + baseline / datos insuficientes
Método, exclusiones y fuente       [detalle → aside contextual]
```

Ejemplos numéricos ilustrativos de tests, NO resultados de Daniela. Fracciones/coverage acompañan tasas. Método y drill-down accesibles en el primer plano sin cinco contenedores anidados.

## Mobile Target

390×844. Encabezado, selector de período, estado de datos, POTD/FTR/RpA, lista de cuentas, excepciones, tendencia.
Tabla desktop se transforma en lista con labels, manteniendo mismo orden/semántica; no scroll horizontal de página. Búsqueda, filtros y paginación accesibles también en móvil; no cargar 201 opciones en un select. Touch targets y truncado reversible para títulos largos. Panel detalle adaptativo canónico con back/close/foco.

## Action Hierarchy

Primary: abrir evidencia de una cuenta/excepción.
Secondary: cambiar período/cuenta, comparar tendencia y revisar método.
Tertiary: abrir tarea de origen autorizada. No CTA de modificar bono, exportar PII, conceder permisos o cerrar período desde esta task. Las intervenciones se leen y se registran mediante commands gobernados por TASK-1880; solicitar corrección no edita la métrica. Permisos de escritura separados de lectura.

## Visual Fidelity Mapping

WorkbenchHeader report fuera del plano; SurfaceRecipe analyticsReport como sheet; CompositionShell primary + aside cuando hay detalle.
PeriodNavigator controla todas las secciones. MetricTrendCard sólo con muestra comparable; loading conserva dimensiones sin animar números.
Theme tokens institucionales de text/background/divider/spacing/density, sin paleta nueva. Confidence y freshness separados de lifecycle.

## State Inventory

Loading; working/provisional; locked; superseded revision; legítimamente sin tareas; bajo sample; falta de historial FTR; stale; fallo parcial; forbidden; sin responsabilidad; binding incompleto; cuenta sin permisos; error con retry; trimestre incompleto.
No responsibility: contribución individual sigue intacta; no falso panel vacío para toda persona. Distinguir cero cuentas, cero cuentas visibles autorizadas y cartera visible sin fuentes, sin revelar counts prohibidos. Nuevos estados: pending_source/disabled_source/unsupported_source/not_enabled_for_rollout, scopeChanged y manifest reemplazado.
No permission: no fetch de evidencia protegida ni divulgación de nombres/cuentas faltantes.
Partial: texto de alcance parcial, nunca «toda la cartera». Denominador cero se muestra no evaluable, no 100%.

## Accessibility Contract

Headings ordenados, tablas/listas semánticas, labels de período/cuenta y aria-describedby para confianza. Teclado abre/cierra evidencia, Escape retorna foco al trigger. Estados de carga/resultado en live region no invasiva; reduced motion sin desplazamientos/contadores. Gráficos tienen resumen textual y datos equivalentes.

## Implementation Mapping

- PersonView/PersonTabs existentes conservan route/activity.
- PersonActivityTab compone nueva sección; proposed NEW PersonLeadershipSection y LeadershipAccountEvidence en carpeta people.
- DTO TASK-1880 único origen: backend calcula y autoriza; frontend formatea. Manifest define filas; counts/paginación/agregado por scope vienen del servidor. Cache incluye manifestVersion y se invalida al cambiar membresía/permisos.
- Copy proposed NEW src/lib/copy/leadershipPerformance.ts siguiendo locales actuales.
- Primitive decision: reuse; no new primitive ni plataforma visual en este alcance.

## GVC Scenario Plan

Proposed NEW scripts/frontend/scenarios/task1881-person-leadership-performance.scenario.ts.
qualityProfile: premium. Desktop 1440 y mobile 390; fixture determinista por estado, sin PII ni números inventados en producción.
Capturas: working completo, locked, coverage parcial, unavailable, empty, stale/error, sidecar abierto/cerrado y trimestre insuficiente. E2E cambiar período rápido, filtros/páginas, drill-down, back/foco, cuenta prohibida y revoked permission. Fixtures 0/1/4/5/51/201 cuentas y dos líderes; quinta asignada sin fuente, alta/revocación durante lectura y transición histórica. Afirmar que paginar no cambia agregado y que baja cierra detalle sin fuga.
Dossier con source/runtime comparison y baseline decision explícita; no promover baseline que esconda regresión.
Comprobar document.documentElement.scrollWidth === clientWidth, keyboard, reduced-motion, consola/red y contraste.

## Design Decision Log

- Elegida integración en Actividad, no ruta nueva ni dashboard paralelo.
- Reuse primitives; no tarjetas independientes por cada sigla.
- Liderazgo y contribución individual separados, sin score combinado.
- UI ready no hasta DTO final, copy, estados, tokens y revisión de dirección; este wireframe no es aprobación visual runtime.

## Addendum de alcance operativo — 2026-09-19

No cambia la dirección/recipe ni autoriza JSX. Reutilizar el detalle contextual para ver distribución RpA y casos abiertos separados; fórmula en LEADERSHIP_RPA_V1. Acciones contextuales autorizadas: registrar acción, aportar verificación, solicitar corrección y revisar solicitud (reviewer independiente). La acción primaria sigue siendo evidencia; formularios sólo al abrir el caso, no en cada fila ni como cards nuevas.

Campos y transiciones siguen contrato compartido §11. Estados añadidos: capture_pending, inherited/mixedExposure, tradeoff_requires_review, disputed, edición local, submitting, validation_error, conflict_revision, submitted y denied. Mostrar policy/calendario vigente y expectativa de revisión. No presentar menor RpA como menor tiempo.

Pruebas futuras desktop/390px: formulario con error y foco, guardar/descartar, sin privilegio, doble envío, permiso revocado, autor intentando revisar, disputa antes/después de lock y acción ejecutada pero inconclusive. Extender mapping de copy y escenarios existentes; ningún screenshot o readiness queda acreditado por este texto.
