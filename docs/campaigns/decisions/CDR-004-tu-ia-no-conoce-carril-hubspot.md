# CDR-004 · «Tu IA no conoce tu negocio»: el carril HubSpot

**Estado:** `Proposed` · **Fecha:** 2026-09-22 · **Decide:** el operador · **Campaña:** narrativa Q4 2026–Q3 2027
«Tu IA no conoce tu negocio» · **Ámbito:** carril provider-specific HubSpot sobre los cinco capítulos.

## Contexto

La narrativa canónica declara: **«No es una campaña de temporada ni una campaña de HubSpot»**. Al mismo tiempo,
HubSpot es la práctica con mayor superficie comercial de Efeonce, tiene una arquitectura de oferta vigente de seis
familias, un hub público con SSOT propio y el único caso de cliente publicado del período. Sin una decisión
explícita, cada pieza vuelve a litigar qué se puede decir de HubSpot, y la narrativa se desliza hacia el catálogo
de un proveedor.

Este CDR no revierte la frase del canon. La precisa: **la narrativa es provider-neutral; el carril HubSpot es una
de sus rutas de venta, no una campaña paralela**.

**Estado verificado el 2026-09-22 (no inferido):**

| Hecho | Medición |
|---|---|
| Capítulos 1 y 2 | Escritos en la narrativa, **sin brief operativo**; el capítulo 2 además sin cifra HubSpot verificada |
| Destinos del hub `/servicios/hubspot/*` | **1 destino útil**: el caso ANAM (`200`, contenido alineado). El pillar **no existe**: `/servicios/hubspot/` da `200` pero redirige a `/hubspot/hubspot-marketing-ventas/`, artículo de blog de 2024; `/servicios-contratar-hubspot/` sigue `200` sin el 301 del spec. Las otras cuatro, `404` |
| Estado de partnership HubSpot | «Partnership declarado por el CEO; estado contractual/tier **no revalidado** en este corte» (`EFEONCE_PARTNERSHIP_REGISTRY_V1.md`) |
| Prueba propia publicada | Caso ANAM Customer Agent, `/hubspot/ia-atencion-cliente-caso-anam/`, activo en producción confirmado 2026-09-13 |

## Decisión

### 1. Qué es y qué no es

El carril HubSpot es la **ruta provider-specific** de la misma narrativa. Rige una regla de sujeto:

> **El sujeto de una pieza es siempre el problema del comprador. HubSpot es el cómo, nunca el qué.**

No se abre un capítulo nuevo, una franquicia editorial, una campaña paralela ni un segundo catálogo. No se produce
una pieza cuyo sujeto sea un Hub, una feature o un anuncio de release: eso es contenido del proveedor, y el
proveedor lo hace mejor y primero.

### 2. La unidad de producción es el dolor, no el Hub ni la familia

Cruzar cinco capítulos por seis familias produce treinta celdas y un catálogo. La unidad correcta ya existe y está
validada: **los siete dolores del mapa del pillar**, escritos en el lenguaje del comprador. El capítulo los envuelve;
la familia los vende.

| Dolor (lenguaje del comprador) | Capítulo | Familia HubSpot | Comprador |
|---|---|---|---|
| «No sé cuánto pipeline tengo.» | 1 · Lo que tu IA no sabe | Sales & AI Pipeline (sobre Smart CRM) | CRO |
| «Marketing y ventas miran números distintos.» | 2 · Lo que tu IA cree que es cierto | Data, Integration & CRM Intelligence | CMO + CRO |
| «Mis datos están en cinco sistemas.» | 2 · Lo que tu IA cree que es cierto | Data, Integration & CRM Intelligence (Data Hub) | RevOps / IT |
| «Nadie me encuentra, ni en Google ni en ChatGPT.» | 3 · Lo que la IA dice de ti | Marketing, Content & AEO | CMO |
| «Mi postventa es invisible.» | 4 · Un equipo, no una herramienta | Service, Customer Success & Delivery | COO / CS |
| «El directorio pidió IA.» | 4 · Un equipo, no una herramienta | Agent Hub & Agentic Operations | CEO |
| «Cotizo en Word y pierdo margen.» | **sin capítulo** — ver §10 | Revenue Lifecycle | CFO |

