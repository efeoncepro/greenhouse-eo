# Los Sparks de Efeonce × Efeonce AEO — preproducción (historia, audio, SFX y VFX)

> **Pieza:** video de marca propia, 60 s, 16:9 (1920×1080, 24 fps), animación 2D con profundidad y luz.
> **Estado:** preproducción en diseño (2026-10-03); historia y VO aprobadas; storyboard en canvas (sistema La órbita): https://claude.ai/artifact/BisefmqX4H4ujXUCqQjLWp (privado del operador). Elenco 2D creado y canonizado (≈ USD 0,78); cuadros clave y video sin generar. Este documento se aprueba **antes**
> de los cuadros clave, el animatic y cualquier toma.
> **Motor de video previsto:** MiniMax H3 (hasta 15 s por pedido; se usan tomas de 5–8 s) — se confirma con el piloto
> de estilo.
> **Marco:** [taxonomía de video](../../docs/architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) ·
> [ADR-025](../../docs/architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md) ·
> [Sparks V1](../../docs/operations/brand-characters/SPARKS_V1.md) ·
> [identidad sonora](../../docs/manual-de-uso/creative/usar-identidad-sonora-efeonce.md) ·
> [naming AEO](../../docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md)

Etiquetas: **[decisión]** ya fijado por canon u operador · **[propuesta]** para aprobar · **[pendiente]** abierto.

---

## 1. Clasificación (ficha de la taxonomía)

```yaml
pieza: brand-film              # marca propia, 60 s
uso: organico                  # [pendiente] confirmar si también va a pauta (cambia derechos de música y voz)
tipo: hibrido                  # personaje-3d en estilo 2D (Sparks) + persona 2D + UI exacta compuesta
look: estilizado               # 2D con profundidad: luz de borde, volumen, bruma; color en post
fidelidad:
  identico: [diseño de cada Spark, accesorios del plantel, UI de la IA, nombre de la marca, logo Efeonce]
  interpretable: [fondos, luz, cámara, gesto del protagonista]
origen: desde-cero (cuadros clave construidos en pre)
cast: [los Sparks de Efeonce (plantel en azul), Tomás Ríos del elenco 2D]
texto: compuesto               # nunca generado
audio: { nativo: descartar, musica: identidad sonora (registro fondo), voz: VO narrador chileno (ElevenLabs), sfx: diseñados }
formato: { duracion_s: 60, aspecto: 16:9, fps: 24, entrega: 1920x1080 }
carril: cli-verificado (H3) + propio (UI, cierre, montaje, audio)
```

## 2. La historia

**Idea en una línea [propuesta]:** *tus clientes ya le preguntan a la IA qué comprar; si la IA no conoce tu marca, no te
nombra.* Es el reverso de «Tu IA no conoce tu negocio», y los Sparks son exactamente eso: agentes que trabajan con
contexto, con una persona que decide.

**Personajes:**
- **Tomás Ríos**, del [elenco 2D](../../docs/operations/brand-characters/EFEONCE_2D_CAST_V1.md) **[decisión del
  operador, 2026-10-03]**: gerente de marketing de **Andina Cargo**, una empresa ficticia de software de gestión de
  flotas en Chile. Es quien **supervisa y decide** (regla del canon: los Sparks nunca aparecen solos decidiendo).
  Reemplaza a Karo, del elenco fotográfico, que no puede hacer de cliente (canon del elenco, §2). Referencias:
  `ai-generations/_identidad-elenco-2d/tomas/` (giro y expresiones) y el ancla de estilo `_estilo/`.
- **Los Sparks de Efeonce**, el plantel en azul: **investigación** (lupa) lidera; **contenido** (tarjeta con trazo),
  **CRM y datos** (pila de fichas), **reportes** (gráfico de tres barras); **servicio** (burbuja) puede quedar fuera
  para no recargar el cuadro [propuesta].

**Arco en tres actos (24 compases de 2,5 s a 96 BPM, el pulso de trabajo):**

| Acto | Tiempo | Qué pasa | Qué siente el espectador |
|---|---|---|---|
| 1. El problema | 0–15 s | Tomás pregunta a una IA por el mejor software de flotas; la respuesta nombra a otros. Su marca no existe para la IA. Desde la pantalla aparece el Spark de investigación | reconocimiento («me pasa») → curiosidad |
| 2. El trabajo | 15–45 s | Tomás da la señal. Los Sparks entran al «mundo de las respuestas»: ven qué fuentes leen las IA, ordenan contenido, conectan datos. Tomás aprueba cada paso. Vuelve a preguntar | asombro → confianza (hay método y hay alguien a cargo) |
| 3. La respuesta | 45–60 s | La IA ahora sabe quién es Andina Cargo y la menciona con su fuente. Los Sparks celebran. Cierre: Efeonce AEO y el AI Visibility Report | alivio → deseo de medir la propia marca |

