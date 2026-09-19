# Personas en la fotografía Efeonce V1 — casting, identidad y vestuario

> **Tipo de documento:** Especificación técnica y funcional de marca
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-19 por Claude
> **Estado:** Aprobado por el operador el 2026-09-19 (piezas de exploración; ninguna publicada)
> **Documentación relacionada:** [Lenguaje fotográfico V1](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Cámaras](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [Prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Guía de kits de marca](../social/EFEONCE_BRAND_KITS_USAGE_GUIDE_V1.md) · [Biblioteca de Nexa](../social/NEXA_CREATIVE_RESOURCE_LIBRARY.md) · Evidencia `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/personas/`

Convenciones: **[medido]** · **[decisión del operador]** · **[criterio]** · **[pendiente]**.

## 1. Tres modos que el sistema debe cubrir

| Modo | Qué es | Ejemplos de la corrida |
|---|---|---|
| Equipo con uniforme | Personas de Efeonce con el polo navy del kit | `personas/J2-rodaje-polo`, retrato con polo del set curado |
| Personas sin marca | Equipo, clientes o personajes sin prendas de marca | La mayoría del set curado 12 |
| Sin personas | Objetos, espacios, 3D | `impacto/I6b-objeto` (cámara sobre plinto), `oficio3/4-lima-sin-personas`, nave 3D de la V2 |

Requisito del operador: el sistema funciona en los tres **[decisión del operador]**.

## 2. Casting

| Regla | Detalle |
|---|---|
| Origen | Latinoamericano, coherente con los mercados (Chile, EE. UU., Colombia, México, Perú) |
| Caras | Naturales, con carácter, **no de modelo**. Edades variadas (en el set curado: panadero mayor, dueña de tienda, equipo joven, directores de 40–50) |
| Riesgo | Casting de modelo = stock premium. Hallazgo del subagente adversarial **[criterio]** |
| Para publicar | Equipo real (sesión Run & Gun) como base; IA para explorar, espacios, objetos y 3D **[criterio]** |
| Diversidad de roles | Personas decidiendo, dirigiendo, corrigiendo, riendo, explicando; no posando |

## 3. Gesto, momento y mirada

| Tema | Regla | Ejemplos |
|---|---|---|
| Momento | El pico de la acción (momento decisivo) | Risa al ver «Ganado» en el pipeline, harina en el aire, brazo extendido dirigiendo (J2), manos abiertas explicando en escenario (J3) |
| Gesto | Manos trabajando sobre la obra: señalar una prueba impresa, dibujar un journey en vidrio, lupa sobre el KV | `oficio/03-kv`, `personas/N2-reflejo`, `personas/JN1-mesa` |
| Mirada | **Nadie mira a cámara**, salvo decisión explícita | Todas las piezas aprobadas miran fuera de cuadro o a su trabajo |
| Expresión | Nada de sonrisas de stock; risas y concentración reales | Prompt: «no stock-photo smiles» |

## 4. Realismo de piel

| Regla | Detalle |
|---|---|
| Qué se pide | Poros visibles, arrugas finas, tono de piel desigual, pelo suelto, sin retoque de belleza, sin piel plástica |
| Qué no se pide | Suciedad, sudor o desgaste como atajo de realismo |
| Medición | Piel en rango L\* 44–61 y C\* 18–31, **consistente en todas** las piezas medidas con `metricas.cjs` **[medido]** |
| Balance | Neutro-cálido ~5200 K; sombras nunca azules (la piel se enfría con sombras azules) |

## 5. Julio Reyes y Nexa

### 5.1 Referencias

| Persona | Rol de la imagen | Ruta |
|---|---|---|
| Julio | Rostro | `ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-01.png` |
| Julio | Rostro | `ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-04.png` |
| Julio | Cuerpo | `ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-07.png` |
| Nexa | Cuerpo completo | `ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-cuerpo-completo-v2.png` |
| Nexa | Rostro/gesto | `ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-the-point.png` |
| Nexa | Rostro/gesto | `ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-the-listen.png` |

En tomas con ambos se usaron 2 referencias por persona (Images 1-2 Julio, 3-4 Nexa).

### 5.2 Motor

`gpt-image-2.5-sunburst`, `--quality high`, `--size 1152x1440`. Mismo costo que Flare para igual calidad y tamaño
(≈ USD 0,05 por imagen **[medido]**) y mejor identidad.

### 5.3 Rol de cada imagen en el prompt

Se declara qué aporta cada referencia y qué se ignora:

```text
REFERENCES: Images 1-3 are Julio (identity only; ignore their clothing and backgrounds).
```

```text
REFERENCES: Images 1-2 are Julio (identity only). Images 3-4 are Nexa (identity only). Ignore the clothing and
backgrounds of all references.
```

```text
REFERENCES: Images 1-3 are Julio (identity only). Images 4-5 are the Efeonce team polo (deep navy pique with a small
embroidered emblem on the left chest): use it as his exact garment.
```

### 5.4 Bloques IDENTITY (verbatim)

Julio:

```text
IDENTITY (critical): the man is the SAME real person shown in the Julio reference images: a Venezuelan man in his
mid-forties with short salt-and-pepper curly hair, thin rectangular silver-rim glasses, a full dark beard with grey,
warm brown skin. Preserve his face, glasses, beard and build EXACTLY as in the references; only pose, clothing, light
and setting change. Do not beautify or change his age.
```

Nexa:

```text
IDENTITY (critical): the woman is NEXA, the SAME person shown in the Nexa reference images: a woman in her early
thirties with long dark wavy hair, fair olive skin, dark eyes and defined brows. Preserve her face and hair EXACTLY as
in the references; only pose, clothing, light and setting change.
```

Orden del prompt: bloque de realismo → bloque de impacto → IDENTITY → REFERENCES → SCENE → FOREGROUND. Prompts
completos en `rondas/personas/*.txt`.

### 5.5 Tomas y resultado por lente

| Pieza | Quién | Lente y ángulo | Escena | Lecho | Resultado |
|---|---|---|---|---|---|
| J1 | Julio | 135 mm f/2 | Retrato en estudio de Providencia, suéter carbón, persianas con sol duro, libreta azul | Borde de mesa de roble claro al sol | Identidad sostenida |
| J2 | Julio | 24 mm f/2,8, contrapicado desde el piso | Dirige un rodaje Run & Gun con el polo navy del equipo, brazo extendido | Maleta de equipo negra | Identidad sostenida; emblema cercano al kit, revisar al zoom |
| J3 | Julio | 200 mm f/2,8 desde el fondo del público | Charla de marketing en Santiago, blazer navy, pantalla azul detrás | Cabezas del público | Identidad sostenida |
| N1 | Nexa | 10 mm ojo de pez, cámara baja en la mesa redonda | Taller, coloca pruebas impresas riendo, marcador naranja | Borde curvo de mesa en tono medio | Aprobado por el operador; **falló contraste** 3,70:1 **[medido]** |
| N1b | Nexa | 8 mm ojo de pez fuerte, cámara en el borde de la mesa | Misma escena, distorsión evidente | Borde curvo, «almost white» | 6,16:1 **[medido]**; aprobado |
| N2 | Nexa | 50 mm f/2, a través del vidrio | Bogotá hora dorada, dibuja el último paso de un journey con marcador azul; post-it lima con check | Marco inferior del vidrio | Consistente |
| JN1 | Julio y Nexa | 50 mm f/2 desde el asiento del cliente | Storyboards de una marca de café, sol rasante | Lado del cliente de la mesa, nogal oscuro | Identidad sostenida (taza azul repetida: sesgo) |
| JN2 | Julio y Nexa | 135 mm f/2 detrás de una cámara de estudio | Podcast propio de Efeonce | Parte superior de la cámara de estudio | Consistente (panel azul de fondo: variar) |
| JN3 | Julio y Nexa | 200 mm f/2,8 desde el otro lado de la calle | Roma Norte, CDMX, cruzan conversando | Techo de auto sin logos | Identidad sostenida |

Grilla: `rondas/personas/julio-nexa-firmadas.jpg`. El operador destacó N1b y N1: «son dos ángulos que podemos usar»
**[decisión del operador]**.

### 5.6 QA de identidad

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Julio en 5 tomas (135 / 24 / 200 / 50 / 200 mm) | Identidad sostenida en las 5 **[medido por revisión visual]** | `rondas/personas/qa-identidad.jpg` |
| Nexa | Consistente | Misma hoja |
| Cómo se revisa | Rostro al zoom contra la referencia: lentes (forma y montura plateada), barba con canas, pelo rizado entrecano, edad; en Nexa, pelo largo ondulado y cejas | [criterio] |
| Edición posterior | Una pasada enmascarada no preserva píxeles: tras curar una pantalla, las caras cambiaron poco (delta medio 16,5) pero cambiaron **[medido]** → volver a revisar identidad al zoom | `rondas/oficio3/` |

### 5.7 Gotcha operativo

En zsh, una variable con varios `--image` debe expandirse con `${=R}`; sin eso, 8 llamadas fallaron (sin costo)
**[medido]**.

## 6. Uniforme

| Regla | Detalle |
|---|---|
| Cuándo | Equipo de Efeonce trabajando frente a cliente o en rodaje (modo 1). No en todas las piezas |
| Referencia del kit | `ai-generations/2026-09-17_polo-efeonce/final/efeonce-polo-navy-01-frente-1600x1600-v01-fondo-estudio.png` y `ai-generations/2026-09-17_polo-efeonce/final/efeonce-polo-navy-10-detalle-bordado-1600x1600-v01-fondo-estudio.png`, pasadas como Images 4-5 |
| Resultado | El emblema salió cercano al kit; **revisar letra por letra al zoom antes de publicar** **[pendiente para masters]** |
| Set | Uniforme navy **sobre un set que no sea azul ni tinta**: navy sobre tinta se funde (ΔE 12,4 **[medido]**) |
| Navy total | Nunca navy en pared, ropa y logo a la vez |
| La ropa no es la firma de color | «la colorimetría no es vestir de navy» **[decisión del operador]** |
| Azul en ropa | Sólo como acento pequeño (3–10%) o nada. Prendas azules grandes quedan en un intermedio que no funciona: camisa azul en Miami 16%, hoodie del contrapicado 17% del cuadro **[medido]** |
| Firma | Si el emblema bordado se lee a tamaño de consumo, **sin logo compuesto**: una sola marca protagonista. Las grillas de exploración muestran esas piezas firmadas; la versión publicable va sin firma |
| Otras prendas | Hoodie, chaqueta, gorra y lanyard tienen kits propios (`docs/operations/social/EFEONCE_BRAND_KITS_USAGE_GUIDE_V1.md`); no probados en esta corrida |

## 7. Equipo real vs IA

| Uso | Base recomendada **[criterio]** |
|---|---|
| Exploración de dirección, bocetos, rondas | IA |
| Espacios, objetos, 3D, bodegones | IA |
| Piezas publicables con personas del equipo | Equipo real (sesión Run & Gun), con este documento como brief |
| Julio y Nexa con IA para publicar | Posible, con QA de identidad y emblema al zoom y aprobación del operador; Nexa es personaje propio ([biblioteca](../social/NEXA_CREATIVE_RESOURCE_LIBRARY.md)) |
| Personas ficticias como si fueran clientes | No: rompe la verdad operativa |

## 8. Riesgos

| Riesgo | Señal | Mitigación |
|---|---|---|
| Casting de modelo | Caras perfectas, simetría, piel lisa → stock premium | Bloque de realismo; caras con carácter; revisar al zoom |
| Marcas de terceros en objetos | Cámara con inscripción tipo «Blackmagic»; quedó una inscripción diminuta | «completely unbranded, no brand names» + QA al zoom + limpieza en master |
| Emblema deformado | Letras o nave del emblema alteradas | Referencias del kit con rol explícito + revisión letra por letra |
| Identidad a la deriva | Edad, lentes o barba cambian | Bloque IDENTITY + «Do not beautify or change his age» + QA por pieza |
| Insinuar un cliente real | Producto o categoría reconocible de un cliente (pintura = Berel) | Industrias no-cliente; etiquetas genéricas («Cliente») |
| Repetición de utilería | La taza azul en 3–4 piezas | Variar el objeto de acento |

## 9. Delta 2026-09-19 (tarde) — ronda 2 de personas y pruebas con mascotas y 3D de marca

Rondas `rondas/personas2/` y `rondas/mascotas/` de la corrida; OneDrive `referencias/06-personas-ronda-2/` y
`referencias/07-con-mascotas-y-3d/`. Motor `gpt-image-2.5-sunburst` high 1152×1440; ≈ USD 0,90 las 13 imágenes.

| Pieza | Lente / ángulo | Lecho y firma | Resultado **[medido]** |
|---|---|---|---|
| J4 Julio, asiento a ras | 16 mm con el lente en el borde de la mesa, hora dorada | nogal oscuro · blanco 13,7:1 | aprobado como ángulo (ver N1) |
| J5 Julio, respaldo | 85 mm f/1,8 tras la silla vacía, lanzamiento fintech | respaldo gris · blanco 16,0:1 | |
| N3 Nexa, barrido | 35 mm paneando, mercado de Surquillo | mostrador de fruta · blanco 9,3:1 | lecho p99 20 (límite) |
| N4 Nexa, escala | 35 mm f/4, galería en Bogotá | **3 intentos**: concreto pulido tono medio (2,99:1) y luego con reflejos (2,73:1, p99 26) → banco bajo oscuro de galería · blanco 15,4:1 | el concreto pulido refleja y no sirve de lecho |
| JN4 juntos, ojo de pez | 8 mm desde el borde de mesa | roble claro · navy 6,0:1 | distorsión más moderada que N1b |
| JN5 juntos, noche | 50 mm f/1,8 | escritorio oscuro con textura · blanco 19,0:1 | |
| M1 Julio + Clawd + Codex | 85 mm a altura de escritorio | nogal · blanco 16,5:1 | mascotas fieles a sus kits |
| M2 Nexa + Codex | 50 mm, vidrio a la hora dorada | marco de vidrio · blanco 15,8:1 | |
| M3 los cuatro, ojo de pez | 8 mm | roble claro · navy 4,9:1 | contraste al límite |
| M4 Julio + Nexa bajo el logo 3D | 35 mm f/4, muro de piedra | **sin firma** (logo 3D protagonista) | logo cercano al oficial; revisar letra por letra antes de publicar |
| M5 Nexa con la nave | 100 mm f/2,8 | **sin firma** (nave protagonista) | órbita, esfera y tres ventanas conservadas |

Reglas nuevas:
- **Mascotas de partners** (Clawd, Codex): pasar su render del kit como referencia con rol + bloque `MASCOTS` («real,
  physical, finely made small collectible figure about 25 cm tall … correct scale, contact shadows … do not redraw»).
  Salieron fieles al kit en las tres piezas. Referencias: `ai-generations/2026-09-17_clawd-poses-3d/final/…01-frente-heroe…`
  y `ai-generations/2026-09-17_codex-poses-3d/final/…01-frente-heroe…`.
- **Logo 3D y nave**: render del kit como forma + intención en el prompt (pasada directa); pieza sin firma; QA letra por
  letra («e», «f», nave, órbita con sus cortes, tres ventanas). Referencias: `2026-09-17_efeonce-logo-3d/kit/grande-blanco/…02-tres-cuartos-izquierda…transparente.png`,
  `2026-09-17_efeonce-ship-3d/final/…blanco-02-tres-cuartos-izquierda…transparente.png`.
- **Hasta 6 referencias por pieza** (Julio ×2, Nexa ×2, Clawd, Codex) mantuvieron identidad de las dos personas y de
  ambas mascotas.
- **Gotcha:** una superficie pulida con reflejos no es lecho aunque se pida «casi blanca»: cambiar de lecho, no insistir.
