# Componer recursos AEO de AXIS en una pieza creativa

## Cuándo usarlo

Usa este recurso cuando una pieza comercial necesite evocar una pregunta en búsqueda con IA, una conversación de ChatGPT o Gemini, un composer, una burbuja, una respuesta o una cita. La [galería pública de AXIS](https://axis.efeonce.org/references/creative-resources/) permite explorar las variantes. La entrada operativa para agentes es el [índice de composición de AXIS](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/README.md), en el repo hermano `../axis-design-system`.

Esta biblioteca es **candidata y local**. No forma parte del paquete AXIS estable, no es un servicio de búsqueda, no entrega una respuesta real y no aprueba una pieza. El agente sigue el brief, la skill `efeonce-advertising-creative`, los derechos de assets y el proceso de revisión/publicación de la campaña.

## Selecciona el módulo

| La pieza necesita | Intención en AXIS | Comando desde `../axis-design-system` |
| --- | --- | --- |
| Campo de búsqueda con acceso a Modo IA de Google o hipótesis AEO Efeonce; campo, acción, icono o sugerencia aislada | `docs/agent-composition/ai-search-intent.schema.json` | `pnpm search:compose --input docs/examples/ai-search-graphic/efeonce-suggestions.json --out-dir /tmp/axis-search` |
| Una de las cuatro ilustraciones SVG originales con consulta y cinco sugerencias editables cuando corresponda | `docs/agent-composition/original-search-intent.schema.json` | `pnpm search:compose-original --input docs/examples/original-search-intent.json --out-dir /tmp/axis-original` |
| Solo el campo de ChatGPT o Gemini antes del envío | `docs/agent-composition/llm-composer-intent.schema.json` | `pnpm llm-composer:compose --input docs/examples/llm-composer-chatgpt-intent.json --out-dir /tmp/axis-composer` |
| Aplicación, conversación, burbuja, respuesta, cita o tarjeta relacionada | `docs/agent-composition/aeo-conversation-intent.schema.json` | `pnpm aeo:compose --input docs/examples/aeo-composition/efeonce-chatgpt.json --out-dir /tmp/axis-conversation` |

Copia el JSON de ejemplo a la carpeta de trabajo de la pieza, edítalo y declara solo los módulos necesarios. Los comandos producen SVG con texto/grupos editables y `manifest.json`; entrega ambos junto al JSON de intención. `aeo:compose` permite `modules: ["user", "answer", "citation"]` y `targets` por `turnId`/`citationIndex`; `llm-composer:compose` permite pedir únicamente el composer sin inventar conversación. Para Gemini usa el ejemplo y `provider` de Gemini; no reutilices controles de ChatGPT.

## Reglas para ensamblar

1. **Un momento por elemento.** Campo/composer: pregunta todavía no enviada. Burbuja: texto enviado. Respuesta: contenido atribuido al asistente. Cita: fuente ligada a una afirmación. La selección «Búsqueda web» de ChatGPT vive en el composer; no la escribas dentro de la burbuja del usuario.
2. **Conserva la superficie.** La lupa con destello de Modo IA corresponde al campo de Google Search; no lleva un aro arcoíris. `efeonce-exploration` es una hipótesis editorial diferente. Una caja de Google junto a una respuesta de ChatGPT o Gemini es una comparación o secuencia editorial con cambio de producto explícito, no una captura continua.
3. **Conserva la procedencia.** `editorial-sample` es una muestra. Si la pieza afirma mostrar salida real, usa `captured-output` con referencia y fecha, y compara la interacción observada con cada pregunta, control, respuesta y cita. `manifest.json` no prueba veracidad por sí mismo.
4. **Verifica la cita.** Pon `[[id]]` inmediatamente después del pasaje respaldado. Comprueba URL, título, editor y contenido de la página; el favicon corresponde al sitio citado y cambia con su host. Si falta un favicon verificado, usa el globo neutro. No atribuyas a la IA un hallazgo inventado sobre la marca.
5. **Compón el arte final.** Coloca los SVG como capas en la pieza, ajusta escala sin deformar, revisa texto real, legibilidad, contraste, reservas y tamaño final. Los punteros y checks de las cuatro ilustraciones originales son arte estático; no los anuncies como interacción. La procedencia de un módulo transparente debe hacerse visible en la pieza cuando corresponda.

La referencia Google del compositor cubre el campo observado, **no** todos los estados ni la respuesta de AI Mode; su texto usa una aproximación de Google Sans. El esquema y la salida del Lab siguen siendo exploratorios. La [guía de AXIS](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/README.md) contiene los límites y contratos actualizados; si cambia, esa fuente prevalece sobre los ejemplos de este manual.
