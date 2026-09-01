# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-01 — TeamBot completa el ciclo mensual del Performance Report

Nexa publicó el resumen de agosto en `EO Team` con cuatro menciones verificadas y envió cuatro lecturas personales 1:1, todas auditadas como `succeeded`. El runbook, la arquitectura, el manual y las skills espejadas ahora exigen separar cifras de interpretación: volumen no prueba sobrecarga, los atrasos heredados se contextualizan y una muestra de onboarding no se presenta como tendencia. También fijan la jerarquía de evidencia para menciones y el uso de Object ID Entra revalidado cuando un correo escrito contiene un typo. [Evidencia y límites](docs/audits/communications/2026-09-01-performance-report-teambot.md).

## 2026-09-01 — TASK-1709 cerrada y la doc que la daba por apagada

El carril de diagnóstico de prospecto llevaba **5 días desplegado** (flag ON en Vercel Production
desde el 27-ago, corrida real sobre `skyairline.com`) mientras cuatro skills, el runbook del gateway
MCP, dos manuales y la doc funcional decían "flag OFF en todos los ambientes". El runbook incluso
instruía al canary a normalizar un `disabled` — que hoy sería una regresión. Corregido en 9 archivos.

Tier `prospect` documentado: se resuelve sin `module_assignments` y su gasto es presupuesto de
adquisición de Efeonce, nunca costo de cliente.

## 2026-09-01 — TASK-1699 cerrada, y `task:lint` gana la regla `stale-progress`

El top-N del SERP quedó `complete`: serie viva desde el 2026-08-29 (766 · 775 · 762 · 778 filas en
4 días) con costo marginal CERO medido, y su señal de cobertura convergió sola a `ok`/`uncovered=0`
sin tocar el umbral.

Se re-ejecutó cinco veces sin cerrar por un defecto de **registro**, no técnico: 46 checkboxes sin
tildar y `Status real: Diseno` hacían que cada sesión la leyera como no empezada, mientras el trabajo
quedaba anotado sólo en prosa.

Regla nueva `stale-progress` en `task:lint`: avisa cuando el estado declarado contradice la historia
de commits, y cuando una task se cierra sin tildar una sola evidencia. Warning por diseño y por
medición (414 de 975 completas están así); acotada a las que tienen commits de implementación, la
señal cae a 28 tasks.

## 2026-08-31 — Blog WordPress sanea categorías y abre una copia gobernada de Demo 35

La taxonomía live quedó reducida a 13 categorías reales: AEO y SEO son raíces;
Diseño Web depende de Diseño y Redes Sociales de Marketing Digital. Se
reclasificaron 11 posts reales, se enviaron 20 posts Ohio demo a papelera, se
retiraron 15 categorías descartadas y Marketing Digital quedó como default.
Los cambios de URL tienen redirects explícitos y los demo retirados, `410`.

La copia `251875` de Demo 35 está publicada con `noindex` como superficie de
trabajo; la fuente `225984` y `/blog/` permanecen sin cutover. PDR, contrato,
manual y skills WordPress Codex/Claude fijan que jerarquía no equivale a
prominencia y que los 15 widgets deben reconectarse a contenido real antes de
publicar. [Estado y pendientes](docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md).

## 2026-08-31 — Las páginas misceláneas dejan de ser “una 404” y ganan ownership

Discovery live confirmó que Ohio padre gobierna 404, búsqueda/no-results y archivos; Elementor Theme Builder
no tiene templates/conditions especiales activos. Se creó el contrato child-theme-first, el comportamiento
funcional, el runbook, el registro de primitive propuesto y las rutas en skills WordPress/SEO. La política separa
recovery, búsqueda, archivos editoriales y chrome global, con HTTP/robots/canonical por query type. No hubo
mutación ni publicación. Persisten P0: contenido público `(Borrador)`, search vacío con 154 resultados y enlaces
demo/rotos globales. [Discovery y límites](docs/audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md).

## 2026-08-31 — Content Marketing: cierre técnico focal en producción

El stage ya aplica el mismo gate de alto/ancho al cargar y redimensionar; 1440×650 conserva los
siete capítulos en flujo. Se corrigieron contrastes de estados y badges con variantes de la paleta
aprobada. Despliegue WordPress limitado a JS/CSS con backup, hashes y readback de documento intacto.
Nuevo verificador recorre pin, capítulos, tabs/cortes, mobile/reduced-motion/JS-off y contraste;
smoke seguro separa rechazos reales, ledger vacío y un evento GA4 explícitamente sintético.
[Evidencia y límite Turnstile/Realtime](docs/audits/public-site/2026-08-31-content-marketing-technical-closure.md).

## 2026-08-31 — Cobertura Efeonce incorpora Estados Unidos y Contacto corrige su fuente institucional

La cobertura vigente queda en Chile, Estados Unidos, Colombia, México y Perú, sin inferir oficina ni entidad
legal por mercado. Contexto de negocio, posicionamiento público, primitives y skills espejadas apuntan al
mismo estado. El brief de Contacto usa la dirección y los dos teléfonos de la contraportada canónica y marca
como desactualizados Las Bellotas, el teléfono público anterior y las listas de cuatro mercados. `TASK-1801` quedó registrada con contratos visual/flow/motion, routing, privacidad, Meetings y rollout; esta edición no publicó WordPress ni amplió métricas históricas de clientes.
[Brief y límites](docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md).

## 2026-08-31 — Home: cierre editorial y mantenimiento nativo

Ocho revisiones publicadas: hero desafiante, beneficios concretos, comparación cualitativa, FAQ
con jerarquía tipográfica y encabezado Con + logo. Readback 17 widgets/407 campos/seis repeaters;
doce archivos coinciden local/remoto. Subagente concilió planes, snapshots y evidencia.
Contratos técnico/funcional/manual y skills WordPress/copywriting espejadas actualizados;
commit documental, sin runtime hermano ni WIP SEO previo. QA residual y TASK-1358 siguen abiertos.
[Cierre y límites](docs/audits/public-site/2026-08-31-home-editorial-closure.md).

## 2026-08-31 — TASK-1780: el inventario de tools MCP pasa a ser un manifiesto

`src/mcp/greenhouse/tool-manifest.ts` es la fuente única del catálogo de tools MCP. `server.ts`
registra recorriéndolo —definir una tool sin entrada rompe la construcción del servidor— y el `name`
y las `instructions` que el cliente MCP lee se derivan de él, así que el servidor ya no puede
anunciarse `greenhouse-read-only` mientras registra siete escrituras. Dos banderas ortogonales por
tool: `writes` y `spendsProviderBudget`.

El manual se renombró a `mcp-greenhouse-tool-inventory.md` y se corrigieron sus tres cifras en
conflicto. Nuevo gate `pnpm mcp:manifest:check` en `ci.yml` sobre el artefacto generado que el
gateway consumirá.

Cambio de comportamiento verificado como nulo: el registro del SDK antes y después es idéntico byte a
byte (43 tools, mismo orden y schemas), y el artefacto reproduce el espejo del gateway tool por tool.

Cerrada y pusheada: Greenhouse `d2b3c0639` (9 workflows `success`) y gateway `efeonce-mcp` `e92961e`
(CI `success`). El deploy del gateway es `workflow_dispatch` y sigue sin disparar, así que la revisión
productiva no cambió — la verificación de esta task es de CI, no de runtime.

Barrido documental con 4 subagentes: 8 skills, 5 specs de arquitectura, 9 docs funcionales/manuales,
4 tasks vivas y un epic corregidos. Dos huecos sistémicos cerrados de paso: la rule auto-cargada de
Growth/SEO instruía editar a mano el espejo retirado, y no existía ninguna rule para `src/mcp/**`
(creada). `mcp:manifest:check` entró a `local:check` — antes el drift del artefacto sólo aparecía en CI.
Fila nueva en `DECISIONS_INDEX.md`: la frontera "qué capacidades existen es conocimiento de producto,
no de transporte" es la tercera arista del triángulo que ya fijaban las dos filas MCP existentes.

## 2026-08-31 — Content Marketing: diseño aprobado publicado en Elementor

Versionado local del runtime: `73493a8`; cambios Greenhouse acompañados en este cierre, sin push.

Revisión documental delegada: arquitectura/funcional/manual, skills WordPress/Growth Forms e índices
sincronizados con la entrega. Contratos UI distinguen plan de export publicado; task conserva sus
pendientes. Se precisan rollback, empaquetado, orden visible del menú y riesgo del pin tras resize.
Sin cambio de código ni nueva publicación durante esta revisión.

Menú verificado: **Soluciones → Crecimiento Multicanal → Content Marketing**, item `242917`, sin duplicados ni cambio de orden.
[Revisión editorial de ambas secciones](docs/audits/public-site/2026-08-31-content-marketing-editorial-copy.md): 118 campos publicados, siete pasos coherentes; diseño/SEO/shell intactos.
[Segundo pase editorial](docs/audits/public-site/2026-08-31-content-marketing-hub-review-copy.md): hub y revisión creativa, 83 campos publicados; tres cortes y fichas de campaña revisados.
[CMS y modos](docs/audits/public-site/2026-08-31-content-marketing-cms-modes.md): 53 textos y cuatro logos oficiales publicados; ocho controles nuevos, diseño general y SEO conservados.
[Ecosistema y FAQ](docs/audits/public-site/2026-08-31-content-marketing-ecosystem-faq.md): 37 textos y seis URL publicados; tarjetas completas y ocho FAQ, sin cambios de diseño/SEO.
[Marca en modalidades](docs/audits/public-site/2026-08-31-content-marketing-mode-logo.md): dos logos ampliados con CSS acotado, sin cambiar contenido ni SEO.
[Indexabilidad del menú](docs/audits/public-site/2026-08-31-menu-indexability.md): 18/18 páginas habilitadas; sólo Redes Sociales requería quitar noindex. Canonical/sitemap verificados; indexación GSC no afirmada.
[Cierre, caso interno y formulario](docs/audits/public-site/2026-08-31-content-marketing-business-conversion.md): 48 textos Elementor y copy de form v3 publicados; correo copiado coincide con lo visible, sin cambiar destino ni enviar leads. Ajuste posterior: cinco textos condensados para equilibrar las columnas, sin cambiar el formulario. Cierre documental con tres subagentes; runtime `f12dd64`, ocho archivos idénticos a producción, sin push.

Trece widgets editables conservan composición, assets e interacciones de Content Ops; header/footer Ohio
nativos. Captura canónica de dos pasos, select preseleccionado corregido, Yoast/meta/social/Service y URL
original preservada. [QA y límites](docs/audits/public-site/2026-08-31-content-marketing-publication.md).

## 2026-08-30 — Landing HubSpot: export aprobado publicado en Elementor

2026-08-31: etiqueta del enlace de menú cambiada a «Servicios HubSpot» por pedido del operador; URL y jerarquía conservadas.

2026-08-31: [auditoría SEO/AEO completa](docs/audits/public-site/2026-08-31-hubspot-seo-aeo.md):
OG/Twitter y breadcrumb corregidos, Service conectado al grafo Yoast, enlace oficial del partner y HTTP→HTTPS
301 sólo en la landing. Iconos 878 KB→2,4 KB y fuentes adelantadas; móvil LCP 16,3→8,6 s (lab; aún mejorable).
Schema.org 0 errores/advertencias; GSC indexada, último crawl 27-08 anterior al rediseño. Header/footer intactos;
persisten defectos globales del footer y falta respaldo localizado de las cifras 56%/76%. Snapshot SEO
`_gh_hubspot_seo_20260831_093553`; hash Elementor sin cambios. Sin commit/push.
Después se afinó la descripción SEO/social con `copywriting`, eliminando redundancia, sin cambiar title ni diseño.
Por comentarios posteriores se restauró el timeline del diseño y se dejaron dos columnas de partner con badge mayor;
[audit y rollback](docs/audits/public-site/2026-08-31-hubspot-timeline-partner-fix.md). SEO y datos Elementor intactos.
Nueva revisión: [seis iconos oficiales HubSpot y logo ANAM](docs/audits/public-site/2026-08-31-hubspot-brand-assets.md);
Media nativos, nota del caso identificada, SEO y shell conservados.
Revisión siguiente: [isotipos en paneles, Smart CRM/Agent Hub y wordmark de licencias](docs/audits/public-site/2026-08-31-hubspot-product-marks.md);
autorización del logo confirmada por operador, AEO sin símbolo propio identificado, sin cambios de copy/SEO.
MCP suma [ChatGPT, Claude y Gemini reutilizados desde AEO](docs/audits/public-site/2026-08-31-hubspot-mcp-logos.md),
en tarjeta y panel, tres Media nativos; AEO y contenido Elementor protegidos.
Las cinco capacidades restantes suman [iconos semánticos azul claro](docs/audits/public-site/2026-08-31-hubspot-semantic-icons.md),
diferenciados de las marcas oficiales, compartidos tarjeta/panel y editables.
[Revisión editorial](docs/audits/public-site/2026-08-31-hubspot-editorial-copy.md): licencias, ANAM, partner y reunión;
51 textos, sin «práctica» en la landing, sin cambios de diseño/SEO ni de otras páginas.
Continuación: [industrias, primer paso y cinco etapas](docs/audits/public-site/2026-08-31-hubspot-industry-method-copy.md), solo copy en tres widgets.
[Cierre documental delegado](docs/audits/public-site/2026-08-31-hubspot-documentation-closure.md): contratos, manual, skills y task reflejan publicación/alcance pendiente; Git acotado, sin push.


Se reemplazó el cuerpo de `244079` por once widgets Elementor editables, con 23 paneles servidos por PHP,
interacciones progresivas, CSS del diseño y header/footer nativos. URL e imagen destacada conservadas.
Formulario real de tres pasos por Growth Forms, variante portable `hubspot_pillar`; desaparece el éxito
simulado del export. Despliegue acotado por hashes, respaldo durable y verificación anónima responsive,
teclado, reduced motion, rechazo de captcha y guardado nativo de Elementor. Sin commit/push.
[Contrato](docs/architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md) ·
[Audit](docs/audits/public-site/2026-08-30-hubspot-elementor-publication.md).

## 2026-08-30 — TASK-1358: Home modular Elementor promovida con respaldo

Revisión SEO/AEO: título/descripción y OG/Twitter propios en Yoast, dos Media HTTP → HTTPS;
grafo existente conservado sin duplicaciones. [Audit y límites](docs/audits/public-site/2026-08-30-home-seo-aeo.md).
Aprendizajes consolidados en skills SEO/AEO y WordPress, espejadas Codex/Claude: metadatos sin forzar H1,
dueño único de grafo, retiro de FAQ rich results, alcance llms.txt y pruebas CMS/HTML/GSC diferenciadas.

