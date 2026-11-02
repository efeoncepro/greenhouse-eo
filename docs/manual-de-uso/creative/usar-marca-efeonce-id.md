# Usar la marca de Efeonce ID — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-11-02 por Claude
> **Ultima actualizacion:** 2026-11-02 por Claude
> **Modulo:** Creative · marca de la cuenta de Efeonce (familia de La órbita)
> **Ruta en portal:** no aplica — los archivos viven en `@efeoncepro/axis-brand-assets`; la marca se usa en Efeonce Auth (`auth.efeonce.org`) y en el botón de entrada de las aplicaciones
> **Documentacion relacionada:** [ADR de la marca de Efeonce ID](../../architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md) · [Manual técnico de La órbita §7.6](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [Usar la línea gráfica de Efeonce](usar-linea-grafica-efeonce.md) · [Usar la marca de Efeonce Rooms](usar-marca-efeonce-rooms.md)

## Para qué sirve

Este manual explica qué pieza de la marca de **Efeonce ID** usar en cada lugar, cómo se arma el botón «Continuar con
Efeonce ID», qué no hacer y cómo regenerar los archivos. Efeonce ID es la cuenta con la que personas y agentes entran por
Efeonce Auth a todos los productos (Rooms, Studio, Greenhouse).

La marca quedó aprobada el 2026-11-01: «ID» no tiene O, así que **la órbita vive en la D**. La D es asta, un tramo recto
y media órbita; una sola esfera, en el acento Growth, va a la 1:30, como en toda la familia. No lleva nada más.

El botón «Continuar con Efeonce ID» quedó aprobado el 2026-11-02, pero **todavía no está implementado** como componente:
este manual dice cómo debe verse, no dónde tomarlo hecho.

## Antes de empezar

- **Toma los archivos del paquete**, nunca de una captura ni del canvas: `@efeoncepro/axis-brand-assets` **0.4.31**
  (12 SVG `efeonce-id-<pieza>-<variante>.svg`) y **0.4.32** (los dos `efeonce-id-button-lockup-*`). Ambos publicados
  (releases `v0.4.31` y `v0.4.32`, 2026-11-02) y visibles en la página «Logotipos» del Lab de AXIS. Fija la versión
  exacta (ver el [runbook de consumo de AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)).
- **Greenhouse todavía fija 0.4.25**, que no trae estas piezas. Adoptar las versiones nuevas entra en
  [TASK-2014](../../tasks/to-do/TASK-2014-axis-packages-adoption-and-report-projection-retirement.md).
- **Ten a mano las reglas de la familia** (área de resguardo, logo frente a isotipo) en el
  [manual técnico de La órbita](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).

## Paso a paso

### Paso 1 · Elige la pieza

| Pieza | Archivo | Dónde va |
| --- | --- | --- |
| Lockup **Efeonce \| ID** | `efeonce-id-lockup` | **Por defecto**: encabezado del formulario de entrada, correos, documentos |
| Isotipo (el monograma en un cuadro) | `efeonce-id-isotype` | Avatar e ícono de app; **nunca junto al nombre** |
| Isotipo chico | `efeonce-id-isotype-small` | **Sólo a 32 px o menos**: el favicon |
| Logo (el monograma solo) | `efeonce-id-logo` | Insumo de las anteriores; el botón «sólo símbolo» |
| Lockup del botón | `efeonce-id-button-lockup` | **Sólo dentro** del botón «Continuar con Efeonce ID» |

Si dudas, usa el lockup. En él, «ID» va en el gris medido de la familia y sólo la esfera conserva el acento.

### Paso 2 · Elige la variante según el fondo

| Variante | Úsala sobre | Qué cambia |
| --- | --- | --- |
| `positive` | Papel / fondos claros | Tinta navy; esfera Growth `#0e8c82` |
| `negative` | Navy / fondos oscuros | Tinta blanca; esfera Growth `#36c8bf` |
| `white` | Foto o color donde la versión a color no funciona | Todo en blanco, esfera incluida (no existe para el lockup del botón) |

### Paso 3 · En la pantalla de entrada de Efeonce Auth, sólo favicon y formulario

- **Favicon:** la teja oscura `#001a33` con radio de 22 % y el isotipo chico en negativo. Ya está en el código de
  `auth-server` en `develop` (lo compone `scripts/auth-server/efeonce-id-favicon.ts` y se regenera con
  `pnpm auth-server:brand-assets:generate`); llega a `auth.efeonce.org` recién con el próximo release.
- **Dentro del formulario:** el lockup en el encabezado (pendiente de implementar) y el botón.
- **Nunca el isotipo grande en el panel lateral:** ese panel es del carrusel de novedades, que se conserva.

### Paso 4 · Arma el botón «Continuar con Efeonce ID»

1. **Texto + marca:** «Continuar con» en Poppins 400 y, a continuación, el lockup del botón, como «Pagar con PayPal».
   En ese lockup «ID» va en la tinta del texto (blanco o navy), no en gris: el botón nombra la cuenta.
2. **Superficie según el fondo:** sobre papel o blanco, el sello oscuro `#001a33` con texto blanco y lockup `negative`;
   sobre oscuro o foto, el botón blanco con texto navy, borde y lockup `positive`.
3. **Tamaño según el espacio:** 52 px por defecto; 56 grande; 40 compacto (sólo la marca, con nombre accesible
   «Continuar con Efeonce ID»); ancho completo en formularios y teléfono; sólo símbolo (el monograma en un círculo,
   con nombre accesible).
4. **Los diez estados:** reposo; cursor (navy o papel, borde teal y halo teal suave); presionado; foco con teclado
   (anillo teal sólido, separado del botón); foco + cursor; cargando (la órbita de la familia girando y «Conectando…»);
   cargando con movimiento reducido (la órbita quieta); conectado (la esfera completa la vuelta); error (vuelve a reposo
   con «No pudimos conectar. Inténtalo de nuevo.» debajo); deshabilitado.

Medidas exactas: README de `@efeoncepro/axis-brand-assets`, sección «The «Continuar con Efeonce ID» button». Referencia
visual: lámina «Botón «Continuar con Efeonce ID» · todos los estados» del canvas
[«Efeonce ID — logo»](https://claude.ai/code/artifact/4e613ff0-2a09-48c6-8e98-4adffc6da9bd).

## Qué significan las piezas y variantes

- **La D con la órbita** es la regla de la familia («la órbita vive en la O») aplicada a un nombre sin O. El tramo recto
  hace que la D se lea como letra y lleva el trazo de arriba hasta la esfera.
- **La esfera Growth** dice que la cuenta es de la marca madre y sirve a todos los productos.
- **El isotipo chico** engrosa el anillo y agranda la esfera para que la panza no se pierda en un favicon; por encima de
  32 px se ve pesado.
- **El lockup del botón** existe aparte porque, a tamaño de botón, «ID» en gris perdía fuerza.

## Qué no hacer

- **Nunca** el isotipo grande en el panel lateral de la pantalla de entrada: es del carrusel de novedades.
- **Nunca** el monograma antes del texto del botón: son letras y se lee «ID Continuar con Efeonce ID». Es una regla de
  toda la línea: un símbolo hecho de letras no va antes de un texto que lo repite.
- **Nunca** el monograma al final de la frase (la esfera arriba se lee como aviso), la órbita sola a la izquierda (parece
  el ícono de recargar) ni el isotipo en su teja dentro del botón (pesado).
- **Nunca** el lockup de familia (con «ID» gris) dentro del botón, ni el lockup del botón fuera de él.
- **Nunca** el isotipo junto al nombre, ni el isotipo chico por encima de 32 px.
- **Nunca** texto en el acento: sólo la esfera lo lleva.
- **Nunca** agregar algo dentro de la D (surcos, huella): se descartó por pesado.
- **Nunca** editar los SVG a mano, recolorearlos ni rehacer la marca con texto.

## Regenerar los archivos

Sólo cuando cambia la marca o la geometría de la familia, y con la decisión registrada en el ADR:

1. En greenhouse-eo, corre `node scripts/brand/build-efeonce-id-logos.mjs <directorio-de-salida>` (14 SVG: 4 piezas ×
   3 variantes + el lockup del botón en `positive` y `negative`).
2. Copia los SVG a `packages/brand-assets/assets/` y a `apps/lab/public/branding/` del repo AXIS.
3. En AXIS, corre `pnpm seal` y publica por el flujo de release de AXIS.
4. Si cambió el isotipo chico, regenera el favicon de `auth-server` con `pnpm auth-server:brand-assets:generate`.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| El borde derecho de la D se ve cortado en el lockup | Una escala del SVG redondeada a dos decimales agrandó la marca y la sacó del `viewBox` | Vuelve a tomar el archivo del paquete; si tocas el generador, las escalas van con seis decimales o con un `<svg>` anidado |
| No encuentro las piezas en Greenhouse | Greenhouse fija 0.4.25 | Tómalas del paquete 0.4.31 / 0.4.32; la adopción entra en TASK-2014 |
| El favicon nuevo no aparece en `auth.efeonce.org` | Está en código de `develop`, sin release | Espera el próximo release gobernado de `auth-server` |
| No hay componente del botón para usar | El botón está aprobado, pero no implementado | Falta la primitive en `axis-ui-primitives`; no lo armes a mano en cada aplicación sin esa decisión |
| A 16 px la D se ve como una curva fina | Riesgo conocido de la marca | Usa el isotipo chico; la prueba sin contexto sigue pendiente |

## Referencias técnicas

- Decisión, piezas, botón y alternativas descartadas: [ADR de la marca de Efeonce ID](../../architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md).
- Generador: [`scripts/brand/build-efeonce-id-logos.mjs`](../../../scripts/brand/build-efeonce-id-logos.mjs) · favicon: [`scripts/auth-server/efeonce-id-favicon.ts`](../../../scripts/auth-server/efeonce-id-favicon.ts).
- Pantalla de entrada: [ADR de Efeonce Auth](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) · [login V4](../../architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md).
- Paquete y Lab: [AXIS: packages y Lab](../../documentation/creative/axis-packages-y-lab.md).
- Sistema de la familia: [manual técnico de La órbita §7.6](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · skill `efeonce-graphic-line` (`references/applications.md` A20, `references/qa-checklist.md`).
