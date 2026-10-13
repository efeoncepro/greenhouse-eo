# Usar las marcas de Efeonce Wave, Reach y Globe — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-09 por Claude
> **Ultima actualizacion:** 2026-10-09 por Claude
> **Modulo:** Creative · marcas de producto de Efeonce (familia de La órbita, ruta H3)
> **Ruta en portal:** no aplica — los archivos viven en `@efeoncepro/axis-brand-assets`
> **Documentacion relacionada:** [ADR de la familia H3](../../architecture/brand/EFEONCE_PRODUCT_FAMILY_H3_DECISION_V1.md) · [Manual técnico de La órbita §7.5](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [Usar la línea gráfica de Efeonce](usar-linea-grafica-efeonce.md) · [Usar la marca de Efeonce Rooms](usar-marca-efeonce-rooms.md)

## Para qué sirve

Este manual explica qué archivo de **Efeonce Wave**, **Efeonce Reach** y **Efeonce Globe** usar en cada lugar, en qué
variante, qué no hacer y cómo regenerar los archivos. La decisión (ruta **H3**) quedó aceptada el 2026-10-09: cada
producto conserva su logotipo y la familia vive en el lockup. Junto a Efeonce, el logotipo va en el gris de la familia
con **sólo su gesto en color** (la W de Wave, la «a» con flecha de Reach, el globo de Globe), así Efeonce predomina. El
endoso «by efeonce» se retiró.

No cambia la regla de la familia: los productos son contexto y **nunca firman una pieza**; la firma sigue siendo el logo
de Efeonce.

## Antes de empezar

- **Toma los archivos del paquete**, nunca de una captura, del canvas ni de una copia vieja:
  `@efeoncepro/axis-brand-assets` **0.4.28** (AXIS `7c96680` + `5346761`; tag `v0.4.28` publicado), archivos
  `<producto>-<pieza>-<variante>.svg`. Antes de fijar la versión, confirma que ya esté en el registro (ver el
  [runbook de consumo de AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)).
- **Greenhouse todavía fija 0.4.25**, y sus copias de `public/branding/SVG/` (`wave-full`, `reach-negativo`,
  `isotipo-globe-negativo` y similares) conservan el dibujo anterior, con «by efeonce». No las uses para piezas nuevas;
  la adopción del paquete entra en
  [TASK-2014](../../tasks/to-do/TASK-2014-axis-packages-adoption-and-report-projection-retirement.md).
- **En el Lab:** con 0.4.28 el catálogo público mostraba sólo `logo` e `isotype` (con el dibujo nuevo). Desde 0.4.29
  (tag `v0.4.29`) todas las piezas —lockups, variante `white` e isotipos chicos— están en la página «Logotipos»
  (`/references/logos/`) y en la búsqueda global, junto a Rooms y Creative Studio.
- **Ten a mano las reglas de la familia** (resguardo, tamaños mínimos, logo frente a isotipo) en el
  [manual técnico de La órbita](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).

## Paso a paso

### Paso 1 · Elige la pieza

| Pieza | Archivo | Dónde va |
| --- | --- | --- |
| Lockup **Efeonce \| Producto** | `wave-lockup`, `reach-lockup`, `globe-lockup` | **Por defecto**, siempre que el producto aparece junto a Efeonce: encabezados, decks, informes, correo |
| El logotipo solo | `wave-logo`, `reach-logo`, `globe-logo` | Donde el producto está solo: su propia aplicación, ingreso o página |
| Isotipo | `wave-isotype`, `reach-isotype`, `globe-isotype` | Avatar, ícono de app, marca en la superficie del producto (más de 24 px) |
| Isotipo chico | `reach-isotype-small`, `globe-isotype-small` | **24 px o menos**: favicon, chips. Wave no lo necesita: su isotipo funciona chico |

Si dudas, usa el lockup.

### Paso 2 · Elige la variante según el fondo

| Variante | Úsala sobre | Qué cambia |
| --- | --- | --- |
| `positive` | Papel / fondos claros | Logotipo en navy de la familia `#023c70` (en el lockup, gris `#6b6b6b`); gestos: Wave `#0375db` + `#091951`, Reach `#f83902`, Globe `#bb1954` |
| `negative` | Navy / fondos oscuros | Logotipo en blanco (en el lockup, gris `#6f89a2`); gestos: Wave `#2e8be8` + `#a6cdf5`, Reach `#f83902`, Globe `#ee4274`. **Los isotipos van todo en blanco**: `isotype-negative` e `isotype-small-negative` son el mismo archivo que su `-white` |
| `white` | Foto o color donde la versión a color no funciona | Todo en blanco |

### Paso 3 · Revisa los casos sensibles sobre oscuro

- **Isotipos:** sobre oscuro, los tres van **todo en blanco** (decisión del operador, 2026-10-09: son lo
  suficientemente distintivos para funcionar así). El color sobre oscuro vive sólo en el logotipo y el lockup.
- **Reach:** en la palabra, la «a» va **naranja maciza** (blanca se funde con la «e» con la que se superpone). El
  isotipo suelto, en cambio, va todo blanco. Las dos cosas ya vienen así en los archivos `negative`.
- **Globe:** en el logotipo y el lockup, el globo va **frambuesa `#ee4274`**, no en el naranja de la línea Brand (`#ff6500`), que sigue siendo el de
  Creative Studio. El globo es el objeto, no un acento de línea.

### Paso 4 · Firma con Efeonce

El lockup o el logotipo del producto dicen con qué se hace el trabajo; la pieza la firma el logo de Efeonce (manual
técnico §7 y §8.1). No reemplaces la firma por el lockup.

## Qué significan las piezas y variantes

- **El lockup** es la familia: Efeonce adelante (30 de alto, 20 de aire, filete de 1 × 26, 20 de aire) y el logotipo
  apagado al gris, con su gesto en color. Cada logotipo va dimensionado por presencia (WAVE a 21, REACH a 20, globe a
  35) y apoyado en la misma línea base de Efeonce.
- **El logotipo solo** conserva la letra propia de cada marca (REACH modular, WAVE en bloque de mayúsculas, globe
  redondo) en el navy de la familia: es la marca cuando no hay Efeonce al lado.
- **El isotipo chico** no es el isotipo reducido: en Reach la ranura de la «a» se cierra y el chevrón se engrosa; en
  Globe los cuatro gajos se funden en un solo cuerpo, para que se lean a 16–24 px.

## Qué no hacer

- **Nunca** rearmes un lockup a mano juntando el logo de Efeonce y el del producto: el lockup es un archivo.
- **Nunca** uses ni pidas «by efeonce»: el endoso está retirado. Si una superficie todavía lo muestra, es una copia vieja.
- **Nunca** pintes el globo de Globe en naranja sobre oscuro: en el logotipo y el lockup va frambuesa `#ee4274`.
- **Nunca** uses un isotipo de color sobre oscuro (los azules de Wave, la punta naranja de Reach, el globo frambuesa):
  sobre oscuro, el isotipo va todo en blanco.
- **Nunca** pongas blanca la «a» en la palabra de Reach sobre oscuro: va naranja maciza.
- **Nunca** uses el isotipo normal de Reach o Globe a 24 px o menos: usa `-isotype-small`.
- **Nunca** firmes una pieza con el lockup o el logotipo del producto: firma Efeonce.
- **Nunca** edites los SVG a mano, los recolorees ni rehagas el logotipo con una fuente (H1, el gesto en Poppins, se
  descartó porque perdía presencia).

## Regenerar los archivos

Sólo cuando cambia la marca o la geometría de la familia, y con la decisión registrada en el ADR:

1. En el repo AXIS, corre el generador `packages/brand-assets/scripts/product-family.mjs`; lee los originales desde
   `packages/brand-assets/sources/product-family/`.
2. En AXIS, corre `pnpm seal` y publica por el flujo de release de AXIS.
3. Revisa que la prueba de AXIS de contornos pase: todo se calcula con booleanos sobre curvas, nunca con máscaras.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| El logo todavía dice «by efeonce» | Copia vieja (`public/branding/SVG/`, OneDrive) o versión del paquete anterior a 0.4.28 | Toma el archivo del paquete 0.4.28 |
| No encuentro el lockup en el Lab | El Lab todavía no tiene 0.4.29 (hasta 0.4.28 las piezas nuevas estaban excluidas) | Búscalo en «Logotipos» (`/references/logos/`) o tómalo del paquete `@efeoncepro/axis-brand-assets` |
| `0.4.28` no se instala | El tag `v0.4.28` está publicado, pero el paquete aún no llega al registro | Confirma la versión en el registro antes de fijarla |
| El favicon de Reach o Globe se ve empastado | Se usó el isotipo normal reducido | Usa `-isotype-small` |
| El SVG se ve distinto en un visor | Archivo editado a mano o exportado desde otra herramienta | Vuelve a tomar el archivo del paquete; los cortes son contornos, no máscaras |
| El globo sale naranja sobre oscuro | Archivo anterior a 0.4.28 o recoloreado a mano | Usa `globe-*-negative` del paquete |
| El isotipo sale en color sobre oscuro | Exploración intermedia o copia vieja | Usa `<producto>-isotype-negative` (o `-white`) del paquete: todo blanco |

## Referencias técnicas

- Decisión, alternativas descartadas y consecuencias: [ADR de la familia H3](../../architecture/brand/EFEONCE_PRODUCT_FAMILY_H3_DECISION_V1.md).
- Reglas de la familia: [manual técnico de La órbita §7, §7.5 y §8](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) ·
  [ADR «La órbita»](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md).
- Paquete y Lab: [AXIS: packages y Lab](../../documentation/creative/axis-packages-y-lab.md).
- Globe en su estudio: [Globe Studio — Style Canon §5](../../ui/creative-studio/EFEONCE_GLOBE_STYLE_CANON.md).
- Adopción en Greenhouse: [TASK-2014](../../tasks/to-do/TASK-2014-axis-packages-adoption-and-report-projection-retirement.md).
