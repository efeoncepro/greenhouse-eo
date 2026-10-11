# Aptitud del carril de correo — cuenta / iniciativa

Usar con [entregabilidad operativa](../references/deliverability-operations.md). Datos reales y evidencias
en dossier privado existente; placeholders en ejemplos versionados. Esta ficha no autoriza ni ejecuta envío,
enrollment, corrección DNS/proveedor o escritura CRM. No crea scheduler nuevo.

## Alcance concreto

- Cuenta/iniciativa, owner y expediente/hilo existente:
- Acción pedida/autorización vigente (referencia, personas, canal, mensaje/lote y ventana):
- Remitente/mailbox, tenant/portal, From y transporte real:
- Tipo de mensaje: individual / respuesta / secuencia / marketing (confirmar contrato):
- Destinatarios únicos y total incluyendo CC/BCC; cadencia por cuenta relacionada:
- Datos/carril que cambiaron desde baseline y evidencia reusable:
- Límites conocidos del acceso/telemetría; fuentes y fecha de consulta:

## Matriz de readiness

Cada fila: **conocido / pendiente / bloqueado**. Resultado conocido puede ser favorable o adverso; justificar
lo no aplicable. Lo pendiente no concede permiso. Detener la acción dependiente, conservar trabajo útil.

| Dimensión | Estado y resultado / restricción | Fuente, fecha y alcance / muestra | Responsable | Próximo chequeo (fecha o evento) | Acción dependiente que puede avanzar o se detiene |
| --- | --- | --- | --- | --- | --- |
| Identidad/empleo/correo individual verificado por destinatario | | | | | |
| Autorización, preferencias, baja/HOLD/proceso comprador | | | | | |
| Remitente y conexión efectiva del rail | | | | | |
| SPF / DKIM / DMARC: config y resultado/alineación separados | | | | | |
| Reputación/quejas/rebotes/incidente y supresión | | | | | |
| Política/límites efectivos; carga existente; lote/capacidad de seguimiento | | | | | |
| Mensaje/destinatarios/enlaces/adjuntos y baja según tipo | | | | | |
| Owner/paradas y configuración real de secuencia si aplica | | | | | |
| Firma/BCC Julio si corresponde y registro CRM previsto | | | | | |

- Decisión: preparar / listo para acción ya autorizada / pendiente de chequeo / carril bloqueado:
- Razón proporcional al pedido (respuesta puntual vs ola/cambio de rail/incidente):
- Intervenciones propuestas al owner, con alcance/autoridad propia; no ejecutadas:
- Regla del proveedor aplicable: receptor/emisor, producto, tipo, ventana/agregación y URL/fecha:
- Condición de pausa por persona/canal/cuenta/rail, owner y condición de revisión:

## Resultado y readback, sólo después de una acción autorizada

No completar estados como realizados por haber preparado esta ficha. Correlacionar mensaje/destinatario/
fecha en el dossier; no guardar tokens/headers con PII en el repo. Ante resultado incierto, reconciliar antes
de reintentar. Mantener entrega, Inbox, respuesta e ingesta CRM por separado.

| Estado | Evidencia exacta / hora / rail | Resultado conocido o pendiente | Siguiente verificación / owner |
| --- | --- | --- | --- |
| Preparado/revisado | | | |
| Aceptado por transporte | | | |
| Enviados con identidad/destinatarios/cuerpo/firma/BCC | | | |
| Entrega reportada por destinatario, evento y límites de lectura | | | |
| Inbox observado si existe evidencia autorizada | | | |
| Respuesta humana vs OOO/bot/baja/negativa | | | |
| Actividad HubSpot y asociaciones leídas independientemente | | | |

## Incidencia, si aplica

- Mensaje/rail/destinatario afectado y NDR/código/fecha:
- Label provider y diagnóstico separado; dirección vs filtro/autenticación/cuota/desconocido:
- Cola/reintentos activos y condición para evitar duplicado:
- Alcance de contención y de restricción; no rodear con otra dirección/persona/remitente:
- Cambio de calidad/empleo pendiente y fuente para resolverlo, sin dirección por patrón:
- Corrección/supresión/pausa CRM propuesta o ejecutada dentro de autorización; readback:
- Próximo chequeo/owner en seguimiento existente:
