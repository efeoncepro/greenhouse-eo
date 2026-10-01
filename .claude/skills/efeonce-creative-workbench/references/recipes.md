# Composiciones nombradas y recetas · Codex y Claude

## Prueba de composición a cuatro formatos — 2026-09-30

La pieza `projects/sky/always-on-modular-demo`, en `/tmp/cw-sky-production-flow`, usa tres
composiciones: «Marco · título y tarifa» para los nodos 2630 y 2611; «Destino flecha · claro
con servicios» para el nodo 4616; y «Banners · Chile y tarifa» para el nodo 3378. Cada job usa
su plantilla, geometría, campos, información legal y espacio fotográfico propios. Son
adaptaciones nativas, no escalados de un único dibujo. El texto se declara por formato; `$0`
y DEMO son marcadores internos. La fotografía histórica se conserva con `source-reference`.
Las cuatro corridas completadas sin proveedor no equivalen a cuatro piezas aprobadas.

Los nodos 2630, 2611 y 3378 fueron revisados. El nodo 4616 se corrigió en la nueva corrida
`dc16001d-13d1-476f-8a82-b68321362f8b`, completada sin llamadas al proveedor. La revisión
del agente principal confirmó el PNG limpio y las uniones medidas. El QA registra
`content-arrow` versión `1.0.0` y referencias exactas de fuente. Las 25 admisiones nuevas
conservan intactas las 74 anteriores, para un total de 99. La corrida defectuosa
`fc4dfeeb-afe3-4ab3-9f9a-3bc4b3dfe850` se conserva sin seleccionar.

La selección contiene cuatro corridas. La recarga y captura real del Lab en el puerto 4194
confirmaron el snapshot
`d8045ab5dae18557be6610c9e7a2e5ae502365e7e8705cf37588aa1701a7fcc5`. Los nombres proceden
de la intención «Sur»; la fuente «Calama» permanece intacta. El archivo privado de las cuatro
corridas contiene 68 archivos idénticos a los originales. En la suite productiva, 250 pruebas
privadas pasaron sin omisiones; en público, 232 pasaron y 18 se omitieron por recursos
licenciados. Eso no constituye aprobación comercial.

El recorrido plan → job → validación → ejecución → PNG → Lab está documentado en
[producción SKY](sky-production.md) y su manual. La receta describe la construcción; no
hereda información comercial ni inicia lotes o pagos. La autenticación Efeonce ID está diferida,
IA permanece apagada y el PR 7 sigue draft, sin promoción.

El operador pidió que cada composición tenga nombre, una receta que explique su construcción y
varias adaptaciones cuando existan en su fuente. La organización es **marca → composición → receta
versionada → adaptación → corrida**. Esta referencia documenta cómo operarla en Creative Workbench;
no se produce desde Greenhouse ni se alteran sus CLIs. El bundle Codex/Claude debe ser idéntico.

## Fuentes que abrir en Workbench

| Necesidad | Fuente propietaria |
| --- | --- |
| Decisión, modelo y fronteras | `docs/architecture/workbench-composition-recipes.md` |
| Uso humano y procedimiento | `docs/manual/composition-recipes.md` |
| Registro/derivación propios de SKY | `brands/sky-airline/compositions/definitions.mjs`, `catalog.mjs`, `native-component-slots.mjs` |
| Consulta y plan | Script `marca:recetas` en package.json y su tool propietaria |
| Componentes y variantes nativas | `brands/sky-airline/components/` y catálogo/planes de adaptación |
| Producción con contenido propio | `docs/manual/native-design.md`, entradas gobernadas de diseño |
| Presentación | `apps/brand-reference/`, sección Lab `#recetas` |
| Estado y evidencia de la unidad | `docs/operations/HARNESS_STATUS.md`, reviews y registros de proyectos |

Leer `AGENTS.md`, README, cliente/pack, pieza/brief y rama/status antes de editar. Si falta marca,
composición o fuente inequívoca, resolverlo; no elegir por colores, último turno, destino o parecido
de una fotografía. Compartir acceso entre todo el equipo no comparte identidad visual entre clientes.

## Qué representa cada nivel