Una pieza resuelve **un dolor para un comprador**. No se fusionan dos dolores para «cubrir más».

### 3. Tres registros de mención, y una pieza no cambia de registro entre canales

| Registro | HubSpot aparece como | Uso | Gate |
|---|---|---|---|
| **Neutral** | no se nombra | Piezas que instalan la tesis del capítulo; sirven a cualquier stack. **Default del orgánico de marca.** | Ninguno adicional |
| **Nombrado** | contexto o fuente | Cifra atribuida, anuncio como trigger de conversación, estado de producto. | Atribución explícita + estado GA/beta/demo correcto |
| **Provider-specific** | la oferta que se compra | Venta del carril: casos, precios, agentes, destino al hub. | §6 completo |

Una misma idea puede existir en dos registros como **piezas distintas**. Lo que no ocurre es que una pieza neutral
se repostee como provider-specific agregando un logo.

### 4. Mitigación del riesgo de lectura: mover la pregunta, no atacar la herramienta

Los capítulos 1 y 2 preguntan qué no sabe la IA y quién revisa lo que el CRM entendió, **justo cuando HubSpot
anuncia Smart CRM self-updating, Growth Context y Context Home como la solución**. Sin cuidado, la pieza lee como
«HubSpot no sirve» — el mismo riesgo que el canon ya registró para el key visual con la mascota del partner.

Fórmula obligatoria en todo el carril, en este orden:

1. **Reconocer la capacidad nueva** como real y buena.
2. **Nombrar la decisión que esa capacidad no toma** —fuentes, permisos, autoridad, corrección, dueño.
3. **Ahí entra Efeonce.**

El pillar ya tiene la versión validada de esta figura: HubSpot se autodenomina Agentic Customer Platform con tres
capas, y **la tercera —decidir qué hacen los agentes solos y qué queda con humanos— la nombra y no la llena**.

🔴 **De qué está hecho el primer tiempo** *(delta 2026-09-22, tras rechazo del operador a tres titulares)*:

> **El primer tiempo es un hecho que el lector ya vivió y puede verificar en su propia semana.
> Nunca una suposición sobre lo que compró.**

«Tu CRM ya se actualiza solo» funciona porque él lo vio anunciado. «La IA ya está en el presupuesto» funciona
porque él lo firmó. «Ya tienes agentes» **falla** porque asume un lector product-aware cuando el gerente de
mid-market está problem-aware: le pidieron IA, está evaluando, no tiene nada corriendo. Es el error #1 de
Schwartz —usar el framework de un nivel de consciencia que el lector no tiene— y quien no se reconoce en el
primer renglón no llega al segundo.

**Consecuencia de proceso:** el nivel de consciencia del lector se declara **antes** de escribir el titular, no
después. Caso fuente y reescrituras: `CMP-002/conceptos/CONCEPTOS-REVISION-v02.md`.

Queda prohibido el encuadre de carencia del producto: «tu CRM no se enteró», «HubSpot no te dice», «lo que tu
plataforma te oculta». El cuello de botella se ubica en el contexto y la autoridad, no en la capacidad del partner.

### 5. Herencia de la regla del vacío

El carril hereda la regla §0 del hub: **Efeonce solo se cita donde HubSpot no puede o no quiere hablar, y donde ese
vacío no esté ya lleno.** Aplicada a campaña, ordena la fuerza de las piezas:

| Ángulo | ¿HubSpot no puede hablar? | ¿El vacío sigue vacío? | Fuerza |
|---|---|---|---|
| Cuándo **no** conviene HubSpot para este caso | jamás lo escribirán | vacío real | **la más fuerte** |
| Cuánto cuesta de verdad, con créditos y seats | no publican sus trampas | vacío en español | fuerte, y la única con demanda medida |
| Qué agente sirve para **tu** caso, qué cuesta y cómo se gobierna | cambia por release y portal | vacío, es nuevo | fuerte |
| Qué hace un Hub o qué se anunció en UNBOUND | lo hacen mejor y primero | saturado | **no se produce** |

Antes de declarar que una pieza llena un vacío, **medirlo**. Saturación no es vacío.

