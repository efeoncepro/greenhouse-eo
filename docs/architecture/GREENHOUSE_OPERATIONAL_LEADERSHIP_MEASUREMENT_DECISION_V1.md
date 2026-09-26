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

1. Universo dinámico por líder/cuenta/vigencia desde operational_responsibilities; manifest compuesto operativo y atribución histórica por métrica, derivado/versionado, no roster manual ni lista hardcodeada. V1 por cuenta/space explícito, sin herencia organizacional por cargo.
2. Seis indicadores definidos sólo en sus specs: [POTD](metrics/POTD_V1.md), [FTR contexto liderazgo](metrics/FTR_V1.md#14-contexto-de-liderazgo-operativo--proposed-2026-09-19), [RpA contexto liderazgo](metrics/LEADERSHIP_RPA_V1.md), [ACC](metrics/ACC_V1.md), [FRM](metrics/FRM_V1.md), [STI](metrics/STI_V1.md). ACC/FRM son familias y STI vector, no seis porcentajes intercambiables.
3. Reusar hechos/clasificación canónicos. Ratios por cociente de sumas, evidencia explícita, unknown distinto de cero. Fuente parcial conserva cuenta y confianza baja; nunca eliminar para subir resultado.
4. Temporalidad por métrica en [contrato compartido §3](GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md#3-universo-identidad-y-tiempo), propuesta sujeta a aprobación de Ops: compromiso para POTD, primera revisión cliente para FTR/RpA, aunque el binding ya no esté vigente al cerrar, corte para ACC, detección para FRM.
5. Working diario, revisión semanal, conciliación/lock mensual con corte de observación por componente y comparación trimestral con baseline equivalente. Revisión inmutable con lineage; correcciones auditadas crean versión nueva.
6. Responsabilidad, disponibilidad de datos y permisos independientes. API primitive server-side común, filtros/aggregates no filtran información prohibida; UI Person 360 sólo presenta.
7. Shadow antes de uso formal. Sin ranking individual, bonus nuevo, writeback Notion de liderazgo ni evaluación adversa automatizada.

### Decisión específica: RpA como intensidad de retrabajo

Se incorpora **Rounds per Asset (RpA)** al contexto de liderazgo del mismo catálogo ICO. [LEADERSHIP_RPA_V1](metrics/LEADERSHIP_RPA_V1.md) es la autoridad única de definición, cálculo, distribución, cohortes, ejemplos y evidencia; este ADR registra el porqué y los límites, no otra fórmula.

FTR no distingue una ronda de cuatro una vez que falla la primera entrega. RpA sí describe esa intensidad; ambos comparten origen y deben leerse juntos. No se consideran dos factores independientes para puntuar o pagar. Elegimos conservar el contador canónico de correcciones del cliente y agregarlo sobre la cohorte completada atribuible al líder, manteniendo la contribución individual separada.

**Resultado cerrado y riesgo abierto son perspectivas distintas.** El primero permite comparar cierres; la segunda expone rondas acumuladas, antigüedad y casos aún sin finalizar para evitar que ocultar o retrasar cierres mejore artificialmente la cifra. Las señales abiertas no se suman al resultado de completados ni se presentan como aprobaciones sin cambios.

**La cobertura es parte del contrato, no una nota opcional.** La inspección de calculateRpaV2 y countCorrectionTransitions confirma que sourceMode canonical prueba existencia de alguna transición, no historia íntegra. El wrapper de liderazgo debe certificar identidad, primera revisión, continuidad de captura, deduplicación, temporalidad y evidencia compartida con FTR. Esto puede degradar un valor que el helper individual considera valid sin cambiar ese helper por esta decisión.

**Interpretación responsable:** las rondas describen fricción de entrega, no culpa ni horas perdidas. Cambios de alcance y preferencias del cliente se segmentan con motivos auditados; no se eliminan del contador por conveniencia. Cohortes de transferencia, complejidad y mejor captura pueden explicar cambios. STI compara unidades de rondas por asset y dirección descendente, no puntos porcentuales.

**Efecto esperado en Daniela:** anticipar ambigüedad del brief, mejorar el filtro de calidad, consolidar feedback y atender recurrencias con su equipo. La revisión semanal enlaza casos y acciones; POTD, carga y backlog actúan como guardrails frente a una reducción de RpA conseguida a costa de demora, sobrecarga o silenciamiento del cliente.

### Decisión sobre operación y equidad

Adoptar el [protocolo compartido §11](GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md#11-protocolo-operativo-de-medición-y-mejora--contrato-propuesto): captura a cargo del responsable operativo/contacto receptor, aseguramiento diario por líder/suplente, integridad por ICO y revisión independiente. No depender del director para registrar cambios; no confundir sincronización técnica con cobertura del feedback real.

La calidad de cohorte se conserva al transferir o suplir; exposición y acciones posteriores se muestran aparte. Causas contextualizan, no restan rondas. La revisión semanal produce acciones con dueño, fecha y verificación de efectividad, sin convertir ejecución de checklist en mejora. Menos rondas junto a más espera/sobrecarga requiere revisión, no celebración automática.

La persona evaluada conoce policy y puede controvertir evidencia. Correcciones no se autoaprueban ni sobrescriben cierres; suspender interpretación del componente controvertido. Baseline/metas/calendario se aprueban prospectivamente. Elegimos esta separación frente a evaluación inmediata, autoaprobación del líder o un gate personal de Daniela para todas las entregas.

**RpA es rondas, no tiempo:** no prometer rapidez ni ahorro de horas a partir de su descenso. **Compatibilidad documental:** RPA_V1 queda intacto, liderazgo vive en LEADERSHIP_RPA_V1, indexado en ICO; cualquier corrección del canon base requiere trabajo independiente.

### Precisiones de revisión adversarial — 2026-09-19

El [contrato compartido](GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md) y specs incorporan seis correcciones: manifest histórico además del operativo; autorización específica para capacidad total cross-account; una observación de calidad por asset con período ancla/revisiones ante reapertura; cohorte FRM distinta de su observación/maduración; STI con pesos normalizados en C_k y baseline mensual explícito; technicalShadowReady separado de evaluationReady.

No son cambios al RpA individual ni activación automática de permisos. Estas decisiones son propuestas verificables: los fixtures se exigen en TASK-1879/1880/1881, no se consideran pruebas runtime por estar escritos. [Informe adversarial](../audits/EPIC-048_LEADERSHIP_METRICS_ADVERSARIAL_REVIEW_2026-09-19.md).

### Consecuencias sobre código, datos y consumidores (planificación)

- TASK-1879: contrato de identidad global/ciclo, primera revisión y cobertura; no fabricar historia desde estado actual.
- TASK-1880: wrapper ICO sobre helpers existentes, población compartida FTR/RpA, estadísticas reproducibles, snapshots/revisiones y DTO de cerrados/abiertos separados. Validar límites semiabiertos de negocio contra el helper inclusivo, sin lógica duplicada en lectores.
- TASK-1881: presentar valor, unidad, conteos, cobertura y motivos; detalle de distribución y cola abierta desde el DTO autorizado, sin cómputo en UI.
- No se crean propiedades Notion, migraciones, flags, writebacks ni cambios salariales por editar el ADR.

## Alternatives Considered

| Alternativa | Beneficio | Motivo para no elegir |
|---|---|---|
| Mantener sólo ICO individual | Sin nueva proyección | No representa liderazgo con pocas tareas propias |
| Acreditar todas las tareas del equipo a Daniela | Score aparentemente completo | Duplica crédito, rompe ownership y frontera Payroll |
| Lista fija de cuentas/miembro | Piloto rápido | Quinta cuenta y cambios históricos requieren código/config manual |
| Todas las cuentas donde trabaja su equipo | Descubrimiento fácil | Colaboradores compartidos amplían responsabilidad indebidamente |
| Heredar toda la agencia del cargo | Onboarding automático | No hay alcance/precedencia temporal aprobados; confunde jerarquía con responsabilidad |
| Score ponderado único con bono | Lectura simple | Pesos no calibrados, mezcla unidades/confianza y oculta riesgos |
| Sólo FTR para calidad | Fácil de leer | Oculta intensidad después de la primera corrección |
| Sustituir FTR por RpA | Un número menos | Un promedio idéntico puede esconder distribuciones muy distintas |
| Promediar RpA por cuenta sin pesos de muestra | Cada cuenta pesa igual | Cambia la unidad; no representa rondas por asset de la cartera |
| Mezclar abiertos y completados | Detecta trabajo actual | Confunde resultados parciales con finales; elegimos señales separadas |
| Restar cambios por motivo editable | Aparente justicia | Facilita manipulación y cambia fórmula sin evidencia; motivos sólo contexto |
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
- Pruebas RpA/FTR de cohorte idéntica, eventos previos al mes, límites, reaperturas, cola abierta, duplicados, cobertura parcial y ejemplos numéricos de LEADERSHIP_RPA_V1; gates sin promedios de promedios ni cero por ausencia.
- Certificar protocolo §11: captura fuera de canal, suplencias, revisión independiente, acciones sin efecto, tradeoffs, controversias/revisiones y metas prospectivas; owner y evidencia por task.
- Configuración aprobada de mínimos/SLA/calendario/baseline antes de activar evaluación; sin defaults ocultos.
- TASK-1881 verifica GVC/teclado/390px y confianza/cartera variable sin fórmulas nuevas.
- Shadow dos cierres mínimo; STI requiere trimestre actual y baseline de tres meses comparable (seis si se empieza sin historia).
- Ningún gate implica aprobación HR/Finance de compensación ni habilitación de cuentas externas.

## Revisit When

Cambio de fuente/método, primer scope organizacional heredado, segundo tipo de líder con responsabilidad distinta, conflictos frecuentes entre leads, ausencia de historia de primera revisión, metas salariales propuestas o budgets de escala excedidos. Cualquier efecto en Payroll necesita ADR/policy independiente y prospectiva.
Si baseline/mix impide comparación, publicar no_comparable y revisar instrumento; no forzar normalización para producir una nota.

## Decision log

2026-09-19: formalización solicitada por el operador; specs sustantivas y ADR Proposed creados. Implementación, acceptance del ADR y rollout no realizados por este commit.

2026-09-19 (ampliación): incorporación explícita de RpA a liderazgo ICO; contexto separado en LEADERSHIP_RPA_V1, sin editar la spec base. Propuesta documental; sin implementación, publicación de métricas ni activación salarial.

2026-09-19 (cierre de diseño): resueltos captura, control/atribución, suplencias, seguimiento de acciones, autonomía y revisión prospectiva. Spec RpA original restaurada; contexto liderazgo separado. Aprobación/implantación de policy y personas, datos de calibración y rollout siguen pendientes; no cambia el estado Proposed.
