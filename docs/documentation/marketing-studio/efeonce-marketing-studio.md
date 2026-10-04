# Efeonce Marketing Studio — Gestión de campañas

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.6
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Ultima actualizacion:** 2026-10-04: catálogo TASK-1905 desplegado, validación warn y referencias ICP; cliente CLI HTTP verificado localmente. Reproducción de video TASK-1998/1999 conservada.
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

**Los videos se reproducen ahí mismo.** Si la pieza es un video, la tarjeta muestra un reproductor con los controles
del navegador y el primer cuadro como portada. No arranca solo: el sonido empieza cuando presionas play. Se puede
adelantar, ver a pantalla completa y, en el celular, verlo dentro de la tarjeta. Lo que se reproduce es una versión
liviana para web (hasta 720 px en el lado corto): para el archivo final se pide la descarga del original. Si un video
todavía no tiene esa versión, Studio muestra el primer cuadro y lo avisa; si no carga, lo dice y ofrece reintentar.

Cuando un concepto tiene dos piezas del mismo formato (por ejemplo «Los Sparks» y «Los Sparks · con intro para
Instagram», ambas 16:9), el tablero muestra las dos, y la segunda lleva una etiqueta con lo que la distingue. Las
miniaturas de video muestran su duración. Si un formato sólo existe como video (o sólo como imagen), su hueco dice
**Ver video** (o **Ver imagen**) y lleva directo a esa pieza.

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
- **Agentes de IA.** Studio publica un manifiesto de **59 tools** (API 1.6.0), incluyendo canales, audiencias y
  revalidación. Esa lista describe lo que el servidor sabe hacer; la conexión de Efeonce MCP puede exponer una
  parte menor según su configuración, permisos y rollout. Ver el manifiesto no prueba que el agente pueda usarlo.

¿Quién puede usar las herramientas de agente? Sólo personas con el permiso de lectura de Studio, que hoy tienen
los roles de **administración**, **cuentas** y **operaciones** de Efeonce. El agente actúa en nombre de esa
persona: si la persona no tiene el permiso, el agente tampoco puede leer.

**Estado verificado el 04/10:** Studio y su catálogo están en producción. Este release no publicó Greenhouse
ni el gateway, ni verificó una sesión MCP real con las nuevas tools. El estado de la conexión debe comprobarse
en el carril de federación; no se deduce de la salud de Studio.

**Escritura por agentes:** la API ya tiene commands de escritura; consumirlos por MCP T1 depende de TASK-2003,
que corre en paralelo. TASK-1899 está retirada y no bloquea API, CLI ni UI. Las aprobaciones siguen siendo decisión
de una persona en un carril habilitado: actualmente la API rechaza T2, aunque una CLI envíe `--confirm`.

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
explícita. El cliente de cargas tiene `studio:assets:write`; ese scope no permite editar campañas, copys o planes (`studio:write`).

### Quién aprueba

**Aprobar es una decisión de una persona.** Aprobar una versión de pieza, el brief, la creatividad, una línea de
presupuesto, o autorizar medios, y también quitar una línea propuesta, exigen que una persona lo
confirme de forma explícita. Hoy eso sólo se puede hacer desde la consola del equipo, con una confirmación adicional.
Una integración nunca aprueba (recibe «la aprobación requiere a una persona») y por la API una aprobación queda
detenida con `confirmation_required`. TASK-1899 se retiró sin habilitar confirmación delegada por digest.
Aprobar la creatividad y autorizar medios tienen su propio paso: no se pueden lograr con un cambio de estado genérico.

En Greenhouse, los permisos de escritura de Studio (piezas y campañas) quedaron preparados para los roles de
**administración**, **cuentas**, **operaciones** y **diseño** de Efeonce; todavía no están publicados en producción.

> Detalle técnico: commands, máquinas de estado, autoridad por campaña y errores en el [Delta del Entregable B de TASK-1894](../../tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md) y en la [arquitectura](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).

## Qué viene

El programa (EPIC-049) conserva trabajos distintos, sin fechas comprometidas:

- Activaciones y calendario: TASK-1905 → TASK-2001 → TASK-2002. El catálogo ya está en Studio; cuentas,
  mercados, URLs de activación y ejecución siguen en esas tareas.
- Identidad delegada y escrituras MCP T1: TASK-2003 en paralelo, con verificación de sesión real.
- Customer model y métricas desde Greenhouse: dependencias TASK-1906/TASK-1892; ICP permanece desactivado.
- Pantallas de edición y revisión, corte de las campañas actuales desde OneDrive e inicio de sesión Efeonce:
  conservan sus tareas y autorizaciones. Una API disponible no realiza esos cortes automáticamente.

