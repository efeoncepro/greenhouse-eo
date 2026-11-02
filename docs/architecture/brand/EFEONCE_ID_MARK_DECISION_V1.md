# ADR — Efeonce ID: su marca

- **Status:** Accepted (2026-11-01)
- **Date:** 2026-11-01
- **Owner:** Efeonce Brand
- **Scope:** la marca visual de Efeonce ID, la cuenta con la que personas y agentes entran por Efeonce Auth
  (`auth.efeonce.org`): logo, lockup e isotipos. No decide producto, identidad, infraestructura ni la interfaz de Efeonce
  Auth más allá de dónde va la marca en la pantalla de entrada ([ADR de Efeonce Auth](../EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md),
  [login V4](../EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md)).
- **Reversibility:** two-way-but-slow. Los archivos se regeneran en minutos; una vez en la pantalla de entrada y en los
  botones de las aplicaciones, el cambio tiene inercia de marca.
- **Confidence:** high en la forma: el operador la eligió tras comparar cuatro rutas (órbita en la D, nave de Efeonce,
  huella con surcos en tres grados y en trazo fino) y aprobó la inicial pulida. Medium en distintividad: no hay prueba sin
  contexto ni búsqueda formal de marca.
- **Validated as of:** 2026-11-01, sesión de diseño con el operador (canvas «Efeonce ID — logo»).

## Contexto

Efeonce Auth necesitaba una marca para la cuenta («Efeonce ID»). El operador la pidió con golpe visual y dentro de La
órbita. La regla de la familia es «la órbita vive en la O» (AEO, SV360, Marketing Studio, Factory, Rooms); «ID» no
tiene O.

## Decisión

1. **La órbita vive en la D.** La D es **asta, tramo recto y media órbita**: el arco de las 12 a las 6 por la derecha.
   La I y el asta son Poppins Bold, pasados a contornos y con el mismo cierre (−18) que la familia.
2. **La esfera a la 1:30**, la posición de toda la familia, en el acento **Growth** (`#0e8c82` sobre papel, `#36c8bf`
   sobre oscuro): Efeonce ID es la cuenta de la marca madre y sirve a todos los productos. Corte concéntrico a la esfera
   (terminaciones de la familia, [`scripts/brand/orbit-ring.mjs`](../../../scripts/brand/orbit-ring.mjs)).
3. **Misma geometría que la familia.** Anillo de 64 unidades, esfera de 88, aire de 22. Contornos rellenos, nunca
   máscaras.
4. **Tramo recto de 110 unidades** entre el asta y el arco. Sin él, la media órbita salía directo del asta y dejaba un
   muñón entre el asta y la esfera, y la panza parecía un alambre pegado a la barra. Con él, la D es una letra y el trazo
   de arriba llega hasta la esfera. Se probaron 0, 60 y 110 con anillos de 64, 80 y 96; 80 y 96 tenían más presencia pero
   volvían a pesar.
5. **Nada más.** La silueta de la D con la esfera ya se lee como la yema de un dedo (lectura del operador): es la idea de
   identidad, sin dibujarla.

| Pieza | Archivo (`efeonce-id-*`) | Dónde va |
| --- | --- | --- |
| Lockup **Efeonce \| ID** | `lockup` | Por defecto: encabezado del formulario de entrada, correos, documentos |
| El monograma en un cuadro | `isotype` | Avatar e ícono de app; nunca junto al nombre |
| Isotipo chico (anillo 110, esfera 104, aire 30) | `isotype-small` | Sólo a 32 px o menos: el favicon (el botón usa `button-lockup`; su versión «sólo símbolo», el monograma `logo`) |
| El monograma solo | `logo` | Insumo de las anteriores |

Las cuatro piezas existen en `positive`, `negative` y `white` (12 SVG). Junto a Efeonce, «ID» va en el gris medido de la
familia (`#6b6b6b` / `#6f89a2`) y sólo la esfera conserva el acento. Las genera
[`scripts/brand/build-efeonce-id-logos.mjs`](../../../scripts/brand/build-efeonce-id-logos.mjs) (mismos píxeles que la
versión aprobada en el canvas, verificado) y se sellan en `@efeoncepro/axis-brand-assets` **0.4.31**, publicado en el
release `v0.4.31` (AXIS `5a6a597` + `5540a2c`, 2026-11-02, readback en GitHub Packages), públicas en la página
«Logotipos» del Lab. Nunca se editan a mano: regenerar es correr el generador, copiar a
`packages/brand-assets/assets/` y `apps/lab/public/branding/` de AXIS y correr `pnpm seal`.

## Dónde va la marca en la pantalla de entrada de Efeonce Auth (operador, 2026-11-01)

- **Sí:** el **favicon** (`efeonce-id-isotype-small-*`) y ciertas aplicaciones **dentro del formulario**: el lockup en el
  encabezado del formulario y el botón «Continuar con Efeonce ID» de las aplicaciones (Rooms, Studio, Greenhouse).
- **No:** el isotipo grande en el panel lateral. Ese panel es del **carrusel de novedades**, que se conserva tal cual
  ([login V4](../EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md)). La maqueta «En Efeonce Auth» del canvas, con el
  monograma grande a la izquierda, es una exploración superada en ese punto.