La marca fija cliente, `brandId`, versión/SHA de pack y recursos propios. La composición tiene ID,
nombre legible y versión; describe un sistema visual, no sólo la ciudad o precio de un ejemplo.
La receta tiene ID/version y un proceso explícito. Una adaptación tiene formatId/nodo, canvas,
componentes/zonas y campos nativos propios. La corrida tiene locks, productor, outputs y QA ligados
por SHA. Nombres legibles ayudan a encontrar; IDs y fuente verifican qué se va a producir.

Dos formatos con la misma ciudad o tamaños parecidos no prueban la misma composición. El registro
declara la relación desde fuentes; puede haber un grupo de un solo formato cuando la variante es
singular. No fabricar adaptaciones para hacer que todas las recetas tengan la misma cantidad.

## Contrato de metadata y autoridad

La implementación propia SKY tiene definiciones compiladas/pinneadas y un builder de catálogo.
`buildSkyCompositionCatalog` recibe `catalog`, `catalogSha256`, `tokens`, `tokensSha256`, `brandId`,
`packVersion` y `packSha256`. Verifica ese contexto antes de relacionar fuentes y formatos. No
re-sella pack 0.1.0 ni modifica paquetes publicados para admitir esta metadata de mantenimiento.

Cada composición expone `brandId`, `id`, `name`, `version`; `recipe` con `id`, `version`, `steps`;
`components` con `id`/`name`; `tokenReferences`; y `adaptations` con `formatId`. La cobertura SKY
v1.0.0 deriva sus composiciones del registro vigente y relaciona las 126 adaptaciones exactamente
una vez. Los campos por nodo, recursos, estilos efectivos y slots se derivan en planes, no se reemplazan por strings descriptivos de la receta.

Los nombres describen estructuras reutilizables mediante curaduría de labels/copy observado/zonas;
un destino o moneda históricos no son la identidad permanente de una receta. No se presenta un
nombre editorial como campaña extraída literalmente de Figma cuando el source tiene un label genérico.
`components` reúne zonas y canvas de las variantes, más CTA observado en grafos nativos sellados;
no afirma presencia de todos los módulos en cada formato. `componentPresenceBasis` declara
`catalog-zone-bindings-and-canvas; CTA presence and ownership from sealed-native-component-graph`.
Los fields CTA tienen owner `sky-airline.cta` y basis `sealed-native-component-graph`; los demás
conservan `catalog-zone-binding`, sin adivinar CTA desde el label de una zona. Las 21 familias de módulos,
composiciones del registro y 126 formatos son niveles distintos. La cantidad de composiciones se deriva del registro vigente;
fusionar estructuras comunes conserva campos/geometría/source propios de cada adaptación.

`tokenReferences` incluye `sourceId`, `name`, `collection`, `value` y
`basis: available-brand-token`. Son tokens disponibles del SSOT exacto de la marca. No afirmar
que un paint/nodo Figma está vinculado a ese token por coincidencia de nombre, hex o apariencia.
El inventario global contiene los 108 tokens del SSOT; cada receta de composición muestra diez
referencias curadas, tomadas de ese inventario exacto. `bindingEvidence: not-established` conserva
el límite. Un binding confirmado requiere evidencia de la fuente, fuera de esa selección editorial.

La receta no admite un recurso, habilita generación, cambia permisos o altera el catálogo de marca.
La autoridad productiva sigue consultándose en las entradas gobernadas y sus validators. El job
no incorpora `recipe`/`composition` como override, código, módulos ejecutables, CSS, coordenadas,
fonts, paths de salida o URLs de imagen. Una fuente ausente o relación cruzada falla cerrado.

Los módulos de definición/catálogo entran en el digest del adapter; plan y QA asocian composición/
receta automáticamente desde el formato admitido. Esa asociación deja procedencia auditable, pero
no concede aprobación comercial o fidelidad al diseño original por sí sola. No reescribir QA/outcome
previos para completar esa metadata: el Lab puede derivar la relación desde un formato verificado
sin anunciar que la corrida histórica ya la registró.

## Recetas de componente y proyección de slots nativos

