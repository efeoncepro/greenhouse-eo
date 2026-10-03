# Elenco de marca Efeonce — V1

> **Tipo de documento:** Norma operativa (fotografía de marca)
> **Version:** 1.0
> **Creado:** 2026-10-02 por Claude (pedido y decisiones del operador)
> **Ultima actualizacion:** 2026-10-02 por Claude
> **Estado:** Biblia aprobada en sus decisiones; ronda 1 de casting en curso. Ningún personaje tiene set aprobado todavía.
> **Documentacion relacionada:** [Equipo real](./EFEONCE_TEAM_ROSTER_V1.md) · [Personas, identidad y vestuario](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) (§2 casting, delta 2026-10-02 casting de campaña) · [Registro cine](./EFEONCE_PHOTO_REGISTER_CINE_V1.md) · Evidencia `ai-generations/2026-10-02_elenco-efeonce/`

Convenciones: **[decisión del operador]** · **[propuesta]** (rasgo agregado por Claude, aceptado como base, se ajusta
al elegir candidato) · **[medido]** · **[pendiente]**.

## Para qué sirve

Define el elenco que reaparece en las piezas de Efeonce: dos personas reales del equipo y cuatro personajes ficticios.
Cada personaje queda ligado a una línea de servicio. Fija quién es quién, cómo se ve, qué puede representar, qué viste y
cómo se construye su set de referencias para que sea la misma persona en cada pieza y en cada formato.

Este documento **no** reemplaza al [roster del equipo](./EFEONCE_TEAM_ROSTER_V1.md): las personas reales siguen
gobernadas allí (`PERSONAS` de `scripts/foto/build-prompt.mjs`). Acá sólo se fija su lugar en el elenco.

## 1. El elenco

| Clave | Quién | Tipo | Edad | Origen | Línea (`efeonceGraphicLine.lines`) | Rol que interpreta |
|---|---|---|---|---|---|---|
| `julio` | Julio Reyes | **real** | 37 | Venezolano | `growth` (Growth Strategy & Measurement) | Él mismo: Managing & GTM Director |
| `hum` | Hum | ficticio (inspirada en la descripción de Humberly, sin su foto) | 33 | Venezolana | `growth` (Growth Strategy & Measurement) | Estratega de crecimiento y medición |
| `karo` | Karolyne «Karo» | ficticio | 28 | Venezolana | `brand` (Creative Services) | Directora de arte y creadora de contenido |
| `sophia` | Sophia | ficticio | 31 | Venezolana, hermana mayor de Karo | `engine` (Web, infraestructura, SEO y medición) | Estratega SEO/AEO y analítica web |
| `isabella` | Isabella | ficticio | 27 | Colombiana (Barranquilla) | `voice` (Media & Distribution) | Especialista de medios pagados y distribución |
| `antonio` | Antonio | ficticio | 35 | Mexicano (CDMX) | `revenue-hubspot` · `revenue-salesforce` (RevOps & CRM) | Líder de RevOps y CRM; la plataforma la pone la pieza |

**[decisión del operador, 2026-10-02]** «Hum es Humberly» (después reemplazada: Hum es un personaje ficticio, §3.2). Las nacionalidades y las edades propuestas quedan aceptadas.
Los roles de los ficticios los asigna Claude por línea de servicio, a pedido del operador («dales tú rol basado en las
líneas de negocio»). Julio tiene **37 años** (corrección del operador; ver §6).

Lógica del reparto **[propuesta]**: cada línea tiene una cara. Las hermanas cubren el par creativo/analítico (`brand` y
`engine`), que es la tensión natural entre esas dos líneas y se puede contar en una pieza. Las personas reales aparecen
**en su rol real**: no interpretan otra línea, porque una persona real con un cargo inventado rompe la verdad operativa.

## 2. Qué puede y qué no puede representar un personaje ficticio

| Puede | No puede |
|---|---|
| Interpretar el rol de su línea en piezas de campaña, social, deck y propuestas (como hoy el casting por rol del registro cine: «la estratega», «la líder de RevOps») | Aparecer como persona del equipo con nombre en la página de equipo, firmas, organigrama, LinkedIn o cualquier superficie que diga «quiénes somos» |
| Vestir la prenda de su línea cuando interpreta ese rol (§4) | Presentarse como cliente, ni con nombre de empresa ni en un testimonio firmado ([personas §7](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md)) |
| Aparecer junto a Julio y Nexa | Llevar el nombre de un personaje en pantalla, salvo una narrativa de campaña que lo declare como ficción |
| | Cambiar de rol o de línea de una pieza a otra |

