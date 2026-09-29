# Efeonce — módulos de correo (V1): dirección visual aprobada

## Modo y fuente

- Modo: `source-led`
- Fuente durable: el correo de entrega de Efeonce Insights, exportado del canvas aprobado el 2026-09-29.
  - [`insights-enlace-escritorio.png`](./EFEONCE_EMAIL_MODULES_V1/insights-enlace-escritorio.png): enlace compartido,
    escritorio, **680×2750** a tamaño nativo (`Main.dc.html`).
  - [`insights-enlace-movil.png`](./EFEONCE_EMAIL_MODULES_V1/insights-enlace-movil.png): enlace compartido, celular,
    **390×2900** (`Movil.dc.html`).
  - [`insights-pdf-adjunto.png`](./EFEONCE_EMAIL_MODULES_V1/insights-pdf-adjunto.png): PDF adjunto, escritorio,
    **680×2400** (`Adjunto.dc.html`).
  - [`fuente-canvas-2026-09-29.tar.gz`](./EFEONCE_EMAIL_MODULES_V1/fuente-canvas-2026-09-29.tar.gz): las tres fuentes
    `.dc.html` con los valores exactos, los tres assets que usan y el renderer que regenera los PNG.
    - `project/` guarda `Main.dc.html`, `Movil.dc.html` y `Adjunto.dc.html`.
    - `assets/` guarda `insights-lockup-negative.svg`, `efeonce-logo-negative-inline.svg` y
      `url-bubble-baked-dark.svg`. Los tres salen de `@efeoncepro/axis-brand-assets`.
    - `render-correo.mjs` es una copia de `render3.mjs` con el lockup de Insights mapeado. Regenera los tres PNG con
      Playwright a DSF 1; el re-render desde el paquete extraído dio un PNG idéntico byte a byte.

    Va empaquetado para que el escaneo de Tailwind no lea el marcado.
- Procedencia y aprobación: canvas «Correo de Efeonce Insights», página «Correo», artifact privado del operador:
  <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd> (versión 21).
  - El operador lo aprobó el 2026-09-29: «Quedó aprobadísimo este mail, canonízalo».
  - El canvas es la fuente editable; los PNG son la copia durable y la referencia de fidelidad.
  - El canvas declara como sistema de diseño «Efeonce — La órbita».
- Cifras, nombres y fechas son de ejemplo: «Marca de ejemplo», «María», agosto de 2026, 62,0 %, 16,5 % y 5,9 %.
- **Alcance de la aprobación.** Éste es **el correo de Insights**, no la plantilla única de correo de Efeonce.
  - Otros correos pueden partir de una base parecida, pero no quedan atados a su cuerpo.
  - Lo que se canoniza de forma definitiva son **los módulos**: el pie, los módulos de CTA y el bloque de marca.
  - En el bloque de marca, la palabra del eslogan cambia según la línea de servicio.

## Qué es canónico: los módulos

Los valores de esta sección se leyeron de `Main.dc.html` (escritorio) y `Movil.dc.html` (celular). `Adjunto.dc.html`
repite el pie de escritorio sin cambios.

### Pie (`footer`): anatomía en orden

El pie es una banda de ancho completo, con fondo `#001a33` (el `darkBg` de la línea Growth), sin gap propio entre
bloques; cada bloque trae su espaciado.

- Escritorio: padding `48px 48px 40px`.
- Celular: padding `40px 24px 36px`. La banda crece hasta el final del lienzo (`flex-grow: 1`).

Sus bloques, en este orden:

1. **Tarjeta de agenda** (`cta-agenda`, ver más abajo).
2. **Bloque de marca** (`brand-block`, ver más abajo).
   - Escritorio: padding `40px 0 30px`.
   - Celular: padding `32px 0 26px`.
3. **Burbuja URL + redes sociales.**
   - La burbuja es `url-bubble-baked-dark` y enlaza a `https://efeoncepro.com`, con `aria-label` y `alt`
     «efeoncepro.com».
     - Escritorio: 163×32.
     - Celular: 142×28.
   - Hay cuatro redes, en este orden: LinkedIn, Instagram, YouTube y Threads.
     - Cada una va en un círculo de 40×40 con borde de 1 px `rgba(207, 228, 250, 0.22)`.
     - El ícono es de trazo, de 20×20, trazo `#ffffff` de 1,75 y opacidad 0,78.
     - Cada enlace lleva `aria-label` con el nombre de la red.
     - Las URL son las de `EFEONCE_SOCIAL_LINKS`: `linkedin.com/company/efeoncecl`, `instagram.com/efeoncepro`,
       `youtube.com/@efeoncepro` y `threads.com/efeoncepro`.
     - El orden del canvas no es el del arreglo del SSOT (YouTube, Instagram, LinkedIn y Threads). El orden aprobado es
       el del canvas.
   - Escritorio: una fila centrada con gap 12 y un separador de 16 px entre la burbuja y las redes.
   - Celular: dos filas con gap 14, la burbuja arriba y las redes abajo con gap 10.
