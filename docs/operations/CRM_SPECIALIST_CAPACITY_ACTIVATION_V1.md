# Activar capacidad especializada de CRM y RevOps — V1

> **Estado:** playbook de diseño para validación, 2026-10-09; no evidencia de pilotos activos.
> **Owner:** RevOps & CRM + Talent/Operations + Commercial; gates de Finance y Legal/Privacy.
> **Entrada:** [servicio](../services/revenue-operations-crm/CRM_SPECIALIST_CAPACITY_SERVICE_V1.md),
> [modelo](../business-models/revenue-operations-crm/CRM_SPECIALIST_CAPACITY_BUSINESS_MODEL_V1.md),
> [ADR aceptado](../architecture/EFEONCE_REGIONAL_CRM_CAPACITY_SERVICE_DECISION_V1.md).

## Secuencia y evidencias de activación

| Etapa | Owner | Evidencia / salida requerida |
|---|---|---|
| 1. Intake y discovery | Commercial + RevOps & CRM | Problema/backlog, objetivos, plataforma/edición, comprador, operador y modalidad; fuente separada de inferencia |
| 2. Diseñar capacidad | Talent/Operations + práctica | Rol real, seniority, dedicación, reporting, RACI, owner Senior/Lead y reserva de respaldo disponibles |
| 3. Verificar competencias | Talent + verificador de práctica | Scorecard y work sample pertinentes; evidencia contextualizada, gaps y decisión humana; sin claim formal hasta policy aplicable |
| 4. Habilitar configuración | Legal/Privacy + HR/Workforce + Finance | Matriz contractual completa, privacidad/seguridad, entidad de firma/facturación e impuestos validados |
| 5. Costear y aprobar oferta | Finance/Pricing + Commercial | Costo completo, capacidad reconciliada, margen/pago/FX, alcance y condiciones; no trasladar reservas ocultas al colaborador |
| 6. Contratar y activar | Commercial + Account Lead + operador cliente | SOW/contrato, accesos, baseline, backlog, aceptación, horarios, responsabilidades y plan de salida |
| 7. Entregar y aprender | Especialista + owner de calidad | Primera entrega aceptada, QA, memoria y formación aplicada; cambios aprobados por carril adecuado |
| 8. Revisar y decidir | Operador cliente + Talent/Operations + Finance | Calidad, supervisión, bienestar, continuidad y economics; renovar, ajustar o cerrar con razones |

La aprobación documental del servicio ya existe. Estas etapas concretan cada operación; no reabren esa
decisión ni autorizan contratos o comunicaciones por sí mismas. Conservar evidence y permisos en los
sistemas canónicos existentes. Una carpeta manual no es un nuevo ATS o skills registry.

## Matriz de habilitación regional

Para cada engagement registrar **país del cliente, ubicación de trabajo de la persona, empleador/contratante,
dirección efectiva, modalidad contractual, entidad que firma/factura, moneda/impuestos y transferencias de
datos**. El país del cliente no resuelve por sí solo la jurisdicción laboral o fiscal.

| Mercado operativo | Estado de habilitación de esta nueva oferta | Foco de validación |
|---|---|---|
| Chile | Pendiente por configuración | Servicio gestionado vs suministro de personas; empleador, dirección y responsabilidades |
| Estados Unidos | Pendiente por configuración | Clasificación y reglas federales/estatales aplicables; ubicación real y tributación |
| Colombia | Pendiente por configuración | Modalidad, dirección, obligaciones, facturación y transferencias de datos |
| México | Pendiente por configuración | Diferenciar puesta a disposición de personal y servicios especializados; evaluar requisitos/REPSE cuando corresponda |
| Perú | Pendiente por configuración | Modalidad, dirección, obligaciones, facturación y transferencias de datos |

Pendiente significa sin dictamen ni contrato habilitante registrado para esta oferta, no inexistencia de
operación previa de Efeonce. Staffing/Staff Augmentation son etiquetas comerciales: la realidad de dirección
y prestación determina la revisión. Un EOR, contractor o contrato remoto no resuelve automáticamente el
suministro de personal. Cambiar el nombre a «managed» sin cambiar la dirección real tampoco lo resuelve.

