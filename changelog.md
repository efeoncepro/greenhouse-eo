# changelog.md

**2026-11-01 · SKY, laboratorio local:** [204 pruebas y recomendación B](docs/audits/client-portal/2026-11-01-sky-finance-routing-validation/README.md),
37 nuevas de Finance, routing e historia. Un cliente comercial con Spaces Diseño/SEO; protección histórica y
contexto integral aún pendientes; siguiente paso: ruta/reader local por Space. Contrato GA4/GSC/AEO candidato;
sin producción ni cambios en historia real.

**2026-10-31 · Prospección:** [cierre Wequips/Mambrino](docs/audits/commercial/2026-10-31-wequips-mambrino-docs-skills.md):
registro de rebote frente a email verificado, consentimiento de Apollo por persona y conciliación de Primary
tras automatización. Skills B2B/HubSpot espejo, manuales y evidencia por canal; sin cambio de runtime.

[Historial interno](docs/changelog/internal/README.md).

## 2026-11-05 — Insights: el capítulo de búsqueda cuenta todos los clics de Google, valor estimado y visitas desde redes

Code complete local, rollout pendiente (sin push ni release). El capítulo SEO toma sus totales del control de Search
Console sin la dimensión consulta, que incluye las consultas que Google no detalla (ISSUE-191: el blog de Berel tuvo
4.094 clics en octubre y la tabla materializada contaba 1.065); la cascada agrega «Consultas que Google no muestra».
Nuevas cifras: «Valor publicitario estimado» (método del piloto SKY, sólo con CPC ya capturados) y «Visitas desde
redes» (GA4, nunca atribuidas al SEO). La CLI de valor orgánico mide otras organizaciones (`--markets`, `--brand`,
`--content-scope`, `sc-domain:`) y la vista previa acepta `--modules` y `--title`.
[Funcional](docs/documentation/insights/efeonce-insights-dominio-ediciones.md) ·
[manual de valor orgánico](docs/manual-de-uso/growth/valorar-trafico-organico.md) ·
[ISSUE-191](docs/issues/open/ISSUE-191-seo-gsc-daily-undercounts-clicks-hidden-queries.md).

## 2026-11-05 — GPT Image 2.6 en `pnpm ai:image` y `ai:inpaint`, junto a 2.5

OpenAI lanzó GPT Image 2.6 (Sunburst y Flare) el 2026-11-04. La CLI ya lo opera de punta a punta junto a 2.5:
`--complexity`, SVG nativo (`--format svg`, con `--svg-model`), GIF animado (`--format gif`, `--frames`, `--frame-ms`),
edición guiada por marcas (`--markup`) y por rayado sobre la foto, `--compression`, `--moderation` y `--estimate`
(costo sin llamar a la API). Validación única antes de gastar en el cliente canónico; `gpt-image-1` se corta por
apagado. Canarios reales (~USD 1): 2.6 cobra 4,2× en `low` y 3,3× en `medium` que 2.5 a la misma tarifa, igual en
`high`/`xhigh`/`max`; Sunburst 2.6 con máscara también da panel negro, así que `ai:inpaint` lo edita sin máscara.
Cuándo usar cada uno: [manual](docs/manual-de-uso/ai-tooling/generar-y-editar-imagenes-con-gpt-image.md) y guía de
modelos §5.1. Default de `pnpm ai:image`: `gpt-image-2.5-flare` (decisión del operador; `gpt-image-2` con `--model`);
el del runtime sigue `gpt-image-2`.

## 2026-11-04 — SKY: adaptaciones en Claude Design (CyberSky Perú y kit BLACK)

Nuevo Design System «SKY Airline — Performance» y canvas de adaptaciones en Claude Design (artifacts privados): 66 piezas
de CyberSky Perú por plantilla y datos, y del kit BLACK los 12 KV fijos, sus animaciones GIF/MP4 con audio y 24 popup y
story. Entregables locales en `ai-generations/`, sin publicar; datos y derechos pendientes de confirmar. Cómo operarlo:
[manual](docs/manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md) y [funcional](docs/documentation/creative/adaptaciones-sky-en-claude-design.md).
Segunda ronda: logo BLACK con la fecha nueva en todas las piezas, grilla por mercado (12 mensajes con popup, GIF y
story en video), 13 rutas foco de Perú, formatos Chile «KV listo» y HPH por mercado con sus banderas.
El 2026-11-05 los 321 entregables se entregaron en OneDrive, en la carpeta nueva «ENTREGABLES BLACK (Efeonce
2026-11-05)» junto al kit, verificados contra el original; el kit no se modificó.
Quedaron documentados cada formato SKY (tamaños, nombres, mercados, GIF y story en video) y el pipeline de producción
([catálogo](docs/documentation/creative/catalogo-formatos-sky.md)). 6 PMAX de rutas Perú con la fecha vieja se corrigieron.
Tercera ronda: rutas foco con la foto aprobada de cada destino (15, desde el CSV de Daniela), fotos de destino en
«Vuela por el Perú» y Argentina, y entrega ordenada por mercado y formato en «BLACK SKY 2026».
Cuarta ronda: el logo se lee en todas las fotos sin apagarlas, la flecha de precio queda cerca de destinos cortos,
Chile Travel va pegado a la esquina, Santiago para Argentina es de verano y las banderas tienen un borde fino.
Quinta ronda: detrás del logo va el gradiente que dejó Daniela, cortado bajo el logo para no oscurecer caras ni monumentos;
Talara y Chiclayo ya tienen foto y ubicación, y la choza de Iquitos, la ballena de Talara y el muelle de Chiclayo quedan a la vista.
Sexta ronda: los comentarios de Daniela en Frame.io sobre las rutas foco quedaron aplicados: Ayacucho sin personas, más
cielo sobre el logo en Trujillo, Piura, Arequipa, Juliaca y Pucallpa, y el crédito de PromPerú más grande en la story.

## 2026-11-04 — efeoncepro.com: BreadcrumbList válido en la portada

Google Search Console avisó «Falta el campo "item"» porque Yoast emitía en la portada un BreadcrumbList de un solo
elemento sin `item`. Un mu-plugin del runtime público (`efeonce-breadcrumb-single-item.php`, commit `64d8c59`) lo
corrige, instalado en Kinsta con `scripts/public-website/install-breadcrumb-single-item-mu-plugin.php`. Verificado en
vivo; las 113 URLs del sitemap, sin problemas. Falta que el operador marque «Validar corrección» en GSC.

## 2026-11-04 — CLAUDE.md vuelve bajo el presupuesto de 35.000 tokens

