# Auditoría de envíos y aperturas de HubSpot — 21/10/2026

Corte focal: 21/10/2026, 19:26 America/Santiago (UTC−03). Portal Efeonce 48713323, identidad de Julio verificada. Investigación de lectura; sin cambios externos.

## Acciones para hoy

Los 14 seguimientos manuales autorizados esta mañana están enviados y registrados: no corresponde reenviarlos por ver pocas aperturas. Julio no necesita activar ni desactivar la beta para resolver esta diferencia del informe. El seguimiento mediante consentimiento está desactivado y el permiso general de seguimiento está activado.

Unilever tiene un fallo concreto: el correo del 20/10 a Denis figura **Rebotado** y su inscripción está en **Error**. Mantener la exclusión y no reintentar esa dirección. Los otros dos contactos de la empresa siguen en curso, con paso siguiente el 27/10. No se requiere otro envío hoy. El agente debe conservar separados el rebote y los ceros de interacción; ninguno demuestra desinterés del comprador.

Teva tiene su primer seguimiento automático programado para el 22/10; Olivos del Sur, para el 29/10. Sus ceros actuales son coherentes con pasos todavía no ejecutados. Las secuencias de Ariana y Diego siguen finalizadas, e Iris también figura finalizada: no reactivar contactos de izipay.

## Hallazgo principal

La beta del pantallazo permite condicionar la medición a un consentimiento. Participar en ella no equivale a activar el requisito. En la configuración real se leyó:

- Privacidad y consentimiento → Solicitar el consentimiento para hacer seguimiento: **DESACTIVADA**, valor 0.
- Objetos → Actividades → Permitir seguimiento de aperturas y clics: **activado**, valor 1.
- Predeterminado de tracking para la extensión HubSpot Sales: **activado**, valor 1. Este ajuste de la extensión no inserta tracking por sí mismo en un envío realizado mediante otro canal.
- Registro de auditoría, Actividad de seguridad, subcategorías de seguimiento activado/desactivado, últimos 30 días: **no se encontraron eventos**. Es ausencia de eventos devueltos por esa consulta; no acredita que el ajuste nunca haya cambiado.

