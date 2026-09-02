# Auditoría — identidad Emma en Customer Agent ANAM

**Fecha:** 2026-09-01
**Portal:** ANAM `19893546`
**Superficie:** HubSpot Customer Agent
**Estado:** Publicado y leído de vuelta; regresión conversacional real no ejecutada

## Objetivo y alcance

Alinear la identidad conversacional del Customer Agent con Emma, la asistente visible en la landing pública de
ANAM. El cambio autorizado se limitó al nombre del perfil y al saludo guionizado.

Fuera de alcance y sin cambios: personalidad, idioma, conocimiento, permisos CRM, acciones, handoff, routing,
canales, chatflow, datos CRM y consumo mediante una conversación real.

## Antes y después

| Superficie | Antes | Publicado |
|---|---|---|
| Nombre del agente | `Agente de clientes de ANAM` | `Emma` |
| Saludo guionizado | `¡Hola! 👋 Soy ANA, de ANAM. ¿En qué te puedo orientar?` | `¡Hola! 👋 Soy Emma, de ANAM. ¿En qué te puedo orientar?` |
| Personalidad | `Amigable` | `Amigable` |
| Idioma | detección automática | detección automática |

## Evidencia de publicación y readback

- HubSpot confirmó el guardado de identidad con `Perfil actualizado`.
- La cabecera mostró `Agente de clientes, Emma` y la acción `Probar Emma`.
- El campo de identidad y la vista previa mostraron `Emma`; el saludo del preview fue `Hola, soy Emma.`.
- La publicación de directrices terminó con `Cambios publicados`.
- La vista de directrices mostró `Borrador (0)` y el saludo exacto con `Soy Emma`.
- No quedó la forma anterior `Soy ANA` en el contenido publicado inspeccionado.
- No se abrió ni se envió una conversación real.

## Advertencias y riesgo residual

El preflight de HubSpot permitió publicar, pero mostró dos advertencias preexistentes sobre la frase
`Registraré tu consulta`: una instrucción infundada y una contradicción con la regla que prohíbe afirmar registro
sin una acción real. Estas advertencias no fueron introducidas por el cambio de nombre y no se corrigieron para
evitar ampliar el alcance sin regresión.

Próximo paso recomendado: preparar un cambio conversacional separado para sustituir esa promesa por lenguaje de
orientación verificable y ejecutar una regresión gobernada de Seguimiento/Calidad, incluida una conversación real
si ANAM autoriza su consumo.