Las filas nuevas del router (Motogas, Berel, Blog SKY) dejaron `CLAUDE.md` en 35.321 tokens y el check de gobernanza
falló en `develop`. Se compactaron filas cuyo detalle ya vive en su doc o skill: 34.652 tokens, 0 huérfanos y check
verde (margen ~350). Regla: una fila nueva del router es un puntero corto a su skill, y una línea del baseline sólo se
compacta si su texto exacto ya vive en su destino ([lección](docs/operations/CLAUDE_MD_REFACTOR_MAP_2026-06-16.md)).

## 2026-11-04 — Prospección contextual reutilizable en Codex y Claude

El [workflow compartido](.codex/skills/efeonce-b2b-prospecting/references/linkedin-signal-to-outreach.md)
convierte señales de LinkedIn en investigación, CRM y mensajes contextualizados dentro del mandato,
con landings, brochures originales y verificación independiente por canal. [Primera aplicación](docs/commercial/prospecting-agent/runs/2026-11-04-paula-cristian-contextual.md):
dos InMail y un email enviados; Paula pendiente de correo laboral, sin utilizar su correo personal.
Skills espejo y manual actualizados; sin cadencia automática ni nuevo runtime.

## 2026-11-02 — Rooms: los agentes trabajan por CLI con Efeonce ID

Un agente (Claude Code, Codex) ya opera Rooms en producción con el login de una persona interna: se corre
`pnpm rooms login` una vez (Efeonce ID con segundo factor y consentimiento) y la credencial se renueva sola, sin copiar
cookies. El agente tiene la misma autoridad que la persona, recortada por las clases consentidas, y cada acción queda
atribuida como `cli/<agente>`, con aviso y reversa. Primera prueba: la sala de demostración «Volta» armada y publicada
de punta a punta por el agente. `pnpm rooms logout` revoca el acceso
([manual](docs/manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md)). El MCP remoto por el gateway llega después.

## 2026-11-02 — Efeonce ID con La órbita y fin del login de la CLI de Rooms

Las pantallas de Efeonce ID (consentimiento, confirmación con segundo factor, enlaces por correo, invitación, sesión y
errores) adoptan La órbita: un panel con la órbita alrededor de un ícono o una palabra, titulares editoriales y un campo
de código de seis casillas. Está en `develop`; llega a producción sólo con un release gobernado
([manual](docs/manual-de-uso/identity/operar-pantallas-efeonce-id.md)). Al terminar `pnpm rooms login`, el navegador ya no
queda en una página técnica: muestra «Listo» o «Casi» con el motivo, en producción desde hoy
([manual](docs/manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md)).

## 2026-11-02 — Botón «Continuar con Efeonce ID»

El botón con el que las aplicaciones de Efeonce ofrecen entrar con Efeonce ID quedó definido: «Continuar con» y la marca
Efeonce | ID, como un botón de pago, con sus diez estados ([ADR](docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md)).
El archivo oficial entra a AXIS en `axis-brand-assets` 0.4.32; falta llevarlo a las aplicaciones.

## 2026-11-01 — OpenAI: clave personal para generación creativa

Las CLIs de imagen pueden pagar con una cuenta OpenAI alterna sin tocar la de la empresa:
`pnpm ai:image --openai-key personal` u `OPENAI_API_KEY_PROFILE=personal` (200 USD de crédito). Producto y runtime siguen
con la clave de empresa; si el perfil no resuelve, la corrida falla en vez de cobrarle a la canónica
([manual](docs/manual-de-uso/ai-tooling/alternar-clave-openai.md)).

## 2026-11-01 — Marca de Efeonce ID

Efeonce ID, la cuenta de Efeonce Auth, tiene marca aprobada: la órbita vive en la D, con la esfera Growth a la 1:30
([ADR](docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md)). Los archivos oficiales (logo, lockup e isotipos) entran a
AXIS en `axis-brand-assets` 0.4.31. En la pantalla de entrada irá sólo como favicon y dentro del formulario; el carrusel de
novedades se conserva. La adopción en Efeonce Auth queda pendiente.

## 2026-11-01 — Efeonce ID y Rooms: login con novedades y entrada directa

El login de Efeonce ID muestra las novedades publicadas de Greenhouse, también al entrar a Rooms (release
`935583f88db0`, `auth-server-00170-qlx`). Rooms lleva a Efeonce ID sin parpadeo cuando no hay sesión y muestra el nombre
del espacio («Efeonce»); el despliegue de Auth acepta releases por squash y enruta a la última revisión. Issues
184–188 resueltos; login humano de punta a punta pendiente.

## 2026-10-30 — Licitaciones: Mattis GRD-1555 enviada y lecciones de carga en Wherex

[Oferta a Mattis (Grupo Réditos)](docs/commercial/tenders/mattis-branding-marketing-inmobiliario-1555/README.md) enviada
en Wherex el 30/10 por COP 120 millones. La skill de licitaciones suma carga de archivos, exportación de lienzos a PDF,
cotización en COP, RFP Excel y cláusula tributaria Chile–Colombia; «La órbita» suma secciones, DOOH y plantas de venta.

## 2026-10-29 — Prospección: búsquedas Sales Navigator multimercado

[44 búsquedas persistidas](docs/commercial/sales-navigator/BUSQUEDAS-GUARDADAS-MERCADOS-HISPANOS-2026-10-29.md),
24 búsquedas de cuentas/20 de personas en cuatro mercados, con avisos semanales nativos. [Corrección de cobertura Perú](docs/commercial/sales-navigator/COBERTURA-PERU-Y-VALIDACION-DE-BUSQUEDAS-2026-10-29.md):
CRM 58/81/106/868, Growth 789; son consultas, no censo ni compradores calificados. Persistencia, muestra y
cobertura separadas; controles conocidos y contraste de filtros en política, manuales y skill B2B espejo.
Las 44 consultas no se alteraron por el diagnóstico; cobertura pendiente, fixture P89 sin evaluación conductual.
Listas 54/57 y portafolio 12/5 intactos. Sin contacto, InMail, CRM, scheduler externo o prueba de recuperar cupo.

## 2026-10-29 — Sitio público: nueva home «La órbita» y limpieza de homes antiguas

La home de efeoncepro.com es la landing compilada `inicio` desde el canvas aprobado (hero con cinco líneas, motor,
AEO «pregunta en vivo», constelación de Sparks, Greenhouse, método, testimonios SKY, FAQ y agenda nativa). Imagen OG,
metadatos sociales y destacada nuevos; videos solo en pantalla. Homes antiguas y demos del tema a la papelera con 301.
[Auditoría](docs/audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md).

## 2026-10-28 — Prospección: MG Indusol y recuperación del borrador persistido