### 6. Gates de claim de partner

- **Ninguna pieza externa declara tier, nivel, badge ni categoría de partner HubSpot** hasta revalidar el estado
  contractual. El registro dice «declarado por el CEO, no revalidado»; una declaración interna no es un derecho de uso
  de marca. Revalidar tier, portal, certificaciones y derechos es prerrequisito de cualquier pieza provider-specific
  pagada.
- **Cifras de HubSpot siempre atribuidas** («según HubSpot») y nunca como resultado comprometido por Efeonce. Las
  vigentes: 3,6× MQL, 3,2× deals, 2× tickets, 81 % más campañas, 2,2× leads, ~50 % menos tiempo de cierre. El
  **capítulo 2 no tiene cifra verificada**: se apoya en método y casos, no se le presta una cifra de otro capítulo.
- **Estados no equivalentes**, según la matriz de `HUBSPOT_FALL_2026_UNBOUND_RELEASES_2026-09-16.md`: ChatGPT Lead
  Gen Ads y Scheduled Prompts como beta pública; Smart CRM self-updating, Growth Context, Context Home, Breeze
  reconstruido y Marketing Studio como lanzamiento con disponibilidad por cuenta y plan; Agent Hub/Builder como
  pilot-first; Customer Agent Voice, HubSpot Work y Agent CLI como first look o demo; Universal Record Page como
  private beta. Una demo de evento no es GA, pricing ni runtime.
- **Claims prohibidos** heredados del hub: «líder en CRM según Gartner» (es Challenger en el MQ de CRM Sales
  Platforms 2026), Forrester Wave, ISO 27001 de HubSpot, residencia de datos en LATAM, «flota de agentes». Sí es
  citable: Leader en B2B Marketing Automation (Gartner, 5.º año) y SOC 2 Type II + SOC 3.
- **Nomenclatura 2026:** Revenue Hub, Data Hub, UNBOUND. HubSpot ya no se presenta como CRM.
- 🔴 **Isotipo ≠ badge de partner.** El Sprocket como **product placement en escena** es uso de producto y se
  gobierna por las guías de marca del partner. El **badge de Solutions Partner** afirma una relación contractual
  y **no se usa hasta revalidar el tier**. Y ninguno de los dos se **genera**: el modelo no reproduce una marca
  ajena de forma fiable —medido con el emblema bordado propio—, así que entra por kit 3D o composición
  determinística, nunca desde el generador.
- **Salesforce** solo en orgánico de liderazgo de opinión, con tono de comparación y nunca en pauta.

### 7. Destinos y conversión

Medición del 2026-09-22, **por contenido y no sólo por código de respuesta**:

| URL | Código | Qué sirve realmente |
|---|---|---|
| `/hubspot/ia-atencion-cliente-caso-anam/` | `200` | **El caso ANAM.** Único destino del carril con contenido alineado |
| `/servicios/hubspot/` | `200` → redirige | `/hubspot/hubspot-marketing-ventas/`, **artículo de blog de 2024**. No es el pillar del spec |
| `/servicios-contratar-hubspot/` | `200` | Viva y **sin el 301** que el spec ordena hacia el pillar |
| `/servicios/hubspot/precios/` · `/agentes/` · `cuando-no-usar-hubspot` · `hubspot-vs-salesforce` | `404` | No existen |
| `/agenda/` | `200` | Destino genérico de conversación, no del carril |

Consecuencias vinculantes:

- 🔴 **El pillar no existe.** Un `200` que redirige a un artículo de 2024 no es una landing de conversión: no
  tiene el mapa de dolores, el CTA de evaluación ni la sección «cuándo NO es para ti». Ninguna pieza lo usa
  como destino mientras siga así.
- **Hoy el carril tiene un destino propio —el caso ANAM— y uno genérico —`/agenda/`.** Todo lo demás es
  conversación directa.
- **Orgánico habilitado** en los siete dolores. **Pauta acotada** a esos dos destinos.
- **El bloqueo número uno no son cuatro páginas, son cinco**, y el pillar va primero: es la página que reparte.
  `/precios/` lo sigue por demanda medida (~1.500 búsquedas/mes).
