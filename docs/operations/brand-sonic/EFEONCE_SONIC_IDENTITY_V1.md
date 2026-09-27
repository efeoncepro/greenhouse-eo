# Identidad sonora de Efeonce V1

> **Tipo de documento:** Norma de marca (sonido) · canon operativo
> **Versión:** 1.2
> **Creado:** 2026-09-26 por Claude, con la dirección del operador (Julio Reyes)
> **Última actualización:** 2026-09-27 por Claude (v1.2: Glitch deja de estar pendiente; su diseño sonoro propio quedó aprobado, versión B)
> **Estado:** **Recomendada, no canon.** El operador aceptó la recomendación el 2026-09-26 («vamos con tu
> recomendación»); la canonización queda pendiente (ver [Pendientes para canonizar](#pendientes-para-canonizar)).
> **Glitch (podcast):** no forma parte de esta norma. Glitch tiene su diseño sonoro propio, **aprobado (versión B,
> 2026-09-27)**, **sólo de Glitch**, en la [norma de Glitch](../brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) §13.11.
> **Decisión:** [ADR `EFEONCE_SONIC_IDENTITY_DECISION_V1`](../../architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md)
> **Referencia viva:** [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/) ·
> [JSON para agentes](https://axis.efeonce.org/references/sonic-brand.json) (publicados el 2026-09-26: PR de AXIS #4, squash `55486aa`)
> **Relacionados:** [lenguaje de movimiento de la órbita](../brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md) ·
> [motion del logo V1.1](../brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md) ·
> [manual de la línea gráfica](../brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)

## Para qué sirve

Efeonce tiene una forma propia que se ve (la órbita). Esta norma le da la forma que se oye: un logo sonoro, una
etiqueta con voz, el sonido de las animaciones del logo y dos piezas largas, todo derivado de la misma gramática. Si
una pieza sonora no sigue estas reglas, no es el sonido de Efeonce aunque suene parecido.

Todo se produjo en casa, sin músico ni compositor humano: motor de síntesis propio, ElevenLabs (voz) y Stable Audio
(re-grabación), estos dos últimos vía fal.

## Concepto y gramática

**«Tres puntos que se vuelven uno».** Es la gramática de La órbita pasada a sonido:

| Elemento visual | En sonido | Qué dice |
|---|---|---|
| Anillo | acorde abierto de quinta | la pregunta |
| Tres ventanas de la nave | tres notas breves en Mi | lo que se piensa |
| Esfera | La, con el único golpe de la pieza | la respuesta |
| Halo | el acorde de La mayor florece y se apaga | la resolución |

Territorio elegido: **«Puntos suspensivos»** (Mi Mi Mi → La).

## El motivo

| Parámetro | Valor |
|---|---|
| Notas | Mi5 · Mi5 · Mi5 → La5 (MIDI 76 76 76 81) |
| Duración de cada nota | 140 ms |
| Pausa antes de la esfera | 370 ms |
| Tonalidad | La mayor (la del motion V1.1 aprobado, cuyo acorde final ya era La mayor) |

La melodía y su pausa son fijas. Lo único que cambia entre usos es el registro y el timbre de la esfera.

## Dos registros

Conviven dos registros. Se elige uno por pieza y no se cambia dentro de ella.

| Registro | Tempo | Cómo suena | Cómo se produce |
|---|---|---|---|
| **Fondo** (sereno) | 96 BPM | armonía La · Re/La · Fa♯m7 · Mi sus4; la esfera responde siempre La mientras la armonía cambia: «el contexto cambia, la respuesta no» | síntesis propia determinística, sin muestras |
| **Energía** (rock) | 120 BPM | tres golpes apagados (palm mute) de guitarra en Mi y el acorde abierto con bombo, platillo y bajo; a 120 BPM la pausa son tres semicorcheas = 375 ms, la del logo | maqueta propia re-grabada con Stable Audio 2.5 audio-to-audio (intensidad 0,7) + la esfera propia (campana La + golpe grave) montada encima |

## Acento por línea de servicio

La línea de servicio cambia **sólo el timbre de la esfera**; melodía, pausa y tonalidad no cambian.

| Línea | Timbre de la esfera |
|---|---|
| Growth | campana |
| Brand | marimba |
| Engine | FM |
| Voice | eco |
| Revenue (HubSpot y Salesforce comparten) | campana grave |

## Voz: la etiqueta

- Voz: **Brian** (ElevenLabs v3), la voz de fábrica «Brian – Deep, Resonant and Comforting», ID de voz `nPczCjzI2devNBz1zQrb`. Las
  cinco tomas están aprobadas.
- **Se pide por ID, nunca por nombre.** La biblioteca de ElevenLabs tiene 25 voces llamadas «Brian» (2026-09-27); pedir
  «Brian» en un buscador puede devolver otra. En fal, `voice: "Brian"` sí resuelve a esta, porque su lista de voces es la
  de fábrica de ElevenLabs. Verificado el 2026-09-27: una toma con el ID en el conector de ElevenLabs midió 0,85 de
  similitud de hablante contra la etiqueta aprobada de Growth (las otras cuatro etiquetas aprobadas, 0,73–0,83; George y
  otras dos «Brian» de la biblioteca, 0,62–0,72). La confirmación de oído es del operador.
- Texto: «Empower your <Línea>.», en inglés y nunca traducido.
- La palabra final cae con la esfera.
- La pausa entre «Empower» y «your» quedó igualada a 0,14 s en las cinco tomas, recortando sólo silencio (Brian la
  alargaba hasta 0,28 s).
- La etiqueta con voz se usa en cierres.

## Sonido del motion del logo

La imagen del motion V1.1 no se tocó: la esfera sonora cae con el golpe de encaje.

| Pieza | La esfera cae en | Nota |
|---|---|---|
| Sting | 0,58 s | |
| Reveal | 1,87 s | dos versiones: con voz y sin voz, según contexto |
| Apertura | 1,15 s | aprobada tal cual; termina en el anillo abierto |

- **Reveal con voz:** «Growth» y el acorde caen a 3,05–3,08 s, cuando termina de entrar el eslogan.
- Cada pieza se extiende 1 s con el cuadro final para que se oiga la cola.
- Formatos: 16:9 y 9:16.
- Los masters V1.1 del bucket `motion/logo/v1.1/` **siguen con el sonido anterior**
  (`scripts/creative/brand-motion/orbit-sound.mjs`) hasta canonizar; el reemplazo es un pendiente.

## Mapa de uso

Puntos de contacto por prioridad: video y redes → podcast Glitch → eventos.

| Situación | Qué se usa |
|---|---|
| Cierre de video | reveal (con Brian si el video no cierra con locución) |
| Inicio de video | apertura |
| Reels, cortinillas, cierres de menos de 2 s | sting |
| Con locución, webinar o video explicativo | pieza larga de **fondo**, ~15 dB bajo la voz |
| Lanzamiento, redes con ritmo, evento | pieza larga de **energía** o cierre de energía (5,1 s) |
| Pieza de una sola línea de servicio | logo o etiqueta con el timbre de esa línea |
| Glitch (podcast) | no se usa este kit. Glitch tiene su diseño sonoro propio, **aprobado (B)**, sólo de Glitch, en la [norma de Glitch](../brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) §13.11 |
| Pantalla de recepción | sin sonido |
| Clientes · UI de Greenhouse | no se usa |

## Reglas

**Siempre**

- Melodía fija, con su pausa.
- La línea de servicio cambia sólo el timbre de la esfera.
- Un solo golpe por pieza.
- Eslogan en inglés; la palabra final cae con la esfera.
- Nivelar por destino: −14 LUFS en video y redes, −16 LUFS en podcast, pico −1 dBFS.
- Usar los archivos del kit.

**Nunca**

- Cambiar de registro dentro de una pieza.
- Poner la pieza de energía debajo de una locución.
- Comprimir el golpe.
- Usarla en piezas de clientes o en la UI de Greenhouse.
- Sonorizar la pantalla de recepción.
- Usar otra voz para el eslogan.
- Usar el sonido de Glitch (falla sonora, SFX de transición, clic del micrófono, aire del estudio) en piezas de
  Efeonce: es exclusivo de Glitch y no forma parte de esta identidad.
- Mezclar este kit con el de Glitch en una misma pieza.

## Ficha técnica

| Campo | Valor |
|---|---|
| Motivo | Mi5 · Mi5 · Mi5 → La5 (MIDI 76 76 76 81), notas de 140 ms, pausa de 370 ms |
| Tonalidad | La mayor |
| Fondo | 96 BPM · La · Re/La · Fa♯m7 · Mi sus4 · síntesis propia sin muestras |
| Energía | 120 BPM · pausa de 375 ms (tres semicorcheas) · Stable Audio 2.5 audio-to-audio, intensidad 0,7 · esfera propia encima |
| Voz | Brian, ElevenLabs v3, ID `nPczCjzI2devNBz1zQrb` · «Empower your <Línea>.» · pausa «Empower»→«your» 0,14 s |
| Esfera en el motion | sting 0,58 s · reveal 1,87 s · apertura 1,15 s · reveal con voz 3,05–3,08 s · +1 s de cola |
| Nivel de entrega | −14 LUFS video/redes · −16 LUFS podcast · pico −1 dBFS |
| Excepción medida | los logos Brand, Voice y Revenue quedan cerca de −15 LUFS: el golpe toca el techo de pico y no se comprime |
| Formatos de video | 16:9 y 9:16 |

## Dónde vive

| Recurso | Dónde | Qué es |
|---|---|---|
| Página de referencia | [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/) | La norma para personas, con reproductores. PR `efeoncepro/axis-design-system#4`, squash `55486aa`; publicado 2026-09-26 |
| Kit para el equipo (OneDrive) | `Alineación › 5. Contenidos › 13- Branding › Identidad Sonora Efeonce › v1` | Las seis carpetas del kit y un `LEEME.txt`, junto a «Motion Órbita Efeonce» |
| JSON para agentes | [axis.efeonce.org/references/sonic-brand.json](https://axis.efeonce.org/references/sonic-brand.json) | Esquema `axis.efeonce-sonic-brand.v1`: URL, duración, LUFS, pico y SHA-256 de cada archivo |
| Guía para agentes | `docs/agent-composition/sonic-brand.md` en el repo AXIS | Cómo elegir y usar cada archivo |
| Fuentes del Lab | `apps/lab/src/data/sonic-brand.ts` (criterio) y `sonic-brand-assets.ts` (generado del bucket), repo AXIS | Lo que pinta la página |
| Archivos | bucket público `gs://efeonce-group-axis-public-media/sonic/v1/` · [URL pública](https://storage.googleapis.com/efeonce-group-axis-public-media/sonic/v1/) | 65 archivos, 74 MB (ver abajo) |
| Producción | [`ai-generations/2026-09-26_branding-sonoro/`](../../../ai-generations/2026-09-26_branding-sonoro/LEEME.md) en greenhouse-eo | Motor, kit, guía e historia; los binarios quedan fuera de git |
| Guía armada | [`guia/identidad-sonora.html`](../../../ai-generations/2026-09-26_branding-sonoro/guia/identidad-sonora.html) · [artefacto privado](https://claude.ai/artifact/NgfYHfeNJX6Frjco6hXtnG) | La guía para el equipo |
| Sala de escucha | [artefacto privado](https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9) | Historial de rondas |

**Estructura del bucket (`sonic/v1/`):**

| Carpeta | Contenido |
|---|---|
| `masters/01-logo-sonoro` | logo sonoro por línea |
| `masters/02-etiqueta-voz` | etiqueta con voz por línea |
| `masters/03-motion` | reveal, apertura y sting con sonido, WAV + MP4, 16:9 y 9:16 |
| `masters/04-piezas-largas` | piezas largas de fondo y de energía |
| `masters/05-cierre-energia` | cierre de energía (5,1 s) |
| `masters/06-voz-sola` | la voz sin música |
| `web/` | MP3, MP4 a 720p y pósters WebP |

**Por qué no está en `@efeoncepro/axis-tokens`:** a propósito. Los valores pasan a tokens al canonizar, junto a
`efeonceGraphicLine.motion.sound` y con el reemplazo del sonido de los masters V1.1. Antes de eso, un token fijaría como
contrato algo que todavía es recomendación.

**Carpeta de producción (`ai-generations/2026-09-26_branding-sonoro/`):**

| Ruta | Qué hace |
|---|---|
| `LEEME.md` | historia de las rondas y trampas |
| `motor/sonic-engine.mjs` | logo, sting, reveal y apertura |
| `motor/composer.mjs` | pieza de fondo (y el Glitch sereno explorado) |
| `motor/rock.mjs` | maqueta rock |
| `motor/dsp.mjs` | primitivas de síntesis |
| `motor/glitch-sfx.mjs` | diseño sonoro de Glitch (aprobado, versión B, **sólo de Glitch**, no de esta identidad; ver la norma de Glitch §13.11). **Histórico:** ya se migró al repo taller `efeonce-brand-workshop` (commit `2d411b8`, 2026-09-27) como `tools/glitch-motion/src/sound.mjs`, sobre `tools/brand-sound` (el `dsp.mjs`); esta copia ya no es la fuente. Si algún día migra el motor de esta identidad (`sonic-engine.mjs` y compañía), usa `tools/brand-sound` (una sola lógica) |
| `motor/ai-music.ts` | Stable Audio y ElevenLabs Music vía fal |
| `motor/sello.mjs` | la esfera como pista, para montarla encima |
| `motor/voz.ts` | TTS |
| `motor/transcribir.ts` | STT con marcas de tiempo |
| `motor/recuperar.ts` | recupera un trabajo de fal vencido sin volver a pagar |
| `motor/master.sh` | masterización por destino |
| `motor/precio.ts` | costo de las llamadas |
| `entrega/` | el kit (mismas carpetas `01`–`06` que el bucket) |
| `guia/identidad-sonora.html` | la guía armada |

## Método de producción

1. **Síntesis propia primero.** El logo, la etiqueta, el motion y la pieza de fondo salen del motor propio: determinístico
   y sin muestras.
2. **Energía: maqueta → re-grabación → sello.** Se compone una maqueta propia (`rock.mjs`) con duración en segundos
   enteros, se re-graba con Stable Audio 2.5 audio-to-audio (intensidad 0,7) y se monta la esfera propia encima
   (`sello.mjs`). La estructura y el golpe final los fija la maqueta, no el modelo.
3. **Voz vía fal o el conector de ElevenLabs.** TTS con `fal-ai/elevenlabs/tts/eleven-v3` (`voice: "Brian"`, que en fal
   es la de fábrica) o, en el conector de ElevenLabs, con el ID `nPczCjzI2devNBz1zQrb` y el modelo `eleven_v3`; nunca por nombre fuera
   de fal. Para caer con la esfera, STT con `fal-ai/elevenlabs/speech-to-text`, que devuelve cada palabra con inicio y
   fin. Una frase nueva: tres tomas → pausa «Empower»→«your» a 0,14 s recortando sólo silencio → palabra final por STT →
   esfera de la línea en ese instante → `master.sh` a −14 LUFS → el operador escucha y aprueba → bucket y JSON de AXIS.
4. **QA sin oído.** El agente no escucha: verifica con espectrograma, medición de bandas y de LUFS, y transcripción. Lo
   perceptual lo decide el operador.
5. **Nivelar por sonoridad, nunca por pico.** `master.sh <in> <out> <LUFS> [shelf]`, loudnorm en dos pasadas, al
   objetivo del destino.

## Trampas de proveedores (medidas)

- **ElevenLabs Music v3 no está en fal** (2026-09-26). Lo más nuevo es `elevenlabs/music/v2.5` (sin prefijo `fal-ai`;
  USD 0,60 por minuto). Acepta `composition_plan.chunks[].audio_reference` (`strength` low|medium|high|xhigh, ventana
  ≤ 30 s, líneas de texto ≤ 200 caracteres). Suena más producido, pero **no respeta la estructura**: con high y xhigh
  se saltó el corte y el golpe final. Por eso el híbrido con ElevenLabs se descartó.
- **Stable Audio 2.5 audio-to-audio** (`fal-ai/stable-audio-25/audio-to-audio`, USD 0,20 por pieza) conserva el
  tiempo al milisegundo (golpe final en 32,874 s contra 32,875 s de la maqueta), pero **redondea la duración a segundos
  enteros** (8,5 → 8): las maquetas se hacen de duración entera.
- **Licencias — evidencia reunida (2026-09-26, no es visto bueno legal):**
  - Stable Audio 2.5 audio-to-audio: fal lo marca «Commercial use». Stability declara uso comercial, entrenamiento con
    datos licenciados y que el usuario es dueño de la salida; su licencia comunitaria es gratuita hasta USD 1 millón de
    facturación anual y exige Enterprise sobre eso.
  - Voz ElevenLabs v3 vía fal: fal la marca «Commercial use» y su página dice «Commercial use rights included».
  - ElevenLabs Music v2.5 no quedó en la versión final (el híbrido se descartó): su licencia no aplica.
  - **Pregunta abierta para legal:** el FAQ de fal dice que «cada modelo tiene su propia licencia» y no aclara si el
    umbral de USD 1 millón de Stability aplica cuando el modelo se usa vía la API de fal. Si aplica y Efeonce lo supera,
    el registro de energía necesita licencia Enterprise de Stability o re-grabarse por otra vía. Fuentes:
    [fal · Stable Audio 2.5](https://fal.ai/models/fal-ai/stable-audio-25/audio-to-audio) ·
    [fal · ElevenLabs v3](https://fal.ai/models/fal-ai/elevenlabs/tts/eleven-v3) · [fal FAQ](https://fal.ai/docs/model-apis/faq) ·
    [Stability License](https://stability.ai/license).
- **`runFalModel` espera 120 s por defecto.** Para música, pasar un `pollTimeoutMs` mayor; un trabajo vencido se
  recupera sin volver a pagar con `awaitFalRequest` (`recuperar.ts`).
- **El conector MCP de ElevenLabs tiene mal la credencial:** se cargó el ID de la clave, no la clave `sk_…` (error
  `api_key_id_used_as_api_key`). Mientras tanto, ElevenLabs va por fal.
- **Normalizar por pico da niveles dispares:** por pico, la cortina quedó a −8,8 LUFS y la intro a −17,9 LUFS.

## Qué no hacer

- Regenerar el logo, la voz o la esfera: se usan los archivos del kit.
- Pedirle a un modelo de música que respete la estructura del logo: la fija la maqueta propia.
- Documentar el diseño sonoro de Glitch como parte de esta identidad: es sólo de Glitch y vive en su norma (§13.11).
- Declarar la identidad sonora como canon antes de cerrar los pendientes.

## Pendientes para canonizar

- **Licencias:** confirmar con legal si el umbral de USD 1 millón de Stability aplica vía fal (la evidencia reunida
  está en [Trampas de proveedores](#trampas-de-proveedores-medidas)); la voz tiene «Commercial use rights included» en fal.
- **Prueba de reconocimiento sin logo** antes de pautar, como la D14 de la órbita.
- **Tokens AXIS**, reemplazo del sonido de los masters V1.1 y guía en el manual de la línea gráfica.

Ya no es pendiente de esta norma: **Glitch (podcast).** Las rondas 4 y 5 exploraron dos versiones musicales (serena y
rock) que al operador «aún no le convencían»; la ronda 6 cambió a **diseño sonoro en vez de música** y el operador
aprobó la **versión B** el 2026-09-27. Glitch tiene su diseño sonoro propio, aprobado (B), **sólo de Glitch**, en la
[norma de Glitch](../brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) §13.11 y en
[axis.efeonce.org/references/glitch/#sonido](https://axis.efeonce.org/references/glitch/#sonido). No cambia esta
identidad, que sigue «recomendada».
