# Primer motion ad de Efeonce · «No fuiste tú» — el vocero no autorizado

Fecha de registro: 2026-09-22. Owner: Social Media Studio / Advertising Creative.
Caso: **el primer motion de Efeonce**. Hasta esta sesión el lenguaje fotográfico estaba probado sólo en
estático; esta pieza lo lleva a video sin inventar un lenguaje paralelo: mismo plate, misma tesis, misma
capa AXIS, ahora en el tiempo.
Campaña **CMP-001 «la IA dice de ti»** · concepto capítulo 3, atril / «No fuiste tú».

**Estado:** aprobado por el operador el 2026-09-22. 🔴 **Aprobado ≠ autorizado a pautar.**

Bitácora técnica y creativa de la corrida. Las reglas transferibles viven en las skills y contratos
enlazados abajo; este documento registra lo que se midió, lo que costó y lo que se aprendió.

## 1. Mapa de autoridad

| Decisión | Fuente dueña |
|---|---|
| Motor de video, costo por resolución, estado de verificación | [Guía de selección de modelo](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) |
| Texto, CTA, cursores, bounding box, contraste y formatos | [Contrato publicitario](../ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md) |
| Clasificación, idea, papel de marca, producción y QA social | [Protocolo social](../SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md) |
| Campaña, ASSETS, decisiones y medición | [Continuidad CMP-001](2026-09-22-cmp-001-campaign-brief-handoff.md) · [Registro de campañas](../EFEONCE_CAMPAIGN_REGISTRY_V1.md) |
| Dirección, concepto y correcciones de rumbo previas a producir | [`BRIEF-MOTION-V1.md`](../../../ai-generations/2026-09-22_motion-codex-rueda-prensa/BRIEF-MOTION-V1.md) |
| Poses del personaje | [Kit de poses 3D de Codex](../../../ai-generations/2026-09-17_codex-poses-3d/) · [Bibliotecas de poses de partners](PARTNER_MASCOT_POSE_LIBRARIES.md) |
| Dirección visual de la pieza estática de la que nace | [Método Paid Media SEO/AEO](2026-09-22-seo-aeo-paid-media-production-method.md) |

## 2. Qué se produjo

Paquete en OneDrive:
`Alineación/5. Contenidos/15. Paid Media/03. Finales/2026-09-22_SEO-AEO_motion_vocero-no-autorizado/`
(`LEEME.md` · `finales/` · `prompts/`).

| Ratio | Archivo | Medidas | Nota |
|---|---|---|---|
| 9:16 | `finales/motion_vocero-no-autorizado_9x16_1080x1920.mp4` | 1080×1920 · 15,1 s | **el master**: el único generado nativo en su ratio |
| 4:5 | `finales/motion_vocero-no-autorizado_4x5_1080x1350.mp4` | 1080×1350 · 15,1 s | generado en 3:4 y recortado (§6) |
| 1:1 | `finales/motion_vocero-no-autorizado_1x1_1080x1080.mp4` | 1080×1080 · 15,1 s | recomposición nativa |

**16:9 queda deliberadamente estático** — decisión del operador, no omisión.

Los prompts resueltos viven en `prompts/` (`prompt-9x16-FINAL.txt`, `prompt-3x4-para-recorte-4x5.txt`,
`prompt-1x1.txt`) y son el artefacto reproducible: con ellos y las referencias de §4 cualquiera reproduce
la pieza. Las diez versiones del prompt y sus salidas intermedias quedan en
`ai-generations/2026-09-22_motion-codex-rueda-prensa/brief/` y `out/`.

## 3. Qué hace la pieza

Codex da una rueda de prensa sobre tu marca. Con autoridad de vocero, gesticulando, **y sin decir nada**.
El remate no está en el personaje: **está en el atril**. La barra de búsqueda sigue VACÍA los 15 segundos,
con el cursor parpadeando en un campo en blanco. Nadie escribió la pregunta. Nadie consultó.

🎯 Eso es «ni te preguntó nada» **hecho movimiento**, y se entiende **con el sonido apagado** — que es como
se ve el 90 % del feed.

## 4. El comando reproducible

