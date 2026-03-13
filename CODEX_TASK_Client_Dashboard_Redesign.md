# CODEX TASK — Rediseño del Dashboard Cliente (Vista "Ver como cliente")

## Contexto

La ruta actual del dashboard cliente (accesible via "Ver como cliente" desde el admin, y como landing page cuando un cliente se loguea) muestra métricas ICO del space. Es la cara del producto Greenhouse hacia el cliente.

**Problema principal:** La vista tiene demasiadas secciones con demasiado detalle, sin jerarquía clara. Un cliente que entra ve ~15 cards/secciones dispersas y no sabe qué mirar primero. Esto es exactamente lo opuesto a lo que Greenhouse promete: "transparencia que se entiende sin esfuerzo."

**Segundo problema:** Muchas secciones muestran data vacía o en cero (0 piezas entregadas, 0% OTD, 0 trabajo activo) sin empty states diseñados — transmite la sensación de un producto roto, no de una cuenta nueva.

**Tercer problema:** Hay secciones que son internas/operativas y no deberían ser visibles para el cliente (Capacity y equipo asignado con porcentajes de allocation, herramientas tecnológicas con badges "Definir por módulo", lectura de capacidad con "Healthy" y horas mensuales). El cliente no necesita ver la cocina.

**Referencia:** El spec técnico (`Greenhouse_Portal_Spec_v1.md`, sección 4.1) define exactamente qué debe tener este dashboard. Volver a ese spec.

---

## Arquitectura objetivo del dashboard

El dashboard debe tener 3 zonas verticales claras, en este orden:

### ZONA 1: Hero + KPIs (above the fold — lo que el cliente ve sin scrollear)

**Hero card** (el banner gradiente que ya existe está bien como concepto, pero simplificarlo):
- Título: "Throughput, revisión y salud creativa" — OK, mantener.
- Subtítulo con contexto temporal: "Última actividad: [fecha]. X proyectos activos."
- Chips de capabilities activas (Globe, Agencia Creativa, etc.) — OK, mantener.
- **Eliminar** los contadores que están en cero dentro del hero (confunden). Mover esos números a las KPI cards.
- **El panel derecho del hero** (actualmente muestra "RELACIÓN: Tiempo compartido / 7m 24d", "ACTIVE WORK: 0", "ON TIME MENSUAL: 50%") necesita limpieza:
  - "Tiempo compartido: 7m 24d" es interesante como dato de antigüedad de la relación — mantener pero simplificar el label a "Relación activa: 7 meses". No mostrar días exactos.
  - "ACTIVE WORK: 0" duplica la KPI de tareas activas — eliminar del hero.
  - "ON TIME MENSUAL: 50%" duplica la KPI de OTD% — eliminar del hero.
  - Si queda solo el dato de antigüedad, integrarlo como metadata del subtítulo: "Última actividad: [fecha]. X proyectos activos. Relación activa: X meses."

**4 KPI Cards** en fila (spec sección 4.1):

| Card | Métrica | Visualización | Semáforo |
|------|---------|---------------|----------|
| 1 | **RpA promedio** | Número grande (ej: 0.8) | ≤1.5 verde, ≤2.5 amarillo, >2.5 rojo |
| 2 | **Piezas entregadas** (últimos 30 días) | Número + trend vs mes anterior | N/A |
| 3 | **OTD%** (On-Time Delivery) | Porcentaje grande | ≥90% verde, ≥70% amarillo, <70% rojo |
| 4 | **Revisión activa** | Conteo de piezas en revisión + comentarios abiertos | Badge si >0 |

**Usar los stat cards de Vuexy full-version** (`src/views/pages/widget-examples/statistics/`). Estos tienen el patrón número grande + ícono + trend + subtítulo. No construir cards custom.

**Regla de empty state para KPIs:** Si el dato es 0, mostrar "0" con un subtexto gris claro: "Aún sin actividad este mes" — no dejarlo vacío ni con 0% en rojo que parece error.

### ZONA 2: Charts (2 filas de 2 charts cada una)

**Fila 1:**

| Chart izquierdo | Chart derecho |
|-----------------|---------------|
| **Distribución por estado** — Donut chart. Tareas agrupadas por estado (En curso, Listo para revisión, Cambios Solicitados, Listo). Colores consistentes por estado. | **Cadencia de entregas** — Line/bar chart. Piezas entregadas por semana en los últimos 3 meses. El que ya existe ("Cadencia de piezas y salidas") va en la dirección correcta pero necesita limpieza. |

**Fila 2:**

| Chart izquierdo | Chart derecho |
|-----------------|---------------|
| **RpA por proyecto** — Bar chart horizontal. Comparación de RpA promedio por proyecto del cliente. Incluir línea de referencia en 2.0 (máximo ICO). | **OTD% mensual** — Line chart. Tendencia de OTD% en los últimos 6 meses. Línea de referencia en 90%. |

**Usar ApexCharts** (la librería que Vuexy ya incluye). Ver patrones en `full-version/src/views/dashboards/` — hay múltiples ejemplos de donut, line y bar charts con el styling correcto.