4. **Filete.** Una línea de 1 px `rgba(207, 228, 250, 0.16)`.
   - Margen en escritorio: `32px 0 24px`.
   - Margen en celular: `28px 0 22px`.
5. **Bloque legal.**
   - Estilo: centrado, 11 px, interlineado 1,7, tracking 0,01em, color `#9fb3c8` y gap 2 entre líneas.
   - Primera línea: **«Efeonce Group SpA»** en peso 600 y color `#cfe4fa`, seguido de « · RUT 77.357.182-1».
   - Segunda línea: la dirección, «Dr. Manuel Barros Borgoño 71, of. 1105, Providencia, Chile».
   - Tercera línea:
     - teléfonos «+56 9 3732 3064» (`tel:+56937323064`) y «+1 (239) 235-2073» (`tel:+12392352073`);
     - correo «sales@efeoncepro.com» (`mailto:`), sin subrayado y en color heredado.
   - Fuente de los valores: `src/config/efeonce-brand.ts`.
     - Razón social: `EFEONCE_LEGAL_NAME_FALLBACK`.
     - RUT: `EFEONCE_TAX_ID_FALLBACK`.
     - Dirección: `EFEONCE_CONTACT.addressDisplay`, no `EFEONCE_LEGAL_ADDRESS_FALLBACK`, que usa otro formato.
     - Teléfonos: `EFEONCE_CONTACT.phones`.
     - Correo: `EFEONCE_CONTACT.email`.
     - En runtime, razón social, RUT y domicilio se prefieren desde `getOperatingEntityIdentity()`.
6. **Filete.** Igual al anterior.
   - Margen en escritorio: `24px 0 20px`.
   - Margen en celular: `22px 0 18px`.
7. **Preferencias y baja.**
   - Son dos enlaces, «Preferencias de correo» y «Dejar de recibir estos informes».
   - Estilo: 11 px, interlineado 1,6, tracking 0,01em, color `#cfe4fa`, subrayados con offset de 3 px.
   - Van en una fila que se parte con gap `4px 16px`.
8. **Motivo y ©.**
   - Texto: «Recibes este correo porque tu organización trabaja con Efeonce.» y, debajo, «© 2026 Efeonce Group SpA.
     Todos los derechos reservados.».
   - Estilo: 10 px, interlineado 1,7 y color `#9fb3c8`.
   - Hay un gap de 10 entre preferencias y motivo.

Contraste medido sobre `#001a33`:

| Tinta | Uso | Contraste |
|---|---|---|
| `#9fb3c8` | legal y motivo | 8,16:1 |
| `#cfe4fa` | razón social y enlaces | 13,49:1 |
| `#e2e2e2` | «Empower your» | 13,56:1 |

### `cta-primary`

El botón principal del cuerpo. Es una píldora sólida:

- fondo `#001a33`, texto `#ffffff`, `border-radius: 999px`;
- Poppins 600, centrado y sin subrayado;
- ocupa el ancho completo de la columna.

| | Escritorio | Celular |
|---|---|---|
| Padding | `20px 28px` | `18px 20px` |
| Cuerpo | 17 px | 16 px |
| Padding del módulo | `36px 48px 8px` | `30px 24px 4px` |
| Gap al subtítulo | 14 | 12 |

- El texto lleva la flecha al final, separada por dos espacios: «Ver el informe completo  →».
- El subtítulo es de 13 px, interlineado 1,5, color `#6d6777` y centrado. Su contraste sobre blanco es de 5,45:1.
  - Escritorio: «3 capítulos · 17 figuras con su tabla · plan de 5 acciones · listo para presentar».
  - Celular: la versión corta, «3 capítulos · 17 figuras · plan de 5 acciones».
- El texto del botón y del subtítulo es de la aplicación. El módulo es la píldora oscura a todo el ancho con un
  subtítulo de alcance debajo.

### `cta-agenda`

Es la tarjeta que abre el pie y el único CTA comercial del correo.

- Fondo `#023c70`, radio 16.
- Título «¿Lo revisamos juntos?»: Bricolage Grotesque 700, 22 px, interlineado 1,15, tracking −0,02em, `#ffffff`.
- Texto: «Elige un horario y te mostramos qué mover primero, con los datos de este informe.». Va en 13 px, interlineado
  1,55 y `#cfe4fa`, con contraste de 8,57:1 sobre `#023c70`.
- Botón «**Agendar una reunión**»:
  - píldora `#ffffff` con texto `#001a33`;
  - 14 px, Poppins 600, radio 999;
  - contraste del texto: 17,56:1.
