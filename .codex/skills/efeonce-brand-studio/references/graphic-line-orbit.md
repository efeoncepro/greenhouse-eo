# Línea gráfica Efeonce «La órbita» — referencia operativa para agentes

> Canónica desde el 2026-09-25 ([ADR](../../../../docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md), Accepted).
> Contenido completo en el [manual V1](../../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
> (v1.1: §8.5 con el delta de la firma, §10.8 merch en foto, §10.9 oficina en foto). Esta hoja resume para operar;
> si difiere del manual o de los tokens, mandan ellos.

## Qué es

Una esfera que recorre su órbita. La forma nace del isotipo (la nave ya tiene anillo y esfera): la línea no inventa
un símbolo, extiende el que existe. Anatomía: **anillo** fino (el recorrido) + **arco** (lo avanzado) + **esfera** en
la punta (dónde vamos) + **halo** (luz, nunca disco relleno). Gramática: **anillo = pregunta / libre / abierto ·
esfera = respuesta / ocupado / decidido**; nunca colores de semáforo (manual §0, §1.3).

Tres usos, un sistema:

| Uso | Qué hace | Regla clave |
|---|---|---|
| **Rodea** | envuelve una palabra, la lente o un objeto | nunca rodea el logo; el isotipo no lleva otra órbita (§8.3, §8.4) |
| **Mide** | el arco es avance real | **sin dato real con fuente no hay arco de avance** (§1.3) |
| **Enfoca** | la lente: foto en navy apagado, a color y ampliada dentro del círculo; el foco: penumbra afuera, luz de borde suave adentro («Te hacemos visible») | una sola luz por pieza; «visible» siempre con su prueba (§1.4, §1.5) |

Tres estados de la esfera: punto final (cierra la palabra respuesta), órbita y foco (§1.1).

La familia comparte la forma y cambia el acento. Palabra final del eslogan «Empower your …»: **Growth** (Efeonce),
**Brand** (Globe), **Engine** (Wave), **Voice** (Reach).

## Cuándo aplica y cuándo no

- **Aplica:** marca propia Efeonce y su familia (Efeonce, Globe, Wave, Reach; Greenhouse aparece sólo en el mapa de
  portafolio). Piezas, decks, redes, correo, papelería, oficina, merch, eventos.
- **No aplica:** identidad de producto de Greenhouse (el portal sigue con `DESIGN.md`/AXIS de producto) ni trabajo
  de clientes. Que la línea no se filtre a entregables de cliente es regla, no preferencia (ADR §6).
- No reemplaza `DESIGN.md` ni `src/config/efeonce-brand.ts`: los complementa (eslogan y pesos siguen en el SSOT).

### La órbita no sustituye el lenguaje fotográfico (operador, 2026-09-26)

La órbita **se usa en casos específicos** (lente, medida real, progreso, foco, mapa de familia, cierre de marca) y se
**declara a propósito, nunca por defecto**. En una pieza fotográfica, la composición, las formas, las reservas de
texto, el lecho y la firma siguen siendo del
[lenguaje fotográfico](../../design-studio/references/efeonce-photographic-language.md). La órbita nunca cruza el
sujeto, las reservas de texto, el lecho ni la firma (check `orbit-never-over-subject-or-reserves`, zonas en
`bindings.protect`). Una pieza fotográfica sin órbita es lo normal, no una pieza incompleta.

## La firma de una pieza gráfica (operador, 2026-09-26)

- **Por defecto**, un post, anuncio o portada con foto firma con **el logo de Efeonce centrado, abajo al centro**.
  Sin URL.
- La **burbuja URL** (`efeoncepro.com`) **no se agrega por defecto**. Sólo **reemplaza** al logo cuando el logo de
  Efeonce **ya aparece dentro de la imagen** (mockup, objeto, merch o similar). Entonces va **centrada**, sola, con
  **fusión de luminosidad** calculada sobre los píxeles reales y a **opacidad 1**. Nunca a un costado, nunca junto al
  logo (repetiría la marca).
- **Por qué casi nunca alcanza:** la fusión fija la luminosidad del gris fuente `#848484`, así que la burbuja sólo
  llega a 4,5:1 sobre un lecho **muy oscuro**. Medido el 2026-09-26: a opacidad 0,72 no llega en ningún fondo (3,82
  sobre `#001A33`, 4,00 sobre negro); a opacidad plena, 6,17 y 6,78 en el píxel máximo y ~4,4–4,9:1 midiendo el 1 %
  peor de su tinta sólida sobre lechos casi negros; 1,6–3,1 sobre fondos medios o claros. Por eso un gate la mide
  ≥ 4,5:1 sobre los píxeles finales: si no pasa, se cambia el lecho o la foto, no la burbuja.
- **Pie, no firma:** en deck, informe, papelería, stand, firma de mail y pies de página la burbuja sigue como antes:
  fusionada donde el medio lo garantiza, o en su variante **horneada** (clara `#848484` sobre blanco/papel, `#6F89A2`
  sobre navy) en visores, PDF y referencias para IA. En correo va sin fusión y enlazada.
- **Pendiente del operador:** si el umbral de la burbuja-firma sigue en 4,5:1 o baja a 3:1 (objeto gráfico). Hasta
  que decida, 4,5:1.

## Reglas duras (las más caras de romper)

1. **Ningún texto cruza la órbita.** Texto en el tercio inferior izquierdo; órbita fuera de eje, arriba a la derecha.
2. **Una lente u órbita por pieza, muro o vidrio.** Nunca patrón, nunca repetida.
3. **El arco mide un dato real con fuente** o no existe. Nada decorativo ni inventado.
4. **URL `efeoncepro.com` siempre en la burbuja oficial, nunca como texto.** La burbuja no es la firma por defecto
   (ver arriba). No se recolorea ni se redibuja; sale del paquete `@efeoncepro/axis-brand-assets` (§8.5).
5. **Logo dentro de una frase de display** sólo en titulares grandes, alineado a línea base y altura de x, una vez
   por pieza, sin repetirlo como firma en la misma vista; en texto corrido nunca (§8.2, §8.3 #12).
6. **Logo:** ni órbita alrededor, ni esfera pegada, ni recolor, ni efectos; logo e isotipo nunca juntos; mínimo
   96 px pantalla / 25 mm impreso. Isotipo mínimo 24 px / 8 mm (§8). Si nada funciona, cambia el fondo o la foto.
7. **En redes** (lienzos de hasta 1200 px de ancho) los grosores van ×1,75 (§1.3).
8. **Sin velo navy sobre fotos de banco.** La foto de la lente sale del
   [lenguaje fotográfico](../../../../docs/operations/brand-photography/README.md): registro documental, nadie mira
   al lente, sin emblema legible, sujeto dentro de un círculo del 55 % del lado corto. Se produce con el pipeline
   `pnpm foto:*`, nunca con prompts a mano (§9).
9. **Un acento por pieza.** El teal es sólo de Efeonce, nunca en una pieza de producto; el teal claro no va como texto
   sobre blanco (2,1:1). La esfera es gráfico; el texto cumple 4,5:1 siempre (§2).
10. **Voz pregunta-respuesta:** pregunta real en Poppins 300 con anillo; respuesta de 1–3 palabras en Bricolage 760,
    ≥ 3× la pregunta, cerrada por la esfera; la esfera nunca va en una pregunta (§3, §4).
11. **Eslogan** sólo en cierres, desde el archivo oficial: «Empower your» + palabra de la marca, sin mayúsculas y sin
    esfera (§5).
12. **Estado:** anillo = libre, esfera = ocupado, siempre con etiqueta escrita; nunca verde/rojo.

## De dónde salen los valores y los archivos

- **Valores:** tokens **`efeonceGraphicLine`** (`status: 'canonical'`) de `@efeoncepro/axis-tokens` (repo hermano
  `axis-design-system`, `packages/tokens/src/tokens.ts`), con pruebas de contraste. Grupos: `color`, `family`,
  `sphere`, `orbit` (medidas por cada `orbit.baseWidthPx` = 794 px de ancho de lienzo), `lens`, `spotlight`,
  `urlBubble` (+ `source` `#848484`), `type`, `logo`, `isotype` y, desde 0.2.7, `signature` (centrada, anclada abajo
  al centro, margen 0,09 del lado corto, modo por defecto `logo`, la burbuja exige marca en escena, ancho 0,2 del
  lado corto y 0,25 en 16:9, contraste mínimo 4,5), `slogan`, `state` y `brandClose` (animación de cierre de 4 500 ms;
  con movimiento reducido, cuadro final).
- **Archivos:** `@efeoncepro/axis-brand-assets` 0.2.7: 19 SVG oficiales (logo e isotipo positivo/negativo de Efeonce,
  Globe, Wave y Reach; `url-bubble-source` gris para fusionar; `url-bubble-baked-light` y `url-bubble-baked-dark`),
  con SHA-256 sellado y proporción del viewBox. Se piden por id con `findBrandAsset` / `brandAssetUrl`. **Nunca**
  copiar un SVG a mano. Las copias locales que aún leen renderers y catálogos (`public/branding/*`,
  `deliverables/assets/url-lum-{light,dark}.svg`, `url-lum.svg` de los catálogos del Artifact Composer) las vigila la
  guarda `src/config/efeonce-brand-assets.test.ts`: deben llevar el dibujo del paquete. Fuentes y fotos **no** van en
  el paquete. No confundirlo con `efeonce.brand-logos` (procedencia de logos de terceros en UIs).
- Greenhouse fija `@efeoncepro/axis-*` 0.2.7 y `@efeoncepro/axis-brand-assets` 0.2.7.

**NUNCA transcribir HEX ni px a mano** desde el manual, el PDF o una captura: importar el token. Cambiar un valor
exige cambiar el token y su prueba, no el documento. Antes de fijar una versión en un consumidor, verificar en qué
versión publicada está el export (no asumirlo).

## Componer con agentes (contrato `efeonce.graphic-line-orbit` 0.2.0)

Una pieza con la órbita se compone por **intención**, no con coordenadas. Contrato `0.2.0` (`candidate`), manifest
`axis.graphic-line-orbit-composition.v1`, publicado en los paquetes AXIS 0.2.7. El agente declara qué hace cada
elemento y AXIS valida las reglas y resuelve cada valor desde los tokens.

- **Kinds:** `orbit`, `measure`, `progress`, `lens`, `spotlight`, `family-map`, `url-bubble`, `voice`,
  `logo-inline`, `signature`, `slogan`, `state`, `brand-close`.
- **Rechazos del resolver:** dos anillos en una pieza · `measure` sin `source` · respuesta de más de tres palabras ·
  en canal `social`, un `url-bubble` suelto (se firma con `signature`) · más de una firma · firma y burbuja a la vez ·
  burbuja-firma de una marca que no sea Efeonce · eslogan fuera de un cierre · `state` sin etiqueta · `brand-close` en
  canal `print`.
- **`signature`** resuelve `mode` `logo | url-bubble`, el `assetId` del paquete de archivos y, en web, la fusión
  `luminosity` con su `source`.
- **Checks del adapter:** `text-never-crosses-ring`, `ring-center-on-target-center`, `sphere-on-arc-end`,
  `lens-subject-inside-circle` (manual), `url-as-bubble-never-text`, `decorative-svg-hidden-from-accessibility-tree`,
  `signature-centered`, `signature-min-contrast`, `orbit-never-over-subject-or-reserves`.

### Puntos de entrada

| Dónde | Comando | Qué hace |
|---|---|---|
| AXIS (repo hermano) | `pnpm orbit:resolve` | valida la intención y emite el manifest |
| Greenhouse | `pnpm creative:orbit:resolve -- --input intent.json --out manifest.json` | igual, con el pin 0.2.7 |
| Greenhouse | `pnpm creative:orbit:render -- --intent intent.json --bindings bindings.json --out-dir out/` | pinta, rasteriza, firma (logo, o burbuja fusionada a opacidad 1) y mide la firma sobre los píxeles finales; escribe `manifest.json`, `piece.svg`, `piece.png` y `qa.json`; **sale con 1** si falla un check |
| Greenhouse, campaña | `pnpm creative:layout` | capa `graphic_line: { intent, protect }` por formato y firma `brand.signature` (abajo) |
| Greenhouse, foto con CTA | `pnpm foto:componer:cta` + `pnpm foto:cta:gate` | firma de una pieza fotográfica (abajo) |

Los **bindings** llevan la geometría medida: objetos, fotos, cajas de texto, lugar de la firma y
`protect: [{ id, kind: subject | reserve | bed, x, y, w, h }]`; la respuesta con `fontSize`, `baseline` y `lastChar`
para cerrar con su esfera. Adapter: `scripts/creative/layout-compiler/graphic-line.mjs`. Nunca copiar el pintor del
Lab. Contrato y manual en AXIS: `docs/agent-composition/graphic-line-orbit.md` y
`docs/architecture/GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md`; ejemplos resueltos y pintados en la sección 5.7
de https://axis.efeonce.org/references/graphic-line.

### Campaign Layout Compiler (`pnpm creative:layout`)

- **`graphic_line: { intent, protect }`** es una capa **opcional por formato** y admite sólo elementos con anillo
  (`orbit`, `measure`, `progress`, `lens`, `spotlight`, `family-map`). La tipografía y la firma siguen siendo del
  compilador. El QA falla si la capa cruza el campo de copy o un sujeto protegido.
- **`brand.signature: { brand_in_scene }`** (opcional): `false` → logo centrado y **sin** URL; `true` → burbuja
  centrada sola, opacidad 1, y el QA falla bajo 4,5:1. Un contrato sin el campo (CMP-00x) queda exactamente como antes.

### Compositor de fotos con CTA (`pnpm foto:componer:cta`, tramo 17)

- Campo de plan **`marcaEnEscena`**. En una pieza **nueva**, la burbuja como firma se declara con `url` +
  `"marcaEnEscena": true` y **sin** `logo`: se fusiona a opacidad 1 y se mide (1 % peor de su tinta sólida, y si cae
  sobre el sujeto).
- El gate la juzga con la regla exceptuable **`firma-burbuja`** (burbuja sin marca en escena, o burbuja junto al
  logo) más `firma-contraste` (≥ 4,5:1) y `firma-sobre-sujeto`. Contrato: §19.6 «cinco maneras de declarar la firma»
  del [compositor de CTA](../../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).
- Las piezas del canon anterior se dibujan idénticas (burbuja a 0,72) y siguen «no certificables» con URL. Las
  aprobadas **no se recertificaron**: como cambió la huella del comando, el gate las muestra en 3 hasta que se
  recompongan. **Ningún workflow de CI corre este gate**: correrlo a mano antes de entregar.

## Fotografía generada con IA para la línea

**Método (arte plano → foto):** el arte plano, compuesto desde los archivos oficiales, es la **referencia exacta**;
GPT Image 2.5 Sunburst en `xhigh` sólo pone espacio, material y luz. Registro documental; nadie mira al lente. La
órbita, la palabra con su punto y el logo nunca se describen para que el modelo los dibuje. Las fotos son
**maquetas de dirección**: la producción sale de los vectoriales con prueba de color sobre el material real.

| Banco | Dónde | Qué |
|---|---|---|
| Lente propia (8 tomas) | `ai-generations/2026-09-25_banco-lente-orbita/` | `pnpm foto:generar`; registro documental; palancas manos, variantes, sombra, quien-sostiene, cenital, escucha, proyección, ausencia; fichas, prompts, LEEME |
| Merch en foto (17, lámina 4.8, manual §10.8) | `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/merch-ia/` | método en el [kit de prendas](../../greenhouse-ai-image-generator/references/garment-reference-kit.md) |
| Oficina en foto (9, lámina 4.9, manual §10.9) | `…/exploracion-v5/oficina-ia/` (`items.mjs`, `edits.mjs`) | recepción, sala, pasillo, pizarra, estado de sala, muro de voz, cocina, puesto de bienvenida, cabinas |

**Lecciones medidas en la oficina:**

1. **El modelo imprime todo lo que ve en el arte**, incluidas las notas y leyendas de la lámina: la referencia va
   sin leyendas.
2. **El logo chico se reinventa.** Se repone editando la foto con el logo oficial como segunda referencia; revisarlo
   al 100 %.
3. **La puntuación se revisa letra por letra** (apareció un espacio antes del punto).
4. **Se corrige editando la foto generada** (editar conserva lo demás), **no regenerando**.

La media pesada de `ai-generations/` vive en GCS: `pnpm media:archive-ai-generation -- --run <dir> --apply`
(sube a `gs://efeonce-group-greenhouse-private-assets-prod/ai-generations/<run>/` y deja `artifacts.remote.json`);
el pre-push `scripts/ci/large-blob-gate.mjs` bloquea blobs grandes.

## Dónde está cada cosa

| Artefacto | Ruta | Rol |
|---|---|---|
| Manual (SSOT de contenido) | `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` | contrato operativo (v1.1) |
| ADR | `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` | decisión y alternativas descartadas |
| Funcional | `docs/documentation/creative/linea-grafica-efeonce.md` | qué es, en lenguaje simple |
| Manual de uso | `docs/manual-de-uso/creative/usar-linea-grafica-efeonce.md` | paso a paso |
| PDF (A4, 56 hojas, confidencial) | `docs/operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf` | entregable para personas (hoja 12 «La oficina, fotografiada»); regenerar con `node scripts/documents/render-efeonce-graphic-line.mjs` |
| AXIS (pública, canónica) | https://axis.efeonce.org/references/graphic-line | láminas en HTML nativo; 5.7 «Componer con agentes»; 4.9 «Oficina en foto» (`#oficina-foto`) |
| Tokens | `efeonceGraphicLine` en `@efeoncepro/axis-tokens` 0.2.7 | valores |
| Archivos oficiales | `@efeoncepro/axis-brand-assets` 0.2.7 | logos, isotipos y burbujas; el Lab los sincroniza en cada build (`pnpm brand:sync`) |
| Adapter | `scripts/creative/layout-compiler/graphic-line.mjs` | resolver + pintor + medición de firma |
| Canvas (taller, privado) | https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii | 40 láminas, 7 capítulos (lámina 4.9 «Oficina en foto»); exploración, no fuente |

La página de AXIS es pública: lo que allí aparece queda expuesto.

## Checklist de QA de una pieza con la órbita

- [ ] La pieza es de Efeonce o su familia; no es producto Greenhouse ni cliente.
- [ ] La órbita está por una razón declarada (lente, medida, progreso, foco…), no por defecto; no cruza sujeto,
      reservas, lecho ni firma.
- [ ] Valores tomados de `efeonceGraphicLine`; ningún HEX/px transcrito; en redes ≤ 1200 px, ×1,75 aplicado.
- [ ] Una sola órbita o lente; ningún texto la cruza; órbita fuera de eje con aire.
- [ ] Si hay arco de avance, existe el dato real que mide y se puede citar.
- [ ] Un acento; teal sólo en Efeonce; texto ≥ 4,5:1 medido en los píxeles finales.
- [ ] Voz: una pregunta real y una respuesta de 1–3 palabras; esfera sólo en la respuesta; una esfera por pieza.
- [ ] **Firma:** logo de Efeonce centrado abajo; burbuja sólo si el logo ya está en la imagen, centrada, sola,
      fusionada a opacidad 1 y ≥ 4,5:1 medido; nunca burbuja a un costado ni junto al logo.
- [ ] Logo y burbuja desde `@efeoncepro/axis-brand-assets`, con resguardo, sin órbita ni esfera; logo nunca junto
      al isotipo. URL nunca como texto; en correo, enlazada.
- [ ] Foto del banco o del pipeline `foto:*`; sin velo, sin emblema legible, nadie mira al lente; en fotos generadas,
      logo chico y puntuación revisados al 100 %.
- [ ] «Te hacemos visible» sólo con su prueba y sin pauta mientras falte la revisión legal.
- [ ] Nada de esto aprueba ni publica la pieza.

## Pendientes (no presentarlos como resueltos)

- **Prueba de atribución sin logo** (600 personas, panel a cotizar) sin medir: hoy la línea es **sistema consistente,
  no activo distintivo demostrado**. No reportarla como brand equity.
- Umbral de la burbuja-firma: 4,5:1 o 3:1 (decisión del operador).
- Elegir firma de mail A o B; aprobar el banco de pares de copy (hoy candidatos).
- Archivos de impresión y plantillas editables. El contrato sigue en `candidate` hasta que una pieza real salga por
  un segundo runtime con evidencia.
- Copy en inglés; revisión legal de «Te hacemos visible»; tamaños mínimos del logo con prueba de impresión.
- Recomponer las piezas aprobadas para que el gate de `foto:componer:cta` las vuelva a certificar.