- **Se verifica el contenido, no el código.** Un `200` puede ser una redirección a otra cosa; esta medición
  nació de ese error.

### 8. Prueba disponible y su límite

- **Caso ANAM Customer Agent** — publicado, autorizado, con evidence ledger y estado vigente confirmado. Es la única
  prueba de cliente publicable del carril; sostiene el dolor «mi postventa es invisible» y, parcialmente, «el
  directorio pidió IA».
- **El caso se cita en su página y en conversación, nunca en un anuncio de venta.** Ningún titular, apoyo ni
  descriptor de pieza pautada nombra a ANAM (ver Delta 2026-09-22 noche, punto 4).
- **Caso ANAM RevOps** — existe writing packet y spec, sin publicación autorizada en este corte. Hasta que la tenga,
  no se cita en piezas externas.
- **Sin caso, se publica el método con su límite.** Los capítulos 1, 2, 3 y 5 no heredan la prueba del 4.

### 9. Medición

Se mide **por dolor y por familia**, no por capítulo agregado: un capítulo alimenta ofertas distintas y sumarlas
oculta cuál funcionó. Métrica primaria: conversaciones calificadas que llegan a evaluación inicial o a un modo de
entrega pagado. La propiedad de campaña por capítulo en HubSpot es una escritura que requiere autorización y no se
crea por este CDR.

### 10. Los dos huecos que revela el cruce

El cruce de §2 deja dos casillas sin par. Se declaran, no se rellenan por simetría:

1. **«Cotizo en Word y pierdo margen» (Revenue Lifecycle, CFO) no tiene capítulo.** Es un dolor comercial vivo del
   mapa del pillar que la narrativa del período no envuelve. Opciones: entra por la capa transversal «Resultados, no
   output» por el lado de margen y costo, o se declara explícitamente fuera de la narrativa y se vende por el hub sin
   envoltorio de campaña. **Pendiente de decisión del operador; hasta entonces no se le fabrica un capítulo.**
2. **El capítulo 5 no tiene dolor equivalente en el mapa del pillar.** Marketing Studio y Campaign Agent viven en la
   familia Marketing, Content & AEO, pero el dolor «producimos lento y todo se parece» pertenece al beachhead
   Creative Velocity & Production. En el carril HubSpot el capítulo 5 entra **solo cuando el cliente ya opera en
   HubSpot** y el problema es producción de campaña sobre ese stack; en cualquier otro caso es Creative, no HubSpot.

## Delta 2026-09-22 — el buying group real corrige la columna «comprador»

El operador declaró, el mismo día de aceptación, que **la conversación comercial ocurre con gerencias —Marketing,
Ventas, Finanzas y CTO/IT— y casi nunca con el CEO**, y que **enterprise es más difícil con HubSpot**. Es
evidencia de operación propia y prevalece sobre la columna «Comprador» de §2, que fue tomada del mapa de dolores
del pillar.

1. **La columna «Comprador» de §2 describe a quién le duele, no con quién se habla.** Un dolor cuyo dueño nominal
   es el CEO llega a una pieza dirigida a la gerencia que tiene que ejecutarlo: «el directorio pidió IA» le habla
   al **CTO/IT**, no al CEO. El CEO permanece como sponsor que aprueba, no como destinatario de una pieza.
2. **§10.1 cambia de prioridad.** El hueco de Revenue Lifecycle / CFO se declaró diferido por no tener capítulo.
   Con Finanzas como interlocutor habitual, **ese dolor está en la puerta de entrada**, no en el margen. Siguen
   abiertas las dos puertas posibles —costo por resultado válido, transversal, o cotización/margen, Revenue
   Lifecycle— y siguen siendo jobs distintos: la decisión sigue pendiente, pero deja de ser de baja prioridad.
3. **En enterprise el carril no lidera con la plataforma.** Lidera el problema y HubSpot aparece si hay fit. Es la
   regla de sujeto de §1, ahora con motivo comercial además de editorial.

No cambia el criterio del CDR: regla de sujeto, unidad por dolor, fórmula de dos tiempos, los tres gates y la
decisión de no usar paleta HubSpot siguen vigentes. Asignación por pieza y conceptos en **CMP-002**.

