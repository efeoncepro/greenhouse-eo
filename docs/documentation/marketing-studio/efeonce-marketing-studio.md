# Efeonce Marketing Studio — Gestión de campañas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.4
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Ultima actualizacion:** 2026-10-04 (ownership del flujo editorial SEO/AEO; sin implementación)
> **Documentacion tecnica:** [Arquitectura de Marketing Studio](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) · [ADR API-first](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) · [Runtime handoff](../../operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md)

## Qué es

Marketing Studio (`studio.efeonce.org`) es el lugar donde vive cada campaña de Efeonce: su brief y decisiones,
sus conceptos, las piezas (imágenes y videos) con sus versiones, los copys de cada canal, los anuncios
configurados, el plan de medios, el calendario y las decisiones que están pendientes. Reemplaza al Campaign
Manager en HTML que vivía en OneDrive y agrega lo que ese archivo no podía dar: una base de datos, acceso desde
cualquier lugar y una API.

Es un producto distinto de Greenhouse y también de Globe (Efeonce Creative Studio). Globe produce piezas;
Marketing Studio organiza la campaña que las usa.


## Flujo editorial SEO/AEO — alcance acordado, pendiente

El flujo editorial se construirá en Marketing Studio: plan, brief, responsables, producción, revisión,
calendario e iteraciones. Greenhouse / Search Visibility 360 conserva oportunidades, prioridad y medición;
Efeonce Insights conserva los informes y su distribución.

[TASK-1667](../../tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md) especializa
el trabajo y handoff al CMS sobre las tareas de Studio; [TASK-1669](../../tasks/to-do/TASK-1669-growth-seo-agentic-daily-plan.md)
especializa el plan SEO/AEO con agentes. Ambas están en diseño: los briefs/copys/calendario existentes no
completan este circuito. Publicación observada, indexación y resultado medido se mostrarán como hechos distintos.
No hay una segunda cola editorial en Greenhouse ni un segundo motor de informes en Studio.

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

Hoy Studio se puede ver sin iniciar sesión y la web es sólo de lectura: nadie puede cambiar datos desde ella. Cada
campaña lo explica en sus permisos: mientras el acceso sea abierto, el motivo es «acceso abierto». Los buscadores no
lo indexan. El inicio de sesión con la cuenta Efeonce (`auth.efeonce.org`) llega al final del
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

**Qué no pueden hacer los agentes todavía:** crear, editar ni aprobar nada. Desde el 2026-10-02 las operaciones de
escritura ya existen en la API de Studio y viajan en su lista de herramientas, pero Efeonce MCP no las ofrece a los
agentes hasta que exista la puerta de escritura con la persona como responsable (TASK-1899). Cuando llegue la escritura, una
aprobación seguirá siendo una **decisión de una persona**: el agente podrá prepararla y ejecutarla sólo en
nombre de alguien que tenga el permiso de aprobar, y queda registrada con esa persona como responsable.

