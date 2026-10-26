# Refresh — Pipeline de ventas en HubSpot (borrador V1)

> **Estado:** borrador para revisión del autor. No publicado. Sin copia privada en WordPress todavía.
> **URL (se conserva):** https://efeoncepro.com/hubspot/crea-un-pipeline-de-ventas-que-convierte-guia-paso-a-paso/ (post `246045`)
> **Autor / voz:** Julio Reyes (byline existente) · voz Julio; la práctica de la casa va marcada como «En Efeonce…».
> **Creado:** 2026-10-26 · sesión «Mejora de artículos [4d7e59]» · **Base:** versión publicada el 2024-11-24 (sin
> cambios desde entonces), leída completa en vivo el 2026-10-26.
> **Insumos:** Search Console de la sesión «Análisis de Analytics y Search Console» (ventanas 2026-07-26 → 10-23 vs
> 2026-04-27 → 07-25); documentación oficial de HubSpot verificada el 2026-10-26 (§5); experiencia propia
> documentada en `docs/audits/commercial/2026-10-07-hubspot-prospecting-agent-voz.md`,
> `docs/audits/commercial/2026-10-08-prospecting-agent-active-segments.md` y
> `docs/commercial/AGENTIC_REVENUE_OPERATING_MODEL_V1.md`; interfaz oficial de HubSpot del Brandfolder de partners
> (`ai-generations/2026-10-26_pipeline-hubspot/hubspot-ui/`).
> **Marcas:** **[V]** verificado en la fuente; **[I]** inferencia; **NEEDS AUTHOR** decide Julio.
> **Siguiente paso tras aprobación:** spec Gutenberg → validación → copia privada → QA → publicación con guardas,
> según [`AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`](../operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md).

---

## 1. Por qué se reescribe (interno: nada de esta sección va al artículo)

| Señal | Dato | Fuente |
|---|---|---|
| Caída | 1 033 impresiones ← 2 126 (−51 %); posición 39,3 ← 19,0; 0 clics; 1 entrada en GA4 en 90 días | Search Console y GA4, sesión Analytics |
| Lo genérico no se gana | «pipeline de ventas» 322 impr. pos. 58,6 · «como hacer un pipeline de ventas» 99 impr. pos. 42,5 | Search Console, ventana actual |
| Lo específico de HubSpot sí rinde, sin respuesta en el texto | «personalizar etapas del pipeline sin código» pos. 4 · «estructura de pipelines HubSpot SaaS B2B» pos. 8,3 · «¿pipelines personalizados ilimitados?» pos. 3,9 · «¿territorios con pipelines independientes y forecast consolidado?» pos. 3,2 · «¿duplicar pipelines para pruebas?» pos. 3,1 · «¿campos obligatorios por etapa?» pos. 10,4 · «¿jerarquía holding → subsidiaria con pipelines por marca?» pos. 7,9 | Search Console, ambas ventanas |
| Quién pregunta [I] | Varias búsquedas terminan en «responde sí/no o "no tengo la respuesta"»: parecen herramientas de IA evaluando a HubSpot. Responderlas con precisión apunta a ser la fuente citada | Lectura de las búsquedas |
| Fuentes rotas | Los tres enlaces a HubSpot dan 404; Salesforce Research redirige a una página genérica | `curl -L`, 2026-10-26 |
| Cifras sin respaldo | 79 %, 28 % (dos veces, de fuentes distintas), 33 %, 50 %, 87 %, McKinsey 28 %; citas de Halligan y Hunter sin fuente | Versión publicada |
| Errores de fondo | Las etapas de la lista no coinciden con las de la tabla de probabilidades; usa tasas de conversión entre etapas como si fueran probabilidad de cierre | Versión publicada |
| Promesa vacía | Promete cuatro veces un playbook descargable que no existe en la página | HTML en vivo |
| Desactualizado | Nada de objeto Leads, reglas de pipeline, Prospecting Agent, Notetaker ni Deal Progression | Versión publicada vs documentación 2026 |
| Sin experiencia propia | Ningún caso ni práctica de Efeonce; cero enlaces internos | HTML en vivo |

**Gran idea de la nueva versión:** en 2026, HubSpot ya puede llenar la parte alta del pipeline y proponer cómo
actualizarlo después de cada reunión. Lo que no puede hacer por ti es decidir qué significa cada etapa. Un agente
que alimenta un pipeline mal definido sólo lo hace mentir más rápido.

**Lo genérico no se abandona (corregido en la auditoría §9):** «pipeline de ventas» tiene volumen real (Semrush,
2026-10-26: 720/mes México, 390 España, 140 Chile; dificultad 27–32) y en su SERP rankean agencias, no sólo los CRM.
El artículo la disputa con la definición agnóstica y el diseño de etapas, y gana con lo que los CRM no cuentan: la
implementación en HubSpot y la experiencia propia.

## 2. Metadata propuesta

| Campo | Actual | Propuesto |
|---|---|---|
| Title (SEO) | Crea un Pipeline de Ventas que Convierte: Guía Paso a Paso - Efeonce | Pipeline de ventas en HubSpot: cómo configurarlo en 2026 \| Efeonce |
| Meta description | Aprende a implementar un pipeline de ventas efectivo con etapas claras, checklists y tips prácticos para maximizar conversiones. | Qué es un pipeline de ventas y cómo configurarlo en HubSpot: etapas con criterio de salida, reglas, previsión, Prospecting Agent y Deal Progression. |
| H1 | Crea un Pipeline de Ventas que Convierte: Guía Paso a Paso | Pipeline de ventas en HubSpot: cómo configurarlo para que diga la verdad |
| og:title | — | Tu pipeline en HubSpot ya se llena y se actualiza solo. ¿Dice la verdad? |
| og:description | — | Etapas, reglas y previsión en HubSpot, y cómo usar el Prospecting Agent y Deal Progression sin que el pipeline mienta. |
| Slug | `/hubspot/crea-un-pipeline-de-ventas-que-convierte-guia-paso-a-paso/` (57 caracteres de slug) | **`/hubspot/pipeline-de-ventas/`** + 301 desde la URL actual (auditoría SEO/AEO §9, D1). **Aprobado por Julio el 2026-10-26** |
| Fecha | Publicado 2024-11-24 | Conservar publicación; `dateModified` real + «Actualizado el …» visible + «Funciones verificadas en la documentación de HubSpot en octubre de 2026» |
| Schema | `BlogPosting` + `Person` (Julio Reyes) | Mantener; actualizar `headline`, `description`, `dateModified`. FAQ visible al final |
| Portada | Sin portada propia | Nueva (se rehace; ver §6) |

---

## 3. Borrador del artículo

> **Cómo leer esta sección (interno):** todo lo que está aquí es texto público, salvo las marcas de maquetación entre
> corchetes (`[Destacado]`, `[Tabla Efeonce]`, `[Pasos]`, `[Imagen N — archivo]`, `[Bloque]`, `[Mención]`), que la spec
> convierte en bloques y no se publican como texto. Las notas internas (inferencias, decisiones, comparaciones con la
> versión anterior) viven sólo en §1, §4, §5 y §9; el artículo nunca habla de su versión anterior (regla de Julio,
> 2026-10-26).

# Pipeline de ventas en HubSpot: cómo configurarlo para que diga la verdad

*Actualizado el [fecha de publicación] · Julio Reyes · Funciones verificadas en la documentación de HubSpot en
octubre de 2026.*

Lunes, reunión de previsión. El tablero de negocios muestra una columna de «Negociación» llena, con un importe que
haría feliz a cualquier gerente. Alguien pregunta cuántos de esos negocios se cierran este mes y la sala se queda en
silencio. Nadie sabe. Todos sospechan que menos de la mitad.

Hasta ahí, nada nuevo. Lo nuevo es esto: **en 2026, HubSpot ya puede llenar la parte alta de ese pipeline** con un
agente que investiga cuentas y redacta el primer correo, **y proponer cómo actualizarlo** después de cada reunión.
Entonces, si la máquina ya hace el trabajo pesado, ¿por qué el pipeline seguiría mintiendo?

Mi lectura es que el problema nunca estuvo en la carga de datos. Estuvo en qué significa cada etapa. Si eso no está
definido, el agente no lo arregla: lo acelera. Vamos por partes.

## ¿Qué es un pipeline de ventas y cómo funciona en HubSpot?

Un **pipeline de ventas** es la secuencia de etapas por la que avanza una oportunidad, desde que existe hasta que se
gana o se pierde, con una probabilidad de cierre asociada a cada etapa. En HubSpot, cada oportunidad es un **negocio**
(*deal*): la probabilidad de su etapa calcula el **importe ponderado** que ves en la vista de tablero, y las etapas de
cierre ganado (100 %) y perdido (0 %) son obligatorias para que los reportes funcionen.

Antes del negocio hay otra pieza que conviene no mezclar: el **objeto Leads**, con su propio pipeline (por defecto:
*New*, *Attempting*, *Connected*, *Qualified* y *Disqualified*). Ahí se trabaja a la persona o cuenta mientras
todavía no hay una oportunidad. Usar leads requiere **Sales Hub Professional o Enterprise**.

Tal vez estarás pensando que da lo mismo dónde viva un prospecto mientras esté en el CRM. No da lo mismo: un
contacto que todavía no confirmó una necesidad, metido en el pipeline de negocios, infla la previsión desde el día
uno.

## ¿Cómo diseñar las etapas antes de abrir la configuración?

Cada etapa se define por su **criterio de salida**: la evidencia de que el comprador hizo algo que acerca la decisión.
En una venta B2B de servicios suelen bastar cuatro o cinco etapas abiertas, más ganado y perdido. Más etapas no dan más control: dan más lugares donde un negocio puede quedarse quieto.

La pregunta útil no es «¿qué etapas tiene una venta?», sino **«¿qué tiene que haber pasado para que un negocio
avance?»**. Y la respuesta que mejor funciona es una acción del comprador, no del vendedor.

[Destacado] Una etapa no se gana por lo que hizo el vendedor: **se gana por algo que hizo el comprador.**

Te lo explico con manzanitas 🍏🍏🍏: «enviamos la propuesta» es algo que hiciste tú. «El cliente revisó la propuesta
con quien firma y pidió ajustar el alcance» es algo que hizo él. Lo primero puede pasar sin que la venta avance un
milímetro; lo segundo, no. A eso se le llama **criterio de salida**: la evidencia verificable que permite pasar a la
siguiente etapa.

[Tabla Efeonce] Ejemplo de pipeline para una venta B2B de servicios. Las probabilidades son un punto de partida
ilustrativo, no un estándar de la industria: se reemplazan con tu propio historial apenas lo tengas.

| Etapa | Criterio de salida (lo hizo el comprador) | Probabilidad inicial (ejemplo) |
|---|---|---|
| Descubrimiento agendado | Aceptó una reunión para hablar de un problema concreto | 10 % |
| Necesidad confirmada | Confirmó el problema, quién decide y un plazo | 25 % |
| Propuesta en revisión | Revisó la propuesta con quien decide y pidió ajustes | 50 % |
| Decisión en curso | Está validando términos, legal o compras | 75 % |
| Ganado | Firmó | 100 % |
| Perdido | Decidió no avanzar (con motivo registrado) | 0 % |

