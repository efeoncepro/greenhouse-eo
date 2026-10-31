# Contacto — documentación funcional

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 2.0
> **Creado:** 2026-09-15 (commit «document approved Contacto landing»)
> **Ultima actualizacion:** 2026-10-31 por Claude
> **Documentacion tecnica:** [Contrato técnico de la landing Contacto](../../architecture/public-site/CONTACTO_LANDING_RUNTIME_V1.md)

La landing `/contacto/` es la puerta pública de Efeonce para empezar una conversación sin forzar todos los casos al
funnel comercial. Desde el 2026-10-31 está en su versión 2, «La órbita»: Nexa recibe a la persona, que elige entre
escribir un mensaje o agendar una reunión sin salir de la página. Si busca empleo, el flujo la lleva a Careers.

## Qué puede hacer una persona

1. **Escuchar a Nexa.** La portada muestra a Nexa en una foto de cine y ofrece su presentación en voz, con
   subtítulos que avanzan junto al audio. El audio sólo suena si la persona lo pide.
2. **Escribir un mensaje.** Elige un motivo (empresa, equipo, consulta técnica, alianza, medios u otro); Nexa
   responde con una línea distinta para cada motivo. Completa asunto, mensaje y datos de contacto, elige país con
   bandera y código, acepta el uso de datos y, por separado, decide si recibe novedades.
3. **Saber cuándo le responden.** Debajo del formulario dice «Te respondemos en un día hábil».
4. **Agendar una reunión de diagnóstico** desde la portada, la tarjeta junto al formulario o el cierre. El
   agendador se abre en la misma página, como una ventana propia, sin otra ventana encima. Es la única reunión que
   se ofrece aquí.
5. **Contactar directo:** copiar el correo con un botón, escribir por WhatsApp al móvil de Chile, llamar a Chile
   (móvil o 600) o Estados Unidos, y abrir la casa matriz en Google Maps.
6. **Leer las preguntas frecuentes** y cerrar con «¿Lo conversamos?», que repite las tres vías: reunión, mensaje y
   WhatsApp.

## Rama Careers

Al elegir «Quiero trabajar en Efeonce», el formulario deja de ser el canal de postulación y aparece un aviso que
lleva a las oportunidades abiertas en Careers. Esta página no pide CV ni datos de candidatura.

## Datos institucionales publicados

| Dato | Valor |
|---|---|
| Correo general | `hola@efeoncepro.com` |
| Chile móvil y WhatsApp | `+56 9 3732 3064` |
| Chile línea 600 | `600 914 0660` (sólo desde Chile) |
| Estados Unidos | `+1 (239) 235-2073` |
| Casa matriz | Dr. Manuel Barros Borgoño 71, oficina 1105, Providencia, Santiago de Chile |
| Cobertura | Chile, Estados Unidos, Colombia, México y Perú |

La cobertura es de trabajo, no de oficinas: la única sede publicada es la casa matriz. Desde el 2026-10-31 el
footer de todo el sitio tiene una columna «Contacto» con la casa matriz, el correo, el 600 y el número de Estados
Unidos, y bajo el logo dice dónde trabajamos, con las cinco banderas. Antes mostraba una oficina antigua.

Las insignias de partner (HubSpot Gold Solutions Partner y Salesforce Partner) van debajo del formulario. Sobre
el fondo claro de la página se usa la versión de HubSpot con placa oscura. La crema sólo va sobre fondos oscuros,
porque sobre papel claro se pierde.

## Alcance honesto

- El plazo de un día hábil lo confirmó el operador el 2026-10-31. Es un compromiso de respuesta, no un SLA con
  penalidades.
- El formulario lo opera Growth Forms y la reunión Growth Meetings. La página sólo los presenta; una pantalla de
  éxito no sustituye el recibo del servidor.
- Las verificaciones del 2026-10-31 se hicieron mirando la página publicada, sin enviar mensajes ni reservar
  reuniones reales.

## Qué cambió el 2026-10-31 (versión 2)

- Nueva portada con Nexa y su presentación en voz con subtítulos.
- El formulario adoptó la tipografía y los colores de la página, con la línea de Nexa por motivo y el plazo de
  respuesta.
- La agenda se abre en la misma página desde tres puntos.
- El contacto directo suma WhatsApp, copiar correo, banderas y enlace a Maps.
- Preguntas frecuentes rediseñadas y un cierre «¿Lo conversamos?» al final.
- Footer del sitio con la dirección vigente de la casa matriz.

## Qué cambió el 2026-09-16

- La entrada «Cobertura» pasó de «Chile y otros mercados» a nombrar los cinco países.
- La banda que invitaba a agendar se arregló para el teléfono. Ese arreglo estaba escrito desde el día anterior,
  pero no se publicó hasta el 2026-09-16.

> Detalle técnico: [contrato técnico](../../architecture/public-site/CONTACTO_LANDING_RUNTIME_V1.md) ·
> [manual de operación](../../manual-de-uso/public-site/contacto.md) · insignias HubSpot en
> `public/branding/partners/hubspot/solution-partner/README.md` y `src/lib/brand-assets/hubspot-solution-partner.ts`.