**Motor:** `h3max-r2v` (Minimax H3 Max, reference-to-video) vía `pnpm ai:fal`.
**Cuenta:** `FAL_API_KEY_B`. **Render:** 20–35 s por toma.

```bash
pnpm ai:fal --capability h3max-r2v \
  --image <pieza-compuesta-con-CTA>.png \
  --image <plate-limpio>.png \
  --image codex-3d-08-idea-tres-cuartos-derecha.png \
  --image codex-3d-01-frente-heroe.png \
  --prompt-file prompts/prompt-9x16-FINAL.txt \
  --duration 15 --resolution 1080P --aspect 9:16 \
  --prompt-expansion disabled --fal-account FAL_API_KEY_B --max-usd 2 --yes \
  --out salida.mp4
```

**Las cuatro referencias, y por qué cada una:**

| # | Qué es | Para qué |
|---|---|---|
| 1 | La pieza estática compuesta **con CTA** | el look EXACTO del texto: tipografía, jerarquía, bounding box, cursores |
| 2 | El plate limpio (sin texto) | la escenografía: atril, soportes, barra encendida |
| 3 | `codex-3d-08-idea-tres-cuartos-derecha` | la pose del gesto de «punto uno» |
| 4 | `codex-3d-01-frente-heroe` | la pose de reposo |

Las poses salen del kit `ai-generations/2026-09-17_codex-poses-3d/out/`.
🔴 **No se le piden al modelo: se le pasan.**

Flags que no son decoración: `--aspect` es obligatorio (§7.1), `--prompt-expansion disabled` evita que el
motor reescriba el prompt que se midió, y `--max-usd` es el tope duro de la corrida.

## 5. Lo que costó

| Concepto | USD |
|---|---|
| Sonda de filtro (Seedance 2.0 mini, 480p) | 0,35 |
| Seedance 2.5 i2v 1080p — primera toma | 6,24 |
| Seedance 2.5 r2v 1080p con audio | 6,24 |
| H3 Max — 2 tomas de 6 s (una salió horizontal) | 0,96 |
| H3 Max — 5 iteraciones de 10 y 15 s | 5,40 |
| H3 Max — 4:5 fallido en `adaptive` + 3:4 + 1:1 | 3,60 |
| **TOTAL** | **≈ 25,39** |

🔴 **El dato que cambia el presupuesto de todo lo que venga:** las dos primeras tomas con Seedance 2.5
costaron **12,48** y las **nueve** iteraciones con H3 Max costaron **9,96**.

## 6. Comparativa de motores medida

| | Seedance 2.5 | H3 Max (`h3max-r2v`) |
|---|---|---|
| Precio por segundo | **1,164 USD/s** | **0,08 USD/s** |
| Latencia de render | ~3,5 min | **20 s** |
| Calidad observada en esta pieza | titular más chico y menos nítido | **titular más grande y más nítido** |
| Iteraciones que permitió el presupuesto | 2 tomas por 12,48 | 9 tomas por 9,96 |

H3 Max es **13× más barato** y en esta pieza salió **mejor**.

**Por qué H3 Max y no Seedance 2.5.** Seedance lidera los rankings generales, pero para **imagen-a-video con
audio** el #1 de Artificial Analysis es H3 Max. Se probó y ganó en calidad *y* en precio.

⚠️ La comparación es de **esta** pieza —personaje de vinilo, cámara fija, fondo negro, capa gráfica dentro
del cuadro—. No promueve a H3 Max como ganador universal; promueve la obligación de **probar el carril
barato antes de gastar en el caro**.

## 7. Las decisiones, y por qué

**Por qué la capa gráfica va DENTRO del video y no compuesta encima.** Contra el canon, que manda componer.
Se probó porque el operador lo pidió, y **funcionó**: el texto volvió bien escrito, con tildes y tipografía
correcta. 🔴 La frontera real no era «texto sí / texto no» — es **texto sí, marca no**: una marca no tolera
«parecido». Si en una pieza futura el logotipo tiene que ser exacto, **se compone**.

**Por qué el 4:5 se generó en 3:4.** Ningún motor del carril soporta 4:5 (§8.3). Se generó en 3:4
—1080×1440, el más cercano— y se recortó a 1080×1350 quitando **90 px de negro medido** (luminancia **1,8**
arriba y **0,2** abajo sobre 255). 🔴 **No es un crop de conveniencia:** se midió que las franjas
sacrificadas estaban vacías.

