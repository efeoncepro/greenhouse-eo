# Efeonce Marketing Studio — Capa de estrategia: canales, ICP, plan de campaña, SEO/AEO, IA y paridad total (ADR)

## Decisión vigente 2026-10-04 — TASK-1899 retirada

El operador retira TASK-1899 para preservar libertad de implementación en la etapa actual de Studio. Se anula
su condición de requisito previo y la obligación de cerrar cada entrega API/CLI/UI con escrituras MCP operativas.
La ruta de desarrollo de activaciones pasa a **TASK-1905 → TASK-2001 → TASK-2002**, respetando sus dependencias
funcionales. TASK-1899 y su implementación local quedaron retiradas sin rollout. TASK-2003 toma el carril de
identidad delegada y escrituras MCP T1 en paralelo; no es requisito para entregar API/CLI/UI. La confirmación T2
por digest propuesta en TASK-1899 queda como diseño histórico, sin contrato operativo vigente. Se mantienen
API-first, paridad del registro y controles de acceso; una tool declarada no acredita federación ni una sesión MCP.
El release de Studio del mismo día es independiente y se documenta con su alcance en cada sección vigente.


> **Status:** `Accepted` (2026-09-26), actualizado 2026-10-04: catálogo y validación TASK-1905 desplegados en Studio;
> ICP real, activaciones, federación MCP y demás capacidades conservan sus dependencias y gates.
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
  las aprobaciones» (TASK-1894; consumo MCP T1 por TASK-2003). El operador la endurece: los agentes (Claude, Codex, Nexa) tienen que poder
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
  `exclusion` con razón; y manifiesto generado para Efeonce MCP. Federación, autoridad y canary son gates
  del carril MCP; su ausencia no bloquea entregar API/CLI/UI (decisión 2026-10-04).
- **La UI escribe sólo a través de esos commands.** Ninguna Server Action ni handler propio de pantalla contiene lógica
  de dominio que no tenga su operación en el registro.
- **Nivel de riesgo por operación.** Cada operación del registro declara su nivel (§5): `T0`, `T1` o `T2`. El nivel no
  lo decide el cliente que llama: lo fija el registro y lo aplica el command.
- **Los agentes ejecutan, no sólo leen.** Claude, Codex y Nexa pueden ejecutar toda acción que la UI permite, con la
  identidad delegada de la persona cuando el carril T1 de TASK-2003 esté operativo: clase de scope de escritura,
  canje por capability y token delegado revalidado por Studio. El actor auditado es siempre la persona; el agente queda registrado como
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
| **T2 — aprobación, publicación, gasto, destructivo** | Todo lo que aprueba, publica, gasta, conecta credenciales externas o destruye | **Confirmación explícita de una persona** en el carril autorizado. Runtime: operador CLI con `--apply --confirm`; HTTP rechaza T2. El digest delegado de TASK-1899 es diseño retirado | Aprobar plan, brief, versión o presupuesto; autorizar medios; rastrear palabras clave o declarar competidores (en Greenhouse); conectar cuenta publicitaria; archivar o retirar |

- El nivel lo declara el registro de operaciones y lo aplica el command; un cliente no puede degradarlo.
- La escritura MCP T1 corresponde a TASK-2003: clase de scope, canje por capability exacta y token delegado
  revalidado por Studio. TASK-1899 está retirada; no hay confirmación T2 delegada operativa. Una operación que **mueva dinero** en una plataforma externa, cuando exista,
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
| TASK-1899 | Retirada 2026-10-04; diseño histórico sin gate sobre API/CLI/UI |
| TASK-2003 | Carril paralelo de identidad delegada y escritura MCP T1; federación por verificar |
| TASK-1895 | UI de edición, revisión y métricas, consumidora de los mismos commands |
| TASK-1892 | Métricas desde Greenhouse (GSC, GA4, SV360 por landing) y consumer/bindings de Studio |

## 10. Rollback

