# STI — Sustained Team Improvement — Spec V1

| Campo | Valor |
|---|---|
| Metric name | Sustained Team Improvement (STI) |
| Metric ID (propuesto; no registrado aún) | `leadership_sti (vector)` |
| Spec version / methodVersion propuesto | V1 / `leadership_sti_v1.0` |
| Status | In design — ADR Proposed; sin implementación |
| Owner domain | Delivery/Ops + ICO/Data |
| Created / Last updated | 2026-09-19 |
| Writeback state | N.A. — no writeback de liderazgo |
| Cross-refs | EPIC-048; TASK-1879/1880/1881; contrato y ADR de liderazgo |

## 1. Definición canonical

Muestra si el desempeño mejora durante varios cierres comparables y no sólo un mes afortunado o una cartera más fácil. Busca que Daniela convierta problemas repetidos en cambios de proceso verificables: mejores briefs, balance de carga, revisiones y prevención. Describe evolución; no demuestra por sí mismo que una acción causó la mejora.

## 2. Fórmula canonical

Contrato de diseño, NO descripción de un helper de liderazgo ya operativo:

```text
B=trimestre baseline aprobado (3 meses locked anteriores), T=trimestre actual (3 meses locked); guardar IDs/revisiones, policy y composición.
Para cada tasa k comparable: Rate_k(W)=100×Σnumerator_k / Σdenominator_k sobre cuentas/períodos de W; para ACC usar task-days observados completos, no sumar tasas de cierre.
Delta_k_pp=Rate_k(T)-Rate_k(B); POTD/FTR/assignment/response positivo suele ser mejora.
Para counts de stock OCF/Stuck: mostrar promedio de cortes mensuales y delta absoluto; normalizar sólo con backlog elegible conocido y misma definición. No sumar stocks como casos únicos.
Capacity Overload: comparar overload hours por exposición de horas efectivas, si bases iguales; no interpretar incremento de Load como mejora.
Salida = vector {baseline,current,delta,unit,direction,sample,coverage,comparable,reason} por componente; no promedio entre KPIs.

Comparabilidad por cuenta: misma métrica/método/policy, exposición de responsabilidad y mezcla observada; cambios materiales de equipo/source/work type se explicitan.
Cohorte C=cuentas comparables presentes en B y T; mostrar a la vez cartera completa de cada ventana y entradas/salidas, sin llamar cohorte al total.
Sensibilidad al mix: rates por cuenta y Δ estandarizado usando pesos baseline fijos w_c=denominator_c(B)/Σdenominator(B), Δstd=Σw_c×(rate_c(T)-rate_c(B)); sólo cuentas C con ambos denominadores >0. Rotular standardized comparable cohort, nunca sustituir rollup observado.
Sustained flag por componente (no global): comparable + delta trimestral favorable + cada uno de los 3 meses T no peor que su baseline por tolerancia policy. Sin tolerancia aprobada, mostrar la serie/deltas sin flag.
```

Versionar método, policy, dependencias y manifest por separado. Cambiar semántica exige nueva versión y no reescribe revisiones locked.

## 3. Inputs canonical

Snapshots/revisiones locked de TASK-1880, manifestVersion y metadata de mix, exposure, coverage, método y calendario; baseline approvedBy/approvedAt congelado antes del período evaluado. Intervenciones semanales enlazadas como contexto, no numerador de mejora.

El [contrato compartido](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md) gobierna universo, tiempo, source quality y autorización. Fuente primaria registra hechos; ICO deriva el indicador. Campos faltantes no se imputan.

## 4. Helper canonical

Agregador propuesto en src/lib/ico-engine/leadership/calculate.ts (TASK-1880). Reutiliza numeradores/denominadores de specs hermanas; no recalcula hechos desde Notion ni suma valores presentados. Baseline selector y comparability checks son server-side.

Tests de comportamiento mínimos: ejemplos de §6, null/zero, duplicados, corte temporal/DST, quinto cliente, 51/201 cuentas, dos líderes, fuente incompleta y permisos revocados. Fixtures no son evidencia de producción.

## 5. Agregado canonical

Trimestral por cuenta y líder; trend mensual como diagnóstico. Seis meses si no hay baseline previo certificado. Backfill sólo si evidencia histórica permite equivalencia; nunca fabricar baseline de un mes. Si la cartera cambió, cuentas nuevas participan en resultado actual desde su vigencia, pero no inventarles tasa anterior; su contribución a cambio de composición se muestra aparte.