[Caso Mayra / MG Indusol](docs/commercial/prospecting-agent/runs/2026-10-28-mg-indusol-mayra.md) conciliado
con correo autorizado y readbacks independientes de Enviados y EMAIL SENT. Canon y skills espejo precisan
la recuperación del mismo borrador, límites CRUD de Documents y alcance del Contact automático;
su lifecycle no constituye calificación. Sin nueva política, autonomía, CRM manual o seguimiento programado.
[Auditoría y verificaciones](docs/audits/commercial/2026-10-28-mg-indusol-docs-skills.md).

## 2026-10-27 — SKY: ADR y comparación local de cuentas operativas

TASK-2073 añade sandbox sin red/DB para comparar bridges A′/B: 97 tests PASS, nueve anchors locales y evidencia
reproducible. A′ recomendado con owner comercial común y foundations previas; ADR Proposed. Sin cambios de runtime
o historia Diseño. [Resultado y gates](docs/audits/client-portal/2026-10-27-sky-operational-bridge-prototype/README.md).

## 2026-10-26 — Rooms: entorno de integración y conectores locales

29Oct: [barrido completo de documentación y skills](docs/audits/rooms/2026-10-29-docs-skills-full-reconciliation.md)
con3subagentes concilia arquitectura/guías, Rooms/Auth/MCP y routers, sin retest de aplicación.
AGENTS runtime de38af5 sólo documental; fuente3c7 intacta y Auth retenido.

29Oct: [corte backend local3c7bcb5](docs/audits/rooms/2026-10-29-backend-local-completion.md):
337tests0skip,13migraciones/43tablas, restore mixtoPG16/18 y Chrome18+23 PASS. Preguntas/pasos,
tours/notas/sesiones, V4 imagen+PDF/audio/video y MCPstdio; contratos/guías/skills actualizados.
UI Claude Design, Linux/cloud y conectores externos separados; Auth retenido, sin push/deploy.

28Oct: [Retest dos adapters RP contra fuentes Authca97eecd1](docs/audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md),35checksPASS; Rooms8750750 intacto. IssuerQA, no server.ts completo ni producto RP2 desplegado. Sin release.

28Oct: [Tres regresiones RP existentes](docs/audits/rooms/2026-10-28-cross-rp-persistence-focal.md) PASS/0skip sobre PG efímero; sin cambio de fuentes ni repetición browser/canary. Aislamiento integral dos productos pendiente.

28Oct: [B10 browser con reader externo real](docs/audits/rooms/2026-10-28-b10-rooms-mcp-authority.md) sobre PG efímero,16checks+8gruposPASS; SQL confirma código consumido v7. Fuentes Rooms y producción intactas.

28Oct: B10 [repetido con PostgresOAuthStore y ambas DB efímeras](docs/audits/rooms/2026-10-28-b10-rooms-mcp-postgres.md), readback SQL confirma consentimiento/código consumido/tokens sólo read. Sin cambios de fuentes Rooms ni producción.

28Oct: [B10 browser local](docs/audits/rooms/2026-10-28-b10-rooms-mcp-explicit-consent.md) conserva sesión Rooms y exige consentimiento MCP explícito; token sólo read, write con step-up. Sin cambio productivo.

28Oct: [B18 local](docs/audits/rooms/2026-10-28-b18-guest-without-internal-sso.md) verifica OTP guest sin sesión interna/SSO (51checksPASS); contrato Auth y producción sin cambios.

Sandbox propio de datos/medios/credenciales y launcher de personas fixture; SDKbrowser tipado sobre
API canónica, CAS/idempotencia, sesiones y transfer seguro. Rama local sin publicación;250tests y18checks
APIbrowserPASS, nueva UI pendiente. [Manual](docs/manual-de-uso/rooms/integrar-claude-design-local.md).
Auth retenido en PR; ningún flag productivo, correo ni despliegue.

## 2026-10-26 — Rooms/Auth: estado, skills y contratos de integración conciliados

Dossier, tres capas documentales, tareas/epics e índices alineados con backend Rooms publicado,
canary único cerrado y worker automático verificado. Skills Codex/Claude y routers distinguen flags de
máquina/acceso humano, referencias UI históricas y pendientes de integración Claude Design.
Auth permanece en PR263/264 por instrucción del operador; ningún merge/deploy, correo ni código nuevo.
[Alcance, evidencias y gates](docs/audits/rooms/2026-10-26-docs-skills-continuity.md).

## 2026-10-26 — Prospección: cierre Mass Chile y conciliación de canales

[Expediente Mass Chile](docs/commercial/prospecting-agent/runs/2026-10-26-mass-chile.md), excepción personal
acotada, NDR y duplicado BCC preservados; permisos de créditos, CRM y envío separados. Skills espejo de
prospección/HubSpot, manual, funcional y política Outlook refuerzan readback del borrador persistido,
Enviados y CRM sin reintentos ni direcciones privadas en Git. Sin cambios de runtime, filtros o automatizaciones.

## 2026-10-26 — Comercial: visitas a documentos y seguimiento contextual

Método compartido para contrastar aviso y detalle de Documents, separar interacción/intención, revisar
restricciones y conservar autoridad de borrador/envío. Skills Codex/Claude, manual y continuidad concilian
[Indecaucho](docs/commercial/follow-up-agent/runs/2026-10-26-indecaucho-documento-seguimiento.md):
correo único autorizado, firma/CCO y Enviados/EMAIL verificados. Delta posterior: respuesta y marca ARMOR,
invitación/confirmación verificadas, [caso previo a discovery](docs/commercial/accounts/indecaucho-armor/README.md)
y research con tres subagentes. Método/plantilla/espejos y fixtures v16 conectan reunión, transcripción
de la fuente declarada y economía condicionada. Lectura HubSpot/Notion programada una vez27/10 16hChile
por mandato expreso; seguimiento global PAUSED conservado, resultado posterior pendiente.
Registro CRM posterior autorizado: nota de respuesta119606905700 y tarea119625704196 con owner/fecha
y asociaciones a cuenta/contacto comprobados; la revisión focal reutiliza esa TASK.

Delta27/10: revisión de transcripción concluida y automatización focal eliminada. Por mandato posterior de Julio,
[catálogo V3v14](data/pricing/v3-operating/PERFORMANCE_ECUADOR_2026-10-27.md) agrega Performance y Ecuador con reglas
estimadas; puntero consistente y skills espejo/rutas actualizados. [ARMOR calculado](docs/commercial/accounts/indecaucho-armor/COSTEO-V3-2026-10-27.md):
feeUSD22.450/90días, medios hasta18.000 aparte, en revisión.1.860testsPASS/3skip; sin importación a plataforma o envío.

