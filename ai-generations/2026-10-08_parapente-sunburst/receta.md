# Parapente — edición fotográfica Sunburst

Fecha: 2026-10-08. Exploración solicitada por el operador sobre su imagen adjunta.

- Motor: `gpt-image-2.5-sunburst`, CLI local `pnpm ai:image`, operación edit con una referencia.
- Referencia: `refs/original.png`, copia íntegra del adjunto (2934 × 1600).
- Composición: POV parapente; conservar encuadre, horizonte, costa, faro, ciudad, piernas y equipo.
- Tratamiento: fotografía natural; corrección material y coherencia física, detalle óptico y perspectiva atmosférica.
- Cámara como intención: 24 mm rectilíneo, f/8, 1/1600 s, ISO bajo. No metadata de una captura real.
- Salida solicitada: PNG opaco, 3840 × 2096, calidad `max`, count 1. Tamaño experimental según documentación oficial consultada en esta corrida.
- Prompt efectivo: `prompt.txt`.
- Estado: generación completada y revisión visual general más cuatro recortes al 100% realizada. Input suministrado por el usuario; derechos para publicación no verificados. Uso de exploración; sin publicación.
- Revisión: dimensiones reales, continuidad de composición, faro/edificios, mar/espuma, autos y equipo al 100%.

Comando:

```sh
pnpm ai:image --model gpt-image-2.5-sunburst --image ai-generations/2026-10-08_parapente-sunburst/refs/original.png --prompt-file ai-generations/2026-10-08_parapente-sunburst/prompt.txt --size 3840x2096 --quality max --format png --background opaque --count 1 --timeout 600000 --out ai-generations/2026-10-08_parapente-sunburst/parapente-sunburst-max.png
```

Fuente técnica: https://developers.openai.com/api/docs/guides/image-generation

## Resultado verificado

- PNG sRGB real de 3840 × 2096, 13.966.100 bytes; sin upscale ni postproceso del master.
- Respuesta CLI: `gpt-image-2.5-sunburst`, `max`; no fallback informado.
- Usage: 2.193 entrada (1.456 imagen + 737 texto), 12.541 salida; total 14.734.
- Estimación previa de salida: USD 0,376; excluye entrada. No se infiere cargo de factura.
- Encuadre, dos piernas, equipo, costa y faro conservados visualmente; ratio aproximado al original por grilla de múltiplos de 16.
- Mejor variación del oleaje y menor saturación de vegetación. Detalles de autos y ventanas aún pueden mostrar simplificación sintética; no se certifica exactitud documental de la ciudad.
- `qa-detalles-100.png` muestra cuatro recortes a escala 1:1 (mar, autopista/acantilado, faro/edificios, zapatilla/arnés).
- `manifest.json` conserva dimensiones, hashes de referencia/prompt/master, usage y estado `proof-only`.
