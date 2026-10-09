# ADR — Efeonce Wave, Efeonce Reach y Efeonce Globe en la familia (H3)

- **Status:** Accepted (2026-10-09)
- **Date:** 2026-10-09
- **Owner:** Efeonce Brand
- **Scope:** cómo se presentan Wave, Reach y Globe dentro de la familia de productos de Efeonce: logotipo, lockup con
  Efeonce, isotipos y sus colores sobre papel y sobre oscuro. No cambia el nombre, la oferta ni el producto de ninguno.
- **Reversibility:** two-way. Los archivos se regeneran en minutos desde `@efeoncepro/axis-brand-assets`; los originales
  quedan versionados en `packages/brand-assets/sources/product-family/` del repo AXIS.
- **Confidence:** high en la ruta: el operador la eligió después de ver dos alternativas completas (rediseño en Poppins y
  símbolo en órbita) y de pedir cada ajuste. Medium en la versión chica de los isotipos: falta verla en un uso real.
- **Validated as of:** 2026-10-09, sesión de diseño con el operador (canvas «Efeonce Rooms — Logo», página «Wave, Reach y
  Globe»: tableros «Hoy», «H3», «La fila completa» e «Isotipos en chico y sobre oscuro»). Ajuste final del operador el
  mismo día, antes de publicar el paquete: sobre oscuro, los tres isotipos van todo en blanco.

## Contexto

Wave, Reach y Globe nacieron como marcas propias «by efeonce»: tres tipografías, tres colores, tres isotipos, con el
endoso chico abajo. Se leían como marcas distintas que Efeonce respalda. Marketing Studio, Creative Studio, Factory y Rooms
nacieron dentro de la familia: Efeonce adelante, filete y el producto en el gris de la familia con sólo la esfera en color.
El operador pidió llevar a Wave, Reach y Globe a esa dinámica: «ya no es Wave solo ni Wave by Efeonce, sino Efeonce Wave».

Se probaron tres rutas. **Ruta 1** las redibujaba con la órbita de la familia. **H1** pasaba la palabra a Poppins y dejaba
sólo el gesto de cada marca (la W, la «a» con flecha, el globo). **H2** ponía ese gesto a girar en la órbita. El operador
juzgó que H1 **perdía presencia**: la letra de cada marca es parte de su identidad, no sólo el gesto. REACH es modular,
WAVE es un bloque en mayúsculas y globe es redondo y amable; en Poppins las tres se volvían genéricas.

## Decisión

1. **H3: logotipo propio, lockup de familia.** Cada producto conserva su logotipo; la familia vive en el lockup.
   - **Efeonce adelante, con el filete y las medidas de la familia:** Efeonce de 30 de alto, 20 de aire, filete de 1 × 26 y
     20 de aire.
   - **El logotipo, en el gris de la familia** (`#6b6b6b` sobre papel, `#6f89a2` sobre oscuro), con **sólo su gesto en
     color**: así Efeonce predomina («bajar la luz» del producto, pedido del operador).
   - **Tamaño por presencia, no por altura de mayúscula.** WAVE va a 21, REACH a 20 (tiene la misma tinta que WAVE pero es
     24 % más largo) y globe a 35 (minúscula de trazo fino).
   - **Misma línea base que Efeonce.** La base plana de cada logotipo se apoya en la «n» de Efeonce (23,8 de 30): WAVE
     sube 1,65 y REACH 1,0; globe ya coincidía. El globo conserva su despegue, como en el logotipo original.
2. **Se retira el endoso «by efeonce».** `*-logo-*` pasa a ser el logotipo solo; junto a Efeonce va el lockup.
3. **Gestos y colores.**

   | Producto | Gesto | Papel | Oscuro (logotipo y lockup) |
   | --- | --- | --- | --- |
   | Wave | la W (dos V) | `#0375db` + `#091951` (los de la línea Engine; reemplazan el `#082e8e` del archivo) | `#2e8be8` + `#a6cdf5` |
   | Reach | la «a» con flecha | `#f83902` | `#f83902` |
   | Globe | el globo | `#bb1954` | `#ee4274` |

   Sobre oscuro, en el logotipo y el lockup, **Wave y Globe usan colores propios de producto**: la V oscura de Wave
   desaparecía en el navy, y el frambuesa de Globe tiene un contraste de 2,6:1 sobre navy. Globe no toma el naranja de la línea Brand (`#ff6500`), que
   sigue siendo el de Creative Studio: el globo frambuesa es el objeto, no un acento de línea.

   **Sobre oscuro, los isotipos van todo en blanco** (`isotype-negative` = `isotype-white`, también en
   `isotype-small-negative`). Decisión del operador: los tres símbolos «son lo suficientemente distintivos para funcionar
   así». El color sobre oscuro vive sólo en el logotipo y el lockup.
