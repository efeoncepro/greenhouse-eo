# Preparar un AEO X-Ray para otro cliente

Estado: kit local reutilizable; el render compuesto y una muestra bancaria están publicados en Think. Conserva el X-Ray original: **La oportunidad → La pieza → La radiografía → Dónde más vive**, con landing y artículo, acoplamiento, derivados y motion. No crea otro sitio ni copia el caso Pichincha. Arquitectura: [composición y acceso](../architecture/EFEONCE_AEO_XRAY_COMPOSITION_AND_SHARING_DECISION_V1.md).

## Arranque

Desde `greenhouse-eo`, crea una carpeta nueva fuera del repositorio para el expediente y los medios:

```bash
node scripts/aeo-xray/client-kit.mjs init \
  --client "Nombre del cliente" --locale es-CL \
  --out "$HOME/Documents/X-Ray/nombre-cliente"
```

Genera `BRIEF.md`, `intent.json`, `assets.json` y `assets/`. Rechaza una carpeta existente para evitar sobrescribir trabajo. La plantilla versionada vive en `docs/think/templates/aeo-xray-client.intent.json`; no se debe partir de un manifest congelado ni reemplazar nombres sobre el caso bancario.

## Completar el caso

1. **Contexto y ángulo.** Sitio oficial, país, idioma, producto real, objetivo y público. Recuperar CRM/memoria sólo para investigación; no trasladar notas internas al payload público. Acordar con el operador el ángulo editorial. No heredar la autorización de gasto de otro caso.
2. **Referencia visual.** Inspeccionar el sitio y una captura de referencia. Definir color, tipografías licenciadas, logo, composición y encuadres. `brand` transporta los tokens; la nueva marca no tiene por qué parecerse a un banco. Revisar píxeles reales, no sólo tests.
3. **Investigación.** Guardar fuentes fechadas y snapshots por consulta, mercado, idioma y dispositivo. Con DataForSEO usar la CLI del repo y su skill. No inventar métricas ni convertir volumen en previsión de resultados. Verificar ofertas, condiciones y productos antes de escribir.
4. **Piezas.** Completar los dos `artifacts`: bloques, SEO, anotaciones y `experience`. El artículo tiene byline, banner, TOC, desarrollo, FAQ y fuentes; la landing explica la propuesta y el siguiente paso. `flow` conecta ambas.
5. **Radiografía y derivados.** Mantener IDs de bloques y `coupleId` para foco, inspector y regreso al origen. `experience.machine` debe coincidir con SEO, encabezados, ALT y schemas del contenido: AXIS rechaza drift. Cada anotación declara `block/page/site` y `proposed/implemented/verified/measured`. Una hipótesis nunca es una observación. Cada derivado identifica su bloque de origen; un guion no es un video producido.
6. **Medios.** Incorporar sólo imágenes revisadas y con procedencia documentada. No reutilizar personas, logos, permisos o aprobaciones del cliente anterior. Fotografías realistas requieren revisar piel, manos, textura, luz y contexto; no basta el prompt. No atribuir una relación comercial o testimonio a la persona retratada.

### Imágenes para preview local

En `intent.assets`, declarar ID lógico, referencia protegida, SHA-256 de bytes, dimensiones reales, ALT, crédito, sourceId y aprobación sólo después de revisarla. Añadir un bloque `image` con ese ID a cada pieza; `brand.logoAssetId` es opcional. No poner assets del cliente en `public/`.

`assets.json` mapea el **ID lógico `intent.assets[].id`** a un archivo relativo a `assets/`:

```json
{
  "hero-landing": "landing.webp",
  "hero-article": "article.webp",
  "client-logo": "brand/logo.png"
}
```

El loader local rechaza rutas que salen de esa carpeta. En producción los archivos se cargan por la API privada: los IDs, hashes y dimensiones devueltos sustituyen los valores locales antes de emitir la edición.

## Componer y ver

```bash
node scripts/aeo-xray/client-kit.mjs validate --dir "$HOME/Documents/X-Ray/nombre-cliente"
node scripts/aeo-xray/client-kit.mjs build --dir "$HOME/Documents/X-Ray/nombre-cliente" --draft
```

