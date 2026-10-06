# Efeonce Creative Studio — vista creativa sobre las mismas campañas de Studio (ADR)

> **Status:** `Accepted` (2026-10-05) — decisión del operador; implementación por tasks de EPIC-049.
> **Date:** 2026-10-05
> **Deciders:** Julio Reyes (operador). Redacción: Claude (`arch-architect`).
> **Owner:** Efeonce Studio (Marketing Studio + Creative Studio)
> **Epic:** [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)
> **Scope:** qué es Creative Studio, cómo se relaciona con Marketing Studio dentro de la misma plataforma, qué
> datos y commands comparten, qué es nuevo del lado creativo y cómo se relaciona con Globe, su motor de producción. No crea tasks,
> rutas, tablas, capabilities ni tools: fija la forma que deben respetar las tasks que las construyan.
> **Reversibility:** `two-way` para la forma de la UI (vista, switch, navegación). `two-way-but-slow` para lo que
> nace en datos (receta de producción en el catálogo, referencias, chequeos de marca, comentarios): se agregan por
> expand, nunca reemplazan columnas existentes. Lo **one-way** que esta decisión evita a propósito es duplicar la
> campaña en un segundo modelo: una vez que existen dos registros de la misma campaña, sincronizarlos no se deshace.
> **Confidence:** `high` en la forma (un aggregate, dos vistas, autoridad separada por estado). `medium` en el
> detalle de la receta de producción por formato y en la anatomía de las rondas de revisión, que se validan con
> piezas reales (Reel, Performance Max, carrusel, DOOH) en la primera task.
> **Validated as of:** 2026-10-05, leyendo `efeonce-marketing-studio` en `5d962c4`
> (`packages/database/src/schema.ts`, `packages/contracts/src/operations-review.ts`):
> `campaign.creative_state` (`unknown | in_production | final_available | approved`) separado de
> `media_authorization_state` y `launch_state`; `asset_version.review_state`
> (`imported | pending_review | approved | changes_requested`) con `reviewed_by`, `reviewed_at` y un `review_note`
> único; commands `approveAssetVersion`, `requestAssetVersionChanges`, `transitionCreativeState` y
> `approveCreative`; `channel_format` con proporciones, duración, peso y tipos de archivo, sin especificación de
> producción; capabilities `marketing_studio.campaign.{read,write,approve}`, `marketing_studio.asset.{write,download}`
> y `marketing_studio.catalog.manage`.
> **Complementa:** [Arquitectura de Marketing Studio](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md),
> [fuente única e ingesta](EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md),
> [capa de estrategia](EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md) y
> [operación híbrida con agentes](EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md). **Modifica** la
> [decisión de nombre](EFEONCE_MARKETING_STUDIO_NAMING_AND_MARK_DECISION_V1.md) (delta del 2026-10-05).

## 1. Contexto

Marketing Studio ya registra la campaña completa: brief, conceptos, piezas con versiones, copys, anuncios, plan de
medios y calendario de activaciones. Está diseñado desde el punto de vista de quien **activa**: el especialista de
marketing y de performance y el marketing manager. Para esa persona, una pieza es algo que se pone en un canal, con
un copy y una audiencia, y que se mide.

La misma campaña tiene otra mitad que hoy no tiene casa: la del oficio. Para el diseñador, el director de arte y el
brand manager, una pieza es algo que se **crea, se revisa y se aprueba**. Les importa qué exige el formato (un Reel,
un grupo de assets de Performance Max, un carrusel, una pantalla DOOH), qué referencias hay, en qué ronda va, qué
feedback quedó pendiente, si cumple la marca y para cuándo tiene que estar lista. Hoy ese trabajo vive en carpetas,
chats y planillas fuera de Studio, y Studio sólo se entera cuando entra el final.

El operador definió el 2026-10-05:

1. Studio tendrá una **vista gemela, Creative Studio**, con la misma estructura de canales, campañas y modalidades,
   desde el punto de vista del oficio creativo. Para el usuario es un switch.
2. Es la **misma campaña** vista desde otra persona; no hay campañas propias de Creative Studio.
3. Un plan de producción sin campaña de marketing será **excepcional**; la campaña es la unidad.
4. La vista cubre la pieza **en todo su ciclo**, a producir y producida, no sólo la etapa de producción.
5. **Globe es el motor de producción** y también es parte de Creative Studio: no son excluyentes. Hoy está hibernado
   y sujeto a una reestructuración; más adelante tocará juntar las piezas.

