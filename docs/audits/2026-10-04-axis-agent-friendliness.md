# AXIS: autonomía de composición para agentes

Fecha: 2026-10-04. Estado: **auditoría inicial preservada; remediación posterior implementada y desplegada**.
Estado actual: [cierre documental y evidencia](2026-10-04-axis-documentation-closure.md).
Las evaluaciones y propuestas siguientes describen el corte inicial `a41e81f`, no el estado posterior.
Fuente evaluada: `axis-design-system@a41e81f92c8b3e0e7f03219366e0d57623f5cd66` y `https://axis.efeonce.org`.
Tres subagentes independientes revisaron entrada/documentación, ejecución/paquetes y Lab público.
La revisión excluyó el WIP de AI Visibility Report en AXIS. No se modificó ni publicó código.

## Respuesta

AXIS tiene una base técnica sólida para agentes que conocen su ecosistema. Un agente nuevo puede descubrir
recursos y ejecutar algunos ejemplos completos, pero **no encuentra un recorrido uniforme desde su objetivo
hasta una pieza final verificada**. Los principales problemas son el descubrimiento, la continuidad entre
manifest y renderizador y la interpretación de evidencia. No se necesita sustituir los contratos actuales.

| Capacidad | Evaluación | Evidencia |
| --- | --- | --- |
| Entender un recurso encontrado | Fuerte | Semántica, usos, alternativas, slots, referencias y estados |
| Elegir por objetivo desde la entrada | Parcial | Índice general presentado como AEO; home centrada en registry de patrones |
| Validar intención y recuperar errores | Fuerte | Resolver operativo; error con código, exit 1 y manifest inválido |
| Consumir primitivas fuera del monorepo | Verificado | Cuatro tarballs instalados en consumidor aislado; imports y SVG correctos |
| Producir una pieza completa | Desigual por familia | Búsqueda genera seis SVG; superficie entrega manifest y delegates |
| Probar cumplimiento de toda la pieza | Parcial | Helpers útiles, sin informe unificado de cobertura/evidencia pendiente |

La evaluación distingue tres situaciones: agente con skills Greenhouse, agente con checkout AXIS autorizado
y agente con sólo la URL pública. El tercero no tiene acceso automático a las guías privadas. No se considera
un defecto que los paquetes sean privados ni que un producto sea dueño de su adapter.

## Pruebas ejecutadas

1. **Superficie:** `pnpm surface:resolve -- --input docs/examples/surfaces/deck-close-classic-intent.json --out <archivo>`.
   Exit 0; `status: resolved`; receta aprobada `close-classic`; 17 reglas. No produce una lámina terminada.
2. **Error recuperable:** el mismo intent con formato `9x16` produjo exit 1,
   `format-invalid-for-surface` en `format`, y manifest inválido persistido.
3. **Composición de búsqueda:** `pnpm search:compose --input docs/examples/ai-search-graphic/efeonce-suggestions.json --out-dir <directorio>`.
   Exit 0; seis SVG editables y manifest con dimensiones, hashes y procedencia `editorial-sample`.
   Se inspeccionó su preview; esta revisión no acredita todas las variantes.
4. **Consumidor aislado:** instalación offline de cuatro tarballs del SHA evaluado, con configuración npm vacía,
   sin credenciales ni React. Funcionan tokens `0.3.42`, contracts `0.3.42`, brand-assets `0.4.18` y
   graphic-line `0.17.0`; resolver, órbita y Brand Authority operan fuera del monorepo.
   Esto prueba portabilidad del contenido empaquetado, no instalación remota autenticada.
5. **Cobertura de QA:** un manifest declara 13 checks de adapter; sin cajas medidas el helper devuelve sólo
   `decorative-svg: true`. Con una caja cruzando un anillo detecta `text-never-crosses-ring: false`.
6. **Enlaces locales:** 351 destinos relativos en 36 documentos revisados, ninguno ausente.
   Este control no valida anchors ni acceso web ni rutas escritas como texto dentro de JSON.
7. **Superficie pública:** rutas, registry y manifests consultados por HTTP; observaciones detalladas abajo.

Evidencia conservada:
[consumidor y QA](evidence/2026-10-04-axis-agent-friendliness/consumer-summary.json),
[búsqueda](evidence/2026-10-04-axis-agent-friendliness/search-manifest.json),
[surface resuelto](evidence/2026-10-04-axis-agent-friendliness/surface-manifest.json),
[surface inválido](evidence/2026-10-04-axis-agent-friendliness/invalid-manifest.json).

