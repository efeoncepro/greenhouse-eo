# Habilitación de servicios

TASK-1852 ofrece un mecanismo común para relacionar servicios contratados, módulos del portal y personas
de cada organización. Berel y Sky son la primera cohorte de conciliación, no ramas especiales del producto.

El código está desplegado en producción y el interruptor de escrituras quedó encendido el 2026-09-10, aunque
ninguna alta se ha aplicado todavía. Ese mismo día quedó declarado el
vínculo comercial de ambas cuentas (qué módulos del portal incluye cada servicio) y las tres personas Berel
existen como usuarios Greenhouse con la invitación pendiente de entrega, sin correo enviado. Sky tiene un preview
limpio; sus tres personas siguen activas sin login observado. La apertura requiere que una persona administradora
apruebe la alta y que se certifiquen login, rutas y canales. Los datos personales exactos se conservan sólo en
evidencia local privada.

El preview muestra configuración observada, asignaciones actuales, cambios propuestos, exclusiones por
persona y comprobaciones pendientes. Una fuente ausente, una preferencia no declarada o un login no probado
se presentan como pendientes; no se convierten en cero, consentimiento o entrega exitosa.

La alta requiere revisión humana y autoridad administrativa: una sesión propia del portal o un acceso delegado
que la persona haya autorizado a un cliente (por ejemplo, el gateway MCP), nunca una máquina por sí sola ni el
usuario de diagnóstico. El recibo registra por qué canal llegó esa autoridad. Se conserva lo ya asignado; el
recibo permite pausar sólo las altas de esa operación si nadie las cambió después. Una persona invitada pero sin
invitación entregada aparece como "invitación pendiente", no como ajena a la organización. Contratación, identidad, preferencias,
mensajes y publicación mantienen sus procesos propios. Las asignaciones técnicas no acreditan por sí solas
que una cuenta pueda operar su servicio de extremo a extremo.

Desde el 2026-09-10 el canal delegado por MCP está federado y vivo: el gateway `efeonce-mcp` expone las herramientas de
previsualizar, aplicar y revertir la habilitación, y sólo actúa con la autoridad de una persona que las haya autorizado
(nunca por sí solo); todavía no se ha ejecutado ninguna alta por ese canal. El módulo contratado por Sky es Creative Hub;
su página en el portal la construye TASK-1857.

Contrato técnico y operación: [runbook](../../operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md).
Estado/evidencia: [TASK-1852](../../tasks/in-progress/TASK-1852-berel-sky-service-access-and-channel-enablement.md).
Continuación para agentes: [dossier de discovery](../../audits/client-portal/TASK-1852_CLAUDE_DISCOVERY_2026-09-09.md).
