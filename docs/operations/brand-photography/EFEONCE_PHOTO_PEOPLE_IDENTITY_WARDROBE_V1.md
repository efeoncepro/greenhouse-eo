# Personas en la fotografía Efeonce V1 — casting, identidad y vestuario

> **Tipo de documento:** Especificación técnica y funcional de marca
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-21
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
| Julio | Rostro | `ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/` (`julio-ap-04` primero; vista resuelta por `foto:prompt`) |
| Julio | Cuerpo | El mismo set aprobado (`julio-ap-11` primero) |
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

## Delta 2026-09-20 — tomas de Julio aprobadas y sesgo del set de referencia

### Aprobadas por el operador **[decisión del operador, 2026-09-20]**

Revisadas en hoja de contacto (`ai-generations/2026-09-20_identidad-julio-nexa/hoja-salidas-julio.jpg`), sobre las
15 salidas existentes con su identidad. Aprobó cuatro con «me reflejan perfectamente»:

| Pieza | Toma | Lente | Dónde |
|---|---|---|---|
| **J1** retrato | retrato | 135 mm f/2 | `rondas/personas/J1-retrato-final.png` |
| **J3** conferencia | tele desde el público | 200 mm f/2,8 | `rondas/personas/J3-escenario-final.png` |
| **J5** respaldo | tras la silla vacía | 85 mm f/1,8 | `rondas/personas2/J5-respaldo-final.png` |
| **JN5** noche (con Nexa) | noche | 50 mm f/1,8 | `rondas/personas2/JN5-noche-final.png` |

Son **salidas aprobadas**, no referencias: siguen sin poder usarse como `--image` de identidad sin aceptar deriva
acumulada (el ancla es siempre el mismo original, nunca una generación anterior).

### El set de referencia tiene un sesgo de vestuario **[medido 2026-09-20]**

Las **ocho** referencias de Julio lo muestran en ropa formal, y **seis de ocho en azul o navy**: traje azul con
camisa blanca (01, 02, 07, 08), blazer sobre polo oscuro (03, 04), blazer con zapatillas (05), total black (06).

Eso empuja al modelo a vestirlo formal y de navy aunque el prompt diga «ignore their clothing» — el mismo modo de
falla medido ese día con las referencias de Nexa. Mientras el set sea así, **toda toma con identidad debe declarar
el vestuario en la escena** (ya hay aviso en `pnpm foto:prompt`).

El set de 2026-09-17 es evidencia histórica y **no se usa como ancla**. El set aprobado vigente y sus ángulos
derivados se describen en el delta siguiente. Sigue pendiente ampliar expresiones y vestuario neutro sin deriva.

## Delta 2026-09-20 (tarde) — set de identidad de Julio reconstruido **[decisión del operador]**

### El set anterior idealizaba el rostro

Las ocho referencias de `2026-09-17_equipo-vestuario/refs/` producían un Julio **más estrecho y afilado
que el real**, y además lo vestían siempre formal (8/8 formal, 6/8 azul o navy). Dejan de ser el ancla.

### Set vigente: 11 referencias aprobadas + 6 ángulos derivados

- **Referencias** (frontal, tres cuartos suave, cuerpo entero): `ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/`,
  con `MANIFIESTO.json` que declara orden de preferencia, roles y exclusiones. `julio-ap-04` es la primera
  opción de rostro, `julio-ap-11` la de cuerpo, y `julio-ap-01` **no se usa sola** (es la de cara más ancha).
  `julio-ap-02` queda excluida: es una pieza compuesta con titular, cursores y logo, no un retrato.
- **Ángulos derivados** (los que ninguna referencia cubre): `set-identidad/angulos/` — ambos perfiles, ambos
  tres cuartos, tres cuartos trasero y espalda.

`pnpm foto:prompt` los resuelve solo: `identidad: ["julio"]` usa las frontales;
`identidad: [{ "persona": "julio", "vista": "perfil-izq" }]` antepone la vista y aborta si no existe.

### Las tres reglas que salieron de esta corrida **[medido]**

1. **Editar conserva; generar reconstruye.** Cuatro iteraciones de prompt (v1→v4) no lograron la proporción
   facial del operador generando desde cero: cada reconstrucción redondeaba el rostro. **Una edición desde
   `julio-ap-08` lo consiguió a la primera.** Para un ángulo nuevo de una persona, editar su foto aprobada
   antes que generar con ella como referencia.