## Hallazgos prioritarios

### 1. Entrada por intención insuficiente — prioridad alta

El README empieza por consumo privado y una historia extensa de releases. La guía para agentes aparece en
`README.md:136`; el índice de composición se presenta como recurso AEO en `README.md:146` aunque contiene
superficies, correo, Glitch, Manzanitas, informes, fotografía e iconografía. Su propio título y párrafo inicial
conservan ese encuadre (`docs/agent-composition/README.md:1-5`). No hay un AGENTS/skill de arranque versionado en AXIS.

No es obligatorio un nombre de archivo concreto; falta una entrada breve y evidente que enrute
«quiero un post / un deck / un correo / un icono» al procedimiento correspondiente. `DESIGN.md` sirve para
valores y principios, pero no enlaza ese recorrido general y no explica la excepción de `axis-graphic-line`
al hablar de componentes pintados (`DESIGN.md:325-354`).

### 2. Manifest y pieza terminada no tienen una continuidad uniforme — prioridad alta

`docs/agent-composition/surfaces/README.md:99-106` entrega delegates y luego indica «Compón» mediante paquete
o adapter Greenhouse. El pintor genérico deja el texto al consumidor (`packages/graphic-line/src/paint.ts:196-197`).
En la prueba, el SVG del delegado no incluye «Decidir juntos»: es un resultado parcial correcto, no el cierre completo.

El catálogo de deck tiene 100 recetas y 100 campos `renderSource.script`; ninguno de esos paths existe dentro
de AXIS. Ejemplo: `docs/agent-composition/surfaces/deck-recipes.json:141-143`. No demuestra que los renders no
existan en el ecosistema; demuestra que el agente necesita otra fuente y un procedimiento de recuperación/ejecución.
La documentación del paquete ofrece cuatro variantes de `deckSlideHtml`, sin un mapa ejecutable de las cien recetas.

Mejora: cada capacidad debe declarar **qué produce aquí**, el adapter que termina el trabajo, su repo,
prerrequisitos, comando, formatos de salida y forma de verificación. No requiere mover todos los adapters a AXIS.

### 3. Evidencia visual y cobertura de checks pueden interpretarse como aprobación — prioridad alta

La ficha de patrones pinta checks ✓ fijos para Keyboard and focus, 390 px responsive y Reduced motion
bajo «Promotion evidence / Before stable», sin resultados, fecha ni artefacto asociados
(`apps/lab/src/pages/patterns/[id].astro:26-33`). El título indica condiciones de promoción; los checks
visuales sugieren cumplimiento. No se afirma que esas capacidades fallen: falta trazabilidad de la afirmación.

Además, `runAdapterChecks` ejecuta sólo lo que puede medir con las cajas proporcionadas; omite categorías si
no llegan sus entradas opcionales (`packages/graphic-line/src/checks.ts:41-63`). La prueba devuelve un único
check positivo frente a trece declarados. El helper funciona según su contrato, pero `every(ok)` no prueba
que toda la pieza esté verificada.

Mejora: distinguir requisito, comprobación aprobada, fallida, no aplicable y evidencia faltante; asociar
el resultado a un archivo y a la versión del render. Mantener separadas aprobación visual de referencia,
madurez del contrato, publicación del paquete y QA de la pieza producida.

### 4. La entrada pública pierde continuidad — prioridad alta

