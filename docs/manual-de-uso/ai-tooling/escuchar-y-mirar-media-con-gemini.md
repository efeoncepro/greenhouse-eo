# Escuchar y mirar media con Gemini (`pnpm ai:listen`)

> **Tipo de documento:** Manual de uso
> **Versión:** 2.1
> **Creado:** 2026-10-21 por Claude (sesión de la serie de partners)
> **Última actualización:** 2026-10-21 por Claude (v2.1: `--measure-only`, control de la pieza sin Gemini)
> **Código:** `scripts/ai/listen.ts` · `src/lib/ai/gemini-media-analysis.ts` · `src/lib/ai/gemini-media-analysis-cli.ts` · `src/lib/ai/gemini-media-verify.ts` · `src/lib/ai/gemini-media-presets.ts`
> **Documentación técnica:** [Guía de selección de modelos §5.10](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
> **Documentación funcional:** [Revisión de piezas con Gemini](../../documentation/ai-tooling/revision-de-piezas-con-gemini.md)

## Para qué sirve

Le pasa a Gemini archivos de audio, video o imagen junto a una pregunta, y devuelve su crítica. Sirve para el QA de una
pieza que uno no puede escuchar ni mirar en tiempo real:

- revisar si los golpes de sonido caen con los cortes de imagen;
- detectar tirones o cuadros congelados;
- revisar la legibilidad de un lockup;
- puntuar el impacto.

Desde la v2 hace algo más importante: con `--verify` **mide con ffmpeg cada afirmación comprobable** y la marca como
confirmada o refutada. La crítica de un modelo es criterio, no medición, y ahora la herramienta lo aplica sola.

Es una herramienta local de oficio: no cambia ningún default de producto.

## Antes de empezar

- Hace falta ADC de gcloud vigente. Si la autenticación falla, corre `pnpm gcloud:auth:playwright -- --force`.
- `.env.local` debe tener `GCP_PROJECT`.
- `--verify` usa `ffmpeg` local.
- Los archivos van inline hasta ~19 MB en total. Para archivos más grandes usa `--gcs` (ver abajo).

## El orden recomendado

1. **Primero, solo medición** (`--measure-only`): es instantánea (menos de 1 s), gratis y no se equivoca. Entrega el mapa
   de eventos y verifica la grilla. **Es el control estándar antes de mostrar una pieza**: si sale con código 2, alguna
   cue falló.
2. **Después, Gemini como segunda opinión de criterio**, siempre con `--verify`. Sus juicios («se siente plano», «no se
   lee») se consideran; sus números se descartan si la medición no los respalda.

Por qué este orden: en la serie de partners de octubre de 2026, la mayoría de las afirmaciones medibles de Gemini fueron
falsas, mientras la medición de la grilla acertó al milisegundo. El valor de Gemini está en la percepción, no en los
números.

## Recetas

**Control estándar de una pieza (sin Gemini):**

```bash
pnpm ai:listen --file mezcla.wav --file pieza.mp4 --cues audio-cues.json --measure-only --out medicion.json
```

Entrega:
- los ataques de sonido, los silencios, los cortes, los eventos visuales y los cuadros quietos;
- la sincronía general (desfase mediano y peor desfase entre cada ataque y su evento visual);
- el veredicto de cada cue.

Sale con código 2 si alguna cue no se confirma. Pieza AWS: 4 de 4 cues confirmadas, en sincronía (+8 ms), medida en
384 ms.


**Sincronía de una pieza con su hoja de cues (la receta más completa):**

```bash
pnpm ai:listen --file mezcla.wav --file pieza.mp4 --preset sync --cues audio-cues.json --verify --out qa.json
```

**¿El golpe cae con el corte? Mirar un tramo cuadro a cuadro:**

```bash
pnpm ai:listen --file pieza.mp4 --clip 1.5-2.5 --fps 24 --thinking high --prompt "¿El golpe cae en el mismo cuadro que el corte?"
```

**Tirones o congelados en toda la pieza:**

```bash
pnpm ai:listen --file pieza.mp4 --preset tiron --verify
```

**Cierre y legibilidad del lockup:**

```bash
pnpm ai:listen --file pieza.mp4 --preset cierre --verify
```

**Video largo (webinar, podcast): que Gemini decida qué mirar:**

```bash
pnpm ai:listen --file webinar.mp4 --agentic --prompt "Resume y marca los momentos de mayor energía"
```

**Comparar versiones A/B en una sola consulta** (hasta 10 videos):

```bash
pnpm ai:listen --file v1.mp4 --file v2.mp4 --preset impacto --findings
```

## Opciones

| Opción | Qué hace |
|---|---|
| `--file <ruta\|gs://>` | Archivo a revisar; se repite y Gemini los recibe en orden. Máximo 1 audio y 10 videos por consulta |
| `--prompt` / `--prompt-file` | La pregunta. Con `--preset`, se suma como contexto del autor |
| `--preset` | Rúbrica versionada: `sync`, `impacto`, `cierre`, `tiron`, `lockup` (ver abajo) |
| `--thinking low\|medium\|high` | Cuánto razona. `high` para análisis cuadro a cuadro (~2-3 min); default `medium` |
| `--fps <n>` | Cuadros por segundo que mira (default 1, máximo 24) |
| `--clip <ini>-<fin>` | Tramo en segundos. Los tiempos de la respuesta siguen siendo del archivo completo |
| `--resolution low\|medium\|high\|ultra` | Detalle por cuadro. El video viene en `low`; `high` triplica tokens; `ultra` solo vale para imágenes |
| `--agentic` | Gemini navega el video y decide qué mirar. No admite `--fps` ni `--clip` |
| `--findings` | Respuesta en JSON: resumen, puntajes y hallazgos con tiempo, tipo, severidad y si es medible |
| `--verify` | Mide con ffmpeg cada hallazgo medible (activa `--findings`) |
| `--cues <json>` | Hoja de cues: veredicto de Gemini por cue y, con `--verify`, medición independiente de cada cue |
| `--gcs gs://bucket/prefijo/` | Sube los archivos locales y los pasa por URI; los borra al terminar salvo `--keep-gcs` |
| `--measure-only` | Mide la pieza con ffmpeg sin llamar a Gemini: mapa de eventos y, con `--cues`, la grilla. Ignora `--prompt`, `--preset`, `--fps` y los demás flags de Gemini (y avisa) |
| `--count-tokens` | Solo cuenta tokens de entrada, sin generar |
| `--json` / `--out` | Salida JSON completa (con `meta` para comparar corridas) o guardada en archivo |

El modelo por defecto es `gemini-3.8-flash` (se cambia con `--model` o `GREENHOUSE_GEMINI_MEDIA_MODEL`).

## Rúbricas (`--preset`)

Cada rúbrica tiene versión. Dos notas solo se comparan si salieron del mismo `preset@versión`, el mismo modelo y el
mismo nivel de razonamiento: la salida JSON los guarda en `meta`, junto al hash del prompt y de cada archivo.

| Preset | Revisa | Defaults |
|---|---|---|
| `sync` | Golpes, cortes, silencios, música en tiempo | thinking high · 12 fps |
| `impacto` | Enganche, momento más fuerte, tramos planos | thinking medium · 4 fps |
| `cierre` | Lockup legible, sting con la marca, final abrupto o estático | thinking medium · 6 fps · resolución high |
| `tiron` | Congelados, saltos de velocidad, zoom a saltos, rebotes | thinking high · 24 fps |
| `lockup` | Transcripción exacta del texto, logos, bordes, contraste | thinking medium · 2 fps · resolución high |

Un flag explícito siempre gana sobre el default del preset.

## Qué mide `--verify`

| Tipo de hallazgo | Cómo se mide | Cuándo es «confirmado» |
|---|---|---|
| `silencio` | RMS en ventanas de 10 ms del tramo | RMS máximo ≤ −50 dB |
| `golpe` | Ataques: subida de pico ≥ 10 dB o salto de RMS ≥ 12 dB | Hay un ataque a ±84 ms (2 cuadros) |
| `corte` | Picos de diferencia entre cuadros consecutivos | Hay un corte a ±63 ms |
| `cuadro_quieto` | Diferencia entre cuadros (`tblend` + `signalstats`) | 2 o más cuadros seguidos bajo 0,15 |
| `desfase` | Cada ataque del tramo contra su evento visual más cercano | Desfase mediano > 42 ms (un cuadro) |
| `nivel`, `legibilidad`, `ritmo`, `juicio` | No se miden | Quedan como `no_medible` |

Las cues se miden por su texto, sin importar lo que diga Gemini:
- un cue que dice «silencio» se mide como silencio (y si declara el tramo, por ejemplo «silencio 1,75-2,0», se usa ese);
- un cue puntual con «golpe», «impacto» o «drop» se mide como golpe;
- un cue con «pico» o «sting» se mide como pico.

Si hay audio aparte, `--verify` mide el audio sobre ese archivo; si no, sobre el audio del video. Con varios videos, mide
el primero.

## Qué significan las señales

| Señal | Qué es | Qué hacer |
|---|---|---|
| `↻ error transitorio (429/503)` | Cuota agotada o servicio no disponible | La CLI reintenta a los 20 y 40 s. Si persiste, cambia de modelo: cada uno tiene su propia cuota |
| `⚠ … ~N cuadros` | La consulta mira más de 600 cuadros | Acota con `--clip` o baja `--fps` |
| `⚠ … 1 kbps mono` | Pediste criticar el sonido solo con el audio del video | Pasa también el WAV con `--file` |
| Código de salida 2 en `--measure-only` | Alguna cue de la grilla no se confirmó | Revisa la tabla «Cues medidos» antes de mostrar la pieza |
| `⚠ --temperature se ignora` | Gemini 3.x no usa temperatura | Usa `--thinking` y `--findings` |
| `404` | El modelo no existe en el proyecto | Verificado el 2026-10-20 en `global`: 3.8 Flash, 3.5 Flash, 3.1 Pro preview y 2.5 Pro responden; 3.8 Pro no |

## Costos medidos (pieza AWS, 8 s, 1080×1350, 2026-10-21)

| Configuración | Tokens de entrada |
|---|---|
| Default (1 fps, resolución baja) | 867 |
| `--resolution high` | 2.547 |
| `--fps 24` | 15.467 |
| `--fps 24 --clip 1.5-2.5` | 1.998 |
| WAV de 8 s aparte | 176 |

- **Razonamiento alto:** suma tokens propios. En `sync` fueron 8.255 de razonamiento y la consulta tardó 166 s.
- **Modo agéntico:** `--count-tokens` no refleja su ahorro. En la generación real usó 246 tokens contra 719 en modo
  estático.

## Qué no hacer

- **No tomes la crítica como medición.** Usa `--verify`. Caso real del 2026-10-21 sobre la pieza AWS: Gemini afirmó con
  severidad alta que la Tierra quedaba congelada de 5,33 a 8,00 s, y la medición lo refutó (cero cuadros quietos;
  diferencia mínima 0,86). También describió un desfase de los íconos que la medición refutó: el ícono aparece un cuadro
  después de la grilla y el clic suena con él (+8 ms). Corregir la mezcla por esa crítica habría sido un error.
- **Separa el criterio de la cifra.** En la misma pieza, Gemini dijo antes que el cierre se sentía estático, y era real
  (el plano cambiaba de dirección); se corrigió. Lo que es juicio puede servir; lo medible se mide.
- **No compares notas entre modelos, presets o niveles de razonamiento distintos.** Revisa el `meta` de cada JSON.
- **No subas a 24 fps una pieza completa larga sin necesidad**: usa `--clip` sobre el tramo que importa.
- **No uses zsh con `$var:` en rutas o URLs.** zsh lo lee como modificador; escribe `${var}`.

## Problemas comunes

- `Missing GCP_PROJECT`: el script no encontró `.env.local`. Córrelo desde la raíz del repo.
- `--verify` sin efecto: necesita archivos locales; con solo `gs://` no puede medir.
- La respuesta llega vacía: reintenta con otro modelo.
- El prefijo de staging recomendado es `gs://efeonce-group-greenhouse-private-assets-dev/ai-listen/` (privado y de dev).
  La CLI borra lo que sube.
