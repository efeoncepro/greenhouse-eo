# TASK-1859 / Landing pública de capacidad de diseño (Product Design 360) — Wireframe

## Meta

- Status: `draft — estructura, copy, claims y estados fijados; dirección visual PENDIENTE`
- Owner task: `TASK-1859 — Landing pública de capacidad de diseño (superficie de producto de Product Design 360)`
- Product Design asset: **PENDIENTE.** No existe dirección visual aprobada. Este wireframe fija arquitectura de información, copy, claims, estados, accesibilidad y contratos; **no inventa la dirección visual**. `UI ready` se mantiene `no` hasta que exista la fuente visual aprobada y el Visual Direction Contract de este documento quede completo.
- Intended consumers: visitante público no autenticado en `efeoncepro.com` — Head of Design / Design Director (operador y campeón), CPO / CTO (comprador económico). Secundario: agentes y crawlers de respuesta IA.
- Copy source: contenido de página WordPress es-CL. **El Copy Ledger de este documento es la fuente** hasta la validación con `greenhouse-ux-writing` + `copywriting`. No usa `src/lib/copy/*` (no es portal).
- Primitive decision: `new (public-site widget family)` — familia de widgets Elementor propia en `eo-elementor-widgets`, un widget por módulo, patrón `TASK-1350`. No reutiliza primitives del portal Greenhouse.
- UI ready target: `no`.
- Canon comercial: [`ADR Product Design 360`](../../architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md) · [`Business Model V1.1`](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md) · [`Ficha de servicio`](../../services/wave/product-design-360.md)

## Brief

- Primary user: **Head of Design / Design Director / Design Manager** de una empresa mid-market o enterprise **que ya tiene equipo de diseño in-house** y no alcanza a cubrir su demanda. Es el operador, el campeón y —si la página huele a reemplazo— el veto.
- Secondary user: **CPO / CTO / VP Product**, comprador económico. Llega reenviado por el Head of Design o por el reframe de ingeniería de la región 3.
- User moment: descubrimiento (orgánico/AEO/referido) o, en fase B, **envío 1:1 durante una conversación comercial**. Los primeros diez segundos deciden si sigue leyendo.
- Job to be done: *"Necesito que salgan las lanes que mi equipo nunca alcanza, sin sumar headcount que después no puedo sostener, y sin traer un proveedor que le diga a mi jefe que mi equipo no da el ancho."*
- Primary decision signal: *"Esta gente entiende que ya tengo equipo, me deja elegir qué soltar, y puedo verificar si cumplen."* → agenda una reunión.
- Non-goals: no es self-serve; no vende diseño de sitio web (eso es `TASK-1345`); no vende marca, campañas ni piezas (eso es `TASK-1350`); no publica precios; no muestra casos de cliente de product design (no existen); no expone el portal ni datos de cliente.

## Publication Gate — la oferta todavía no autoriza claims públicos

🔴 **Esta es la restricción que ordena todo lo demás.** El business model está en `Proposed` y declara textualmente que no autoriza *"claims públicos, venta general"*. Una landing indexable es un claim público. Por eso la página se construye completa pero se publica por fases, atadas al estado del modelo:

| Fase | Estado del business model | Qué se permite | Indexación |
|---|---|---|---|
| **A** | `Proposed` *(hoy)* | Construir en borrador/privado; verificar en preview | ninguna — no pública |
| **B** | `Approved for validation` | Publicar **`noindex, follow`**, fuera del sitemap y del menú; usarla **como pieza que se envía, no que se encuentra**, en conversaciones 1:1 y pilotos | `noindex` |
| **C** | `Commercially approved` | Indexar, sitemap, menú *Servicios*, enlaces desde landings hermanas, promover el scheduler | `index, follow` |

El nombre público **"Product Design 360" no aparece en la página** mientras siga abierta la decisión D1 del modelo: en LATAM "product design" puede leerse como diseño industrial. La página lidera con **Efeonce** y con lenguaje llano (*capacidad de diseño*, *UX/UI*, *design system*, *accesibilidad*).

## Information Architecture

La secuencia no es un folleto (servicios → por qué nosotros). Es una arquitectura de persuasión con cuatro movimientos, cada uno con su región:

1. **Reconocimiento** *(regiones 1–2)* — en diez segundos, el visitante se reconoce: *"esto es para equipos que ya tienen equipo"*. Anula el miedo a la sustitución **por construcción**, sin nombrarlo.
2. **Reencuadre** *(región 3)* — enseña algo que el visitante no había contabilizado: su problema de diseño es capacidad de ingeniería que ya pagó y no puede usar. Convierte un gasto de diseño en un argumento que el CTO escucha. Se ancla en **los números del propio visitante**, nunca en un benchmark externo.
3. **Criterio y oferta** *(regiones 4–8)* — primero la oferta de control (*tú eliges*), después los siete frentes, después la prueba independiente más fuerte (accesibilidad), después la auto-identificación (tres razones) y el mecanismo de verificación.
4. **Resolución de la indecisión** *(regiones 9–12)* — el mayor competidor es no decidir. Se ofrece un camino de un solo paso siguiente, se declara cuándo **no** somos la opción y se cierra con la agenda.

**Lo que se omite a propósito, y qué ocupa su lugar:**