Por instrucción posterior del operador, la página `251731` ya sirve `/`: menu Home y SEO/canonical/index
actualizados, diseño/copy/header/footer intactos; antigua Home `2791` conservada noindex. Snapshot
`_gh_home_cutover_20260830_162109`. Se aplicaron después los seis comentarios visuales: contraste corregido,
10 piezas recuperadas, isotipo HubSpot de Simple Icons, Logo Marquee compartido y agenda horizontal sin
formulario, enlazada al calendario vigente. QA 1280/890/390; copy/claims/editor UI siguen pendientes.
[Evidencia](docs/audits/public-site/2026-08-30-home-visual-review.md).
Segunda revisión: contraste de Ecosistema, CTA teal editable, FAQ con CTA integrado y layout tablet
sin sticky, e isotipo correcto también en Respaldo oficial. Sin reescribir documento ni header/footer.
Tercera revisión: hover nativo Ohio sin cubrir el CTA, FAQ sin mail, cierre de tabla moderado, sprocket CRM,
halos sin cortes e isotipo hero proporcional. Cambios de contenido guardados vía Elementor; QA responsive/hover PASS.
Cuarta revisión: HubSpot CRM teal con hover blanco; isotipos oficiales negativos de Greenhouse/Globe mediante
Media nativo. Tres comentarios publicados y comprobados en 390/890/1280; copys y header/footer sin cambios.
Quinta revisión: Kortex/Wave oficiales, Verk retirado y aviso oculto; logos reales del hero con microinteracción
original restaurada, y bucle de trabajos con cobertura por viewport. Snapshot `190751`; 415 campos/7 repeaters.
Rótulos narrativos: «El costo de trabajar por separado» y «Un equipo. Una misma dirección.» sustituyen notas
del wireframe en dos controles Elementor; snapshot `192130`, resto del contenido y estilo intactos.
Servicios enlaza cuatro landings verificadas mediante URL nativa por fila; ocho tarjetas siguen estáticas.
Snapshot `192809`; reparación del default URL, pruebas de renderer y navegación real documentadas en audit.
Casos se convierte en CTA navy compacto → `/portafolio/`, cinco campos nativos; tarjetas/cifras retiradas.
Snapshot `194253`, backup runtime `194241`; 415 campos/6 repeaters; hover, móvil y clic verificados.
Hero «Mira cómo operamos» abre showreel YouTube en dialog navy responsive; URL nativa, carga sólo al clic,
destrucción del player al cerrar, alternativa YouTube. Snapshot `195821`, backup `195756`; 414 campos.
Reproducción live, cierre X/exterior, foco de retorno y reduced motion verificados; teclado del iframe no certificado.

Consolidación documental con tres subagentes: contrato técnico, funcional, manual y skills espejadas;
task/índices/contexto reconciliados con PDR-010 y la Home actual. Plan y handoff previos preservados como
historia, no instrucciones vigentes. Readback independiente 17 widgets/414 campos raíz/6 repeaters,
tests PHP/lifecycle/geometría PASS; QA del editor, teclado del player y claims globales siguen abiertos.
Sin cambios live en esta consolidación. [Audit](docs/audits/public-site/2026-08-30-home-documentation-consolidation.md).

Checkpoint de construcción anterior a la promoción:

Se auditó el ZIP y se portó el cuerpo de Claude Design a `https://efeoncepro.com/home-claude-design-preview/` (`251731`, noindex), preservando el header/footer Ohio y Home `2791`. Tras la corrección solicitada por el operador, usa 17 widgets semánticos Elementor con controles editables y siete repeaters, **cero widgets HTML**. Assets condicionales y ciclo de vida idempotente; adaptación móvil del motor sin superposiciones. Tests PHP/JS y frontend 1440/390, reduced motion, filtros/FAQ/modal/foco pasan. Editor visual save/reload pendiente de login; media de 12 slots, copy/claims, captación y cutover siguen pendientes. [Contrato y manuales](docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md).

## 2026-08-30 — HubSpot as a Service y su futura landing adoptan arquitectura moderna e inmersiva

La práctica dejó de reducirse a RevOps + Customer Agent y ahora se gobierna mediante seis familias: Marketing,
Content & AEO; Sales & AI Pipeline; Revenue Lifecycle; Service, Customer Success & Delivery; Data, Integration &
CRM Intelligence; y Agent Hub & Agentic Operations. La evaluación inicial para fit/cotización es sin costo; un
blueprint pagado requiere un artefacto autónomo. Customer Agent queda como caso de uso, mientras Contracts,
Projects y Services se clasifican correctamente como objetos/capabilities dentro de sus workflows.

El benchmark de 11 partners, la oferta V2, tres fichas sectoriales, el pillar público, las skills HubSpot espejadas y
el router de agentes quedaron reconciliados. `TASK-1352` fue **reemplazada integralmente**, sin conservar deltas,
copy, claims ni composición del resultado rechazado de Claude Design. La nueva task impone research-first,
copywriting completo, SEO/AEO por intención y motor, CRO medible, proof ledger y un gate humano del primer fold antes
de la implementación total. Su dirección visual durable es **Sistema vivo de crecimiento**: atlas de seis resultados, tres lentes
sectoriales, color HubSpot usado como señal dentro de Efeonce masterbrand, motion causal/interrumpible, frontera
gratis-vs-blueprint y GVC premium. Los activos exactos de marca deben venir del Partner Brandfolder/guía vigente;
no se autoriza copiar la UI/trade dress, modificar logos, inventar HEX ni usar inmersión ornamental que perjudique
accesibilidad o CWV. No hubo cambio de runtime ni publicación web; la task permanece `to-do` y `UI ready: no`.

Dirección visual, wireframe, flow y motion de TASK-1352 se reautoraron desde cero contra la task nueva. Eliminan la
gran idea prefijada, normalizan las seis familias canónicas, subordinan agentes/capabilities a outcomes, incorporan
copy slots research-dependent, restricciones SEO/AEO en HTML, flujo de conversión y no-fit, fallas honestas,
transformación desktop/tablet/mobile y un motion system causal con tokens exactos, reduced-motion y budgets CWV.

## 2026-08-30 — Growth SEO · la lente `Descubrir` entrega lo que ya tenía construido (TASK-1693)

**Qué cambia para quien opera el módulo SEO.** Tres capacidades que estaban construidas y pagadas
pero no llegaban a la pantalla:

- **Se puede recorrer la corrida completa.** Una corrida materializa hasta 500 candidatos y la
  pantalla servía 50 sin salida. Ahora hay «Ver N candidatos más» al pie. Recorrer **no cuesta**: lee
  lo ya comprado, no llama al proveedor y por eso se ve distinto del botón que sí gasta.
- **Se elige de dónde salen las seeds.** Cuatro fuentes, con Search Console a la cabeza — seeds con
  demanda medida y resolución sin costo de proveedor. Cada una declara cuántas seeds aportaría. Una
  fuente sin insumo se bloquea con su razón y **nunca** cae en silencio a «seeds escritas».
- **Se puede filtrar el canvas**, y el filtro se aplica en el servidor: el conteo del encabezado
  sigue al universo filtrado, no a la página que bajó. No hay filtro por «dificultad» a propósito;
  el control correcto es «Barrera máxima», derivada del perfil real de enlaces.

Manual actualizado: `docs/manual-de-uso/growth/descubrir-keywords-seo.md` v1.3.

## 2026-08-29 — release `e1718a359575`: dos guardas textuales fallaron el mismo día con signos opuestos

El 4.º paso a producción del día promovió el fix de banda 2, el gate de cobertura del worker y la
quema de la deuda de procedencia. Manifest `released` en un solo run del orquestador; canary de
contrato verde por el lane de producción (provenance + rank monotónico — sólo el código nuevo lo
produce) y Berel paginada entera: 501/501, secuencia == persistida. El índice keyset huérfano se
retiró después del release (migración `20260829225504734`), como el contrato manda.

El desvío enseñó el patrón del día: CI Deep rojo sobre el primer squash porque el test del contrato
del deploy del worker contaba ocurrencias de string en el YAML — el proxy textual de un mecanismo
que 146070ffc había reemplazado por cobertura de metafile. La misma clase que el string-match del
ORDER BY del reader, con signo opuesto: aquél pasaba verde con banda 2 rota; éste se puso rojo con
la cobertura mejorada. Una guarda textual debe señalar al verificador real, no reemplazarlo. Y la
parte que no era del pipeline: la racha completa fue de **5 corridas rojas/canceladas en ~70
minutos** — el run del commit culpable cancelado por `cancel-in-progress` (nunca juzgado), dos
rojos de una sesión y uno del push del merge canónico de otra, sin que nadie abriera ninguno — en
ráfagas el veredicto es del último push, y una alarma sostenida se normaliza hasta volverse
invisible. El skip de 44 s del ops-worker esta vez fue legítimo (árboles
idénticos, diff completo vacío): mismo síntoma que el incidente anterior, causa opuesta — los
distingue el diff, no el cronómetro.

## 2026-08-29 — la cuarta llave invisible: el orden servido de la cola contradecía el rank persistido en banda 2

Auditoría independiente post-release sobre el snapshot vigente: 54 de 55 items de banda 2 de
`seot-efeonce-own-brand` salían fuera de su `rank_in_snapshot`. El comparador del materializador
desempata esa banda por impresiones — un valor que no es columna — y el reader reconstruía el orden
en SQL con las tres llaves que sí lo son; con el score NULL en toda la banda, colapsaba a orden
alfabético. El test de paridad comparaba el **string** del SQL contra una constante, así que
consagraba un modelo de tres llaves que el comparador no seguía y pasaba verde con el defecto
puesto. Invisible en Berel (todo banda 1); total en la org sin curva — que es toda org nueva.

El fix no agrega la columna que falta: **deja de reconstruir**. El reader sirve y pagina
`rank_in_snapshot` (único, sin NULL, ahora con UNIQUE index estructural), y la coincidencia entre
orden servido y persistido pasa a ser por construcción. Mueren de paso la disciplina `COLLATE "C"`
del reader, el cursor expandido con NULLs y el test por string. Re-medido paginando la corrida real
de punta a punta: 0 discrepancias en ambos targets, bandas 1 y 3 sin regresión. En el mismo tren se
quemó la deuda de procedencia de `work-queue` (TASK-1785): fuente nueva `own_ctr_model` para el caso
«insumos medidos, resultado estimado», censo en `emitted`. Queda con dueño el retiro post-release
del índice de keyset huérfano. La bug class quedó documentada como la TERCERA de
`SQL_DATE_MATH_AGENT_INVARIANTS` §"Orden y paginación", con el corolario de protocolo que la habría
atrapado: la detección se corre sobre el dataset que EXHIBE cada estado, no sobre el más grande.

## 2026-08-29 — el filtro que decide si un worker se despliega llevaba tiempo describiendo un bundle que ya no existía

El release de `incremental-clicks-v2` cerró verde en todo: manifest `released`, Vercel READY,
watchdog sin drift, tres de cuatro workers en el SHA. El `ops-worker` estaba sirviendo la versión
**anterior** — o sea el predicado de canibalización que ese mismo release existía para corregir.
Su job no falló: duró 46 segundos, se saltó el deploy solo y cerró `success`.

La decisión de desplegar se tomaba contra `WORKER_RUNTIME_PATHS`, una lista de rutas mantenida a
mano. Medido con el metafile de esbuild —el mismo bundle que arma el Dockerfile—, el `ops-worker`
empaqueta **1449 archivos** y la lista cubría **24 prefijos**: **696 archivos invisibles**, entre
ellos `src/lib/postgres`, casi todo `src/lib/finance` y todo `src/lib/growth/seo`. Como 1385 de los
1449 vienen de `src/lib`, enumerar subdirectorios nunca iba a sostenerse.

No era la primera vez. Los comentarios del propio workflow documentan **cinco** recurrencias
(TASK-1210, 742, 1723, 1746, 1279) y cada una se cerró agregando una ruta más. La sexta habría sido
`src/lib/growth/seo`.

Ahora la declaración es la verdadera —gruesa a propósito, y sigue evitando el redeploy por cambios a
`src/app/**`, `docs/**` o `tests/**`— y hay un gate, `pnpm worker:deploy-path-gate`, que la mantiene
verdadera derivándola del árbol real del bundle en vez de la lista escrita. Corriéndolo aparecieron
dos huecos más: `commercial-cost-worker` e `ico-batch` tampoco cubrían `services/_shared/sentry-init.ts`,
que ambos bundlean.

Con el worker ya en el SHA correcto, la cola se rematerializó **sin** `force`: el piso de recomputación
filtra por versión, así que un snapshot v1 dejó de contar como reciente. En Berel MX `consolidation`
cayó de 200 a 11 mientras `gsc_striking_distance` subía de 168 a 200 — reclasificación, no filtrado
de más. Y el 200 de v1 era el tope de `maxItemsPerOrigin`, o sea que el número real estaba truncado:
la mejora es mayor que la que muestra la resta.

## 2026-08-29 — el detector de canibalización de la cola SEO detectaba marca, y de paso vaciaba media pantalla

La cola priorizada decidía si una keyword era canibalización preguntando "¿aparece más de una página
del sitio?". Medido contra berel.com sobre 28 días, eso no mide canibalización: la población no-marca
tenía **80,7 %** de sus impresiones concentradas en su página principal y la de marca **34,2 %**. El
predicado seleccionaba marca — donde el sitio ocupa legítimamente su propia SERP. El caso que lo
retrata es la query de mayor demanda del sitio: `pinturas`, 41 páginas, **99,3 %** de las impresiones
en una sola, y la cola proponiendo "fusiona 41 URLs" sobre el ítem #1.

El daño mayor estaba en el otro lado. Como el colector de striking-distance excluía todo lo
multi-página, sacaba **216 de 269** filas de su ventana: reconstruida la lente, el operador veía
**92 keywords donde el reader anterior mostraba 269**. Al validar el cutover se verificó la dirección
que agregaba filas y nunca la que las quitaba.

`incremental-clicks-v2` corrige el predicado (no-marca ∧ concentración de la principal ≤ 70 % ∧ ≥2
páginas fusionables), lo escribe en **un solo lugar** que los dos colectores importan —antes estaba
escrito dos veces— y separa dos preguntas que parecían una: quién se queda con la query se mide sobre
todas las páginas, home incluida; qué se puede fusionar excluye home, PDFs e imágenes. Mezclarlas
invierte el veredicto, y lo destapó medir: al sacar la home también del denominador, `pinturas` cayó a
13,2 % y volvió a salir canibalizada. La marca tolera un error de tipeo, que no era un lujo: `bereñ`
con 38 páginas, `verel`, `berol`, `berrl`, `betel`, `berem`, `bere` — 16 queries de marca entraban
como canibalización.

De 400 candidatas, v1 llamaba canibalizadas 400 y v2 llama 11; la población real del sitio son 29.
Quedan ~5 sub-marcas propias (`kover` son 19 fichas de una línea de producto) que no se detectan desde
el dominio: es un límite declarado en la versión, no un pendiente silencioso, y cerrarlo exige una
fuente de marca con autor.

El bump destapó dos defectos latentes que sólo existen cuando hay más de una versión: el piso de
recomputación reusaba snapshots de otra versión y devolvía la versión activa sobre ellos —un campo que
miente—, y la huella congelada de parámetros no puede ver un cambio de fórmula. Lo primero ahora filtra
por versión con su gate; lo segundo tiene vectores dorados que congelan la salida.

## 2026-08-29 — La cola SEO empieza a correr sola, y un detector que avisaba a tiempo no llegaba a nadie

Los dos schedulers del módulo quedaron activos: `ops-seo-work-queue-materialize` (`0 10 * * *`, tras
corrida shadow con la identidad OIDC real y revisión fila por fila) y `ops-seo-competitor-coverage`
(`0 9 18 * *`, ~USD 0,11/mes). Ambos despausados en el **SoT y en vivo**, porque
`upsert_scheduler_job` re-aplica `pause`/`resume` en cada deploy y un resume suelto se revierte solo.

El hallazgo del día no fue técnico sino de enrutamiento: la credencial AXIS que bloqueó el release
**sí tenía detector, y avisó tres días antes** con el modo de falla exacto. Nadie lo leyó porque su
único canal de salida era el color de su corrida, y ese color ya venía rojo por un bug ajeno. Un gate
cuyo único canal es su propio color es un registro, no una alerta; y un detector con rojo crónico
deja de ser un detector. `TASK-1794` recoge el arreglo, con el check de preflight primero — poner la
medición donde alguien esté obligado a mirar.

