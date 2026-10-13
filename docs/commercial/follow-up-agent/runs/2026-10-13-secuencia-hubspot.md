# Seguimientos programados en HubSpot — 13/10/2026

Owner: Julio Reyes / Commercial. Mandato directo: varios seguimientos personalizados para las seis
personas de la ronda del 13/10, en días/horas laborales, con un aporte persuasivo distinto por correo y
parada al responder. El operador precisó **HubSpot, no Apollo**. Rafael Figueroa sigue excluido.

## Resultado verificado

Seis secuencias privadas de Julio en el portal 48713323; tres correos automatizados por secuencia,
una persona inscrita en cada una. Lectura independiente: **Programado 1**, **En curso 0**, **Error 0**,
contacto correcto e inicio 16/10. El resumen de Secuencias muestra seis secuencias y un inscrito por fila.
Los correos futuros aún no están enviados: no inferir entrega, apertura ni nuevas actividades SENT.

Primer correo: viernes 16/10. Retrasos de cuatro y cinco días laborables: jueves 22/10 y jueves 29/10.
Las tres fechas se comprobaron en la pantalla de inscripción antes de iniciarla. Hora local del contacto;
los pasos posteriores usan una ventana de cinco minutos elegida por HubSpot, no una hora exacta fija.

| Persona | Secuencia HubSpot | Hora local inicial / ventana siguiente | Aportes distintos | Brochure contextual |
| --- | --- | --- | --- | --- |
| Paula Arciniegas | [315670690](https://app.hubspot.com/sequences/48713323/sequence/315670690/enrollments) | 10:10 / 10:10–10:15, Colombia UTC−05 | Matriz regional; cinco datos del lead; recorrido para evaluar agencias | Servicios HubSpot: asignación, datos y seguimiento |
| Nicol Cueva Silva | [315670658](https://app.hubspot.com/sequences/48713323/sequence/315670658/enrollments) | 10:20 / 10:20–10:25, Perú UTC−05 | Costo por oportunidad útil; cuatro estados comerciales; acuerdos de arranque | Servicios HubSpot: calidad, trazabilidad y seguimiento |
| Fiorella Marcos Villegas | [315670686](https://app.hubspot.com/sequences/48713323/sequence/315670686/enrollments) | 10:30 / 10:30–10:35, Perú UTC−05 | Tres funciones de contenido; adaptación local; evaluación de operación | Marketing de Contenidos: producción, mercados y briefs |
| Sergio Suárez | [315670680](https://app.hubspot.com/sequences/48713323/sequence/315670680/enrollments) | 10:40 / 10:40–10:45, Colombia UTC−05 | Excepciones de comprobantes; estados de participación; reparto de responsabilidades | Servicios Web: registro, integraciones y operación |
| Hernán Ugarte | [315670659](https://app.hubspot.com/sequences/48713323/sequence/315670659/enrollments) | 10:50 / 10:50–10:55, Perú UTC−05 | Ficha comercial única; cambios urgentes; brief de evaluación | Agencia Creativa: concepto, producción y adaptaciones |
| Jesús María Rangel Gutierrez | [315670691](https://app.hubspot.com/sequences/48713323/sequence/315670691/enrollments) | 10:10 / 10:10–10:15, México UTC−06 | Salida al volver a asistir; grupo comparable; documentación para especialista | Servicios HubSpot: datos, flujos y transferencia |

## Reglas, firma y evidencia

- En las seis secuencias, lectura nueva de Automatizar: **respuesta a cualquier correo → desinscribir
  el contacto ACTIVADA**; **reunión → desinscribir DESACTIVADA**. Incluye una respuesta al correo
  inicial de Outlook. Secuencias en blanco, sin ramas por aperturas/clics ni automatizaciones de nuevas altas.
- Se conservan las protecciones nativas de HubSpot para cancelación de suscripción, rebote y errores;
  no se desactivan ni se promete que sólo una respuesta pueda impedir un envío.
- Outlook no mostró mensajes entrantes de los seis remitentes tras el envío inicial en la revisión
  previa. Una sugerencia de búsqueda global decía que Paula había respondido; no se tomó como prueba:
  Outlook y actividades EMAIL del contacto sólo mostraron el primer saliente.
- Correo conectado **Outlook 365 Activado**; remitente corporativo de Julio comprobado en las seis
  inscripciones. Firma global **Julio** en modo HTML, con fotografía, Efeonce, slogan y partners oficiales.
  Se mantuvo su configuración; las plantillas usan la firma predeterminada y no insertan otra copia.
  La vista integrada presentó la firma como un iframe blob sin representación visual: se verificó el
  HTML configurado, no se declara una prueba de entrega/rendering en el destinatario.
- Cada mensaje incluye un brochure insertado con la función nativa **Insertar → Documentos**, un
  texto que explica su relación con el contexto, descarga permitida, sin exigir correo para verlo y sin
  miniatura. Los enlaces de inscripción se generaron por HubSpot; no se reutilizaron los de Mariela.
- El transporte es la secuencia nativa de HubSpot sobre el mailbox conectado, con registro nativo CRM.
  La pantalla de secuencias no expuso CCO: no afirmar que se configuró BCC en estos envíos futuros.
  La política CCO de los envíos por Outlook conserva su alcance separado.

## Corrección de plataforma

Antes de la precisión del operador se prepararon seis secuencias en Apollo. Quedaron **inactivas y
sin contactos inscritos**. Readback de las seis: active=false y todos los estados de inscripción en cero.
No se activaron ni generaron envíos. No retomarlas ni inscribir contactos allí. El resultado operativo
de esta ronda está exclusivamente en las seis secuencias HubSpot enlazadas arriba.

## Continuidad

No duplicar seguimientos manuales ni inscribir a alternativas. Respuestas se trabajan en su hilo;
no reiniciar automáticamente a quien se desinscriba. La autorización cubre estos 18 mensajes y no
amplía el heartbeat general, el universo de destinatarios ni la autonomía de envío de futuros lotes.
La dirección de Paula conserva su procedencia deducida/no verificada en el expediente; una etiqueta
Apollo o la inscripción no constituyen validación independiente ni confirmación de entrega.

Canon de autoridad: [decisión de seguimiento y mandato acotado](../../../architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md).
Contexto inicial: [ronda de seis enviados](2026-10-13-outreach-personalizado.md).

Evidencia privada fuera de Git: `~/.codex/agent-data/hubspot-saas-prospecting/envios-contextuales-2026-10-13/`:
`hubspot-secuencias.json`, `hubspot-readback-<sequenceId>.txt`, `hubspot-previo-<sequenceId>.txt`,
`hubspot-paula-previo.txt`, `seguimientos-copy.json` y `seguimientos.json` (preparación inicial).
El contenido definitivo incorpora documentos nativos y firma predeterminada en las plantillas HubSpot.
Captura del resumen: carpeta de visualizaciones del chat, `hubspot-secuencias-programadas.png`.
