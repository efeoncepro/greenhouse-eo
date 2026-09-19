# EPIC-048 — Revisión adversarial de métricas de liderazgo

- Fecha: 2026-09-19.
- Alcance: diseño/planificación de TASK-1879, TASK-1880 y TASK-1881; sin ejecución de feature.
- Método: revisión principal de fórmulas/contratos + subagente adversarial independiente read-only autorizado por el operador; segunda pasada focal tras correcciones.
- Estado: correcciones documentales aplicadas; aprobación del ADR, implementación, calibración y evidencia runtime pendientes.
- Canon: [contrato](../architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md), [ADR Proposed](../architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md), [catálogo ICO](../architecture/metrics/METRICS_INDEX.md).

## Hallazgos y resolución de diseño

| Hallazgo | Severidad | Corrección / dueño | Fixture exigible en implementación |
|---|---|---|---|
| Manifest sólo del mes perdía líderes anteriores | P1 | Contrato §3: operationalPortfolio y metricAttribution; TASK-1879 discovery histórico, TASK-1880 snapshot, TASK-1881 labels | Revisión agosto/A, transferencia septiembre/B, cierre septiembre: A recibe resultado histórico, B no recibe crédito retrospectivo; ninguno recibe permisos automáticamente |
| Capacidad parcial podía parecer libre o revelar cuentas ocultas | P1 | ACC §5: permiso cross-account explícito; TASK-1879/1880, UI sólo consume | C40, Dvisible20, Doculta30: autorizado125%; no autorizado sin capacity value, nunca50% como disponibilidad total |
| Reapertura cross-month podía duplicar asset | P1 | Leadership RpA §3 y FTR §14: período ancla/invalidación/revisión | Cierre agosto, reapertura septiembre, recierre septiembre: una observación en agosto con revisión; cero observación independiente septiembre; abiertos visibles mientras tanto |
| FRM no distinguía período de detección y maduración | P2 | FRM §2 y contrato §6: cohortEnd/observationAsOf/runAsOf; TASK-1880 | Riesgo septiembre, acción octubre dentro SLA: cuenta en cohorte septiembre; riesgo octubre no entra; fuente tardía después de lock propone revisión |
| STI pesos/comparador sostenido ambiguos | P2 | STI §2: pesos normalizados sobre C_k y baseline fijo con unidades | Sale cuenta90% de volumen, retenida mejora20pp: delta estandarizado20pp; mes sin muestra implica sustained=null |
| UI podía esperar toda maduración del backend | P2 | Contrato §11.6, tasks y epic: technicalShadowReady vs evaluationReady | API/canary/auth/QA listos permiten UI shadow con STI unavailable; no requiere seis meses ni lifecycle complete del backend |

## Ajustes adicionales de revisión principal

- Coverage DTO y minCoverage son fractions [0,1]; campos *Pct son presentación y no se comparan directamente contra fractions. Caso 6/10: coverageRatio0.6 vs minCoverage0.8 no pasa.
- Calendario mensual coherente: siguiente día hábil inicia conciliación; no lock automático ni period_end+1 calendario rígido.
- Se conserva el contrato individual: RPA_V1 y código no se modifican; liderazgo tiene spec propio.

## Verificación y límites

Validación documental focal: tasks, epic, UI readiness estructural, enlaces añadidos, diff whitespace, cierre documental y contexto estricto. Los fixtures de esta tabla son obligaciones futuras, no resultados de tests de código ni datos de Daniela. Una revisión adversarial no certifica producción ni aprobación de la política. Mantener UI ready no y tasks to-do.

## Resultado de segunda pasada

El subagente confirmó las correcciones de los seis hallazgos. Su segunda pasada detectó un incentivo residual: sacar de K un caso difícil reabierto podía mejorar el cociente pese a mantenerlo en gaps. Se incorporaron las dos precisiones exigidas: E incluye reabiertos del período ancla, y reopened_pending bloquea evaluación del componente/rollups y STI dependiente independientemente de minCoverage. Fixture99 ceros+1 diez rondas añadido a TASK-1880. Veredicto del revisor: con estas precisiones el diseño se sostiene para implementación futura, sujeto a gates operativos. El cierre aquí es documental, no aprobación de runtime.

Comprobación focal final del subagente: ambas condiciones de reapertura cumplidas; sin pendientes de esta revisión focal. Gates ejecutados: task:lint TASK-1879/1880/1881, epic:lint EPIC-048, ui:readiness-check TASK-1881 y docs:closure-check, todos sin hallazgos focales. UI readiness es chequeo estructural, no aprobación visual ni runtime. El RpA base se verificó sin diferencias contra HEAD.