Los nombres de los ficticios son **claves internas** del elenco, no nombres públicos. Las piezas con personas generadas
por IA que se publiquen pasan por la gobernanza de derechos y divulgación de IA (`greenhouse-ai-creative-rights-governance`)
**[pendiente por pieza]**.

## 3. Fichas

Los bloques `IDENTITY` se escriben en inglés y con **geometría, no adjetivos** (lección de Julio, 2026-09-20: «cara
delgada» no significa nada para el modelo; «óvalo 1,5 veces más alto que ancho» sí). El bloque definitivo de cada
ficticio se escribe **desde el candidato elegido**, no desde esta ficha: la ficha orienta el casting, la imagen manda.

### 3.1 Julio (real)

Identidad aprobada en el roster (`julio`, set del 2026-09-20). No se construye nada. Pendiente: la edad del bloque (§6).

### 3.2 Hum (ficticio · `growth`)

**[decisión del operador, 2026-10-02]** Primero «Hum es Humberly». Las vistas de cuerpo derivadas de su avatar fallaron
dos veces por proporción: la cabeza salía enorme o, corregida, demasiado pequeña. Su única referencia es de medio cuerpo,
así que el modelo inventa el cuerpo. Entonces: «si da mucho guerra reimagina una persona como Hum pero desde cero y no
poniéndola a ella como referencia». Hum pasa a ser un **personaje ficticio** generado sólo desde texto. **Humberly sigue
en el roster del equipo real** y no cambia nada de su identidad.

| Rasgo | Ficha |
|---|---|
| Rostro | Óvalo redondeado, mejillas suaves, mentón redondeado |
| Ojos y cejas | Ligeramente almendrados, café oscuro; cejas oscuras de arco suave |
| Piel | Blanca con subtono cálido y rubor natural |
| Pelo | Negro hasta el pecho, raya al lado, capas que enmarcan la cara y ondas sueltas en las puntas |
| Cuerpo | 1,70 m, complexión media: ni voluptuosa ni plana |
| Firma propia | *Piercing* pequeño plateado en la nariz |

Candidatas en `ai-generations/2026-10-02_elenco-efeonce/hum/`, encuadre de tres cuartos (cabeza a medio muslo) para
juzgar cara y proporción a la vez. Prompts verbatim en `hum/*.txt`. Las vistas de Humberly
(`humberly/`) quedan como evidencia de la falla.

### 3.3 Karo (ficticio · `brand`)

| Rasgo | Ficha |
|---|---|
| Rostro | **Corazón**: frente y pómulos anchos que bajan a un mentón fino, algo puntiagudo. Nariz pequeña, levemente respingada |
| Ojos y cejas | Café claro |
| Piel | Blanca, Fitzpatrick II, rosada en las mejillas |
| Pelo | **Rizos 3A–3B** definidos, cobrizo oscuro, largos hasta media espalda, mucho volumen |
| Cuerpo | Delgada, hombros estrechos, cuello largo · 1,63 m |
| Carácter | Coqueta en el **gesto**, no en el cuerpo: sonrisa ladeada, mirada pícara, una ceja arriba. Social, presenta, convence |
| Firma propia | Aros dorados medianos, labial rosado |
| Vestuario propio (fuera de rol) | Color, estampados, prendas con textura |

### 3.4 Sophia (ficticio · `engine`)

Hermana mayor de Karo. Se construye **por edición desde el candidato elegido de Karo**, nunca de cero, para que el
parecido familiar sea real.

| Compartido con Karo (familia) | Propio de Sophia (separador) |
|---|---|
| Rostro de corazón y mentón fino | Rizos **cortos**: bob rizado a la altura de la mandíbula |
| La misma nariz | **Lentes** de montura metálica fina |
| La misma textura de rizo | Pelo **castaño oscuro** (Karo es cobriza) **[decisión del operador, 2026-10-02]** · seria, analítica; sonrisa contenida, boca cerrada |
| Piel blanca con rosado | Tres años mayor (31), 1,65 m, apenas menos delgada |

Vestuario propio: sobrio, camisa y neutros.

### 3.5 Isabella (ficticio · `voice`)