## 2. Decisión

### D1. Una plataforma, un aggregate, dos vistas

Creative Studio es una **vista** de Efeonce Studio (`studio.efeonce.org`), no una aplicación, una base ni una
campaña aparte. Las dos vistas leen y escriben el mismo aggregate (`studio.campaign` y sus conceptos, piezas,
versiones, copys, anuncios y planes) por la misma API `/api/v1`, los mismos commands y el mismo registro de
operaciones. Cambiar de vista cambia **qué se muestra primero y cómo se recorre**, nunca qué datos existen.

- El switch **conserva el foco**: si la persona mira la campaña `CMP-007` o la pieza `CMP007-02-video-9x16` en una
  vista, la otra abre en esa misma campaña o pieza.
- La vista activa es **direccionable por URL**, para que un enlace compartido abra en la vista correcta, y se
  recuerda por persona como preferencia.
- La vista **no es autorización**. No concede ni oculta autoridad: quien no tiene una capability no la gana al
  cambiar de vista, y quien la tiene la conserva en ambas. Los commands son el único lugar donde se autoriza.
- La vista por defecto se elige por el rol de la persona; cualquiera puede cambiarla.

### D2. Dos puntos de vista, una pieza

| | Creative Studio | Marketing Studio |
|---|---|---|
| Para quién | Diseñador, director de arte, brand manager | Especialista de marketing y performance, marketing manager |
| Recorrido | Campaña → concepto → pieza por formato → versiones | Campaña → plan → canal → anuncio |
| La pieza es | Algo que se crea, se revisa y se aprueba | Algo que se activa y se mide |
| Ve primero | Receta del formato, referencias, ronda vigente, feedback, chequeo de marca, derechos, historial de versiones | Copy, placement, audiencia, presupuesto, calendario de activaciones, rendimiento |
| Calendario | Hitos de producción calculados hacia atrás desde la activación | Fechas de activación y publicación |
| Estado que gobierna | `creative_state` y la revisión de cada versión | `media_authorization_state` y `launch_state` |

La estructura es la misma en las dos vistas: los mismos canales del catálogo, con sus cuatro modalidades (paid,
organic, owned, earned) y doce familias, la misma campaña y el mismo concepto. Lo que cambia es el corte.

Son **compartidos** y se editan por los mismos commands desde cualquier vista: campaña, brief, concepto, pieza,
versión y copy. El copy es de las dos: el copywriter lo trabaja como parte de la pieza (por ejemplo, los títulos de
un grupo de Performance Max) y Marketing lo usa en el anuncio.

### D3. La pieza en todo su ciclo, sin entidades nuevas para el ciclo

El ciclo creativo se modela con lo que ya existe:

| Momento | Cómo se representa hoy |
|---|---|
| Pieza a producir (el hueco del plan de contenidos) | `studio.asset` sin versión vigente |
| En producción | `campaign.creative_state = in_production`; trabajo asignado por work item |
| Versión enviada a revisión | `asset_version.review_state = pending_review` |
| Cambios pedidos | `requestAssetVersionChanges` → `changes_requested`; la corrección entra como versión nueva |
| Final | `approveAssetVersion` → `approved` |
| Campaña creativa aprobada | `approveCreative` (T2) → `creative_state = approved` |
| Adaptaciones posteriores | Versiones nuevas o piezas derivadas, con procedencia |

Una **ronda de revisión** es una versión más la decisión sobre ella: se **deriva** del historial, no se guarda como
entidad. Toda versión, venga de quien venga, entra por el único command de ingesta (`createAssetVersion`) con su
procedencia. Sigue vigente que un final existe sólo si entró a Studio.

### D4. La autoridad de «final» es del lado creativo

- Aprobar una versión y aprobar lo creativo de una campaña son decisiones del oficio (brand manager o quien tenga
  `marketing_studio.campaign.approve` para ese cliente). Marketing **no aprueba piezas**: autoriza medios y lanza.
- Los tres estados siguen sin colapsarse. Que una pieza esté aprobada no autoriza medios; que los medios estén
  autorizados no aprueba la pieza.
- Una activación debe apuntar a una versión aprobada. Hoy el command de anuncio exige una versión vigente; si exige
  además que esté aprobada o lo deja como chequeo pendiente se decide y se verifica en la task que lo toque (§8).

