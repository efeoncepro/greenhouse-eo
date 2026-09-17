# Hoodie Efeonce (2026): kit de referencia de prenda

Fecha de registro: 2026-09-17. Owner: Social Media Studio / Efeonce.
Caso: vistas fotográficas del hoodie de Efeonce para pasarlas como referencia cuando hay que vestir a Nexa o a
cualquier persona en una imagen generada, de modo que **el modelo no invente la prenda** (espalda, capucha, puño,
caída). Bitácora técnica y creativa; el inventario de vistas y el uso operativo viven en
[`LEEME.md`](../../../ai-generations/2026-09-17_hoodie-efeonce/LEEME.md) (binarios fuera de git). Caso hermano:
[kit de referencia del logo 3D](2026-09-17-efeonce-logo-3d-reference-kit-production-method.md).

## 1. Qué es y para qué

Es el mismo contrato del kit 3D del logo, aplicado a ropa: **la referencia fija la prenda, el prompt fija la persona y
la escena**. Sin una vista de referencia, cada generación reinventa la espalda, la capucha, el puño y la caída, y dos
piezas de la misma campaña no muestran la misma prenda.

El kit no es una pieza ni una campaña: es la fuente de verdad de la forma de la prenda, igual que el kit del logo lo es
de la forma del logo.