## 2026-10-26 — Sitio público: runner para pedir indexación en Search Console

`pnpm public-website:gsc-index` pide la indexación por el botón de la interfaz (la API no lo permite), desde un Chrome
dedicado donde una persona inicia sesión una vez. Inspecciona por defecto; `--apply` sólo pide si Google no vio el
último cambio. Verifica que la propiedad seleccionada sea efeoncepro.com, porque la cuenta ve varios clientes. No pasa
de 10 por día, registra cada URL y se detiene ante captcha, sesión cerrada o cupo agotado. Probado en vivo en modo
inspección: Google ya volvió a rastrear el pilar de Loop y la landing de Performance, que ya no necesita la solicitud
pendiente. `--apply` probado con «Qué es Inbound Marketing»: Google la volvió a rastrear al minuto. Desde ese caso, el runner lee la confirmación visible y no repite una URL pedida en las últimas 24 horas. [Manual](docs/manual-de-uso/public-site/solicitar-indexacion-search-console.md).

## 2026-10-26 — Blog: pilar Loop Marketing publicado, embed corregido, voz de Julio y Loop 2026

Pilar «Qué es Loop Marketing» (248398) publicado con 248483 absorbido (borrador + 301 de Yoast), portada nueva sin
persona (infinito en luz), diagrama y videos de HubSpot recuperados, sin la sección de transparencia (decisión de Julio),
negritas por importancia, enlaces en negrita, mención de HubSpot y lo verificado de UNBOUND 2026 (libro, Taste Profile,
4 Rs, State of Marketing, Lennox). Content Factory: el embed de YouTube lleva la URL en su línea (en línea, WordPress
mostraba el enlace pelado) y un `kind` desconocido ya no se descarta en silencio. Voz de Julio: hablarle al lector y
énfasis por importancia. Loop 2026 en la skill HubSpot con lo que no se cita (80 %/20 %, 6 %). [Borrador y
rollback](docs/public-site/LOOP_MARKETING_REFRESH_DRAFT_V1.md) · [brief del artículo
futuro](docs/public-site/LOOP_TASTE_PROFILE_4RS_ARTICLE_BRIEF_V1.md).

## 2026-10-25 — Rooms + Auth: auditoría al corte de Codex