2. **Marcadores verificables, no magnitudes.** «Gira 45 grados» produjo una cabeza apenas inclinada —ni
   frontal ni tres cuartos— que se leía ancha. «El puente de la nariz corta el contorno de la mejilla lejana,
   la oreja lejana no se ve, el ojo lejano queda escorzado» produjo el tres cuartos real. Igual para el perfil
   y para la proporción del rostro. **Describe lo que se ve y lo que NO se ve.**
3. **El cuadro de pies a cabeza degrada la cara.** A 1024×1536 el rostro ocupaba ~120 px y el modelo lo
   rellenaba. Encuadre **bajo las rodillas, 135 mm a la altura del pecho y 1536×2304** lo lleva a ~400 px y
   sostiene la identidad. El manifiesto del set anterior ya lo intuía sin explicar el porqué.

### Límite de distribución **[pendiente]**

Las imágenes están gitignoreadas: viven en esta máquina y en OneDrive. Lo versionado es el manifiesto y los
prompts. Otra sesión en otro equipo **no tiene el set** hasta que se copie desde OneDrive.

## Delta 2026-09-20 — código de vestuario Efeonce **[decisión del operador]**

La ropa corporativa **no es intercambiable**: cada prenda dice en qué registro está ocurriendo la escena, y
elegir mal contradice lo que la foto cuenta. Dictado por el operador el 2026-09-20 y vigente para toda pieza con
personas de Efeonce.

| Registro | Prenda | Qué comunica |
|---|---|---|
| **Oficina, casual** | **Polera piqué** (`polo-efeonce`) | El día a día relajado, trabajo de escritorio y de estudio |
| **Reunión / importante** | **Chaqueta** (`chaqueta-softshell-efeonce`, `chaqueta-bomber-efeonce`) | Reuniones, instancias importantes, oficio que se presenta. No es traje: es el registro alto de Efeonce |
| **Terreno** | **Gorra** (`gorra-efeonce`) **+ polera piqué** | Trabajo fuera de la oficina: rodaje, activación, visita, montaje |
| **Terreno** | **Hoodie** (`hoodie-efeonce`) | Terreno, igual que la gorra; el registro de campo cuando hace frío o la jornada es larga |
| **Transversal** | **Lanyard y carnet** (`lanyard-efeonce`) | **Van en cualquier registro**, casual o de reunión. No marcan registro: marcan pertenencia |

**Reglas que se siguen de esto:**

- **La prenda se elige por el registro de la escena, no por variedad visual.** Una reunión importante en hoodie
  dice lo contrario de lo que la escena cuenta; un montaje en terreno con chaqueta de reunión, también.
- **Gorra y polo van juntos en terreno**: la gorra no es un accesorio suelto de oficina.
- **El lanyard no decide el registro.** Puede acompañar al polo en la oficina o a la chaqueta en una reunión, y
  su arte se compone con el kit —nunca se le pide al modelo que invente el carnet.
- Sigue vigente la regla anterior: **con identidad declarada, el vestuario se declara en la escena**. `ignore
  their clothing` no alcanza — el modelo copia la ropa de las referencias si no se le dice qué lleva.

### El emblema bordado NO se genera **[medido 2026-09-20]**

**El modelo no reproduce el emblema: inventa uno distinto cada vez.** Medido sobre la tanda
`2026-09-20_vestuario-registros/`: tres prendas dieron **tres emblemas diferentes entre sí y ninguno
era el de Efeonce** — una espiral tipo arroba en un polo, dos barras verticales en otro, otras dos
distintas en la gorra. Ninguno tiene «e», «f», nave ni órbita.

**Es el mismo hecho que ya gobierna la firma**, sólo que nadie lo había escrito para las prendas: la
firma se **compone** y no se genera precisamente porque el modelo no sostiene una marca. Un bordado
pequeño es el caso más fácil de que la invente y el más difícil de notar.

**Lo que faltaba era simple y estaba en el kit.** Cada kit de prenda trae su **macro del bordado**
—`10-detalle-bordado` en el polo, `04-macro-bordado` en la gorra, `11-macro-bordado` en las chaquetas,
`09-detalle-pecho` en el hoodie— y el catálogo sólo exponía las vistas de la prenda entera, donde el
emblema mide unos pocos píxeles: el modelo lo lee como una mancha y la reinventa. **Desde el
2026-09-20 una prenda con emblema aporta DOS referencias**, la prenda y el emblema en grande, con un
bloque que lo describe («rocket with three round windows crossed by a single elliptical orbit») y
prohíbe explícitamente las formas que inventó: espiral, arroba, letras.

