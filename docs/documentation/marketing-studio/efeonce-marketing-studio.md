# Efeonce Marketing Studio — Gestión de campañas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Ultima actualizacion:** 2026-09-25 por Claude (TASK-1890 / TASK-1891)
> **Documentacion tecnica:** [Arquitectura de Marketing Studio](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) · [ADR API-first](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) · [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)

## Qué es

Marketing Studio (`studio.efeonce.org`) es el lugar donde vive cada campaña de Efeonce: su brief y decisiones,
sus conceptos, las piezas (imágenes y videos) con sus versiones, los copys de cada canal, los anuncios
configurados, el plan de medios, el calendario y las decisiones que están pendientes. Reemplaza al Campaign
Manager en HTML que vivía en OneDrive y agrega lo que ese archivo no podía dar: una base de datos, acceso desde
cualquier lugar y una API.

Es un producto distinto de Greenhouse y también de Globe (Efeonce Creative Studio). Globe produce piezas;
Marketing Studio organiza la campaña que las usa.

## Qué muestra

La barra lateral tiene cinco secciones: **Hoy**, **Campañas**, **Calendario**, **Piezas** y **Medios**.

| Pantalla | Para qué sirve |
|---|---|
| **Hoy** | Las decisiones que frenan la pauta: presupuesto que espera aprobación, posts con fecha pasada que siguen «pendientes», pauta bloqueada y campañas que todavía no tienen piezas. Cada decisión trae un botón que lleva a la pantalla donde se resuelve. Abajo, lo que viene (próximas publicaciones) y el inventario. |
| **Campañas** | Todas las campañas con su portada real y los tres estados. Se pueden filtrar: todas, esperan autorización, en producción o bloqueadas. |
| **Espacio de una campaña** | Se abre desde Campañas. Arriba muestra los tres estados y el botón **Brief y decisiones**. Tiene cinco pestañas: **Piezas**, **Copys**, **Anuncios**, **Medios** y **Calendario**. |
| **Calendario** | Vuelos de pauta y publicaciones orgánicas de todas las campañas, mes a mes. Las campañas sin fecha aparecen aparte con el motivo (pauta bloqueada o sin calendario aprobado). |
| **Piezas** | Todas las piezas de todas las campañas en un solo lugar. |
| **Medios** | El plan de medios de las campañas que tienen un vuelo registrado: propuesto, aprobado y gasto real, siempre por separado, más lo que falta para activar. |
| **Búsqueda (⌘K)** | Encuentra campañas, piezas y frases de copy. También funciona con Ctrl+K. |

Arriba a la derecha hay un botón de sol/luna para cambiar entre modo claro y oscuro; la preferencia se recuerda.
Mientras el acceso sea abierto, junto a ese botón aparece la etiqueta **Solo lectura**.

> Detalle técnico: pantallas y tema en la sección 8 de la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).

### La pestaña Piezas y la vista previa por formato

Las piezas se ordenan por concepto y formato (1:1, 4:5, 9:16, 16:9). Un hueco significa que ese formato no se
produjo para ese concepto; no es un error.

Al hacer clic en una pieza, a la derecha aparece cómo se vería publicada, con su copy real:

- una pieza **vertical 9:16** se muestra como una **story**, a pantalla completa, con el texto encima;
- una pieza **1:1, 4:5 o 16:9** se muestra dentro de una **tarjeta de feed**, con su proporción real (no se recorta).

Arriba de esa vista se elige el canal (**LinkedIn** o **Meta**) y la variante (**Copy A** o **Copy B**). Si no
hay copy para esa combinación, Studio lo dice. Debajo aparecen los datos de la pieza (tamaño, peso, versión),
los anuncios configurados con ella, la **URL con UTM** con botón para copiarla y **Antes de lanzar**: los
chequeos que todavía faltan para esa pieza.

## Reglas que la plataforma respeta

- **Tres estados, nunca un «aprobado» genérico.** Cada campaña tiene tres estados independientes:
  **creatividad**, **autorización de medios** y **lanzamiento**. Una campaña puede tener la creatividad aprobada
  y la pauta bloqueada al mismo tiempo, y Studio lo muestra así.
- **Los presupuestos nunca se suman.** Propuesto, aprobado y gasto real se muestran por separado. Un presupuesto
  propuesto no es una autorización ni un gasto; si no hay datos de gasto, dice «Sin datos de gasto», no «cero».
- **Programado no es publicado.** Un post cuya fecha ya pasó y sigue «pendiente» queda en **Requieren
  verificación** para confirmarlo en Metricool; Studio no asume que salió.
- **El copy es literal.** Se muestra exactamente como se aprobó, con sus menciones, emojis y saltos de línea.
- **Lo que falta, se dice.** Un dato sin fuente aparece como «Sin dato en la fuente», no como cero.

### Los tres estados

| Estado | Valores que puede mostrar |
|---|---|
| Creatividad | Sin información · En producción · Piezas finales · Aprobada |
| Autorización de medios | Sin información · Pendiente · Autorizada · Bloqueada · No aplica (campaña sin pauta pagada) |
| Lanzamiento | Sin lanzar · Sin verificar · Activa · Pausada · Finalizada · Programado |

