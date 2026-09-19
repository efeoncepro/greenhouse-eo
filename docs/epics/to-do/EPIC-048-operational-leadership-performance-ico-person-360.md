# EPIC-048 — Operational Leadership Performance in ICO and Person 360

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño; tres hijas TASK-1879–1881 registradas to-do, sin implementación ni cambio de bono`
- Rank: `TBD`
- Domain: `delivery|ico|people|ui|payroll-boundary`
- Owner: `unassigned`
- Branch: `develop` (checkout compartido; no crear branch ni worktree por este epic)
- GitHub Issue: `none`

## Summary

Crear una evaluación **del liderazgo de la operación** para cualquier líder y todas las cuentas bajo su responsabilidad durante el período. Daniela Ferreira con SKY, Berel, Motogas y Efeonce interno es sólo el piloto de validación, nunca la lista del producto. ICO calculará resultados y señales por la cartera/equipo que dirige, mientras Person 360 presentará un scorecard explicable en su perfil. Su baja cantidad de tareas ejecutadas personalmente no debe inflar ni deprimir la lectura de su gestión. El epic **no cambia Payroll, compensaciones, fórmulas del bono ni períodos ya cerrados**.

## Why This Epic Exists

`metrics_by_member` y Person 360 acreditan tareas al **primary owner**. Eso es correcto para ejecución individual, pero no responde si quien dirige la operación asignó bien el trabajo, detectó riesgos, sostuvo calidad y mejoró el desempeño de su cartera dinámica. Usar la pequeña muestra de tareas propias de Daniela para evaluar su jefatura produce una comparación engañosa; atribuirle como propias todas las tareas del equipo rompería el contrato de ICO y podría afectar bonos. La solución cruza Delivery, ICO, responsabilidades operativas, People/Person 360 y el límite de Payroll, por lo que requiere varias unidades ejecutables.

## Outcome

- ICO distingue `individual contribution` (primary-owner credit vigente) de `operational leadership` (accountability por cartera y período); nunca duplica crédito individual.
- El resultado de la cartera muestra cada cuenta y un agregado con numerador/denominador, cobertura, frescura, confianza, cambios de scope y fuentes trazables.
- La vista de Daniela explica qué va bien, dónde intervenir, qué datos faltan y cómo evolucionó el equipo, sin convertir actividad o volumen en desempeño.
- El scorecard mensual se congela con versión de método y evidencia, mientras las alertas diarias y revisiones semanales permanecen operativas/provisionales.
- Una eventual conexión del scorecard al bono requiere **decisión nueva, prospectiva y aprobada por HR/Finance**; no es entrega de este epic.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_OPERATIONAL_ATTRIBUTION_MODEL_V1.md` — owner individual vs responsabilidad por space.
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md` — buckets, corte mensual y snapshots `working`/`locked`.
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` + `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` — materialización y fuentes.
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` + `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md` — equipo, jerarquía y assignments.
- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — consumo actual exclusivo de OTD/RpA individuales para bono.
- `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md` — lectura personal y límites de audiencia.
- `docs/architecture/ui-platform/README.md` + `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — diseño y QA de la vista.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — placement; no se autoriza nuevo servicio/repositorio.

## Decision Gates

1. **ADR Proposed ya redactado antes de schema/projections**: revisar y aceptar `leader × account × effective period`, universo de tareas, membresía temporal del equipo, crédito vs accountability, snapshots, versión de fórmula, privacidad/acceso y relación explícita con Payroll. Reconciliar con los ADR existentes; no adoptar una nueva fórmula por escribir este epic.
2. **Binding de cartera**: resolver desde responsabilidades todas las cuentas de cada líder/período con identidad canónica e intervalos efectivos; validar en runtime el piloto por separado. V1 utiliza asignación explícita por cuenta/space: organización/departamento no hereda cuentas sin política aceptada. No hardcodear su nombre, email o cuatro IDs en el calculador. Resolver cambios de lead y coberturas parciales por vigencia; `reporting_lines` por sí sola no prueba ownership de una cuenta.
3. **Calidad de fuente**: medir cobertura real de task owner, status transitions, correcciones, cambios de fecha y motivo confirmado en **cada** workspace, especialmente Berel y Motogas. La captura documentada para Efeonce/SKY no autoriza inferir paridad en los otros dos. Sin fuente suficiente, estado `unavailable`/`low_confidence`, no 0 ni 100.
4. **Compensación**: HR/Finance decide por separado si existe política futura de bono para liderazgo, sus pesos, umbrales, excepciones, vigencia y consentimiento/comunicación contractual. Este epic sólo produce evidencia operativa en shadow mode.

## Dynamic portfolio invariant