Dos detalles que conviene tener claros. Primero, la **probabilidad de una etapa** no es lo mismo que la **tasa de
conversión entre dos etapas**: la primera es la chance de que ese negocio se cierre ganado; la segunda, cuántos pasan
a la siguiente. Segundo, si alguien edita a mano la probabilidad de un negocio, **HubSpot deja de
actualizarla sola** cuando el negocio cambia de etapa. Conviene que eso sea la excepción.

En Efeonce trabajamos con una regla simple: **una señal de interés o un lead no es una oportunidad calificada**. Si
abres un negocio por cada señal, el pipeline crece en la reunión del lunes y se vacía en la del viernes. Por eso las
señales se trabajan como leads hasta que alguien las califica.

## ¿Cómo crear y personalizar el pipeline en HubSpot?

[Pasos] Con permiso *Edit property settings*:

1. Ve a **Configuración → Objetos → Negocios → pestaña Pipelines** y elige el pipeline (o créalo).
2. Agrega, renombra o reordena etapas con **+ Agregar etapa**. Cada etapa tiene un nombre interno para
   integraciones.
3. Define la **probabilidad** de cada etapa, predefinida o personalizada.
4. En la lógica condicional de cada etapa, marca las **propiedades obligatorias**: el negocio no puede entrar a esa
   etapa sin completarlas. Es la forma de convertir el criterio de salida en un campo (por ejemplo, «quién decide» al
   entrar a *Necesidad confirmada*). La propiedad debe existir antes.
5. Guarda. Para eliminar una etapa, primero hay que limpiar las referencias que aparecen en la columna «Se usa en».

No hace falta código. También puedes pedirle a **Breeze Assistant** que cree el pipeline y después ajustarlo a mano.

Cuántos pipelines puedes tener depende del plan. El límite se comparte **entre todos los objetos** y no cuenta el
pipeline por defecto:

[Tabla Efeonce]

| Plan (cuentas por asiento) | Pipelines personalizados |
|---|---|
| Herramientas gratuitas | 0 |
| Starter | 15 |
| Professional | 100 |
| Enterprise | 350 |

En cuentas con *Flexible Seats & Credits* los topes de Professional y Enterprise son 350. El detalle por objeto está
en **Gestión de datos → Modelo de datos → Límites**.

## ¿Cómo evitar que el pipeline se desordene?

Un pipeline bien diseñado se degrada en semanas si cualquiera puede mover cualquier negocio a cualquier etapa. Para
eso están las **reglas de pipeline** (Professional o Enterprise; las configura un Super Admin):

- **Restringir saltar etapas**, en todas o en algunas. Siempre se puede mover a ganado o perdido.
- **Restringir retroceder** de etapa.
- **Limitar en qué etapas se crean negocios**, para que nadie abra uno directamente en *Decisión en curso*.
- **Controlar quién edita** en ciertas etapas (por ejemplo, las cerradas).
- **Exigir aprobación** antes de avanzar: una etapa *Pending approval* con hasta diez aprobadores. Requiere **Sales
  Hub Enterprise**.
- **Obligar a crear un negocio** cuando un lead pasa a *Qualified* (Sales Hub Professional o Enterprise). Es la
  bisagra entre el pipeline de leads y el de negocios.

Ojo con tres efectos de las reglas: con reglas activas **no se puede editar en bloque** la etapa de los negocios;
los Super Admins, los workflows y la API pueden saltárselas (salvo la aprobación); y una regla que nadie entiende se
vuelve una molestia que el equipo rodea. Explícalas antes de activarlas.

Lo que sí conviene automatizar desde el primer día son las **automatizaciones por etapa**: crear y asignar una
tarea, avisar por correo interno o editar una propiedad cuando un negocio entra a una etapa (Sales o Service Hub,
desde Starter). Y las **etiquetas de negocio** de colores, que HubSpot aplica solas según filtros (por ejemplo,
«sin actividad en 14 días»), ayudan a ver de un vistazo qué está estancado.

## ¿Uno o varios pipelines?

Un pipeline nuevo se justifica cuando el **proceso de venta es distinto**: otro tipo de venta (proyecto vs.
renovación), otro ciclo o otros criterios de salida. Si sólo cambia el equipo o la marca, HubSpot recomienda **un
mismo pipeline con permisos por equipo** («Team only»), para que cada equipo vea sólo sus negocios.

- **Restringir un pipeline por equipo:** Professional o Enterprise. Los **equipos anidados** (jerarquía) requieren
  Enterprise.
- **Territorios:** HubSpot no documenta una función de territorios propia; se modelan con equipos, propiedades y
  workflows.
- **Clonar un pipeline** (Professional o Enterprise) copia propiedades condicionales, reglas, automatizaciones,
  etiquetas y accesos. Sirve para probar un cambio de etapas sin tocar el pipeline en uso.
- **Grupos con matriz y filiales:** HubSpot asocia empresas *Parent* y *Child* (una filial tiene una sola matriz,
  en todos los planes), y con etiquetas de asociación puedes armar reportes de las filiales de una matriz.

## ¿Cómo llena el Prospecting Agent la parte alta del pipeline?

El **Prospecting Agent** de HubSpot investiga cuentas y contactos, vigila **señales de compra** y redacta el
contacto inicial. Se configura con *plays*: a quién le habla (segmentos de empresas y perfiles de contacto), qué
señales mira, cómo escribe y con qué límites.

[Imagen 1 — `prospecting-agent-plays.svg`] Pie: Un *play* del Prospecting Agent define audiencia, contexto,
comunicación, límites y automatización. Interfaz: HubSpot.

Lo que hace, según la documentación de HubSpot:

- **Señales:** visitas e intención de búsqueda, menciones en el CRM (presupuesto, plazos, riesgo) y noticias de las
  empresas (financiamiento, lanzamientos, despidos), entre otras.
- **Fuentes de contactos:** puede sugerir contactos nuevos o traerlos de **una** fuente externa conectada a la vez:
  Apollo, Surfe, ZoomInfo o Seamless.
