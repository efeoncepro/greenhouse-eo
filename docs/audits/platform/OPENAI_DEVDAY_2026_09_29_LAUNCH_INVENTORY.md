# OpenAI DevDay 2026 — inventario y lectura para Efeonce

- **Fecha de fuente:** 2026-09-29; corte de investigación: 18:50 UTC.
- **Tipo:** investigación de proveedor, no decisión de arquitectura ni prueba de acceso en nuestras cuentas.
- **Fuente primaria:** [recap oficial de DevDay](https://openai.com/index/devday-2026-recap/). El recap enumera 25 anuncios; «anunciado» no equivale a disponible en cada cuenta o región.
- **Revalidación:** antes de elegir runtime/modelo, distribuir un plugin o prometer una capacidad, verificar documentación vigente, plan, región, acceso efectivo y una prueba real en el cliente.

## Los 25 anuncios

| # | Anuncio | Contrato público al 29-09 | Estado declarado |
|---|---|---|---|
| 1 | dots | Agente personal persistente con GPT-6 Astra, computador propio en la nube, aplicaciones conectadas, trabajo en segundo plano, Activity View y reglas de aprobación. Investigación proactiva limitada a lectura. Specialist dots con identidad propia son pilotos separados. | Despliegue gradual Pro y Business Premium en mercados elegibles; beta Enterprise/Edu/Healthcare habilitada por admin. |
| 2 | GPT-6.1 Sol | Modelo `gpt-6.1-sol`: US$2/M tokens de entrada, US$0,10/M en caché y US$10/M de salida; OpenAI declara rendimiento cercano a Astra en ciertas evals a una quinta parte de su precio estándar. | API, Codex y ChatGPT Work para planes elegibles; todavía no Chat general. |
| 3 | Ultrafast | Tier de velocidad: Astra en API mediante `service_tier: "ultrafast"`; hasta 300 tokens/s y 8× en Codex, hasta 6× en API según la superficie. Más costo y límites propios. | Astra hoy; Work/Codex en Pro 500 y Enterprise. Sol 6.1 próximamente. API: residencia EE. UU. o procesamiento global, no endpoints regionales EU. |
| 4 | Private Intelligence | ZDR con Private Safety Processing (PSP): revisión automatizada de seguridad sobre registros cifrados en almacenamiento controlado por cliente. Private Inference propone computación confidencial. | PSP condicionado a elegibilidad/configuración por proyecto; Private Inference preview este otoño boreal. |
| 5 | Codex in the cloud | Tareas desde computador, teléfono o nube y entornos de desarrollo reutilizables con configuración compartida. | Plus, Pro, Business, Healthcare, Education y Enterprise. |
| 6 | Codex CLI renovada | Voz, vista `/agents`, mejoras en prompts, resume, worktrees e interfaz de terminal. | Todos los planes. |
| 7 | Code Review | Resúmenes, diffs, hallazgos y revisión automática cloud desde escritorio. GitHub GA; GitLab merge requests en preview. | Todos los planes; repositorio conectado y permisos requeridos. |
| 8 | Codex Security Cloud | Escaneo completo o seguimiento de commits de GitHub, investigación/deduplicación y fixes propuestos; incluye modelos Daybreak Blue. | Pro, Business, Enterprise y Edu en web y escritorio. |
| 9 | Decisions API | Luna responde preguntas acotadas con opciones finitas definidas por desarrollador; contexto texto/imagen, clasificación y routing. | Preview limitada; apertura más amplia prevista en días. |
| 10 | Agents API con computer use | La Agents API presentada el 10-09 agrega navegador alojado; harness Codex administrado, sesiones, multiagente, tool search/calling y compactación. | API; también superficie en Work/Codex Pro 500 y Enterprise según recap. |
| 11 | Bedrock Managed Agents | Adaptación de capacidades Agents API para agentes OpenAI gestionados en AWS y conectados a sus recursos. | Anunciado con Amazon; validar región, elegibilidad y contrato AWS antes de diseño. |
| 12 | Plugin extensions | Sidebar, panel junto a conversación, settings, visores/editores de archivos, enlaces profundos y contexto bidireccional para plugins. | Superficies parciales; composer mentions solo en desktop; web Free/Go más adelante. |
| 13 | Creación, envío y descubrimiento de plugins | Plugin Creator, submission con feedback más claro y ranking/recomendaciones. El usuario escoge plugin y aprueba acceso. | Todos los planes; publicación sigue su propio review. |
| 14 | Plugins en Sites | Un Site puede alojar plugins; cada usuario conserva datos y permisos de su conexión; automatizaciones compartidas. | Business, Enterprise, Healthcare y Edu. |
| 15 | MCP Events para plugins | Suscripción a cambios en apps conectadas y entrega por webhook para disparar automatizaciones. | Requiere MCP 2.0 `2026-07-28`; integración actual no soporta polling/streaming del draft. |
| 16 | ChatGPT Space | Espacio compartido con personas, ChatGPT y dots, instrucciones y conocimiento común. | Pro, Business y Enterprise en desktop/web; móvil con lectura/búsqueda/compartir, edición posterior. |
| 17 | Pages | Documentos colaborativos con escritura, investigación, gráficos e imágenes en ChatGPT. | Pro, Business y Enterprise. |
| 18 | Slides colaborativas | Deck editable por personas/agentes, comentarios y exportación a PowerPoint o Google Slides. | Próximas semanas; Pro, Business y Enterprise. |
| 19 | Teams y Team Tasks | Compartir Pages, slides, plugins y hojas; delegar trabajo recurrente programado o por eventos. | Business y Enterprise. |
| 20 | `@ChatGPT` en Slack y Teams | Asistencia en canales/hilos/DM con herramientas de admin o de usuario y permisos propios. | Business y Enterprise. |
| 21 | Meetings plugin | Notas sin bot en la llamada, resúmenes y acciones en Space; audio borrado al terminar las notas. | Beta macOS para Pro/Business; Enterprise alfa limitado; otros sistemas después. |
| 22 | Perfiles compartibles | Muestran Sites/plugins reutilizables y skills dentro del workspace. | Business y Enterprise. |
| 23 | Sign in with ChatGPT | Identidad para terceros; Plus/Pro pueden autorizar consumo de su allowance Work/Codex en herramientas participantes y fijar límite semanal por app. Autenticación y token sharing son capacidades distintas. | Identidad global; sharing solo participantes elegibles. HubSpot, GitLab, Canva, Airtable y Supabase figuran como compatibles con sign-in pero sin token sharing actual. |
| 24 | Pro 500 | US$500/mes, Astra Ultrafast y allowance anunciada como 25× Plus. Pro 100/200 siguen; nuevas Pro 200 sin grandfathering tienen menor allowance, con transición elegible hasta 29-10-2026. | Disponible; créditos extra en Pro 100/200 no desbloquean Ultrafast al lanzamiento. |
| 25 | OpenAI Marketplace | Clientes Enterprise elegibles pueden solicitar aplicar parte de un compromiso OpenAI existente a software aprobado de 32 socios iniciales, entre ellos Adobe, Figma, HubSpot y Salesforce. | Expresión de interés; no disponibilidad automática. |

## Detalle que cambia decisiones técnicas

1. **El costo de Sol es una hipótesis de ruta, no una promoción automática.** OpenAI reporta mejoras en DeepSWE, GDP.pdf, AutomationBench, OSWorld, Terminal-Bench Science y factualidad. Las evals fueron realizadas bajo configuraciones de investigación/API y no prueban calidad para un rol, idioma, toolset o dato de Efeonce. Medir calidad, costo por resultado aceptado, latencia, seguridad y fallback en el caso real antes de mover un modelo.
2. **Agents API es un runtime distinto de Agents SDK y Responses API.** OpenAI administra sesión, harness, compactación y recuperación; el SDK corre en la aplicación. La [guía actual](https://developers.openai.com/api/docs/guides/agents-api/overview) declara residencia solo en EE. UU. y **sin elegibilidad ZDR**, incluso con sandbox autoalojado. Private Safety Processing no convierte a Agents API en ZDR. El lanzamiento del 29-09 amplía una API publicada el 10-09; no es una API creada hoy.
3. **MCP Events es un canal nuevo de entrada, no autorización por sí mismo.** El [contrato documentado](https://developers.openai.com/plugins/build/mcp-events) pide discovery de eventos, `events/subscribe`, almacenamiento de suscripción, callback HTTPS firmado y `events/unsubscribe`. La policy del provider, consentimiento, entitlements, idempotencia y aprobación de efectos siguen en el dueño del dominio. Efeonce MCP no adopta eventos por la mera existencia de la especificación. TASK-1904 ahora posee la construcción compartida para ChatGPT y Claude; el SDK v2 instalado y el anuncio de versión de protocolo no demuestran `server/discover` ni suscripciones. La guía de Claude Code sólo documenta negociación v2 y `list_changed`, no Events de negocio nativos: se certificará por host o se construirá un adaptador Efeonce explícito.
4. **Plugin extensions amplían la UI distribuible.** La [documentación](https://developers.openai.com/plugins/build/extensions) incluye sidebar, paneles, file viewers/editors, settings y contexto modelo-app. No cambia el resource OAuth ni crea autoridad nueva. Decidir UI por un caso real; un plugin MCP-only sigue siendo viable.
5. **Sign-in y consumo de plan son contratos separados.** La [ayuda oficial](https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites) distingue identidad, elegibilidad Plus/Pro, consentimiento del usuario, límites por app y cargos propios del tercero. Estar en Marketplace tampoco equivale a ser partner de token sharing ni a acceso a herramientas Efeonce.
6. **Dots, Space, Team Tasks y Meetings son superficies de OpenAI, no capacidades de Greenhouse/Studio.** Sus ejemplos no transfieren datos, permisos, memoria ni aprobaciones a nuestro runtime. Validar el comportamiento en una cuenta elegible antes de diseñar integración o hacer claims comerciales.

## Consecuencia para contratos abiertos de Efeonce

- **TASK-1904 (plugin privado Efeonce):** construir MCP Events compartidos con Claude en Slice 6 tras discovery y ADR; mantener instalación privada, marca, skills, OAuth y certificación real. Sidebar, viewers y Sites siguen sujetos a UX y contratos propios; el anuncio no publica el plugin ni amplía la cohorte.
- **TASK-1915 (dispatcher Marketing Studio):** añadir Agents API como **candidato de evaluación**, no como quinto adaptador aprobado por inferencia. Comparar con Agents SDK y Responses según residencia, ZDR, estado durable, herramientas MCP, delegación por corrida, costo y recuperación. La decisión de añadirlo requiere delta del ADR/task y su gate.
- **MCP gateway:** Events exigiría un flujo inbound y política de efectos nuevos; no instalar un webhook en el gateway neutral ni inferir acceso desde un plugin de ChatGPT.
- **OpenAI Marketplace:** HubSpot, Salesforce o Figma en el catálogo no acreditan acuerdos, precios, capacidades ni permisos de Efeonce con esos terceros.

## Fuentes primarias

- [DevDay 2026 Recap](https://openai.com/index/devday-2026-recap/) · [dots](https://openai.com/index/introducing-dots/) · [GPT-6.1 Sol](https://openai.com/index/introducing-gpt-6-1-sol/).
- [Ultrafast](https://developers.openai.com/api/docs/guides/ultrafast-mode) · [PSP](https://developers.openai.com/api/docs/guides/private-safety-processing) · [Agents API](https://developers.openai.com/api/docs/guides/agents-api/overview) · [computer use](https://developers.openai.com/api/docs/guides/agents-api/tools/computer-use).
- [Plugin extensions](https://developers.openai.com/plugins/build/extensions) · [MCP Events](https://developers.openai.com/plugins/build/mcp-events) · [Space](https://chatgpt.com/features/space/).
- [Sign in with ChatGPT](https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites) · [Pro tiers](https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers) · [Marketplace](https://openai.com/business/marketplace/).
