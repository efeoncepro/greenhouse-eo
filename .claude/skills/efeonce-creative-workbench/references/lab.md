# Lab premium · operación para Codex y Claude

## Lab integrado y criterio vigente — 2026-10-01

**Acceso actual:** [visor sin login autorizado por el operador](../../../../docs/operations/creative-production/WORKBENCH_LAB_ACCESS_STATE.md).
Deployment actual y seis respuestas anónimas 200 verificados; la protección v6 siguiente es histórica.

PR17 integra selectores v6 en main `7e4c617`, encima de premium v5 (PR16) y componentes
autónomos (PR15). El contrato de superficies v5 y la mesa opción 2 siguen vigentes. El
[estado Greenhouse](../../../../docs/operations/creative-production/WORKBENCH_CURRENT_STATE.md)
y [continuidad](state-continuity.md) distinguen source, QA y publicación protegida. El corte
v6 conserva 29 archivos remotos cotejados y revisión de ambos menús en el alias Vercel;
`creative.efeonce.org` continúa como dominio previsto. Revalidar runtime antes de otra operación.

El Lab es el Design System de SKY como cliente de Efeonce dentro de un espacio multimarcas;
no tiene editor ni producción en el navegador. El header firma Efeonce | cliente, sin caption;
footer Efeonce, `Design System Lab` e información institucional. Bricolage/Poppins y tokens host
separados de Metric/colores/artwork SKY. Portada: «Design System / SKY Airline», CTA compacto
«Consultar composiciones» y acceso secundario «Ver adaptaciones». Consumir roles compilados
actuales: no reaplicar el padding/tamaño del primer CTA host histórico descrito más abajo.

Navegación principal de tres accesos: Composiciones, Adaptaciones, Sistema de marca, más Guía.
Shell lateral de bibliotecas; hasta 1050 px, menú compacto «Explorar bibliotecas». Cada tarea
puede tener panel y cada entidad con decisión propia una card; cuerpos, registros, fuentes y
metadatos internos quedan planos con reglas/espacio. **V5 supera la contención excesiva v4**.
No reintroducir un fondo/borde/radio por cada dato ni animar todas las cards al abrir details.

- Composiciones `#recetas`: 37 recetas reales, seis iniciales, búsqueda antes de paginar,
  detalle `RecipeDialog`, variantes de la misma receta y acceso profundo `#recipe-…`.
- Adaptaciones `#adaptaciones`: 126 formatos propios, imagen completa, búsqueda/familia,
  conteo/vacío/reset/Ver más y originales conservados. Familias usa `FilterSelect` host;
  el menú abierto también tiene presentación propia, con fallback nativo.
- Mesa `#pieza=<formatId>`: variantes a la izquierda, original proporcional en navy y
  zonas/campos a la derecha; móvil pieza primero y variantes horizontales. `#zonas` compatible.
  Volver restaura query, scroll y foco; no sustituir vínculos por destinos parecidos.
- Bibliotecas `/tokens/`, `/tipografia/`, `/recursos/` y `/lab-guide/`: rutas específicas,
  layouts host comunes. Tokens agrupa por familia con valor/copia/procedencia próximos
  y `FilterSelect` para colección, compartido con Adaptaciones.
  Metric ofrece cinco specimens SVG, nunca binaries; Recursos combina vectores y relaciones
  semánticas sin fingir que todos los componentes aparecen en todas las adaptaciones.
- Muestras `#composiciones`: cuatro corridas en la selección premium actual; no todas las recetas.
  IDs/counts son derivados del input del build, no una constante de seis muestras en UI.

Código principal adicional: `src/lib/review-model.ts`, `featured-artwork.ts`, `motion-model.ts`,
`src/components/RecipeDialog.astro`, `LabIcon.astro`, `LibraryCover.astro`, `ScrollComposition.astro`,
`src/scripts/motion.ts` y estilos premium/surfaces/review-shell/disclosures. Verificar paths en
el checkout antes de modificar; no cambiar el renderer SKY para resolver una card del host.

Motion GSAP 3.15.0 es un módulo host independiente: scroll normal, sin smoother/snap/loops,
full sólo >1050 px y altura >=650; demás calm/static. Reduced-motion reactivo revierte estilos
sin ocultar contenido. Coreografía en la escena original, no refresh global por cada disclosure.
Con HTML sin JS siguen las 37 recetas y 126 originales; sin ResizeObserver sigue grid natural.
Dialog/foco/Escape por capas y retorno al elemento visible son parte del contrato, no sólo QA visual.

Dos modos de referencia excluyentes: `--native-previews` recompone desde recursos propios;
`--reference-projection <site> --projection-sha256 <SHA>` consume proyección exacta admitida.
El segundo no importa ni ejecuta el engine archivado. Ambos conservan previews históricos,
catálogo/pack y muestras originales; sólo uno por build. Sin modo explícito, referencias históricas.
El manual Workbench contiene la selección `review-design-selection.json` y comando reproducible.

Checks v6: TS7, Astro 47 archivos sin diagnósticos, 17 pruebas Lab y cuatro gates; 16
recorridos de navegador separados de los tests. Build
`0b815c5e7ee07a56a24d24d1e4962ad378a235726325138105098daa250118e2`, 310 archivos,
cinco WOFF2 host OFL y cero fonts privadas; 298 archivos no UI byte-idénticos a v5.
Los 348/7 tests privados del harness/SKY son evidencia de integración v5, no una ejecución
privada nueva v6. CI postmerge v6 gates/native-harness/Lab PASS para el mismo main.
No atribuir aceptación visual ni approval comercial a esos resultados. Dueños en Workbench:
manual, `workbench-lab-navigation.md`, `design-qa.md`, dirección/QA
`workbench-surface-economy-v5` y `workbench-filter-selects-v6`. Los cortes históricos
inferiores conservan los hechos de su fecha y no sustituyen este estado.

## Extensión local: íconos SKY — 2026-10-01

La página `/iconos/` queda enlazada desde Recursos y sidebar del cliente; la
colección es candidata y no cambia los siete vectores permitidos por la biblioteca
anterior ni el pack. Reutiliza `FilterSelect` para kind/tamaño, filtro por nombre/ID,
24 iniciales/más/reset, SVG/Figma/selector y archivo de originales. Host Efeonce y
SVG SKY separados. HTML sin JS conserva familias y todas las variantes.
[Íconos](icons.md) conserva fuente, API/CLI, procedencia, admisión pendiente y QA
local; el deploy v6 anterior no acredita esta extensión ni se modifica por ella.

## Histórico: demostración productiva local — 2026-09-30

El Lab en `http://127.0.0.1:4194/` se recargó y comprobó con una captura real: muestra las
cuatro corridas de los nodos 2630, 2611, 4616 y 3378. El nodo 4616 se corrigió en la nueva
corrida `dc16001d-13d1-476f-8a82-b68321362f8b`, completada sin proveedor y con PNG nativo
limpio confirmado. La corrida defectuosa `fc4dfeeb-afe3-4ab3-9f9a-3bc4b3dfe850` se preservó
y excluyó de la selección. Los nombres visibles son «Sur · Cuadrado», «Sur · Retrato» (1080 × 1920),
«Vuela al sur · Banner» y «Sur · Retrato» (1080 × 1350). Vienen de la intención propia; la fuente
«Calama» permanece intacta.