| Rasgo | Ficha |
|---|---|
| Rostro | Pómulos altos, labios llenos, sonrisa amplia con dientes parejos (el espacio entre los dientes de la ronda 1 quedó descartado por el operador) |
| Ojos y cejas | Ojos grandes, café oscuro; cejas pobladas naturales |
| Piel | Morena, Fitzpatrick V, subtono cálido |
| Pelo | **Rizos 3C–4A** naturales, café muy oscuro, mucho volumen; suelto o en moño alto |
| Cuerpo | Delgada y estilizada, cuello largo · 1,68 m |
| Carácter | Energía alta, gesticula al explicar, ríe fácil |
| Firma propia | Aros pequeños de madera mate |
| Vestuario propio | Color fuerte, accesorios de madera |

### 3.6 Antonio (ficticio · `revenue-*`)

| Rasgo | Ficha |
|---|---|
| Rostro | Mandíbula cuadrada y marcada, nariz recta con una giba leve, cejas gruesas y rectas |
| Ojos | Café oscuro |
| Piel | Trigueña, Fitzpatrick IV, subtono oliva cálido |
| Pelo | **Liso, negro, sin canas**, corto a los lados, más largo arriba y peinado hacia atrás |
| Barba | **Contenida**: 3–5 mm, cobertura completa, perfilada en mejillas y cuello |
| Cuerpo | Atlético medio, hombros anchos · 1,78 m |
| Carácter | Calma segura, sonrisa de boca cerrada. Galán de campaña con piel real (§7) |
| Firma propia | **Sin lentes**; reloj análogo con correa de cuero |
| Vestuario propio | Camisa oxford, sobrecamisa |

## 4. Vestuario