Cada una de las 21 familias tiene `recipe` propio, con ID
`sky-airline.component-recipe.<kind>`, versión `1.0.0`, pasos y
`execution: existing-native-component; descriptive-metadata-only`. Es documentación del módulo
admitido y sus miembros de instancia; no otro renderer ni código recibido por job. Consultar tanto
la receta compositiva como los pasos de sus componentes antes de producir/adaptar una pieza.

El corte leído localmente el 2026-09-30 devuelve 37 composiciones, 126 adaptaciones y 21 recetas de
componente. `native-component-slots.mjs` proyecta 126 pins de template, 41 CTA members y 41 CTA
fields comparados con los grafos nativos sellados. Registra sólo sourceNodeId, templateSha256 y paths
propios; no publica fonts, vectores, fotos, copy comercial o paths privados. No es inventario visual
inferido desde nombres de zonas o una captura.

El digest `sourcePins.nativeComponentSlotsSha256` es
`15d273a5efeaf1b9c879d738dd66e1a26c1c047c36733c491947ff43b7c78174`, calculado sobre
`JSON.stringify(nativeComponentSlots)` y no sobre los bytes del módulo. La lectura compara digest,
cobertura/source/template pins, unicidad y correspondencia de fields con CTA members bajo su nodo.
Los módulos de mapa/catálogo/definiciones forman parte del SHA del adapter para conservar auditabilidad.

Mantenimiento: tener fuente autorizada/admitida; leer catálogo y templates privados sin modificarlos;
derivar sus grafos con el código dueño de componentes; comparar todos los members/fields; preparar
metadata sin material licenciado; revisar differences y actualizar versión/pins/digest juntos. No
inferir CTA por «Ver vuelos», rectángulos parecidos, coordenadas libres o un recurso global. CTA
inexistente conserva arrays vacíos. Una fuente nueva sin admisión no se usa para regenerar el mapa.

Verificar proyección pública y contraste privado con grafos sellados, registrando método/hash/evidencia.
Un test sin canon comprueba metadata/pins, no certifica extracción de templates nuevos. No re-sellar
pack 0.1.0, cambiar el canon o alterar QA/outcomes antiguos para completar la proyección. Cambios de
comportamiento requieren nueva corrida; cambios del registro que se mostrarán requieren otro build.
La extracción no se expone como ejecución de un job o acción del cliente del Lab.

## Procedimiento de lectura y plan

Desde la raíz de Workbench:

```sh
pnpm marca:recetas sky
pnpm marca:recetas sky <compositionId>
pnpm marca:recetas sky <compositionId> --plan projects/sky/<pieza>
```

Resolver IDs y pieza propios antes de ejecutar. La consulta es de lectura local, no producción.
El reader devuelve `workbench.composition-reader.v1`, brandId/version/catalogSha256, sourcePins y
compositions, con `authorization: read-only-reference` y `commercialApproval: none`. El modo
plan agrega `productionAuthority: not-verified` y `batchExecution: false`. No implementar un batch
de ejecución por iniciativa del agente ni confundir planes de un grupo con piezas autorizadas.

`--plan` exige composición explícita y pieza existente de la misma marca; devuelve planes por
adaptación sin crear corrida, llamar proveedores o acreditar autoridad. Un plan bloqueado debe
mostrar su razón; no confundir pertenecer al grupo con `eligible-for-validation` ni con una pieza
lista para ejecutar. Esa eligibility tampoco demuestra que un copy nuevo quepa.

Para resolver una variante puntual, consultar también `marca:adaptaciones ... --plan` y
`marca:zonas`. Cada `jobDraft` deja todos los textos vacíos y `photograph.kind: por-definir`; copy/foto están
incompletos. No completar automáticamente la campaña
con tarifas/fechas/condiciones/legales del ejemplo ni campos de otro nodo.

Ejemplo propio versionado: `sky-airline.composition.frame-title-standard`, **Marco · título y
tarifa**, reúne `node-2026-2611`, `node-2026-2630` y `node-2026-2649`; la receta es
`sky-airline.recipe.frame-title-standard` v1.0.0. Se puede consultar/planear con la pieza existente
`projects/sky/always-on-pipeline-proof`. No ejecutar producción de prueba sólo porque la receta
tenga tres variantes. Sus jobs requieren contenido y fotografía explícitos, uno por formato.

## Producir una campaña con varias adaptaciones

