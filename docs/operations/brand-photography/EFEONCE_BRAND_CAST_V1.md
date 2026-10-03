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

## 6. Julio: la edad del bloque no coincide con la real [pendiente]

El bloque `IDENTITY` de Julio en `PERSONAS` dice *«mid-forties: do not rejuvenate»*, y el bloque histórico de
[personas §5.4](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) dice *«a Venezuelan man in his mid-forties»*. Julio
tiene **37** **[decisión del operador, 2026-10-02]**. Las salidas aprobadas el 2026-09-20 («me reflejan
perfectamente») se generaron con ese texto, y las canas probablemente las sostiene esa palabra.

No se cambia el texto a ciegas. Antes, un A/B de dos escenas ya aprobadas: el bloque actual contra *«late thirties,
prematurely grey: keep his age exactly as in the references, do not rejuvenate nor age him»*. El operador elige; si
gana el texto nuevo, se cambia en `PERSONAS` y en el canon §3.6 en el mismo commit.

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
4. **Control de identidad.** Tres escenas con 35, 85 y 200 mm, más las pruebas de §5. Se revisa al zoom, al lado del
   set.
5. **Registro.** Hoy un personaje de campaña se declara ficha por ficha en `casting`
   ([personas, delta 2026-10-02](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md#delta-2026-10-02--casting-de-campaña-para-personajes-ficticios)).
   Para un elenco que vuelve en varias campañas, eso copia la identidad en cada ficha y deriva: se propone un catálogo
   compartido `ELENCO` en `scripts/foto/build-prompt.mjs`, separado de `PERSONAS` y fuera de `EQUIPO_REAL`, que las
   fichas pidan en `identidad` y al que se aplique la guarda de vestuario por línea **[propuesta, requiere cambio de
   código]**.

## 8. Estado

| Personaje | Estado |
|---|---|
| Julio | Aprobado (roster). Pendiente el A/B de edad (§6) |
| Hum | **Elegida: candidata B** (`hum/hum-b.png`) **[decisión del operador, 2026-10-02]**. Set v3 listo: 6 vistas, manos y ancla en alta resolución (`realismo-v3/hum/`). Humberly sigue en el roster sin cambios |
| Isabella | **Elegida: candidata D de la ronda 2** (`ronda-2/isabella-d.png`) **[decisión del operador, 2026-10-02]**. Set v3 listo (`realismo-v3/isabella/`); revisar la frente del ancla en alta resolución; pendiente la marca de carácter |
| Karo | **Elegida: candidata A de la ronda 2** (`ronda-2/karo-a.png`) **[decisión del operador, 2026-10-02]**; reemplaza a la favorita previa (B de la ronda 1). Base de Sophia. Set v3 listo (`realismo-v3/karo/`) |
| Antonio | **Elegido: candidato D de la ronda 2** (`ronda-2/antonio-d.png`) **[decisión del operador, 2026-10-02]**. Set v3 listo (`realismo-v3/antonio/`); revisar la frente del ancla en alta resolución y el 45° derecha |
| Sophia | **Elegida: candidata B con pelo castaño oscuro** (`sophia/sophia-b-castano.png`, editada desde Karo A) **[aprobada por el operador, 2026-10-02: «Esta queda aprobada para Sophia»]**. Set v3 listo (`realismo-v3/sophia/`) |
| Catálogo `ELENCO` | Propuesto (§7.5) |
