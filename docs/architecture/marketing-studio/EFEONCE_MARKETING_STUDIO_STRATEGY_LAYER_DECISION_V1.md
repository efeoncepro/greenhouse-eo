# Efeonce Marketing Studio — Capa de estrategia: canales, ICP, plan de campaña, SEO/AEO, IA y paridad total (ADR)

> **Status:** `Accepted` (2026-09-26). Implementación y rollout por tasks del EPIC-049; nada de este ADR está en
> runtime todavía.
> **Date:** 2026-09-26
> **Deciders:** Julio Reyes (operador). Redacción: Claude.
> **Owner:** Efeonce Marketing Studio
> **Epic:** [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md)
> **Scope:** la capa que explica **por qué** existe cada pieza de una campaña (estrategia, audiencias, mensajes, plan
> de contenidos, SEO/AEO, medición y aprendizajes), el catálogo de canales, la referencia al ICP de Greenhouse, el uso
> de IA y la regla de paridad total UI → API → MCP con ejecución por agentes y niveles de riesgo.
> **Reversibility:** `two-way-but-slow` en general. Lo lento de revertir es la migración de `channel` libre al
> catálogo (expand → backfill → contract) y la costumbre del equipo de planificar dentro de Studio; las capacidades
> nuevas nacen apagables por flag y ninguna borra datos existentes.
> **Confidence:** `high` en la dirección (paridad, fronteras de dueño, IA que propone y persona que confirma);
> `medium` en la forma exacta del catálogo de ICP (no existe todavía en runtime) y en los límites de cada plataforma
> (volátiles, se verifican al sembrar el catálogo).
> **Validated as of:** 2026-09-26 — schema `studio` leído en `efeonce-marketing-studio`
> (`packages/database/src/schema.ts`): `campaign.funnel_phase`, `campaign.audience_summary` y `campaign.brief_ref`
> son texto libre; `audience` es por campaña × canal con `temperature` y `definition` jsonb; `ad_configuration` tiene
> `channel`, `placement`, `audience_key`, `objective` y `utm`; `copy_variant.channel`, `budget_line.channel` y los
> posts usan canal en texto libre. En Greenhouse no existe un catálogo de ICP gobernado en runtime: el ICP vive como
> contexto documental ([`docs/context/13_icp-buyer-personas-jtbd.md`](../../context/13_icp-buyer-personas-jtbd.md)) y
> las etapas del bow-tie en [`docs/context/11_hubspot-bowtie.md`](../../context/11_hubspot-bowtie.md).
> **Complementa:** [`EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) (API-first y
> paridad UI → API → MCP) y [`EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`](EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md)
> (Studio + GCS como fuente única; un command, tres puertas; aprobación humana; corte por campaña). No reemplaza a
> ninguno: los extiende a la capa de estrategia y endurece la paridad a **ejecución** por agentes.
> **Aplica:** [`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`](../GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).

## 1. Contexto

Studio es hoy un buen **registro de ejecución**: piezas y versiones, copys literales por canal, configuraciones de
anuncio, plan de medios con presupuesto por naturaleza (propuesto, aprobado, real), calendario orgánico y lo que
requiere atención. Lo que no tiene es la **capa de estrategia** que explica por qué existe cada pieza:

- **Canal en texto libre.** `copy_variant.channel`, `ad_configuration.channel`, `budget_line.channel` y
  `audience.channel` son cadenas. Nadie valida que un copy quepa en el límite de su plataforma, que una pieza tenga los
  formatos que ese canal exige ni que el objetivo del anuncio sea válido en esa plataforma.
- **Audiencia sin modelo de cliente.** `campaign.audience_summary` es prosa y `audience.definition` es la traducción a
  plataforma sin ancla: no hay segmento, persona, trabajo por hacer (JTBD) ni etapa del bow-tie a la que responda.
- **Sin plan.** El brief es una referencia (`brief_ref`); no hay objetivo con KPI y meta, hipótesis, matriz de
  audiencias, casa de mensajes ni plan de contenidos que muestre qué falta producir.
- **SEO/AEO desconectado.** Search Visibility 360 (EPIC-022) mide en Greenhouse palabras clave, oportunidades, brechas
  competitivas, evolución de ranking, visibilidad por URL y citas en respuestas de IA; Studio no sabe qué parte de esa
  demanda ataca cada campaña ni vuelve a mirar el resultado.
- **Sin IA gobernada.** Los agentes pueden leer 12 tools `studio.*`, pero no pueden redactar un plan, un copy por canal
  ni un informe semanal que quede registrado con su procedencia.
- **Paridad sólo de lectura.** La regla de EPIC-049 ya dice «todo lo que hace la UI se hace por API y MCP, incluidas
  las aprobaciones» (TASK-1894/1899). El operador la endurece: los agentes (Claude, Codex, Nexa) tienen que poder
  **ejecutar** toda acción de la UI, no sólo leer, con niveles de riesgo explícitos.

## 2. Drivers de la decisión

1. **Full API Parity como regla dura (operador, 2026-09-26).** Toda capacidad de Studio, de lectura y de escritura,
   nace con command de dominio, ruta `/api/v1`, entrada en el registro de operaciones (tool o exclusión razonada) y
   tool MCP federada. Ninguna capacidad sólo en la UI.
2. **Una fuente por dato.** El modelo de cliente (ICP) es de Greenhouse; la medición SEO/AEO es de Search Visibility
   360; la ejecución de campaña es de Studio. Nadie paraleliza la identidad de otro.
3. **Riesgo proporcional.** Leer no es igual que editar un borrador, y editar un borrador no es igual que aprobar,
   publicar o gastar. La fricción debe ser la del riesgo, no uniforme.
4. **La IA propone, una persona decide.** Nada de lo que redacta un modelo se vuelve verdad sin que alguien lo acepte,
   y queda registrado quién, cuándo y sobre qué evidencia.
5. **Ausencia ≠ cero, en todas las capas.** Una meta sin medición es «sin dato», un gasto sin readback es «sin dato»,
   una métrica SEO sin snapshot es «sin dato».
6. **El segundo consumidor.** Studio sirve hoy a Efeonce como cliente propio (`org-2df565fb-…`), pero nace para
   campañas de clientes (Sky, Berel). Todo lo que parezca «dato genérico» debe resistir a una segunda organización con
   otro ICP, otros canales activos y otro mercado.

## 3. Opciones consideradas

### 3.1 Dónde vive el ICP

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. ICP dentro de Studio** (tablas propias de segmentos y personas) | Autonomía de Studio; sin dependencia de API | Identidad paralela al modelo de cliente que ya usan comercial, GTM, HubSpot y el portal; cada campaña reinventa personas; deriva garantizada | Rechazada |
| **B. Copia periódica del ICP a Studio** | Lecturas locales rápidas | Dos verdades; la copia envejece sin aviso; no se sabe qué versión usó cada campaña | Rechazada |
| **C. Catálogo versionado en Greenhouse, referenciado por id + versión** | Una fuente; cada campaña sabe con qué versión se planificó; comercial, Nexa y Studio leen lo mismo | Studio depende del lane ecosystem para resolver nombres; hay que construir el catálogo | **Aceptada** |

### 3.2 Cómo entra la data SEO/AEO

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Copiar series de SV360 a Studio** | Consultas locales | Duplica métricas con dueño; posición ponderada, CTR o ETV divergen; se salta entitlements y anti-oráculo | Rechazada |
| **B. Sólo lecturas en vivo, sin guardar nada** | Nunca desactualizado | El plan pierde el «por qué»: no queda qué volumen, posición o brecha justificó la meta cuando se decidió | Rechazada |
| **C. Referencia al sujeto de SV360 + snapshot fechado de lo que justificó la decisión** | El plan conserva su evidencia; el seguimiento se lee en vivo del dueño | Hay que distinguir en la UI «snapshot de planificación» de «dato actual» | **Aceptada** |

### 3.3 Por dónde entra la IA

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. IA dentro del producto primero** (botones «generar» en la UI) | Descubrible para el equipo | Obliga a elegir proveedor, costo, evaluación y UI antes de saber qué tareas valen; tienta a escribir lógica de IA pegada a pantallas | Rechazada como primer paso |
| **B. Agentes primero** (Claude/Codex por MCP + skills, sobre los mismos commands) | Reutiliza la paridad: si el command existe, el agente lo opera; costo de modelo fuera de Studio; se aprende qué tareas valen antes de construir UI | Menos descubrible para quien no usa agentes | **Aceptada** |
| **C. Sin IA** | Cero riesgo de modelo | Deja fuera el mayor multiplicador de productividad del programa | Rechazada |

### 3.4 Canales

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Seguir con texto libre** | Cero trabajo | Sin validación de formatos, límites ni objetivos; `LinkedIn`, `linkedin` y `LinkedIn Ads` como tres canales | Rechazada |
| **B. Catálogo en Greenhouse** | Centralizado | Las especificaciones de plataformas publicitarias son del dominio de ejecución, no del modelo de cliente ni de la identidad | Rechazada |
| **C. Catálogo gobernado y versionado en Studio** | Dueño natural; valida al escribir; cada registro fija la versión con que se validó | Hay que migrar el texto libre y mantener especificaciones volátiles | **Aceptada** |

### 3.5 Cómo se garantiza la paridad

| Opción | Pros | Contras | Veredicto |
|---|---|---|---|
| **A. Por convención y revisión** | Sin trabajo extra | Ya falló en otros dominios: la deriva no se ve hasta que un agente no puede hacer algo | Rechazada |
| **B. Por construcción: registro único + test de paridad que incluye escrituras** | Una capacidad sin contrato rompe el build | El test debe cubrir también las mutaciones que dispara la UI | **Aceptada** |

## 4. Decisión

### 4.1 Paridad total y ejecución por agentes (regla dura)

- **Toda capacidad de Studio, de lectura y de escritura, nace con cuatro piezas en el mismo cambio:** command o reader
  de dominio en `packages/domain`; ruta `/api/v1`; entrada en `packages/contracts/src/operations.ts` con `tool` o
  `exclusion` con razón; y tool MCP federada por Efeonce MCP (sync del manifiesto en el gateway).
- **La UI escribe sólo a través de esos commands.** Ninguna Server Action ni handler propio de pantalla contiene lógica
  de dominio que no tenga su operación en el registro.
- **Nivel de riesgo por operación.** Cada operación del registro declara su nivel (§5): `T0`, `T1` o `T2`. El nivel no
  lo decide el cliente que llama: lo fija el registro y lo aplica el command.
- **Los agentes ejecutan, no sólo leen.** Claude, Codex y Nexa pueden ejecutar toda acción que la UI permite, con la
  identidad delegada de la persona (mecánica de TASK-1899: clase de scope de escritura, canje por capability, token
  delegado revalidado por Studio). El actor auditado es siempre la persona; el agente queda registrado como
  **canal** (`via: mcp`, cliente) y, si redactó contenido, como **origen** en la procedencia (§4.6).
- **Test de paridad ampliado.** El test de paridad de Studio (hoy registro ↔ route handlers) se amplía para fallar si:
  una ruta de escritura no tiene entrada; una entrada `write` no tiene tool ni exclusión; una operación no declara
  nivel; una mutación que dispara la UI no corresponde a una operación registrada; o una tool federada es de lectura
  mientras la operación que la UI ejecuta escribe.

### 4.2 Catálogo de canales (Studio, gobernado y versionado)

- Entidad nueva en Studio (nombre de trabajo `channel_catalog`), con claves canónicas estables (`channel_key`) para
  canales pagados, orgánicos y propios. Semilla inicial: Meta (Facebook/Instagram Ads), LinkedIn Ads, LinkedIn página de
  empresa, LinkedIn perfil personal, Instagram orgánico, Google Ads, TikTok, blog/web y email vía HubSpot. La lista es
  dato del catálogo, no un `switch` en el código.
- Cada canal declara: **tipo** (`paid` | `organic` | `owned`), plataforma, placements, formatos admitidos (proporción,
  duración, tipo de archivo), límites de copy por campo (límite duro de la plataforma y recomendado), objetivos válidos
  y, por cada especificación, **fuente y fecha de verificación**, porque las plataformas cambian sus reglas.
- **Versionado.** Cambiar una especificación crea una versión nueva; cada copy, pieza y anuncio guarda la versión del
  catálogo contra la que se validó. Una versión nueva **no invalida en silencio** lo ya validado: muestra una señal de
  «validado con especificación anterior».
- **Validación al escribir.** Los commands de copy, pieza y anuncio validan contra el catálogo: canal desconocido o
  límite duro excedido = error del command (no se guarda); límite recomendado excedido o formato requerido faltante =
  advertencia registrada y visible en «atención».
- **Migración expand → backfill → contract.** Se agrega `channel_key` junto al texto libre actual; un backfill mapea
  los valores existentes con un mapeo revisado por una persona (lo que no mapea queda visible como pendiente, nunca se
  adivina); el texto libre se retira sólo después, en un paso de contract posterior al release.
- **Mercado no es canal.** El canal no codifica país ni idioma (`linkedin_ads`, nunca `linkedin_ads_cl`); el mercado es
  otra dimensión (hoy `media_flight.countries[]`; localización es follow-up, §8).

### 4.3 ICP en Greenhouse, referenciado desde Studio

- **Greenhouse es dueño del modelo de cliente**: un catálogo versionado de segmentos, buyer personas, JTBD, roles del
  buying group (operador, operador-champion, dueño del problema, sponsor, comprador económico, dueño de gobierno) y
  etapas del bow-tie (con los *internal names* vigentes de HubSpot; nunca etapas inventadas). Lo expone por el lane
  ecosystem y por una tool MCP de lectura en el manifiesto de Greenhouse.
- **El catálogo es por organización.** La primera versión es la de Efeonce como cliente propio (hoy en
  `docs/context/13`); una campaña para Sky o Berel referencia el modelo de cliente **de esa organización**, no el de
  Efeonce. Un catálogo global único no resiste al segundo consumidor.
- **Versiones publicadas inmutables.** Studio referencia `(organización, versión, id)`; nunca guarda nombres o
  descripciones como verdad. Si el catálogo publica una versión nueva, Studio no migra la referencia sola: muestra
  «planificado con versión N» y una persona decide actualizar.
- **La evidencia viaja con la persona.** El catálogo declara el nivel de evidencia de cada persona o segmento (validada
  o hipótesis, p. ej. BP9 candidata); Studio lo muestra junto a la campaña. Apuntar a una hipótesis está permitido y se
  ve como tal.
- **La campaña apunta a segmento, persona y etapa;** cada audiencia de canal (`studio.audience`) es la **traducción a
  plataforma** de una referencia ICP (cargos, tamaños, geos, exclusiones en la sintaxis de esa plataforma). Etapa del
  bow-tie y fase creativa del embudo (atracción, consideración, conversión) son **dimensiones distintas** y se guardan
  por separado.

### 4.4 Plan de campaña (Studio)

Por campaña, un plan con revisión, auditoría y aprobación humana, compuesto por:

| Bloque | Contenido |
|---|---|
| **Estrategia** | Objetivo; KPIs con meta, unidad, ventana y fuente de medición declarada; hipótesis explícitas |
| **Matriz de audiencias** | Persona × etapa × canal, con la audiencia de plataforma que traduce cada celda |
| **Casa de mensajes** | Pilares; pruebas (*proof points*) con su evidencia o fuente; mensajes por persona |
| **Plan de contenidos** | Ítems planificados por canal, formato y concepto, con responsable, fecha comprometida y estado. Cada ítem se vincula a la pieza, copy, anuncio o post real cuando entra a Studio → **el hueco de lo que falta es visible** |
| **Plan SEO/AEO** | §4.5 |
| **Plan de medición** | Convención UTM, eventos de conversión, metas y fuente por meta |

- **Nivel de programa opcional** sobre las campañas (pilares y metas trimestrales), para agrupar campañas que responden
  a la misma tesis sin duplicar su plan.
- **Brief ≠ plan.** El brief es la entrada humana (entidad de TASK-1894); el plan es la estrategia derivada. Un plan no
  reescribe su brief; si el plan necesita una promesa que el brief no tiene, se actualiza el brief primero.
- **Borrador editable, versión aprobada inmutable.** Editar un borrador es `T1`; aprobar el plan es `T2` (§5) y fija la
  versión contra la que se medirá la campaña.
- **Una prueba sin fuente no se aprueba.** Un *proof point* sin evidencia queda marcado y bloquea la aprobación del plan.

### 4.5 SEO/AEO con Search Visibility 360

- **SV360 (Greenhouse) es dueño de la data SEO/AEO.** Studio guarda **referencias** al sujeto de SV360 (palabra clave,
  tema, oportunidad, pregunta objetivo) y un **snapshot fechado** de lo que justificó la decisión: valor, métrica,
  fecha, lane de origen y versión de metodología cuando aplique (p. ej. `etvMethodology`).
- **Qué registra el plan SEO/AEO:** palabras clave y temas objetivo (de oportunidades, brechas o descubrimiento);
  preguntas objetivo para respuestas de IA (de consultas fundamentadas y la lente dual SEO↔AEO); URLs objetivo; y
  contenido de soporte (ítems del plan de contenidos).
- **Ciclo posterior al lanzamiento:** evolución de ranking, visibilidad por URL y citas en IA se leen **en vivo** de
  los lanes de SV360 y se comparan con el snapshot de planificación. El snapshot nunca se presenta como dato actual.
- **Acceso sólo por lanes ecosystem o MCP de Greenhouse**, con el consumer y los bindings de Studio (TASK-1892); nunca
  SQL. Los lanes competitivos (brecha, top del SERP, candidatos a competidor, gasto de proveedor) son **sólo para
  bindings `internal`**; su snapshot hereda esa clasificación y nunca aparece en una superficie que vea el cliente.
- **Rastrear palabras clave es `T2`.** `track_seo_keywords`, `declare_seo_competitors`, `discover_seo_keywords` y el
  diagnóstico de prospecto gastan presupuesto del proveedor en cada ciclo. Studio **no** los ejecuta con su identidad de
  servicio: el plan registra la propuesta y la ejecuta el command dueño en Greenhouse, con la autoridad de una persona y
  su confirmación.

### 4.6 IA: agentes primero, en el producto después

- **Ahora, por agentes** (Claude/Codex por MCP + skills), sobre los mismos commands: brief → borrador de plan; copy
  por canal que respeta límites del catálogo y la voz de marca; briefs SEO/AEO desde oportunidades de SV360; QA
  creativo contra marca, AXIS y formato del canal; lectura semanal de desempeño.
- **Después, en el producto**, sobre **los mismos commands** y un único puerto de proveedor de modelo en Studio (nunca
  un SDK dentro de un módulo de dominio), con línea base de evaluación antes de exponerlo.
- **La IA propone, una persona confirma, el command ejecuta.** La IA nunca aprueba, publica ni gasta sola.
- **Procedencia obligatoria en todo borrador de IA:** modelo y proveedor, versión de skill o instrucción, entradas y
  fuentes (ids y versiones: brief, ICP, snapshots SV360, aprendizajes), fecha, quién lo aceptó y cuándo, y si se editó
  después de aceptarlo. La procedencia es inmutable.
- **El copy sigue siendo literal.** Un copy aceptado no se reescribe en su lugar: una propuesta de IA crea una variante
  o un borrador nuevo.
- **Control de costo por organización.** El uso en el producto registra costo por organización con techo gobernado;
  con agentes primero, el costo de modelo lo absorbe el cliente de agente, no Studio.

### 4.7 Medición y aprendizajes

- **Readback de plataformas publicitarias** (MCP o API oficial de Meta Ads; LinkedIn Ads) como adapters de Studio:
  gasto real y resultados entran como **observaciones** con fecha y fuente; las líneas `actual` de presupuesto nacen
  sólo de readback, nunca de una estimación. Conectar una cuenta publicitaria (credenciales o consentimiento OAuth) es
  `T2`. Esta decisión **no** autoriza lanzar, pausar ni cambiar presupuesto en las plataformas: eso sería un ADR nuevo
  con su propia clase de scope, porque mueve dinero.
- **GA4 y Search Console** por Greenhouse (TASK-1892); **atribución del bow-tie de HubSpot** (lead → deal por
  `utm_campaign`) leída por el lane de Greenhouse, que es dueño del puente HubSpot. Studio nunca llama a HubSpot directo.
- **Experimentos:** hipótesis → variantes (pieza, copy, audiencia) → resultado (con ventana, fuente y nota de
  confianza) → aprendizaje.
- **Biblioteca de aprendizajes append-only:** cada aprendizaje cita su evidencia (experimento y snapshot de
  resultado), su alcance (organización, canal, persona) y su confianza. Alimenta a la IA como recuperación **con cita**;
  un aprendizaje sin evidencia no se usa como hecho.
- **Destino listo antes de lanzar:** chequeo de landing (responde, conserva la UTM, tiene la etiqueta de medición y
  los campos ocultos del formulario de HubSpot) registrado como observación fechada; su falla queda en `checks_pending`
  y en «atención». No cambia `launch_state` por inferencia.
- **Calendario unificado:** vuelos pagados, posts orgánicos y contenido evergreen en una sola vista y un solo reader.

### 4.8 Fuera de alcance ahora

- Portal de revisión para el cliente.
- Mercados y localización (Sky en Chile, Perú y Colombia): follow-up. El diseño deja el mercado como dimensión
  separada del canal para no tener que migrar después.
- Escrituras en plataformas publicitarias (lanzar, pausar, presupuesto).

## 5. Niveles de riesgo

| Nivel | Qué cubre | Cómo se ejecuta | Ejemplos |
|---|---|---|---|
| **T0 — lectura** | Cualquier lectura | Directa; anti-oráculo por organización | Plan, matriz, catálogo de canales, snapshots SEO, métricas, aprendizajes, informe semanal |
| **T1 — borrador o edición reversible** | Crear y editar borradores; cambios reversibles sin gasto ni efecto externo | Ejecución directa, **idempotente** (`Idempotency-Key`), `If-Match` por `revision`, `audit_event`, **actor = persona** (canal y origen registrados) | Borrador de plan, ítem de contenido, copy en borrador, audiencia de canal, hipótesis, experimento en diseño, aprendizaje propuesto, versión nueva del catálogo de canales (capability restringida) |
| **T2 — aprobación, publicación, gasto, destructivo** | Todo lo que aprueba, publica, gasta, conecta credenciales externas o destruye | `dryRun` → digest de la propuesta → **confirmación explícita de una persona** → ejecución; actor = la persona por identidad delegada | Aprobar plan, brief, versión o presupuesto; autorizar medios; rastrear palabras clave o declarar competidores (en Greenhouse); conectar cuenta publicitaria; archivar o retirar |

- El nivel lo declara el registro de operaciones y lo aplica el command; un cliente no puede degradarlo.
- La mecánica de escritura MCP es la de TASK-1899: clase de scope de escritura de Studio, canje por capability exacta,
  token delegado revalidado por Studio. Una operación que **mueva dinero** en una plataforma externa, cuando exista,
  tendrá su propia clase de scope (una por clase de radio de impacto).

## 6. Consecuencias

**Positivas.** Cada pieza responde a una persona, una etapa, un mensaje y una meta; el hueco de producción se ve antes
de la fecha; SEO/AEO deja de ser un informe aparte y se vuelve parte del plan; los agentes operan Studio completo con la
misma garantía que la UI; la IA acelera sin volverse autoridad; el aprendizaje de una campaña alimenta la siguiente.

**Negativas y riesgos, con su mitigación:**

| Riesgo | Mitigación |
|---|---|
| Studio depende de Greenhouse para resolver ICP y SEO | Referencias por id + versión y snapshots fechados: si el lane falla, el plan sigue legible y la fuente degrada como «no disponible», nunca como cero |
| El catálogo de ICP no existe todavía | Se construye en Greenhouse como capacidad propia; hasta entonces el plan admite referencias pendientes visibles, nunca personas locales |
| Especificaciones de plataforma cambian | Fuente y fecha por especificación; versión fijada por registro; señal de «validado con especificación anterior» |
| Migración de canal libre | Expand → backfill revisado por persona → contract posterior al release; lo no mapeado queda visible |
| Fatiga de confirmaciones | Sólo `T2` confirma; `T1` fluye con auditoría |
| IA que inventa pruebas o cifras | Procedencia obligatoria; *proof point* sin fuente bloquea la aprobación; aprendizaje sin evidencia no se usa |
| Fuga de datos competitivos | Lanes competitivos sólo `internal`; snapshot hereda la clasificación |
| Costo de modelo | Agentes primero; en producto, techo por organización |

**Neutras.** El brief sigue siendo la entrada humana; el plan de medios y los tres estados de campaña no cambian.

## 7. Evaluación en cuatro pilares

| Pilar | Evaluación |
|---|---|
| **Seguridad** | Actor = persona en toda escritura; `T2` con digest y confirmación; nivel fijado por registro; lanes competitivos sólo `internal`; nada de gasto con identidad de servicio; anti-oráculo por organización |
| **Robustez** | Idempotencia y `If-Match` en `T1`/`T2`; validación de canal al escribir; referencias versionadas (ICP, catálogo); procedencia inmutable; test de paridad que rompe el build |
| **Resiliencia** | Snapshots mantienen el plan legible si Greenhouse o una plataforma fallan; degradación honesta por fuente; capacidades apagables por flag; migración reversible hasta el contract |
| **Escalabilidad** | Catálogo y referencias por organización (segundo consumidor); lecturas en vivo sólo para seguimiento; costo de IA fuera de Studio mientras sea por agentes; mercado como dimensión preparada |

## 8. Invariantes para agentes

- **NUNCA** una capacidad sólo en la UI: toda acción de la UI tiene command, ruta `/api/v1`, entrada en el registro y tool MCP (o exclusión razonada).
- **NUNCA** una tool sólo de lectura cuando la UI escribe esa misma capacidad.
- **NUNCA** una operación sin nivel de riesgo declarado en el registro, ni un cliente que lo degrade.
- **NUNCA** registrar al gateway, a un agente o a un modelo como actor de una escritura: el actor es la persona.
- **NUNCA** un ICP paralelo en Studio (segmentos, personas o JTBD locales): se referencia el catálogo de Greenhouse por organización, versión e id.
- **NUNCA** mezclar etapa del bow-tie y fase creativa del embudo en un mismo campo.
- **NUNCA** leer Search Visibility 360 (ni ningún dato de Greenhouse) por SQL: sólo lanes ecosystem o MCP.
- **NUNCA** presentar un snapshot de planificación como dato actual, ni recalcular en Studio una métrica que SV360 ya calcula.
- **NUNCA** mostrar data de lanes competitivos en una superficie que vea el cliente.
- **NUNCA** ejecutar desde Studio, con su identidad de servicio, una acción que gaste presupuesto de proveedor (rastrear palabras clave, declarar competidores, diagnósticos).
- **NUNCA** IA que apruebe, publique o gaste sola; **NUNCA** reescribir en su lugar un copy aceptado.
- **NUNCA** una línea de presupuesto `actual` que no venga de un readback observado.
- **NUNCA** codificar mercado o idioma dentro de la clave de canal.
- **SIEMPRE** canal del catálogo (`channel_key`) en copy, pieza, anuncio, audiencia y presupuesto, con la versión de catálogo contra la que se validó.
- **SIEMPRE** procedencia completa en todo borrador de IA (modelo, instrucción, fuentes, quién aceptó y cuándo).
- **SIEMPRE** `dryRun` → digest → confirmación explícita de una persona en `T2`.
- **SIEMPRE** evidencia en cada *proof point* y en cada aprendizaje; sin evidencia, no se aprueba ni se usa como hecho.
- **SIEMPRE** ausencia ≠ cero: meta sin medición, gasto sin readback o métrica sin snapshot se muestran como «sin dato».

## 9. Mapa de implementación

Las tasks por tema las crea el EPIC-049; este ADR no fija sus IDs.

| Tema | Qué entrega |
|---|---|
| Canales + referencia ICP | Catálogo de canales versionado y validación al escribir; migración `channel` → `channel_key`; catálogo de modelo de cliente por organización en Greenhouse con lane + tool; referencias ICP en campaña y audiencias |
| Plan de campaña | Plan con estrategia, matriz, casa de mensajes, plan de contenidos con hueco visible, plan de medición y programa opcional; commands `T1`/`T2` |
| Plan SEO/AEO con SV360 | Referencias + snapshots fechados; ciclo de seguimiento por lanes; propuestas de rastreo ejecutadas por el command dueño |
| IA agéntica + procedencia | Skills y tools para borradores; modelo de procedencia; puerto de proveedor y techo de costo para la etapa en producto |
| Medición, gasto y aprendizajes | Readback Meta/LinkedIn; atribución HubSpot por Greenhouse; experimentos; biblioteca de aprendizajes; chequeo de destino; calendario unificado |
| TASK-1894 | Commands de escritura, brief como entidad, corte por campaña (base de los commands de este ADR) |
| TASK-1899 | Mecánica MCP de escritura y aprobación (scope, canje por capability, token delegado, `dryRun` → confirmación) |
| TASK-1895 | UI de edición, revisión y métricas, consumidora de los mismos commands |
| TASK-1892 | Métricas desde Greenhouse (GSC, GA4, SV360 por landing) y consumer/bindings de Studio |

## 10. Rollback

- Cada capacidad nueva nace detrás de flag y se apaga sin borrar datos (plan, referencias, snapshots y aprendizajes
  quedan legibles).
- La migración de canal es reversible hasta el paso de contract: el texto libre convive con `channel_key`.
- Las tools de escritura se retiran de la federación y el scope de escritura se revoca sin tocar las lecturas.
- La IA en el producto se apaga por flag; la operación por agentes depende de las mismas tools y sigue sus reglas.

## 11. Preguntas abiertas (deliberadamente no decididas aquí)

1. **Forma y dueño exacto del catálogo de modelo de cliente en Greenhouse** (dominio comercial o growth, tablas,
   quién publica versiones y con qué capability).
2. **Qué binding usa Studio** para planificar campañas de Efeonce con lanes competitivos (`internal`) versus campañas de
   clientes (binding por organización), y cómo la UI separa ambas superficies.
3. **Cómo la UI de Studio dispara un `T2` en Greenhouse** (p. ej. rastrear palabras clave) con la identidad de la
   persona: vía la tool de Greenhouse directamente o vía el lane app con token delegado.
4. **Límites de copy duros vs recomendados por plataforma** y quién mantiene el catálogo al día.
5. **Nexa como cliente:** si opera Studio a través del gateway MCP o de un canal propio; en ambos casos, con las mismas
   tools y niveles.
6. **Modelo de proveedor para la IA en producto** y línea base de evaluación por tarea.
7. **Atribución multi-toque** más allá de `utm_campaign` (hoy fuera de alcance).
8. **Mercados y localización** (Sky CL/PE/CO): catálogo de canales por mercado, copys por idioma y metas por país.

## 12. Revisar cuando

- Una segunda organización (cliente) planifique campañas en Studio: validar ICP por organización, canales activos y
  separación de data competitiva.
- La IA en el producto pase de agentes a botones en la UI.
- Aparezca la necesidad de escribir en plataformas publicitarias (lanzar, pausar, presupuesto).
- El volumen de confirmaciones `T2` frene el trabajo diario.

## 13. Referencias

- [Arquitectura de Marketing Studio](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) §3.1 «Capa de estrategia»
- [ADR fuente única e ingesta](EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md)
- [ADR API-first de Studio](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md)
- [Full API Parity](../GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
- [Search Visibility 360](../GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (entitlements §9, cola priorizada §18)
- [ICP, buyer personas y JTBD](../../context/13_icp-buyer-personas-jtbd.md) · [HubSpot y bow-tie](../../context/11_hubspot-bowtie.md)
- [Invariantes de superficie MCP](../agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md)
- [`EPIC-049`](../../epics/in-progress/EPIC-049-efeonce-marketing-studio-platform.md) · TASK-1892 · TASK-1894 · TASK-1895 · TASK-1899 (en `docs/tasks/to-do/`)
