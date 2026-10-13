# Armar una propuesta técnica SEO/AEO para leer sin presentador

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-07 por Claude (con Julio Reyes)
> **Ultima actualizacion:** 2026-10-08 por Claude
> **Documentacion funcional:** [Composición por superficie — §4.6 Deck](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck)
> **Documentacion tecnica:** [deck-studio — propuesta técnica SEO/AEO sin presentador](../../../.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md)
> **Caso fuente:** propuesta técnica Pibank (Banco Pichincha Perú) 2027, v11 — 46 láminas, línea Engine

## Para qué sirve

Armar una **propuesta técnica SEO/AEO que el cliente lee sin nosotros** (comité, gerencia, compras) y que se entiende
sola: diagnóstico real, plan, medición, responsabilidades, inversión y supuestos, en un PDF 16:9.

Es una **alternativa aprobada por el CEO el 2026-10-07**, no un reemplazo. Para brochures y propuestas de práctica
siguen mandando las recetas de La órbita (`pnpm brand:compose`). Usa este estilo cuando la pieza tiene que **explicar**;
si tiene que **presentar la práctica**, usa el brochure o la propuesta de recetas.

El resultado es un híbrido sobre un canvas Design:

- **Láminas a mano en HTML con tokens** para todo lo que lleva datos del cliente (búsqueda real, demanda,
  diagnóstico, cadena, frentes, calendario, meta, inversión, supuestos).
- **Láminas del compositor** para lo que ya tiene receta (portada, ciclo, métricas, equipo, diferencia, clientes,
  E-E-A-T, reporte, cierre), que entran como imagen.
- **Láminas importadas** de decks ya aprobados (casos, países, día a día), llevadas a un solo acento.

## Antes de empezar

- **Contenido decidido.** Necesitas el diagnóstico con fuentes y fecha, la demanda, el plan, la medición, el equipo y
  el precio cerrado comercialmente. Las cifras salen de evidencia real, nunca de memoria.
- **Línea de servicio de la pieza.** Define el acento (en Pibank, Engine). Anillo y esfera toman el acento de la línea.
- **Un canvas Design privado** con una página para la propuesta, y su carpeta local del proyecto (la que trabaja
  `build-tecnica.py`).
- **Repo al día** con Playwright, `sharp` y `pdf-lib` instalados (`pnpm install`).
- **Lee la referencia de método** de la skill `deck-studio`
  ([propuesta-tecnica-seo-sin-presentador.md](../../../.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md))
  y la norma del deck ([§4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck)).
- **Regla dura:** margen, costos internos, horas y salarios **nunca** entran en material de cliente.

## Paso a paso

### 1. Copia el molde

Copia la carpeta de producción del caso fuente como punto de partida:

```bash
cp -R ai-generations/2026-10-07_pibank-propuesta ai-generations/<AAAA-MM-DD>_<cliente>-propuesta
```

Lo que reutilizas:

| Archivo | Para qué |
|---|---|
| `build-tecnica.py` | Generador de las láminas `Tec-NN.dc.html` y del índice del canvas. Helpers `page`, `eyebrow` (con anillo de La órbita), `headline` (con esfera), `means` (franja «Qué significa para <cliente>»), `obj`, `halo_platform`. |
| `axis-assets.mjs` → `axis-assets.json` | Navegación de capítulo, medida e íconos Trazo desde AXIS. |
| `paint-selection.mjs` | Pinta la selección colaborativa canónica sobre el elemento marcado con `data-gl-sel`. |
| `borrar-seleccion.mjs`, `quitar-seleccion-portada.mjs` | Quitan la selección que algunas recetas pintan siempre. |
| `teal2engine.cjs` | Lleva el turquesa de una imagen al acento Engine. |
| `render-pdf.mjs` | Renderiza las láminas con imágenes locales y arma el PDF 16:9. |

Borra del molde las imágenes, fichas y logos de Pibank: no se reutilizan. Las imágenes quedan fuera de git.

### 2. Escribe la columna narrativa antes de tocar una lámina

Es lo que hace que la propuesta se entienda sin presentador:

1. **Cinco capítulos, una pregunta cada uno.** En Pibank: «¿Dónde está hoy en la búsqueda?», «¿Cómo se vuelve la
   respuesta?», «¿Cómo sabremos que funciona?», «¿Quién lo hace y por qué nosotros?», «¿Cuánto cuesta y cómo seguimos?».
2. Una lámina **«Cómo leer esta propuesta»** y navegación de capítulo con la órbita en cada lámina.
3. **Cada título afirma su conclusión.** Cada lámina con datos cierra con la franja «Qué significa para <cliente>» y su
   fuente.
4. **Equilibrio SEO/AEO y negocio:** la cadena búsqueda → cuenta (Aparecer → Ser elegido → Convencer → Abrir/convertir),
   cada eslabón con su métrica propia; la meta de negocio aparece al final de la cadena, no como protagonista. El
   resumen muestra dos tableros: visibilidad y negocio.
