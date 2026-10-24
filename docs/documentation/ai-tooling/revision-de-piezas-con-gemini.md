# Revisión de piezas con Gemini — QA de audio, video e imagen

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.2
> **Creado:** 2026-10-21 por Claude
> **Última actualización:** 2026-10-21 por Claude (v2 de la CLI: verificación automática, cues, rúbricas)
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

## Cómo comprueba lo que dice Gemini

Desde la versión 2, la herramienta no se queda con la palabra de Gemini. Con `--verify`, cada afirmación que se puede
medir pasa por una medición real del audio y la imagen, y queda marcada como **confirmada** o **refutada**:

| Gemini dice | La herramienta mide |
|---|---|
| «Hay silencio aquí» | Si el volumen de ese tramo baja de verdad al silencio |
| «El golpe cae en este segundo» | Si hay un ataque de sonido a menos de dos cuadros |
| «Hay un corte de plano» | Si la imagen cambia de golpe en ese momento |
| «Se congela la imagen» | Si hay cuadros idénticos seguidos |
| «El sonido va desfasado» | Cuántos milisegundos separan el sonido del cambio de imagen |

Las opiniones («el cierre se siente plano», «el texto es chico») quedan marcadas como juicio: no se miden, pero se
consideran.

Si se le entrega la **hoja de cues** de la pieza (el plan de qué pasa en cada segundo), además mide cada momento
planeado por su cuenta, sin depender de Gemini.

> Ejemplo real (pieza AWS, octubre de 2026): Gemini aseguró que la imagen quedaba congelada en los últimos segundos. La
> medición mostró que nunca se congela, así que esa crítica se descartó. Las cues medidas confirmaron que el silencio,
> los dos golpes y el remate sonoro caen exactamente donde se planearon.

## Revisar sin Gemini: solo medición

La parte más confiable de la herramienta no necesita a Gemini. Con `--measure-only`, mide la pieza en menos de un
segundo y sin costo:
- dónde suena cada golpe;
- dónde hay silencio;
- dónde cambia la imagen;
- si hay cuadros congelados;
- si el sonido va en sincronía con la imagen.

Si se le entrega la hoja de cues, confirma cada momento planeado.

Por eso el orden de trabajo es:
1. **Primero, la medición**, como control de calidad estándar antes de mostrar una pieza.
2. **Después, Gemini como segunda opinión**, para lo que solo se puede juzgar mirando: si algo se siente plano, si un
   texto se lee o si el ritmo engancha.

## Rúbricas fijas

Para comparar piezas con la misma vara, la herramienta trae revisiones predefinidas: sincronía, impacto, cierre, tirones
y legibilidad. Cada una tiene versión. Una nota solo se compara con otra si salió de la misma rúbrica, la misma versión
y el mismo modelo.

## Límites

- Directamente se pueden enviar cerca de 19 MB por revisión. Los archivos más grandes se suben primero a un almacenamiento privado y se borran al terminar.
- Se puede revisar un solo audio y hasta 10 videos por vez (por ejemplo, dos versiones para compararlas).
- Cada modelo de Gemini tiene su propia cuota. Si una se agota, se cambia de modelo.
- Es una herramienta de trabajo local: no está en el portal ni cambia el comportamiento de Greenhouse.