Registro de estado y skills vivas `efeonce-rooms`/`efeonce-auth`; TASK-1829 (superficie OAuth del emisor) cerrada: en producción desde 2026-09-04. [Auditoría](docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

## 2026-10-25 — Auth: Rooms primero y login V4

Foundation OIDC y login V4 locales; Greenhouse diferido2063. Consumer y guest OTP probados con navegador/PG.1833 en ejecución con evaluación propia, sin contratar pentest por decisión de Julio; corregido retorno inseguro magiclink, agregadas señales y wiring durable del deploy, senderOTP exclusivo sin tracking. Migraciones y registroRP preparados en cloud, gatesOFF y sin correo real. Release prepara correos de eventos OFF para no activar envíos ajenos; lint de dos scripts gráficos corregido sin regenerar piezas; monitor de despliegue Auth sincronizado con sus rutas canónicas. Recibos operativos completos fuera del repo público; resúmenes con digest, sin borrado histórico. [Revisión y cobertura pendiente](docs/audits/auth-server/2026-10-25-independent-protocol-review.md).

## 2026-10-25 — Rooms: contenido versionado y contrato de invitación

Autoría V2 local: borradores incompletos por perfil, importación previa con reporte, bloques/relaciones y publicación textual validada.66 pruebas y recuperación histórica PASS; sin editor/medios nuevos ni activación pública. Contrato elegido de acceso invitado: un correo Resend con enlace+código, entrada en Rooms, vencimiento y revocación; implementación coordinada2066/2067. [Evidencia](docs/audits/rooms/2026-10-25-versioned-content-authoring.md).

## 2026-10-25 — Rooms: base durable, experiencia por rol y motion (TASK-2058/2059/2060)

- Nuevo runtime `efeonce-rooms`: contratos y permisos `can` por organización/sala/edición; jerarquías cliente, operador y administrador con grants, vigencia y denegación por defecto.
- Primera sala creativa y SEO/AEO con La órbita/AXIS, visor de piezas, lectura/radiografía y workspace interno; refinada con Product Design. [Superficie implementada](docs/documentation/rooms/primera-experiencia-local.md) y [manual local](docs/manual-de-uso/rooms/operar-primera-experiencia-local.md).
- PostgreSQL local independiente: crear, editar, publicar, reabrir, archivar y grants; revisiones/idempotencia, auditoría/outbox y recuperación con restore verificados (TASK-2060).
- View Transitions nativas progresivas, botones/badges AXIS y logo con ratio intrínseco. Muestra sintética; Efeonce ID (TASK-1834), DB cloud y aceptación visual humana pendientes. TASK-2061 publica [la demo](https://efeonce-rooms.vercel.app/demo) con repo privado GitHub vinculado y smoke externo. [QA inicial](docs/audits/rooms/2026-10-25-first-local-delivery.md).

## 2026-10-25 — Criterio reutilizable para nuevas conversaciones comerciales

- Prospección, Commercial y Copywriting incorporan historia por iniciativa, evidencia, pregunta útil y
  revisión de respuesta; [método y estados](docs/commercial/analyses/2026-10-prospeccion/IMPLEMENTACION-Y-PAUTA.md).
  [Aplicación nativa verificada](docs/commercial/analyses/2026-10-prospeccion/APLICACION-HUBSPOT-2026-10-25.md): guía9.705, nueve correos/nueve plantillas ajustados, cinco pausas; cola13→8 el29Oct. QA de borrador nuevo pendiente; sin envío inmediato ni pauta.

## 2026-10-25 — Ficha de autor, byline y schema de autor del blog (TASK-2057)

- El single del blog tiene byline «Por {autor}» enlazado al archivo y, al cierre, una ficha de autor de La órbita
  (retrato con la pieza `portrait`, cargo, bio corta, temas, CTA al archivo y redes con isotipos oficiales) que
  reemplaza la caja de Ohio con redes del demo. Un solo lector, `EO_Author_Profile` (efeonce-editorial-blocks 0.5.4),
  para la ficha, el byline, el schema y la cabecera de `/author/`; `worksFor` del Person apunta a `#organization`.
  Bio corta editable en el perfil de WordPress («Ficha de autor del blog»).

## 2026-10-24 — «Explora por tema» v2 en la portada del blog (TASK-2051, desvío 15)

- La órbita de `/blog/` enlaza las categorías del blog: seis temas con contenido, cada uno con su promesa, y un centro
  que guía la lectura (descripción, tres lecturas, «Ver todo»); en móvil, una lista por lecturas. Growth e IA salen;
  Inbound y Marketing digital entran. `lib/topics-v2.cjs`, `EO_Home_Readers::ORBIT`, `EO_Home_Adapter::ORBIT_TOPICS`,
  `EOBH_View::topics()`; efeonce-editorial-blocks 0.4.8.

## 2026-10-24 — Imagen y punto focal propios de la tarjeta de foto del riel (TASK-2051)

- La tarjeta de foto de «Para leer con calma» (vertical) recortaba al centro la destacada horizontal y cortaba el
  encabezado incrustado de las portadas de Manzanitas. En vivo desde hoy (`efeonce-editorial-blocks` 0.4.5,
  `EO_CM_VERSION` 0.2.2, runtime 6578773): metas `_eo_card_image` y `_eo_card_focus` («Imagen de la tarjeta del riel»
  y «Punto focal de la tarjeta» en el panel) → `img`/`pos` del adaptador; la destacada sigue siendo la OG. Comando
  `card` (Greenhouse e60f5045c) y `preview/serve.cjs --rail`. `verify --browser` en vivo: 0 px en 8 anchos; ninguna
  entrada las usa todavía. [Manual CLI §2c](docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md).

## 2026-10-24 — Tarjetas v2 de «Para leer con calma» en producción (TASK-2051, desvío 14)

- El riel de `/blog/` usa las tarjetas aprobadas en el canvas (versión 93) desde las 21:12 UTC: una sola plantilla
  (`lib/rail-v2.cjs`) para foto a sangre, cliente (ANAM), pregunta, entrada de webinar con «Faltan N días», onda de
  podcast y tipográfica; una insignia como máximo y sólo con dato real (En vivo, Nuevo, Actualizado, Gratis; cupos y
  lecturas esperan su lector por el filtro `eo_home_rail_signals`).
- Modelo de contenido (`efeonce-editorial-blocks` 0.4.4, `EO_CM_VERSION` 0.2.1): formato Podcast, metas
  `_eo_reviewed_at` («Última revisión») y `_eo_client` («Cliente del caso») con panel y comandos `client`/`reviewed`;
  `dc-runtime.js` ya no borra el hover al repintar. Gates en vivo: desborde 0 px de 320 a 1920, un H1, axe 0.
  [Runtime](docs/architecture/public-site/BLOG_HOME_RUNTIME_V1.md) · [PDR-029](docs/public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md).

## 2026-10-24 — Módulo de eventos: webinar de Teams, diseño y backlog

- Decidido: la sesión es un webinar de Teams y Greenhouse es dueño de la reserva, el cupo y la lista de espera. El
  conector nativo Teams↔HubSpot no sincroniza (ticket de soporte #50018204746). Diseño con inscripción por Graph,
  `joinWebUrl` personal, ledger de transiciones y Eventos de marketing con una sola fuente por evento: diseño, no
  implementado. Correcciones de correos (`2a971d768`) y píldora (`a5b028461`) solo en local, sin release.
  [Backlog canónico](docs/research/RESEARCH-013-events-webinars-hubspot-teams.md#backlog-canónico-para-cerrar-el-módulo-de-eventos).

## 2026-10-24 — Archivo de Glitch con su propia piel (TASK-2056)
  `/category/glitch/` y `/glitch/`: wordmark, última edición y último Flash, muletilla «sin anestesia.», falla en bytes,
  placas #N/FLASH por fila, filtro Ediciones/Flash/Notas y suscripción con la píldora de la portada (blanca). Renderer
  de Growth Forms 1.3.0: logo opcional en el rótulo de la píldora (pendiente de release).
  [Runtime](docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md#21-variante-glitch-del-tema-task-2056-en-vivo-desde-el-2026-10-24-1950-utc).

## 2026-10-24 — Archivo del blog v3 en producción (TASK-2055)

- La búsqueda, los temas, las etiquetas y los autores de efeoncepro.com dejan la plantilla de demo de Ohio y usan el
  «Archivo del blog» aprobado en el canvas de la portada (dirección D): cabecera de sección con la destacada montada,
  filtro por formato, filas por año, paginación, otros temas y estados vacíos propios. Sin el recuadro «Hire us!», en
  español, sin desborde de 320 a 1920.
- Búsqueda sólo de publicaciones; búsqueda vacía sin inventario; Greenhouse y autores sin publicaciones dan 404; temas
  indexables sólo con descripción y ≥ 4 publicaciones (seis descripciones aprobadas y cargadas); títulos «X - Blog de Efeonce».
- Runtime: `eo-blog-home` (`EOBH_Archive`, flag `eo_blog_archive_enabled = 1`) + `EO_Archive_Adapter`; CLI `archive` y
  `topic-descriptions`. Gates: equivalencia 6/6, paridad PHP 36/36, píxeles 44/44 ≤ 1 %, axe 0.
  [Runtime](docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md) · [manual](docs/manual-de-uso/public-site/operar-archivo-del-blog.md).

## 2026-10-24 — Prospección: cierre multicanal y skills conciliadas

- Cinco casos del chat documentados con estados por persona/canal; cinco EMAIL `SENT` corroborados y secuencia sólo
  NIASA. Se conserva LinkedIn de Arcor pendiente y la incertidumbre de correos inferidos/catch-all.
- Método/manuales y cuatro skills espejo precisan identidad, permisos de enriquecimiento, originales de brochure,
  persistencia HTML, efectos de Documents y readbacks separados. Collateral creativo aplica la aprobación íntegra
  del 17/10. Cinco escenarios sintéticos añadidos; sin nuevas comunicaciones ni cambios runtime.
  [Auditoría y límites](docs/audits/commercial/2026-10-24-chat-prospeccion-docs-skills.md).
- [Lucía y Yvette](docs/commercial/prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md): expedientes,
  manuales y dos skills espejo distinguen patrón, validación técnica y atribución inferida con excepción
  individual. Resultado inválido descartado, costos/permisos separados y persistencia del correo comprobada;
  tres escenarios sintéticos adicionales. [Controles](docs/audits/commercial/2026-10-24-lucia-yvette-docs-skills.md).
- [Secuencias de Lucía y Yvette](docs/commercial/follow-up-agent/runs/2026-10-24-lucia-yvette-secuencias.md):
  dos pasos por persona programados para 29/10 10:00 y 05/11 10:05 Perú, firma gráfica y registro nativo con
  excepción expresa al CCO. Skills espejo documentan ese alcance, calendario persistido y lector CLI fallido
  sin repetir la inscripción; fixtures v14 con 70 casos. Programado no acredita envío o entrega.

## 2026-10-24 — Portada del blog v3: revisión en vivo y piezas listas

- Portada nueva publicada para revisión en `efeoncepro.com/blog-v3-revision/` (noindex): plugin `eo-blog-home` con los
  tableros de escritorio, tablet (nuevo) y móvil del canvas aprobado; 25/25 secciones ≤ 1 % en vivo. `/blog/` sin
  cambiar hasta aprobación. [TASK-2051](docs/tasks/in-progress/TASK-2051-blog-portada-v3-high-fidelity.md).
- Code complete en local, sin publicar: modelo de contenido (TASK-2050, PDR-029 Proposed), formulario en línea con
  reservas por evento y conteo (TASK-2053/2054; llega con el próximo release a main) y primitives AXIS de botón,
  segmentado y buscador con haz (TASK-2052, v0.7.15 preparada).
- Eventos del blog: correos de reserva desplegados (release `e593e3993bc3`), pero la prueba de punta a punta mostró que
  no salen (filtro `accepted` contra envíos `delivered`); corrección local, pendiente de release. Integración con
  HubSpot Eventos de marketing en diseño (RESEARCH-013); sin eventos reales hasta entonces.

## 2026-10-24 — Sitio público: Nosotros y Partners rediseñados (source-led)

- `/about-us-efeonce/` y `/partnership/` publicadas como widgets Elementor compilados desde los canvas aprobados de «La
  órbita» (11 y 6 módulos). Nosotros: fidelidad al canvas, rieles fijos de Ohio despejados, mapa sin parallax, hero
  anclado a la izquierda y wordmark de HubSpot. Partners: desde el release del 2026-10-24, «Quiero ser partner» abre el
  formulario de alianzas en un diálogo gobernado (Growth CTA + Growth Forms, TASK-2044/2045). [Layout](docs/documentation/public-site/wordpress-ohio-elementor-layout.md#landing-nosotros-source-led-page_id-249770-desde-2026-10-23).

## 2026-10-23 — Mattis: preparación Markdown y continuidad comercial

- Caso MD principal y propuesta de 23 bloques para Claude Design con anexos y simulación V3, sin aprobación ni envío.
- Skills espejo de licitaciones, deck, informe y pricing; manuales, invariantes y plantillas concilian fuente editorial,
  formato de presentación y costo objetivo vigente. [Auditoría](docs/audits/commercial/2026-10-23-mattis-markdown-docs-skills.md).

## 2026-10-23 — Auditoría SEO del Blog SKY e informe A4 premium para auditorías

- Auditoría consolidada del Blog SKY (GSC/GA4 al 21-10, Semrush CL/PE, SERP en vivo, 1.700 publicaciones): sin
  penalización, caída en tres etapas, plugin SEO perdido en la migración, copia indexable en Azure y 9 artículos de
  Perú despublicados después del 15-10. Informe de 23 páginas generado (no enviado) y correos en borrador.
  [Caso](docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md).
- Catálogo `insights-report`: plantillas `report-findings` y `report-scenarios`, `productLabel`, etapas/hitos/rótulos
  en la tendencia, guarda del pie en todas las páginas en papel y `pnpm report:compose`. Gate visual Insights a 0 px
  con los dos frames nuevos declarados (BASELINE_DELTAS ab); páginas aprobadas dentro del 1 %.

## 2026-10-23 — Medición del menú global y del dock de las landings (TASK-2042/2043)

- GTM web publicado en la versión 10: `gh_landing_dock_clicked` (v8), `gh_site_nav_opened`, `gh_site_nav_line_viewed`
  y `gh_site_nav_clicked` (v9) y el texto y destino del clic del menú (v10). GA4 suma seis dimensiones de evento
  (`target_type`, `target`, `target_label`, `target_url`, `panel`, `line`). Ninguno es key event; el servidor no cambia.
- Verificado en GA4 Tiempo real con una visita simulada que acepta sólo analítica. Scripts
  `scripts/gtm/build-landing-dock-events-workspace.ts` y `scripts/gtm/build-site-nav-events-workspace.ts`.
  [Registro](docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).

## 2026-10-23 — Seasonalities por fit de canal (PDR-020 revisión 2.1)

- Decisión del operador: las seasonalities dejan de tener Instagram como canal-hogar fijo; cada temporada va sólo al
  canal donde tiene fit (Instagram si es emocional o cultural, LinkedIn de Efeonce si tiene consecuencia de negocio para
  el comprador, LinkedIn de Julio si hay una opinión propia, ninguno si no conecta con un oficio). Delta en PDR-020;
  alineados la estrategia de love brand, el protocolo social, la documentación, el manual y la skill de social (con su
  espejo en `.codex`).

## 2026-10-23 — Navegación global en producción en todo efeoncepro.com (TASK-2042)

- El menú nuevo (AXIS `efeonce.site-nav`) reemplaza la cabecera de Ohio en todo el sitio desde las 00:09 UTC, salvo
  `/blog/`; vuelta atrás con el interruptor `eo_site_nav_enabled=off`. AXIS primitives 0.7.13 en el tema: aislamiento
  del anfitrión, «Estás aquí» desde el enlace del servicio, círculo del onepage a la medida de la ventana y tono de la
  isla bajo degradados, velos, chrome fijo y con el agendador abierto.
- Agendador nativo en la cabecera, el mega y el onepage (`cta_location: site_nav`); Loop Marketing abre Inbound (301).
- Edición gobernada del menú vivo con `pnpm public-website:site-nav` (foto, ítem, ícono, textos, revisiones, restaurar).
  [Manual](docs/manual-de-uso/public-site/operar-navegacion-global.md).

## 2026-10-23 — Dock inferior de vidrio en las siete landings (TASK-2043)

- AXIS `efeonce.landing-dock` (primitives 0.7.14): vidrio de la isla del menú, presencia por dock y por botón, parada,
  tono por gradientes y con diálogo modal; plugin `eo-landing-dock` y `pnpm public-website:landing-dock`.
- En vivo en Inbound, HubSpot, Performance, Inicio, Redes Sociales, SEO e Influencers; docks viejos fuera del HTML; el
  agendador del dock mide `cta-location="landing_dock"`. [Manual](docs/manual-de-uso/public-site/operar-dock-de-landings.md).

## 2026-10-22 — Fundación Luz: excepción individual y outreach documentados

- [Expediente de Mariana](docs/commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md): alta/Primary/nota y envío Outlook con firma gráfica/CCO, EMAIL SENT e InMail verificados; dirección inferida por excepción expresa, sin entrega confirmada ni secuencia.
- Arquitectura, documentación funcional, manual y referencias espejo concilian la excepción ya vigente; calidad de casilla, permisos por acción y atribución de enlaces separados. Sin schema, filtros, automatizaciones o nuevas comunicaciones por este cierre.

## 2026-10-22 — Cotizador CLI: perfiles y recursos de referencia

- Réditos: [propuesta Markdown para Claude Design](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/PROPUESTA-GANA-LOTI-2027-PARA-CLAUDE-DESIGN.md) preparada por autorización posterior; narrativa, conceptos, alcances e inversión de borrador, con control interno separado. Sin emisión/envío.

- Réditos: [investigación de marcas y pares](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/INVESTIGACION-MARCAS-Y-DIRECCION-2026-10-22.md) afina la dirección comercial; fuentes, fechas y límites de acceso conservados. Sin oferta o cambio de precio.

- Réditos: comparación completa de la propuesta anterior (84 páginas) corrige la diferenciación recomendada; integración y extra mile ya estaban ofrecidos. [Hallazgos y reformulación](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COMPARACION-PROPUESTA-ANTERIOR-Y-REFORMULACION-2026-10-22.md).

- Réditos: investigación de competencia y estrategia con tres subagentes; hipótesis de extras costeada por CLI, sin nuevo precio o compromiso. [Análisis para elegir dirección](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/ESTRATEGIA-DIFERENCIACION-2026-10-22.md).

- Réditos GRD-1552: rango interno COP36–38M / USD9.863,01–10.410,96 mensuales documentado y Deal valorado en COP456M / USD124.931,51 por 12 meses al escenario principal; sin propuesta ni cambio de etapa. [Base y evidencia](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/BRIEF-COMERCIAL-VIGENTE.md).

- Mantenimiento versionado: tres perfiles faltantes, costos CO estimados y referencia Awario, conservando políticas y controles. [Evidencia](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COSTOS-RESTO-ALCANCE-CLI-2026-10-22.md). Sin cambios de motor ni publicación a plataforma.

## 2026-10-22 — Navegación global del sitio: mecanismo en AXIS (TASK-2040)

- AXIS ya tiene `efeonce.site-nav`: esquema `site-nav.v1` (JSON Schema para el plugin), tokens `axisSiteNav`, render
  de servidor, `site-nav.css` y `site-nav.js` sin dependencias, demo y página del Lab y suite de navegador en el CI.
  Publicado en AXIS v0.7.7 (contracts 0.7.7, primitives 0.7.0), igualado al canvas en textos y medidas.
- WordPress: plugin `eo-site-nav` (TASK-2041) activo, con el documento del menú aplicado (revisión 1) y su copia
  pública en `/wp-json/eo/v1/site-nav`. El sitio conserva la cabecera de Ohio hasta TASK-2042. Las fotos del menú ya
  están en `storage.googleapis.com/efeonce-group-axis-public-media/site-nav/v1/`.
- Decidido en el Lab: cabecera 300/400 ms, el mega se cierra con más de 48 px de scroll, tono de la isla por
  `data-site-nav-tone` con luminancia de respaldo; destinos `/servicios/`, `/blog/` y `/agenda/`.
  [Arquitectura](docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md).

## 2026-10-22 — Love brand de Efeonce y sistema de canales v2

- [PDR-020 revisión 2.0](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md): tres familias (marca
  agencia · conexión B2B · Marketing con Manzanitas), Threads con el gancho de Glitch, X sólo escucha, YouTube piloto,
  newsletter en el LinkedIn de Julio e «IA con contexto»; cierra las decisiones 1, 4 y 5.
- Nueva [estrategia de love brand y comunidad](docs/strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md): fans
  dentro de las empresas, pilares anclados al Why, escalera del fan, mecánicas y medición del puente a negocio.
  Contexto `09`/`10`/índice y skills de marca, social y contenido conectados (espejos sincronizados).

## 2026-10-22 — Canales Efeonce: seis decisiones del operador

- [PDR-020, delta punto 12](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md): Glitch y
  Marketing con Manzanitas son marcas hermanas; el público ve Manzanitas y Think queda interno (cierra la decisión 6 y
  el naming de TASK-1802); 302 temporal pendiente para `/servicios/hubspot/`; seasonalities comparten visual clave,
  nunca carrusel; story de Manzanitas en stories de Instagram; reel y vlog de Glitch en pausa; pódcast sin canal;
  tutoriales de YouTube con Julio. PDR-003, PDR-018, estrategia, normas, manuales y skills alineados.
- Calendario de Notion: se retiró la opción `Twitter 🐦` de `Plataforma` (ninguna fila vigente la usaba).
- Sitio público (producción): `/servicios/hubspot/` pasa de un 301 adivinado por WordPress (a un post de 2024) a una
  **302 temporal** de Yoast hacia `/servicios-contratar-hubspot/`; respaldo `_gh_hubspot_302_before_20261022`, purga de
  caché y verificación en vivo de las variantes con y sin barra y con UTM. Rollback en la referencia de la landing.

## 2026-10-22 — Kibernum: outreach y segmentación comprobados

- Contact/Company/Primary y seis membresías activas del contacto verificados; correo con firma gráfica/CCO y brochure 360° completo, EMAIL SENT e InMail publicados. Referencias espejo incorporan el caso; sin nueva automatización ni permisos. [Registro y límites](docs/commercial/prospecting-agent/runs/2026-10-22-0056-kibernum-growth-colombia.md).

## 2026-10-21 — `pnpm ai:listen`: QA de piezas de video y audio

- Control estándar sin Gemini (`--measure-only`): mapa de eventos y grilla de cues medidos con ffmpeg en menos de 1 s;
  código 2 si una cue falla. Gemini 3.8 queda como segunda opinión con `--verify`, que confirma o refuta cada
  afirmación medible (pieza AWS: un «congelado» de severidad alta quedó refutado).
- v2: `--fps` hasta 24, `--clip`, rúbricas versionadas, modo agéntico (`v1beta1` vía el cliente canónico) y GCS.
  `@google/genai` 2.30 con Nexa verificado en vivo. [Manual](docs/manual-de-uso/ai-tooling/escuchar-y-mirar-media-con-gemini.md).

## 2026-10-21 — Firma gráfica obligatoria en todos los correos de Julio

- Sustituida la alternativa textual por firma gráfica siempre, incluidos seguimientos manuales, programados y secuencias; transporte sin HTML deja el envío pendiente. [Decisión y procedimiento](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md). Routers y skills actualizados, sin envíos ni cambios de configuración.

[Historial interno](docs/changelog/internal/README.md).

## 2026-10-21 — Prospección creativa y secuencias izipay

- Documentados InMail de Ana Paula, email/CRM de Odoo y cuatro contactos/correos de izipay; tres secuencias programadas, Laura sin inscripción por rebote.
- Skills espejo: excepción individual de correo inferido, NDR frente a Apollo, clonación independiente, persistencia y readback.
- Capacidad de producción/fabricación local corregida por Julio; sin inferir propiedad ni nuevos permisos. [Registro y límites](docs/commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md).

## 2026-10-20 — Blog etapa 1: consultas y composición preparadas

- Candidato local en develop: seis artículos y tres Glitch sin duplicados, temas dinámicos, objetivos con destinos,
  recursos verificados y suscripción aprobada. Opción 2 elegida: portada navy y hero editorial. QA 1440/1024/390/320; no publicación. [Paquete](scripts/public-website/blog-phase1/README.md).
- Revisión de seis anotaciones: navegación y temas más claros, portada real de guía/AEO y suscripción Glitch con mayor jerarquía. Contrato Forms intacto;27 checks. Todo local en develop, sin publicación.
- Segunda ronda: cuatro imágenes editoriales propias para temas, retirada atribución redundante y formulario integrado en Glitch sin tarjeta clara. Roles oscuros y validación contrastados; mismas integraciones, sólo develop local.

[Historial interno](docs/changelog/internal/README.md).

## 2026-10-20 — Blog: preview Growth Forms en develop

- Diseño compacto desktop/móvil preparado; publicación detenida por el operador. HubSpot y GTM Web7 aplicados previamente; Forms review, CF7 live, sin merge/release a main ni envío real. [Estado](docs/audits/public-site/2026-10-20-blog-growth-form-preparation.md).

## 2026-10-20 — Partnerships y expedientes de distribuidores

- Conciliados Adobe/Nexsys, Google/Ingram y Microsoft/AWS/LOL con identidad, evidencia y pendientes separados.
- Nexsys: formulario corregido y once respaldos enviados; readback Outlook/adjuntos y HubSpot SENT confirmado.
- [Manual](docs/manual-de-uso/comercial/operar-partnerships-y-distribuidores.md), política Outlook y cuatro skills en Codex/Claude incorporan revisión integral, separación de notas internas, autoridad de firma y control de adjuntos.
- [Directorio](docs/operations/EFEONCE_PARTNER_CONTACT_DIRECTORY_V1.md): 27 personas, 8 buzones, fuentes y rebotes; cuatro skills Codex/Claude enlazadas. Microsoft verificado y Geraldine informada. Sin nuevos envíos al consolidar contactos.

## 2026-10-19 — Customer Agent Voice: caso ANAM y guía operativa

- Documentada la activación de Emma en el 600, llamada real y correo enviado con firma gráfica/CCO.
- Manual y skills espejo separan número/canal/deployment/IVR, horario humano, créditos de voz y resolución de texto.
- Transferencia humana y buzón pendientes de prueba; sin nuevo cambio de portal ni reactivación Kortex.
- [Evidencia](docs/audits/ANAM_CUSTOMER_AGENT_VOICE_SETUP_2026-10-19.md) · [procedimiento](docs/manual-de-uso/hubspot/configurar-customer-agent-llamadas.md).

## 2026-10-18 — Indecaucho: outreach gráfico y seguimiento nativo

- Katia/Company/Primary/segmento180 y primer correo Outlook con firma/CCO/EMAIL SENT verificados.
- Un seguimiento HubSpot programado22Oct09:30Quito, salida por respuesta/reunión; deck360 original íntegro.
- Skills espejo incorporan recuperación de publicaciones, calidad Apollo y readback de firma/envío/calendario.
- [Evidencia y límites](docs/commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md); sin push ni nuevos permisos.

## 2026-10-18 — Contexto comercial en la fachada Grader

[Historial interno](docs/changelog/internal/README.md).

- Fachada Grader reutiliza preparación/persistencia/recibo Forms y contexto visitante; CORS gobernado y respuestas privadas.
- PR257 promueve todo develop81f6ba525 a main2559e9242, árboles idénticos y Vercel4He READY.
- Grader y clasificación administrativa con auditoría transaccional servidos; canarios y smoke productivo PASS sin leads ficticios.
- Orquestador39190761785 SUCCESS, manifest released; CI/Deep/smoke PASS, health200 y watchdog6/6 drift0.
- Sin nuevas migraciones, publicación GTM ni replay; cierre documental propio en develop.
- Conciliación19/10: transporte Grader/clasificación auditada, Ads/agendas, índices y skills espejo actualizados; TASK-2034 permanece parcial por evidencia comercial real pendiente.
- Discovery LinkedIn19/10: Insight Tag web, CAPI, consentimiento, dedupe y HubSpot documentados con fuentes oficiales; arquitectura Proposed y skills actualizadas, sin conexión, instalación o eventos. [Preparación](docs/manual-de-uso/growth/preparar-medicion-linkedin.md).
- Origen/canales19/10: separación conceptual aceptada, discovery readonly293 Deals y schema/backfill propuestos; legacy preservado, consumidores incompletos, cero writes. [ADR y límites](docs/architecture/EFEONCE_COMMERCIAL_ACQUISITION_TAXONOMY_DECISION_V1.md).
- UI de adquisición19/10: estilos/colores del editor verificados, límite de API/CLI y QA visual separados del schema en docs/skills; nueva presentación propuesta, sin aplicar. [Manual](docs/manual-de-uso/hubspot/normalizar-origen-canales-adquisicion.md#presentación-humana-estilos-colores-y-alcance-de-la-api).
- [Release](docs/audits/releases/2026-10-18-grader-commercial-measurement-production-release.md); checkout principal develop, WIP ajeno preservado. [Validación y límites](docs/audits/growth/2026-10-18-grader-measurement-release.md).

## 2026-10-18 — Políticas Ads comerciales publicadas y clasificación Web corregida

[Historial interno](docs/changelog/internal/README.md).

- 13 Forms comerciales+Discovery verificados por API;12 altas adicionales, Grader comercial incluido y Contacto general fueraAds.
- Lead Gen Web quote_request con identidad/versión intactas; writer/CLI canónicos y nueva API interna implementada localmente, sin deploy.
- 53 pruebas, ESLint y TypeScript PASS. Configuración no prueba recepción/atribución; sin conversiones ficticias ni replay.
- [Publicación y límites](docs/audits/growth/2026-10-18-commercial-forms-policy-publication.md); WIP ajeno preservado.
