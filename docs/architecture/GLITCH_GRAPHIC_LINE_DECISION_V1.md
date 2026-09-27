# Glitch Graphic Line — sub-línea de «La órbita» — Decision V1

> **⚠️ Alcance: esta decisión aplica SÓLO a Glitch**, el magazine semanal de Efeonce. No modifica la línea gráfica de
> Efeonce ([ADR «La órbita»](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)) ni se aplica a ninguna otra pieza de Efeonce.
>
> **Tipo de documento:** ADR (decisión de marca y de composición)
> **Estado:** **Accepted** (2026-09-27) para la existencia de la sub-línea, su alcance y las piezas aprobadas ·
> **Proposed** (pendiente del operador) para el flujo de composición
> **Creado:** 2026-09-27 por Claude, a pedido del operador (Julio Reyes)
> **Última actualización:** 2026-09-27 por Claude
> **Norma operativa:** [`GLITCH_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
> **Línea madre:** [`EFEONCE_GRAPHIC_LINE_V1.md`](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
> **Relacionadas:** [ADR «La órbita»](./EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) ·
> [ADR del pipeline editorial de Glitch](./GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md) ·
> [ADR del Artifact Composer](./GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) ·
> [PDR-020 §6](../public-site/decisions/PDR-020-canales-propios-sistema-editorial.md#6-glitch-es-una-franquicia-cross-superficie-nunca-una-marca-social-nueva) ·
> [ADR de la identidad sonora](./EFEONCE_SONIC_IDENTITY_DECISION_V1.md)
> **Canvas de referencia (privado):** [«Glitch en La órbita»](https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS)

## Contexto

Glitch es el magazine semanal de Efeonce de marketing, tecnología y creatividad + IA: un top 8 donde manda el punto de
vista del narrador. Vive en el blog, en LinkedIn y, como propuesta, en video. PDR-020 §6 lo define como una franquicia
cross-superficie, nunca una marca social nueva.

«La órbita» ya es la línea canónica de Efeonce, pero no tenía respuesta para una franquicia editorial con wordmark propio,
voz de narrador y una cadencia semanal que exige variar la portada sin reinventarla. Cada edición resolvía su gráfica a
mano y cada agente la reinterpretaba. La exploración se hizo en el canvas «Glitch en La órbita» y el operador aprobó el
sistema de portada y las láminas del carrusel el 2026-09-27.

## Decisión aceptada

1. **Existe la sub-línea de Glitch**, complementaria de La órbita. Aplica **sólo a Glitch**; no es la línea de Efeonce y
   no se aplica a ninguna otra pieza.
2. **Glitch hereda de La órbita sin redefinir:** la gramática «el anillo pregunta, la esfera responde», los verbos
   rodea/mide/enfoca, una sola esfera por pieza, ningún texto cruza la órbita, el halo, la anatomía de la lente, el fondo
   `#001a33`, Bricolage Grotesque + Poppins, la firma de piezas (logo de Efeonce centrado abajo), la regla de contraste
   del acento, la iconografía AXIS (Trazo y Plastilina) y el territorio sonoro «Puntos suspensivos».
3. **Es exclusivo de Glitch (nunca en piezas de Efeonce):** la manzana como esfera, el verde `#6ec207` como acento, el
   navy `#022a4e` del wordmark, la falla en bytes, Guttery como voz del narrador, la cabecera «EDICIÓN #N», «El micrófono
   se abre / se cierra» y el Glitch Drop.
4. **Efeonce firma Glitch.** La firma de cada pieza es el logo de Efeonce; Glitch es contexto, como un producto (manual
   de La órbita §7). La burbuja URL no aplica a Glitch.
5. **Piezas aprobadas por el operador el 2026-09-27:**
   - **Sistema de portada** con tres plantillas (A · noticia con foto, B · tipográfica, C · mosaico) y la **regla de
     rotación**: nunca dos semanas seguidas con la misma plantilla; la elige el contenido. El feed de nueve semanas está
     aprobado.
   - **Lámina interior** del carrusel de LinkedIn (1080 × 1350) y su variante de la **noticia 1** con la franja «EL
     MICRÓFONO SE ABRE».
   - **Contraportada** con «El micrófono se cierra», acciones Plastilina, CTA de suscripción y firma con eslogan.
   - Ajustes ya aplicados: cabecera sin línea fina; «El micrófono se abre…» fuera de la portada (abre la noticia 1);
     «Desliza» con la mano Plastilina en el pie de portada.
6. **Lo que no está en el punto 5 no es canon**: la variante con lente, el blog, el vlog 16:9, el reel y las tarjetas
   finales son propuesta; la manzana y el verde como token de franquicia, los acentos alternativos, la historia 9:16 y el
   carrusel panorámico son exploración (norma §9).

## Decisión propuesta — flujo de composición

> **Estado: Proposed.** Pendiente de aprobación del operador. Hasta aceptarla no existe nada de lo que sigue: hoy las
> piezas se arman desde el canvas.

Objetivo: **que ningún agente reinterprete la línea.** Los agentes llenan datos; nunca eligen coordenadas ni plantilla a
mano.

1. **Canon humano en Greenhouse:** la norma de la sub-línea y este ADR.
2. **Valores y contratos en AXIS** (dueño de los valores):
   - Hecho en la rama `feat/glitch-line` de `efeoncepro/axis-design-system`, sin push: página del Lab
     `/references/glitch/`, gemelo JSON `/references/glitch.json` y guía de composición para agentes
     `docs/agent-composition/glitch.md`.
   - Por hacer: tokens `glitchLine` en `@efeoncepro/axis-tokens` (color, tipo, cabecera, bytes, manzana, zonas seguras
     por formato, motion); assets en `@efeoncepro/axis-brand-assets` (wordmark light/dark, manzana SVG, glifos
     Plastilina, Guttery si la licencia lo permite); contrato `efeonce.glitch-line` 0.1.0 con reglas verificables (una
     esfera por pieza, verde nunca como texto sobre claro, nada sobre la cara, rotación de plantillas, contraste).
3. **Composición con el Artifact Composer** (motor domain-free de Greenhouse, `src/lib/artifact-composer/**`; catálogos
   como dato; render hermético en el Cloud Run Job `artifact-worker`):
   - Catálogo **`glitch-edition`** con las plantillas: portada A/B/C, interior, interior-noticia-1, interior-lente,
     contraportada, historia 9:16, banner de blog A/B/C 16:9 (+ 1:1), banner interno 1600 × 900, portada de reel y
     miniatura.
   - Entrada: un **manifiesto de edición** (número, fechas, tesis, 8 noticias con sección, titular, medio, foto + crédito
     + licencia, POV remate + porqué, foto fuerte sí/no, portada).
   - El **selector** elige la plantilla de portada por la regla de rotación; el autor no la elige
     (`TemplateAuthorityError`).
   - Salidas: PNG por lámina, PDF del carrusel de LinkedIn e imágenes del blog. Gate visual a cero píxeles.
4. **Motion con HyperFrames** (HTML + GSAP → video; skills `hyperframes`, `hyperframes-cli`, `motion-design-studio`):
   - Los overlays del reel y del 16:9 son composiciones HyperFrames del mismo catálogo, renderizadas por edición a video
     con alfa (ProRes 4444 `.mov` o WebM con alfa) para que el editor las ponga sobre la toma.
   - La apertura y el cierre (puntos → manzana) van sincronizados con el mnemónico. Un agente las anima.
   - Valores de movimiento: `efeonceGraphicLine.motion` de AXIS más una spec de Glitch (entradas y salidas de overlays,
     curva de los bytes, punto de sincronía con el mnemónico) a registrar en AXIS.
   - Plantillas MOGRT de Premiere sólo si el editor necesita editar texto en su programa.
5. **Flujo semanal:** contenido de la edición (pipeline editorial PDR-020 / Content Factory) → manifiesto → el Composer
   renderiza todas las superficies → QA humano → publicación (LinkedIn vía Metricool, blog vía WordPress) → grabación del
   host → el editor monta los overlays renderizados del mismo manifiesto.

### Trabajo a crear (sin ID de task reservado)

| # | Trabajo | Depende de |
|---|---|---|
| a | Tokens, assets y contrato de Glitch en AXIS | aprobación de la manzana y el verde como token de franquicia |
| b | Catálogo `glitch-edition` del Artifact Composer | (a) |
| c | Overlays HyperFrames + render con alfa | (a); aprobación del kit de overlays del reel |
| d | Callout v2 en el bloque de WordPress `efeoncepro/glitch-drop` | aprobación del callout v2 |
| e | Alta de los 5 glifos Plastilina en AXIS | aprobación del operador |
| f | Licencia de Guttery | — |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Aplicar La órbita a Glitch sin sub-línea | La órbita no tiene wordmark de franquicia, voz de narrador ni sistema de portada semanal; cada edición seguiría resolviendo la gráfica a mano |
| Hacer de Glitch una marca con identidad propia, separada de Efeonce | Contradice PDR-020 §6 (franquicia, nunca marca social nueva) y la regla «Efeonce firma todo» de La órbita §7 |
| Llevar los rasgos de Glitch (manzana, verde, bytes, Guttery) a toda la marca Efeonce | Diluye La órbita y confunde la franquicia con la marca madre |
| Contraportada con órbita 8/8 | Descartada por el operador: una órbita decorativa «no tiene nada que decir» |
| Portada con una sola plantilla fija | Una franquicia semanal necesita variar sin reinventarse; la rotación A/B/C por contenido lo resuelve |
| «El micrófono se abre…» en la portada | Ajuste del operador: abre la noticia 1 |
| Reel con pantallas completas | El host está en cámara todo el tiempo: el kit son overlays encima de la toma (propuesta) |
| Agentes que eligen plantilla y coordenadas a mano (en el flujo propuesto) | Es la reinterpretación que el flujo existe para evitar; el selector aplica la regla de rotación |

## Consecuencias

- Toda pieza de Glitch sigue la norma de la sub-línea; toda pieza de Efeonce sigue ignorando los rasgos exclusivos de
  Glitch.
- Hasta que existan los tokens `glitchLine`, los valores de referencia viven en la norma y en el JSON de AXIS de la rama
  sin publicar; al publicarse, mandan los tokens y la norma deja de guardar números.
- El callout v2, si se aprueba, obliga a cambiar el bloque de WordPress `efeoncepro/glitch-drop` desplegado por TASK-1337.
- La numeración de ediciones que usa esta línea (la próxima es la #11) no coincide con la del ADR del pipeline editorial
  (#16 en adelante); hay que reconciliarlas.
- Si se acepta el flujo propuesto, `glitch-edition` sería el primer catálogo social del Composer (hoy tiene
  `deck-axis` e `insights-*`) y Guttery tendría que entrar a un brand pack del motor, que hoy sólo tiene `axis`.
- La pieza sonora de Glitch sigue pendiente en la identidad sonora; el mnemónico del video depende de esa decisión.

## Pendiente

- La manzana como esfera y el verde como acento → token de franquicia en AXIS.
- Línea de servicio de Glitch: Growth (recomendada) o Brand (alternativa).
- Aprobación de la lente, el blog (banners + maqueta + callout v2), el vlog 16:9, el reel (kit de overlays) y las
  tarjetas finales.
- Alta de los 5 glifos Plastilina; licencia de Guttery.
- Pasar el flujo de composición a `Accepted` y crear sus tasks.

## Reversibilidad

Alta. La sub-línea es documentación y piezas; nada del runtime de Greenhouse depende de ella y AXIS no tiene nada
publicado. Revertir la decisión aceptada es retirar la norma y volver a componer Glitch con La órbita. El flujo propuesto
no existe todavía; su costo de revertir crece cuando se publiquen tokens y contrato en AXIS y el catálogo entre al
Composer.