- **Favicon adoptado en código (2026-11-01, sin release):** `auth-server` sirve en `/favicon.svg` la teja aprobada en el
  canvas (oscuro de Efeonce, radio 22 %, isotipo chico en negativo al 71,3 % del lado), compuesta por
  [`scripts/auth-server/efeonce-id-favicon.ts`](../../../scripts/auth-server/efeonce-id-favicon.ts) desde la copia
  `public/branding/SVG/efeonce-id-isotype-small-negative.svg` (byte a byte la de AXIS 0.4.31) y regenerada con
  `pnpm auth-server:brand-assets:generate`. Reemplaza el isotipo de Efeonce en azul. Llega a `auth.efeonce.org` sólo con
  el próximo release gobernado. Cuando Greenhouse fije `axis-brand-assets` ≥ 0.4.31 (TASK-2014), esa copia entra a la
  guarda `src/config/efeonce-brand-assets.test.ts` contra el paquete.
- **Lockup del encabezado adoptado en código (2026-11-02, sin release):** las pantallas de Efeonce Auth con La órbita
  (todas salvo el login V4) llevan el lockup «Efeonce | ID» arriba del formulario, positivo sobre papel y negativo en
  modo oscuro, desde copias exactas de `axis-brand-assets` 0.4.32 (`public/branding/SVG/efeonce-id-lockup-{positive,negative}.svg`)
  regeneradas en `src/lib/auth-server/oauth/pages/orbit-assets.generated.ts` con `pnpm auth-server:brand-assets:generate`
  (drift en `orbit-shell.test.ts`). El lockup nunca va dentro de la órbita. El login V4 todavía no lo lleva. Llega a
  `auth.efeonce.org` sólo con un release gobernado. El botón «Continuar con Efeonce ID» está definido (sección
  siguiente); falta implementarlo.

## El botón «Continuar con Efeonce ID» (aprobado 2026-11-02)

El botón canónico con el que Rooms, Studio, Greenhouse y cualquier relying party entran con Efeonce ID es **«Continuar
con» + el lockup del botón** (`efeonce-id-button-lockup-{positive,negative}`, `axis-brand-assets` 0.4.32, publicado en `v0.4.32` el 2026-11-02), igual que
«Pagar con PayPal». En ese lockup «ID» va **en la tinta del texto** (blanco en el sello oscuro, navy en el botón blanco)
y no en el gris de la familia: el botón nombra la cuenta, no sólo a Efeonce. Sólo la esfera va en el acento.

- **Superficies:** sello oscuro `#001a33` con texto blanco sobre papel o blanco; botón blanco con texto navy y borde
  sobre oscuro o foto.
- **Anatomía (52 px por defecto):** píldora, «Continuar con» en Poppins 400 16 px, lockup de 20 px de alto. Grande
  56 px, compacto 40 px (sólo el lockup, con nombre accesible), ancho completo y sólo el símbolo (el monograma).
- **Los diez estados:** reposo; cursor (navy o papel, borde teal y halo teal suave, la luz de la línea); presionado;
  foco con teclado (anillo teal sólido, separado); foco + cursor; cargando (la órbita de la familia girando y
  «Conectando…»); cargando con movimiento reducido (la órbita quieta); conectado (la esfera completa la vuelta);
  error (vuelve a reposo con el aviso «No pudimos conectar. Inténtalo de nuevo.» debajo); deshabilitado.
- **Descartado, con su razón:** el monograma antes del texto (son letras: se lee «ID Continuar con Efeonce ID»); el
  monograma al final de la frase (la esfera arriba se lee como aviso y la marca queda chica); la órbita sola a la
  izquierda (a tamaño de botón parece el ícono de recargar); el isotipo en su teja (pesado); el lockup de familia con
  «ID» en gris (a 1x el nombre de la cuenta pierde fuerza).
- Anatomía exacta y estados: README de `@efeoncepro/axis-brand-assets` («The «Continuar con Efeonce ID» button»).
  Canvas de registro: «Efeonce ID — logo», lámina «Botón «Continuar con Efeonce ID» · todos los estados». Falta
  implementarlo como primitive en `axis-ui-primitives` y adoptarlo en los relying parties.

## Alternativas descartadas

- **La nave de Efeonce como ID** (el isotipo oficial + «ID» en Poppins Bold Italic): confiable, pero el operador la
  descartó: «la nave no funciona».
- **La huella**: surcos concéntricos dentro de la panza (órbitas interiores en una órbita vacía), en tres grados, con
  remates redondos y en trazo fino. Tenía más significado, pero el operador la encontró «muy pesada y no tan limpia para el
  logo e incluso para nuestra línea gráfica». En trazo fino sumaba un tercer grosor y bajo 48 px desaparecía.
- **La I dentro de una órbita**: se lee como el ícono de información (ⓘ) y, de reojo, como un botón de encendido.
- **La esfera como punto de la i** («id» en minúscula): sin órbita, y choca con Insights, cuya marca vive en la i.

## Consecuencias

- Efeonce ID entra a la familia con el mismo patrón que Rooms: archivo cerrado en AXIS, generador en Greenhouse.
- Riesgo abierto: a 16 px la panza se reduce a una curva fina; el isotipo chico lo mitiga, pero no hay prueba sin contexto.
- Pendiente: el release de la adopción en `auth-server` (favicon y lockup ya en código, en `develop`), el lockup en el
  login V4 y los botones de las aplicaciones; Greenhouse fija `axis-brand-assets` 0.4.25 (adopción de versiones nuevas:
  TASK-2014), por eso las copias de 0.4.31/0.4.32 viven en `public/branding/SVG/`.

## Referencias

- Generador: [`scripts/brand/build-efeonce-id-logos.mjs`](../../../scripts/brand/build-efeonce-id-logos.mjs).
- Criterio y aplicaciones: skill `efeonce-graphic-line` (`references/criteria.md`, `references/ledger.md`,
  `references/sources-and-assets.md`); skill `efeonce-auth`.
- Exploración: `ai-generations/2026-11-01_efeonce-id-logo/` (rutas, huella, pulido; no es canon).