## 3. Guion con locución (VO) [propuesta]

Voz **[decisión del operador, 2026-10-03, revisada]**: **narrador de caricatura**, «como un narrador de Nickelodeon
en español»: energía alta, cálido, con la sonrisa en la voz, énfasis marcados y pausas con intención cómica, en
**español neutro latinoamericano de doblaje** (reemplaza el acento chileno de la primera versión). Lúdico sin
infantilizar: el público es B2B y los claims siguen el cuidado de abajo. **No imita a ningún locutor ni personaje
real**: se describe el estilo, nunca una voz identificable. **ElevenLabs** (voz diseñada o de librería con licencia
comercial registrada; la versión de modelo más nueva disponible, **[pendiente: verificar]**). **≈ 95 palabras**, ritmo
≈ 2,2 palabras por segundo (el estilo animado tiende a acelerar: medir la toma real contra la grilla), con silencios
planificados (S2 y S8 respiran sin voz).

| Toma | Tiempo | VO | Texto en pantalla (compuesto) |
|---|---|---|---|
| S1 | 0–5 | «Hoy tus clientes no buscan: le preguntan a la IA.» | la pregunta de Tomás en la caja de la IA |
| S2 | 5–10 | *(silencio de voz: la respuesta se lee sola)* | respuesta con tres marcas ficticias; Andina Cargo no está |
| S3 | 10–15 | «Y si la IA no te conoce, no te nombra.» | — |
| S4 | 15–20 | «Por eso existen los Sparks de Efeonce: agentes que trabajan con tu equipo, bajo tu dirección.» | — |
| S5 | 20–27,5 | «Primero entienden cómo te ven las IA: qué fuentes leen y de quién hablan en tu lugar.» | — |
| S6 | 27,5–35 | «Después ordenan lo que falta: contenido claro, datos que se conectan, señales que una IA puede citar.» | — |
| S7 | 35–40 | «Y tú decides cada paso.» | — |
| S8 | 40–45 | *(silencio de voz: Tomás vuelve a preguntar)* | la misma pregunta |
| S9 | 45–52,5 | «Ahora, cuando preguntan, la IA ya sabe quién eres.» | respuesta que menciona Andina Cargo, con su fuente |
| S10 | 52,5–60 | «Efeonce AEO. Mide tu visibilidad en los motores de respuesta de IA con nuestro AI Visibility Report.» **[operador, 2026-10-03]** (17 palabras ≈ 7 s: la voz entra a los 51 s, sobre el final de S9, y el reveal sin voz entra bajo las últimas palabras, 57,5 s) | «Efeonce AEO» · «AI Visibility Report» · URL [pendiente] · logo Efeonce |

**Cuidado de claims [decisión]:** el modelo comercial AEO sigue en borrador; el guion no promete posiciones, rankings
ni plazos. «La IA ya sabe quién eres» describe el caso ficticio, no garantiza un resultado. El copy final lo revisa
`copywriting` y, si va a pauta, revisión comercial.

**Versión sin voz [alternativa]:** la misma historia con tres cartelas compuestas (S3 «Si la IA no te conoce, no te
nombra.» · S7 «Tú decides cada paso.» · S10 el cierre) y la música en registro energía. Más universal para redes, pero
explica menos el servicio.

## 4. Música [propuesta]

- **Base:** la identidad sonora de Efeonce (recomendada, **no canon**: antes de pautar con presupuesto se confirma con el
  operador). Registro **fondo** porque hay locución; **línea Engine** (AEO usa la línea Engine en el AI Visibility Report),
  así que el timbre de la última nota es **FM**.
- **Cómo se obtiene:** dos caminos, en orden de preferencia:
  1. **Arreglo nuevo desde el material de marca** con Stable Audio 2.5 *audio-to-audio* sobre la pieza larga de fondo,
     estructurado a nuestros compases (regla de la guía §5.9: **nunca síntesis pura para música de marca**; medir el
     balance de medios antes de mostrarla).
  2. **Edición de la pieza larga de fondo del kit** a la estructura (más rápido, menos arco).
