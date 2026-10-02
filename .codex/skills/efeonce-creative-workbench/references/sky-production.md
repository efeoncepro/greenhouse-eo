# SKY: producir una campaña y sus adaptaciones

## Recorrido productivo vigente — 2026-10-01

Se puede componer con agentes hoy desde Workbench actualizado: recetas y planes por adaptación,
jobs completos, `marca:disenar` o `marca:lote`, runs/QA y revisión de PNG. PR15 integra los
componentes autónomos y tokens; PR16 integra el Lab premium sobre esa base. Leer
[flujo de agentes](agent-production.md) como procedimiento de principio a fin y
[continuidad](state-continuity.md) para estados vigentes. No ejecutar ejemplos históricos como
campaña, pagar IA o crear otro AUTH para poder probar la composición.

La comparación independiente está completa técnicamente para 126/126 fuentes, con controles
REST y renders revisados. El módulo autónomo conserva esos 126 PNG y SVG por bytes. Esto no
certifica nuevo copy ni nuevo encuadre; cada pieza nueva conserva su propia evaluación.
Una actualización del engine invalida preparaciones con otro digest: nueva preparación/run,
sin modificar un UUID incierto de IA para reintentar un pago. La recuperación monetaria conserva
la intención original; el mantenimiento de composición es un flujo separado.

## Producción con las correcciones Figma — 2026-09-30

La unidad local Workbench `f9f0ef7` incorpora las correcciones contrastadas contra las
126 referencias Figma independientes. `marca:disenar` y el driver de `marca:lote` usan
el mismo adapter modular corregido. No son reparaciones manuales que deba repetir el
agente en cada campaña. Consultar [components.md](components.md) y, en Workbench,
`docs/manual/native-design.md`, sección «Producir después de una corrección del motor».

Alcance: doce instancias de logo, 105 flechas, contornos circulares/máscaras, CYBERSKY,
metadata de fuente y límites de tinta por fuente exacta. QA registra las recetas aplicadas,
incluidos `sourceFontRecipes` y `sourceInkRecipes`. Las 27 admisiones de tinta no permiten
ampliar la caja ni tolerar copy más largo; conservan únicamente el límite de la fuente
sellada. Multilínea usa baseline real. La URL legal canónica prefiere `/` y `-` como
separadores de wrap, sin eliminar caracteres ni cambiar pesos. No pasar overrides al job.

Verificar que el checkout contiene esta unidad o un sucesor integrado antes de producir.
El commit local no demuestra push/merge ni que el equipo ya lo recibió. Tokens, fuentes,
assets y pack `sky-airline@0.1.0` conservan sus sellos; estas correcciones de código no
requieren publicar un paquete nuevo ni cambiar el broker para componer.

Preparar jobs completos con nuevo copy y fotografía explícita; validar, ejecutar y revisar
PNG/QA por adaptación. Para sustituir muestras antiguas, crear corridas nuevas y actualizar
su selección del Lab después de revisarlas. No editar UUIDs cerrados ni reanudar lotes
pendientes con el digest anterior: revisar y preparar de nuevo. El Lab conserva cuatro
muestras productivas anteriores; las 126 proyecciones reparadas no las regeneran.

La comparación final produjo 126 renders, cero rechazos y revisión técnica por nodo.
Ese resultado de mantenimiento reemplaza el diagnóstico histórico de 95/31 citado abajo;
no garantiza fit de cualquier copy nuevo ni aprobación comercial. Se verificaron 305
pruebas locales sin SKIP. Evidencia y límites en [state-continuity.md](state-continuity.md).

## Histórico: corte productivo probado — 2026-09-30

