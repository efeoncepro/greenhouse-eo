# Personas en la fotografía Efeonce V1 — casting, identidad y vestuario

> **Tipo de documento:** Especificación técnica y funcional de marca
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-20
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
