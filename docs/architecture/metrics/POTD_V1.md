# POTD — Portfolio On-Time Delivery — Spec V1

| Campo | Valor |
|---|---|
| Metric name | Portfolio On-Time Delivery (POTD) |
| Metric ID (propuesto; no registrado aún) | `leadership_potd_pct` |
| Spec version / methodVersion propuesto | V1 / `leadership_potd_v1.0` |
| Status | In design — ADR Proposed; sin implementación |
| Owner domain | Delivery/Ops + ICO/Data |
| Created / Last updated | 2026-09-19 |
| Writeback state | N.A. — no writeback de liderazgo |
| Cross-refs | EPIC-048; TASK-1879/1880/1881; contrato y ADR de liderazgo |

## 1. Definición canonical

Mide cuánto del compromiso de entrega de la cartera se cumple a tiempo. Debe llevar a Daniela a anticipar fechas, gestionar dependencias y evitar promesas incompatibles con capacidad; no a mover deadlines para mejorar la tasa. El resultado del equipo es accountability operacional, no prueba de culpa exclusiva del líder.

## 2. Fórmula canonical

Contrato de diseño, NO descripción de un helper de liderazgo ya operativo:

```text
Sea U la unión deduplicada de tareas atribuibles del manifest cuya cohorte de compromiso pertenece al período, con bucket canónico calculado al corte.
O=count(on_time), L=count(late_drop), V=count(overdue).
POTD = 100 × O / (O+L+V), si O+L+V>0; si no, null.
Cartera = 100 × SUM(O cuenta) / SUM(O+L+V cuenta); no AVG(porcentaje).
carry_over (abierta dentro de plazo) no entra. overdue_carried_forward se muestra separado, no se añade otra vez al denominador del mes.
Para meses abiertos el conjunto evaluable sigue los buckets del corte: abiertas futuras no son éxitos. Snapshot cerrado no incorpora nuevas conclusiones posteriores sin revisión.
```

Versionar método, policy, dependencias y manifest por separado. Cambiar semántica exige nueva versión y no reescribe revisiones locked.

## 3. Inputs canonical

Buckets/cohorte/fechas desde ico_engine.delivery_task_monthly_snapshots y materialize.ts; responsabilidad/intervalo desde manifest TASK-1879; task_due_date_changes aporta motivos y lineage, no una resta manual de atrasos. Source readiness y exclusiones por métrica. Retener version de clasificación y fecha de compromiso usada.

El [contrato compartido](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md) gobierna universo, tiempo, source quality y autorización. Fuente primaria registra hechos; ICO deriva el indicador. Campos faltantes no se imputan.

## 4. Helper canonical

Reusar clasificador/snapshot canónico de delivery; no existe hoy helper de liderazgo. Agregador propuesto en src/lib/ico-engine/leadership/calculate.ts (TASK-1880); input de buckets prevalidado, no recalcular desde texto de Notion. Ver src/lib/ico-engine/materialize.ts:811 (suma de buckets) y OTD_V1; resolver cualquier drift del classifier antes del canary.

Tests de comportamiento mínimos: ejemplos de §6, null/zero, duplicados, corte temporal/DST, quinto cliente, 51/201 cuentas, dos líderes, fuente incompleta y permisos revocados. Fixtures no son evidencia de producción.

## 5. Agregado canonical

Mensual por líder/cuenta y cartera; working diario. Filtrar hechos por intervalo de responsabilidad correspondiente al compromiso, no agregar todo el mes de una cuenta transferida. Persistir O/L/V/OCF/carry_over/exclusiones. La clasificación reason-aware existente es dependencia versionada; no usar fecha actual mutable para borrar lateness. Una razón externa confirmada se trata sólo conforme a esa policy, nunca por override informal.

No existe agregado productivo de liderazgo en registry hoy. Implementación futura TASK-1880 sobre snapshot de TASK-1879; tablas/nombres nuevos permanecen propuestos. Página/filtro de UI no redefine universo materializado. Conservar conteos y precisión completa, redondear sólo presentación.

## 6. Semántica de casos edge

| Caso | Resultado exigible |
|---|---|
| A=8/10, B=1/2 | Cartera=75.0%; A=80%, B=50%, nunca 65% |
| 0 evaluables | null + no_eligible_work, no 100% |
| Cuenta sin fuente | Conteos de esa cuenta desconocidos; observado parcial, no cartera completa |
| Tarea sin owner | Cuenta por pertenencia al space/cuenta, si elegible por clasificación |
| Fecha movida o atraso externo | Mantener evidencia de fecha/motivo/clasificador; no forgiveness nuevo en POTD |
| Sin deadline, status desconocido o exclusión | Contar razón/cobertura; no on_time inventado |
| Transferencia de lead | Atribución según fecha de compromiso congelada; sin historia fiable no evaluable |
| Cierre tardío del mes anterior | OCF/lineage según canon; no doble conteo como compromiso nuevo |

Toda exclusión conserva reason/count. Status desconocido es gap y requiere mapping gobernado; no se trata como completado.

## 7. Estados / dataStatus

`confidence=valid|low_confidence|unavailable`; lifecycle y freshness independientes según contrato común.
Unavailable si no hay inputs/denominador; low_confidence si existe cálculo diagnóstico con evidencia incompleta, muestra insuficiente o policy de evaluación pendiente; valid sólo con gates satisfechos. Un lock no transforma low_confidence en valid.
Acceso denegado/suppressed no revela valor ni universo protegido. Cada componente de una familia tiene su propio estado; no propagar válido desde un componente al resto.

## 8. Threshold canonical + benchmark

Mayor es mejor, pero no es objetivo maximizar a costa de fechas artificiales o calidad. No adoptar automáticamente el 90% histórico de OTD como meta de liderazgo ni como benchmark externo verificado. Metas por cartera/mix y mínimos de evidencia requieren calibración; mostrar buckets y trend antes de semáforo.

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

Metas por mix y excepciones contractuales corresponden a Ops; no agregar grace period, pesos por tamaño o ponderación salarial en V1. Si se quiere cambiar la clasificación base, nueva decisión/version del canon OTD, no fórmula escondida de liderazgo.

## 13. Downstream consumers

Person 360 y API común (TASK-1881/1880). Sin bono, ranking de personas ni exportación cliente por este programa; una política futura requiere decisión separada y prospectiva.
