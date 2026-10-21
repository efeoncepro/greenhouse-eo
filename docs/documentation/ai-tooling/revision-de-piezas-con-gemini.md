# Revisión de piezas con Gemini — QA de audio, video e imagen

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-10-21 por Claude
> **Última actualización:** 2026-10-21 por Claude
> **Documentación técnica:** [Guía de selección de modelos §5.10](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
> **Manual de uso:** [Escuchar y mirar media con Gemini](../../manual-de-uso/ai-tooling/escuchar-y-mirar-media-con-gemini.md)

## Qué es

`pnpm ai:listen` es una herramienta interna. Le entrega a Gemini (el modelo de Google) uno o varios archivos de audio,
video o imagen, junto con una pregunta, y devuelve la respuesta en texto. Sirve para revisar una pieza terminada o en
proceso cuando nadie puede escucharla o mirarla en ese momento, por ejemplo cuando un agente arma un video con sonido.

No crea imágenes, videos ni música: solo revisa lo que ya existe.

> Detalle técnico: el helper vive en `src/lib/ai/gemini-media-analysis.ts` y usa el cliente canónico de Google del repo
> (Vertex con credenciales de gcloud). La CLI está en `scripts/ai/listen.ts`.

## Para qué se usa

| Uso | Ejemplo |
|---|---|
| Criticar una mezcla de sonido | ¿Los golpes caen con la imagen? ¿El logo final se escucha? |
| Elegir entre opciones | Entre dos tomas de un efecto, ¿cuál encaja mejor? |
| Juzgar el impacto visual | ¿El montaje tiene fuerza? ¿Hay un momento que se sienta detenido? |
| Revisar el cierre | ¿Se lee el lockup? ¿El final se siente abrupto? |

Se usó en las piezas de la serie de anuncios de partners (Claude, Microsoft y AWS, octubre de 2026).

## La regla más importante: orienta, no mide

Gemini da **criterio**, como un director creativo que mira la pieza. No es un instrumento de medición. Cuando afirma
algo que se puede medir (en qué segundo pasa algo, qué tan fuerte suena, si hay silencio), muchas veces se equivoca.

Por eso:

- **Lo que se puede medir se mide** con herramientas de análisis de audio y video, y se compara con lo que dijo
  Gemini antes de cambiar la pieza.
- **Lo que es juicio puede servir.** En la pieza de AWS, Gemini dijo que el cierre se sentía estático, y era cierto:
  el plano venía alejándose y el cierre empujaba hacia adentro. En la misma revisión pidió «más silencio» en un tramo
  que ya era silencio total, y esa sugerencia se descartó.
- **Las notas de modelos distintos no se comparan.** Para saber si una versión mejoró, se usa el mismo modelo y la
  misma pregunta.

> Detalle técnico: los casos medidos están en los métodos de producción de
> [Claude](../../operations/social/2026-10-21-claude-partner-announcement-production-method.md),
> [Microsoft](../../operations/social/2026-10-21-microsoft-partner-announcement-production-method.md) y
> [AWS](../../operations/social/2026-10-21-aws-partner-announcement-production-method.md).

## Límites

- Los archivos de una revisión suman como máximo cerca de 19 MB. Un video de 8 segundos en 1080p entra sin problema.
- Cada modelo de Gemini tiene su propia cuota. Si una se agota, se cambia de modelo.
- Es una herramienta de trabajo local: no está en el portal ni cambia el comportamiento de Greenhouse.