> Detalle técnico: API y manifiesto de herramientas en la sección 4.1 de la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md); proveedor del gateway en el [runbook de Efeonce MCP](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md#provider-marketing-studio-efeonce-marketing-studio).

## De dónde salen los datos

Hoy los datos de las cinco campañas reales (CMP-001 a CMP-005) se importan desde el Campaign Manager de OneDrive y
del registro de campañas. Reimportar no duplica nada: si nada cambió, no se agrega ninguna fila.

Por eso, en esas campañas una pieza nueva (también un video) entra por el mismo camino: el final se guarda en
OneDrive, se anota en el catálogo, se reimporta y su original se copia al almacén de Studio, que genera solo las
imágenes livianas. La versión entra importada, no aprobada. Así se sumó el 2026-10-03 el spot «Los Sparks» a CMP-001
como un concepto nuevo. Corregir un copy en el catálogo y reimportar lo actualiza sin duplicarlo.

## Quién gobierna cada campaña: Studio u OneDrive

Desde el 2026-10-02 cada campaña declara quién manda sobre sus datos, y sólo uno de los dos lados manda. Nunca hay
una copia que se edite en dos lugares.

| Campaña | Quién la gobierna | Qué significa |
|---|---|---|
| **Gobernada por OneDrive** (hoy CMP-001 a CMP-005) | Su catálogo en OneDrive | Studio la muestra tal como se importó. Si alguien intenta cambiar en Studio su brief, conceptos, piezas, copys, anuncios, plan de medios, posts o estados, Studio responde **«esta campaña no está gobernada por Studio»** (código `409 campaign_not_studio_owned`) y no escribe nada. La única excepción es subir y revisar versiones de piezas. |
| **Gobernada por Studio** | Studio | Nace al crear la campaña en Studio, con la fecha de ese día como fecha de corte. Sus datos se cambian sólo en Studio, y el importador de OneDrive ya no la toca. |

¿Por qué una campaña de OneDrive responde «no»? Porque si Studio aceptara el cambio, la próxima importación desde
OneDrive lo pisaría, o habría dos versiones distintas de la misma campaña sin saber cuál es la buena. Hasta su corte,
esas campañas se corrigen en OneDrive.

**El corte de las campañas actuales está pendiente.** Pasar CMP-001 a CMP-005 a Studio, con fecha de corte y aviso al
equipo, es una entrega posterior del programa (TASK-1894, Entregable C) que el equipo dejó para después. La primera
será CMP-004. Mientras tanto, por ejemplo, la autorización de medios de CMP-004 se sigue registrando en su catálogo de
OneDrive.

### Qué se puede editar en una campaña gobernada por Studio

- Los datos de la campaña y su **brief** (objetivo, audiencias, KPIs y el resto), guardado tal como se escribió.
  Editar un brief ya aprobado lo devuelve a borrador.
- **Conceptos**, **piezas**, los **derechos** de cada versión y la **revisión** de versiones (aprobar o pedir cambios con
  una nota).
- **Copys** (se guardan exactamente como se escriben) y **anuncios** configurados.
- El **plan de medios**: un vuelo por campaña y líneas de presupuesto **propuestas**. Una línea aprobada no se escribe a
  mano: nace cuando una persona aprueba la propuesta, que se conserva al lado.
- Los **posts planificados** del calendario: Studio los planifica y los cancela, pero **nunca publica**. Un post que ya
  viene de la plataforma de publicación no se edita.
- Los **tres estados**, siguiendo su orden: por ejemplo, la creatividad pasa de «En producción» a «Piezas finales» y
  luego a «Aprobada». «Activa» y «Pausada» sólo aparecen cuando la plataforma lo observa; nadie los marca a mano.

Cada cambio queda registrado y lleva un número de revisión: si dos personas editan lo mismo a la vez, la segunda recibe
un aviso de conflicto en lugar de pisar el cambio de la primera.

**Cómo se edita hoy:** todavía no desde las pantallas de la web (llegan con TASK-1895). Hoy se edita por la API de
Studio, con un token de integración que tenga permiso de escritura, o por la consola del equipo
(`pnpm studio:write`), que por defecto sólo muestra lo que haría y escribe únicamente si se le pide de forma
explícita. En producción, hoy ninguna integración tiene permiso de escritura.

### Quién aprueba

**Aprobar es una decisión de una persona.** Aprobar una versión de pieza, el brief, la creatividad, una línea de
presupuesto, o autorizar medios, y también quitar una línea propuesta, exigen que una persona lo
confirme de forma explícita. Hoy eso sólo se puede hacer desde la consola del equipo, con una confirmación adicional.
Una integración nunca aprueba (recibe «la aprobación requiere a una persona») y por la API una aprobación queda
detenida pidiendo confirmación hasta que llegue la puerta de aprobación con la persona como responsable (TASK-1899).
Aprobar la creatividad y autorizar medios tienen su propio paso: no se pueden lograr con un cambio de estado genérico.

En Greenhouse, los permisos de escritura de Studio (piezas y campañas) quedaron preparados para los roles de
**administración**, **cuentas**, **operaciones** y **diseño** de Efeonce; todavía no están publicados en producción.

> Detalle técnico: commands, máquinas de estado, autoridad por campaña y errores en el [Delta del Entregable B de TASK-1894](../../tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md) y en la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).

## Qué viene

El programa (EPIC-049) avanza en este orden, sin fechas comprometidas:

1. **Agentes por MCP encendidos** — lectura de campañas desde un asistente, con el permiso de cada persona.
2. **Originales en la nube y avisos** — los archivos originales dejan de depender de OneDrive, y el equipo recibe
   alertas en Teams si algo falla.
3. **Métricas** — resultados de pauta y publicaciones traídos desde Greenhouse.
4. **Edición y brief como parte de Studio** — ya en Studio desde el 2026-10-02 para campañas gobernadas por Studio
   (por API y consola). Falta el **corte de las campañas actuales** desde OneDrive, empezando por CMP-004.
5. **Pantallas de edición, revisión y métricas**, y **escritura y aprobaciones por agentes**, siempre con una
   persona responsable.
6. **Inicio de sesión con la cuenta Efeonce**, al final.

> Detalle técnico: [EPIC-049](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md).