El [PR 8 de producción](https://github.com/efeoncepro/creative-workbench/pull/8) se fusionó
en main con commit `c26d8afcad9a573bf6e2299a8ecf4e88783843ae` el 2026-09-30; los checks
del head `4de9414` pasaron antes del merge. Esto no acredita despliegue del Lab ni autenticación.

La prioridad actual es la producción modular. La autenticación mediante Efeonce ID se difirió:
no se creó un cliente OAuth propio y la base de acceso first-party sigue pendiente. El PR 7
permanece draft, con IA apagada y sin promoción; esta prueba no modifica esos límites ni permisos.

La pieza `projects/sky/always-on-modular-demo`, en `/tmp/cw-sky-production-flow`, contiene jobs
explícitos para los nodos 2630 (cuadrado), 2611 (story), 4616 (4:5) y 3378 (banner). Las cuatro
corridas terminaron en estado `completed`, con `providerInvocations: 0`. Usan la marca
`sky-airline`, el pack `0.1.0`, la operación `reference.compose` y el propósito `internal-proof`.
La fotografía es histórica y se declara mediante `source-reference`. Todos los textos del job
son explícitos; `$0` y DEMO son marcadores de prueba, no una oferta. La fuente determina la
geometría y los módulos; el job determina el contenido nuevo. No se generaron fotografías ni se
activó IA.

Los PNG de los nodos 2630, 2611 y 3378 fueron revisados. El nodo 4616 se corrigió en una nueva
corrida, `dc16001d-13d1-476f-8a82-b68321362f8b`, completada sin llamadas al proveedor. La
revisión del agente principal confirmó el PNG nativo limpio y 16 píxeles de las uniones en
x = 274 y x = 807, con valores RGB 255. El QA registra `content-arrow` versión `1.0.0`,
contorno continuo y referencias exactas de fuente. Se añadieron 25 admisiones y se conservaron
las 74 anteriores: 99 en total, sin modificar la fuente, fotografía, texto ni color. La corrida
defectuosa `fc4dfeeb-afe3-4ab3-9f9a-3bc4b3dfe850` se preservó fuera de la selección.

Las cuatro corridas están archivadas en el canon privado. Se comprobaron **68 archivos
idénticos**; el manual contiene la ubicación y los hashes de la reparación. La selección contiene
las cuatro corridas revisadas. El Lab local, recargado en el puerto 4194 y comprobado con una
captura real, muestra «Sur · Cuadrado», «Sur · Retrato» (1080 × 1920), «Vuela al sur · Banner» y
«Sur · Retrato» (1080 × 1350). Los nombres vienen de la intención propia; la referencia «Calama»
permanece intacta. El snapshot
`d8045ab5dae18557be6610c9e7a2e5ae502365e7e8705cf37588aa1701a7fcc5` contiene 307 archivos,
ninguna fuente licenciada SKY y cinco fuentes de la interfaz host.

En esta unidad productiva local, **250 pruebas privadas pasaron, sin omisiones**. En público,
232 pruebas pasaron y 18 se omitieron por el contrato de recursos licenciados. Astro revisó
34 archivos sin diagnósticos; la comprobación de tipos con TS7 y las 11 pruebas del Lab pasaron.
Estos resultados pertenecen a la unidad productiva, no a la suite de identidad. La captura local
no acredita Vercel, una fotografía nueva ni una oferta comercial.

El [manual de flujo productivo](../../../../docs/manual-de-uso/creative/creative-workbench-brand-preflight.md#flujo-productivo-nativo-verificado--2026-09-30)
contiene los comandos reproducibles. El recorrido es: leer el plan y los campos, completar el
job, ejecutar `marca:disenar --validate`, ejecutar `--execute`, revisar PNG y QA, seleccionar
las corridas, compilar mediante `reference:build` y revisar el Lab. Si el texto desborda, el
compositor rechaza el job antes de crear la corrida e identifica el campo y la zona exactos.
Corregir el texto o elegir otra variante admitida; no inventar geometría ni reducir la fuente.
Validar y renderizar no aprueba derechos, contraste u oferta. Una fotografía nueva mediante
`broker-run` y su recuperación requieren pruebas separadas.

## Sustitución fotográfica probada — PR 9 integrado, 2026-09-30

[PR 9](https://github.com/efeoncepro/creative-workbench/pull/9) integrado en main
`609d876feeef46b5785171d321fb4898ad9973cf` el 2026-09-30; implementación `ed043f4`. Admite
`sky-airline.photograph.native-focus-cover` 1.0.0 para tres pins/slots exactos: 2611, 3378 y 4616.
Los STRETCH preservan el foco normalizado de la fuente; el FIT admitido usa cover central.
Escala proporcional y recorte dentro de la caja nativa, sin bandas. El FILL de 2630 sigue nativo.
Originales y referencias no cambian. Fuera de esos pins, STRETCH sigue gated y FIT necesita proporción compatible.
El job no puede elegir crop/foco/receta; plan y `qa.photoFit` muestran admisión y ventana visible.

La descarga real del UUID `2024a611-873e-4c69-a651-09290408c345` recuperó el run broker
`ef508e41-8a29-4cb4-bead-6a8950851bd7`. La imagen SHA
`1dd0f3230549e0fbaec33fe7fe0077b18274bbfcbd84427921213ca65ab42172` es distinta del PNG que
el operador aprobó inicialmente: no hereda esa revisión. Se compuso con copy explícito Norte en
`projects/sky/always-on-photo-demo`; cuatro validaciones/corridas reales completadas, cero proveedores.
Canon privado: `/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-09-30/always-on-photo-demo/`.

Revisión de píxeles: cuadrado/story pierden contraste en texto blanco; legal de 4:5 cruza zonas claras,
y el hito se recorta en verticales. Las pruebas requieren otra foto apropiada antes de una campaña.
No modificar estilos, añadir scrim ni afirmar aprobación porque el contrato técnico validó.
La variante banner conserva el CTA legible; tampoco concede aprobación comercial.

Pruebas locales de esta unidad: 258 privadas PASS sin skips; 240 públicas PASS y exactamente 18 SKIP
licenciadas. Gates PASS. El merge se confirmó por API. Los checks del head `6be05b2` y su preview Vercel
pasaron; no acredita publicación de estas cuatro corridas privadas ni activación IA. El Lab local
con cuatro pruebas está en `http://127.0.0.1:49511/#composiciones`, snapshot
`937829acda62d5887d5e2aa248c6dc5ed1038f24925bd6f17b8a25d7c0c41891`, 307 archivos,
cero fonts licenciadas SKY y cinco fonts host; readback HTTP 200. Estos datos no prueban runtime IA. Leer en Workbench `docs/architecture/workbench-sky-photo-frame.md` y el README de
la pieza para reproducción, procedencia, recorte y diagnóstico. La recuperación exige conservar
la intención original; otra persona necesita un UUID propio, no copiar el binding/dueño.

## Antes del diseño

Identificar cliente `sky`, marca `sky-airline`, pieza y campaña. Recoger objetivo, mercado,
destino/origen, período de venta/viaje, tarifa/moneda/condiciones, CTA, canales/formatos y
fuente de aprobación comercial. No reconstruir datos faltantes desde las tarifas del Figma.
La tipografía vigente confirmada por el operador es **Metric**; Inter es auxiliar/experimental.

Leer en Workbench `docs/manual/native-design.md`, `docs/manual/kv-zones.md`, el pack activo
y el brief. Instalar su canon por la ruta gobernada si falta; no copiar fuentes del sistema.

## Descubrir formatos y preparar contenido

Desde el root de Workbench, estas consultas son de lectura:

```sh
pnpm marca:adaptaciones sky
pnpm marca:adaptaciones sky node-2026-3928
pnpm marca:zonas sky node-2026-3928
```

El catálogo incluye 126 escenas nativas, no sólo exports ZIP visibles. Resolver por ID de nodo,
nunca por nombre repetido ni suponiendo que dos “banner” tienen iguales campos o legal.
Cada adaptación conserva canvas, membresía de zonas, textos, imágenes y jerarquía propios.

Para una pieza nueva:

```sh
pnpm pieza:nueva sky campana-nueva
pnpm marca:adaptaciones sky node-2026-3928 --plan projects/sky/campana-nueva
```

Son ejemplos de preparación; comprobar antes que el slug no corresponda a trabajo ajeno.
Completar el brief y `pieza.json`. El plan devuelve campos, fuentes efectivas, cajas, photo slots,
componentes, bloqueos y un `jobDraft`. El borrador tiene textos vacíos y foto sin definir: no es
un job aprobado. `eligible-for-validation` sólo describe compatibilidad de fuentes/estilos;
no valida nuevo copy, encuadre, autoridad ni píxeles.

El objeto `text` exige **todos** los IDs de `textFields` de esa escena. Un nombre de zona no es
un ID de texto. Reescribir explícitamente títulos, moneda, precio, CTA, condiciones y legal,
incluso cuando algunos coincidan con el maestro. No reutilizar un draft histórico como oferta.

`footer-legal` y `fare-conditions` son módulos diferentes. Si el pedido dice “condiciones”,
identificar cuál. Legal ausente se declara ausente: no se agrega por herencia. Elegir una escena
con espacio legal o solicitar una variante admitida si el brief lo necesita.

## Job de diseño

Usar `workbench.design-job.v1`, `brandId`, versión exacta, operación `reference.compose`,
`purpose`, lista completa de recursos admitidos, `text` completo y `photograph` explícito.
`internal-proof` es prueba; `production-preview` es preview de un brief real; ninguno aprueba.
Ejemplo completo inspeccionable: `projects/sky/components-proof/node-2026-3928.json`.
Sus datos comerciales son históricos: copiar estructura, no oferta ni fechas.

La lista de recursos parte del template seleccionado, catálogo, skill de producción, imágenes
de esa escena, `sky-fonts-manifest` y caras Metric necesarias. El plan indica caras efectivas;
no cargar recursos de otra marca ni modificar el pack para satisfacer un job.

El compositor conserva ancho/alto/tamaño nativos. Ajusta líneas por palabras y LF explícitos;
no reduce letra, trunca, corta palabras/NBSP ni transforma CR silenciosamente. Si un CR fuente
necesita LF, declararlo en el contenido nuevo. Overflow requiere copy adecuado o otra variante.
La excepción de wrap de URL canónica SKY sólo aplica a los legales exactos admitidos.

## Cambiar la fotografía

`{"kind":"source-reference"}` conserva de forma explícita la foto histórica de la escena.
Sirve para pruebas o reutilización autorizada; no acredita derechos de una campaña nueva.

Para una foto nueva propia, `photograph` usa `kind: broker-run`, `slotId` exacto, `piece` de
la intención fotográfica y `requestId` del broker. Los campos salen del manual y de la corrida;
no acepta ruta/URL local de foto ni UUID de otra persona/marca. Consulta/descarga verifican
autoridad, ZIP, inputs, locks y PNG; no generan otra imagen durante el diseño.

Si la foto se generó con un pack anterior, su recuperación no la admite automáticamente para
componer. La regla predecessor activa debe autorizar ese SHA y todos sus recursos originales
seguir admitidos sin cambios. No crear la regla desde el job.

FILL conserva encuadre nativo y registra recorte; FIT exige proporción compatible fuera de
las tres admisiones del PR 9 integrado. Verificar los pins del checkout activo antes de producir. Una imagen
correcta aislada puede perder foreground, rostro, hito o reserva de texto al entrar en el slot.
Inspeccionar cada adaptación. Para crear/admitir una foto leer `sky-photography.md`.

## Validar y ejecutar

Guardar un job propio dentro de la pieza; para diseño su path se resuelve **desde el root**:

```sh
pnpm marca:disenar projects/sky/campana-nueva projects/sky/campana-nueva/job.json --validate
pnpm marca:disenar projects/sky/campana-nueva projects/sky/campana-nueva/job.json --execute
```

Estos comandos presuponen brief/job/canon completos y pedido autorizado. Validación consulta
GitHub vivo y renderiza en memoria; no llama IA ni crea run de diseño. Foto de broker puede
recuperar/verificar su cache privado en la validación. Ejecutar crea nueva corrida con copy
shapeado por Metric, SVG/PNG/QA y locks. Campo faltante, glyph ausente, fuente ajena, overflow,
foto no admitida o receta pendiente bloquea antes del run.

`marca:componer` usa otro schema para referencia histórica; no usarlo para “cambiar campaña”.
El diseño modular sí usa geometría nativa más contenido declarado y correcciones admitidas.

## Todas las adaptaciones

Inventariar todos los IDs requeridos y su cobertura por canal. Preparar un job completo por
variante: seleccionar sus propios campos, legal y photo slot. No escalar el square ni copiar
coordenadas para fabricar horizontales/verticales. Reutilizar contenido comercial aprobado
como dato del brief, pero asignarlo explícitamente a cada campo del formato.

`pnpm sky:design-audit projects/sky/always-on-pipeline-proof` diagnostica cobertura del canon
instalado en memoria; no produce, autoriza ni asegura fit de un copy nuevo. El reporte histórico
tenía 95 copys shapeados y 31 rechazados antes de las correcciones; la comparación posterior
indicada al inicio renderizó las 126 referencias. Ninguno certifica 126 ofertas nuevas válidas.
Para un lote autorizado, enumerar resultados y fallos por ID. No rellenar formatos fallidos
con otra marca/fuente o declararlos “traídos” sólo porque su miniatura existe.

## Revisión y cierre de pieza

Abrir el PNG final completo y recortes de logo, flecha, CTA, texto y footer. Revisar imagen,
encuadre, anatomía cuando aplique, composición, fidelidad, fuente/pesos, copy/fechas/moneda,
contraste, legibilidad, intersecciones y límites. No revisar únicamente la plancha reducida.

QA mide luminancia sRGB en núcleos de glifos sobre backdrop sin copy; excluye antialias de
borde, shadows/blends no soportados. Campos no medidos no se certifican. El ratio es diagnóstico,
no aprobación automática: 4,495581:1 no se redondea a una aprobación de 4,5.

Guardar evaluación con run, marca, PNG SHA, método, hallazgos y alcance. Estado `completed`
significa que el motor terminó. Criterio fotográfico confirmado no aprueba KV, legibilidad,
tarifa o publicación. Registrar aprobación comercial/entrega aparte cuando realmente existan.
Archivar resultados binarios fuera de Git con ubicación y SHA; conservar intent/locks.

## Nombres y alineación vigentes — 2026-10-01

Leer [destinos y espacios adaptativos](destination-content-flow.md) y el
[cierre del feedback](layout-feedback-handoff.md). Contenido 1.5.0 / destino 1.2.0 corrige
los 76 badges tarifarios y las relaciones footer/fila/prefijo/editorial; v6 es el export local
revisado. La auditoría conserva cobertura, runs y checks. Preservar geometría admitida,
fotos/ventanas y corridas históricas; aceptación visual del operador y aprobación comercial
siguen pendientes. El pedido posterior autoriza commit local de lo propio; registrar su
evidencia separada de push, publicación y deploy.
