# Inventario de hechos — spot animado «Sparks × Efeonce AEO» (2026-10-03)

Fuente única para la flota de documentación. Todo lo que no esté aquí o en `PREPRODUCCION.md` §11–12 no se afirma.
Convenciones: **[medido]** observado en archivo/corrida · **[decisión del operador]** lo dijo Julio Reyes · **[criterio]**
recomendación propia · **[pendiente]** no resuelto.

## 0. La pieza

- Spot de marca animado 2D, tipo explainer, 16:9, 1920×1080, 24 fps. v1 60 s; **v2 aprobada 49,6 s** («Quedó genial…
  Muy bueno», operador 2026-10-03). Archivo: `final/v2/sparks-aeo-v2-1080-es.mp4` (+ `-sin-subtitulos`). [medido]
- Tipo de animación: 2D cartoon cel-shaded (estilo A del elenco 2D: contorno navy grueso, un escalón de degradado,
  sombras duras) + tomas image-to-video guiadas por cuadro inicial/final (MiniMax H3 vía fal) + motion graphics
  vectoriales deterministas (pantallas de chat, placa de cierre) + composición y post. Híbrido: lo de marca se COMPONE.
- Historia: Tomás (marketer ficticio del elenco 2D, cliente en la ficción) pregunta a la IA por «el mejor software de
  gestión de flotas en Chile»; la IA nombra a la competencia; sale un Spark del portal; Tomás da la señal a los cuatro
  Sparks; investigan fuentes, ordenan contenido/entidades, reportan; Tomás aprueba; vuelve a preguntar y la IA nombra a
  Andina Cargo (marca del cliente en la ficción) con su fuente; cierre con placa AEO + AI Visibility Report y reveal del
  logo Efeonce con eslogan.

## 1. Preproducción (en orden)

1. Brief del operador: 60 s, 16:9, MiniMax H3, con historia, cámara que se mueve, 2D con profundidad y luz. Orden pedido:
   historia/audio/SFX/VFX primero → storyboard en canvas → producción con el modelo sólo al cerrar. [decisión]
2. `PREPRODUCCION.md`: historia, guion VO por escena, música, voz de los Sparks y SFX, VFX por toma, plan de tomas y
   empalmes, mezcla y entrega, presupuesto, decisiones pendientes. [medido]
3. Storyboard en canvas (artifact): lámina Main, S01–S10, Timeline; luego láminas Elenco2D-estilo, Elenco2D-hojas,
   Cuadros-clave. El operador comentó sobre las láminas (comentarios de artifact) y aprobó por escena. [medido]