El snapshot `d8045ab5dae18557be6610c9e7a2e5ae502365e7e8705cf37588aa1701a7fcc5` contiene
307 archivos, ninguna fuente licenciada SKY y cinco fuentes host admitidas. Las cuatro corridas
se archivaron fuera de Git; se comprobaron 68 archivos idénticos. Las 250 pruebas privadas de
la unidad productiva pasaron sin omisiones. En público, 232 pruebas pasaron y 18 se omitieron
por recursos licenciados. Astro comprobó 34 archivos sin diagnósticos; la comprobación de
tipos con TS7 y las 11 pruebas del Lab pasaron. Es una superficie compilada y revisada
localmente; no acredita despliegue en Vercel.

Los cuatro jobs conservan fotografía histórica y no invocan al proveedor. No representan
fotografías nuevas ni ofertas vigentes. El QA de la reparación registra `content-arrow`
versión `1.0.0` y sus referencias exactas de fuente: 74 admisiones intactas más 25 nuevas,
99 en total. La selección propia `lab-selection.json` incorpora las corridas revisadas sin
reemplazar el historial.

La corrida primaria `6f609e8e-2775-42e5-a318-a69fe5b85252` se restauró con bytes idénticos.
Conserva `outcomeExecutionLink: legacy-not-recorded`; no fabricar el
`executionLockSha256` que falta en el outcome histórico. El
[comando reproducible de build y revisión](../../../../docs/manual-de-uso/creative/creative-workbench-brand-preflight.md#4-compilar-snapshot-propio-y-mostrarlo-en-el-lab)
está en el manual. Cambiar selección, texto o referencias de reparación exige otro snapshot
y revisión del PNG. La autenticación Efeonce ID está diferida: la base first-party sigue
pendiente y no se creó un cliente OAuth propio. El PR 7 permanece draft, con runtime IA
apagada y sin promoción.

Referencia del pedido de 2026-09-30: el visor se llama **Lab**, es el trabajo de Efeonce para un
cliente y debe construirse con Astro vigente, TypeScript 7 cuando sea compatible, CSS compilado,
componentes reutilizables y una experiencia premium funcional. Este documento sirve a Codex y
Claude desde el mismo bundle. El código y los contratos activos viven en Workbench; no ejecutar
ni alterar CLIs de Greenhouse para operar el Lab.

## Fuentes y alcance

Dentro del checkout `creative-workbench`, abrir:

| Pregunta | Dueño |
| --- | --- |
| Cómo está construido y por qué | `docs/architecture/workbench-lab-astro.md` |
| Identidad Efeonce host, fonts OFL y galerías de altura variable | `docs/architecture/workbench-lab-efeonce-host.md` |
| Cómo lo usa una persona y cómo compilarlo | `docs/manual/workbench-lab.md` |
| Colección candidata de íconos y variantes nativas | `docs/manual/sky-icon-library.md`, `docs/ui/reviews/workbench-sky-icons-2026-10-01.md`; [referencia](icons.md) |
| Navegación, mesa opción 2 y filtros | `docs/architecture/workbench-lab-navigation.md` |
| Dirección vigente de superficies y menús | `docs/ui/visual-directions/workbench-surface-economy-v5.md`, `workbench-filter-selects-v6.md`; v1–v4 son antecedentes |
| Coreografía host y sus modos | `docs/ui/motion/workbench-premium-v2.md` y corrección de alcance v5 |
| Qué se observó, revisó o desplegó | `docs/operations/HARNESS_STATUS.md`, `docs/ui/reviews/` |
| Qué puede entrar en la galería modular | `docs/architecture/workbench-reference-design-gallery.md` |
| Quién y qué marca pueden producir | `AGENTS.md`, catálogo, pack y entradas gobernadas |
| Implementación del visor/build | `apps/brand-reference/` y scripts root de package.json |

Leer status y rama antes de editar. La decisión técnica no demuestra rollout y una captura local
no acredita Vercel. Consultar la [continuidad](state-continuity.md) para el corte de esta sesión;
validar runtime cuando se necesite afirmar disponibilidad actual.

El Lab es una biblioteca de exploración/revisión de snapshots. No genera imágenes, edita una
campaña, cambia el pack, aprueba piezas, publica a redes o envía al cliente desde el navegador.
Esas operaciones siguen en las entradas productivas, con identidad viva y autorización adecuada.

## Stack y frontera técnica

La unidad fija Astro 7.3.5, Tailwind CSS 4.3.3 por Vite y TypeScript nativo 7.0.2 para módulos `.ts`.
La app es `@efeonce/workbench-lab` y el workspace pnpm incorpora sólo `apps/brand-reference`.
Estos pins describen la unidad de fecha; antes de actualizar, verificar npm, engines, documentación,
lockfile y compatibilidad. No usar `latest` como identidad de una corrida.

Dos compiladores cumplen funciones distintas:

- `@typescript/native` es alias de `typescript@7.0.2` y aporta el binario nativo `tsc` para módulos.
- `typescript` es alias de `@typescript/typescript6@6.0.2`, que conserva la API requerida por el checker
  de Astro. `astro check` no se presenta como ejecución de TS7.

Desde la raíz Workbench, `pnpm lab:typecheck` llama `typecheck` de la app (`tsc --noEmit -p tsconfig.modules.json`); `pnpm lab:check` llama `check` (`astro check`). Ambos deben pasar. Tipos
estrictos de props/datos/DOM no sustituyen validators de runtime: JSON ajeno se verifica antes del
renderer, y `any`/silenciar un diagnóstico no corrigen un dato mal admitido.

Astro compila componentes a HTML estático. Tailwind compila los estilos y el bundler procesa los
módulos de interacción. No se introduce React, una SPA, SSR, DB o runtime de estilos para una
biblioteca de lectura. Una nueva capacidad de escritura/colaboración exige otra decisión de servidor,
autoridad y acceso. El deployment protegido aporta acceso; esconder botones no es una política.

## Pipeline gobernado e inmutable

1. Resolver una sola marca explícita, pack/version/SHA y corrida primaria. No inferir identidad por
   colores, ruta del navegador o recurso usado en el turno anterior.
2. `reference:build` valida contexto, locks y recursos propios. Las corridas de galería se seleccionan
   mediante JSON explícito y vuelven a comprobarse contra el pack actual, outputs y grafo nativo.
3. Preparar un payload normalizado y assets permitidos en un área privada/ignorada de ese build.
   El path es un mecanismo interno del maintainer, no un campo libre recibido desde el job.
4. Astro consume ese payload y publicDir propios. Los componentes no leen canon privado, tokens de
   credenciales, `.env`, logs crudos o archivos Metric. Un input ausente/cross-brand falla cerrado.
5. Compilar HTML/CSS/JS y copiar originales permitidos. Calcular el digest de archivos ordenados y
   SHA; escribir en `apps/brand-reference/.build/<brandId>/<primaryRunId>/<buildSha256>/`.
6. Repetir los mismos inputs verifica bytes sin sobrescribir. Source/selección nuevos dan otra ruta.
   Un build sin galería no debe conservar imágenes del build anterior. No editar el snapshot final.
7. Revisar el archivo real y registrar evidencia; deploy, readback, promoción y entrega son acciones
   posteriores independientes. Build no consulta proveedores ni concede autoridad productiva nueva.

La corrida primaria heredada no contiene `outcome.executionLockSha256`. El builder verifica brand
lock → execution lock y propios recursos/outputs; sólo verifica execution → outcome cuando el campo
existe. `manifest.json` declara `primaryRun.outcomeExecutionLink: legacy-not-recorded` para ese run.
No afirmar una cadena completa ni alterar el outcome histórico para rellenarla. Las seis corridas
modulares seleccionadas sí tienen la cadena completa de hashes, comprobada por el lector de galería.

No ejecutar `astro build` aislado para publicar una referencia desde JSON libre. La entrada admitida
es `reference:build`; llama Astro internamente después de validar. Tests/checks de código pueden
usar fixtures públicas, pero no certifican canon privado, acceso humano o fidelity de todas las piezas.

La [arquitectura del harness](architecture.md) sigue siendo la fuente de packs, locks y autoridad.
La [distribución](operations-distribution.md) conserva el contrato de proyecto por marca, permisos,
archivo privado y lectura de bytes servidos. No enviar assets de SKY a un Lab de Berel/Efeonce.

## Mapa para modificar el Lab sin recomponer piezas

Bajo `apps/brand-reference`:

- `src/pages/index.astro`, `lab-guide.astro`, `tokens.astro`, `tipografia.astro`, `recursos.astro` e `iconos.astro`: portada, ayuda y bibliotecas dedicadas; consumen
  `readLabData()` de `src/lib/lab-data.ts`.
- `src/layouts/LabLayout.astro`: documento, landmarks, imports compilados de `src/styles/global.css` y `galleries.css`, y
  entrada `src/scripts/lab.ts` para páginas de biblioteca; cada módulo inicializa sólo sus controles presentes.
- `src/components/`: `LabHeader`, `LabFooter`, `LabHero`, `DesignGallery`, `AdaptationGallery`,
  `ZoneInspector`, `TokenLibrary`, `BrandResources`, `MetricSpecimen`, `AssetGallery`, `ProductionGuide`, `PieceDialog`,
  `CompositionLibrary`, `RecipeAdaptation`, `RecipeDialog`, `FilterSelect` e `IconLibrary`, todos `.astro`.
  Usan props `LabData` y escaping normal; no insertar strings de markup con `set:html`.
  `IconLibrary` serializa sólo datos en `application/json`, escapando `<`; el cliente
  los valida por schema antes de usar DOM. Esa serialización no admite HTML de la fuente.
- `src/scripts/`: `tokens.ts`, `gallery.ts`, `compositions.ts`, `dialog.ts`, `navigation.ts`, `zones.ts`, `catalog.ts`,
  separados por responsabilidad; `filter-select.ts` mejora ambos selectores y `motion.ts`
  limita la coreografía host. `src/lib/gallery-model.ts` posee el filtrado puro tipado.
- `src/scripts/masonry.ts` inicializa/refresca spans de galería y `src/lib/masonry-model.ts` posee
  `masonrySpan`; el layout no pertenece a geometría/recetas productivas.
- `build.mjs`, `design-samples.mjs`, `host-assets.mjs`, `icon-projection.mjs`: admisión gobernada, datos/bytes de build,
  galería seleccionada y host. No llevar esa lectura privada a componentes o módulos navegador.

El body fija marca, packVersion, catalogVersion y SHA de los bytes exactos servidos de `kv-zones.json`.
El lector cliente usa WebCrypto para comparar SHA256 contra ese digest antes de JSON.parse;
comprueba marca/versión/contrato V2, zonas/bindings/bounds del canvas y paths propios. Es defensa del
inspector frente a corrupción/mezcla accidental, no un sandbox ni autoridad independiente de la página.
Ante fallo, borra el preview, limpia overlays y deshabilita inspector/botones de inspección con mensaje humano, sin raw
error; las otras features se inicializan independientemente. No servir errores con paths del canon.

## Identidad host versus identidad de producción

El pedido autoriza **Efeonce | logo del cliente** en el header y Efeonce en el footer. Es la autoría
del Lab; no es una licencia para añadir Efeonce a campañas SKY. La frontera tiene dos conjuntos:

| Conjunto | Material | Admisión |
| --- | --- | --- |
| Host Lab | Logo Efeonce, tokens/línea AXIS y Bricolage/Poppins de UI | Manifest/dependencias exactas, scope host; fuentes OFL con licencia/SHA admitidos |
| Marca/pieza | SKY: logo, Metric, colores, foto, flecha, CTA, legal y recetas | Pack y recursos propios; locks/QA de producción |

El primer asset host positivo admitido procedía de `@efeoncepro/axis-brand-assets` 0.4.5 y sus bytes equivalen a
`greenhouse-eo/public/branding/logo-full.svg`. Se distribuye bajo `lab-assets/`, fuera del pack SKY,
los inputs/outputs de producción y su listado de assets. Verificar manifest, pin/procedencia y SHA
antes de copiar; el manifest actual y el lockfile determinan versiones/archivos admitidos tras
verificación. No anunciar una versión nueva desde memoria ni reconstruir el wordmark. AXIS para
el host es una dependencia/acceso separado del canon SKY, nunca la identidad por defecto del cliente.

El header conserva sólo Efeonce | cliente, sin caption adicional; el footer muestra logo Efeonce, Design System Lab y copyright institucional. La interfaz
usa Bricolage Grotesque para títulos y Poppins para lectura/controles, con roles admitidos, y
la línea Efeonce materializada desde exports/tokens/contratos AXIS verificados. Sus versiones concretas
se registran al admitir sus bytes; no inventar una API, un token o una órbita por parecido. No tocar
el sistema AXIS o las skills/motores Efeonce por aplicar el consumer host acotado.

Los tokens de chrome (paper/canvas/ink/muted/line/action/spacing/type/radius/motion) materializan
los roles host Efeonce en el theme del Lab compilado por Tailwind. Los valores sellados de SKY siguen en su sistema/artwork.
Las classes consumen tokens, no valores decorativos arbitrarios; no usar otra biblioteca CSS,
fuentes remotas o el engine visual de Greenhouse como ruta rápida.

### Paquetes y proyección host verificados

Este corte admite fuentes publicadas directas: `@efeoncepro/axis-tokens` 0.3.37,
`@efeoncepro/axis-graphic-line` 0.11.0 y `@efeoncepro/axis-brand-assets` 0.4.5. Fontsource 5.3.0
aporta `@fontsource-variable/bricolage-grotesque` (latin normal variable 200–800) y
`@fontsource/poppins` (latin normal 300/400/500/600). Cinco WOFF2 suman 72 816 bytes con licencias
OFL-1.1 admitidas por SHA. No introducir versiones flotantes o confundir transitivas registradas
con los exports directos que materializan la UI.

El runtime aislado de consulta/importación real está ignorado en
`.captures/axis-host-packages/runtime`; no es una dependencia productiva nueva de CI o broker.
El build consume la proyección local sellada y no necesita credenciales Packages para copiarla.
El manifest `apps/brand-reference/lab-assets/manifest.json` usa
`workbench.lab-host-assets.v2`, scope host y SHA admitido
`57c79156801bd1114a1de230d2aec4269493ec5d569fc7028d9d072e4e32e93d`. Registra paquetes,
integrities, transitivas, logo/icono, fonts/licencias y theme. `host-assets.mjs` comprueba
`expectedManifestSha`, hash de estilos y bytes de cada recurso, sin auto-reseal.

`src/styles/host-theme.css` se genera y se importa desde `global.css` para Tailwind/Vite; su SHA
admitido es `02d99aa606ce1e7ec05c277aeeb34e8549ab707a06d9a354976d9e823a2b6fd7`.
`LabLayout.astro` preloads Bricolage variable y Poppins 400. El renderer local, leído mediante CDP,
confirmó ambas familias efectivas, no sólo la declaración CSS. No extender esa lectura a un
Preview nuevo o aceptar el packing/contraste sin la evidencia posterior del review.

El CTA host proyecta `efeonceGraphicLine.surfaces.web.cta.desktop`: teal/dark, radio 14 px,
padding 22 × 40 px y font máximo 22 px con ajuste responsive. El icono oficial se genera desde
`iconSvg` con glyph `encuadre`, state `response`, size 32, line `growth`, surface `light`,
background false e idPrefix `efeonce-lab-explore`; receta/SHA están en manifest. Es material de
interfaz Efeonce, nunca una sustitución del CTA, flecha o estilo de producción SKY.

Materialización de mantenimiento, sólo desde Workbench y con fuente previamente verificada:

```sh
node tools/lab-host-materialize.mjs .captures/axis-host-packages/runtime --write
```

La tool verifica pins/versiones/integrities del runtime aislado y prepara assets, fonts/licencias,
manifest y CSS. No concede admisión automáticamente. Revisar procedencia/bytes/licencias/recetas
antes de actualizar explícitamente `expectedManifestSha` en el lector; hasta entonces el build
falla cerrado. No pasar el runtime como campo de job, usar otra instalación por parecido o llamar
el script desde producción ordinaria. El build normal es offline para host y sólo valida su sello.

## Inventario SKY y lectura correcta

El input de marca tiene 126 reconstrucciones históricas, 19 tipos de zonas, cinco pesos Metric
y 193 recursos admitidos. La selección premium contiene cuatro corridas; el inventario histórico
inicial contenía seis. Las cantidades de muestras pertenecen a la selección real del build. Los conteos UI se
derivan del input real y no deben hardcodearse. Dos galerías responden preguntas distintas:

- **Muestras del Workbench**: resultados sellados del compositor modular con logo/flecha/CTA corregidos.
  El registro incluye run, fuente, dimensiones, hashes, familias y aprobación comercial none.
- **Adaptaciones**: reconstrucciones originales del catálogo FIG para comparar y localizar formato.
  No son exports independientes de Figma y pueden conservar errores de la referencia histórica.

La imagen protagonista debe ser una composición propia seleccionada o una referencia admitida,
completa y sin recorte. Las tarifas/fechas históricas se advierten como pruebas, no ofertas actuales.
No generar otra foto por estética del Lab ni reutilizar copy comercial para una nueva campaña.

Los PNG/SVG productivos se copian sin modificar y siguen descargables. WebP thumbnails reducen
la carga y su manifest liga dimensiones/bytes/SHA al original/source SHA. No evaluar los píxeles
productivos en un thumbnail ampliado. Metric aparece como muestras SVG de contornos; no publicar sus font binaries privados. Inter sigue
auxiliar/experimental. Bricolage/Poppins host OFL son otro conjunto: archivos locales y licencia
admitidos con procedencia/version/archivo/SHA, sellados en el snapshot. No cargar fonts remotas
o trasladarlas al job/pieza cliente. `licensedFontFiles: 0` excluye fuentes privadas/cliente, no
afirma ausencia total de archivos font host OFL admitidos. Comprobar familia efectiva en el navegador.

## Operación humana que el agente debe preservar

La navegación actual ofrece Composiciones, Adaptaciones y Sistema de marca; Guía mantiene
su acceso. Portada conserva recetas, muestras, adaptaciones y mesa de zonas; Tokens `/tokens/`,
Tipografía `/tipografia/`, Recursos `/recursos/` y ayuda son páginas dedicadas. Recetas identifica
sistemas nombrados y variantes; Muestras identifica corridas. El shell de bibliotecas mantiene
accesos y menú compacto en pantallas pequeñas.
Un h1, landmarks, skip link y anchors expresan jerarquía. IDs, SHAs y detalles de fuente quedan en
información plegable o archivos para agentes; no dominan la portada frente al cliente.

Galería: búsqueda y familia filtran antes de paginar; el conteo, vacío, reset y Ver más son visibles.
Se pagina de 24 en 24, con foco al primer control nuevo; reset limpia consulta/familia/página y
devuelve foco a la búsqueda. No perder selección ni foco al ampliar resultados. Una adaptación abre la mesa contextual;
un original/muestra usa dialog nativo, con loading/error, Close/Escape/fondo y retorno al invocador.
RecipeDialog restaura sus nodos sin clonación; Escape cierra primero una segunda capa abierta.
Un fallo mantiene acceso al archivo permitido y nunca usa una imagen ajena como reemplazo.

Muestras y Adaptaciones usan grid de alturas variables con spans derivados de la tarjeta visible.
Mantener DOM/Tab/source order; no columnas CSS, `dense`, CSS order o duplicados que cambien el
recorrido. Layout es presentación, no nuevas coordenadas/encuadre del artwork. Imagen completa y
proporcional; el original conserva SHA y el modal no amplía sólo un thumbnail.

Inicializar layout separado de filtros. Recalcular tras resize, carga de imagen/font y cambio de
filtros/Ver más, sin polling continuo de scroll; hidden cards no dejan huecos. Con no JS o fallo de
medición conservar grid CSS completo y links, no ocultar tarjetas que sólo un script revela. Mantener
foco/query/reset/modal e inspector independientes de esa mejora. La revisión debe probar el orden
real de controles y píxeles, no sólo una captura de seis formatos parecidos.

El contrato DOM del controller es grid `[data-masonry]`, tarjetas `[data-masonry-item]` y contenido
medido `[data-masonry-content]`; `data-masonry-ready` se activa sólo con soporte/config válidos.
`initializeMasonry()` arranca después de gallery y `refreshMasonry(container?)` se llama tras
hidden writes de filtros/reset/Ver más. ResizeObserver observa inners/ancho del grid; rAF agrupa
reads antes de writes e ignora la altura de grid resultante para evitar loops. Load/error de imagen,
details toggle y fonts ready/loadingdone invalidan la medida. Sin ResizeObserver o variables válidas
conserva grid CSS natural. No mutar tamaño/bytes de imagen para resolver un packing incorrecto.

Inspector: formato activo identificable aunque nombres se repitan; imagen/overlay conservan la misma
geometría. Foto, título, logo, tarifa, flecha y legal son zonas prioritarias; el resto es accesible por
Ver todas. El default SKY inicial es `2026:2630`/`footer-legal`; el contenido y la fuente pertenecen al formato activo. `footer-legal` no es
`fare-conditions`; zona ausente debe declararse, nunca heredarse de otra pieza.

Tokens: búsqueda, conteo/empty y copiar con feedback visible/anunciado; error de clipboard recuperable.
Sin JavaScript el catálogo HTML completo conserva navegación, imágenes y links; modal, filtros e
inspector interactivos dependen de sus módulos y datos, con aviso explícito de esa dependencia. Reduced-motion mantiene el estado final y evita desplazamientos innecesarios.

## Selectores y desplegables

Separar disclosure de información (`details`/`summary`) y selector de filtro: diseñar el
cuerpo de un disclosure no moderniza el menú abierto del select. Los disclosures conservan
cabecera/chevron con inset y lectura interna plana; no añadir una card por campo, fuente o
fila. La anatomía actual consume tokens host compilados en `disclosures.css` y `surfaces.css`.

`FilterSelect.astro`, `filter-select.ts` y `filter-select.css` comparten familia y colección.
El select nativo conserva IDs, valores y eventos de filtros; sólo se oculta tras admitir
Popover API y completar la mejora. Sin JavaScript o sin esa API queda etiquetado y visible.
El panel nativo top layer evita clipping por el canvas; mide control/viewport, gira arriba
si falta espacio, limita ancho/alto y usa scroll. Filas de 44 px, Poppins, check y conteos
reales sobre una superficie host; móvil da una fila completa al selector de familia.

Foco en el combobox con `aria-expanded`/`aria-controls`/`aria-activedescendant`, listbox y
`aria-selected`. Flechas, Home/End y typeahead navegan sin filtrar hasta Enter/Espacio o
clic; Escape cancela, Tab cierra y avanza, clic exterior cierra. Cambiar/resetear el valor
emite `change` y sincroniza etiqueta/selección: no escribir sólo el texto del botón.
Reduced motion desactiva apertura y transición del chevron. No añadir dependencias,
Vuexy o fuentes cliente para arreglar un control host.

QA exige **abrir** ambos menús en desktop/móvil, teclado, reset, viewport/scroll, reduced
y fallback sin JS; comprobar fuente efectiva, valor, conteo y foco. Una captura cerrada
no prueba el interior. En v6: Always On 7, Eventos 24, Display 53 y reset 126; Tokens
Primitives 27, Semantic 33, Typography 48, reset 24/108. Son controles del catálogo de
este corte, no valores a hardcodear en otra marca o colección.

## Referencias con contornos nativos y muestras productivas

Desde PR 12 (main `2bb761aa2f76a22a0e9ca8530cfdcc064cf64a91`), el build admite
`--native-previews` como último argumento, después de `--design-runs` si hay selección.
El default sigue mostrando los originales históricos. Para el modo corregido:

```sh
pnpm reference:build sky-airline projects/sky/always-on-reference/runs/<uuid> \
  --kv-exports /ruta/privada/kv-source-exports \
  --design-runs projects/sky/always-on-modular-demo/lab-selection.json \
  --native-previews
```

Resolver las rutas y el UUID existente; omitir la selección para un Lab sin muestras productivas.
El modo verifica todos los previews originales y recompone 126 referencias con el pack SKY
admitido por marca/versión/SHA/procedencia. No usa proveedores ni crea corridas de campaña.
`reference-projections.json` liga original, template, PNG/SVG nuevo y renderer por formato;
`manifest.json.nativeReferenceProjection` sella el documento. El baseline geométrico del renderer
conserva hashes originales y nuevos: 21 PNG cambian, 105 conservan sus bytes. No comparar un
PNG proyectado con el SHA del preview original ni alterar el catálogo para hacerlos coincidir.

El flag no recompone los outputs seleccionados por `--design-runs`. Una muestra antigua con
círculos deformados necesita una nueva corrida autorizada y una selección revisada; nunca editar
el run completado, su UUID, output o evidencia. La proyección mantiene aprobación comercial
`none` y no prueba fidelidad visual 126/126. Dueños Workbench: `docs/manual/workbench-lab.md`
(«Previews originales y contornos corregidos») y `docs/architecture/workbench-sky-vector-containers.md`.
Las máscaras OUTLINE de dos fuentes mantienen sus pins aparte; no confundirlas con el fondo circular.

## Procedimiento de build, revisión y despliegue

En Workbench, con canon propio instalado y corrida primaria existente:

```sh
pnpm lab:typecheck
pnpm lab:check
pnpm lab:test
pnpm reference:build sky-airline projects/sky/always-on-reference/runs/<uuid> \
  --kv-exports /ruta/privada/kv-source-exports \
  --design-runs projects/sky/components-proof/reference-samples.json
```

Los placeholders son datos por resolver, no comandos listos para pegar. Omitir `--design-runs` para
un snapshot sin composiciones. Conservar JSON de salida/digest y servir sólo su `out` localmente;
no servir el repo o el canon. El manual Workbench incluye el server local de lectura.

Comprobar tests de admisión/gates, ambos typechecks y build real. Verificar determinismo, ausencia
de font privado SKY/Metric, SHA de originales, asset host y own-brand metadata. Las fonts OFL host
y sus licencias deben coincidir con la admisión por SHA; comprobar familia efectiva, primer fold
y estabilidad. No registrar aceptación de Bricolage/Poppins desde su declaración CSS solamente. La evaluación premium requiere
capturas de primer fold y review final desktop/390 px: filtros/query/familia/vacío/reset/Ver más,
layout/resize/imagen/font disponibles/no JS/orden DOM, modal/keyboard/foco, inspector con legal
presente/ausente, copy/error, carga fallida, reduced-motion,
contraste UI medido, menús de familia/colección abiertos y ausencia de overflow horizontal. El scorecard de 14 dimensiones debe conservar
criterio y evidencia; media ≥4.5, ninguna <4 y dimensiones prioritarias ≥4.5. No puntuar a partir de tests.

`pnpm lab:test` comprueba 17 casos en este corte: admisión de inputs, marca/paths/recursos,
proyección pinneada, modelo de mesa, paginación de recetas/accesos profundos y modos motion.
El inventario actual está en `apps/brand-reference/test/`; usar su salida real, no la cuenta antigua
de dos pruebas de migración. CI `lab-checks` instala sólo
runtime público de la app y ejecuta TS7, Astro check y app tests sin canon/credenciales. Su configuración
no prueba un run remoto en verde; verificar el ref y resultado real antes de anunciarlo.

La verificación local del corte de migración Astro reportada el 2026-09-30 fue 156 tests harness, siete SKY, dos app, Astro check de
23 archivos sin errores, TS7 estricto y gates. La prueba local con catálogo alterado a Berel comprobó
que el inspector fallaba cerrado sin preview/overlays y la galería continuaba. No extender esa evidencia
a protección remota, deployment, autoridad de producción o aprobación de artwork.

Sólo con autorización de deploy: verificar identidad/scope/proyecto propio de marca y protección all;
publicar el snapshot revisado como Preview; leer Ready/proyecto/ref/digest, comparar archivos servidos
por SHA y rechazo anónimo de raíz/manifiestos/imágenes. No reutilizar el Preview genérico ni promover
alias estable por inferencia. Registrar hashes/URL/estado observados donde se lee el avance.

## Diagnóstico y continuidad

Fuente host no efectiva o licencia/bytes distintos → comprobar admisión host y carga local de
Bricolage/Poppins; no rehash ni reemplazo por fonts cliente. Galería con huecos/overlap → revisar
controller/config y contenido medido tras fonts/images/filtros; conservar DOM order y grid fallback.
No reconstruir las piezas ni cambiar sus ratios para resolverlo.

Error de pieza (logo/flecha/CTA/texto) → revisar original, source pin y QA del compositor SKY; nueva
corrida gobernada tras corregir módulo. Error de UI → corregir componente/props/estilo/DOM del Lab,
recompilar y producir otro snapshot. No retocar el PNG para salvar una captura del visor.

Sello/input inválido → recuperar la fuente propia con sus bytes, no rehash. Font faltante → instalar
canon admitido, no fallback. Denegación Vercel → verificar acceso de persona/proyecto, no abrir el sitio.
Un check TS7 o Astro rojo se resuelve en su plano; no quitar el gate para avanzar al deploy.

Después de cambios: actualizar contrato/manual/dossier/status en Workbench y el corte pertinente de
esta skill. Mantener Codex y Claude byte-equivalentes. No copiar imágenes, fonts, secretos o output
compilado a Greenhouse. Esta unidad Lab no cierra automáticamente la certificación Figma de las 126
piezas, producción IA general, onboarding de cada persona o packs propios de otras marcas.


### Readback CLI protegido

`vercel curl` requiere el cwd/`--cwd` del snapshot enlazado al proyecto de la marca:
`--deployment` solo no reemplaza ese contexto al resolver el acceso. Para SHA de HTML usar
`--location` y header `x-vercel-skip-toolbar: 1`, sin exponer credenciales ni bypass.
La prueba anónima se hace separada, sin credenciales ni seguimiento del redirect. Registrar el
número real de archivos remotos cotejados; archivo completo local no significa readback remoto completo.
Promover y asignar un alias manual son pasos distintos: comprobar el alias corto después
de la promoción y asignarlo explícitamente cuando corresponda. Verificar en ambos hosts
source/ref/build, bytes autenticados y rechazo anónimo. Una API de proyecto puede incluir
secretos de bypass: procesar la respuesta en memoria y emitir sólo metadata necesaria,
sin volcarla íntegra. Confirmar interacción real en el alias publicado además de sus hashes.


Entorno comprobado del Lab: Node 24.17.0, pnpm 10.32.1; CI Node 24. Usar Node 24 LTS
para todos sus checks: los tests importan TypeScript de forma nativa. No confundir el mínimo
upstream de Astro con una certificación de los tests en Node 22; la composición del harness
conserva su contrato separado.

## Biblioteca de recetas

`#recetas` presenta composiciones con nombre, propósito, receta versionada, componentes y todas
sus adaptaciones. La búsqueda admite acentos y combina palabras; cada disclosure muestra primero
cuatro variantes, con las restantes en una expansión. Usa los controles comunes de dialog y zonas.
`#composiciones` conserva su anchor histórico y ahora se llama Muestras del Workbench: seis corridas
no equivalen al catálogo de recetas. Las previews de las recetas siguen siendo referencias históricas.

El builder deriva `/composition-recipes.json` desde metadata propia y el canon sellado, valida
membership única de todos los formatos y tokens exactos. El cliente sólo filtra ese payload
normalizado; no selecciona otra marca ni concede autoridad. Contrato, mantenimiento y comandos
en [recipes.md](recipes.md); antes de una campaña completar cada adaptación y producir su run.

## Gate del CSS host y orden editorial

El build final rechaza `@theme` sin compilar, roles de font ausentes y sustituciones por Metric o system-ui. `host-theme.css` entra por `global.css` al pipeline Tailwind; no basta importar un CSS independiente o declarar la familia. Confirmar fonts efectivas en navegador. Muestras alterna vertical/horizontal/banner al emitir HTML para dar contexto; todas las muestras se conservan y DOM/teclado siguen esa secuencia. No cambia el catálogo/corridas ni reordena nodos en runtime. Las adaptaciones mantienen el orden de fuente.

El CTA del hero se adapta al contexto de interfaz: 48 px de altura mínima, texto 14 px, icono 20 px, relleno 12 × 20 px y gap 12 px. Mantiene los roles de identidad de AXIS; no se aplica el tamaño de CTA publicitario al Lab. Ajuste validado a 1410 y 390 px.


## Bibliotecas dedicadas y recursos completos · unidad 2026-09-30

La portada tiene acceso compacto a Sistema de marca. Los enlaces antiguos `/#tokens`, `/#metric`
y `/#assets` conservan una ruta de recuperación HTML y la mejora cliente lleva a la nueva página.
`/tokens/` muestra rampas Primitives y tabla completa sin JavaScript; con JS combina búsqueda y
colección, 24 resultados iniciales, Ver más de 24, restablecer con foco y copia del valor exacto
con feedback/copia manual si el portapapeles está denegado. `/tipografia/` reutiliza
`MetricSpecimen.astro`; nunca publica OTF/WOFF2 cliente.

`/recursos/` usa `AssetGallery.astro`, `src/lib/view-model.ts` y `resources.css`, a partir de las
props `LabData` ya admitidas. No añadir imports de canon/pack privado a este renderer. Expone los
siete vectores SKY permitidos (dos logos, tres iconos, dos segmentos fuente de flecha), con tamaño,
identificador, proporción nativa y descarga SVG. **No etiquetar todo el catálogo como oficial**:
el pack `0.1.0` sigue candidato; vector oficial, recurso admitido y módulo Workbench son estados
diferentes. Los segmentos fuente no sustituyen la flecha continua del compositor.

El índice modular deriva las 21 familias presentes en las 37 composiciones y presenta recetas y
variantes asociadas de las 126 adaptaciones. Familia → composición representa inclusión en la
unión de componentes del registro; **no prueba presencia en todas sus adaptaciones**. Cada variante
conserva tamaño, nodo y links a PNG/Figma. Confirmar campos/slots y geometría en la fuente/inspector
propios, sin heredar legal, copy o binds de otra pieza. Los disclosures son HTML nativos; no dependen
de filtros cliente para ofrecer el catálogo. Los links de receta usan `/#recipe-<slug>`; la entrada
al inspector es `/#zonas`, sin inventar una query de selección.

Los 193 recursos admitidos del pack incluyen materiales privados y no son 193 assets públicos.
No copiar fuentes Metric, originales privados de templates, anclas fotográficas o herramientas al
Lab para completar visualmente un catálogo. Una nueva extracción/preview de módulo requiere
admisión explícita en builder/schema/source pins, no una lectura oportunista desde el componente.

`LabFooter.astro` comparte logo Efeonce, **Design System Lab**, copyright con año UTC y entidad
**Efeonce Group SpA**, sin la línea repetida de cliente. La proyección institucional se verificó
por lectura en `greenhouse-eo/src/config/efeonce-brand.ts`; sitio `https://efeoncepro.com`. No importar
ni ejecutar Greenhouse ni exponer RUT/domicilio. No inventar destinos de privacidad/términos por
concatenación. El retorno usa `Astro.url.pathname`: home → `#always-on`, subpáginas → `/`.

La validación local de esta unidad pasó TypeScript 7 strict y `astro check` en 34 archivos con cero
errores, advertencias o hints. La revisión de píxeles, build admitido, publicación y readback remoto
pertenecen a sus gates posteriores; estos checks no prueban una nueva entrega.

La navegación activa de las páginas se vuelve a revelar al redimensionar y tras fonts.ready, sin mover el scroll vertical. El inspector usa cabecera compacta; la página Recursos omite la explicación repetida en móvil. Fuente institucional del footer: src/config/efeonce-brand.ts de Greenhouse, entidad Efeonce Group SpA y sitio configurado; no se inventaron URLs legales.

### Dominio previsto

El operador fijó `creative.efeonce.org` como dominio institucional del Design System Lab (2026-09-30). Astro lo declara como site; pertenece a la plataforma Efeonce multimarcas. No usar el hostname como brandId ni como autorización de producción. El snapshot actual sigue siendo SKY. Declarar site no configura DNS, Vercel, protección o una promoción a Production. El estado vivo de esos pasos se verifica y registra por separado; no inferir que ya hay selector o rutas para otras marcas.

## Historial de modernización y publicaciones

Los siguientes cortes conservan decisiones, rechazos y evidencia de su momento. Sus
URLs locales, hashes, estados sin merge/deploy y conteos son históricos; arriba rige v6.

### Mesa de revisión seleccionada — 2026-09-30

El operador seleccionó la opción 2 de Product Design. El Lab mantiene Astro estático y readonly:
header de tres grupos, `#pieza=<formatId>` con historial/recarga, variantes de la receta propia,
PNG proporcional sobre navy y zonas presentes/ausentes. Retorno y Escape conservan filtros/scroll/foco.
`#zonas` continúa como entrada compatible. Más zonas, Campos y fuente y Vista y fuentes pliegan
las capas adicionales; los contornos son opcionales y no alteran el PNG. En móvil, pieza primero.

El build admite la continuidad de un snapshot ya producido con `--reference-projection <site>`
y `--projection-sha256 <SHA de reference-projections.json>` al final del comando. Ambos son inputs
explícitos del mantenedor, nunca fallback del renderer o autoridad de un job. Verifica metadata,
marca/version/pack, cobertura, nodo/template/hash histórico propio y hash/geometría de cada PNG.
Los previews históricos también se validan y sus seals no cambian. Manifest registra la proyección
exacta; no ejecuta código archivado ni promueve aprobación comercial. Sin flags mantiene el build
histórico. Source y comando de esta entrega: `creative-workbench/docs/manual/workbench-lab.md`;
selección de cuatro corridas: `apps/brand-reference/review-design-selection.json`.

La raíz Workbench `design-qa.md` registra aceptación local y evidencia. Commit/push/CI/deploy se
verifican por separado; el gate managed-drift preexistente no se elude ni se rehasha. No ejecutar
sync total o CLIs Greenhouse para resolver esta unidad. Las notas anteriores de navegación de ocho
secciones describen la versión previa; el contrato vigente de esta mesa es la decisión de navegación.


### Modernización premium integral v2 — 2026-10-01

El operador amplió la opción 2 a todo el Lab y autorizó coreografía al bajar. Cubre portada,
Composiciones, Muestras, Adaptaciones/revisión, sistema, Tokens, Metric, Recursos, guía y footer.
Canon y evidencia viven en creative-workbench: `docs/ui/visual-directions/workbench-premium-integral-v2.md`,
`docs/ui/motion/workbench-premium-v2.md`, manual y `design-qa.md`. El mock es una dirección visual;
las fotografías, logos, specimen y PNG/SVG publicados siguen siendo los admitidos del pack propio.

Composiciones muestra seis por vez, filtra antes de paginar y revela cualquier anchor profundo.
GSAP 3.15.0 se carga aparte del core y sólo anima la interfaz host. Scroll normal, sin smoother,
snap o loops; scene sticky en desktop amplio, compacta en móvil/ventanas bajas, reduced motion
reactivo. La entrada a revisión revierte la escena; al volver, reconstruye sin repetir entradas.
Sin JavaScript todas las recetas y links originales siguen disponibles. No ocultar contenido
por defecto ni mezclar motion con el renderer de cliente. Anclas de capítulos son directas.

El build explícito de continuidad sigue siendo el del manual; produce un nuevo digest inmutable.
No sobrescribir el sitio local original 49615. Commit, push, CI y deploy siguen separados de
aceptación visual; no eludir managed-drift, ejecutar sync total ni CLIs Greenhouse desde esta unidad.


### Superficies de producto v3 — 2026-10-01

El operador pidió corregir integralmente la contención de v2. Fuente y QA local en
creative-workbench: `docs/ui/visual-directions/workbench-surfaces-v3.md` y
`docs/ui/reviews/workbench-surfaces-v3-qa.md`. Shell persistente, paneles de tarea,
cards de receta/recurso/specimen, tokens contenidos y detalle RecipeDialog nativo.
Mover/restaurar nodos existentes, no clonar IDs/listeners. Sin JS conservar details;
retorno desde review enfoca summary visible de la card, no un invocador oculto.
Valores/copias/colección/procedencia permanecen en la consulta móvil. Full motion
requiere >1050 px y altura >=650, alineado con navegación lateral; demás calm/static.

Preview local 49617, digest `1c71d3bc88826327ed288dbd1e8d653f30da7abb3b9711deab306a2e4beef2a5`.
309 archivos, 296 recursos idénticos a v2, 126 KV y cuatro muestras intactos.
45 Astro files sin diagnósticos, TypeScript y 17 tests passed; CUA verificó bibliotecas,
modales/foco/retorno, original descargado, reduced/no-JS y fuentes efectivas.
QA local no equivale a aceptación del operador. Gate general conserva 11 managed-drift
previos; sin rehash/bypass. Sin commit, push, CI ni deploy; previews anteriores preservadas.


### Biblioteca del cliente y disclosures v4 — 2026-10-01

El operador precisó que SKY es cliente del Design System Lab de Efeonce, no un sitio de
la aerolínea. Dirección/QA actuales en creative-workbench:
`docs/ui/visual-directions/workbench-client-library-v4.md` y
`docs/ui/reviews/workbench-client-library-v4-qa.md`. v2/v3 ampliaron el shell general;
la opción 2 conserva la mesa de tres regiones. No reclamar fidelidad literal al mock ni
inventar variantes de otras recetas para replicarlo.

Títulos funcionales y details nativo con `.disclosure-body` explícito, incluidos los
campos/fuentes/Más zonas dinámicos. Cabecera/chevron con inset, interior suave, registros,
metadatos y acciones de 44 px. Móvil reduce capas redundantes. No envolver con JS ni
perder fallback/teclado; preservar originales y relaciones reales.
Preview local 49617, digest `891eeb3743bfab8971a6eec6b6935045993ce04fdd8fcfc6cf8d8a0f19817f19`.
296 recursos idénticos a v3; 45 Astro files sin diagnósticos, TypeScript y 17 tests passed.
QA local no acredita aceptación del operador/publicación. Sin commit/push/CI/deploy;
no bypass, sync total ni CLIs Greenhouse. El gate general previo sigue separado.

### Equilibrio de superficies v5 — 2026-10-01

V4 fue cuestionada por el operador por cards sucesivas. Criterio vigente: panel de tarea
+ entidad cuando hay decisión propia; cuerpos, fuentes y registros internos planos con
espacio y reglas. Recetas/resources/inspector/tokens/guía corregidos; tipografía conserva
specimens. No reintroducir fondos/bordes/radios por dato. Bibliotecas sin entradas por
card ni refresh global de motion al abrir details; coreografía sólo escena original.
Opción 2 conserva tres regiones. Preview 49617, digest `12ed9ba1da11e0c0b5399c914c92c494055347cdb332ef2a6dfc5ab50603798e`.
QA en `docs/ui/reviews/workbench-surface-economy-v5-qa.md`; dirección homónima bajo
`docs/ui/visual-directions/`. Desktop/móvil, reduced y fallback sin JS verificados;
Astro/TypeScript y 17 pruebas pasan; 298 archivos no código iguales a v4. No aceptación
visual del operador acreditada, ni commit/push/deploy. V4 es historia, no criterio vigente.

### Publicación de la modernización en main — 2026-10-01

El operador autorizó main. PR 16 fusionado por squash, main `c3e85b6cb1927fdeb13fea9aeddbdfbefc857852`,
readback GitHub y ls-remote comprobados; árbol igual al head probado b77031d. Integración
sobre 2392758 mediante unidad UI ecf0b15, no historia vieja completa. Constructor conserva
native-previews y projection por SHA, excluyentes, con regresión. Gate drift viejo resuelto
por la base vigente, sin editar sello. Gates, harness y Lab CI postmerge SUCCESS
(36846606818/36846606907). Local: 348 harness +7 SKY, cero omisiones privadas; 17 Lab,
Astro45/0 y TypeScript. Build335e56a10c11833951de2055135c072c58ad9e89795303f436b47a78a8c97985,
285 imágenes/previews/fonts intactos. Preview49617 ahora sirve esa integración.
Worktree aislado /Users/jreye/Documents/creative-workbench-lab-main, rama codex/lab-premium-main;
checkout original y WIP fotográfico intactos. Evidencia privada en canon operations/
2026-10-01-workbench-main-integration. Código main y CI verificados; estado Vercel SUCCESS
leído, pero no reclamar un snapshot nuevo del sitio ni broker/paquetes publicados por eso.


### SKY premium v5 publicado en Vercel — 2026-10-01

Publicado el snapshot revisado de main `c3e85b6cb1927fdeb13fea9aeddbdfbefc857852`,
build `335e56a10c11833951de2055135c072c58ad9e89795303f436b47a78a8c97985`, en el proyecto
SKY `prj_7D9AODtfOOEf1su21wqyQASOdzOc` del scope `efeonce-7670142f`.
Deployment `dpl_2sJFNXzxEdVFBykzKsnbtQVqr56x` READY/production, promovido y alias corto
asignado explícitamente: https://creative-workbench-sky.vercel.app.

Readback de 28 archivos remotos coincide por SHA con el snapshot local (cinco páginas,
CSS/JS, catálogos, cinco WOFF2 host OFL y artwork seleccionado). Después de promover,
seis respuestas autenticadas en deployment y alias estable coinciden por bytes; ocho
requests anónimos a raíz/manifest/PNG/WOFF2 devuelven 302. Protección `all` verificada;
no se desprotege el visor ni se amplía acceso. La URL localhost anterior era sólo local.

Evidencia privada: `/Users/jreye/Documents/creative/creative-workbench-canon/operations/2026-10-01-workbench-vercel-premium-v5`.
Publicación del Lab únicamente; sin cambio de broker, paquetes ni aprobación comercial SKY.


### Publicación verificada de selectores v6 — 2026-10-01

PR 17 fusionado en main `7e4c6177992785c02430dd238c267991e097c4c9`; tree idéntico
al head revisado `2b0bf8bd7fbd0eb69701827e958e2573269e60d2`. Checks postmerge gates,
native-harness y lab-checks completed/success. Snapshot `0b815c5e7ee07a56a24d24d1e4962ad378a235726325138105098daa250118e2`,
310 archivos, 5 WOFF2 host OFL y cero fuentes privadas. Deployment SKY
`dpl_139Fyz3vV85jfHBHXw7CNuMqAE2d` READY/production, source main exacto en metadata.
Promoción y asignación explícita de https://creative-workbench-sky.vercel.app verificadas.

29 archivos críticos remotos coinciden por SHA, incluidas las cinco páginas y
CSS/JS de selectores. Después de promover, seis respuestas autenticadas (raíz,
tokens y CSS) en deployment/alias son idénticas; cuatro anónimas dan 302 y protección
all permanece. Navegador en el alias Vercel: ambos menús abiertos capturados; Always On
filtra a 7, reset vuelve a 126, cuatro opciones de tokens y consola limpia.
Capturas `families-vercel-desktop.png` y `tokens-vercel-desktop.png`, readbacks y
checks en el dossier privado `2026-10-01-workbench-filter-selects-v6` del canon local.
16 recorridos interactivos locales desktop/móvil/reduced/no-JS respaldan el contrato.
No se infiere aceptación visual del operador. Sin cambios de broker/paquetes/pack.
