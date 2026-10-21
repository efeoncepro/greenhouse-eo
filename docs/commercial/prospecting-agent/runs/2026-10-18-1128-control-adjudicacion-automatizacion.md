# Automatización actualizada: verificar compra antes de invertir

Cambio solicitado expresamente por Julio. FechaSantiago 2026-10-18T11:28:47.673468-03:00. Automatización `prospecci-n-hubspot-reporte-diario`, mismo ID y proyecto. Cambio de instrucciones, sin investigación de nuevas oportunidades ni nueva pasada de20celdas. No se alteran cuentas ni aprobaciones del radar.

## Resultado

La automatización activa ya contiene el control obligatorio previo a recomendar una oportunidad de compra, pedir/consumir créditos, proponer/crear un Deal o convertirlo en compartido. Exige fuente primaria, adjudicación/proveedor, contrato/documento, firma e inicio/fin y calendario de participación vigente. Adjudicada/firmada/en ejecución → descartar esa compra. Evidencia decisiva bloqueada, contradicción o plazos sin acreditar → HOLD sin gasto ni Deal. Fechas de publicación, firma, ejecución y propuestas se registran por separado; frescura o etiquetas genéricas no sustituyen el estado contractual del comprador.

La verificación se repite inmediatamente antes de cada acción autorizada, también en cuentas o lotes anteriores. La aprobación operativa no acredita la calificación. Reporte y JSON deben guardar resultado, fuentes, lectura y fundamento; no se crean propiedades CRM por esta regla. Señales proactivas sin convocatoria conservan su clasificación de hipótesis. Esenttia HSP-0034 queda explícitamente excluida para la compra ya adjudicadaDACARTEC.

## Configuración y readback

Se utilizó `automation_update` en el mismo ID y luego se leyó la configuración persistida. Prompt exacto coincide con el preparado. Se preservaron nombre, tipo, ACTIVE, horario diario09:00America/Santiago, proyecto/directorio, modelo, esfuerzo, entorno y creación. Todo el prompt previo se conserva y se inserta el nuevo bloque; no hay automatización duplicada. No se modificaron permisos CRM, envíos, créditos, frecuencia, presupuesto o herramientas.

Propagado a [contrato del radar](../README.md#gate-de-adjudicación-antes-de-invertir-en-una-compra--corrección18102026), skill personal `hubspot-saas-prospecting` y sus tres playbooks de servicio, acción y frescura. El núcleo B2B del repo ya remite al mismo gate. Dueño/decisión existente: [método compartido](../../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md). Es un endurecimiento solicitado del método vigente, sin nueva arquitectura o superficie de autoridad.

Evidencia privada0700/0600: `/Users/jreye/.codex/agent-data/hubspot-saas-prospecting/automation-guard-2026-10-18`; snapshots antes/después, bloque añadido, hashes y copias previas de los archivos modificados. [Registro de operaciones](../queries/2026-10-18-1128-control-adjudicacion-automatizacion.json). No se ejecutó la automatización completa ni se gastaron créditos para probarla: verificación de configuración e instrucciones guardadas, pendiente comprobar su aplicación en la siguiente corrida real. Sin escrituras CRM, correos, commits/push ni tareas adicionales.
