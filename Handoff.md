# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-31 — TASK-1780: el inventario de tools MCP dejó de ser dos listas (Slice 3 pendiente de tu decisión)

`src/mcp/greenhouse/tool-manifest.ts` es ahora la fuente del inventario: `server.ts` **registra
recorriéndolo** y el `name`/`instructions` que el cliente MCP lee se **derivan** de él. Dos banderas
ortogonales por tool —`writes` y `spendsProviderBudget`—; fusionarlas era el defecto original.

Baseline medido al tomarla, distinto del que la spec declaraba: **43 tools** (28 SEO + 15 no-SEO),
**7 escrituras** (la spec decía cuatro), 4 comprometen gasto del proveedor. El criterio 🔴 de cierre
—«el guardia detecta las tres tools invisibles»— era **infalsificable**: `TASK-1658` ya las federó.
Se reemplazó por el drift que sí existe hoy: `get_seo_provider_spend`, federada **sin contraparte
interna**, que ahora se declara en vez de deducirse.

Evidencia: snapshot del registro del SDK antes/después **idéntico byte a byte**; el artefacto generado
reproduce el espejo a mano tool por tool (misma clase de escritura, mismos `inputKeys`), con la única
divergencia esperada; `pnpm test` completo 12.919/0; gateway `pnpm check` verde con 73/73.

🔴 **Falta un solo comando, y no es una decisión de riesgo.** El Slice 3 vive en `efeonce-mcp`,
implementado, verde (`pnpm check`: 73/73 + build) y **staged** — 6 archivos, mensaje de commit listo en
`.git/TASK-1780-commit-msg.txt`. El commit quedó **bloqueado por el clasificador de permisos del
entorno**, no por una decisión ni por una regla del repo.

⚠️ **Corrección de riesgo:** ese repo **NO tiene auto-deploy**. `deploy.yml` es `workflow_dispatch`
puro (los tres últimos deploys son manuales) y el push a `main` sólo corre `ci.yml`. Commitear ahí no
despliega nada; la revisión productiva sigue siendo `efeonce-mcp-gateway-00024-8b8` hasta que alguien
dispare el deploy a mano. La verificación de esta task es de CI, no de runtime.

Mientras ese commit no exista, la task queda `code complete, rollout pendiente`: por su propia regla de
ordering, un manifiesto con un solo consumidor sería una tercera lista.

## 2026-08-31 — Content Marketing publicado desde diseño aprobado

Menú verificado: **Soluciones → Crecimiento Multicanal → Content Marketing**, item `242917`, sin duplicados ni cambio de orden.
[Revisión editorial de ambas secciones](docs/audits/public-site/2026-08-31-content-marketing-editorial-copy.md): 118 campos publicados, siete pasos coherentes; diseño/SEO/shell intactos.
[Segundo pase editorial](docs/audits/public-site/2026-08-31-content-marketing-hub-review-copy.md): hub y revisión creativa, 83 campos publicados; tres cortes y fichas de campaña revisados.
[CMS y modos](docs/audits/public-site/2026-08-31-content-marketing-cms-modes.md): 53 textos y cuatro logos oficiales publicados; ocho controles nuevos, diseño general y SEO conservados.
[Ecosistema y FAQ](docs/audits/public-site/2026-08-31-content-marketing-ecosystem-faq.md): 37 textos y seis URL publicados; tarjetas completas y ocho FAQ, sin cambios de diseño/SEO.
[Marca en modalidades](docs/audits/public-site/2026-08-31-content-marketing-mode-logo.md): dos logos ampliados con CSS acotado, sin cambiar contenido ni SEO.
[Indexabilidad del menú](docs/audits/public-site/2026-08-31-menu-indexability.md): 18/18 páginas habilitadas; sólo Redes Sociales requería quitar noindex. Canonical/sitemap verificados; indexación GSC no afirmada.
[Cierre, caso interno y formulario](docs/audits/public-site/2026-08-31-content-marketing-business-conversion.md): 48 textos Elementor y copy de form v3 publicados; correo copiado coincide con lo visible, sin cambiar destino ni enviar leads. Ajuste posterior: cinco textos condensados para equilibrar las columnas, sin cambiar el formulario.

Landing `242603` publicada con trece widgets Elementor y chrome Ohio intacto. Formulario canónico, SEO y
verificación pública 1440/1280/890/390; 78 tests del renderer PASS. No se enviaron leads ni correos.
[Auditoría, snapshots y pendientes](docs/audits/public-site/2026-08-31-content-marketing-publication.md).
TASK-1799 sigue in-progress por contraste del diseño, smoke de conversión/GA4, editor completo y CWV/research.
Runtime inicial `73493a8`, refinamientos publicados versionados en `f12dd64`; ocho archivos cotejados con producción. Cierre de scripts/docs/skills en este commit, sin push. No repetir el cutover inicial.
Revisión documental con tres subagentes: docs triples, índices, inventario, skills espejadas y task/UI
reconciliados. Menú conserva secuencia visible; no se afirma igualdad de valores raw `menu_order`.
Hallazgo confirmado: resize a 1440×651 activa pin aunque mount bajo 740 px no lo hace; pendiente de
TASK-1799, sin cambio de código en este pase. Evidencia y comandos en la auditoría enlazada.

## 2026-08-30 — Landing HubSpot aprobada: publicada como once widgets Elementor

Por nueva instrucción explícita del operador se implementó y publicó su ZIP Claude Design aprobado,
SHA `f95b6254c2434b58a4d6855dded40dd3a38acb19b881e090e1928674ab8bb812`.
Página `244079`, URL conservada `/servicios-contratar-hubspot/`; header/footer Ohio nativos.
2026-08-31: item de menú `244116` renombrado a «Servicios HubSpot», sin moverlo ni cambiar destino.