| Omitido | Por qué | Qué lo reemplaza |
|---|---|---|
| Casos de cliente | No existe ninguno de product design; los de otras disciplinas inducirían una inferencia falsa | Prueba independiente (región 6), mecanismo verificable (región 8) y piloto acotado (región 9) |
| Marquee de logos de clientes | Implicaría que son clientes de diseño de producto; y un carrusel automático exige pausa accesible (WCAG 2.2.2) | Línea textual de prueba de marca Efeonce (región 2) |
| Cifras de cumplimiento (RpA, OTD) | Son de la entrega creativa, no de product design | Se describe **qué** se mide, sin números (región 8) |
| Precios | No aprobados por Finance | Cómo se cobra, sin montos (región 9 + FAQ) |
| El contrato anti-desplazamiento | Recitarlo inventa preocupaciones que el visitante no traía | Una sola frase de control (región 4) |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header / nav | Marca Efeonce + nav nativa + CTA *Agenda una reunión* persistente | header nativo Ohio (no se reemplaza) | estático |
| 1 | Hero | Reconocimiento del ICP + propuesta + CTA primario y secundario | módulo `hero` | estático |
| 2 | Prueba de marca | Respaldo de la masterbrand, sin implicar casos de diseño | módulo `brand-proof` (texto) | curado |
| 3 | Reencuadre | Diseño = capacidad de ingeniería ociosa; pregunta anclada en los datos del visitante | módulo `reframe` + esquema conceptual | estático |
| 4 | Control | *Tú eliges qué frentes conserva tu equipo* | módulo `control` | estático |
| 5 | Los siete frentes | Catálogo reconocible, ordenado por evidencia | módulo `lanes` (grilla de 7) | estático |
| 6 | Accesibilidad con número | Prueba independiente más fuerte; cifras verificadas con fuente | módulo `a11y-proof` | curado con fuente |
| 7 | Tres razones | Auto-identificación del visitante | módulo `reasons` | estático |
| 8 | Verificable | Qué se mide y cómo se declara la confianza del número | módulo `verification` | estático |
| 9 | Cómo empezamos | Camino de cuatro pasos + resolución de indecisión | módulo `start` | estático |
| 10 | Cuándo no somos la opción | Honestidad + enrutamiento a landings hermanas | módulo `not-for` | estático |
| 11 | Preguntas frecuentes | Objeciones + answer capsules (AEO) | módulo `faq` | estático |
| 12 | CTA final | Cierre + agenda | módulo `cta` + Growth CTA `open_meeting_scheduler` | Growth Meetings |
| 13 | Footer | Footer nativo Efeonce/Ohio | footer nativo | estático |

## Region Specs

### Región 1 — Hero

- **Propósito:** que el Head of Design se reconozca en una línea y entienda que no es un reemplazo.
- **Contenido:** eyebrow · H1 · subtítulo · CTA primario + microcopy · CTA secundario (ancla a región 5).
- **Desktop 1440:** columna de texto a la izquierda (máx. ~60 caracteres por línea en el subtítulo); zona visual a la derecha **PENDIENTE de dirección visual**. El elemento LCP debe ser el H1 (texto), no un video ni una imagen pesada.
- **Mobile 390:** columna única; H1 y CTA primario visibles sin scroll; zona visual debajo del CTA o suprimida.
- **Estados:** sin carga de datos. Si la zona visual falla, el hero sigue completo y legible.
- **A11y:** único `h1` de la página; CTA con texto visible idéntico a su nombre accesible; área táctil ≥ 24×24 px.
- **Criterio de región:** con JavaScript deshabilitado, el hero se lee entero y el CTA funciona como enlace de recuperación.

### Región 2 — Prueba de marca

- **Propósito:** respaldo de la masterbrand sin inducir la inferencia de que son clientes de diseño de producto.
- **Contenido:** una sola línea de texto, sin logos.
- **Regla dura:** nunca rotulada como clientes de diseño, UX o producto.

### Región 3 — Reencuadre

- **Propósito:** enseñar. Convertir *"necesito más diseñadores"* en *"estoy pagando ingeniería que no puedo usar"*. Es la región que hace que el CTO lea.
- **Contenido:** H2 formulado como pregunta sobre los datos del visitante · cuerpo · remate.
- **Esquema conceptual (opcional, sujeto a dirección visual):** dos filas —ingeniería creciendo, diseño plano—, rotulado **"Esquema"**, sin cifras ni ejes. **No es un gráfico de datos**: si se lee como dato, se retira.
- **Regla dura:** **ningún ratio de benchmark en la página.** La proporción 1:2–1:1 es de fuente media con sesgo de proveedor; vive en la conversación, con su fuente, nunca en la landing. El argumento se sostiene en la pregunta, no en un número ajeno.
- **A11y:** el esquema tiene equivalente textual completo; no transmite nada que el texto no diga.

### Región 4 — Control

- **Propósito:** la única cláusula anti-desplazamiento que se dice en voz alta, formulada como **oferta de control**, no como promesa de abstención.
- **Contenido:** H2 · cuerpo · tres puntos.
- **Regla dura:** no aparece ninguna otra cláusula del contrato anti-desplazamiento. Nada de *"nunca nos reunimos sin ti"* ni *"no medimos a tu gente"*.

### Región 5 — Los siete frentes

- **Propósito:** catálogo reconocible. Que el visitante encuentre su dolor sin entender la arquitectura interna.
- **Orden:** por evidencia de mercado (ADR §Decisión 4). Accesibilidad primero.
- **Contenido por tarjeta:** nombre (`h3`) · qué absorbe (una oración) · etiqueta *Compartido con tu sitio web* en L1 y L2.
- **Desktop:** grilla de 3 columnas con la primera tarjeta destacada por jerarquía, no por color. **Mobile:** una columna.
- **Enlace de costura:** bajo la grilla, una línea que enruta a `/desarrollo-sitios-web/` (`TASK-1345`) explicando que accesibilidad y design system se contratan una sola vez.
- **Regla dura:** la regla comercial *"L4 nunca sola"* **no se expone** en la página; se aplica en la propuesta.
- **A11y:** tarjetas no clicables enteras (evita áreas de click ambiguas); si una tarjeta lleva enlace, es un enlace de texto explícito.

### Región 6 — Accesibilidad con número

- **Propósito:** la prueba independiente más fuerte que existe para esta oferta, y un argumento que casi nadie conoce.
- **Contenido:** H2 · tres cifras con su explicación en texto · línea de causa · línea legal condicionada · fuente enlazada · CTA contextual.
- **Regla dura de verificación:** cada cifra coincide con el Claims Ledger y con la fuente primaria. Si WebAIM publica una edición nueva, la región se actualiza o se retira; no se deja una cifra vencida.
- **Regla dura legal:** el argumento legal se formula **sólo** para quien vende en la UE. **Nunca** se afirma nada sobre el marco chileno mientras no esté verificado.
- **Sin contadores animados:** las cifras son texto estático desde el primer render (ver Motion Contract).
- **Dogfooding:** esta región vuelve a la página entera auditable contra su propio argumento — ver Accessibility Contract.