- Destino: la agenda en `https://efeoncepro.com/contacto/` con UTM. En este correo son
  `utm_source=efeonce-insights`, `utm_medium=email`, `utm_campaign=insights-report` y `utm_content=pie`.
  - **Nunca** va a un `mailto:`.
  - `utm_source` y `utm_campaign` cambian con cada correo.

| | Escritorio | Celular |
|---|---|---|
| Disposición | dos columnas (`1fr auto`), gap 24, centradas verticalmente | una columna, gap 14 |
| Padding de la tarjeta | `24px 28px` | `22px 20px` |
| Botón | ancho de su texto, `13px 22px`, `nowrap` | ancho completo, `13px 18px`, centrado |

### Bloque de marca (`brand-block`)

- El logo Efeonce en negativo tiene 220 px de ancho: 220×52 en el `img`.
- Debajo va el eslogan «Empower your <Línea>», centrado.
  - Su ancho es el **64 % del logo**.
  - Está separado del logo por **1,35 veces su cuerpo**.
  - La regla es `sloganLockupLayout` de AXIS: `sloganOfLogo 0.64` y `sloganGapOfFont 1.35`.
- Tramos del eslogan:
  - «Empower» en Poppins 800 itálica;
  - «your» en Poppins 800;
  - la palabra de línea en Poppins 900 itálica.
- Colores sobre oscuro:
  - «Empower your» en `#e2e2e2`, el `leadColor.onDark` de AXIS;
  - la palabra en `#ffffff`, la tinta de la superficie.
  - AXIS pone la palabra en el acento sólo si el cuerpo llega a 24 px. En el correo el cuerpo ronda los 12 px, así que
    va en tinta.
- Estilo: `letter-spacing: 0`, `line-height: 1`, sin partir y con `aria-label` igual al eslogan completo.
- El canvas ejerce Growth: 12,15 px de cuerpo y 16,4 px de separación.

**La palabra cambia con la línea de servicio.** El cuerpo sale de `ancho del logo × 0,64 ÷ widthEmByWord[palabra]`.
Las filas distintas de Growth están **calculadas** con la regla de AXIS; el canvas no las dibuja.

| Línea de servicio (`efeonceGraphicLine.serviceLines`) | Eslogan | `widthEmByWord` | Cuerpo | Separación |
|---|---|---|---|---|
| Growth Strategy & Measurement (marca madre) | Empower your **Growth** | 11,586 | 12,15 px | 16,41 px |
| Creative Services | Empower your **Brand** | 10,903 | 12,91 px | 17,43 px |
| Digital Services & Engineering | Empower your **Engine** | 11,263 | 12,50 px | 16,88 px |
| Media & Distribution | Empower your **Voice** | 10,641 | 13,23 px | 17,86 px |
| RevOps & CRM (HubSpot o Salesforce) | Empower your **Revenue** | 12,278 | 11,47 px | 15,48 px |

- El correo de Insights firma **Growth**. Su fondo `#001a33` y su acento `#36c8bf` son los de esa línea.
- El operador aprobó que cambie la palabra.
- Esta dirección **no** fijaba si el fondo del pie y los acentos también siguen la línea (`darkBg` `#091951` en las
  demás). **Resuelto en AXIS `v0.3.38`:** el pie queda en `#001a33` (`efeonceGraphicLine.color.dark`) en toda línea; sólo
  cambia la palabra del eslogan.

### Escritorio y celular

| Rasgo | Escritorio (680) | Celular (390) |
|---|---|---|
| Lienzo | fondo `#e9ecef`, padding `24px 40px 48px`; la tarjeta del correo mide **600 px**, radio 20, `overflow: hidden` | a sangre, fondo `#ffffff`, sin radio |
| Fila de bandeja | tarjeta blanca de simulación (remitente, hora, asunto y preheader); no es parte del correo | no aparece |
| Gutter lateral del contenido | 48 px | 24 px |
| Tarjeta de agenda | dos columnas | apilada, botón a todo el ancho |
| Burbuja + redes | una fila | dos filas |
| Bloque legal, preferencias y motivo | idénticos | idénticos |

El resto de las diferencias (cabecera, cifras y aviso) son de la aplicación y se listan abajo.

## Qué es sólo aplicación: el cuerpo de Insights

Esto describe el correo de Insights tal como se aprobó. Otros correos pueden reutilizar la estructura, pero **no quedan
atados** a ella.

- **Asunto y preheader:**
  - Enlace: «Agosto: más clics y más oportunidades. Tu informe está listo», con el preheader «La brecha ahora está en
    convertir. Lo esencial del mes, la decisión y el plan, en un enlace.».
  - Adjunto: «Tu informe de agosto, en PDF».