De paso: la arquitectura afirmaba en cuatro lugares que un scheduler estaba activo cuando estaba
pausado, y el runbook de AXIS documentaba el `.npmrc` con una línea de menos.

## 2026-08-29 — La lente `●`/`◑` llega a producción con mecanismo, no con prosa

Release `b7f74c95a2af` (`released`, watchdog `drift_count=0`). **TASK-1785**: los readers de
`growth/seo` emiten `provenance` **requerido** —así que `tsc` nombra a cualquiera que no lo declare—,
un guard camina el DTO real exigiendo que cada hoja numérica tenga exactamente un dueño, y un censo
compara las superficies contra el filesystem en ambas direcciones. Tool
`get_seo_dual_lens_visibility` federada al gateway: devuelve las dos series separadas y **sin campo
combinado por contrato**.

Viajaron también **TASK-1700** (cola priorizada, 3 migraciones ya aplicadas en la única instancia
Cloud SQL) y **TASK-1792** (curva de CTR con sus 4 estados). `GROWTH_SEO_WORK_QUEUE_ENABLED` prendido
en los dos runtimes por el SoT; el scheduler del materializador sigue PAUSADO a propósito.

Dos hallazgos que no eran el objetivo y valen por separado: el PAT `read:packages` de AXIS llevaba
14 h vencido tumbando 3 de los 4 workers **sin que nada avisara**, y el audit de flags tenía un punto
ciego que **anulaba su propio gate ISSUE-150** (39 de 43 «env vars muertas» eran falsos positivos).
Los dos quedaron documentados y el segundo, arreglado.

## 2026-08-29 — El contrato `●`/`◑` deja de depender de que alguien lea la descripción

`TASK-1785`. Los readers de `growth/seo` emiten `provenance: SeoProvenance[]` en su `ok: true`:
**requerido**, así que `tsc` nombra a cualquier reader que no declare de qué naturaleza es lo que
devuelve. En lista, porque hay DTO genuinamente mixtos — `SeoPerformanceResult` declaraba UNA fuente
mientras su `summary` era siempre Search Console, o sea cifras medidas dentro de un envoltorio
rotulado estimado.

Dos guards nuevos: uno camina el DTO real y exige que **cada hoja numérica tenga exactamente un
dueño** (detecta sin-dueño y con-dos-dueños); otro censa las superficies del lane y del MCP
comparando contra el **filesystem**, en ambas direcciones. Sin ellos, el campo habría sido una
promesa: nada obligaba a que las procedencias declaradas cubrieran lo que hay.

Tool nueva `get_seo_dual_lens_visibility`: las dos series de posición separadas y rotuladas en una
sola llamada, **sin campo combinado por contrato**. Existe para invertir un incentivo — presentar
bien las dos lentes costaba dos llamadas y una decisión, presentarlas mal costaba una y ninguna.
⚠️ **Falta federarla al gateway** (cross-repo): hasta entonces Nexa y los clientes MCP no la ven.

Sin migración, sin flag, sin cambio de valor en ninguna cifra. `dataforseo_serp` quedó como lente
`estimated` y no `measured`: exacto no es medido — esa consulta la hicimos nosotros.

## 2026-08-29 — Las capacidades SEO nuevas pasan de "prendidas" a "ejercitadas"

`domain-overview` y `url-visibility` corrieron por el camino desatendido del scheduler (body `{}`),
con costo real **clavado al preview** (USD 0,01212 y USD 0,024) y re-corrida a USD 0. Los schedulers
tenían `lastAttemptTime` vacío y su próxima corrida agendada era el 16-17 de septiembre. La ventana de
48 h de `ISSUE-164` quedó cerrada midiendo el efecto en `grader_probe_results` (`blocked%` = 0) en vez
del conteo de Sentry, con la salvedad explícita de que la muestra es una sola corrida.

## 2026-08-28 — El módulo SEO tiene una sola cola de trabajo (`TASK-1700`)

- `greenhouse_growth.seo_work_queue_{snapshots,items,decisions}`: aggregate append-only que pasa a ser la
  ÚNICA autoridad de orden del módulo. Antes había cuatro criterios no comparables y el operador abría
  tres pantallas sin que ninguna dijera qué hacer primero.
- El score deja de ser un índice compuesto y pasa a **clics incrementales sobre demanda MEDIDA**, con la
  curva de CTR del propio sitio y su versión persistida en cada fila. Sin demanda medida no se fabrica un
  score: la fila recibe `NULL`, cae a su banda y su verbo honesto es `measure` — y lo impone un CHECK de
  la base, no el TypeScript.
- La lente de oportunidades de `/admin/growth/seo/keywords` cambia de FUENTE del orden sin cambiar de
  forma, detrás de `GROWTH_SEO_WORK_QUEUE_ENABLED` (OFF) con caída al reader legacy. Paridad verificada
  contra PG real: techo idéntico y orden relativo idéntico sobre las keywords compartidas.
- Materializador en Cloud Scheduler + ops-worker (nunca Vercel cron), tres señales de reliability nuevas
  y la capability `growth.seo.work_queue.decide` — ver y decidir son dos permisos distintos.
- Documentación en las tres capas (arquitectura §18, funcional y manual de uso), invariantes nuevos en
  `.claude/rules/growth-seo.md`, y la skill `seo-aeo` (`modules/02_SEO_CONTENT.md`, espejada en `.codex/`)
  gana la implementación de referencia del score más la advertencia comercial: la métrica es *table
  stakes* y lo propio es la COMBINACIÓN curva-propia × cambio-de-posición, una afirmación NEGATIVA que
  exige re-verificación a la fecha antes de cualquier uso comercial.
- **Rollout pendiente:** flag OFF en los dos runtimes, scheduler pausado, sin promover a `main`.

## 2026-08-28 — Landing Agencia de influencers publicada (`TASK-1598`)

- Se canonizó el estilo del brief como `Editorial Premium Brief`: una composición host candidate sobre
  `diagnostic_premium`, con una sola superficie editorial, jerarquía Poppins/Geist, controles accesibles, submit azul
  y decoración semántica. La frontera renderer/host quedó sincronizada en arquitectura, documentación funcional,
  manuales, registry público y skills `.codex/.claude`; copiar los observadores/iconos page-scoped a otra landing
  queda explícitamente prohibido hasta promover metadata browser-safe al renderer.

- El submit del brief abandona el teal heredado y adopta azul Efeonce con texto blanco. El selector de mercado
  reemplaza siglas por banderas SVG circulares para Chile, Colombia, México y Perú, visibles también tras elegir;
  las centra ópticamente, elimina el blur y conserva un outline nítido. Región/otro mantienen iconos semánticos. El
  gate live fija paleta, contraste, persistencia, teclado y responsive.

- Los selects premium eliminan la doble señal visual que mezclaba un caret del renderer con otro pseudo-elemento
  del host. Cada trigger conserva un solo indicador alineado al borde y las opciones mantienen iconos semánticos
  sobre superficies tonales claras, sin bloques azules sólidos. El gate live fija ambos invariantes en
  1536/1440/1414/890/390 y reduced motion.

- El cierre responsive corrige la franja de divulgación IA que a 1414 px dejaba un bloque vacío: ahora es full-bleed
  y conserva la retícula. El form reemplaza sparkle por documento y fija una jerarquía medible Poppins/Geist sin
  peso 650. Los assets mantienen duración, eliminan fechas ficticias y explican publicación, pauta o canales con
  chips tonales; el CTA secundario de ofertas usa contorno navy e icono diagonal. Fidelidad live pasó en
  1536/1440/1414/890/390 y reduced motion; SEO/AEO no tuvo drift.

- El rail estático de cuatro logos se reemplazó por el widget compartido `greenhouse_social_trust` de la landing de
  Redes Sociales. Conserva las tres señales regionales y añade el marquee monocromático canónico `logoMarquee.v2`
  con 3×7 marcas, label/nombre accesible y reduced motion; el gate live cubre composición y overflow en cuatro
  viewports. No se duplicó markup ni se creó otro widget.

- El último refinamiento visual convierte la franja bajo el hero en un rail editorial responsive, añade profundidad
  controlada a “Cinco capas”, usa iconos monocromos reales/semánticos en los destinos de assets y corrige el lenguaje
  visual del form con megáfono y contador próximo al textarea. El gate de fidelidad ahora cubre estos contratos en
  1536/1440/890/390 y reduced motion; el gate SEO/AEO volvió a pasar sin drift de metadata o schema.

- El CTA fijo se refinó como dock Midnight flotante y contenido, con safe-area y targets de 48 px. `Agenda una
  reunión` conserva la única superficie sólida verde; `Cuéntanos tu campaña` usa contorno transparente e icono
  diagonal. El gate live cubre geometría, clipping, superficie, jerarquía e icono en 1536/1440/890/390.

- El brief publicó una v2 `diagnostic_premium`: los dos selects ya no abren el popup nativo, sino comboboxes
  accesibles del renderer. La landing añade 11 marcas semánticas para mercado y activación sin duplicar estado ni
  validación; el gate live abre ambas listas y prueba teclado, overlay, contraste y clipping en cuatro viewports.

- Tras el review live del owner se corrigió una regresión de fidelidad que el smoke inicial no detectó: cargar assets
  no probaba la secuencia. El hero vuelve a rotar tres clips con progreso, play/pausa y sonido; también se restauraron
  badge de derechos, stack social, pulgar decorativo, selección por teclado de ofertas, CTA sticky y reveals. El gate
  nuevo `public-website:verify-influencer-landing-fidelity` ejerce esos contratos en 1536/1440/890/390 y reduced
  motion. Tras el segundo review, el hero mide el masthead Ohio y reserva 32 px adicionales: kicker, teléfono y
  sticker ya no entran en el área visual del header en ningún breakpoint probado. Tras el tercer review se corrigió
  la cascada `font: inherit` que dejaba los CTA en peso 400 y se consolidó un sistema AXIS con siete botones
  primary/secondary/tonal, iconos sin discos de fondo, foco doble, targets ≥44 px y sticky `inert` al ocultarse. El
  hero mantiene una sola acción sólida (`Agenda una reunión`); `Cuéntanos tu campaña` sigue como enlace secundario.
  El intro de conversión se mantiene sticky a 32 px junto al formulario desde 761 px; en móvil se apila y vuelve a
  flujo estático. El intro del FAQ es sticky sólo cuando caben sus dos columnas (>900 px); en 890/390 se apila y
  queda estático para no cubrir el acordeón durante el scroll. El gate cubre estos contratos en 1536/1440/890/390.
- Se corrigió la desaparición del brief: el loader estable de meetings sólo registraba
  `<efeonce-meeting-scheduler>` y dejaba vacío `<greenhouse-form>`. La landing carga ahora el renderer canónico de
  Growth Forms y conserva fallback host-owned. El gate live ya no acepta la mera etiqueta: exige custom element,
  root, siete bloques de campo, CTA submit, altura útil y ausencia del fallback tras montar.
- El brief se rediseñó como una sola superficie editorial premium: encabezado útil, duración, señales de confianza,
  seis iconos semánticos sin discos, controles de 56 px con texto de 16 px, estados focus/autofill/error, consentimiento
  tonal y submit full-width. El cambio es host/CSS page-scoped; no bifurca contrato, validación, Turnstile, destino ni
  tracking. El scorecard visual live quedó en `4.68/5` y el gate cubre el contrato visual en 1536/1440/890/390.
- El último review refinó el ritmo del form, reemplazó la URL cruda por `Consulta nuestra Política de privacidad` y
  convirtió los selects en controles tonales con affordance propia. El acordeón de agenda se retiró: el Growth CTA
  published `influencer-discovery-meeting` abre `open_meeting_scheduler` en diálogo nativo sobre el scheduler
  `discovery`; el smoke live verificó teclado, 390 px, reduced motion y cero enlaces HubSpot sin crear una reserva.
- Se publicó `https://efeoncepro.com/servicios/agencia-de-influencers/` como página Elementor `251627`, conservando
  el header/footer Ohio global y la dirección visual aprobada de Claude Design. El slug responde a intención comercial
  validada en CL, MX, CO y PE; la página sirve canonical, `index, follow`, schema visible y sitemap/lastmod.
- La conversión usa Growth Form gobernado `efeonce-creator-influence-brief` y el meeting canónico
  `fhsf-efeonce-lead-gen-web` / `discovery`; no reconstruye destinos, scheduler, CRM ni tracking en WordPress. El
  menu item nativo `Influencer Marketing` quedó bajo `Servicios Destacados`.
- Los seis clips únicos del diseño están activos y rotulados como visuales ilustrativos generados con IA, no casos ni
  resultados. QA live post-cache cubrió secuencia/interacciones, teclado, form, meeting, FAQ, schema, overflow,
  consola y performance de laboratorio; snapshots de página y menú dejan rollback acotado.
- El hardening SEO/AEO final publicó title y description comerciales, canonical/robots/excerpt, Open Graph/Twitter con
  imagen dedicada `1200×630` y un grafo sin entidades duplicadas: Yoast posee WebPage/Breadcrumb/WebSite/Organization;
  la página completa Service con cinco ofertas y FAQPage con seis respuestas visibles. El gate live nuevo valida
  metadata, imagen, schema, sitemap, menú y HTML inicial. La ruta queda publicada y elegible para indexación, sin
  presentar ese estado como prueba de indexación en Google. Menú: `Soluciones → Servicios Destacados`, después de
  `Redes Sociales`.

## 2026-08-28 — La curva de CTR declara si es utilizable, o la lente no ordena (`TASK-1792`)

- `readKeywordOpportunities` ordenaba por un campo colapsado a cero. `expectedCtrAt` preguntaba «¿está el
  bucket en el `Map`?» cuando la pregunta era «¿hay muestra para estimar un CTR?»: con un bucket presente y
  sin clics (`efeoncepro.com`: 75 impresiones, 0 clics en la posición objetivo) el guard devolvía `0`, la
  ganancia estimada colapsaba en **toda** la lente y el `.sort()` quedaba en no-op. La pantalla no ordenaba
  mal: **no ordenaba**, y nada fallaba. Medido contra PG el 2026-08-28: Efeonce 24/24 filas en cero; Berel,
  con curva sana, 1.445 de 1.798 (80%) empatadas. El disparador está garantizado en todo target recién
  onboardeado, así que no es un defecto de un cliente.
- Primitive nuevo [`src/lib/growth/seo/ctr-curve.ts`](src/lib/growth/seo/ctr-curve.ts): la curva se lee **sin
  `HAVING`** (un filtro en el SQL borra el bucket y vuelve indistinguible «no vino» de «vino sin muestra»),
  transporta su muestra por bucket y declara su usabilidad con un piso de **dos dimensiones** — impresiones
  **y** clics, porque la precisión de un estimador de tasa la gobiernan los éxitos. El umbral `1000/5` se
  **adopta** de `work-queue/score-versions.ts` y lo sostiene un test que compara el **veredicto** del
  predicado sobre nueve curvas fixture, no las constantes.
- El envelope de `KeywordOpportunitiesResult` gana `ctrCurveSource`, `curveSampleSize`, `orderedBy`,
  `targetPosition` y `expectedCtrAtTarget`. Cuando el techo no discrimina —curva no utilizable, o ganancia
  idéntica en todas las filas— la lente ordena por **demanda medida** (impresiones × cercanía a página 1) y
  lo declara. Los tres consumers (page server, lane ecosystem, tool MCP) son passthrough y heredan la
  procedencia sin lógica propia.
- El `FALLBACK_CTR_CURVE` declaraba 6% en la posición objetivo contra ~1% medido en dos sitios independientes:
  estaba calibrado para una SERP que ya no existe. Se reemplaza por **forma de referencia + nivel estimado del
  propio sitio** (un parámetro medido en vez de veinte prestados), con la curva expuesta forzada monótona no
  creciente — el híbrido anterior producía bucket 8 en `0,0000` junto a bucket 9 en `≈0,027`.