**Descartado: componerlo encima.** Se probó con el isotipo vectorial y con el bordado recortado, y el
operador lo rechazó: **«se ve horrible, ese no es el logo»** — queda impreso, no bordado. La firma se
compone porque vive sobre un lecho desenfocado y plano; un bordado sobre tela con pliegues y luz
propia, no.

**Cómo se trabaja una prenda con emblema, en orden de preferencia:**

1. **Dar el macro del bordado como referencia** y pedir el pecho libre y bien iluminado. Es lo que hace
   el comando desde el 2026-09-20 y es la única vía que produce un emblema reconocible.
2. **Que no se lea** (de espaldas, en sombra, cortado) **sólo si la prenda se reconoce por otra cosa** —
   un corte propio, un color propietario—. **Ojo:** el polo blanco liso y la chaqueta navy lisa NO se
   reconocen sin emblema; ahí esta salida convierte el uniforme en ropa genérica, que fue justamente lo
   que el operador rechazó.
3. **Editar con máscara** sobre la zona del emblema, partiendo del kit.

**Nunca**: publicar el emblema tal como sale del generador.

> **Por qué falló el control que ya existía.** La instrucción estaba en el kit —«never let the model
> spell the emblem by itself — inspect it at 100% before publishing»— y se emitía en cada prompt. Pero
> emitirla en el prompt **se lo dice al modelo**, no a quien cierra; y el QA se hizo sobre una hoja de
> contacto de 520 px de alto, donde un bordado no se lee. El mecanismo existía y dependía de que
> alguien se acordara.
>
> Desde el 2026-09-20 hay dos: `pnpm foto:prompt` **avisa** cuando la ficha pide una prenda con
> emblema, y **`pnpm foto:emblema <plate.png>`** recorta y amplía las zonas del bordado en una hoja
> para mirarlas. No deciden —un emblema se compara letra por letra contra el kit, no por píxeles—:
> quitan la excusa de no haberlo mirado.

## Delta 2026-09-21 — dos identidades conviven como «Nexa» y el oficio del retrato cercano

Fuente: corrida `copiloto` (Nexa + Clawd), ~20 generaciones, con verificación cruzada de la sesión peer
«Poses de Nexa en advertising y design studio». Hechos verbatim en
`ai-generations/2026-09-21_copiloto/HECHOS.md`.

### Bajo el nombre «Nexa» conviven DOS identidades; la canónica es la **A** **[medido · decisión del operador, 2026-09-21]**

El hallazgo lo inició la sesión peer comparando por hash contra OneDrive y se verificó de forma independiente
en esta sesión, recortando los rostros al mismo tamaño y poniéndolos lado a lado.

| | **Identidad A** | **Identidad B** |
|---|---|---|
| Rostro | cara ancha, cejas gruesas y rectas, delineado marcado, labios llenos | cara larga y angulosa, cejas finas arqueadas, sin delineado, labios medianos |
| Dónde vive | `5. Contenidos/10. Nexa (Influencer IA)/01. Material/01. Avatar/`: `01-GPT-Image-2-empatica.png`, `02..05-NanoBanana-*.png` (bustos con hoodie, fondo neutro) + `Avatar 3,4 v2` + `Avatar Cuerpo Completo v2` | mismo `01. Avatar/` (los `hf_2026*` con blazer) + `Poses y expresiones/` (24 img) + `Vestuario/` (23 img) |
| Aprobación | **la del KV «Tu IA no conoce tu negocio» aprobado el 2026-09-17** | sin aprobación documentada como identidad canónica |
| Material | poco | mucho, **incluido un turnaround de 9 vistas** |

- **Las dos conviven DENTRO de la misma carpeta `01. Avatar/`**: los bustos con hoodie son A, los `hf_*` con
  blazer son B.
- Consecuencia que causó ~20 pasadas: **se generaba con una y se validaba contra la otra**, así que el QA decía
  «la identidad coincide» mientras el operador veía que no.
- **La identidad canónica es la A** **[decisión del operador, 2026-09-21, tomada en la sesión «Poses de Nexa en
  advertising y design studio» sobre la lámina `ai-generations/2026-09-21_copiloto/dos-identidades-nexa.jpg`]**.
  Consecuencias operativas:
  - El set de ángulos se construye **editando desde `nexa-avatar-34-v2`**, no recortando el turnaround, que es B.
  - `nexa-the-point` y `nexa-the-breakdown` son B y **no pueden seguir en `refs`** del bloque `nexa` del catálogo
    de identidad. La tercera referencia sale de los bustos con hoodie de `01. Material/01. Avatar/`.
  - **B no se borra: pasa a banco de material** —poses corporales, vestuario, escenarios, gesto, encuadres—,
    todo lo que NO sea rostro. Usar B como referencia de ROSTRO queda prohibido; usarla como referencia de POSE
    es una decisión aparte, aún abierta al cierre de esta sesión.