5. **«Lo que veremos moverse, en orden»:** señales observables por etapa, sin garantizarlas.
6. **Economía** como inversión mes a mes y costo por resultado en escenarios aritméticos, sin prometer volumen.
7. **Anexos al final:** supuestos y fuentes (incluido «Qué no se garantiza») y glosario. Los supuestos van ahí, no
   repartidos en advertencias por lámina.

### 2b. Si el cliente pide una estimación de impacto, entrégala en la propuesta

Caso Pibank (correo del banco del 07-10): el cliente pidió qué habría aportado el programa desde enero de 2026.

1. Las cifras salen del modelo del caso, con sus supuestos autorizados por el operador (Pibank:
   `reconstruccion-2027/estimacion-seo-aeo-2026-10-08/`). Nunca se inventan en la lámina.
2. Una lámina de **evaluación**: el escenario central en grande, la curva por trimestre y los tres escenarios, con
   «ejercicio hipotético, no pronóstico» junto a la cifra.
3. Una lámina de **conexión con la meta**: aporte directo más mejora de conversión por cada 100.000 visitas de otros
   canales, la fila que resuelve la meta y el tráfico requerido rotulado como requisito, no predicción.
4. El mes 1 **calibra** esa estimación con los primeros datos; no la difiere.
5. En el equipo, sólo nombres confirmados por el operador; el resto, «por asignar antes del inicio».

### 3. Compón las láminas que tienen receta

Escribe los intents del compositor junto al caso del prospecto (en Pibank,
`docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/deck-propuesta/`, por ejemplo
`pibank-tecnica-composer-document.json` y `pibank-v9-document.json`). Cada intent declara el contrato
`efeonce.surface-composition`, `surface: deck`, la línea, `use: proposal` y una página por receta con su voz
(eyebrow, pregunta, respuesta).

Recetas que usó el caso fuente: `cover-proposal`, `method-surround-cycle`, `content-measure-formulas` (negocio y
SEO/AEO), `content-team`, `decision-difference`, `content-clients`, `method-eeat`, `content-day-live-results` y
`close-proposal`.

```bash
pnpm brand:compose -- --intent <intent.json> --out <carpeta de salida>
```

Después de componer, corrige en post lo que la receta todavía no resuelve (ver «Problemas comunes»):

- Quita la selección que pintan siempre `cover-proposal`, `content-team` y `content-clients`:

  ```bash
  node ai-generations/<carpeta>/borrar-seleccion.mjs <entrada.png> <salida.png> <x0,y0,x1,y1 aproximado del recuadro>
  ```

  Para la portada usa `quitar-seleccion-portada.mjs`.
- Si la línea es Engine, pasa `method-eeat` y `content-day-live-results` por `teal2engine.cjs` (pintan realces en
  turquesa).
- Si una lámina lleva el lockup de una submarca (por ejemplo Insights en el reporte mensual), superponlo en post: no es
  campo del intent.

### 4. Sube los assets al canvas

Cada imagen (láminas compuestas, importadas, fotos, logos) se sube al almacén de assets del canvas y queda servida como
`/_blob/<id>`. Anota cada id en el mapa de imágenes de `build-tecnica.py` (`IMG`) o donde la lámina lo referencie.

Luego genera las láminas a mano y pinta la selección canónica:

```bash
python3 ai-generations/<carpeta>/build-tecnica.py <carpeta project del canvas>
node ai-generations/<carpeta>/paint-selection.mjs <carpeta project del canvas>
```

Publica la carpeta al canvas y revisa la página completa en el navegador.

### 5. Importa láminas de decks aprobados y llévalas a un acento

Las láminas de casos, países o «tu día a día» se toman de un deck ya aprobado (en Pibank, del deck SEO/AEO:
`ai-generations/2026-09-29_deck-seo-aeo-documentos/out/slides/completo/`, láminas 19, 20, 25, 26, 28 y 29) y entran
como imagen. Para que la propuesta tenga **un solo acento**:

```bash
node ai-generations/<carpeta>/teal2engine.cjs <entrada.png> <salida.png>
```

El script corre los tonos turquesa (155–192°) a 208°: está hecho para Engine. En los casos importados, esfera y anillo
eran turquesa; después de correrlo, mira cada foto al 100 % para confirmar que no tiñó piel ni fondos.

### 6. Cuida el ritmo

Alterna láminas azules con las de foto del set aprobado (secciones partidas y láminas con persona). Ninguna racha larga
de láminas de texto.

### 7. Renderiza el PDF

1. Baja cada `/_blob/<id>` del canvas a una carpeta local con Artifact `read` y `path=<id>`, **de a uno** (en lote con
   `paths` falla).
2. Ajusta en `render-pdf.mjs` el título y el autor del PDF (el molde dice Pibank).
3. Desde la raíz del repo:

   ```bash
   node ai-generations/<carpeta>/render-pdf.mjs <carpeta project del canvas> <carpeta de blobs> <salida.pdf>
   ```

El script toma las láminas `Tec-NN.dc.html` en orden, reemplaza cada `/_blob/<id>` por el archivo local, captura a
1920 × 1080 y arma el PDF 16:9. Sin PowerPoint.

### 8. Revisa al 100 %

