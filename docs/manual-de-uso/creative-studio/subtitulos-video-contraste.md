# Subtítulos de video — control de contraste sobre los cuadros

> **Tipo de documento:** Manual de uso
> **Versión:** 1.0
> **Creado:** 2026-10-17 por Claude
> **Documentación técnica:** [Composición por superficie §4.5, delta 2026-10-17](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#delta-2026-10-17--subtítulos-de-video-vidrio-denso-con-anillo-de-pregunta-operador) · AXIS `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md`, delta (y)

## Para qué sirve

Comprueba que cada subtítulo quemado se lea sobre el video real. Para cada subtítulo del archivo de tiempos, el
comando toma tres cuadros del corte: entrada, mitad y salida. Sobre cada cuadro compone el bloque de vidrio
denso y mide el contraste entre el texto y lo que queda detrás de las letras. Falla si alguna muestra queda bajo
el mínimo del token (4,5:1 en el peor 5 % del fondo).

## Antes de empezar

- El **corte del video** en MP4 o MOV, en su formato final: 16:9, 4:5 o 9:16.
- El **archivo de tiempos** del diálogo, por ejemplo `para-cuando.tiempos.json`. Es la misma fuente de la que salen
  los subtítulos quemados y el SRT.
- El **manifiesto de AXIS** del subtítulo, que trae el vidrio, el anillo, la colocación por formato y el mínimo.
  - Por defecto se lee `../axis-design-system/docs/examples/surfaces/audiovisual-subtitles-manifest.json`.
  - Se regenera con `pnpm surface:resolve` en el checkout de AXIS.
  - El comando no fija valores propios.
- `ffmpeg`, `ffprobe` y Playwright instalados.

## Paso a paso

```bash
pnpm brand:subtitles:check -- --video corte.mp4 --tiempos para-cuando.tiempos.json --side "Paula=l,Antonio=r" --out informe.json
```

- `--side` asigna a cada personaje su lado. La esquina recta del vidrio apunta a quien habla; si no se indica,
  el lado es la izquierda.
- `--format` fuerza el formato cuando el video no tiene una proporción exacta.
- `--keep <carpeta>` conserva los cuadros extraídos, para mirarlos.

## Qué significan los resultados

| Resultado | Significa | Qué hacer |
|---|---|---|
| `✓ N muestras sobre 4.5:1` (exit 0) | todos los subtítulos se leen en los tres momentos | nada |
| `✖ N muestra(s) bajo 4.5:1` (exit 1) | algún cuadro deja el texto con poco contraste | mover el subtítulo a una zona más oscura del plano, dentro del tercio inferior; la caja sólida queda sólo como excepción aprobada |
| exit 2 | faltan datos o el manifiesto no trae el estándar de video | revisar los argumentos o regenerar el manifiesto con AXIS al día |

Las preguntas (las líneas con «?») se miden con el anillo, porque ocupa espacio dentro del bloque.

## Qué no hacer

- No bajar el mínimo ni la opacidad del vidrio para que «pase»: los valores son del token de AXIS.
- No medir sobre la foto fija del storyboard en lugar del corte: el control vale sobre los cuadros del video.
- No usar la tinta navy sin caja sobre imagen filmada: es sólo para piezas sobre papel o interfaz.

## Problemas comunes

- **«no encuentro el manifiesto de AXIS»:** el checkout de AXIS no está al lado de Greenhouse. Pasa `--manifest`
  con la ruta.
- **«el manifiesto no trae el estándar de video»:** el manifiesto es anterior al delta (y) del 2026-10-17.
  Regenera con AXIS al día.
- **Todas las muestras dan el mismo número:** el corte es una secuencia de fotos fijas, como en la prueba del
  animatic. Con video real, los tres momentos difieren.

## Referencias

- Script: [`scripts/creative/subtitles/check-contrast.mjs`](../../../scripts/creative/subtitles/check-contrast.mjs).
- Evidencia de la decisión: `ai-generations/2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/subtitulos/evidencia/`.
