# Seasonalities en Studio: comparación para decidir

Fecha: 2026-10-07. Estado: nombre y definición de «táctica» acordados; diseño detallado y reorganización pendientes.
El operador pidió comparar ambos modelos antes de elegir. Los ejemplos no autorizan crear campañas ni conceptos.

Discovery posterior: [encaje de tácticas con modalidades, canales y backlog](2026-10-07-initiatives-channels-discovery.md).
Precisa esta propuesta: asociación explícita y opcional de táctica en activaciones; conceptos/piezas reutilizables,
sin deducir el contexto por la primera pieza. Catálogo, operación SEO y reorganización histórica son alcances distintos.

## Propuesta posterior a las precisiones del operador

Las correcciones de esta conversación prevalecen sobre el encuadre limitado de la comparación inicial:
Seasonalities y trendjacking pertenecen al pilar Marketing y pueden desarrollarse en SEO y otras disciplinas,
además de social media. Una pieza con adaptaciones no justifica automáticamente una campaña independiente.
La condición Always On, el enfoque estacional/coyuntural y el canal son dimensiones independientes.
Las secciones siguientes conservan la comparación inicial; no constituyen una decisión de implementación.

**Propuesta:** conservar campaña como unidad estratégica y añadir una ficha opcional de táctica dentro de ella,
para reunir el contexto específico de una acción multicanal sin exigir otra campaña completa.

- Campaña: objetivo, audiencia y gobierno comunes; kind=campaign o always_on.
- Táctica: intervención concreta que contribuye al objetivo de campaña, con breve propósito,
  contexto (ocasión o coyuntura cuando corresponda),
  enfoque (seasonality/trendjacking cuando corresponda), mercado/idioma, ventana de oportunidad, responsable,
  fuentes y criterio de evaluación. La ventana de oportunidad no es la caducidad del contenido.
- Concepto: idea creativa/editorial; una táctica puede contener uno o varios conceptos.
- Piezas/versiones y copys: material exacto adaptado para cada uso, conservando el modelo actual.
- Activaciones: cuenta/canal, fecha, destino y evidencia; las capacidades SEO/editoriales pendientes no se
  consideran implementadas por añadir esta clasificación.

Ejemplo propuesto: «Efeonce · Construcción de marca», Always On → táctica «Día de Muertos 2026», cuyo propósito
es generar afinidad mediante una interpretación de la fecha desde la marca (contexto: Día de Muertos; enfoque: seasonality)
→ «Hay abrazos que encendemos», concepto → video y copys → las dos activaciones existentes.
Un eventual contenido SEO u otra ejecución se incorpora sólo si tiene pertinencia, no para completar una lista de canales.
Otra táctica de Navidad o trendjacking podría convivir en la misma campaña cuando contribuya al objetivo común.

La ficha de táctica debe ser ligera: no replicar el presupuesto, el brief o el lifecycle completo de campaña;
referenciar trabajo, aprobaciones y evidencia existentes. Campañas/conceptos actuales no requieren una táctica
artificial para seguir funcionando. En la UI, filtrar por campaña, táctica, enfoque, mercado y canal de manera independiente.

Separar una campaña cuando necesita objetivo, oferta, gobierno o presupuesto autónomos; no por número de publicaciones.
Los resultados se leen por táctica y por campaña con métricas propias de cada canal, sin sumar impresiones, tráfico y
conversiones como una sola medida de éxito ni asumir causalidad de marca.

**Estado y secuencia propuesta:** Studio tiene campaña/kind, brief de campaña, conceptos básicos y activaciones;
no tiene esta ficha de táctica en el contrato revisado. La precisión semántica está acordada en la adenda del
ADR de estrategia de 2026-10-07; antes de reorganizar datos falta completar el diseño contractual,
definir contratos y comandos API/CLI con revisión e idempotencia, habilitar UI y comprobar una migración con readback.
CMP-006 permanece intacta mientras se decide. Su eventual incorporación al Always On debe conservar originales,
versiones, copys, aprobaciones, historial e IDs del proveedor. Las relaciones actuales están ligadas a la campaña;
no prometer un simple cambio de padre ni borrar/recrear sin una operación de traslado diseñada y verificada.

## Criterio editorial vigente y estructura del producto