Abre el PDF y recorre **cada lámina al 100 %**, no en miniatura. Busca texto fuera de tarjeta, selecciones o cursores
residuales, restos de turquesa, fotos teñidas, cifras sin fuente y títulos que no afirman nada.

### 9. Checklist antes de enviar

- [ ] Ninguna lámina muestra margen, costos internos, horas ni salarios.
- [ ] Cada cifra tiene fuente y fecha; los supuestos están en el anexo.
- [ ] La propuesta muestra SEO y AEO con su métrica propia, no solo la meta de negocio.
- [ ] Cifras y logos de casos importados tienen OK explícito **para esta pieza** (la decisión de otro deck no se
  extiende) y los logos están autorizados (TASK-1937).
- [ ] No se prometen formatos que no estén operando (por ejemplo, el correo de Insights o el modo presentación).
- [ ] Si es licitación formal, revisaste si aplica `pnpm tender:canonical-gate` (Proposal Studio).
- [ ] Equipo y foto de cierre confirmados por el operador.
- [ ] El operador aprobó la pieza. Nada se envía ni se mueve a la carpeta de envío del caso sin esa aprobación.

## Qué significan los estados y señales

| Señal | Qué significa | Qué hacer |
|---|---|---|
| `pages N` al terminar `render-pdf.mjs` | El PDF se armó con N láminas | Compara N con las láminas del canvas |
| `missing <id>` en `render-pdf.mjs` | Una lámina referencia un `/_blob/<id>` que no está en la carpeta de blobs | Baja ese asset con Artifact `read` y `path=<id>` y vuelve a correr |
| `recolored px N` en `teal2engine.cjs` | Cuántos píxeles turquesa pasó al acento | N = 0 en una lámina con turquesa visible: revisa la entrada |
| Recuadro punteado con manijas y cursor en portada, equipo o clientes | La receta pinta la selección aunque no la pidas | Bórrala en post (paso 3) |
| Texto fuera de una tarjeta | El compositor no agranda la tarjeta | Acorta el texto y vuelve a componer |

## Qué no hacer

- **No usar este estilo para un brochure** ni para presentar la práctica: ahí mandan las recetas de La órbita.
- **No incluir margen, costos internos, horas ni salarios.**
- **No escribir copy adulador ni de auto-justificación** («proponemos que nos mida con esta vara»), frases de relleno ni
  preguntas y respuestas absurdas.
- **No dedicar una lámina a una cifra pequeña** ni armar una lámina de riesgos que responde objeciones que nadie planteó.
- **No poner cursores o selecciones que no dicen nada** (un cursor con el nombre del cliente apuntando a su propio logo).
- **No centrar el relato solo en la meta de negocio:** una propuesta SEO/AEO tiene que mostrar SEO y AEO.
- **No tomar los íconos 3D del ciclo de Pibank como canon:** se generaron a pedido para esa pieza y no son Plastilina.
- **No enviar ni mover nada a la carpeta de envío** sin aprobación del operador.

## Problemas comunes

| Problema | Causa | Solución |
|---|---|---|
| La selección sigue en la portada, el equipo o los clientes | `cover-proposal`, `content-team` y `content-clients` la pintan siempre: `selection: false` no la apaga, `null` rompe la composición y `"none"` es inválido | Bórrala en post con `borrar-seleccion.mjs` o `quitar-seleccion-portada.mjs`. Pendiente de corregir en la receta |
| «Dueño · Efeonce» queda fuera de la tarjeta en `content-measure-formulas` | Una fórmula de tres líneas desborda: la tarjeta no crece con el texto | Mantén cada fórmula en dos líneas y mira la lámina al 100 % |
| La respuesta corta se desborda | La receta limita la respuesta a unos 15 caracteres porque a 150 px no cabe más | Busca una respuesta más corta; no es un límite arbitrario |
| Realces turquesa en `method-eeat` o `content-day-live-results` con línea Engine | Esas recetas usan la tinta del anillo | Pásalas por `teal2engine.cjs` |
| No encuentras dónde poner el lockup de submarca | `productMark` no es campo del intent | Superponlo en post (en Pibank, Insights a (140, 44) con 40 px de alto) |
| La descarga de assets falla | Artifact `read` con `paths` en lote | Baja cada asset de a uno con `path=<id>` |

## Referencias técnicas

- Método y reglas del estilo: [`.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md`](../../../.claude/skills/deck-studio/references/propuesta-tecnica-seo-sin-presentador.md)
- Norma del deck: [`EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck)
- Catálogo de recetas: [`deck-recipes/README.md`](../../operations/brand-graphic-line/deck-recipes/README.md)
- Carpeta del caso fuente: `ai-generations/2026-10-07_pibank-propuesta/` (`LEEME.md`)
- Intents del caso fuente: `docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/deck-propuesta/`
- Compositor: `pnpm brand:compose` (`scripts/brand-surfaces/compose.ts`)
- Gate de licitaciones: `pnpm tender:canonical-gate` (`scripts/commercial/canonical-tender-gate.mjs`)
- Manuales vecinos: [Componer el deck de una licitación](componer-deck-de-licitacion.md) ·
  [Construir un caso de negocio SEO/AEO](construir-caso-negocio-seo-aeo.md)
