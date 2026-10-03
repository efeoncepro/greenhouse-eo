# Inpainting y edición local — playbook del agente

> **as-of 2026-10-03** (TASK-1965 + TASK-1973). Esto es el playbook operativo: intención → comando → modelo → flags →
> qué mirar al 100 % → código de salida → costo medido. El contrato vive en otro lado y manda ante cualquier
> diferencia:
>
> - técnico: [`GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §Pipeline de inpainting](../../../../docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)
> - elección de modelo y costos: [`GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`](../../../../docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
> - manuales: [editar una zona de una imagen](../../../../docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md) ·
>   [editar una zona de un video](../../../../docs/manual-de-uso/ai-tooling/editar-una-zona-de-un-video.md) ·
>   [expandir y separar en capas](../../../../docs/manual-de-uso/ai-tooling/expandir-y-separar-en-capas.md)
> - el contrato de cada flag: `pnpm ai:inpaint <subcomando> --help`, `pnpm ai:mask --help`, `pnpm ai:layers --help`.
>   Léelo antes de escribir un flag de memoria.
> - evidencia: `ai-generations/2026-10-02_task-1965-canary/README.md` y `ai-generations/2026-10-03_task-1973-canary/README.md`.

Herramienta **out-of-band** (`scripts/ai/inpaint/**`): nunca la importa `src/app/**` ni el runtime de `src/lib/**`.

## 0. ¿Es este carril?

| Situación | Carril |
|---|---|
| Cambiar, agregar, borrar o mover algo **y que el resto quede idéntico** | ✅ este |
| Llevar una escena aprobada a otro formato sin regenerarla | ✅ `expand` (ver §2; para el flujo aprobado CMP-004 de 1,91:1 manda `pnpm foto:expandir`, ver §2 nota) |
| El plate entero está mal (luz, lecho, composición, «se ve IA») | ❌ corrige la ficha y **regenera** (canon cine: casebook de brand-photography) |
| Retocar la piel de una cara | ❌ medido 2026-10-02: no la arregla; la piel se resuelve en el **retrato ancla** |
| Generar, borrar, mover o reconstruir un **logo o marca** | ❌ nunca con IA: la guarda de marca lo bloquea; el logo es el vector compuesto después. `--allow-brand` sólo si el prompt nombra la marca y la edición toca el **contexto** |
| Reiluminar un objeto pegado | `place --finish element --model gpt-image-2.5-sunburst` (único que conservó el objeto, 2026-10-03); `fal:iclight-v2` y `fal:image-apps-relighting` conectados pero deforman o recolorean (§7) |

## 1. La garantía y cómo leer el resultado

```
máscara canónica (1 canal, 255 = editable) → recorte con contexto (auto si la zona < 25 %) →
adaptador (salida cruda) → recomposición sobre la ORIGINAL → verificación del ARCHIVO ESCRITO → manifest.json
```

La garantía es del **pipeline**, no del modelo: fuera de la zona, **delta máximo 0/255** sobre el archivo releído (la
media no es criterio; los modelos movieron la zona protegida hasta 179/255).

| Código | Significa | Qué haces |
|---|---|---|
| `0` PASS | lo protegido quedó idéntico | igual míralo al 100 %: PASS prueba lo que NO se tocó, no que el pedido se cumplió |
| `2` FAIL | algo fuera de la zona cambió | no uses la salida |
| `3` REVISAR | todos los candidatos son sospechosos: panel plano, reencuadre, residuo de borrado, zona casi sin cambio | mira el aviso del `manifest.json`; cambia de modelo o de técnica |
| `1` | error | lee el mensaje |

- Todo queda en `<run>/inpaint/<id>/` (o `move/`, `place/`) con `manifest.json` sin secretos.
- **Caché por hash** de la entrada (incluye la revisión del adaptador): repetir no vuelve a pagar; `--force` repite.
- **Tope de costo:** `--max-usd` (default USD 1; env `AI_COST_CONFIRM_USD`); `--yes` lo supera.
- **`--dry-run` es gratis:** máscara, recorte, payload y costo estimado, sin llamar al proveedor. Úsalo primero.
- `--count <n>` (1–8) = N pedidos pagados, con `contact-sheet.png`.

## 2. Intención → comando → modelo

| Intención | Comando | Modelo por defecto | Flags que importan |
|---|---|---|---|
| Editar o agregar algo **en una zona** | `ai:inpaint image --image --mask --prompt` | `openai` · **Flare** `medium` con máscara | `--adapter fal:flux-pro-fill` (alternativa con máscara) · `--model gpt-image-2.5-sunburst` para la pieza final |
| Guiar con un dibujo, como el Markup de ChatGPT | `image --sketch` (+ `--reference` para el objeto) | el de `image` | sin `--mask`, la máscara sale del trazo (`--sketch-margin`, 40) y **crece hasta el objeto** (`--grow-mask auto`); una `--mask` explícita nunca crece |
| Rehacer un detalle (manos, textura) | `image --zone-resolution <px>` (512–4096) | el de `image` | **reinterpreta, no escala**: Flare redibujó la taza y le quitó el pie |
| **Borrar** un objeto | `ai:inpaint erase` | con `--layers`: **clean plate** (USD 0) · con `--mask`: **Sunburst por instrucción** | `--layer` (repetible), `--grow` (16), `--shadow auto` (default con capas: suma la sombra proyectada), `--fill plate\|model` |
| **Mover** o escalar un elemento | `ai:inpaint move --layers --layer --dx --dy [--scale]` | sin IA salvo el halo | `--scale` 0,2–3 · `--harmonize auto\|off` (sólo sombra de contacto y reflejo) · `--shadow off` |
| Traer un elemento **de otra foto** | `ai:inpaint place --image destino --from origen --layers --layer --at x,y [--width]` | sin IA salvo el acabado | `--finish halo` (default) · `element` (además lo relumina: su forma puede variar) · `off` (USD 0) |
| **Cambiar el fondo** | `ai:inpaint background --prompt` | el de `image` | sujeto por matting local o `--layers`; `--edge` (3 px); reporta la costura |
| **Expandir** a otro formato | `ai:inpaint expand --to <ratio>\|--canvas WxH` | **Flux Fill** (`fal:flux-pro-fill`) | `--scale` 0,3–1 · `--anchor` · `--blend` (24; 80–140 si el borde corta objetos) · `--prefill mirror\|neutral` |
| Separar en capas / máscara de un elemento | `ai:layers --image` → `ai:mask --from-layer <layers.json> --layer <sel>` | Seedream 5 Pro Layerize | `--prompt`, `--bbox`, `--image-size`, `--list` (gratis) |
| Editar **una zona de un video** | `ai:inpaint video --video --mask\|--mask-keyframes --prompt` | `fal:flux3-edit` [verificado] | `--max-drift` (12: aborta si el motor movió el encuadre) · `--strategy first-frame` · `--keep-frames`; copia el audio original |

**Reglas de modelo medidas (no las relitigues sin un canario nuevo):**

- 🔴 **Sunburst NUNCA con máscara:** devuelve la zona como **panel negro plano** (3 de 3). El pipeline lo hace editar sin
  máscara (`--provider-mask auto`), le manda la zona en magenta como imagen 2 (`--guide auto`), corrige el color en un
  anillo de 14 px (`--color-match auto`) y recompone. Revisa el aviso de reencuadre.
- **Flare es el default con máscara** para editar una zona; Sunburst es el más potente para la pieza final.
- **Borrar = editor por instrucción, no relleno con máscara:** Flare con máscara dejó media taza; Flux Fill dibujó
  **otra** taza dos veces; Seedream 5 Pro Edit dejó un fantasma del asa que el detector **no** ve. Con capas, el clean
  plate es gratis y limpio.
- **Expandir = Flux Fill, nunca GPT Image:** Flare achicó la escena (escala 0,88–0,90 → código 3) y Sunburst copió el
  relleno en espejo como contenido. Elegir un modelo de OpenAI en `expand` avisa.
- **Seedream edit (Lite y Pro) deja costura en superficies lisas** y Lite ignoró `image_size`: no es para pieza final.

**`expand` vs `pnpm foto:expandir`:** son contratos distintos. `expand` deja la escena en delta 0 y sólo rellena el
área nueva (Flux Fill). `foto:expandir` (Sunburst, `--reponer no`) **redibuja** la escena entera y es el flujo aprobado
de las horizontales 1,91:1 de CMP-004 (`efeonce-advertising-creative` → `paid-format-safe-zones-and-craft.md` §0c).
Unificarlos es decisión de TASK-1925; no cambies uno por otro en una serie ya aprobada.

## 3. Máscaras — `pnpm ai:mask`

- Salida canónica: PNG en grises del tamaño de la base, **blanco = editable**. Cada adaptador la convierte a su
  proveedor (OpenAI: alfa transparente; fal: blanca); tú no conviertes nada.
- Fuentes que se unen: `--rect`, `--polygon` (fracciones), `--from-alpha`, `--from-luma`, `--from-subject` (matting
  local, gratis), `--from-mask`, `--from-layer <layers.json> --layer <sel>` (repetible).
- Operaciones, siempre en este orden: `--invert` → `--erode` → `--dilate` → `--feather`.
- `--inspect mask.png [--base base.png]` es gratis. Rechaza máscaras 0 % o 100 % editables salvo `--allow-empty`/`--allow-full`.
- 🔴 La máscara debe cubrir el objeto **entero con margen**: si lo generado se sale de ella, la recomposición lo funde
  con la base y queda cortado.

## 4. Capas — `pnpm ai:layers`

- Cualquier imagen 512²–6000², no sólo las de Seedream. Devuelve `00-base.png` + `NN-<slug>.png` + `layers.json`
  (índice, `zIndex`, nombre, descripción, caja en píxeles de la base, cobertura de alfa, costo; sin URLs).
- **Las capas son contenido regenerado:** sirven SÓLO de máscara y de clean plate. Lo que no se edita sale siempre de
  la imagen original; `move` y `place` recortan el elemento de la ORIGINAL con el alfa de su capa.
- La base saca **todo**, también las superficies (la mesa es una capa). El clean plate de un elemento es la base + las
  demás capas recompuestas por `z_index`; eso lo hace el comando.
- Selección `--layer`: `#N`, nombre exacto o fragmento; **el nombre gana sobre la descripción** (Layerize describe cada
  capa citando a las demás). Revisa con `--list` antes de elegir.
- El número de capas lo decide el modelo y **varía entre corridas** (misma foto: 3 y 4). Presupuesta por la cota.

## 5. Qué mirar al 100 % antes de aceptar

- **Siempre:** el objeto pedido está y en la zona (PASS sin el objeto es posible); bordes de la zona sin halo ni
  cambio de tono.
- **Borrar:** sin fantasma ni silueta de otro objeto; la sombra proyectada se fue con el objeto; la sombra del vecino
  sigue (el comando nunca toma la sombra de un vecino ni pisa otro objeto, pero míralo).
- **Mover / incorporar:** sombra de contacto y reflejo coherentes con la luz; con `--finish element`, que la forma del
  elemento no haya cambiado.
- **Fondo:** pelo y transparencias contra el fondo nuevo (la costura media viene en el reporte). Con personas reales del
  equipo, reglas de identidad de brand-photography: no injertar caras.
- **Expandir:** uniones invisibles y **elementos inventados** en el área nueva (Flux puso una banca en el 9:16). En
  lienzos grandes Flux genera a menor resolución y escala el área nueva (9:16 1536×2730 → 1088×1904): compara nitidez
  entre escena y extensión.
- **Video:** parpadeo (la métrica viene en el reporte) y que la deriva quedó bajo el umbral.

## 6. Costos medidos [verificado, canarios 2026-10-02/03]

| Operación | Costo observado (USD) |
|---|---|
| Borrar con clean plate | 0 |
| Borrar con Sunburst por instrucción | ≈ 0,010 |
| Mover · incorporar con halo · cambiar fondo | ≈ 0,010 c/u (incorporar sin acabado: 0) |
| Pasada de detalle `--zone-resolution 2048` (Flare) | ≈ 0,022 |
| Expandir con Flux Fill | 1,91:1 ≈ 0,10 · 9:16 ≈ 0,15 (USD 0,05/MP) |
| Layerize | USD 0,03375 por capa hasta 1536² (0,0675 por encima); **la base se cobra como una capa**: 4 capas + base = 0,17 medido con el saldo de fal. Cota de estimación: 16 + base |

fal no devuelve `usage`: confirma con `pnpm ai:fal --balance` antes y después. Ningún costo de esta tabla entra a una
propuesta sin re-medir.

## 7. Reiluminar — estado 2026-10-03

**Canario 2026-10-03 (tarde):** `fal:iclight-v2` (USD 0,10/MP, tarda > 120 s) y `fal:image-apps-relighting` (USD 0,04, `--prompt` = estilo de una lista cerrada) quedaron conectados como adaptadores de `ai:inpaint`; sobre un compuesto, IC-Light **deformó la taza e inventó una ventana** y el de estilos **cambió el color del producto**. Sunburst por instrucción la conservó: es el default para objetos exactos. Lo demás interno que toca la luz: `place --finish element` y
`pnpm foto:isotipo --acabado`. Candidatos estudiados, **todos sin verificar en vivo**:

- **Magnific:** MCP oficial conectado en las sesiones Claude con la cuenta Efeonce; expone `images_relight` y
  `video_relight`, pero sus esquemas no cargaron y **no hay invocación verificada**. La API publicada
  (`/v1/ai/image-relight`) re-renderiza: riesgo en caras pequeñas.
- **Higgsfield:** sin relight dedicado por API. Su MCP lista Cinema Studio 4.0 (`video_edit` con rig de luz), **fuera de
  nuestro catálogo de API** (`higgsfield-provider`).
- Imagen por API (IC-Light v2, relighting de fal, editores por instrucción) y video (ID-V2V Relight, lightx, Beeble
  SwitchX, Runway Aleph 2.0): precios y detalle en la guía canónica; video en `motion-design-studio`.

Recomendación del estudio, cuando se conecte uno: reiluminar y **volver a pegar el objeto exacto** (el híbrido que este
pipeline ya hace). El canon cine no cambia: el plate se regenera, no se relumina.

## 8. Pendientes declarados

- BFL FLUX Tools (outpainting y erase propios, fuera de fal): requiere cuenta BFL del operador. Sin conectar.
- `foto:expandir` delegando en el núcleo → TASK-1925. Video con VACE + SAM2 → task aparte. `--batch` → pendiente.
- `fal:seedance25-edit` en video: sólo contrato, sin canario.