Qué prenda corresponde a cada contexto de uso —y cuáles ya tienen kit— está en
[§8 Cápsula de vestuario Efeonce](#8-cápsula-de-vestuario-efeonce).

## 2. Estado y entrega

Pedido del operador: distintas vistas del hoodie como referencia de vestuario. La espalda debe llevar el **logo
completo** y, debajo, **«Empower your Growth»** centrado respecto al logo y más chico.

**Destino OneDrive:** `5. Contenidos/13- Branding/Hoodie Efeonce/v01/` — 21 vistas + 14 transparentes +
`efeonce-hoodie-manifiesto.json` (cada vista con su descripción y **cuándo usarla**) + la estampa canónica.

Nombre: `efeonce-hoodie-<id>-<ancho>x<alto>-v01-<fondo-estudio|transparente>.png`.

| Familia | Vistas |
|---|---|
| Prenda sola | frente · espalda con estampa · tres cuartos izquierda y derecha · lateral · capucha puesta · doblada · percha · dos planos cenitales (frente y espalda) |
| Detalles | emblema del pecho · puño y cordón · interior de la capucha · cuello por dentro |
| Puesta en cuerpo neutro sin rostro | frente · espalda · un segundo cuerpo con otro tono de piel |
| Variantes de color | blanco hueso y gris jaspeado, frente y espalda, con la tinta en navy `#023c70` |

**Qué se recorta:** las 14 vistas de prenda sola y planos tienen variante transparente. Los primeros planos y las
vistas puestas **no** se recortan.

Modelo `gpt-image-2.5-sunburst`, calidad `xhigh`; ~USD 0,14 por vista, 26 generaciones con descartes.

## 3. El texto de la prenda se compone, no se genera

La estampa de espalda (logo completo + eslogan «Empower your Growth» centrado y más chico) se arma
**determinísticamente** con `estampa-espalda.mjs` desde `public/branding/logo-negative.svg` y el contrato de pesos de
`src/config/efeonce-brand.ts`: *Empower* en Poppins ExtraBold itálica, *your* en ExtraBold, *Growth* en Black itálica;
blanco sobre navy y `#023c70` sobre claro.

Esa estampa entra al modelo como **imagen 2**: el modelo sólo la apoya sobre la tela y la deforma con los pliegues. **El
texto exacto nunca se le pide al modelo.** Es el mismo principio que en el kit del logo, donde la forma de las letras
sale de la geometría oficial y no del modelo.

## 4. Decisiones que cambiaron el resultado

| Observación | Corrección | Criterio transferible |
|---|---|---|
| La estampa de espalda al 55 % del ancho de la espalda no se veía realista | Bajarla al **38 %** del ancho de la espalda | La proporción de una estampa se declara y se mide; no se deja al criterio del modelo |
| El emblema del pecho tendía a encogerse entre vistas | **Mismo tamaño y posición que el asset oficial; nunca se reduce** (corrección expresa del operador) | Lo que ya tiene asset oficial conserva su proporción; la vista cambia, el emblema no |
| La primera tanda se veía como render: simetría perfecta, brillo plástico, tela sin fibra | **Contrato de realismo obligatorio** en todos los prompts: lente de 100 mm, arrugas asimétricas, pelo de la tela con fibras sueltas, costuras y pespuntes levemente irregulares, tinta serigráfica mate apoyada sobre las fibras y deformada por los pliegues; sin simetría perfecta ni brillo plástico | Sin contrato de realismo explícito, una prenda sale con aspecto de render aunque el resto del prompt sea correcto |
| La tanda vieja y la nueva juntas parecían dos sesiones distintas | **Si cambia el contrato, se rehace la serie completa**, no sólo la vista nueva | Un kit vale por su coherencia interna: una vista fuera de contrato contamina todas |
| Un pedido de «detalle de puño y cordón» devolvió un collage de dos paneles | Exigir en el prompt **«una sola fotografía, no un collage»** | Un pedido de «detalle» puede leerse como lámina comparativa; hay que cerrar esa lectura |
| El eslogan compuesto con `<tspan>` perdía los espacios al rasterizar en librsvg | Espacios duros + `xml:space="preserve"` en el SVG de la estampa | La composición determinística también tiene sus trampas: verificar el rasterizado, no sólo el SVG |
| La espalda gris perdió el eslogan en un intento | Verificar la estampa **vista por vista**, no por muestreo | Una vista puede salir sin el texto con todo lo demás correcto |
| Las vistas puestas tendían siempre al mismo cuerpo | Cuerpos y tonos de piel distintos, siempre **sin rostro** | La referencia de prenda no debe arrastrar un modelo de persona a toda la campaña |
| **El emblema bordado salió espejado** —la nave apuntando a la izquierda— en 6 de las 21 vistas del polo: las cuatro blancas y dos navy | Pasar el **isotipo oficial** rasterizado (`public/branding/SVG/isotipo-full-efeonce.svg`) como **imagen 2** y describir su geometría en el prompt: nave a la derecha con la nariz redondeada a la derecha, las dos aletas abajo a la izquierda, órbita como elipse ancha con cortes, planeta arriba, tres ventanas en el cuerpo | Un emblema chico se espeja con facilidad. No basta con nombrarlo: hay que darle la forma oficial como referencia **y** describir su orientación en palabras |
| El espejo **no se ve en la hoja de contacto** | QA del emblema **vista por vista y al 100 %**, con recorte sobre el pecho | La revisión en miniatura da falsos verdes: un defecto de orientación sólo aparece con zoom. Aplica a cualquier prenda con emblema |
| Varias vistas del polo volvieron como **par frente+espalda** o con un **círculo de zoom insertado** | Cerrar todas las lecturas de una vez: **«una sola fotografía de una sola prenda: ni par, ni díptico, ni collage, ni inset»** | Extiende la regla del collage de arriba: el modelo tiene más de una forma de meter dos cosas en un cuadro, así que se enumeran todas |
| Los pedidos de detalle volvían como prenda completa | Pedir **encuadre macro explícito**: «el bordado llena el cuadro y el resto de la prenda queda fuera» | «Detalle» no es una instrucción de encuadre. El macro se declara diciendo qué queda **fuera**, no sólo qué se quiere ver |
| El bordado **tono sobre tono** hacía desaparecer el emblema en el polo navy | Hilo blanco sobre navy y navy sobre blanco. El bordado se pide como **puntada satinada con dirección visible y leve relieve** sobre el piqué | Bordado y estampado son contratos de material distintos: el estampado se apoya sobre la tela, el bordado la levanta. El tono sobre tono es una decisión de legibilidad —sólo sirve si la marca se lee por relieve—, no de estilo |

## 5. QA medido

Vista por vista, antes de entregar:

- **Color de tela:** azul royal del asset oficial. Medido entre (10, 54, 155) y (25, 76, 186) en las vistas navy, con
  Δ máximo 38 en primeros planos, donde la luz cercana lo oscurece. Tinta navy `#023c70` en las variantes clara y gris.
- **Proporción del emblema del pecho** contra el asset oficial.
- **Ortografía de la estampa** y presencia del eslogan (ver el caso de la espalda gris arriba).
- **Recorte:** revisar la variante transparente sobre fondo de contraste fuerte antes de usarla para componer.

## 6. Cómo lo usa un agente

1. **Elegir la vista por el ángulo de la toma**, no por costumbre: persona de espaldas → vista de espalda; tres cuartos
   → la vista de tres cuartos del lado que corresponda.
2. Pasar esa vista **junto con** las referencias de rostro y cuerpo de la persona. La prenda la fija esta referencia;
   la persona y la escena las fija el prompt.
3. Elegir la variante de color por el fondo y la jerarquía de la escena, igual que en el kit del logo.
4. QA sobre el resultado: emblema del pecho en su proporción, estampa legible y bien escrita, color de tela sin deriva.

## 7. Aplicar a otra prenda (polera, chaqueta, gorra)

El operador ya decidió el mismo kit para **polera** y **chaqueta**, y el **polo piqué** ya se produjo con estos pasos
(ver §8). A diferencia del hoodie, **no existe asset oficial de esas prendas**: se diseñan desde cero. Pasos:

1. **Diseñar la prenda base según marca** y aprobarla antes de generar vistas. Sin base aprobada, cada vista es un
   diseño distinto.
2. **Componer determinísticamente todo el texto y todo emblema** que la prenda lleve (la estampa de espalda del hoodie
   es el patrón). El modelo nunca escribe el texto de la prenda.
3. **Declarar las proporciones** de cada aplicación —emblema, estampa, bordado— como porcentaje de la parte de la
   prenda que las sostiene, y fijarlas antes de la primera tanda.
4. **Fijar el contrato de realismo** del material de esa prenda (una chaqueta con cierre, forro y cuello rígido no
   arruga como un algodón perchado) y usarlo en **todos** los prompts de la serie.
5. **Generar las mismas familias:** prenda sola por ángulos, detalles, puesta en cuerpo neutro sin rostro con cuerpos y
   tonos de piel distintos, y variantes de color.
6. **QA medido vista por vista** y recorte sólo donde corresponda (prenda sola y planos, no primeros planos ni vistas
   puestas).
7. **Entregar con manifiesto** que diga, por vista, qué es y **cuándo usarla**, a `13- Branding/<Prenda> Efeonce/v01/`.
   Una versión nueva va a `v02/`, sin sobrescribir `v01/`.
8. Si durante la serie cambia cualquier contrato (realismo, proporción, color), **rehacer la serie completa**.

## 8. Cápsula de vestuario Efeonce

Decisión del operador (2026-09-17), tomada al preguntarse si la polera servía como ropa corporativa. El cliente de
Efeonce es corporativo —retainer Sky, RevOps/CRM con HubSpot y Salesforce, comités, licitaciones—, así que una polera
de algodón con estampa **no** es la ropa corporativa del equipo. La cápsula reparte las prendas por contexto de uso:

| Contexto | Prenda |
|---|---|
| **Frente a cliente (prenda principal)** | Polo piqué navy `#023c70` con **emblema bordado**, espalda limpia |
| **Reunión formal, comité, licitación** | Camisa o blusa blanca + chaqueta softshell o blazer navy, emblema bordado discreto, sin estampas |
| **Evento, feria, stand** | Polera navy — la polera queda como pieza de evento, no como uniforme |
| **Producción, terreno, grabación, streaming** | Hoodie, polera royal y gorra |

**Reglas duras:** en prendas formales el emblema va **bordado** y **sin eslogan**; la estampa grande de espalda —logo
completo + «Empower your Growth»— es **lenguaje de merch**, no de ropa corporativa.

### Kit del polo piqué (entregado)

`5. Contenidos/13- Branding/Polo Efeonce/v01/` — 21 vistas + 13 transparentes + `efeonce-polo-manifiesto.json` con la
descripción y el **cuándo usar** de cada vista. Acabado principal: **navy con bordado blanco**, kit completo de 15
vistas; segunda opción: **blanco con bordado navy**, set esencial de 6. El bordado tono sobre tono se descartó porque
el logo se perdía.

Prenda base: piqué de algodón de peso medio, corte regular entallado, tapeta de tres botones tono sobre tono, cuello y
puños de punto plano, aberturas laterales, sin bolsillo ni etiqueta visible; emblema bordado de ~7 cm en el pecho
izquierdo. Registro: [`LEEME`](../../../ai-generations/2026-09-17_polo-efeonce/LEEME.md).

**Próxima prenda:** chaqueta softshell navy — cierre completo con tapeta interior, cuello alto, bolsillos con cierre
oculto, puños ajustables, **sin capucha** para que funcione sobre el polo; emblema bordado en el pecho y opcional en la
manga.