### D5. La receta de producción vive en el catálogo de canales

No se crea un catálogo creativo paralelo. Cada formato del catálogo global gana una **faceta de producción**, junto
a la de activación que ya tiene:

- **Activación (existente):** proporciones, duración, peso, tipos de archivo, límites de copy y objetivos.
- **Producción (nueva):** entregables que componen la pieza (por ejemplo, Performance Max: títulos, títulos largos,
  descripciones, imágenes en varias proporciones, logos y video; carrusel: número de láminas), zonas seguras, audio y
  subtítulos, legibilidad a distancia para DOOH, duración del gancho en video vertical y tiempo de producción
  típico, que alimenta los hitos.

La faceta se versiona con el catálogo, conserva fuente y fecha por especificación como el resto de la evidencia y
se gobierna con `marketing_studio.catalog.manage`. Las especificaciones de plataforma cambian; nunca se asumen
vigentes sin su fecha.

### D6. Hitos hacia atrás; asignación por work items

- Los **hitos de producción** de una pieza (brief creativo, propuesta, rondas, final) se calculan hacia atrás desde
  su primera activación usando el tiempo de producción de la receta. Se guardan sólo los ajustes manuales; lo demás
  se deriva, para que mover una activación mueva sus hitos.
- La **asignación** de trabajo a personas o roles de agente usa los work items de la
  [operación híbrida](EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md), incluido el rol «QA creativo y de
  marca». No nace un modelo de tareas propio de Creative Studio.

### D7. Lo nuevo del lado creativo

Tres capacidades no existen y son del oficio. Cada una nace con command o reader, ruta `/api/v1`, entrada en el
registro de operaciones con su nivel y tool declarada o exclusión razonada:

1. **Referencias por concepto** (moodboard): imágenes, enlaces y notas con su procedencia. Una referencia nunca es
   una versión ni puede promoverse a final; si se usa material de terceros en la pieza, sus derechos viajan en la
   versión que lo contiene.
2. **Feedback anclado a una versión:** comentarios con ancla opcional (región de la imagen, segundo del video,
   lámina del carrusel) y estado resuelto/pendiente. Reemplaza al `review_note` único como forma principal de
   revisión; ese campo se conserva.
3. **Chequeo de marca por versión:** criterios con resultado y evidencia (línea gráfica, firma, contraste medido,
   uso del logo), según el brand pack del cliente. Es evidencia para quien aprueba, no una aprobación.

### D8. Globe es parte de Creative Studio: el motor

Creative Studio tiene dos piezas que no se excluyen: la **vista creativa** de Studio, que planifica, revisa y aprueba
sobre las campañas, y **Globe**, el motor que produce. Globe hoy está hibernado y sujeto a una reestructuración
(declaración del operador, 2026-10-05); juntar las dos piezas es trabajo posterior y tendrá su propia decisión.

Mientras tanto, y para que la unión no obligue a rehacer nada:

- La vista no espera a Globe: funciona con cualquier origen de la pieza (el equipo con sus herramientas, un proveedor
  de IA, un tercero o Globe cuando vuelva).
- Toda versión, la produzca quien la produzca, entra por `createAssetVersion` con procedencia y derechos. Ése es el
  punto de unión con Globe hoy, no una frontera definitiva.
- Cada pieza conserva su dueño de datos: la campaña, sus piezas, versiones, revisión y aprobación viven en Studio;
  las corridas, intentos de proveedor, créditos y gobierno de generación viven en Globe. La unión las conecta por
  contrato, no compartiendo tablas.

### D9. Nombres

- **Creative Studio** nombra la vista creativa de Efeonce Studio; **Marketing Studio**, la de activación. Las dos
  conviven en `studio.efeonce.org`.
- **Creative Studio** abarca también a **Globe**, que conserva su nombre como el motor de producción. Delta en la
  [decisión de nombre](EFEONCE_MARKETING_STUDIO_NAMING_AND_MARK_DECISION_V1.md).
- **Marca de Creative Studio (aprobada el 2026-10-06):** la misma construcción que Marketing Studio, con «Creative» y
  la esfera en el acento Brand; 24 piezas `creative-studio-*` en `@efeoncepro/axis-brand-assets` 0.4.26. Las piezas
  cortas, que dicen sólo «Studio», van sólo donde el contexto ya dice Creative Studio. Delta en la
  [decisión de nombre](EFEONCE_MARKETING_STUDIO_NAMING_AND_MARK_DECISION_V1.md).
