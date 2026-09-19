# ACC — Assignment & Capacity Coverage — Spec V1

| Campo | Valor |
|---|---|
| Metric name | Assignment & Capacity Coverage (ACC) |
| Metric ID (propuesto; no registrado aún) | `leadership_acc (family)` |
| Spec version / methodVersion propuesto | V1 / `leadership_acc_v1.0` |
| Status | In design — ADR Proposed; sin implementación |
| Owner domain | Delivery/Ops + ICO/Data |
| Created / Last updated | 2026-09-19 |
| Writeback state | N.A. — no writeback de liderazgo |
| Cross-refs | EPIC-048; TASK-1879/1880/1881; contrato y ADR de liderazgo |

## 1. Definición canonical

Muestra si la demanda operativa tiene dueño válido y si los compromisos caben en la capacidad del equipo. Busca que Daniela reparta oportunamente el trabajo y detecte sobrecarga, no que asigne todo a una persona para conseguir 100%. Es una familia: cobertura de asignación y carga/capacidad no son la misma tasa.

## 2. Fórmula canonical

Contrato de diseño, NO descripción de un helper de liderazgo ya operativo:

```text
En un corte t, Q= tareas abiertas asignables según policy versionada; incluye sin owner y bloqueadas que aún requieren responsable.
A= tareas de Q con un primary owner interno válido y elegible para la cuenta/fecha.
Assignment Coverage(t)=100×A/|Q|; |Q|=0 → null.
No usar suma de owners ni del equipo como denominador. Tarea con múltiples owners sin primary resoluble = sin asignación válida + conflicto.

Horizonte H de capacidad: período consultado; en working también segmento remaining claramente separado.
Para cada miembro único m: C_m(H)=horas laborables efectivas según jornada/calendario menos leave aprobado, con intervalos y sin restar leave dos veces.
D_m(H)=horas comprometidas en TODAS sus asignaciones vigentes, internas/externas, prorrateadas por días laborables con convención contractual documentada.
Capacity Load=100×SUM(D_m)/SUM(C_m) si todos los inputs requeridos son conocidos y C>0.
Capacity Headroom Hours=SUM(C_m-D_m); Overallocated Hours=SUM(max(D_m-C_m,0)); Overallocated Members=count(D_m>C_m).
Mostrar además carga de las cuentas del líder vs otros compromisos como totales permitidos. No multiplicar C de una persona por cuentas; headroom total no oculta overload individual.
Si sólo existe FTE, reportar committedFte/availableFte con unidad FTE y misma base; no mezclar horas y FTE ni fabricar conversión.

Time to Assign (diagnóstico condicionado): businessMinutes(assignable_at, first_valid_assignment_at); distribuir p50/p90 de episodios asignados; abiertos muestran waitingAge y count, no se excluyen silenciosamente.
```

Versionar método, policy, dependencias y manifest por separado. Cambiar semántica exige nueva versión y no reescribe revisiones locked.

## 3. Inputs canonical

Estado de tareas y primary owner del source canónico, manifest y task_assignment_events propuestos en TASK-1879. client_team_assignments aporta vigencia/FTE/horas. Reader operacional deriva jornada/leave/capacidad sin costos ni motivo médico; los readers económicos existentes no se exponen a UI. start/end de episodio y calendario deben tener historia fiable.

El [contrato compartido](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md) gobierna universo, tiempo, source quality y autorización. Fuente primaria registra hechos; ICO deriva el indicador. Campos faltantes no se imputan.

## 4. Helper canonical

Propuestos operational-capacity.ts y scope.ts en src/lib/ico-engine/leadership (TASK-1879), calculate.ts para componentes ACC (TASK-1880). Reusar aritmética laboral/capacidad vigente tras revisión, sin restar fuentes duplicadas; no modificar filtro comercial global de team-capacity-store.ts.

Tests de comportamiento mínimos: ejemplos de §6, null/zero, duplicados, corte temporal/DST, quinto cliente, 51/201 cuentas, dos líderes, fuente incompleta y permisos revocados. Fixtures no son evidencia de producción.

## 5. Agregado canonical

