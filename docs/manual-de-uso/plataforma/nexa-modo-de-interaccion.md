> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.1
> **Creado:** 2026-06-18 por Claude (TASK-1079)
> **Ultima actualizacion:** 2026-06-21 por Claude (v1.1 — TASK-1212: cómo confirmar una acción de Nexa)
> **Documentacion tecnica:** [docs/architecture/nexa-intelligence/experience/conversational-experience.md](../../architecture/nexa-intelligence/experience/conversational-experience.md)

# Nexa — modo de interacción (Compacto / Panel / Lateral)

## Para qué sirve

Elegir **cómo se ve Nexa** mientras la usas, según tu forma de trabajar. La elección se guarda en tu
cuenta y te sigue entre dispositivos.

## Antes de empezar

- Nexa está disponible en todo el portal (la burbuja flotante abajo a la derecha).
- No necesitas permisos especiales: es una preferencia tuya.

## Los tres modos

| Modo | Cuándo te sirve | Cómo se ve |
| --- | --- | --- |
| **Compacto** | Preguntas rápidas y puntuales | Burbuja flotante chica. |
| **Panel** | Conversaciones más largas, revisar historial | Panel que se amplía, con rail de historial. |
| **Lateral** | Trabajar **con el dashboard a la vista** | Columna fija a la derecha; la pantalla se acomoda al lado (no se tapa). |

## Paso a paso — cambiar el modo

1. Abre Nexa (clic en la burbuja flotante).
2. En la cabecera del chat, abre el **botón de modo** (ícono de distribución/columnas).
3. Elige **Compacto**, **Panel** o **Lateral**. El cambio aplica de inmediato y se guarda.

## En modo Lateral

- La columna de Nexa se queda abierta a la derecha y el contenido de la página se acomoda a su lado.
- Para **contraerla**, usa el botón cerrar (×) en la cabecera de la columna. La burbuja flotante vuelve
  a aparecer para reabrirla cuando quieras.
- En celular/tablet la columna se muestra como un panel deslizable (no ocupa toda la pantalla fija).

## Qué no hacer

- No esperes que "Lateral" esté siempre disponible: llega de forma gradual. Si no aparece en el menú,
  aún no está habilitado para tu entorno; usa Compacto o Panel.

## Problemas comunes

- **No veo el botón de modo:** aparece solo cuando hay más de un modo disponible. Si solo está
  Compacto habilitado, no hay nada que elegir.
- **Cambié de computador y se mantuvo mi modo:** es lo esperado — la preferencia se guarda en tu cuenta.

## Confirmar una acción de Nexa

Además de responder, Nexa puede **ejecutar acciones** por ti (por ejemplo, marcar notificaciones como
leídas o crear/emitir una cotización). Siempre con tu confirmación. Cómo se ve:

1. Le pides la acción en el chat. Nexa **no la ejecuta**: te muestra una **tarjeta de confirmación** con
   el resumen de lo que va a pasar (qué, con qué datos, el impacto) y dos botones: confirmar o cancelar.
2. Revisa el resumen. Si está bien, aprieta **Confirmar**. Si no, **Cancelar** y no pasa nada.
3. Verás el estado: ejecutando → listo (o un mensaje claro si falló). Confirmar dos veces no duplica la
   acción.

Qué tener en cuenta:

- **Nada cambia hasta que confirmas.** La propuesta es solo una vista previa.
- **Si no tienes permiso**, Nexa te lo dice y no ofrece la acción.
- **Si la acción no está disponible** (apagada en ese ambiente), Nexa lo dice honestamente y, cuando
  puede, te deja un enlace para hacerlo a mano.

> Para el paso a paso de cotizar con Nexa: [Operar Comercial y Quote-to-Cash](../comercial/operar-quote-to-cash-comercial.md).

## Referencias técnicas

- Funcional: [Experiencia Conversacional de Nexa](../../documentation/plataforma/nexa-conversational-experience.md)
- Acciones gobernadas (técnica): [behavior-and-routing.md](../../architecture/nexa-intelligence/behavior/behavior-and-routing.md) + contrato [data-contracts.md](../../architecture/nexa-intelligence/technical/data-contracts.md)
- Técnica: [conversational-experience.md (capa experience)](../../architecture/nexa-intelligence/experience/conversational-experience.md)
- Fuente de verdad del modo: `greenhouse_core.client_users.nexa_interaction_mode`; flag de disponibilidad
  del Lateral: `NEXA_INTERACTION_LANE_ENABLED` (default OFF). Acción de cotización: `NEXA_QUOTE_AUTHOR_ACTION_ENABLED` (default OFF).
