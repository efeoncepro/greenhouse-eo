# Proposal Studio — el aggregate `Proposal` y su gobernanza (F0)

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-07-12 por Claude (TASK-1392)
> **Última actualización:** 2026-07-12 por Claude
> **Documentación técnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) (§0) · [COMMERCIAL_TENDERS_AGENT_INVARIANTS.md](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md)

## Para qué sirve

Antes de esta capacidad, una licitación o propuesta comercial vivía repartida entre carpetas de OneDrive, chats y la memoria del equipo. El **Proposal Studio** le da a cada propuesta (licitación pública, RFP privado o venta directa) **un objeto único dentro de Greenhouse** que registra:

- **En qué estado está** (de `intake` hasta ganada/perdida), con un historial que no se puede borrar ni editar.
- **Qué documentos la componen** (el RFP del cliente, la oferta técnica, la económica, el deck), siempre a través del almacén seguro de archivos de Greenhouse (con escaneo antivirus y control de acceso).
- **Qué evidencia respalda cada afirmación** que se hace al cliente: cada dato citado apunta a una fuente registrada, con fecha, método y clasificación.
- **Qué requisitos pide el RFP** (excluyentes, puntuables, formatos, plazos, multas).
- **Si el precio tiene margen suficiente**: la propuesta no puede avanzar a revisión de fit sin una cotización con margen positivo sobre el costo real (la regla "nunca un GO sin margen").

## Cómo se comporta

- **Estados con compuertas humanas.** Los pasos críticos (aprobar el fit, aprobar el paquete, presentar) exigen una persona con identidad registrada. Ni un sistema ni un agente de IA pueden cruzarlos; la base de datos misma lo rechaza.
- **Nada se borra.** El historial de estados y la evidencia son de solo-agregado. Corregir algo significa registrar una nueva entrada, nunca reescribir la anterior.
- **Interno vs. cliente.** Todo documento y toda evidencia declara su audiencia: `internal` (solo Efeonce) o `client_facing` (puede verla el comprador). Un artefacto destinado al cliente que cite **una sola** evidencia interna se rechaza completo, automáticamente. El material interno (costos, análisis, blueprints de squad) no puede filtrarse por accidente.
- **El asistente de IA propone, no ejecuta.** El agente de intake puede leer un resumen autorizado (organizaciones candidatas, lista de archivos, propuestas existentes) y sugerir cómo registrar una propuesta nueva. Esa sugerencia cita sus fuentes y se valida contra lo que el agente realmente vio; si inventa una organización, un archivo o una fecha, se descarta entera. Solo una persona puede confirmarla, y al confirmar se ejecuta el mismo comando que usaría cualquier otra vía.
- **Se contrata por organización, no por rol.** La capacidad se habilita asignando el módulo `proposal_studio_v1` a la organización. Sin esa asignación, nadie —ni un administrador— puede operar propuestas. Está activo para Efeonce Group SpA desde el 2026-07-12 (verificado en staging); para cualquier otra organización sigue apagado hasta que se le asigne el módulo.

## Qué significan los estados

`intake` (recién registrada) → análisis y fit → construcción de la oferta → empaquetado → presentada → en evaluación → **`won`** o **`lost`** (terminales) — con salidas laterales `declined` (decidimos no participar) y `withdrawn` (nos retiramos). Una propuesta en estado terminal no puede moverse más.

## Qué no hacer

- No subir documentos de una propuesta fuera del almacén canónico de archivos.
- No registrar datos "de memoria" como evidencia: toda evidencia lleva fuente, ubicación exacta, método y fecha.
- No marcar material interno como `client_facing` "porque parece útil": es una decisión humana explícita y auditada.

> Detalle técnico: primitives en `src/lib/commercial/tenders/proposals/**`; API en `/api/commercial/proposals/**`; migración `migrations/20260712160001023_task-1392-proposal-studio-foundation.sql`; eventos `commercial.proposal.*` en el [catálogo de eventos](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md).
