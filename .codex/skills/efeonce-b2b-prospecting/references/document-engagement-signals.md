# Visitas a documentos y seguimiento contextual

Método Efeonce, incorporado el 26/10/2026 a partir de una revisión y un envío expresamente autorizados
por Julio. Owner: Prospecting para interpretar la señal; Commercial para recomendar el contacto;
HubSpot/Outlook para ejecutar y verificar. Conserva la autoridad del
[seguimiento comercial](../../../../docs/architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md).
No configura automatizaciones ni modifica instrucciones nativas del Prospecting Agent.

## Qué significa la señal

Una visualización atribuida por HubSpot es evidencia de interacción registrada con un documento.
Puede justificar revisar la prioridad y el momento de una conversación existente. No equivale a lectura
humana certificada, respuesta, admisión a un proceso, relación cálida, presupuesto o intención de compra.
El tiempo por página es tiempo registrado por el visor, no atención ni comprensión medidas.

| Evidencia | Lectura proporcionada | Decisión candidata |
| --- | --- | --- |
| Portada con cero segundos o apertura aislada | Atribución débil; posible visita propia, escáner o apertura sin navegación | Conservar registro; no insistir por ese evento |
| Varias páginas con tiempos breves | Exploración rápida del material | Releer necesidad e historial; valorar si un contacto aporta algo útil |
| Nueva sesión, navegación por temas o regreso a páginas | Interacción adicional; tema de interés como hipótesis | Revisar con Commercial una ayuda concreta para la evaluación |
| Página de contacto o cierre consultada | Dato contextual, sin intención de escribir demostrada | No asumir reunión ni interés comercial confirmado |

No fijar umbrales universales de segundos, páginas o visitas, ni declarar un lead caliente por un score.
Una nueva visita puede cambiar una recomendación interna de espera; nunca levanta una baja, negativa,
HOLD, cierre de convocatoria o condición de procurement. No rodear esas restricciones mediante colegas.

## Revisar antes de recomendar

1. Recuperar el aviso de Outlook y su fecha; verificar remitente HubSpot, documento e identidad atribuida.
   Separar hora del evento, recepción del aviso y consulta, con zona y precisión de cada fuente.
2. Abrir **Documentos → documento original → Visitantes → Detalles** en el portal verificado. Leer sesiones,
   páginas y tiempos completos. El correo puede mostrar sólo una parte: no usar su asunto redondeado ni
   sumar filas repetidas como páginas distintas. Si las fuentes discrepan, conservar ambas y su corte.
3. Verificar a quién se emitió el enlace y el mecanismo de identificación cuando esa atribución cambie
   la decisión. Un enlace reenviado, anónimo o emitido al remitente no identifica inequívocamente al comprador.
   No inferir reenvío interno, comité ni varias personas de un contador de visitas.
4. Para interpretar una página, usar la **vista previa interna** del original. No abrir el enlace de tracking
   del destinatario para probarlo ni cambiar el brochure aprobado. Registrar contenido visto e hipótesis
   por separado: visitar una página no acredita preferencia por ese servicio.
5. Releer el hilo real, último envío, respuestas, borradores y pasos existentes, además del estado del proceso.
   Identificar qué decisión puede facilitar el nuevo mensaje. El silencio por sí solo no es razón para otro toque.
6. Entregar recomendación proporcionada: esperar, investigar atribución o preparar un contacto contextual.
   En una evaluación vigente y sin restricciones, el mismo día o próximo día hábil del destinatario puede
   ser oportuno; es criterio del caso, no un SLA ni envío inmediato al llegar el aviso.

Si falta acceso al documento, declarar que sólo se revisó el correo y no inventar el detalle completo.
Conector/CLI sin sesión y navegador autenticado son carriles distintos: comprobar cuenta y capacidad
del fallback permitido, sin elevar permisos ni declarar recuperado todo el portal por leer una ficha.

## Redactar y ejecutar

- Usar la señal internamente para elegir momento y pertinencia. Evitar «vi que abriste el documento»,
  referencias a páginas/segundos observados y afirmaciones de lectura no confirmada.
- Conservar el hilo de las credenciales/propuesta cuando sea pertinente y explicar cómo ayudaríamos a
  resolver la decisión actual. Aportar un enfoque, aclaración o siguiente paso concreto; no repetir
  presentación, reenviar el brochure por inercia ni cambiar de oferta por una página vista.
- Aplicar [conversaciones útiles](conversation-quality-and-review.md): voz de Julio, claims sustentados,
  profundidad útil y una invitación proporcional. El material íntegro anterior permanece en el historial.
- La lectura y recomendación no autorizan enviar, reinscribir, cambiar etapa/segmentos o crear otro scheduler.
  «Redacta» prepara un borrador; «envíalo» sobre ese borrador autoriza ese único envío, sin pedir el mismo
  permiso otra vez. La autoridad recurrente conserva sus límites.
- Verificar destinatario efectivo al responder a un mensaje propio, una firma gráfica nueva y CCO de Julio.
  Guardar y releer el borrador; luego, con envío autorizado, verificar **la nueva copia de Enviados**.
  El ID puede cambiar: nunca reenviar por una vista antigua del borrador.
- Confirmar aparte la actividad EMAIL y asociación en HubSpot; el CCO no acredita ingestión. No crear una
  actividad manual duplicada. Enviado/registrado no demuestra entrega, nueva lectura o respuesta.

## Registrar para el siguiente corte

Reutilizar expediente y clave de cuenta/iniciativa. Conservar documento/versión, portal, IDs de contacto y
empresa, evento/hora/zona, aviso y detalle completo consultado, sesiones y páginas únicas, tiempos y sus
límites, interpretación, historial/restricciones, recomendación y razón del cambio, autorizaciones separadas
de preparación/envío, readbacks de borrador/Enviados/EMAIL y siguiente decisión con owner.

El repo lleva resumen saneado e IDs operativos; cuerpos completos, correos personales, avisos originales,
URLs de tracking/opt-out y capturas quedan en sistemas o expediente privado. El delta focal no cambia la
fecha ni la cobertura del inventario global. Esperar respuesta no programa el siguiente contacto.
Para medir resultados, distinguir señal, contacto enviado, respuesta útil, admisión, reunión y oportunidad;
este caso aislado no demuestra que contactar después de una visita mejore la conversión.

Aplicación: [Indecaucho, 26/10/2026](../../../../docs/commercial/follow-up-agent/runs/2026-10-26-indecaucho-documento-seguimiento.md).
La documentación oficial de [Documentos de HubSpot](https://knowledge.hubspot.com/documents/use-documents),
consultada el 26/10/2026, sustenta notificaciones y uso para orientar el seguimiento; los datos del caso
proceden del aviso y la UI autenticada. La recomendación de contacto es juicio comercial Efeonce.


## Continuidad hacia discovery y caso de negocio

Si la respuesta abre reunión/propuesta o se pide analizar su transcripción, cargar
[discovery → caso](discovery-to-business-case.md). Conservar marca/iniciativa, fuente declarada,
reunión enviada/aceptada/realizada y criterios de selección separados; la evidencia posterior confirma
o refuta hipótesis y condiciona economía. No activar una cadencia, Deal o precio por este avance.
