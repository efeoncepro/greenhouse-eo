# CMP-004 — Lectura del titular y proximidad del CTA

Fecha: 2026-09-25. Estado actual: política cromática optativa implementada y verificada; evolución tipográfica/espacial todavía propuesta. Las secciones iniciales conservan el análisis anterior a la implementación; ver el cierre al final. Los pilotos R01 se conservan; las comparativas no son aprobación creativa ni publicación.

## Conclusión

El problema combina una decisión incorrecta al escribir el plan y limitaciones reales del compositor. En C01, `Seguiría siendo` y `tu marca.` quedaron en campos distintos, con familias y tamaños distintos. La frase completa cabe en el formato actual a los mismos 95 px: no hacía falta fragmentarla ni reducirla. Un gate de geometría y contraste no detecta por sí solo la pérdida de sentido o de énfasis.

La distancia al CTA proviene de `gapAfterNote: 34` en el plan. A su vez, el gate exige que esa distancia supere la separación interna entre botón y descriptor. Esta última incluye una reserva de selección aun cuando el marco no se dibuja. El resultado dificulta compactar el grupo: declarar un `descriptorGap` menor no produce necesariamente una distancia visual menor.

No se modificó ningún archivo del comando. Las huellas de los cinco módulos examinados coinciden con las tomadas antes de las pruebas.

## Evidencia y reproducción

Carpeta de trabajo: [`analysis-typography-2026-09-25`](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/).

- [Comparación visual de las cuatro piezas](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/COMPARATIVA.md).
- [Plan de las cuatro candidatas](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/cuatro-candidatas.json).
- [Mediciones de originales y candidatas](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/mediciones.json).
- [Comprobación SHA-256 del comando](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/command-verification-sha256.json).
- [QA de las cuatro candidatas](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/out/qa-cuatro-candidatas.json).

```sh
pnpm foto:componer:cta ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/cuatro-candidatas.json
pnpm foto:cta:gate ai-generations/2026-09-25_cmp004-creative-kvs/analysis-typography-2026-09-25/cuatro-candidatas.json --reproducir
```

El segundo comando terminó con exit 0: cuatro piezas idénticas a la reproducción, verificadas bajo las reglas actuales. Se inspeccionaron las cuatro previsualizaciones de 390 px. El alcance es 4:5, a 1152 × 1440; no certifica otros formatos, toda la CLI ni efectividad publicitaria.

El plan exploratorio `comparativas.json` tiene una quinta pieza de control que repite el plate C01 con separación original. Su reproducción coincidió con lo entregado, pero terminó con exit 3: el gate clasificó la reutilización de la máscara temporal dentro de esa misma reproducción como caché externa. Se conserva este resultado; no se omitió un fallo geométrico para obtener un aprobado. El plan de cuatro candidatas elimina la reutilización del mismo plate dentro del lote y pasa la reproducción. El control no se presenta como certificado.

## 1. Fragmentación semántica introducida en el plan

| Pieza | Dominante R01 | Remate R01 | Dominante de la comparación |
| --- | --- | --- | --- |
| C01 | Seguiría siendo | tu marca. | Seguiría siendo tu marca. |
| C02 | merece una | imagen propia. | merece una imagen propia. |
| C03 | Ningún detalle | casual. | Ningún detalle casual. |
| C04 | también escala. | Dirección en cada entrega. | La exigencia también escala. |

En C01, el dominante tenía 95 px y el remate 30 px. La frase `tu marca.` perdía peso precisamente donde se completaba la promesa. En C04, `La exigencia` estaba en la entrada pequeña; ahora forma parte del titular.

Las comparativas mantienen un apoyo de servicio independiente: `Identidad propia en cada canal.`, `Marca y campañas para lo que viene.`, `Dirección creativa en cada instante.` y `Design Ops e IA con criterio.` Son propuestas de copy para esta exploración, no texto previamente aprobado. C02 conserva `Tu próximo capítulo` como entrada: mejora el predicado, pero aún requiere leer dos niveles para completar la oración. Esto deberá evaluarse en la evolución semántica, sin declarar resuelta toda la jerarquía.

