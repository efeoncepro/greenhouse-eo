# Producción SKY mediante agentes: arranque, composición y cierre

Procedimiento para Codex y Claude, corte integrado 2026-10-01. El código y los comandos se
ejecutan desde **Creative Workbench**. Greenhouse conserva esta skill y continuidad; sus CLIs
no participan. [Estado](state-continuity.md) separa disponibilidad de código y runtime.

## Qué se puede hacer hoy

Componer una campaña sobre las variantes SKY admitidas, con contenido explícito por campo y
fotografía histórica declarada o fotografía propia ya admitida; validar, ejecutar secuencialmente,
consultar resultados y presentar un snapshot Lab. No se necesita un editor visual ni activar
generación para esa composición. Hay 37 composiciones nombradas con recetas, 126 adaptaciones,
21 familias semánticas y 11.096 instancias estructurales. Los conteos se comprueban en la fuente,
no se convierten en límite de estilo o en promesa de que cualquier copy cabrá.

La escena productiva recompone componentes, tokens, jerarquía y dependencias antes de aplicar
copy/foto. Una biblioteca exportada permite inspección y roundtrip, **no** un JSON libre que el
agente edita para cambiar geometría. Nuevas estructuras, estilos o fuentes requieren admisión
de mantenimiento. Una nueva campaña cambia contenido de slots propios, no el pack de marca.

La [biblioteca de íconos SKY](icons.md) se puede consultar/seleccionar por ID,
kind y canvas nativo, y presentar en `/iconos/`. Sigue candidata: si el brief
pide incorporarla a una pieza, detener ese cambio de estructura para admisión de
mantenimiento; no pasar SVG/URL/path libre ni confundir selector readonly con job.

## 1. Preparar persona, máquina y marca

1. Leer Workbench `AGENTS.md`, `CLAUDE.md`, README, catálogo, pack, brief y estado Git. Preservar
   WIP ajeno; no cambiar de branch ni usar un checkout de otro agente para producir.
2. Seguir `docs/manual/team-onboarding.md`. Usar Node compatible, pnpm del `packageManager` y
   canon propio instalado; mínimo del harness Node 22.12, entorno de checks Lab Node 24 LTS.
3. Configurar autoría con la cuenta propia y comprobar hooks antes de commit/push:

   ```sh
   pnpm instalar
   pnpm git:identidad --configure
   pnpm git:identidad --check
   ```

   Estos comandos no crean auth del broker ni conceden Packages/Vercel. No copiar identidad
   del operador, imprimir tokens, cambiar scopes o eludir hooks. Conflicto con hooks existentes
   requiere integración del maintainer, no reemplazo silencioso.
4. Resolver `sky` → `sky-airline` → pack/version/SHA → operación. Consultar el estado actual,
   no una cache de la marca anterior. `marca:doctor sky reference.compose` debe demostrar canon
   suficiente para composición. Si falta, usar el instalador admitido; no fuente del sistema.

## 2. Convertir el brief en planes por formato

Confirmar objetivo, mercado, canales, formatos, destino/origen, tarifa/moneda, ventanas de viaje
y venta, condiciones, CTA, legal, derechos de foto y aprobación comercial. Las tarifas/fechas
de Figma son datos históricos; no llenar huecos comerciales a partir de ellas.

Desde la raíz Workbench, después de resolver una pieza nueva propia:

```sh
pnpm pieza:nueva sky campana-nueva
pnpm marca:recetas sky
pnpm marca:recetas sky <compositionId> --plan projects/sky/campana-nueva
pnpm marca:adaptaciones sky <formatId> --plan projects/sky/campana-nueva
pnpm marca:zonas sky <formatId>
pnpm marca:componentes sky <formatId>
```

