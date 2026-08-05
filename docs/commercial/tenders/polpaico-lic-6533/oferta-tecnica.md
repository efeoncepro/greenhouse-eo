# Oferta técnica — Implementación de Agente de IA para Post Venta · Polpaico

> **Estado:** borrador interno en HOLD; **no enviar ni cargar en Wherex**. Condicionado a validación de capacidad,
> certificaciones, partnership, referencias, respuestas del comprador y pricing de Finance. **Licitación:**
> LIC-6533 / Wherex. **RFP:** v3.0 consolidada, julio 2026. **Cierre histórico:** 24/08/2026 16:00 Chile.

## Zona 0 — Ledger de evidencia

| Ref | Claim | Fuente | As-of | Audiencia |
|---|---|---|---|---|
| E1 | El servicio solicitado es la implementación de Agentforce sobre Service Cloud existente | RFP §§1, 3 y 6; `bases/rfp-extract.md` | 2026-07 | client-facing |
| E2 | El canal actual informado es Email-to-Case y existen tareas manuales de lectura, clasificación, resumen, derivación y respuesta | RFP §3 | 2026-07 | client-facing |
| E3 | La operación debe mantener supervisión humana, trazabilidad, auditoría y permisos Salesforce | RFP §§7–8 y Anexo A | 2026-07 | client-facing |
| E4 | Los criterios ponderan 30% técnico/funcional, 25% experiencia, 10% equipo, 15% metodología y 20% economía | RFP §13 | 2026-07 | client-facing |
| E5 | El RFP exige separar servicios, licencias, Flex Credits y costos recurrentes | RFP §14 y Anexo C | 2026-07 | client-facing |
| E6 | El pago se realiza a 60 días desde la emisión de la factura | RFP Anexo D | 2026-07 | client-facing |
| E7 | El proceso corresponde a Wherex LIC-6533 y cierra el 24/08/2026 a las 16:00 hora de Chile | Invitación Outlook de Wherex | 2026-07-24 | client-facing |
| E8 | Efeonce cuenta con certificaciones, referencias o delivery Salesforce/Agentforce | Pendiente de evidencia interna | — | internal |

## 1. Resumen ejecutivo

Polpaico necesita incorporar inteligencia asistida en Post Venta sin perder el control de la operación. La propuesta plantea una primera implementación gobernada dentro de Salesforce Service Cloud: el agente analiza el caso, sugiere clasificación, identifica faltantes, prepara un resumen y propone una respuesta; el ejecutivo del CSC valida y decide. El diseño prioriza capacidades nativas, trazabilidad, seguridad, administración por Polpaico y una ruta de evolución documentada.

La adjudicación queda condicionada a presentar un equipo con los perfiles y certificaciones exigidos, referencias comprobables y una cotización validada por Finance.

## 2. Comprensión del requerimiento

El desafío no es automatizar el cierre de casos. Es reducir trabajo repetitivo y variabilidad en la entrada del caso para que el CSC pueda decidir mejor y cumplir sus SLA. La solución debe ser útil desde el primer flujo y, al mismo tiempo, no convertirse en una caja negra ni en una dependencia técnica permanente.

## 3. Solución propuesta — hipótesis de diseño

1. **Ingesta:** Email-to-Case y registros del caso quedan dentro de Service Cloud; los adjuntos se procesan según capacidades y límites validados en discovery.
2. **Comprensión:** Agentforce identifica hechos, información faltante y señales de riesgo usando fuentes autorizadas.
3. **Sugerencia:** Topics, Actions y Prompt Templates producen clasificación, resumen, próximos pasos y borrador de respuesta.
4. **Control:** el ejecutivo revisa, acepta o corrige; los casos ambiguos se escalan y todas las acciones quedan auditadas.
5. **Medición:** dashboards y logs separan uso, precisión, derivación manual, productividad y adopción.
6. **Evolución:** la documentación y la transferencia permiten agregar Topics, Actions, Knowledge y reglas sin rediseñar la base.

La arquitectura final debe confirmarse contra la edición, licencias, sandbox, permisos, Knowledge, volúmenes y límites de Agentforce de Polpaico.

## 4. Arquitectura y gobierno

La oferta final incluirá un diagrama de componentes que distinga Service Cloud, Email-to-Case, casos/adjuntos, Knowledge autorizado, Agentforce, configuración de Topics/Actions/Prompts, métricas, logs, permisos y usuarios CSC. Se declarará para cada componente si cumple estándar Salesforce, requiere configuración, desarrollo, herramienta de terceros o no cumple, usando la escala del Anexo B.

