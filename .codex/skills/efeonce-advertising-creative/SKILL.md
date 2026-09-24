---
name: efeonce-advertising-creative
description: Orquesta piezas publicitarias y de social media con texto —posts, stories, reels, covers, banners, key visuals, brochure, OOH y motion— aplicando contratos AXIS de tipografía y selección colaborativa, Bricolage/Poppins/Guttery reales, bounding boxes adaptativos, cursores semánticos, contraste y accesibilidad. Úsala al crear, corregir o auditar una pieza, componer texto o multiplayer sobre imagen o preparar variantes. No sustituye la estrategia de canal ni autoriza publicación.
---

# Efeonce Advertising Creative

Convierte las reglas publicitarias de AXIS en decisiones de producción verificables para Codex y Claude. Es
una orquestadora: no duplica valores tipográficos ni reemplaza las skills de oficio.

## Fuentes y orden de carga

1. Lee el contrato operativo en
   [ADVERTISING_CREATIVE_AGENT_EXECUTION_V1](../../../docs/operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md).
2. Consulta primero la guía portable
   `../axis-design-system/docs/creative-applications/advertising-social/DESIGN.md` y abre el
   [Creative Typography Workbench](https://axis.efeonce.org/references/creative-typography/). Usa su asesor con
   el soporte, largo e intención reales para obtener una receta candidata y un caso comparable; después resuelve
   cada valor desde el export `axisAdvertising` y el contrato `efeonce.advertising-typography`. El contrato
   versionado prevalece ante cualquier drift. Su lifecycle `trial` obliga a conservar evidencia y evita
   presentarlo como estable antes del segundo consumidor real.
3. Carga la skill tipográfica activa y sólo las referencias que apliquen:
   - [ink, jerarquía y espaciado](../../../.codex/skills/greenhouse-typography-accessibility/references/campaign-ink-metrics-and-hierarchy.md);
   - [casos reales y reconstrucciones didácticas](../../../.codex/skills/greenhouse-typography-accessibility/references/real-campaign-typography-cases.md).
4. Para social, compón con `social-media-studio`; para imagen generada, con
   `greenhouse-ai-image-generator` y `greenhouse-ai-creative-rights-governance`; para video/motion, con
   `motion-design-studio`; para copy, con `copywriting`; para marca Efeonce, con `efeonce-brand-studio`.
   Si una de esas skills ya inició el encargo, no la vuelvas a cargar ni reinicies el brief.
   En piezas con Nexa, usa la identidad humana fotorrealista confirmada el 2026-09-24 y su set de ocho vistas
   de polera gris en `ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/`, resuelto con
   `foto:prompt`. La polera es una referencia neutral, no vestuario obligatorio. Las poses OneDrive guían gesto
   y cuerpo, no el rostro; el set sintético previo no es ancla facial.
   Si la pieza muestra a Julio, usa las 11 referencias aprobadas de `ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/`
   y sus seis ángulos en `set-identidad/angulos/`; consulta `refs-aprobadas/MANIFIESTO.json` y resuelve la vista
   con `foto:prompt`. No uses `julio-ap-02.png` (composición publicitaria) ni mezcles fuentes y descartes con
   el set aprobado. Canon: [`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`](../../../docs/operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md).
5. Usa [brief y gate de calidad](references/creative-brief-and-qa.md) para registrar la decisión y revisar
   el archivo final.
6. **Para paid media, scroll-stop, hook/hold, cinematic ads o híbridos**, carga primero
   [palancas visuales y medición](references/paid-visual-attention-playbook.md): biblioteca de doce
   recursos, recetas por formato, diccionario de métricas y experimentos. Declara hipótesis, palanca
   dominante, control y KPI antes de producir. Para Efeonce conserva el registro A/B/C y el pipeline de foto.
   `Cinematic` es tratamiento; `thumb-stop` es una ratio custom con fórmula, no un estilo ni garantía.
   Estáticos: hook temporal de video N/A; CTR es respuesta, no atención. La
   [evidencia medida](references/ad-creative-evidence-2026.md) es su hermano y aporta lo que el playbook
   no duplica: **§5, las doce cifras famosas que NO se citan** porque su fuente no existe o está mal copiada
   —consúltala **antes** de poner un número en una lámina, propuesta o ad—; **§2.3**, el riesgo «AI slop»
   con sus seis tells como checklist de QA; y **§2.4**, la medición propia de que el motor resuelve toda
   escena imposible en idioma de render. Sus cifras traen fuente, muestra y `as-of`; aun así, reverifica
   fecha y aplicabilidad antes de citarlas.

7. **Al adaptar una pieza a 9:16 o 16:9, o al componer un CTA**, carga
   [safe zones y trampas de formato](references/paid-format-safe-zones-and-craft.md) (`as-of 2026-09-22`,
   evidencia local de producción creativa; no resultados de pauta). Lo que más caro sale ignorar:
   - 🔴 **la reserva del comando NO es la safe zone de la plataforma.** En 9:16 la banda del comando empieza
     en 10% y la UI del placement puede invadir esa banda; el14% es referencia de Meta, no regla de LinkedIn: obedecer sólo al comando pone el titular
     debajo del nombre de la cuenta. Manda la más restrictiva;
   - **en el caso 16:9 auditado el cursor chocó con el cierre** y `cursors: []` aborta con
     `cursor-required`: la salida es cursor a 0,9 + cierre corto;
   - **la vista del personaje puesta en la raíz de la ficha se ignora en silencio** y resuelve la pose por
     defecto: verificar la ruta `--image` que imprime el comando antes de gastar;
   - **el CTA se compone con `pnpm foto:componer:cta` y se certifica con `pnpm foto:cta:gate`**: checklist del plan,
     flujo y códigos de salida en [Componer y certificar](#componer-y-certificar-una-pieza-con-cta). **Nunca copiar
     el compositor a la carpeta de corrida** (vivió en cinco copias divergentes). El gate **exige**
     `contraste.cta`: antes, la variante sólida pasaba porque el dato no existía, no porque cumpliera. Cada plan tiene
     su QA (`out/qa-<plan>.json`) con **huellas** del plan, del plate, del PNG, del layout y del comando, que el gate
     recalcula: un QA que no describe lo que hay en disco falla;
   - **un beneficio por pieza**: el grupo beneficio → CTA → descriptor no se reutiliza entre ejecuciones;
   - 🎯 **la metáfora entra POR el objeto del oficio, no al lado de él.** Prueba: quítale el objeto; si la
     escena sigue funcionando igual, estaba al lado.
   - 🔴 **en MOTION el 4:5 no existe: ningún motor de video del carril lo ofrece** (medido en los cinco,
     `as-of 2026-09-22`). El más cercano es 3:4, así que un 4:5 en movimiento se **genera en 3:4 y se recorta**,
     midiendo antes que las franjas sacrificadas estén vacías — y subir un 3:4 donde la plataforma espera 4:5
     deja que **ella** decida dónde cortar. Como el 4:5 es el formato principal de los estáticos, el brief de
     motion **reserva ese espacio desde el encuadre**. Medidas, ratios por motor y el comando de recorte:
     [guía canónica de selección de modelos](../../../docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
     §3; la receta completa de estático → loop, en
     [`motion-design-studio`](../motion-design-studio/workflows/static-key-visual-to-looping-social-motion.md).

8. **Toda pieza publicitaria pertenece a una campaña registrada.** El pensamiento —brief, conceptos, JTBD,
   copy, medición y **decisiones descartadas con su razón**— vive en OneDrive `Alineación/2. Campañas/CMP-###_…`;
   **los assets viven en la carpeta de su canal** y la campaña los referencia por ruta en su `ASSETS.md`.
   🔴 **Nunca copiar un asset a la carpeta de campaña**: dos copias garantizan que nadie sepa cuál se publicó.
   Canon: [`EFEONCE_CAMPAIGN_REGISTRY_V1.md`](../../../docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md).
   ⚠️ **`aprobada` ≠ autorizada a pautar**, y lo archivado en `Archivo/pre-CMP_2024/` **no es referencia**.
   🔴 **El trabajo gobernado va al repo, no a OneDrive:** epics, tasks, issues y **CDR** (*Campaign Decision
   Record*, el ADR de las campañas) viven en `docs/campaigns/`. Regla: **con lifecycle → repo; criterio o
   entregable → OneDrive**, y nada en los dos lados. Un CDR se reconoce porque **si la campaña no existiera,
   la decisión no tendría sentido**; lo transversal sigue siendo ADR.
   🎯 **Declara la RECIPE en tres capas, porque la flota no comparte motor:** (1) **recursos** —referencia
   exacta del kit con `sha256`, ficha, **prompt resuelto**, tokens, plan de composición—; (2) **contrato de
   resultado** —reservas, identidad fiel, cero letras, jerarquía 3×, contrastes—, que se mide **sobre la
   imagen y no sobre el método**; y (3) **vía de producción**, la única que varía: declara cuál usaste.
   🔴 **Si tienes motor propio, NO reescribas el prompt a mano: consume el `.prompt.txt` resuelto** — ahí es
   donde viven el bloque anti-IA, la palanca y las reservas, y es portable a cualquier motor.
   🔴 **Y para adjuntar referencias a tu modelo: los kits pesan ~640 MB y están FUERA de git — un clone no
   los trae.** Búscalas en la ruta local o en las copias fijadas de la campaña
   (`15. Paid Media/01. Recursos/`). **Verifica con `pnpm foto:assets:check` ANTES de generar:** si el hash
   difiere, produces una identidad distinta de la aprobada **y el resultado se ve plausible — no revienta,
   miente**. Anota la referencia con su `sha256`, no sólo con su ruta.


**Límite verificado del checker:** `foto:assets:check` tolera archivos ausentes para CI y comprueba sólo rutas de catálogo. Antes de generar, verificar también disponibilidad/lectura del archivo que se adjunta al motor y comparar su SHA-256 con la entrada del lock. Esto incluye copias OneDrive; exit 0 no basta para validarlas. No regenerar el lock para legitimar una diferencia sin revisión de la referencia.

**Entrega para humanos y agentes:** seguir `EFEONCE_CAMPAIGN_REGISTRY_V1.md` §Entrega de pauta compartida. Un manifiesto operativo genera catálogo visual y CSV; Finales organiza por campaña/tipo/ratio, con titulares legibles e IDs estables. Recetas y versiones en Recursos, nunca entregas separadas por agente.

### Motor de IA: cómo elegir (as-of 2026-09-16)

Guía canónica: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`. Detalle de imagen en `greenhouse-ai-image-generator` §Elegir modelo y de video en
`motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`.

- El modelo entrega **sólo el medio limpio**; texto, logo, CTA y legal se componen con AXIS, nunca se generan.
- Plate cotidiano → GPT Image 2.5 Flare; edición precisa, máscara o master final → 2.5 Sunburst
  (`pnpm ai:image --model gpt-image-2.5-sunburst`); material/atmósfera → Seedream 5 Pro; divergencia barata →
  Seedream 5 Lite (`pnpm ai:fal`).
- Resolución nativa > 2K (OOH, print proof) → Seedream 5 Lite o GPT Image (hasta 3840×2160, experimental sobre
  2560×1440); Seedream 5 Pro en fal **no pasa de 2048²**.
- Formato más extremo que 3:1 → Seedream (1/16–16); GPT Image tope 3:1.
- Motion con marca o personas → Flux 3 o Wan 3.0, no Seedance (su filtro rechaza tras cobrar); presupuesta por
  resolución (el CLI estima antes de encolar y pide `--yes` sobre el tope; sin `--resolution` usa el escalón más
  barato) y confirma con `pnpm ai:fal --balance`.

## Bucle de trabajo

1. **Resuelve el encargo.** Define marca/cliente, objetivo, soporte, dimensiones, audiencia, copy literal,
   CTA, activos disponibles, derechos y estado esperado. Aprovecha el contexto ya entregado; pregunta sólo
   por una ausencia que cambie materialmente la pieza.
2. **Asigna funciones, no fuentes por gusto.** Declara una voz display dominante, una voz estructural y, si
   aporta sentido, un gesto breve. Prueba el encargo en el asesor del Workbench y usa su resultado como hipótesis:
   Bricolage instala la idea, Poppins estructura y Guttery sólo aparece como gesto opcional. Elige los valores
   definitivos desde AXIS después de conocer longitud, fondo, tamaño final y distancia de lectura.
3. **Construye el medio limpio.** Genera o selecciona imagen/video sin texto ni logotipos inventados. Compón
   tipografía, marcas y legales de forma determinista con los archivos oficiales. El isotipo 3D de Efeonce es
   elemento ilustrativo, no firma. Para el logo completo como objeto físico en una escena, usa el
   [kit de referencia 3D](../greenhouse-ai-image-generator/references/logo-3d-reference-kit.md): **por defecto, pasada
   directa** —el render entra como referencia de **forma** y el prompt lleva la **intención** (material, montaje,
   escena, atmósfera)—, también cuando la pieza cambia el material (acero, vidrio, neón) o la escena tiene atmósfera
   fuerte como la larga exposición. Elegir la referencia por **luminancia** (blanca para materiales claros, navy para
   oscuros o el color de marca). **Nunca pegar el render como camino por defecto**: se ve falso. El halo enmascarado
   es la **excepción**, sólo con el material exacto del kit y el objeto chico o de detalle fino. **El QA es letra por
   letra** —«e», «f», nave, órbita con sus cortes, tres ventanas— y una letra distinta obliga a regenerar; la firma
   sigue siendo el SVG oficial.
   Cuando la pieza requiera firma web, usa el SVG canónico
   `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`: no lo reconstruyas con texto o CSS. Conserva
   `efeoncepro.com`, `opacity: 0.72`, fusión `luminosity`, escala proporcional y comprueba píxeles visibles en el
   master, no sólo presencia de markup. En Sharp usa el compositor canónico, que calcula el blend no separable
   contra el canvas; no confíes en que librsvg ejecute `mix-blend-mode`. Desde un compositor de corrida (fuera de
   `pnpm creative:layout`) **importa** esa función, no la reimplementes:
   `import { compositeLuminosity } from '<repo>/scripts/creative/layout-compiler/compiler.mjs'` y llama
   `compositeLuminosity({ backdropBytes, sourceBytes, left, top, width, opacity: 0.72 })` con el SVG rasterizado
   como `sourceBytes`; usa `output` como nuevo master y falla si `evidence.method !== 'non-separable-luminosity'`.
   La firma web no entra en la medición de contraste p98: su prueba es la evidencia de fusión más la revisión visual.
   **Si el logo 3D ya es héroe de la escena, la firma es url-lum, no un segundo logo plano** (caso contraportada de
   «Nivel de búsqueda», 2026-09-19).
   Si la pieza usa selección activa o presencia multiplayer, no dibujes cursores con coordenadas decorativas:
   declara un `AxisCollaborationSelectionIntent`, resuélvelo con `efeonce.collaboration-selection` y entrega el
   manifest `axis.collaboration-selection-composition.v1` al adapter de la superficie.
4. **Diseña contraste.** Prueba peso, ancho, tamaño, leading, tracking, cortes y densidad juntos. ExtraBold no
   es un default; una cursiva o Guttery larga tampoco. El contraste útil puede venir de peso, escala, espacio,
   color, posición o tiempo, pero cada capa debe conservar una función.
5. **Protege lectura y marca.** Mide contraste sobre los píxeles reales de cada zona. Si falla, cambia
   encuadre, posición, color o plate antes de añadir contornos/sombras decorativas. **En fotografía de marca
   Efeonce NUNCA un scrim** (2026-09-19): la zona se pide con su tono en la toma y, si no pasa, se regenera. Un logo negativo
   sobre una zona clara o variable es un DON’T aunque el archivo sea oficial.
6. **Revisa en el tamaño de uso.** Comprueba composición completa y vista reducida, safe areas, ritmo,
   desbordes, solapamientos, contraste, logo, subtítulos y `prefers-reduced-motion` cuando corresponda.
   Ningún texto de diagnóstico, caja de selección o guía puede quedar dentro del entregable.
7. **Entrega evidencia honesta.** Muestra la pieza y conserva formato, fuente editable/export, decisiones
   tipográficas, provenance y resultado del gate. Distingue prueba producida, revisada, aprobada, programada,
   publicada y medida.

## Tres voces + acción — ads con CTA

**Paid Media multiformato:** entregar cada key visual en **4:5, 1:1, 9:16 y 16:9**, salvo reducción explícita del brief. Matriz concepto×ratio, recomposición nativa y QA propio; ocho piezas de cuatro conceptos en dos ratios son cobertura parcial. Detalle y tamaños en el canon enlazado abajo.

**Regla aprobada por el operador, 2026-09-22.** Cargar [Tres voces + acción](../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md)
al componer o auditar ads con CTA: Bricolage idea, Poppins estructura, Guttery gesto opcional y acción en Poppins.
Tres tratamientos a demanda: **texto (`text`), contorno (`outline`) y relleno (`solid`)**.
El CTA no es una cuarta voz/familia ni otro titular. Elegir por composición y registrar el motivo, sin prometer lift.
Un único cursor local hacia la acción cuando se use selección; multiplayer sólo con significado. Proteger personaje,
firma y envolvente completa del cursor; medir gaps de tinta, contraste y cada formato. El relleno acotado del CTA
está autorizado sobre foto; no habilita tarjetas de contenido, paneles HUD ni scrims. Los tamaños de pilotos son
casos, no nuevos tokens AXIS. Entregar copy/parámetros/compositor editables y conservar el estado de cada pieza.
**Color a demanda:** lima no es obligatorio; naranja, teal u otro autorizado según composición. Elegir tinta,
contorno y relleno por separado: CTA/descriptor ≥4,5:1; borde/silueta y controles significativos ≥3:1. Medir
el fondo real desfavorable, no sólo paleta o p98; documentar color resuelto y prueba. Ver método en el canon.

### Trampas medidas al componer ads con CTA (CMP-001, 2026-09-22)

Salieron de componer ads reales **cuando el gate medía sólo contraste y protección de sujeto**. Desde el 2026-09-23
también bloquea el concepto incompleto, la jerarquía y los choques de maquetación
([Componer y certificar](#componer-y-certificar-una-pieza-con-cta)); el destino del CTA, la escala en horizontal y el
ritmo se siguen revisando mirando la pieza (del ritmo, el gate mide desde el tramo 16 sólo el salto del concepto a la
acción, en las piezas nuevas).

- 🔴 **El concepto completo no es opcional.** Concepto = **entrada · titular · remate**; grupo de acción =
  **beneficio · CTA · descriptor**. Nueve piezas se compusieron y pasaron el gate con sólo titular +
  beneficio + CTA + descriptor: el compositor resuelve la entrada con `if (s.lead)` y su ausencia no es un error
  para él. Desde el 2026-09-23 el gate la bloquea (`concepto-completo`, salvo `conceptoReducido` con aprobador).
  Ante un «excesivo texto» se **acorta cada voz**, nunca se elimina una. Corolario medido: restituir la entrada
  puede **bajar** el ratio dominante/entrada, porque el compositor achica el dominante solo cuando no cabe en
  `dominantMax` (caso `mo3`: cayó a 2,9, bajo el mínimo de 3; acortar el dominante a tres palabras lo devolvió a
  3,7). El gate lo bloquea como `jerarquia`: lee el `ratioDominanteEntrada` del QA después de restituir. Canon:
  [Tres voces + acción §El concepto completo no es
  opcional](../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md).
- 🔴 **El cursor del CTA tapaba el descriptor cuando el botón era corto.** El solape es **geométrico, no de
  luminancia**, y el gate de entonces lo dejaba pasar. Desde el 22/09 el compositor baja el descriptor cuando
  detecta el solape, y desde el 23/09 las invariantes de maquetación (una sola función para la búsqueda del tamaño,
  la composición y el gate) no dejan que una selección —marco, cursor o etiqueta— tape una voz que no sea su
  destino: la composición aborta y el gate lo bloquea. La regla de largo queda como criterio de ritmo: un botón de
  **19 caracteres o más** deja al cursor fuera de un descriptor de hasta 30; si el botón tiene que ser corto por
  punch, acorta el descriptor en la misma proporción. Casos y tabla:
  [compositor de CTA §8](../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).
- **El CTA expresa el DESTINO de la etapa, no el ángulo de la pieza.** Varias piezas de la misma etapa del
  embudo convergen en **una sola acción** y lo que cambia entre ellas es el fraseo. Si dos piezas de la misma
  etapa llevan a destinos distintos, la etapa está partida en dos campañas. Ver §9 del mismo canon.
- **Escala tipográfica en horizontal.** En 16:9 el texto se veía perdido, pero la causa **no** es el tamaño de
  fuente respecto de su columna: medido, 4:5 da **968 px** de columna y 16:9 da **901 px** — casi la misma
  columna en un lienzo del doble de ancho. 🔴 **Escalar por ancho de LIENZO es un error**: aplana la jerarquía
  (el ratio cayó a 2,3). El compositor escala el bloque hasta que el dominante **llene** su `dominantMax`, en
  16:9 y 9:16; 4:5 y 1:1 no crecen. El crecimiento se detiene cuando lo MIDE: ninguna caja a menos de 3,5 % del
  sujeto **segmentado** y ninguna voz perdiendo contraste. Ver §13–§14 del mismo canon.
- **El texto nunca tapa a nadie, y no se declara a mano.** `pnpm foto:componer:cta` segmenta el plate (modelo
  local) y aborta si una caja toca al sujeto (1,2 % del lado corto), en 2D. El QA registra
  `guardaSujeto: segmentacion`, y el gate lo acepta como protección. **Sin máscara, el gate no certifica**
  (`sin-mascara` bloquea desde el 2026-09-23); `subjectGuard.ignore` exige `reason` y un `aprobadoPor` del registro
  de aprobadores, con máximo 10 % del lienzo por zona y 15 % en total. Caso
  fuente: las piezas de v07 crecieron ×1,6 sobre las personas cuando el tope dependía de un
  `subjectProtection` que no estaba declarado. §14.
- **Ningún cambio al compositor ni al gate se prueba a ojo.** `pnpm foto:componer:cta:regresion` compone todas las
  piezas con CTA del repo con la referencia (`--ref`, HEAD por defecto, extraída hermética de git con sus
  dependencias) y con tu versión, y compara estado, layout, QA, avisos, el PNG al píxel y el **veredicto del gate**
  («⛔ Cambia el VEREDICTO del gate»); cualquier diferencia sale con 1. Es determinista: un cambio que no debería
  alterar nada sale sin diferencias. Falla también con 0 casos, sin el manifiesto de cobertura
  (`scripts/foto/componer-cta.cobertura.json`) o si falta una pieza de él, y avisa cuando cambiaron fuentes, logos o
  paquetes desde la referencia: esa diferencia no la ve, así que esas piezas se comparan a ojo. Completan la red
  `pnpm foto:componer:cta:pruebas` (10 pruebas de punta a punta; borra sus temporales salvo el reporte, y
  `--conservar` los guarda) y `pnpm foto:componer:cta:mutantes`, que rompe cada guarda a propósito, la compara con
  una corrida sin mutante y la cuenta como detectada sólo si cambia la verificación esperada; dos mutantes canario
  ponen a prueba al propio arnés. **Una guarda nueva nace con un mutante que alguna prueba detecte** (y se corre la
  puntuación de las viejas). Para recomponer un set aprobado sin que el texto crezca: `"textGrowth": false`. §15
  y §18.
- **Cierre de auditorías acotado.** Acuerda el máximo de rondas con el operador antes de iniciar. Un auditor que se
  queda sin créditos no emitió veredicto; una corrida de mutantes interrumpida sólo da progreso parcial, nunca
  puntuación. Registra el último pase completo, la cobertura que faltó, la deuda y las decisiones abiertas en el
  contrato y `Handoff.md`. Para el compositor CTA, la novena auditoría del 2026-09-23 no produjo informes y el
  operador prohibió más rondas; estado exacto en §19.10 del contrato. No abras un tramo nuevo por inercia.
- **CTA: corchetes sólo en el de texto** (operador, 2026-09-23). Contorno y relleno van sin marco —su rectángulo ya
  delimita la acción—; el de texto conserva los corchetes porque sin rectángulo queda huérfano. El cursor va en los
  tres. El CTA es un destino seleccionable del contrato AXIS (`cta.seleccion`: 8 anclas, colaboradores con etiqueta
  en las esquinas); ningún cursor ni etiqueta puede tapar otra voz. §17.
- **La variante del CTA se elige mirando, no copiando el plan anterior.** `--variantes` compone las tres lado a
  lado; `variant: "auto"` + `prominencia` (discreta/delimitada/destacada) respeta la intención y sólo escala si la
  escena no la permite, midiendo 4,5:1 a cualquier tamaño, APCA y daltonismo; su motivo queda en el QA
  (`ctaVariante`). Una variante fija declara el suyo en `cta.variantReason`. §17.
- **Un bloque centrado no se ancla lejos del centro.** Con `align: 'center'` y `|centerX − 0,5| > 0,15`, el
  compositor aborta: si el aire está a un costado, el bloque se alinea a ese costado (`align: 'left'`). Operador
  sobre 03-referencia-916: «se vería mejor alineada a la izquierda por la posición». §14.

### Componer y certificar una pieza con CTA

`pnpm foto:componer:cta` compone; `pnpm foto:cta:gate` **certifica** que lo que hay en disco es lo que se compuso y que
cumple el canon. Certificar la pieza no la aprueba ni autoriza publicarla. Contrato técnico, plantilla verificada y
estado de la certificación: [compositor de CTA §15–§19](../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md);
paso a paso, excepciones y problemas comunes: [manual de uso](../../../docs/manual-de-uso/creative/compositor-piezas-cta.md);
qué hace y por qué, en simple: [documentación funcional](../../../docs/documentation/creative/compositor-piezas-cta.md).

**Checklist de un plan nuevo que tiene que pasar el gate.** Parte de la plantilla de §19.4 del contrato —una pieza que
la suite certifica con código 0— y cambia `id`, `plate`, copy y escena; no armes el plan de cero.

0. **Canon 2026-09-23.** Una pieza nueva —o una aprobada que editas— se juzga con el canon vigente; las aprobadas al
   corte (registro `scripts/foto/canon-anterior.json`, por la huella de su plate y su definición) siguen con las reglas
   de antes. No se elige: el gate lo recalcula del registro. Lo que agrega el canon nuevo va marcado abajo con «nuevo».
   Si el operador ordena retocar una aprobada sin cambiarla de canon, su huella se reemplaza en el registro y se anota
   en `enmiendas`, con commit; nunca agregues una pieza al registro por tu cuenta.
1. **Zona segura de AXIS:** `safeArea: "axis"` (feed —4:5, 1:1 y 16:9—: 7,5 % a los lados y 6 % arriba y abajo; story
   —9:16—: 10 % y 13 %); en una pieza nueva es el valor por defecto. Es el piso: el texto arranca dentro, también por
   arriba, y una zona `{ x0, y0, x1, y1 }` declarada sólo la estrecha.
2. **Columna:** `align: "left"` con `cta.x: "columna"` (y `note.x: "columna"` si hay nota), para que botón, nota y
   descriptor arranquen en la columna del texto. «columna» existe sólo con alineación a la izquierda: con
   `align: "center"` el plan se rechaza, y el CTA de un bloque centrado lleva una fracción o `cta.align: "center"`.
3. **Concepto y jerarquía:** `lead` (entrada), `dominant` y `after` (cierre); sin entrada o sin cierre, sólo con
   `conceptoReducido` aprobado. El dominante mide ≥ 3× la entrada **y es la voz mayor**: ninguna otra —entrada, cierre,
   nota, CTA, descriptor— mide más que él. Declara `leadSize` y `afterSize` (sin ellos salen a 70 y 74 px) y, como el
   compositor achica el dominante cuando no cabe en `dominantMax`, lee `ratioDominanteEntrada` en el QA. **Nuevo:**
   ninguna voz pasa de 0,6× el titular y el descriptor es menor que el CTA (`jerarquia-rol`), y el orden de lectura es
   entrada → titular → cierre → nota → CTA → descriptor (`orden-lectura`; `note.gapAfterClosure` nunca negativo).
   **Nuevo:** tracking del titular entre −0,035 y 0,02 em (`tracking-titular`): más allá funde o separa las letras.
   En un bloque centrado —pieza nueva o aprobada— cada voz, el botón y el descriptor van en el eje (±4 px,
   `eje-centrado`): usa `cta.align: "center"` y la nota sin `x`.
   **Tramo 13 (todas):** el CTA mide ≥ 0,9× la voz de cuerpo mayor (`cta-cuerpo`), y la entrada y el cierre usan sólo
   tintas de cuerpo de AXIS (`leadFill`/`afterFill`: `#ffffff` o `#cfe4fa` sobre fondo oscuro, `#00284d` o `#6d6777`
   sobre claro; nunca el acento del CTA: `paleta-voces`); en el cierre, `[[ ]]` es el remate BLANCO (tramo 14). El CTA
   no compite con el titular: ≤ 0,5× el titular y botón ≤ el área del titular (`cta-tamano`). **Nuevo:** en el teléfono
   (390 CSS px) el CTA mide ≥ 11 px y las demás voces ≥ 9 (`legibilidad`); los nombres de los cursores quedan fuera
   (decisión del operador). En 16:9 eso pide mucho más texto: en un lienzo de 2048, entrada, cierre y descriptor de 48 px,
   CTA de 60 y titular de 160, sin nota y con `cta.gapAfterNote` 56 por el ritmo (tramo 16); y el plate tiene que
   dejarle cerca del 57 % izquierdo (hoy `foto:prompt` reserva 42 %: pendiente de decisión).
   **Copy:** `|` corta la línea (nunca `\n`), salvo en la etiqueta de un cursor: va en una sola línea y ahí `|` se
   rechaza; `**negrita**` y `[[acento]]` sólo en entrada, titular, cierre, nota y pie; escribe los caracteres, no
   entidades (`&`, no `&amp;`; tampoco `&sup2;` ni `&eacute`), tampoco en `altText`; y ningún carácter invisible (U+200B
   y los demás Default_Ignorable). **Tramo 16:** el esquema valida el texto como se DIBUJA —sin marcado y con `|` como
   espacio—, así que un invisible o un `****` ya no parten una entidad. El compositor rechaza lo demás.
4. **Firma declarada siempre**, de una de tres formas:
   - `logo: { width: 0.2, x: 0.5, y: "auto" }`, la recomendada (`width: 0.25` en un formato horizontal nuevo; la tinta,
     blanca o navy, la elige la medición salvo que fijes `variant`). `width` es fracción del lado corto. `y: "auto"` busca sólo en la **banda del pie**, debajo de
     todo lo compuesto, una Y con ≥ 4,5:1 en la caja y en el trazo del logo, lejos del sujeto; si no la encuentra lo
     avisa, la firma queda al pie y el gate la mide: abre la banda (acorta o sube el texto), fija `logo.y` o cambia el
     plate. Un `logo.y` numérico es el **borde superior**. La búsqueda esquiva las zonas `protect`
     (`[{ box, reason }]`), igual que el texto. **Nuevo:** la firma —automática o fija— va debajo de todo el contenido,
     en el cuarto inferior (desde el 75 % del alto) y fuera de `protect` (`firma-posicion`); la búsqueda automática sólo
     recorre ese cuarto y, si no hay lugar, no sube: avisa, y el gate la bloquea al pie.
   - `firma: { modo: "externa", razon }` si otra herramienta firma después (v03–v07: `firmar.mjs` →
     `firma-placement.mjs`). El compositor no la dibuja: reserva su caja (20 % del lado corto, centrada) y mide su
     contraste como esa herramienta. **Declara su centro vertical dentro de la zona de AXIS** (la Y máxima por formato
     está en §19.6 del contrato): sin Y queda en 0,935, fuera de la zona (las stories de v07 usan 0,8565 desde el
     2026-09-23). Con `firmar.mjs`, la Y va en `signatureY`, que es la que esa herramienta lee (el esquema
     ya no acepta `firma.y` ni `firma.ancho`), y el ancho queda en 20 %: la caja que se mide tiene
     que ser la firma que se dibuja. `signatureY` sin `firma` también declara firma externa; `signatureSafeArea` (`{ x0, y0, x1, y1 }`)
     sólo estrecha la zona de la firma. **Certifica antes de firmar:** `firmar.mjs` reescribe `out/<id>.png` y desde
     ahí ni el gate ni `--reproducir` lo reconocen. Guarda la salida y el código del gate antes de firmar.
     **Nuevo:** en una pieza nueva la firma externa es una salida aprobada (`aprobadoPor` y `plate`), porque el PNG que
     certifica el gate no la lleva: prefiere `logo`.
   - `firma: { modo: "sin-firma", razon, aprobadoPor, plate }`, sólo con aprobador del registro.

   Con logo o con firma externa el canon es el mismo: ≥ 20 % del lado corto, ≥ 4,5:1, fuera del sujeto y dentro de la
   zona de AXIS. **Nuevo:** ≥ 25 % del lado corto en los formatos horizontales y ≤ 35 % en todos (`firma-tamano`;
   decisión del operador, 2026-09-23: en 16:9 el 20 % dejaba la firma en ≈ 44 px en un teléfono).

   🔴 **Y dentro de la materia calma del lecho, nunca sobre su canto** **[medido 2026-09-23]**: al ubicar o mover la
   firma —también al subirla a la zona de AXIS en una pieza existente, «donde el lecho ya cubre la nueva posición»—,
   mírala al 100 %. Un contraste que pasa no lo descarta: en la story `04-elegida-916` de v07 la caja estaba sobre el
   canto iluminado y medía 6,53:1. Altura real del lecho contra la caja, método si no alcanza y lo que no funcionó:
   regla auto-load `.claude/rules/brand-photography.md` y el delta 2026-09-23 de la
   [reserva de espacio en el plate](../../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md#delta-2026-09-23--el-lecho-se-valida-contra-la-caja-de-la-firma).
   **Tramo 16 — ya tiene guarda:** el compositor mide la pendiente de luz bajo la firma real (`firmaCanto` en el QA: luma
   media por fila, de 10 % del alto de la caja por encima a 10 % por debajo, normalizada al lado corto) y el gate
   bloquea sobre **18,5** en una pieza nueva (`firma-canto`, exceptuable sólo con aprobador); en una nueva, además,
   `y: "auto"` descarta esas alturas. En las aprobadas avisa: KV-06-916 (CMP-002) mide 29,3 y queda como decisión del
   operador. Calibrado: el canto de «Que te elijan» 23,3; con el lecho subido, 6,0; pasan 85 de 86 firmas aprobadas. La
   guarda no reemplaza mirarla al 100 %.
5. **CTA:** `variant: "auto"` + `prominencia` (ver arriba) o una variante fija con `cta.variantReason`. El acento es
   obligatorio: `surfaceToken` (contorno y relleno) o `inkToken` (texto) sólo aceptan `accentSurface`, `growthOnDark` o
   `accentInkOnLight`, y omitirlo resuelve lima. Si el acento no alcanza, se regenera el plate: el color no se apaga.
   **Nuevo:** en contorno y relleno, padding ≥ 0,5× (horizontal) y 0,25× (vertical) el cuerpo del CTA (`cta-aire`).
   **Tramo 13 (todas):** padding ≤ 1,2× y 0,8× el cuerpo (`cta-relleno`; lo aprobado va de 0,6× a 0,8× y de 0,35× a
   0,47×); el descriptor DIBUJADO queda a ≤ 1,5× el cuerpo del botón (`descriptor-distancia`, tramo 14: un cursor o su
   etiqueta lo empujaban hasta 3,9×; lo aprobado, 0,57–1,14×); el radio no mete la esquina en el texto y el borde no toca
   las letras (el compositor aborta); `cta.cursorScale` ≤ 1,2.
6. **Selección:** el marco de la selección del titular y el del CTA cuando se pinta no tapan otra voz, y ningún cursor ni
   etiqueta tapa texto, ni el de su destino. En una pieza nueva bloquea (y la columna deja sola el lugar de los corchetes
   del CTA de texto y del marco del titular); en una aprobada se avisa. Una selección sobre un objeto encierra sujeto: al
   menos 1 % de su caja (`seleccion-objeto`; `protect` no cuenta). **Nuevo:** en una pieza nueva es una salida aprobada:
   `razon`, `aprobadoPor` y `plate` en `selection`. La escala de la selección no baja de 1 (piso de las etiquetas).
   `placement`, si lo declaras, desde 320 CSS px. El plate es raster (PNG, JPEG, WebP, AVIF o TIFF), sin transparencia en
   ninguna profundidad, y su máscara marca un sujeto: una máscara vacía bloquea (`mascara-vacia`).
7. **`altText`:** describe la escena —quién, qué hace, dónde, con qué luz— sin transcribir el copy (ni entre comillas
   ni en frases de dos palabras o más). El texto de la imagen lo agrega el compositor en `out/<id>.alt.txt` y en el QA,
   en orden de lectura, y **anuncia siempre el rol del CTA** («Llamado a la acción: «…»», nunca «Botón»: en una imagen
   no hay control), con las etiquetas de los cursores y «Firma: logotipo de Efeonce». El gate sólo avisa si falta la
   escena o si `altText` transcribe el copy.
8. **Escena y tamaño:** `protect: [{ box: [x0, y0, x1, y1], reason }]` (fracciones del lienzo) para lo que el texto no
   puede tapar aunque no sea una persona; `editorialReserve: { maxRight, maxBottom }` (px) si el plan reserva área;
   `final: [ancho, alto]` si el PNG no mide lo mismo que el plate (mismo ratio; sólo se tolera hasta 1 px de
   redondeo del plate, porque Sharp recorta al llenar ambos lados; al menos el 85 % del ancho del
   máster y 780 px, porque la accesibilidad se mide en el máster; el gate verifica el tamaño entregado). Sin `final` se
   entrega el plate, que también necesita 780 px de ancho: si no, la pieza aborta (tramo 16). Ojo con los nombres:
   `protect` y `subjectGuard.ignore` usan `reason`; `excepciones`, `firma`, `conceptoReducido` y `placement` usan
   `razon` (≥ 10 caracteres).
9. **Sin `gesture`, `card`, `hud`, `url` ni `footer`** si la pieza tiene que salir certificada: ninguna guarda los mide
   y salen con 3.

**Flujo.** Corre cada comando sin tubería (`| tail`, `| grep`): el código de salida sería el del último comando.

1. El plate reserva su zona de texto desde la toma: `pnpm foto:prompt <ficha.json>` con `reservas: ["zona-texto"]` y
   `pnpm foto:validar <plate.png> --zona-texto`.
2. Opcional: `pnpm foto:componer:cta <plan> --variantes` pone las tres variantes del CTA lado a lado, a 390 px y con su
   medición, en `out/variantes/`. No toca el QA ni las salidas del plan.
3. `pnpm foto:componer:cta <plan> [id...]` escribe en `<carpeta del plan>/out/` `<id>.png`, `<id>-layout.json`,
   `<id>.alt.txt`, `<id>-overlay.svg`, `<id>-cta-evidence.json`, `preview-390/<id>.png` y el QA **del plan**,
   `out/qa-<plan>.json`, con huellas del plan, el plate, el PNG, el layout y el comando. Sin ids rehace ese QA; con ids
   recompone esas piezas y las fusiona. Un plan mal escrito falla antes de componer, nombrando pieza y campo (campo
   desconocido, rango como `dominantTracking` −0,08…0,12 em, entidad que no es un carácter Unicode, ids que sólo
   difieren en mayúsculas, glifo que la fuente no tiene —también un espacio que no es el común, como U+202F o U+3000—,
   texto sin nada que dibujar, carácter invisible, `|` en la etiqueta de un cursor, entidad en `altText`,
   `signatureSafeArea` incompleta, un campo interno del compositor como
   `ctaVarianteResuelta`, escalas de la selección sobre su techo, `final` bajo su piso, firma fuera de la imagen,
   plate ilegible). Si una pieza aborta —texto sobre el sujeto o
   sobre una zona `protect`, choque de maquetación, plate de menos de 780 px de ancho sin `final`—, la corrida se
   detiene y el mensaje dice qué mover; lo que no se
   compuso sale como falla en el gate. Dos avisos previos que no se ignoran:
   - **otro plan de la misma carpeta registra ese id** (otro `out/qa-*.json`): al recomponerlo, su PNG deja de ser el
     que certificó ese plan y su gate falla hasta que lo recompongas. Decide antes de seguir (en `aeo-cta-v04`, dos
     planes comparten 8 ids);
   - **otra composición usa la carpeta**: el bloqueo `out/.componer.lock` se reclama sin carreras y Ctrl-C lo suelta.
     Espera a que termine y no lo borres a mano. Para probar, copia plan y plate a una carpeta temporal: nunca compongas
     en la carpeta de otra sesión.
4. Mira `out/preview-390/` y la pieza completa: el gate no ve escena ni destino del CTA, y del ritmo sólo mide el salto
   del concepto a la acción (piezas nuevas).
5. `pnpm foto:cta:gate <plan>` y lee el código (tabla). Es la verificación rápida: confía en el QA, cuyas huellas
   (plan, plate, PNG, layout, texto alternativo y comando) recalcula. No edites plan, plate, PNG ni `.alt.txt` después
   de componer: se rompen las huellas; se recompone.
6. `pnpm foto:cta:gate <plan> --reproducir`: **la certificación que no se falsifica** y la que se corre antes de
   entregar. Recompone el plan entero en un temporal con el comando vigente y segmentación nueva, exige que cada
   `out/<id>.png`, `out/<id>-layout.json` y `out/<id>.alt.txt` sea idéntico byte a byte al reproducido —y la fila del QA
   igual, salvo huellas y máscara— y da el veredicto del gate sobre el QA reproducido (0, 1 o 3), sin tocar tu `out/`. Si algo difiere, la pieza cambió con el comando: recompón y vuelve a
   mirarla.
7. `pnpm foto:accesibilidad <plan>` escribe `out/accesibilidad/reporte.md` (por pieza y voz: WCAG según el tamaño en el
   teléfono, APCA, área bajo el umbral, daltonismo y texto alternativo) y `<id>-daltonismo.png` (la pieza a 390 px con
   protanopía, deuteranopía y tritanopía). **No aprueba nada**: es para mirar.

| Código | Qué dice | Qué haces |
|---|---|---|
| 0 | Sin `--reproducir`: `✓ … cumplen el canon según su QA` (huellas y todas las reglas). Con `--reproducir`: `✓ … certificadas por reproducción` | Mira igual los `⚠`; la certificación que se reporta es la de `--reproducir` |
| 1 | `✗`: una regla falla, falta el QA de una pieza o una huella no calza (plan, plate, PNG o layout cambiaron después de componer) | Corrige el plan o recompón. Las huellas cortan antes que las reglas del canon: tras arreglarlas, corre el gate de nuevo |
| 2 | Uso incorrecto (falta el plan, o se pasó `--origen`, que ya no existe) | — |
| 3 | `⊘ NO CERTIFICABLE`: nada falla en lo que pudo verificar, pero no puede probar lo que certificaría | **Nunca es un pase.** Resuélvelo por su causa |

Causas del 3 (si además hay un `✗`, sale 1):
- **QA del formato anterior** (`out/qa.json` compartido, sin huellas ni medición del trazo) → recompón.
- **Otra versión del comando** → recompón, o `--reproducir` si el vigente produce el mismo PNG. La huella del comando
  incluye su código y sus módulos, las versiones de sus paquetes, las fuentes (Bricolage, Poppins; Guttery no), los
  logos y el SVG de la firma web: actualizar cualquiera deja en 3 las piezas compuestas antes.
- **Máscara del sujeto de una caché ajena** (`FOTO_MASCARAS_DIR`) → `--reproducir`, que segmenta de nuevo.
- **`--comando` que no es el compositor del repo** → no se certifica con otro comando fuera de la suite de pruebas.
- **`hud`, `url` o `footer`:** ninguna guarda los mide; no se certifican (tramo 10).
- **`gesture` o `card`:** ninguna guarda los mide, y ni recomponer ni reproducir lo resuelve. El gesto manuscrito está
  fuera de alcance por decisión del operador (2026-09-23): si la pieza tiene que certificarse, no lo lleva; si el gesto
  es parte del concepto, la pieza se reporta como **no certificable**, con esas palabras.

Reporta el veredicto tal como sale —0 certificada, 1 no pasa, 3 no certificable—, nunca «casi pasa» ni «verde salvo…».

**Qué bloquea, además del checklist.** WCAG 2.2 AA por voz según su tamaño **en el teléfono** (390 CSS px de ancho:
texto normal 4,5:1, grande 3:1), medido sobre el **trazo** (el 1 % peor de los píxeles del glifo), no sólo sobre la
caja; si falla, mueve el texto, protege la zona con `protect` o regenera el plate. El **CTA exige 4,5:1 a cualquier
tamaño**, nunca el umbral de texto grande, y además **APCA y daltonismo** en su texto, borde y relleno; en las demás
voces, APCA y daltonismo avisan. Bordes y rellenos del CTA ≥ 3:1, y el borde del contorno ≥ 1 CSS px y ≥ 3:1 como se
ve en un teléfono (390 px × DPR 2). También bloquean las invariantes de maquetación (texto, botón y firma no se tocan:
a menos del 0,4 % del lado corto, medido sobre lo dibujado; ninguna selección tapa una voz que no sea su destino), el
tamaño entregado y la falta de máscara del sujeto (`sin-mascara`). Salvo APCA y daltonismo del CTA (`cta-perceptual`),
nada de este párrafo admite excepción, y tampoco las huellas ni una firma automática por encima del contenido.

**Aire y ritmo (tramo 16).** «No se tocan» es exacto en dos niveles. Bajo el 0,4 % del lado corto se TOCAN: nunca se
exceptúa. Entre dos voces, o una voz y el botón, además hace falta **0,25 em del cuerpo menor del par** (lo aprobado
entre voces mide 0,267 em como mínimo; con la firma, que no tiene cuerpo, cuenta el de la otra voz), y ese piso sí se
exceptúa, con aprobador (`holgura`, en todas las piezas). El botón cuenta su trazo por fuera: medio trazo en contorno,
1 px en relleno. En una pieza nueva, además, **ritmo** (`ritmo`): del concepto (cierre, o titular si no hay cierre) a
la acción hay más aire que el mayor hueco dentro del grupo de acción (nota → CTA → descriptor), como pide Tres voces +
acción (jerarquía, regla 2); 43 de 114 aprobadas lo invierten y siguen con las reglas del 2026-09-22. El descriptor va
bajo la selección del CTA (≈ 0,7 % del ancho bajo el botón; en contorno y relleno no se pinta) y a ≥ 0,6× su cuerpo:
`note.gapAfterClosure` (o `cta.gapAfterNote` sin nota) tiene que ganarle a ese hueco.

**Avisos que se miran** (no bloquean, pero tampoco son ruido):
- **Variante del CTA elegida sin margen:** `auto` no encontró ninguna con margen (×1,1) y dejó la que más separa. Pasa
  por poco y puede no alcanzar en otra pantalla o con compresión: prueba otra tinta, otro acento u otro plate.
- **Corchetes del CTA de texto bajo 1 CSS px o bajo 3:1:** el trazo de AXIS mide ≈ 0,69 CSS px en un teléfono en todos
  los formatos. Es un valor del contrato AXIS: no lo engroses por tu cuenta.
- Texto bajo 9 CSS px en el teléfono, en una pieza del canon anterior (en una nueva bloquea: `legibilidad`) · `altText`
  ausente o que transcribe el copy · APCA o daltonismo fuera del CTA · `placement` declarado · CTA, descriptor, nota o
  etiqueta fuera de la columna y firma sobre un canto, en una pieza del canon anterior (en una nueva bloquean:
  `cta-columna` y `firma-canto`) · poco aire sobre los corchetes · cada excepción y salida aprobada. (Una máscara que no
  marca ningún sujeto ya no avisa: bloquea, `mascara-vacia`.)

**Excepciones y salidas con aprobador.** Una excepción exceptúa **una regla en una pieza** y no apaga la medición: el
gate la imprime con su razón y quién la aprobó.

```json
"excepciones": [{ "regla": "zona-segura", "razon": "<por qué, al menos 10 caracteres>",
  "aprobadoPor": "<id del registro, de quien la aprobó>", "plate": "<sha256 del plate>", "hasta": 12 }]
```

- **Reglas:** `zona-segura`, `firma-contraste`, `firma-tamano`, `firma-sobre-sujeto`, `acento-cta`,
  `concepto-completo`, `jerarquia`, `reserva-editorial`, `cta-perceptual`, `dominante-mayor`, `eje-centrado`,
  `cta-relleno`, `descriptor-distancia`, `cta-cuerpo`, `paleta-voces`, `seleccion-objeto`, `cta-tamano`,
  `mascara-vacia` y `holgura` (sólo el piso de 0,25 em: tocarse no se exceptúa); en las piezas nuevas también
  `firma-posicion`, `orden-lectura`, `jerarquia-rol`, `cta-aire`, `tracking-titular`, `legibilidad`, `cta-columna`,
  `firma-canto` y `ritmo`. La lista vigente es `REGLAS_EXCEPTUABLES` en `scripts/foto/cta-esquema.mjs`.
- **`aprobadoPor`:** un `id` de `scripts/foto/aprobadores.json` (hoy `julio-reyes`; `suite-pruebas` vale sólo en los
  planes de la suite: ruta real fuera del repo y su marca `.suite-pruebas`). Sumar a alguien lo decide el operador, con
  commit; con el registro editado sin commit, una pieza que usa una aprobación no se certifica.
- **`sin-firma`, `conceptoReducido` y `subjectGuard.ignore`** también llevan `aprobadoPor` y el `plate` aprobado.
- **`plate`:** el sha256 del plate aprobado (`shasum -a 256 <plate>`; el gate también lo imprime). Un plate regenerado
  se vuelve a aprobar.
- **`hasta`**, obligatorio cuando la regla se mide con un número: px máximos fuera de la zona (`zona-segura`), fuera
  de la reserva (`reserva-editorial`) o de silueta bajo la firma (`firma-sobre-sujeto`); contraste mínimo
  (`firma-contraste`); fracción mínima del lado corto (`firma-tamano`: `0.14`, no `14`); ratio mínimo (`jerarquia`,
  `dominante-mayor`); px mínimos del par (`holgura`); px máximos fuera de la columna (`cta-columna`); pendiente
  normalizada máxima (`firma-canto`); cociente mínimo entre el aire concepto → acción y el mayor aire dentro de la
  acción (`ritmo`). `acento-cta`, `concepto-completo` y `cta-perceptual` no lo llevan. Si no sabes la medida, el gate
  la imprime al rechazar la excepción.
- Una excepción que no vale no apaga nada: la regla bloquea y el gate dice por qué. Ninguna cambia cuánto crece la
  pieza.
- `firma: { modo: "sin-firma", … }`, `conceptoReducido: { razon, aprobadoPor }` y `subjectGuard.ignore: [{ box, reason,
  aprobadoPor }]` (≤ 10 % del lienzo por zona y 15 % en total; sólo falsos positivos, nunca una persona real) también
  exigen aprobador del registro.
- 🔴 **NUNCA inventes un aprobador**, ni copies `suite-pruebas` a un plan real, ni escribas el id de alguien que no
  aprobó esa pieza. Tú preparas la excepción —regla, razón, sha del plate y `hasta` medido— y se la presentas al
  operador con la pieza; `aprobadoPor` se escribe cuando él la aprueba. Si falta, pregunta y espera.
- Las piezas aprobadas que el canon hoy reprueba se dejan como están y se corrigen al recomponer: no las pongas en verde
  a punta de excepciones.
- `placement: { anchoCssPx, razon }` **sólo endurece**: el ancho efectivo es el menor entre 390 CSS px y el declarado.
  Nunca sirve para aflojar una medición.

**Sin velo:** `scrimTop` y `scrimBottom` no existen (el esquema los rechaza). El lecho donde va el texto o la firma
sale del prompt; si la toma no lo trae, se regenera.

**Decidido el 2026-09-23:** canon nuevo sólo hacia adelante (ninguna imagen ya hecha se regenera; unas pocas de prueba,
sí); firma de 25 % en horizontales; firma dentro de AXIS en las piezas nuevas (en las existentes se sube sólo donde el
lecho ya cubre la nueva posición); zona AXIS por defecto; sin velo.

**Pendientes del operador** (no los decidas tú; si tu pieza depende de uno, pregunta): si la variante sin margen pasa a
bloqueo; el grosor de los corchetes AXIS; la reserva de texto de los plates 16:9 de piezas con CTA (hoy 42 %; el piso
de legibilidad pide cerca de 57 %); y la firma de KV-06-916 (CMP-002), aprobada sobre el canto de una mesa: corregir su
lecho o dejarla con el aviso. El piso de legibilidad ya está decidido: CTA 11 CSS px y las demás voces 9 en las
piezas nuevas, con los nombres de los cursores fuera. Detalle: §18 del
[compositor de CTA](../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).

## Jerarquía por voces: receta probada en carrusel (2026-09-19)

Caso: carrusel «Nivel de búsqueda» (GTA VI, 9 láminas 1080×1350 + pieza suelta), aprobado tras una pasada pedida
por el operador para que «no haya jerarquías planas». Compositor de referencia:
`ai-generations/2026-09-19_nivel-de-busqueda/componer-v2.mjs` + `brief/slides-v2.json`; método completo en la
[bitácora](../../../docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md).
Es una receta de caso, no un preset: nombres de receta desde `axisAdvertising.recipes`; los pesos citados son los
que usó el caso y se revalidan con cada fondo, largo y soporte.

| Voz | Función | Tipografía (caso) | Tinta (caso) |
|---|---|---|---|
| Etiqueta | Nombra la misión/tema | Poppins 700 mayúsculas, tracking `structureLabel` (el **marcador estrella fue puntual de GTA VI**: no va en otras piezas) | blanco |
| Entrada | Prepara la tesis | Bricolage `ideaLead`; nombres propios con `**…**` a 760 | `softOnDark` `#cfe4fa`; énfasis blanco |
| Dominante | La tesis en 1–3 palabras | Bricolage `ideaImpact` a ancho 78 | blanco; palabra clave `[[…]]` en naranja Efeonce |
| Cierre de frase | Completa la tesis | Bricolage `ideaMedium`, remate `**…**` a 800 | blanco, o celeste con remate blanco |
| Tarjeta HUD | Giro/argumento sobre la escena — **sólo ilustración/HUD de género; en foto de marca va como texto limpio** | Poppins 400 + remate Poppins 700 | celeste + blanco |
| Gesto (opcional) | Voz humana breve | Guttery, 1 por pieza, ≤ 3 palabras | blanco |

- **Regla: dos niveles vecinos nunca comparten peso y color a la vez.** La v1 falló por eso (entrada 740 vs dominante
  780, ambos blancos): se leía como un solo bloque. Separa por al menos dos ejes (peso, tinta, escala, familia).
- Una etiqueta naranja sobre cielo violeta no pasó contraste: la etiqueta va en blanco y el naranja se reduce al
  marcador. El naranja es acento, no tinta de texto por defecto.
- **Ancho 78 de Bricolage (eje autorizado 75–100)** para el dominante es una decisión declarada del caso: registro
  condensado de cartel de acción sin deformar el glifo. Declárala en la ficha tipográfica; no es el ancho por defecto.
- El dominante se ajusta a un ancho máximo declarado (`dominantMax`) para dejar aire a las etiquetas de los
  colaboradores, que viven fuera de su caja.

### Texto enriquecido por palabra

La jerarquía también vive dentro de la línea. El compositor de referencia expone `richBlock` + `parseRich`:

- `**negrita**` sube al peso superior **de la misma familia** (par base/negrita declarado con
  `BRIC(recipe, width, boldWeight)` o `POP = { base: 400, bold: 700 }`); no cambia la tinta.
- `[[acento]]` cambia la tinta al `accentFill` del nivel: naranja en el dominante, blanco en entrada, tarjeta y pie.
- `|` fuerza salto; el wrap es por palabra con estilo por segmento, anclado por la parte superior de la tinta.
- Devuelve `accentBoxes`: **el contraste del acento se mide por separado** del resto del bloque.
- **El acento naranja sólo va sobre cielo oscurecido.** Sobre horizonte o skyline encendido cae a 1,0–2,0:1 (p98). Si
  no se lee a 390 px, degrada el énfasis a peso con tinta clara (`**…**`) en vez de naranja (casos «ChatGPT.» en la
  portada y «Nadie» en la pieza suelta). La p98 es conservadora (pesca luces puntuales): acentos naranjas ≥ 150 px con
  1,8–2,5:1 se leyeron bien a 390 px; si los apruebas así, registra la revisión visual junto al número.

### Guttery

- Archivo: `~/Library/Fonts/Guttery.otf` (no versionado en el repo; declara `fontFilesBundled: false` en la
  evidencia). Si no existe en la máquina, esa capa se omite; no se sustituye por otra familia.
- Cobertura verificada 2026-09-19: `¿ ¡`, tildes y `ñ` (`¿apostamos?`, `¡a la orden!`, `¿hola?`).
- Una por pieza, ≤ 3 palabras, rotación leve; **blanco sobre fondos cálidos** (el naranja se pierde en el atardecer).

## Reglas duras

- 🔴 **Los gadgets de Nexa son identidad, no atrezzo** [operador, 2026-09-21]. Su reloj es un **SMARTWATCH**,
  nunca analógico, y su equipo es siempre tecnología premium de la **generación vigente**: iPhone, iPad con
  Pencil, MacBook, AirPods · **DJI Osmo Pocket/Action** y **DJI Mic 3** o lavalier **Rode** para grabar ·
  **Shure** en podcast · cuerpo **Sony α** o **Canon EOS R**. Encendidos y en uso, **ningún logotipo de
  tercero legible**, un objeto manda por escena. Canon:
  [props tecnológicos](../../../docs/operations/brand-photography/NEXA_TECH_PROPS_V1.md).

- 🔴 **Con Gigi en cuadro, el sistema de color de la pieza ya está decidido** (2026-09-21). Gigi —mascota de
  Google Gemini y tercera mascota de partner con biblioteca 3D, después de Clawd y Codex— no «porta un color»:
  **es el espectro completo de Google** (rojo en la punta, azul dominante, verde-lima abajo, y su contorno de
  tinta negra dibujado a mano como firma). Por eso es el **único acento de color** de la pieza y Efeonce vive en
  el **navy y la estructura**; buscar otro portador para el azul de Efeonce compite con un degradado de tres
  colores y pierde. Si hay ropa Efeonce en la misma pieza, prohibir explícitamente el degradado arcoíris y la
  punta enroscada sobre la prenda, **sin describir nuestro emblema** —describirlo lo tergiversa: manda la
  referencia del kit—. Gigi es propiedad de Google: interpretación 3D de uso interno y orgánico, y orgánico
  aprobado **no** es pauta (antes de pautar, validar contra su guía de marca). Poses, familia AEO y reglas de
  producción: [`mascot-3d-pose-library.md`](../greenhouse-ai-image-generator/references/mascot-3d-pose-library.md).

- Usa archivos tipográficos reales y `font-synthesis: none`; no simules cursiva, bold ni Guttery con otra
  familia. Si falta el archivo autorizado, detén esa capa y usa una receta permitida que sí exista.
- Bricolage puede dominar titulares; Poppins ordena apoyo, continuidad y énfasis breve; Guttery funciona como
  gesto corto y opcional. La pieza manda sobre el nombre de la familia: si dos voces compiten, retira una.
- No copies cifras desde esta skill ni inventes presets universales. Lee la versión vigente de
  `axisAdvertising`; un valor de campaña sólo se reutiliza si el nuevo formato reproduce sus condiciones.
- No incrustes copy crítico o logos dentro de una generación cuando el texto debe ser exacto.
- La fotografía de marca propia Efeonce sigue el
  [lenguaje fotográfico](../design-studio/references/efeonce-photographic-language.md): antes de generar, abre
  imágenes aprobadas comparables y registra los portadores reales del azul activo y del acento naranja **o** lima
  en la ficha; después comprueba su presencia en el plate. La firma sobre el lecho desenfocado usa el SVG oficial
  **compuesto** (en pieza nueva, mínimo 25 % del lado corto en horizontal y 20 % en vertical/cuadrado; máximo 35 %,
  contraste ≥ 4,5:1 medido), **nunca generado**. Las aprobadas bajo el canon anterior conservan sus píxeles.
- **La frontera con la toma (2026-09-20).** Lo que la **foto** debe reservar son **seis reservas** —zona de texto,
  objeto para enmarcar, lecho de la firma, aire para cursores, campo profundo al margen y **lecho por formato**
  (**[medido]**: 4:5 **18%** · 9:16 **22%** · 16:9 **16%** · 1:1 **18%**, este último *sin validar*)— y **no se piden
  a mano**: se emiten con `pnpm foto:prompt <ficha.json>` y se miden con `pnpm foto:validar <plate.png>`. Canon:
  [reserva de espacio en el plate](../../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md).
  La **capa de composición gráfica** encima de la foto —tipografía, jerarquía, cursores— sigue siendo canon **de esta
  skill**; las pruebas fotográficas históricas no la aprueban. Desde 2026-09-22 está aprobado el sistema
  **Tres voces + acción** (texto/contorno/relleno), no automáticamente cada pieza completa.
- **Una reserva sin materia es el DON’T, en cualquier tono** (**[decisión del operador, 2026-09-20]**). Una zona
  oscura está perfecta cuando la superficie oscura existe de verdad y **tiene nombre**; el error es decidir el tono por
  regla global, clara u oscura. El detector de la «losa» está en la **entrada** —la guarda de materia de `foto:prompt`,
  que rechaza «a wall» o «the surface»—, **no en una métrica**: planitud, canto y calma no distinguen la versión
  rechazada de la buena, porque la diferencia es **semántica**.
- No uses rectángulos decorativos detrás de palabras como solución automática. Un plate existe para asegurar
  contraste y debe responder a la composición, no parecer una etiqueta accidental. El CTA funcional de
  **Tres voces + acción** sí admite su superficie acotada de relleno; no extenderla al copy de apoyo.
- No conviertas un ejemplo aprobado en regla universal ni un mockup didáctico en campaña publicada.
- No presentes una receta del Workbench como aprobación creativa. La recomendación aún requiere composición,
  QA tipográfico, contraste sobre píxeles reales y las aprobaciones de marca/cliente que correspondan.
- No copies `CollaborationSelection.astro` ni su CSS hacia otra superficie. Usa el contrato portable y exige
  un adapter que mida el objeto real, mantenga cursores acting fuera del bounding box y preserve juntos cursor
  multiplayer y placa de identidad. Si no existe adapter para ese motor, reporta la capacidad como pendiente;
  no la simules con `top`/`left` arbitrarios.
- Producir y corregir son acciones reversibles autorizadas por el encargo. Programar, publicar, enviar o gastar
  presupuesto sigue requiriendo la autoridad correspondiente.

## MCP

`mcp.efeonce.org` puede aportar herramientas y contexto cuando el dominio conectado los expone, pero hoy no
publica este manual: el catálogo `get_greenhouse_skill` sólo acepta manuales que gobiernan tools MCP reales y
la superficie federada no contiene una tool de composición publicitaria. No asocies este conocimiento a una
tool ajena ni presentes la conexión MCP como fuente de fonts, logos o aprobación. Cuando exista una capability
creativa federada, su manual podrá proyectar este mismo contrato sin duplicarlo.

## Supporting tagline portable

Cuando una pieza necesite una frase de apoyo vinculada al ancho de su lockup principal, usa
`axisAdvertising.compositions.supportingTagline`. La receta no contiene copy fijo ni publica un componente:
el agente entrega la oración en orden de lectura, declara la medida de referencia y asigna hasta dos segmentos
por intención. `growth` y `intervention` son roles semánticos; no significan que todas las apariciones de una
palabra concreta reciban siempre el mismo color.

El adapter debe tratar la frase como una unidad, conservar espacios naturales y escalarla uniformemente hasta
la medida del lockup. Nunca distribuye palabras con `space-between`, márgenes por fragmento o coordenadas libres.
Prefiere una línea; si mantenerla reduce la lectura bajo el piso del formato, usa un salto balanceado de la
oración completa. Mide contraste y ritmo después del fitting. El espécimen `Cómo escalar... automatizar...` es
evidencia del contrato, no su API.

Para una producción nueva, copia y completa `templates/axis-advertising-layout-contract.yaml`. La variante
Regular y la Bold Italic deben venir de los assets Poppins versionados del consumidor; nunca de una ruta local
del sistema ni de síntesis tipográfica.

## Selección colaborativa invocable por agentes

**Escala y color de campaña (adapter, 2026-09-17).** `renderCollaborationSelection` acepta `presentation` opcional:
`collaboratorScale` (etiqueta y cursor colaborador; ~1,9 para que el nombre se lea a 390 px en 1080 de ancho),
`localCursorScale` y `participantColors` por id de cursor (p. ej. color de marca de un partner). La tinta de la
etiqueta se elige por contraste WCAG y el render falla bajo 4,5:1. Sin `presentation` el resultado es idéntico al
contrato por defecto. No recolorear ni reescalar el SVG a mano. Caso: KV «Tu IA no conoce tu negocio».

**Fondo bajo una selección.** Los controles (trazo `#a6cdf5`, tiradores blancos) están diseñados para fondo oscuro y
desaparecen sobre claro: el fondo bajo la selección debe ser oscuro por escenografía de la imagen, no por degradado.

La API agent-facing vive en AXIS, no en la página del Lab. Dentro de Greenhouse, un agente normaliza la
intención con:

```bash
pnpm creative:collaboration:resolve -- \
  --input <campaign-run>/brief/collaboration-selection-intent.json \
  --out /ruta/absoluta/collaboration-selection.manifest.json
```

El agente autoriza intención, no píxeles: `targetId`, tipo de objeto, variante de selección, aire, overlay y
cursores. El resolver completa defaults, dirección, acción y attachment, y rechaza contradicciones. El adapter
del compositor liga `target.id` al texto/objeto/grupo real y verifica la geometría. El Campaign Layout Compiler
consume el intent declarado en el contrato y soporta `headline|support|hook|lockup`; `targetKind` debe coincidir
con `text|text|object|group`. Esta ruta no llama a un modelo, no publica ni aprueba. Usa
`templates/collaboration-selection-intent.json` como estructura, no como copy fijo.

Contrato observado al componer piezas reales (2026-09-16, [bitácora](../../../docs/operations/social/2026-09-16-viva-mexico-y-previa-18-production-method.md)):

- los colaboradores sólo se anclan en esquinas (`collaborator-anchor-not-corner`); un cursor `moving` no lleva
  `targetId` (`moving-cursor-must-not-target-selection`);
- las etiquetas de esquina se ubican fuera del objeto: deja aire lateral (en 1080 px, un titular a ≤ ~64 % del ancho)
  y exige `evidence.withinCanvas` antes de exportar (necesario, no suficiente: ver el caso sobre fotografía abajo);
- `renderCollaborationSelection` emite etiquetas como `<text>`; si el rasterizador no garantiza Poppins, conviértelas a
  trazados con la fuente real en la misma posición y falla si queda algún `<text>`;
- las etiquetas quedan pequeñas por contrato: no cargues en ellas información que la pieza necesite leer.

Sobre una **fotografía** (primer uso, 2026-09-17, «¿Claude o Codex?», `ai-generations/2026-09-17_claude-o-codex/`):

- receta: `resolveCollaborationSelectionIntent` → `renderCollaborationSelection` con `targetBounds` = caja de
  **tinta** del titular (no la métrica de la fuente); etiquetas a trazos con fontkit, porque el render no tiene
  fuentes instaladas;
- con **dos colaboradores** el aire lateral se paga dos veces, porque etiquetas y cursores viven **fuera** de la caja
  del objetivo: el titular al 66 % del ancho sacaba las etiquetas del lienzo por ambos lados; funcionó al 58 % con
  los colaboradores anclados arriba (`top-start` y `top-end`), que además los aleja de la coronilla del retratado;
- **`evidence.withinCanvas: true` no prueba que la etiqueta respire**: puede dar `true` con la placa pegada al
  borde. Mira el render en ese borde antes de exportar;
- los colaboradores pueden ser **mascotas de partners** disputándose el objeto (Clawd `#d77757`, Codex `#2f67db`
  medido sobre el plate, no inventado): la decisión del titular es el objeto seleccionado.
  `presentation.participantColors` acepta sólo `#rrggbb`.

En **carrusel sobre ilustración** (2026-09-19, «Nivel de búsqueda», `componer-v2.mjs`):

- **Cursores en movimiento = los «cursores solos».** Un colaborador que sólo transita se declara
  `{ kind: 'collaborator', state: 'moving', canvasRegion: '<región>', action: 'move', label }`, sin `targetId`.
  **No existe cursor sin caja**: `renderCollaborationSelection` siempre dibuja la selección del target; si quieres
  presencia sin selección, la pieza igual necesita un objeto seleccionado y el `moving` pasea fuera de él.
- **Anclas con texto alineado a la izquierda**: colaboradores en `top-end` / `bottom-end`; `top-start` saca la etiqueta
  del lienzo por el margen izquierdo. El cursor local acepta cualquier ancla; usa **`end-center`** cuando hay una frase
  de cierre debajo del dominante (`bottom-*` la tapaba).
- **Etiquetas cortas**: «Equipo Efeonce» se salió del lienzo con dos colaboradores → «Efeonce». Roles de una palabra
  (SEO, Contenido, Data, PR, Dev, Nexa) leen mejor a 390 px.
- Si el dominante está alto, las etiquetas de esquina chocan con el HUD o la etiqueta: baja el bloque, no el cursor.
- **Diagnóstico**: con `evidence.withinCanvas === false`, falla e imprime `evidence.cursorEvidence[].labelBounds`
  (junto a `evidence.target` y `bounds`) para ver qué placa se sale y por qué lado.
- `presentation` del caso: `collaboratorScale: 1.8`, `localCursorScale: 1.2`, `participantColors` por id en `#rrggbb`
  (Clawd `#d77757`, Codex `#2f67db`, Nexa `#d6246e`, SEO `#12afa2`, Contenido `#ff6500`, Data `#5d50ff`, Dev
  `#0375db`). Los colores de rol son del caso, no una paleta canónica.

## Cierre por placement y entrega a Finales

Aplicar el canon Tres voces + acción, §Zonas seguras: comprobar texto/CTA/cursor y firma por separado;
la firma cierra al pie y cualquier solapamiento se declara. Ajustar la extensión del lecho a la composición. No usar el ratio como sustituto del placement ni
presentar una máscara de QA como captura live. Con autorización de promoción, pasar sólo exports
verificados a Finales, conservando pilotos. Acompañar concepto, audiencia, fase del embudo, hipótesis,
CTA/destino, KPI, prompts/referencias, editables, comandos, hashes y evidencia. Final creativo ≠ publicación.

## Continuidad de producción Paid Media

Cargar el [método completo SEO/AEO](../../../docs/operations/social/2026-09-22-seo-aeo-paid-media-production-method.md) al retomar conceptos, prompts, composición o entrega entre agentes. Integra los dos territorios AEO, registro C, metáfora digital, kits, anatomía/pantallas, cuatro ratios, embudo y paquete reproducible. Para trabajo nuevo usar el compositor canónico de CTA; para reconstruir un final histórico, su runner congelado. Auditar compatibilidad: `centerX` y `signatureY` de las corridas no migran automáticamente. Un gate con cero piezas o sólo p98 no acredita el contrato. La firma y el tamaño físico del lecho se revisan juntos: bajar el SVG no corrige una foto con media imagen vacía.

## Continuidad de campañas CMP

Canon: [registro y contrato de brief](../../../docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md#8-contrato-del-brief-ampliado-y-templates).
El pensamiento vive en `Alineación/2. Campañas/CMP-###_…`; los assets, en la carpeta del canal.

Antes del prompt releer brief y decisiones vigentes: un archivo llamado FINAL puede conservar copy descartado.
Registrar job, tensión, prueba, copy literal, CTA/destino y una palanca por ficha. La aprobación de dirección no
aprueba todos los renders; QA editorial, preview de placement y autorización paid se registran separados.

## Manifiesto de pauta y continuidad MCP

Canon: [manifiesto compartido y handoff MCP](../../../docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md).
Finales presenta títulos legibles, IDs estables y tipo/ratio. Recetas, versiones y QA van a Recursos; el manifiesto enlaza ambos. Separar texto en arte del copy externo; preview por placement antes de cargar, sin equiparar ratio a elegibilidad.