- **Tempo:** 96 BPM como grilla de trabajo (un compás = 2,5 s exactos, 24 compases = 60 s). **[pendiente]** medir el
  tempo real de la pieza de fondo del kit y ajustar la grilla a ese tempo si difiere.

| Sección | Compases | Tiempo | Qué hace la música | Ancla visual |
|---|---|---|---|---|
| Intro «sin respuesta» | 1–4 | 0–10 | pad y un pulso suave, armonía suspendida; hueco donde «falta algo» | S1–S2 |
| Aparición | 5–6 | 10–15 | entra el motivo de tres notas (Mi · Mi · Mi), dispersas | el Spark sale de la pantalla |
| Puesta en marcha | 7–10 | 15–25 | entra el ritmo (percusión liviana, bajo), el motivo se repite por instrumento | plantel, entrada al mundo |
| Trabajo | 11–16 | 25–40 | capas que suman (plucks, marimba suave); crece sin apurar | S5–S7 |
| Respiro | 17–18 | 40–45 | se vacía a pad + pulso: suspenso | Tomás vuelve a preguntar |
| La respuesta | 19–21 | 45–52,5 | el acorde abre, mayor y luminoso; **las tres notas se vuelven una** | la IA nombra a Andina Cargo |
| Cierre | 22–24 | 52,5–60 | resolución hacia el **reveal sin voz** del kit (el video ya cierra con locución) | logo y órbita |

**Ducking:** la música baja 8–10 dB bajo la VO y sube en S2 y S8 (silencios de voz).

## 5. La voz de los Sparks y los SFX [propuesta]

**Los Sparks no hablan.** Su voz son **gorjeos tonales de dos o tres notas** derivados del motivo del logo sonoro
(Mi · Mi · Mi) en timbre FM (línea Engine): cada Spark tiene una variación propia de altura. El gesto sonoro mayor de
la pieza —**las tres notas que se vuelven una**— cae cuando la IA nombra a la marca (S9): el logo sonoro *es* el
desenlace.

| Toma | Tiempo | Elemento | Tipo | Nota |
|---|---|---|---|---|
| S1 | 0,0 | ambiente de oficina de tarde: tono de sala, ciudad lejana | ambiente | continuo hasta S4 |
| S1 | 1,5–3,5 | tecleo de Tomás + envío de la pregunta | foley + UI | el envío es un clic cálido, no un sonido de app reconocible |
| S2 | 5,5 | aparición de la respuesta | UI | suave «pop» descendente |
| S2 | 8,5 | silencio de un pulso | ausencia | el hueco *es* el mensaje |
| S3 | 10,0 | la pantalla se ilumina como portal | VFX | brillo con cola de reverberación |
| S3 | 11,0 | zumbido de flotación del Spark (grave, suave) | SFX de personaje | cada Spark con su altura; nunca constante encima de la VO |
| S3 | 12,0 | destello de la chispa de la antena | SFX | campanita FM breve |
| S3 | 13,0 | gorjeo «hola» del Spark de investigación | voz de Spark | dos notas ascendentes |
| S4 | 15,5–19 | llegan los demás Sparks: un gorjeo cada uno, escalonados | voz de Spark | arman el acorde de la pieza |
| S4 | 19,5 | Tomás da la señal: chasquido suave | foley | |
| S4→S5 | 20,0 | **paso a través del anillo de órbita** | transición | whoosh con barrido estéreo de izquierda a derecha |
| S5 | 20–27,5 | ambiente «mundo de las respuestas»: aire, brillos de datos | ambiente | reemplaza la oficina |
| S5 | 22–26 | fuentes que se encienden: plucks afinados a la tonalidad | SFX | uno por fuente que aparece, en negras |
| S6 | 27,5–35 | tarjetas que se ordenan (papel digital liviano), fichas que se conectan (chispas cortas) | SFX | sincronía con cada conexión del mapa |
| S7 | 35–38 | gráfico que sube | SFX | riser corto, termina en el compás |
| S7 | 38,5 | Tomás aprueba: toque cálido | foley + UI | firma sonora de «visto bueno» que se reusa |
| S7→S8 | 40,0 | barrido de cámara | transición | whoosh corto, vuelve el ambiente de oficina |
| S8 | 41–43 | tecleo y envío (mismo sonido que S1) | foley + UI | rima con el inicio |
| S9 | 46,0 | **la IA nombra a la marca: las tres notas se vuelven una** | logo sonoro | el mayor gesto de la mezcla |
| S9 | 48–51 | los Sparks celebran: gorjeos en acorde mayor | voz de Spark | debajo de la VO |
| S10 | 52,5–57 | los Sparks forman la órbita alrededor del logo | SFX | brillos en el pulso |
| S10 | 57,5 | **reveal sin voz** del kit, timbre FM | logo sonoro | bajo las últimas palabras; cola hasta 60 s |