La pertenencia nace de responsabilidades operativas efectivas, no de tareas del equipo, permisos, cuentas con métricas ni sources habilitadas. TASK-1879 posee el manifest temporal completo; TASK-1880 lo materializa incluyendo cuentas sin datos y TASK-1881 lo presenta sin cardinalidad fija.
Alta de cuenta/asignación, acceso e integración son actos separados. Cuenta no conectada sigue visible para observadores autorizados como pending_source; habilitar un nuevo proveedor no soportado requiere adapter, no se promete ingestión automática universal.
Canary allowlist sólo controla rollout temporal, con owner y condición de retiro. El producto descubre todas las carteras elegibles y nuevas cuentas soportadas sin editar código/deploy. Herencia a toda la agencia no se deduce del cargo; V1 por cuenta/space explícito.
Cierres preservan manifestVersion/intervalos; altas/bajas no reescriben historia. STI separa cambios de composición de mejora real. Paginación de cuentas no cambia agregado; permisos se aplican también a totales/metadata para evitar inferencia de cuentas prohibidas.

## Workstream 1 — ICO calculation and evidence

### Unidad de evaluación

Grano propuesto: `leader_member_id × account_scope_id × period`, más rollup de cartera. El vínculo de responsabilidad se determina por `operational_responsibilities` vigente en el período y se reconcilia con asignaciones del equipo y jerarquía; se conserva el vínculo y método usados al cierre. El universo es la demanda de delivery elegible de la cuenta, **incluidas tareas sin responsable**, para que dejarlas sin asignar no mejore artificialmente el score. El crédito de Daniela como ejecutora sigue sólo en su ICO individual; sus entregas elegibles también forman parte del resultado de la cuenta una vez, sin crédito personal duplicado. Una tarea compartida no se duplica dentro de la misma cuenta; un cambio de cuenta/lead se resuelve con reglas temporales del ADR y evidencia de origen.

### Indicadores — definiciones canónicas

El [contrato funcional/técnico](../../architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md) y el [ADR Proposed](../../architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md) gobiernan este programa. Las fórmulas no se duplican en el epic:

| Indicador | Pregunta | Spec |
|---|---|---|
| Portfolio On-Time Delivery (POTD) | ¿Cumple la cartera sus compromisos? | [POTD](../../architecture/metrics/POTD_V1.md) |
| First-Time Right (FTR) | ¿Las entregas se aprueban sin correcciones? | [FTR §14](../../architecture/metrics/FTR_V1.md#14-contexto-de-liderazgo-operativo--proposed-2026-09-19) |
| Assignment & Capacity Coverage (ACC) | ¿Tiene dueño el trabajo y cabe en la capacidad? | [ACC](../../architecture/metrics/ACC_V1.md) |
| Flow Risk Management (FRM) | ¿Se atienden riesgos con evidencia y a tiempo? | [FRM](../../architecture/metrics/FRM_V1.md) |
| Sustained Team Improvement (STI) | ¿La mejora se sostiene en una cartera comparable? | [STI](../../architecture/metrics/STI_V1.md) |

Specs nuevos y extensión de liderazgo están **In design**, ADR **Proposed**; no cambian contratos individuales Accepted ni Payroll. Metas/SLA/mínimos y bindings requieren validación en ejecución.

### Contratos de cálculo

- Reusar lectores/fórmulas canónicas de ICO y `delivery_task_monthly_snapshots`; el scorecard de liderazgo es **una proyección nueva**, no un `UPDATE` de `metrics_by_member` ni una recalculadora dentro de Person 360.
- El DTO incluye período, account/leader binding, método/version, numerador, denominador, exclusiones, cobertura de fuente, frescura, lifecycle `working|locked|superseded` separado de confidence `valid|unavailable|low_confidence` y freshness `fresh|stale` y drill-down a tareas autorizadas. La agregación de cartera presenta también distribución por cuenta para que SKY no oculte Motogas por volumen.
- Snapshot `working` durante el mes y `locked` luego del corte canónico `period_end + 1 day` en `America/Santiago`, conciliación y revisión humana. Reproceso de período locked es una corrección versionada/auditada, nunca overwrite silencioso. No hay retroactividad de bono.
- El materializer corre detrás de freshness/quality gates, es idempotente, preserva el snapshot previo ante upstream degradado y emite observabilidad de cobertura/fallas. Los tests incluyen cuentas sin tareas, baja muestra, cambio de responsable, owner externo/sin asignar, fechas movidas, corrección faltante y carteras 0/1/4/5/51/201, dos líderes y alta/baja/reasignación sin código ni deploy para fuentes soportadas.
- La revisión diaria lee estado fresco; no se necesita un nuevo cron para pintar el perfil si puede consumirse el ciclo ICO existente. Cualquier nueva captura de owner/fecha/intervención exige definir writer, idempotencia, backfill y rollback antes de activarla.

## Workstream 2 — Person 360 leadership UI

**Ubicación:** `/people/[memberId]`, pestaña existente `Actividad` (`PersonActivityTab`), con un bloque o subvista `Team Delivery` que aparece por responsabilidad operativa vigente/histórica y entitlement, **no por `memberId` hardcodeado**. `Mi Desempeño` conserva su audiencia personal; si después se expone este bloque allí, debe usar el mismo reader y política de redacción, no una segunda fórmula. Sin destino nuevo en navegación.

**Lectura en primer fold:** identidad y rol → selector de período (mes en curso claramente `provisional` / mes cerrado `locked`) → cobertura de toda la cartera autorizada del período y estado de datos → resumen POTD y FTR con conteos → cola accionable de ACC/FRM. Debajo: comparación por cuenta, explicaciones/drill-down de tareas, tendencia de tres meses y registro de acciones. Las tareas propias/bono actual van en una sección separada y rotulada `Individual Contribution`; jamás se mezclan en una tarjeta única de “performance”.

**Estados y acceso:** `loading`, sin rol, cuenta sin binding, cero tareas legítimas, muestra insuficiente, correcciones no capturadas, sync stale, error parcial, acceso denegado, período provisional y locked. Acceso server-side por `views` + `entitlements` y scope de People/organización; Daniela podrá ver su resumen/equipo sólo con grants y scopes explícitamente verificados (self no concede acceso hoy); dirección/HR consulta únicamente detalle autorizado; terceros/clientes no ven evaluación personal ni tareas de otra cuenta. La UI no muestra importes ni inputs privados de Payroll. Los enlaces al drill-down conservan filtros de cuenta y autorización anti-IDOR.

**Diseño:** task UI `ui-standard` con dirección `repo-native-benchmark`, 2–3 alternativas, wireframe y flow cuando haya drill-down/sidecar, decisión de primitives `reuse` antes de `extend`, `CompositionShell` para composición nueva, copy en `src/lib/copy/*` y GVC premium desktop + 390 px. Evitar “card soup”, semáforo como lenguaje principal y gráficos vacíos de muestras pequeñas. Reusar el trabajo de storytelling de EPIC-018/TASK-1075–1076; no duplicar primitives ni rehacer Agency ICO. La task UI documentará el contrato de implementación y `UI ready` seguirá `no` hasta pasar los gates de diseño.

## Cadence and rollout

1. **Daily:** captura/materialización y cola de riesgos/ownership; operativo, provisional, sin puntuación salarial.
2. **Weekly:** revisión interna de toda la cartera vigente, incluidas altas/bajas: excepciones, capacidad, decisiones y seguimiento; registrar intervenciones con actor/fecha/motivo cuando exista el comando gobernado.
3. **Monthly:** corte ICO al día siguiente de fin de mes, conciliación de cobertura y lock del scorecard con método/alcance; una cuenta no evaluable queda explícita.
4. **Quarterly:** STI sobre tres cierres actuales y baseline comparable de tres meses locked; seis meses si no existe historia certificada. Revisar cambios estructurales del equipo/cartera.
5. **Shadow mode:** dos o tres meses para calibrar muestras, umbrales, carga operativa y false positives antes de considerar cualquier evaluación formal o propuesta de compensación. Staging primero, luego rollout interno con readback; no cliente ni Payroll automáticamente.

## Child Tasks

Tres unidades registradas en orden de dependencia; todas `to-do`, sólo planificación:

- [TASK-1879](../../tasks/to-do/TASK-1879-leadership-accountability-source-foundation.md) — **[backend-data, foundation]** ADR, resolver de cartera dinámica, cobertura por cuenta y atribución temporal, capacidad interna y captura gobernada faltante. Entrega fuentes/fixtures al cálculo sin inventar historia.
- [TASK-1880](../../tasks/to-do/TASK-1880-ico-leadership-performance-engine.md) — **[backend-data]** Proyección ICO POTD/FTR/ACC/FRM/STI, snapshots/revisiones, confianza, reader/API parity, cierre e intervenciones auditadas, migración/rollback y shadow. Depende de TASK-1879.
- [TASK-1881](../../tasks/to-do/TASK-1881-person-360-leadership-performance-ui.md) — **[ui-ux]** Person 360/Actividad con dirección, wireframe, flow/motion, cobertura/estados, drill-down y GVC. Depende de TASK-1880; sin cálculos cliente.

Política de compensación fuera del alcance: sólo una solicitud nueva y explícita de HR/Finance podría originar otra unidad. No es cuarta hija ni prerrequisito de estas tres.

## Existing Related Work

- `EPIC-018` / `TASK-1075` / `TASK-1076`: storytelling y primitives de las superficies ICO; **reusar**, no reabrir su cálculo.
- `EPIC-009` / `TASK-732`–`TASK-735`: integridad y freeze de ICO→Payroll; dependencia de seguridad, no ownership del scorecard de liderazgo.
- `EPIC-006`: memoria de señales ICO; FRM puede consumir sus observaciones, pero no presupone que las transiciones de intervención ya estén operativas.
- `TASK-908` / `TASK-909` / `TASK-921`: transiciones, FTR y cambios de fecha; verificar cobertura por workspace antes de usar en evaluación.
- `src/lib/ico-engine/{materialize,read-metrics,metric-trust-policy}.ts`, `src/lib/person-360/get-person-ico-profile.ts`, `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`, `src/lib/operational-responsibility/readers.ts` — superficies existentes verificadas en repo; ubicación final del nuevo reader la decide la task backend.

## Exit Criteria

- [ ] Quinta cuenta sin fuente aparece como pendiente al siguiente ciclo, sin código/deploy ni activación/grant automático; fuente soportada se habilita por proceso gobernado.
- [ ] 51/201 cuentas, dos líderes, cambios de cartera y paginación mantienen universo/denominadores y acceso sin truncado ni fuga.
- [ ] Manifest cerrado conserva historia; comparación distingue scopeChanged y canary no se convierte en listado permanente.

- [ ] ADR revisado/aceptado, resolver de cartera líder/período completo y piloto validado por separado; quinta cuenta y segundo líder se incorporan por commands sin código/deploy.
- [ ] Cobertura de status/correcciones/cambios de fecha/owner medida por cuenta; gaps resueltos o expuestos honestamente.
- [ ] ICO calcula los indicadores con fórmulas/versiones y fixtures reproducibles, sin cambiar OTD/RpA individual ni crédito primary-owner.
- [ ] Cada cuenta y rollup muestran numeradores, denominadores, muestra, cobertura, frescura y estados de confianza; no hay 0/100 inventados.
- [ ] Mes cerrado queda locked y una corrección posterior conserva historia/auditoría; upstream degradado no destruye datos buenos.
- [ ] Person 360 muestra liderazgo y contribución individual separados, con acceso server-side por audiencia/scope, drill-down autorizado y cero datos de Payroll.
- [ ] UI cumple dirección visual, readiness, desktop/390px, teclado, reduced motion, ausencia de overflow y GVC premium con revisión enterprise.
- [ ] Shadow compare de al menos dos cierres mensuales y una revisión trimestral explicable; owner operativo valida utilidades/false positives.
- [ ] Payroll/compensaciones y períodos históricos permanecen intactos; ninguna vinculación salarial entra sin decisión HR/Finance separada y prospectiva.
- [ ] Tasks hijas, documentación funcional/manual, observabilidad, rollout/rollback y readback runtime registrados antes de mover el epic a `complete`.

## Non-goals

- Recalcular o corregir retroactivamente el bono de Daniela o de su equipo.
- Cambiar las fórmulas actuales de OTD/RpA por persona, `metrics_by_member` o el primary-owner credit.
- Calificar por cantidad de tareas propias, horas conectada, reuniones o volumen de mensajes.
- Usar satisfacción del cliente como proxy automático sin instrumento y muestra confiables.
- Mostrar un ranking entre líderes/cuentas con muestras y mixes no comparables.
- Crear un servicio, checkout, herramienta de reuniones o dashboard paralelo a Person 360.

## Delta 2026-09-19

Epic creado por pedido del operador para separar medición de liderazgo operativo de ejecución individual. Se registraron las tres hijas con ownership de código/DB/UI, dependencias, acceptance, rollout/rollback y artefactos de diseño. Estado estrictamente documental; no hay implementación, cambio de acceso ni impacto salarial.

### Corrección de alcance — cartera dinámica

Por solicitud del operador, las tres tasks y sus contratos UI sustituyen el universo fijo por responsabilidades temporales; el piloto sólo aporta validación inicial. Sin implementación ni cambio de arquitectura aceptada: el ADR de TASK-1879 mantiene su gate.

### Definiciones técnicas y ADR — 2026-09-19

Contrato compartido, cuatro specs nuevas y extensión FTR §14 formalizados; ADR Proposed indexado. Las tasks consumen estas definiciones, no mantienen fórmulas paralelas. Sin implementación ni evaluación real de Daniela.
