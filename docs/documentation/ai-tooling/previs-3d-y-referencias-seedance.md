# Previsualización 3D con Seedance — referencias de video, no renders 3D

> **Tipo de documento:** Nota funcional de capacidad investigada
>
> **Estado:** Investigación externa documentada; no es una receta interna validada ni una capacidad runtime de Greenhouse o Creative Studio.
>
> **Validado contra fuentes:** 2026-07-12
>
> **Fuente técnica vigente:** [Efeonce Creative Studio — Agentic Platform Architecture V1](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md). El futuro runtime de Creative Studio permanece fuera de este repositorio.

## La capacidad, en una frase

Seedance 2.0 puede recibir **video, imágenes, audio y texto como referencias**. Por eso una previs hecha en Blender, Unreal o Cinema 4D puede orientar una generación: se exporta como video y se usa junto a una imagen que define el look final. No se entrega al modelo el archivo `.blend` ni una escena 3D editable.

ByteDance documenta que el modelo puede tomar de los inputs composición, ritmo de movimiento, lenguaje de cámara, efectos y sonido. Su lanzamiento público indica hasta nueve imágenes, tres clips de video y tres audios, además de instrucciones en lenguaje natural. [Seedance 2.0 Official Launch](https://seed.bytedance.com/en/blog/seedance-2-0-official-launch) · [paper del modelo](https://arxiv.org/abs/2604.14148).

```text
Blender / Unreal / C4D
  -> exportar previs o playblast (video)
  -> aportar keyframe / imagen de look final
  -> describir el rol de cada referencia en el prompt
  -> Seedance genera una nueva toma audiovisual
```

## Qué aporta cada input

| Input | Rol que se busca dirigir | No garantiza |
| --- | --- | --- |
| Video de previs / playblast | Blocking, encuadre, escala de plano, trayectoria de cámara, orden y ritmo de la acción | Cámara 3D exacta, tracking, colisiones o contactos frame-perfect |
| Imagen de referencia / keyframe | Personaje, set, materiales, luz, paleta y estilo final | Que cada detalle permanezca idéntico durante toda la toma |
| Prompt | Qué referencia gobierna movimiento, qué referencia gobierna look y qué debe cambiar | Una prioridad matemática o control determinista entre inputs en conflicto |

Un viewport gris sirve precisamente porque entrega estructura espacial y temporal sin imponer las texturas o la iluminación que se quiere reemplazar. Esto es una decisión de dirección de arte; Seedance no posee un modo especial llamado “Blender” o “viewport”.

## El límite técnico que no se debe confundir

Esto es **reference-to-video multimodal**, no un renderer 3D ni una importación de escena:

- La interfaz compatible transmite píxeles de video/imágenes y texto; la documentación pública del modelo enumera texto, imagen, audio y video, no archivos `.blend`, geometría, luces, rigs, UVs o matrices de cámara.
- El resultado es condicionado e interpretado, no una reproducción determinista del previs. Puede conservar bien la puesta en cámara y aun fallar en anatomía, contactos, texto, objetos pequeños o continuidad.
- El máximo de referencias, la duración, la resolución, el costo y la forma de marcar cada asset son propiedades del **endpoint y versión** que exponga el proveedor. La especificación pública inicial del paper registra 4–15 s y 480p/720p para su plataforma abierta; no tratar una etiqueta comercial “4K” como una garantía universal del modelo.

ByteDance también declara margen de mejora en estabilidad de detalle, consistencia multi-sujeto, precisión de texto y edición compleja. El resultado `completed` sigue siendo un candidato técnico que debe pasar revisión creativa. [Evaluación publicada por ByteDance](https://seed.bytedance.com/en/blog/seedance-2-0-official-launch).

## Requisito para usarlo desde una suite o API

Que una suite anuncie “Seedance” no basta. Debe exponer, para el modelo y tier elegidos:

1. carga de **video de referencia**, no sólo una imagen de primer frame;
2. combinación del video con imágenes de referencia;
3. prompt o campos que permitan asignar roles explícitos a esos assets;
4. metadata del modelo, endpoint, duración, costo y output para revisar la corrida.

La capacidad creativa es agnóstica del origen de la previs, pero su acceso depende de que el proveedor reenvíe el contrato multimodal completo. Un adaptador limitado a `image-to-video` no habilita esta técnica aunque lleve la marca Seedance.

## Patrón de prueba controlada

Antes de gastar más de un take, declarar:

1. Qué parte del video de previs es una restricción: cámara, blocking, timing o acción.
2. Qué parte de la imagen fija define el look final.
3. Qué elementos pueden reinterpretarse y cuáles no: `ancla visual flexible`, `copy/UI exacto`, `practical diegético` o `actuación física hero`.
4. Un único prompt que indique “video para movimiento/cámara; imagen para identidad visual”.
5. Una rúbrica que revise a velocidad real, 0,5× y por frames: composición, movimiento, actuación, contactos, texto, audio y continuidad.

Ejemplo de intención de prompt, adaptado a la sintaxis del proveedor:

```text
Use Video 1 for subject blocking, action timing and camera movement only.
Use Image 1 for the final visual identity, lighting, materials and atmosphere.
Preserve one continuous shot; do not retain the gray viewport appearance.
```

Si el plano requiere un logo o copy exacto, un practical que debe pertenecer al mundo, o una acción física inequívoca, el take completo debe probarlo. No se debe “arreglar” una actuación inexistente con retime, ni introducir un practical diegético como overlay posterior.

## Estado interno y relación con Glitch

Esta capacidad **no revierte** la decisión del piloto Glitch. El blocking 3D de ese proyecto fue rechazado por el operador como reconstrucción visual insuficiente y quedó prohibido como referencia generativa; la ruta fundada si se reabre sigue siendo captura práctica integral. La nota sólo deja trazable una posibilidad del modelo para futuros fixtures que tengan autorización, una previs de calidad suficiente y un contrato de fidelidad que tolere reinterpretación.

La selección de motor sigue gobernada por el contrato de fidelidad, no por canal ni por novedad del proveedor: [Selección de motor por contrato de fidelidad](../../../.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md).