**Regla de empty state para charts:** Si no hay data suficiente para graficar, NO mostrar un chart vacío ni con ejes sin datos. Mostrar un card del mismo tamaño con un ícono centrado + mensaje: "Se necesitan al menos 2 semanas de actividad para generar esta gráfica." Esto es mucho mejor que mostrar ejes vacíos.

### ZONA 3: Detalle operativo (below the fold — para quien quiere profundizar)

**Sección: Tu equipo y capacidad contratada**

Esta sección SÍ es visible para el cliente, pero rediseñada respecto a la actual. El cliente que compra un servicio con horas asignadas necesita saber quién trabaja en su cuenta y cuánta capacidad tiene contratada. Lo que NO necesita ver es el desglose interno de allocation por persona, fuentes asignadas, ni el badge "Healthy/Unhealthy".

Layout: un card con dos zonas lado a lado.

**Zona izquierda — Equipo asignado:**
- Lista de personas con: avatar (o iniciales), nombre, rol (ej: "Creative Operations Lead", "Senior Visual Designer").
- Sin porcentajes de allocation, sin horas individuales, sin conteo de fuentes, sin badges de utilización.
- Simplemente: estas son las personas que trabajan en tu cuenta.

**Ghost slot de expansión (Product-Led Growth):**
Al final de la lista de personas del equipo, agregar un slot vacío que invite a ampliar el equipo. Este es un mecanismo de PLG — el producto sugiere la expansión de forma natural, sin ser agresivo.

Diseño del ghost slot:
- Un círculo punteado (dashed border, color `#CBD5E1` o el gris neutro del tema) del mismo tamaño que los avatares del equipo.
- Dentro del círculo: ícono "+" en gris claro.
- A la derecha del círculo (alineado como los demás miembros): texto "Ampliar tu equipo" en color gris medio (`text.secondary`), con un subtexto más pequeño: "Agrega capacidad creativa, de medios o tecnología."
- **Al hacer clic:** abre un modal liviano o navega a una vista de contacto/solicitud (NO un carrito de compras). Opciones:
  - **Opción A (mínima viable):** Abre un modal con un textarea: "Cuéntanos qué necesitas. Tu account manager te contactará." + botón "Enviar solicitud". Esto genera una notificación interna (email al owner del space o webhook a Teams/Slack).
  - **Opción B (más integrada, fase futura):** Muestra las capabilities disponibles que el cliente NO tiene activas (ej: si tiene Globe pero no tiene Reach, mostrar "Amplificación y Medios" como opción). Clic en una capability abre descripción corta + "Solicitar propuesta".

**Reglas de diseño del ghost slot:**
- Debe verse como parte natural de la lista de equipo, no como un banner publicitario.
- No usar colores llamativos ni CTAs agresivos. El patrón es: círculo punteado gris + texto secundario. Se nota, pero no grita.
- No mostrar el ghost slot si el equipo tiene 0 personas asignadas (en ese caso toda la sección está en empty state). Solo aparece cuando ya hay al menos 1 persona asignada — el contraste entre personas reales y el slot vacío es lo que genera el efecto.
- El ghost slot es siempre el último elemento de la lista.

**Referencia de patrón:** Slack muestra "Invite people" como último item en la lista de miembros. Figma muestra un "+" al final de los editores con "Invite" tooltip. Notion muestra "Add members" con el mismo patrón. Seguir esa misma energía: sutil, integrado, no intrusivo.

**Zona derecha — Capacidad contratada:**
- Un indicador visual tipo gauge o progress bar que muestre la capacidad en FTE:
  - **Capacidad contratada:** X FTE (donde 1 FTE = 160 horas/mes)
  - **Capacidad utilizada este mes:** Y FTE (o Y%)
  - Barra de progreso visual: verde si <80%, amarillo si 80-95%, rojo si >95%.
- Debajo, en texto secundario: "X horas de Y horas mensuales utilizadas."
- **Nudge contextual de capacidad:** Si la utilización está en >85% de forma consistente (2+ meses), mostrar un chip discreto debajo de la barra: "Tu equipo está cerca de su capacidad máxima. ¿Necesitas más horas?" con link a la misma acción del ghost slot (modal de solicitud o contacto). Este nudge solo aparece con data real que lo justifique — no es un upsell permanente, es un trigger basado en evidencia. Esto es PLG real: el producto detecta la oportunidad y la sugiere en el momento justo.
- Si el servicio del cliente NO incluye horas contratadas (ej: proyecto a precio cerrado), esta zona derecha no se muestra — solo queda el equipo + ghost slot.

**Lógica de visibilidad:** Mostrar la zona de capacidad/FTE solo si el space tiene un valor de `horas_mensuales_comprometidas > 0` (o el campo equivalente en la configuración del tenant). Si no tiene horas configuradas, mostrar solo el equipo sin la barra de capacidad. El ghost slot se muestra siempre que haya al menos 1 persona asignada, independientemente de si hay horas configuradas.

