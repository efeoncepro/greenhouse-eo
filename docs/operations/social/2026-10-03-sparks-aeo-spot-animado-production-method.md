# Los Sparks (servicio Efeonce | AEO) — primer spot animado 2D de marca propia — 2026-10-03

**Aplicación reusable:** [método de producción y posproducción de video](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md)
y el workflow de la skill `motion-design-studio`
[spot animado 2D con assets de marca compuestos](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md).
Esta retrospectiva conserva la evidencia del caso; el método vive allá y no se repite acá.

**Documentación funcional:** [Spot animado 2D de Efeonce](../../documentation/creative/spot-animado-2d.md) ·
**Manual:** [Producir un spot animado 2D](../../manual-de-uso/creative/producir-spot-animado.md).

## Delta 2026-10-03 — distribución (Marketing Studio + Metricool) y naming

- **Marketing Studio.** El spot entró como concepto **CMP001-08 «Los Sparks»** de CMP-001 (always-on AEO,
  `source_of_truth onedrive`): finales en OneDrive `15. Paid Media/03. Finales/CMP-001 - Lo que la IA dice de ti/`,
  entradas en `CATALOGO-DATOS.json` → `pnpm import:catalog --apply` → `pnpm media:ingest --campaign CMP-001 --apply`;
  filas `CMP-001-SP-01…05` en el `ASSETS.md` de la campaña. Orgánico (la pauta espera la licencia de la música de
  Stable Audio); versiones `imported` sin aprobar; copies en estado «propuesta». Operación de Studio:
  [skill `efeonce-marketing-studio`](../../../.claude/skills/efeonce-marketing-studio/SKILL.md).
- **Metricool (marca Efeonce Group `3961547`, `America/Santiago`).** Instagram `efeoncepro`: REEL con
  `showReelOnFeed`, lun 05-oct-2026 14:00, ID `387560819`, UUID `213403842407255251`; video 16:9 con intro muda de
  «gira la pantalla» (52,6 s) y portada **4:5** (regla del operador: en Instagram la portada de un video 16:9 es la
  4:5). LinkedIn página Efeonce: POST, jue 08-oct-2026 11:00, ID `387560873`, UUID `-1362316842369790950`; video
  16:9 (49,6 s) y portada 16:9. Estado `PENDING` = programado, no publicado.
- **Horarios:** cruce de mejores horas con la cola. IG lunes 14 h (índice 317, máximo semanal, día libre); LinkedIn
  jueves 11 h (índice 2790), porque martes 06 y viernes 09 ya tenían post a las 11:00.
- **Readback:** Metricool re-alojó la media en `static.metricool.com/planner/202610/…` y los 4 archivos descargados
  (2 MP4, 2 PNG) tienen SHA-256 idéntico a los finales; el texto devuelto es idéntico al copy aprobado. Registro:
  `ai-generations/2026-10-03_sparks-aeo-60s/final/redes/PROGRAMACION.md`. Receta y schema MCP observado ese día:
  [entrega de video en Metricool](../../../.claude/skills/social-media-studio/references/video-delivery-metricool.md).
- **Naming (corrección del operador):** «Mi marca no se llama Efeonce AEO sino Efeonce. Efeonce | AEO es el
  servicio». Los copies se corrigieron: la marca que habla es Efeonce y el servicio se escribe «Efeonce | AEO». La
  voz y los subtítulos quemados del video dicen «Efeonce AEO» y el operador decidió no re-renderizar; cuando este
  registro cita la pieza, cita lo que la pieza dice.
- **Pendientes humanos:** enlace de la bio de Instagram (el copy dice «Link en la bio»), comprobar la publicación
  después de la hora y aprobar las versiones en Studio.

## Estado

- **v2 aprobada por el operador (Julio Reyes) el 2026-10-03:** «Quedó genial… Muy bueno».
- Archivo: `ai-generations/2026-10-03_sparks-aeo-60s/final/v2/sparks-aeo-v2-1080-es.mp4` y su versión
  `-sin-subtitulos`. 16:9, 1920×1080, 24 fps, **49,6 s**. Master −16 LUFS / −1 dBTP.