Con el estado actual no hay evidencia de que esta beta esté suprimiendo la medición. La función afecta aperturas/clics, no bloquea por sí misma el envío. [Fuente oficial](https://knowledge.hubspot.com/privacy-and-consent/manage-email-tracking-consent).

## Reconciliación

**Lote manual de esta mañana:** 14/14 copias encontradas nuevamente en Elementos enviados de Outlook y 14/14 actividades EMAIL releídas por MCP en estado SENT, sin registros ausentes. Incluye Pierre Fabre. El lote es el ya autorizado, no la totalidad del correo del día. La comprobación de hoy conserva la excepción de firma textual de Pierre Fabre anterior a la instrucción gráfica; no se reenvió.

**Análisis de secuencias, vista observada:** cabecera de 16 contactos; 2 contactos con apertura, 1 respuesta, 1 rebote, 0 clics y 0 reuniones. No es un informe del total de Outlook ni de todas las respuestas comerciales. Se conservó el filtro visible “(1) Inscrito por”; no se amplió ni guardó una nueva vista.

**Envíos automáticos:** 10, comprobados en las cinco páginas de rendimiento de plantillas y reconciliados con las cuatro páginas de contactos. Son seis primeros seguimientos del 16/10, tres primeros correos de Unilever del 20/10 —uno rebotado— y un primer seguimiento web del 21/10. No sumar inscripciones históricas como envíos: la tabla de contactos tiene 19 filas para 16 contactos por tres reinscripciones de Unilever.

Las 19 filas se distribuyen en 9 en curso, 3 programadas, 6 finalizadas y 1 en error. Las tres filas finalizadas anteriores de Unilever tienen cancelación manual y ningún paso ejecutado; no representan otros tres correos. El gestor muestra seis inscripciones históricas de Unilever, pero su rendimiento corresponde a tres contactos y tres envíos.

El bloque de apertura de la cabecera cuenta dos contactos. El detalle muestra dos eventos para Station 24 y uno para WIN Fitness Wear; no confundir personas, eventos y porcentaje de apertura.

| Cuenta o grupo | Estado comprobado | Último envío automático / próximo paso |
| --- | --- | --- |
| EVInka, Besco, Bivien, Delosi, WIN Fitness Wear, Station 24 | En curso; un correo automático por contacto | Último 16/10; siguiente 22/10 |
| Laboratorio Chile / Teva — HSP-0027 | Programado; cero correos de esta secuencia | Primero 22/10 |
| Indecaucho | Programado; cero correos de esta secuencia | Primero 22/10 |
| Toyota del Bajío | En curso; un correo automático | Enviado 21/10 13:00:05 Chile, copia en Outlook; siguiente 28/10 |
| Unilever — HSP-0040 | Dos en curso y uno rebotado; tres cancelaciones históricas sin envío | Enviados 20/10; siguiente 27/10 para los dos en curso |
| Olivos del Sur | Programado; cero correos de esta secuencia | Primero 29/10 |
| izipay | Tres inscripciones finalizadas, sin correos automáticos en estas secuencias | No reactivar |
| Pierre Fabre — HSP-0015 | Seguimiento manual del lote comprobado SENT | No se representa como envío automático de secuencia |

Los 14 manuales y los 10 automáticos son universos y períodos diferentes. No se presenta su suma como total exhaustivo de la actividad comercial.

## Por qué faltan aperturas

El CCO de HubSpot registra contenido y adjuntos en el CRM, pero **no añade por sí solo seguimiento de aperturas o clics**. Tampoco convierte un correo manual en un paso de secuencia. [Documentación de CCO](https://knowledge.hubspot.com/connected-email/log-email-in-your-crm-with-the-bcc-or-forwarding-address).

Por tanto, que el correo esté en el CRM no garantiza que exista una apertura medible. El permiso global habilitado tampoco demuestra que cada mensaje manual haya llevado seguimiento. No se ha inspeccionado el MIME original de cada correo para certificar presencia o ausencia de un píxel propio; los cuerpos convertidos a texto no permiten esa conclusión.

Incluso en mensajes con seguimiento, el bloqueo de imágenes y las protecciones del destinatario pueden impedir medir la apertura. No se atribuye esta causa a un destinatario concreto sin evidencia. [Funcionamiento y límites](https://knowledge.hubspot.com/connected-email/understand-hubspot-sales-email-open-and-click-tracking).

El indicador útil para confirmar ejecución es el envío real y su estado; para seguimiento comercial, la respuesta y el siguiente hito. No reenviar por cero aperturas. Si se desea medir los próximos manuales, preparar un canal compatible con tracking, conservar firma gráfica/CCO y verificar el resultado en un envío específicamente autorizado. Esta auditoría no autoriza envío de pruebas, cambios de consentimiento ni configuración.

## Evidencia, acceso y continuidad

Evidencia privada con datos individuales: `/Users/jreye/.codex/agent-data/hubspot-saas-prospecting/reports/2026-10-21-sequence-tracking-audit/`. Carpeta 0700, archivos 0600. Contiene configuración, páginas de análisis, inscripciones de Unilever, consulta de auditoría y lectura independiente del lote manual. Los comprobantes originales del lote continúan en `reports/2026-10-21-seguimientos-enviados/`.

La CLI de secuencias devolvió 403: el endpoint no admite el token OAuth de usuario. Se utilizó la interfaz nativa de HubSpot, sin cambiar credenciales ni permisos. Outlook devolvió la página completa de 29 correos enviados del día, sin siguiente página; se cotejaron únicamente los 14 IDs del lote. El conector devuelve cuerpos aunque se pidan campos: se conservaron en la evidencia focal sólo metadatos del lote, no los otros hilos.

Esta revisión no verifica entrega al buzón final ni ubicación en bandeja de entrada. No se crearon registros CRM, actividades, tareas, secuencias ni nuevos IDs HSP; no se enviaron mensajes, no se modificaron inscripciones, no hubo gastos ni commit. Las aprobaciones previas y el resto del WIP se preservan. Fuentes vigiladas de convocatorias sin cambios: no es una búsqueda de nuevas oportunidades ni una cobertura de las 20 celdas del radar.

Ventana semanal contextual: lunes 19/10/2026 00:00 Santiago hasta este corte. No se recomiendan convocatorias nuevas; control contractual no aplica a esta auditoría técnica.