1. Leer marca/pack/version/SHA, composición/receta y fuentes por nodo. Cargar únicamente skills
   de esa marca admitidas para la operación; no aplicar identidad de Efeonce/AXIS a SKY o Berel.
2. Completar brief comercial propio: destino, oferta, fechas, condiciones, legal, formatos,
   canales, propósito y responsable. Confirmar datos con sus fuentes; el ejemplo histórico no
   es una propuesta vigente. Decidir qué adaptaciones pide el brief, no producir todas por defecto.
3. Obtener plan de receta y los planes nativos necesarios. Leer fuente/canvas, grafo de módulos,
   fields e IDs, fonts efectivas y photo slots. Resolver bloqueos de fuente/receta con el maintainer.
4. Crear un job de diseño por adaptación con **todos** sus campos explícitos. Los IDs son
   instance paths por nodo, no nombres de zona. Un componente puede poseer varios campos y una
   adaptación puede no contener un componente presente en las demás.
5. Declarar foto histórica explícita o `broker-run` propio. Foto nueva se produce por su entrada
   y skill admitidas, con UUID/autoridad/costo de esa marca/persona. La receta no autoriza un lote
   pagado, retries o una fuente global como fallback. Conservar la intención original.
6. Validar por `marca:disenar` con el contrato existente. Verifica autoridad viva, recursos,
   glifos, fit/overflow y encuadre antes de crear run. No cambiar fuentes, tamaños, colores,
   coordenadas o adapter desde el job para hacer caber copy incompatible.
7. Ejecutar las piezas autorizadas, cada una con nueva corrida. Locks/inputs/outputs propios y
   QA conservan recipe association, fuentes, repairs, crop y medidas. No sobrescribir el run
   de la fotografía ni una salida anterior para hacer otra variante.
8. Inspeccionar cada PNG/SVG original: logo oficial, flecha continua, CTA centrado, texto y
   legal completos, crop, contraste y lenguaje fotográfico. Una fuente correcta no garantiza
   legibilidad sobre cualquier imagen; una foto aprobada no certifica todos sus encuadres.
9. Registrar revisión por run/PNG SHA, archivar privados con ubicación duradera y separar
   validado, ejecutado, revisado, aprobado, publicado y entregado. Añadir resultados al Lab usa
   selección gobernada y build nuevo, nunca una sustitución de PNG dentro del snapshot.

Los [componentes](components.md) poseen geometría y comportamiento: logo, flecha, CTA, fotografía,
legal y demás módulos conservan variantes nativas. Reutilizar receta significa resolver cada
adaptación; no escalar un cuadrado para fabricar un banner ni copiar coordenadas de la primera.
Las [reglas de campaña SKY](sky-production.md) y [fotografía](sky-photography.md) siguen vigentes.

## Legal, comercial y tipografía

`footer-legal` y `fare-conditions` son bloques distintos. Legal ausente se declara ausente. Si el
brief necesita legal en una variante sin espacio, elegir otra admitida o solicitar mantenimiento
con evidencia; no heredarlo, añadirlo mediante CSS del Lab o considerarlo implícito por receta.

Cada formato declara el copy completo. Si se adapta la redacción para una caja más corta, esa
redacción requiere contenido explícito; no truncar, reducir fuente, quitar caracteres o inventar
otro CTA por iniciativa del agente. Metric sigue producción SKY; Inter es auxiliar/experimental.
Una cara no admitida falla sin fuente del sistema como fallback.

Cambios de geometría/fuentes/recipe de reparación son mantenimiento con pedido, source pins y
tests adecuados. La receta compositiva documenta admisiones existentes; no es un mecanismo nuevo
para pasar estilos libres al compositor ni readmitir packs a escondidas.

## Lab y criterios de revisión

La sección `#recetas` muestra fichas de nombre/propósito/count desplegables derivadas del registro, pasos, componentes,
tokens disponibles y adaptaciones del cliente. Buscar nombre, destino o formato, abrir la ficha y
consultar cuatro variantes inicialmente; desplegar las restantes si el grupo tiene más. Conteo,
vacío y reset orientan la consulta. Descargar `/composition-recipes.json` para conservar IDs,
versiones y relación exacta de formatos. **Muestras del Workbench** en `#composiciones` presenta
las seis corridas seleccionadas aparte, no todo el catálogo de recetas. Efeonce firma el chrome y el cliente posee el artwork. IDs, versiones y fuente están
disponibles para agentes sin dominar la experiencia del cliente. Elegir un formato debe conducir
a sus zonas y preservar la fuente activa; no perder la relación al filtrar/abrir una composición.