- Cada capacidad nueva nace detrás de flag y se apaga sin borrar datos (plan, referencias, snapshots y aprendizajes
  quedan legibles).
- La migración de canal es reversible hasta el paso de contract: el texto libre convive con `channel_key`.
- Las tools de escritura se retiran de la federación y el scope de escritura se revoca sin tocar las lecturas.
- La IA en el producto se apaga por flag; la operación por agentes depende de las mismas tools y sigue sus reglas.

## 11. Preguntas abiertas (deliberadamente no decididas aquí)

> Resoluciones del operador (Julio Reyes) del 2026-09-26 marcadas en cada punto; el cuerpo del ADR no cambia.
> Decisiones del mismo día que precisan tasks sin ser preguntas de esta sección: `studio.voice_rules.publish` es `T2`
> (TASK-1909); el canje de `marketing_studio.integration.manage` verifica la acción única `update`, y conectar y revocar
> son `T2` (TASK-1910; la mecánica TASK-1899 citada entonces fue retirada el 04/10).

1. **Forma y dueño exacto del catálogo de modelo de cliente en Greenhouse** (dominio comercial o growth, tablas,
   quién publica versiones y con qué capability).
   **Resuelto en parte (2026-09-26):** se crea la clase de scope `efeonce.mcp.commercial.write`; publica el modelo de
   una organización cliente `efeonce_account` y el de la organización propia de Efeonce `efeonce_admin` (TASK-1906).
   Dominio y tablas los fija TASK-1906.
2. **Qué binding usa Studio** para planificar campañas de Efeonce con lanes competitivos (`internal`) versus campañas de
   clientes (binding por organización), y cómo la UI separa ambas superficies.
3. **Cómo la UI de Studio dispara un `T2` en Greenhouse** (p. ej. rastrear palabras clave) con la identidad de la
   persona: vía la tool de Greenhouse directamente o vía el lane app con token delegado.
4. **Límites de copy duros vs recomendados por plataforma** y quién mantiene el catálogo al día.
   **Resuelto quién lo mantiene (2026-09-26):** `efeonce_operations`, con `efeonce_admin`; son los únicos grants de
   `marketing_studio.catalog.manage` (TASK-1905). **Actualización 2026-10-04:** hard/recommended implementados por
   campo, formato y placement, con fuente y fecha; no se extrapolan a toda la plataforma. La cadencia operativa
   de revisión sigue por definir.
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


## 14. Precisión aceptada 2026-10-04 — flujo editorial en Marketing Studio

**Status:** `Accepted` (2026-10-04). **Decider:** Julio Reyes, al ratificar «hagamos todos los ajustes»
tras el análisis de ownership SEO/Studio/Insights. **Scope:** reconciliación del programa y contratos
documentales, sin implementación, deploy, publicación ni nueva verificación runtime. Esta precisión
complementa la decisión aceptada del 2026-09-26 y conserva sus texto/contexto históricos.

El flujo editorial SEO se construye en **Marketing Studio**: plan, brief, trabajo/asignación, producción,
QA, aprobación, calendario, evidencia observada de publicación e iteraciones. **SV360/Greenhouse** conserva
captura, hechos y metodología SEO/AEO, acceso, gasto, cola priorizada y medición/outcomes. **Efeonce Insights**
conserva snapshots de informe, render, grants y distribución; ningún flujo crea otro motor de informes.
El CMS/Content Factory conserva su contrato y autoridad de write/readback: Studio lo integra por un
adapter gobernado, no convierte una aprobación de trabajo en permiso automático para publicar.