Por cuenta: Assignment Coverage y demanda asignada de esa cuenta. Por cartera: sumar tareas únicas A/Q al MISMO t. Capacidad: unión de miembros del equipo, una sola vez, y todos sus compromisos; no suma de capacidad por cuenta. ACC no es un flujo mensual sumable: mensual muestra corte de cierre y, si observaciones diarias completas, ΣA_d/ΣQ_d (task-days), rotulado daily weighted coverage. Días sin observación son gaps, no cero; no imputarlos. Horas de períodos contiguos pueden sumarse sin solapamiento, tasas no.

Contrato de acceso a capacidad: D completo incluye compromisos fuera del portfolio. No calcular D sólo con cuentas visibles y presentarlo como disponibilidad total. TASK-1879/1880 deben distinguir permiso de lectura detallada de compromisos y permiso explícito de resumen operacional cross-account. Sólo con este último se puede servir capacidad/carga derivada de todos los compromisos, sin nombres ni desglose privado; aprobar el riesgo de inferencia (incluso una única cuenta oculta) con People/Identity. Si ese resumen no está autorizado, Capacity Load/headroom/overload y disponibilidad derivada quedan suppressed/unavailable al consumidor; Assignment Coverage puede seguir disponible. Nunca inferir cero demanda de datos ocultos. Tests cubren una persona, una cuenta visible y otra oculta, incluido ataque por diferencia entre filtros.

No existe agregado productivo de liderazgo en registry hoy. Implementación futura TASK-1880 sobre snapshot de TASK-1879; tablas/nombres nuevos permanecen propuestos. Página/filtro de UI no redefine universo materializado. Conservar conteos y precisión completa, redondear sólo presentación.

## 6. Semántica de casos edge

| Caso | Resultado exigible |
|---|---|
| 18 de 20 tareas con owner | 90% cobertura; no afirma capacidad suficiente |
| C=100h, D=120h | Load=120%, headroom=-20h; no cap a 100 |
| Dos personas C=40h c/u, D=60h y 20h | Load=100%, headroom=0, overload=20h y 1 persona sobreasignada |
| Persona en 3 cuentas | C cuenta una vez; D incluye los 3 compromisos |
| Tareas cerradas/canceladas | Fuera de cola Q según policy; auditar clasificación |
| Bloqueada sin owner | Permanece en Q y cola de riesgo |
| C=0, D>0 | Ratio null + zero_capacity_with_commitment, mostrar D/overload |
| Jornada/horas desconocidas | Componente de capacidad unavailable; assignment puede seguir calculable |
| Reasignación de owner | No reinicia edad del episodio; audita cambio |
| Sin historia de inicio asignable | Time to Assign unavailable; no usar createdAt como proxy silencioso |

Toda exclusión conserva reason/count. Status desconocido es gap y requiere mapping gobernado; no se trata como completado.

## 7. Estados / dataStatus

`confidence=valid|low_confidence|unavailable`; lifecycle y freshness independientes según contrato común.
Unavailable si no hay inputs/denominador; low_confidence si existe cálculo diagnóstico con evidencia incompleta, muestra insuficiente o policy de evaluación pendiente; valid sólo con gates satisfechos. Un lock no transforma low_confidence en valid.
Acceso denegado/suppressed no revela valor ni universo protegido. Cada componente de una familia tiene su propio estado; no propagar válido desde un componente al resto.

## 8. Threshold canonical + benchmark

Assignment Coverage idealmente se acerca a 100% sin asignaciones nominales inválidas. Capacity Load no es “más es mejor”: >100% indica compromisos sobre capacidad definida, pero <100% no prueba ociosidad; hay trabajo no capturado. Reserva/buffer y SLA de asignación requieren policy por operación. No benchmark externo ni meta salarial.

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

Catálogo de estados asignables, horizonte/calendario, política de prorrateo contractual y capacidad reservada deben aprobarse con Ops/People. No estimar horas de tareas por conteo ni tratar FTE comercial como tiempo realmente trabajado.

## 13. Downstream consumers

Person 360 y API común (TASK-1881/1880). Sin bono, ranking de personas ni exportación cliente por este programa; una política futura requiere decisión separada y prospectiva.
