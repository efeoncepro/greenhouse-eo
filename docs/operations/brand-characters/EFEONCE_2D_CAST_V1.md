# Elenco 2D de Efeonce V1 — Tomás, Camila, Renata y Mateo

> **Tipo de documento:** Especificación canónica de marca (personajes)
> **Versión:** 1.1
> **Creado:** 2026-10-03 por Claude
> **Última actualización:** 2026-10-03 por Claude
> **Estado:** personajes, estilo y sello aprobados por el operador (Julio Reyes) el 2026-10-03 («Me encantan, están
> aprobados todos. Canonízalos»). Hojas selladas en `scripts/foto/assets.lock.json` y publicadas en el canon. Sin publicar
> en AXIS; sin prueba de reconocimiento.
> **Documentación relacionada:** [Sparks V1](./SPARKS_V1.md) ·
> [Elenco fotográfico](../brand-photography/EFEONCE_BRAND_CAST_V1.md) ·
> [Línea gráfica «La órbita»](../brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) ·
> [Taxonomía de video](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) ·
> [ADR-025, pipelines de video](../../architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md) ·
> [Hogar de las referencias](../../../ai-generations/_identidad-elenco-2d/LEEME.md) ·
> [Corrida de origen](../../../ai-generations/2026-10-03_sparks-aeo-60s/ELENCO-2D-PROPUESTA.md)
> **Dónde viven los archivos:** `ai-generations/_identidad-elenco-2d/`, sellado en el lock (catálogo `ELENCO_2D` de
> `scripts/foto/build-prompt.mjs`, rol `ilustracion-2d`) y respaldado en `gs://efeonce-creative-canon`; si falta en
> disco, `pnpm ai-gen:where` + `pnpm ai-gen:pull` ([contrato](../AI_GENERATIONS_STORAGE_V1.md)).

Convenciones: **[medido]** = leído en un archivo o una imagen · **[decisión del operador]** = lo decidió Julio Reyes ·
**[criterio]** = recomendación propia, revisable · **[pendiente]** = no resuelto.

## 1. Qué es

Cuatro personajes **ficticios dibujados en 2D** que representan al **grupo de compra del cliente**: quien tiene el
problema, quien pide evidencia, quien firma y quien produce. Conviven con los Sparks en piezas animadas y fijas, y
**siempre los supervisan**: los Sparks nunca deciden solos ([Sparks V1 §5](./SPARKS_V1.md)).

Nació con el video «Los Sparks de Efeonce × Efeonce AEO» (2026-10-03), cuando el operador pidió un elenco propio
«para reutilizarlo después» y para **definir el estilo de personajes 2D de Efeonce** **[decisión del operador]**.

## 2. En qué se diferencia del elenco fotográfico

| | Elenco fotográfico ([canon](../brand-photography/EFEONCE_BRAND_CAST_V1.md)) | Elenco 2D (este canon) |
|---|---|---|
| A quién representa | al **equipo de Efeonce**, uno por línea de servicio | al **grupo de compra del cliente** |
| Lenguaje | fotografía con piel real | 2D vectorial con volumen, el mismo trazo que los Sparks |
| ¿Puede hacer de «cliente»? | **no** (§2 de su canon) | **sí, en ficción declarada**: empresa ficticia, sin testimonio **[decisión del operador]** |
| Cómo se pide | `identidad` en `foto:prompt` | como referencia `ilustracion-2d` en la producción 2D; **nunca** en `foto:prompt` |

## 3. Los cuatro

