# 08 · Color Grade & Finishing — el look y el master

> **Tesis.** El grade es donde un motion pasa de "salió del render" a "se ve como una película".
> Corrección **primero** (que todo sea técnicamente correcto y consistente), grading **después**
> (el *look* que carga la emoción). Con tomas IA el grade es **doblemente crítico**: cada toma
> generada llega con su propia temperatura, contraste y saturación, y sin un grade unificador la
> secuencia se lee como collage de fuentes distintas. El craft de color es **atemporal**; solo el
> **upscale IA** (§8) es volátil `(as-of 2026-07 — reverificar)`.

> Herramienta canónica de referencia: **DaVinci Resolve** (grade + finishing + entrega, tier pro,
> gratis). Cierra hacia `modules/10` (orquestación de finishing) y `templates/motion-delivery-spec.md`.

---

## 1. Corrección vs Grading — dos pasos, no uno

| | **Corrección de color** | **Color grading** |
|---|---|---|
| Objetivo | Balance técnico, neutralidad, consistencia | Look creativo, emoción, identidad |
| Preguntas | ¿Blancos neutros? ¿Piel natural? ¿Expuesto bien? ¿Match entre tomas? | ¿Cálido o frío? ¿Contraste alto o suave? ¿Qué siente? |
| Herramientas | White balance, exposure, lift/gamma/gain, curvas neutras | Color wheels creativos, LUTs de look, split-tone, curvas HSL |
| Orden | **Primero** | **Después** |

**Regla dura:** no metas el *look* sobre tomas que aún no están balanceadas entre sí. Primero
neutralizá y emparejá (§4); recién ahí aplica el grade creativo encima. Grade sobre base sucia =
inconsistencia que ningún look tapa.

---

## 2. Pipeline de grade (orden canónico en Resolve)

1. **Normalizar / manejar espacio de color** — Color Management (RCM/ACES) o LUT de conversión si
   el material viene en log/raw. Las tomas IA suelen venir en Rec.709 "display" — tratarlas como tal.
2. **Balance primario** — white balance, exposure, contraste base, lift/gamma/gain neutros. Piel y
   grises neutros correctos.
3. **Match de tomas** (§4) — emparejar toma a toma antes de cualquier look.
4. **Grade creativo / look dev** (§3) — el *look* de la pieza.
5. **Secundarios** — máscaras/qualifiers para retocar piel, cielo, un color de marca puntual, power
   windows, tracking de máscaras.
6. **Finishing** (§5) — grano, viñeta, glow/bloom, halation, ajustes de textura.
7. **Trim / entrega** — chequeo en scopes, render por destino (§6/§7).

> Trabajá siempre con **scopes** (waveform, parade RGB, vectorscope), no solo a ojo. El monitor
> miente; los scopes no. Waveform para exposición/contraste, parade para balance, vectorscope para
> saturación y tono de piel (la "skin line").

---

## 3. Look dev — construir la emoción con color

- **Temperatura:** cálido (ámbar/dorado) = cercano, humano, nostálgico, aspiracional; frío
  (azul/cian) = tecnológico, serio, distante, nocturno. La temperatura es la decisión emocional #1.
- **Contraste:** alto = dramático, moderno, tenso; suave/lifted = íntimo, retro, soñado. El contraste
  fija cuánto "muerde" la imagen.
- **Saturación:** saturado = enérgico, pop; desaturado = sobrio, cine, serio. Casi nunca "todo
  saturado" — sube la saturación selectiva del color de marca y baja el resto.
- **Teal & Orange** — el look de blockbuster: piel cálida (naranja) contra sombras/fondo frío (teal).
  Funciona porque separa al sujeto del fondo por complementarios. **Está gastadísimo** — úsalo con
  criterio, no por default.
- **Alternativas al teal&orange (2026):** paletas análogas (una familia de tono, ej. ocres+verdes),
  bleach-bypass (desaturado + alto contraste, plata), pastel lifted (negros levantados, baja
  saturación, aire), duotono/monocromo de marca, verde-magenta (thriller), cálido-cálido (dorado
  sobre ámbar, sin frío). Elige el look desde la marca y la emoción, no desde la moda.
- **Coherencia con la identidad:** el look debe convivir con la paleta de marca. Si el color de marca
  es un verde específico, el grade no puede virarlo. Fijá el look contra los tokens de marca
  (overlay Efeonce: `efeonce/EFEONCE_OVERLAY.md`).

---

## 4. Consistencia de color entre tomas — el problema #1 del video IA