| Task existente | Dueño y contrato pendiente | Dependencia de foundation |
|---|---|---|
| TASK-1667 (EPIC-049) | Especialización editorial SEO: brief, draft/private CMS handoff, QA/aprobación/receipt y readback de publicación | TASK-1908 + TASK-1913; kernel/autoridad TASK-1894; consumo MCP T1 por TASK-2003 |
| TASK-1668 (EPIC-022) | Indexación/outcome SEO desde referencias de publicación Studio; baseline/ventana/cobertura/metodología | GSC/rank y receipt1667; AEO/GA4 opcionales por eje, con degradación explícita |
| TASK-1669 (EPIC-049) | Plan diario SEO advisory, consume cola1700 y estado Studio/outcome | TASK-1908 + TASK-1913/1914/1915; no segundo orquestador ni Nexa runtime |
| TASK-1907 / 1912 | Plan de contenidos y UI consumidores de referencias/work/brief/QA | Foundation propia; no lifecycle ni reglas de negocio paralelos en la UI |
| TASK-1909 / 1911 | Procedencia y aprendizaje/calendario con refs de ejecución y outcome | Consumer de hechos, no recálculo de métricas ni causalidad automática |

### Invariantes de esta precisión

- **Un lifecycle editorial:** reutilizar `studio.work_item*` de TASK-1913. No crear `seo_editorial_work_items`
  ni endpoints Greenhouse para gobernar producción, QA o publicación. Iteración = nuevo trabajo Studio
  referenciado al anterior. QA/estado de publicación especializado no sustituye la state machine genérica.
- **Un registry/dispatcher:** TASK-1914/TASK-1915 poseen roles/runs/provider ports/programas. TASK-1669
  especializa el rol SEO/AEO y su deliverable; no crea tablas de agentes, feedback o runtime en Greenhouse/Nexa.
- **Una prioridad:** la secuencia del plan es subsecuencia en orden de `readSeoWorkQueue` (TASK-1700), con
  versión/hash/as-of/expiry y `alsoSurfacedBy`. Aceptar en la cola no ejecuta trabajo; feedback usa su command.
- **Referencias reproducibles:** sujeto durable y snapshot/item de decisión separados; datos actuales por lanes
  autorizados; snapshots fechados sólo como evidencia de planificación. Nada de SQL entre Studio y SEO/AEO.
- **Brief completo:** cinco insumos SEO (`fanOutSubQuestions`, `serpFormat`, `categoryAnswerPages`, `targetUrl`,
  `requiredEntities`) con fuente/as-of; ausencia null/[] con razón; refresh/fix sin URL/owner bloquea handoff.
  Intención declarada y estimada separadas; NULL no implica oportunidad. Consolidar es una acción explícita.
- **CMS seguro:** un único adapter dueño, `ContentFactoryBrief.v1` donde aplique, handoff draft/private
  idempotente; publish/timeout ambiguo bloquean. QA, approval humano, receipt y readback independientes;
  en V1 el publish externo lo realiza el operador CMS. HTTP200/publicado no prueban indexación.
- **Medición honesta:** D-3 para GSC; posición ponderada por impresiones; AEO por prompt/motor; métodos ETV
  incompatibles no se comparan; baseline/cobertura ausentes no son cero ni éxito; GA4/HubSpot ausentes
  hacen el loop de negocio explícitamente parcial; sin causalidad automática.
- **Autoridad y paridad:** persona delegada/tenant/capability y clasificación de fuente se preservan; misma
  lógica server-side por API/operations/MCP/UI. IA advisory, costo bounded y comandos mutantes del dueño
  con sus gates. No nueva autorización para gasto, CMS publish, secrets, cron o release.

### Estado de implementación y trazabilidad

Los work items, roles/dispatcher y especializaciones continúan en `to-do`; no se cierra ninguna task
por esta reasignación. TASK-1908 no queda bloqueada por outcome1668: puede planificar antes de medir;
TASK-1915 no queda bloqueada por especialización1669. Las ramas futuras declaran dependencia por slice
para evitar ciclos artificiales. No se crea una task nueva para el CMS: TASK-1667 conserva ese alcance.

[Snapshots íntegros anteriores y manifiesto](../../audits/seo/editorial-history/2026-10-04/README.md)
preservan las tres specs sustituidas byte-for-byte; son historia no ejecutable, no arquitectura vigente.