**Referencia Vuexy full-version:** El patrón de "Team Members" card existe en varias vistas de `src/views/dashboards/` y `src/views/pages/user-profile/`. Para el gauge de capacidad, usar un ApexChart tipo `radialBar` o una progress bar de MUI con label.

**Sección: Tu ecosistema**

El cliente debe saber qué herramientas operan en su cuenta y qué AI está activa. Esto es parte de la propuesta de valor de Greenhouse — visibilidad total del stack. Pero la presentación actual (botones "Definir por módulo", "Refinar por módulo", estados vacíos) transmite un producto sin configurar. Esta sección reemplaza las actuales "Herramientas tecnológicas" y "Herramientas AI" con un diseño orientado al cliente.

Layout: un card con 2 columnas (o 2 cards lado a lado en desktop, stacked en mobile).

**Columna izquierda — Stack de herramientas:**
- Título: **Tu stack**
- Lista de herramientas configuradas para este space, cada una con: ícono del servicio (Figma, Frame.io, Notion, SharePoint, Teams/Slack), nombre, y link directo que abre la herramienta en el workspace/space del cliente.
- Ejemplo: "Figma → abre el proyecto del cliente en Figma", "Frame.io → abre el space del cliente en Frame.io", "Notion → abre el workspace del cliente".
- **Regla crítica:** Solo mostrar herramientas que ya estén configuradas para este space y tengan una URL funcional. Si una herramienta no está configurada, no aparece. Nunca mostrar estados pendientes, botones "Definir" ni placeholders. La lista crece orgánicamente a medida que se habilitan más herramientas en el admin.
- Si ninguna herramienta está configurada (account muy nuevo), mostrar empty state: "Tu stack de herramientas está en configuración. Pronto tendrás acceso directo desde aquí."

**Columna derecha — AI activa en tu cuenta:**
- Título: **AI en tu cuenta**
- Lista de herramientas/modelos de AI que están habilitados para este space, cada uno con: ícono, nombre, y una línea de contexto de qué hace (no técnica, orientada al beneficio).
- Ejemplos de items:
  - **ChatGPT** — Asistencia estratégica y de contenido
  - **Adobe Firefly** — Generación y composición visual
  - **Midjourney** — Concepto visual e ideación
  - **Sora** — Generación de video
- **Regla crítica:** Misma lógica que herramientas — solo mostrar lo que está activo y configurado. Sin "Refinar por módulo", sin estados pendientes.
- Si no hay herramientas AI configuradas, mostrar empty state: "Las herramientas AI de tu cuenta se activarán con tu primer proyecto creativo."
- **Nota para el admin:** La configuración de qué herramientas y qué AI aparecen se gestiona desde la vista admin del tenant (capabilities governance). El dashboard cliente solo lee y muestra.

**PLG en esta sección:** Al final de cada columna (herramientas y AI), agregar un ghost slot similar al del equipo pero más sutil — un link de texto en gris: "¿Necesitas una herramienta adicional? Solicitar" / "¿Necesitas otra capacidad AI? Solicitar" — que abra el mismo modal de solicitud del ghost slot de equipo.

**Referencia Vuexy full-version:** Buscar patrones de "card with list items and icons" en `src/views/dashboards/` o `src/views/pages/widget-examples/`. También se puede usar el componente `List` de MUI con `ListItem`, `ListItemIcon`, `ListItemText` y `ListItemSecondaryAction` (para el link).

**Sección: Salud del portafolio**
- Proyectos saludables / bajo observación / comentarios abiertos.
- Mantener como está pero hacerlo colapsable (accordion). Abierto por defecto solo si hay alertas (comentarios abiertos > 0 o proyectos bajo observación > 0).

**Sección: Cuentas y proyectos bajo atención**
- La tabla de proyectos con badges de estado (Integración, Entregado, Milestone, PO).
- Mantener pero hacerla más compacta — solo mostrar proyectos con alertas activas. Si todos están sanos, mostrar: "Todos los proyectos operan normalmente."

---

## Secciones a REDISEÑAR o ELIMINAR del dashboard cliente

Las siguientes secciones se rediseñan (mueven a nuevas secciones) o se eliminan por duplicidad o falta de data:

| Sección actual | Acción | Destino |
|---------------|--------|---------|
| **Lectura de capacity interna** (badge "Healthy", horas comprometidas, personas asignadas) | **Rediseñar → "Tu equipo"** | La data de personas y FTE se mueve a la sección "Tu equipo y capacidad contratada" (Zona 3). El badge "Healthy" y el desglose interno se eliminan de la vista cliente — solo visibles en admin. |
| **Herramientas tecnológicas** (Figma, Frame.io, Notion con "Definir por módulo") | **Rediseñar → "Tu ecosistema"** | Se mueven a la nueva sección "Tu ecosistema > Tu stack". Solo herramientas configuradas con links directos. Sin botones "Definir por módulo". |
| **Herramientas AI** (ChatGPT, Adobe Firefly con "Refinar por módulo") | **Rediseñar → "Tu ecosistema"** | Se mueven a "Tu ecosistema > AI en tu cuenta". Solo herramientas activas con descripción de beneficio. Sin "Refinar por módulo". |
| **Mix del flujo creativo** (gráfico Corriente vs Emergente) | **Eliminar (temporal)** | Reintroducir cuando haya data real de al menos 1 mes. No mostrar charts vacíos. |
| **Carga creativa por esfuerzos** (donut con "Estimados: 1") | **Eliminar (temporal)** | Misma regla: reintroducir con data real. |
| **Entrega mensual visible** (50%, entregas, ajustes) | **Eliminar (consolidar)** | Consolidar en la KPI card de OTD% y el chart de Cadencia de entregas. |
| **Calidad mensual** (RpA 0.8 + First Time Flight 100%) | **Eliminar (consolidar)** | Consolidar en la KPI card de RpA y el chart de RpA por proyecto. |
| **Lectura de calidad** (texto descriptivo del RpA) | **Eliminar (consolidar)** | Tooltip en la KPI card de RpA. |
| **Entregables y ajustes** (chart con checkboxes) | **Eliminar (consolidar)** | Consolidar en el chart de RpA por proyecto. |

**Resumen: el dashboard cliente pasa de ~15 secciones a ~10 elementos** (1 hero + 4 KPIs + 4 charts + equipo/capacidad + ecosistema + 2 secciones colapsables de detalle). Cada sección tiene un propósito claro y data real.

---

## Correcciones de UX obligatorias

### 1. Empty states en todo
Si una métrica es 0 o no hay data, NUNCA mostrar:
- Charts con ejes vacíos
- Porcentajes en 0% con semáforo rojo (parece error)
- Secciones con textos como "Todavía no hay suficiente..."

En cambio, mostrar un empty state diseñado: ícono relevante + mensaje corto + acción si aplica. Ejemplo: "Aún no hay entregas este mes. Las métricas se actualizarán con la primera pieza completada."

### 2. Consistencia de colores por estado
Definir y usar consistentemente:
- **En curso:** `#2196F3` (azul)
- **Listo para revisión:** `#FF9800` (naranja)
- **Cambios solicitados:** `#F44336` (rojo)
- **Listo/Completado:** `#4CAF50` (verde)

Estos colores deben ser los mismos en KPI badges, donut chart, tablas y cualquier indicador de estado.

### 3. Responsive
El dashboard debe funcionar bien en:
- **Desktop 1440px+:** 4 KPIs en fila, 2 charts por fila.
- **Tablet 1024px:** 2 KPIs por fila, 1 chart por fila.
- **Mobile 768px:** 1 KPI por fila, 1 chart full width.

### 4. Loading states
Cada sección debe tener skeleton loader al cargar data. Usar el componente `Skeleton` de MUI.

### 5. Header del dashboard
Simplificar los botones de navegación:
- "Volver al space" y "Ir a spaces" son botones admin — solo mostrarlos si el usuario tiene rol admin. Un cliente real no necesita estas opciones.
- El nombre del cliente ("Sky Airline") es contexto útil — mantener visible.
- **El CRM ID (ej: "EO-306252Z1456") NO debe ser visible para el cliente.** Es un identificador interno. Solo mostrar si rol = admin.
- **Timestamp de última actualización de datos:** Agregar un texto discreto en el header o al pie de la zona de KPIs: "Datos actualizados: [fecha y hora]". Esto da confianza al cliente de que lo que ve es reciente. Usar la fecha del último `_synced_at` de BigQuery. Formato: "Datos actualizados: hoy a las 3:00 a.m." o "Datos actualizados: 12 mar 2026, 3:00 a.m."

---

## UX Writing — Guía de textos del dashboard

El dashboard es un touchpoint de marca. Cada texto, label, tooltip y empty state debe sonar como Efeonce: directo, claro, sin rodeos. Referencia: Brand Voice v1.0 (tono "mensaje a cliente": 2-4 oraciones, dato primero, interpretación después).

### Regla de idioma

**Los términos técnicos ICO se mantienen en inglés.** No traducirlos. El cliente ya los conoce (o los va a conocer) como parte del vocabulario Greenhouse. Traducirlos genera confusión y pierde consistencia con los docs de ICO y las Feedback Reviews.

| Término | Forma correcta en UI | NUNCA escribir |
|---------|---------------------|----------------|
| RpA (Rounds per Asset) | **RpA** | "Rondas por activo", "Revisiones por pieza" |
| OTD% (On-Time Delivery) | **OTD%** | "Porcentaje de entrega a tiempo", "Puntualidad" |
| Cycle Time | **Cycle Time** | "Tiempo de ciclo" |
| First Time Right | **First Time Right** | "Aprobado a la primera" |
| Throughput | **Throughput** | "Rendimiento", "Producción" |
| Brief Clarity Score | **Brief Clarity Score** | "Puntaje de claridad del brief" |
| Revenue Enabled | **Revenue Enabled** | "Ingresos habilitados" |
| FTE | **FTE** | "Equivalente a tiempo completo" |