- **Cabecera** sobre `#001a33`.

  | | Escritorio | Celular |
  |---|---|---|
  | Padding | `44px 48px 52px` | `32px 24px 40px` |
  | Gap | 44 | 34 |
  | Lockup | 208 px | 170 px |
  | Píldora del mes | 12 px | 11 px |
  | H1 | 52 px, interlineado 0,98 | 38 px, interlineado 1 |

  - Arriba va el lockup **Efeonce | Insights** negativo, a la izquierda, y a la derecha la píldora del mes: borde
    `rgba(207, 228, 250, 0.28)` y texto `#cfe4fa`.
  - El eyebrow es «Informe mensual · <organización>», en mayúsculas, tracking 0,1em y `#cfe4fa`.
  - El H1 va en Bricolage 760 `#ffffff`, con tracking −0,035em.
  - La bajada «La brecha ahora está en convertir.» va en Bricolage 320 `#cfe4fa`, como bloque.
  - Metadatos:
    - escritorio: 13 px con período, corte y edición;
    - celular: 12 px, sin edición;
    - adjunto: sin fila.
- **Saludo:** «Hola María:» en 17 px `#001a33`. El párrafo va en 16 px, interlineado 1,65 y `#3d4a5c` (9,00:1).
- **Nota del responsable de cuenta**, opcional (`nota`):
  - va tras un filete `#e3e7ec`;
  - la cita va en Bricolage 500, 22 px en escritorio y 21 px en celular;
  - la firma va en 13 px `#6d6777`: «Julio Reyes · Managing Director & GTM, responsable de tu cuenta».
  - No aparece en el adjunto.
- **«Lo esencial del mes»**, opcional (`avance`), sobre `#001a33`:
  - El título va en Bricolage 700, de 30 px en escritorio y 28 px en celular.
  - El contador «3 de 6 hallazgos» sólo aparece en escritorio.
  - La órbita de medida: 62,0 % en Bricolage 760, de 54 px en escritorio y 52 px en celular.
  - Dos cifras en el acento `#36c8bf`: 16,5 % y 5,9 %, de 44 px en escritorio y 42 px en celular. Cada una lleva
    descripción de 14 px en blanco y fuente de 12 px en `#cfe4fa`.
  - Disposición: en escritorio, grilla `244px | 1fr` con gap 32; en celular, todo apilado con filetes.
- **«Para decidir en la reunión»**: tarjeta `#023c70` de radio 18.
  - El título va en Bricolage 720, de 34 px en escritorio y 30 px en celular.
  - El texto va en 15 px `#cfe4fa`.
  - No aparece en el adjunto.
- **Aviso del enlace**: tarjeta `#f4f6f8` de radio 14.
  - Texto: «Tu enlace es personal y vence el 30 de octubre.», con la regla de pedir un enlace por persona y la
    dirección de respaldo `https://think.efeoncepro.com/insights/r/[enlace]` en `#023c70` (10,29:1).
  - En escritorio lleva un ícono de reloj de 20 px; en celular no lleva ícono.
- **Variante PDF adjunto:**
  - No lleva cabecera con metadatos, nota, tarjeta de decisión ni `cta-primary`: un adjunto no se abre desde un botón.
  - Lleva una grilla de adjuntos de dos columnas con gap 16. Cada tarjeta es `#f4f6f8` de radio 16, con un marco
    `#e3e8ee` de 150 px y una miniatura `#001a33` que lleva el lockup de Insights.
    - «Informe completo — PDF · A4 · 16 páginas · [tamaño]».
    - «Presentación — PDF · 16:9 · 15 láminas · [tamaño]».
  - En lugar del aviso del enlace, lleva uno de documento: «Estos archivos quedan en tu correo. A diferencia de un
    enlace, un adjunto no se puede retirar después de enviado…».
  - El pie es el mismo.

## Retirado: `Suscribirme`

- El CTA «Suscribirme» queda **retirado** de los módulos de correo.
- En su lugar va «**Agendar una reunión**», que lleva a la agenda en `efeoncepro.com/contacto/` con UTM y nunca a un
  correo.
- Hoy no queda ningún «Suscribirme» en `src/emails/**` ni en `src/lib/email/**`.
  - La única aparición en `src/` es `src/growth-forms-renderer/copy.ts` (`subscribe: 'Suscribirme'`). Es el botón de un
    formulario de captura de Growth, una superficie distinta que esta dirección no toca.

## Reglas para la implementación en clientes de correo

- **Maquetación con tablas.**
  - El `flex` y el `grid` del canvas son notación de diseño.
  - La implementación usa tablas `role="presentation"` con un contenedor de 600 px.
  - Las dos columnas (tarjeta de agenda y «Lo esencial») se apilan en celular. Usan columnas híbridas, `inline-block`
    con `max-width`, para que se apilen aun sin media queries, porque Gmail con cuentas no Google las ignora.
