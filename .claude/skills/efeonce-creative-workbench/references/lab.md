# Lab premium · operación para Codex y Claude

## Corte local de demostración productiva — 2026-09-30

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
| Dirección visual y criterios premium | `docs/ui/visual-directions/workbench-lab-v1.md` |
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

- `src/pages/index.astro`, `lab-guide.astro`, `tokens.astro`, `tipografia.astro` y `recursos.astro`: portada, ayuda y bibliotecas dedicadas; consumen
  `readLabData()` de `src/lib/lab-data.ts`.
- `src/layouts/LabLayout.astro`: documento, landmarks, imports compilados de `src/styles/global.css` y `galleries.css`, y
  entrada `src/scripts/lab.ts` para páginas de biblioteca; cada módulo inicializa sólo sus controles presentes.
- `src/components/`: `LabHeader`, `LabFooter`, `LabHero`, `DesignGallery`, `AdaptationGallery`,
  `ZoneInspector`, `TokenLibrary`, `BrandResources`, `MetricSpecimen`, `AssetGallery`, `ProductionGuide`, `PieceDialog`,
  `CompositionLibrary` y `RecipeAdaptation`, todos `.astro`.
  Usan props `LabData` y escaping normal; no insertar strings de markup con `set:html`.
- `src/scripts/`: `tokens.ts`, `gallery.ts`, `compositions.ts`, `dialog.ts`, `navigation.ts`, `zones.ts`, `catalog.ts`,
  separados por responsabilidad. `src/lib/gallery-model.ts` posee el filtrado puro tipado.
- `src/scripts/masonry.ts` inicializa/refresca spans de galería y `src/lib/masonry-model.ts` posee
  `masonrySpan`; el layout no pertenece a geometría/recetas productivas.
- `build.mjs`, `design-samples.mjs`, `host-assets.mjs`: admisión gobernada, datos/bytes de build,
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

El input inicial de esta unidad tiene 126 reconstrucciones históricas, 19 tipos de zonas, cinco
pesos Metric, 193 recursos admitidos y seis corridas modulares seleccionadas. Los conteos UI se
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

Navegación por Vista general, Recetas, Muestras del Workbench, Adaptaciones y Zonas en la portada; Tokens `/tokens/`, Tipografía `/tipografia/`, Recursos `/recursos/` y ayuda son páginas dedicadas. Recetas identifica sistemas nombrados y variantes; Muestras identifica corridas.
Un h1, landmarks, skip link y anchors expresan jerarquía. IDs, SHAs y detalles de fuente quedan en
información plegable o archivos para agentes; no dominan la portada frente al cliente.

Galería: búsqueda y familia filtran antes de paginar; el conteo, vacío, reset y Ver más son visibles.
Se pagina de 24 en 24, con foco al primer control nuevo; reset limpia consulta/familia/página y
devuelve foco a la búsqueda. No perder selección ni foco al ampliar resultados. Modal: HTML dialog nativo, imagen original,
loading/error claros, Close/Escape/fondo y retorno al invocador. Un fallo mantiene acceso al archivo
permitido y nunca usa una imagen ajena como reemplazo.

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
contraste UI medido y ausencia de overflow horizontal. El scorecard de 14 dimensiones debe conservar
criterio y evidencia; media ≥4.5, ninguna <4 y dimensiones prioritarias ≥4.5. No puntuar a partir de tests.

`pnpm lab:test` comprueba dos casos de entrada: mezcla de marcas, paths inseguros, fuentes ajenas,
cobertura engañosa y ausencia de payload/default entre workspaces. CI `lab-checks` instala sólo
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