[Docs](https://axis.efeonce.org/docs/) contiene tres párrafos, sin instalación, acceso, ejemplo ejecutable
ni QA inicial (`apps/lab/src/content/docs/index.mdx:7-17`). Creative resources enlaza guías/schemas en
GitHub que devolvieron 404 anónimo: los archivos existen en el repo privado, por lo que es una barrera de
acceso y de onboarding, no evidencia de archivos borrados.

Hay un destino realmente ausente: [Glitch JSON](https://axis.efeonce.org/references/glitch.json) dirige
para otras piezas a `/references/graphic-line.json`, que devuelve 404; esa ruta no existe en el source
(`apps/lab/src/pages/references/glitch.json.ts:44`).

Mejora: publicar el mínimo de guía/schema/ejemplo permitido en la misma superficie y declarar el acceso
requerido donde haya dependencia privada. Reparar el enlace al manifest general.

### 5. Descubrimiento de capacidades incompleto — prioridad media

La home contiene 29 patrones. Su búsqueda no devuelve Glitch, Manzanitas ni surface-composition aunque
sus contratos están exportados y tienen referencias/resolvers. La navegación global sí los muestra.
El registry de patrones es un catálogo parcial, no un inventario de todo lo componible
(`packages/registry/src/index.ts:3-33`; `packages/contracts/src/index.ts:939-941`).

La ficha pública `efeonce.ai-search-composition` usa la referencia genérica de estado y no enlaza
contextualmente al editor real (`PatternReference.astro:304-307`). Existen manifests útiles, especialmente
`surfaces.json`, pero no un índice global accionable. No tener `llms.txt` o `robots.txt` no es un defecto
por sí solo; agregarlos no arreglaría la falta de routing, acceso y ejecución.

### 6. Estado vigente mezclado con historia — prioridad media

README declara publicados Insights `0.3.42`/contrato `0.2.0`, pero otro bloque dice Unreleased y `0.1.0`
(`README.md:20-27`, `41-46`). El índice también cita `0.1.0` (`docs/agent-composition/README.md:47`),
mientras el contrato fuente es `0.2.0` (`packages/contracts/src/insights-stat-card.ts:31`).
El encabezado de deck habla de 78 láminas y el JSON enumera 100 (`surfaces/deck.md:14`, `deck-recipes.json:6`).

Mejora: resumen vigente generado desde source/package/registry; cambios históricos aparte. Verificar enlaces,
versiones, ejemplos y cobertura del catálogo en CI.

### 7. La portabilidad del paquete supera a la de la experiencia de autoría — prioridad media

Los imports funcionan fuera del repo, pero el paquete contracts distribuye `dist`, sin bin ni schemas
(`packages/contracts/package.json:13-19`). El schema como subpath devuelve `ERR_PACKAGE_PATH_NOT_EXPORTED`.
Los CLI viven en el monorepo y algunos necesitan Chrome, Playwright y fuentes locales, incluso búsqueda
(`apps/lab/scripts/compose-search.mjs:201-207`). La máquina auditada ya tenía esos requisitos.

Mejora: ofrecer una ruta explícita para consumidor de paquete y otra para autor con checkout; un preflight
por capacidad debe informar qué falta antes de componer. Mantener las fuentes licenciadas y el acceso privado
bajo sus reglas, sin empaquetarlos por conveniencia.

## Qué conservar

- Los contratos de intención, validadores y errores estructurados.
- La separación entre tokens, intención, rendering y aprobación.
- Los catálogos semánticos: `useWhen`, `avoidWhen`, alternativas, pares y data slots.
- La portabilidad de paquetes y React opcional.
- Los SVG editables, hashes, procedencia y estados por entrada.
- Los JSON públicos ricos de superficies, Glitch y Manzanitas.
- El criterio de QA sobre píxeles finales, complementado con evidencia medible.

## Orden de mejora propuesto

1. **Entrada única para agentes**, visible desde home, README y DESIGN: objetivo → capacidad → ruta.
2. **Inventario de capacidades**, fuente única que genere la guía humana y JSON público: estado, input/schema,
   ejemplo, acceso/prerrequisitos, resolver, adapter, comandos, salidas y checks. Separar contrato, recurso y renderer.
3. **Una receta completa por familia**, con salida real y comando de QA. Si termina fuera de AXIS, handoff
   explícito y verificable al repo correcto. Reparar primero links y ejemplos existentes.
4. **Evidencia y mantenimiento**, eliminando checks aparentes y comprobando drift, ejemplos y cobertura en CI.

No se propone un compositor universal ni un MCP como primer paso. Un transporte nuevo no sustituye el mapa
de capacidades ni completa una ruta de render. Se puede valorar después sobre operaciones ya definidas.

## Criterio de aceptación de una futura mejora

Un agente sin memoria Greenhouse debe poder completar tres recorridos con el acceso declarado de antemano:
un recurso AEO exportable, una pieza social Efeonce y un deck breve. En cada uno debe elegir una receta apropiada,
validar la intención, producir el formato solicitado y entregar evidencia de QA o identificar con precisión
la evidencia faltante. No debe inventar valores, reconstruir logos ni inspeccionar source para adivinar el
comando siguiente. La prueba debe registrar pasos, recuperación de errores, salida y dependencias externas.

La auditoría actual cubre ejemplos y rutas concretos; no certifica todas las recetas ni una instalación nueva
sin dependencias. Los archivos de este informe quedan locales en Greenhouse, sin commit/push.