## 5. Método y cronograma

| Fase | Resultado | Dependencia |
|---|---|---|
| Levantamiento | mapa de proceso, taxonomía, Knowledge, permisos, riesgos y baseline | acceso a sandbox/equipo Polpaico |
| Diseño | arquitectura, Topics, Actions, prompts, grounding, métricas y plan UAT | decisiones funcionales y técnicas |
| Construcción | configuración, parametrización y componentes justificados | ambientes y aprobaciones |
| Validación | unitarias, funcionales, UAT y corrección de defectos | casos representativos y criterios de aceptación |
| Go-live | despliegue, reversa y acompañamiento | ventana de cambio aprobada |
| Hypercare | incidentes, ajustes menores, seguimiento y transferencia | SLA/horario por acordar |

Las duraciones y la fecha de salida quedan por dimensionar con volúmenes, disponibilidad de ambientes y respuestas del comprador.

## 6. Seguridad, calidad y human-in-the-loop

No se propone envío automático ni cierre automático. El agente recomienda y el usuario decide. La solución respetará el modelo de permisos Salesforce, limitará las fuentes de grounding a contenido autorizado, registrará acciones y conservará una ruta de revisión de excepciones. Los criterios de precisión, seguridad, aceptación y rollback deben acordarse antes de UAT.

## 7. Equipo y experiencia

Se adjuntarán CV resumidos, certificaciones vigentes, dedicación estimada y referencias de proyectos similares para Arquitecto Salesforce, Consultor Agentforce, Consultor Service Cloud, Especialista IA Generativa y Jefe de Proyecto. Esta sección no puede cerrarse con nombres o credenciales no verificadas; ver `matriz-admisibilidad-INTERNO.md`.

## 8. Transferencia, soporte y garantía

La propuesta final incluirá capacitación para usuarios CSC, administradores funcionales y administradores técnicos; documentación de arquitectura, configuración, operación, prompts, Topics, Actions y dependencias; y una matriz de escalamiento con horarios, severidades, SLA, garantía y duración de hypercare. Estos parámetros están pendientes de confirmación.

## 9. Matriz funcional obligatoria — borrador de respuesta

| ID | Requerimiento | Respuesta propuesta | Evidencia / condición |
|---|---|---|---|
| RF-01 | Analizar correos entrantes | CF | Confirmar Email-to-Case y configuración Agentforce |
| RF-02 | Analizar archivos adjuntos | CF / D | Validar tipos, límites y tratamiento de datos |
| RF-03–RF-05 | Categoría, subcategoría y línea de negocio | CF | Requiere taxonomía actual y criterios Polpaico |
| RF-06 | Detectar información faltante | CF | Definir reglas, prompts y casos de evaluación |
| RF-07 | Generar resumen ejecutivo | CF | Validar formato y campos de salida |
| RF-08 | Sugerir respuesta preliminar | CF | Siempre con aprobación humana |
| RF-09 | Usar Salesforce Knowledge | CF | Confirmar cobertura, calidad y permisos de Knowledge |
| RF-10 | Registrar trazabilidad | CF | Confirmar logs, auditoría y retención |
| RF-11 | Incorporar métricas de uso | CF | Acordar definiciones, baseline y dashboard |
| RF-12 | Permitir administración por Polpaico | CF | Capacitación y permisos por definir |

La clasificación `C/CF/D/T/NC` final depende de la validación técnica del org y del equipo certificado. No se presentará como cumplimiento cerrado antes de esa revisión.

## 10. Exclusiones y supuestos

Se mantienen las exclusiones del RFP: reemplazo de Service Cloud, plataformas externas, cierre/envío automáticos, reingeniería completa, migración histórica masiva y aplicaciones fuera de Salesforce. Licencias, Flex Credits, costos de terceros, servicios opcionales, integraciones no descritas y cambios de alcance se separarán y aprobarán explícitamente.

## 11. Aprobaciones pendientes

- Capability gate de Salesforce/Agentforce, certificaciones y referencias.
- Respuestas a las preguntas del 31/07 y cambios comunicados el 05/08.
- Volumen, licencias, Knowledge, ambientes, seguridad, SLA y aceptación.
- Cost-to-serve, margen, riesgo y cashflow a 60 días por Finance.
