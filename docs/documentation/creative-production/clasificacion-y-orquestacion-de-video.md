# Clasificación y orquestación de la producción de video con IA

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-03 por Claude
> **Ultima actualizacion:** 2026-10-03 por Claude
> **Documentacion tecnica:** [taxonomía de video](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) ·
> [anexo de producto e interfaces](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md) ·
> [ADR-025, pipelines](../../architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md) ·
> [guía de selección de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) §4.3 y §7.4
> **Vista navegable (privada del operador):** https://claude.ai/artifact/SALEjhTyiehiRyXRvoFQzY

## Para qué existe

Efeonce produce video con muchos modelos de IA (Seedance, Flux 3, Wan, MiniMax H3, Gemini Omni, Kling, Veo y otros) y
con herramientas propias. Antes de gastar en generar, cada pieza se **clasifica**: qué es, qué tiene que quedar exacto,
qué tan difícil es cada toma y qué parte hacemos nosotros. Esa clasificación decide el camino, el modelo y el
presupuesto. Después, la pieza se **orquesta** como un plan con aprobaciones, para que el resultado sea consistente y
el gasto, controlado.

Es el complemento del [método de producción de video](video-production.md): el método dice cómo se trabaja de
principio a fin; esto dice cómo se decide y cómo se encadenan los pasos.

## Cómo se clasifica una pieza

| Pregunta | Ejemplos de respuesta |
|---|---|
| ¿Para qué sirve? (tipo de pieza) | ad pagado, reel, hero del sitio, demo de producto, explainer, cutdown |
| ¿Qué es la imagen? (tipo de video) | hiperrealista, cine de marca, producto, UGC, personaje 3D, animación 2D, motion graphics, demo de interfaz, atmósfera, híbrido |
| ¿Qué look tiene? | documental, cine, publicitario, editorial, hecho a mano, época |
| ¿Qué tiene que quedar exacto? (contrato de fidelidad) | el still aprobado, un logo, un producto, una interfaz, un rostro |
| ¿Qué operaciones necesita, por fase? | preproducción (stills, cast, animatic), producción (generar, extender), posproducción (editar, componer texto, mezclar, exportar) |
| ¿Qué tan difícil es cada toma? | siete ejes de 0 a 3: rostros y manos, interacción, física, cámara, duración, exactitud e identidad |
| ¿Quién aparece? | equipo de Efeonce, elenco ficticio, Nexa, mascotas de partners, producto, personas del cliente |

> Detalle técnico: [taxonomía §2 y §3](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md).

## Reglas que mandan

- **Lo que debe quedar exacto no se genera.** El texto, el logo y la interfaz se componen después, con nuestras
  herramientas.
- **Nuestras herramientas primero; las del proveedor, mientras no tengamos las nuestras.** Cada operación sin
  herramienta propia tiene un «puente» de proveedor y una tarea que lo reemplaza.
- **Una pantalla dentro de una escena la dibuja el modelo** (con pocas frases grandes); la interfaz legible se muestra
  en un plano propio. Si se pega encima, se ve falsa.
- **Primero se baja la dificultad, después se sube el modelo.** Partir una toma o componer lo exacto rinde más que
  pagar el modelo más caro.
- **Un video entregado por el modelo no está aprobado** hasta que una persona lo revisa completo.

## Personas usando producto digital

Es el tipo de pieza más frecuente. Se planifica con una gramática de diez planos (reacción, contexto, por encima del
hombro, punto de vista, macro del gesto, inserto de interfaz, interfaz flotante, dentro de la interfaz, pantalla
dividida y dispositivo 3D). La persona pone la emoción y la acción; la interfaz se lee en su propio plano. El gesto y
el cambio de la interfaz se sincronizan **cortando en el momento del contacto**.

> Detalle técnico: [anexo de producto e interfaces](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md).

## Cómo se orquesta una pieza

Cada pieza es un **plan**: una lista de pasos por toma, cada uno hecho por una herramienta nuestra, por un proveedor o
por una persona. El plan sólo avanza por **compuertas**:

| Compuerta | Quién decide |
|---|---|
| automática | el detector de la herramienta (pasa, falla o pide revisión) |
| humana | una persona con nombre, por tipo de aprobación (creativa, gasto, derechos, técnica, escucha) |
| de gasto | el operador autoriza un monto; cada paso pagado reserva y liquida con el costo real |

La regla que da la consistencia: **ningún video se genera si el still, la hoja de identidad o la interfaz que usa como
referencia no están aprobados.** Si se cambia algo ya aprobado, sólo se rehace lo que dependía de eso.

> Detalle técnico: [ADR-025](../../architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md).

## Estado actual (2026-10-03)

| Pieza | Estado |
|---|---|
| Clasificación, anexo y arquitectura | aceptados por el operador |
| Runner que ejecuta los planes (`pnpm video:*`) | por construir (TASK-1989) |
| Herramientas por operación (borrar y seguir objetos, acabado, motion de interfaz, banco de canarios, etc.) | por construir (EPIC-051) |
| Operaciones con garantía medida | una: editar una zona de un video con cámara quieta |
| Mientras tanto | la pieza se clasifica y se planifica con esta guía, y se ejecuta con el método y las herramientas existentes |

> Detalle técnico: [EPIC-051](../../epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md).
