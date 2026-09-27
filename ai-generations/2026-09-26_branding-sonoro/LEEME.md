# Branding sonoro Efeonce — ronda 1 (2026-09-26)

Estado: **ronda 3, prototipos sin aprobar**. Sala de escucha: https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9

## Decisiones del operador (2026-09-26)

- Todo se produce en casa, sin músico ni compositor humano: motor propio + ElevenLabs + Higgsfield.
- Puntos de contacto, en orden: video y redes → podcast Glitch → eventos.
- Los cierres largos llevan etiqueta con voz: «Empower your <Línea>».

## Elecciones de la ronda 1 (operador, 2026-09-26)

- Territorio **Puntos suspensivos** (Mi Mi Mi → La) · voz **Brian** (ElevenLabs v3) · el **acento por línea se queda**.
- El timbre de **Voice** (coro) no gustó: ronda 2 propone `eco`, `cuerda` (Karplus-Strong) y `pulso` (trémolo 6 Hz).
- Pidió escucharlo en el **reveal**: `--mode reveal` calza con `pieces.reveal` V1.1 (tres notas en 1,42/1,54/1,66 s,
  esfera con el golpe a 1,87 s, acorde a 2,75 s). Versión con Brian: `--bloom 3.08` y la voz desplazada 2,09 s para
  que «Growth» y el acorde caigan cuando termina de entrar el eslogan.

## Elecciones de la ronda 2 (operador, 2026-09-26)

- **Voice = `eco`** (cuerda y pulso descartados). Es el default de `--line voice` en el motor.
- **Reveal: se quedan las dos versiones**, con voz y sin voz, según el contexto.
- Ronda 3: **apertura** (`--mode open`: tres notas mientras se recogen las letras, esfera con el lanzamiento a 1,15 s,
  termina en el anillo abierto) y **etiquetas de las cinco líneas con Brian**. Las tomas se igualaron en ritmo: pausa
  «Empower»→«your» a 0,14 s recortando sólo el silencio (Brian la alargaba hasta 0,28 s en Engine, Voice y Revenue;
  subir la estabilidad a 0,8 no bastó). Tomas elegidas y palabra final en `voz/final/` (`onsets.json`).

## Concepto

«Tres puntos que se vuelven uno»: el anillo (acorde abierto) pregunta, tres notas breves piensan (las tres ventanas
de la nave), hay una pausa y la esfera responde con golpe. Todo en La mayor, la tonalidad del motion V1.1, para no
chocar con los videos aprobados. La línea de servicio cambia sólo el timbre de la esfera; la melodía no cambia nunca.
En el cierre con voz, la esfera cae en la palabra final del eslogan.

## Qué hay

| Carpeta | Contenido |
|---|---|
| `motor/sonic-engine.mjs` | Síntesis determinística (sin muestras ni modelos de terceros). `--territory puntos\|pregunta\|orbita --mode logo\|sting --line growth\|brand\|engine\|voice\|revenue` |
| `motor/voz.ts` | Etiqueta de voz con ElevenLabs v3 vía fal (`runFalModel`) |
| `motor/transcribir.ts` | QA: transcripción con marcas de tiempo por palabra (ElevenLabs STT vía fal) |
| `candidatos/` · `sting/` · `cierre/` · `lineas/` · `voz/` | WAV 48 kHz / 24 bits, MP4 del sting (fuera de git) |
| `web/` | MP3/MP4 publicados en la sala de escucha |
| `referencia/` | Masters del motion V1.1 (sting y reveal 16:9 navy) bajados del bucket público de AXIS |

## Verificado

- Notas, tiempos y ausencia de clics: espectrogramas en `qa/` (se corrigió un corte seco del golpe grave y de las notas).
- Volumen: −13 a −15 LUFS integrados, pico −1 dBFS.
- Voces: las cuatro dicen «Empower your growth» (transcripción); el golpe de la esfera cae en el inicio de «growth».
- **Sin verificar:** si suena propio, si se recuerda, si se siente Efeonce. Nadie de esta sesión escuchó el audio.

## Trampas

- El conector MCP de ElevenLabs tiene mal la credencial: le cargaron el ID de la clave, no la clave `sk_…`
  (`api_key_id_used_as_api_key`). Mientras no se corrija, ElevenLabs va por fal.
- `tsx` con el shim compila a CJS: sin top-level await (envolver en `main()`).
- Dos MP3 del mismo largo pesan igual (tasa fija); verificar con hash, no con el tamaño.

## Siguiente

Con el territorio, la voz y el acento por línea elegidos: pieza larga (30–60 s) sobre el motivo, cortinillas para
Glitch, re-sonorizar reveal y apertura, y llevar los valores a tokens AXIS (`efeonceGraphicLine.motion.sound`)
con su guía de identidad sonora.
