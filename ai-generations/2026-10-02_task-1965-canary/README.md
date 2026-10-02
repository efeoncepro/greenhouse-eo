# Canario TASK-1965 — `pnpm ai:inpaint image` (2026-10-02)

Base neutra sin personas ni marcas (`base.png`, `gpt-image-2.5-flare` low, 1536×1024) y máscara
`pnpm ai:mask --rect 0.08,0.16,0.34,0.72 --feather 24`. Prompt: una planta en maceta de terracota sobre la
mesa vacía. Gasto total de la jornada ≈ USD 0,40 (autorizado por el operador en tres tramos).

| Corrida | Adaptador / modelo | Resultado | Zona protegida | Panel negro |
|---|---|---|---|---|
| `inpaint/1ddaa7eb3de9` | openai · Sunburst `low` (máscara sin núcleo en 255, bug ya corregido) | sin planta | delta 0 | — |
| `inpaint/87034bf1773d` | openai · Sunburst `medium` | **rectángulo negro** donde la máscara abre | delta 0 | 99,3 % |
| `inpaint/0df0cbbe0fc1` | openai · Sunburst `medium`, máscara con RGB de la imagen | **rectángulo negro** (hipótesis del RGB refutada) | delta 0 | 99,2 % |
| `inpaint/e8f26fe6d7aa` | openai · **Flare** `medium` | planta bien puesta | delta 0 | 0,1 % |
| `inpaint/52f4e5d799dd` | fal · **Flux Pro Fill** | planta bien puesta | delta 0 | 0,2 % |
| `inpaint/d39260af18b1` | openai · **Sunburst sin máscara**, sin guía | buena planta pero **fuera de la zona**: lo pegado quedó vacío (`PASS` con aviso «casi no cambió») | delta 0 | — |
| `inpaint/f28f698de683` | openai · **Sunburst sin máscara + guía de zona en magenta** | **planta dentro de la zona**, 0 píxeles magenta en la salida, sin reencuadre | delta 0 | — |
| `inpaint/728b04d2f8d4` | openai · Sunburst + `--sketch` + `--reference` (helecho) | helecho de la referencia en la posición del boceto, pero **más grande que el trazo: la caja derivada le cortó las hojas** | delta 0 | — |
| `inpaint/2c948a5d078a` | ídem + **máscara derivada que crece hasta el objeto** (+31.496 px) | **helecho entero**, sin cortes, 0 píxeles magenta | delta 0 | — |
| `inpaint/d95eef38fb58` | fal · **Seedream 5 Lite edit** (sin máscara, guía de zona) | planta dentro de la zona; **costura visible en la pared** (re-renderiza la superficie con otro tono) y maceta cortada por la máscara explícita; ignoró `image_size` (2880×1920) | delta 0 | — |

Hallazgos:

1. La recomposición deja la zona protegida idéntica bit a bit en las cinco corridas, aunque el modelo la había
   movido hasta 179/255. La garantía es del pipeline, no del proveedor.
2. **Sunburst con máscara devuelve la zona totalmente editable como panel negro plano** (3 de 3 con la pasada
   del 2026-09-23). Default del adaptador: Flare. El pipeline marca `suspectFlatPanel` sobre la salida cruda.
3. El difuminado de sharp dejaba el centro de la máscara en 253: la zona quedaba toda «borde» y el modelo no
   editaba. `feather` ahora repone el núcleo en 255.
4. La verificación prueba lo que NO se toca, no si el pedido se cumplió: la primera corrida pasó sin planta.
   El pipeline avisa cuando la zona abierta casi no cambió.
5. **Sin máscara, Sunburst no sabe dónde va el objeto**: en `d39260af18b1` puso la planta a la derecha de la zona (no
   reencuadró: taza y cuaderno en los mismos píxeles). Con la zona marcada como imagen 2 de guía la puso dentro
   (`f28f698de683`). Es el modo por defecto de Sunburst desde este canario.
6. **El boceto no fija el tamaño:** Sunburst dibujó el helecho más grande que el trazo. Una máscara DERIVADA del boceto
   ahora crece hasta el objeto dibujado (diferencia fuerte con la base, sólo cerca de la zona); una `--mask` explícita
   nunca crece.
7. **Seedream edit deja costura** sobre superficies lisas: cambia el tono de la pared dentro de la zona de forma local y
   la corrección de color media no lo cubre. Para pieza final: Flare, Flux Fill o Sunburst con guía.
8. Si el objeto generado excede la máscara (hojas de Flare al borde derecho), la recomposición lo funde con la
   base: la máscara debe cubrir el objeto entero con margen.

Los binarios (`*.png`) viven fuera de git; archivar con `pnpm ai-gen:archive`.