- **Por qué estuvo latente desde abril** **[medido]**: la cara publicada en el KV aprobado es A pese a que esa
  corrida mezcló las tres referencias, porque **2 de 3 eran A** y el promedio cayó de ese lado. La mezcla no
  dejó de existir: ganó por mayoría en esa pieza concreta.

### Los cuatro rasgos que discriminan A de B **[verificados por la peer en el macro]**

1. **Delineado del párpado superior con rabillo**: A lo tiene, B no.
2. **Nariz**: B más larga y con el puente más alto.
3. **Labios**: B más finos.
4. **Óvalo**: B más largo.

Matiz honesto: la ceja del turnaround es más gruesa que la de `the-point`, así que **no es un clon exacto de B**
— pero en el eje A/B cae claramente del lado B.

### El iris NO discrimina identidades; sí es QA de salida **[medido]**

El color de iris fue una hipótesis descartada por medición: **A rgb(64,49,34) · B rgb(51,43,36)**, ambas castaño
muy oscuro. Lo que las separa es la ESTRUCTURA (óvalo, cejas, labios, delineado).

**El iris varía más por LUZ dentro de una misma cara que entre las dos identidades.** En `nexa-avatar-34-v2`, el
mismo ojo da **rgb(47,37,27) en sombra** y **rgb(95,67,53) iluminado**.

Pero **sí sirve como QA de salida**: un ángulo generado salió en **rgb(117,78,61)** contra **rgb(95,67,53)** del
mismo ojo en la referencia — visiblemente más miel — y hubo que endurecer el prompt.

🔴 **Pero el número es una REFERENCIA, no un procedimiento automático** **[medido, corrige el método de
ambas sesiones]**. Al verificar cinco salidas muestreando **un punto fijo por ojo**, tres de cinco cayeron en
piel (rgb ~210,150,120) o en la pupila, y habrían dado un «pasa» o un «falla» inventados; en la otra sesión la
primera muestra sobre `nexa-avatar-34-v2` devolvió rgb(189,142,108), que es piel. **El punto de muestreo se
ubica mirando la ampliación del ojo**; recién entonces la cifra significa algo. Un QA que promedia una
coordenada fija sobre un rostro que se mueve mide cualquier cosa.

**Formulación que sí bajó el iris**: «marrón plano y uniforme, tan oscuro que la pupila apenas se distingue del
iris, **sin anillo más claro ni brillo limbal**». **«Muy oscuro, nunca miel» NO alcanza.**

### El turnaround de 9 vistas YA EXISTE — no hay que construirlo **[medido]**

`5. Contenidos/10. Nexa (Influencer IA)/01. Material/01. Avatar/hf_20260327_182342_3bd94421-25ee-4f45-bc2c-5e30d1acfbe1.png`

- **3072×5504**, grilla **3×3**, celdas de **1024×1835**.
- Vistas: frontal cuerpo entero · tres cuartos busto · **perfil** · frontal · espalda girada · tres cuartos
  opuesto · **cabeza inclinada hacia abajo** · espalda de perfil · **macro del rostro**.
- **Pertenece a la identidad B** (verificado recortando la celda (1,2) contra `nexa-avatar-34-v2` y
  `nexa-the-point`).
- Si el operador elige B, el set de ángulos se obtiene **recortando**, sin que intervenga ningún modelo.

Lectura de las 9 celdas contra la convención del set de Julio:

| Celda | Vista | Estado |
|---|---|---|
| (1,2) | `45-der` | ✓ cubierta |
| (1,3) | `perfil-izq` | ✓ cubierta |
| (2,2) | `135-trasero` | ✓ cubierta |
| (3,2) | trasero del otro lado | aprovechable |
| (1,1) · (2,1) | frontales | extra |
| (2,3) | tres cuartos suave | extra |
| (3,1) | cabeza inclinada | extra valioso |
| (3,3) | macro del rostro | extra valioso (base de edición: tiene píxeles de sobra) |

**Faltan `45-izq`, `perfil-der` y espalda pura a 180°.** Incluso eligiendo la identidad B hay que producir tres
ángulos, editando desde el macro (3,3) o desde (1,1), que son de la misma identidad.