**Con tomas IA, cada generación deriva:** distinta temperatura, contraste, saturación y hasta color
de piel, aunque el prompt sea el mismo. Sin match, la secuencia se ve rota. Disciplina de match:

- **Toma de referencia (hero shot):** elige la mejor toma como referencia y lleva todas las demás
  hacia ella. No emparejes contra el vacío — emparejá contra una referencia fija.
- **Método de match:** igualá en este orden — (1) negros/blancos (waveform), (2) balance/temperatura
  (parade), (3) contraste medio, (4) saturación (vectorscope), (5) tono de piel (skin line del
  vectorscope). El ojo salta si la piel o el punto negro no matchean.
- **Split-screen / stills de referencia:** compará toma-vs-referencia lado a lado. Resolve tiene
  memorias de stills (gallery) — guarda el grade de la hero y aplicalo como punto de partida.
- **Grade unificador por encima:** un nodo/ajuste de look común sobre toda la timeline (después del
  match individual) sella la cohesión. Es el equivalente visual del ambience unificador de sonido
  (`modules/07 §7`).
- **Consistencia de identidad (Soul ID/refs) upstream:** parte de la consistencia se gana **antes**
  del grade, en la generación (personaje/producto fijado, ver `modules/09`). El grade corrige la
  deriva de color; no arregla un personaje que cambió de cara.

**Checklist de consistencia:**
- [ ] Hero shot elegido como referencia.
- [ ] Cada toma matcheada en negros → balance → contraste → saturación → piel.
- [ ] Skin line consistente en el vectorscope entre tomas con personas.
- [ ] Grade unificador aplicado sobre toda la timeline.
- [ ] Chequeo final viendo la secuencia entera seguida (no toma por toma).

---

## 5. Finishing — grano, textura, viñeta, compositing

- **Grano / textura de film:** el grano rompe la "perfección" digital/IA y unifica la imagen. Overlay
  de grano film (o grano generado) con opacidad/blend sutil. También disimula banding y bordes de IA.
  Doctrina hecha-a-mano/imperfecta (§5 del SKILL): grano, grit, halation son intencionales.
- **Halation / bloom / glow:** el sangrado suave de las luces altas da calidez orgánica y "look de
  lente". Sutil — un glow exagerado se ve barato.
- **Viñeta:** oscurecer bordes dirige el ojo al centro/sujeto. Muy sutil; una viñeta obvia data la
  pieza. Sirve para pegar tomas de encuadres distintos.
- **Textura y compositing:** overlays de polvo, luz volumétrica, flares, papel/cinta (estética zine).
  Compositing de elementos (logo, título, partículas) sobre las tomas — el finishing es donde el
  mograph (`modules/05`) y el grade conviven.
- **Reducción de artefactos IA:** el grade + grano + un leve blur/sharpen selectivo suavizan los
  artefactos típicos de generación (bordes, banding, "shimmer"). El upscale (§8) también los limpia.
- **Sharpen final:** un sharpen leve de salida (después del grano) da mordida. Excesivo = halos.

---

## 6. Render — codecs, bitrate, color space

| Uso | Codec | Nota |
|---|---|---|
| **Master / archivo / entre-etapas** | **ProRes 422 HQ** o **ProRes 4444** (con alpha) | Editable, casi sin pérdida, pesado. El master del que salen todos los deriva |
| **Entrega web / social** | **H.264** (compatibilidad) o **H.265/HEVC** (mejor a igual bitrate) | Para publicar. H.265 para 4K/HDR eficiente |
| **Broadcast** | Según spec del canal (ProRes, XDCAM, DNxHD/HR) | Pedir spec exacta al canal |
| **Alpha / capas** | ProRes 4444 o PNG/EXR sequence | Cuando se necesita canal alfa o compositing posterior |

- **Bitrate:** más alto = más calidad, más peso. Guía web `(as-of 2026-07 — reverificar recomendación
  de plataforma)`: 1080p ~8-12 Mbps, 4K ~35-45 Mbps (H.264); H.265 rinde parecido a ~la mitad del
  bitrate. Para gráficos con degradados/motion limpio, sube el bitrate: la compresión banding-ea los
  degradados. Considerá 2-pass para entregas finales.
- **Color space de salida:** **Rec.709** para web/broadcast SDR (default); **P3 / Rec.2020 + HDR
  (PQ/HLG)** solo si el destino soporta HDR y el pipeline entero es HDR. **No entregues P3 a un canal
  Rec.709** — se ve desaturado/mal. Etiquetá el color space en el archivo.
- **Frame rate y resolución:** conservá el frame rate de la pieza (no convertir sin retiming); entrega
  a la resolución del destino. Detalle de spec por red en `social-media-studio`.