- Los identificadores técnicos no cambian: capabilities `marketing_studio.*`, tools `studio.*`, base
  `marketing_studio`, repo `efeonce-marketing-studio`. Nombran el dominio de la plataforma, no la vista.
- **Lectura de documentos previos:** en documentos anteriores al 2026-10-05, en `docs/architecture/creative-studio/`,
  en los archivos `EFEONCE_CREATIVE_STUDIO_*` y en `docs/business-models/creative-studio/`, «Creative Studio» se
  refiere a la parte de motor (Globe). Siguen siendo de Creative Studio; sólo no cubren la vista creativa de Studio.

## 3. Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Producto aparte con sus propias campañas, sincronizadas con Marketing Studio | Dos registros de la misma campaña se desincronizan; obligaría a decidir cuál manda en cada campo. Es lo único difícil de deshacer |
| Una sola vista con todo junto | Mezcla dos recorridos y dos vocabularios; cada persona tendría que filtrar lo que no le sirve en cada pantalla |
| Vista como permiso (el diseñador sólo ve Creative Studio) | Esconde datos sin protegerlos: la autoridad está en los commands. Además impide al brand manager ver el rendimiento de su pieza |
| Catálogo creativo propio de formatos | Duplicaría el catálogo de canales y su evidencia; un cambio de especificación habría que hacerlo dos veces |
| Entidad «ronda» persistida | La ronda ya está en el historial de versiones y sus decisiones; guardarla aparte crea una segunda verdad |
| Modelo de tareas propio de producción | Los work items ya cubren asignación a personas y agentes con revisión y traspaso |
| Construir la vista dentro del runtime de Globe ahora | Globe está hibernado y en reestructuración; la vista quedaría sin servicio. La unión llega después, por contrato |
| Renombrar capabilities y tools a algo neutral | Migración de permisos y tokens sin beneficio para el usuario; los ids técnicos nombran el dominio |

## 4. Consecuencias

- **Positivas:** el oficio creativo entra a Studio antes del final, no después; la campaña tiene un solo registro;
  el brand manager ve cómo rinde su pieza sin cambiar de producto; los agentes operan las dos vistas con las mismas
  tools; todo lo nuevo se apoya en primitives que ya existen (estados, revisión, work items, catálogo, ingesta).
- **Costo:** la UI de Studio necesita navegación por vista y un switch que conserve el foco; el catálogo gana una
  faceta que hay que sembrar con evidencia fechada; las tres capacidades de D7 son trabajo nuevo con paridad
  completa.
- **Riesgo:** que cada vista empiece a crecer pantallas con lógica propia. Mitigación: la UI sólo escribe por
  commands y el test de paridad del registro cubre las mutaciones de ambas vistas.
- **Nombre:** «Studio» a secas pasa a ser ambiguo entre la plataforma y Marketing Studio. Queda como pregunta
  abierta (§7); mientras tanto, cada vista se nombra completa en superficies visibles.

## 5. Cuatro pilares

| Pilar | Evaluación |
|---|---|
| **Seguridad** | La vista nunca autoriza: capabilities en el command, igual que hoy. Aprobar (T2) sigue con confirmación humana; la IA propone y no aprueba. Las referencias no pueden convertirse en finales, lo que evita que material sin derechos entre como pieza aprobada |
| **Robustez** | Un solo aggregate con `revision` e `If-Match`: dos personas en vistas distintas no se pisan en silencio. Rondas e hitos derivados no pueden divergir de su fuente. Los tres estados siguen separados por `CHECK` |
| **Resiliencia** | Ningún motor de producción es dependencia: si Globe o un proveedor fallan, la vista sigue registrando y revisando. Comandos idempotentes y auditados como el resto de Studio; la observabilidad existente (salud, corridas, alertas) cubre ambas vistas |
| **Escalabilidad** | Agregar una vista no agrega datos duplicados. La receta crece por catálogo versionado, no por código. Los hitos se calculan al leer sobre volúmenes pequeños (piezas por campaña); si crece, se proyectan |

## 6. Dependencias e impacto