- Verificación: 663 unitarios + `src/lib/growth/seo/ctr-curve.live.test.ts` contra PG real, **4 passed, no
  `skipped`**. Cierra la costura que dejó pasar el defecto: los mocks ejercitaban el TS sin el SQL y el sanity
  el SQL sin el TS. Levanta el bloqueo del cutover de `TASK-1700`.

## 2026-08-28 — LicitaLAB: MCP oficial + radar Playwright autenticado y gateado

- La skill espejada `greenhouse-public-private-tenders` incorpora el companion `licitalab-mcp.md` en
  [Codex](.codex/skills/greenhouse-public-private-tenders/licitalab-mcp.md) y
  [Claude](.claude/skills/greenhouse-public-private-tenders/licitalab-mcp.md), con endpoint OAuth, inventario live
  de cinco tools read-only, recetas por oportunidad/proveedor/documentos, estados RAG, límites y canary verificado.
  El bundle entra a `pnpm skills:mirrors` para impedir que ambos agentes operen licitaciones reales con contratos
  distintos.
- `pnpm licitalab:radar:setup` guarda la credencial local ignorada con modo `0600`; `pnpm licitalab:radar`
  reutiliza un perfil Chrome aislado, pagina la vista autenticada y emite un reporte `efeonce.licitalab-radar.v1`
  bajo `.auth/`. El canary leyó 45 oportunidades únicas atravesando la primera página. Discovery no postula ni
  escribe CRM: los códigos pasan al MCP para análisis documental y cualquier promoción a HubSpot conserva
  confirmación humana, asociación y readback.
- Frontera canónica explícita: **LicitaLAB ve licitaciones públicas solamente**. Toda fila mantiene
  `public_opportunity` y cualquier `Proposal` derivada usa `origin='public_tender'`; nunca se interpreta una
  modalidad pública como `private_rfp` ni se mezcla este radar con Wherex, Ariba, Coupa u otras fuentes privadas.
- El contrato descubierto de promoción a HubSpot quedó documentado en la skill de licitaciones y en
  `hubspot-greenhouse-bridge`: upsert por ID + `gh_idempotency_key`, reutilización de Company, asociaciones
  idempotentes sin contactos ficticios, URL directa, y separación de `fecha_de_cierre_de_licitacion` versus
  `closedate`. La precedencia es cliente existente → Core; nueva cuenta por Licitación → Strategic Bets; Compra
  Ágil nueva queda `policy_required`. El bridge actual todavía no transporta esos campos ni resuelve todas las
  identidades/asociaciones; es contrato objetivo para automatización. La carga manual confirmada usa el MCP de
  HubSpot como writer gobernado y no queda bloqueada por esa brecha.
- La etapa inicial quedó fijada por metadata live: una candidata aprobada entra a `Pipeline de ventas`
  (`default`) en `Calificado para comprar` (`qualifiedtobuy`), nunca en `Cita programada`; las filas crudas del
  radar permanecen fuera del CRM. La skill documenta el avance técnico→muestra opcional→precio→formalización→cierre
  y excluye el pipeline de Shared Selling. El snapshot completo de 99 deals LicitaLAB mostró 95 perdidos, 3 ganados,
  1 en `appointmentscheduled` y 0 intermedios, por lo que el histórico no se canonizó como workflow.
- Primera promoción live aprobada y releída: la oportunidad `1098710-22-LP26` creó Company HubSpot `57870164778`
  y deal `64461187076`, asociado en `default/qualifiedtobuy`, `Strategic Bets`, CLP 250.000.000, con deadline y
  adjudicación separados. La Company terminó con `num_associated_deals=1`; no se inventó contacto.
  `gh_commercial_party_id` permanece vacío y la automatización por bridge continúa pendiente.
- La promoción manual se amplió con ProChile (`deal 64482163516` ↔ Company `31209269815`) y Defensoría
  (`deal 64471071912` ↔ Company nueva `57878590071`). ProChile quedó `Core Pipeline`/`existingbusiness` porque la
  Company es cliente vigente; Defensoría quedó `Strategic Bets`/`newbusiness`. Ambas usan
  `default/qualifiedtobuy`, conservan fechas separadas y tienen una sola coincidencia por `gh_idempotency_key`.
  `gh_deal_origin` queda vacío: el enum live sólo admite `greenhouse_quote_builder` y nunca se etiqueta una
  licitación con un origen falso.
- El radar ampliado leyó 163 oportunidades y se promovieron otras cinco con Company y asociación verificadas:
  UOH/web (`64466117716`), Beneficios Estudiantiles/medios (`64482321775`), Campaña VCM (`64466272830`),
  Valparaíso/paid media (`64469214508`) y JUNJI/RFI ticketing (`64469523247`). Cada búsqueda por
  `id_de_licitacion` devolvió una sola fila; no se asociaron contactos sin evidencia. Los cinco nuevos Deals no
  recibieron `gh_idempotency_key` en la carga aprobada, por lo que esa propiedad queda como brecha explícita y no
  como garantía supuesta.
- Se creó `docs/commercial/tenders/LICITATION_CRM_REGISTER.md` como índice operativo compartido para Codex y
  Claude, actualizado con diez oportunidades y ocho Deals verificados. Registra decisión, postulación, fechas, IDs/enlaces y
  asociaciones sin desplazar las fuentes autoritativas; el histórico de 99 deals permanece sólo en HubSpot.
- El patrón se extendió a `docs/commercial/CRM_DEAL_REGISTER.md`: vista transversal para negocios Core, Strategic
  Bets y otros orígenes, con una fila sólo después de verificar el Deal en HubSpot. Las licitaciones promovidas se
  sincronizan en ambos registros por `deal_id`; las oportunidades todavía en radar permanecen sólo en bid desk.
- El segundo lote público y ocho RFP privados Wherex elevaron el registro a 30 oportunidades revisadas y 24 Deals
  verificados. Al 2026-08-29 hay 23 Deals abiertos de esta admisión y uno `closedlost`; HubSpot suma además el RFI
  CRM Mineduc anterior al corte, para 24 Deals de licitación abiertos en total. Ajinomoto ya está `closedlost`.
- La skill espejada suma `crm-portfolio-operating-model.md`: promoción común con segundo readback posterior a
  automatizaciones y cartera separada en diez bids prioritarios, tres RFI livianos y diez gates previos.
- El readback live encontró los ocho Deals Wherex en `Core Pipeline` pese a que continúan `newbusiness`; se registra
  la deriva frente a la política `Strategic Bet` sin corregirla silenciosamente. CINTERMEX queda `HOLD vencido /
  portal no verificado` y los cuatro IDs de Grupo Reditos quedan `No bid` por decisión del operador.

## 2026-08-28 — El candidato de discovery no declara pertinencia (hueco documentado y levantado)

- Auditando la salida del smoke apareció que el candidato **no transporta ninguna señal de marca,
  categoría ni relevancia** — ni en la tabla ni en el DTO. Consecuencia medida: 50 keywords de
  consumidor sobre ChatGPT (`chatgpt en linea`, `chatgpt rojo`) pasaron **todos** los checks para un
  target que vende servicios AEO B2B.
- 🔴 El vector estructural no es elegir mal la seed: es **`TASK-1662`**. En el gap competitivo los
  candidatos salen de dominios del competidor, así que **las seeds las elige él**, y sirve segmentos
  que el cliente no. Ahí no hay operador a quien educar.
- ⚠️ **La urgencia que se argumentó primero era falsa, y se corrigió el mismo día** (`65372ea68`).
  Se afirmó que el orden por defecto pondera volumen y que la cola append-only de `TASK-1700`
  congelaría lo irrelevante arriba. No ocurre: `work-queue/priority-score.ts` no mira el volumen
  estimado del proveedor, y el CHECK `basis_band_score` impide fabricar un score sin demanda medida —
  un candidato irrelevante **sin** impresiones cae a banda 3 con score `NULL` y no compite. El caso
  que sí sostiene la task es el otro: keyword irrelevante **con** impresiones reales, que atraviesa
  el CHECK y entra a la cola. El vector es la demanda medida, no el volumen del proveedor.
- **Levantada como `TASK-1791`** (`to-do`, P1, `EPIC-022`, `backend-data`, `Blocked by: none`), sin
  dueño asignado todavía. La señal entra como **factor del item con su procedencia, jamás como
  entrada del `priority_score`**: `evidence_ref` es opaca por contrato (cero FK, cero JOIN al motor
  que produciría la señal), así que puntuar con ella sería puntuar con algo que el aggregate no puede
  citar. El hallazgo queda además en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 (no sólo en una
  bitácora que rota) porque tres sesiones lo verificaron por separado el mismo día.

## 2026-08-28 — El drain de keyword discovery baja de 10 a 2 minutos

- `ops-seo-keyword-discovery-drain` pasa de `*/10` a `*/2`. `Descubrir` es un workbench
  interactivo: el operador encolaba y esperaba **5 minutos de media, 10 en el peor caso**, cuando la
  corrida en sí tarda segundos. El `*/10` no compraba nada — el drain con cola vacía es no-op, así
  que correrlo 5× más seguido **no gasta un centavo más**. Es la cadencia que `ops-outbox-publish`
  ya usaba por el mismo motivo.
- Seguro a esta cadencia: el claim de la corrida es un `UPDATE` condicional
  (`WHERE status='pending' … RETURNING`), así que un segundo worker matchea cero filas y responde
  `busy` sin tocar al proveedor.
- Aplicado en los dos lugares (SoT `services/ops-worker/deploy.sh` + `gcloud scheduler jobs update`).
  ⚠️ `main` todavía declara `*/10`: hasta el próximo release, un deploy del worker desde `main`
  revertiría el schedule en silencio. Documentado en el Handoff.

## 2026-08-28 — Release a producción `e82c18579b05`: el contrato de discovery corregido, vivo

- Paso a producción de **TASK-1694** y **TASK-1692** (PR #209, 30 archivos de código, **cero
  migraciones**). Manifest `released` en un solo run del orquestador (`33208942436`, 12m51s), ambos
  gates `production` aprobados sin stall, watchdog `ok` con `drift_count=0`.
- **Primer release del ledger que pasa sin break-glass desde un batch de dos tasks.** La razón es
  estructural: sin migraciones no hay dominio irreversible, así que el classifier dio `ship` limpio.
- **Cero flags que prender.** El release no introduce ninguno, y los que gatean el dominio ya
  estaban `true` en Production — verificado leyendo el VALOR, no la presencia.
- 🔴 **Verificado con canary de contrato, no sólo con el manifest.** Producción respondió
  `maxLinkBarrier aceptado; ignoredFilters=maxDifficulty` (TASK-1694 ejecutándose), y el lane
  devolvió **400** a un consumer intentando escribir `promoted_to_tracking` o el retirado
  `selected_for_target` (TASK-1692: el boundary de escritura vivo). Un manifest `released` prueba
  despliegue; el canary prueba comportamiento.
- Gateway MCP desplegado con el schema federado nuevo de `get_seo_keyword_discovery`.
- **Smoke con gasto ejecutado el mismo día** — 3 corridas, USD 0,0482, MX y CL, los dos endpoints
  cuyo payload cambió. Las tres `succeeded`: el payload sin `filters` es aceptado por Labs (riesgo
  de la matriz refutado con evidencia) y `volumePolicy: "all"` quedó persistido en el snapshot.
- 🔴 **Y desmintió la justificación escrita de la propia task**: 102 candidatos, 2 endpoints, 2
  mercados → CERO con volumen nulo o cero. Los índices de sugerencias e ideas del proveedor sólo
  devuelven keywords con volumen medido, así que el filtro que se quitó era un **no-op** ahí; los
  nulos aparecen sólo en `keyword_overview`, que nunca lo llevó. Quitarlo sigue siendo correcto
  (elimina una asimetría no declarada), pero el beneficio prometido no tiene evidencia. `TASK-1700`
  (P0) queda desbloqueada y con su prerequisito de runtime cumplido.

## 2026-08-28 — TASK-1692: el candidato de discovery recuerda qué se decidió sobre él

- **El hecho lo escribe el primitive que lo produce, jamás el consumer.** De los cinco
  `action_kind` que el dominio declaraba, sólo `dismissed` tenía writer: preparar consultas AEO o
  promover a seguimiento pasaban de verdad y no dejaban rastro. Ahora `createGroundedQueryDraft`
  escribe `selected_for_grounded_query` y `applyKeywordTracking` escribe `promoted_to_tracking`
  **en la misma transacción que abre la membresía**. Si el writer viviera en cada consumer,
  bastaría con que se cayera la red entre las dos llamadas para dejar el compromiso de gasto hecho
  y la decisión sin autor.
- **Guard en runtime, no sólo en test:** los dos lanes validan contra
  `SEO_DISCOVERY_CONSUMER_ACTION_KINDS`, así que `promoted_to_tracking` deja de ser escribible
  desde afuera. `record_action` queda para lo que una persona decide sin que ningún command lo
  produzca — descarte, rechazo y la **re-selección** de un descartado, que ahora existe y no
  necesitó ni command nuevo ni migración: el ledger es append-only, así que re-seleccionar ES
  escribir una decisión posterior que supersede al descarte.
- **`selected_for_target` retirado del enum TS**, con el `CHECK` de la base intacto para que una
  fila histórica siga siendo legible. No tenía writer y no podía tenerlo: la intención es atributo
  de la MEMBRESÍA con autor y fecha, así que un candidato que no se sigue no puede tener intención
  declarada.
- **Efecto visible sin un solo cambio de UI:** el chip del candidato se mueve solo (deja de decir
  "Nuevo" tras un draft AEO o una promoción) y el inbox deja de poner arriba lo ya resuelto.
- **Los grados de atomicidad se declaran, no se disimulan.** Tracking es atómico. El bridge grounded
  no puede serlo —el draft se escribe en otra conexión— así que expone `decisionLogged: false` +
  aviso en vez de callarlo o descartar un draft que ya pagó una llamada LLM; repetir la acción
  repara la fila sin crear un draft nuevo.
- Sin migración, sin flag, sin capability. **Sin backfill a propósito**: inventar `actor` y
  `created_at` sería fabricar autoría en un log de decisiones.
- Verificado contra PG real en transacciones que abortan (11/11 + 12/12), incluido que con un
  candidato inexistente **no queda membresía**. Tres falsos verdes destapados en el camino: el
  check del trigger append-only pasaba sobre tabla vacía (es `FOR EACH ROW`), un mock devolvía la
  fila del target para cualquier consulta, y el parser del guard nuevo devolvía lista vacía.
- Estado: **`code complete, rollout pendiente`** — falta verificación funcional en staging.
  Desbloquea `TASK-1700`, que queda `Blocked by: none`.

## 2026-08-28 — TASK-1694: en descubrimiento SEO, un candidato es una keyword y la dificultad cruda deja de decidir

- **`maxDifficulty` se acepta pero ya no filtra**, y la respuesta lo declara en `ignoredFilters`
  con su reemplazo. El filtro canónico es `maxLinkBarrier` (`low|medium|high`) sobre la barrera
  derivada por `deriveLinkBarrier`, con `includeUnknownBarrier` (default `false`): "Sin dato" no
  es "Baja". Medido contra el store real: **764 de 923 filas tienen `keyword_difficulty = 0`**, así
  que en es-LATAM el filtro viejo no discriminaba nada — sobre la corrida productiva,
  `maxDifficulty=20` devolvía las 10 keywords, barrera Alta incluida.