Rige la [regla por línea del roster](./EFEONCE_TEAM_ROSTER_V1.md#el-vestuario-lo-decide-la-línea-de-servicio)
**[decisión del operador, 2026-09-29]**, también para el elenco ficticio cuando interpreta su rol:

| Personaje | Línea | Prenda en rol |
|---|---|---|
| Karo | `brand` | hoodie Efeonce |
| Julio, Hum, Sophia, Isabella, Antonio | `growth`, `engine`, `voice`, `revenue-*` | bomber o softshell del uniforme corporativo (con el polo debajo si se quiere; el polo nunca solo) |

Fuera de rol (una pieza sin línea) cada uno viste su ropa propia (§3). La escena declara siempre el vestuario en
palabras: si calla, lo decide la referencia.

## 5. Contra el colapso de identidades

El modelo fusiona a personas parecidas. Cada pareja de riesgo tiene separadores que se declaran en el bloque y se
revisan en la hoja de contacto:

| Pareja | Riesgo | Separadores |
|---|---|---|
| Karo ↔ Sophia | Hermanas: el modelo las vuelve una | Largo del pelo, lentes, gesto (pícara vs contenida) |
| Hum ↔ Nexa | Treintañeras de pelo oscuro | Rostro **óvalo redondeado** de Hum vs mandíbula suave de Nexa; *piercing* en la nariz de Hum; delineado alado y anillo de plata de Nexa |
| Hum ↔ Humberly | Personaje inspirado en una persona real | Hum nunca se presenta como Humberly ni con su cargo; en piezas con el equipo real, Humberly sale con su identidad del roster |
| Antonio ↔ Julio | Latinos con barba, 35 y 37 | Lentes, canas, barba larga y pelo rizado de Julio; Antonio sin lentes, pelo liso negro, barba corta |
| Isabella ↔ Karo | Rizos | Textura (4A vs 3A), color de pelo y piel |

Con dos personas del elenco en cuadro, cada una lleva sus referencias con rol explícito
(«Images 1-2 are Karo… Images 3-4 are Sophia…») y las de una nunca se reutilizan para la otra.

## 6. Julio: 37 con canas prematuras [resuelto 2026-10-03]

El bloque `IDENTITY` de Julio decía *«mid-forties: do not rejuvenate»*; Julio tiene **37, con canas prematuras**
**[operador, 2026-10-02 y 2026-10-03]**. Se hizo un A/B sobre la misma escena y las mismas referencias
(`ai-generations/2026-10-02_elenco-efeonce/julio-edad-ab/`, archivado; `pnpm ai-gen:pull` para verlo): la diferencia
visible es sutil, porque las canas de la barba y de los lados las sostienen sus fotos aprobadas y no la palabra. Ganó
B y quedó en `PERSONAS` y en el canon §3.6: *«thirty-seven years old with premature grey: keep his apparent age
EXACTLY as in the references — do not rejuvenate, age, beautify or soften»*. El bloque histórico de personas §5.4 queda
marcado como tal.

## 7. Cómo se construye un personaje ficticio

1. **Ronda de casting.** Cuatro candidatos por personaje en retrato de casting (cabeza y hombros, frontal, mirando al
   lente, fondo gris medio, luz pareja, polera navy lisa sin logo, 85 mm, piel real). Motor `gpt-image-2.5-sunburst`
   high 1024×1024 (≈ USD 0,05 por imagen **[medido]**). Se presentan en hoja de contacto.
   **El elenco de publicidad son modelos de campaña, fotografiados con piel real [decisiones del operador,
   2026-10-02].** Primero: «necesito piel real, cabello real, manos reales, barba real». Después, sobre la ronda 1:
   «Son gente muy fea, Isabella tiene incluso detalles en los dientes, necesito literal personas reales, pero al menos
   modelos... se usarán para publicidad». Para este elenco **queda sin efecto** la regla de
   [personas §2](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) («caras con carácter, no de modelo»), que sigue vigente
   para el registro documental. Lo que se pide desde la `ronda-2`:
   - **Rostro:** atractivo, de los que contrata una agencia de casting para una campaña nacional.
   - **Marcas de carácter: sí, las que favorecen** («Las marcas de carácter estaban bien… el tema es que algunas eran
     muy feas»). Valen pecas suaves, un lunar de belleza y rizos con personalidad; no valen el espacio entre los dientes,
     las cicatrices ni los rasgos toscos. La marca se suma por edición sobre el candidato elegido.
   - **Piel:** sana y luminosa, con poros finos y textura real; sin manchas ni rojeces; nunca aerografiada ni plástica.
   - **Pelo:** real y cuidado, con mechones individuales y algún pelo suelto en el contorno.
   - **Barba:** cuidada, con pelos individuales visibles y líneas limpias; nunca pintada.
   - **Manos:** una en cuadro, bien formada, cinco dedos, uñas cuidadas.
   - **Luz y encuadre:** luz comercial, una principal suave a 45° con relleno y luz de pelo; de pecho para arriba.

   La pasada intermedia `ronda-1b` (luz lateral dura con manchas y rojeces pedidas) se detuvo antes de producir
   imágenes: empujaba en la dirección contraria. Prompts verbatim en `ai-generations/2026-10-02_elenco-efeonce/ronda-2/*.txt`.
2. **El operador elige uno por personaje.**
3. **Set por edición** desde el elegido, nunca generado de cero (generar reconstruye el rostro): frente, 45° izquierda
   y derecha, perfil, cuerpo entero y tres o cuatro expresiones. Mismo método que el casting de CMP-004
   (`ai-generations/2026-10-02_cmp004-cine-nativo/casting/`). Sophia sale del elegido de Karo, y después se hace una
   toma de las dos juntas.
   **Set del elenco, 2026-10-02 [medido]:** seis vistas por personaje en
   `ai-generations/2026-10-02_elenco-efeonce/sets/<clave>/` (frente, 45° a cada lado, perfil a cada lado y cuerpo
   entero; prompts en `sets/build-jobs.cjs`). Dos lecciones: (a) pedir el giro por el lado de la PERSONA («toward the
   person's own right») devolvió las dos vistas de 45° hacia el mismo lado en los cinco; se rehicieron nombrando el
   lado del CUADRO («the nose points to the right edge of the image») y pasando el perfil de ese lado como segunda
   referencia, solo para la dirección (`<clave>-45-der-v2.png`). (b) El cuerpo entero sale bien por edición desde un
   retrato si el prompt fija la proporción (cabeza ≈ 13 % de la altura, 85 mm a 7 m); el fallo de Humberly venía de
   una referencia de medio cuerpo con la cara muy grande en cuadro.
   **Realismo v3 en todo el elenco [decisión del operador, 2026-10-02: «Nexa empezó a salir bien cuando hicimos sus
   pruebas de rostro real, manos, cabello; necesito todas con más realismo»].** Se aplica la receta v3 de Nexa
   (`ai-generations/_identidad-nexa/LEEME.md`): la textura sale **sólo de poros irregulares y vello fino**, con tono
   parejo, piel sana y luminosa, sin rojeces, manchas ni ojeras, y la misma edad aparente. Para el elenco se suma pelo
   con mechones reales, manos reales y barba con pelos individuales. Se aplica **por edición, al mismo tamaño de la
   fuente**, sobre la foto elegida y las seis vistas; y cada personaje suma un **ancla de manos** y un **ancla de rostro
   en alta resolución** (`quality max`), igual que Nexa. Piloto con Sophia: al 100 % aparecieron poros, pecas suaves y
   vello fino, sin cambiar la cara. Prompts y salidas en `ai-generations/2026-10-02_elenco-efeonce/realismo-v3/`
   (`acabado-v3-elenco.txt`, `manos.txt`). **Las versiones v3 reemplazan a las anteriores como referencia.**
   Resultado **[medido, 2026-10-02]**: 40 imágenes v3 (elegida + 6 vistas + manos × 5) y 5 anclas `max`
   (`<clave>-ancla-hd.png`, 2560×3200; Hum 2048×3072 por ser 2:3), ≈ USD 4,7. Las v3 sostienen la identidad. En las
   anclas de **Antonio e Isabella** la frente sale con una **textura craquelada inventada** al 100 %, el riesgo que el
   LEEME de Nexa anota para la alta resolución: antes de usarlas en un primer plano se miran al 100 % y, si molesta, se
   rehacen o se usa la v3 de 1024 como ancla.
   **El cuerpo entero se EXTIENDE desde la foto elegida, no se regenera [operador, 2026-10-02: «Hum en la foto de
   cuerpo entero no se ve bien»].** Regenerado desde un retrato, el cuerpo de Hum salió con otra silueta (recta, sin sus
   curvas), jeans rectos holgados (los pedía el prompt), pose de maniquí y ≈ 8 cabezas de alto. La v4 pone la elegida
   (cabeza a medio muslo) arriba en un lienzo 1024×1536 al 57 %, el modelo rellena **sólo** piernas, pies y fondo con
   máscara (`ai:image --mask`) y se entrega su salida **sin reponer el original**: reponerlo dejó un recuadro por el gris
   del fondo, el mismo caso que documenta `foto:expandir --reponer no`. Resultado: su cuerpo, su ropa y su pose, ≈ 7,5
   cabezas, cara igual al 100 %. `foto:expandir` no sirve aquí porque siempre apoya la foto abajo; extender hacia abajo
   queda como mejora de la herramienta. Caso: `realismo-v3/hum/hum-cuerpo-v4.png` (+ `expandir/`). **Aplicado a los
   cinco [operador, 2026-10-02: «Corrige todos»]**: Karo, Sophia, Isabella y Antonio con `realismo-v3/expandir-cuerpos.cjs`
   (retrato de pecho al 36 % del lienzo, para que la cabeza mida ≈ 1/7,5 del alto final). Salen con pose natural que
   continúa el gesto del retrato y jeans ajustados; en Isabella y Antonio el modelo reencuadra un poco la cabeza, se
   revisa la cara al 100 % antes de usarlos.
4. **Control de identidad.** Tres escenas con 35, 85 y 200 mm, más las pruebas de §5. Se revisa al zoom, al lado del
   set.
   **La proporción se MIDE, no se mira [operador, 2026-10-02: «la foto entera de Karo se ve con la cabeza
   gigantesca, estás descuidando que pasa eso»].** La v4 fijó la escala del retrato a ojo (36 % del lienzo) y se
   aprobó mirando miniaturas: medida después, Karo tenía **5,9 cabezas** de alto y Sophia 6,1. Control:
   `node ai-generations/2026-10-02_elenco-efeonce/realismo-v3/medir-cabezas.cjs <medidas.jsonl>` sobre la salida de
   `swift ai-generations/2026-09-29_avatares-equipo/medir-rostro.swift <png…>` (Vision): cabeza ≈ 2 × (ojos → mentón),
   alto = coronilla estimada → suela. **Piso 7,2 cabezas**, calibrado con la ancla de cuerpo aprobada de Nexa (7,2).
   La v5 calcula la escala desde esa medida (`expandir-cuerpos-v5.cjs`, ojos → mentón = 86 px en un lienzo de 1536;
   con 94 px quedaban en 7,0–7,3 porque el modelo cierra los pies al 90 % del cuadro). Resultado medido: Hum 7,4 ·
   Karo 7,6 · Sophia 7,5 · Isabella 7,9 · Antonio 7,3, con la cara igual a la elegida. Todo cuerpo entero nuevo pasa
   esta medición antes de mostrarse.
5. **Registro [hecho, 2026-10-02].** Catálogo `ELENCO` en `scripts/foto/build-prompt.mjs`, separado de `PERSONAS`
   (commit `3a05ec0db`). Una ficha lo pide en `identidad` igual que al roster —`["karo"]` o
   `[{ "persona": "isabella", "vista": "perfil-izq" }]`— y recibe su bloque `IDENTITY`, sus referencias (frente, elegida,
   cuerpo) y la vista pedida. Las referencias viven en `ai-generations/_identidad-elenco/<clave>/` (con su `LEEME.md`),
   selladas en `scripts/foto/assets.lock.json` y publicadas al canon `gs://efeonce-creative-canon`. Guardas: un
   `casting` de ficha no puede usar una clave del elenco; con `linea` declarada el personaje viste la prenda de esa línea
   y **no puede interpretar otra línea** (Revenue admite HubSpot y Salesforce). Tests de contrato en
   `scripts/foto/build-prompt.test.ts` (§«elenco de marca»).

## 7b. Uniforme y grupo (2026-10-03)

**Uniforme [operador: «una prueba por cada uno sólo con la chaqueta bomber y polo piqué … con distintos ángulos»].**
Quince tomas (`ai-generations/2026-10-03_elenco-uniforme/`): frente, 45° con cámara baja y espalda mirando por encima del
hombro. La prenda va como **imagen de referencia del kit puesta** (`objetos`), no sólo como texto. Bordado del pecho y
logotipo trasero («efeonce» + «Empower your Growth») correctos al 100 %. Con la bomber abierta, el bordado del polo
asomaba junto al de la chaqueta («doble logo»): la escena declara que el borde de la chaqueta tapa el del polo.

**Grupo [operador: «una prueba cinemática juntos»].** Los cinco se piden en `identidad` en el orden del cuadro; desde el
2026-10-03 el compilador admite **grupos de 3 a 5 personajes del elenco** con una referencia frontal cada uno, bloques
IDENTITY etiquetados y la luz de las referencias cortada (medición y fallas en el
[casebook](./EFEONCE_PHOTO_CINE_CASEBOOK_V1.md#elenco-en-grupo-2026-10-03--lo-que-aprendimos), filas 21–25). Con
personas del roster el tope sigue en dos. Prueba `EC2` (cine, `publicidad-prueba`, no se publica): identidad de los cinco
sostenida; bordados de Hum y Antonio con isotipo oficial compuesto; el del hoodie de Karo y los de los polos quedan sin
corregir.

## 7c. La prenda se elige por quien la viste (2026-10-03)

Cada personaje declara `silueta` (Hum, Karo, Sophia e Isabella `mujer`; Antonio `hombre`), y `foto:prompt` elige la
vista puesta de su prenda por esa silueta, por el giro de su vista (45° y perfil → 70°), por `camara: "baja"` y por lo
que le tape el pecho (`tapa`). En un grupo, cada prenda declara `persona`. El kit tiene 126 vistas puestas nuevas
(bomber, softshell, polo y hoodie de frente, a 45° y 70°, de espaldas, desde abajo y con oclusión; la gorra a 45° y
70°), selladas y en el canon. Método, trampas y opciones: `garment-reference-kit.md` §Delta 2026-10-03 · corrida
`ai-generations/2026-10-03_uniforme-vistas/LEEME.md`.

## 8. Estado

| Personaje | Estado |
|---|---|
| Julio | Aprobado (roster). Edad: 37 con canas prematuras, en el bloque desde el 2026-10-03 (§6) |
| Hum | **Elenco listo**: set v3, cuerpo extendido, manos y ancla en alta resolución |
| Karo | **Elenco listo** |
| Sophia | **Elenco listo** |
| Isabella | **Elenco listo**, con su marca de carácter: pecas suaves en nariz y pómulos en todo el set **[criterio de Claude, a pedido del operador «vamos con todas»]**; ancla en alta resolución rehecha sin la frente craquelada |
| Antonio | **Elenco listo**. Su ancla en alta resolución sigue con la frente rugosa aun rehecha: para primeros planos se usa `antonio-frente.png` (`antonio-ancla-hd-no-usar.png` queda como evidencia) |
| Catálogo `ELENCO` | Registrado, sellado y publicado (§7.5) |