4. Elenco: el borrador usaba a Karo (elenco fotográfico). **Regla: el elenco fotográfico representa al equipo Efeonce y
   no puede hacer de cliente.** Solución aprobada: elenco 2D ficticio de 4 (Tomás, Camila, Renata, Mateo), con sello
   Efeonce sutil (rim light azul #0375db + un objeto azul por personaje; sin órbitas/esferas en personajes). Hechos a mano
   con motor de imagen + hojas de giro y expresiones; aprobados («Me encantan, están aprobados todos») y canonizados en
   `docs/operations/brand-characters/EFEONCE_2D_CAST_V1.md`; refs en `ai-generations/_identidad-elenco-2d/`, selladas en
   `scripts/foto/assets.lock.json` (560 assets) y publicadas al canon GCS; `scripts/foto/build-prompt.mjs` declara
   `ELENCO_2D` y el rol `ilustracion-2d`. [medido]
5. Voz: operador pidió «narrador de Nickelodeon en español» + subtítulos. Casting en Higgsfield (text2speech_v2 variante
   elevenlabs, 3 voces: Marcus, Andre, Julián); eligió Andre. El MCP local de ElevenLabs tenía la API key mal configurada
   (no se tocó); el operador señaló el conector **ElevenLabs Creative (MCP) con `eleven_v4`**, más expresivo. [medido]
6. Duración por toma: el operador preguntó por qué escenas si MiniMax permitiría 30 s; se verificó en docs/vivo:
   **tope 15 s por request en fal y Higgsfield**. Las escenas cortas son límite real + control. [medido]

## 2. Producción de imagen (cuadros clave)

- GPT Image 2.5 Sunburst (`pnpm ai:image`, 2048×1152 high ≈ USD 0,042 + entrada) con las hojas del elenco como ref.
- **Sparks NUNCA generados por el modelo**: compuestos desde el SVG oficial (`@efeoncepro/axis-brand-assets`
  sparks-2d), sin espejar (`cuadros/compose-sparks.cjs`, halo radial screen). Mirada: se emula el `lookAt` del rig —
  la cara LED (entre el reflejo del visor y los botones) se traslada dentro del clip del visor (elipse cx200 cy196 rx96
  ry48) x·0,3·96, y·0,28·48; cuerpo rotate(x·5) en (200,215) (`cuadros/spark-mirada.cjs`). El operador pidió que el
  Spark mire a Tomás («¿no debería estar mirando a Tomás?») y lo aprobó.
- Pasada de acabado SOLO de luz sobre los Sparks y `cuadros/merge-zonas.cjs`: mezcla manual con máscara elíptica
  difuminada; sale con código 1 si cambia un píxel fuera de zonas+margen. Resultado: 0 píxeles cambiados fuera. [medido]
- Trampas: sharp `removeAlpha` al final del pipeline perdía el `joinChannel` (se reescribió mezcla manual);
  `limitInputPixels:false` con SVG a alta densidad; rmbg recortaba el pantalón navy (usar recortes de cintura arriba).

## 3. Producción de video (tomas)

- MiniMax H3 vía fal (`pnpm ai:fal`), 768P (1344×768), H3 base USD 0,06/s. Piloto S3 primero (autorizado USD 0,72),
  S3 v2 (USD 0,50), luego toda la producción autorizada. fal medido total: USD 4,38 (video) + 0,40 (música) = **USD 4,78**.
- Hallazgos H3 [medido en esta corrida]:
  - **H3 base con `--prompt-expansion disabled` es más fiel que H3 Max; Max gira los Sparks en 3D.**
  - Cuadro inicial y final deben compartir el eje de cámara; si no, la toma salta de trayectoria.
  - El prompt debe **prohibir texto en pantalla** (si no, escribe texto ilegible): S1 y S8 se rehicieron.
  - **Fijar la paleta** en el prompt: S6 se fue al verde y se rehízo.
  - `--estimate` de fal colgaba subiendo PNG de 3,5 MB: usar JPG y precios publicados.
  - 1080P no existe en h3-i2v (480P/768P/2K/4K); h3max-i2v no tiene 2K (sondeo de flags).
- Upscale a 1080: `scale=1920:1097:flags=lanczos,crop=1920:1080,unsharp=5:5:0.35`. [medido]

## 4. Posproducción

- Primer corte mudo con placas provisorias (`corte/placas-provisorias.cjs`) para ritmo; placas finales 1080 (`corte/placas-1080.cjs`).
- **Pantallas de chat (S2/S9) y zoom**: `zoompan` de ffmpeg redondea el encuadre a píxeles enteros → salta. Solución:
  `corte/ui-s2-s9.cjs` dibuja cada cuadro desde el vector con escala decimal (SVG → sharp raw → ffmpeg). [medido]
- Placeholders «[Marca ficticia A/B/C]» llegaron al final y el operador los vio; se reemplazaron por marcas inventadas
  Rodavía, Kilomar, TrazaNorte (sin empresa homónima en búsqueda web del 2026-10-03). La pregunta se salía de la burbuja
  (defecto ya presente en v1, no detectado): se ensanchó. Lección: mirar cuadros al 100 % antes de entregar.
- Subtítulos: ffmpeg local sin libass → cada cue como PNG transparente 1920×1080 (Poppins Medium 46 px, blanco sobre navy
  #001a33 al 80 %, rx 14), overlay con `enable=between`. En pantallas de UI el cue sube (margen 200 px) para no tapar la
  barra de escritura. SRT de diálogo + SRT SDH con descriptores de sonido. (`corte/subtitulos-v2.cjs`)
- v2 (feedback «va muy lento… querías cumplir el minuto»): `corte/corte-v2.py` con UN mapa de tiempos (segmento,
  velocidad 1,0–1,5×, duración conservada) que re-tima video, voz, efectos (remapeo de eventos del bus) y subtítulos.
  **Al re-timar, sonidos con tiempo absoluto chocan con la voz**: el logo sonoro intermedio cayó sobre la voz de S9 y se
  quitó (el reveal ya lo trae).
- Cierre (feedback del operador): la frase completa «Efeonce AEO. Mide tu visibilidad en los motores de respuesta de IA
  con nuestro AI Visibility Report.» va sobre una **placa animada** (`corte/placa-cierre.cjs`, 157 cuadros = 6,54 s):
  Sparks entran escalonados con ease-out-back y flotan con período de un compás (1,5 s a 160 BPM); logo AEO aparece con
  «Efeonce AEO»; con «AI Visibility Report» el AEO se corre y entra el del Report. **El reveal del logo Efeonce con
  eslogan queda sin voz** (la voz encima le quitaba fuerza). La banda corta en seco al entrar el logo (45,0 s).
- Ensamble: `corte/ensamblar-v2.py` (con y sin subtítulos). `overlay` necesita `shortest=1` + `-t` explícito o el video
  se alarga (salió 49,2 s en vez de 46,5).

## 5. Audio

- Kit sonoro oficial desde el bucket público AXIS (sha256 verificados contra `https://axis.efeonce.org/references/sonic-brand.json`).
- VO v1: Andre (`K7vlllngMGapgRQRDsqK`, «Andre – Clear Studio Voiceover Narration», es-latam, biblioteca ElevenLabs;
  distinta de la «Andre» preset de Higgsfield) con `eleven_v4` vía `creative_generate_speech` (flow
  «Sparks × AEO · locución 60 s»); `estimate_only` dio 71 créditos/toma corta (~USD 0,016); el run reportó 0 créditos.
  `generations_count` por defecto 4 → usar 2. Etiquetas v4: [excited] [curious] [warmly] [dramatically] [fast].
- **Guion v2** (operador: «la premisa no es que los Sparks existen para arreglar el AEO»; se cargaron `seo-aeo`,
  `seo-aeo-practice` y el canon SPARKS_V1): Efeonce AEO = la capacidad; los Sparks = los agentes de Efeonce que trabajan
  con el equipo, siempre supervisados; proceso medir → ordenar → reporte → tú decides; S9 sin promesa de resultado
  («tiene con qué nombrarte»). Regla de la práctica: nunca prometer aparición/citación en IA. Líneas finales en
  `audio/mezcla-v2.py` (tabla VO) y `SUBTITULOS-v2.es.srt`.
- VO v2 con [fast] + atempo 1,07. Selección de tomas por calce de tiempo (silencedetect −42 dB); **sin ASR local**: no se
  verificó automáticamente el texto dicho; la escucha del operador es el control.
- SFX v1 sintetizados con ffmpeg (aevalsrc/anoisesrc): pop, gorjeos, whoosh, portal, riser, aprobado, clic, pluck;
  `audio/bus-sfx.py` (46 eventos).
- **Cama punk** (operador: «ponle un ritmo más punk, pásale el sonic brand como referencia»): pieza larga de ENERGÍA
  oficial (AXIS sonic v1, 120 BPM, sha256 1b23b0a1…) reordenada intro·V·V2·C·V·V2·C·B (56 s) y `atempo=1.3333` →
  160 BPM, 42 s exactos (Stable Audio redondea a segundos) → Stable Audio 2.5 audio-to-audio
  (`audio/musica/regrabar-punk.ts`, USD 0,20 medido por pieza; 0,65 y 0,8; elegida 0,8). Conservó el tempo (autocorrelación
  fuerte a 80 = medio compás de 160). **Salió cargada de graves: medios 21 % vs ~35 % de la norma** → EQ −4 dB bajo
  180 Hz, +2 dB a 2,5 kHz. v2 final: +2 compases (repite 33–36 s del coro) para llegar al reveal.
- **Excepciones al canon sonoro por decisión del operador**: registro de energía debajo de locución (EFEONCE_SONIC_IDENTITY_V1
  lo prohíbe) y licencia comercial de Stable Audio sin confirmar con legal [pendiente].
- Mezcla v2 (`audio/mezcla-v2.py`): voz +7 dB con compresión suave; cama con sidechain 8:1 (umbral 0,02); reveal con
  sidechain 5:1; master loudnorm dos pasadas −16 LUFS / −1 dBTP. Balance medido: con voz, mezcla a 0,2–1,2 dB de la voz sola.

## 6. Costos

fal USD 4,78 (H3 + Stable Audio) · GPT Image: cuadros clave y hojas dentro de lo autorizado (USD 2,10 cuadros; hojas
del elenco aparte) · ElevenLabs 0 créditos reportados · Higgsfield: créditos del casting. Tope de referencia ~USD 8.

## 7. Lecciones (para el método transversal)

1. El ritmo lo pone la historia, no la duración del brief (no estirar tomas para llenar 60 s).
2. Copy de capacidad/oferta: cargar las skills dueñas (ej. `seo-aeo-practice`) y el canon de personajes ANTES de escribir la VO.
3. Lo de marca se compone (SVG oficial, vectores, logos); el modelo sólo pone luz y movimiento; verificar 0 px fuera.
4. H3: base > Max para fidelidad; mismo eje inicio/fin; prohibir texto; fijar paleta; tope 15 s.
5. Mirar cuadros al 100 % antes de entregar; resolver placeholders.
6. Re-timar desde un solo mapa de tiempos.
7. `zoompan` salta; para vectores, cuadro a cuadro con escala decimal.
8. El logo final respira sin voz; la frase de cierre va sobre la placa previa.
9. Declarar lo que no se pudo verificar (sin escucha propia, sin ASR).
10. Elenco: quién aparece importa (equipo ≠ cliente).

## 8. Pendientes vigentes

- Publicar el elenco 2D en AXIS (packages + Lab) — en curso tras esta documentación.
- Portada Instagram 4:5 y portada LinkedIn 16:9 de alto impacto; versión Instagram con pantalla negra muda inicial y
  animación vectorial de un teléfono genérico (sin botones, no iPhone) con flechas de girar la pantalla — en curso.
- Licencia Stable Audio; prueba de reconocimiento del elenco 2D; derechos del elenco.
- Escucha del operador fue la aprobación (v2 aprobada).

## 9. Rutas

Run `ai-generations/2026-10-03_sparks-aeo-60s/` (scripts y md en git; media gitignored). Commits: `eb08704da` (v1 voz/mezcla),
`178c73c6c` (v2), `81b171fc6` (cierre). `PREPRODUCCION.md` §11–12.