- **El reader colapsa por `normalizedKeyword`**: la misma keyword hallada por dos métodos es UNA
  fila con `candidateIds[]` + `provenance[]`, y `totalCandidates` cuenta keywords distintas. Es
  cambio de cardinalidad del contrato, no de la UI: aguas abajo la cola priorizada (TASK-1700) es
  un aggregate append-only y habría congelado la misma decisión hasta cuatro veces, con cuatro
  compromisos de gasto sobre una sola intención. Levanta su bloqueo duro.
- **`clusterConflict`** advierte canibalización contra el set seguido del target (hasta 5 miembros
  nombrados + total), derivado al leer y con **cero llamadas al proveedor**. Señal separada de
  `alreadyTracked`, con `unknown` que nunca se lee como `clear`.
- **Los cuatro adapters de expansión compran igual**: `keyword_suggestions` y `keyword_ideas` dejan
  de mandar `filters` de `search_volume`. El filtro no abarataba la llamada (se paga por fila y el
  `limit` ya la acota) — sólo cambiaba qué se compraba por el mismo precio, y en mercados ralos se
  comía el long-tail. Cada corrida persiste su `volumePolicy`; las anteriores se leen con el
  default histórico.
- 🔴 **Un defecto propio lo destapó la verificación runtime, no los tests**: `core_keyword IS NULL`
  se estaba leyendo como "no se sabe" y dejaba 8 de 10 candidatos en `unknown`, escondiendo
  colisiones reales. El proveedor no emite el core cuando la keyword YA ES la canónica del clúster
  (527 nulos, 396 apuntando a otra, **cero autorreferentes** en 923 filas), así que el core efectivo
  es `core_keyword ?? la keyword misma`.
- Federado en el mismo PR: route admin, lane ecosystem y tool MCP `get_seo_keyword_discovery`. El
  gateway `efeonce-mcp` tiene su commit local (espejo de inventario, schema, descripción y canary,
  67 tests verdes) **sin push**: viaja con su próximo release.
- Estado: **`code complete, rollout pendiente`** — falta la corrida de smoke con gasto (~USD 0,013)
  y el deploy del gateway.

## 2026-08-28 — Release a producción `c983be7f18e6`: carril Growth/SEO vivo, flag prendido y gateway MCP a 27 tools