### Región 7 — Tres razones

- **Propósito:** auto-identificación. Dos de las tres razones describen a un cliente **sano**; la página no debe leerse como dirigida a equipos en problemas.
- **Contenido:** H2 · tres bloques (título + cuerpo).
- **Orden:** expansión → gap estructural → deterioro. El deterioro va último a propósito.

### Región 8 — Verificable

- **Propósito:** mostrar el mecanismo de accountability sin prometer cifras que no son de esta disciplina.
- **Contenido:** H2 · lista de qué se mide · línea sobre la política de confianza del número.
- **Regla dura:** **ninguna cifra.** Los valores reales de RpA/OTD provienen de la entrega creativa; mostrarlos aquí induciría que son de product design.
- **Regla dura:** no afirmar que *"nuestros clientes ya usan la plataforma"* (adopción declarada 0% → meta 100%).

### Región 9 — Cómo empezamos

- **Propósito:** resolver la indecisión con **un solo paso siguiente** y quitar el riesgo de la decisión.
- **Contenido:** H2 · cuatro pasos numerados (`ol`) · línea de cierre.
- **Regla dura:** sin montos. El diagnóstico es pagado: su copy no puede implicar gratuidad.

### Región 10 — Cuándo no somos la opción

- **Propósito:** confianza y enrutamiento. Es el patrón más citable por motores de respuesta: una empresa diciendo cuándo no conviene contratarla.
- **Contenido:** H2 · cuatro casos con su enlace de salida cuando corresponde.
- **Enlaces:** `/agencia-creativa/` (`TASK-1350`) · `/desarrollo-sitios-web/` (`TASK-1345`). Enlaces internos **sin UTM** (una UTM en un enlace interno rompe la atribución de la sesión).

### Región 11 — Preguntas frecuentes

- **Propósito:** objeciones de venta reales + answer capsules. Cada respuesta es autónoma (40–70 palabras) y citable fuera de contexto.
- **Implementación:** botones nativos que controlan paneles; o `details/summary` si el runtime lo permite sin romper estilos. Marcado `FAQPage` sólo con preguntas visibles en la página.

### Región 12 — CTA final

- **Propósito:** cierre. Reutiliza el mismo CTA primario y abre el scheduler nativo.
- **Conversión:** Growth CTA `open_meeting_scheduler` (ver Flow). Mientras la superficie no esté promovida, el CTA opera como enlace de recuperación hacia `/contacto/`, declarado.

## Copy Ledger

