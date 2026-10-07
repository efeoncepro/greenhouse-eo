# Sika México LIC-1164 — Propuesta gráfica creativa «POSIBLE»

> **Tipo de documento:** caso de trabajo (método, iteración y resultados)
> **Versión:** 1.0
> **Creado:** 2026-10-07 por Claude (sesión «Sika design system licitación») con el operador Julio Reyes
> **Estado:** muestra creativa terminada y aprobada por el operador. No es oferta enviada: faltan el documento de oferta (metodología, tiempos, económica) y la validación con Finanzas.
> **Entregable:** `OneDrive › Alineación/4. Comercial/Licitaciones/Sika/2. Campaña Creativa/Efeonce-Propuesta-Sika-POSIBLE.pdf` (21 páginas, 13,5 MB)
> **Lienzo de trabajo:** [claude.ai/artifact/ES3QGcjSiLViUcSW3AG2o5](https://claude.ai/artifact/ES3QGcjSiLViUcSW3AG2o5) (privado; artifact `6cc5e06a-0bcb-4a16-b459-9b3eaa7dd17c`)
> **Manual reutilizable:** [Trabajar una propuesta gráfica creativa para un cliente](../../../manual-de-uso/creative/propuesta-grafica-creativa-para-cliente.md)

Es la **primera propuesta gráfica creativa que Efeonce construyó en conjunto con un agente** para un cliente: el
operador dirigió y aprobó en un lienzo compartido; el agente diseñó, generó, compuso, verificó y documentó. Este
documento deja el caso completo para que la siguiente se haga más rápido y sin repetir los errores.

## 1. El encargo

Sika Mexicana licita por Wherex (N.º 1164, cierre 16/10/2026 19:00) una agencia que **evolucione** su campaña paraguas
de lanzamientos «Innovar es hacerlo posible, innovar es hacerlo Sika». Las bases piden como muestra:

- 1 imagen para Facebook, 1 para Instagram y 1 reel de hasta 30 s (en preguntas y respuestas, Sika aceptó **storyboard
  o animatic** con locución propuesta).
- Metodología, abordaje de la evolución gráfica, tiempos y propuesta económica desglosada sobre un «lanzamiento tipo»
  (5 posts, 1 reel, 3 historias por red, póster tabloide, cenefa, colgante, anuncio carta) más el Master Graphic.
- No hay archivos .AI ni .PSD; la marca Sika conserva la jerarquía principal.

Fuentes del brief, PDF de Sika y renders de producto: `OneDrive › …/Sika/2. Campaña Creativa/generalFiles`.

## 2. Método

### 2.1 El lienzo como sala de trabajo

Se eligió el **lienzo de diseño de Claude** (sobre Figma y Canva) porque deja comentar cada pieza en su lugar y el
agente responde y corrige en el mismo hilo. Se organizó en páginas: Portada · 0 Evolución · 1 Manual de identidad ·
2 Master Graphic y piezas. Cada tablero es un HTML generado por código (`gen*.py`), así que corregir una regla
corrige todas las piezas que la usan.

**Cómo se trabajó:** el operador comentaba sobre la pieza («se pierde el POSIBLE», «el 2 en 1 se ve tétrico», «más
punch acá»); el agente leía el hilo, corregía el generador, re-renderizaba, **miraba la captura** antes de publicar,
respondía en el hilo y lo resolvía. Hubo más de 40 hilos así.

### 2.2 Sistema antes que piezas

Se construyó primero el **manual de identidad de la campaña** (11 tableros) y después las piezas:

- **Manual:** 01 firma principal («INNOVAR ES HACERLO / POSIBLE», el SÍ en bloque y el triángulo de Sika como tilde de
  la I) · 02 construcción y tamaño mínimo · 03 versiones · 04 arquitectura con Sika (Sika manda, la campaña ordena, el
  producto vende) · 05 color, tipografía y recursos · 06 movimiento · 07 usos incorrectos · 08 aplicaciones del brief ·
  09 audiencias · 10 punto de venta · 11 fórmula de titular.
- **Master Graphic** (pieza madre, aprobada): gramática amarilla a la izquierda con firma y titular; escena
  cinematográfica en diagonal de 13° con SikaSeal y Sikaflex de pie sobre piedra mojada.
- Las piezas **convergen** al Master Graphic en vez de rehacerse (el operador lo pidió así).

### 2.3 Reglas de producción fijadas por el operador

| Regla | Por qué |
|---|---|
| El producto es el héroe: ni firma, ni sello, ni velo, ni guía lo tapan; y el producto no tapa la firma | «Covering the product is not acceptable» |
| Siempre el render real del envase, armonizado con Sunburst pasando el render como referencia | Luz, sombra y etiqueta consistentes |
| Escala real (cartucho 280 ml = 22 cm; 300 ml = 23 cm); la escena se genera con el producto dentro, nunca pegado sobre una foto ajena | Rechazo de «producto flotando» y «se ve chico junto al lavabo» |
| Sombras físicamente correctas: luz a 45° desde arriba a la derecha, sombra abajo a la izquierda, amarillo oscurecido, nunca gris; si el modelo falla, se calcula desde la silueta | Sunburst la hizo mal dos veces en el Master Graphic |
| Titular: «Innovar para» en Barlow Condensed Light 300 y el verbo en Black 800; el punto final en el color de la línea sobre amarillo (petróleo SikaSeal `#015A78`, morado Sikaflex `#321D59`), amarillo sobre oscuro | Contraste de pesos, sin cajas |
| Sobre foto con texto, espacio oscuro reservado en la toma; nunca velos | «Over-photo version: use reserved space» |
| Sello de lanzamiento con el lenguaje del envase (franja amarilla con logo, cuerpo en el color de la línea, franja blanca con el beneficio) | El primer sello «se veía tétrico» y desconectado de Sika |

## 3. Iteración — lo que pasó y qué se aprendió

### 3.1 Manual y piezas (6 de octubre)

- La primera versión editorial fue rechazada por «muy sencilla»: se subió a amarillo a sangre, diagonal de 13°, héroe
  con agua y macros de prueba.
- El SÍ en bloque tapaba «INNOVAR ES HACERLO»; el titular chocaba con el producto; el sello gris de ViscoCrete no
  conectaba con la marca; el POSIBLE se perdía detrás del producto. Todo se corrigió en el generador, no a mano.
- Aprobadas el 6/10: Master Graphic, Facebook, Instagram, Sikaflex, ViscoCrete y el PDV en tienda.

### 3.2 Reel → storyboard

- Se hizo un animatic en video (HyperFrames + 3 clips de Seedance 2.5, sin audio porque fal quedó sin saldo y el MCP
  de ElevenLabs pide una clave `sk_`). El operador pidió «muchísimo punch».
- Al releer las bases, el entregable es **storyboard o animatic**: se priorizó el storyboard y se rehízo cuadro por
  cuadro a 1080×1920 (gancho, problema, giro, aplicación, héroe, beneficios, firma).
- El operador decidió que **el reel cierra en la firma** (cuadro 07, 18–25 s) y descartó el end card: quedaron 7
  cuadros con locución y sonido por cuadro.

### 3.3 Firma de Efeonce en todas las hojas

Se cargó la skill `efeonce-graphic-line`. Cada hoja lleva un pie navy (`#001a33`) con el lockup **Efeonce | Creative
Studio** (negativo, 24 piezas aprobadas el 6/10), el texto «Propuesta para Sika Mexicana · Licitación Wherex N.º 1164
· Confidencial» y la **burbuja `efeoncepro.com`** horneada (nunca la URL como texto). El pie va **fuera** de las piezas
de Sika: nuestro logo no entra en el material del cliente. Las portadas y la contraportada no llevan pie (operador).

### 3.4 La portada — cinco intentos

| # | Qué se hizo | Resultado |
|---|---|---|
| 1 | Receta aprobada `cover-proposal` (layout `dawn`, sin foto, triángulo de Sika como `clientLogo`) con `pnpm brand:compose` | Correcta según norma, pero el operador quería algo cinematográfico que mezclara la propuesta con «nuestra portada» → quedó como Portada B |
| 2 | Sobre el plate aprobado CR4 (portada creativa) se pegaron 9 piezas de Sika con homografía en las tarjetas de luz | **«Se ve horrible»**: stickers sin luz de escena, muchas y chicas, escena repetida del brochure |
| 3 | Plate nuevo SK1 (Karo frente a un lightbox amarillo en blanco), revisado por `cine-reviewer` antes de gastar; Master Graphic compuesto encima; Karo recortada y movida | **«Se nota demasiado lo determinístico»**: la persona movida conserva la luz de su posición original y el arte pegado no recibe luz |
| 4 | **Método de la sesión «Efeonce línea gráfica»** (ver 3.5): escena generada CON el arte como referencia, arte exacto compuesto encima, acabado de materia y luz | Integrada. El operador pidió mejoras de dirección |
| 5 | SK3: Karo **presenta** el afiche con la mano abierta, cartuchos enteros, contraluz amarillo leve, más afiche y menos techo | **«Está perfecta»** (aprobada 7/10) |

Voz final: «Propuesta · Sika Mexicana — ¿Cómo se ve lo posible? **Así.** — Por Efeonce Creative Studio · Licitación
Wherex N.º 1164 · Confidencial», receta `cover-brochure` (layout `line`, línea brand) compuesta con `pnpm brand:compose`.

### 3.5 El método que resolvió la portada (arte exacto de un cliente dentro de una foto de cine)

Lo dio la sesión dueña de la línea gráfica cuando el operador pidió consultarla. El principio: **lo sensible se compone
y el modelo sólo termina con materia y luz**. Los intentos 2 y 3 fallaron por el **orden**: el arte se pegó sobre una
foto ya terminada.

1. **Generar la escena con el arte presente.** El prompt sale de `pnpm foto:generar <ficha> --dry` (identidad, kit del
   hoodie, macro del bordado) y se llama a `pnpm ai:image` con esas referencias **más el Master Graphic como imagen
   extra** (`foto:generar` no admite referencias fuera del catálogo). La luz del afiche cae de verdad en el piso y en la
   persona; el modelo reproduce el layout aproximado.
2. **Componer el arte exacto** sobre el lightbox con homografía (esquinas medidas en el plate). La máscara de
   `ai:image:rmbg` sobre la toma entera toma el lightbox brillante como sujeto: se limita a la zona de la persona y la
   mano se recorta con `rmbg` sobre un recorte local.
3. **Acabado** con `pnpm ai:inpaint image --model gpt-image-2.5-sunburst` sólo sobre el lightbox (textura de tela,
   caída de luz). Verifica que fuera de la máscara no cambie un píxel.
4. **Proteger letras y color:** el acabado cambió texto chico de las etiquetas («PUREFORM», «119S») y viró el amarillo a
   limón. Se resolvió con un **híbrido de frecuencias** (detalle del arte exacto + luz del acabado, `hibrido-luz.cjs`,
   sigma 10) y una **ganancia de color sólo en los píxeles amarillos** del arte exacto (`color-lightbox.cjs`).
5. **Aire para la columna de texto:** el modelo puso el lightbox más a la izquierda de lo pedido. `pnpm foto:expandir
   --reponer no` amplía el estudio sin costuras y el lightbox exacto se repone encima (`reponer-lightbox.cjs`).
6. **Nunca mover a una persona recortada:** si su posición no sirve, se regenera la toma con la posición escrita por
   geografía en la ficha.

Es el **primer precedente de arte de un cliente dentro de una foto cine de Efeonce**; queda como **excepción del
operador para esta pieza**, no como regla. Confirmar con Sika que las bases permiten usar su gráfica en nuestra portada.

### 3.6 La hoja 3: el material que Sika ya tenía, rehecho en POSIBLE

El operador observó que la hoja de referencia mostraba el material viejo de Sika («nada fue lo que construimos») y
pidió rehacerlo en la línea propuesta, autorizando generar imágenes nuevas sin límite:

- **Carrusel Sikaflex-119:** pieza aprobada · repisa de roble montada con el cartucho (foto nueva) · cierre con la firma.
- **SikaSeal-170 2 en 1:** una mujer sella la junta de su ducha (foto nueva, reemplaza a la pieza con persona) · post
  aprobado · versión cocina.
- **PDV Sikaflex-119:** cenefa 6:1 y stopper 2:3. El stopper se rehízo «con más punch»: losa de piedra pegada a un muro
  oscuro sin soporte, fragmentos suspendidos, cartucho héroe.
- Las escenas se generan con el render como referencia; si el sello tapa al sujeto, `foto:expandir` da aire arriba.
  La sombra de contacto de los envases recortados se calcula desde la silueta (`contacto.cjs`).

### 3.7 Contraportada y PDF

- Contraportada `close-brochure-orbit` en línea brand («¿Conversamos? Cuando quieras.», «Empower your Brand», datos de
  contacto). Las `close-proposal` se probaron y se descartaron: sus fotos son de la línea Growth (órbita teal,
  chaqueta «Empower your Growth») y chocaban con el naranja de Brand; además, portada con foto alterna con cierre sin foto.
- PDF de 21 páginas, cada una a su tamaño, texto vectorial e imágenes en JPEG (`pdf/build.cjs`). Fuera: Portada B y el
  animatic en video.

## 4. Resultados

| Pieza | Estado |
|---|---|
| Manual de identidad (11 tableros) + Evolución | Aprobado |
| Master Graphic | Aprobado (6/10) |
| Entregable 1 · Facebook 1:1 · SikaSeal-170 | Aprobado |
| Entregable 2 · Instagram 4:5 · SikaSeal-170 | Aprobado |
| Entregable 3 · Reel · storyboard de 7 cuadros con locución | Ajustado por el operador (cierre en la firma) |
| Extras: Sikaflex-119, ViscoCrete 45 HE, PDV en tienda | Aprobados |
| Hoja 3: material de Sika rehecho en POSIBLE | Rehecha 7/10, stopper con más punch |
| Portada cinematográfica | Aprobada 7/10 («Está perfecta») |
| Contraportada | Sumada 7/10 |
| PDF de la propuesta | Entregado en OneDrive |

**Gasto de IA medido en la sesión del 7/10** (portada y hoja 3): ≈ USD 1,3 (generaciones Sunburst high, acabados de
`ai:inpaint` y ampliaciones). Los clips de video del animatic costaron ≈ USD 2,31 cada uno (Seedance 2.5, 720p, 5 s).
El gasto del 6/10 en escenas del manual y piezas no quedó totalizado. [inferencia: el total de la propuesta está en el
orden de decenas de dólares, no cientos]

## 5. Lo que este caso deja como regla para la próxima

1. **Sistema primero** (manual + pieza madre) y las piezas convergen a él; los cambios se hacen en el generador.
2. **Mirar la captura antes de publicar** cada cambio; el agente no da por buena una pieza por un número.
3. **Arte del cliente en foto:** generarlo dentro de la escena, componer el exacto, terminar sólo con materia y luz,
   proteger letras y color, nunca mover personas recortadas (3.5).
4. **Nada tapa el producto** y **nuestro logo no entra en el material del cliente**: Efeonce firma en el pie de la hoja.
5. **Leer las bases antes de producir de más:** el reel se pedía como storyboard; el animatic quedó de complemento.
6. **Consultar a la sesión dueña** cuando una técnica no funciona dos veces seguidas: el método de la portada salió de ahí.

## 6. Pendiente

- Documento de oferta: metodología, tiempos y económica desglosada (lanzamiento tipo + Master Graphic + tarifario),
  validado con Finanzas (facturación desde Chile, CLP/MXN).
- Preguntas a Wherex: manual de marca de Sika, moneda y facturación, zona horaria del cierre, historias por red.
- Revisar conflicto de interés con Berel (cliente de Efeonce; otro oferente preguntó por co-branding Sika–Berel).
- Confirmar uso de la gráfica de Sika dentro de la portada (autorización de marcas de cliente: TASK-1937).
- Audio del animatic, si se quiere entregar como complemento.
- Los PNG de trabajo viven sólo en local (`ai-generations/2026-10-06_sika-*`, ignorados por git) y en el lienzo; el
  entregable está en OneDrive.

## 7. Archivos

| Qué | Dónde |
|---|---|
| Generadores del manual, piezas, storyboard, hoja 3, firma del lienzo y PDF | `ai-generations/2026-10-06_sika-propuesta-grafica/fuentes/` |
| Portada: fichas SK1–SK3, prompts, scripts de composición, acabado y color, intents | `ai-generations/2026-10-06_sika-portada-cine/` |
| Hoja 3: piezas, contacto y prompts de escenas | `ai-generations/2026-10-06_sika-hoja3/` |
| Reel: script de audio (fal, sin ejecutar por saldo) | `ai-generations/2026-10-06_sika-reel/audio.ts` |
| PDF final | OneDrive `…/Sika/2. Campaña Creativa/Efeonce-Propuesta-Sika-POSIBLE.pdf` |
| Lienzo | [claude.ai/artifact/ES3QGcjSiLViUcSW3AG2o5](https://claude.ai/artifact/ES3QGcjSiLViUcSW3AG2o5) |