Resolver placeholders desde las respuestas; no elegir por nombre repetido, destino parecido o
último formato visible. El plan de receta es readonly y no certifica autoridad productiva.
Su `jobDraft` deja textos vacíos y foto por definir. Cada variante conserva sus propios campos,
fuentes Metric efectivas, canvas, máscara, photo slot y presencia/ausencia de legal.

La definición semántica ayuda a buscar. La instancia estructural posee placement, orden,
clips/masks/blend y assets; un módulo con varios campos no es una sola caja de texto. Los
108 tokens del pack, los valores nativos derivados y los bindings Figma comprobados no son
intercambiables. No convertir coincidencias hex/nombre en un binding ni llevar tokens host Efeonce
al artwork SKY. [Autónomos](autonomous-components.md) describe la lectura por ID completo.

## 3. Repartir preparación y revisión entre agentes

Delegar sólo cuando esté autorizado. Asignar a cada agente un conjunto disjunto de formatIds y
archivos job, con la misma marca/pack/version, brief comercial común y datos aprobados. Entregar
receta, planes, fuentes y esta skill; pedir resultado y pendientes por formato. No delegar a un
agente de Berel/Efeonce cargado con identidad visual ajena y esperar que la cambie por parecido.

Cada agente prepara y revisa su contenido; un coordinador reúne el manifiesto y comprueba
cobertura única, campos completos y fuentes. La entrada `marca:lote` ejecuta **secuencialmente**;
no lanzar composiciones concurrentes contra una pieza/carpeta mutable ni inventar una cola.
Si una adaptación falla, registrar causa/ID. No rellenarla con un PNG de otra variante, una
fuente fallback ni un recurso ajeno para informar cobertura completa.

## 4. Declarar contenido y fotografía

Crear un `workbench.design-job.v1` completo por adaptación según el manual `native-design.md`.
`text` requiere todos los IDs del plan, incluidos precio, condiciones, CTA y legal presentes.
`footer-legal` y `fare-conditions` son distintos. Ausencia de footer no significa heredar el
legal del cuadrado; si el brief lo exige, elegir variante admitida o pedir mantenimiento.

`photograph.kind: source-reference` conserva explícitamente fotografía histórica, útil para
prueba o reutilización autorizada; no acredita derechos nuevos. `broker-run` referencia intención
fotográfica propia, requestId y slotId admitidos; el compositor verifica y recupera sus bytes,
sin generar otra imagen. No admite rutas/URLs libres, UUID de otro productor o crop desde el job.

Una fotografía nueva exige la [skill SKY](sky-photography.md), SCENE adecuada a los encuadres,
recursos/prompt admitidos, autoridad, cotización/presupuesto y generación habilitada. La política
draft o IA OFF bloquea ese paso; no ampliar permisos ni crear otro AUTH para saltarlo. El límite
50/500 USD aprobado es un techo, no autorización automática de pago. Ante incertidumbre pagada,
consultar el **mismo UUID**; la actualización de un renderer no es razón para duplicar la foto.

## 5. Validar y producir

Para una adaptación, con job completo propio (su path se resuelve desde root):

```sh
pnpm marca:disenar projects/sky/campana-nueva projects/sky/campana-nueva/job.json --validate
pnpm marca:disenar projects/sky/campana-nueva projects/sky/campana-nueva/job.json --execute
```

Validación verifica autoridad viva y fit antes de crear run; no paga proveedor. Puede recuperar
una foto broker ya existente. Overflow, glyph/fuente/receta ausente, contenido incompleto o
fotografía ajena bloquean: corregir copy o elegir variante; no achicar letra ni cambiar estilos.

Para varias adaptaciones, crear `workbench.design-batch.v1`: marca, versión, nombre y hasta 126
entradas únicas `{id, job}`, con **objeto job completo**, no un path. Ver manual `design-batches.md`.
Validar todos los jobs antes de preparar y conservar el UUID devuelto:

```sh
pnpm marca:lote projects/sky/campana-nueva --validate projects/sky/campana-nueva/batch.json
pnpm marca:lote projects/sky/campana-nueva --prepare projects/sky/campana-nueva/batch.json
pnpm marca:lote projects/sky/campana-nueva --execute <UUID-lote>
pnpm marca:lote projects/sky/campana-nueva --receipt <UUID-lote>
```

El snapshot fija persona, pack, policy, recursos, adapter y runtime; editar el manifiesto no
cambia una preparación cerrada. Repetir execute devuelve completados verificados y continúa
sólo pendientes; run reservado ausente/parcial/fallido o lease abandonado detiene. No borrar
locks ni reintentar con otra intención. Cambio legítimo de engine/pack exige nueva preparación
explícita; conservar todos los registros anteriores y reconciliar incertidumbre primero.

## 6. Revisar los originales y conservar evidencia

Por formatId y run, abrir PNG completo nativo y recortes relevantes. Revisar:

- Logo oficial, escala/clip y avión vectorial visible conforme fuente; flecha continua con ambas
  uniones, incluida pintura blanca; círculos con trazado y transformación nativos.
- Tipografía Metric/caras/pesos, texto completo, centros de tinta del CTA, moneda/fechas/legal.
- Crop de foto, hito/rostro/foreground, reserva de texto, contraste y legibilidad del KV real.
- QA `modularity` (identidad, SHA, coverage y roundtrip), repairs/slots/photoFit y controles
  de procedencia. Una métrica no reemplaza la revisión del PNG ni aprobación comercial.

Registrar método, hallazgos, resultado y PNG/SVG SHA en evaluación de pieza. La comparación
técnica independiente de 126 referencias ya está cerrada y fue conservada por igualdad de bytes;
no volver a pedir 121 controles ni transferir esa revisión a nuevo copy/foto por deducción.
`completed` significa ejecución terminada. Revisión, aprobación, archivo, publicación y entrega
tienen estados distintos. Binarios/licencias quedan fuera de Git, con ubicación durable y SHA.

## 7. Presentar el Lab y cerrar continuidad

Seleccionar explícitamente los runs revisados y construir mediante `reference:build`; no
`astro build` sobre JSON libre ni retocar imágenes en un snapshot. El Lab premium tiene recetas,
mesa de variantes/zona, tokens, Metric y recursos propios. Header/footer Efeonce son host, no una
firma añadida a los PNG SKY. Revisar desktop/móvil, foco, navegación, no-JS/reduced-motion y hashes.

Un build nuevo genera digest nuevo. Muestras antiguas conservan outputs; flags de referencias
no las regeneran. Desplegar sólo el snapshot revisado por el carril autorizado, con protección y
readback. El alias SKY protegido está registrado; `creative.efeonce.org` sigue pendiente. Mostrar
cliente/versión y explicar datos históricos, sin anunciar tarifas vigentes desde la biblioteca.

Actualizar dueños Workbench, HARNESS_STATUS y evaluación; actualizar la referencia de esta skill
si cambió la operación. Comparar ambos bundles con `scripts/validate.py`. No copiar secretos,
fonts Metric, biblioteca serializada ni outputs a la skill. Dejar pendientes con siguiente evidencia
y owner; no cerrar IA, onboarding de todos o Efeonce ID por producir un lote sin proveedor.

## Contenido y alineación vigentes — 2026-10-01

Leer [destinos y espacios adaptativos](destination-content-flow.md) y el
[cierre del feedback](layout-feedback-handoff.md). Contenido 1.5.0 / destino 1.2.0 corrige
los 76 badges tarifarios y las relaciones footer/fila/prefijo/editorial; v6 es el export local
revisado. La auditoría conserva cobertura, runs y checks. Preservar geometría admitida,
fotos/ventanas y corridas históricas; aceptación visual del operador y aprobación comercial
siguen pendientes. El pedido posterior autoriza commit local de lo propio; registrar su
evidencia separada de push, publicación y deploy.