- **Chroma subsampling:** 4:2:0 para entrega estándar; 4:2:2/4:4:4 para masters, HDR o croma/keying.

---

## 7. Espacio de color y HDR — no arruines el master

- **SDR Rec.709** es el default seguro para web y broadcast. Gradúa y monitorea en Rec.709 salvo
  mandato HDR explícito.
- **HDR (P3/Rec.2020, PQ/HLG)** exige monitor HDR calibrado, pipeline HDR de punta a punta y spec del
  canal. No "actives HDR" sin eso — produce un master roto en pantallas SDR.
- **Metadata correcta:** un master mal etiquetado (P3 marcado como 709 o viceversa) se ve virado en el
  reproductor. Verificá tag de color en el archivo final.
- **QC final:** mira el master en al menos dos pantallas (una de referencia, una "de consumo" tipo
  celular/laptop). Chequea banding en degradados, clipping en altas, negros aplastados, y que el look
  aguante fuera del monitor de grade.

---

## 8. Upscale & enhance con Magnific `(as-of 2026-07 — reverificar)`

**Magnific** (MCP + API disponibles) es el paso de **finish de resolución/detalle**, distinto de un
upscale bicúbico: es **generativo** — "sueña" detalle plausible, no interpola.

| Tool Magnific | Qué hace | Cuándo usarlo en finishing |
|---|---|---|
| **Upscaler generativo** (2x–16x, hasta 8K) | Reimagina detalle ("generative hallucination") | Subir un frame/still o un plate a resolución de entrega con textura rica |
| **Video Sequence Enhancement** | Upscaling **frame-consistent**: analiza movimiento/textura/sujeto entre frames | Upscale de una **secuencia de video** sin que el detalle "hierva" frame a frame |
| **Video Upscaler Precision API** (diffusion) | Recupera detalle **sin agregar contenido IA** | Cuando quieres nitidez fiel, no reinvención (rostros, marca, texto) |
| **Reference Image** | Guía composición + textura/estilo del upscale | Mantener el look/estilo de marca al subir resolución |
| Sliders **Creativity / Resemblance** | Cuánto inventa vs cuánto respeta el original | Creativity alto = más detalle inventado; Resemblance alto = fidelidad |

- **Regla de uso:** para **video**, usa **Video Sequence Enhancement** (frame-consistent) — un upscale
  imagen-por-imagen genera *flicker/boiling* porque cada frame inventa detalle distinto. Para
  **frames sueltos/stills/keyframes** (que luego animás), el upscaler de imagen. Para nitidez fiel sin
  reinvención (texto de marca, rostros reconocibles), **Precision API** con Resemblance alto.
- **Dónde cae en el pipeline:** el upscale es paso de **finish**, casi al final — después del grade y
  el finishing, o sobre el master antes de la entrega en alta. Si upscaleás antes de graduar, graduás
  detalle inventado.
- **Gasto gobernado:** upscalear (sobre todo secuencias y 8K) **cuesta** (créditos/API). Dimensioná
  antes de correr sobre toda la pieza — prueba en una toma, valida el resultado, recién ahí volumen
  (ver regla dura de `modules/09` y `modules/10`). Disponibilidad: plugin Photoshop, API Python/Node.
- **Boundary:** Magnific **finaliza/upscalea**; **no** reemplaza el grade ni el sonido. Un frame 8K con
  mal grade sigue siendo mal motion.

---

## 9. Checklist de crítica de grade & finish

- [ ] Corrección hecha **antes** del look (base neutra y emparejada).
- [ ] Match de tomas verificado en scopes (no a ojo), skin line consistente.
- [ ] Grade unificador sobre toda la timeline; secuencia vista entera seguida.
- [ ] Look coherente con la marca (color de marca no virado).
- [ ] Grano/textura aplicados con sutileza; artefactos IA reducidos.
- [ ] Sin banding en degradados; negros no aplastados; altas no clipeadas.
- [ ] Codec/bitrate/color space correctos para el destino (Rec.709 default).
- [ ] Loudness del audio ya resuelto (`modules/07`) — grade y sonido cierran juntos.
- [ ] Upscale (si aplica) frame-consistent, después del grade, dimensionado.
- [ ] QC en dos pantallas; metadata de color verificada.

> **Handoff:** documenta el look (temperatura, contraste, saturación, referencias), el LUT/nodo base,
> el codec/bitrate/color space y el target de entrega en `templates/motion-delivery-spec.md`. La
> orquestación del finishing (quién hace qué, humano vs IA) vive en `modules/10`.
