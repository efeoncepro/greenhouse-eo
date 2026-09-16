# GPT Image 2.5 — línea base de consumo real (`usage`)

> **Medido:** 2026-09-16 · **Task:** TASK-1851 · **Modelos:** `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`
> **Snapshot vigente al medir:** `…-2026-09-08` · **Autorización de gasto:** 7 piezas, tope en piezas

## Por qué existe esta carpeta

OpenAI declara verbatim que *"The GPT Image 2 calculator does not estimate GPT Image 2.5 token consumption"*
y que tarifas por token iguales no implican costo por imagen igual. No hay forma documentada de estimar el
costo por imagen de 2.5: la única vía es leer `usage` de respuestas reales. Esta carpeta es esa medición.

Importa porque el compiler de Efeonce Globe resuelve el costo **antes** del gasto para reservar créditos.
Sin esta línea base, ninguna ruta 2.5 podía promoverse allá. La decisión de abrir una ruta es de `TASK-1553`;
esta medición sólo le quita el bloqueador.

## 🔴 Esto es evidencia fechada, no un contrato

No es una tarifa estable. No entra a una propuesta comercial, a un pricing ni a una reserva de créditos sin
volver a medir. Los precios por token y el comportamiento de los escalones pueden cambiar sin aviso, y los
snapshots de modelo rotan.

## Resultados

Todas a `1024x1024`, PNG, en serie, un solo prompt neutro.

| Caso | Modelo | Quality | Output tokens | Total tokens | Latencia | USD derivado |
|---|---|---|---|---|---|---|
| flare-low | flare | low | 196 | 245 | 13,3 s | 0,0063 |
| flare-high | flare | high | 1 756 | 1 805 | 18,7 s | 0,0531 |
| flare-max | flare | max | 7 024 | 7 073 | 46,0 s | 0,2111 |
| sunburst-low | sunburst | low | 196 | 245 | 11,6 s | 0,0063 |
| sunburst-high | sunburst | high | 1 756 | 1 805 | 29,1 s | 0,0531 |
| sunburst-max | sunburst | max | 7 024 | 7 073 | 80,6 s | 0,2111 |
| flare-transparent | flare | high + `background: transparent` | 1 756 | 1 808 | 21,0 s | 0,0531 |

**Total: USD 0,594 en 7 piezas.** USD derivado con las tarifas vigentes al 2026-09-16
(input texto USD 8,00 / 1M; output imagen USD 30,00 / 1M).

## Qué se aprendió

1. **El costo por imagen no depende del modelo.** Flare y Sunburst consumieron exactamente los mismos
   tokens en los tres escalones. Quien presupueste debe mirar `quality × size`, no cuál de los dos modelos
   se eligió.
2. **Lo que separa a los modelos es la latencia, y la brecha crece con la calidad.** En `high`, Flare fue
   1,6× más rápido; en `max`, 1,75× (46,0 s vs 80,6 s). Elegir Sunburst se paga en tiempo, no en dinero.
3. **La transparencia salió gratis.** `background: transparent` consumió los mismos 1 756 tokens que `high`
   opaco. El alfa se verificó decodificando los bytes (canal alfa presente + píxel no opaco), nunca por
   metadata ni por ver un checkerboard.
4. **Ninguna corrida degradó en silencio.** El API resolvió exactamente el `quality`, `size` y `background`
   pedidos en las 7 piezas — que es justamente lo que el contrato viejo no garantizaba.
5. **La escalera es ~9× de `low` a `high` y ~4× de `high` a `max`** (36× de punta a punta). `max` en una
   pieza cuesta lo mismo que 36 exploraciones en `low`.

## Prompts verbatim

Opaco (6 corridas):

```
A flat-style vector illustration of a single potted plant, centered, on a plain neutral background. Soft even lighting, muted green and terracotta palette. No text, no lettering, no logos, no people.
```

Transparente (1 corrida):

```
A flat-style vector illustration of a single potted plant, isolated subject, fully transparent background. No backdrop, no solid background, no checkerboard, no drop shadow. No text, no lettering, no logos, no people.
```

Sujeto deliberadamente neutro: sin PII, sin nombres de clientes, sin marcas de terceros y sin texto — no se
envía material sensible a un proveedor externo sólo para medir consumo.

## Qué cuesta EDITAR frente a generar (medido 2026-09-16)

La intuición dice que cambiar un detalle debería salir más barato que generar de cero. Es al revés.
Todo a `gpt-image-2.5-flare` · `low` · `1024x1024`:

| Caso | Input (img / txt) | Output | Total | USD |
|---|---:|---:|---:|---:|
| Generar | 37 (0 / 37) | 196 | 233 | 0,0061 |
| Editar **con** máscara | 1 056 (1 024 / 32) | 196 | 1 252 | 0,0142 |
| Editar **sin** máscara | 1 056 (1 024 / 32) | 196 | 1 252 | 0,0142 |

1. **El output no baja.** El modelo devuelve la imagen **completa** aunque la máscara acote qué se
   modifica: los mismos 196 tokens que una generación. La máscara controla el resultado, no el gasto.
2. **La imagen base se paga como entrada:** 1 024 tokens de imagen. En `low`, editar costó **2,3× generar**.
3. **La máscara es gratis.** Con y sin máscara el `usage` fue idéntico. Lo que se cobra es la imagen base.
4. **El sobrecosto relativo se diluye al subir la calidad**, porque el output pasa a dominar: ~2,3× en
   `low`, ~1,15× en `high`, ~1,04× en `max`.

Verificación visual: el inpainting funcionó y preservó el resto (diferencia media fuera de la zona
2,4/255 con máscara, 2,8/255 sin ella). Nota de método: la diferencia media **no** sirve para juzgar un
objeto pequeño — con la taza ya puesta, el promedio dentro de la zona era 4,3/255. Hubo que mirar la
imagen para confirmar que el edit había ocurrido.

## Archivos

- `manifest.json` — una fila por corrida con `usage` completo, lo resuelto por el API, latencia y costo derivado.
- `runs.jsonl` — salida cruda, append-only, en orden de ejecución.
- `canary.ts` — el instrumento, para que la medición sea reproducible.
- `flare-transparent.png` — única imagen conservada, por ser la evidencia del canal alfa. Las otras seis se
  descartaron: su valor está en `usage`, no en el píxel, y no justifican 6 MB versionados.

## Cómo repetirlo

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs \
  ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/canary.ts flare-low
```

Sin argumentos corre la matriz completa. **Gasta dinero real**: exige autorización explícita, con tope
acordado en piezas, y corre en serie. Ante un `429` se detiene y registra; nunca reintenta en bucle.