2026-08-31: [auditoría SEO/AEO completa](docs/audits/public-site/2026-08-31-hubspot-seo-aeo.md):
OG/Twitter y breadcrumb corregidos, Service conectado al grafo Yoast, enlace oficial del partner y HTTP→HTTPS
301 sólo en la landing. Iconos 878 KB→2,4 KB y fuentes adelantadas; móvil LCP 16,3→8,6 s (lab; aún mejorable).
Schema.org 0 errores/advertencias; GSC indexada, último crawl 27-08 anterior al rediseño. Header/footer intactos;
persisten defectos globales del footer y falta respaldo localizado de las cifras 56%/76%. Snapshot SEO
`_gh_hubspot_seo_20260831_093553`; hash Elementor sin cambios. Sin commit/push.
Aclaración del operador: no autoriza cambios estéticos por SEO. Se retira el subrayado del perfil público;
se conservan apariencia, composición y tipografías aprobadas.
Después se ajustó sólo la descripción SEO/social con `copywriting`; title y diseño intactos.
Snapshot `_gh_hubspot_meta_copy_20260831_102004`; texto y rollback en la auditoría enlazada.
Comentarios visuales posteriores: [timeline restaurado y partner reducido a dos columnas con badge mayor](docs/audits/public-site/2026-08-31-hubspot-timeline-partner-fix.md).
Cinco archivos acotados; árbol Elementor y SEO intactos. Snapshot `_gh_hubspot_visual_fix_20260831_102751`.
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
[Cierre con tres subagentes](docs/audits/public-site/2026-08-31-hubspot-documentation-closure.md): docs/skills, lifecycle y commits acotados; WIP ajeno preservado.

[Contrato y fuentes](docs/architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md),
[audit y evidencia](docs/audits/public-site/2026-08-30-hubspot-elementor-publication.md),
[manual/rollback](docs/manual-de-uso/public-site/hubspot-elementor.md).

Once widgets editables, 23 paneles SSR, formulario Growth Forms `efeonce-hubspot-scope` publicado con
variante portable `hubspot_pillar`, renderer canónico fijado en WordPress. Destino Greenhouse-only;
no se activó entrega directa HubSpot ni se probó una conversión con lead real. QA anónima, validación,
responsive/teclado/reduced motion y roundtrip nativo Elementor PASS. Home y Creative conservan hashes.
Cierre Git acotado autorizado, sin push ni despliegue general Greenhouse. TASK-1352 no se movió a complete; migración de URL y
sus dossiers adicionales no forman parte de este pedido de publicación. La aprobación del export
supera las instrucciones de rechazo de diseños anteriores para este artefacto específico.

## 2026-08-31 — TASK-1358: Home editorial aplicada; QA residual pendiente

Home `251731` publicada en raíz, antigua `2791` conservada noindex; header/footer Ohio intactos.
Readback remoto del cierre editorial: 17 widgets, cero HTML, 407 campos raíz y seis repeaters;
hash `9aa8c770c0907edc5ad70f4489cccedb56cc03d0a7802e01eef0e2beee832562`.
[Ocho revisiones y cierre con subagente](docs/audits/public-site/2026-08-31-home-editorial-closure.md):
copy anotado, comparación cualitativa, FAQ jerárquica y Con + logo publicados; doce archivos iguales
local/remoto. Docs/skills consolidados sin incluir runtime hermano ni WIP SEO previo en el commit.
Las revisiones visuales, assets oficiales, microinteracción de logos, enlaces de Servicios,
CTA Casos y showreel están publicados. No restaurar formulario demo, Verk ni placeholders.
[Contrato vigente](docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md);
[historia/evidencia visual](docs/audits/public-site/2026-08-30-home-visual-review.md).

Tres subagentes consolidaron arquitectura, funcional/manual y skills espejadas; root reconcilió task,
índices y contexto. [Audit independiente](docs/audits/public-site/2026-08-30-home-documentation-consolidation.md):
contrato WP-CLI, PHP, lifecycle y geometría PASS; hashes de archivos del video coinciden con manifest.
Video: snapshot `_gh_home_video_20260830_195821`, backup `195756` (retención/rollback no revalidados).
SEO/HTTPS publicado: [audit](docs/audits/public-site/2026-08-30-home-seo-aeo.md), snapshot `_gh_home_seo_20260830_204702`; verificador público PASS.

**Siguiente paso:** usar sesión Chrome WordPress observada para probar guardar/recargar Elementor y teclado
del video; certificar flechas en tabla y revisar atenuación de Servicios, claims/footer/entidad global y medir GSC/CWV. CTA abierto no prueba booking ni tracking.
TASK-1358 sigue `to-do`/`UI ready: no`, runtime `Avanzada`; commit previo `1282feed4`, SEO aún sin commit/push.
Skills SEO/WordPress espejadas con método Home/landing; consolidación documental sin nuevas escrituras live.
El checkpoint anterior se [preservó](docs/operations/agent-context-history/handoff/2026-08-30-home-before-consolidation.md),
pero ya no gobierna decisiones ni pendientes actuales.

## 2026-08-30 — oferta HubSpot V2 y planificación previa a la publicación del export aprobado

La investigación actual de producto y el benchmark de 11 partners quedaron consolidados en un audit fechado y en
el canon `docs/services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md`. La práctica usa seis familias por
outcome, modos de entrega transversales y overlays sectoriales; la evaluación inicial es sin costo y el blueprint
pagado exige entregable autónomo. Customer Agent ya no es categoría raíz; Agent Hub/Builder, Revenue Hub/Contracts,
Customer Success, Projects/Services, Marketing Studio y AEO quedaron ubicados en la taxonomía correcta.

Se actualizaron PDR-006/007/013, el spec y las skills HubSpot en `.codex`/`.claude`, fuentes, glosarios, templates y
router. `TASK-1352` fue **reemplazada por completo** —no reconciliada mediante deltas— para impedir que un ejecutor
reproduzca el resultado rechazado de Claude Design. La task exige research y contratos de copywriting, SEO/AEO y CRO
antes del diseño, más un gate humano `ACCEPT FIRST FOLD` antes de implementar el resto. La dirección durable es
**Sistema vivo de crecimiento**. El wireframe, flow y motion gobiernan un atlas conectado de
seis resultados, tres lentes sectoriales, una conversión primaria y una experiencia inmersiva basada en color y
causalidad — sin copiar el trade dress de HubSpot, modificar badges/logos ni depender de video, particles, robots o
scroll hijacking. La paleta exacta debe salir de assets oficiales/autorizados vigentes y convertirse en tokens
page-scoped; first-fold, no-JS, reduced motion, performance, marca y GVC premium son gates binarios.