«Sin verificar» significa que alguien dijo que salió, pero la plataforma no lo confirma. «Activa» sólo aparece
cuando la plataforma lo muestra funcionando. «Programado» se ve en campañas orgánicas que tienen posts
agendados.

## Imágenes

Las imágenes que ves son versiones livianas (miniatura y vista previa) generadas a partir de los originales,
que siguen en OneDrive. Cargan rápido aunque la pantalla muestre muchas a la vez.

Si una imagen no carga, Studio la reintenta una vez y, si vuelve a fallar, muestra **«Vista previa no
disponible»** en el mismo espacio. Nunca inventa una imagen. Lo más común es que esa pieza todavía no tenga su
versión liviana generada; el [manual](../../manual-de-uso/marketing-studio/operar-marketing-studio.md#problemas-comunes)
explica qué hacer.

> Detalle técnico: renditions y enlaces firmados en la sección 7.1 de la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) y en el [runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md#imágenes-renditions).

## Acceso

Hoy Studio se puede ver sin iniciar sesión y es sólo de lectura: nadie puede cambiar datos desde la web. Los
buscadores no lo indexan. El inicio de sesión con la cuenta Efeonce (`auth.efeonce.org`) llega al final del
programa, por decisión del equipo, cuando ya existan la edición y las aprobaciones.

## Acceso para integraciones y agentes

Todo lo que se puede ver en la web también se puede leer por la **API** de Studio. Es una regla del producto:
cada capacidad nueva nace también en la API y para agentes, incluidas, cuando lleguen, la edición y las
aprobaciones.

- **Integraciones.** Cada integración usa su propio **token de servicio**, con las organizaciones que tiene
  permitidas. Sólo ve esas campañas; si pide otra, la respuesta es «no encontrado», sin revelar si existe. Un
  token mal copiado o revocado recibe un rechazo aunque la web esté abierta. Los tokens se crean y revocan por
  consola y quedan auditados.
- **Agentes de IA.** Los agentes leerán Studio por Efeonce MCP (`mcp.efeonce.org`) con **12 herramientas de
  lectura**: decisiones pendientes, lista de campañas, detalle de campaña, piezas, detalle de una pieza, ver una
  pieza (la imagen), copys, anuncios, plan de medios, publicaciones, calendario y búsqueda. Cada herramienta
  explica qué significa cada dato y qué no (por ejemplo, que un presupuesto propuesto no es gasto), y un manual
  para agentes les enseña a leer los tres estados sin confundirlos.

¿Quién puede usar las herramientas de agente? Sólo personas con el permiso de lectura de Studio, que hoy tienen
los roles de **administración**, **cuentas** y **operaciones** de Efeonce. El agente actúa en nombre de esa
persona: si la persona no tiene el permiso, el agente tampoco puede leer.

**Estado actual:** las herramientas ya están construidas y desplegadas, pero **apagadas**. Se encienden después de
la próxima publicación de Greenhouse a producción y de una prueba con una persona real. Hasta entonces, un agente
no ve Studio por MCP.

**Qué no pueden hacer los agentes todavía:** crear, editar ni aprobar nada. Cuando llegue la escritura, una
aprobación seguirá siendo una **decisión de una persona**: el agente podrá prepararla y ejecutarla sólo en
nombre de alguien que tenga el permiso de aprobar, y queda registrada con esa persona como responsable.

> Detalle técnico: API y manifiesto de herramientas en la sección 4.1 de la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md); proveedor del gateway en el [runbook de Efeonce MCP](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md#provider-marketing-studio-efeonce-marketing-studio).

## De dónde salen los datos

Hoy los datos se importan desde el Campaign Manager de OneDrive y del registro de campañas. Mientras no exista
la edición en Studio, OneDrive sigue siendo la fuente y Studio se actualiza reimportando. Reimportar no duplica
nada: si nada cambió, no se agrega ninguna fila.

> Detalle técnico: import y renditions en las secciones 7 y 7.1 de la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).

## Qué viene

El programa (EPIC-049) avanza en este orden, sin fechas comprometidas:

1. **Agentes por MCP encendidos** — lectura de campañas desde un asistente, con el permiso de cada persona.
2. **Originales en la nube y avisos** — los archivos originales dejan de depender de OneDrive, y el equipo recibe
   alertas en Teams si algo falla.
3. **Métricas** — resultados de pauta y publicaciones traídos desde Greenhouse.
4. **Edición y brief como parte de Studio** — cambiar datos, subir piezas y registrar el brief dentro de Studio;
   desde ahí Studio deja de depender de OneDrive como fuente.
5. **Pantallas de edición, revisión y métricas**, y **escritura y aprobaciones por agentes**, siempre con una
   persona responsable.
6. **Inicio de sesión con la cuenta Efeonce**, al final.

> Detalle técnico: [EPIC-049](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md).