**Excepción:** los subtítulos explicativos debajo de cada KPI sí van en español neutro — son la capa de contexto para que el término técnico se entienda sin googlear.

### Tratamiento y registro

- **Tú** como tratamiento default. Nunca "usted", nunca "vos".
- Español neutro latinoamericano. Sin regionalismos de ningún país (ni chilenismos, ni colombianismos, ni mexicanismos).
- Tono: informativo-directo. El dashboard informa, no vende. Sin exclamaciones, sin emojis, sin lenguaje motivacional.
- Frases cortas. Si un label necesita más de 6 palabras, reescribir.

### Textos exactos para KPI Cards

| KPI | Título del card | Subtítulo explicativo | Tooltip (hover) |
|-----|----------------|-----------------------|-----------------|
| RpA | **RpA** | Promedio de rondas de revisión por pieza | Rounds per Asset: cuántas veces una pieza pasa por revisión antes de ser aprobada. Meta ICO: ≤2 rondas. |
| Piezas entregadas | **Piezas entregadas** | Últimos 30 días | Total de piezas que pasaron a estado "Listo" en los últimos 30 días. |
| OTD% | **OTD%** | Entregas dentro de plazo | On-Time Delivery: porcentaje de piezas entregadas dentro del plazo definido en el brief. Meta: ≥90%. |
| Revisión activa | **En revisión** | Piezas esperando tu feedback | Piezas en estado "Listo para revisión" o con comentarios abiertos en Frame.io. |

### Textos exactos para Charts

| Chart | Título | Subtítulo |
|-------|--------|-----------|
| Donut de estados | **Distribución por estado** | Tareas activas de tu cuenta |
| Cadencia de entregas | **Cadencia de entregas** | Piezas completadas por semana — últimos 3 meses |
| RpA por proyecto | **RpA por proyecto** | Línea de referencia: 2.0 (máximo ICO) |
| OTD% mensual | **OTD% mensual** | Tendencia de los últimos 6 meses — meta: 90% |

### Textos exactos para Empty States

Los empty states no son errores. Son momentos de onboarding. El tono es calmado e informativo — nunca alarmista, nunca apologético.

| Situación | Texto principal | Texto secundario |
|-----------|----------------|-----------------|
| KPI en 0 (sin actividad) | **Sin actividad este mes** | Las métricas se actualizan con cada pieza completada. |
| Chart sin data suficiente | **Aún no hay suficiente actividad** | Este gráfico necesita al menos 2 semanas de datos para ser útil. |
| Tabla de proyectos vacía | **Sin proyectos activos** | Cuando tu cuenta tenga proyectos asignados, aparecerán aquí. |
| Equipo sin personas asignadas | **Tu equipo está en configuración** | Pronto verás aquí a las personas asignadas a tu cuenta. |
| Contactos CRM no cargados | **Contactos en sincronización** | Estamos conectando tus contactos desde HubSpot. Esto puede tomar unos minutos. |
| Error de carga (cualquier sección) | **No pudimos cargar esta sección** | Intenta de nuevo en unos segundos. Si el problema persiste, tu account manager ya fue notificado. *(Botón: "Reintentar")* |

**Regla:** NUNCA mostrar textos técnicos al cliente. Nada de "The operation was aborted", "Error 500", "TypeError", "undefined", "null", ni IDs internos. Todo error pasa por un error boundary que traduce a lenguaje humano.

### Textos para sección de equipo y PLG

| Elemento | Texto |
|----------|-------|
| Título de sección | **Tu equipo** |
| Subtítulo | Las personas asignadas a tu cuenta |
| Ghost slot — línea principal | **Ampliar equipo** |
| Ghost slot — línea secundaria | Agrega capacidad creativa, de medios o tecnología. |
| Modal de solicitud — título | **¿Qué necesitas?** |
| Modal de solicitud — placeholder del textarea | Describe el perfil o la capacidad que buscas. Tu account manager te contactará. |
| Modal de solicitud — botón | **Enviar solicitud** |
| Modal de solicitud — confirmación | **Solicitud enviada.** Tu account manager te contactará en las próximas 24 horas. |
| Nudge de capacidad (>85%) | **Tu equipo está cerca de su capacidad máxima.** ¿Necesitas más horas? *(Link: "Solicitar")* |

### Textos para sección Tu ecosistema

| Elemento | Texto |
|----------|-------|
| Título de la columna izquierda | **Tu stack** |
| Subtítulo columna izquierda | Herramientas activas en tu cuenta |
| Empty state (ninguna herramienta configurada) | **Tu stack está en configuración.** Pronto tendrás acceso directo a tus herramientas desde aquí. |
| Link PLG al final de la lista | ¿Necesitas una herramienta adicional? *(Link: "Solicitar")* |
| Título de la columna derecha | **AI en tu cuenta** |
| Subtítulo columna derecha | Inteligencia artificial activa en tu operación |
| Empty state (ninguna AI configurada) | **Las herramientas AI se activarán con tu primer proyecto creativo.** |
| Link PLG al final de la lista | ¿Necesitas otra capacidad AI? *(Link: "Solicitar")* |

