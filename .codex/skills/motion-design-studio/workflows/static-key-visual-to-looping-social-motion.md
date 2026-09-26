# Static key visual aprobado → loop de social

> Estado: **validado** — 2026-09-22 · Evidencia:
> `ai-generations/2026-09-22_motion-codex-rueda-prensa/` (prompts en `brief/`, masters en `out/`) ·
> entrega y bitácora: `.../Paid Media/03. Finales/2026-09-22_SEO-AEO_motion_vocero-no-autorizado/LEEME.md`
> · **primer motion de Efeonce**, CMP-001 «la IA dice de ti», capítulo «No fuiste tú».
> Aprobado creativo por el operador; **aprobado ≠ autorizado a pautar**.

## Cuándo usarla

Cuando ya existe una **pieza estática aprobada** —plate, capa AXIS, titular, selección y CTA— y la campaña
necesita esa misma pieza **en movimiento** para el feed, sin inventar un lenguaje paralelo al fotográfico ni
rehacer la dirección de arte. El loop no agrega argumento: hace que el argumento del estático **ocurra en el
tiempo**, y tiene que entenderse **con el sonido apagado**, que es como se ve el 90 % del feed.

No usarla cuando el estático todavía no está aprobado (el motion hereda sus defectos amplificados), cuando la
pieza exige un **logotipo exacto** dentro del cuadro (eso se compone en post, ver gotchas), o cuando lo que
falta es una **toma nueva** —otra acción, otro ángulo, otra causalidad física—: eso es producción de toma, no
adaptación de un key visual.

## Contrato

- **Input:** el estático compuesto aprobado (con CTA), su plate limpio sin texto, y las poses del personaje
  ya generadas en su kit.
- **Locks:** encuadre, set, paleta, tipografía, jerarquía del texto, copy, ratio del master, cámara fija.
- **Variable:** timing de los beats, gesto del personaje, diseño sonoro, ratios derivados.
- **Output:** master nativo en su ratio + recomposiciones; primer y último cuadro **idénticos**.
- **Gate humano:** revisión completa a 1× con y sin sonido antes de declarar la pieza cerrada.

## Pasos (encadenados)