**Producción de SFX [propuesta]:** gorjeos sintetizados con la identidad sonora como fuente (no síntesis genérica);
SFX puntuales con ElevenLabs SFX; foley de librería. Todo con licencia registrada.

## 6. VFX por toma [propuesta]

Lo que se pide **en la generación** (luz, volumen, cámara, partículas) y lo que se hace **en post** (todo lo exacto y
la unificación). Regla de marca: **los Sparks nunca se espejan** (el anillo cambiaría de lado) y nunca cambian de forma
ni color.

| Toma | Generación (H3 desde cuadros clave) | Post (propio) | Riesgo |
|---|---|---|---|
| S1 | luz cálida de lámpara + brillo frío de pantalla en la cara; polvo en el aire; push-in | caja de la pregunta exacta compuesta en la pantalla del inserto siguiente, no aquí | manos al teclear (R alto): plano medio, manos desenfocadas |
| S2 | — | **UI exacta** (recursos AEO de AXIS): pregunta, respuesta con tres marcas ficticias, cursor | marcas ficticias revisadas para no coincidir con reales |
| S3 | la pantalla brilla y ondula como portal; el Spark emerge con luz de borde azul; dolly hacia atrás | refuerzo del brillo (bloom) | que el Spark salga deformado: cuadro inicial y final aprobados |
| S4 | plantel frente a Tomás; LEDs iluminan su cara; arco de cámara corto (no órbita completa) | — | **una órbita completa obliga a inventar la vista trasera y puede espejar el anillo** → arco ≤ 30° |
| S4→S5 | — | **paso a través del anillo de órbita** como cortinilla vectorial exacta | — |
| S5 | constelación de fuentes, rayos volumétricos, profundidad por capas; grúa ascendente | líneas finas de conexión reforzadas si hace falta | que el «mundo» se vuelva fotorrealista: piloto de estilo |
| S6 | tarjetas holográficas, mapa de entidades que se conecta; travelling lateral | — | accesorios correctos por Spark (lupa, tarjeta, fichas, gráfico) |
| S7 | gráfico de tres barras que sube; Tomás aprueba (gesto de mano) | — | mano en primer término (R): gesto simple |
| S8 | regreso a la oficina, misma luz que S1; push-in | — | continuidad de luz con S1 (mismo cuadro clave base) |
| S9 | reacción breve de Tomás (2,5 s) | **UI exacta** con la mención de Andina Cargo y su fuente; Sparks compuestos celebrando en el borde (SVG/rig exactos) | — |
| S10 | — | **cierre propio**: los Sparks (rig/SVG) orbitan el logo; «Efeonce AEO · AI Visibility Report»; firma | — |
| Toda la pieza | — | grade común (noche azul profunda + lámpara cálida), textura sutil de grano, subtítulos | que diez tomas no parezcan una: biblia de luz + grade |

## 7. Plan de tomas y empalmes

| Toma | Dur. | Origen | Cámara | Empalme con la siguiente |
|---|---|---|---|---|
| S1 | 5 s | H3 (cuadro inicial + final) | push-in lento | entra en la pantalla (corte en el zoom) |
| S2 | 5 s | propio | zoom a la lista | la pantalla se vuelve portal (el último cuadro de S2 es la base del primero de S3) |
| S3 | 5 s | H3 | dolly hacia atrás | coincidencia de movimiento |
| S4 | 5 s | H3 | arco corto | paso a través del anillo (cortinilla propia) |
| S5 | 7,5 s (genera 8) | H3 | grúa ascendente | **encadenamiento**: último cuadro real → primero de S6 |
| S6 | 7,5 s (genera 8) | H3 | travelling lateral | corte en la acción |
| S7 | 5 s | H3 | push leve | barrido de cámara |
| S8 | 5 s | H3 | push-in | entra en la pantalla |
| S9 | 7,5 s | propio (5) + H3 (2,5 de 5) | inserto + reacción | los Sparks salen de la UI hacia el cierre |
| S10 | 7,5 s | propio | — | fin |

