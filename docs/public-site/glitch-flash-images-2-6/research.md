# Images 2.6 — auditoría de investigación

Fecha de contraste: 2026-11-05. **Adenda:** posteriormente se añadieron cuatro pruebas propias y se creó el post privado 252401; ver [estado vigente](./README.md) y [pruebas](./own-tests.md). La auditoría que sigue describe el borrador anterior a esas pruebas. Alcance: lectura de fuentes primarias y auditoría de `articulo.md`; sin canary, generación pagada ni publicación. El archivo auditado tenía 2.961 palabras por separación de espacios. No se modificó el artículo.

## Resultado

Los claims centrales del artículo tienen respaldo: fecha, nombres, orientación de los modelos, cifras de velocidad atribuidas al proveedor, despliegue diferenciado, markup, complejidad, SVG y precios. No se encontraron promesas infundadas de rendimiento propio ni pruebas inventadas. El texto distingue demostraciones seleccionadas, análisis editorial y evaluación pendiente.

El título y la tesis sobre la segunda corrección son interpretación editorial, no una conclusión experimental. Mantener ese tratamiento.

## Matriz de fuentes y presupuesto

Cada página siguiente tiene un máximo de 200 palabras derivadas en el resultado completo, aunque se cite varias veces. No se puede multiplicar el presupuesto abriendo fragmentos, versiones traducidas o rutas equivalentes de la misma página. Las recomendaciones originales no se cuentan automáticamente como resumen, pero deben distinguirse del hecho documentado. Evitar copiar prompts largos.

