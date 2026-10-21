# Escuchar y mirar media con Gemini (`pnpm ai:listen`)

> **Tipo de documento:** Manual de uso
> **Versión:** 1.1
> **Creado:** 2026-10-21 por Claude (sesión de la serie de partners)
> **Última actualización:** 2026-10-21 por Claude (caso de QA de la pieza AWS)
> **Código:** `scripts/ai/listen.ts` · `src/lib/ai/gemini-media-analysis.ts` · `src/lib/ai/gemini-media-analysis-cli.ts`

## Para qué sirve

Le pasa a Gemini archivos de audio, video o imagen junto a un prompt y devuelve su respuesta en texto.
Sirve para el QA de una pieza que uno no puede escuchar ni mirar en tiempo real. Por ejemplo:

- criticar una mezcla de sonido contra su video y su hoja de cues;
- elegir entre tomas de SFX;
- puntuar el impacto visual de un montaje.

Es una herramienta local de oficio: no cambia ningún default de producto.

## Antes de empezar

- Hace falta ADC de gcloud vigente. Si falla la autenticación, corre `pnpm gcloud:auth:playwright -- --force`.
- `.env.local` debe tener `GCP_PROJECT`.
- Los archivos van inline y suman como máximo ~19 MB por llamada. Un video de 8 s en 1080p entra con holgura.

## Paso a paso

```bash
pnpm ai:listen --file mezcla.wav --file video.mp4 --prompt-file critica.txt --out critica.md
```

- `--file` se repite; Gemini recibe los archivos en el orden dado. Conviene numerarlos en el prompt.
- `--model` cambia el modelo. El default es `gemini-3.8-flash`, y también se puede fijar con la variable `GREENHOUSE_GEMINI_MEDIA_MODEL`.
- `--json` devuelve modelo, uso de tokens y texto.

## Qué significan las señales

| Señal | Qué es | Qué hacer |
|---|---|---|
| `429 RESOURCE_EXHAUSTED` | Se agotó la cuota del modelo en Vertex | Cambia de modelo con `--model gemini-3.1-pro-preview` o `gemini-3.5-flash`; cada modelo tiene su propia cuota |
| `404` | El modelo no existe en el proyecto | Verificado el 2026-10-20 en `global`: 3.8 Flash, 3.5 Flash, 3.1 Pro preview y 2.5 Pro responden; 3.8 Pro no |

## Qué no hacer

- **No tomes la crítica como medición.** Los modelos se equivocan en los tiempos y a veces afirman cosas falsas. Caso del 2026-10-21: tres pasadas dijeron que el sting estaba «enterrado» y la medición de pistas separadas mostró que era el elemento dominante en ese tramo. Contrasta cada afirmación verificable con ffmpeg antes de actuar.
- **Separa el criterio de la cifra.** Caso de la pieza AWS (2026-10-21): la crítica pidió «profundizar el silencio» antes del primer golpe, pero ese tramo medía −inf (silencio absoluto), así que se descartó. En cambio, su observación de que el cierre se sentía estático era real: el plano se alejaba y el cierre empujaba hacia adentro, y se corrigió continuando la dirección del movimiento. Lo que es juicio puede servir; lo que se puede medir se mide.
- **No mezcles evaluadores al comparar versiones.** Un 9/10 de 3.5 Flash y un 7,5/10 de 3.1 Pro sobre el mismo corte no se comparan entre sí. Para medir si una versión mejoró, usa el mismo modelo y el mismo prompt.
- **No uses zsh con `$var:` en URLs o rutas.** zsh lo lee como modificador; escribe `${var}`.

## Problemas comunes

- `Missing GCP_PROJECT`: el script no encontró `.env.local`. Córrelo desde la raíz del repo.
- La respuesta llega vacía: reintenta con otro modelo.