`validate` comprueba AXIS y devuelve código2 si quedan pendientes editoriales. `build --draft` permite ver una estructura incompleta; `build` sin ese flag rechaza marcadores pendientes, URLs example.com, ausencia de fuentes/banners o una experiencia faltante. Ninguno certifica contenido ni emite un grant. Una compilación fallida conserva el manifest anterior: no confundirlo con el intent nuevo.

Desde `efeonce-think`, consulta `pnpm exec astro dev status`. Astro reutiliza el servidor de este proyecto aunque pidas otro puerto: si está mostrando otro caso, termina primero esa sesión con `pnpm exec astro dev stop` cuando ya no se necesite. Después inicia con el expediente elegido:

```bash
XRAY_CASE_DIR="$HOME/Documents/X-Ray/nombre-cliente" pnpm dev --host 127.0.0.1 --port 4346
```

Abrir `http://127.0.0.1:4346/aeo-xray/r/fixture-client?artifact=landing&step=articulo`.
`fixture-client` es exclusivamente DEV, no una contraseña ni un enlace para enviar al cliente.

## Revisión y entrega

Recorrer los cuatro pasos de ambas piezas en desktop, tablet y móvil. Revisar cuerpo completo, tablas, TOC, FAQ, CTA, contraste, fotos, copy, foco, inspector, Escape, derivados, reduced-motion y sin JS. Comparar la captura de referencia con el render. Verificar ausencia de nombres, fuentes y claims del caso anterior. Pasar check/build y regresión legacy; los tests de Pichincha no sustituyen QA del nuevo contenido.