- **Depende de:** catálogo de canales (TASK-1905, desplegado), calendario de activaciones (TASK-2002), work items y
  roles (operación híbrida), commands de revisión ya desplegados, UI de edición (TASK-1895).
- **Impacta a:** navegación y diseño de la UI de Studio; catálogo de canales (faceta nueva); registro de operaciones
  y test de paridad; skill `efeonce-marketing-studio`; decisión de nombre; contexto de producto
  (`docs/context/03_ecosistema-producto.md`); routers `CLAUDE.md` y `AGENTS.md`.
- **No impacta:** Greenhouse (identidad, organizaciones, ICP), el gateway MCP más allá de declarar tools nuevas.
  Globe no cambia ahora; la unión con la vista es una decisión posterior.

## 7. Preguntas abiertas

1. **«Studio» a secas.** ¿Pasa a nombrar la plataforma (Efeonce Studio, con dos vistas) o sigue siendo Marketing
   Studio? Recomendación: la plataforma. Afecta lockups, ícono y la decisión de marca del 2026-10-02.
2. **Marca de Creative Studio.** Si lleva la órbita en la «o» con otro acento o comparte la de la plataforma. **Resuelta el 2026-10-06:** la órbita en la «o» con el acento Brand (D9).
3. **Activación con versión no aprobada:** bloqueo duro o chequeo pendiente visible.
4. **Límite de rondas por contrato.** Si Studio lo lleva (y avisa al pasarse) o queda en el SOW. Lo comercial lo
   decide `creative-practice`.
5. **Revisión del cliente.** Si el cliente comenta y aprueba desde Creative Studio. Hoy está fuera de alcance de
   Studio; abrirlo exige su propia decisión de acceso externo.
6. **Unión con Globe.** Cómo se juntan las piezas cuando Globe salga de la reestructuración: si la vista dispara
   corridas de Globe desde una pieza, cómo vuelven las versiones y cómo se ven costo y créditos en la vista.
7. **Plan de producción sin campaña.** El operador lo considera excepcional; si aparece un caso real se modela como
   campaña de producción, no como entidad nueva.

## 8. Roadmap por slices

Cada slice es una task de EPIC-049, con su perfil (`backend-data` primero, `ui-ux` después cuando haya datos
nuevos) y su revisión de paridad:

1. **Vista y switch** (`ui-ux`): navegación de Creative Studio sobre datos existentes, switch que conserva el foco,
   vista en la URL y preferencia por persona. Sin datos nuevos.
2. **Receta de producción** (`backend-data`): faceta en `channel_format`, sembrada con evidencia fechada para los
   formatos de la primera campaña real.
3. **Hitos hacia atrás** (`backend-data` + `ui-ux`): reader derivado desde activaciones y receta; ajustes manuales
   persistidos.
4. **Feedback anclado** (`backend-data` + `ui-ux`).
5. **Referencias por concepto** (`backend-data` + `ui-ux`).
6. **Chequeo de marca** (`backend-data`), conectado al rol de agente «QA creativo y de marca».
7. **Regla de activación con versión aprobada** (pregunta abierta 3).

## 9. Reglas duras

- **NUNCA** crear campañas, conceptos o piezas propias de Creative Studio ni una base o un schema aparte: es una
  vista del mismo aggregate.
- **NUNCA** usar la vista para autorizar u ocultar autoridad; la capability se verifica en el command.
- **NUNCA** colapsar `creative_state`, `media_authorization_state` y `launch_state`, ni dejar que Marketing apruebe
  una pieza o que la aprobación creativa autorice medios.
- **NUNCA** persistir rondas o hitos que se pueden derivar; sólo se guardan los ajustes manuales.
- **NUNCA** crear un catálogo de formatos paralelo: la receta de producción es una faceta del catálogo de canales.
- **NUNCA** promover una referencia a versión o final.
- **NUNCA** hacer que la vista dependa de un motor de producción para funcionar; hasta la unión con Globe, toda
  versión entra por `createAssetVersion` y nadie comparte tablas entre Studio y Globe.
- **NUNCA** agregar una capacidad de cualquiera de las dos vistas sin command o reader, ruta `/api/v1` y entrada en
  el registro de operaciones.
- **SIEMPRE** que el switch cambie de vista, conservar la campaña o pieza en foco.
- **SIEMPRE** tratar la vista creativa y Globe como partes del mismo Creative Studio, no como productos excluyentes.
