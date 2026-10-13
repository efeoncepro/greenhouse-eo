# Continuidad · SGS Chile · Trazabilidad comercial

**Corte:** 13 de octubre de 2026 · **Uso interno** · **Responsable:** Julio Reyes.

Nota de traspaso para que otra sesión (Codex u otra) retome el trabajo sin releer la conversación.

## 1. Dónde está todo

| Archivo | Qué es | Estado |
| --- | --- | --- |
| [CASO-DE-NEGOCIO.md](CASO-DE-NEGOCIO.md) | El caso, versión 7. Parte A = texto para SGS; Parte B = notas internas | Borrador. **No enviado** |
| [PROPUESTA-DE-HABILITACION.md](PROPUESTA-DE-HABILITACION.md) | Investigación de mercado, variantes, preguntas a Aircall, borrador de correo, evidencia con grado de verificación | Respaldo interno |
| [PROSPECT-CASE.md](PROSPECT-CASE.md) | Expediente del prospecto al 29-09-2026 | Sin cambios en esta sesión |

Fuente de la reunión: transcripción completa en HubSpot, [reunión 115791682150](https://app.hubspot.com/contacts/48713323/record/0-47/115791682150) (29-09-2026, 24 min). Se lee con `~/.hubspot/bin/hubspot activities transcript get 115791682150 --activity-type MEETING --format json`. En Notion no existe nota de esa reunión.

Todo está commiteado en `develop`, **sin push**. Último commit del caso: `58398b872`.

## 2. Decisiones de Julio (no reabrir)

1. El caso debe lograr que Efeonce **construya y habilite** la solución completa, no solo un diagnóstico.
2. Llamadas y WhatsApp van por **Aircall con número de empresa**. Efeonce es partner de Aircall.
3. Objetivo: **trazabilidad completa para Bárbara y para José Pedro**, cada uno en su vista.
4. **No ofrecer HubSpot** conectado a Salesforce. Analizado y descartado; no se menciona a SGS.
5. La vista de gestión es un **panel externo de Efeonce Insights**, más un informe mensual. Julio aprobó extender Insights.
6. El caso incluye **alineación de procesos, capacitación por rol e implementación** como frente de adopción.

## 3. La propuesta en una mirada

- **Correo y reuniones:** captura incluida en Salesforce; revisar configuración con la región.
- **Llamadas:** app de Aircall en el celular; conector de Aircall para Salesforce.
- **WhatsApp:** misma app y número; integración construida por Efeonce sobre la API de Aircall, que escribe actividades en Salesforce.
- **Panel:** alimentado por los eventos de Aircall, en uso desde el piloto; guarda el contacto, no el contenido.
- **Etapas:** diagnóstico y procesos → correo → piloto de llamadas y WhatsApp → conexión a Salesforce → operación. Las tres primeras no dependen de la región.
- **A la región se le piden cinco cosas**, listadas en la sección 7 del caso.

## 4. Qué está verificado y qué no

Verificado en documentación oficial (detalle y enlaces en la sección 12 de la propuesta):

- Aircall en Chile solo ofrece números geográficos, nacionales y 800; **no móviles**. Evitar el rango +56 44.
- El conector de Aircall registra cada llamada en Salesforce, incluidas las no contestadas.
- La API de Aircall entrega cada mensaje de WhatsApp por eventos; no tiene consulta de historial.
- Solo con Salesforce no se resuelve: el marcador clásico no opera en Chile, Salesforce Voice es de escritorio.
- Los paneles de Salesforce se refrescan a mano o una o dos veces por hora y tienen tope por edición.

Sin confirmar:

- Que Aircall permita contratar WhatsApp para una cuenta y números chilenos. No hay exclusión documentada, tampoco confirmación expresa.
- Que el conector de Aircall registre WhatsApp en Salesforce. Lo más probable es que no; por eso el caso asume integración propia.
- Qué certificaciones de seguridad tiene Efeonce para pasar la evaluación de proveedor de SGS.
- Notas de versión de Aircall de agosto a octubre de 2026.

## 5. Bloqueos antes de enviar el caso a SGS

1. Respuesta escrita de Aircall a las siete preguntas de la sección 9 de la propuesta.
2. Condiciones comerciales de Efeonce con Aircall (reventa o referido, precios).
3. Honorarios de Efeonce. Requiere el tamaño del equipo piloto.
4. Decisión de arquitectura para extender Efeonce Insights: módulo de contactabilidad, ingesta de eventos de Aircall, superficie de panel vivo, alta de SGS como organización. **No se abrió ADR ni tareas.**
5. Revisión legal de las condiciones de privacidad de la sección 9 del caso.
6. Formato de entrega: documento membretado o láminas.

## 6. Qué puede hacerse ya

1. **Enviar el correo de diagnóstico** a Bárbara y José Pedro. El borrador está al final de la sección 11 de la propuesta. Requiere aprobación de Julio y sigue la política de envío de Outlook. No depende de Aircall.
2. **Montar la demostración:** Aircall más una organización Salesforce de desarrollo, con una llamada y un WhatsApp desde el celular apareciendo en la ficha.
3. **Registrar a Aircall** en `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md`; hoy no figura.
4. **Abrir la decisión de arquitectura** de Insights con `arch-architect` y `efeonce-insights`, si Julio lo confirma.
5. Actualizar `PROSPECT-CASE.md` con lo decidido.

## 7. Preguntas pendientes de respuesta de Julio

- ¿El correo de diagnóstico lo envía el agente desde su cuenta o lo manda él?
- ¿Las preguntas a Aircall las envía él por el canal de partners?
- ¿Se abre ya la decisión de arquitectura de Insights, o se espera la respuesta de SGS?
- ¿Qué equipos comprende "Go-to-Market" en SGS para la capacitación?

## 8. Reglas para quien continúe

- **Nada se envía a SGS ni a Aircall sin aprobación explícita de Julio.** Tampoco cambios en HubSpot.
- La Parte A del caso es texto para el cliente: sin códigos internos, sin rutas, sin mencionar HubSpot ni la reunión del 29-09.
- No escribir como hecho lo que la sección 4 lista como sin confirmar.
- No comprometer plazos, precios ni fechas del panel antes de la decisión de arquitectura.
- Skills que aplican: `salesforce-crm-practice`, `efeonce-insights`, `arch-architect`, `efeonce-pricing-operator`, `legal-privacy-ip-operator`, `deck-studio` o `report-studio` para la entrega.
- Checkout compartido: `git add` y `git commit` en una sola llamada, con rutas explícitas; push solo cuando Julio lo indique.
- SGS no ha respondido la minuta del 29-09-2026. La tarea interna de seguimiento está en Notion: «SGS — preparar caso de contactabilidad comprometido».