> Detalle técnico: [EPIC-049](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md).

## Catálogo de canales y validación (2026-10-04)

El catálogo publicado v1 contiene 52 canales, organizados por modalidad y familia, con plataformas de compra y
aparición separadas, placements, formatos, límites y tracking documentados. Al guardar, Studio conserva la clave
resuelta y la versión de catálogo junto al texto original. La validación está en **warn**: informa hallazgos sin
bloquear por esos hallazgos. Una especificación nueva no cambia campañas existentes al leerlas.

La atención puede mostrar canales pendientes de resolver; la revalidación es una operación explícita. El backfill
histórico sigue pendiente. Las referencias ICP no inventan segmentos ni personas: se admite una nota pendiente,
y el modelo real seguirá desactivado hasta disponer de su conexión autorizada.
[Contrato funcional](catalogo-canales-y-referencias-icp.md) · [Gobernar el catálogo](../../manual-de-uso/marketing-studio/gobernar-catalogo-canales.md).

## Operación por CLI HTTP desde Greenhouse (2026-10-04)

`pnpm studio` permite consultar y preparar operaciones sobre campañas, piezas, copys, anuncios, planes,
calendario, canales y audiencias usando la API de Studio. Descubre el catálogo de operaciones vigente;
valida sin persistir por defecto y ejecuta con `--apply`. La carga de archivos incluye derechos de uso,
transferencia y verificación; una carga no aprueba ni publica. Identidad, permisos, fuente maestra,
revisiones y disponibilidad de capacidades siguen controlados por Studio. El cliente de cargas no otorga
escritura general ni autoridad de catálogo. [Pasos, credenciales y límites](../../manual-de-uso/marketing-studio/operar-por-cli-api.md).

Verificación del cliente: 18 tests locales, descubrimiento de 64 operaciones HTTP, lecturas autenticadas y carga
real en dry-run. Las pruebas de transferencia aplicada fueron locales; no acreditan un upload productivo aplicado
por esta CLI. [Evidencia CLI](../../audits/marketing-studio/2026-10-04-studio-api-cli.md).

## Activaciones y evidencia — candidato local del 04/10

La activación describe una salida de una campaña, incluida una campaña Always On. La persona elige cuenta, mercado,
canal, pieza/versiones, copy y fecha o franja. La programación observada se compara con ese plan; si se retrasa, se
muestra la diferencia. Reprogramar en Studio no cambia la herramienta. Published, En curso y Finalizada necesitan
fecha de publicación o entrega real; vencer una fecha sólo produce overdue.

La evidencia sin plan aparece como ejecución sin activación. Se puede vincular o crear un plan desde sus datos,
confirmando campaña y piezas. Los avisos y el historial vienen del servidor. Un enlace publicado sin el tracking
previsto genera un aviso; cuando se publica o entrega, ese tracking queda congelado.

En blog, la cuenta owned identifica CMS y dominio del cliente. Notion se muestra como enlace al borrador, sin acceso
al contenido. Un reader CMS puede observar publicación; si no existe, Studio comprueba la URL pública y una persona
confirma la fecha. No basta un HTTP 200. La confirmación queda identificada en el historial.

Estas capacidades están verificadas localmente con flags OFF por defecto; no están disponibles por inferencia en
producción ni en una conexión MCP. [Manual de operación](../../manual-de-uso/marketing-studio/operar-por-cli-api.md)
y [QA](../../audits/marketing-studio/TASK-2001-local-verification.md). Dossier SEO/AEO, autorización para publicar y
métricas posteriores pertenecen a un follow-up independiente.


### Próximo contrato owned, implementado localmente (2026-10-04)

Resend y HubSpot tienen adapters de evidencia de campaña; Salesforce Marketing Cloud Engagement y Next se
representan como proveedores distintos todavía sin lector. Una evidencia de email distingue borrador, parcial,
completo y desconocido: sólo envío completo con fecha observada acredita publicación. No se importan destinatarios
ni correo transaccional. La integración Resend de este corte lee broadcasts nativos; otros batches requieren vínculo
explícito a una campaña. CMS sigue siendo atributo del sitio cliente: WordPress se verifica por API pública; otros
CMS usan URL pública y fecha confirmada por una persona. Notion sólo es referencia del borrador.

Este contrato local no acredita habilitación en producción. [Conexiones y límites](../../audits/marketing-studio/TASK-2001-owned-connections-2026-10-04.md)
y [operación por CLI](../../manual-de-uso/marketing-studio/operar-por-cli-api.md).