- Paso a producción end-to-end del trabajo del día (PR #208, 181 archivos, 4 migraciones):
  **TASK-1696** (dimensión de consumidor del ledger de gasto DataForSEO), **TASK-1662** (fundación
  del gap competitivo), **TASK-1699** (top-N del SERP + descubrimiento de competidores por
  recurrencia) y **TASK-1652** (request AI Mode del grader). Manifest `released`
  (`c983be7f18e6-92b1b327-a1c9-4e7a-85dc-6a5e300f4e32`, run `33178544139`, 11m41s), watchdog `ok`
  con `drift_count=0`. Break-glass por `db_migrations` con razón verificada: las 4 migraciones ya
  figuraban aplicadas en la instancia única Cloud SQL antes del dispatch.
- `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` quedó **ON en los dos runtimes**: ya estaba en el
  `ops-worker` (escritura) y este release lo prendió en Vercel Production (lectura) con su redeploy
  obligatorio. La verificación no fue "la env var existe" sino el canary contra producción
  devolviendo `ok:true` en vez de `disabled`.
- El gateway `mcp.efeonce.org` pasó de **21 a 27 tools SEO** (revisión
  `efeonce-mcp-gateway-00024-8b8`): entran `get_seo_provider_spend`, `get_seo_keyword_gap`,
  `declare_seo_competitors`, `retire_seo_competitors`, `get_seo_serp_top_results` y
  `get_seo_competitor_candidates`, sin un solo cambio en Entra — los writes viajan en el scope
  `efeonce.mcp.seo.write` existente y siguen fail-closed hasta TASK-1631.
- **Corregida la regla del merge canónico en los 5 lugares que la prescribían** (runbook, playbook,
  las dos skills espejadas de release y el manual del orchestrator, que contradecía al resto). Ya no
  cuenta V1: la clasifica. Sólo squashes de release ⇒ `-s ours`; un hotfix cuyo contenido no volvió a
  `develop` ⇒ parar y reconciliarlo. Cuarta verificación nueva (`--diff-filter=A`) y `-X ours`
  degradado a excepción con auditoría completa obligatoria.
- **`TASK-1790` registrada**: el merge canónico `develop←main` pasa de regla en prosa a gate ejecutable
  (`pnpm release:merge-canonical`), que clasifica los commits divergentes contra `release_manifests` y se
  detiene ante lo que no reconoce. Se registra porque la prosa ya se había corregido una vez y no alcanzó:
  tres releases seguidos pisaron la misma clase de bug.
- Barrido documental post-release: gateway MCP a 27 tools en skills/runbook/manuales, estado de flags
  por runtime en arquitectura del módulo SEO + rules + skills `dataforseo-operator` + EPIC-022, y
  deltas 2026-08-28 en 15 tasks con impacto cruzado. `TASK-1699` y `TASK-1662` quedan a propósito en
  `in-progress`: la serie del top-N no arranca hasta el 2026-08-29 y el Slice 4 de 1662 sigue
  bloqueado por `TASK-1700`.
- Hallazgo de proceso: la regla del merge canónico del runbook (`-s ours` sólo si V1 está vacía)
  está mal formulada para un flujo con squash-merge, donde V1 nunca está vacía. `-X ours` volvió a
  duplicar contenido documental y a resucitar tasks en un lifecycle viejo **con la V2 vacía**; la
  pregunta correcta es si `main` aporta archivos propios.

## 2026-08-28 — TASK-1699: el top-N del SERP ya pagado deja de tirarse (code complete, rollout pendiente)

- El rank capture diario compra el SERP completo (`depth 20`) y descartaba ~19 de 20 filas. Ahora
  `seo_serp_top_results` (append-only estricto, ranura `rank_absolute`) las persiste con **costo
  marginal CERO** (test de no-regresión sobre `buildSerpTask`), en la misma transacción que el
  snapshot de rank y con fallback que jamás pierde la medición pagada. Encima: descubrimiento de
  competidores por recurrencia medida (propose→confirm hacia `declareCompetitors` de TASK-1662),
  lanes sólo-internal, 2 tools MCP federadas (inventario a 27) y señal de cobertura con pérdida
  irrecuperable declarada. Flag dual-runtime **ON y VIVO en el worker el mismo día** (el
  Ops Worker Deploy corre en cada push a develop; revisión `ops-worker-00610-kc8` verificada) —
  **día 1 de la serie: 2026-08-29**; el scheduler de cobertura de competidores quedó ENABLED tras
  verificar el endpoint con dry-run real. Sanity 9/9 contra PG real con rollback sin residuo.

## 2026-08-28 — TASK-1662: keyword gap competitivo (code complete, rollout pendiente)

- El módulo SEO gana la fundación de su tercera pregunta ("¿qué me estoy perdiendo entero?"):
  competidores DECLARADOS con autoría acoplada por CHECK (`declareCompetitors`/`retireCompetitors`,
  techo por target, outbox `growth.seo.competitor.*`, 3 lanes + tools MCP federadas en local),
  captura de cobertura vía `labs/domain_intersection` (flag `GROWTH_SEO_COMPETITOR_GAP_ENABLED`
  OFF + scheduler `ops-seo-competitor-coverage` pausado; run ledger anti fuga de re-compra;
  mercado compartido productor #4 a costo 0) y `readKeywordGap` que DERIVA el gap al leer:
  exclusión por GSC medido, contenido vs optimización vs objetivos declarados, factores con
  `sin_dato` y **sin orden propio** (la cola de TASK-1700 es la autoridad de orden). Migración
  `20260828113457119` aplicada; sanity 22/22 contra PG real. Slice 4 (emisión a la cola)
  bloqueado por TASK-1700; rollout con autorización del operador
  (`docs/manual-de-uso/growth/operar-gap-competitivo-seo.md`).

## 2026-08-28 — Outreach de partnership para agencias con Higgsfield y Magnific

- Investigación vigente y formularios enterprise enviados a ambos providers para explorar un partnership de agencia
  orientado a clientes enterprise en LATAM. Las dos páginas confirmaron recepción; el registry mantiene el estado
  `Postulación enviada`, sin inferir reseller, co-selling, certificación ni economics hasta recibir evidencia
  contractual. Constancia: `docs/audits/commercial/HIGGSFIELD_MAGNIFIC_AGENCY_PARTNERSHIP_OUTREACH_2026-08-28.md`.
- Magnific respondió mediante su Enterprise BDR EMEA & LATAM y derivó la conversación a
  `ai-partnerships@magnific.com`. La ruta oficial queda verificada, pero el estado comercial no cambia a partnership
  activo hasta recibir aceptación y términos. El outreach especializado quedó enviado desde Outlook Web, con Susana
  en copia y la firma configurada de Julio.

## 2026-08-27 — TASK-1696: el ledger de gasto aprende quién gastó y de qué tipo es el dólar

- `greenhouse_growth.seo_provider_spend_daily` gana `consumer` (`seo`|`aeo`), `cost_basis`
  (`invoiced`|`estimated`) y `price_table_version` acoplado por CHECK. Clave única de seis columnas
  con `NULLS NOT DISTINCT`. **Un solo ledger**: lo que se separa es el resolver de presupuesto.
- El grader AEO deja de comprar fuera del ledger: `postDataForSeoTask` exige `consumer`, el adapter
  de AI Mode migró del wrapper congelado al transporte canónico y `ProviderAdapterContext` lleva la
  organización derivada del perfil, server-side.
- `resolveAeoBudget` da presupuesto en dólares per-org al grader, con las dos monedas separadas y
  restando la porción DataForSEO del estimado para no contarla dos veces. Gate **en shadow**: dos
  flags, ambos OFF.
- Tres señales nuevas en `/admin/operations`: `growth.dataforseo.spend_ledger_drift`,
  `growth.ai_visibility.observation_yield` y `seo.provider.cost_over_budget` — esta última la
  citaban nueve tasks como mitigación y no existía en código.
- Documentación sincronizada: arquitectura (módulo SEO §1.1/§6/§9/§13.1, grader, control plane de
  reliability), doc funcional + manual nuevos en `docs/{documentation,manual-de-uso}/growth/`, la
  rule de auto-load `.claude/rules/growth-seo.md` y la skill `dataforseo-operator` con su espejo
  Codex (cuerpo idéntico, verificado a mano: el validador de espejos NO cubre esta skill).

## 2026-08-27 — TASK-1777 complete: la tríada anti-Semrush queda cerrada entera

- El operador decidió cerrar TASK-1777 con su rollout ya ejecutado (flag ON, lane en producción,
  `get_seo_backlink_detail` entre las 21 tools del gateway) y el único criterio no observado —
  predicado de movimiento a USD 0 — convertido en follow-up F1 con fecha y dueño (lunes
  2026-08-31, receta SQL en el Delta (3) del task file). Con esto 1775/1776/1777 + 1658 están
  `complete`; gasto total del rollout de la tríada: USD 0.2958.

## 2026-08-27 — Gateway MCP desplegado y cierre de la tríada SEO (TASK-1658/1775/1776)

- Federación en producción: revisión `efeonce-mcp-gateway-00023-zt2`, `tools/list` autenticado observado en **21 tools SEO** (antes 13), con las 8 recién federadas presentes. Canary del provider verde contra producción para Efeonce y Berel.
- **El `oauth:canary` tenía un punto ciego de inventario y se cerró**: ejercitaba `tools/call` sobre tools puntuales y nunca `tools/list`, así que una tool que quedara fuera del server pasaba invisible mientras las probadas siguieran verdes. Ahora asserta el inventario (`efeonce-mcp` commit `4058a07`). El charset del nombre incluye el punto a propósito — las tools no-SEO son punteadas (`hiring.talent_pool.search`) y sin él el total excluía Globe y Hiring en silencio, reportando el conteo SEO como si fuera el total.
- `TASK-1658`, `TASK-1775` y `TASK-1776` pasan a `complete` con `task:lint` 0/0. Queda un residual declarado en 1775 (sujeto desconocido → fila NULL: cubierto por unit test, no observado en runtime) y la verificación del lunes 2026-08-31 para `TASK-1777`.

## 2026-08-27 — Release a producción del carril Growth SEO (TASK-1652/1658/1709/1775/1776/1777)

- Promovido `develop`→`main` como **un solo release**: PR #207, 632 archivos, 10 migraciones, target `cc73c74789ce`, release_id `cc73c74789ce-dbce65f2-303b-4528-bef3-f4edd022a880`, orquestador `33123977671`, manifest **`released`** en 9 min 40 s sin retry ni gate colgado. Llegan a producción los lanes ecosystem de la tríada SEO, el lane de diagnóstico de prospecto, la corrección del request AI Mode del grader y la federación MCP; más el cierre de hiring que quedaba en develop.
- **Flags prendidos con el release** (ambos requerían que su lector estuviera en `main`, regla ISSUE-150 — verificado x0 antes y x1/x2/x3 después): `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` (Vercel, sign-off comercial del operador) y `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (Vercel Production; en ops-worker ya estaba ON). Redeploy `greenhouse-if2u2c8ys` porque Vercel congela env vars al build; `pnpm flags:audit --strict` cierra en 0/0.
- **Los 3 gotchas del squash-merge se pre-emptaron, no se sufrieron**: merge canónico `-s ours` con ambas verificaciones vacías; el push a develop se bundleó con una edición del `FEATURE_FLAG_STATE_LEDGER` (está en `deployControlDocs` y fuerza el build de staging, evitando el `vercel_readiness` en exit 1); el Playwright smoke sobre `main` se produjo en 3 min en vez de taparlo con bypass. El `bypass_preflight_reason` quedó reservado para `db_migrations`, único dominio irreversible real, con razón auditable (migraciones ya aplicadas en la instancia única Cloud SQL).
- ⚠️ **El watchdog post-release recomendó una regresión.** Reportó DRIFT en 3 workers comparando contra `gh=6f7e246ea888` (commit del 2026-07-30, ancestro del target) y propuso redeployar `hubspot-greenhouse-integration` con ese `expected_sha` — pisar código correcto con código de un mes atrás. No se ejecutó: `pnpm release:workers` (lee Cloud Run, fuente autoritativa) mostró 3/4 workers exactamente en el target y el `ops-worker` en change-gate legítimo, verificado con las **28 rutas reales** leídas del workflow y diff vacío. Es la clase de falso positivo abierta hasta TASK-920.

## 2026-08-27 — El provider Google AI Mode del AEO grader deja de mentir "sin bloque AI" (TASK-1652)

- Los runs productivos del grader (market ISO-2) fallaban per-task en DataForSEO por `location_name` inválido y el fallo se clasificaba `skipped:no_ai_overview_block` — 60 observaciones históricas eran ese falso negativo (54 con el error exacto `40501`). Fix: mapa cerrado market→`location_code` verificado en vivo (CL=2152, MX=2484, CO=2170, PE=2604, US=2840) + gate per-task por `status_code` (el skip honesto queda reservado para tasks `20000` realmente ejecutadas). Regrade descartado con evidencia: los tasks fallidos nunca se ejecutaron y río abajo skip/failed pesan igual.
- El parser ahora desciende a las `references[]` anidadas de los `ai_overview_element` (dedupe por URL), y el smoke live destapó que Google envuelve TODA reference en redirects propios (`domain: google.com` + `goto?url=<token>`): la atribución ahora deriva el dominio real desde `source` cuando es domain-shaped y descarta honesto (contado en `usage.dataforseo_citations_unattributable`) lo no atribuible — antes todo el SoV de citabilidad se atribuía a google.com. Herencia declarada en `TASK-1311`. AIO producción sigue OFF (TASK-1341).

## 2026-08-27 — El módulo SEO gana el tier `prospect`: diagnóstico sin contrato y sin acceso del cliente (TASK-1709)

- Nuevo carril de adquisición `src/lib/growth/seo/prospect/**`: una corrida ÚNICA por dominio con tope duro POR DIAGNÓSTICO (min(USD 1,00, restante mensual de Efeonce), validado contra el forecast del conjunto ANTES de la primera llamada), idempotencia por dominio/mercado/día (repetir = USD 0), y gasto de adquisición atribuido a `EO-ORG-0007` en el ledger único. Estrena 4 endpoints de familias ya permitidas (`ranked_keywords` +`ai_overview_reference`, `competitors_domain`, `backlinks/competitors`, `domain_intersection`) — el colector de competidores que `TASK-1662` consumirá.
- Todo hecho nace con lente `estimated` + `captured_at` (CHECK de un solo valor) y el contrato de salida no tiene score/veredicto/benchmark/lift; la evidencia de sitio se delega al sustrato (`site-substrate`, USD 0) y un bloqueo del sitio es un hallazgo, no un obstáculo. Cero captura recurrente sobre prospectos (sin cron/scheduler; test fuente + DO guard).
- Full API Parity mismo PR: lane app + lane ecosystem (`internal`-only) + MCP `get/run_seo_prospect_diagnostic`; capabilities `growth.seo.prospect_diagnostic.{run,read}` seedeadas + granteadas; señal `growth.seo.prospect_diagnostic.cost_overrun` (steady 0); evento `growth.seo.prospect_diagnostic.completed`.
- Corrida real verificada (skyairline.com CL): forecast USD 0,205 vs real 0,1991, ledger Δ exacto, idempotencia USD 0, cost_blocked con cero llamadas. Flag `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` default OFF (Vercel V1); ON sólo con decisión del operador.

## 2026-08-27 — Gemini Omni 1.1 entra al gobierno de la flota, no al runtime

- Investigación oficial de Gemini Omni 1.1 Flash: se separan Developer API (`gemini-omni-1.1-flash`, modelo listado Stable) y Google Cloud (`gemini-omni-1.1-flash-preview`, Pre-GA), ambas sobre Interactions `v1beta`; se documentan capacidades, precios, cuotas, residencia, retención, C2PA, restricciones regionales y contradicciones del proveedor.
- `TASK-1781` queda creada como P0 para migrar antes del shutdown anunciado de `gemini-omni-flash-preview` el 2026-09-30 y expandir capacidades por rutas/output shapes independientes, sin heredar evidencia del modelo anterior.
- Nueva route card candidata y actualización espejada de `greenhouse-globe-model-fleet` y las referencias Omni de `motion-design-studio`. Sin cambio de binding, deploy, gasto, canary ni promoción: 1.1 sigue `gated` hasta readback live.

## 2026-08-27 — El perfil de enlaces gana nombres propios, con el gasto condicionado al movimiento

- `TASK-1777` (code complete, rollout pendiente): el snapshot semanal de enlaces decía "perdiste 12 dominios" sin decir CUÁLES. Nacen las tablas hijas del snapshot con el detalle accionable: qué dominio enlazó/se cayó (con muestra del enlace y anchor — suficiente para el correo de recuperación) y el perfil de anchors con una lectura de **sobre-optimización** nueva y separada de `toxic_share` (miden cosas distintas; ninguna reemplaza a la otra).
- El corazón no es el endpoint sino la **condición de disparo**: el drill-down corre como paso del cron semanal existente (sin scheduler nuevo) y SOLO donde el `new_lost_delta` ya persistido muestra movimiento — un target estable registra su veredicto a USD 0, y ese veredicto persistido (`seo_backlink_drilldowns`) es lo que permite al reader distinguir "el perfil estuvo estable" (hallazgo positivo) de "no sabemos qué pasó" (drill-down fallido, señal en rojo).
- `rank` siempre en escala 0-100; el movimiento nominal se pide sólo en la dirección que el delta indica; el shape de `readBacklinkProfile` queda intacto (test de regresión). Lane ecosystem `/growth/seo/backlink-detail` + tool MCP `get_seo_backlink_detail` + señal `seo.backlink.detail_drilldown_failed`.
- Flag `GROWTH_SEO_BACKLINK_DETAIL_ENABLED` nace OFF (sólo ops-worker); el encendido es checkpoint del operador. Runbook `docs/manual-de-uso/growth/operar-perfil-de-enlaces-seo.md`. Con esto, las tres capacidades por las que hoy se paga Semrush (dominio · página · enlaces) quedan code-complete en Greenhouse.

## 2026-08-27 — El módulo SEO aprende a hablar de páginas, no sólo de dominios

- `TASK-1776` (code complete, rollout pendiente): nace `greenhouse_growth.seo_url_visibility_snapshots` — qué ranquea una URL, subcarpeta o subdominio de CUALQUIER dominio, y qué páginas/subdominios concentran su tráfico. La tríada que Semrush vende como tres reportes es acá UNA capacidad con resolver de sujeto **declarado** (la clase jamás se infiere).
- La foto sale del agregado del proveedor (set completo); el `limit` (knob, default 100) sólo acota el detalle comprado y es la palanca de costo. Gotchas verificados contra la doc: URL como target va CON esquema (sin él el proveedor devuelve y cobra el dominio entero); subcarpeta = host + filtro server-side gratis.
- **Tercer productor del mercado compartido**: el `keyword_info` que viene ya pagado en cada fila se deposita en `seo_keyword_market_data` vía el writer canónico con costo 0 (la migración expandió su CHECK) — una corrida sobre un cliente deja fresco mercado para toda la cartera.
- Cron `ops-seo-url-visibility` (día 17) **nace pausado** con flag `GROWTH_SEO_URL_VISIBILITY_ENABLED` OFF (sólo ops-worker); reader + lane ecosystem + tool MCP `get_seo_url_visibility`; señal `seo.url_visibility.stale_subjects`. El encendido queda como checkpoint del operador; runbook `docs/manual-de-uso/growth/operar-visibilidad-por-url-seo.md`.

## 2026-08-27 — El módulo SEO aprende a describir un dominio completo

- `TASK-1775` (code complete, rollout pendiente): nace `greenhouse_growth.seo_domain_overview_snapshots` — la foto de dominio (keywords ranqueadas totales, tráfico estimado, distribución top-100, momentum) del target Y de sus competidores, con trayectoria mensual desde 2020-10. Multi-productor con clave sin organización (patrón `seo_keyword_market_data`): lo que pagó una org sirve a toda la cartera.
- Tres colectores sobre el mismo writer: la foto mensual (`domain_rank_overview`, cron `ops-seo-domain-overview` día 16 — **nace pausado**, flag `GROWTH_SEO_DOMAIN_OVERVIEW_ENABLED` default OFF sólo ops-worker), el backfill histórico de una sola vez por sujeto (10× el costo; runner `--dry-run` default + tope duro USD) y el screening de cartera (1.000 dominios ~USD 0.13).
- Reader `readDomainOverview` con `lens: 'estimated'` + `capturedAt` en toda cifra y `no_market_data` sin ceros fantasma; lane ecosystem `/growth/seo/domain-overview` + tool MCP `get_seo_domain_overview`; señal `seo.domain_overview.stale_subjects` (steady 0, con estado "sin rollout" honesto).
- Decisión registrada en arch §4.2: `domain_rank_overview` NO devuelve authority score — la autoridad canónica de superficie sigue siendo `seo_backlink_snapshots.domain_rank`, sin segunda cifra que compita.
- El encendido queda como checkpoint del operador (smoke live que gasta + flag multi-runtime + despausar); runbook `docs/manual-de-uso/growth/operar-foto-de-dominio-seo.md`.

## 2026-08-27 — El sustrato de sitio gana dueño propio y frontera con detector

- `TASK-1697` (mitad A, complete): el fetcher SSRF-guarded + parseo HTML/robots sale de las tripas del grader a `src/lib/growth/site-substrate/` (git mv, diff puro, shims — cero dependientes modificados) con carta verificable por test de allowlist: no importa `growth/*`, no persiste, dice cómo se OBTIENE la evidencia y nunca cómo se JUZGA.
- Lint rule nueva `greenhouse/growth-substrate-boundary` en `error` desde commit-1 sin exenciones: `ai-visibility/probes/**` pasa a ser privado del dominio AEO (la puerta externa es el sustrato) — el deep import que TASK-1670/1701 podían escribir mañana hoy rompe el build. La rule universal de fronteras `growth/*` queda declarada de `TASK-1713` (30 deep imports vivos la harían nacer sucia).
- Desbloquea a `TASK-1670`, `TASK-1701` y `TASK-1709` (el carril comercial de diagnóstico de prospectos ya tiene de dónde consumir la evidencia de sitio).

## 2026-08-27 — El fetcher de sitios de terceros deja de prometer garantías que no implementa

- `TASK-1778` (Slices 1–4b, code complete): el único fetcher con el que Greenhouse lee sitios de terceros (grader AEO público + brand intelligence + diagnóstico de prospectos) gana mecanismo para sus cuatro garantías: contención de redirects por salto acotada a la familia del sujeto (`apex↔www`, upgrade `http→https`), guarda DNS pre-conexión contra rangos no públicos, tope de memoria real por stream con truncado rastreable, y obediencia de `robots.txt` matcheando nuestro token — jamás los bots de IA que auditamos.
- Un probe de presencia ya no puede afirmar «no tiene datos estructurados» sobre un cuerpo truncado o un shell de render JS: degrada a `skipped` con razón explícita (`truncated_body`/`not_observable`), el mismo invariante `null ≠ 0` un nivel más abajo.
- El endurecimiento de red queda tras `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (dual-location Vercel + ops-worker) como kill switch de cobertura; el resto viaja sin flag.
- **Cutover aplicado el mismo día:** flag ON en el ops-worker compartido staging+prod (la cadena viva del intake público) + declarativo en `deploy.sh` + Vercel staging; la regla de saltos se extendió a subdominios descendientes del sujeto con evidencia real de cartera (bancochile). Corrida real `EO-GRUN-00048` verde con cero bloqueos falsos → `ISSUE-164` resuelto. Residuales en el ledger: revisión Sentry 48 h (2026-08-29) y env var en Vercel Production con el release que lleve el código a `main`.

## 2026-08-27 — Nace la práctica Salesforce operable y vendible

- Se crearon tres skills espejadas y gateadas: `salesforce-crm-practice`, `salesforce-marketing-cloud-engagement` y `salesforce-marketing-cloud-next`.
- Cada skill separa `operate` de `sell`, incluye discovery, fit, arquitectura, propuesta/SOW, operación administrada y gates explícitos para claims, licencias, partnership, consentimiento y mutaciones.
- Marketing Cloud Engagement se documenta como producto vigente y coexistente; Marketing Cloud Next como producto nativo de Salesforce Platform/Data 360. No se promete migración automática, paridad ni reemplazo universal.
- La práctica comercial quedó bajo **Revenue Operations & CRM** con catálogo de ofertas, mapa de productos y evidencia fechada. No hubo acceso a tenants, cambios de configuración, ventas, cotizaciones oficiales, claims públicos ni runtime.

## 2026-08-27 — RevOps & CRM deja de confundirse con un único provider

- Se verificó la posición Gartner por mercado y año: HubSpot es Leader en B2B Marketing Automation 2025 por quinto año, y Challenger en CRM Sales Platforms 2026 después de avanzar desde Niche Player en 2025. Zoho también es Challenger en CRM Sales 2026. Ya no se usa un supuesto cuadrante único de “CRM”.
- La señal enterprise chilena de Salesforce quedó sustentada con casos públicos de Enel Chile, Abastible y Colbún, pero se clasificó con confianza media: demuestra presencia, no market share ni desplazamiento general de HubSpot.
- La práctica se normalizó como **Revenue Operations & CRM**, con diagnóstico provider-neutral y tres carriles: HubSpot-first, Salesforce-first e híbrido gobernado. La inversión futura debe decidirse con 24 meses de pipeline, win/loss, margen, demanda y capacidad, no con un badge de analista.
- La declaración del CEO de que Efeonce es partner de HubSpot y Salesforce quedó en el registry como evidencia interna pendiente de readback primario. No autoriza claims externos, tier, certificación ni co-sell.
- Se actualizaron contexto GTM, modelo de negocio, beachheads, catálogo HubSpot, tasks/wireframes activos y las skills espejadas `hubspot-solutions-partner` y `efeonce-agency`. Sin cambios de runtime, clientes, licencias, programas de partner ni sitio público. Evidencia: [`CRM Platform Positioning — Gartner + señal enterprise Chile`](docs/audits/commercial/CRM_PLATFORM_POSITIONING_GARTNER_CHILE_2026-08-27.md).

## 2026-08-26 — Noviembre y diciembre de Berel quedan listos para revisión y producción creativa

- Se reescribieron los ocho artículos N43–N50 con rescate del contenido vivo, análisis SEO/AEO y editorial, voz es-MX, enlaces reales de `berel.com` y cuatro especificaciones de imagen por pieza.
- Los proyectos mensuales quedaron relacionados con 72 tareas: 8 artículos, 32 banners y 32 derivados; el Content Hub ganó 32 subítems sociales, cuatro por artículo.
- Los 32 pares tarea/subítem pasaron comparación exacta de cuerpo. El playbook espejo ahora exige escritura social en dos fases y gates visibles para archivo histórico, sensibilidad institucional, consolidación y soft-404.
- La relectura encontró un drift no corregido: las 40 tareas preexistentes de artículo/banner aparecen al 11 de septiembre, fuera de sus proyectos de noviembre/diciembre. Quedó declarado para confirmación del calendario antes de una nueva mutación en Notion.
- N48, N49 y N50 no están habilitados para distribución automática: esperan derechos/vigencia, revisión institucional y consolidación canónica, respectivamente. No hubo publicación CMS ni programación social. Evidencia: [`auditoría de noviembre/diciembre`](docs/audits/seo/BEREL_NOVEMBER_DECEMBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-26 — El eje de desenlace del pipeline deja de operarse sólo desde el portal

- **El hueco no era una ruta faltante: era una pregunta que nadie hizo.** Cerrar una postulación se podía hacer desde el portal y desde ningún otro lado — ni por `api/platform/app/**`, ni por MCP, ni por Nexa, que no mencionaba hiring ni una vez. Violación directa de Full API Parity, y el agravante es que **ninguna de las cuatro tasks del eje lo declaró como pendiente**, ni la auditoría que las revisó.
- **La spec pedía copiar el Banco de Talento y ese patrón no calzaba.** Talent-pool persiste sus invitaciones en una tabla y compara contra esa fila al confirmar; para decisiones no existe tabla, el command no acepta `proposalRef`, y la spec declaraba `Migration: none`. La salida no fue crear la tabla: una invitación **es** una entidad con ciclo de vida propio, una propuesta de decisión nace y muere dentro de un gesto humano. El guard quedó como un **digest del estado actual** que `propose` calcula y `confirm` revalida — si alguien decidió entre medio, falla en vez de pisar una decisión ajena.
- **Nexa quedó con autoridad deliberadamente MÁS ANGOSTA que el portal: cierra una postulación abierta, nunca re-decide una cerrada.** El motivo es mecánico: su contrato de acciones no puede cargar estado del preview al execute, así que la huella no sobrevive el viaje. Había dos salidas malas —debilitar el guard, o extender un contrato compartido por otras seis acciones— y una buena: acotar lo que el agente puede hacer.
- **El guard de parity es lo que impide que la clase vuelva.** Un manifiesto obliga a declarar cada capability `hiring.*` como federada, deliberadamente interna o pendiente. No obliga a federar: obliga a **decidir y escribir el porqué**. Cuatro de las decisiones ya escritas dicen que no, y valen más que las que dicen que sí. Quedan 18 pendientes — no es deuda nueva, es la que ya existía, ahora con nombre.
- **Dos defectos propios los encontró la pasada documental, no los tests.** El adaptador aplanaba los tres conflictos distintos del command en un solo código —exactamente la clase que se corrigió el mismo día del lado del candidato— y no reenviaba el destino de selección, con lo que dos de los seis desenlaces eran inalcanzables por la ruta que existe para alcanzarlos. Ambos corregidos y congelados con test.
- Estado: `code complete, rollout pendiente`. El flag de Nexa nace OFF —bajo el AI Act la selección es alto riesgo con supervisión humana obligatoria— y falta ejercitar el loop contra staging. La escritura por MCP queda diferida: su registro vive en el repo hermano y su scope está bloqueado hasta `TASK-1631`.

## 2026-08-26 — La rendición del assessment deja de perder respuestas y de mentir sobre por qué

- **El caso fuente, resuelto en su causa.** El 2026-08-19 una candidata real perdió una respuesta escrita y quedó sin poder enviar, teniendo 26 minutos de gracia disponibles. La causa no era el plazo: el autosave es un debounce que **se reinicia con cada tecla**, así que quien escribe de corrido sin pausar 450 ms **no guarda nada** — no pierde los últimos milisegundos, puede perder la respuesta entera. Ahora, dentro de una ventana de 30 s antes del plazo, el guardado se fuerza cada 5 s ignorando el debounce. No extiende ningún plazo: guarda antes.
- **La mitad de la premisa de la task era falsa, y quedó escrita como tal.** De los cuatro defectos declarados, dos no existían: el reloj es `sticky` desde el 2026-08-19 —arreglado 2h43m después de crearse la task, sin que nadie actualizara la spec— y los avisos de 5 y 1 minuto **nunca** fueron sólo `srOnly`. Quien la tomara iba a cazar un bug inexistente o, peor, a «arreglar» lo que funciona.
- **Tres defectos que ninguna línea declaraba.** El paso entre preguntas sobreescribía el borrador con el valor del servidor —vacío— en silencio, rompiendo la promesa central del propio wireframe; `errorBody` se usaba en DOS catches, así que arreglar el submit dejaba el autosave igual de deshonesto; y el diálogo de envío se abría durante la gracia sin verificar completitud, que es exactamente cómo se llegaba al error imposible de resolver.
- **El hallazgo que corrigió el contrato de diseño.** El wireframe proponía la copy «puedes enviar lo que alcanzaste a guardar». Es falso: el servidor **exige la evaluación completa** y rechaza cualquier envío con respuestas faltantes. Prometerlo habría repetido, más sutil, la misma mentira que la task venía a arreglar. La banda pasó a ser condicional, y con faltantes **el CTA de envío no se renderiza**: una acción que no puede tener efecto no se ofrece.
- **`readOnly` sobre `disabled` es accesibilidad, no estilo.** `disabled` saca el campo del tab order y su contenido del árbol de accesibilidad: durante la gracia significaba que quien usa lector de pantalla no podía releer lo que escribió. La asimetría con radio y checkbox —que conservan `disabled` porque `readonly` no les aplica por spec— quedó declarada en el contract test con su razón, no bajada en silencio. Y como el módulo nunca tuvo `.textArea:disabled`, el gris lo ponía el navegador: se agregó la regla explícita para que el campo congelado no parezca editable.
- **El servidor no se tocó, y esa fue la decisión.** Devuelve un mensaje genérico a propósito —es un endpoint público sin autenticación, fijado por un test anti-leak— así que la verdad se construye en el cliente desde el `code`. Cuatro mensajes agrupados por lo que la persona puede hacer, no siete por código.
- **Aprendizaje de gobernanza:** declarar `UI ready: yes` disparó 21 errores de un gate premium que **no tiene válvula de proporcionalidad** — se aplica igual a UI nueva que a un fix de defecto, y exige `Quality profile: premium`, lo que descarta el modo `--contract-only`. Las doce secciones se autoraron con contenido verificado, no de relleno; la más útil terminó siendo declarar **por qué no hay dirección visual nueva que explorar**.
- **La captura premium se ejecutó, y justificó su costo: destapó cuatro defectos que ningún test veía.** El contador de caracteres tenía un contraste de 2.43:1 contra el 4.5:1 de AA — defecto pre-existente, `serious` en axe, sobre una superficie de candidato. Al ocultar el placeholder del campo congelado —porque un campo que no acepta texto no puede invitar a escribir— axe reveló que el textarea llevaba años **sin nombre accesible**: se apoyaba en el placeholder, que es precisamente el anti-patrón que la guía de UX writing prohíbe. La banda usaba un **avión de papel** para decir que no se puede enviar. Y la superficie no declaraba su recipe de composición.
- **Un quinto hallazgo resultó ser del gate, no del código.** Marcaba los botones del stepper como fuera del viewport en 390px, pero su contenedor ya declara `overflow-x: auto`: es un scroller contenido, que es el patrón correcto. Se declaró la excepción en vez de romper el patrón para complacer al checker; el contrato real —que la página no scrollee— se verificó y se cumple.
- Estado: **complete**. `pnpm test` completo verde (12.062), los cuatro gates de UI en PASS, scorecard 4.54 con el piso declarado y su `nextAction` escrito en vez de inflado. Seed ejecutado y limpiado, con residuo verificado en cero.

## 2026-08-26 — La contabilidad de Hiring mentía: el dominio está más avanzado que sus documentos

- **Auditoría con cinco verificadores en paralelo, cada hallazgo re-verificado a mano contra el runtime** (git, `vercel env ls`, `gcloud run services describe`) antes de escribirse. El patrón de fondo: casi nada de Hiring falta por construirse; faltaba por contabilizarse. Sin cambios de runtime en esta pasada.
- **La regla que envenenaba a los agentes.** `.claude/rules/hiring.md` se auto-carga al tocar `src/lib/hiring/**` y afirmaba **en presente** que el `CHECK` del invariante `stage='closed'` ⟺ desenlace seguía parqueado en `docs/tasks/pending-migrations/`. Se aplicó el 2026-08-23 (`b270478f4`) y esa carpeta sólo tiene su `README`. Corregido, con las tres migraciones nombradas por ruta; además `HIRING_APPLICATION_STAGES` volvió a ser el espejo del `CHECK` desde que el Slice F de `TASK-1754` lo bajó de trece a seis. El `NUNCA` de fondo —no aplicar un contract antes del release que retira su escritor— **no se relaja**: cambió el hecho, no el invariante.
- **Un flag encendido en producción que el ledger daba por apagado.** `HIRING_VACANCY_AI_ENABLED` lleva **41 días ON en Production** y está **ausente en staging**; el ledger decía "OFF en todos los environments". Y el orden de sus precondiciones quedó invertido: se declaró "flip staging + smoke, después prod", y ocurrió prod ON **sin que el smoke de staging ocurriera nunca**. Queda registrado como deuda abierta, no como diseño.
- **La trampa que explicaba casi toda la confusión.** `main` promueve por **squash merge**, así que los SHAs de `develop` nunca son ancestros aunque su contenido esté desplegado. Leer `rev-list --count origin/main..origin/develop` como "trabajo sin desplegar" produjo el diagnóstico falso de que `TASK-1771` esperaba release: está en producción desde `709e15f66` (2026-08-23), verificado blob a blob. El gap real de código es `TASK-1762`, cuyas cuatro migraciones **ya se aplicaron** a la instancia Cloud SQL compartida — schema por delante del código, mitigado porque sus flags nacen OFF.
- **Ocho entradas falsas en `docs/tasks/README.md`**, corregidas: `1771` y `1755` como "no están en main" (ambas desplegadas), `1748` y `1771` con migraciones "parqueadas" (las dos aplicadas), `1754` con el Slice F "no ejecutado" (`50b742341`), `1719` con "falta rollout" (ejecutado el 08-18), `1747` marcada `to-do` estando `in-progress` y en producción, y `1757` "apagado esperando sign-off" con el flag ON desde el 08-20. Seis líneas `Status real` de las specs quedaron alineadas con el runtime.
- **Tres pendientes que ninguna línea declaraba.** `TASK-1718`: el fix H-10 sigue sin escribirse — el filtro `stage` entra como texto libre (`stage as never`) y ante un literal inexistente responde `200 {items:[]}`. `TASK-1746`: `purge_assessment_access_recovery` existe en DB con **cero callers**, o sea la retención de 12 meses y el purgado por retiro de consentimiento **nunca se ejecutan** — es el único hallazgo con filo legal. `TASK-1742`: el canary se declaró verde el 08-18 y al día siguiente entraron dos fixes correctivos al mismo carril, sin registro de re-verificación.
- **Una task perdió la mitad de su premisa.** `TASK-1751` declaraba cuatro defectos en la rendición del candidato; **dos no son ciertos**: el reloj ya es `sticky` (`bc69e5a75`, arreglado 2h43m después de crearse la task) y los avisos de 5 y 1 minuto **nunca fueron sólo `srOnly`** — la insignia visible `.timerBadge` convive con el canal de lector de pantalla desde el ship original del 2026-07-13. Quedan los **dos del guardado**, que son el daño real del caso fuente: el borrador en vuelo se pierde al entrar en gracia (falta el _flush_, no "congelar mejor") y el error final manda a reintentar algo imposible. La spec lleva `NUNCA` explícito de no "arreglar" lo que funciona.
- **Un fail-closed que parecía un olvido.** `HIRING_ASSESSMENT_AI_PROMOTION_EVIDENCE_DIGEST` está ausente en los tres runtimes **por diseño**: el digest _es_ la evidencia de promoción y sin él el modo degrada a `global_provisional`. Quedó anotado con su `NUNCA` — declararlo para "destrabar" la policy de excepciones vaciaría el gate.
- **Aprendizaje transversal registrado:** un `Status real` es una afirmación con fecha de caducidad. Cinco de siete tasks `in-progress` del dominio lo tenían stale, y el `README` estaba peor que las specs. Existe precedente del mismo fix (`4a1011286`).

## 2026-08-26 — Octubre de Berel queda convertido en un proyecto creativo trazable

- El proyecto [`Produccion Creativa - Octubre 26`](https://app.notion.com/p/3c839c2fefe7813c9450e2f35cb4021e) quedó `En curso` con ocho artículos `N35–N42`, 32 banners, 32 paquetes sociales y 32 subítems en Content Hub: 72 tareas relacionadas al proyecto, conforme a la aceptación `9A` / `4A`.
- Además de las seis reescrituras, se normalizaron los briefs y se redactaron los artículos nuevos N41 —paleta de la mesa mexicana— y N42 —pintura por superficie—, cada uno con cuatro banners y cuatro derivados completos. La segunda lectura confirmó las 18 filas nuevas y la igualdad exacta tarea ↔ subítem en los ocho sociales.
- Se restauraron 54 fechas de N35–N40 que automatizaciones de Notion habían movido al `2026-09-04`; la consulta final devolvió 8 artículos al 7 de octubre, 32 banners al 14 y 32 sociales al 16. Las canónicas de N41–N42 siguen como soft-404 y permanecen bloqueadas para enlaces entrantes, CMS y redes hasta QA live. Evidencia: [`auditoría de producción de octubre`](docs/audits/seo/BEREL_OCTOBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-25 — El caso de vacaciones por aniversario no se convierte en política global

- Se documentaron las fechas de ingreso verificadas de Melkin Hernandez (`2025-07-15`) y Andrés Carlosama (`2025-11-11`), junto con la comunicación individual aprobada que vinculó 15 días remunerados al primer aniversario.
- La auditoría deja explícito el drift: el runtime actual muestra 15 días a ambos, la carta global describe base anual prorrateada más progresión y la instrucción individual usa otro hito. People, Payroll y Legal deben decidir el contrato antes de cambiar cálculos o saldos.
- El aprendizaje operativo de TeamBot quedó en arquitectura, runbook, invariantes y skills: `pnpm teams:announce` no crea DMs; un one-off genérico solo puede usar el dispatcher y audit writers canónicos con identidad Entra revalidada, confirmación, idempotencia y auditoría. Los mensajes recurrentes pertenecen a Notification Hub.
- Se aclaró en el manual de ficha laboral que `hire_date` no se infiere desde compensación/creación y que guardarla no recalcula automáticamente Leave.

## 2026-08-25 — La metodología de priorización editorial SEO queda escrita, y aparece un motor que ya existía sin usarse

- **La lección más cara: Greenhouse ya calculaba lo que se reconstruyó a mano.** `/admin/growth/seo/keywords` (`TASK-1308`) expone el mismo score de striking distance que el reader canónico `keyword-opportunities-reader.ts` (`TASK-1302`) — clics incrementales contra la curva de CTR de la propia organización, con la canibalización ya separada como consolidación y no como optimización. La capacidad estaba construida, la conexión de Search Console del cliente llevaba semanas acumulando, y nadie la había corrido para esa cuenta. Quedó como antipatrón: verificar no solo que la capacidad exista, sino que esté **habilitada para la organización** — la página está gateada por flag y por entitlement, así que «existe» y «está encendida para este cliente» son dos hechos distintos.
- **Se separaron dos carriles que se venían mezclando.** Striking distance contesta _qué página existente empujo_; el volumen de una herramienta externa contesta _dónde hay demanda que no capturo_. Usar impresiones de Search Console para descartar contenido nuevo es razonamiento circular: un tema sin contenido no puede aparecer en un filtro que exige estar rankeando. La regla previa de «no priorices por volumen de terceros teniendo GSC propio» quedó acotada a la priorización de páginas existentes, que es donde aplica.
- **Tres trampas de lectura de Search Console quedaron documentadas con medición.** La posición promedio no es interpretable sin un piso mínimo de impresiones, y el diagnóstico real es la brecha entre volumen estimado e impresiones entregadas. Con dimensiones consulta+página los sitelinks inflan los agregados: una query de marca sumaba 86.282 impresiones repartidas en 300 páginas. Y la curva de CTR se deriva del propio sitio, porque el benchmark de industria no describe un vertical donde la posición 1 rinde 4,25%.
- **Nuevo modelo operativo y nuevo runbook.** `SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` cubre el proceso de punta a punta —intake del sistema editorial del cliente, los dos carriles, respaldo de producto, producción con subagentes, entrega y medición— con el camino primario apuntando al producto y el proceso manual declarado como fallback. `producir-serie-de-briefs-seo.md` es el paso a paso de producir y depositar una serie de briefs en el sistema editorial de un cliente, incluida la sintaxis de encabezado desplegable y la regla de concurrencia.
- **El caso del cliente quedó en `docs/audits/seo/`** con su línea base medida, el backlog de los dos carriles y los defectos de arquitectura de su sitio ordenados por impacto. La recomendación de mayor retorno no requiere construir nada ni que el cliente toque su sitio: correr la superficie que ya existe.
- **La skill `seo-aeo` entró al repo por el lado de Claude.** Estaba versionada solo como `.codex/skills/seo-aeo` porque una sesión de Codex commiteó su copia; la de Claude vivía a nivel de usuario, fuera de git, y se habría perdido al cambiar de máquina. Ahora están las dos, con 24 de 27 archivos idénticos. Tres siguen divergiendo y necesitan fusión con criterio, no copia.
- **La deriva de skills espejadas queda cerrada de forma estructural.** `seo-aeo` y `seo-aeo-practice` entran al manifiesto de `pnpm skills:mirrors`, que ya corre dentro de `local:check` y por tanto en el pre-push: de ahora en adelante cualquier divergencia rompe el push, verificado con un test negativo. Antes de registrarlas hubo que reconciliarlas a mano, y las dos estaban peor de lo que se veía. En `seo-aeo`, la copia que cargaba Claude estaba **más vieja** que la versionada por Codex: había perdido un sello de frescura y varias secciones enteras. En `seo-aeo-practice`, la copia de Codex afirmaba que el AEO de un cliente real iba regalado cuando está contratado y pagado desde el día uno, y proponía desagregarlo como oportunidad de revenue — es decir, cobrar de nuevo algo ya cobrado.
- **El modelo operativo gana el toolkit del research y el camino a la herramienta interna.** Queda escrito qué reportes se corren y para qué —once reportes agrupados por las siete preguntas que contestan— y una tabla de correspondencia contra la capacidad interna DataForSEO de `src/lib/growth/seo/`: cinco preguntas ya cubiertas internamente (una de ellas **mejor** que con el tercero, porque es medida y no estimada), dos parcialmente y cuatro sin cobertura. La regla queda explícita: cuando la interna cubre, se usa la interna; cada uso del tercero es señal de backlog de producto. Con una trampa de nombre declarada: `src/lib/growth/seo/gap/` **no** es el gap competitivo de keywords —es el cruce SEO×AEO del quadrant— y el gap competitivo (`domain_intersection`, `TASK-1662`) sigue pendiente.
- **Segunda pasada del mismo día: la pieza-hito anual entra al método.** Un cliente puede tener una pieza que es hito anual de marca (color del año, informe, ranking). Exige cuatro análisis que un artículo normal no: cadencia propia, cadencia del mercado con fuente primaria, la ventana, y el **contrato del claim perecedero** — «primera marca en anunciar X» se documenta con su condición de caducidad y una **tarea de retiro con fecha**, en la pieza, en el PR y en los assets ya distribuidos. Un claim que caduca sin retirarse es un pasivo. Y quedó una advertencia medida: la cadencia propia se lee del `datePublished` del JSON-LD, pero **dos fechas separadas por dos meses no son un patrón**, y una ruta que devuelve 200 sin `<title>` no aporta una fecha, aporta un soft 404.
- **El competidor más peligroso suele ser una pieza propia reciente.** El reflejo es barrer competidores; el chequeo que faltaba es barrer los artículos del propio cliente de los últimos tres meses comparando **conceptos, no keywords**. Es un chequeo distinto del de canibalización por GSC que ya existía: ése consolida URLs vivas, éste previene escribir encima de trabajo propio. Y hay un tercer actor que no está en ningún mapa competitivo: el **pre-emptor de tesis** —alguien fuera de la categoría que publicó el mismo concepto con el mismo mecanismo antes—, con la distinción operativa de que **ganar la tesis no es ganar el SERP**, y un riesgo nuevo que se mide: que un motor de respuesta atribuya el concepto a la marca equivocada.
- **La distribución deja de ser una parrilla cuando el canal lo opera otro.** Si el canal existe pero lo publica un tercero, el entregable es un **paquete de insumo**, no un calendario: tabla campo por campo, la fecha marcada _sugerida_ y no comprometida, el objetivo en unidad de cobertura de insumo entregado, la medición declarada de antemano (pedir el reporte a quien publica o inferir por tráfico de referencia) y el retiro del claim perecedero comunicado a quien publica **como entregable**, porque tiene copy vivo. Además: la convención de atomización **se deriva del inventario del cliente, nunca se inventa**, con cuatro señales de degradación; y una red social que ocupa varias posiciones de la primera página del vertical deja de ser un canal y pasa a ser **una segunda superficie de búsqueda**, lo que cambia el copy (el título lleva la consulta, no el nombre de la campaña).
- **Cuatro antipatrones nuevos, todos con caso propio.** Un grep de patrón de nombre no es un inventario —un regex anclado a la convención vieja devolvió cero para el mes que usaba otra y se concluyó que los entregables no existían—; el peso en caracteres no mide la calidad de una sección —se llamó «flaca» a una capa que era checklist y tabla, el formato más denso que hay—; una keyword con dificultad sospechosamente baja se verifica en SERP antes de fijarse como objetivo; y un hallazgo de inventario local no es una acusación de proceso: puede ser sincronización de almacenamiento y se reverifica con el equipo dueño antes de reportarlo al cliente.
- **La trampa de Notion que rompe un entregable devolviendo éxito.** Al depositar un brief dentro de un encabezado desplegable, se escribe la tabla en markdown de tuberías y Notion la guarda como HTML **cuyo envoltorio no hereda el tabulador** — desde ahí, todo lo que sigue queda fuera del desplegable, y la escritura reporta éxito. Tampoco se puede prefijar con tabulador una línea que empiece con sintaxis de lista numerada: Notion la reparsea, descarta el tabulador y arrastra la cola. El cierre es un conteo mecánico, y el fetch devuelve los saltos de línea escapados, así que un patrón ingenuo reporta cero secciones y parece que la página está vacía.
- **`content-marketing-studio` entra al manifiesto de espejos y traía deriva ya committeada.** Cuatro archivos divergían entre las dos copias, uno con un puntero que resolvía a una ruta inexistente. Reconciliado y registrado: el gate de pre-push cubre ahora 11 skills.
- **Tercera pasada del día: la entidad de marca recurrente entra al método, y con ella la autoridad temática.** Si un cliente tiene una entidad propia que se repite cada año —color del año, informe anual, ranking, premio, índice—, **no es contenido estacional: es un clúster que compone autoridad anualmente** y que ningún competidor puede disputar. Quedó escrito el **kit reutilizable con cadencia relativa al anuncio** (`D-30` reservar el destino · `D+0` ficha ancla · `D+2` aplicación profesional · **`D+30` satélite de espíritu anclado a estacionalidad**, el eslabón que produce la capilaridad · `D+75` desarrollo mayor · `D+150` tendencia · `D+240` segundo desarrollo), con bidireccionalidad obligatoria incluida **ficha del año N ↔ año N−1**. El error que lo originó también quedó nombrado: clasificar el territorio de la entidad como «masa de calendario» y descartarlo.
- **La estacionalidad sirve solo si es vinculante.** Test de cuatro pasos: ¿el ritual **es** el concepto? ¿su materia es la del producto? ¿hay demanda con SERP verificado? ¿queda hueco leyendo el contenido propio? Y preferir el **marco reutilizable** sobre la efeméride puntual: una pieza atada a una fecha caduca, un marco de temporada se recicla cada año. Volumen alto con vínculo débil es trampa — un ritual muy buscado puede tener SERP de receta, gobierno o retail.
- **🔴 Medir el grafo de enlaces internos exige separar lo editorial del chrome.** Un módulo global (pie, carrusel de relacionados) inyecta los mismos destinos en **todas** las páginas: eso infla el conteo y **fabrica hubs que no existen**. El método es filtrar los enlaces presentes en más del 50% de las páginas. La consecuencia operativa se invierte: a un destino cableado **no se le dan salidas, se le quitan entradas**, reemplazando la terna fija por un módulo contextual dirigido por el mapa de clúster. Y hay que medir **qué porcentaje del enlazado interno apunta a soft 404**. ⚠️ Con una advertencia que quedó documentada: en el caso fuente **la cifra filtrada no fue reproducible** desde el dataset intermedio, así que el criterio de «cuerpo editorial» hay que declararlo explícitamente antes de darle un número a nadie.
- **🔴 Brief ≠ dossier de research, y la plantilla canónica ya existía sin usarse.** Se entregaron briefs de 27.000 a 70.000 caracteres cuando `content-marketing-studio/templates/content-brief.md` son 35 líneas. Nuevo estándar en `SEO_CONTENT_BRIEF_STRUCTURE_V1.md`: **techo duro de 12.000 caracteres**, once bloques de máximo diez líneas, bloqueantes arriba, y la regla de fondo — **el brief cita la conclusión y enlaza la evidencia, no la transcribe**. Verificado en la práctica: el brief siguiente salió en **10.035 caracteres sin recortar al final**.
- **El `unbrand test` puede fallar legítimamente, y eso cambia la métrica, no el objeto.** Cuando el objeto citable **es** la entidad de marca —un léxico propietario, una nomenclatura—, quitarle la marca lo vacía y el gate falla por construcción. La lectura correcta no es arreglarlo ni marcarlo verde: es que la pieza **construye entidad en vez de utilidad neutra**, y por tanto **se mide por menciones y citas, no por backlinks al objeto**.
- **Dos antipatrones de criterio y cuatro de craft.** Si se cae la razón por la que existe una pieza, **la decisión vuelve a cero, no a otro ángulo** — buscarle un ángulo nuevo para salvarla es publicar por publicar; y un tema que le habla a otro comprador es decisión comercial, no de SEO. En titulación: poner el **concepto** en el lugar del título (el ángulo nombra, el titular promete), meter taxonomía interna en el nombre visible, repetir el mismo titular en las cuatro superficies, y desaprovechar el activo más citable que suele tener un catálogo — **un nombre propio con carga cultural que nadie contó**.
- **Tres trampas más de herramienta, todas devolviendo éxito.** En Notion: **nunca editar el texto de un encabezado desplegable con search-replace** —destruye el toggle y orfana a todos los hijos; para renombrar se cambia la propiedad `Nombre` de la página— y el desplegable **no puede ser el primer bloque**. Leyendo un sitio Next.js: **no des-escapar el payload para buscar `@type`**, porque los objetos de la app aparecen como si fueran schema (se «encontró» un tipo inválido nueve veces por página que en el HTML crudo no existe); y los conteos de palabras sobre el payload salen **~3× inflados**.
- **`copywriting` entra al manifiesto de espejos (12 skills) y traía deriva que no fallaba con error.** La copia de `.codex` tenía una `description` de una línea, sin `user-invocable` ni triggers: la skill simplemente **no se cargaba** cuando alguien pedía un headline o la voz del autor. Un agente entrando por Codex escribía copy firmado sin el sistema de voz, sin saber que existía.

## 2026-08-24 — TeamBot deja de prometer una mención que Teams no soporta

- Un anuncio real a `EO Team` demostró que usar el ID del chat como identidad de `@todos` no funciona: Teams aceptó el mensaje, pero mostró `todos` como texto común y no notificó colectivamente.
- La capacidad oficial es más acotada: un bot puede mencionar personas explícitas en un chat grupal, pero no puede mencionar a todos. La causa no era idioma ni configuración del tenant.
- Se corrigieron las skills, arquitectura, invariantes, runbook y `TASK-716`. El diseño futuro solo admite `none` o `explicit_users`; también conserva las Adaptive Cards sin `activity.text` para evitar la burbuja duplicada.
- No se reintentó el envío. El soporte local especulativo de `--mention-all` fue retirado y no forma parte del runtime versionado.

## 2026-08-24 — Queda registrado que nadie puede darse de baja de un correo, y quién lo va a arreglar

- Se abrió el incidente que documenta el defecto: el enlace «Dejar de recibir estos correos» del pie **falla por los tres caminos posibles**, incluido el botón «Cancelar suscripción» que Gmail y Outlook muestran sobre el asunto. Ninguno da de baja a nadie.
- **No es algo que se rompió después.** La capacidad se cerró así: la task que la construyó quedó marcada como terminada con su propio criterio sin cumplir y sin la página de preferencias que había planeado. El endpoint existe y no lo usa nadie.
- Se creó la task que lo repara, con una decisión de diseño que vale nombrar: **hacer clic en el enlace no dará de baja de inmediato**, mostrará una confirmación. Los escáneres de seguridad de los correos corporativos abren los enlaces solos, así que un enlace que diera de baja al abrirse desuscribiría a gente que nunca lo tocó. El botón nativo del cliente de correo sí actúa directo, porque ahí la intención ya la expresó la persona.
- También deja de guardar permisos de baja que nadie puede usar: hoy la liquidación de sueldo genera uno que dura un mes y no aparece en ninguna parte.
- Tres tasks vecinas quedaron corregidas: los avisos de vacantes para el Banco de Talento —que serían la **primera suscripción voluntaria de verdad** del sistema— asumían que la baja funcionaba; el desalineamiento de la dirección de casa matriz dejó de ser deuda de una pantalla y pasó a bloquear todo el programa de correos; y el aviso de pagos a contractors quedó con una pregunta pendiente sobre a qué carril pertenece.

## 2026-08-24 — El rediseño de los pies de correo se revisó contra el sistema real, no contra su diseño

- **El botón de "darse de baja" no funciona hoy.** El enlace del pie lleva a una dirección que el servidor no atiende, y el botón propio que Gmail muestra arriba del correo tampoco: los dos fallan. Además el sistema agrega ese enlace **solo, por accidente**, a cualquier correo enviado a más de una persona. La liquidación de sueldo llega a generar un permiso de baja de 30 días que nadie ve nunca. Arreglarlo pasa a ser condición previa del programa.
- **La marca queda cerrada, no en discusión.** "Efeonce Greenhouse" no existe: Efeonce es la marca que lidera y Greenhouse es la plataforma, dos capas de la misma jerarquía y no dos opciones a elegir. Se corrigió el planteo excluyente que traía la task de marca, que ahora ejecuta la arquitectura ya aprobada en vez de reabrirla. Son cinco textos, ningún logo: el remitente, el tagline del pie, el texto alternativo del logo y los dos cuerpos de la invitación.
- **Los correos en inglés muestran parte del pie en castellano.** El diccionario en inglés no tiene sección de correos: apunta al español por atajo, y ni el compilador ni las pruebas lo notan. Ya se ve en toda liquidación a colaboradores fuera de Chile.
- **Los correos salen de dos lugares, no de uno.** Veinte tipos salen del servicio en la nube, seis salen del portal —los que uno espera en pantalla al apretar el botón— y tres salen de ambos. Para esos tres, actualizar un solo lado haría que el mismo documento llegue con dos pies distintos según si fue automático o reenviado a mano.
- **Los datos legales del pie todavía no tienen camino ni política de respaldo.** Se adoptó la conducta que ya usan los PDF: si la base no responde, se usa el dato de respaldo y queda registrado; el RUT se omite antes que inventarse. Y la dirección de casa matriz tiene tres versiones distintas en el sistema, con una decisión pendiente que bloquea a todo el programa.
- Se confirmó que el gobierno de la migración estaba bien: nada se cambia por herencia, cada tanda migra pocos tipos y cada una puede revertirse sola. También se corrigieron dos supuestos previos: el encabezado ya usa el logotipo de Efeonce en las treinta plantillas, y el pie sí tenía red de pruebas.

## 2026-08-24 — Revisar postulaciones ya no obliga a entrar y salir del Pipeline

- Application 360 permite pasar a la postulación anterior o siguiente de la **misma vacante y etapa**. La cola excluye archivadas y usa orden cronológico estable; no es un ranking y no consulta score, afinidad ni recomendaciones IA.
- Si hay una decisión, corrección o nota sin guardar, Greenhouse pregunta antes de cambiar de postulación. En móvil el contador se compacta y la pestaña padre activa se mantiene visible.
- Al volver por la pestaña `Pipeline`, Greenhouse recupera la postulación exacta incluso si quedó fuera del límite habitual, consume el foco temporal de la URL y deja la tarjeta enfocada. Si ya no existe, muestra una recuperación honesta en vez de seleccionar otra.
- El recorrido `1 de 2 → 2 de 2 → Pipeline` pasó Playwright/GVC en 1440 y 390 px, con View Transition compartida y cero errores de consola, página, hidratación o red.
- El contrato quedó incorporado en arquitectura y en las skills de Talent, Motion y GVC. La auditoría documental detectó que el snapshot del board aún puede incluir postulaciones archivadas; el delta no está listo para rollout hasta cerrar esa brecha.