- **PNG @2x** para lo que depende de fuentes o de SVG. SVG y webfonts no son confiables en Gmail ni en Outlook para
  Windows.
  - **Bloque de marca:**
    - logo 220×52, servido a 440×104;
    - eslogan como PNG por palabra de línea, con su ancho del 64 %.
    - `efeonce-brand.ts` dice que el eslogan **nunca se fusiona** con el logo en un único asset. Por eso son dos
      imágenes apiladas en celdas con la separación de 1,35× y no un PNG compuesto, salvo que el contrato de AXIS
      publique otra cosa.
  - **Redes:** círculo, borde e ícono horneados en un PNG de 80×80 por red, con `alt` igual al nombre. Así el borde
    translúcido no depende del cliente.
  - **Burbuja URL:** 326×64, `alt` «efeoncepro.com».
  - **Lockup de Insights:** 416×48.
  - Los PNG van con **fondo sólido `#001a33`**, no transparentes. Si un cliente altera los colores, el blanco nunca cae
    sobre claro.
  - Se sirven desde un origen público estable, como el patrón del bucket de medios que ya usa `EFEONCE_LOGO_URL`.
- **Texto vivo** para lo que se lee o se pulsa:
  - bloque legal, preferencias y baja, motivo y ©;
  - títulos, cifras y textos de CTA.
  - Pila de fuentes: `'Bricolage Grotesque', Poppins, Arial, sans-serif` y `Poppins, Arial, sans-serif`. Hay que
    verificar el corte de línea con la fuente de reserva.
- **Botones a prueba de clientes.**
  - Son un enlace dentro de una celda con `bgcolor`, con padding en el `a` y `mso-padding-alt`.
  - En Outlook para Windows, la píldora (radio 999) necesita `v:roundrect` con `arcsize="50%"`. Sin eso queda
    cuadrada, lo que es aceptable como degradación.
  - El texto del botón nunca va en imagen.
- **Colores translúcidos precompuestos a HEX**, porque Outlook para Windows ignora `rgba`:

  | Color translúcido | Sobre | HEX |
  |---|---|---|
  | filetes, 0,16 | `#001a33` | `#213a53` |
  | borde de redes, 0,22 | `#001a33` | `#2e465f` |
  | borde de la píldora del mes, 0,28 | `#001a33` | `#3a536b` |
  | ícono al 0,78 | `#001a33` | `#c7cdd2` |

  Los filetes van como celdas de 1 px con `bgcolor`, `font-size: 0` y `line-height: 0`.
- **Seguridad en modo oscuro.**
  - Cada banda oscura declara el fondo dos veces: `bgcolor` en la celda y `background-color` en CSS.
  - Se mantiene `color-scheme: light` y `supported-color-schemes: light`, como hoy en `EmailLayout`.
  - Se prueba la inversión parcial de Gmail para iOS y Android y de Outlook.com, que usa `[data-ogsc]`.
  - Nada crítico debe depender de que el blanco del cuerpo se conserve.
- **Imágenes bloqueadas.** Todo `img` lleva `alt` útil y dimensiones.
  - La burbuja degrada a «efeoncepro.com».
  - Las redes degradan a su nombre.
  - El logo degrada a «Efeonce».
- **Enlaces.**
  - El enlace personal con token no pasa por tracking de clics, como ya fija TASK-1848.
  - La agenda sí lleva UTM.
  - Si el tipo tiene baja, además del enlace va la cabecera `List-Unsubscribe`.

## La órbita de medida: el recorrido

La órbita de «Lo esencial» es de la aplicación (Insights), y su geometría quedó fijada por el operador el 2026-09-29.
**El recorrido, en cambio, pasó a ser canon de toda órbita que mide** («aplícalo en todas», operador, 2026-09-29): vive
en `efeonceGraphicLine.trajectory.measure.travelledPath` (opacidad 0,6; 0,75 × el trazo de la estela; anillo completo al
100 %, nada en 0 %) y en el contrato `efeonce.graphic-line-orbit` `0.5.0`, y en AXIS ya lo dibuja la receta de la portada del AI Visibility
Report (TASK-1938). Ver el manual de La órbita, §1.3.

- `viewBox` 260 dibujado a 240 px. Centro (130, 130), radio 110.
- **Anillo:** `#cfe4fa` a opacidad 0,16, de 2 px.
- **Marca de partida a las 12:** de (130, 13) a (130, 27), `#cfe4fa` a opacidad 0,5, de 2 px y extremo redondo.
- **Recorrido (nuevo):** el arco desde las 12 hasta la esfera, en sentido horario, dibuja el camino recorrido.
  - Va en el acento `#36c8bf` a **opacidad 0,6** y **3 px**, con extremo redondo.
  - Queda **debajo** de la estela y de la esfera.
  - En el canvas: `M 130 20 A 110 110 0 1 1 54.70 210.19`. El arco es largo porque 62 % supera el 50 %.