| | Tomás Ríos | Camila Quispe | Renata Salgado | Mateo Arango |
|---|---|---|---|---|
| Clave | `tomas` | `camila` | `renata` | `mateo` |
| Edad · origen | 34 · chileno (Valparaíso) | 29 · peruana (Arequipa) | 43 · mexicana (Monterrey) | 26 · colombiano (Medellín) |
| Rol en el grupo de compra | gerente de marketing B2B: tiene el problema | analista de datos y crecimiento: pide evidencia | directora comercial: firma y decide | creador de contenido: produce |
| Carácter | metódico, humor seco, pregunta lo que nadie pregunta | curiosa, rápida, desconfía de lo que no se mide | directa, cálida, decide bien | entusiasta, gesticula, piensa en voz alta |
| Silueta prevista | rectángulo: alto, hombros rectos | círculo: compacta | triángulo: base ancha | línea: larguirucho, se inclina |
| Rasgos | lentes redondos gruesos, remolino, barba corta | flequillo recto, moño alto, aros pequeños | mechón canoso, aros dorados | rizos, gorro tejido |
| Vestuario | suéter mostaza sobre camisa gris azulada, pantalón gris azulado | chaqueta verde salvia sobre polera blanca, pantalón oscuro, zapatillas blancas | blazer burdeos, top y pantalón negros, tacón bajo | sobrecamisa terracota, polera gris, jeans arremangados, zapatillas blancas |
| Objeto azul | cuaderno | lápiz | reloj | audífonos |
| Gesto característico | se ajusta los lentes antes de preguntar | gira el lápiz entre los dedos | cruza los brazos y asiente una vez | el teléfono siempre en la mano |

**[medido 2026-10-03]** En las hojas aprobadas las siluetas se distinguen menos de lo previsto (Camila no tan redonda,
Renata no tan triangular, Mateo no tan inclinado); se reconocen por color, pelo y objeto. Si una pieza necesita más
contraste de silueta, se afina sobre la hoja aprobada con edición, nunca regenerando de cero.

## 4. El estilo (invariantes)

**Dirección A, «vector con volumen»** **[decisión del operador, 2026-10-03]**:

- Formas vectoriales limpias con **contorno navy grueso**, el mismo peso de línea que los Sparks 2D.
- Rellenos planos con **un solo paso de volumen** y **sombras duras** (cel).
- Proporciones y nivel de detalle de las hojas aprobadas; los cuatro se leen dibujados por la misma mano.
- Fondos en planos simples con profundidad por bruma; en las hojas, navy liso `#091951` con luz radial suave.

Descartadas, con la razón medida: **B · pintado 2.5D** (el modelo llevó al personaje a un acabado casi 3D y el Spark
plano se veía pegado) y **C · línea editorial** (línea delgada que pierde peso junto al contorno de los Sparks).
Evidencia en `ai-generations/2026-10-03_sparks-aeo-60s/elenco-2d/estilo/`.

## 5. El sello Efeonce

**[decisión del operador, 2026-10-03]** («necesito que sutilmente tenga algo característico de Efeonce»; aprobado sobre
la prueba `A2`). Dos rasgos que se repiten en cada personaje y cada toma:

1. **Línea fina de luz azul** (`#0375db`) en el contorno, del lado de donde viene la luz (los Sparks, cuando están en
   cuadro). Traduce «línea fina y luz, nunca un disco» de la [línea gráfica §0](../brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).
2. **Un objeto de trabajo azul por personaje** (cuaderno, lápiz, reloj, audífonos): el «azul portador» del
   [lenguaje fotográfico](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md), nunca un muro pintado.

Lo que el sello **no** es **[criterio, desde la línea gráfica §1.3]**: órbitas o esferas sobre los personajes (la línea
las reserva para lente, medida y foco; una órbita decorativa y dos esferas en una pieza son error), ropa de marca (el
elenco representa al cliente) ni halos como brillo.

## 6. Reglas de uso

- Ficticios: **nunca** se presentan como cliente real, equipo de Efeonce ni testimonio firmado.
- En ficción declarada pueden ser personas de una **empresa ficticia** (Andina Cargo en el video de AEO). Su nombre en
  pantalla, sólo en una narrativa declarada como ficción.