## Delta 2026-09-22 (noche) — la fórmula de dos tiempos deja de ser obligatoria

**La §4 convirtió un recurso en regla, y la regla produjo un tic.** Los seis titulares de CMP-002 salieron con
la misma cadencia —premisa corta con punto, remate—: «Aprobaron la IA. / Los permisos los firmas tú.», «Tu CRM
ya se actualiza solo. / El criterio no.», «Pagas Pro. / Operas como Starter.». Sueltos parecían ingeniosos;
armados como serie, el operador los leyó como *«muy extraña la forma en que estás comunicando»* y, peor, como
titulares que **no atacan ni el servicio que vendemos ni el dolor**.

La causa la nombra la skill de copywriting como su antipatrón número uno (`03_HEADLINES_HOOKS_LEADS.md` §6.b):
**poner el CONCEPTO en el lugar del título. Un titular promete; el concepto sólo nombra.** «El criterio no.»
nombra una idea y no promete nada. Además fallaban dos de las 4 U's —*useful* y *ultra-specific*— y no usaban
ni un nombre propio del catálogo que el comprador ya reconoce: HubSpot, Customer Agent.

**Lo que cambia:**

1. La fórmula de dos tiempos pasa a ser **un recurso más**, no una obligación. Una serie **varía la fórmula por
   pieza** —how-to, voz del cliente, pregunta, directo, contra-intuitivo, número—, porque la repetición de cadencia se
   lee como receta igual que el acento cálido repetido.
2. **Cada titular promete algo concreto** y nombra el dolor o el servicio. Si el titular se entiende como el
   nombre interno de una idea, todavía no es titular.
3. **Se usan los nombres propios del catálogo** cuando existen: son propietarios, el comprador los busca y
   cargan significado que un adjetivo no compra.
4. 🔴 **El cliente no se nombra en los ads de venta** (decisión del operador, 2026-09-22). La autorización de
   ANAM cubre el caso publicado, no usar su nombre para vender en pauta. El caso vive en el destino, no en la
   pieza: el KV-02 pasó de «Así atiende ANAM con IA» a la frase del propio cliente final —«Quiero hablar con
   una persona.»—, que nombra el dolor sin nombrar a nadie.

**Lo que se conserva de la §4:** reconocer la capacidad del partner sin atacarla. Ningún titular puede leerse
como «HubSpot no sirve»; eso sigue siendo regla.

## Alternativas descartadas

- **Una campaña por familia de solución:** seis campañas simultáneas, seis presupuestos, seis medidas. Fragmenta la
  narrativa y reproduce el catálogo que la arquitectura de oferta evitó.
- **Una pieza por Hub:** ya descartado en la regla §0 del hub por razones de citabilidad; no mejora por mudarse a
  social.
- **Usar los anuncios de UNBOUND como sujeto de campaña:** envejece en un trimestre, regala el protagonismo al
  proveedor y obliga a rehacer todo en el siguiente release.
- **Declarar el carril como campaña independiente de la narrativa:** duplica territorio, compite por el mismo
  presupuesto y rompe la razón por la que existe una plataforma narrativa única.
- **Esperar a que el hub esté completo para producir:** el orgánico no depende de las cuatro páginas en `404`, y
  esperar regala el trimestre de mayor atención del mercado.

## Consecuencias y pendientes

- El brief ejecutable del carril vive en
  [`RUTA_HUBSPOT.md`](../../commercial/campaigns/2026-q4-tu-ia-no-conoce-tu-negocio/RUTA_HUBSPOT.md); este CDR fija el
  criterio, el brief fija el trabajo.
- Los capítulos 1 y 2 quedan con brief por primera vez; el 3, 4 y 5 conservan el suyo y aquí solo reciben el carril.
- **Esta aceptación no autoriza producir, publicar, programar, pautar, crear propiedades en HubSpot ni declarar tier
  de partner.**
- Pendientes bloqueantes, en orden de impacto: revalidar el estado de partnership · desbloquear `/precios/` ·
  decidir el hueco de Revenue Lifecycle · autorizar o archivar el caso ANAM RevOps.