Los cuatro docs UI de TASK-1352 fueron también **reemplazados integralmente** el 2026-08-30. Ya no fijan una gran
idea antes del research ni separan agentes como oferta dominante: dirección, wireframe, flow y motion usan las seis
familias exactas, `COPY_SLOT` gobernado, pasajes SEO/AEO servidos, una única conversión, estados/fallas completos,
tokens de motion exactos y score premium `average >= 4.5` con todas las dimensiones `>= 4`.

**Ese checkpoint documental fue superado por la publicación autorizada descrita arriba.** `TASK-1352`
sigue `to-do` y `UI ready: no` como unidad formal; no usar este estado para afirmar que la página no está publicada.
Su alcance adicional aún incluye dossiers
VoC/CRO y SEO/AEO, claim/proof ledger, copy deck nuevo y reverificar producto, tier, assets, prueba, formulario y
disponibilidad del portal antes de implementar.

## 2026-08-30 — TASK-1693 `complete`: lo que la lente `Descubrir` ya tenía construido y no llegaba al operador

Tres capacidades pagadas y sin superficie, cerradas en cuatro slices sobre `develop` (sin push):
**paginación por cursor** (el reader la servía y la page descartaba `nextCursor`), **las cuatro
fuentes de seed** (`resolveSeeds` cubre cinco y el workbench mandaba `'manual'` fijo) y **los filtros
del canvas** (`keyword-discovery-query.ts` existía sin un solo importador).

**El Slice 0 no estaba en el plan y fue necesario.** El readiness gate bloqueó: los docs de diseño
declarados eran los de `TASK-1665` —substantivos, pero pre-esquema— y **la paginación no estaba
diseñada en ninguna parte**. Se autoraron wireframe + flow PROPIOS de 1693, de alcance parcial, en vez
de reescribir el contrato de una task cerrada para satisfacer un esquema posterior.

**Se retiró una serialización que la spec declaraba obligatoria (`1691 → 1693`)** tras verificar que
la colisión que la justificaba ya no existe: la lente `Descubrir` ya pinta `◑` + `capturedAt` +
«Barrera de enlaces», así que el encoding que 1691 propaga es el que esta superficie **ya tiene**;
archivos owned disjuntos y bloques de copy distintos.

**Tres defectos propios, cada uno atrapado por un instrumento distinto — y ninguno por el lint:**
1. La skill de UX writing mató un `aria-label` que yo había propuesto: no contenía el texto visible,
   lo que rompe *label in name* (WCAG 2.5.3) y deja el botón inalcanzable por control de voz.
2. Un test destapó que mi propio wireframe afirmaba que la superficie tenía UNA live region. Tiene
   **dos** desde 1665. Se corrigió el contrato en vez de dejar la afirmación.
3. **Mirar el frame** destapó la barra de filtros con las etiquetas en tres líneas base distintas, y
   **axe** marcó `color-contrast` SERIOUS (3.14:1) en los seis frames por un `opacity: 0.75` que yo
   había puesto para de-enfatizar un conteo. De-enfatizar texto bajándole opacidad es exactamente
   cómo se rompe el contraste sin darse cuenta.

**Verificado contra el dev server con sesión de agente, no sólo con mocks:** paginación real
(`limit=10` → `nextCursor 10` → 2.ª página con candidatos distintos), filtros server-side
(`query=zzznoexiste` → 0, `lamina` → 2, `maxLinkBarrier=low` → 19 de 50) y la superficie con
`?q=lamina` titulando «2 candidatos» — el conteo sigue al universo filtrado, no a lo que bajó.

🔴 **`pnpm ui:quality` queda en `BLOCK` y se reporta así: las notas NO se inflaron.** Average 4.41 y
`visualImpact` 4.2 contra el 4.5 del gate. La razón es estructural: el techo de impacto lo fija el
canvas de `TASK-1665`, que esta task declara fuera de alcance en sus No-goals UX. Cerrarlo subiendo
la nota habría sido el fraude que el gate existe para impedir. `ui:visual-gate` PASS.

**Gate de cierre completo:** `pnpm test` COMPLETO verde (12 638 pasados) y **`pnpm build` de
producción VERDE** (corrido con autorización del operador: 28,6 s de compilación, 23/23 páginas
estáticas, cero errores). 

**Rollout ejecutado el 2026-08-30 con autorización del operador (USD 0,348 estimados):** corrida real
`seokdr-761a9689-…` con `seedSource='gsc_queries'` sobre Berel — `source_kind` persistido, **10/10
seeds con `origin='gsc_queries'`** (berel 91 734 impresiones, pinturas berel 53 418: salen de
`seo_gsc_daily`, no del textarea), `succeeded`, **334 candidatos**, **USD 0,2999 reales**. Con eso
cierra el único AC que había quedado sin ejercitar. Y de yapa dejó la **primera corrida multi-página
del Space**, así que la afordancia de paginación —que hasta entonces no se podía ver porque la
corrida mayor tenía exactamente 50 candidatos = el tamaño de página— quedó capturada en un frame
propio, con el encabezado titulando «50 de 284» (284 = keywords distintas tras el colapso de
cardinalidad de TASK-1694, no las 334 filas de procedencia).

**12 commits promovidos a `origin/develop`** (7 de esta task, 3 de TASK-1662/1699, 2 ajenos).

**Pendiente con dueño:** una task de superficie si se quiere levantar el `visualImpact` del canvas —
es la única razón por la que `ui:quality` sigue en `BLOCK`, y no se cierra inflando la nota.