- **Estela:** 50° detrás de la esfera, en el acento a opacidad plena y **4 px**. En el canvas va de (143.02, 239.23) a
  la esfera.
- **Esfera:** en `valor × 3,6°` desde las 12. Para 62,0 % son 223,2°, es decir (54.70, 210.19).
  - Tiene radio 8 y va en el acento `#36c8bf`.
  - Su halo es radial de radio 24, `#72ded8` desde 0,55 hasta 0.
- **Orden de pintura:** anillo → marca → recorrido → estela → halo → esfera.
- La cifra y su leyenda van al centro: «62,0 %» y «de las respuestas de IA nombran la marca».
- El dato sigue siendo **la posición de la esfera**. El recorrido es una traza tenue y no convierte la órbita en un
  medidor que se llena: la estela y la esfera dominan.
- **En correo:** el SVG no es confiable.
  - Se recomienda hornear la órbita como PNG @2x (480×480) por edición, con fondo `#001a33`.
  - El `alt` debe llevar la cifra y su leyenda completas.
  - Si la cifra tiene que ser texto vivo, se usa la imagen como fondo, con VML en Outlook. Es una recomendación, no
    una decisión del operador.

## Canon en AXIS (publicado el 2026-09-29)

AXIS publicó esta dirección el 2026-09-29 en el tag `v0.3.38` (`main` `c92160b`, registro verificado). Desde ahí **los
valores de este documento se leen de AXIS**; este documento y sus PNG quedan como referencia de fidelidad visual. Si AXIS
y este documento difieren, manda AXIS y se corrige aquí.

| Paquete | Versión | Qué trae para los módulos |
|---|---|---|
| `@efeoncepro/axis-tokens` | `0.3.38` | export nuevo `efeonceEmail` (anchos, paleta, tipografía, `modules.ctaPrimary`, `modules.ctaAgenda`, `modules.footer`, `brandBlock`, `institutional`, `retired: ['cta-subscribe']`, `applications`, `emailSafe`, `assets`) y `efeonceGraphicLine.trajectory.measure.travelledPath` (el recorrido de la medida) |
| `@efeoncepro/axis-ui-contracts` | `0.3.38` | contrato nuevo `efeonce.email-modules` `0.1.0` (`candidate`): `resolveEmailModulesIntent` → manifiesto `axis.email-modules-composition.v1`, 23 códigos de issue y 6 checks del adapter; `efeonce.graphic-line-orbit` pasa de `0.4.0` a `0.5.0` (toda medida resuelve su recorrido) |
| `@efeoncepro/axis-graphic-line` | `0.13.0` | el pintor y la portada del AI Visibility Report dibujan el recorrido |
| `@efeoncepro/axis-brand-assets` | `0.4.6` | doce PNG @2x para correo con sello SHA-256 (`EMAIL_ASSET_SEALS`): `email-logo-negative`, `email-slogan-{growth,brand,engine,voice,revenue-hubspot,revenue-salesforce}-negative`, `email-social-{linkedin,instagram,youtube,threads}-white` y `url-bubble-baked-dark-email`; órbitas estáticas re-selladas |
| `@efeoncepro/axis-ui-registry` | `0.3.3` | registro al día |

- **Lab:** <https://axis.efeonce.org/references/email/> (y `.json`). Muestra los módulos y el correo de Insights como
  aplicación, no como plantilla.
- **Docs en el repo `axis-design-system`:** ADR `docs/architecture/EMAIL_MODULES_DECISION_V1.md` y guía
  `docs/agent-composition/email-modules.md`; en AXIS, `pnpm email:resolve` resuelve un intent y `pnpm email:assets`
  regenera los PNG.
- **Lo que AXIS resolvió de lo que esta dirección dejaba abierto:**
  - El fondo del pie es `efeonceGraphicLine.color.dark` (`#001a33`) para **toda** línea; lo que cambia con la línea es la
    palabra del eslogan (su PNG).
  - El logo y el eslogan son **dos** PNG (`email-logo-negative` y `email-slogan-{line}-negative`), apilados con el aire
    `gapBelowLogoImagePx` del sello, como recomendaba esta dirección.
  - Revenue tiene dos PNG, uno por práctica (HubSpot y Salesforce), con la misma palabra.