- **Comunicación:** el agente decide los pasos dentro de un máximo de correos y una espera mínima, o sigue una
  secuencia que tú armas.
- **Dos modos:** *Review emails*, donde una persona aprueba cada correo antes de que salga, o *Send without review*.
- **Costo:** se cobra en **créditos de HubSpot por cada lead para el que el agente genera un correo**, lo haya
  recomendado él o lo hayas inscrito tú. El precio vigente está en la
  **[página de créditos de HubSpot](https://www.hubspot.com/products/artificial-intelligence/credits)**.

[Imagen 2 — `prospecting-agent-contact-sourcing.svg`] Pie: El agente sugiere contactos dentro de cada cuenta.
Interfaz: HubSpot.

En Efeonce usamos el Prospecting Agent conectado a **Apollo**: Apollo aporta los contactos y el agente investiga y
propone a quién escribir. Lo que aprendimos al configurarlo:

- **Empezamos en modo revisión.** Cada correo pasa por una persona antes de salir, con un máximo de cinco correos en
  treinta días, al menos dos días entre uno y otro, en español de Chile y sólo en horario hábil.
- **La voz se entrena con correos reales.** Cargamos en las instrucciones avanzadas del agente una guía armada desde
  correos propios. Tomó varias versiones: los primeros borradores sonaban inseguros, repetían el perfil del
  prospecto y acumulaban servicios. **Después de cada ajuste, hay que leer un borrador nuevo**; el cambio no se
  valida en la configuración, se valida en el correo.
- **Una persona, un canal.** Nadie está al mismo tiempo en el agente de HubSpot y en una secuencia de Apollo.

[Imagen 3 — `prospecting-agent-advanced-settings.svg`] Pie: En las instrucciones avanzadas se define cómo escribe el
agente. Interfaz: HubSpot.

[Imagen 4 — `prospecting-agent-review-before-sending.svg`] Pie: Con revisión activada, cada correo espera
aprobación antes de enviarse. Interfaz: HubSpot.

Y lo más importante para el pipeline: **el agente llena la parte alta, pero no decide qué es una oportunidad.** Un
contacto que respondió entra como lead; el negocio se abre cuando alguien confirma una necesidad, que es exactamente
el criterio de salida de la primera etapa.

## ¿Cómo se mantiene al día el pipeline con Notetaker y Deal Progression?

La otra mitad del problema del lunes es que los negocios no se actualizan. El vendedor sale de la reunión, tiene
otra en diez minutos y la ficha del negocio queda como estaba hace tres semanas.

**Notetaker** graba y transcribe reuniones de Google Meet, Microsoft Teams y Zoom. Después de la reunión propone un
resumen, tareas, un correo de seguimiento y **cambios en propiedades del negocio**, que el vendedor aprueba, edita o
rechaza. Requiere un asiento de Sales o Service (en Starter, un asiento Core).

**Deal Progression** (HubSpot la presentó como *Smart Deal Progression*) va un paso más allá: usa las transcripciones, los correos y las llamadas para sugerir cambios en
las propiedades del negocio, con el valor actual al lado del sugerido, y **próximas acciones**: enviar un correo,
agendar o preparar una reunión, crear una tarea o reactivar un negocio estancado. Se activa desde **Agent Hub** y está
disponible para Sales Hub o Service Hub Professional y Enterprise.

[Imagen 5 — `smart-deal-progression-update-crm.svg`] Pie: Deal Progression propone cambios en el negocio; el
vendedor acepta o rechaza cada uno. Interfaz: HubSpot.

En Efeonce usamos Notetaker en todas las reuniones junto con Deal Progression. La decisión que importa está en la
configuración de captura: **por cada propiedad, eliges si el cambio se aplica solo o queda esperando aprobación.**
Nuestra recomendación es empezar con todo en revisión y pasar a automático sólo las propiedades donde la sugerencia
casi nunca se corrige.

[Imagen 6 — `smart-deal-progression-board-notification.svg`] Pie: El aviso de cambios por revisar aparece en el
tablero de negocios. Interfaz: HubSpot.

Las sugerencias sobre propiedades personalizadas consumen créditos; las estándar, no.

## ¿Cómo leer el pipeline: probabilidad, previsión y reportes?

Con etapas bien definidas, el **importe ponderado** (importe × probabilidad de la etapa) empieza a significar algo.
Para el seguimiento contra la meta está la **herramienta de previsión** (Sales o Service Hub Professional o
Enterprise), con categorías como *Pipeline*, *Best case* y *Commit* y una vista por equipo. HubSpot tiene además una
**previsión con IA** que proyecta un rango a partir de los negocios ganados de los últimos tres meses.

Dos cuidados que vimos en terreno:

- **El importe de un negocio no es facturación.** Un negocio puede incluir varias líneas, renovaciones o alcances
  distintos. La previsión habla de oportunidades, no de ingresos reconocidos.
- **Los reportes dependen de las asociaciones.** En el **[caso de dashboards de ANAM](https://efeoncepro.com/hubspot/dashboards-hubspot-confiables-caso-anam/)**,
  la calidad de los reportes dependía de asociar cada negocio con su empresa. Sólo asociamos los que tenían evidencia
  convergente, y la cobertura pasó de **47,98 % a 50,73 %**. Subió poco a propósito: una asociación inventada mejora
  el número y empeora la decisión.

## Preguntas frecuentes

### ¿Cuáles son las etapas de un pipeline de ventas?

Depende de tu proceso, pero una venta B2B típica pasa por descubrimiento, necesidad confirmada, propuesta, decisión y
cierre (ganado o perdido). Lo que importa no es el nombre de la etapa sino su criterio de salida: qué hizo el comprador
para avanzar.

### ¿En qué se diferencia un pipeline de un embudo de ventas?

El embudo describe el recorrido de los prospectos y cuántos llegan a cada fase, desde el primer contacto. El pipeline
muestra los negocios abiertos que gestiona ventas, con su valor y su probabilidad de cierre. En HubSpot, lo primero
se parece más al ciclo de vida y al pipeline de leads; lo segundo, al pipeline de negocios.

### ¿HubSpot permite crear pipelines personalizados ilimitados?

No. El tope de pipelines personalizados se comparte entre todos los objetos: 15 en Starter, 100 en Professional y
350 en Enterprise en cuentas por asiento (350 en Professional con *Flexible Seats & Credits*). El pipeline por
defecto no cuenta.

### ¿Se pueden personalizar las etapas del pipeline sin código?

Sí. Se editan en Configuración → Objetos → Negocios → Pipelines: agregar, renombrar, reordenar, cambiar la
probabilidad y marcar propiedades obligatorias por etapa. También se puede pedir a Breeze Assistant que cree el
pipeline.

### ¿Se pueden exigir campos obligatorios por etapa?

Sí, con las propiedades condicionales de cada etapa: el negocio no entra a la etapa sin completarlas. Para impedir
saltar o retroceder etapas se usan las reglas de pipeline (Professional o Enterprise).

### ¿Se puede duplicar un pipeline para hacer pruebas?

Sí. Clonar un pipeline (Professional o Enterprise) copia propiedades condicionales, reglas, automatizaciones,
etiquetas y accesos.

### ¿HubSpot maneja territorios con pipelines separados y previsión consolidada?

No hay una función de territorios documentada como tal. Se resuelve con equipos (Professional o Enterprise; equipos
anidados en Enterprise), restricción de pipelines por equipo y la vista por equipo de la herramienta de previsión.

### ¿Cómo se modela un holding con filiales y marcas?

Con empresas matriz y filial (una filial tiene una sola matriz) y reportes por etiqueta de asociación. Si las marcas
venden con el mismo proceso, HubSpot recomienda un solo pipeline con permisos por equipo en vez de un pipeline por
marca.

### ¿El Prospecting Agent crea negocios solo?

Su trabajo es investigar, sugerir contactos y redactar el contacto inicial. Que alguien responda no lo convierte en
oportunidad: en Efeonce el negocio se abre cuando una persona confirma la necesidad.

## En resumen

HubSpot ya puede llenar la parte alta del pipeline y proponer cómo mantenerlo al día. Lo que sigue siendo tuyo es
decidir qué tiene que hacer el comprador para avanzar y quién aprueba lo que propone la máquina. **Si esas dos
decisiones están claras, los agentes te devuelven tiempo; si no, te devuelven un pipeline más grande y menos
confiable.**

[Bloque 1 — Suscripción a Glitch] Si quieres seguir esta conversación, cada edición de *Glitch* trae una idea sobre
marketing, ventas e IA.

[Bloque 2 — Diagnóstico] Y si quieres revisar cómo está armado tu pipeline o activar estos agentes con criterio,
conoce cómo trabajamos [Mención: HubSpot → https://efeoncepro.com/servicios-contratar-hubspot/ · línea
revenue-hubspot].

### Fuentes

- HubSpot KB. *Set up and manage object pipelines* (act. 2026-09-29). https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines
- HubSpot KB. *Set up rules for object pipelines* (act. 2026-09-09). https://knowledge.hubspot.com/object-settings/set-up-pipeline-rules
- HubSpot KB. *Require approvals for deals* (act. 2026-09-08). https://knowledge.hubspot.com/object-settings/pipeline-approvals
- HubSpot KB. *Set up pipeline automations* (act. 2026-09-02). https://knowledge.hubspot.com/object-settings/set-up-pipeline-automations-for-objects
- HubSpot KB. *Color-coded object tags* (act. 2026-07-31). https://knowledge.hubspot.com/object-settings/color-coded-object-tags
- HubSpot KB. *HubSpot's default deal properties* (act. 2026-09-29). https://knowledge.hubspot.com/properties/hubspots-default-deal-properties
- HubSpot KB. *Understand objects* (leads; act. 2026-10-02). https://knowledge.hubspot.com/records/understand-objects
- HubSpot KB. *Set up and use the prospecting agent* (act. 2026-10-14). https://knowledge.hubspot.com/prospecting/use-the-prospecting-agent
- HubSpot KB. *Use intent signals* (act. 2026-09-29). https://knowledge.hubspot.com/reports/use-intent-signals
- HubSpot KB. *Record and take notes in meetings with Notetaker* (act. 2026-10-19). https://knowledge.hubspot.com/meetings-tool/review-recommended-next-steps-for-deals
- HubSpot KB. *Move deals forward with deal progression* (act. 2026-10-01). https://knowledge.hubspot.com/records/move-deals-forward-with-deal-progression
- HubSpot KB. *Set up the forecast tool* (act. 2026-09-09). https://knowledge.hubspot.com/forecast/set-up-the-forecast-tool
- HubSpot KB. *Improve forecasting with AI projections* (act. 2026-05-29). https://knowledge.hubspot.com/forecast/improve-forecasting-with-ai-projections
- HubSpot KB. *Create and manage teams* (act. 2026-09-29). https://knowledge.hubspot.com/user-management/create-and-manage-teams
- HubSpot KB. *Add a parent or child company* (act. 2026-01-21). https://knowledge.hubspot.com/records/add-a-parent-or-child-company
- HubSpot. *HubSpot Credits*. https://www.hubspot.com/products/artificial-intelligence/credits

---

## 4. Qué se elimina o se mueve

| Sección actual | Decisión | Motivo |
|---|---|---|
| Intro con «79 % de los leads nunca se concreta» | Sale | Sin fuente |
| «Te lo explico con manzanitas 🍏🍏🍏» en la intro | Se mueve a la explicación del criterio de salida | Es la firma de Julio; una sola vez y donde baja una idea a un ejemplo (voz §5) |
| Qué es / beneficios con cita de Mark Hunter | Se reduce a una cápsula de definición | Cita sin fuente; la definición debe estar en el primer H2 |
| «Pipeline de leads» (prospección y calificación) | Se reemplaza por el objeto Leads real de HubSpot | El original describe un concepto; HubSpot hoy tiene un objeto con pipeline propio |
| Etapas con «error común / solución» | Se reemplaza por la tabla con criterio de salida | Las etapas no coincidían con la tabla de probabilidades |
| Probabilidades «sin datos previos» con benchmarks | Se corrige y se marca como ejemplo ilustrativo | Confundía conversión entre etapas con probabilidad de cierre; enlace a HubSpot en 404 |
| Desafíos de implementación (87 %, Halligan, 50 % Salesforce) | Sale; queda la idea de reglas y automatizaciones | Cifras y cita sin fuente |
| Dos secciones del playbook + cierre de venta | Salen | El playbook no existe en la página; CTA secundario y repetido |
| Emojis en H2 y puentes «➡️ ¡No te lo pierdas! 🚀» | Salen | Forma |

## 5. Claim ledger

| ID | Claim | Tipo | Fuente | Estado |
|---|---|---|---|---|
| C1 | Pipeline = etapas con probabilidad; importe ponderado en tablero; ganado 100 % y perdido 0 % obligatorios | fact | KB pipelines (2026-09-29); default deal properties (2026-09-29) | verified |
| C2 | Objeto Leads con etapas New/Attempting/Connected/Qualified/Disqualified; requiere Sales Hub Pro/Ent | fact | KB understand objects (2026-10-02); view a lead record (2026-09-30) | verified |
| C3 | Probabilidad editada a mano deja de actualizarse sola | fact | KB default deal properties (2026-09-29) | verified |
| C4 | Pasos de configuración, nombre interno, columna «Se usa en», permiso Edit property settings | fact | KB pipelines | verified — confirmar nombres de menú en español en el portal |
| C5 | Propiedades condicionales obligatorias por etapa | fact | KB pipelines | verified |
| C6 | Crear pipeline con Breeze Assistant | fact | KB pipelines | verified |
| C7 | Límites 0/15/100/350 (asiento) y 0/15/350/350 (Flexible), compartidos, sin contar el por defecto | fact | KB pipelines | verified |
| C8 | Seis reglas de pipeline; Pro/Ent; Super Admin; sin edición en bloque; bypass por Super Admin/workflows/API salvo aprobación | fact | KB pipeline rules (2026-09-09) | verified |
| C9 | Aprobación: etapa Pending approval, hasta 10 aprobadores, Sales Hub Enterprise | fact | KB pipeline approvals (2026-09-08) | verified |
| C10 | Obligar negocio al pasar lead a Qualified: Sales Hub Pro/Ent | fact | KB pipeline rules | verified |
| C11 | Automatizaciones por etapa (tarea, correo interno, editar registro); Sales/Service desde Starter | fact | KB pipeline automations (2026-09-02) | verified |
| C12 | Etiquetas de negocio automáticas por filtros | fact | KB color-coded tags (2026-07-31) | verified — el ejemplo «sin actividad en 14 días» es ilustrativo; confirmar que el filtro existe |
| C13 | Mismo pipeline con permisos Team only por marca (recomendación de HubSpot) | fact | KB pipelines | verified |
| C14 | Restringir por equipo Pro/Ent; equipos anidados Enterprise | fact | KB pipelines; KB teams (2026-09-29) | verified |
| C15 | Sin función de territorios documentada | inferencia | Ausencia en KB de previsión y equipos | [I] — formulado como «no documenta» |
| C16 | Clonar Pro/Ent y qué copia | fact | KB pipelines | verified |
| C17 | Parent/Child, una matriz por filial; reportes por etiqueta | fact | KB parent/child (2026-01-21); association labels (2026-08-31) | verified |
| C18 | Prospecting Agent: plays, señales, fuentes externas (una a la vez), dos modos de envío | fact | KB prospecting agent (2026-10-14); intent signals (2026-09-29) | verified |
| C19 | Cobro en créditos por lead con correo generado | fact | KB prospecting agent (2026-10-14) | verified — el anuncio de abril decía «por lead recomendado»; se sigue el KB y no se pone cifra |
| C20 | Efeonce usa Prospecting Agent con Apollo | experiencia propia | Julio, 2026-10-26 (chat) | verified (autorizado) |
| C21 | Configuración: revisión humana, 5 correos/30 días, 2 días mínimo, es-CL, horario hábil | experiencia propia | Auditoría 2026-10-08; 2026-10-07 | verified — NEEDS AUTHOR confirma que se puede publicar |
| C22 | Voz calibrada con correos propios en instrucciones avanzadas; borradores intermedios con fallas | experiencia propia | Auditoría 2026-10-07 | verified — NEEDS AUTHOR |
| C23 | Créditos del mes agotados antes de lo previsto | experiencia propia | Auditoría 2026-10-08 (panel de créditos) | rejected — Julio, 2026-10-26: no va en el artículo |
| C24 | Una persona no está a la vez en el agente y en Apollo | doctrina Efeonce | AGENTIC_REVENUE_OPERATING_MODEL_V1 §Carril B regla 1 | verified — NEEDS AUTHOR |
| C25 | Una señal o lead no es una oportunidad calificada | doctrina Efeonce | Corrección de Julio en CRM_DEAL_REGISTER.md | verified — Julio, 2026-10-26: sólo como doctrina («En Efeonce trabajamos con una regla…»), sin contar que nos pasó |
| C26 | Notetaker: Meet/Teams/Zoom; propone resumen, tareas, correo y propiedades; asiento Sales/Service (Core en Starter) | fact | KB Notetaker (2026-10-19) | verified |
| C27 | Deal Progression: Sales/Service Pro/Ent; sugiere propiedades con valor actual vs sugerido y próximas acciones; se activa en Agent Hub | fact | KB deal progression (2026-10-01; la página la marca BETA) | verified — **no** afirmar que propone etapa o fecha de cierre. Julio (2026-10-26): «Lo de la beta es lo de menos, ya está funcionando»; no se menciona beta en el texto público |
| C28 | Aprobación automática o manual por propiedad en smart data capture | fact | KB Notetaker | verified |
| C29 | Créditos sólo para propiedades personalizadas | fact | KB Notetaker; KB deal progression | verified |
| C30 | Efeonce usa Notetaker en todas las reuniones + Deal Progression | experiencia propia | Julio, 2026-10-26 (chat) | verified (autorizado) |
| C31 | «Empezar en revisión y pasar a automático lo que casi nunca se corrige» | recomendación | Doctrina propose → confirm → execute | [I] — no es medición |
| C32 | Previsión: Sales/Service Pro/Ent, categorías, vista por equipo; previsión con IA en beta con negocios ganados de 3 meses | fact | KB forecast (2026-09-09); AI projections (2026-05-29) | verified |
| C33 | Importe de negocio ≠ facturación | doctrina / caso | Caso ANAM publicado | verified |
| C34 | ANAM: cobertura negocio–empresa 47,98 % → 50,73 %, sólo asociaciones determinísticas | caso real publicado | Caso dashboards ANAM (público) | verified |
| C35 | «En una venta B2B de servicios suelen bastar cuatro o cinco etapas abiertas» | recomendación Efeonce | Criterio editorial | [I] — formulado como recomendación, sin cifra de respaldo |
| R1–R8 | 79 %, 28 % HubSpot, 33 % Salesforce, 87 % HubSpot, 50 % Salesforce, 28 % McKinsey, citas Halligan y Hunter | — | 404 o sin fuente | rejected |

## 6. Visuales

| # | Archivo | Uso | Estado |
|---|---|---|---|
| 1 | `prospecting-agent-plays.svg` (mar. 2026) | Sección Prospecting Agent | Interfaz oficial sin modificar |
| 2 | `prospecting-agent-contact-sourcing.svg` (mar. 2026) | Fuentes de contactos (Apollo) | Ídem |
| 3 | `prospecting-agent-advanced-settings.svg` (sep. 2025) | Calibración de voz | Ídem — interfaz más vieja; confirmar parecido con la actual |
| 4 | `prospecting-agent-review-before-sending.svg` (sep. 2025) | Modo revisión | Ídem — ídem |
| 5 | `smart-deal-progression-update-crm.svg` (mar. 2026) | Deal Progression | Ídem. Ojo: la imagen de marketing muestra un campo de etapa; el pie **no** afirma que proponga etapa (C27) |
| 6 | `smart-deal-progression-board-notification.svg` (mar. 2026) | Aviso en tablero | Ídem |
| — | `prospecting-agent-buying-signals.svg` (mar. 2026) | Reserva | 8,7 MB con rásteres embebidos: sólo si se exporta a WebP |
| — | Tabla de etapas con criterio de salida | Infografía propia Efeonce (no hay recurso oficial de configuración) | Por diseñar |
| — | Portada | Nueva, línea gráfica Efeonce | Por diseñar; avisar a la sesión de Analytics antes de `blog-post-cover-apply.php` |

Reglas de uso: interfaz tal cual (sin recolor, sin editar textos ni datos), enmarcada en la composición Efeonce,
anotaciones en español encima y pie «Interfaz: HubSpot». Procedencia y SHA en `hubspot-ui/provenance.json`.
Exportar a WebP para el sitio.

## 7. Pendientes antes de publicar

1. Lectura de Julio: tesis, hook, motivo 🍏🍏🍏, doctrina (C24) y experiencia propia (C21, C22).
2. ~~Créditos, doctrina del CRM y probabilidades~~ — resuelto el 2026-10-26: créditos fuera (C23), C25 sólo como
   doctrina, la tabla conserva las probabilidades marcadas como ejemplo.
3. Confirmar en el portal los nombres de menú en español (C4) y el filtro de ejemplo de etiquetas (C12).
4. Enlaces internos: ICP B2B (perfil del Prospecting Agent), caso ANAM de dashboards (ya enlazado), y evaluar
   «De Excel a HubSpot». Revisar la URL del bloque de suscripción a Glitch.
5. Infografía de etapas y portada nueva.
6. Spec Gutenberg + validación + copia privada + QA en 1440 y 390 + publicación con guardas.
7. **Cambio de URL (D1):** slug `pipeline-de-ventas` en la misma publicación; 301 de un salto desde la URL actual;
   actualizar los enlaces internos de ICP B2B (249108) e Inbound (244765) y sus specs en el repo; verificar sitemap,
   canonical y `og:url`; pedir indexación de la URL nueva con el runner sólo con OK de Julio.

## 8. Cómo se mide

- **Grupo de búsquedas:** pipeline de ventas · etapas del pipeline de ventas · cómo hacer un pipeline de ventas ·
  pipeline hubspot · personalizar pipeline hubspot · reglas de pipeline hubspot · prospecting agent hubspot · deal
  progression hubspot · las preguntas de sí/no de §1.
- **Migración:** sumar URL vieja + nueva durante la consolidación; revisar a las 2 semanas que la vieja sale del
  índice y la nueva entra (el caso GA4 mostró que Google tarda).
- **Search Console:** posición e impresiones ponderadas para ese grupo; línea base = 90 días previos; revisar a las 4,
  8 y 12 semanas.
- **Hipótesis a 12 semanas:** primera página en las preguntas específicas de HubSpot y top 20 en «pipeline hubspot».
  No es una promesa.
- **IA:** panel de las preguntas de sí/no en ChatGPT, Gemini y Perplexity; registrar si citan a Efeonce.
- **Vigencia:** revisar el artículo después de cada lanzamiento de HubSpot (primavera y otoño). Deal Progression y la
  previsión con IA figuran como beta en la documentación (dato interno; el texto público no lo menciona).

## 9. Auditoría SEO/AEO de la propuesta (2026-10-26, skill `seo-aeo`)

**Intake:** blog de agencia no-YMYL; motores objetivo Google orgánico + AI Overviews/AI Mode + ChatGPT/Perplexity
(las búsquedas de sí/no sugieren agentes evaluando HubSpot [I]); mercados CL, MX y ES; objetivo de negocio
autoridad en implementación HubSpot → landing de servicios. Datos: Search Console (sesión Analytics), Semrush CL/MX/ES
(2026-10-26), HTML en vivo.

### Evidencia nueva

| Dato | Valor | Fuente |
|---|---|---|
| «pipeline de ventas» | 720/mes MX · 390 ES · 140 CL; KD 32 / 27 / 29 | Semrush `phrase_these` |
| «etapas del pipeline de ventas» | 20 MX · 40 ES · 20 CL | Ídem |
| «como hacer un pipeline de ventas» | 30 MX · 20 ES · 30 CL | Ídem |
| «pipeline hubspot» / «hubspot pipeline» | 20–30 por país | Ídem |
| «prospecting agent hubspot» | 30 ES (sin dato MX/CL) | Ídem |
| SERP «pipeline de ventas» MX | Salesforce, Connext, Pipedrive, IBM, HubSpot, DocuSign, Freshworks, ForceManager, Livebeep, Porter Metrics, Lagahe, Sales Business School: CRM **y agencias/blogs** | Semrush `phrase_organic`, top 12 |
| Enlaces externos a la URL actual | Semrush no tiene datos (no prueba ausencia, pero no hay señal de autoridad que perder) | Semrush `backlinks_overview` |
| Enlaces internos a la URL actual | ICP B2B (249108) e Inbound (244765), en sus specs | `grep` del repo |
| Slugs candidatos | `/hubspot/pipeline-de-ventas/`, `-hubspot/` y `/hubspot/pipeline-hubspot/` responden 404 (libres) | `curl`, 2026-10-26 |

### Decisiones y hallazgos, por prioridad

| # | Hallazgo | Decisión | Impacto · esfuerzo |
|---|---|---|---|
| D1 | **Slug.** El actual tiene 57 caracteres de relleno («crea-un… que-convierte-guia-paso-a-paso») y describe la intención vieja. La URL acumula poco que perder: 0 clics, posición 39, sin enlaces externos registrados. Como el contenido se reescribe entero, Google lo reevalúa igual | **Cambiar a `/hubspot/pipeline-de-ventas/`** con 301 de un salto, en la misma publicación. La categoría ya aporta «HubSpot»; el slug lleva la búsqueda principal. Corrige lo que dije antes («cambiarla obliga a otra migración»): el costo de migrar sólo pesa cuando la URL tiene algo que perder | Alto · bajo |
| D2 | **Lo genérico sí se disputa.** El borrador lo daba por perdido; el volumen y una SERP con agencias dicen lo contrario | Primer H2 con definición agnóstica y luego HubSpot; título y slug con «pipeline de ventas»; FAQ de etapas y de embudo vs. pipeline | Alto · bajo |
| D3 | **Cápsulas de respuesta.** Varios H2 abrían con contexto antes de responder | Respuesta directa de 40–60 palabras tras el H2 de definición y el de etapas; el resto ya abre respondiendo | Medio · bajo |
| D4 | **Cobertura de sub-preguntas.** Faltaban «etapas del pipeline de ventas» y «pipeline vs. embudo», que cubre toda la SERP | Dos FAQ nuevas | Medio · bajo |
| D5 | **Entidad.** HubSpot usa dos nombres para el mismo producto | «Deal Progression (HubSpot la presentó como *Smart Deal Progression*)» una vez, para casar ambas búsquedas | Bajo · mínimo |
| D6 | **Title de 66 caracteres** | Se acepta: lo que se trunca es «\| Efeonce»; la parte con intención queda visible | — |
| D7 | **Meta description** | 148 caracteres, con la búsqueda principal al inicio | — |
| D8 | **Imágenes** | `alt` en español que describa lo que muestra la interfaz; pie «Interfaz: HubSpot»; WebP; la de señales (8,7 MB) queda fuera | Medio · bajo |
| D9 | **FAQ y schema** | FAQ visible; `FAQPage` sólo si el sitio ya lo emite (Google no muestra ese resultado enriquecido para este tipo de sitio). Las respuestas de sí/no empiezan con «Sí» o «No» para que un agente las extraiga | — |
| D10 | **Enlaces internos** | Mantener caso ANAM y mención a la landing de HubSpot; agregar ICP B2B donde se habla del perfil del Prospecting Agent; actualizar los dos artículos que apuntan a la URL vieja | Medio · bajo |
| D11 | **Canibalización** | Riesgo bajo: «5 pasos CRM» trata de adopción y «De Excel a HubSpot» de migración; ninguno compite por «pipeline de ventas» | — |
| D12 | **Vigencia** | «Funciones verificadas en octubre de 2026» visible + revisión tras cada lanzamiento de HubSpot | — |

### Cómo se mide (además de §8)

- Consolidación de la migración: impresiones URL vieja + nueva; la vieja debería salir del índice en 2–4 semanas.
- «pipeline de ventas» en MX/ES/CL: entrar al top 30 en 12 semanas es la hipótesis; no es promesa.
- Panel de las preguntas de sí/no en ChatGPT, Gemini y Perplexity antes y después.