## 2026-08-29 (10.º) — TASK-1699: día 1 verificado y costo marginal CERO comprobado; dos criterios de la spec estaban mal enunciados

El cron del 29-ago escribió el día 1 de la serie del top-N (766 filas, `seot-berel-mx`, 31 keywords) y
con eso los **Pasos 5 y 6** quedan cerrados. Verificación reproducible y sin gasto:
`scripts/growth/_verify-task-1699-day-one.ts` → **4/4**.

🔴 **La promesa central de la task quedó comprobada con el ledger, no con un argumento:** el día 1 costó
**USD 0,1225 con 31 llamadas**, *idéntico* a los días 26, 27 y 28 (0,1225 / 31 cada uno), que son
anteriores a la serie. Persistir ~19 de cada 20 filas que antes se botaban no agregó un centavo.

**Dos de los tres criterios del Paso 5 estaban mal enunciados**, porque la spec se escribió antes de ver
un SERP real. Se afinaron contra los datos, no se relajaron: (1) «~20 filas por keyword» hay que contarlas
sobre `item_type='organic'` —el writer persiste todos los item_types a propósito, así que el total por
keyword da 19–28 y no dice nada del top-N—; (2) «exactamente una fila `is_own_domain`» es **falso** como
invariante: un dominio aparece varias veces en un SERP real (subdominios, múltiples orgánicos,
`local_pack`), y en la keyword diagnóstica `site:berel.com` aparece en las 20. El invariante verdadero,
que es el que el snapshot mide, es que el **`rank_group` mínimo entre las filas propias orgánicas** iguale
`seo_rank_snapshots.position` — 21/21 coinciden, 0 discrepan. Mi primera pasada reportó 4 fallas; dos eran
bugs de mi propio script de verificación y dos eran estas aserciones ingenuas.

**Por qué NO cierra todavía:** `seo.serp_top_results.coverage` está en `warning` (2 de 3 día-target sin
top-N) y **es correcto que lo esté** — esos dos días son el 27 y 28, anteriores al deploy, historia que por
diseño no es backfilleable. Con ventana de 3 días converge sola a `steady=0` el **31-ago**. No se toca el
umbral: la señal está diciendo la verdad sobre una pérdida real. Y el Paso 9 (revisar candidatos de
competidor contigo antes de declarar) necesita ≥5 días de serie → ≈**2026-09-02**.

Estado honesto: **`día 1 verificado; señal converge el 31-ago; candidatos ≈2-sep`**.

## 2026-08-29 (9.º) — TASK-1662 `complete`: el Slice 4 estaba verde en producción y el criterio de cierre documentado era falso

El acople del gap competitivo con la cola priorizada **ya funcionaba** y nadie lo había medido. En el
snapshot vigente de `seot-berel-mx` (501 items, `incremental-clicks-v2`) el origen `competitor_gap`
sale `state: ok`, **200 items**, `asOf 2026-08-28`. Verificado fila por fila contra PG: `evidence_ref`
opaca única (`seo:competitor_gap:seocr-5a4e6783-…`), **cero FK/JOIN** hacia las tablas de cobertura,
200/200 en banda 3 con verbo `measure`, ranks 257–496 (5.ª precedencia) y **solape 0** con
`gsc_striking_distance` — la exclusión GSC operando en vivo, no sólo en test.

🔴 **Lo que corrigió esta sesión no es código sino una afirmación falsa en tres documentos.** El Delta
del día anterior declaraba que el `degraded` de `seot-efeonce-own-brand` se resolvería *"por maduración
de la serie del top-N"*. El `origin_health_json` real dice otra cosa: *"No hay competidores declarados
para este sitio"*. Y ese sujeto **no tiene serie top-N en absoluto** (0 días capturados; la única viva
es la de Berel, con 1 día). Aunque madurara, el descubrimiento **propone** y declarar es humano por
diseño. Ese `degraded` es el colector diciendo la verdad, y **no madura solo** — un criterio de cierre
basado en esperar habría esperado para siempre.