- **Diferencias conocidas con esta dirección** (registradas en el ADR de AXIS; ninguna cambia un valor resuelto):
  - Los PNG de AXIS son RGBA con **fondo transparente**, no con fondo sólido `#001a33` como se recomendaba arriba: el
    adapter declara el fondo oscuro en cada celda (`emailSafe.darkMode: 'ground-declared-on-cell'`).
  - El manifiesto lleva los filetes en `rgba`; el adapter los precompone a HEX para Outlook (la tabla de arriba sigue
    valiendo). El borde de las redes va horneado en su PNG.
  - El tamaño de cada `<img>` sale del sello del asset, no del ancho calculado del eslogan (140,8 vs 141 px).
  - El texto de la baja en AXIS es «Dejar de recibir estos correos»; el canvas decía «…estos informes». El contrato
    acepta `unsubscribeLabel`; Insights usa «Dejar de recibir estos informes» (operador, 2026-09-29).
- **Lo que el contrato `0.1.0` exige:** la agenda va en **todo** pie (`cta-agenda-required`) y el pie siempre lleva
  preferencias, baja y motivo. **Superado por la `0.2.0`** (publicado en `v0.3.39`, commit `1c18a2e`): el pie depende del `purpose` y de
  una `application` con excepción registrada (ver «Greenhouse hoy»). Un adapter nunca quita módulos por su cuenta (ADR
  de AXIS §7).
- **Adopción en Greenhouse:** [TASK-1944](../../tasks/to-do/TASK-1944-efeonce-email-modules-adoption.md). Greenhouse
  todavía **no** fija este juego: `develop` fija `axis-tokens` y `axis-ui-contracts` `0.3.37`, `axis-graphic-line`
  `0.11.0`, `axis-brand-assets` `0.4.5` y `axis-ui-registry` `0.3.1` (`package.json`, 2026-09-29).

## Greenhouse hoy

Se relevó el runtime el 2026-09-29 sin cambiarlo. **Ningún correo usa todavía estos módulos.**

- **`src/emails/InsightsEditionDeliveryEmail.tsx`** es el correo de Insights de TASK-1848.
  - Es funcional y sobrio, con tres modalidades: `portal_link`, `share_link` y `attachment`.
  - Lleva un H1 «Tu informe está listo», saludo, intro, nota opcional con barra lateral, `EmailButton`, aviso de
    vencimiento o de adjunto y URL de respaldo.
  - No tiene cabecera Insights, «Lo esencial», órbita, tarjeta de decisión, agenda ni pie nuevo.
  - Su comentario deja la presentación final a TASK-1849.
- **`src/emails/components/EmailLayout.tsx`** es el layout compartido.
  - Con `brand='efeonce'` cambia sólo el logo de la cabecera y el tagline del pie a `EFEONCE_SLOGAN_TEXT`.
  - Su cabecera es un degradado `#022a4e` → `#0375db` con logo centrado.
  - El cuerpo va en una tarjeta de 560 px.
  - El pie es claro: tagline en texto plano, un disclaimer automático y la baja opcional.
  - No tiene razón social, RUT, dirección, redes ni agenda.
  - Usa DM Sans y Poppins y declara `color-scheme: light`.
- **`src/emails/components/EmailButton.tsx`**: botón `#0375db` de radio 8. No es la píldora `cta-primary`.
- **`src/emails/constants.ts`**:
  - `EMAIL_COLORS` es la paleta Greenhouse y no la de La órbita;
  - `EMAIL_FONTS`;
  - `EFEONCE_LOGO_URL` sirve el wordmark PNG blanco de 520×122 desde el bucket público de medios, en `emails/`.
- **`src/config/efeonce-brand.ts`** es el SSOT de los valores del pie: legales, `EFEONCE_CONTACT` y
  `EFEONCE_SOCIAL_LINKS`. Ya existe y no hay que duplicarlo.
- **`src/lib/email/types.ts`**:
  - `insights_edition_delivery` e `insights_edition_delivery_attachment` están en `AGENCY_BRANDED_EMAIL_TYPES`;
  - su prioridad de entrega es `transactional`.
- **`src/lib/email/templates.ts`** registra el preview del correo de Insights.
- **`src/lib/efeonce-insights/delivery/dispatch.ts`** despacha las dos modalidades.
- **`src/emails/__snapshots__/EmailTemplateBaseline.test.tsx.snap`**: la línea base de HTML cambiará con cualquier
  adopción.
- **TASK-1764** gobierna los perfiles de pie por `EmailType`. Está en `to-do` y bloqueada por TASK-1774.
  - Su ADR es `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md` (`Proposed`).
  - Su mockup está en `/admin/emails/footer-profiles/mockup`.
  - Sus PNG están en `public/branding/email/footer/`: wordmark gris y cuatro isotipos sólidos, para un pie **claro**.
