# Branding sonoro Efeonce — ronda 1 (2026-09-26)

Estado: **prototipos sin aprobar**. Sala de escucha: https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9

## Decisiones del operador (2026-09-26)

- Todo se produce en casa, sin músico ni compositor humano: motor propio + ElevenLabs + Higgsfield.
- Puntos de contacto, en orden: video y redes → podcast Glitch → eventos.
- Los cierres largos llevan etiqueta con voz: «Empower your <Línea>».

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
