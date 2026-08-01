# Extracto operativo del RFP — Polpaico LIC-6533

Fuente: `RFP-202607241734289330.pdf`, versión 3.0 consolidada, julio 2026. El PDF completo y los documentos corporativos se mantienen como referencias autenticadas en `SOURCES.md`.

## Requerimiento

Implementar un Agente de Inteligencia Artificial para Post Venta usando Salesforce Agentforce sobre Salesforce Service Cloud actualmente operativo. No se busca desarrollar una aplicación desde cero ni reemplazar Service Cloud.

## Objetivos

Reducir el tiempo de clasificación inicial, aumentar productividad del CSC, mejorar consistencia de respuestas, estandarizar criterios, cumplir SLA, escalar la operación, dejar trazabilidad de decisiones de IA y establecer una base para futuros casos de uso.

## Alcance mínimo

- Arquitectura Agentforce, Topics, Actions, Prompt Templates, grounding, Knowledge Sources y reglas de negocio.
- Análisis de emails, registros de casos y adjuntos; extracción de información relevante y faltante.
- Clasificación de tipo, categoría, subcategoría, línea de negocio, prioridad sugerida y criticidad; escalamiento humano de casos ambiguos.
- Resumen ejecutivo, antecedentes, riesgos, acciones sugeridas y pendientes.
- Respuestas preliminares con información del caso y Knowledge autorizado, siempre bajo validación humana.
- Métricas de casos procesados/clasificados/derivados, precisión, uso, productividad y adopción.

## Fuera de alcance

Reemplazo de Service Cloud; plataformas externas; cierre automático; envío automático; reingeniería completa; migración histórica masiva; aplicaciones fuera de Salesforce.

## Gobierno, seguridad y evolución

La solución debe usar entornos autorizados, respetar permisos, auditar usuarios y agente, no almacenar permanentemente información en plataformas externas no autorizadas y permitir administración de categorías, prompts, Knowledge, reglas, Topics, Actions, integraciones, logs, monitoreo y nuevos casos de uso.

## Entregables y perfiles

Levantamiento/diseño, implementación, unitarias, funcionales, UAT, defectos, plan de despliegue/reversa, go-live, hypercare, capacitación a usuarios CSC y administradores, documentación de arquitectura/configuración/operación/administración y matriz de dependencias. Perfiles: Arquitecto Salesforce, Consultor Agentforce, Consultor Service Cloud, Especialista IA Generativa deseable y Jefe de Proyecto PMP o equivalente.

## Evaluación y economía

Cumplimiento funcional/técnico 30%; experiencia 25%; equipo 10%; metodología 15%; económica 20%. La propuesta debe separar implementación, configuración Agentforce, capacitación, hypercare, opcionales, licencias, Flex Credits y recurrentes, indicando qué se contrata con Salesforce y qué con el proveedor.

## Proceso y pago

Inicio 24/07/2026; consultas 31/07/2026; respuestas 05/08/2026; propuestas 24/08/2026; evaluación y adjudicación durante septiembre 2026. Pago a 60 días desde la emisión de la factura.
