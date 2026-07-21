# GLOSSARY — design-studio (vocabulario de diseño 2026)

> Términos que hay que usar bien. es-CL neutro. Los datos con fecha (qué modelo, qué versión)
> son volátiles → ver `SOURCES.md` y reverificar antes de citarlos.

## Concepto y sistema

- **Key Visual (KV)**: la imagen-concepto **maestra** de una campaña de la que derivan todos los
  assets. No es "una imagen linda": es el sistema visual condensado en una pieza.
- **Sistema visual de campaña**: reglas de derivación del KV a cada formato — qué se mantiene fijo
  (concepto, paleta, tipo, elemento recurrente) y qué flexa (crop, layout, copy).
- **Identidad visual**: el sistema estable de una marca (logo, color, tipo, grid, tono).
- **Identidad kinética**: identidad concebida con movimiento (logo/tipo/sistema animados). Tendencia
  2026; implementación → `motion-design`.
- **Lockup**: combinación fija de elementos (logo + tagline, o tipo + gráfico) tratada como unidad.

## Composición y forma

- **Jerarquía visual**: el orden en que el ojo recorre la pieza; se controla con tamaño, peso, color,
  posición y contraste.
- **Punto focal**: el ancla visual; dónde entra el ojo primero.
- **Gestalt**: principios de percepción (proximidad, similitud, cierre, continuidad, figura-fondo).
- **Espacio negativo**: el "vacío" activo de una composición; tan importante como el positivo.
- **Grid / grilla**: sistema de alineación que da orden y ritmo.
- **Regla de tercios / golden ratio**: guías clásicas de posicionamiento del foco.

## Color

- **Armonía**: relación entre colores (complementario, análogo, tríada, split-complementario).
- **Duotono**: imagen mapeada a dos colores; tendencia recurrente.
- **Gradiente**: transición de color; central en la estética 2026.
- **Paleta variable/adaptativa**: sistema de color que flexa por contexto en vez de un esquema rígido.
- **Contraste de texto sobre imagen**: legibilidad (WCAG 1.4.3 / APCA); se resuelve con scrim, caja,
  peso o posición. Nunca texto claro sobre foto clara sin tratamiento.

## Producción IA

- **Prompt de imagen**: instrucción estructurada (sujeto + composición + estilo + luz + paleta +
  material + ratio + negativos).
- **Seed**: semilla que fija/varía una generación; misma seed = resultado reproducible.
- **Inpaint / outpaint**: editar una zona interna / extender el lienzo.
- **Upscale**: subir resolución/detalle (ej. Magnific). **Reference / @ reference**: guiar la
  generación con referencias (Seedance 2.0 admite hasta 9 imágenes, 3 videos y 3 audios; máximo 12 archivos).
- **Región edit**: re-dibujar parte de un frame sin tocar el resto.
- **AI disclosure**: revelar cuando una imagen IA podría confundirse con foto real, si el contexto lo
  exige. "Ante la duda, revela."

## Modelos (ver matriz completa en `SOURCES.md`)

- **Nano Banana Pro**: modelo imagen de Google (Gemini 3 Pro Image); mejor texto-en-imagen + 4K;
  en Vertex (`efeonce-group`).
- **GPT Image 2**: modelo imagen de OpenAI; realista/uso diario; el repo ya lo usa.
- **Midjourney**: estética/dirección de arte; mood boards.
- **Recraft**: **vectores editables reales** (logos/iconos/packaging).
- **Ideogram**: texto-en-imagen (posters/thumbnails).
- **FLUX.2**: realismo + params de cámara.
- **Seedance 2.0**: video ByteDance con control por referencias. **2.5** permanece bloqueado/no verificado en Fal.
- **Veo 3.1**: video broadcast/cine (Google). **Kling 3.0**: video económico. **Gemini Omni**:
  video multimodal con edición conversacional. **Sora 2**: deprecado (no usar).

## Entrega

- **Sangrado / bleed**: margen extra para corte en print. **DPI**: densidad para print (300 típico).
- **CMYK vs RGB**: print vs pantalla. **Safe zone**: área segura donde no recortan/tapan (UI/print).
- **Retina / 2x**: exportar al doble para pantallas de alta densidad.
- **Mood board**: tablero de referencias que fija el look & feel antes de producir.