- **Programado, todavía sin publicar** (ver el delta de distribución): Instagram 05-oct y LinkedIn 08-oct, orgánico.
  La aprobación de la pieza no autorizó su publicación; la programación tuvo autorización propia en el chat. Sin pauta.
- En curso (fuera de esta retrospectiva): publicación del elenco 2D en AXIS (ver
  [Pendientes](#pendientes-y-límites-honestos)).

## Qué se pidió

Brief del operador: video de marca de **60 s, 16:9, con MiniMax H3**, con historia, cámara que se mueve y **2D con
profundidad y luz**. Orden de trabajo pedido: historia, audio, SFX y VFX primero; después storyboard en canvas; el
modelo de video sólo al cerrar la preproducción.

La pieza resultante es un **explainer animado 2D**: Tomás, marketer ficticio de Andina Cargo (cliente en la
ficción), le pregunta a una IA por «el mejor software de gestión de flotas en Chile» y la IA nombra a la competencia.
Sale un Spark del portal, Tomás da la señal a los cuatro Sparks, investigan fuentes, ordenan contenido y entidades,
reportan; Tomás aprueba, vuelve a preguntar y la IA nombra a Andina Cargo con su fuente. Cierre con placa del servicio
Efeonce | AEO + AI Visibility Report (la voz y el subtítulo de la pieza dicen «Efeonce AEO») y el reveal del logo
Efeonce con eslogan.

## Qué tipo de animación es

Híbrido de cuatro capas; **lo de marca se compone, nunca se genera**:

| Capa | Qué aporta | Cómo se hizo |
| --- | --- | --- |
| 2D cartoon cel-shaded | Personajes y fondos (estilo A del elenco 2D: contorno navy grueso, un escalón de degradado, sombras duras) | GPT Image 2.5 Sunburst con las hojas del elenco como referencia |
| Image-to-video por cuadros clave | Movimiento y cámara entre un cuadro inicial y uno final | MiniMax H3 vía fal, 768P, subido a 1080 |
| Motion graphics vectorial determinista | Pantallas de chat (S2/S9) y placa de cierre | Dibujadas cuadro a cuadro desde el vector |
| Composición y post | Sparks oficiales, subtítulos, montaje, audio | Scripts propios (sharp, ffmpeg, Python) |

## Decisiones del operador (citadas o parafraseadas desde el inventario)

1. **Orden de trabajo:** historia/audio/SFX/VFX → storyboard en canvas → modelo de video al final.
2. **El elenco fotográfico no puede hacer de cliente.** El borrador usaba a Karo; la regla es que el elenco
   fotográfico representa al equipo Efeonce. Se creó un **elenco 2D ficticio** (Tomás, Camila, Renata, Mateo) con
   sello Efeonce sutil (luz de borde azul #0375db y un objeto azul por personaje; sin órbitas ni esferas). Aprobado:
   «Me encantan, están aprobados todos». Canon: [`EFEONCE_2D_CAST_V1.md`](../brand-characters/EFEONCE_2D_CAST_V1.md).
3. **Voz:** «narrador de Nickelodeon en español» + subtítulos. Del casting en Higgsfield eligió **Andre**; luego
   señaló el conector **ElevenLabs Creative (MCP) con `eleven_v4`**, más expresivo.
4. **La mirada del Spark:** «¿no debería estar mirando a Tomás?». Se emuló el `lookAt` del rig y lo aprobó.
5. **Marcas de la competencia:** vio los marcadores «[Marca ficticia A/B/C]» en el corte; se reemplazaron por marcas
   inventadas (Rodavía, Kilomar, TrazaNorte).
6. **Ritmo:** «va muy lento… querías cumplir el minuto». Origen de la v2 más corta.
7. **Premisa del guion:** «la premisa no es que los Sparks existen para arreglar el AEO». Origen del guion v2.
8. **Música:** «ponle un ritmo más punk, pásale el sonic brand como referencia».
9. **Cierre:** la frase completa del llamado a la acción va sobre una placa animada y el reveal del logo Efeonce queda
   **sin voz**.
10. **Excepciones al canon sonoro aceptadas por el operador:** registro de energía debajo de una locución (la norma
    lo prohíbe) y licencia comercial de Stable Audio aún sin confirmar con legal.
11. **Naming (posterior a la aprobación):** la marca es Efeonce; «Efeonce | AEO» es el servicio. Corregido en los
    copies de redes, no en el video (no se re-renderizó).

## Línea de tiempo de rondas

| Ronda | Qué se hizo | Qué salió / qué se decidió |
| --- | --- | --- |
| Preproducción | [`PREPRODUCCION.md`](../../../ai-generations/2026-10-03_sparks-aeo-60s/PREPRODUCCION.md): historia, guion VO por escena, música, voz de los Sparks, SFX, VFX, plan de tomas y empalmes, mezcla, presupuesto | Historia aprobada; Tomás protagonista |
| Storyboard en canvas | Artifact con láminas Main, S01–S10, Timeline; luego Elenco2D-estilo, Elenco2D-hojas y Cuadros-clave | El operador comentó sobre las láminas y aprobó por escena |
| Elenco 2D | Cuatro personajes con hojas de giro y expresiones; referencias selladas (`scripts/foto/assets.lock.json`, 560 assets) y publicadas al canon GCS; `build-prompt.mjs` declara `ELENCO_2D` y el rol `ilustracion-2d` | Aprobado y canonizado el mismo día |
| Duración por toma | El operador preguntó por qué escenas si MiniMax permitiría 30 s | Verificado en docs y en vivo: **tope 15 s por request en fal y en Higgsfield**. Las escenas cortas son límite real y control |
| Cuadros clave | GPT Image 2.5; Sparks compuestos desde el SVG oficial; pasada de acabado sólo de luz | **0 píxeles cambiados fuera de las zonas** (`merge-zonas.cjs`) |
| Piloto H3 | S3 primero (autorizado USD 0,72) y S3 v2 | Se autorizó la producción completa |
| Tomas H3 | S1–S9 | S1 y S8 rehechas (texto ilegible); S6 rehecha (se fue al verde) |
| v1 | Corte mudo con placas provisorias, placas 1080, VO Andre `eleven_v4`, SFX sintetizados, subtítulos quemados + SRT, mezcla | 59,96 s. Llega al operador con marcadores de marca y burbuja desbordada |
| Feedback v1 | «va muy lento…», marcas reales, zoom de S2 fluido, guion fiel al servicio Efeonce | AEO, cama punk | Se carga `seo-aeo`, `seo-aeo-practice` y el canon de los Sparks antes de reescribir |
| v2 | Un solo mapa de tiempos re-tima video, voz, efectos y subtítulos; pantallas S2/S9 dibujadas desde el vector; cama punk desde la pieza de energía oficial | 46,5 s; el logo sonoro intermedio se quita (chocaba con la voz) |
| Cierre | Placa animada (6,54 s) con Sparks escalonados, logo AEO y logo del Report; reveal del logo Efeonce sin voz; cama +2 compases | **49,6 s, aprobada** |

## Hallazgos técnicos de esta corrida

Detalle y receta en el [método transversal](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) y el
[workflow](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md). Resumen:

- **H3 base con `--prompt-expansion disabled` es más fiel que H3 Max**; Max gira los Sparks en 3D.
- Cuadro inicial y final deben compartir el eje de cámara; si no, la toma salta de trayectoria.
- El prompt de video debe **prohibir texto en pantalla** y **fijar la paleta**.
- `--estimate` de fal colgaba subiendo un PNG de 3,5 MB: usar JPG y precios publicados.
- 1080P no existe en h3-i2v (480P/768P/2K/4K) y h3max-i2v no tiene 2K. Se subió de 768P a 1080 con lanczos + recorte
  + unsharp.
- **Los Sparks nunca los genera el modelo:** se componen desde el SVG oficial (`@efeoncepro/axis-brand-assets`,
  sparks-2d), sin espejar; la mirada se emula moviendo la cara LED dentro del visor.
- `zoompan` de ffmpeg redondea el encuadre a píxeles enteros y salta: las pantallas de UI se dibujan cuadro a cuadro
  con escala decimal.
- ffmpeg local sin libass: cada subtítulo es un PNG transparente superpuesto por tiempo; en pantallas de UI el cue sube
  para no tapar la barra de escritura.
- Al re-timar, un sonido con tiempo absoluto choca con la voz.
- `overlay` necesita `shortest=1` y `-t` explícito, o el video se alarga (salió 49,2 s en vez de 46,5).
- La cama punk de Stable Audio salió cargada de graves (medios 21 % contra ~35 % de la norma): EQ −4 dB bajo 180 Hz,
  +2 dB a 2,5 kHz.
- Trampas de imagen: sharp `removeAlpha` al final perdía el `joinChannel` (se reescribió la mezcla);
  `limitInputPixels:false` con SVG a alta densidad; el quitafondos recortaba el pantalón navy (usar recortes de cintura
  arriba).

## Costos

| Ítem | Costo |
| --- | --- |
| fal (MiniMax H3, video) | USD 4,38 medido |
| fal (Stable Audio 2.5, música) | USD 0,40 medido (USD 0,20 por pieza; se hicieron 0,65 y 0,8) |
| **Total fal** | **USD 4,78** |
| GPT Image (cuadros clave) | tope autorizado USD 2,10 (no es gasto medido; el gasto exacto no quedó registrado); hojas del elenco aparte |
| ElevenLabs | 0 créditos reportados por el run (el estimado era 71 créditos por toma corta, ~USD 0,016) |
| Higgsfield | créditos del casting de voz |
| Tope de referencia | ~USD 8 |

## Errores encontrados y cómo se corrigieron

| Error | Dónde se vio | Corrección |
| --- | --- | --- |
| Marcadores «[Marca ficticia A/B/C]» en el corte entregado | revisión del operador | marcas inventadas Rodavía, Kilomar y TrazaNorte, sin empresa homónima en búsqueda web del 2026-10-03 |
| La pregunta se salía de la burbuja (ya estaba en v1 y no se detectó) | revisión de v2 | burbuja ensanchada; lección: mirar cuadros al 100 % antes de entregar |
| Texto ilegible generado en S1 y S8 | revisión de tomas | prompt que prohíbe texto; tomas rehechas |
| S6 se fue al verde | revisión de tomas | paleta fijada en el prompt; toma rehecha |
| Zoom de S2 a saltos | v1 | cada cuadro dibujado desde el vector con escala decimal |
| Guion que decía que los Sparks «existen para arreglar el AEO» | revisión del operador | guion v2 tras cargar las skills dueñas y el canon de los Sparks; sin promesa de resultado |
| Logo sonoro intermedio encima de la voz de S9 | re-timado de v2 | se quitó (el reveal ya lo trae) |
| Voz encima del reveal del logo | revisión del cierre | la frase va sobre la placa previa; el reveal queda sin voz |

## Lecciones

1. El ritmo lo pone la historia, no la duración del brief: no estirar tomas para llenar 60 s.
2. Copy de capacidad u oferta: cargar las skills dueñas (por ejemplo `seo-aeo-practice`) y el canon de personajes
   **antes** de escribir la VO. Regla de la práctica: nunca prometer aparición o citación en IA.
3. Lo de marca se compone (SVG oficial, vectores, logos); el modelo sólo pone luz y movimiento; verificar 0 px fuera.
4. H3: base mejor que Max para fidelidad; mismo eje inicio/fin; prohibir texto; fijar paleta; tope 15 s.
5. Mirar los cuadros al 100 % antes de entregar y resolver los marcadores.
6. Re-timar desde un solo mapa de tiempos.
7. `zoompan` salta; para vectores, cuadro a cuadro con escala decimal.
8. El logo final respira sin voz; la frase de cierre va sobre la placa previa.
9. Declarar lo que no se pudo verificar (sin escucha propia, sin ASR).
10. Elenco: quién aparece importa (equipo ≠ cliente).

## Pendientes y límites honestos

Lo que falta decirle al operador, sin suavizar:

- **Sin escucha propia ni ASR.** El agente no escucha el audio y no hay transcripción automática local: no se verificó
  automáticamente que la voz diga el texto del guion. Las tomas de voz se eligieron por calce de tiempo
  (`silencedetect` a −42 dB). **La escucha del operador fue el control** y su aprobación de la v2 la cierra.
- **Licencia de Stable Audio sin confirmar con legal.** Antes de pauta o reutilización comercial, revisar con
  `legal-privacy-ip-operator`.
- **Excepción al canon sonoro.** El registro de energía va debajo de una locución, cosa que
  [`EFEONCE_SONIC_IDENTITY_V1`](../brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md) prohíbe. Es una excepción de esta pieza,
  no una regla nueva.
- **Prueba de reconocimiento del elenco 2D** pendiente.
- **Derechos del elenco 2D** pendientes.
- **Publicación del elenco 2D en AXIS** (packages + Lab): en curso.
- **Variantes para redes: entregadas y programadas** (delta de distribución): portada Instagram 4:5, portada
  LinkedIn 16:9 y versión Instagram con pantalla negra muda inicial y animación vectorial de un teléfono genérico
  (sin botones, no iPhone) con flechas de girar la pantalla.
- **Publicación:** orgánica, programada (`PENDING`) en Instagram y LinkedIn; comprobarla después de la hora. Pauta,
  en espera de la licencia de la música. Enlace de la bio de Instagram y aprobación de versiones en Studio, pendientes.

## Rutas y commits

- Corrida: [`ai-generations/2026-10-03_sparks-aeo-60s/`](../../../ai-generations/2026-10-03_sparks-aeo-60s/)
  (scripts y md en git; media fuera de git). Inventario: `INVENTARIO-DE-HECHOS.md`. Preproducción y cierre:
  `PREPRODUCCION.md` §11–12.
- Cuadros: `cuadros/compose-sparks.cjs`, `cuadros/spark-mirada.cjs`, `cuadros/merge-zonas.cjs`.
- Corte: `corte/placas-provisorias.cjs`, `corte/placas-1080.cjs`, `corte/ui-s2-s9.cjs`, `corte/subtitulos-v2.cjs`,
  `corte/corte-v2.py`, `corte/placa-cierre.cjs`, `corte/ensamblar-v2.py`.
- Audio: `audio/bus-sfx.py` (46 eventos), `audio/musica/regrabar-punk.ts`, `audio/mezcla-v2.py`; subtítulos
  `SUBTITULOS-v2.es.srt` y `SUBTITULOS-v2.es.sdh.srt`.
- Elenco: [`EFEONCE_2D_CAST_V1.md`](../brand-characters/EFEONCE_2D_CAST_V1.md); referencias en
  `ai-generations/_identidad-elenco-2d/`. Personajes: [`SPARKS_V1.md`](../brand-characters/SPARKS_V1.md).
- Commits de la corrida: `ab0925e65` (cuadros S1 y S3), `3b13eacc3` (mirada del Spark), `1af3fd225` (cuadros S4–S9),
  `3ffa3ee92` (piloto H3 de S3), `beccc8b9d` (tomas S1–S9), `f24f293f2` (corte mudo), `eb08704da` (v1 voz, subtítulos
  y mezcla), `178c73c6c` (v2), `81b171fc6` (cierre); elenco 2D canonizado en `a1a4cfd34`.