1. **Elige el motor por contrato de fidelidad, no por ranking general.** Para imagen/referencias a video
   **con audio** el motor del carril es la familia H3 Max (`h3max-r2v`), no la que lidera los rankings
   generales. Tarifas, cupos de referencias, resoluciones y el «cuándo NO» de cada familia viven en la
   [guía canónica de selección de modelos](../../../../docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
   (§3 árbol de video, §4.2 matriz, §5.5 ficha H3) — **no se copian acá**.
2. **Arma las cuatro referencias, y pásalas: no se las pidas al modelo.** El reparto validado:

   | # | Qué es | Qué aporta |
   |---|---|---|
   | 1 | la pieza estática compuesta **con CTA** | el look EXACTO del texto: tipografía, jerarquía, bounding box, cursores |
   | 2 | el **plate limpio** (sin texto) | la escenografía, sin que el modelo tenga que deducirla del texto |
   | 3 | pose del **gesto** (del kit 3D del personaje) | el gesto que hace, no el que el modelo imagine |
   | 4 | pose de **reposo** (del kit 3D) | el cuadro al que vuelve al cerrar el loop |

   🎯 **La escenografía la cargan las imágenes, no las palabras.** Todo lo que puedas mostrar con una
   referencia, quítalo del prompt: cada palabra de más es una instrucción que el modelo puede sobre-interpretar.
3. **Declara el ratio explícito.** El master nace nativo en su ratio; los demás se recomponen. Qué ratios
   existen de verdad en cada motor —y el 4:5, que **no existe en ninguno**— está en la guía canónica (§3).
   **Ningún `--aspect` se deja implícito ni en `adaptive`** (mismo §3 y §5.5): es la falla que cuesta tomas.
4. **Escribe el arco temporal con la forma correcta: entrada a ritmo → sostén largo → fade lento.** En la
   pieza validada, sobre 15 s: las líneas entran una a una hasta ~7 s, la composición completa se **sostiene
   quieta 5,5 s**, y recién entonces se disuelve en **1,3 s**. Numera los beats en el prompt con su segundo.
5. **Escribe el gesto como conducta, no como emoción.** El prompt describe qué hace el cuerpo y qué NO hace
   (ver §Dirección), no cómo debería sentirse el espectador.
6. **Diseña el sonido por sustracción** (ver §Audio): quita los términos que inducen habla en vez de prohibir
   más fuerte, y declara un marco donde la voz no cabe.
7. **Mide el loop entre el PRIMER y el ÚLTIMO cuadro reales** (ver §QA del loop), no contra muestras cómodas.
8. **Recompón los ratios que el motor no da nativos** y verifica cada master antes de entregar.

## Dirección — el hallazgo que vale más que la técnica

🎯 **La pieza no celebra.** El personaje remataba triunfal, con los brazos arriba y ojos sonrientes, y eso
**contradecía el texto**: la tesis no era triunfo, era **usurpación**. El espectador no es el público que
aplaude — es la marca de la que hablan sin permiso.

- Con el personaje celebrando, el espectador piensa «qué simpático»; con el personaje **indiferente**, siente
  el desaire. No es una fiesta: es un trámite al que no te invitaron.
- **La quietud es el centro emocional, no relleno.** Se alargó a propósito.
- **Aparecer lento ≠ desaparecer lento.** El primer intento de dar tiempo de lectura estiró la ENTRADA, y no
  era eso: lo que hacía falta era que la **composición ya armada se sostuviera**.
- Si el personaje tiene **pantalla por cara**, ése es su único músculo facial: glifos en reposo, ojos en el
  gesto. No necesita boca — y pedirle que hable es el error de origen.

**Regla portable:** antes de aprobar el gesto, pregúntate qué siente el espectador **sobre sí mismo**, no
sobre el personaje. Si el gesto lo invita a simpatizar cuando el copy lo señala, el gesto está mal.

## Audio — la receta, después de cinco intentos

La secuencia de fallas fue: balbuceo → banda de gaitas → suena a portugués → vuelve a hablar → mudo.

- 🔴 **La causa era estructural y medible, no de énfasis.** El prompt tenía **13 términos que inducen habla**
  («microphone» ×5, «statement» ×3, «announce» ×2, «spokesperson», «press conference», «declared») contra
  **2 prohibiciones de voz**. Se le pedía a un modelo que viera una rueda de prensa y no generara voz: **la
  escena inducía lo que el prompt prohibía**.
- ✅ **Lo que lo resolvió:** (a) **quitar los inductores en vez de prohibir más fuerte** — los micrófonos
  pasaron a «soportes con espuma en brazos de cromo», visualmente idénticos y semánticamente mudos; (b) **dar
  un marco donde la voz no cabe**: declarar la pieza **cine mudo con score**, que es autoconsistente, en vez
  de «hay una rueda de prensa pero nadie habla».
- 🔴 **Una referencia sonora equivocada produce el sonido equivocado, literalmente.** El «baile escocés» salió
  de pedir *brass band march* con tuba y caja — que es exactamente una banda de gaitas.
- 🔴 **El minionés no es un idioma inventado: es un pastiche de idiomas REALES** deformados (español, italiano,
  francés, inglés, japonés, coreano, hindi). Por eso reconoces palabras. En una pieza que hay que **leer** es
  el defecto, no la gracia: cada palabra reconocible es un segundo que el ojo deja de leer.
- **Sin música quedó mejor que con música.** Una fanfarria **abre una expectativa** de anuncio; como no viene
  nada, queda colgada. Sin ella, el vacío deja de ser un bache y pasa a ser el mensaje.
- ⚠️ **Revisa que el silencio no salga digital puro.** El master midió −163,9 dB, sin el room tone pedido, y
  eso puede leerse como audio cortado. Se arregla en post con una capa de ambiente muy baja; **no exige
  regenerar**.
- 🔴 **El RMS no distingue música de voz.** Sirve para probar que el silencio existe y para ubicar golpes de
  foley; **no** para afirmar que no hay habla. Eso lo juzga un oído.

## QA del loop

1. 🔴 **Mide entre el PRIMER y el ÚLTIMO cuadro reales.** Medirlo contra un cuadro intermedio que ya tiene
   texto encima da un **falso negativo**: pasó y se reportó mal antes de corregirlo.
2. Extrae ambos cuadros del master final —no de una versión previa— y compara la diferencia media por píxel.
   Progresión real de las iteraciones hasta cerrar: `7,84 → 1,09 → 0,96 → 0,56 → 0,55`.
3. El último cuadro debe quedar **completamente limpio**: si queda texto encima al final, el loop tiene costura
   aunque el número dé bajo.
4. Reproduce el master completo a 1× **con y sin sonido**. El número acredita continuidad; no acredita que la
   pieza se entienda.

## Plantilla de prompt

El prompt validado íntegro es el artefacto reproducible:
`ai-generations/2026-09-22_motion-codex-rueda-prensa/brief/loop-9x16-FINAL.prompt.txt`. Su esqueleto:

1. **Declaración del marco sonoro** en la primera línea (qué clase de pieza es en términos de audio).
2. **Qué es cada referencia** y para qué sirve (look del texto / set / pose A / pose B).
3. **EL SET**, tomado de la referencia limpia, con la cámara declarada fija.
4. **LA ACTUACIÓN**, como conducta y con lo que NO hace, tramo por tramo con sus segundos.
5. **EL ELEMENTO QUE NO CAMBIA** — en esta pieza, la barra que queda vacía los 15 s: es el remate.
6. **LA CAPA GRÁFICA**, beat por beat con su segundo, marcando explícitamente el **sostén largo** como el
   tramo más importante y prohibiendo animar durante él.
7. **TAMAÑO Y LAYOUT DEL TEXTO** en porcentajes del cuadro, no en píxeles.
8. **BANDA SONORA**: el marco, el ambiente de base y luego cada sonido discreto anclado a su segundo.
9. **Cierre fotográfico**: objeto real en set real, grano, profundidad de campo.

## Qué NO hacer / gotchas

- 🔴 **No dejes el ratio implícito ni en `adaptive`.** Cuesta tomas completas; el detalle está en la guía
  canónica (§3 y §5.5) y no se duplica acá.
- 🔴 **Texto sí, marca no.** En esta pieza la capa gráfica se generó **dentro** del video —contra el canon, que
  manda componer— y funcionó: volvió bien escrita, con tildes y tipografía correcta. La frontera real no es
  «texto sí / texto no»: **una marca no tolera "parecido"**. Si el logotipo tiene que ser exacto, **se compone
  en post**, siempre.
- **No prohíbas más fuerte lo que la escena induce.** Quita el inductor.
- **No estires la entrada para dar tiempo de lectura.** Alarga el sostén.
- **No midas el loop contra un cuadro cómodo.**
- **No cierres por el número del audio.** El RMS prueba que hay silencio; no prueba que no hay voz.
- **No declares la pieza autorizada a pautar** porque el operador aprobó lo creativo. Son dos permisos.

## Costo / gasto gobernado

- Producción completa, todas las iteraciones incluidas: **≈ USD 25,39** medidos, con `--max-usd` y `--yes`
  declarados en cada corrida.
- 🔴 **El dato que cambia el presupuesto de lo que venga:** las **dos** primeras tomas con el motor de ranking
  general costaron **12,48** y las **nueve** iteraciones con H3 Max costaron **9,96** — más de un orden de
  magnitud más barato por segundo (**≈13×**; las tarifas por escalón están en §4.2 de la guía canónica) y con
  render en ~20 s en vez de ~3,5 min. **Y en esta pieza salió mejor**: titular más grande y más nítido.
- Consecuencia operativa: **iterar dirección y sonido en el motor barato**, y reservar el caro sólo si una
  prueba con tu propio brief demuestra que gana en esa toma.

## Evidencia

- Corrida y prompts: `ai-generations/2026-09-22_motion-codex-rueda-prensa/`
  (`brief/loop-9x16-FINAL.prompt.txt`, `out/loop-9x16-1080p.mp4`, `out/loop-3x4-15s.mp4`,
  `out/loop-4x5-15s-FINAL.mp4`, `out/loop-1x1-15s.mp4`).
- Bitácora de entrega, decisiones y costos: `LEEME.md` de
  `.../Paid Media/03. Finales/2026-09-22_SEO-AEO_motion_vocero-no-autorizado/`.
- Capacidades, tarifas y ratios reales por motor:
  [guía canónica de selección de modelos](../../../../docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).