La revisión verifica identidad/cobertura/relaciones, escapes, controles de lectura, acceso a
adaptaciones y coherencia de sus planes. Probar casos cross-brand, formatos duplicados, receta/
versión/source distintos y campos/legales ausentes. Las pruebas no llaman proveedores. Una ficha
visible no equivale a receta productiva aprobada ni a controls independientes de Figma.

## Continuidad y límites

Una receta nueva o corregida se registra en su dueño Workbench con fuente, versión, diffs y
evidencia. Actualizar manual y esta referencia espejo cuando cambie cómo operarla. Estado/build/
push/Preview/promoción se registran aparte. No copiar assets, fuentes, outputs o secretos a la skill.

No afirmar actualización de Packages, broker o Vercel por implementar metadata local; comprobar
sus superficies reales si es necesario reportarlas. La unidad tampoco cierra los 121 controles
Figma independientes pendientes del corte anterior ni habilita packs propios de Berel/Efeonce.
Consultar [continuidad](state-continuity.md) antes de retomar y verificar situación actual.

## Lotes para agentes — unidad local 2026-09-30

El objetivo del operador es componer campañas mediante agentes, con el Lab como revisión.
Workbench añade `marca:lote <pieza> --validate|--prepare <manifiesto>` y
`marca:lote <pieza> --execute|--receipt <UUID>`. El manifiesto
`workbench.design-batch.v1` contiene marca, versión, nombre y hasta 126 `{id,job}` completos.
Una marca/pieza/versión por lote; contenido por campo y foto propia por UUID admitido o
referencia histórica explícita. Ningún estilo, coordenada, código, token ni path de foto.

Leer primero los dueños Workbench `docs/manual/design-batches.md` y
`docs/architecture/workbench-design-batches.md`. Consultar receta/planes de cada adaptación,
completar copy y legal desde el brief y validar toda la campaña antes de preparar. El snapshot
pinneado fija dueño GitHub ID/login, política, pieza, pack, recursos, adapter y runtime.
Cambiar manifiesto original no modifica el snapshot. Cambios de versiones/permisos se rechazan;
una preparación nueva requiere la acción explícita del operador.

Se ejecuta secuencialmente y reserva un UUID durable antes de cada run. Repetir el mismo UUID
devuelve completados verificados y continúa sólo entradas pendientes. Un run reservado ausente,
parcial o fallido detiene el lote, sin retries automáticos ni otro UUID por defecto. Lease
abandonado requiere revisión de maintainer; nunca quitarlo por timeout. Journal local no es
autoridad contra quien pueda reescribir disco. Outputs, fuentes y snapshots privados fuera de Git.

La unidad `codex/agent-composition-batches`, base main `8b6bfe9`, produjo lote real
`35977d6b-6f25-44d0-a165-347fa7cea9ac` en cuatro formatos nativos. Nueva ejecución devolvió
el mismo receipt sin nuevas corridas. 267 tests harness + 7 SKY privados PASS sin skips;
públicos 251 + 5 PASS y exactamente 16 + 2 SKIP licenciados. 10 tests de lote cubren
aislamiento, autoridad, cambios de código/pack, carreras, crash y recuperación, foto por UUID
con resolver simulado y corrupción. Prueba CLI real usa foto histórica; no prueba broker live
de foto por lote ni generación. Binarios y logs están en el canon privado de operaciones
`2026-09-30-agent-composition-batches`. Estado de push/PR/main se verifica aparte.

Receipt conserva PNG/SVG/QA y selección de runs para el Lab, con revisión humana/comercial
pendiente. 126 es límite y catálogo, no garantía de cualquier copy/foto ni fidelidad final.
SKY es el único driver productivo hoy; no arrastrar sus recursos a otra marca. IA/autenticación
no se activan por añadir lote; Efeonce ID conserva TASK-1952 diferida.
