# Selección de motor por contrato de fidelidad — no por canal

> **Estado:** evidencia operativa limitada — 2026-07-11. No declara un ganador universal ni sustituye el gate de revisión humana.
>
> **Evidencia empírica:** [`Social Wall`](../../../../ai-generations/2026-07-08_social-wall-assets/README.md) (paquete de key visuals con `gpt-image-2` → Gemini Omni image-to-video, publicado) y [`Glitch`](../../../../ai-generations/2026-07-11_glitch-microphone-intro/review/take-s-seedance-source-keyvisual-review.md) (Seedance retuvo el set, pero el take aún se rechazó por actuación/foley).

## La regla

**No elegir el motor por “es para RRSS”, “es una landing” o su precio por clip.** Elegirlo por el contrato de fidelidad de la toma:

| Contrato de la toma | Primera mano | Por qué |
| --- | --- | --- |
| Un paquete de stills ficticios define tono/campaña, pero cada microescena puede interpretarse; no hay texto ni objeto diegético que deba ser exacto | **Gemini Omni image-to-video** | Convierte cada key visual en un beat vivo y breve; funciona especialmente bien para UGC, Reel, Historia y Creador si se describe la acción humana concreta. |
| Un key visual existente es la verdad del set: composición, micrófono/producto, practical, color y profundidad deben seguir reconocibles | **Seedance image/reference-to-video** | Empieza desde la referencia íntegra y favorece el contrato de conservar mundo/objeto. Sigue siendo candidato técnico y debe pasar actuación, texto y sonido. |
| La toma necesita cámara, blocking o timing espacial preplaneados; el look puede reinterpretarse | **Seedance reference-to-video** con playblast/viewport **exportado** + keyframe de look | El modelo puede tomar video e imagen como referencias; requiere un endpoint que exponga ambos y una prueba aislada. Capacidad investigada, no receta validada. |
| Falta una acción/objeto que no existe y se necesita explorar o editar hablando sobre una escena que tolera reinterpretación | **Gemini Omni edit/generation** | Su valor diferencial es el loop conversacional, no una promesa de fidelidad frame-perfect. |
| Sólo cambia orden, pausa, trim, freeze, grade o copy no diegético exacto | **Post determinista / mograph** | No gastar generación ni fingir física que no existe en los frames. |

La plataforma o canal es un dato de formato; la **fidelidad permitida**, la presencia de un practical y la semántica física de la acción son la decisión de motor.

## Previs 3D → Seedance: capacidad investigada, no evidencia interna

Seedance recibe referencias de texto, imagen, audio y video; una previs se aporta como media exportada, no como `.blend` ni escena editable. El video puede orientar cámara, composición, blocking y ritmo, mientras una imagen alineada define el look final. Esto sigue siendo condicionamiento interpretativo: no garantiza cámara 3D, geometría, contactos, texto ni continuidad frame-perfect.

Antes de probar, confirmar que el endpoint expone **video de referencia + imagen de referencia** y registrar modelo/tier, prompt, costo, metadata y rúbrica temporal. La fuente funcional, las referencias oficiales y el límite específico de Glitch viven en `docs/documentation/ai-tooling/previs-3d-y-referencias-seedance.md`. El blocking 3D Glitch fue rechazado por el operador: no reutilizarlo ni elevar esta capacidad a workflow validado sin un fixture nuevo autorizado.

## Caso validado: Redes Sociales

1. Se generó un **set de ocho key visuals ficticios**: seis verticales con `portrait-batch.json` y dos horizontales con `landscape-batch.json`, mediante `gpt-image-2`.
2. Se validó que los stills ya resolvían una campaña coherente: mural/macaws, paleta azul-verde, estética social, sin copy ni logos que debieran conservarse literalmente.
3. Se eligieron seis slots cuyo formato promete movimiento (`Reel`, `Historia`, `UGC`, `Creador`) y se derivó una referencia 720×1280 por slot.
4. Gemini Omni animó esas referencias en masters de 10 s con acciones específicas —risa/parpadeo, ajuste de cámara, reflejo en teléfono, paso/gesto—; cada master recibió `57.920` tokens de video.
5. Se eligieron beats de 4 s, se transcodificaron a WebM/MP4/poster sin audio y se verificaron en la landing real con autoplay, hover-pause, reduced-motion y mobile.

Aquí Omni fue correcto porque el still era un **ancla de lenguaje visual**, no una promesa de conservar cada píxel ni una escena con texto/practical crítico. La escena podía cobrar vida dentro de la misma familia creativa.

## Caso en curso: Glitch

El PNG 4K ya contiene el micrófono, la cabina y el `ON AIR` como objeto físico del set. El take S de Seedance fue el primer resultado que conservó satisfactoriamente esa dirección de arte; se rechazó de todos modos porque la yema sostuvo el contacto y el audio no acreditó dos golpes aislados. Esto demuestra dos cosas a la vez:

1. Seedance es la primera mano razonable cuando el set debe mantenerse reconocible.
2. Preservar el set no aprueba una actuación: `tap → rebote → aire → tap → rebote` y dos foleys reales siguen siendo gates independientes.

El reintento T está documentado pero bloqueado por saldo Fal. No promocionar Seedance a receta “validada” hasta que pase esos gates.

## Preflight antes de gastar

1. Escribir qué puede reinterpretar el modelo y qué no puede cambiar.
2. Clasificar cada elemento como `ancla visual flexible`, `copy/UI exacto`, `practical diegético` o `actuación física hero`.
3. Si hay copy/UI exacto, resolverlo con asset/mograph; si hay practical/actuación hero, exigir una toma íntegra y prohibir overlay/retime de reparación.
4. Estimar una sola prueba por motor; revisar el primer output completo antes de abrir otro take.
5. Registrar fuente, prompt, modelo, costo estimado/confirmado, contact sheet, audio y veredicto creativo.

## Qué no inferir

- No inferir que **Omni sirve sólo para RRSS**: en RRSS funcionó porque el paquete de imágenes y la tolerancia de interpretación le daban el problema adecuado.
- No inferir que **Seedance siempre conserva física humana**: S preservó el set de Glitch, no el doble golpe pedido.
- No inferir que un MP4 terminado, un precio bajo o una referencia aceptada equivalen a master aprobado.
- No reparar en post un practical que pertenece al mundo ni una acción corporal cuyo significado no existe en la fuente.

## Referencias

- `living-social-wall-clips.md` — receta y publicación de RRSS con Omni.
- `omni-in-place-edit-and-deterministic-finish.md` — límite de la edición Omni y del post determinista.
- `https://fal.ai/models/bytedance/seedance-2.0/reference-to-video` — capacidades/precio variables de Seedance; reverificar antes de gastar.