## 15. Precisión aceptada 2026-10-04 — taxonomía de canales y activaciones

Decisión del operador (Julio Reyes, 2026-10-04), redactada por Claude. Precisa §4.2 (catálogo de canales); no cambia
ninguna otra decisión. Los nombres van en el spanglish que usa el equipo de marketing: los términos de industria se
dejan en inglés.

**La campaña es el objeto canónico.** Todo lo que se publica, se pauta, se envía o se mide en un canal es una
**activación** de una campaña: un post orgánico, un anuncio dentro de un flight, un envío de email, un artículo del
blog, una colaboración con un creator. **No existe activación sin campaña.** El contenido permanente se modela como
campaña **Always On** (p. ej. «Marca Efeonce · Always On · Q4 2026»), con la misma estructura que cualquier otra.

**Cuatro dimensiones independientes** (antes mezcladas en el texto libre `channel`):

| Dimensión | Pregunta | Valores semilla |
|---|---|---|
| **Modalidad** | ¿Cómo se gana la atención? | `paid` · `organic` (perfiles propios en plataformas de terceros) · `owned` (lo que se controla completo) · `earned` (lo que otros dicen o hacen por la marca) |
| **Familia** | ¿Qué tipo de medio? | Social · Search · Display · Video (incl. CTV/OTT) · Email · Messaging · Web & Content · Community · Creators & Influencers · PR & Media · Audio · OOH/DOOH |
| **Plataforma** | ¿Dónde aparece? | Google · Bing · Instagram · Facebook · Threads · LinkedIn · TikTok · YouTube · X · Reddit · WhatsApp · ChatGPT · Gemini · Perplexity · Spotify · sitio web · HubSpot (email)… |
| **Placement** | ¿En qué lugar exacto? | Feed · Stories · Reels · SERP · AI Overviews / AI Mode · respuestas IA · Shopping · Discover · Performance Max · Audience Network · inbox… |

Más tres atributos de la activación que **no** son canal: **cuenta / voz** (página de Efeonce, perfil personal de
Julio, cuenta publicitaria de Meta, handle del creator), **mercado** (país e idioma; §4.2 ya prohíbe codificarlo en el
canal) y, en las activaciones `paid`, **buying method**:

| Buying method | Qué es | Ejemplos |
|---|---|---|
| `platform` | Compra self-serve en la plataforma dueña del inventario | Meta Ads, Google Ads, Microsoft Ads, LinkedIn Ads, TikTok Ads, ChatGPT Ads |
| `programmatic` | Compra por un DSP sobre inventario de terceros | DV360, The Trade Desk, Amazon DSP, Microsoft Curate |
| `direct` | Compra directa al publisher con orden de inserción | un medio, un podcast, una pantalla DOOH |

**Programmatic no es familia ni plataforma: es buying method.** Cruza familias (Display, Video incl. CTV/OTT, Audio,
OOH/DOOH, native): la familia es el formato comprado, la plataforma de compra es el DSP y la plataforma de aparición es
el inventario del publisher (sitios de medios, apps de CTV, Spotify, pantallas DOOH). El **deal type** (`open_auction` ·
`pmp` · `programmatic_guaranteed`) es dato del anuncio, no del canal. Así un banner comprado en DV360 y uno en la Google
Display Network son la misma familia con distinta plataforma de compra, y se comparan por familia.

**Plataforma de compra ≠ plataforma de aparición.** En paid, la compra se hace en una plataforma (Meta Ads, Google Ads,
Microsoft Ads, LinkedIn Ads, TikTok Ads, ChatGPT Ads, o un DSP como DV360) y aparece en una o varias: una campaña de
Meta Ads sale en Instagram, Facebook y Threads; una de DV360, en sitios, apps de CTV o Spotify. El catálogo modela ambas.

**Combinaciones de referencia:**