| Pieza | Tamaño dominante original → candidata | Ancho de tinta de la frase reunida | Líneas del dominante |
| --- | --- | --- | --- |
| C01 | 95 → 95 px | 776,775 px | 1 |
| C02 | 95 → 95 px | 832,405 px | 1 |
| C03 | 95 → 95 px | 668,811 px | 1 |
| C04 | 100 → 100 px | 919,960 px | 1 |

El máximo declarado es 0,84 × 1152 = 967,68 px. En estas cuatro piezas la frase reunida cabe sin reducir el tamaño. Esto no establece una regla universal de titulares en una sola línea: un titular largo puede necesitar dos líneas, manteniendo el sentido y la misma jerarquía.

## 2. Espaciado declarado y espacio que realmente aparece

Medición desde las cajas de los elementos visibles registradas en el layout; la geometría del trazo debe seguir siendo considerada por las guardas existentes.

| Distancia | R01, máster | Candidata, máster | R01 → candidata a 390 px |
| --- | --- | --- | --- |
| Última línea de apoyo → botón | 34 px | 25 px | 11,51 → 8,46 px |
| Botón → descriptor | 24,064 px | 24,064 px | 8,15 → 8,15 px |

La reducción es de 9 px en el máster, aproximadamente 26 % del espacio externo; visualmente es un ajuste moderado. La mejora principal de lectura es reunir las palabras del titular.

En [`componer-cta.mjs`](../../../scripts/foto/componer-cta.mjs), alrededor de las líneas 1418–1428:

1. `descriptorGap` tiene un piso de `round(descriptorSize * 0.6)`: para 27 px son 16 px.
2. El descriptor se posiciona desde `cr.bounds.bottom`, no desde el borde del botón visible.
3. En estas piezas, esa envolvente agrega 8,064 px. Por eso un gap declarado de 10 px —o incluso 6 px— produce 24,064 px.
4. El control de colisiones puede desplazarlo todavía más si coincide con un cursor o etiqueta.