### El catálogo de identidad de Nexa no tenía ningún retrato cercano **[corregido, commit `cdb1fabad`]**

Las tres referencias eran planos generales donde el rostro ocupa pocos píxeles → el modelo lo **reconstruye**. La
primera pasa a ser `nexa-avatar-34-v2.png` (retrato cercano en tres cuartos), copiada de
`ai-generations/2026-09-17_kv-tu-ia-no-conoce/refs/`.

🔴 **El brief del KV aprobado estaba guardado y no se leyó**:
`ai-generations/2026-09-17_kv-tu-ia-no-conoce/brief/plate-kv-4x5.prompt.txt`. Traía resueltos el encuadre, la
escala de la mascota (20 % del ancho), el lente y la pose. **Antes de reconstruir un encargo de memoria, buscar
el brief de la pieza aprobada equivalente.**

### Lente: **85 mm f/2**, nunca 35 mm de cerca **[del brief aprobado]**

El gran angular a distancia de retrato **ensancha y distorsiona el rostro**. Parte de lo que se leía como «no es
ella» era distorsión de lente, no deriva de identidad. La pieza aprobada usa *chest-up medium close-up, 85 mm f/2*.

### La cabeza casi NO gira: giran los ojos **[del brief aprobado + medido]**

Pedir «gira la cabeza hacia el hombro» = pedir un **tres cuartos marcado**, ángulo que el set de referencias **no
cubre** → reconstrucción del rostro. En la pieza aprobada la cabeza está casi frontal y **sólo los ojos** van
hacia la mascota. Marcadores que funcionan: ambos ojos y ambas cejas visibles, ambas mejillas visibles, la oreja
lejana en cuadro, el puente de la nariz NO corta la mejilla lejana.

### Mirada muy descendida destruye los ojos **[medido]**

Con la cabeza en tres cuartos y la mirada muy abajo, el párpado superior baja con el globo ocular y **devora el
iris**; el ojo lejano queda como **ranura sin globo**. Es anatómicamente correcto y fotográficamente el peor caso.
Agravante medido: **editar «cejas altas» sobre esa pose lo empeora** — el modelo sube la ceja pero no reconstruye
el párpado, y queda un párpado largo sin pliegue con la línea de pestañas fundida en la sombra.

Marcadores de ojo que sí funcionaron:

- el iris del ojo cercano se ve **como círculo completo**, nunca media luna recortada por el párpado;
- **esclerótica visible a ambos lados**;
- el párpado superior por encima del iris con **su pliegue como línea propia**, bien por debajo de la ceja;
- línea de pestañas como **borde oscuro definido**, nunca fundida;
- el ojo lejano **abierto con su propio iris**, nunca una ranura oscura.

### «45 degrees» no gira la cabeza **[medido, confirma la regla de marcadores]**

Una primera pasada volvió con la cabeza **en el mismo ángulo de la referencia**. Lo que sí la movió:

1. **Declarar la inversión explícita**: «en la referencia está girada hacia SU DERECHA; aquí debe girar al lado
   OPUESTO».
2. **Marcador de destino**: «su nariz apunta al BORDE DERECHO del cuadro».

### Trabajo ya producido en identidad A

`ai-generations/2026-09-21_nexa-angulos/salidas/`: `nexa-45-izq-v02` y `nexa-perfil-izq-v02`, verificados (fondo
gris, camiseta gris, giro correcto, consistentes con la convención de Julio). Prompts v02 versionados en
`prompts/`. **Quedan cuatro ángulos si se elige A; se descartan si se elige B.**

### Cierre 2026-09-21 — Nexa tiene sus seis vistas y una sola identidad **[commit `94e8704b5`]**

`set-identidad/angulos/nexa-{45-izq,45-der,perfil-izq,perfil-der,135-trasero,espalda}.png`, 1024×1024, fondo
gris liso y camiseta gris neutra, mismo formato que los de Julio, **derivados por EDICIÓN** desde
`nexa-avatar-34-v2`. El bloque `nexa` declara `vistas` y sus tres referencias son ya todas de la serie Avatar:
`the-breakdown` (identidad B) salió y entró `nexa-avatar-frontal-v2`.

**Por qué la tercera referencia NO es uno de los bustos con hoodie**: el hoodie es azul y arrastraría el azul
de marca a las piezas — el mismo defecto que el navy del set viejo de Julio. **El set neutro se construye
neutro a propósito.**

### La convención de nombres se dedujo de las IMÁGENES, no de los prompts **[medido 2026-09-21]**