```bash
ffmpeg -i loop-3x4-15s.mp4 -vf "crop=1080:1350:0:45" -c:v libx264 -preset slow -crf 18 -c:a copy salida.mp4
```

## 8. Lo aprendido — que vale más que la pieza

### 8.1 Sobre el motor

1. 🔴 **`h3max-r2v` SÍ acepta `--aspect`, y SIN él devuelve 1920×1080 HORIZONTAL** aunque las cuatro
   referencias sean verticales. El registro sólo anotaba «sin aspect ratio» para `-i2v`. Costó una toma.
2. 🔴 **`--aspect adaptive` NO adopta el ratio de las referencias.** Con referencias de 1152×1440 devolvió
   1920×1080. Costó otra toma.
3. 🔴 **NINGÚN motor de video del carril soporta 4:5** — medido en los cinco: Seedance 2.5, Seedance 2.0,
   Wan 3.0, Flux 3 y H3. Todos ofrecen `3:4` como lo más cercano. **Y 4:5 es el formato principal de las
   piezas estáticas aprobadas de Efeonce.** Quien planifique motion en 4:5 tiene que contar con el recorte.
4. ⚠️ **3:4 ≠ 4:5**: 0,750 contra 0,800. A 1080 de ancho son 1440 contra 1350 — **90 px, un 6,7 %**. Si
   subes un 3:4 donde la plataforma espera 4:5, **ella recorta y decide dónde**.

### 8.2 Sobre el audio — cinco intentos, y el diagnóstico llegó al final

El audio fue lo más caro en iteraciones. La secuencia: balbuceo en español → «gritando en un baile escocés»
→ suena a portugués → vuelve a hablar → mudo.

5. 🔴 **El «baile escocés» fue un error literal de prompt:** se pidió *brass band march* con tuba y caja, que
   es **exactamente** una banda de gaitas. La referencia equivocada produce el sonido equivocado.
6. 🔴 **El minionés NO es un idioma inventado: es un pastiche de idiomas REALES** —español, italiano,
   francés, inglés, japonés, coreano, hindi— deformados. Por eso reconoces palabras y por eso da gracia.
   Para una pieza que hay que LEER es el defecto, no la virtud: cada palabra reconocible es un segundo que
   el ojo deja de leer.
7. 🔴 **La causa de fondo era estructural y medible:** el prompt tenía **13 términos que inducen habla**
   —5 «microphone», 3 «statement», 2 «announce», «spokesperson», «press conference», «declared»— contra
   **2 prohibiciones de voz**. Se le estaba pidiendo a un modelo que viera una rueda de prensa y no generara
   voz. **La escena inducía lo que el prompt prohibía.**
8. ✅ **Lo que lo resolvió, y es la receta:** (a) **quitar los inductores en vez de prohibir más fuerte** —
   los micrófonos pasaron a «soportes con espuma en brazos de cromo», visualmente idénticos y semánticamente
   mudos, porque **la escenografía la cargan las imágenes, no las palabras**; (b) **dar un marco donde la voz
   no cabe**: declarar la pieza **cine mudo con score**, que es autoconsistente, en vez de «hay una rueda de
   prensa pero nadie habla».
9. **Sin música quedó mejor que con música.** Una fanfarria **abre una expectativa** de que viene un anuncio;
   como no viene nada, queda colgada. Sin ella, el vacío deja de ser un bache y pasa a ser el mensaje.
10. ⚠️ **El silencio salió digital puro** (**−163,9 dB**), sin el room tone pedido. Puede leerse como audio
    cortado. Se arregla en post con una capa de ambiente muy baja; no exige regenerar.

### 8.3 Sobre la dirección

11. 🎯 **El hallazgo creativo mayor: la pieza no celebra.** Codex remataba triunfal con los brazos arriba y
    ojos sonrientes, y eso **contradice el texto**. La tesis no es triunfo, es **usurpación**: el espectador
    no es el público que aplaude, es la marca de la que hablan sin permiso. Con Codex celebrando, el
    espectador piensa «qué simpático este robot»; con Codex **indiferente**, siente el desaire. No es una
    fiesta: es un trámite al que no te invitaron. El gesto que significa «ni te preguntó nada» es el vocero
    que **termina, se queda quieto y no toma preguntas**.