- **Qué tendría que adoptar los módulos:**
  - el correo de Insights (dos `EmailType`), dentro de TASK-1849, que ya declara la presentación del correo;
  - un pie y un bloque de marca Efeonce oscuros como piezas componibles, **sin** cambiar el default de `EmailLayout`,
    que es un anti-patrón de TASK-1764;
  - `cta-primary` como variante nueva y no como reemplazo de `EmailButton`;
  - `cta-agenda`, sólo donde el perfil lo permita;
  - la fijación del juego de AXIS `v0.3.38` (publicado el 2026-09-29).
- Todo eso lo lleva [TASK-1944](../../tasks/to-do/TASK-1944-efeonce-email-modules-adoption.md).

**Tensión con TASK-1764 (resuelta para Insights el 2026-09-29, ver abajo).** El pie aprobado mete en un correo de
servicio al cliente tres elementos:

- un CTA comercial, «Agendar una reunión»;
- redes sociales;
- baja.

Su política clasifica hoy esos tres elementos como exclusivos de `optional_subscription` y `commercial_marketing`,
prohíbe la promoción en transaccionales y pide `legalIdentityMode='full'` (con países y privacidad) para suscripción y
marketing. Además, sus redes son isotipos sólidos grises sobre claro, no círculos de trazo sobre oscuro.

**Decisión del operador (2026-09-29).** El correo de Insights va a clientes: es un correo de servicio al cliente,
propósito `relationship_transactional`. Como **excepción explícita** (`efeonce-insights-delivery`) conserva el pie
aprobado completo: agenda «Agendar una reunión», redes, y preferencias y baja con el texto del canvas, «Dejar de recibir
estos informes». El operador la eligió frente a dejar sólo el botón.

- **Los demás correos siguen la política:** sin agenda, redes ni baja en transaccionales y de servicio; baja
  obligatoria en suscripción y marketing; redes opcionales en suscripción y obligatorias en marketing.
- Las excepciones son explícitas y por tipo, con aprobador, fecha y motivo (Delta 2026-09-29 de la ADR de
  presentación y de TASK-1764).
- AXIS lo expresa en `efeonce.email-modules` `0.2.0`, publicado en `v0.3.39` (commit `1c18a2e`): el intent pide `purpose` y
  `application`, se retira `cta-agenda-required` y un pie con agenda, redes o baja fuera de su propósito es inválido
  salvo por una excepción registrada. Implementación: [TASK-1944](../../tasks/to-do/TASK-1944-efeonce-email-modules-adoption.md).

## Decisiones que fija

1. **Módulos, no plantilla.** Se canonizan el pie, `cta-primary`, `cta-agenda` y el bloque de marca. El cuerpo de
   Insights es una aplicación.
2. **La palabra del eslogan sigue la línea de servicio:** Growth, Brand, Engine, Voice o Revenue. Se dimensiona con la
   regla del 64 % y 1,35× de AXIS.
3. **«Agendar una reunión» reemplaza a «Suscribirme» en todas partes.** Lleva a la agenda con UTM y nunca a un correo.
4. **Bloque legal de 11 px** con «Efeonce Group SpA» en 600 `#cfe4fa`; luego RUT, dirección, teléfonos y correo, todo
   desde `efeonce-brand.ts`.
5. **La órbita de medida dibuja su recorrido** desde las 12, en el acento a 0,6 y 3 px, bajo la estela de 4 px y la
   esfera.
6. **Escritorio con tarjeta de 600 px; celular a sangre en 390**, con la agenda y las redes apiladas.

## Alternativas y decisiones

- **Una plantilla única de correo Efeonce, con el cuerpo de Insights:** descartada por el operador. Cada correo decide
  su cuerpo; sólo los módulos son comunes.
- **Mantener «Suscribirme» como CTA del pie:** retirado por el operador. La acción que el correo propone es revisar los
  datos juntos, y eso es una reunión.
- **La agenda como `mailto:`:** descartada. La agenda de `/contacto/` mide con UTM y no depende de una bandeja.
- **Eslogan fijo «Empower your Growth» en todo correo:** descartado. La palabra pertenece a la línea que firma.
- **Eslogan en el acento de la línea:** descartado en correo. A unos 12 px no llega a los 24 px que AXIS exige para
  poner la palabra en acento; va en la tinta de la superficie.
- **Logo y eslogan en un único PNG:** no se recomienda. El SSOT de marca los trata como elementos independientes; se
  sirven como dos PNG apilados, salvo que AXIS publique otra cosa.
- **Pie claro de TASK-1764 para el correo de Insights:** no es lo aprobado para esta superficie. La convivencia se
  decidió el 2026-09-29: Insights conserva este pie por excepción; los demás correos siguen la política.
- **Órbita sin recorrido,** con sólo la estela y la esfera: reemplazada. El recorrido tenue deja leer cuánto avanzó la
  medida sin volverla un medidor que se llena.
- **Órbita como medidor que se llena hasta el valor:** sigue prohibida en La órbita. El dato es la posición de la
  esfera.