El sufijo de cada vista nombra **hacia dónde gira la persona**, no qué lado de la cara se ve.

🔴 El prompt `_edit-perfil.txt` del set de Julio dice a la vez «*camera perpendicular to his left side*» y
«*only the right side of his head is visible*», que **no pueden ser ciertas juntas**; la imagen resultante sí
respeta la convención. **Quien documente el canon leyendo ese prompt lo documentará al revés.** Para deducir
una convención, mirar las salidas aprobadas, nunca los prompts que las produjeron.

### El modelo puede obedecer dos instrucciones y callar la tercera **[medido 2026-09-21]**

Una primera pasada volvió con **fondo y prenda correctos** y la rotación **ignorada en silencio**: la cabeza
salió en el mismo ángulo de la referencia. Que dos instrucciones se cumplan **no dice nada** de la tercera:
cada una se verifica por separado. Con la inversión declarada respecto a la referencia más el ancla «su nariz
apunta al BORDE DERECHO del cuadro», seis de seis salieron a la primera.

### Una referencia que no se usa NO avisa **[medido 2026-09-21 · commit `1911d293f`]**

Con **dos personas** en cuadro el cupo baja a 2 referencias por cabeza y se tomaban las dos primeras de la
lista. Las dos primeras de Julio son **ambas de rostro** según su propio `MANIFIESTO.json`, así que **se
quedaba sin cuerpo entero siempre** que hubiera dos personas; en Nexa el cuerpo se caía en cuanto se pedía una
vista, porque la vista desplaza una posición. El modelo **inventaba la silueta**.

🔴 **Estuvo latente porque la pieza sale igual**: no hay error, no hay aviso, y el cuerpo no es lo que uno mira
para juzgar identidad. La ronda P3 no lo destapó por ser plano medio.

**El recorte lo decide el ORDEN de una lista que nadie escribió pensando en eso.** Es el reverso del hecho de
que el modelo obedece dos instrucciones y calla la tercera: acá **el que calla es el contrato**.

Arreglo vigente: cada persona declara `cuerpo: '<ruta>'` y esa referencia **viaja siempre que quepa**,
sustituyendo la última (la vista va primera y manda). Con su reverso obligatorio: **si la vista pedida ya es de
cuerpo entero, no se añade el cuerpo frontal** — dos cuerpos y ningún rostro cercano es justo lo que hace
derivar la cara. Cubierto por cuatro tests, verificados desactivando la condición.

**Siluetas nuevas de Nexa**: `cuerpo-perfil-izq` y `cuerpo-espalda`, generadas a **1536×2304** y no a 1024,
porque a página entera el rostro cae a ~120 px y el modelo lo rellena.

**Deuda declarada**: el manifiesto ya trae `tipo: rostro|cuerpo` y el catálogo TS lo declara otra vez. Hay dos
fuentes para el mismo dato; lo correcto sería que el catálogo leyera el manifiesto. Es un refactor y no se hizo
sin acordarlo.

### 🔴 Antes de construir, buscar si ya existe **[tres casos medidos el 2026-09-21]**

| Lo que ya existía | Dónde | Qué costó no mirarlo |
|---|---|---|
| El brief del plate aprobado: encuadre, lente, escala de la mascota y pose ya resueltos | `ai-generations/2026-09-17_kv-tu-ia-no-conoce/brief/plate-kv-4x5.prompt.txt` | ~20 generaciones reconstruyendo el encargo de memoria |
| Un turnaround de Nexa con 9 vistas | `01. Material/01. Avatar/hf_20260327_182342_…png` | se iba a construir el set de ángulos desde cero |
| `tipo: rostro\|cuerpo` por referencia | `refs-aprobadas/MANIFIESTO.json` | el código no lo leía y el cupo recortaba el cuerpo en silencio |

**El reflejo de reconstruir de memoria es el error más caro medido en esta jornada.** Antes de construir:
el brief de la pieza aprobada equivalente, el kit con la vista o pose pedida, y el manifiesto del set.

### Curaduría de `01. Material/01. Avatar/` **[medido]**

De los 58 archivos, los **cuatro retratos grandes del 27/03 son AMBIGUOS**: cejas gruesas como A pero sin el
delineado del párpado. **No están clasificados en ninguna identidad y no deben cablearse por parecerse.**
Tampoco entran como ancla de rostro el traje naranja (arrastra color, igual que el navy del set viejo de
Julio) ni las series `Poses y expresiones/` y `Vestuario/`, que son identidad B.