12. **La quietud es el centro emocional, no relleno.** Se alargó de 2 a 3,5 s a propósito.
13. 🔴 **Aparecer lento ≠ desaparecer lento.** El primer intento de dar tiempo de lectura estiró la ENTRADA,
    y no era eso: lo que hacía falta era que la **composición ya armada se sostuviera**. La forma correcta es
    entrada a ritmo (7 s) → **sostén largo y quieto** (5,5 s) → **fade lento** (1,3 s).
14. **La cara de Codex es una pantalla y ese es su único músculo facial.** `>_` en reposo, ojos en el gesto.
    No necesita boca, y pedirle que hable fue el error de origen.

### 8.4 Sobre la medición

15. 🔴 **El loop se mide entre el PRIMER y el ÚLTIMO cuadro reales**, no en muestras cómodas. Medirlo contra
    un cuadro intermedio que ya tiene texto encima da un falso negativo — pasó y se reportó mal antes de
    corregirlo. Progresión real: 7,84 → 1,09 → 0,96 → 0,56 → **0,55**.
16. 🔴 **El RMS no distingue música de voz.** Sirve para probar que el silencio existe (−163,9 dB es
    concluyente) y para ubicar golpes de foley; **no** para afirmar que no hay habla. Eso lo juzga un oído.

## 9. Qué se transfiere y qué es de esta pieza

**Aplica a CUALQUIER motion futuro** (son reglas con causa medida, no criterio):

| # | Regla |
|---|---|
| 1 | 🔴 Declarar `--aspect` siempre; nunca asumir que el motor lo deduce de las referencias, ni con `adaptive` |
| 3 | 🔴 4:5 no existe en el carril: se planifica en 3:4 y se recorta con franjas **medidas**, o se recompone nativo |
| 5 | 🔴 La referencia sonora equivocada produce el sonido equivocado: nombrar el instrumento exacto, no el «aire» |
| 7 | 🔴 Contar los **inductores semánticos** del prompt antes de prohibir: si la escena induce lo que prohíbes, gana la escena |
| 8 | ✅ Quitar el inductor > reforzar la prohibición. Y dar un **marco autoconsistente** donde lo prohibido no cabe |
| 13 | 🔴 Tiempo de lectura = **sostén**, no entrada lenta. Entrada a ritmo → sostén largo → fade |
| 15 | 🔴 El loop se mide entre primer y último cuadro **reales** |
| 16 | 🔴 El RMS prueba silencio, no ausencia de habla. Lo segundo lo juzga un oído |
| — | 🔴 La pose se le **pasa** al modelo desde el kit, no se le pide (en video, una deriva son cientos de cuadros) |
| — | ⚠️ Probar el carril barato antes de gastar en el caro: el CLI imprime el costo antes de encolar — **se lee, no se recuerda** |

**Es propio de esta pieza** (no generaliza):

- Que **H3 Max gane a Seedance 2.5 en calidad**: medido en esta escena, con este personaje y esta capa gráfica.
- Que **la capa gráfica funcione generada dentro del cuadro**: funcionó porque es tipografía, no marca. Con
  logotipo en cuadro, el canon sigue mandando componer.
- Que el filtro de marca **no rechace a Codex**: despejado por USD 0,35 para esta línea de piezas, no para
  cualquier marca de tercero.
- Los tiempos exactos (7 s / 5,5 s / 1,3 s), la quietud de 3,5 s y el recorte de 90 px: son **coordenadas del
  caso**, no presets.
- La emoción «desaire» y la barra vacía como remate: son de **este** concepto de CMP-001.

## 10. Lo que queda abierto

- **Room tone** sobre el silencio (post, determinístico, sin costo de generación).
- **16:9**: estático por decisión del operador.
- **Pauta**: los derechos de partner están declarados por el operador (ver `ASSETS.md` de CMP-001), pero
  🔴 **aprobado creativo ≠ autorizado a pautar**. Publicación, medición y resultados son estados distintos y
  ninguno está alcanzado.
