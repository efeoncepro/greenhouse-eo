# Sistema visual editorial agéntico

Este contrato gobierna la planificación, generación, selección, derivación, integración y verificación de imágenes para artículos, pillars, ebooks y piezas editoriales relacionadas. La secuencia es obligatoria:

> **Primero define la función contextual de cada imagen. Después diseña un sistema visual coherente para el conjunto.**

No partir de un estilo, una herramienta o una cantidad de imágenes. Una imagen existe porque resuelve una comprensión que el texto obliga a imaginar; el sistema común evita que esas respuestas parezcan assets aislados.

## Contenido

- [Frontera y routing](#1-frontera-y-routing)
- [Intake visual mínimo](#2-intake-visual-mínimo)
- [Flujo obligatorio](#3-flujo-obligatorio): función contextual, manifest, sistema, prompts, selección, verdad, derivados, metadata, Media Library y verificación.
- [Gates de calidad](#4-gates-de-calidad)
- [Anti-patrones](#5-anti-patrones)
- [Artefactos obligatorios](#6-artefactos-obligatorios)
- [Definition of Done](#7-definition-of-done)

## 1. Frontera y routing

Content Marketing Studio es dueño de:

- el trabajo editorial de cada imagen;
- el mapa de slots y placements;
- los concept IDs y el manifest;
- la continuidad del sistema;
- los gates de selección, accesibilidad e integración;
- la evidencia de Media Library y verificación pública.

Encadenar el craft visual a `greenhouse-ai-image-generator`, `imagegen` o `design-studio`, según el runtime y el tipo de asset. Encadenar publicación a la skill del CMS o sitio. No crear un cliente de imagen, uploader o flujo de publicación paralelo.

## 2. Intake visual mínimo

Antes de proponer conceptos, reunir:

- artículo/spec vigente, tesis, audiencia, objetivo y estado de publicación;
- fragmento exacto al que serviría cada imagen y comprensión que debe acelerar;
- superficie: hero/featured, body, social, OG, email, deck u otro derivado;
- comportamiento real del tema/CMS para featured images y cuerpo;
- restricciones de marca, personas, clientes, derechos, disclosure y territorios;
- tamaños/crops requeridos y presupuesto de peso/performance;
- herramienta canónica de generación, publicación y medición disponible.

Si falta el contrato editorial, no generar. Si el template o el uso de featured no está verificado, marcarlo como supuesto y resolverlo antes de integrar.

## 3. Flujo obligatorio

### Paso 1: mapear funciones contextuales

Crear un **visual job map** antes de hablar de estética. Por cada slot declarar:

| Campo | Pregunta |
|---|---|
| `conceptId` | ¿Cuál es su ID estable y trazable? |
| `slot` | ¿Hero/featured, cuerpo, diagrama, evidencia, cierre, social? |
| `context` | ¿Después de qué idea o dentro de qué sección vive? |
| `function` | ¿Qué debe permitir entender en tres segundos? |
| `notFunction` | ¿Qué no debe insinuar o probar? |
| `placement` | ¿Featured, body, OG, social o combinación explícita? |
| `successSignal` | ¿Qué relación debe reconocer una persona sin leer labels? |
| `discardRule` | ¿Qué fallo conceptual obliga a rechazarla? |

Usar imágenes para explicar tensión, interfaz, mecanismo, secuencia, comparación, evidencia autorizada o continuidad. No agregar una imagen solo porque una sección es larga. Una pieza decorativa debe declararse como tal y usar ALT vacío; no disfrazarla de contenido informativo.

### Paso 2: asignar concept IDs y abrir el manifest

Asignar IDs estables antes de generar, por ejemplo `ART-V01`, `ART-V02`. El ID representa el **concepto/slot**, no un archivo. Las iteraciones son candidatos del mismo concepto: `ART-V01-C01`, `ART-V01-C02`.

Abrir un manifest desde el inicio y actualizarlo durante todo el flujo. Debe registrar como mínimo:

```json
{
  "runId": "YYYY-MM-DD_article-slug",
  "article": { "slug": "article-slug", "sourceRef": "spec-or-url" },
  "visualSystem": {
    "name": "concept-name",
    "motif": "recurring motif",
    "invariants": ["invariant one"],
    "forbidden": ["forbidden claim or visual code"]
  },
  "assets": [
    {
      "conceptId": "ART-V01",
      "slot": "hero",
      "function": "contextual job",
      "placement": { "featured": true, "body": false, "og": true },
      "prompt": "verbatim generation prompt",
      "generation": {
        "provider": "openai",
        "model": "gpt-image-2",
        "requestRef": "provider request reference",
        "generatedAt": "ISO-8601"
      },
      "master": {
        "path": "path/to/master.png",
        "sha256": "hash",
        "width": 1536,
        "height": 1024,
        "mime": "image/png",
        "colorSpace": "sRGB"
      },
      "derivatives": [],
      "metadata": { "alt": "", "caption": "", "description": "" },
      "rights": {
        "sourceAssets": [],
        "license": "generated-or-licensed",
        "provenance": "lineage summary",
        "disclosure": "required disclosure or none with reason"
      },
      "qa": {
        "status": "selected",
        "reviewedAtOriginalResolution": true,
        "findings": []
      },
      "media": { "id": null, "url": null, "mime": null }
    }
  ]
}
```

No inventar request refs, hashes, dimensiones, URLs ni Media IDs. Usar `null`/`pending` hasta obtener evidencia real. Conservar candidatos rechazados con estado y motivo; no sobrescribir lineage.

### Paso 3: diseñar el sistema visual

Solo después del job map, definir un sistema que permita reconocer la serie:

- concepto maestro y tesis visual en una frase;
- motivo recurrente no confundible con un logo;
- lenguaje/medio: fotografía, collage, diagrama, ilustración u otro;
- composición: foco, lectura, safe area, espacio negativo y crop strategy;
- paleta con contraste y función, sin convertir colores raster en tokens de UI;
- textura, materiales, iluminación y tratamiento de personas;
- invariantes que deben sobrevivir entre imágenes y derivados;
- lista de exclusión visual y de afirmaciones prohibidas.

La continuidad debe depender de invariantes controlables: motivo, geometría, materialidad, paleta, foco y lógica compositiva. No exigir identidad perfecta de una persona generada salvo que exista un workflow de referencia/edición diseñado y autorizado para ello.

### Paso 4: escribir prompts rigurosos para GPT Image 2

Guardar cada prompt **verbatim** en el manifest. Un prompt operativo debe declarar, en este orden:

```text
Use case: [photorealistic-natural | stylized-concept | infographic-diagram | editorial-storyboard]
Asset type: [featured editorial image / in-article image / text-free diagram / social derivative source]
Primary request: [una función contextual, no una lista de objetos]
Scene/backdrop: [entorno y límites]
Subject/action: [quién o qué hace qué]
Recurring motif: [repetir literalmente el motivo común]
Style/medium: [lenguaje material y acabado]
Composition/framing: [master, safe area, foco, lectura y crop]
Lighting/mood: [calidad de luz y tono]
Text: [ninguno o tratamiento autorizado]
Constraints: [integridad, verdad editorial, marca, anatomía, objetos]
Avoid: [fallos semánticos y códigos visuales prohibidos]
```

Reglas de prompt:

- describir una relación visual verificable, no pedir “algo creativo”;
- repetir los invariantes centrales en cada prompt; no confiar en memoria del modelo;
- pedir un solo foco primario y una jerarquía clara;
- proteger una safe area que sobreviva a `16:9`, `1200×630` o el crop requerido;
- pedir `no readable text` cuando el texto no sea esencial;
- no pedir al modelo que reproduzca un logo exacto; componer luego el asset oficial si está autorizado;
- no usar texto generado para cifras, citas, labels, diagramas científicos o claims;
- no nombrar artistas vivos como atajo de estilo;
- usar la herramienta canónica y registrar modelo/configuración real, sin llamadas ad hoc.

GPT Image 2 produce raster. Generar un master suficientemente grande para los derivados previstos; no prometer vector, transparencia o fidelidad exacta que el runtime no soporte. Si se usa una referencia visual, registrar su licencia y revisar drift de identidad, marca y composición.

**Diagramas con texto:** componer labels, cifras y claims con tipografía determinista. La IA puede producir una
base conceptual sin texto, pero no debe decidir ni rasterizar contenido que necesita exactitud. Un diagrama
puede producirse completamente en HTML/CSS, canvas o herramienta de diseño gobernada y luego capturarse como
raster; registrar fuente, renderer, fonts, hash y versión igual que cualquier master.

### Paso 5: generar, seleccionar y auditar masters

Generar por concept ID, no como una bolsa anónima de imágenes. Seleccionar en dos pasadas:

1. **Contacto/miniatura:** función, foco y legibilidad global.
2. **Resolución original, 100% o superior:** anatomía, ojos, manos, objetos, reflejos, bordes, texto residual, logos, marcas, patrones repetidos y artefactos.

No aprobar desde una thumbnail, un screenshot del chat o un derivado comprimido. Conservar el master original en PNG sRGB, sin recomprimir ni renombrar de forma que pierda lineage. Registrar hash SHA-256, dimensiones, peso, prompt, modelo, fecha y status.

Estados permitidos:

- `selected`: pasa concepto e integridad;
- `needs_edit`: el concepto funciona y solo requiere crop, color, limpieza o compresión dirigida;
- `rejected`: falla verdad, función, continuidad o integridad;
- `superseded`: fue aprobado, pero otro candidato lo reemplazó conservando lineage.

Una imagen que falla concepto o verdad editorial se regenera. Postproceso solo puede corregir crop, color, peso o defectos localizados sin alterar el significado.

### Paso 6: proteger la verdad editorial

Tratar toda imagen generada como **conceptual** salvo evidencia y permisos verificables. Rechazar cualquier pieza que pueda leerse como:

- captura real de un producto que no existe o no se inspeccionó;
- dashboard, resultado, métrica o UI productiva fabricada;
- experimento, mecanismo médico/científico o visualización de datos real;
- trabajo, campaña, testimonio o caso de un cliente sin autorización;
- uso válido de una marca, persona, obra o dataset sin derechos;
- prueba de eficacia, adopción o resultado comercial.

Cuando una ilustración conceptual pueda confundirse con evidencia, corregir composición/caption o agregar disclosure explícito. No resolver ambigüedad solo en metadata invisible.

### Paso 7: crear derivados sin degradar el master

Derivar siempre desde el master seleccionado. No encadenar compresiones desde otro derivado.

Entregables recomendados por asset informativo:

- master PNG original en sRGB;
- body WebP a `1600px` o `1440px` de ancho, manteniendo proporción útil;
- fallback WebP de `1200px` cuando el runtime lo necesite;
- JPEG social cuando la plataforma/CMS tenga mejor compatibilidad que WebP;
- para hero: crop `16:9` y OG dedicado `1200×630` o equivalente de alta resolución `1440×757`;
- width/height, MIME, peso, hash y relación master→derivado en manifest.

`1200×630` y `1440×757` comparten aproximadamente la relación social `1.905:1`. Son alternativas de resolución, no dos crops obligatorios. Usar el tamaño que el runtime necesite y verificar la miniatura real. Nunca estirar: hacer crop dirigido desde el master, preservando foco, safe area, anatomía y motivo. No upscale si la fuente no sostiene la resolución.

Naming sugerido:

```text
{article}-{slot}-master-v1.png
{article}-{slot}-web-1600-v1.webp
{article}-{slot}-web-1200-v1.webp
{article}-hero-og-1200x630-v1.jpg
```

Versionar cuando cambie el contenido visual, crop o tratamiento; no reemplazar silenciosamente un archivo público bajo el mismo nombre si rompe caché o auditabilidad.

### Paso 8: escribir ALT, caption y descripción

Clasificar primero el asset:

- **Informativo:** ALT comunica la relación necesaria para comprender el argumento.
- **Decorativo:** `alt=""`; no rellenar con keywords.
- **Evidencia real:** ALT describe lo visible y caption/source explican provenance sin exagerar.

Contratos:

- **ALT:** conciso y funcional; no empezar por “imagen de”; no listar colores/estilo salvo que sean el significado; no repetir el caption.
- **Caption:** aporta lectura editorial, consecuencia o contexto; no describe mecánicamente todo el raster.
- **Descripción Media Library:** registra función, concept ID, sistema/campaña, generación o fuente, licencia/provenance, disclosure, autor/owner y restricciones de reutilización.

El filename, title, ALT, caption y descripción no cumplen la misma función. Completar los cinco cuando el CMS los soporte.

### Paso 9: integrar en Media Library y artículo

Subir solo derivados que pasaron QA. Después del upload:

1. registrar Media ID/attachment ID y URL reales;
2. leer de vuelta título, slug, ALT, caption, descripción, MIME, dimensiones y peso;
3. comprobar `HTTP 200` y que el contenido servido corresponde al archivo esperado;
4. mapear cada concept ID a su placement real: featured, body, OG/social, schema o combinación;
5. integrar IDs, no URLs sueltas, cuando el contrato del CMS lo requiera;
6. validar la spec/draft antes de cualquier write y separar generación de publicación.

**Hero/featured no equivale a bloque de cuerpo.** El hero no necesariamente se inserta en el body si el tema ya lo usa como featured. Verificar el comportamiento real del template: si ya lo muestra en la superficie hero, duplicarlo en el body es un error; si solo lo usa como metadata/OG, insertarlo en cuerpo sigue siendo una decisión editorial explícita, no un default. Registrar `featured`, `body` y `og` por separado en el manifest.

### Paso 10: verificar performance y superficie pública

Antes de declarar cierre:

- inspeccionar desktop y mobile reales, incluido el crop social/featured;
- inspeccionar cada diagrama textual al `100%` de su raster original antes del runtime: ningún conector debe
  cruzar copy, listas, cifras u ordinales salvo que esa superposición sea el significado deliberado; todos los
  labels deben estar completos y sin clipping; tarjetas/divisores no deben colisionar; y la puntuación display
  debe leerse sin ligaduras visuales accidentales;
- revisar el asset dentro del chrome real del tema: sidebars, share rails, widgets sticky/Next Post y overlays
  también forman parte de la safe area;
- confirmar imágenes de cuerpo, featured y OG esperados, sin duplicados ni placeholders;
- comprobar URLs públicas `200`, MIME, dimensiones y archivo correcto;
- validar `srcset`/`sizes`, width/height o aspect ratio estable, lazy loading de body y prioridad del hero según runtime;
- revisar peso, compresión, nitidez, banding, halos y color después de conversión;
- comprobar que el hero no provoque LCP evitable y que no haya CLS por dimensiones faltantes;
- verificar ALT en DOM, captions visibles cuando correspondan y metadata social/schema;
- revisar overflow horizontal y render en viewport móvil, no solo captura `fullPage`;
- si labels horizontales quedan pequeños en mobile, mantener ALT/caption autosuficientes y enlazar al raster
  completo o producir una variante responsive gobernada;
- repetir readback después de publicar o cambiar featured/OG.

El QA standalone y el QA live son complementarios. La safe area del tema no prueba la composición interna del
raster, y un raster limpio no prueba su convivencia con el theme chrome. Ambos deben pasar por separado.

Una validación local o `dry-run` no prueba Media Library ni render público. Si falta publicación o readback live, cerrar como `code/content complete; rollout verification pending`.

## 4. Gates de calidad

| Gate | Evidencia | Bloquea si |
|---|---|---|
| `G0 Editorial truth` | tesis, contexto, límites y claims permitidos | simula producto, ciencia, datos o cliente |
| `G1 Contextual function` | visual job map + criterio de tres segundos | la imagen solo decora o repite el texto |
| `G2 Visual system` | concepto, motivo, invariantes, crops y exclusiones | los assets no forman una serie reconocible |
| `G3 Prompt provenance` | prompt verbatim + modelo/config + concept ID | no se puede reproducir/auditar la intención |
| `G4 Original-resolution QA` | master inspeccionado + hash + findings | hay anatomía, texto, logos o artefactos dudosos |
| `G5 Derivatives/accessibility` | WebP/JPEG, tamaños, ALT/caption/description | crop, peso o metadata degradan comprensión/uso |
| `G6 Media integration` | IDs y readback reales + placement map | IDs inventados, URLs rotas o hero duplicado |
| `G7 Public verification` | desktop/mobile + HTTP/OG/performance | render, metadata o archivos públicos no coinciden |

Veredictos: `PASS`, `CONDITIONAL PASS` o `BLOCK`. Un gate bloqueado no se compensa con una buena estética.

## 5. Anti-patrones

- Elegir un “look” antes de saber qué trabajo cumple cada imagen.
- Generar N assets y buscarles función después.
- Usar una imagen por sección por simetría o para llenar espacio.
- Aprobar desde miniatura sin revisar el master original.
- Mantener solo el WebP/JPEG y perder el master, prompt o hash.
- Estirar el hero para OG o recortar manos, foco y motivo sin revisión.
- Pedir texto, cifras, logos o interfaces exactas al generador y tratarlos como confiables.
- Presentar arte conceptual como screenshot de producto, prueba científica o caso cliente.
- Usar estilo/color como única continuidad sin un motivo o lógica compositiva.
- Inventar Media IDs, URLs, métricas, licencias o request IDs.
- Usar el mismo texto para title, ALT, caption y descripción.
- Insertar el hero en body por reflejo cuando ya vive como featured.
- Subir assets antes del gate de integridad o publicar sin readback.
- Optimizar peso degradando legibilidad, piel, texto permitido o bordes.
- Omitir disclosure o derechos porque la imagen fue generada con IA.

## 6. Artefactos obligatorios

1. **Visual job map** con función, contexto, placement y discard rule por concept ID.
2. **Visual system brief** con concepto maestro, motivo, invariantes y prohibiciones.
3. **Prompt sheet** o prompts verbatim dentro del manifest.
4. **Manifest versionado** con candidates, masters, hashes, derivados, QA, rights y Media IDs.
5. **Masters originales** y derivados WebP/JPEG trazables.
6. **Matriz de selección/QA** con veredicto a resolución original.
7. **Metadata sheet**: filename, title, ALT, caption, descripción y disclosure.
8. **Media registry** con attachment IDs, URLs, MIME, dimensiones y uso.
9. **Placement map** featured vs body vs OG/social/schema.
10. **Reporte de verificación pública** con desktop/mobile, HTTP, metadata y performance.

## 7. Definition of Done

- [ ] Cada imagen tiene concept ID, función contextual y criterio de descarte antes de generar.
- [ ] El conjunto comparte un sistema visual explícito sin sacrificar la función propia de cada asset.
- [ ] Prompts GPT Image 2, configuración, provenance y límites quedaron registrados.
- [ ] No se simula producto, ciencia, dato, cliente, testimonio ni resultado real.
- [ ] Cada master fue inspeccionado a resolución original y conserva hash/dimensiones/peso.
- [ ] Anatomía, texto, logos, objetos, reflejos y artefactos pasan QA.
- [ ] Derivados salen del master, respetan crop/resolución y tienen peso razonable.
- [ ] Hero/featured, body y OG están declarados por separado; no hay duplicación automática.
- [ ] ALT, caption, descripción, licencia, provenance y disclosure están completos según el caso.
- [ ] Media Library devolvió IDs/URLs/MIME/dimensiones reales y el readback coincide.
- [ ] Continuidad visual y legibilidad sobreviven body, mobile, card y social thumbnail.
- [ ] La superficie pública pasa desktop/mobile, `200`, metadata social, layout y performance.
- [ ] El estado final distingue producción cerrada, integración pendiente y publicación verificada.