No existe agregado productivo de liderazgo en registry hoy. Implementación futura TASK-1880 sobre snapshot de TASK-1879; tablas/nombres nuevos permanecen propuestos. Página/filtro de UI no redefine universo materializado. Conservar conteos y precisión completa, redondear sólo presentación.

## 6. Semántica de casos edge

| Caso | Resultado exigible |
|---|---|
| POTD baseline 70%, actual 80% | +10 pp, no +10%; relativo +14.3% sólo si se solicita y se rotula |
| Actual 85%, 68%, 87%; promedio mejora sobre 70% | Deltas visibles, no mejora sostenida con tolerancia 0 del fixture |
| Quinta cuenta nueva muy fácil | Resultado actual cambia; STI cohorte separa composición, sin baseline inventado |
| Cambió captura de correcciones | FTR no comparable hasta equivalencia demostrada; no castigo por mejor registro |
| 2 meses actuales o baseline ausente | Serie parcial, STI trimestral unavailable |
| Denominador baseline 0 | Delta de tasa unavailable; no dividir por cero |
| Método cambiado | No comparación salvo reconciliación versionada aprobada |
| OCF 10→6, backlog también cae | -4 casos, mostrar exposición; no atribuir causalidad a líder automáticamente |

Toda exclusión conserva reason/count. Status desconocido es gap y requiere mapping gobernado; no se trata como completado.

## 7. Estados / dataStatus

`confidence=valid|low_confidence|unavailable`; lifecycle y freshness independientes según contrato común.
Unavailable si no hay inputs/denominador; low_confidence si existe cálculo diagnóstico con evidencia incompleta, muestra insuficiente o policy de evaluación pendiente; valid sólo con gates satisfechos. Un lock no transforma low_confidence en valid.
Acceso denegado/suppressed no revela valor ni universo protegido. Cada componente de una familia tiene su propio estado; no propagar válido desde un componente al resto.

## 8. Threshold canonical + benchmark

No umbral único de STI ni pesos sintéticos. Metas/tolerancias por componente se aprueban prospectivamente con mix y volumen; bajas muestras quedan low_confidence. No referencias externas para inferir “buen líder”. Guardrails: mejorar entrega no compensa caída de calidad o sobrecarga.

Sin benchmark externo validado en esta propuesta. Configurar minSample, minCoverage, freshnessBudget y vigencia por método; aprobación operativa previa a evaluación. No activar semáforos por defaults de ejemplo.

## 9. Writeback a Notion

N.A. en EPIC-048: KPI agregado de liderazgo se sirve en Greenhouse/API. No crear propiedades, modificar fórmulas Notion ni habilitar flags de writeback. Tampoco escribe Payroll.

## 10. Histórico de decisiones

### 2026-09-19 — V1 in design

Formalización solicitada por el operador. Diseño sobre cartera dinámica, evidencia explícita y shadow; método todavía no implementado ni aprobado para consecuencias laborales.

## 11. Cross-refs

- [Contrato compartido](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md).
- [ADR Proposed](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md).
- [Metric Spec Pattern](../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md).
- [EPIC-048](../../epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md).
- [TASK-1879](../../tasks/to-do/TASK-1879-leadership-accountability-source-foundation.md), [TASK-1880](../../tasks/to-do/TASK-1880-ico-leadership-performance-engine.md), [TASK-1881](../../tasks/to-do/TASK-1881-person-360-leadership-performance-ui.md).
- Dependencias: [OTD](OTD_V1.md), [FTR](FTR_V1.md), [OCF](OCF_V1.md), [Stuck Assets](STUCK_ASSETS_V1.md). No redefinir sus fórmulas base.

## 12. Open questions deliberadamente NO resueltas en V1

Aprobar baseline, tolerancias y reglas de cambio material de mix con Ops. Modelos causales, ajuste estadístico por complejidad e intervalos de incertidumbre pueden evaluarse con suficiente evidencia; fuera de V1, no afirmar significancia por un delta positivo.

## 13. Downstream consumers

Person 360 y API común (TASK-1881/1880). Sin bono, ranking de personas ni exportación cliente por este programa; una política futura requiere decisión separada y prospectiva.
