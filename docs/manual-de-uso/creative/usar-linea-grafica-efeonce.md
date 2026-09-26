# Usar la línea gráfica de Efeonce — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-25 por Claude
> **Ultima actualizacion:** 2026-09-25 por Claude
> **Modulo:** Creative · marca propia de Efeonce (línea gráfica «La órbita»)
> **Ruta en portal:** no aplica — es un sistema de marca; los valores viven en AXIS y el PDF se regenera con un comando local
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/linea-grafica-efeonce.md) · [Manual técnico-operativo V1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [ADR «La órbita»](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [Producir una foto de marca](../marketing/fotografia-de-marca-efeonce.md)

## Para qué sirve

Este manual explica cómo hacer una pieza de Efeonce con la órbita (post, slide, portada, informe, merch, papelería,
señalética) sin romper sus reglas, y cómo regenerar el manual en PDF cuando cambia su fuente.

La órbita es la forma canónica de la marca propia de Efeonce y de su familia (Globe, Wave, Reach). **No se usa** en la
interfaz de Greenhouse ni en el trabajo de clientes.

## Antes de empezar

- **Confirma que la pieza es de Efeonce** (o de Globe, Wave o Reach). Si es para un cliente o para la UI del portal,
  este manual no aplica.
- **Abre la referencia viva:** [axis.efeonce.org/references/graphic-line](https://axis.efeonce.org/references/graphic-line).
  Muestra cada elemento en HTML nativo, con sus valores.
- **Ten a mano el manual técnico** ([`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)):
  ahí están las medidas exactas por formato, color y aplicación.
- **Toma los valores de los tokens**, no de una captura ni de este manual: `efeonceGraphicLine` en
  `@efeoncepro/axis-tokens` (grosores, proporciones, paleta, reglas de logo e isotipo). Si trabajas en código, impórtalos;
  nunca transcribas HEX o px a mano.
- **Ten los archivos oficiales:** logo e isotipo desde `public/branding/` (o la carpeta de Branding en OneDrive) y la
  burbuja de URL (`url-lum.svg`, o sus variantes horneadas `url-lum-light.svg` y `url-lum-dark.svg` en
  `docs/operations/brand-graphic-line/deliverables/assets/`).
- **Si la pieza lleva foto en la lente**, parte del banco de ocho tomas en `ai-generations/2026-09-25_banco-lente-orbita/`
  o produce una nueva con el lenguaje fotográfico (ver paso 4).

## Paso a paso — hacer una pieza con la órbita

### Paso 1 · Decide qué trabajo hace la órbita

| Si la pieza… | Usa | Nota |
|---|---|---|
| cierra una idea con una palabra | el **punto final**: la esfera al final de la respuesta | titulares, firma de mail, taza blanca |
| enmarca una palabra, una portada o un objeto | la **órbita** (anillo + arco + esfera + halo) | portadas, cierres, objetos |
| muestra un avance medido | el **arco de avance** | sólo si tienes el dato real; sin dato, no hay arco |
| destaca dónde está la decisión en una foto | la **lente** | exige una foto con un punto de interés claro |

Una sola órbita o una sola lente por pieza.

### Paso 2 · Elige el contexto de color

| Fondo | Acento de la esfera, arco y anillo |
|---|---|
| Oscuro Efeonce (navy) | teal claro de Efeonce |
| Papel o blanco (Efeonce) | teal oscuro, **sólo como gráfico**; el texto va en navy |
| Producto (Globe, Wave o Reach) | el acento de ese producto; nunca el teal |

Un acento por pieza. Los valores exactos están en los tokens y en el §2 del manual técnico.

### Paso 3 · Ubica el texto y la órbita

1. Pon la órbita con su centro **fuera del eje**, hacia la derecha y arriba.
2. Deja el texto en el **tercio inferior izquierdo**.
3. Revisa que **ningún texto cruce la órbita**: ni el titular, ni la bajada, ni la firma. Si no cabe, reduce el copy
   o mueve la órbita; nunca la pongas detrás del texto.
4. En redes (lienzos de hasta 1200 px de ancho), usa los grosores de la variante para redes (×1,75) que definen los
   tokens.

### Paso 4 · Si hay foto, prepárala para la lente

- Usa una toma del banco o produce una nueva con la cadena del lenguaje fotográfico: arma la ficha y corre
  `pnpm foto:generar <ficha.json>` (o `pnpm foto:prompt` + `pnpm foto:validar`). Nunca armes el prompt a mano.
- La toma debe tener el sujeto dentro de un círculo del 55 % del lado corto, **sin emblemas legibles** (el logo lo pone
  la pieza, no la ropa) y en registro documental: nadie mira a la cámara.
- No le pongas velo oscuro encima: fuera del círculo la foto va en navy apagado, dentro va a todo color.

### Paso 5 · Escribe la voz

- **Pregunta:** chica, en Poppins Light, una pregunta real del cliente.
- **Respuesta:** en Bricolage, de una a tres palabras, al menos tres veces más grande que la pregunta, cerrada con la
  esfera.
- **Evidencia (opcional):** un dato, fuente o mecanismo en Poppins, con una palabra en negrita.
- Tuteo neutro, sin voseo. Los pares de copy del manual son **candidatos sin aprobar**: úsalos como referencia, no como
  copy final.

### Paso 6 · Firma la pieza

- Logo completo si cabe a 96 px o más; si no, el isotipo. **Nunca los dos en la misma vista.**
- La órbita **nunca rodea el logo**. En objetos, el logo va solo en el dorso.
- Si aparece `efeoncepro.com`, usa la **burbuja oficial**, no la dirección escrita. En web y en herramientas que
  soportan fusión, el SVG gris con fusión de luminosidad; en PDF, correo, visores o referencias para IA, la variante
  horneada (`url-lum-light.svg` sobre blanco o papel, `url-lum-dark.svg` sobre navy).
- El eslogan «Empower your Growth» sólo va en cierres (último slide, contratapa, firma, final de video) y desde el
  archivo oficial.

### Paso 7 · Revisa antes de entregar

- [ ] Una sola órbita o lente en la pieza.
- [ ] Ningún texto cruza la órbita.
- [ ] Si hay arco de avance, mide un dato real.
- [ ] Un solo acento; el teal no aparece en una pieza de producto.
- [ ] La URL va en su burbuja y se ve gris, no negra.
- [ ] El logo o el isotipo desde el archivo oficial, con su área de resguardo; nunca los dos juntos.
- [ ] La foto no tiene emblemas legibles ni velo encima.
- [ ] Mira la pieza al 100 % y en el tamaño real en que se verá (en redes, también a 390 px de ancho).

Publicar, imprimir o mandar a producir requiere la autorización del operador; este manual no la reemplaza.

## Paso a paso — componer una pieza con un agente

Un agente no dibuja la órbita a mano: declara qué hace en la pieza y AXIS resuelve el resto.

1. **Escribe la intención** (`intent.json`): el lienzo (`width`, `height`, `brand`, `surface`, `channel`) y los
   elementos. Por ejemplo, una lente con su foto del banco, el par pregunta y respuesta, y la burbuja de URL.
   Elementos posibles: `orbit`, `measure`, `progress`, `lens`, `spotlight`, `family-map`, `url-bubble`, `voice` y
   `logo-inline`.
2. **Resuelve**: `pnpm creative:orbit:resolve -- --input intent.json --out manifest.json`. Si la intención rompe
   una regla (dos anillos en la pieza, una medida sin fuente, una respuesta de más de tres palabras), el comando
   falla y dice cuál.
3. **Escribe los bindings** (`bindings.json`): dónde está cada cosa medida en tu composición (objetos, fotos,
   lugar de la burbuja, cajas de texto). La respuesta lleva además `fontSize`, `baseline` y `lastChar` para
   cerrar con su esfera.
4. **Pinta y revisa**: `pnpm creative:orbit:render -- --intent intent.json --bindings bindings.json --out-dir out/`.
   Deja `piece.svg`, `piece.png`, `manifest.json` y `qa.json`. Si un texto cruza el anillo o la URL aparece como
   texto, sale con error y `qa.json` dice cuál.
5. **Mira el PNG al 100 %** antes de usarlo: el chequeo del sujeto dentro de la lente es visual.

> Detalle técnico: contrato `efeonce.graphic-line-orbit` 0.1.0 (candidate) en `@efeoncepro/axis-ui-contracts`
> 0.2.6; adapter en `scripts/creative/layout-compiler/graphic-line.mjs`; manual del contrato en AXIS
> `docs/agent-composition/graphic-line-orbit.md`.

## Paso a paso — regenerar el PDF del manual

El PDF (`Efeonce-Linea-Grafica-La-Orbita-V1.pdf`, A4, 54 hojas, confidencial) se genera desde una fuente HTML. Se
regenera cuando cambia la fuente o cuando cambian las láminas del anexo.

1. Edita la fuente: `docs/operations/brand-graphic-line/deliverables/linea-grafica-efeonce.src.html`. Si cambias una
   regla, cámbiala también en el manual técnico `EFEONCE_GRAPHIC_LINE_V1.md` (y en el token, si es un valor).
2. Comprueba que tengas en tu equipo el taller de la exploración, en
   `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/`: las láminas del anexo (`canvas/laminas-full/`),
   el orden del canvas (`canvas/project/canvas.json`) y el lockup negativo (`assets/lockup-claim-neg.png`). **Las
   láminas son locales** (no están versionadas): sin ellas el PDF no se puede regenerar.
3. Desde la raíz del repo, corre:

   ```bash
   node scripts/documents/render-efeonce-graphic-line.mjs
   ```

4. Lee la salida:
   - `✓ docs/operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf · <tamaño> KB` → listo.
   - `✗ Desborde: …` → el PDF se escribió, pero algún bloque se sale de su hoja (el comando termina con código 2).
     Corrige la fuente y vuelve a correr.
5. Abre el PDF y revisa al menos la portada, una hoja con la burbuja de URL y una hoja del anexo.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **Canónica (2026-09-25)** | la órbita es la forma oficial de la marca propia; toda pieza nueva de Efeonce la usa desde los tokens de AXIS |
| **Sistema consistente, no activo distintivo demostrado** | no se ha medido si la gente reconoce a Efeonce sin el logo; no afirmes que la órbita se reconoce sola |
| **Candidato sin aprobar** | pares de copy del banco; sirven de referencia, no de copy final |
| **Decisión pendiente** | firma de mail A o B; panel de la prueba sin logo |
| **Maqueta de presentación** | las fotos de merch del canvas generadas con IA; la producción sale de los archivos vectoriales y de una muestra física del proveedor |
| **[propuesta]** en el manual técnico | valor a validar con prueba de impresión (por ejemplo, tamaños mínimos del logo e isotipo impresos) |

### Salida del comando del PDF

| Salida | Qué significa |
|---|---|
| `✓ … KB` y código 0 | PDF generado sin problemas |
| `✗ Desborde:` y código 2 | PDF generado, con al menos un bloque que se sale de la hoja |
| `Fuentes de marca no cargaron` | Bricolage o Poppins no cargaron en el navegador de render; el PDF no se escribe |
| `<n> imágenes rotas` | alguna imagen de la fuente HTML no cargó en el render; el PDF no se escribe |
| `Input file is missing` o `ENOENT` | falta un archivo local del taller (una lámina, `canvas.json` o el lockup); el PDF no se escribe |

## Qué no hacer

- No pongas la órbita detrás del texto ni dejes que un texto la cruce.
- No repitas la órbita como patrón ni pongas dos en la misma pieza.
- No dibujes un arco de avance sin un dato que lo respalde.
- No rodees el logo con la órbita ni le agregues la esfera o un punto.
- No escribas `efeoncepro.com` como texto: va en su burbuja.
- No recolorees ni redibujes la burbuja de URL, el logo o el isotipo.
- No uses el teal claro como texto sobre blanco (no llega al contraste mínimo) ni el teal en piezas de Globe, Wave o
  Reach.
- No uses la órbita en la UI de Greenhouse ni en piezas de clientes.
- No copies HEX ni medidas de una captura o de este manual: tómalos de los tokens.
- No uses fotos de banco ni pongas un velo navy sobre la foto.
- No publiques el claim «Te hacemos visible» en pauta: está pendiente de revisión legal.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La burbuja de URL se ve **negra** en un PDF, en el correo o en un visor | la fusión de luminosidad (`mix-blend-mode`) no se aplica en ese visor, o el color del trazo venía en un bloque de estilos que el visor descartó | usa la variante horneada: `url-lum-light.svg` sobre blanco o papel, `url-lum-dark.svg` sobre navy; ambas llevan el color como atributo del trazo |
| Un texto **cruza la órbita** | el copy es largo o la órbita quedó centrada | mueve la órbita hacia la derecha y arriba, reduce el copy o cambia de formato; nunca pongas la órbita detrás del texto |
| La lente «se nota como truco» | la foto no tiene un punto de interés claro | cambia la foto por una del banco o produce una toma nueva con el sujeto dentro del círculo |
| La foto muestra un logo en la ropa | la toma trae un emblema legible | usa otra toma del banco o regenera; el logo lo pone la pieza, no la ropa |
| La órbita se ve demasiado fina en un post | se usaron los grosores de pantalla grande | aplica la variante para redes de los tokens (grosores ×1,75 en lienzos de hasta 1200 px) |
| La esfera no se ve sobre papel | se usó el teal claro sobre fondo claro | usa el teal oscuro del contexto papel |
| El PDF no se regenera y dice `Input file is missing` o `ENOENT` | faltan archivos locales del taller en `exploracion-v5/` (las láminas del anexo no están versionadas) | genera el PDF desde el equipo que tiene el taller o pide esos archivos; no los reemplaces por capturas nuevas sin revisarlas |
| El PDF no se regenera y dice «imágenes rotas» | una imagen referida en la fuente HTML no cargó | revisa las rutas de imagen de `linea-grafica-efeonce.src.html` y de los assets del renderer |
| El PDF sale con «Desborde» | algún bloque de la fuente HTML no cabe en su hoja | acorta o divide el bloque en `linea-grafica-efeonce.src.html` y vuelve a correr |

## Referencias técnicas

- Manual técnico-operativo (fuente de verdad): [`docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)
- Decisión: [`docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)
- Índice de la carpeta: [`docs/operations/brand-graphic-line/README.md`](../../operations/brand-graphic-line/README.md)
- Referencia viva en AXIS: [axis.efeonce.org/references/graphic-line](https://axis.efeonce.org/references/graphic-line) · tokens `efeonceGraphicLine` en `@efeoncepro/axis-tokens` (repo `efeoncepro/axis-design-system`)
- Renderer del PDF: [`scripts/documents/render-efeonce-graphic-line.mjs`](../../../scripts/documents/render-efeonce-graphic-line.mjs)
- Lenguaje fotográfico: [`docs/operations/brand-photography/README.md`](../../operations/brand-photography/README.md)
- Banco de la lente: `ai-generations/2026-09-25_banco-lente-orbita/LEEME.md`
- Canvas de trabajo (privado): [Línea gráfica Efeonce](https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii)
