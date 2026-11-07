# TASK-2094 — alcance de las pruebas AEO/Insights

Archivo: `aeo-insights.local-spec.ts`. Datos sintéticos; ningún identificador de corrida, edición, propiedad o usuario
real. Las URLs SKY sólo sirven como strings de clasificación; ninguna se solicita por red.

## Lógica ejercitada

| Componente real | Frontera sustituida |
| --- | --- |
| `buildCitation`, `buildCitations`, `buildCitationSourceBreakdown` | Ninguna: funciones puras |
| `aeoReportAdapter`, `readGa4ChannelWindow`, `ga4AiFacts` y comparación | Reader AEO y reader GA4 devuelven fixtures; no se ejecuta SQL ni API de esos readers |
| `resolveInsightWindows` | Reloj de evaluación explícito |
| `runInsightGeneration` desde `validating`, `validateEditorialPlan` | Stores de snapshots/plan/transición, transacción y publicación de eventos son stubs |
| `evaluateBlogMeasurement` candidato | Recibos sintéticos declarados; no se acredita autenticidad o producción real de recibos |

No se sustituyen las funciones cuya decisión se verifica. Collecting/composing no son parte de esta prueba:
sus puertos fallan si llegan a invocarse. No se ejercitan render, emisión, entrega ni autorización de usuarios.
`ready_for_review` no se presenta como `issued`. Los tests no certifican PostgreSQL en este frente.

## Qué significa un PASS

Los nombres **CURRENT GAP** caracterizan comportamientos existentes que incumplen el futuro contrato Blog:
agrupar raíz/Blog por dominio registrable, llenar AEO sólo con GA4 AI, aceptar hechos únicamente comparativos y
consultar AI referrals sin filtro Blog. Su PASS demuestra la reproducción, no la corrección.

Los controles positivos preservan ventana y readiness, exclusión de observaciones failed y rechazo de módulo
vacío con `allowPartial=false`. El candidato se contrasta aparte: una tríada sintética válida completa pasa;
sustituir AEO nativo por GA4 referrals o mover su recibo a comparación bloquea el requisito actual.

Los redirects conservan URL original y dominio declarado por proveedor. El test no resuelve su destino ni
inventa que una cita sin destino verificado pertenezca al Blog. Dedupe exacta de URL no equivale a canonicalización.

## Ejecución

Usar exclusivamente `node scripts/experiments/sky-measurement-bridge/run-local.mjs`, que prepara el entorno
local aislado de la unidad completa. Resultado ejecutado y conteos viven en el recibo del runner y README de
la unidad; no inferir ejecución por la mera existencia de estos archivos.

Pendiente fuera de este archivo: SQL real de selección de runs, construcción de recibos desde productores,
paneles comparables, autoridad de Space/Service, idempotencia con reportId, emisión y distribución.