| Modalidad | Familia | Plataformas | Nota |
|---|---|---|---|
| paid | Social | Meta Ads (Instagram, Facebook, Threads), LinkedIn Ads, TikTok Ads, Reddit Ads | Audience Network es un *placement* de Meta, no Display |
| paid | Search | Google Ads, Microsoft Ads (Bing), **ChatGPT Ads** | Los anuncios en respuestas de IA son paid search (decisión del operador); disponibilidad por mercado y formato se verifican con fuente y fecha al sembrar |
| paid | Display | Google Display Network (`platform`); sitios de medios vía DV360 o The Trade Desk (`programmatic`); un medio por orden de inserción (`direct`) | Display **no** es una variante de social |
| paid | Video | YouTube (Google Ads, `platform`); CTV/OTT vía DSP (`programmatic`) | — |
| paid | Audio | Spotify Ads (`platform`); audio y podcasts vía DSP (`programmatic`) o directo (`direct`) | — |
| paid | OOH/DOOH | Pantallas DOOH vía DSP (`programmatic`) o al operador (`direct`) | — |
| paid | Creators & Influencers | Partnership Ads / Spark Ads / whitelisting | Anuncio pagado con la identidad del creator: cuenta = handle del creator |
| organic | Social | Instagram, Facebook, Threads, LinkedIn, TikTok, YouTube, X | Lo que hoy se agenda en Metricool; el perfil personal de LinkedIn es una **cuenta** de LinkedIn orgánico, no otro canal |
| organic | Search | Google y Bing (SEO); ChatGPT, Gemini, Perplexity, AI Overviews (AEO) | AEO vive dentro de Search, placement «respuestas IA» |
| organic | Community | Comunidades de terceros (Reddit, grupos de LinkedIn, foros) | La marca participa con su cuenta |
| owned | Web & Content | Blog, landings, `think.efeoncepro.com` | — |
| owned | Email | HubSpot | — |
| owned | Community | Comunidades propias (WhatsApp Community, Slack, Discord, Circle) | — |
| owned | Messaging | WhatsApp Business | — |
| earned | PR & Media | Medios, podcasts, menciones | Se mide, no se programa |
| earned | Search | Citas y menciones en respuestas de IA | La evidencia viene de Search Visibility 360 por lane, nunca por SQL |
| earned | Creators & Influencers | Seeding / gifting sin pago, menciones espontáneas | — |

**Comunidades, influencers y UGC:**

- **Community** es una familia: `owned` cuando la comunidad es nuestra; `organic` cuando la marca participa en una
  ajena; lo que la comunidad dice sola es `earned`.
- **Creators & Influencers** es una familia cuya modalidad depende del trato: colaboración pagada en el perfil del
  creator o Partnership Ads = `paid`; seeding o gifting sin pago y menciones espontáneas = `earned`.
- **UGC no es un canal: es el origen de la pieza.** Una pieza UGC puede salir como paid (anuncio con contenido de
  cliente o de creator) o como organic (repost). Se registra en la pieza como **content source** (`brand` · `creator` ·
  `ugc` · `ai_generated`), junto a sus derechos de uso (`rights.licenseKind`), nunca dentro de `channel_key`.

**Calendario: es de Studio; la ejecución es evidencia** (decisión del operador 2026-10-04). El calendario muestra el
**plan** de activaciones de Studio, no el reflejo de una herramienta. Cada activación lleva campaña, modalidad, familia,
plataforma, placement, cuenta, mercado, pieza(s) en su versión exacta, copy y **fecha planificada**; una orgánica es un
**punto** (fecha y hora) y una pagada una **franja** (el flight). Se filtra por las cuatro dimensiones.

Las herramientas que ejecutan (Metricool para organic; Meta Ads, Google Ads, LinkedIn Ads o un DSP para paid) **no
definen el plan**: aportan **evidencia de ejecución** que se adjunta a la activación como atributo (referencia en la
herramienta, fecha programada allí, fecha observada de publicación, permalink). Studio compara plan contra ejecución:

| Estado de ejecución | Cuándo |
|---|---|
| `planned` | En el plan; ninguna herramienta la tiene programada |
| `scheduled` | La herramienta la tiene programada en la fecha del plan (dentro de la tolerancia del canal) |
| `scheduled_off_plan` | Programada, pero en otra fecha u hora que la planificada |
| `published` | La plataforma confirma que salió (fecha y permalink observados) |
| `overdue` | Pasó la fecha del plan sin evidencia de publicación |
| `cancelled` | La activación se canceló en Studio |

Lo que una herramienta tiene programado **sin** activación no se convierte en plan por sí solo: aparece en «Hoy» como
**ejecución sin activación** y una persona la vincula a una activación existente o crea la activación con su campaña.
Programado sigue sin ser publicado (invariante vigente): sólo la observación con fecha dice qué pasó.

**Medición: UTM derivadas de la activación** ([RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md),
as of 2026-10-04). Las UTM siguen siendo la única señal de origen que leen GA4, HubSpot y el warehouse sin integración y
que sobrevive a la eliminación de click IDs en Safari. Studio genera la tracking URL de cada activación; nadie escribe
UTM a mano: `utm_source` = plataforma de aparición, `utm_medium` derivado de modalidad × familia y compatible con el
agrupamiento por defecto de GA4 (`paid_social`, `social`, `cpc`, `display`, `paid_video`, `email`), `utm_campaign` =
slug de la campaña, `utm_id` = id de la campaña, `utm_content` = id de la activación, `utm_source_platform` = plataforma
de compra en paid. Google Ads con auto-tagging (sin UTM o con el set completo, nunca parcial); nunca UTM en enlaces
internos; lo que GA4 no tiene como canal se resuelve con un custom channel group, no inventando mediums.

**Origen de cada UTM.** Una sola función de dominio (`buildTrackingUrl`) genera la URL de cada activación; el origen,
el responsable y el ciclo de vida de cada valor (catálogo → campaña → activación; snapshot que se congela con la primera
evidencia de ejecución; comparación con lo publicado) están especificados en RESEARCH-012 §Origen y ciclo de vida.

**API parity y estado MCP** (decisión vigente 2026-10-04). Cada capacidad de taxonomía, activaciones, calendario
o UTM nace en el contrato API y declara tool o exclusión. API/CLI/UI puede entregarse en su alcance sin MCP
operativo: TASK-2003 corre en paralelo. Para declarar MCP operativo sí se requiere tool federada, identidad
delegada y prueba de sesión real. T2 conserva confirmación humana en los carriles habilitados; la CLI HTTP
no convierte `--confirm` en autoridad remota.

**Implementación.** TASK-1905 siembra el catálogo con estas dimensiones (`channel_key` = modalidad × familia ×
plataforma de compra o aparición, sin mercado ni buying method; placements y formatos como datos del canal), registra
`content source` en la pieza y agrega `buying method` y `deal type` al anuncio (`ad_configuration`) y a la línea de
presupuesto (`budget_line`). La entidad *activación*, la evidencia de ejecución, el descubrimiento de lo agendado en Metricool y el calendario
son TASK-2001 (contrato) y TASK-2002 (UI); toman el calendario unificado de TASK-1911 y siguen pendientes.
El catálogo y sus campos de apoyo sí están desplegados por TASK-1905; no equivalen a activaciones operativas.


### Delta de implementación y release — TASK-1905 (2026-10-04)

El catálogo, sus commands y readers, el validador transaccional, alias/backfill, findings/revalidación y las referencias
ICP tienen implementación. El release Studio `74073de` desplegó API 1.6.0 y catálogo publicado v1 de 52 canales;
web y worker mantienen validación `warn` y customer model desactivado. Las escrituras conservan el literal histórico junto a la clave resuelta y la versión;
`STUDIO_CHANNEL_VALIDATION_MODE` admite `off`, `warn` (default) y `enforce`. ICP sigue desactivado por defecto y su reader
real depende de TASK-1906 + TASK-1892; una referencia pendiente explícita funciona sin inventar segmentos ni personas.