Copy es-CL, tuteo, sin voseo, beneficios antes que siglas, lidera Efeonce. Estado: **borrador a validar** con `greenhouse-ux-writing` + `copywriting`. Ningún string contiene el nombre interno de la familia.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `publicsite.capacidad-diseno.hero.eyebrow` | 1 | UX/UI · Design system · Accesibilidad · Investigación | — | reconocimiento por vocabulario del comprador |
| `publicsite.capacidad-diseno.hero.h1` | 1 | Capacidad de diseño para equipos que ya tienen equipo. | — | H1; anula la sustitución por construcción |
| `publicsite.capacidad-diseno.hero.subhead` | 1 | Investigación, UX/UI, design system y accesibilidad, en frentes de trabajo completos. Tu equipo dirige el producto; nosotros ejecutamos lo que nos sueltas. | — | reparto de trabajo, no voto |
| `publicsite.capacidad-diseno.hero.cta_primary` | 1 | Agenda una reunión | — | CTA primario, idéntico en regiones 0 y 12 |
| `publicsite.capacidad-diseno.hero.cta_micro` | 1 | Revisamos tu roadmap y cuánta capacidad de diseño exige. | — | sin duración inventada |
| `publicsite.capacidad-diseno.hero.cta_secondary` | 1 | Mira los siete frentes | — | ancla `#frentes` |
| `publicsite.capacidad-diseno.proof.line` | 2 | Efeonce trabaja con más de 90 empresas en Chile, Colombia, México y Perú. | — | prueba de masterbrand; nunca "clientes de diseño" |
| `publicsite.capacidad-diseno.reframe.h2` | 3 | ¿Cuántas vacantes de ingeniería abrieron este año? ¿Y cuántas de diseño? | — | la pregunta usa los datos del visitante |
| `publicsite.capacidad-diseno.reframe.body` | 3 | Ingeniería crece con presupuesto de ingeniería. Diseño crece con presupuesto de diseño, que casi siempre es más chico y llega después. Cada vez que tu empresa suma ingenieros, tu proporción de diseño empeora, y el costo no aparece en diseño: aparece como sprints que arrancan sin pantallas y decisiones de interfaz que alguien toma a última hora para poder avanzar. | — | sin cifras |
| `publicsite.capacidad-diseno.reframe.punchline` | 3 | No es un problema de diseño. Es capacidad de ingeniería que ya pagaste y no puedes aprovechar. | — | remate que habla al CTO |
| `publicsite.capacidad-diseno.reframe.diagram_label` | 3 | Esquema | — | evita que el esquema se lea como dato |
| `publicsite.capacidad-diseno.control.h2` | 4 | Tú eliges qué frentes conserva tu equipo. | — | oferta de control |
| `publicsite.capacidad-diseno.control.body` | 4 | Tu equipo dirige el producto. Nosotros dirigimos la ejecución de los frentes que nos sueltas, con nuestro método, nuestra gente y nuestro control de calidad. | — | — |
| `publicsite.capacidad-diseno.control.point_1` | 4 | Contratas frentes completos, no horas. | — | — |
| `publicsite.capacidad-diseno.control.point_2` | 4 | Cada frente tiene alcance, rondas y entregables declarados. | — | — |
| `publicsite.capacidad-diseno.control.point_3` | 4 | Puedes recuperar un frente cuando tu equipo esté listo, y te llevas lo construido. | — | reversibilidad + portabilidad, en positivo |
| `publicsite.capacidad-diseno.lanes.h2` | 5 | Siete frentes de trabajo | — | ancla `#frentes` |
| `publicsite.capacidad-diseno.lanes.l1.title` | 5 | Accesibilidad | — | primera por evidencia |
| `publicsite.capacidad-diseno.lanes.l1.body` | 5 | Auditamos, corregimos y dejamos el criterio dentro de tu sistema, para que lo nuevo nazca accesible. | — | — |
| `publicsite.capacidad-diseno.lanes.l2.title` | 5 | Design system y tokens | — | — |
| `publicsite.capacidad-diseno.lanes.l2.body` | 5 | Hacemos que el sistema que ya tienen se adopte y se pueda demostrar: versiones, contribuciones de tu equipo y control de desvíos. | — | "que ya tienen": no vende construirlo |
| `publicsite.capacidad-diseno.lanes.l3.title` | 5 | Investigación con usuarios | — | — |
| `publicsite.capacidad-diseno.lanes.l3.body` | 5 | Entrevistas, pruebas de usabilidad y validación con personas reales, antes y después de lanzar. | — | "personas reales" diferencia del research sintético |
| `publicsite.capacidad-diseno.lanes.l4.title` | 5 | Diseño de interfaz | — | — |
| `publicsite.capacidad-diseno.lanes.l4.body` | 5 | Flujos, estados y pantallas listos para que tu equipo de ingeniería construya sin volver a preguntar. | — | la regla "nunca sola" no se expone |
| `publicsite.capacidad-diseno.lanes.l5.title` | 5 | Consistencia y deuda de diseño | — | — |
| `publicsite.capacidad-diseno.lanes.l5.body` | 5 | Contenemos la inconsistencia que se acumula release tras release: el trabajo que el roadmap siempre deja para después. | — | — |
| `publicsite.capacidad-diseno.lanes.l6.title` | 5 | Operación de diseño | — | — |
| `publicsite.capacidad-diseno.lanes.l6.body` | 5 | Que el trabajo entre ordenado, pase control de calidad y deje memoria de por qué se decidió cada cosa. | — | — |
| `publicsite.capacidad-diseno.lanes.l7.title` | 5 | Lo que ya generaron con IA | — | nombre llano para "endurecer" |
| `publicsite.capacidad-diseno.lanes.l7.body` | 5 | Revisamos lo que tu equipo ya generó con IA —consistencia, accesibilidad, estados faltantes— y dejamos un filtro para lo que venga. | — | — |
| `publicsite.capacidad-diseno.lanes.shared_tag` | 5 | Compartido con tu sitio web | — | sólo en L1 y L2 |
| `publicsite.capacidad-diseno.lanes.seam_link` | 5 | ¿También tu sitio web? Accesibilidad y design system se contratan una sola vez para ambos. Mira diseño y desarrollo web. | enlace `/desarrollo-sitios-web/` | costura con `TASK-1345` |
| `publicsite.capacidad-diseno.a11y.h2` | 6 | La accesibilidad de la web está empeorando, no mejorando. | — | ancla `#accesibilidad` |
| `publicsite.capacidad-diseno.a11y.stat_1_value` | 6 | 95,9% | — | ver Claims Ledger C2 |
| `publicsite.capacidad-diseno.a11y.stat_1_text` | 6 | de las páginas de inicio más visitadas del mundo tiene errores de accesibilidad detectables. | — | — |
| `publicsite.capacidad-diseno.a11y.stat_2_value` | 6 | 56,1 | — | C3 |
| `publicsite.capacidad-diseno.a11y.stat_2_text` | 6 | errores por página en promedio, un 10,1% más que el año anterior. | — | C3 |
| `publicsite.capacidad-diseno.a11y.stat_3_value` | 6 | 59,1 frente a 42 | — | C5 |
| `publicsite.capacidad-diseno.a11y.stat_3_text` | 6 | errores promedio en páginas que usan atributos ARIA frente a páginas que no los usan. Sumar componentes no arregla la accesibilidad por sí solo. | — | argumento contraintuitivo |
| `publicsite.capacidad-diseno.a11y.cause` | 6 | El promedio volvió a empeorar después de seis años seguidos de pequeñas mejoras. WebAIM lo atribuye en parte a páginas más complejas y al desarrollo asistido por IA. | — | C4 |
| `publicsite.capacidad-diseno.a11y.legal` | 6 | Si vendes en la Unión Europea, la Ley Europea de Accesibilidad es exigible desde el 28 de junio de 2025. | — | C6; condicionada |
| `publicsite.capacidad-diseno.a11y.source` | 6 | Fuente: WebAIM Million, medición de febrero de 2026. | enlace externo | — |
| `publicsite.capacidad-diseno.a11y.cta` | 6 | Empezar por accesibilidad | — | mismo scheduler, `utm_content=lane-accesibilidad` |
| `publicsite.capacidad-diseno.reasons.h2` | 7 | Tres razones por las que un equipo nos llama | — | — |
| `publicsite.capacidad-diseno.reasons.r1.title` | 7 | Creciste y no te alcanza. | — | cliente sano |
| `publicsite.capacidad-diseno.reasons.r1.body` | 7 | Levantaste ronda, entraste a otro mercado o ingeniería contrató. No hay nada roto: necesitas más capacidad. | — | — |
| `publicsite.capacidad-diseno.reasons.r2.title` | 7 | Hay algo que tu equipo no va a tener adentro. | — | cliente sano |
| `publicsite.capacidad-diseno.reasons.r2.body` | 7 | No tienes investigador ni especialista de accesibilidad, y no vas a abrir esas vacantes. Ese hueco no se cierra: se cubre. | — | — |
| `publicsite.capacidad-diseno.reasons.r3.title` | 7 | Algo se deterioró. | — | va último a propósito |
| `publicsite.capacidad-diseno.reasons.r3.body` | 7 | Hay deuda acumulada y quieres recuperar terreno antes de seguir construyendo. | — | — |
| `publicsite.capacidad-diseno.verify.h2` | 8 | Puedes ver si estamos cumpliendo. | — | — |
| `publicsite.capacidad-diseno.verify.body` | 8 | Trabajamos sobre nuestra propia plataforma. Ahí ves, sobre nuestro trabajo, cuántas rondas de cambio necesita cada entrega, qué porcentaje salió a tiempo, qué salió bien a la primera, cuántos días toma cada ciclo y qué está detenido hace más de 72 horas. | — | mecanismo, sin cifras (C8) |
| `publicsite.capacidad-diseno.verify.trust` | 8 | Y cuando un número no tiene datos suficientes para ser confiable, el sistema te lo dice en vez de mostrarlo igual. | — | política de confianza (C8) |
| `publicsite.capacidad-diseno.start.h2` | 9 | Cómo empezamos | — | ancla `#como-empezar` |
| `publicsite.capacidad-diseno.start.s1.title` | 9 | Conversación de capacidad | — | — |
| `publicsite.capacidad-diseno.start.s1.body` | 9 | Revisamos tu roadmap y cuánta capacidad de diseño exige frente a la que tienes. | — | — |
| `publicsite.capacidad-diseno.start.s2.title` | 9 | Diagnóstico | — | — |
| `publicsite.capacidad-diseno.start.s2.body` | 9 | Te entregamos qué frentes soltar, en qué orden y con qué capacidad. Te sirve para pedir presupuesto aunque no sigas con nosotros. | — | entregable autónomo; no implica gratuidad |
| `publicsite.capacidad-diseno.start.s3.title` | 9 | Un frente, un ciclo | — | — |
| `publicsite.capacidad-diseno.start.s3.body` | 9 | Pruebas nuestro método en un solo frente, pagado y acotado. Si al terminar no recuperaste capacidad que puedas nombrar, no hay compromiso de continuar. | — | sin promesa de reembolso |
| `publicsite.capacidad-diseno.start.s4.title` | 9 | Capacidad mensual | — | — |
| `publicsite.capacidad-diseno.start.s4.body` | 9 | Si funcionó, sigues con una cuota mensual por cada frente. | — | sin montos |
| `publicsite.capacidad-diseno.start.close` | 9 | Lo que decides en la primera reunión no es un contrato anual: es si vale un ciclo comprobarlo. | — | resolución de indecisión |
| `publicsite.capacidad-diseno.notfor.h2` | 10 | Cuándo no somos la opción | — | patrón más citable |
| `publicsite.capacidad-diseno.notfor.c1` | 10 | Si tu necesidad de diseño es permanente y generalista, contrata. Un buen diseñador de planta es insustituible. | — | honestidad |
| `publicsite.capacidad-diseno.notfor.c2` | 10 | Si necesitas marca, campañas o piezas, eso lo hace nuestro equipo creativo. | enlace `/agencia-creativa/` | enruta a `TASK-1350` |
| `publicsite.capacidad-diseno.notfor.c3` | 10 | Si necesitas un sitio web nuevo, empieza por diseño y desarrollo web. | enlace `/desarrollo-sitios-web/` | enruta a `TASK-1345` |
| `publicsite.capacidad-diseno.notfor.c4` | 10 | Si buscas pantallas por hora o por pieza, no es nuestro modelo. | — | — |
| `publicsite.capacidad-diseno.faq.h2` | 11 | Preguntas frecuentes | — | ancla `#preguntas` |
| `publicsite.capacidad-diseno.faq.q1` | 11 | ¿Qué es un frente de trabajo? | — | — |
| `publicsite.capacidad-diseno.faq.a1` | 11 | Un frente es una parte completa del trabajo de diseño —por ejemplo, accesibilidad o design system— que tu equipo nos entrega con alcance, rondas y entregables declarados. No contratas horas ni personas: contratas que ese frente se resuelva y se sostenga. | — | answer capsule |
| `publicsite.capacidad-diseno.faq.q2` | 11 | ¿En qué se diferencia de una suscripción de diseño? | — | — |
| `publicsite.capacidad-diseno.faq.a2` | 11 | Las suscripciones venden capacidad de producción, sobre todo gráfica. Nosotros trabajamos sobre tu producto: investigación, interfaz, sistema y accesibilidad, con un equipo con nombre que acumula contexto de tu negocio y te muestra si está cumpliendo. | — | sin nombrar competidores |
| `publicsite.capacidad-diseno.faq.q3` | 11 | ¿Por qué no contratar a un diseñador más? | — | — |
| `publicsite.capacidad-diseno.faq.a3` | 11 | Contrata si el trabajo es permanente y generalista. Un cargo te da una persona; difícilmente te da investigación, accesibilidad y design system a la vez, porque no vas a abrir tres vacantes. Nosotros cubrimos lo que un cargo no alcanza. | — | sin cifras de salario |
| `publicsite.capacidad-diseno.faq.q4` | 11 | ¿Cómo se cobra? | — | — |
| `publicsite.capacidad-diseno.faq.a4` | 11 | Con una cuota mensual por cada frente contratado. No cobramos por hora ni por pantalla. Las rondas de revisión y los entregables quedan declarados en el contrato. | — | sin montos |
| `publicsite.capacidad-diseno.faq.q5` | 11 | ¿Qué pasa con el design system si terminamos? | — | — |
| `publicsite.capacidad-diseno.faq.a5` | 11 | Queda contigo, en un formato que tu equipo puede operar sin nosotros, junto con la documentación y el registro de decisiones. | — | portabilidad |
| `publicsite.capacidad-diseno.faq.q6` | 11 | ¿Trabajan con mi equipo de ingeniería? | — | — |
| `publicsite.capacidad-diseno.faq.a6` | 11 | Sí. Entregamos flujos, estados y especificaciones listos para construir, y verificamos que lo construido corresponda a lo diseñado. | — | método, no garantía de resultado |
| `publicsite.capacidad-diseno.faq.q7` | 11 | ¿Pueden revisar lo que ya generamos con IA? | — | — |
| `publicsite.capacidad-diseno.faq.a7` | 11 | Sí. Revisamos consistencia con tu sistema, accesibilidad y estados faltantes en lo ya generado, y dejamos un filtro para lo que se genere después. | — | L7 |
| `publicsite.capacidad-diseno.cta_final.h2` | 12 | Conversemos tu capacidad de diseño. | — | — |
| `publicsite.capacidad-diseno.cta_final.body` | 12 | Trae tu roadmap. Lo revisamos contigo y te decimos por dónde empezaríamos. | — | promesa proporcional a una reunión |
| `publicsite.capacidad-diseno.cta_final.button` | 12 | Agenda una reunión | — | idéntico al primario |
| `publicsite.capacidad-diseno.fallback.contact` | 12 | Escríbenos y coordinamos. | enlace `/contacto/` | sólo mientras la surface no esté promovida |