Señales jurídicas oficiales consultadas el 2026-10-09:
[STPS, reforma de subcontratación México](https://www.gob.mx/stps/articulos/reforma-en-materia-de-subcontratacion?idiom=es)
y [Dirección del Trabajo Chile](https://www.dt.gob.cl/portal/1628/w3-article-94215.html).
Son referencias para identificar riesgo, no dictamen de habilitación de este servicio. Las otras configuraciones
requieren su propia revisión vigente. Registrar fuente, fecha, profesional responsable y alcance de la validación.

## Contenido del expediente de capacidad

- Necesidad, rol/seniority/plataforma, dedicación neta y reporting por modalidad.
- Competencias críticas, prueba relacionada con el trabajo, rúbrica, evidencias observadas/declaradas/inferidas
  separadas y verificador humano; nivel/contexto, fecha, vigencia propuesta y gaps aceptados.
- Owner y backup disponibles, plan de ausencias, memoria de cuenta y transición; fijar SLA sólo si se puede financiar.
- Plan de formación con tiempo reservado, fuentes oficiales, revisión y aplicación práctica. Como hipótesis de
  piloto, seguimiento mensual de aprendizaje y checkpoints 30/60/90; cadence final en SOW/policy, sin prometer
  estos períodos como universalmente configurados en Greenhouse.
- Costeo y oferta aprobados con versión, impuestos/FX/pago; datos de salarios/costos en acceso restringido.
- Contrato y DPA cuando corresponda; IP sobre configuraciones, código y playbooks; confidencialidad,
  subprocesadores, usos de IA autorizados, retención, minimización y procedimiento de incidentes.
- Licencias y permisos mínimos nominativos, MFA cuando corresponda, logs/cambio/rollback y revocación al salir.
  El cliente conserva titularidad de sus cuentas; no compartir credenciales ni cargar datos a IA sin autorización.
- Reglas de aceptación/cambios, escalamiento, sustitución con equivalencia de capability/contexto, salida y
  eventual contratación directa. Plazos, tarifas y penalidades se negocian; no hay cifras aprobadas aquí.

## Piloto pagado: diseño y scorecard

Proponer dos o tres pilotos con un workflow o backlog priorizado y ventana acordada. Incluir baseline,
dependencias y quién dirige antes de valorar resultados. Cada piloto debe sostener su economía o tener
una inversión de validación aprobada explícitamente. No prometer una fecha de inicio sin capacidad.

| Indicador | Cómo registrar | Responsable |
|---|---|---|
| Tiempo a primer valor | Días desde activación hasta entrega aceptada y usada; separar demoras por dependencias | Account Lead + operador |
| Calidad | Entregas aceptadas, defectos/retrabajo, incidentes y severidad contra rúbrica acordada | Owner de calidad |
| Autonomía | Horas de supervisión del cliente y Efeonce; causas y tendencia | Operador + lead |
| Formación aplicada | Aprendizaje completado y ejemplo observable en entrega | Especialista + verificador |
| Continuidad | Evidencia de handoff y ejercicio acotado del backup con accesos autorizados | Operations |
| Experiencia | Feedback del operador y del especialista; carga y condiciones de trabajo | CX + Talent |
| Economics | Ingreso/costo completo real, contribución, utilización/reservas y pago | Finance |
| Compra siguiente | Renovación/expansión decidida y motivo; rechazo también es evidencia | Commercial |

Antes de firmar, cada owner fija thresholds de aceptación pertinentes al caso; no rellenar metas con números
inventados. Cerrar con `go`, `re-scope`, `re-price`, `hold` o `no-go` razonado. Detener o ajustar ante vacíos
contractuales, falta de competencia/acceso, sobreasignación, ausencia de backup financiado, vulneración de
datos o supervisión incompatible con el modelo. La continuidad protege al cliente y a la persona.

## Talent Assurance: implementación separada

El [ADR transversal](../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md), arquitectura objetivo
y guardrails económicos fueron aceptados por el operador. La revisión documental no certifica operación live.

| Pendiente | Owner / unidad existente | Criterio de salida |
|---|---|---|
| Policy de claims/evidencia, vigencia, apelación y verificador | Talent + Workforce + Delivery + Privacy / TASK-1602 | Política versionada y revisión de dominios; emisión humana limitada |
| Estándares y quality gate por rol | Talent + práctica / TASK-1603 y TASK-1604; foundation TASK-1719 | Evaluación calibrada y gate para el contexto, sin banco paralelo |
| Factibilidad económica operacional | Finance + Commercial / TASK-1607 | Costos/capacidad vigentes y decisión humana auditable |
| Outcomes y continuidad | Talent + CX + Operations / TASK-1605 y TASK-1606 | Evidencia útil, shareable y privacy-reviewed |
| Proyecciones/cockpit y agentes | Dueños técnicos / TASK-1608 a TASK-1611 | API parity, acceso, evals y promoción acotada antes de claims o autonomía |

La automatización no es requisito para estudiar demanda o diseñar un piloto manual con evidencia y controles.
El manual no autoriza usar `Verificado por Efeonce` como sello formal antes de completar la policy. CRM conserva
su flujo de investigación, cambios autorizados y readback; el registro de un lead no autoriza outreach.

## Evidencia documental

[Aprobación, verificación y conservación de contexto](../audits/commercial/2026-10-09-crm-capacity-talent-assurance-documentation.md).
El cierre documental no acredita activación comercial ni runtime.