4. **Afinados.**
   - **Reach:** la punta de la flecha se corre hacia la izquierda para que no roce el asta: 7 unidades en el logotipo
     (pasa de 4,8 a 11,8) y 16 en el isotipo (de 15 a 31). El corte sigue la construcción de la flecha: las esquinas
     internas, prolongadas a 45°.
   - **Reach:** el archivo queda en una sola forma de un solo color; se unen las dos astillas `#ff6f00` que tapaban
     muescas del asta.
   - **Reach sobre oscuro:** en la palabra, la «a» va naranja maciza (`#f83902`), porque blanca se funde con la «e» con
     la que se superpone. El isotipo suelto, como los otros dos, va todo blanco.
   - **Globe:** se quita la mota `#ff6500` suelta del archivo original.
   - **Palabras solas:** las tres usan el navy de la familia (`#023c70`), en lugar de los tres navies de los archivos.
   - **Isotipo de Wave:** sobre papel, con los mismos colores que su W; sobre oscuro, todo blanco.
5. **Isotipos chicos (Reach y Globe, 24 px o menos).** En Reach, la ranura de la «a» se cierra y el chevrón se engrosa
   9 unidades y se corre 24. En Globe, los cuatro gajos se funden en un cuerpo paralelo al anillo (su interior erosionado
   31 unidades, el aire original). Wave no necesita versión chica.
6. **Contornos, nunca máscaras.** Todo se calcula con booleanos sobre curvas aplanadas finas, así cualquier visor dibuja
   el archivo igual. Una prueba de AXIS lo exige.

| Pieza (`wave-`, `reach-`, `globe-…`) | Dónde va |
| --- | --- |
| `lockup` | Junto a Efeonce, la composición por defecto: encabezados, decks, informes, correo |
| `logo` | El logotipo solo, a todo color: donde el producto está solo |
| `isotype` | El símbolo: los corchetes de Wave, la «a» de Reach, el globo de Globe |
| `isotype-small` | Sólo Reach y Globe, a 24 px o menos: favicon, chips |

Todas las piezas existen en `positive`, `negative` y `white`. En los isotipos (`isotype` e `isotype-small`), `negative` y
`white` son el mismo archivo: todo blanco.

## Implementación

- **Paquete:** `@efeoncepro/axis-brand-assets` **0.4.28** (repo AXIS, commits `7c96680` piezas H3 + `5346761` isotipos
  todo en blanco sobre oscuro; tag `v0.4.28` publicado). 33 archivos: 12 reemplazados (`logo` e `isotype`, positivo y
  negativo) y 21 nuevos.
- **Generador:** `packages/brand-assets/scripts/product-family.mjs`, que lee los originales desde
  `packages/brand-assets/sources/product-family/`. Para regenerar: correr el generador y después `pnpm seal`. Nunca se
  editan los SVG a mano.
- **Catálogo público del Lab:** en 0.4.28 los `logo` e `isotype` de siempre seguían públicos con sus bytes nuevos y las
  piezas nuevas quedaban sólo en el paquete (`AXIS_LOGO_EXCLUSIONS`), igual que Creative Studio y Rooms. Desde 0.4.29
  (AXIS `74bb2e7`, tag `v0.4.29`) el índice de búsqueda del Lab está fragmentado (los logos en
  `/search-index/logos.json`) y todas las marcas Efeonce son públicas: la página «Logotipos» (`/references/logos/`) y la
  búsqueda global incluyen Rooms (18), Creative Studio (24) y las piezas nuevas de Wave, Reach y Globe;
  `AXIS_LOGO_EXCLUSIONS` ya no las lista.
- **Greenhouse** todavía consume `axis-brand-assets` 0.4.25: adoptar 0.4.28 entra en
  [TASK-2014](../../tasks/to-do/TASK-2014-axis-packages-adoption-and-report-projection-retirement.md) (adopción de los paquetes AXIS publicados).

## Alternativas descartadas

- **Ruta 1 (rediseño con la órbita):** perdía todo lo reconocible de cada marca.
- **H1 (gesto propio en Poppins):** perdía presencia. Además, la «v» de Wave salía del chevrón partido del isotipo y se
  leía «Wa/e». Antes de descartarla se probaron la «v» y la W macizas del logotipo.
- **H2 (el símbolo en órbita):** el gesto quedaba chico y el chevrón de Wave flojo.
- **Isotipos de color sobre oscuro:** Wave en dos azules claros (`#2e8be8` + `#a6cdf5`), Reach con la «a» blanca y la
  punta de la flecha naranja, Globe en frambuesa (`#ee4274`); también una baldosa blanca detrás y variantes en gris. El
  operador eligió el blanco total: los tres símbolos se reconocen sin color, y el color sobre oscuro queda en el logotipo
  y el lockup.
- **Isotipo de Wave sobre oscuro en blanco + azul:** el ojo juntaba los brazos blancos en diagonal y leía una Z. Se
  probó también un color por corchete.
- **Globe en naranja Brand sobre oscuro:** el globo se volvía otro objeto.

## Consecuencias

- Las siete marcas de producto se leen como una familia: Efeonce manda en todas y cada producto se reconoce.
- Wave y Globe tienen colores propios sobre oscuro en el logotipo y el lockup, fuera de los acentos de línea. Si se suma
  otro producto con colores propios, conviene llevar estos colores a tokens de producto en `@efeoncepro/axis-tokens`, en lugar de dejarlos sólo en
  los archivos.
- Pendiente: probar la versión chica de los isotipos en un favicon real.