La capability `marketing_studio.catalog.manage` se limita a admin/operations con acciones create/update. Su migración
Greenhouse sigue pendiente; gobierno global sólo admite `operator_cli` sin restricción organizacional. Las dos
migraciones Studio y el seed se aplicaron en staging y producción; el backfill no. El dry-run productivo identificó
134 registros sin mapear. Greenhouse y gateway no se desplegaron. TASK-2003 corre en paralelo; no se afirma federación T1 ni canary MCP.
Activaciones/calendario/URLs de tracking derivadas siguen en TASK-2001/TASK-2002.

Detalle: [contrato funcional](../../documentation/marketing-studio/catalogo-canales-y-referencias-icp.md),
[manual de catálogo](../../manual-de-uso/marketing-studio/gobernar-catalogo-canales.md) y
[verificación local previa](../../audits/marketing-studio/TASK-1905-local-verification.md) y
[release autorizado](../../audits/marketing-studio/TASK-1905-release-2026-10-04.md). La
[CLI HTTP local](../../manual-de-uso/marketing-studio/operar-por-cli-api.md) materializa API-first sin agregar autoridad.

### Precisión de implementación 2026-10-04 — activaciones y blog

Los Delta del operador en TASK-2001 precisan §15: paid delivering/ended observados; tolerancia 0 días; mercado por
activación y zona IANA de cuenta; CMS del cliente y sitio separados; Notion sólo como draft_url. Sin reader CMS,
URL pública más fecha confirmada por una persona, con evento, puede establecer publicación. El freeze de tracking
ocurre con publicación/entrega, no con mera programación. La implementación local y límites de rollout están en
[arquitectura](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md#delta-2026-10-04--task-2001-implementada-localmente).
El follow-up SEO/AEO conserva SV360 estimado, panel IA por clúster y gate informativo con autorización personal que
registra avisos. No altera la prohibición de publicar desde Studio en TASK-2001.

### Delta de decisión 2026-10-04 — email con varios proveedores

El operador amplía §15: Resend será la ruta de mayor volumen; Studio debe soportar también HubSpot, Salesforce
Marketing Cloud Engagement y Marketing Cloud Next mediante adapters separados. Email es la familia, proveedor
es una dimensión de cuenta/evidencia; no se infiere la cuenta por cliente ni se hace failover automático.

Una activación representa un envío de campaña con evidencia y completitud explícitas; un destinatario enviado no
acredita todo el lote. Preservar programado/aceptado/enviado/entregado como hechos distintos, paginación y
reconciliación. Greenhouse mantiene credenciales y hechos de correo; Studio consume una proyección autorizada sin
replicar destinatarios. Resend reusa el pipeline/inbox existente cuando haya relación explícita a campaña.

Catálogo aditivo versionado; conservar owned_email_hubspot y tracking histórica. API/MCP/CLI comunes sin commands
por vendor. La implementación de esta ampliación está pendiente; estado y AC en el delta email de TASK-2001.


### Alcance ejecutable 2026-10-04 — owned email y CMS

Decisión del operador: Resend y HubSpot se conectan; Marketing Cloud Engagement/Next se preparan como proveedores
separados, sin lector ni certificación live por falta de entorno. Sólo se conecta WordPress de efeoncepro.com;
CMS por cuenta y fallback público conservan el contrato para otros clientes. Flags nuevas OFF de fábrica.

El puerto Greenhouse `GET /api/integrations/v1/sister-platforms/marketing-studio/email-evidence` reutiliza el
consumidor, binding, revocación, rate limit y auditoría de sister platforms. Exige scope organization y coincidencia
de organización/proveedor/cuenta con configuración del servidor; un registro de cuenta Studio nunca concede acceso.
Las dos credenciales canónicas actuales se ligan a una sola cuenta cada una, sin defaults cross-tenant. Más cuentas
requieren ampliar el resolver gobernado. Este puerto es transporte interno de worker, excluido de MCP por no ser
una operación de usuario: la capacidad está cubierta por los readers de evidencia registrados en Studio.

Resend lee broadcasts nativos paginados; sólo `status=sent` más `sent_at` prueba envío completo. No importa mensajes
transaccionales del pipeline Greenhouse ni interpreta `priority=broadcast` como vínculo de campaña. Cuando los
futuros envíos de marketing usen ese pipeline, deben incorporar el vínculo explícito de campaña/activación antes
de sumar su proyección; no se duplica el inbox/webhook ni el dispatch existente.

HubSpot lee BATCH_EMAIL no transaccional, verifica portal real, pagina emails y eventos SENT, elimina destinatarios
y exige conteos terminales y todos los eventos de envío. `publishDate` sirve para fecha planificada sólo con estado
SCHEDULED; jamás prueba envío. La última fecha SENT acredita la terminación; opens/delivered no sustituyen SENT.
La paginación se reconstruye sobre hosts fijos; no se siguen URLs del proveedor. Crawls truncados o excedidos
fallan sin aplicar observaciones y dejan aviso de reader. Presupuesto por página Greenhouse: 45 s; máximo 100 páginas
de eventos por campaña y 100 páginas de emails por corrida; superar el límite requiere segmentar el adapter,
no afirmar completitud. No se crean audiencias, envíos ni publicaciones.

Fuentes verificadas 2026-10-04: [Resend broadcasts](https://resend.com/docs/api-reference/broadcasts/list-broadcasts),
[HubSpot marketing emails](https://developers.hubspot.com/docs/api-reference/legacy/marketing/marketing-emails/get-email).


## Delta 2026-10-05 — lectura de hojas owned (TASK-2001, Accepted)

Decisión del operador: extender lectura de activaciones para hojas email y landing de TASK-2002, sin tocar UI.
Contrato aditivo API 1.9.0, `ActivationDto.email` / `web`, registrado en operations y proyectado igual en detalle,
calendario, HTTP, MCP y CLI. [Contrato exacto, fuentes y evidencia](../../audits/marketing-studio/TASK-2001-activation-reader-sheets-2026-10-05.md).

Se conserva una sola lectura de metadata/métricas en `execution_record.email_evidence.details`; la completitud
observada del envío no se revoca por un readback parcial. Los contadores posteriores sí refrescan aun publicado.
Copy literal sin trim/normalización, conteo Unicode compartido con catálogo; límites salen del catálogo fijado,
no de constantes. Audiencias incluyen/excluyen listas con size actual; no se suman como destinatarios.
Resend obtiene totals por broadcast y ventana explícita; HubSpot stats + listas desde su reader dueño Greenhouse.
No se crean series ni SQL entre productos. Null expresa ausencia; conteos privados beta no se suponen.

Growth Forms es proveedor del formulario: identidad pública `form_key`. El flujo DB Greenhouse → dispatcher →
HubSpot sigue siendo del owner y no se certifica a partir del embed. El lector URL valida markup explícito con
el contrato público de Growth Forms, pin de origen canónico y comprobación de surface/origin/formKey; parse5
excluye falsos embeds dentro de scripts/comentarios/templates. No GUID de destino ni PII en Studio. Sin binding
comprobado: null + estado; fallo de comprobación produce aviso. No hay registro URL→form_key canónico disponible
para evitar el readback del embed; si aparece, reabrir esta decisión para consumirlo por API.

El conteo web es igualdad exacta de destination_url dentro de organización, excluye auto-referencia, canceladas
y campañas archivadas, y es independiente del rango de calendario. No afirma publicación. JSON aditivo sin
migración; flags existentes conservados OFF por defecto. Este corte está validado localmente; rollout pendiente.
