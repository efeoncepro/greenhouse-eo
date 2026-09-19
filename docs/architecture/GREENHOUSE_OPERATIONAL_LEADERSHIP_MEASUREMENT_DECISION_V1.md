# ADR — Operational Leadership Measurement V1

- Status: **Proposed** — solicitado para formalización documental; no se presume aprobación de fórmulas nuevas, schema, grants o rollout.
- Date: 2026-09-19.
- Owner: Delivery/Ops + ICO/Data; People/Product para consumo; HR/Finance conserva decisión salarial separada.
- Scope: EPIC-048, TASK-1879–1881, responsabilidades, evidencia delivery, snapshots ICO, API y Person 360.
- Reversibility: two-way-but-slow; documentos reversibles, revisión histórica/aplicación de datos requiere trazabilidad.
- Confidence: medium en diseño; cobertura/eventos y calibración real pendientes.
- Validated as of: 2026-09-19, inspección de código y canon; **no verificación runtime de cuentas o resultados**.
- Supersedes: none. Extiende sin sustituir OTD/FTR/RpA individual, Attribution Model y Metric Spec Pattern.

## Context

El crédito por primary owner mide ejecución individual. Una líder con pocas tareas propias puede mostrar indicadores altos sin representar las entregas del equipo. Atribuirle tareas ajenas como propias rompería el crédito individual y podría contaminar compensaciones.
Una lista de cuatro cuentas sólo resuelve el piloto; asignaciones, fuentes y permisos cambian. Ausencia de eventos de corrección o cuentas desconectadas puede producir aparente perfección. También mezclar capacidad con asignación o respuesta a riesgos con resolución produce incentivos erróneos.

## Decision

Se propone adoptar un scorecard **de responsabilidad operacional**, separado del individual y sin score compuesto ni efecto salarial:

1. Universo dinámico por líder/cuenta/vigencia desde operational_responsibilities; manifest derivado versionado, no roster manual ni lista hardcodeada. V1 por cuenta/space explícito, sin herencia organizacional por cargo.
2. Cinco indicadores definidos sólo en sus specs: [POTD](metrics/POTD_V1.md), [FTR contexto liderazgo](metrics/FTR_V1.md#14-contexto-de-liderazgo-operativo--proposed-2026-09-19), [ACC](metrics/ACC_V1.md), [FRM](metrics/FRM_V1.md), [STI](metrics/STI_V1.md). ACC/FRM son familias y STI vector, no cinco porcentajes intercambiables.
3. Reusar hechos/clasificación canónicos. Ratios por cociente de sumas, evidencia explícita, unknown distinto de cero. Fuente parcial conserva cuenta y confianza baja; nunca eliminar para subir resultado.
4. Temporalidad por métrica en [contrato compartido §3](GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md#3-universo-identidad-y-tiempo), propuesta sujeta a aprobación de Ops: compromiso para POTD, primera revisión cliente para FTR, corte para ACC, detección para FRM.
5. Working diario, revisión semanal, conciliación/lock mensual y comparación trimestral con baseline equivalente. Revisión inmutable con lineage; correcciones auditadas crean versión nueva.
6. Responsabilidad, disponibilidad de datos y permisos independientes. API primitive server-side común, filtros/aggregates no filtran información prohibida; UI Person 360 sólo presenta.
7. Shadow antes de uso formal. Sin ranking individual, bonus nuevo, writeback Notion de liderazgo ni evaluación adversa automatizada.

## Alternatives Considered

| Alternativa | Beneficio | Motivo para no elegir |
|---|---|---|
| Mantener sólo ICO individual | Sin nueva proyección | No representa liderazgo con pocas tareas propias |
| Acreditar todas las tareas del equipo a Daniela | Score aparentemente completo | Duplica crédito, rompe ownership y frontera Payroll |
| Lista fija de cuentas/miembro | Piloto rápido | Quinta cuenta y cambios históricos requieren código/config manual |
| Todas las cuentas donde trabaja su equipo | Descubrimiento fácil | Colaboradores compartidos amplían responsabilidad indebidamente |
| Heredar toda la agencia del cargo | Onboarding automático | No hay alcance/precedencia temporal aprobados; confunde jerarquía con responsabilidad |
| Score ponderado único con bono | Lectura simple | Pesos no calibrados, mezcla unidades/confianza y oculta riesgos |
| Cartera dinámica + componentes auditables | Escalable y explicable | Elegida; mayor costo de captura, historial y gobernanza |

## Consequences

Beneficios: escalabilidad por datos, trazabilidad, lectura justa de falta de evidencia y reutilización del motor.
Costos: historia temporal/captura, materialización versionada, controles de acceso por agregado, calibración y revisión humana.
Riesgos residuales: pocos eventos, falsos positivos, datos tardíos, cambios de mix, límites de atribución y confundir correlación con causalidad. Mitigaciones en specs/tasks; un dashboard no resuelve captura faltante.
No toda cuenta estará medible desde el día del alta. No garantizar mejoras de Daniela por instalar indicadores; el resultado esperado exige decisiones y seguimiento semanal.

## Runtime Contract

Contrato objetivo: [Measurement V1](GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md); estado **In design**.
Autoridad actual: operational_responsibilities/client_team_assignments/space_notion_sources en PG y evidencia delivery; calculateFtr delega a RpA; buckets/snapshots y materialize.ts proveen entrega.
Destino propuesto: src/lib/ico-engine/leadership primitives; BQ snapshots derivados, PG serving/revisiones y manifest hijo de período; API app/ecosystem/session; PersonActivityTab consumer. Nombres físicos pendientes se declaran en tasks, no migraciones aplicadas aquí.
Cambios de fuente/metric method, grants, source rollout y publication markers se verifican en ejecución. Snapshot “locked” existente con force no prueba inmutabilidad de nuevo modelo: TASK-1880 debe preservarla localmente y coordinar TASK-733/734.

## Acceptance and rollout gates

- Aprobar ADR y política temporal/precedencia por owner operativo antes de schema.
- TASK-1879 certifica fuentes/bindings y quinta cuenta sin código, más 51/201 cuentas/dos líderes y aislamiento.
- TASK-1880 certifica fórmulas, snapshots, concurrency/replay, source coverage, commands y parity; pruebas numéricas, rollback y readback real.
- Configuración aprobada de mínimos/SLA/calendario/baseline antes de activar evaluación; sin defaults ocultos.
- TASK-1881 verifica GVC/teclado/390px y confianza/cartera variable sin fórmulas nuevas.
- Shadow dos cierres mínimo; STI requiere trimestre actual y baseline de tres meses comparable (seis si se empieza sin historia).
- Ningún gate implica aprobación HR/Finance de compensación ni habilitación de cuentas externas.

## Revisit When

Cambio de fuente/método, primer scope organizacional heredado, segundo tipo de líder con responsabilidad distinta, conflictos frecuentes entre leads, ausencia de historia de primera revisión, metas salariales propuestas o budgets de escala excedidos. Cualquier efecto en Payroll necesita ADR/policy independiente y prospectiva.
Si baseline/mix impide comparación, publicar no_comparable y revisar instrumento; no forzar normalización para producir una nota.

## Decision log

2026-09-19: formalización solicitada por el operador; specs sustantivas y ADR Proposed creados. Implementación, acceptance del ADR y rollout no realizados por este commit.