### Textos para capacidad en FTE

| Elemento | Texto |
|----------|-------|
| Título | **Capacidad contratada** |
| Formato del indicador | **X.X FTE** de Y.Y FTE contratados |
| Texto secundario | X horas de Y horas mensuales utilizadas |
| Tooltip | 1 FTE = 160 horas mensuales de dedicación. |

### Textos para secciones colapsables

| Sección | Título | Estado cerrado (preview) |
|---------|--------|-------------------------|
| Salud del portafolio | **Salud del portafolio** | "X proyectos saludables, Y bajo observación" |
| Proyectos bajo atención | **Proyectos bajo atención** | "X proyectos con alertas activas" o "Todos los proyectos operan normalmente." |

### Textos del header/hero

| Elemento | Texto actual | Texto corregido |
|----------|-------------|-----------------|
| Título del hero | "Throughput, revisión y salud creativa en una lectura." | **Throughput, revisión y salud creativa.** (eliminar "en una lectura" — es redundante, el dashboard ya es la lectura) |
| Subtítulo | Varios textos mezclados | **Última actividad: [fecha relativa].** X proyectos activos. |
| Botón admin "Volver al space" | "Volver al space" | **Volver al space** (solo visible si rol = admin) |
| Botón admin "Ir a spaces" | "Ir a spaces" | **Ir a spaces** (solo visible si rol = admin) |
| Sección actual "CREATIVE DELIVERY" | "CREATIVE DELIVERY — Revisión y salida de piezas" | Eliminar como sección separada — consolidar en KPIs y charts. |

### Anti-patrones de UX Writing (lo que Codex NO debe hacer)

- **No mezclar idiomas dentro de una frase.** "Piezas entregadas on time" — incorrecto. O "Piezas entregadas a tiempo" o "OTD%". Nunca spanglish.
- **No traducir acrónimos entre paréntesis cada vez.** "OTD% (On-Time Delivery)" se explica una vez en el tooltip. En el UI siempre es solo "OTD%".
- **No usar lenguaje de desarrollador.** "Todavía no hay suficiente data para renderizar" — incorrecto. "Aún no hay suficiente actividad" — correcto.
- **No usar diminutivos ni lenguaje casual excesivo.** "Tu equipito" o "¡Genial!" — no. Efeonce es profesional-directo.
- **No inventar labels.** "Salud OK" / "Pasture Rojo" / "Healthy" — estos son labels internos. El cliente ve "Saludable" / "Bajo observación" / "Requiere atención".
- **No usar "Definir por módulo" ni "Refinar por módulo"** en vista cliente — son estados de configuración interna, no información para el cliente.
- **No duplicar explicaciones.** Si el KPI card ya tiene tooltip, no agregar una sección "Lectura de calidad" que explique lo mismo en prosa.

---

## Formato de fechas y números

Efeonce opera en LATAM. El dashboard debe usar formato consistente:

- **Fechas:** "12 mar 2026" (día + mes abreviado + año). Nunca MM/DD/YYYY (formato USA). Nunca DD/MM/YYYY con barras (ambiguo entre países). Para fechas relativas: "hoy", "ayer", "hace 3 días", "hace 2 semanas". Usar relativas cuando la fecha es dentro de los últimos 7 días; absolutas cuando es más antigua.
- **Números:** separador de miles con punto, decimal con coma. Ejemplo: 1.250 horas, 3,5 FTE, $42.000. Consistente con el Editorial Style Guide.
- **Porcentajes:** siempre con símbolo: 90%, 127%. Nunca "noventa por ciento".
- **Horas:** formato 12h con a.m./p.m. para vista cliente (más amigable). Ejemplo: "3:00 a.m.", no "03:00".

---

## Transiciones y animaciones

- **KPI cards:** fade-in secuencial al cargar (left to right, 100ms de delay entre cada una). No bounce, no slide — fade-in sutil.
- **Charts:** los charts de ApexCharts ya tienen animaciones built-in. Mantener las por defecto, no agregar custom.
- **Accordions:** transición de altura estándar de MUI (200ms ease). No agregar custom.
- **Skeleton → contenido real:** crossfade sutil (opacity transition 200ms). Nunca un salto brusco de skeleton a contenido.
- **Ghost slot hover:** al pasar el mouse, el borde punteado pasa de gris claro a gris medio, y el ícono "+" se anima sutilmente (scale 1.0 → 1.1, 150ms). Nada más.
- **Regla general:** menos es más. Si dudas, no animes. El dashboard es una herramienta de trabajo, no una landing page.

---

## Error Boundaries — Especificación técnica

Cada zona del dashboard debe tener su propio error boundary React. Si una sección falla, las demás siguen funcionando.