| Fuente primaria | Hechos que puede respaldar | Auditoría del artículo y límite |
| --- | --- | --- |
| [Anuncio Images 2.6](https://openai.com/index/introducing-images-2-6/) | Fecha 4/11/2026; ChatGPT/Codex/API; claim 50% más rápido; Flare desde seis segundos con `quality=low`; ejemplos OpenArt/Town. | Estimación de prosa factual atribuible: 120–170 palabras. Mantener debajo de 200 incluyendo captions y extracto/SEO. No convertir 50% más rápido en mitad del tiempo garantizada. |
| [Model card Flare](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare) | `gpt-image-2.6-flare`, generación y edición para iteración rápida, entrada texto/imagen. | Uso breve, muy inferior a 200. No hay benchmark creativo publicado en esta ficha: performance/speed figuran sin cifra. |
| [Model card Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst) | `gpt-image-2.6-sunburst`, trabajo visual detallado, generación y edición, texto/imagen de entrada. | Uso breve, muy inferior a 200. No presentar como video o audio. |
| [Help: Images in ChatGPT](https://help.openai.com/en/articles/11084440-images-in-chatgpt) | Images en todos los planes; GIF en despliegue; thinking Plus/Pro/Business y Enterprise/Edu próximos. | Aproximadamente 70–100 palabras derivadas. El artículo conserva la distinción. No afirmar todas las funciones para todas las cuentas desde el lanzamiento. |
| [Lanzamiento 2.5](https://openai.com/index/introducing-chatgpt-images-2-5/) | Fecha 8/9/2026; fidelidad, bocetos y continuidad entre ediciones ya estaban en la línea anterior. | Menos de 60 palabras. No acumular porcentajes de velocidad de 2.5 y 2.6 como una mejora medida común. |
| [Changelog API](https://developers.openai.com/api/docs/changelog) | Entrada 4/11: 2.6 Flare/Sunburst; markup también para 2.5 compatible. | Menos de 50 palabras. El artículo no adjudica markup exclusivamente a 2.6. |
| [Referencia: edit](https://developers.openai.com/api/reference/resources/images/methods/edit) | Capa PNG transparente y dimensiones correspondientes a primera imagen; modelos 2.6 entre opciones de edición. | Menos de 60 palabras. La descripción de markup retiene una referencia a 2.5, por lo que changelog y guía son la evidencia actual de soporte 2.6. |
| [Referencia: generate](https://developers.openai.com/api/reference/resources/images/methods/generate) | `complexity` separado de calidad; referencia raster y autor para SVG; operaciones y restricciones. | Menos de 50 palabras actualmente. Puede respaldar explícitamente el mecanismo SVG para aliviar la guía de generación, siempre que se cite cerca. |
| [Guía de generación](https://developers.openai.com/api/docs/guides/image-generation) | Recomendación de complejidad baja en muchas ediciones; ejemplos de linterna y SVG; mecanismo y costos SVG; límites generales de consistencia/texto/composición. | Es la página que más se reutiliza. Contando únicamente frases factuales, alrededor de 110–160 palabras; contando conservadoramente introducciones a ejemplos y comentario adyacente puede acercarse a 200. No añadir más paráfrasis técnica ni prompts. Reatribuir explícitamente el mecanismo SVG a referencia generate y el florero a prompting. |
| [Guía de prompting](https://developers.openai.com/api/docs/guides/image-prompting) | Ejemplos 2.6: florero azul Sunburst, cafetera en español y billboard de shampoo con nieve; también ejemplos de marca Field & Flour. | La presentación factual de estos ejemplos queda muy por debajo de 200. Contar captions adicionales; conservar crítica original como lectura editorial. No trasladar completos los prompts a la publicación. |
| [Pricing API](https://developers.openai.com/api/docs/pricing) | Standard ambos 2.6: USD/M tokens texto entrada 5; texto cache 1,25; imagen entrada 8; cache 2; salida 30. | Tabla y explicación están debajo de 200. No son USD por imagen ni precio de suscripción. No afirmar Batch: la tabla Batch consultada no lista 2.6. |
| [System card](https://deploymentsafety.openai.com/chatgpt-images-2-6) | Evaluaciones y mitigaciones de seguridad, incluidos riesgos de GIF. | Menos de 50 palabras. `/safety-evaluations` muestra el mismo contenido y no suma presupuesto. No usar sus cifras como benchmark creativo o incidencia de producción. |

Las estimaciones son editoriales, no un contador automático de atribución: un algoritmo no distingue de forma fiable análisis propio de paráfrasis. En caso de añadir captions, preguntas frecuentes o metadescripción, revisar de nuevo por fuente.

## Ajustes sugeridos para el artículo

1. En «La velocidad sirve…», enlazar la primera oración de las cifras al anuncio. El enlace de la introducción es correcto pero queda lejos de la afirmación cuantitativa.
2. En «Editar…», cambiar «En el ejemplo oficial de la guía» por «En el ejemplo de la [guía de prompts de OpenAI](https://developers.openai.com/api/docs/guides/image-prompting)…». Es la fuente que muestra explícitamente la salida Sunburst usada en el placeholder; la guía de generación muestra la salida Flare.
3. En «SVG…», enlazar «el flujo genera una imagen de referencia y un modelo autor produce el SVG» a la [referencia de generación](https://developers.openai.com/api/reference/resources/images/methods/generate). La referencia describe la selección del autor SVG y el modelo de imagen de referencia; el costo por ambos componentes queda respaldado por la guía de generación.
4. Mantener la advertencia sobre diferencias en documentación GIF sin publicar cifras incompatibles. No hacen falta recetas API ejecutables en esta pieza editorial.

## Discrepancias comprobadas que el borrador evita

- La guía de generación enumera 2–64 frames para GIF; las referencias generate/edit enumeran 2–16 y acceso a preview. No fijar hoy el máximo como una promesa.
- La guía señala SVG/GIF solamente en generación, no en edits; referencia edit todavía enumera campos GIF. No inferir soporte de edición GIF a partir del schema.
- La ayuda de ChatGPT dice GIF «rolling out», aun cuando el anuncio describe disponibilidad general de Images 2.6.
- La referencia API conserva ejemplos y menciones heredadas a 2.5. No asumir que todos los ejemplos antiguos documentan una capacidad nueva de 2.6.

## Readback del SVG usado

El recurso concreto comunicado para Field & Flour se verificó por HTTP el 2026-11-05:

`https://developers.openai.com/images/platform/guides/image-prompting/field-and-flour-gpt-image-2-6-sunburst.svg`

Respuesta 200; MIME `image/svg+xml`; 4.571 bytes; `viewBox="0 0 1024 1024"`; título interno `Field & Flour bakery logo`. No se encontraron los marcadores `data:image` ni `<script` en esos bytes. Es un SVG, no el PNG raster de otro ejemplo con el mismo nombre de marca. El atributo de procedencia y el caption deben conservar el modelo y la guía oficial; no atribuir su producción a Julio/Efeonce.

Esta comprobación verifica archivo y procedencia; no constituye QA completo de accesibilidad, licencias de terceros o aptitud del logo para una marca real.