En [`componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs), alrededor de las líneas 879–890, `ritmo` exige `entre > dentro`. Es razonable distinguir grupos; el problema es acoplar esa exigencia a una reserva que puede ser invisible. El diagnóstico propone aumentar el espacio externo y no considera compactar primero el espacio interno. Esta regla tiene un piso relacional, pero no un techo de separación externa.

La prueba con 23 px falló `ritmo` en las cuatro piezas: 23 < 24,064. Cambiar a 25 px pasó. Se conserva el plan observado, layouts y QA del intento en `evidencia-gap23/`; ese plan es una instantánea, no un archivo trasladable listo para ejecutar. Ni `padding: compact` ni reducir el cursor a 0,6 eliminaron la reserva interna en este caso. **25 px es un valor de esta comparación, no una nueva constante universal.**

## 3. Qué resuelve y qué no resuelve el motor actual

- `parseRich` divide primero por `|`: esos saltos son instrucciones explícitas. El motor no puede recomponer una frase partida deliberadamente entre campos.
- `richBlock` ajusta palabras al ancho y penaliza algunas viudas y finales débiles. No representa unidades de sentido ni relaciones entre entrada, dominante y cierre. Si no encuentra mejor corte con el mismo número de líneas, conserva el resultado.
- El dominante usa `R.ideaImpact` y `DOMINANT_WIDTH = 78` en esta ruta. El diseño necesita poder escoger una receta adecuada al contenido, conservando los contratos de AXIS.
- El ajuste inicial del tamaño usa `dominantMax`; el wrap posterior usa `W * 0.9`. No hay una única resolución explícita del ancho disponible con el mismo significado en ambas decisiones.
- El gate exige entrada y cierre, salvo excepción aprobada, y una relación de tamaño dominante/entrada ≥ 3. Comprueba estructura y contraste, no que el contenido sobreviva a la distribución entre campos.

La regla de tres voces tiene una decisión documentada en [`EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md`](../../operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md), incluida la revisión del 23 de septiembre. No se debe eliminar por conveniencia ni simular una excepción aprobada. Sí corresponde proponer una versión que conserve la jerarquía sin obligar a desarmar frases o inventar apoyos redundantes.

## 4. Evolución propuesta, compatible y escalable

### A. Separar el contenido de su reparto visual

Introducir, mediante una versión optativa del contrato, un titular canónico con unidades de sentido, énfasis y cortes permitidos. El brief o la dirección creativa declara las agrupaciones; el algoritmo no presume comprenderlas a partir de una lista corta de preposiciones. El plan conserva el copy literal y los motivos de cualquier salto obligatorio.

Una unidad protegida no puede quedar repartida entre dominante y cierre. Entrada, apoyo y descriptor deben justificar un papel propio. Mantener la gramática actual para los planes existentes; revisar la necesidad de cada rol en la nueva versión mediante la decisión correspondiente. Las propiedades nuevas deben validarse, sin ignorarlas silenciosamente en la ruta anterior.

### B. Resolver alternativas tipográficas antes de encoger

Medir glifos reales y evaluar candidatos con recetas de AXIS, ancho disponible unificado, máximo de líneas y tamaño mínimo a la escala de lectura. Mantener juntas las unidades protegidas y conservar su peso aunque crucen líneas.

Orden propuesto: usar el ancho permitido; probar cortes semánticos autorizados; ajustar tamaño y ejes dentro de la receta; elegir una variante de copy previamente aceptada o solicitar otra composición/plate cuando no hay solución. No condensar ni reducir indefinidamente para obtener un gate verde. Registrar qué alternativas se rechazaron y por qué.

### C. Resolver concepto, acción y descriptor como grupos relacionados

Separar tres geometrías: tinta/borde pintado, envolvente de colisión y objetivo de selección. Una reserva de interacción puede proteger un cursor, pero no debe separarnos de un marco inexistente.

Definir rangos de proximidad, con mínimo y máximo, en proporción al cuerpo y con verificación a escala de lectura. El espacio interno se resuelve primero; el externo depende de la relación entre grupos y del espacio real disponible. Ante una colisión, probar anclas o escalas de cursor permitidas antes de desplazar el descriptor. Si no hay solución segura, devolver un diagnóstico concreto. No suprimir el aire ni solapar componentes para compactar.

Los rangos nuevos requieren comparativas visuales: este análisis no convierte 25 px, ni la relación actual, en un estándar aprobado para todas las piezas.

### D. Un contrato de layout compartido por composición y verificación

El plan resuelto debe exponer: copy original, unidades protegidas, líneas finales, receta y ejes, tamaño efectivo, ancho disponible, cajas visibles, envolventes de colisión y distancias efectivas. Compositor y gate consumen el mismo resultado medible; el gate conserva verificación independiente contra lo renderizado.

Añadir errores diferenciados para pérdida de una unidad semántica, reducción excesiva, proximidad insuficiente/excesiva y colisión irresoluble. La revisión visual sigue siendo necesaria: validar un JSON o un contraste no equivale a aprobar la comunicación.

### E. Migración sin romper el comando

1. Abrir una decisión propuesta para el contrato compartido y vincular los documentos de tres voces, compositor y AXIS. Este informe es un insumo, no una ADR aceptada.
2. Introducir la nueva resolución por versión explícita, conservando la ruta anterior y su salida determinista. No cambiar valores globales ni remaquetar planes aprobados por defecto.
3. Validar con un corpus de titulares cortos/largos, acentos, marcas, texto enriquecido, unidades indivisibles, saltos manuales y copy que no cabe. Incluir todas las variantes de CTA, cursores y selecciones pertinentes.
4. Probar 4:5, 1:1, 9:16 y 16:9 sobre plates nativos, tanto con espacio amplio como restringido. Inspeccionar las líneas, geometría y lectura móvil; no inferir la adaptación de un formato a partir de otro.
5. Comparar regresiones de la ruta anterior y resultados de la nueva. Probar específicamente CTA sin marco, con marco visible, con cursor que intersecta el descriptor, y variantes que reutilizan un mismo plate en reproducción.
6. Migrar CMP-004 de forma explícita una vez evaluada la nueva versión. Mantener planes originales y trazabilidad.

## Limitaciones de estas comparativas

La tipografía sigue siendo condensada y el apoyo queda en torno a 9,5 px al mostrar el máster a 390 px. Aunque el contraste pase, esto no basta para declarar óptima su legibilidad o su carácter premium. La jerarquía entrada/dominante actual también condiciona C02. La propuesta evita presentar esta corrección local como la solución definitiva al sistema.

No se midió atención, recuerdo, clics ni conversión. El efecto sobre rendimiento publicitario requiere una prueba de campaña. Se verificó composición, reproducción y lectura visual de estos cuatro archivos, sin cambiar el compositor, publicar, hacer commit ni intervenir otros trabajos del árbol.

## Ampliación: color del CTA dentro de la composición

Feedback posterior del operador: el verde y los otros tratamientos de CTA chocan con las composiciones. La selección anterior priorizó contraste local, sin resolver suficientemente la relación cromática con la escena completa. No basta que un color sea de marca o pase el gate.

Hay una restricción adicional comprobada en `componer-cta.gate.mjs:446`: `ACENTOS` sólo incluye `accentSurface`, `growthOnDark` y `accentInkOnLight` (naranja, lima y naranja oscuro). Las líneas 473–491 exigen uno de esos colores en la tinta de `text` o en borde/relleno de `outline`/`solid`. El compositor permite otros tokens existentes, pero el gate los rechaza. El contrato escrito de tres voces admite color a demanda según composición; su implementación es más estrecha.

Se produjeron [cuatro comparativas neutras](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-color-2026-09-25/COMPARATIVA.md), conservando layout, copy y fotos de la prueba tipográfica. Sólo cambia el borde a `inkOnDark` (#ffffff), con razón por pieza:

- C01: reservar azul y lima para la identidad mostrada en las pantallas, sin introducir naranja en el CTA.
- C02: retirar el verde ajeno a la relación azul/blanco/luz cálida localizada.
- C03: conservar el ámbar en el perfume y la luz como protagonista, sin duplicar un acento cálido saturado en la capa gráfica.
- C04: mantener el azul en las aplicaciones y una acción neutra coherente con el conjunto editorial.

La delimitación y el contraste de luminancia distinguen el CTA. Esta es una hipótesis para estas cuatro fotos oscuras, no una receta universal de botones blancos ni una garantía de carácter premium. Se inspeccionaron las cuatro vistas a 390 px. El gate con `--reproducir` verificó identidad de archivos y terminó con exit 1, con exactamente cuatro fallos `acento-cta`, uno por pieza; no reportó otros fallos. La [salida íntegra](../../../ai-generations/2026-09-25_cmp004-creative-kvs/analysis-color-2026-09-25/gate.log) se conserva. No se añadió excepción ni se cambió la lista para obtener un aprobado. Los cinco módulos examinados mantienen sus hashes.

### Implicaciones de la evolución propuesta

La implementación requiere cuatro entregables acotados: contrato versionado del plan; resolución tipográfica y espacial; política de color contextual; y regresiones del compositor/gate. El operador seguiría pidiendo una pieza y recibiendo composición, editables y evidencia. La complejidad nueva quedaría en el sistema y en el brief, no en ajustes manuales de coordenadas por pieza.

La dirección declara la intención cromática: integración tonal, acento relacionado con la escena o contraste deliberado de campaña. Se eligen por separado tinta, contorno y relleno dentro de la paleta autorizada; se documenta cómo conviven con la foto, el titular y la firma. El motor verifica valores, geometría y contraste. La revisión visual evalúa armonía y jerarquía; no se pretende automatizar el gusto con una puntuación de color ni extraer ciegamente el matiz más frecuente de la foto.

La nueva versión debe permitir un CTA neutro o un color autorizado pertinente cuando cumple su función, sin exigir uno de tres acentos por defecto. Conserva las guardas de lectura, borde visible, safe area, personas y firma. Necesita actualizar el contrato de color y el gate de forma coordinada, preservando la salida de planes anteriores. Los cambios portables de tokens/roles, si fueran necesarios, pertenecen a AXIS; no se inventan colores en el consumidor.

La migración probaría además fondos claros/oscuros, escenas de paleta cálida/fría, escenas con varios acentos, variantes de CTA y contextos donde la opción neutra no tiene separación suficiente. El principal riesgo es cambiar involuntariamente piezas existentes o que el sistema encuentre una combinación técnicamente legible pero visualmente pobre. La versión optativa, la regresión de archivos y la revisión del conjunto atienden riesgos distintos.

Estado de esta ampliación: diagnóstico y pruebas visuales producidos; evolución compartida propuesta, sin implementar. Las candidatas neutras no reemplazan los originales ni se presentan como aprobadas por el gate vigente.


## Cierre de implementación cromática — 2026-09-25

Tras «Hagámoslo así», se implementó la [decisión de política de color](../../architecture/EFEONCE_ADVERTISING_CAMPAIGN_COLOR_POLICY_DECISION_V1.md) y el [contrato del compositor §20](../../operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md#20-política-cromática-por-campaña-optativa). Este delta cambia el estado anterior de propuesta exclusivamente para color; no implementa las propuestas tipográficas o espaciales.

- Módulo `cta-color-policy.mjs`: esquema estricto, política local fijada por hash, identidad de campaña, tratamientos y roles explícitos.
- Preflight del compositor: valida coincidencia de parámetros antes de producir; no utiliza sustitución automática contextual.
- QA/gate: guardan y recalculan la decisión, rechazan evidencia ausente/manipulada, mantienen contraste y demás guardas. La lista de acentos anterior sigue vigente sin política.
- Reproducción/arnés: resuelven políticas relativas desde la carpeta original. El nuevo módulo participa de la huella del comando.
- Documentación y skill Advertising espejada: operación, límites, decisiones y revisión visual.

[Comparación y evidencia de las candidatas](../../../ai-generations/2026-09-25_cmp004-creative-kvs/color-policy-v1/COMPARATIVA.md). Resultado: 39 pruebas unitarias dirigidas; 14 verificaciones de integración; cuatro candidatas 4:5 reproducidas con gate exit 0; inspección visual de las cuatro vistas de 390 px. El texto CTA mide 16,08 / 14,89 / 15,8 / 16,83:1 en C01–C04. C02 relleno contra escena: 15,29:1. Son mediciones de estos exports, no métricas de atención.

Regresión contra HEAD `19a00465c`: 13/13 piezas idénticas (PNG/layout y QA comparado por el arnés), todas componen en referencia y candidata: cuatro de `piezas-45.json`, tres de `piezas-cta.json`, seis de `piezas-cta-formatos.json`. Incluyen texto/contorno/relleno y 9:16/16:9. No se ejecutó ni se afirma cerrada la certificación global histórica. Las referencias usan paquetes y activos locales, como declara el arnés; no se modificaron fuentes, logos o lockfile.

Las pruebas negativas ejercitan el comando/gate reales en una carpeta temporal: política modificada, evidencia ausente/manipulada, `auto`, legacy sin acento, contraste blanco/blanco y zona segura en texto. La prueba de texto inicialmente heredó una geometría de contorno y falló zona segura; con reserva de corchetes y espaciado propio pasa. Se conserva ese rechazo esperado: no se tocó el layout para ocultar un fallo del sistema.

QA de alcance: implementación local de color verificada. Revisión creativa del operador pendiente para los tratamientos elegidos. Tipografía, espaciado general, otros formatos de CMP-004 y activación publicitaria conservan su estado independiente. Sin commit/push/deploy/publicación. Los WIP ajenos de `docs/changelog/internal/2026-09.md`, `scripts/foto/build-prompt.test.ts` y studio props se preservaron.

Entrega: paquete R02 reproducible en el canal Paid Media, exportado y leído localmente con hashes idénticos a los masters del repo. ASSETS y revisión de campaña actualizados; la sincronización remota de OneDrive no se afirma. Gates documentales: espejos de skill idénticos, cierre revisado, contexto estricto sin avisos. La rotación documental retiró una entrada de septiembre de la ventana activa y la archivó, conservando íntegro el WIP mensual previo; `ops:lint --changed` terminó sin errores con advertencias históricas ajenas de paridad entre epics y tasks.