| Zona | Error boundary independiente | Comportamiento en error |
|------|------------------------------|------------------------|
| Hero + KPIs | Sí | Si falla la carga de KPIs, mostrar el hero sin contadores + empty state en la fila de KPIs. No tirar toda la página. |
| Charts (cada chart individual) | Sí, uno por chart | Si falla un chart, mostrar empty state solo en ese card. Los otros 3 charts siguen visibles. |
| Equipo y capacidad | Sí | Si falla, mostrar empty state. No afecta KPIs ni charts. |
| Salud del portafolio | Sí | Si falla, accordion cerrado con texto "No disponible temporalmente". |
| Proyectos bajo atención | Sí | Mismo patrón. |

**Implementación:** usar un componente wrapper `<SectionErrorBoundary>` reutilizable que recibe `sectionName` como prop y renderiza el empty state de error correspondiente (ver tabla de textos de empty states). Este componente debe loggear el error a console en dev y silenciarlo en producción. En futuro, conectar a un servicio de error tracking (Sentry o similar).

---

## Accesibilidad mínima

- **Contraste de colores:** todos los textos deben cumplir ratio mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande). Verificar especialmente los subtítulos en gris claro — si `text.secondary` no cumple sobre fondo blanco, subir un nivel.
- **Semáforos de KPI:** no depender solo del color para comunicar estado. Cada semáforo debe tener también un ícono o label textual: verde = "Saludable" + ícono check, amarillo = "Bajo observación" + ícono warning, rojo = "Requiere atención" + ícono alert.
- **Tooltips:** accesibles por teclado (focus, no solo hover). Usar el `Tooltip` de MUI que ya maneja esto.
- **Charts:** agregar `aria-label` descriptivo a cada chart container. Ejemplo: `aria-label="Gráfico de distribución de tareas por estado"`.
- **Ghost slot:** debe ser focusable por teclado (role="button", tabIndex=0) y tener aria-label="Ampliar equipo".

---

## Footer del dashboard

Agregar un footer mínimo al final del dashboard (después de las secciones colapsables):

```
© 2026 Efeonce Group. Greenhouse keeps project delivery visible, measurable, and accountable.
```

- Texto en gris claro (`text.disabled`), centrado, con padding top generoso para separar del contenido.
- Links discretos a la derecha: "Dashboard" | "Proyectos" | "Sprints" | "Settings" — navegación rápida al footer para el cliente que scrolleó hasta abajo.
- Este footer ya parece existir en la vista actual — mantener el patrón pero asegurar que el copy sea exactamente este y que los links funcionen.

---

## Componentes Vuexy full-version a reutilizar

| Necesidad | Path en full-version |
|-----------|---------------------|
| KPI stat cards con trend | `src/views/pages/widget-examples/statistics/` |
| Donut chart card | `src/views/dashboards/crm/` o `ecommerce/` |
| Line chart card | `src/views/dashboards/analytics/` |
| Bar chart horizontal | `src/views/dashboards/` (buscar revenue/performance charts) |
| Accordion/collapsible sections | Usar `Accordion` de MUI directamente |
| Skeleton loaders | `@mui/material/Skeleton` |
| Empty state pattern | Crear uno reutilizable: `Box` + ícono Tabler + `Typography` |
| Team members list | `src/views/dashboards/` o `src/views/pages/user-profile/` (buscar team/members cards) |
| Tooltip component | `@mui/material/Tooltip` (ya incluido) |
| Dialog/Modal | `@mui/material/Dialog` (para modal del ghost slot) |
| LinearProgress (FTE gauge) | `@mui/material/LinearProgress` con label custom |
| Error boundary wrapper | Crear componente custom `SectionErrorBoundary` (React class component con `componentDidCatch`) |

---

## Lo que NO debe cambiar

- La data source y los API endpoints. El refactor es puramente de presentación y layout.
- La lógica de "Ver como cliente" desde admin. Mantener los botones de navegación admin pero condicionarlos al rol.
- El banner/hero gradiente como concepto — es identitario de Greenhouse. Solo simplificar su contenido.

**Nota sobre secciones eliminadas:** Las secciones que se eliminan del dashboard cliente (Capacity interna, Herramientas, Mix creativo, etc.) NO se borran del codebase. Se extraen a componentes independientes y se reubicarán en la vista admin del tenant (ver `CODEX_TASK_Tenant_Detail_View_Redesign.md`). El trabajo de Codex es ya construirlo con este enfoque: que los componentes existan como módulos importables, no hardcoded en el dashboard cliente.

---

## Orden de ejecución sugerido