Para una demo pública no listada autorizada, usar el carril `sample_*` autónomo de Think descrito más abajo. Para crear la edición real y el enlace revocable gobernado (integración pendiente de release/canary), seguir [el manual de autoría y acceso](radiografia-aeo-manual.md#preparar-y-compartir-una-edición-nueva). Migración, assets privados, identidad del actor, flags, release y readback siguen siendo estados separados. La preparación local no autoriza publicación, envío de email ni escritura CRM.

## Pedido reutilizable para un agente

> Prepara un AEO X-Ray para [cliente] en [mercado/idioma], sobre [producto/tema], con objetivo [decisión]. Usa el kit de `docs/think/aeo-xray-nuevo-cliente.md`; investiga sus fuentes y referencia visual, conserva la experiencia original completa y entrega landing, artículo y derivados con radiografía. No reutilices datos ni aprobaciones de otro cliente. Deja preview local y evidencia de QA antes de compartir.

## Verificación del kit

`node --test scripts/aeo-xray/client-kit.test.mjs` prueba inicialización de otro cliente, cuatro pasos, ausencia de datos bancarios, protección contra sobrescritura, rechazo de pendientes y rechazo de drift SEO. Think mantiene pruebas específicas de carga genérica y aislamiento de medios. El kit no es un editor visual ni automatiza investigación o dirección de arte.


## Expediente de producción: checklist completo por cliente

| Archivo/carpeta fuera de Git | Contenido y revisión |
|---|---|
| `BRIEF.md` | JTBD, comprador, decisión, tema aprobado, mercado, idioma, restricciones, alcance y responsable |
| `intent.json` | Tokens de marca + landing/artículo + fuentes + anotaciones + experiencia por artefacto |
| `manifest.json` | Salida validada AXIS; no editar a mano ni usar como plantilla de un cliente nuevo |
| `assets.json`, `assets/` | ID lógico→archivo relativo; hash y dimensión reales; sólo raster soportado en preview |
| Research | Consulta exacta, proveedor, mercado, idioma, dispositivo cuando aplique, unidad, fecha y snapshot |
| Referencias | Sitio/capturas aprobadas, marcas oficiales, tipografía/licencia, perfil social y encuadres |
| Producción | Originales/editables y entregas diferenciados; prompts y costos autorizados; procedencia/derechos |
| QA/release | Capturas miradas, tests, SHA/deployment, lectura live, límites pendientes y próxima reverificación |

El kit inicia en modo `0700` y escribe documentos `0600`; no moverlo al repositorio para facilitar
imports. La lectura genérica verifica containment con `realpath`, rechaza traversal/symlinks que
escapan, extensiones no soportadas, mapa incompleto y hash incoherente. Vídeo y marcas SVG tienen
su distribución final revisada; no inventar soporte del loader de raster para archivos arbitrarios.

### Landing y artículo: criterios de aceptación editorial

- Hero y fotografía con contexto del cliente, contraste y reserva de texto reales.
- Landing con módulos suficientes: beneficios, condiciones, comparación cuando tiene sentido,
  proceso, documentos/confianza, preguntas y CTA. No entregar sólo un banner y cuerpo vacío.
- Artículo con respuesta inicial, narración útil, TOC, subpreguntas, tabla si aporta y dos banners
  contextuales cuando el encargo lo requiera; fuentes y CTA coherentes con el objetivo.
- Cada respuesta con alcance y condiciones: una tasa sin moneda/saldo/fecha no está completa.
- Fan-out de preguntas conectado por `coveredBy`, fuentes y anotaciones al bloque correcto.
- `experience.machine` coincide con SEO/ALT/encabezados/schema; estado y evidencia sin drift.
- Fuentes consultadas separadas de herramientas de research. DataForSEO no es fuente editorial
  de condiciones del producto; su snapshot y método permanecen en la investigación correspondiente.
- Social adaptado al formato/canal, no captura de la landing: feed/Story/video conservan un origen.
- Guion propuesto identificado como tal; si se encarga video, producir archivo playable/poster,
  verificar MIME y reproducción real, disclosure, duración, ratio y descarga.
- Identidad oficial, iconos semánticos, footer con atribución, ninguna nota interna en la lectura.
- Revisión del contenido completo y datos financieros por responsable; aprobación visual del operador.

## Elegir el carril antes de producir la entrega

**DEV:** `fixture-client`, nunca se envía. **Muestra autónoma:** `sample_*`, no listado pero público;
Think distribuye modelo y medios sin Greenhouse. **Gobernado:** `xrg_*`, previsto para contenido
privado, TTL/revocación e integración Greenhouse; necesita release y canary reales. No llamar a
una key `sample_*` «grant protegido», ni prometer revocación instantánea/expiración automática.

Para publicación autónoma autorizada:

1. Terminar `build` sin `--draft` y reverificar claims con fuentes vigentes.
2. Generar una clave aleatoria estable con prefijo `sample_` una vez. Registrar sólo en expediente
   y runtime; no copiar el enlace completo a Git, CRM interno no publicado o capturas compartidas.
3. Preparar `src/lib/aeo-xray/published/<cliente>.json` con `key`, `editionId`, `model` y mapa `assets`.
   Registrar import/entrada en `published.ts`. Conservar el modelo AXIS; no crear payload ad hoc.
4. Colocar sólo entregas autorizadas en `public/aeo-xray-media/<clave>/`, con IDs lógicos correctos.
   SVG oficial Efeonce proviene del paquete AXIS; no aproximar la marca ni copiar credenciales.
5. Ejecutar type-check/build/contratos/distribución; recorrer cuatro etapas y ambos artefactos en
   móvil y desktop, telón nuevo, deep links, no-JS, reduced-motion, video y estado activo del selector.
6. Commit explícito del alcance propio Think; push sólo autorizado. Leer deployment `READY`, SHA y
   alias. Probar URL y medios públicos tras el deploy; documentar rollback y retiro.
7. Retirar quitando registro y archivos, redeploy y readback. El render no consulta un switch central.

No promover Greenhouse para enviar la demo. Sus APIs, migración y controles sólo son pertinentes al
carril gobernado y tienen aceptación separada. Las muestras SKY existentes conservan `/muestras/`.

## Encargo reutilizable ampliado

> Extiende el X-Ray existente para [cliente], [mercado/idioma], [producto real] y [decisión del lector].
> Prepara expediente privado con investigación fechada y referencia visual aprobada; usa el kit AXIS,
> tokens de composición y enlace propio. Conserva La oportunidad/La pieza/La radiografía/Dónde más vive,
> acoplamiento, pregunta→respuesta→fuente y view transitions. Entrega landing completa, artículo con
> banners contextuales y derivados premium con origen; produce video sólo con autorización de gasto.
> Usa marcas oficiales y fotografías revisadas con procedencia. Separa investigación de fuentes del
> producto y propuesta de resultados medidos. Añade telón reutilizable por marca con accesibilidad y
> deep links. Verifica contenido, píxeles, playback y CSS compilada antes de publicar solamente Think,
> si esa publicación está autorizada. No copies datos ni permisos de otro cliente y no despliegues
> Greenhouse. Deja SHA, deployment, readback, límites y procedimiento de retiro en evidencia privada.