- Con los Sparks en cuadro, un personaje del elenco **los supervisa**; los Sparks no deciden solos.
- Nunca llevan marcas reales en la ropa ni el logo de Efeonce.
- No se mezclan con fotografía en el mismo cuadro sin un pase de integración.
- Cada personaje conserva rol, carácter y vestuario entre piezas.
- Los Sparks que aparezcan con ellos salen del SVG oficial o del rig (AXIS), nunca del dibujo de un modelo.

## 7. Cómo se usa en producción

- **Referencias:** la hoja de giro como primera referencia del personaje y la de expresiones para el gesto; el ancla de
  estilo (`_estilo/estilo-a-sello-efeonce.png`) cuando se dibuja un personaje nuevo o una escena sin personaje; la foto
  de grupo para la escala relativa.
- **Video (ADR-025):** ningún cuadro clave ni toma se genera sin estas hojas como referencia aprobada.
- **Motor usado [medido 2026-10-03]:** GPT Image 2.5 Sunburst, `high`, 1536×1024, vía `pnpm ai:image`; editar desde
  la hoja conserva al personaje, generar de cero lo reinventa. Prompts y registros en la corrida de origen.
- **Sumar un personaje:** ficha en este documento → hoja de giro con el ancla de estilo y una hoja aprobada como
  referencia de formato → expresiones desde el giro → visto bueno del operador → hogar canónico → entrada en
  `ELENCO_2D` → `pnpm foto:assets:lock` → `pnpm creative:assets:publish apply` → `pnpm exec vitest run scripts/foto`.

### 7.1 Primer uso en video: «Sparks × Efeonce AEO» (2026-10-03)

El spot animado 2D (16:9, 1920×1080, 24 fps; v2 de 49,6 s aprobada por el operador el 2026-10-03) es la primera pieza
con el elenco. Corrida: `ai-generations/2026-10-03_sparks-aeo-60s/` (`INVENTARIO-DE-HECHOS.md`, `PREPRODUCCION.md` §11–12).

- **Reparto [medido]:** **Tomás** es el protagonista y hace de **cliente en la ficción**: marketer de Andina Cargo (marca
  ficticia) que pregunta a la IA, da la señal a los cuatro Sparks y aprueba su reporte. Es la regla §6 en acción: él
  supervisa y los Sparks no deciden solos.
- **Por qué no el elenco fotográfico [decisión del operador]:** el borrador usaba a Karo; el elenco fotográfico
  representa al equipo de Efeonce y **no puede hacer de cliente**. De ahí nació este elenco.
- **Hojas como referencia [medido]:** los cuadros clave salieron de GPT Image 2.5 Sunburst (`pnpm ai:image`, 2048×1152,
  `high`) con las hojas del elenco como referencia; esos cuadros fueron el inicio/final de las tomas image-to-video
  (MiniMax H3 vía fal). Los Sparks no los dibujó el modelo: se compusieron después desde el SVG oficial
  ([Sparks V1](./SPARKS_V1.md)).
- **Trampa de recorte [medido]:** el quitafondos (rmbg) recortaba el **pantalón navy** de Tomás, que se confunde con el
  contorno y el fondo navy. Para referencias y composiciones, usar **recortes de cintura arriba**.
- **Lo que funcionó [medido]:** reparto separado del modelo: el motor de imagen pone al personaje desde su hoja, lo de
  marca (Sparks, pantallas, logos) se compone encima y el modelo de video sólo pone luz y movimiento. La pieza se aprobó
  con ese método. Las lecciones de H3 (base > Max, mismo eje, prohibir texto, fijar paleta) viven en la
  [guía de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).

## 8. Pendiente

- **[pendiente]** Publicar el elenco 2D en AXIS (`@efeoncepro/axis-brand-assets` + Lab) junto a los Sparks 2D: **en
  curso** desde el 2026-10-03, tras el primer uso en video (repo aparte).
- **[pendiente]** Prueba de reconocimiento y de silueta a 390 px.
- **[pendiente]** Revisión de derechos de uso de imágenes generadas para pauta (`greenhouse-ai-creative-rights-governance`).