[PDR-020 §4.4](../../public-site/decisions/PDR-020-canales-propios-sistema-editorial.md#44-seasonalities-la-temporada-vista-desde-el-oficio)
define Seasonalities como línea propia y permanente: afinidad de marca mediante demostración del oficio, por ventana y mercado.
Que la línea sea permanente no determina que todas sus temporadas deban ser una sola campaña en la base de Studio.

Separar cinco preguntas:

- Línea editorial: qué aportación repetimos y con qué criterio seleccionamos oportunidades.
- Ocasión/edición: qué contexto cultural o comercial, mercado, año y ventana hacen pertinente la intervención.
- Campaña: qué unidad tiene brief, objetivo, audiencia, gobierno, medición y eventualmente presupuesto propios.
- Concepto: qué idea creativa responde al brief. «Día de Muertos» es la ocasión; «Hay abrazos que encendemos» es el concepto.
- Activación: qué versión y copy van en qué cuenta/canal y momento; ejecución es la evidencia del proveedor.

Una campaña puede tener una sola pieza y aun así justificar autonomía estratégica. Muchas piezas tampoco obligan a dividir una campaña.
Always On describe continuidad; temporada describe pertinencia temporal/cultural. Son dimensiones distintas.

## A. Una campaña Always On para la línea

Ejemplo: «Efeonce · Seasonalities», kind=always_on. Conceptos identificados por ocasión, año e idea;
piezas/versiones/copys y activaciones asociados a cada concepto y campaña.

Ventajas: continuidad, un brief común, cartera menos fragmentada y lectura conjunta del esfuerzo de marca.
Conviene si se comparten objetivo, audiencia, responsable y criterio de éxito, y cada ocasión necesita poco gobierno independiente.

Coste: el concepto actual sólo ofrece id, título y orden; no tiene brief, ventana, presupuesto ni responsables propios.
El brief estructurado y sus metas/ventana son de campaña. Una Navidad con varias ideas obliga a incluir la ocasión
por convención en varios títulos; no existe aquí un agrupador de temporada que preserve esa relación.
No confundir una convención de nombres con una capacidad nativa del producto.

## B. Una campaña por temporada/edición

Ejemplo: «Día de Muertos 2026» y «Navidad 2026», cada una con su brief, conceptos, piezas/versiones, copys y activaciones.
La línea editorial Seasonalities sigue siendo permanente en estrategia aunque sus campañas tengan ventanas finitas.

Ventajas: brief y gobierno por ocasión; varias ideas bajo una temporada; objetivos, audiencias, periodos y pauta diferenciables;
separación clara de revisiones y resultados. Encaja con mayor completitud operativa por temporada en el modelo actual.

Coste: crece el número de campañas; se repiten criterios de marca; la visión acumulada de la línea requiere una agrupación
que no debe confundirse con los readers actuales. No abrir una campaña por cada saludo ni por cada post.

## Comparación de decisiones

| Pregunta | Favorece A | Favorece B |
|---|---|---|
| ¿Cambia el objetivo entre temporadas? | Mismo objetivo y criterio de éxito | Objetivo o resultado esperado distinto |
| ¿Cuánto gobierno propio requiere una ocasión? | Producción y revisión sencillas | Brief, responsable, aprobaciones o restricciones propias |
| ¿Una temporada reúne varias ideas? | Una idea fácil de identificar | Varias ideas y secuencia que deben seguirse juntas |
| ¿Se pauta con autonomía? | Distribución común de la línea | Flight, presupuesto o mercados específicos |
| ¿Cómo se necesitan evaluar resultados? | Evolución de la línea con detalle por activación | Informe y aprendizaje por temporada |
| ¿Qué pesa más en la navegación actual? | Pocas campañas y continuidad | Expediente completo y delimitado de cada temporada |

El número de posts no es umbral. La unidad de decisión y rendición de cuentas debe determinar la agrupación.
No se necesita abrir nuevas campañas cada trimestre sólo para facilitar reportes.

## Caso Día de Muertos y Navidad

CMP-006 existe como campaña puntual; el video de «Hay abrazos que encendemos» y dos activaciones están vinculados.
Eso no demuestra que el brief, el objetivo de marca, la disciplina mostrada o la revisión cultural estén completos.
El import de programación tampoco certifica aprobación creativa en Studio.

Si Día de Muertos es una intervención bajo el objetivo común y Navidad es semejante, A puede bastar.
Si Navidad necesita varios conceptos, un desarrollo de entrada/pico/cierre, mercados distintos o pauta autónoma,
B representa mejor esa complejidad con las primitives hoy disponibles.

El plan histórico de Navidad menciona una foto que abre el encuadre para revelar los momentos humanos fuera de cuadro.
Es contexto de septiembre; no sustituye la relectura del brief vigente en Notion ni autoriza producción.

PDR-020 asigna Instagram como canal-hogar y LinkedIn como desarrollo del argumento profesional detrás de la metáfora.
La conciliación conserva dos ejecuciones con el mismo video de Día de Muertos. Eso merece revisión editorial frente al criterio
vigente, sin cancelar ni modificar automáticamente lo ya programado.

## Límite de producto y recomendación provisional

La jerarquía editorial completa sería línea/programa → temporada/edición → concepto → pieza/versión + copy → activación.
El ADR de estrategia prevé un programa opcional; no hay una operación de programa en el registro revisado que permita afirmar
que esa jerarquía completa sea operativa hoy. No inventar un tipo de campaña «seasonal» ni un vínculo padre-hijo que no exista.

La respuesta anterior recomendó A con demasiada rapidez. La permanencia editorial por sí sola no basta para elegirlo.
Para decidir hay que priorizar continuidad simple o gobierno por ocasión. Si el requisito es un expediente completo por temporada,
B es más fiel al producto actual; A sigue siendo adecuado para intervenciones con un brief común suficiente.
Ninguna elección fue aplicada durante esta revisión.

Fuentes: [Strategy Layer §4.4 y §15](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md),
[plan estacional histórico](../social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md), contratos vigentes de campaña/brief/concepto
en `efeonce-marketing-studio/packages/contracts/src/operations-catalog.ts`, y catálogo operativo por CLI.