**Generado con H3:** ≈ 45 s de pantalla (≈ 48 s pedidos). **Propio:** ≈ 15 s (UI, cortinilla, cierre) + todo el audio y
el montaje.

## 8. Mezcla y entrega

- Prioridad: VO > logo sonoro > SFX de historia > música > ambiente.
- Loudness: **-16 LUFS integrados, -1 dBTP** (web y LinkedIn); versión a -14 LUFS si va a YouTube [pendiente: destino].
- Stems: VO · música · SFX · ambiente; versión **M&E** (sin VO) para otros idiomas.
- **Subtítulos [decisión del operador, 2026-10-03]**: en español, **quemados** en la versión para redes y **SRT** aparte
  para YouTube, LinkedIn y el sitio. Borrador con tiempos provisorios en [`SUBTITULOS.es.srt`](SUBTITULOS.es.srt): se
  re-sincroniza contra la toma real de la voz. Reglas: máximo 2 líneas y ~42 caracteres por línea; cada subtítulo
  ≥ 1 s en pantalla; nunca sobre la interfaz legible de S2 y S9 (ahí, arriba o se omite porque la pantalla ya lo dice);
  tipografía Poppins Medium blanca sobre caja navy al 80 %, en el tercio inferior y dentro de las zonas seguras. En el
  SRT accesible se agregan descriptores mínimos de sonido (`[gorjeos de los Sparks]`, `[música]`); en los quemados, no.
- Escucha perceptual separada de la medición (regla del método).

## 9. Presupuesto de audio y preproducción (estimado, a confirmar con cada herramienta)

| Ítem | Herramienta | Costo |
|---|---|---|
| VO (≈ 95 palabras, 2–3 tomas) | ElevenLabs (voz de librería con licencia) | bajo; estimar al elegir la voz |
| Música (arreglo audio-to-audio, 2–3 intentos) | Stable Audio 2.5 vía fal (guía §5.9) | bajo; estimar antes |
| SFX (≈ 20 elementos) | ElevenLabs SFX + librería | bajo |
| Gorjeos de los Sparks | síntesis propia desde el logo sonoro | 0 en créditos |
| Mezcla, master, stems | propio (ffmpeg) | 0 en créditos |

El video (cuadros clave, piloto y tomas H3) se presupuesta aparte: ≈ USD 16 con reserva.

## 10. Decisiones que necesito del operador

1. ~~Historia~~ **aprobada** (Andina Cargo) — 2026-10-03; protagonista **Tomás Ríos** del elenco 2D, canonizado el mismo día.
2. ~~VO~~ **con VO, acento chileno, ElevenLabs (v4 si existe)** — 2026-10-03.
3. Voz del narrador: ¿femenina, masculina o neutra? ¿algún tono de referencia?
4. Música: ¿arreglo nuevo desde el material de marca (recomendado) o edición de la pieza del kit?
5. Destino: ¿orgánico, landing o también pauta? (define loudness y revisión de derechos de música y voz).
6. URL del cierre (AI Visibility Report / AEO Assessment).

## 11. Producción y cierre (2026-10-03)

**Entregable:** `final/sparks-aeo-60s-1080-es.mp4` (1920×1080, 24 fps, 59,96 s, subtítulos quemados) y
`final/sparks-aeo-60s-1080-es-sin-subtitulos.mp4`. Audio `audio/master-60s.wav`: −16,0 LUFS integrado,
−1,0 dBTP, LRA 7,1 LU. Stems en `audio/stems/` (voz, música, SFX, premaster). Subtítulos laterales
`SUBTITULOS.es.srt` (diálogo) y `SUBTITULOS.es.sdh.srt` (con descriptores de sonido).

**Locución.** Voz «Andre – Clear Studio Voiceover Narration» (`K7vlllngMGapgRQRDsqK`, es-latam) con
`eleven_v4` y etiquetas de interpretación (`[curious]`, `[excited]`, `[warmly]`, `[dramatically]`), vía el
conector ElevenLabs Creative (flow «Sparks × AEO · locución 60 s»). Dos tomas por línea; se montó la t1 de
cada una por calce de tiempo (`audio/vo/montaje-vo.py`). La elección es **por medición, no por escucha**:
falta la revisión de oído del operador; las t2 están en `audio/vo/tomas/` para reemplazar sin regenerar.
El llamado a la acción de S10 va a tempo 1,04 para cerrar antes del final.