## Claims Ledger

Toda afirmación factual de la página, con su fuente y su permiso. **Una afirmación que no está aquí no se publica.**

| Id | Claim | Región | Fuente | as-of | Confianza | Permiso |
|---|---|---|---|---|---|---|
| C1 | Más de 90 empresas; Chile, Colombia, México y Perú | 2 | copy aprobado de la masterbrand en `TASK-1350` | 2026-07-07 | aprobado para sitio público | ✅ sólo como prueba de Efeonce |
| C2 | 95,9% de home pages del top 1M con fallas WCAG detectables | 6 | [WebAIM Million](https://webaim.org/projects/million/) — **verificado en fuente primaria** | medición feb-2026, verificado 2026-09-10 | alta | ✅ con fuente enlazada |
| C3 | 56,1 errores por página, +10,1% interanual | 6 | ídem | ídem | alta | ✅ |
| C4 | Revierte seis años de pequeñas mejoras; atribuido en parte a complejidad y desarrollo asistido por IA | 6 | ídem | ídem | alta | ✅ parafraseado fiel, sin exagerar la causalidad |
| C5 | Páginas con ARIA promedian 59,1 errores vs 42 sin ARIA | 6 | ídem | ídem | alta | ✅ |
| C6 | La Ley Europea de Accesibilidad es exigible desde el 28-06-2025 | 6 | [Davis Wright Tremaine](https://www.dwt.com/insights/2025/07/european-accessibility-act-digital-products) | 2025-07 | media | ✅ **sólo condicionado a "si vendes en la UE"** |
| C7 | Las multas varían por Estado miembro | — | fuentes discrepan (€100.000 / €500.000) | — | baja | ❌ no se publica ningún monto |
| C8 | La plataforma muestra rondas por entrega, a tiempo, bien a la primera, ciclo, trabado >72h, y declara cuándo un número no es confiable | 8 | `creative-practice/efeonce/ESTADO_ACTUAL.md` §1 — `/analytics` real con `metric-trust-policy` | verificado 2026-07-19 | alta | ✅ **mecanismo sin cifras** |

## Forbidden Copy

La verificación incluye un escaneo del texto renderizado contra esta lista. Cualquier aparición bloquea la publicación.

| Prohibido en la página | Por qué |
|---|---|
| `Product Design 360` | nombre público no aprobado (D1) |
| Cifras de RpA, OTD o FTR (ej. `0,02`, `0,38`) | son de la entrega creativa, no de product design |
| Nombres de competidores (`Superside`, `Eleken`, `Design Pickle`, `Toptal`…) | no se compite descalificando; y sus precios no son claims de Efeonce |
| Cifras de salario o costo cargado | son de EE.UU. y de fuentes con sesgo de proveedor |
| La proporción diseñador:ingeniero como número | fuente media con sesgo; vive en la conversación |
| `93%` y cualquier dato de dependencia de ingeniería | informe original no verificado |
| Cualquier caso de cliente de diseño de producto | no existe |
| `Creative Hub`, reportes de ROI, exportaciones | superficies inexistentes en el portal |
| "nuestros clientes ya usan…" | adopción declarada 0% |
| Cualquier afirmación sobre la ley chilena de accesibilidad | marco no verificado |
| Cláusulas anti-desplazamiento ("nunca nos reunimos sin ti", "no medimos a tu gente") | inventan preocupaciones |
| "somos una extensión de tu equipo" sin mecanismo pegado | frase de agencia commodity |
| Precios o montos | no aprobados |
| "ilimitado" | no hay capacidad ilimitada |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | página completa renderizada en HTML del servidor | Agenda una reunión | default |
| loading | — | no hay carga de datos en la página; el scheduler gestiona sus propios estados | — | ver Flow |
| empty | — | no aplica: contenido curado sin fuente de datos vacía | — | — |
| partial | — | si falla la zona visual del hero o el esquema de la región 3, el texto queda completo | — | degradación sin pérdida de significado |
| error (scheduler) | — | lo gestiona el scheduler nativo: conserva calendario, navegación y **Reintentar** | — | nunca iframe ni enlace al proveedor |
| surface no promovida | — | el CTA abre `/contacto/` como enlace declarado | Escríbenos y coordinamos. | fases A y B antes de binding |
| denied | — | no aplica: página pública | — | — |

## Accessibility Contract

🔴 **La página vende accesibilidad. Cualquier falla de accesibilidad refuta la oferta en la misma pantalla.** El estándar no es "cumplir el mínimo": es **cero errores automáticos y un recorrido manual limpio**.

- **Objetivo:** WCAG 2.2 nivel AA, con **cero errores** en axe-core y WAVE sobre la página publicada, más recorrido manual con teclado y lector de pantalla (VoiceOver y NVDA).
- **ARIA mínimo, HTML nativo primero.** La propia región 6 afirma que las páginas con ARIA promedian más errores. ARIA sólo donde no existe equivalente nativo; nunca `role` redundante sobre elementos nativos.
- **Encabezados:** un único `h1` (región 1) → un `h2` por región → `h3` dentro de tarjetas y pasos. Sin saltos de nivel.
- **Idioma:** `lang` de la página en español; los términos en inglés (UX/UI, design system, roadmap) no requieren cambio de idioma por ser de uso corriente.
- **Contraste:** texto normal ≥ 4.5:1; texto grande ≥ 3:1; componentes de interfaz y foco ≥ 3:1 (1.4.3, 1.4.11).
- **Foco visible y no oculto** (2.4.7, **2.4.11 nuevo en 2.2**): el header persistente no puede tapar el elemento enfocado. Se exige `scroll-margin-top` / `scroll-padding-top` igual o mayor a la altura del header.
- **Tamaño de objetivo** (**2.5.8 nuevo en 2.2**): ≥ 24×24 px para CTAs, enlaces de tarjeta y controles de FAQ.
- **Ayuda consistente** (**3.2.6 nuevo en 2.2**): el CTA de contacto ocupa la misma posición relativa en header, hero y cierre.
- **Contenido en movimiento** (2.2.2): **ningún elemento se mueve de forma automática por más de 5 segundos.** Por eso no hay marquee de logos.
- **Movimiento por interacción** (2.3.3): `prefers-reduced-motion` respetado (ver Motion Contract).
- **Cifras de la región 6:** texto estático en el DOM desde el primer render; sin contadores. Un lector de pantalla nunca lee valores intermedios.
- **Esquema de la región 3:** equivalente textual completo; si es SVG, `role="img"` con nombre accesible, o marcado decorativo si el texto adyacente ya lo cubre.
- **Enlaces:** texto descriptivo; el enlace externo a WebAIM indica que abre fuera del sitio si abre en pestaña nueva.
- **Skip link** al contenido principal.
- **Scheduler:** su accesibilidad la provee el componente nativo (`<efeonce-meeting-scheduler>`); se verifica en esta página, no se asume.

## SEO / AEO Contract

- **Slug candidato:** `/servicios/diseno-ux-ui/` — sigue la convención `/servicios/<x>/` del sitio (`/servicios/posicionamiento-seo`, `/servicios/agencia-de-influencers/`) y usa el vocabulario con que el comprador busca, evitando la lectura de "diseño de producto" como diseño industrial. **Pendiente de validación de demanda y SERP** en el Slice 1; alternativas: `/servicios/capacidad-de-diseno/`, `/servicios/diseno-de-producto-digital/`.
- **Title (borrador):** Capacidad de diseño UX/UI para equipos in-house | Efeonce
- **Meta description (borrador):** Investigación, UX/UI, design system y accesibilidad en frentes de trabajo completos, para equipos de diseño que ya existen. Tu equipo dirige; nosotros ejecutamos lo que nos sueltas.
- **JSON-LD:** `Organization` (Efeonce, masterbrand) · `Service` (`serviceType`, `provider` Efeonce, `areaServed` CL/CO/MX/PE; **sin** `offers` con precio) · `FAQPage` (sólo preguntas visibles de la región 11) · `BreadcrumbList`.
- **Render:** el contenido vive en el HTML del servidor (Elementor SSR), no inyectado por JavaScript, para que motores de respuesta lo lean.
- **Answer capsules:** región 11 + región 10 (*Cuándo no somos la opción*), que es el patrón más citable.
- **Indexación:** gobernada por el Publication Gate — `noindex, follow` en fase B; `index, follow` sólo en fase C.
- **Canonical:** la URL propia; en fase B, sin enlaces internos desde menú ni landings hermanas.

## Visual Direction Contract — PENDIENTE

**No existe dirección visual aprobada. Este bloque declara lo decidido y lo que falta; no la inventa.**

Decidido (restricciones, no estética):

- **El medio es el mensaje:** la página vende design system y accesibilidad, así que debe **leerse como un sistema** — escala de espaciado consistente, jerarquía tipográfica estable, componentes que se repiten reconociblemente, contraste real. Una landing espectacular pero incoherente refuta la oferta.
- **Tokens, no valores sueltos:** color, tipografía, espaciado y motion desde los tokens del sitio público de Efeonce; sin HEX ni tamaños inventados.
- **Restricción de motion:** ver Motion Contract (sin marquee, sin contadores, sin video en el hero, sin scroll-jacking).
- **LCP en texto:** el H1 es el elemento más grande del primer pliegue; ninguna imagen o video compite por LCP.
- **Sin clichés:** nada de fotos de stock de personas frente a laptops ni ilustraciones genéricas de "equipo colaborando"; si hay imagen, es un artefacto de diseño real (componentes, estados, tokens) producido para esta página.
- **Header y footer nativos** de Efeonce/Ohio; la página no trae los suyos.

Pendiente — requerido para `UI ready: yes`:

- [ ] Fuente visual durable aprobada (archivo `.dc.html` de Claude Design o nodo Figma), con ruta registrada aquí.
- [ ] Modo: `source-led` (esperado, como `TASK-1350` y `TASK-1799`) o `repo-native-benchmark`.
- [ ] Targets desktop 1440 y mobile 390 aprobados por el operador.
- [ ] Jerarquía de acciones visual confirmada: 1 primaria (*Agenda una reunión*, repetida en header, hero y cierre) · 2 secundarias (*Mira los siete frentes*, *Empezar por accesibilidad*).
- [ ] Visual fidelity mapping región por región contra la fuente.
- [ ] GVC/Playwright con `qualityProfile: premium`, dossier, decisión de baseline y chequeo de scroll-width.

## Implementation Mapping

- Route / surface: página WordPress en `efeoncepro.com` `[slug pendiente de validación — ver SEO / AEO Contract]`. No es ruta del portal Greenhouse.
- Runtime: WordPress + Elementor, familia de widgets propia en el plugin `eo-elementor-widgets`, **un widget por módulo** (regiones 1–12), sin widget HTML monolítico — patrón de `TASK-1350` y `TASK-1799`. Nombre de la familia `[verificar convención del plugin]`, candidato `greenhouse_design_capacity_module`.
- Header/footer: nativos Ohio, siguiendo `docs/documentation/public-site/wordpress-ohio-elementor-layout.md` (playbook de variantes de header).
- Primitives: widgets públicos propios; no primitives del portal.
- Component candidates: módulos `hero`, `brand-proof`, `reframe`, `control`, `lanes`, `a11y-proof`, `reasons`, `verification`, `start`, `not-for`, `faq`, `cta`.
- Copy source: Copy Ledger de este documento → contenido de página WordPress es-CL.
- Data reader / command: ninguno de Greenhouse para el contenido. Conversión: Growth CTA `open_meeting_scheduler` → Growth Meetings (config/availability/booking) server-side.
- API parity: el booking corre en el command gobernado de Growth Meetings; HubSpot nunca se llama desde WordPress ni desde el navegador.
- Access / capability: `none` (público).
- Measurement: familia browser `greenhouse_cta_*` (EPIC-023) + funnel `gh_meeting_*`; **conversión sólo desde receipt server-confirmed**, sin PII en eventos; `utm_content` por CTA (`hero`, `lane-accesibilidad`, `final`).
- Sibling links: `/desarrollo-sitios-web/` (`TASK-1345`), `/agencia-creativa/` (`TASK-1350`), `/contacto/`.
- States to implement: ready, partial (visual/esquema), surface no promovida (fallback declarado), estados del scheduler nativo, reduced-motion, mobile 390.

## GVC Scenario Plan

- Scenario file: **GVC del portal no aplica** — superficie WordPress pública sin agent-auth. Verificación con Playwright live sobre la URL de preview o publicada (patrón `TASK-1343`/`1345`/`1350`) + axe-core + WAVE.
- Route: URL de la página `[preview en fase A; publicada noindex en fase B]`.
- Viewports: 1440, 1280, 390.
- Quality profile: `premium`.
- Required steps: cargar → scroll completo → navegar la página entera sólo con teclado (Tab/Shift+Tab/Enter) → abrir y cerrar el scheduler → activar anclas `#frentes` y `#accesibilidad` → forzar `prefers-reduced-motion: reduce` → deshabilitar JavaScript y recargar.
- Required captures: hero (1440/390), región 3, región 5, región 6, región 9, región 10, scheduler abierto, foco sobre un elemento bajo el header persistente, reduced-motion 390, página sin JavaScript.
- Required `data-capture` markers: `data-capture="capacidad-hero"`, `capacidad-reframe`, `capacidad-lanes`, `capacidad-a11y`, `capacidad-start`, `capacidad-notfor`, `capacidad-faq`, `capacidad-cta`.
- Assertions:
  - axe-core **0 violaciones** y WAVE **0 errores** (1440 y 390).
  - consola `errors=[]`; `scrollWidth == clientWidth` en 1440 y 390.
  - un único `h1`; ningún salto de nivel de encabezado.
  - elemento enfocado nunca intersecta el rectángulo del header persistente.
  - objetivos interactivos ≥ 24×24 px.
  - ninguna animación infinita en la página (`document.getAnimations()` sin iteraciones infinitas).
  - bajo reduced-motion: `animationName=none` en los elementos animados; cifras de la región 6 visibles desde el primer render.
  - **escaneo de Forbidden Copy sobre el texto renderizado: 0 coincidencias.**
  - JSON-LD válido (`Organization`, `Service` sin precio, `FAQPage`, `BreadcrumbList`).
  - meta robots coincide con la fase (`noindex` en B).
  - CWV dentro de budget: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
- Scroll-width checks: sí, 1440 y 390.
- Reduced-motion / focus evidence: capturas dedicadas.
- Review dossier: `.captures/<ISO>_task1859-capacidad-diseno/` con capturas, reporte axe/WAVE y resultado del escaneo de claims.
- Baseline decision / surface ID: superficie nueva, sin baseline previa; surface ID `public-site/capacidad-diseno`.

## Design Decision Log

- **Decision:** landing de la **superficie de producto**, dirigida al Head of Design con equipo in-house, estructurada como reconocimiento → reencuadre → oferta → resolución de indecisión; publicada por fases atadas al estado del business model.
- **Alternatives considered:**
  - *Una landing para producto y sitio público* — rechazada: dos compradores y dos presupuestos; el sitio público ya lo cubre `TASK-1345`.
  - *Folleto de servicios con casos* — rechazada: no existen casos de product design y el formato no resuelve la indecisión.
  - *Publicar indexada desde ya* — rechazada: el modelo `Proposed` prohíbe claims públicos.
  - *Liderar con el benchmark del ratio* — rechazada: invita a discutir el número en vez del problema; la pregunta sobre los datos del visitante no se puede refutar.
  - *Marquee de logos de clientes* — rechazada: induce inferencia falsa y exige mecanismo de pausa accesible.
  - *Contadores animados en la región 6* — rechazada: un lector de pantalla puede leer valores intermedios y la página vende accesibilidad.
- **Why this pattern:** el comprador tiene equipo y poder de veto; la página tiene que ganarse al Head of Design sin amenazarlo y darle al CTO un argumento que no sea estético. La accesibilidad es la única prueba independiente con serie temporal medida, así que ocupa el lugar que normalmente tendrían los casos.
- **Reuse / extend / new primitive:** nueva familia de widgets públicos (`eo-elementor-widgets`); reutiliza header/footer Ohio, Growth CTA y Growth Meetings sin fork.
- **Open risks:** la dirección visual no existe; el slug no está validado; el nombre público está abierto; la página puede no publicarse nunca si G1 falla; una página que vende accesibilidad es la más expuesta a una auditoría pública.

## Acceptance Checklist

- [x] Cada string visible está en el Copy Ledger (borrador a validar).
- [x] Cada claim factual está en el Claims Ledger con fuente, as-of y permiso.
- [x] La lista de copy prohibido es escaneable de forma automática.
- [x] Los estados parciales y la surface no promovida son explícitos.
- [x] Ningún copy implica garantía, gratuidad del diagnóstico, precio o caso de cliente.
- [x] Las cifras tienen alternativa textual y no dependen de animación.
- [x] El Publication Gate ata la indexación al estado del business model.
- [x] Implementation mapping nombra runtime, primitive, copy source, conversión y medición.
- [x] El plan de verificación es específico y declara por qué GVC del portal no aplica.
- [ ] Visual Direction Contract completo — **pendiente, bloquea `UI ready: yes`**.