1. Crear el componente reutilizable `SectionErrorBoundary` y el componente reutilizable `EmptyState`.
2. Eliminar las secciones que no corresponden al dashboard cliente (Herramientas, Lectura capacity interna, Mix flujo creativo, Carga esfuerzos, etc.). Moverlas a un componente separado si se quieren reusar en la vista admin.
3. Reestructurar el layout en 3 zonas (Hero+KPIs, Charts, Detalle).
4. Implementar las 4 KPI cards con stat cards de Vuexy + tooltips + semáforos accesibles.
5. Implementar los 4 charts con ApexCharts + aria-labels.
6. Implementar la sección "Tu equipo" con ghost slot y modal de solicitud.
7. Implementar la zona de capacidad en FTE (condicional a horas configuradas).
8. Implementar la sección "Tu ecosistema" (Tu stack + AI en tu cuenta) con lógica de visibilidad condicional y links PLG.
9. Implementar secciones colapsables (Salud del portafolio, Proyectos bajo atención).
9. Implementar empty states con textos exactos de la guía de UX Writing.
10. Implementar skeleton loaders con crossfade transition.
11. Implementar error boundaries por zona.
12. Condicionar botones admin y CRM ID al rol del usuario.
13. Agregar timestamp de última actualización de datos.
14. Verificar formato de fechas (12 mar 2026) y números (punto miles, coma decimal) en toda la UI.
15. Verificar accesibilidad: contraste, semáforos con ícono+label, tooltips por teclado, aria-labels en charts.
16. Testing responsive en 3 breakpoints (1440px, 1024px, 768px).
17. Revisión final de UX writing: cero términos ICO traducidos, cero labels internos, cero errores técnicos visibles.

---

## Criterio de aceptación

**Estructura y layout:**
- [ ] Dashboard tiene máximo 3 zonas visuales: Hero+KPIs, Charts, Detalle (equipo + salud + proyectos).
- [ ] 4 KPI cards en fila usando stat cards de Vuexy full-version (RpA, Piezas, OTD%, En revisión).
- [ ] 4 charts funcionales (Donut estado, Cadencia entregas, RpA por proyecto, OTD% mensual).
- [ ] Sección "Tu equipo" visible: equipo con nombre+rol (sin allocation%), capacidad en FTE con gauge/progress bar. Zona de FTE solo visible si el space tiene horas configuradas.
- [ ] Ghost slot de expansión al final de la lista de equipo: círculo punteado + "+" + texto secundario. Solo visible si hay al menos 1 persona asignada. Click abre modal de solicitud.
- [ ] Nudge de capacidad solo visible si utilización >85% por 2+ meses consecutivos.
- [ ] Secciones colapsables: Salud del portafolio (abierto si hay alertas), Proyectos bajo atención.
- [ ] Sección "Tu ecosistema" con 2 columnas (Tu stack + AI en tu cuenta). Solo muestra herramientas y AI configuradas — cero botones "Definir por módulo" o "Refinar por módulo". Empty states amigables si nada está configurado.
- [ ] Links PLG sutiles al final de cada columna de Tu ecosistema (solicitar herramienta / solicitar AI).
- [ ] Secciones eliminadas de vista cliente: Lectura de capacity interna (badge Healthy), Mix del flujo creativo, Carga creativa por esfuerzos, Entrega mensual visible, Calidad mensual, Lectura de calidad, Entregables y ajustes.

**UX Writing e idioma:**
- [ ] Términos ICO en inglés en toda la UI (RpA, OTD%, Cycle Time, FTE). Nunca traducidos.
- [ ] Tooltips explicativos en español neutro en cada KPI card.
- [ ] Textos de empty states exactos según la guía de UX Writing del documento.
- [ ] Cero instancias de "Definir por módulo", "Refinar por módulo", "Healthy", "Unhealthy", error traces, IDs internos o labels de desarrollo en vista cliente.
- [ ] Tratamiento "tú" consistente en toda la UI. Cero "usted", cero "vos".
- [ ] Cero spanglish: no mezclar idiomas dentro de una misma frase.

**Datos y formato:**
- [ ] Fechas en formato "12 mar 2026". Relativas si < 7 días ("hoy", "ayer", "hace 3 días").
- [ ] Números con punto como separador de miles y coma como decimal (1.250 horas, 3,5 FTE).
- [ ] Timestamp de última actualización de datos visible en el dashboard.
- [ ] CRM ID y Space ID ocultos en vista cliente (solo visibles si rol = admin).

**Calidad técnica:**
- [ ] Error boundaries independientes por zona (Hero+KPIs, cada chart individual, equipo, salud, proyectos). Si una sección falla, las demás siguen funcionando.
- [ ] Empty states diseñados para métricas en 0, charts sin data suficiente y errores de carga.
- [ ] Skeleton loaders en cada sección al cargar, con crossfade transition al contenido real.
- [ ] Colores de estado consistentes en todo el dashboard (azul en curso, naranja revisión, rojo cambios, verde listo).
- [ ] Responsive funcional en desktop (1440px+), tablet (1024px) y mobile (768px).

**Accesibilidad:**
- [ ] Semáforos de KPI no dependen solo del color — incluyen ícono y/o label textual.
- [ ] Contraste WCAG AA en todos los textos (4.5:1 normal, 3:1 grande).
- [ ] Charts con `aria-label` descriptivo.
- [ ] Ghost slot focusable por teclado con `aria-label`.
- [ ] Tooltips accesibles por teclado (focus, no solo hover).

**Integridad:**
- [ ] Toda la funcionalidad existente (carga de data, refresh, navegación) operativa post-refactor.
- [ ] Botones "Volver al space" / "Ir a spaces" solo visibles para rol admin.
- [ ] Footer con copy correcto y links de navegación funcionales.