**Mezcla** (`audio/mezcla-final.py`): voz +7 dB con compresión suave; cama −5 dB con ducking por la voz
(sidechain 6:1); bus SFX −1 dB; reveal de marca a 55,4 s con ducking leve. Balance medido: con voz, la mezcla
está a 0,3–0,9 dB de la voz sola (música y SFX ~10 dB debajo); en S2 y S8 la música sube.

**Gasto medido.** fal (H3, tomas y pilotos): USD 4,38. Keyframes GPT Image: dentro de lo autorizado.
ElevenLabs: el estimado decía 71 créditos por toma corta (~USD 0,016); el run reportó 0 créditos por
generación. Higgsfield: créditos de casting de voz. Total bajo el tope de ~USD 8.

**Lecciones que valen para la próxima.**
- H3 base con `--prompt-expansion disabled` es más fiel que H3 Max (Max gira los Sparks en 3D).
- Cuadro inicial y final deben compartir el eje de cámara, o la toma salta.
- El prompt de video debe prohibir texto en pantalla (si no, aparece texto ilegible) y fijar la paleta.
- Tope de 15 s por request en fal y Higgsfield (verificado): las escenas cortas son límite, no preferencia.
- Sin ASR local no hay verificación automática del texto dicho; dejar la revisión de oído como paso explícito.

## 12. Corte v2 (2026-10-03, feedback del operador)

**Pedido:** marcas reales en vez de «[Marca ficticia]», zoom de S2 fluido, guion fiel a Efeonce AEO (los Sparks no
«existen para arreglar el AEO»), todo más ágil y una cama punk con el sonic brand como referencia.

- **S2/S9** (`corte/ui-s2-s9.cjs`): cada cuadro se dibuja desde el vector con escala decimal (el `zoompan` redondeaba
  a píxeles enteros y saltaba). Competencia inventada: Rodavía, Kilomar, TrazaNorte (sin empresa homónima en la
  búsqueda del 2026-10-03). La burbuja de la pregunta se ensanchó: el texto se salía.
- **Guion v2:** Efeonce AEO como la capacidad; los Sparks como los agentes de Efeonce que trabajan con el equipo;
  el proceso medir → ordenar → reporte; S9 sin promesa de resultado. Voz Andre (`eleven_v4`, etiqueta `[fast]`) +7 %.
  El llamado a la acción va sobre la placa AEO / AI Visibility Report y «Efeonce AEO.» firma sobre el reveal.
- **Corte** (`corte/corte-v2.py`): 46,5 s, tomas a 1,25×–1,5× y recortadas; un solo mapa de tiempos re-tima video,
  voz, efectos y subtítulos. El logo sonoro intermedio (v1, 46 s) salió: chocaba con la voz y el reveal ya lo trae.
- **Cama punk** (`audio/musica/regrabar-punk.ts`): pieza larga de energía oficial (AXIS sonic v1, sha256 verificado)
  reordenada a 56 s y acelerada a 160 BPM (42 s), regrabada con Stable Audio 2.5 audio-to-audio a 0,8
  (USD 0,20 medido por pieza; se hicieron 0,65 y 0,8). Conserva los 160 BPM. Salió cargada de graves (medios 21 %
  contra ~35 % de la norma): se ecualizó (−4 dB bajo 180 Hz, +2 dB a 2,5 kHz). Corta en seco al entrar el reveal.
- **Excepciones al canon sonoro, por decisión del operador:** registro de energía debajo de una locución (el canon lo
  prohíbe) y licencia comercial de Stable Audio aún sin confirmar con legal.
- **Mezcla** (`audio/mezcla-v2.py`): ducking 8:1 de la cama por la voz; la mezcla queda a 0,2–1,2 dB de la voz sola en
  todos los tramos con voz. Master −16,0 LUFS / −1,0 dBTP.
- **Pendiente:** escucha del operador (voz, cama punk y balance). Las tomas t2 de voz están en `audio/vo2/tomas/`.
- **Cierre (ajuste del operador, mismo día):** la frase completa «Efeonce AEO. Mide tu visibilidad… con nuestro AI
  Visibility Report.» va sobre una **placa animada** (`corte/placa-cierre.cjs`, 6,54 s): los Sparks entran
  escalonados con rebote y flotan al compás; el logo AEO aparece con «Efeonce AEO» y, con «AI Visibility Report», se
  corre y entra el del Report. El reveal del logo con el eslogan queda **sin voz**. Para que quepa: reacción de Tomás
  −0,5 s y la cama +2 compases (repite 33–36 s del coro); la banda corta en seco al entrar el logo. Duración: 49,6 s.