**Ventana cerrada, también contra la creencia documentada:** `origin/main:services/ops-worker/deploy.sh`
ya declara `"false"` (ENABLED) para `ops-seo-competitor-coverage` **y** `ops-seo-work-queue-materialize`
— lo promovió el release `e1718a359575` (PR #213). El ledger de flags todavía declaraba la ventana
abierta en tres lugares; retirada la fila de § Pendientes de acción y corregidas las dos filas de flags.

Rollout verificado en vivo (no en el ledger): revisión activa `ops-worker-00621-bx7` con ambos flags
`true`, los dos schedulers `ENABLED`, migraciones al día. Gates: `vitest src/lib/growth/seo` 764/764,
sanity `_sanity-task-1662-keyword-gap.ts` **22/22 contra PG real**, `flags:audit --strict` sin flags
sin registrar.

**Pendiente con dueño (Follow-ups, no bloqueantes):** medir el costo del **segundo** ciclo de cobertura
antes de subir `GROWTH_SEO_COMPETITORS_PER_TARGET` — el cron es mensual (día 18) y el 18-sep cae en
ventana de frescura, así que el próximo gasto real es ~octubre; y **ejercitar el `proposalRef` de
descubrimiento** con la primera declaración nacida de una propuesta (la serie necesita ≥5 días y lleva 1).

## 2026-08-29 (8.º) — Release `e1718a359575`: el fix de banda 2 y el gate del worker están en producción, verificados por canary

**Manifest `released`** (`e1718a359575-5f3d0c7e-859e-45ef-bd64-00c6bec606ea`, run `33279083461`, un
solo run del orquestador, ambos gates `production` aprobados sin stall, 11m16s). Watchdog `ok` /
`drift_count=0` / `data_missing=0`. PR #213 + forward-fix PR #214.

**El desvío del release:** CI Deep se puso rojo sobre el primer squash (`dade7ce5f`, quedó SIN
manifest a propósito — Deep rojo no se dispatcha) por `services/ops-worker/deploy-contract.test.ts`:
sus tests exigían el contrato VIEJO del workflow (3 apariciones por ruta) que `146070ffc` rediseñó a
cobertura por metafile. Forward-fix por el camino canónico (≈40 min). **Y la historia completa,
medida en dos pasadas (la segunda corrigió a la primera por CORTA):** la racha fue de **5 corridas
rojas/canceladas en ~70 minutos** sin que nadie abriera una — `146070ffc` CANCELADO por
`cancel-in-progress` (el commit culpable nunca fue juzgado), `53e240d79` y `3e8149eaa` rojos
(eo-64), `8cafe6b90` rojo ×2 (**mi propio push del merge canónico — tampoco lo miré**) y
`dade7ce5f`, donde recién lo atrapó Deep. En ráfagas, el veredicto de CI es del ÚLTIMO push; una
alarma sostenida se normaliza — que es literalmente cómo el detector de la credencial AXIS se
volvió invisible.

**El skip del `ops-worker` (44 s) fue LEGÍTIMO esta vez — y es la prueba de que el gate nuevo
funciona.** Mismo síntoma que el incidente del 3.er release, causa opuesta: el `push:develop` ya
había desplegado `380a20fa3`, cuyo árbol es IDÉNTICO al del squash (diff completo vacío, no sólo el
de rutas). 3/4 workers en el target; residual de label documentado y clasificado por el watchdog.

**Canary de contrato VERDE contra producción** (lane ecosystem, token de consumer del gateway),
afirmando lo que sólo el contrato nuevo produce: `provenance` con `gsc` + `own_ctr_model` (lentes
● y ◑ en el mismo DTO) y **rank monotónico 1..N con banda 2 poblada** (efeonce 105 items, 55 de
banda 2 — antes 54/55 fuera de orden). Paginación completa de Berel por producción: 6 páginas,
**501/501, secuencia == persistida**. Schedulers siguen `ENABLED` (el skip no ejecutó deploy.sh).

**Post-release ejecutado:** índice keyset huérfano RETIRADO (migración `20260829225504734`,
aplicada con guard doble: viejo ausente + nuevo presente) — contract-después-del-release cumplido.
Sin flags gated a este release (ledger revisado: los pendientes tienen bloqueadores ajenos).

Timing ledger actualizado (E2E ~1h15m; bloqueador dominante: el ciclo del forward-fix).

## 2026-08-29 (7.º) — auditoría independiente de la cola: el orden servido contradecía el rank persistido en banda 2 (fix aplicado + deuda de procedencia quemada)

Auditoría independiente de TASK-1700/1785 pedida por el operador tras 3 releases con dolor.
**Veredicto:** el núcleo de v2 estaba bien (predicado único ✅, piso por versión ✅, adapter sin
`null→0` ✅, schedulers/flags/deploy.sh de main verificados en vivo ✅, snapshots vigentes v2 ✅) —
pero apareció un defecto real que ningún test veía: **54 de 55 items de banda 2** de
`seot-efeonce-own-brand` servidos fuera de su `rank_in_snapshot` (Berel 0/501 — invisible donde
domina banda 1). Reproducido de forma independiente por las dos sesiones peer antes de aceptarse.

Causa: el comparador desempata banda 2 por `tieBreakImpressions` DESC — **no es columna** — y el
reader reconstruía el orden en SQL con tres llaves; con score NULL en toda la banda colapsaba a
alfabético. El test de paridad comparaba el **string** del SQL: guarda que afirma, no que verifica.

**Fix (asignado a esta sesión por el operador; las peers quedaron fuera por contexto saturado):**
el reader sirve y pagina `rank_in_snapshot ASC` (keyset `rank > cursor`; cursor viejo reinicia
página 1, jamás saltea). Comparador = única autoridad de orden; coincidencia servido↔persistido
**por construcción**. UNIQUE index nuevo `seo_work_queue_items_rank_unique_idx` (migración
`20260829213303021`, **aplicada**; ranks verificados contiguos 1..N en los 12 snapshots).
**Re-medido live paginando de punta a punta:** efeonce 105/105 y Berel 501/501 con **0**
discrepancias de secuencia; bandas 1 y 3 sin regresión (estaban en 0 y siguen).

En el mismo tren se **quemó la deuda de procedencia de `work-queue`** (su condición de salida era
este fix): DTO emite `provenance` en lista, fuente nueva `own_ctr_model` (◑, «insumos medidos,
resultado estimado») para score/techo/CTR esperado, censo en `emitted`, cobertura hoja por hoja en
`provenance-coverage.test.ts`. Quedan 7 deudas declaradas en el censo.

Docs: Delta (3) en TASK-1700 + Delta en TASK-1785, §18.8 de la arquitectura SEO reescrito (el
orden canónico vive en el comparador; el reader lo LEE), `SQL_DATE_MATH_AGENT_INVARIANTS`
§"Orden y paginación" ahora con TRES bug classes + protocolo "dataset que exhibe cada estado",
`.claude/rules/growth-seo.md` actualizado.

**Pendiente con dueño:** retirar `seo_work_queue_items_keyset_idx` (huérfano del reader nuevo) en
migración aditiva **DESPUÉS** del release que promueva este fix — el reader desplegado hoy en
producción todavía lo usa. Verificación post-promoción: repetir la paginación live de punta a punta
contra `seot-efeonce-own-brand` (debe seguir 0 discrepancias con el código promovido).

## 2026-08-29 (6.º) — el release cerró verde con el worker sirviendo código viejo

Tercer paso a producción del día (`64bdd105c737`, orquestador `33272258036`). Manifest `released`,
Vercel READY, watchdog sin drift — y el `ops-worker` en `8adf8c2d3`, o sea `incremental-clicks-v1`.
El change-gate se saltó el deploy y el job cerró `success` en 46 s.

Causa raíz cerrada, no parchada: la decisión se tomaba contra una lista de rutas a mano que cubría
24 prefijos de los 1449 archivos que el worker bundlea. Nuevo gate `pnpm worker:deploy-path-gate`
(en CI, junto a `worker:runtime-deps-gate`) deriva la cobertura del metafile de esbuild. Commits
`146070ffc` y `53e240d79` en develop.

Deploy break-glass del `ops-worker` autorizado por el operador → `ops-worker-00617-mtc`,
`GIT_SHA=64bdd105c737`, flag ON, `Ready=True`. Los cuatro workers verificados.

**Revisión vigente al cierre: `ops-worker-00618-lz2`, `GIT_SHA=53e240d79c31` — NO el SHA del
release.** Lo causó el push del propio fix del comentario de `deploy.sh`: `services/ops-worker/**`
es disparador, así que movió al worker fuera del SHA promovido. Verificado por CONTENIDO, que es
lo que decide: el único archivo del bundle que difiere vs `64bdd105c` es `deploy.sh` y **sólo en
comentarios**; `cannibalization.ts` tiene blob `6ceb87e4…` idéntico a `origin/main` y el código que
corre declara `incremental-clicks-v2`. La ancestría NO sirve como prueba acá —`main` promueve por
squash, así que `merge-base --is-ancestor 64bdd105c 53e240d79` falla aunque el contenido sea el
mismo—; una sesión peer la usó y concluía de más.

🔴 **El manifest es incompleto para el worker.** Dice que producción está en `64bdd105c`, y hay UN
solo `ops-worker` compartido entre staging y producción que hoy corre código de develop no promovido
por el control plane. Hoy es benigno (delta = comentarios), pero quien lea sólo el manifest concluye
algo falso sobre qué código materializa la cola. La promoción de `146070ffc`/`53e240d79`/`d7b5e1ed2`
cierra las dos cosas: alinea el worker y activa el gate de cobertura para releases futuros.

Rematerialización hecha **sin** `force` (`materialized=2, reused=0`), lo que además probó
empíricamente que el piso filtrado por versión funciona como red de seguridad. Berel MX:
`consolidation` 200→11 con `gsc_striking_distance` 168→200.

**Pendiente:** `146070ffc` y `53e240d79` están en develop y NO en `main`. El gate de cobertura sólo
protege releases futuros una vez promovido. Hasta entonces, un release que corra el árbol de `main`
vuelve a usar la lista vieja — el mismo modo de falla de hoy.

**Retirada** la optimización del ledger que proponía dejar de contar el skip change-gated del
`ops-worker` como error en el watchdog: silenciaría justo la señal que habría atrapado esto.

## 2026-08-29 (5.º) — plan comercial, presupuesto y generación de pipeline 2027

La revisión comercial separa dos cuotas que no se compensan: **Exit MRR USD 30.000–32.000** y **Spot bookings
USD 90.000**, con compromiso `28.000 + 60.000` y stretch `34.000 + 120.000`. SKY/Berel sostienen expansión;
Motogas presupuestó crecimiento cero; ANAM/Aguas permanecen como Spot warm/repeat y Managed Ops sólo como upside.
El funnel central modela 15 cierres desde 100–115 primeras reuniones held, 50–56 oportunidades calificadas y
32–38 propuestas. Outbound queda como piloto de 90 días: Apollo tiene créditos, pero al corte no tenía sequences ni
actividad histórica utilizable; sus 593 reuniones agendadas sin reuniones held no forman baseline de conversión.
La revisión de stack adopta un `Agentic Revenue Pod`: no se contrata AE/SDR full-time ahora; Julio protege 10–12 horas
de venta y cubre temporalmente 4–6 horas de Commercial Systems Operations, o se activa apoyo fractional por SLA,
volumen o pérdida de foco. HubSpot opera warm/inbound; Apollo, cold net-new; los rails no comparten contactos activos.

Canon: `docs/commercial/SALES_GOALS_2026_Q4_2027.md`; plan comercial, presupuesto y control mensual:
`docs/commercial/COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`; generación de pipeline y outbound:
`docs/commercial/PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`; operating model agentic:
`docs/commercial/AGENTIC_REVENUE_OPERATING_MODEL_V1.md`; método: `SALES_GOALS_OPERATING_MODEL_V1.md`; portafolio:
`SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md`.

**Estado:** `Proposed for approval · blocked_by_finance`. Antes de aprobación económica: remuneración sombra del
fundador, fully loaded cost por oferta/cuenta, margen mínimo 45%/objetivo 50–60%, capacidad delegable y modelo mensual
de revenue/caja. Antes de escalar outbound: owner de Commercial Systems Operations, dos mailboxes gobernados, entregabilidad,
mapping/dedupe/suppression Apollo–HubSpot y gates del piloto. No hubo mutaciones en Apollo, HubSpot, Finance runtime,
Teams ni SharePoint.

## 2026-08-29 (4.º) — `incremental-clicks-v2`: el detector de canibalización de la cola medía marca

Auditando la implementación de `TASK-1700` con subagentes de SEO y arquitectura apareció el defecto
de fondo, y era mío: `COUNT(DISTINCT page) > 1` no mide canibalización. Medido contra berel.com,
28 días, piso 100 impresiones — no-marca **80,7 %** de share medio en la página principal, marca
**34,2 %**. El predicado seleccionaba marca. `pinturas`, la query de mayor demanda del sitio: 41
páginas, **99,3 %** en una, y la cola diciendo "fusiona 41 URLs" sobre el ítem #1.

**Lo más grave no era el verbo.** El striking-distance excluía todo lo multi-página: **216 de 269**
filas fuera de su ventana, y la lente del operador en **92** contra las **269** del reader legacy. Al
validar el cutover medí la dirección que AGREGABA filas y nunca la que las QUITABA. Con el flag
prendido hoy era alcanzable desde el portal; no puedo afirmar que nadie la vio.

**v2** — predicado ÚNICO en `work-queue/cannibalization.ts` importado por los dos colectores (v1 lo
tenía escrito dos veces): no-marca ∧ concentración de la principal ≤ 0,7 ∧ ≥2 páginas fusionables.
Concentración sobre TODAS las páginas y conteo sólo sobre fusionables — mezclarlas invierte el
veredicto, y lo destapó medir: al excluir la home también del denominador, `pinturas` cayó a 13,2 % y
volvió a salir canibalizada. Marca con tolerancia a un tipeo (`bereñ` con 38 páginas, `verel`, `berol`,
`berrl`, `betel`, `berem`, `bere` — 16 queries de marca entraban sin ella). Techo por posición anulado
cuando ya se está en la objetivo o mejor, con el techo de CTR como **evidencia** (`snippetCeilingClicks`)
y nunca como score: mezclar "clics por subir" con "clics por mejor snippet" en una columna reintroduce
el orden incomparable que este agregado cerró.

**Medido:** de 400 candidatas, v1 → 400, v2 → 11. Población real 29, de las cuales ~5 son sub-marcas
propias (`kover` = 19 fichas de una línea). Lente del operador de vuelta en 261 vs 269 del legacy.

**Dos defectos latentes que sólo existen con más de una versión:** el piso de recomputación reusaba
snapshots de otra versión y devolvía la ACTIVA sobre ellos (campo que miente, bump sin efecto 60 min por
target) — ahora filtra por versión, con gate; y la huella de parámetros no ve un cambio de fórmula — de
ahí los **vectores dorados por versión**, que congelan la salida. La huella de v1 se movió una vez, al
declarar explícitas dos reglas implícitas; no se dio por equivalente leyéndolo: se ejecutó la
implementación anterior contra la nueva sobre seis casos, salidas idénticas campo por campo.

**Verificado:** 12.620 tests verdes · typecheck 0 · las dos consultas nuevas ejercitadas contra
PostgreSQL real (los unit tests mockean la base y no las ven) · gates de source comprobados EN ROJO
antes de darlos por buenos.

🔴 **Pendiente de rollout, NO hacer antes del deploy:** rematerializar con `force`. Los snapshots
vigentes son v1 y `growth.seo.work_queue.score_version_drift` alerta **legítimamente** hasta que corra.
Rematerializar antes del deploy escribiría snapshots v2 que el código en producción no conoce.

**Límite declarado, no diferido en silencio:** las sub-marcas no se detectan desde el dominio y **NO**
se cierran colgando el score de `grader_profiles.brand_name` — es captura de leads del grader público,
mayoría sin `organization_id` y con filas de smoke, no un SSOT de marca por organización.

## 2026-08-29 (3.º) — Release `88e1f652f1c2`: la ventana de re-pausa quedó cerrada

**Manifest `released`** (run `33263788245`, un solo run, los dos gates aprobados sin stall). Watchdog
`drift_count=0`. `main` y el runtime ahora coinciden: los dos schedulers del módulo SEO declarados
`"false"` en el SoT y `ENABLED` en vivo. **Ningún deploy puede volver a pausarlos en silencio.**

- `ops-seo-work-queue-materialize` — `ENABLED 0 10 * * *`
- `ops-seo-competitor-coverage` — `ENABLED 0 9 18 * *`; ejercitado por el camino desatendido con
  costo **USD 0** (`eligible: 0` porque el competidor del 28 está dentro de su ventana de frescura de
  30 días; verificado en el SQL del colector, no inferido del summary).

Residual del `ops-worker` en `c2e9e3a50a44`: change-gate legítimo en su caso más fuerte — el sanity
**sin** `--` devuelve 0 archivos, o sea árboles idénticos, no sólo «rutas runtime sin cambios».

**Corrección propagada:** la cola de `seot-efeonce-own-brand` es **55 banda 2 + 50 banda 3**, no
«todas banda 2» como escribí. La lectura era de 8 filas y la reporté como total. Corregido en
`deploy.sh`, arquitectura §18, ledger de flags y `rules/growth-seo.md`. La distinción importa: banda 3
es «nadie llega todavía, el verbo honesto es medir», que es justo la banda creada para no fabricar un
score.

**Pendiente en otra sesión (ya resuelto por ella):** las 5 decisiones `dismissed` de un script de
sanity que retiraban las mayores oportunidades de Berel se revirtieron con `deferred` que supersede
—append-only, sin DELETE—, y la rematerialización devolvió `reused: true` por hash, probando que
restauró el plan previo y no inventó uno nuevo.

**Siguiente paso:** `TASK-1794`. Su Slice 2 cambia de diseño — en vez de darle `packages: read` a la
App del watchdog (acoplaría al observador de releases con la emisión de credenciales de build), el
camino es el `GITHUB_TOKEN` efímero de Actions pasado a Cloud Build por substitución, que **no deja
secreto que custodiar**. Requiere dar acceso de lectura a `greenhouse-eo` en los tres paquetes
`@efeoncepro/axis-*` (son de `axis-design-system`). Hallazgo lateral a corregir ahí mismo: el
`.npmrc` que genera `deploy.sh` tiene 2 líneas y el del secreto tiene 3 (falta `@jsr`).

## 2026-08-29 (2.º) — La cola SEO quedó operativa, y el aprendizaje del release cambió al verificarlo

**Estado: los dos schedulers del módulo despausados y documentados.** PR de release #211 en vuelo
para llevar ambos al SoT de `main`.

**`ops-seo-work-queue-materialize`: `ENABLED`, `0 10 * * *`.** Despausado tras corrida shadow con la
MISMA identidad OIDC del scheduler: `succeeded`, `eligible=2`, `materialized=1`, `reused=1`,
`failed=0`. Inspección fila por fila de `seot-efeonce-own-brand` (105 items): `staleness=fresh`, 5/6
orígenes `ok`, `competitor_gap` `degraded` sin arrastrar a los demás, y **todas las filas en banda 2
con `priority_score` NULL** — degradación honesta, no falla.

**`ops-seo-competitor-coverage`: `ENABLED`, `0 9 18 * *`.** Su condición pendiente era confirmar el
endpoint en la revisión activa: `dryRun` → HTTP 200, `providerCostUsd: 0`. Costo ~USD 0,11/mes.
⚠️ Su primera corrida desatendida es el **18 de septiembre**; queda pendiente decidir si se ejercita
antes por el camino desatendido.

🔴 **VENTANA ABIERTA hasta que #211 mergee:** `origin/main` aún declara AMBOS schedulers `PAUSADO`, y
`upsert_scheduler_job` hace `pause`/`resume` EXPLÍCITO en cada deploy. Un deploy desde el árbol de
`main` los re-pausa **en silencio**. Hay UN solo `ops-worker` y UN solo juego de jobs compartidos.

**🔴 CORRECCIÓN a lo que reporté antes, y es la lección que vale.** Escribí que la credencial AXIS
venció «sin señal, sin alerta». **Falso.** El detector `axis-credential-expiry.yml` avisó el
2026-08-25 (run `32856176785`) con tres días de anticipación y predijo el modo de falla exacto
(*«GitHub Actions sigue verde y solo fallan los builds de worker»*). Falló el **ENRUTAMIENTO**: su
único canal de salida era el color de su corrida, y ese color ya venía rojo desde el 08-04 y el 08-11
por una causa ajena (bug de orden `setup-node`/`pnpm`). **Un gate cuyo único canal de salida es su
propio color es un registro, no una alerta**, y **un detector con rojo crónico deja de ser un
detector**. Playbook y skill corregidos. Consecuencia: el check de preflight pasa a ser el arreglo
PRIORITARIO sobre anotar la expiración, porque pone la medición donde alguien está obligado a mirar.

**Deuda documental encontrada y corregida:** la arquitectura afirmaba en **4 lugares** que
`ops-seo-competitor-coverage` estaba `ENABLED` desde el 28 — falso en las cuatro (estaba `PAUSED`,
`lastAttemptTime` vacío). El runbook de AXIS documentaba el `.npmrc` con 2 líneas cuando tiene 3
(falta `@jsr`): seguirlo produce un secreto válido y muerto que falla con el mismo 401 que el vencido.

**Tasks:** `TASK-1700` cerrada (`complete`). `TASK-1794` creada — el arreglo durable de la credencial,
con el check de preflight como Slice 1 y los tokens de instalación de 1 h como Slice 2 (bloqueado por
el permiso `packages` de la App, acción de owner de la organización). `TASK-1669` desbloqueada.

**Siguiente paso:** mergear #211 para cerrar la ventana de re-pausa.

## 2026-08-29 — Release `b7f74c95a2af` a producción: TASK-1785 + TASK-1700 + TASK-1792

**Estado: `released`.** Orquestador `33258242470`, release_id
`b7f74c95a2af-1c7bd2b3-4f50-4e94-b486-c6979e782a44`, un solo run sin retry. Watchdog
`drift_count=0`. Los 4 workers Cloud Run `Ready=True`.

**TASK-1785 quedó completa y en producción.** El invariante `●` medido / `◑` estimado dejó de ser
prosa: `provenance` requerido en el `ok:true` de los readers (lo hace cumplir `tsc`), un guard que
camina el DTO real y exige que **cada hoja numérica tenga exactamente un dueño**, y un censo de
superficies medido contra el filesystem y `server.ts`. Tool `get_seo_dual_lens_visibility` federada
al gateway (`efeonce-mcp` `f523960`), **sin campo combinado por contrato**. Triple documentación
completa (técnica + funcional + manual) y skills actualizadas.

**Flag `GROWTH_SEO_WORK_QUEUE_ENABLED` prendido en los DOS runtimes**, con autorización explícita del
operador. Se prendió **por el SoT** (`deploy.sh` → `:-true` + Vercel antes del squash), no con
`--update-env-vars`: eso evita que el próximo deploy lo borre en silencio Y **ordena el flip por
construcción** — resolvió que `TASK-1792` (`ctr-curve.ts`) no estuviera aún en `main`, precondición
que el ledger exigía. Verificado en la revisión activa `ops-worker-00613-qrh`.

🔴 **PENDIENTE — despausar `ops-seo-work-queue-materialize`.** El flag habilita el materializador; NO
lo agenda. El scheduler sigue PAUSADO y su contrato exige corrida shadow verificada + aviso al
operador de SEO. **Hasta que se despause, la cola no se materializa y los lanes sirven vacío.**

**Bloqueador dominante del release: una credencial, no el código.** El PAT `read:packages` de AXIS
venció en silencio (creado 07-29, 30 días, muerto el 08-28) y tumbó 3 de los 4 workers; Vercel pasaba
verde, que es lo que lo vuelve engañoso. ~2h de las ~4h05m se fueron ahí. Rotado por el operador
(v2 del secreto, validada contra la API de GitHub antes de escribir). Documentado como anti-pattern
#12 del playbook + sección en la skill de release.

⚠️ **La versión 1 del secreto `axis-packages-read-token` sigue `enabled`** — no hace daño (los deploys
usan `:latest`) pero conviene deshabilitarla como higiene.

**Hallazgo lateral con impacto propio:** el audit de flags tenía un punto ciego que **anulaba su propio
gate ISSUE-150** — sólo detectaba `process.env.FLAG` en notación de punto, y 91 callsites del repo leen
por indirección. 39 de 43 «env vars muertas» eran falsos positivos y una clase entera de flags escapaba
del gate que hace `exit 1`. Arreglado; destapó 3 flags sin registrar, ya registrados.

**No validado, declarado:** el canary probó que `dual-lens-visibility` existe y **ejecuta** en
producción (control negativo: ruta inexistente → HTML de Next; ruta nueva → envelope de API con error
de dominio). **No** se ejercitó `ok:true` con las dos series reales: ninguna de las 120 organizaciones
visibles al consumer del gateway tiene `seo_v2`.

**Siguiente paso:** decidir el despause del scheduler de la cola; y evaluar el arreglo durable de la
credencial AXIS (App de GitHub acuñando tokens de 1 h en vez de un PAT estático — hoy la App no tiene
permiso `packages`).
