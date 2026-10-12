# Cuatro iconos nuevos Efeonce: volumen mate uniforme

Fecha: 2026-10-12. Estado: bases planas aprobadas; cuatro volúmenes Flare seleccionados por el operador para esta ronda, sin publicar.

El operador pidió cuatro iconos ausentes del catálogo de Efeonce, con volumen suave, mate liso y uniforme,
comparando Flare y Seedream 5 Pro. El objetivo excluye huellas, poros, grano y marcas de amasado.
Se aplicó `efeonce-graphic-line` y el método de iconografía de AXIS. No se alteró el paquete de marca.

## Fuente y aprobación

El snapshot vivo de `https://axis.efeonce.org/references/iconography.json` tiene 134 entradas
(109 canónicas y 25 candidatas). No contiene los cuatro conceptos elegidos. Se guardó en
`ai-generations/2026-10-12_iconos-efeonce-mate-uniforme/catalog-live.json`.
AXIS fuente local: `de34866`. Tokens efectivos y procedencia del adaptador guardados junto al artefacto.

| Concepto | Uso sugerido | Base elegida |
| --- | --- | --- |
| Binoculares | Exploración y perspectiva | Variante 2 |
| Metrónomo | Ritmo y continuidad editorial | Variante 1 |
| Sello de aprobación | Revisión creativa | Variante 1 |
| Imán | Atracción | Variante 1 |

Se generó una lámina 3×3 con el template plano canónico, sustituyendo solamente `OBJETOS`,
y la referencia oficial de plastilina. Se vectorizó con el comando de AXIS, se seleccionaron cuatro
siluetas y se añadió la esfera de respuesta conforme a los tokens. Cada base pasó `icons:check`
(área objetivo 560; sello visible 559; posición y contraforma medidas). Los SVG de control y logs se conservan.

El operador aprobó explícitamente la lámina reposo/respuesta: **«Sí, continuar con las cuatro»**.
La pregunta delimitaba generación de volumen con ambos modelos y excluía publicación. Por ello esta
aprobación no aprueba el arte final 3D ni añade claves al catálogo o al resolver de AXIS.

## Generación y acabado

Primera pasada controlada: cada pareja recibió el mismo prompt y una única referencia PNG 1024²
proveniente del SVG plano aprobado. Prompt de volumen canónico de AXIS sin modificar más una línea
para el acabado liso solicitado. El template conserva una frase de imperfecciones de arcilla manual;
la línea añadida exige expresamente cero microtextura. La tensión entre ambas instrucciones forma parte
de esta receta medida; no se cambió el template compartido ni se oculta como equivalencia perfecta.

- Flare: `gpt-image-2.5-flare`, `max`, PNG 2048², fondo opaco.
- Seedream: BytePlus directo `dola-seedream-5-0-pro-260628`, `standard`, PNG 2048²,
  watermark desactivado; una referencia, sin retries.
- Segunda pasada Seedream: edición de su propio original para quitar microtextura. Prompt separado
  `prompts/surface-finish.txt`; misma calidad y resolución. Es un ajuste generativo con posible deriva
  geométrica, no una garantía de conservación exacta de píxeles.

`comparison-first-pass.png` conserva las ocho salidas iniciales; `comparison.png` muestra Flare en una
pasada y Seedream con la edición adicional, rotulados como procesos distintos. Son láminas de revisión,
no una aplicación aprobada del catálogo. Las comparaciones montan los originales sin retocar el material.

## Costo estimado de esta prueba

| Etapa | Solicitudes | USD estimados |
| --- | ---: | ---: |
| Lámina plana inicial Flare | 1 | 0,438502 |
| Cuatro volúmenes Flare max | 4 | 1,751348 |
| Cuatro volúmenes Seedream standard | 4 | 0,324000 |
| Cuatro ajustes de superficie Seedream | 4 | 0,324000 |
| Total de esta prueba | 13 | 2,837850 |

Por icono de volumen: Flare promedio US$0,437837; Seedream primera pasada US$0,081 y proceso de dos
pasadas US$0,162. La preparación plana común se muestra aparte. OpenAI se calcula con usage devuelto
(entrada imagen US$8/M, texto US$5/M, salida US$30/M; Standard); BytePlus con estimador del contrato y
recibos de solicitudes exitosas. Son estimaciones de consumo, no factura liquidada. No hubo retries.
`manifest.json` registra usage, tiempos, request IDs BytePlus, referencias y hashes por salida.

## Transparencia y QA

Los PNG originales nativos son **opacos**. Se entregan también derivados RGBA **sin fondo**, obtenidos con
el color-key canónico (`from=28`, `to=95`, muestra del marco 24px). La transparencia pertenece al derivado;
no prueba que ninguno de los proveedores produzca alfa nativo. El comando de publicación no se ejecutó.

Como los glifos aún no están publicados, el CLI de volumen normal rechaza sus claves. Se usó un adaptador
local de artefacto: cambia imports e inventario por las cuatro bases aprobadas y permite exclusivamente
`key` y `check`; funciones de extracción, máscara y QA idénticas a AXIS. Hashes, cambios y alcance están
en `keycheck-provenance.json`. No modifica fuentes ni catálogo AXIS.

QA inicial, contra referencia plana normalizada:

| Modelo / icono | IoU | Calados plano→3D | Piezas plano→3D | Resultado |
| --- | ---: | --- | --- | --- |
| Flare / binoculares | 0,979 | 2→2 | 2→2 | Sin avisos |
| Flare / metrónomo | 0,751 | 1→2 | 2→1 | Revisar calados/unión |
| Flare / sello | 0,963 | 1→1 | 3→2 | Revisar unión |
| Flare / imán | 0,874 | 0→0 | 4→4 | Sin avisos |
| Seedream / binoculares | 0,996 | 2→2 | 2→2 | Sin avisos |
| Seedream / metrónomo | 0,626 | 1→2 | 2→2 | Silueta bajo umbral y calados |
| Seedream / sello | 0,996 | 1→1 | 3→1 | Revisar unión |
| Seedream / imán | 0,911 | 0→0 | 4→2 | Revisar unión |

Los avisos son datos de comparación, no aprobación automática ni rechazo automático: volumen y contacto
pueden juntar regiones. Aquí el metrónomo presenta dos ventanas en vez del calado único plano; la esfera
puede tocar el brazo. El sello acerca mango y base; Seedream une terminales al imán y añade extrusión,
sombras de apoyo y microtextura. Flare presenta superficies visualmente más lisas y volumen más blando
con mayor regularidad entre las cuatro piezas. La edición Seedream atenúa la textura, con costo y deriva
adicionales. No se extrapola a un ranking universal.

La extracción alfa se revisa también sobre papel para detectar restos de azul, halos, sombras y calados.
Los resultados completos de cada pasada, dimensiones, transparencia y hashes están en el manifiesto;
el QA de la segunda pasada se conserva separado en `logs/seedream-smooth-volume-check.log`.
Los volúmenes permanecen candidatos y el metrónomo requiere revisión geométrica antes de adoptar el arte.

## Entrega y continuidad

Artefactos: `ai-generations/2026-10-12_iconos-efeonce-mate-uniforme/`: bases vectoriales,
referencias, prompts, PNG nativos, PNG derivados transparentes, comparaciones, manifiesto, recibos y ZIP.
`LEEME.md` explica original/derivado y etapas. No se sustituyeron los iconos ni las pruebas anteriores.

Skills espejo actualizadas en `criteria.md`, `iconography.md` y `ledger.md`: acabado solicitado y
aprobación plana limitada a esta prueba. No se cambió la receta canónica ni se publica una nueva variante.
No hay implementación UI, release AXIS, push o deploy de esta continuación. Documentación, recetas y selección
versionadas por pedido del operador; PNG/ZIP locales conforme al contrato de almacenamiento de ai-generations.

Fuentes canónicas: `.codex/skills/efeonce-graphic-line/references/iconography.md` §12;
`../axis-design-system/docs/agent-composition/iconography.md`;
`../axis-design-system/docs/agent-composition/iconography/volume-prompt.txt`;
[manual BytePlus](../../manual-de-uso/creative-studio/byteplus-directo.md).

Contexto revisado: `project_context.md` remite a composición y runbook AXIS; se condensó esa entrada
para conservar el presupuesto del router. Detalle que conservaba la entrada, sin revalidar por esta prueba:
Video 0.6.5; Think registry; CI proporcional; Select obligatorio; QA por host; WordPress sin activar;
primitives/Growth CTA aprobados; Growth Forms opt-in local. Es continuidad del contexto, no un release nuevo.

## Resultado final de transparencia

Las cuatro ediciones Seedream terminaron exitosamente. El color-key canónico retuvo sombras de apoyo
azules/grises y ruido de fondo; antes de entregar se añadió una limpieza de **alfa**, sin cambiar RGB,
por cromaticidad del original: R−B <=2 elimina, 2–12 funde y >=12 conserva. Es específica para estos
objetos cálidos sobre navy, no una nueva receta compartida. `blue-spill-cleanup.json` guarda parámetros
por salida y conteos. Derivados canónicos previos preservados en `alpha/seedream-smooth/`; entrega final
Seedream en `alpha/seedream-smooth-clean/`. Flare no necesitó ese ajuste.

QA Seedream final limpio: binoculares IoU 0,993 / calados 2→2 / piezas 2→2; metrónomo 0,794 / 1→2 / 2→1;
sello 0,991 / 1→1 / 3→1; imán 0,912 / 0→0 / 4→2. Persisten tres avisos geométricos; la mejora del IoU
frente al key previo también refleja quitar residuos ajenos al objeto. No implica validación del diseño.
Los ocho PNG transparentes finales son RGBA 2048², con huecos transparentes y bordes revisados sobre papel.
El detalle nativo de binoculares conserva microtextura tenue en ambas salidas finales: Flare es más regular
que Seedream inicial; el ajuste de Seedream la atenúa, sin una promesa de superficie matemáticamente lisa.

Verificación local: solicitudes 13/13 exitosas; ZIP comprobado; `skills:mirrors`, `docs:closure-check`
(cero warnings), `docs:context-check:strict` (cero errores/warnings) y `git diff --check`.

## Decisión del operador después de la entrega

«Bien, quedemonos para esta ronda con los de flare, pero ya sabemos lo que puede hacer cada uno».
Flare max queda seleccionado para los cuatro iconos de esta ronda; `selection.json` registra la elección y
los hashes de los PNG transparentes. `iconos-efeonce-Flare.zip` contiene sólo los cuatro elegidos, sus
originales y la evidencia de selección. Seedream y la comparación íntegra se conservan para decisiones
futuras. No se infiere un default global, publicación del catálogo ni eliminación de los avisos de QA.
